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

export const tradeDatabaseProperties: CreateDatabaseParameters["properties"] = {
  记录标题: { title: {} },
  股票代码: { rich_text: {} },
  股票名称: { rich_text: {} },
  交易日期: { date: {} },
  交易类型: {
    select: {
      options: [
        { name: "买入", color: "green" },
        { name: "卖出", color: "red" },
      ],
    },
  },
  成交价格: { number: { format: "yuan" } },
  股数: { number: { format: "number" } },
  手续费: { number: { format: "yuan" } },
  税费: { number: { format: "yuan" } },
  备注: { rich_text: {} },
};

export const otherInvestmentAssetDatabaseProperties: CreateDatabaseParameters["properties"] = {
  标的名称: { title: {} },
  资产代码: { rich_text: {} },
  市场: {
    select: {
      options: [
        { name: "A股", color: "red" },
        { name: "美股", color: "green" },
        { name: "港股", color: "purple" },
      ],
    },
  },
  资产类型: {
    select: {
      options: [
        { name: "股票", color: "green" },
        { name: "基金", color: "blue" },
        { name: "ETF", color: "yellow" },
        { name: "可转债", color: "orange" },
        { name: "其他", color: "gray" },
      ],
    },
  },
  币种: {
    select: {
      options: [
        { name: "CNY", color: "red" },
        { name: "USD", color: "green" },
        { name: "HKD", color: "purple" },
      ],
    },
  },
  当前价格: { number: { format: "number" } },
  成本价: { number: { format: "number" } },
  持仓数量: { number: { format: "number" } },
  持仓成本: { number: { format: "number" } },
  持仓市值: { number: { format: "number" } },
  持仓盈亏: { number: { format: "number" } },
  已实现盈亏: { number: { format: "number" } },
  总盈亏: { number: { format: "number" } },
  状态: {
    select: {
      options: [
        { name: "持有中", color: "green" },
        { name: "已清仓", color: "gray" },
      ],
    },
  },
  备注: { rich_text: {} },
};

export const otherInvestmentDatabaseProperties: CreateDatabaseParameters["properties"] = {
  记录标题: { title: {} },
  资产代码: { rich_text: {} },
  资产名称: { rich_text: {} },
  市场: {
    select: {
      options: [
        { name: "A股", color: "red" },
        { name: "美股", color: "green" },
        { name: "港股", color: "purple" },
      ],
    },
  },
  交易日期: { date: {} },
  交易类型: {
    select: {
      options: [
        { name: "买入", color: "green" },
        { name: "卖出", color: "red" },
        { name: "分红", color: "yellow" },
      ],
    },
  },
  成交价格: { number: { format: "number" } },
  数量: { number: { format: "number" } },
  手续费: { number: { format: "number" } },
  税费: { number: { format: "number" } },
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
