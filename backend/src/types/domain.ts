export type StockStatus = "观察中" | "建仓中" | "持有中" | "已暂停";

export interface StockPlan {
  id: string;
  stockCode: string;
  stockName: string;
  currentPrice: number;
  costPrice: number;
  targetShares: number;
  holdingShares: number;
  totalHoldingCost: number;
  marketValue: number;
  estimatedTargetCapital: number;
  remainingTargetCapital: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossRate: number;
  dividendYield: number;
  dividendPerShare: number;
  estimatedDividend: number;
  estimatedDividendYieldOnCost: number;
  estimatedDividendYieldOnMarket: number;
  estimatedDividendAtTarget: number;
  estimatedDividendAtTargetYieldOnCapital: number;
  actualDividend: number;
  status: StockStatus;
  notes: string;
  progress: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DividendRecord {
  id: string;
  title: string;
  stockCode: string;
  stockName: string;
  year: number;
  exDividendDate?: string | null;
  paymentDate?: string | null;
  dividendPerShare: number;
  holdingShares: number;
  grossDividend: number;
  netDividend: number;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  totalTargetShares: number;
  totalHoldingShares: number;
  totalHoldingCost: number;
  totalMarketValue: number;
  totalEstimatedTargetCapital: number;
  totalRemainingTargetCapital: number;
  totalUnrealizedProfitLoss: number;
  totalUnrealizedProfitLossRate: number;
  estimatedAnnualDividend: number;
  estimatedAnnualDividendYieldOnCost: number;
  estimatedAnnualDividendYieldOnMarket: number;
  estimatedAnnualDividendAtTarget: number;
  estimatedAnnualDividendAtTargetYieldOnCapital: number;
  actualTotalDividend: number;
  overallProgress: number;
  stockProgress: Array<{
    stockCode: string;
    stockName: string;
    targetShares: number;
    holdingShares: number;
    currentPrice: number;
    costPrice: number;
    totalHoldingCost: number;
    marketValue: number;
    estimatedTargetCapital: number;
    remainingTargetCapital: number;
    unrealizedProfitLoss: number;
    unrealizedProfitLossRate: number;
    progress: number;
    estimatedDividend: number;
    estimatedDividendYieldOnCost: number;
    estimatedDividendYieldOnMarket: number;
    estimatedDividendAtTarget: number;
    estimatedDividendAtTargetYieldOnCapital: number;
    actualDividend: number;
  }>;
  dividendsByYear: Array<{
    year: number;
    grossDividend: number;
    netDividend: number;
  }>;
  dividendContribution: Array<{
    stockCode: string;
    stockName: string;
    amount: number;
  }>;
}
