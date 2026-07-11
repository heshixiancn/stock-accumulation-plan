import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type {
  DividendRecord,
  OtherInvestmentAsset,
  OtherInvestmentAssetType,
  OtherInvestmentCurrency,
  OtherInvestmentMarket,
  OtherInvestmentRecordType,
  OtherInvestmentRecord,
  StockPlan,
  StockStatus,
  TradeRecord,
  TradeType,
} from "../types/domain.js";
import { getEffectiveDividendPerShare } from "../utils/dividend.js";
import { percentage, roundTo } from "../utils/math.js";

const readTitle = (page: PageObjectResponse, propertyName: string): string => {
  const property = page.properties[propertyName];
  if (!property || property.type !== "title") return "";
  return property.title.map((item) => item.plain_text).join("");
};

const readRichText = (page: PageObjectResponse, propertyName: string): string => {
  const property = page.properties[propertyName];
  if (!property || property.type !== "rich_text") return "";
  return property.rich_text.map((item) => item.plain_text).join("");
};

const readNumber = (page: PageObjectResponse, propertyName: string): number => {
  const property = page.properties[propertyName];
  if (!property || property.type !== "number" || property.number === null) return 0;
  return property.number;
};

const readSelect = (page: PageObjectResponse, propertyName: string): string => {
  const property = page.properties[propertyName];
  if (!property || property.type !== "select" || !property.select) return "";
  return property.select.name;
};

const readDate = (page: PageObjectResponse, propertyName: string): string | null => {
  const property = page.properties[propertyName];
  if (!property || property.type !== "date" || !property.date) return null;
  return property.date.start;
};

