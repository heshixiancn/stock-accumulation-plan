import type {
  CreateDatabaseParameters,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints.js";

type PageProperty = QueryDatabaseParameters["filter"];

export const richText = (content: string) => ({
  rich_text: [
    {
      type: "text" as const,
      text: { content },
    },
  ],
});

export const title = (content: string) => ({
  title: [
    {
      type: "text" as const,
      text: { content },
    },
  ],
});

export const numberProperty = (value: number) => ({ number: value });

export const dateProperty = (value?: string | null) => ({
  date: value ? { start: value } : null,
});

export const selectProperty = (name: string) => ({
  select: { name },
});

export const stockDatabaseProperties: CreateDatabaseParameters["properties"] = {
  股票代码: { title: {} },
  股票名称: { rich_text: {} },
  当前价格: { number: { format: "yuan" } },
  成本价: { number: { format: "yuan" } },
  目标股数: { number: { format: "number" } },
  持仓股数: { number: { format: "number" } },
  总持仓成本: { number: { format: "yuan" } },
  股息率: { number: { format: "percent" } },
  每股股息: { number: { format: "yuan" } },
  预计股息: { number: { format: "yuan" } },
  实际股息: { number: { format: "yuan" } },
  状态: {
    select: {
      options: [
        { name: "观察中", color: "gray" },
        { name: "建仓中", color: "blue" },
        { name: "持有中", color: "green" },
        { name: "已暂停", color: "red" },
      ],
    },
  },
  备注: { rich_text: {} },
};

export const dividendDatabaseProperties: CreateDatabaseParameters["properties"] = {
  记录标题: { title: {} },
  股票代码: { rich_text: {} },
  股票名称: { rich_text: {} },
  年份: { number: { format: "number" } },
  除权除息日: { date: {} },
  到账日期: { date: {} },
  每股分红: { number: { format: "yuan" } },
  持仓股数: { number: { format: "number" } },
  税前股息: { number: { format: "yuan" } },
  税后股息: { number: { format: "yuan" } },
  备注: { rich_text: {} },
};

export const isDatabaseTitleMatch = (titleItems: Array<{ plain_text: string }>, expectedTitle: string) =>
  titleItems.map((item) => item.plain_text).join("").trim() === expectedTitle;

export const buildTitleFilter = (titleValue: string): PageProperty => ({
  property: "记录标题",
  title: {
    equals: titleValue,
  },
});

