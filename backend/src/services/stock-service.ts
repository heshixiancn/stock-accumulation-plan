import { archivePage, createPage, ensureDatabases, isPageObject, queryDatabase, updatePage } from "../lib/notion.js";
import { mapStockPage } from "./notion-mappers.js";
import { normalizeStockPayload, type StockPayload } from "./validation.js";
import {
  numberProperty,
  richText,
  selectProperty,
  title,
} from "../utils/notion-helpers.js";

export const listStocks = async () => {
  const { stockDbId } = await ensureDatabases();
  const response = await queryDatabase(stockDbId);
  return response.results.filter(isPageObject).map(mapStockPage);
};

export const createStock = async (payload: StockPayload) => {
  const { stockDbId } = await ensureDatabases();
  const data = normalizeStockPayload(payload);

  await createPage(stockDbId, {
    股票代码: title(data.stockCode),
    股票名称: richText(data.stockName),
    当前价格: numberProperty(data.currentPrice),
    成本价: numberProperty(data.costPrice),
    目标股数: numberProperty(data.targetShares),
    持仓股数: numberProperty(data.holdingShares),
    总持仓成本: numberProperty(data.totalHoldingCost),
    股息率: numberProperty(data.dividendYield),
    每股股息: numberProperty(data.dividendPerShare),
    预计股息: numberProperty(data.estimatedDividend),
    实际股息: numberProperty(data.actualDividend),
    状态: selectProperty(data.status),
    备注: richText(data.notes),
  });
};

export const updateStockById = async (id: string, payload: StockPayload) => {
  const data = normalizeStockPayload(payload);

  await updatePage(id, {
    股票代码: title(data.stockCode),
    股票名称: richText(data.stockName),
    当前价格: numberProperty(data.currentPrice),
    成本价: numberProperty(data.costPrice),
    目标股数: numberProperty(data.targetShares),
    持仓股数: numberProperty(data.holdingShares),
    总持仓成本: numberProperty(data.totalHoldingCost),
    股息率: numberProperty(data.dividendYield),
    每股股息: numberProperty(data.dividendPerShare),
    预计股息: numberProperty(data.estimatedDividend),
    实际股息: numberProperty(data.actualDividend),
    状态: selectProperty(data.status),
    备注: richText(data.notes),
  });
};

export const deleteStockById = async (id: string) => {
  await archivePage(id);
};

