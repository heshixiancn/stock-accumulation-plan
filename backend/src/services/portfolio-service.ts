import type { DividendRecord, StockPlan, TradeRecord } from "../types/domain.js";
import { getEffectiveDividendPerShare } from "../utils/dividend.js";
import { percentage, roundTo } from "../utils/math.js";
import { calculateTradeLedger, sortTradesAsc } from "../utils/trade-ledger.js";

export interface PortfolioPosition {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  targetShares: number;
  holdingShares: number;
  costPrice: number;
  totalHoldingCost: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossRate: number;
  realizedProfitLoss: number;
  dividendIncome: number;
  totalProfitLoss: number;
  isClosed: boolean;
  hasTradeLedger: boolean;
}

const stockKey = (stockCode: string) => stockCode.trim();

export const buildPortfolioPositions = (
  stocks: StockPlan[],
  trades: TradeRecord[],
  dividends: DividendRecord[],
): PortfolioPosition[] => {
  const stockMap = new Map(stocks.map((stock) => [stockKey(stock.stockCode), stock]));
  const tradesByStock = new Map<string, TradeRecord[]>();
  const dividendsByStock = new Map<string, DividendRecord[]>();
  const allKeys = new Set<string>();

  for (const stock of stocks) {
    allKeys.add(stockKey(stock.stockCode));
  }

  for (const trade of trades) {
    const key = stockKey(trade.stockCode);
    if (!key) continue;
    allKeys.add(key);
    tradesByStock.set(key, [...(tradesByStock.get(key) ?? []), trade]);
  }

  for (const dividend of dividends) {
    const key = stockKey(dividend.stockCode);
    if (!key) continue;
    allKeys.add(key);
    dividendsByStock.set(key, [...(dividendsByStock.get(key) ?? []), dividend]);
  }

  return [...allKeys].map((key) => {
    const stock = stockMap.get(key);
    const stockTrades = tradesByStock.get(key) ?? [];
    const stockDividends = dividendsByStock.get(key) ?? [];
    const lastTrade = sortTradesAsc(stockTrades).at(-1);
    const { holdingShares, costBasis, realizedProfitLoss } = calculateTradeLedger(stockTrades);

    const hasTradeLedger = stockTrades.length > 0;
    const currentPrice = stock?.currentPrice || lastTrade?.price || 0;
    const manualHoldingShares = stock?.holdingShares ?? 0;
    const manualCostBasis = (stock?.costPrice ?? 0) * manualHoldingShares;
    const effectiveHoldingShares = hasTradeLedger ? holdingShares : manualHoldingShares;
    const effectiveCostBasis = hasTradeLedger ? costBasis : manualCostBasis;
    const costPrice = effectiveHoldingShares > 0 ? effectiveCostBasis / effectiveHoldingShares : 0;
    const marketValue = currentPrice * effectiveHoldingShares;
    const unrealizedProfitLoss = marketValue - effectiveCostBasis;
    const dividendIncome = stockDividends.reduce((sum, item) => sum + item.netDividend, 0);
    const effectiveRealizedProfitLoss = hasTradeLedger ? realizedProfitLoss : 0;
    const totalProfitLoss = unrealizedProfitLoss + effectiveRealizedProfitLoss + dividendIncome;

    return {
      stockCode: stock?.stockCode || lastTrade?.stockCode || stockDividends[0]?.stockCode || key,
      stockName: stock?.stockName || lastTrade?.stockName || stockDividends[0]?.stockName || key,
      currentPrice: roundTo(currentPrice),
      targetShares: stock?.targetShares ?? 0,
      holdingShares: roundTo(effectiveHoldingShares),
      // Keep enough precision for the displayed unit cost to reconcile with
      // totalHoldingCost and unrealizedProfitLoss. Monetary totals are still
      // rounded to cents below.
      costPrice: roundTo(costPrice, 6),
      totalHoldingCost: roundTo(effectiveCostBasis),
      marketValue: roundTo(marketValue),
      unrealizedProfitLoss: roundTo(unrealizedProfitLoss),
      unrealizedProfitLossRate: percentage(unrealizedProfitLoss, effectiveCostBasis),
      realizedProfitLoss: roundTo(effectiveRealizedProfitLoss),
      dividendIncome: roundTo(dividendIncome),
      totalProfitLoss: roundTo(totalProfitLoss),
      isClosed: hasTradeLedger && effectiveHoldingShares === 0,
      hasTradeLedger,
    };
  });
};

export const applyPortfolioToStocks = (
  stocks: StockPlan[],
  trades: TradeRecord[],
  dividends: DividendRecord[],
): StockPlan[] => {
  const positions = new Map(buildPortfolioPositions(stocks, trades, dividends).map((position) => [stockKey(position.stockCode), position]));

  return stocks.map((stock) => {
    const position = positions.get(stockKey(stock.stockCode));
    if (!position) return stock;

    const holdingShares = position.holdingShares;
    const totalHoldingCost = position.totalHoldingCost;
    const marketValue = position.marketValue;
    const currentPrice = stock.currentPrice;
    const effectiveDividendPerShare = getEffectiveDividendPerShare(
      currentPrice,
      stock.dividendYield,
      stock.dividendPerShare,
    );
    const estimatedDividend = roundTo(holdingShares * effectiveDividendPerShare);
    const estimatedTargetCapital = roundTo(currentPrice * stock.targetShares);
    const remainingTargetCapital = roundTo(Math.max(stock.targetShares - holdingShares, 0) * currentPrice);
    const estimatedDividendAtTarget = roundTo(stock.targetShares * effectiveDividendPerShare);

    return {
      ...stock,
      costPrice: position.costPrice,
      holdingShares,
      totalHoldingCost,
      marketValue,
      estimatedTargetCapital,
      remainingTargetCapital,
      unrealizedProfitLoss: position.unrealizedProfitLoss,
      unrealizedProfitLossRate: position.unrealizedProfitLossRate,
      realizedProfitLoss: position.realizedProfitLoss,
      dividendIncome: position.dividendIncome,
      totalProfitLoss: position.totalProfitLoss,
      isClosed: position.isClosed,
      hasTradeLedger: position.hasTradeLedger,
      estimatedDividend,
      estimatedDividendYieldOnCost: percentage(estimatedDividend, totalHoldingCost),
      estimatedDividendYieldOnMarket: percentage(estimatedDividend, marketValue),
      estimatedDividendAtTarget,
      estimatedDividendAtTargetYieldOnCapital: percentage(estimatedDividendAtTarget, estimatedTargetCapital),
      actualDividend: position.dividendIncome || stock.actualDividend,
      progress: percentage(holdingShares, stock.targetShares),
    };
  });
};
