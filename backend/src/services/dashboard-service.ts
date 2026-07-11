import type { DashboardSummary } from "../types/domain.js";
import { percentage, roundTo } from "../utils/math.js";
import { listDividends } from "./dividend-service.js";
import { getOtherInvestmentOverview } from "./other-investment-service.js";
import { applyPortfolioToStocks, buildPortfolioPositions } from "./portfolio-service.js";
import { listStockPlans } from "./stock-service.js";
import { listTrades } from "./trade-service.js";

type PortfolioCurrencySummary = DashboardSummary["portfolioByCurrency"][number];
type ModuleAllocation = DashboardSummary["moduleAllocation"][number];
type OtherMarketAllocation = DashboardSummary["otherInvestmentMarketAllocation"][number];
type OtherTypeAllocation = DashboardSummary["otherInvestmentTypeAllocation"][number];

const createCurrencySummary = (currency: PortfolioCurrencySummary["currency"]): PortfolioCurrencySummary => ({
  currency,
  marketValue: 0,
  costBasis: 0,
  unrealizedProfitLoss: 0,
  unrealizedProfitLossRate: 0,
  realizedProfitLoss: 0,
  totalProfitLoss: 0,
  totalProfitLossRate: 0,
  positionCount: 0,
  openPositionCount: 0,
  closedPositionCount: 0,
});

const addToCurrencySummary = (
  map: Map<PortfolioCurrencySummary["currency"], PortfolioCurrencySummary>,
  currency: PortfolioCurrencySummary["currency"],
  values: {
    marketValue: number;
    costBasis: number;
    unrealizedProfitLoss: number;
    realizedProfitLoss: number;
    totalProfitLoss: number;
    isClosed: boolean;
  },
) => {
  const summary = map.get(currency) ?? createCurrencySummary(currency);
  summary.marketValue += values.marketValue;
  summary.costBasis += values.costBasis;
  summary.unrealizedProfitLoss += values.unrealizedProfitLoss;
  summary.realizedProfitLoss += values.realizedProfitLoss;
  summary.totalProfitLoss += values.totalProfitLoss;
  summary.positionCount += 1;
  summary.openPositionCount += values.isClosed ? 0 : 1;
  summary.closedPositionCount += values.isClosed ? 1 : 0;
  map.set(currency, summary);
};

const finalizeCurrencySummary = (summary: PortfolioCurrencySummary): PortfolioCurrencySummary => ({
  ...summary,
  marketValue: roundTo(summary.marketValue),
  costBasis: roundTo(summary.costBasis),
  unrealizedProfitLoss: roundTo(summary.unrealizedProfitLoss),
  unrealizedProfitLossRate: percentage(summary.unrealizedProfitLoss, summary.costBasis),
  realizedProfitLoss: roundTo(summary.realizedProfitLoss),
  totalProfitLoss: roundTo(summary.totalProfitLoss),
  totalProfitLossRate: percentage(summary.totalProfitLoss, summary.costBasis),
});

