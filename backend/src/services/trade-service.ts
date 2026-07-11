import { archivePage, createPage, ensureDatabases, isPageObject, queryDatabase, updatePage } from "../lib/notion.js";
import { mapTradePage } from "./notion-mappers.js";
import { normalizeTradePayload, type TradePayload } from "./validation.js";
import { dateProperty, numberProperty, richText, selectProperty, title } from "../utils/notion-helpers.js";

export const listTrades = async () => {
  const { tradeDbId } = await ensureDatabases();
  const response = await queryDatabase(tradeDbId);
  return response.results
    .filter(isPageObject)
    .map(mapTradePage)
    .sort((a, b) => {
      const dateCompare = (b.tradeDate ?? "").localeCompare(a.tradeDate ?? "");
      return dateCompare || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
};

export const createTrade = async (payload: TradePayload) => {
  const { tradeDbId } = await ensureDatabases();
  const data = normalizeTradePayload(payload);

  await createPage(tradeDbId, {
    记录标题: title(data.title),
    股票代码: richText(data.stockCode),
    股票名称: richText(data.stockName),
    交易日期: dateProperty(data.tradeDate),
    交易类型: selectProperty(data.tradeType),
    成交价格: numberProperty(data.price),
    股数: numberProperty(data.shares),
    手续费: numberProperty(data.fee),
    税费: numberProperty(data.tax),
    备注: richText(data.notes),
  });
};

export const updateTradeById = async (id: string, payload: TradePayload) => {
  const data = normalizeTradePayload(payload);

  await updatePage(id, {
    记录标题: title(data.title),
    股票代码: richText(data.stockCode),
    股票名称: richText(data.stockName),
    交易日期: dateProperty(data.tradeDate),
    交易类型: selectProperty(data.tradeType),
    成交价格: numberProperty(data.price),
    股数: numberProperty(data.shares),
    手续费: numberProperty(data.fee),
    税费: numberProperty(data.tax),
    备注: richText(data.notes),
  });
};

export const deleteTradeById = async (id: string) => {
  await archivePage(id);
};
