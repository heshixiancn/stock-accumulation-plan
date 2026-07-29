export type StockStatus = "观察中" | "建仓中" | "持有中" | "已暂停";
export type TradeType = "买入" | "卖出";
export type OtherInvestmentRecordType = TradeType | "分红";
export type OtherInvestmentMarket = "A股" | "美股" | "港股";
export type OtherInvestmentAssetType = "股票" | "基金" | "ETF" | "可转债" | "其他";
export type OtherInvestmentCurrency = "CNY" | "USD" | "HKD";

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
  realizedProfitLoss: number;
  dividendIncome: number;
  totalProfitLoss: number;
  isClosed: boolean;
  hasTradeLedger: boolean;
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
}

export interface TradeRecord {
  id: string;
  title: string;
  stockCode: string;
  stockName: string;
  tradeDate: string | null;
  tradeType: TradeType;
  price: number;
  shares: number;
  fee: number;
  tax: number;
  notes: string;
}

export interface MarketQuote {
  stockCode: string;
  stockName?: string;
  currentPrice: number;
  previousClose?: number;
  dividendYield: number;
  provider: string;
  updatedAt?: string;
}

export interface MarketSyncResult {
  message: string;
  total: number;
  successCount: number;
  changedCount: number;
  unchangedCount: number;
  failedCount: number;
  results: Array<{
    id: string;
    stockCode: string;
    stockName: string;
    ok: boolean;
    changed?: boolean;
    previousPrice?: number;
    message?: string;
    quote?: MarketQuote;
  }>;
}

export interface OtherInvestmentMarketSyncResult {
  message: string;
  total: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    assetCode: string;
    assetName: string;
    market: OtherInvestmentMarket;
    ok: boolean;
    message?: string;
    quote?: {
      assetCode: string;
      assetName?: string;
      market: OtherInvestmentMarket;
      currentPrice: number;
      provider: string;
      updatedAt?: string;
    };
  }>;
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
}

export interface OtherInvestmentRecord {
  id: string;
  title: string;
  assetCode: string;
  assetName: string;
  market: OtherInvestmentMarket;
  assetType: OtherInvestmentAssetType;
  tradeDate: string | null;
  tradeType: OtherInvestmentRecordType;
  price: number;
  quantity: number;
  fee: number;
  tax: number;
  currentPrice: number;
  currency: OtherInvestmentCurrency;
  notes: string;
}

export interface OtherInvestmentAsset {
  id: string;
  assetCode: string;
  assetName: string;
  market: OtherInvestmentMarket;
  assetType: OtherInvestmentAssetType;
  currency: OtherInvestmentCurrency;
  currentPrice: number;
  holdingQuantity: number;
  costBasis: number;
  costPrice: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossRate: number;
  realizedProfitLoss: number;
  dividendIncome: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  isClosed: boolean;
  notes: string;
}

export interface OtherInvestmentPosition extends OtherInvestmentAsset {
  tradeCount: number;
  latestTradeDate: string | null;
}

export interface OtherInvestmentOverview {
  records: OtherInvestmentRecord[];
  positions: OtherInvestmentPosition[];
  summary: {
    totalMarketValue: number;
    totalCostBasis: number;
    totalUnrealizedProfitLoss: number;
    totalRealizedProfitLoss: number;
    totalDividendIncome: number;
    totalProfitLoss: number;
    positionCount: number;
    openPositionCount: number;
    closedPositionCount: number;
    byMarket: Array<{
      market: OtherInvestmentMarket;
      marketValue: number;
      totalProfitLoss: number;
    }>;
    byCurrency: Array<{
      currency: OtherInvestmentCurrency;
      marketValue: number;
      costBasis: number;
      unrealizedProfitLoss: number;
      realizedProfitLoss: number;
      dividendIncome: number;
      totalProfitLoss: number;
      positionCount: number;
    }>;
  };
}

export interface DashboardSummary {
  portfolioTotalCostBasis: number;
  portfolioTotalMarketValue: number;
  portfolioTotalUnrealizedProfitLoss: number;
  portfolioTotalUnrealizedProfitLossRate: number;
  portfolioTotalRealizedProfitLoss: number;
  portfolioTotalProfitLoss: number;
  portfolioTotalProfitLossRate: number;
  portfolioOpenPositionCount: number;
  portfolioClosedPositionCount: number;
  portfolioByCurrency: Array<{
    currency: OtherInvestmentCurrency;
    marketValue: number;
    costBasis: number;
    unrealizedProfitLoss: number;
    unrealizedProfitLossRate: number;
    realizedProfitLoss: number;
    totalProfitLoss: number;
    totalProfitLossRate: number;
    positionCount: number;
    openPositionCount: number;
    closedPositionCount: number;
  }>;
  moduleAllocation: Array<{
    name: string;
    currency: OtherInvestmentCurrency;
    marketValue: number;
    costBasis: number;
    unrealizedProfitLoss: number;
    realizedProfitLoss: number;
    totalProfitLoss: number;
    positionCount: number;
  }>;
  otherInvestmentMarketAllocation: Array<{
    name: OtherInvestmentMarket;
    currency: OtherInvestmentCurrency;
    marketValue: number;
    totalProfitLoss: number;
    positionCount: number;
  }>;
  otherInvestmentTypeAllocation: Array<{
    name: OtherInvestmentAssetType;
    currency: OtherInvestmentCurrency;
    marketValue: number;
    totalProfitLoss: number;
    positionCount: number;
  }>;
  totalTargetShares: number;
  totalHoldingShares: number;
  totalHoldingCost: number;
  totalMarketValue: number;
  totalEstimatedTargetCapital: number;
  totalRemainingTargetCapital: number;
  totalUnrealizedProfitLoss: number;
  totalUnrealizedProfitLossRate: number;
  totalRealizedProfitLoss: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
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
    realizedProfitLoss: number;
    dividendIncome: number;
    totalProfitLoss: number;
    isClosed: boolean;
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
  profitLossByStock: Array<{
    stockCode: string;
    stockName: string;
    unrealizedProfitLoss: number;
    realizedProfitLoss: number;
    dividendIncome: number;
    totalProfitLoss: number;
  }>;
}

export interface ApiError {
  message: string;
}

export interface SetupStatus {
  configured: boolean;
  missing: string[];
}

export interface SetupPayload {
  notionToken: string;
  notionParentPageId: string;
}

export interface EmailReportConfig {
  enabled: boolean;
  time: string;
  timezone: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPasswordConfigured: boolean;
  emailFrom: string;
  emailTo: string;
}

export interface EmailReportConfigPayload {
  enabled: boolean;
  time: string;
  timezone: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword?: string;
  emailFrom: string;
  emailTo: string;
}
