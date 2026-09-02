import { archivePage, createPage, ensureDatabases, isPageObject, queryDatabase, updatePage } from "../lib/notion.js";
import {
  dateProperty,
  numberProperty,
  richText,
  selectProperty,
  title,
} from "../utils/notion-helpers.js";
import { getDataSource } from "./data-source.js";
import {
  createMysqlNewIssue,
  deleteMysqlNewIssueById,
  listMysqlNewIssues,
  updateMysqlNewIssueById,
} from "./mysql-new-issue-service.js";
import { mapNewIssuePage } from "./notion-mappers.js";
import { newIssuePayloadSchema, normalizeNewIssuePayload, type NewIssuePayload } from "./validation.js";

const newIssueProperties = (payload: NewIssuePayload) => {
  const data = normalizeNewIssuePayload(payload);

  return {
    记录标题: title(data.title),
    证券代码: richText(data.securityCode),
    证券名称: richText(data.securityName),
    市场: selectProperty(data.market),
    打新类型: selectProperty(data.issueType),
    状态: selectProperty(data.status),
    申购日期: dateProperty(data.subscriptionDate),
    上市日期: dateProperty(data.listingDate),
    卖出日期: dateProperty(data.saleDate),
    申购数量: numberProperty(data.subscribedQuantity),
    中签数量: numberProperty(data.allottedQuantity),
    发行价: numberProperty(data.issuePrice),
    卖出价: numberProperty(data.salePrice),
    手续费: numberProperty(data.fees),
    融资利息: numberProperty(data.financingInterest),
    币种: selectProperty(data.currency),
    投入金额: numberProperty(data.investedAmount),
    卖出收入: numberProperty(data.saleProceeds),
    收益: numberProperty(data.profitLoss),
    收益率: numberProperty(data.returnRate / 100),
    备注: richText(data.notes),
  };
};

export const listNewIssues = async () => {
  if (getDataSource() === "mysql") {
    return listMysqlNewIssues();
  }

  const { newIssueDbId } = await ensureDatabases();
  const response = await queryDatabase(newIssueDbId);
  return response.results
    .filter(isPageObject)
    .map(mapNewIssuePage)
    .sort((a, b) => {
      const aDate = a.saleDate ?? a.listingDate ?? a.subscriptionDate ?? "";
      const bDate = b.saleDate ?? b.listingDate ?? b.subscriptionDate ?? "";
      return bDate.localeCompare(aDate) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
};

export const createNewIssue = async (payload: NewIssuePayload) => {
  const data = newIssuePayloadSchema.parse(payload);
  if (getDataSource() === "mysql") {
    await createMysqlNewIssue(data);
    return;
  }

  const { newIssueDbId } = await ensureDatabases();
  await createPage(newIssueDbId, newIssueProperties(data));
};

export const updateNewIssueById = async (id: string, payload: NewIssuePayload) => {
  const data = newIssuePayloadSchema.parse(payload);
  if (getDataSource() === "mysql") {
    await updateMysqlNewIssueById(id, data);
    return;
  }

  await updatePage(id, newIssueProperties(data));
};

export const deleteNewIssueById = async (id: string) => {
  if (getDataSource() === "mysql") {
    await deleteMysqlNewIssueById(id);
    return;
  }

  await archivePage(id);
};
