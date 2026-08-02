import type { RowDataPacket } from "mysql2/promise";
import type { DividendRecord, StockPlan, StockStatus, TradeRecord, TradeType } from "../types/domain.js";
import { percentage, roundTo } from "../utils/math.js";
import { execute, newId, queryRows } from "../lib/mysql.js";
import {
  normalizeDividendPayload,
  normalizeStockPayload,
  normalizeTradePayload,
  type DividendPayload,
  type StockPayload,
  type TradePayload,
} from "./validation.js";
import { getEffectiveDividendPerShare } from "../utils/dividend.js";

const toNumber = (value: unknown) => Number(value ?? 0);
const toDateString = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
const toDateTimeString = (value: unknown) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

interface StockRow extends RowDataPacket {
  id: string;
  stock_code: string;
  stock_name: string;
  current_price: string | number;
  cost_price: string | number;
  target_shares: string | number;
  holding_shares: string | number;
  dividend_yield: string | number;
  dividend_per_share: string | number;
  actual_dividend: string | number;
  status: StockStatus;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const mapStockRow = (row: StockRow): StockPlan => {
  const currentPrice = toNumber(row.current_price);
  const costPrice = toNumber(row.cost_price);
  const targetShares = toNumber(row.target_shares);
  const holdingShares = toNumber(row.holding_shares);
  const dividendYield = toNumber(row.dividend_yield);
  const dividendPerShare = toNumber(row.dividend_per_share);
  const actualDividend = toNumber(row.actual_dividend);
  const effectiveDividendPerShare = getEffectiveDividendPerShare(currentPrice, dividendYield, dividendPerShare);
  const totalHoldingCost = roundTo(costPrice * holdingShares);
  const marketValue = roundTo(currentPrice * holdingShares);
  const estimatedTargetCapital = roundTo(currentPrice * targetShares);
  const remainingTargetCapital = roundTo(Math.max(targetShares - holdingShares, 0) * currentPrice);
  const unrealizedProfitLoss = roundTo(marketValue - totalHoldingCost);
  const estimatedDividend = roundTo(holdingShares * effectiveDividendPerShare);
  const estimatedDividendAtTarget = roundTo(targetShares * effectiveDividendPerShare);

  return {
    id: row.id,
    stockCode: row.stock_code,
    stockName: row.stock_name,
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
    dividendIncome: actualDividend,
    totalProfitLoss: unrealizedProfitLoss + actualDividend,
    isClosed: holdingShares === 0 && targetShares > 0,
    hasTradeLedger: false,
    dividendYield,
    dividendPerShare,
    estimatedDividend,
    estimatedDividendYieldOnCost: percentage(estimatedDividend, totalHoldingCost),
    estimatedDividendYieldOnMarket: percentage(estimatedDividend, marketValue),
    estimatedDividendAtTarget,
    estimatedDividendAtTargetYieldOnCapital: percentage(estimatedDividendAtTarget, estimatedTargetCapital),
    actualDividend,
    status: row.status || "观察中",
    notes: row.notes ?? "",
    progress: percentage(holdingShares, targetShares),
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
};

export const listMysqlStockPlans = async () => {
  const rows = await queryRows<StockRow>("SELECT * FROM stocks WHERE archived = 0 ORDER BY stock_code");
  return rows.map(mapStockRow);
};

export const createMysqlStock = async (payload: StockPayload) => {
  const data = normalizeStockPayload(payload);
  await execute(
    `INSERT INTO stocks (
      id, stock_code, stock_name, current_price, cost_price, target_shares, holding_shares,
      dividend_yield, dividend_per_share, actual_dividend, status, notes
    ) VALUES (
      :id, :stockCode, :stockName, :currentPrice, :costPrice, :targetShares, :holdingShares,
      :dividendYield, :dividendPerShare, :actualDividend, :status, :notes
    )`,
    { id: newId(), ...data },
  );
};

export const updateMysqlStockById = async (id: string, payload: StockPayload) => {
  const data = normalizeStockPayload(payload);
  await execute(
    `UPDATE stocks SET
      stock_code = :stockCode,
      stock_name = :stockName,
      current_price = :currentPrice,
      cost_price = :costPrice,
      target_shares = :targetShares,
      holding_shares = :holdingShares,
      dividend_yield = :dividendYield,
      dividend_per_share = :dividendPerShare,
      actual_dividend = :actualDividend,
      status = :status,
      notes = :notes
    WHERE id = :id AND archived = 0`,
    { id, ...data },
  );
};

export const deleteMysqlStockById = async (id: string) => {
  await execute("UPDATE stocks SET archived = 1 WHERE id = :id", { id });
};

interface TradeRow extends RowDataPacket {
  id: string;
  title: string;
  stock_code: string;
  stock_name: string;
  trade_date: Date | string;
  trade_type: TradeType;
  price: string | number;
  shares: string | number;
  fee: string | number;
  tax: string | number;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const mapTradeRow = (row: TradeRow): TradeRecord => ({
  id: row.id,
  title: row.title,
  stockCode: row.stock_code,
  stockName: row.stock_name,
  tradeDate: toDateString(row.trade_date),
  tradeType: row.trade_type,
  price: toNumber(row.price),
  shares: toNumber(row.shares),
  fee: toNumber(row.fee),
  tax: toNumber(row.tax),
  notes: row.notes ?? "",
  createdAt: toDateTimeString(row.created_at),
  updatedAt: toDateTimeString(row.updated_at),
});

export const listMysqlTrades = async () => {
  const rows = await queryRows<TradeRow>(
    "SELECT * FROM trades WHERE archived = 0 ORDER BY trade_date DESC, created_at DESC",
  );
  return rows.map(mapTradeRow);
};

export const createMysqlTrade = async (payload: TradePayload) => {
  const data = normalizeTradePayload(payload);
  await execute(
    `INSERT INTO trades (
      id, title, stock_code, stock_name, trade_date, trade_type, price, shares, fee, tax, notes
    ) VALUES (
      :id, :title, :stockCode, :stockName, :tradeDate, :tradeType, :price, :shares, :fee, :tax, :notes
    )`,
    { id: newId(), ...data },
  );
};

export const updateMysqlTradeById = async (id: string, payload: TradePayload) => {
  const data = normalizeTradePayload(payload);
  await execute(
    `UPDATE trades SET
      title = :title,
      stock_code = :stockCode,
      stock_name = :stockName,
      trade_date = :tradeDate,
      trade_type = :tradeType,
      price = :price,
      shares = :shares,
      fee = :fee,
      tax = :tax,
      notes = :notes
    WHERE id = :id AND archived = 0`,
    { id, ...data },
  );
};

export const deleteMysqlTradeById = async (id: string) => {
  await execute("UPDATE trades SET archived = 1 WHERE id = :id", { id });
};

interface DividendRow extends RowDataPacket {
  id: string;
  title: string;
  stock_code: string;
  stock_name: string;
  year: number;
  ex_dividend_date: Date | string | null;
  payment_date: Date | string | null;
  dividend_per_share: string | number;
  holding_shares: string | number;
  gross_dividend: string | number;
  net_dividend: string | number;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const mapDividendRow = (row: DividendRow): DividendRecord => ({
  id: row.id,
  title: row.title,
  stockCode: row.stock_code,
  stockName: row.stock_name,
  year: Number(row.year),
  exDividendDate: toDateString(row.ex_dividend_date),
  paymentDate: toDateString(row.payment_date),
  dividendPerShare: toNumber(row.dividend_per_share),
  holdingShares: toNumber(row.holding_shares),
  grossDividend: toNumber(row.gross_dividend),
  netDividend: toNumber(row.net_dividend),
  notes: row.notes ?? "",
  createdAt: toDateTimeString(row.created_at),
  updatedAt: toDateTimeString(row.updated_at),
});

export const listMysqlDividends = async () => {
  const rows = await queryRows<DividendRow>("SELECT * FROM dividends WHERE archived = 0 ORDER BY year DESC, created_at DESC");
  return rows.map(mapDividendRow);
};

export const createMysqlDividend = async (payload: DividendPayload) => {
  const data = normalizeDividendPayload(payload);
  await execute(
    `INSERT INTO dividends (
      id, title, stock_code, stock_name, year, ex_dividend_date, payment_date,
      dividend_per_share, holding_shares, gross_dividend, net_dividend, notes
    ) VALUES (
      :id, :title, :stockCode, :stockName, :year, :exDividendDate, :paymentDate,
      :dividendPerShare, :holdingShares, :grossDividend, :netDividend, :notes
    )`,
    { id: newId(), ...data },
  );
};

export const updateMysqlDividendById = async (id: string, payload: DividendPayload) => {
  const data = normalizeDividendPayload(payload);
  await execute(
    `UPDATE dividends SET
      title = :title,
      stock_code = :stockCode,
      stock_name = :stockName,
      year = :year,
      ex_dividend_date = :exDividendDate,
      payment_date = :paymentDate,
      dividend_per_share = :dividendPerShare,
      holding_shares = :holdingShares,
      gross_dividend = :grossDividend,
      net_dividend = :netDividend,
      notes = :notes
    WHERE id = :id AND archived = 0`,
    { id, ...data },
  );
};

export const deleteMysqlDividendById = async (id: string) => {
  await execute("UPDATE dividends SET archived = 1 WHERE id = :id", { id });
};
