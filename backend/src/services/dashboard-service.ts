import type { DashboardSummary } from "../types/domain.js";
import { percentage, roundTo } from "../utils/math.js";
import { listDividends } from "./dividend-service.js";
import { listStocks } from "./stock-service.js";

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const [stocks, dividends] = await Promise.all([listStocks(), listDividends()]);

  const totalTargetShares = stocks.reduce((sum, item) => sum + item.targetShares, 0);
  const totalHoldingShares = stocks.reduce((sum, item) => sum + item.holdingShares, 0);
  const totalHoldingCost = roundTo(stocks.reduce((sum, item) => sum + item.totalHoldingCost, 0));
  const totalMarketValue = roundTo(stocks.reduce((sum, item) => sum + item.marketValue, 0));
  const totalEstimatedTargetCapital = roundTo(stocks.reduce((sum, item) => sum + item.estimatedTargetCapital, 0));
  const totalRemainingTargetCapital = roundTo(stocks.reduce((sum, item) => sum + item.remainingTargetCapital, 0));
  const totalUnrealizedProfitLoss = roundTo(totalMarketValue - totalHoldingCost);
  const estimatedAnnualDividend = roundTo(stocks.reduce((sum, item) => sum + item.estimatedDividend, 0));
  const estimatedAnnualDividendYieldOnCost = percentage(estimatedAnnualDividend, totalHoldingCost);
  const estimatedAnnualDividendYieldOnMarket = percentage(estimatedAnnualDividend, totalMarketValue);
  const estimatedAnnualDividendAtTarget = roundTo(stocks.reduce((sum, item) => sum + item.estimatedDividendAtTarget, 0));
  const estimatedAnnualDividendAtTargetYieldOnCapital = percentage(
    estimatedAnnualDividendAtTarget,
    totalEstimatedTargetCapital,
  );
  const actualTotalDividend = roundTo(dividends.reduce((sum, item) => sum + item.netDividend, 0));

  const dividendsByYearMap = new Map<number, { year: number; grossDividend: number; netDividend: number }>();
  for (const record of dividends) {
    const existing = dividendsByYearMap.get(record.year) ?? {
      year: record.year,
      grossDividend: 0,
      netDividend: 0,
    };
    existing.grossDividend = roundTo(existing.grossDividend + record.grossDividend);
    existing.netDividend = roundTo(existing.netDividend + record.netDividend);
    dividendsByYearMap.set(record.year, existing);
  }

  const dividendContributionMap = new Map<string, { stockCode: string; stockName: string; amount: number }>();
  for (const record of dividends) {
    const key = `${record.stockCode}-${record.stockName}`;
    const existing = dividendContributionMap.get(key) ?? {
      stockCode: record.stockCode,
      stockName: record.stockName,
      amount: 0,
    };
    existing.amount = roundTo(existing.amount + record.netDividend);
    dividendContributionMap.set(key, existing);
  }

  return {
    totalTargetShares,
    totalHoldingShares,
    totalHoldingCost,
    totalMarketValue,
    totalEstimatedTargetCapital,
    totalRemainingTargetCapital,
    totalUnrealizedProfitLoss,
    totalUnrealizedProfitLossRate: percentage(totalUnrealizedProfitLoss, totalHoldingCost),
    estimatedAnnualDividend,
    estimatedAnnualDividendYieldOnCost,
    estimatedAnnualDividendYieldOnMarket,
    estimatedAnnualDividendAtTarget,
    estimatedAnnualDividendAtTargetYieldOnCapital,
    actualTotalDividend,
    overallProgress: percentage(totalHoldingShares, totalTargetShares),
    stockProgress: stocks
      .map((stock) => ({
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        targetShares: stock.targetShares,
        holdingShares: stock.holdingShares,
        currentPrice: stock.currentPrice,
        costPrice: stock.costPrice,
        totalHoldingCost: stock.totalHoldingCost,
        marketValue: stock.marketValue,
        estimatedTargetCapital: stock.estimatedTargetCapital,
        remainingTargetCapital: stock.remainingTargetCapital,
        unrealizedProfitLoss: stock.unrealizedProfitLoss,
        unrealizedProfitLossRate: stock.unrealizedProfitLossRate,
        progress: stock.progress,
        estimatedDividend: stock.estimatedDividend,
        estimatedDividendYieldOnCost: stock.estimatedDividendYieldOnCost,
        estimatedDividendYieldOnMarket: stock.estimatedDividendYieldOnMarket,
        estimatedDividendAtTarget: stock.estimatedDividendAtTarget,
        estimatedDividendAtTargetYieldOnCapital: stock.estimatedDividendAtTargetYieldOnCapital,
        actualDividend: stock.actualDividend,
      }))
      .sort((a, b) => b.progress - a.progress || a.stockCode.localeCompare(b.stockCode, "zh-CN")),
    dividendsByYear: [...dividendsByYearMap.values()].sort((a, b) => a.year - b.year),
    dividendContribution: [...dividendContributionMap.values()].sort((a, b) => b.amount - a.amount),
  };
};