const sortByValueThenName = <T extends { marketValue: number; name: string }>(items: T[]) =>
  items.sort((a, b) => b.marketValue - a.marketValue || a.name.localeCompare(b.name, "zh-CN"));

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const [stockPlans, dividends, trades, otherInvestments] = await Promise.all([
    listStockPlans(),
    listDividends(),
    listTrades(),
    getOtherInvestmentOverview(),
  ]);
  const stocks = applyPortfolioToStocks(stockPlans, trades, dividends);
  const positions = buildPortfolioPositions(stockPlans, trades, dividends);
  const stockCodes = new Set(stocks.map((stock) => stock.stockCode));

  const totalTargetShares = stocks.reduce((sum, item) => sum + item.targetShares, 0);
  const totalHoldingShares = stocks.reduce((sum, item) => sum + item.holdingShares, 0);
  const totalHoldingCost = roundTo(positions.reduce((sum, item) => sum + item.totalHoldingCost, 0));
  const totalMarketValue = roundTo(positions.reduce((sum, item) => sum + item.marketValue, 0));
  const totalEstimatedTargetCapital = roundTo(stocks.reduce((sum, item) => sum + item.estimatedTargetCapital, 0));
  const totalRemainingTargetCapital = roundTo(stocks.reduce((sum, item) => sum + item.remainingTargetCapital, 0));
  const totalUnrealizedProfitLoss = roundTo(positions.reduce((sum, item) => sum + item.unrealizedProfitLoss, 0));
  const totalRealizedProfitLoss = roundTo(positions.reduce((sum, item) => sum + item.realizedProfitLoss, 0));
  const estimatedAnnualDividend = roundTo(stocks.reduce((sum, item) => sum + item.estimatedDividend, 0));
  const estimatedAnnualDividendYieldOnCost = percentage(estimatedAnnualDividend, totalHoldingCost);
  const estimatedAnnualDividendYieldOnMarket = percentage(estimatedAnnualDividend, totalMarketValue);
  const estimatedAnnualDividendAtTarget = roundTo(stocks.reduce((sum, item) => sum + item.estimatedDividendAtTarget, 0));
  const estimatedAnnualDividendAtTargetYieldOnCapital = percentage(
    estimatedAnnualDividendAtTarget,
    totalEstimatedTargetCapital,
  );
  const actualTotalDividend = roundTo(dividends.reduce((sum, item) => sum + item.netDividend, 0));
  const totalProfitLoss = roundTo(positions.reduce((sum, item) => sum + item.totalProfitLoss, 0));

  const portfolioCurrencyMap = new Map<PortfolioCurrencySummary["currency"], PortfolioCurrencySummary>();
  for (const position of positions) {
    addToCurrencySummary(portfolioCurrencyMap, "CNY", {
      marketValue: position.marketValue,
      costBasis: position.totalHoldingCost,
      unrealizedProfitLoss: position.unrealizedProfitLoss,
      realizedProfitLoss: position.realizedProfitLoss,
      totalProfitLoss: position.totalProfitLoss,
      isClosed: position.isClosed,
    });
  }
  for (const position of otherInvestments.positions) {
    addToCurrencySummary(portfolioCurrencyMap, position.currency, {
      marketValue: position.marketValue,
      costBasis: position.costBasis,
      unrealizedProfitLoss: position.unrealizedProfitLoss,
      realizedProfitLoss: position.realizedProfitLoss,
      totalProfitLoss: position.totalProfitLoss,
      isClosed: position.isClosed,
    });
  }
  const portfolioByCurrency = [...portfolioCurrencyMap.values()]
    .map(finalizeCurrencySummary)
    .sort((a, b) => b.marketValue - a.marketValue || a.currency.localeCompare(b.currency));
  const portfolioTotalCostBasis = roundTo(portfolioByCurrency.reduce((sum, item) => sum + item.costBasis, 0));
  const portfolioTotalMarketValue = roundTo(portfolioByCurrency.reduce((sum, item) => sum + item.marketValue, 0));
  const portfolioTotalUnrealizedProfitLoss = roundTo(
    portfolioByCurrency.reduce((sum, item) => sum + item.unrealizedProfitLoss, 0),
  );
  const portfolioTotalRealizedProfitLoss = roundTo(
    portfolioByCurrency.reduce((sum, item) => sum + item.realizedProfitLoss, 0),
  );
  const portfolioTotalProfitLoss = roundTo(portfolioByCurrency.reduce((sum, item) => sum + item.totalProfitLoss, 0));

  const moduleAllocation: ModuleAllocation[] = [
    {
      name: "蓝筹攒股",
      currency: "CNY" as const,
      marketValue: totalMarketValue,
      costBasis: totalHoldingCost,
      unrealizedProfitLoss: totalUnrealizedProfitLoss,
      realizedProfitLoss: totalRealizedProfitLoss,
      totalProfitLoss,
      positionCount: positions.length,
    },
    ...otherInvestments.summary.byCurrency.map((item) => ({
      name: "其他投资",
      currency: item.currency,
      marketValue: item.marketValue,
      costBasis: item.costBasis,
      unrealizedProfitLoss: item.unrealizedProfitLoss,
      realizedProfitLoss: item.realizedProfitLoss,
      totalProfitLoss: item.totalProfitLoss,
      positionCount: item.positionCount,
    })),
  ]
    .filter(
      (item) =>
        item.positionCount > 0 || item.marketValue !== 0 || item.costBasis !== 0 || item.totalProfitLoss !== 0,
    )
    .sort((a, b) => b.marketValue - a.marketValue || a.name.localeCompare(b.name, "zh-CN"));

  const otherInvestmentMarketMap = new Map<string, OtherMarketAllocation>();
  const otherInvestmentTypeMap = new Map<string, OtherTypeAllocation>();
  for (const position of otherInvestments.positions) {
    const marketKey = `${position.market}-${position.currency}`;
    const marketItem = otherInvestmentMarketMap.get(marketKey) ?? {
      name: position.market,
      currency: position.currency,
      marketValue: 0,
      totalProfitLoss: 0,
      positionCount: 0,
    };
    marketItem.marketValue += position.marketValue;
    marketItem.totalProfitLoss += position.totalProfitLoss;
    marketItem.positionCount += 1;
    otherInvestmentMarketMap.set(marketKey, marketItem);

    const typeKey = `${position.assetType}-${position.currency}`;
    const typeItem = otherInvestmentTypeMap.get(typeKey) ?? {
      name: position.assetType,
      currency: position.currency,
      marketValue: 0,
      totalProfitLoss: 0,
      positionCount: 0,
    };
    typeItem.marketValue += position.marketValue;
    typeItem.totalProfitLoss += position.totalProfitLoss;
    typeItem.positionCount += 1;
    otherInvestmentTypeMap.set(typeKey, typeItem);
  }

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
    portfolioTotalCostBasis,
    portfolioTotalMarketValue,
    portfolioTotalUnrealizedProfitLoss,
    portfolioTotalUnrealizedProfitLossRate: percentage(portfolioTotalUnrealizedProfitLoss, portfolioTotalCostBasis),
    portfolioTotalRealizedProfitLoss,
    portfolioTotalProfitLoss,
    portfolioTotalProfitLossRate: percentage(portfolioTotalProfitLoss, portfolioTotalCostBasis),
    portfolioOpenPositionCount: portfolioByCurrency.reduce((sum, item) => sum + item.openPositionCount, 0),
    portfolioClosedPositionCount: portfolioByCurrency.reduce((sum, item) => sum + item.closedPositionCount, 0),
    portfolioByCurrency,
    moduleAllocation,
    otherInvestmentMarketAllocation: sortByValueThenName(
      [...otherInvestmentMarketMap.values()].map((item) => ({
        ...item,
        marketValue: roundTo(item.marketValue),
        totalProfitLoss: roundTo(item.totalProfitLoss),
      })),
    ),
    otherInvestmentTypeAllocation: sortByValueThenName(
      [...otherInvestmentTypeMap.values()].map((item) => ({
        ...item,
        marketValue: roundTo(item.marketValue),
        totalProfitLoss: roundTo(item.totalProfitLoss),
      })),
    ),
    totalTargetShares,
    totalHoldingShares,
    totalHoldingCost,
    totalMarketValue,
    totalEstimatedTargetCapital,
    totalRemainingTargetCapital,
    totalUnrealizedProfitLoss,
    totalUnrealizedProfitLossRate: percentage(totalUnrealizedProfitLoss, totalHoldingCost),
    totalRealizedProfitLoss,
    totalProfitLoss,
    totalProfitLossRate: percentage(totalProfitLoss, totalHoldingCost),
    estimatedAnnualDividend,
    estimatedAnnualDividendYieldOnCost,
    estimatedAnnualDividendYieldOnMarket,
    estimatedAnnualDividendAtTarget,
    estimatedAnnualDividendAtTargetYieldOnCapital,
    actualTotalDividend,
    overallProgress: percentage(totalHoldingShares, totalTargetShares),
    stockProgress: [
      ...stocks.map((stock) => ({
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
        realizedProfitLoss: stock.realizedProfitLoss,
        dividendIncome: stock.dividendIncome,
        totalProfitLoss: stock.totalProfitLoss,
        isClosed: stock.isClosed,
        progress: stock.progress,
        estimatedDividend: stock.estimatedDividend,
        estimatedDividendYieldOnCost: stock.estimatedDividendYieldOnCost,
        estimatedDividendYieldOnMarket: stock.estimatedDividendYieldOnMarket,
        estimatedDividendAtTarget: stock.estimatedDividendAtTarget,
        estimatedDividendAtTargetYieldOnCapital: stock.estimatedDividendAtTargetYieldOnCapital,
        actualDividend: stock.actualDividend,
      })),
      ...positions
        .filter((position) => !stockCodes.has(position.stockCode))
        .map((position) => ({
          stockCode: position.stockCode,
          stockName: position.stockName,
          targetShares: 0,
          holdingShares: position.holdingShares,
          currentPrice: position.currentPrice,
          costPrice: position.costPrice,
          totalHoldingCost: position.totalHoldingCost,
          marketValue: position.marketValue,
          estimatedTargetCapital: 0,
          remainingTargetCapital: 0,
          unrealizedProfitLoss: position.unrealizedProfitLoss,
          unrealizedProfitLossRate: position.unrealizedProfitLossRate,
          realizedProfitLoss: position.realizedProfitLoss,
          dividendIncome: position.dividendIncome,
          totalProfitLoss: position.totalProfitLoss,
          isClosed: position.isClosed,
          progress: 0,
          estimatedDividend: 0,
          estimatedDividendYieldOnCost: 0,
          estimatedDividendYieldOnMarket: 0,
          estimatedDividendAtTarget: 0,
          estimatedDividendAtTargetYieldOnCapital: 0,
          actualDividend: position.dividendIncome,
        })),
    ].sort((a, b) => b.progress - a.progress || a.stockCode.localeCompare(b.stockCode, "zh-CN")),
    dividendsByYear: [...dividendsByYearMap.values()].sort((a, b) => a.year - b.year),
    dividendContribution: [...dividendContributionMap.values()].sort((a, b) => b.amount - a.amount),
    profitLossByStock: positions
      .filter(
        (item) =>
          item.holdingShares > 0 ||
          item.realizedProfitLoss !== 0 ||
          item.unrealizedProfitLoss !== 0 ||
          item.dividendIncome !== 0,
      )
      .map((item) => ({
        stockCode: item.stockCode,
        stockName: item.stockName,
        unrealizedProfitLoss: item.unrealizedProfitLoss,
        realizedProfitLoss: item.realizedProfitLoss,
        dividendIncome: item.dividendIncome,
        totalProfitLoss: item.totalProfitLoss,
      }))
      .sort((a, b) => b.totalProfitLoss - a.totalProfitLoss),
  };
};