export const mapStockPage = (page: PageObjectResponse): StockPlan => {
  const costPrice = readNumber(page, "成本价");
  const currentPrice = readNumber(page, "当前价格");
  const holdingShares = readNumber(page, "持仓股数");
  const dividendPerShare = readNumber(page, "每股股息");
  const dividendYield = readNumber(page, "股息率");
  const effectiveDividendPerShare = getEffectiveDividendPerShare(currentPrice, dividendYield, dividendPerShare);
  const targetShares = readNumber(page, "目标股数");
  const totalHoldingCost = roundTo(costPrice * holdingShares);
  const marketValue = roundTo(currentPrice * holdingShares);
  const estimatedTargetCapital = roundTo(currentPrice * targetShares);
  const remainingTargetCapital = roundTo(Math.max(targetShares - holdingShares, 0) * currentPrice);
  const unrealizedProfitLoss = roundTo(marketValue - totalHoldingCost);
  const estimatedDividend = roundTo(holdingShares * effectiveDividendPerShare);
  const estimatedDividendYieldOnCost = percentage(estimatedDividend, totalHoldingCost);
  const estimatedDividendYieldOnMarket = percentage(estimatedDividend, marketValue);
  const estimatedDividendAtTarget = roundTo(targetShares * effectiveDividendPerShare);
  const estimatedDividendAtTargetYieldOnCapital = percentage(estimatedDividendAtTarget, estimatedTargetCapital);

  return {
    id: page.id,
    stockCode: readTitle(page, "股票代码"),
    stockName: readRichText(page, "股票名称"),
    currentPrice,
    costPrice,
    targetShares,
    holdingShares,
    totalHoldingCost,
    marketValue,
    estimatedTargetCapital,
    remainingTargetCapital,
    unrealizedProfitLoss,
    unrealizedProfitLossRate: percentage(unrealizedProfitLoss, totalHoldingCost),
    realizedProfitLoss: 0,
    dividendIncome: readNumber(page, "实际股息"),
    totalProfitLoss: unrealizedProfitLoss + readNumber(page, "实际股息"),
    isClosed: holdingShares === 0 && targetShares > 0,
    hasTradeLedger: false,
    dividendYield,
    dividendPerShare,
    estimatedDividend,
    estimatedDividendYieldOnCost,
    estimatedDividendYieldOnMarket,
    estimatedDividendAtTarget,
    estimatedDividendAtTargetYieldOnCapital,
    actualDividend: readNumber(page, "实际股息"),
    status: (readSelect(page, "状态") || "观察中") as StockStatus,
    notes: readRichText(page, "备注"),
    progress: percentage(holdingShares, targetShares),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
};

export const mapTradePage = (page: PageObjectResponse): TradeRecord => ({
  id: page.id,
  title: readTitle(page, "记录标题"),
  stockCode: readRichText(page, "股票代码"),
  stockName: readRichText(page, "股票名称"),
  tradeDate: readDate(page, "交易日期"),
  tradeType: (readSelect(page, "交易类型") || "买入") as TradeType,
  price: readNumber(page, "成交价格"),
  shares: readNumber(page, "股数"),
  fee: readNumber(page, "手续费"),
  tax: readNumber(page, "税费"),
  notes: readRichText(page, "备注"),
  createdAt: page.created_time,
  updatedAt: page.last_edited_time,
});

export const mapDividendPage = (page: PageObjectResponse): DividendRecord => {
  const holdingShares = readNumber(page, "持仓股数");
  const dividendPerShare = readNumber(page, "每股分红");
  const grossDividend = readNumber(page, "税前股息") || roundTo(holdingShares * dividendPerShare);

  return {
    id: page.id,
    title: readTitle(page, "记录标题"),
    stockCode: readRichText(page, "股票代码"),
    stockName: readRichText(page, "股票名称"),
    year: readNumber(page, "年份"),
    exDividendDate: readDate(page, "除权除息日"),
    paymentDate: readDate(page, "到账日期"),
    dividendPerShare,
    holdingShares,
    grossDividend,
    netDividend: readNumber(page, "税后股息"),
    notes: readRichText(page, "备注"),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
};

export const mapOtherInvestmentPage = (page: PageObjectResponse): OtherInvestmentRecord => ({
  id: page.id,
  title: readTitle(page, "记录标题"),
  assetCode: readRichText(page, "资产代码"),
  assetName: readRichText(page, "资产名称"),
  market: (readSelect(page, "市场") || "A股") as OtherInvestmentMarket,
  assetType: (readSelect(page, "资产类型") || "股票") as OtherInvestmentAssetType,
  tradeDate: readDate(page, "交易日期"),
  tradeType: (readSelect(page, "交易类型") || "买入") as OtherInvestmentRecordType,
  price: readNumber(page, "成交价格"),
  quantity: readNumber(page, "数量"),
  fee: readNumber(page, "手续费"),
  tax: readNumber(page, "税费"),
  currentPrice: readNumber(page, "当前价格"),
  currency: (readSelect(page, "币种") || "CNY") as OtherInvestmentCurrency,
  notes: readRichText(page, "备注"),
  createdAt: page.created_time,
  updatedAt: page.last_edited_time,
});

export const mapOtherInvestmentAssetPage = (page: PageObjectResponse): OtherInvestmentAsset => ({
  id: page.id,
  assetCode: readRichText(page, "资产代码"),
  assetName: readTitle(page, "标的名称"),
  market: (readSelect(page, "市场") || "A股") as OtherInvestmentMarket,
  assetType: (readSelect(page, "资产类型") || "股票") as OtherInvestmentAssetType,
  currency: (readSelect(page, "币种") || "CNY") as OtherInvestmentCurrency,
  currentPrice: readNumber(page, "当前价格"),
  costPrice: readNumber(page, "成本价"),
  holdingQuantity: readNumber(page, "持仓数量"),
  costBasis: readNumber(page, "持仓成本"),
  marketValue: readNumber(page, "持仓市值"),
  unrealizedProfitLoss: readNumber(page, "持仓盈亏"),
  unrealizedProfitLossRate: 0,
  realizedProfitLoss: readNumber(page, "已实现盈亏"),
  totalProfitLoss: readNumber(page, "总盈亏"),
  totalProfitLossRate: 0,
  isClosed: readSelect(page, "状态") === "已清仓",
  notes: readRichText(page, "备注"),
  createdAt: page.created_time,
  updatedAt: page.last_edited_time,
});
