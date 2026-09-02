import type {
  DividendRecord,
  NewIssueRecord,
  OtherInvestmentAsset,
  OtherInvestmentRecord,
  StockPlan,
  TradeRecord,
} from "../types/domain.js";
import type {
  DividendPayload,
  NewIssuePayload,
  OtherInvestmentAssetPayload,
  OtherInvestmentPayload,
  StockPayload,
  TradePayload,
} from "../services/validation.js";
import { initializeDataSource } from "../services/data-source.js";
import { createDividend, listDividends } from "../services/dividend-service.js";
import {
  createOtherInvestmentAsset,
  createOtherInvestmentRecord,
  getOtherInvestmentOverview,
} from "../services/other-investment-service.js";
import { createNewIssue, listNewIssues } from "../services/new-issue-service.js";
import { createStock, listStockPlans } from "../services/stock-service.js";
import { createTrade, listTrades } from "../services/trade-service.js";

export interface PortableData {
  exportedAt: string;
  source: "notion" | "mysql";
  stocks: StockPayload[];
  trades: TradePayload[];
  dividends: DividendPayload[];
  otherInvestmentAssets: OtherInvestmentAssetPayload[];
  otherInvestmentRecords: OtherInvestmentPayload[];
  newIssueRecords?: NewIssuePayload[];
}

const fallbackDate = () => new Date().toISOString().slice(0, 10);

const stockPayload = (stock: StockPlan): StockPayload => ({
  stockCode: stock.stockCode,
  stockName: stock.stockName,
  currentPrice: stock.currentPrice,
  costPrice: stock.costPrice,
  targetShares: stock.targetShares,
  holdingShares: stock.holdingShares,
  dividendYield: stock.dividendYield,
  dividendPerShare: stock.dividendPerShare,
  actualDividend: stock.actualDividend,
  status: stock.status,
  notes: stock.notes,
});

const tradePayload = (trade: TradeRecord): TradePayload => ({
  title: trade.title,
  stockCode: trade.stockCode,
  stockName: trade.stockName,
  tradeDate: trade.tradeDate ?? trade.createdAt?.slice(0, 10) ?? fallbackDate(),
  tradeType: trade.tradeType,
  price: trade.price,
  shares: trade.shares,
  fee: trade.fee,
  tax: trade.tax,
  notes: trade.notes,
});

const dividendPayload = (dividend: DividendRecord): DividendPayload => ({
  title: dividend.title,
  stockCode: dividend.stockCode,
  stockName: dividend.stockName,
  year: dividend.year,
  exDividendDate: dividend.exDividendDate ?? null,
  paymentDate: dividend.paymentDate ?? null,
  dividendPerShare: dividend.dividendPerShare,
  holdingShares: dividend.holdingShares,
  grossDividend: dividend.grossDividend,
  netDividend: dividend.netDividend,
  notes: dividend.notes,
});

const otherAssetPayload = (asset: OtherInvestmentAsset): OtherInvestmentAssetPayload => ({
  assetCode: asset.assetCode,
  assetName: asset.assetName,
  market: asset.market,
  assetType: asset.assetType,
  currentPrice: asset.currentPrice,
  currency: asset.currency,
  notes: asset.notes,
});

const otherRecordPayload = (record: OtherInvestmentRecord): OtherInvestmentPayload => ({
  title: record.title,
  assetCode: record.assetCode,
  assetName: record.assetName,
  market: record.market,
  assetType: record.assetType,
  tradeDate: record.tradeDate ?? record.createdAt?.slice(0, 10) ?? fallbackDate(),
  tradeType: record.tradeType,
  price: record.price,
  quantity: record.quantity,
  fee: record.fee,
  tax: record.tax,
  currentPrice: record.currentPrice,
  currency: record.currency,
  notes: record.notes,
});

const newIssuePayload = (record: NewIssueRecord): NewIssuePayload => ({
  title: record.title,
  securityCode: record.securityCode,
  securityName: record.securityName,
  market: record.market,
  issueType: record.issueType,
  status: record.status,
  subscriptionDate: record.subscriptionDate ?? record.createdAt?.slice(0, 10) ?? fallbackDate(),
  listingDate: record.listingDate,
  saleDate: record.saleDate,
  subscribedQuantity: record.subscribedQuantity,
  allottedQuantity: record.allottedQuantity,
  issuePrice: record.issuePrice,
  salePrice: record.salePrice,
  fees: record.fees,
  financingInterest: record.financingInterest,
  currency: record.currency,
  notes: record.notes,
});

export const exportPortableData = async (source: "notion" | "mysql"): Promise<PortableData> => {
  const previousDataSource = process.env.DATA_SOURCE;
  process.env.DATA_SOURCE = source;

  try {
    await initializeDataSource();

    const [stocks, trades, dividends, otherInvestments, newIssues] = await Promise.all([
      listStockPlans(),
      listTrades(),
      listDividends(),
      getOtherInvestmentOverview(),
      listNewIssues(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      source,
      stocks: stocks.map(stockPayload),
      trades: trades.map(tradePayload),
      dividends: dividends.map(dividendPayload),
      otherInvestmentAssets: otherInvestments.positions.map(otherAssetPayload),
      otherInvestmentRecords: otherInvestments.records.map(otherRecordPayload),
      newIssueRecords: newIssues.map(newIssuePayload),
    };
  } finally {
    if (previousDataSource === undefined) {
      delete process.env.DATA_SOURCE;
    } else {
      process.env.DATA_SOURCE = previousDataSource;
    }
  }
};

export const importPortableData = async (target: "notion" | "mysql", data: PortableData) => {
  const previousDataSource = process.env.DATA_SOURCE;
  process.env.DATA_SOURCE = target;

  try {
    await initializeDataSource();

    const newIssueRecords = data.newIssueRecords ?? [];

    for (const stock of data.stocks) await createStock(stock);
    for (const trade of data.trades) await createTrade(trade);
    for (const dividend of data.dividends) await createDividend(dividend);
    for (const asset of data.otherInvestmentAssets) await createOtherInvestmentAsset(asset);
    for (const record of data.otherInvestmentRecords) await createOtherInvestmentRecord(record);
    for (const record of newIssueRecords) await createNewIssue(record);

    return {
      stocks: data.stocks.length,
      trades: data.trades.length,
      dividends: data.dividends.length,
      otherInvestmentAssets: data.otherInvestmentAssets.length,
      otherInvestmentRecords: data.otherInvestmentRecords.length,
      newIssueRecords: newIssueRecords.length,
    };
  } finally {
    if (previousDataSource === undefined) {
      delete process.env.DATA_SOURCE;
    } else {
      process.env.DATA_SOURCE = previousDataSource;
    }
  }
};
