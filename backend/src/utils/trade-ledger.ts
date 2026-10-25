import type { TradeRecord } from "../types/domain.js";

export interface TradeLedgerSummary {
  holdingShares: number;
  costBasis: number;
  realizedProfitLoss: number;
}

export const sortTradesAsc = (trades: TradeRecord[]) =>
  [...trades].sort((a, b) => {
    const dateCompare = (a.tradeDate ?? "").localeCompare(b.tradeDate ?? "");
    return dateCompare || (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });

/**
 * Calculates a moving-average ledger. Invalid historical sell records are
 * capped to the available position so they cannot inflate realized P/L.
 */
export const calculateTradeLedger = (trades: TradeRecord[]): TradeLedgerSummary => {
  let holdingShares = 0;
  let costBasis = 0;
  let realizedProfitLoss = 0;

  for (const trade of sortTradesAsc(trades)) {
    const feeAndTax = Math.max(0, trade.fee) + Math.max(0, trade.tax);

    if (trade.tradeType === "买入") {
      holdingShares += trade.shares;
      costBasis += trade.price * trade.shares + feeAndTax;
      continue;
    }

    const sellShares = Math.min(Math.max(0, trade.shares), holdingShares);
    const averageCost = holdingShares > 0 ? costBasis / holdingShares : 0;
    const netProceeds = trade.price * sellShares - feeAndTax;
    realizedProfitLoss += netProceeds - averageCost * sellShares;
    costBasis = Math.max(0, costBasis - averageCost * sellShares);
    holdingShares = Math.max(0, holdingShares - sellShares);

    if (holdingShares === 0) {
      costBasis = 0;
    }
  }

  return { holdingShares, costBasis, realizedProfitLoss };
};

export const findOversoldTrade = (trades: TradeRecord[]) => {
  let holdingShares = 0;

  for (const trade of sortTradesAsc(trades)) {
    if (trade.tradeType === "买入") {
      holdingShares += trade.shares;
      continue;
    }

    if (trade.shares > holdingShares + 1e-8) {
      return { trade, availableShares: holdingShares };
    }

    holdingShares -= trade.shares;
  }

  return null;
};
