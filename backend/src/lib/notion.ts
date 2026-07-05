import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  CreateDatabaseParameters,
  CreatePageParameters,
  DatabaseObjectResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  PartialDatabaseObjectResponse,
  QueryDatabaseResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints.js";
import { clearNotionDatabaseConfig, requireNotionConfig, saveNotionConfig } from "../config/env.js";
import { DIVIDEND_DATABASE_TITLE, STOCK_DATABASE_TITLE } from "../types/notion.js";
import {
  dividendDatabaseProperties,
  isDatabaseTitleMatch,
  stockDatabaseProperties,
} from "../utils/notion-helpers.js";
import { HttpError } from "../utils/errors.js";

export interface ManagedDatabases {
  stockDbId: string;
  dividendDbId: string;
}

const getNotionClient = () => {
  const { token } = requireNotionConfig();
  return new Client({ auth: token });
};

let cachedDatabases: ManagedDatabases | null = null;
let cachedConfigKey = "";
let ensureDatabasesPromise: Promise<ManagedDatabases> | null = null;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown Notion API error");

const withTimeout = async <T>(promise: Promise<T>, label: string, timeoutMs = 12000): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new HttpError(504, `${label}超时，请检查网络或 Notion API 状态。`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const getConfigKey = () => {
  const { parentPageId, stockDatabaseId, dividendDatabaseId } = requireNotionConfig();
  return `${parentPageId}:${stockDatabaseId}:${dividendDatabaseId}`;
};

const isChildDatabaseBlock = (
  block: ListBlockChildrenResponse["results"][number],
): block is BlockObjectResponse & { type: "child_database" } =>
  "type" in block && block.type === "child_database";

const isFullDatabase = (
  database: PartialDatabaseObjectResponse | DatabaseObjectResponse,
): database is DatabaseObjectResponse => "title" in database;

const isParentPageDatabase = (database: DatabaseObjectResponse, parentPageId: string) =>
  database.parent.type === "page_id" && database.parent.page_id.replace(/-/g, "") === parentPageId.replace(/-/g, "");

const searchParentDatabaseByTitle = async (expectedTitle: string) => {
  const notion = getNotionClient();
  const { parentPageId } = requireNotionConfig();
  const response = await withTimeout(
    notion.search({
      query: expectedTitle,
      filter: {
        value: "database",
        property: "object",
      },
      page_size: 100,
    }),
    `搜索 Notion 数据库「${expectedTitle}」`,
  );

  const match = response.results.find(
    (item): item is DatabaseObjectResponse =>
      item.object === "database" &&
      isFullDatabase(item) &&
      isParentPageDatabase(item, parentPageId) &&
      isDatabaseTitleMatch(item.title, expectedTitle),
  );

  return match ? { id: match.id, title: expectedTitle } : null;
};

const listParentChildDatabases = async () => {
  const notion = getNotionClient();
  const { parentPageId } = requireNotionConfig();
  const databases: Array<{ id: string; title: string }> = [];
  let cursor: string | undefined;

  do {
    let response: ListBlockChildrenResponse;
    try {
      response = await withTimeout(
        notion.blocks.children.list({
          block_id: parentPageId,
          start_cursor: cursor,
          page_size: 100,
        }),
        "读取 Notion 父页面",
      );
    } catch (error) {
      throw new HttpError(
        400,
        "无法读取 Notion 父页面下的数据库，请确认该页面已分享给 Integration。",
        getErrorMessage(error),
      );
    }

    for (const block of response.results) {
      if (isChildDatabaseBlock(block)) {
        databases.push({
          id: block.id,
          title: block.child_database.title.trim(),
        });
      }
    }

    cursor = response.next_cursor ?? undefined;
  } while (cursor);

  return databases;
};

const createDatabase = async (
  title: string,
  properties: CreateDatabaseParameters["properties"],
): Promise<string> => {
  const notion = getNotionClient();
  const { parentPageId } = requireNotionConfig();
  let response: Awaited<ReturnType<typeof notion.databases.create>>;
  try {
    response = await withTimeout(
      notion.databases.create({
        parent: {
          type: "page_id",
          page_id: parentPageId,
        },
        title: [
          {
            type: "text",
            text: { content: title },
          },
        ],
        properties,
      }),
      `创建 Notion 数据库「${title}」`,
      20000,
    );
  } catch (error) {
    throw new HttpError(
      400,
      `无法创建 Notion 数据库「${title}」，请确认 Integration 具备插入内容权限。`,
      getErrorMessage(error),
    );
  }

  return response.id;
};

const ensureDatabasesOnce = async (): Promise<ManagedDatabases> => {
  const { stockDatabaseId, dividendDatabaseId } = requireNotionConfig();
  if (stockDatabaseId || dividendDatabaseId) {
    cachedDatabases = null;
    cachedConfigKey = "";
    clearNotionDatabaseConfig();
  }

  let childDatabases: Array<{ id: string; title: string }> = [];
  try {
    childDatabases = await listParentChildDatabases();
  } catch (error) {
    if (!(error instanceof HttpError && error.statusCode === 504)) {
      throw error;
    }
  }

  const stockExisting =
    childDatabases.find((database) => database.title === STOCK_DATABASE_TITLE) ??
    (await searchParentDatabaseByTitle(STOCK_DATABASE_TITLE));
  const dividendExisting =
    childDatabases.find((database) => database.title === DIVIDEND_DATABASE_TITLE) ??
    (await searchParentDatabaseByTitle(DIVIDEND_DATABASE_TITLE));

  const stockDbId = stockExisting?.id ?? (await createDatabase(STOCK_DATABASE_TITLE, stockDatabaseProperties));
  const dividendDbId =
    dividendExisting?.id ?? (await createDatabase(DIVIDEND_DATABASE_TITLE, dividendDatabaseProperties));

  const databases = {
    stockDbId,
    dividendDbId,
  };

  saveNotionConfig({
    stockDatabaseId: stockDbId,
    dividendDatabaseId: dividendDbId,
  });

  return databases;
};

export const ensureDatabases = async (): Promise<ManagedDatabases> => {
  const configKey = getConfigKey();
  if (cachedDatabases && cachedConfigKey === configKey) {
    return cachedDatabases;
  }

  if (!ensureDatabasesPromise) {
    ensureDatabasesPromise = ensureDatabasesOnce()
      .then((databases) => {
        cachedDatabases = databases;
        cachedConfigKey = getConfigKey();
        return databases;
      })
      .finally(() => {
        ensureDatabasesPromise = null;
      });
  }

  return ensureDatabasesPromise;
};

export const queryDatabase = async (databaseId: string): Promise<QueryDatabaseResponse> =>
  getNotionClient().databases.query({
    database_id: databaseId,
    page_size: 100,
  });

export const createPage = async (databaseId: string, properties: Record<string, unknown>) =>
  getNotionClient().pages.create({
    parent: { database_id: databaseId },
    properties: properties as CreatePageParameters["properties"],
  });

export const updatePage = async (pageId: string, properties: Record<string, unknown>) =>
  getNotionClient().pages.update({
    page_id: pageId,
    properties: properties as UpdatePageParameters["properties"],
  });

export const archivePage = async (pageId: string) =>
  getNotionClient().pages.update({
    page_id: pageId,
    archived: true,
  });

export const isPageObject = (result: QueryDatabaseResponse["results"][number]): result is PageObjectResponse =>
  result.object === "page";

export const validateNotionAccess = async (config: { notionToken: string; notionParentPageId: string }) => {
  const client = new Client({ auth: config.notionToken });

  try {
    await client.pages.retrieve({ page_id: config.notionParentPageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to validate Notion access";
    throw new HttpError(
      400,
      "无法访问该 Notion 页面，请确认页面已分享给 Integration，且页面 ID 正确。",
      message,
    );
  }
};

export { getNotionClient };
