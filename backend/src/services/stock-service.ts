import { archivePage, createPage, ensureDatabases, isPageObject, queryDatabase, updatePage } from "../lib/notion.js";
import { listDividends } from "./dividend-service.js";
import { fetchStockMarketQuote } from "./market-data-service.js";
import { mapStockPage } from "./notion-mappers.js";
import { applyPortfolioToStocks } from "./portfolio-service.js";
import { listTrades } from "./trade-service.js";
import type { MarketQuote, StockPlan } from "../types/domain.js";
import { normalizeStockPayload, type StockPayload } from "./validation.js";
import { HttpError } from "../utils/errors.js";
import {
  numberProperty,
  richText,
  selectProperty,
  title,
} from "../utils/notion-helpers.js";

export const listStockPlans = async () => {
  const { stockDbId } = await ensureDatabases();
  const response = await queryDatabase(stockDbId);
  return response.results.filter(isPageObject).map(mapStockPage);
};

export const listStocks = async () => {
  const [stocks, trades, dividends] = await Promise.all([listStockPlans(), listTrades(), listDividends()]);
  return applyPortfolioToStocks(stocks, trades, dividends);
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

const syncStockMarketData = async (stock: StockPlan) => {
  const quote = await fetchStockMarketQuote(stock);
  await updateStockById(stock.id, {
    stockCode: stock.stockCode,
    stockName: quote.stockName || stock.stockName || stock.stockCode,
    currentPrice: quote.currentPrice,
    costPrice: stock.costPrice,
    targetShares: stock.targetShares,
    holdingShares: stock.holdingShares,
    dividendYield: quote.dividendYield,
    dividendPerShare: stock.dividendPerShare,
    actualDividend: stock.actualDividend,
    status: stock.status,
    notes: stock.notes,
  });

  return quote;
};

export const syncStockMarketDataById = async (id: string) => {
  const stocks = await listStockPlans();
  const stock = stocks.find((item) => item.id === id);

  if (!stock) {
    throw new HttpError(404, "未找到股票计划。");
  }

  return syncStockMarketData(stock);
};

export const syncStocksMarketData = async (ids?: string[]) => {
  const stocks = await listStockPlans();
  const idSet = ids && ids.length > 0 ? new Set(ids) : null;
  const targets = idSet ? stocks.filter((item) => idSet.has(item.id)) : stocks;
  const results: Array<{
    id: string;
    stockCode: string;
    stockName: string;
    ok: boolean;
    message?: string;
    quote?: MarketQuote;
  }> = [];

  for (const stock of targets) {
    try {
      const quote = await syncStockMarketData(stock);
      results.push({
        id: stock.id,
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        ok: true,
        quote,
      });
    } catch (error) {
      results.push({
        id: stock.id,
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        ok: false,
        message: error instanceof Error ? error.message : "同步失败",
      });
    }
  }

  return {
    total: targets.length,
    successCount: results.filter((item) => item.ok).length,
    failedCount: results.filter((item) => !item.ok).length,
    results,
  };
};
