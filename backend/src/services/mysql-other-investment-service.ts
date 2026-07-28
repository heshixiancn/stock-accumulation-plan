import type { RowDataPacket } from "mysql2/promise";
import type {
  OtherInvestmentAsset,
  OtherInvestmentAssetType,
  OtherInvestmentCurrency,
  OtherInvestmentMarket,
  OtherInvestmentRecord,
  OtherInvestmentRecordType,
} from "../types/domain.js";
import { execute, newId, queryRows } from "../lib/mysql.js";
import {
  normalizeOtherInvestmentAssetPayload,
  normalizeOtherInvestmentPayload,
  type OtherInvestmentAssetPayload,
  type OtherInvestmentPayload,
} from "./validation.js";

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

interface OtherAssetRow extends RowDataPacket {
  id: string;
  asset_code: string;
  asset_name: string;
  market: OtherInvestmentMarket;
  asset_type: OtherInvestmentAssetType;
  currency: OtherInvestmentCurrency;
  current_price: string | number;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const mapAssetRow = (row: OtherAssetRow): OtherInvestmentAsset => ({
  id: row.id,
  assetCode: row.asset_code,
  assetName: row.asset_name,
  market: row.market,
  assetType: row.asset_type,
  currency: row.currency,
  currentPrice: toNumber(row.current_price),
  costPrice: 0,
  holdingQuantity: 0,
  costBasis: 0,
  marketValue: 0,
  unrealizedProfitLoss: 0,
  unrealizedProfitLossRate: 0,
  realizedProfitLoss: 0,
  totalProfitLoss: 0,
  totalProfitLossRate: 0,
  isClosed: false,
  notes: row.notes ?? "",
  createdAt: toDateTimeString(row.created_at),
  updatedAt: toDateTimeString(row.updated_at),
});

export const listMysqlOtherInvestmentAssets = async () => {
  const rows = await queryRows<OtherAssetRow>(
    "SELECT * FROM other_investment_assets WHERE archived = 0 ORDER BY market, asset_name",
  );
  return rows.map(mapAssetRow);
};

export const createMysqlOtherInvestmentAsset = async (payload: OtherInvestmentAssetPayload) => {
  const data = normalizeOtherInvestmentAssetPayload(payload);
  const id = newId();
  await execute(
    `INSERT INTO other_investment_assets (
      id, asset_code, asset_name, market, asset_type, currency, current_price, notes
    ) VALUES (
      :id, :assetCode, :assetName, :market, :assetType, :currency, :currentPrice, :notes
    )`,
    { id, ...data },
  );
  return {
    id,
    ...data,
    costPrice: 0,
    holdingQuantity: 0,
    costBasis: 0,
    marketValue: 0,
    unrealizedProfitLoss: 0,
    unrealizedProfitLossRate: 0,
    realizedProfitLoss: 0,
    totalProfitLoss: 0,
    totalProfitLossRate: 0,
    isClosed: false,
  } satisfies OtherInvestmentAsset;
};

export const updateMysqlOtherInvestmentAsset = async (id: string, payload: OtherInvestmentAssetPayload) => {
  const data = normalizeOtherInvestmentAssetPayload(payload);
  await execute(
    `UPDATE other_investment_assets SET
      asset_code = :assetCode,
      asset_name = :assetName,
      market = :market,
      asset_type = :assetType,
      currency = :currency,
      current_price = :currentPrice,
      notes = :notes
    WHERE id = :id AND archived = 0`,
    { id, ...data },
  );
};

export const deleteMysqlOtherInvestmentAsset = async (id: string) => {
  await execute("UPDATE other_investment_assets SET archived = 1 WHERE id = :id", { id });
};

interface OtherRecordRow extends RowDataPacket {
  id: string;
  title: string;
  asset_code: string;
  asset_name: string;
  market: OtherInvestmentMarket;
  asset_type: OtherInvestmentAssetType;
  trade_date: Date | string;
  trade_type: OtherInvestmentRecordType;
  price: string | number;
  quantity: string | number;
  fee: string | number;
  tax: string | number;
  current_price: string | number;
  currency: OtherInvestmentCurrency;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const mapRecordRow = (row: OtherRecordRow): OtherInvestmentRecord => ({
  id: row.id,
  title: row.title,
  assetCode: row.asset_code,
  assetName: row.asset_name,
  market: row.market,
  assetType: row.asset_type,
  tradeDate: toDateString(row.trade_date),
  tradeType: row.trade_type,
  price: toNumber(row.price),
  quantity: toNumber(row.quantity),
  fee: toNumber(row.fee),
  tax: toNumber(row.tax),
  currentPrice: toNumber(row.current_price),
  currency: row.currency,
  notes: row.notes ?? "",
  createdAt: toDateTimeString(row.created_at),
  updatedAt: toDateTimeString(row.updated_at),
});

export const listMysqlOtherInvestmentRecords = async () => {
  const rows = await queryRows<OtherRecordRow>(
    "SELECT * FROM other_investment_records WHERE archived = 0 ORDER BY trade_date DESC, created_at DESC",
  );
  return rows.map(mapRecordRow);
};

export const createMysqlOtherInvestmentRecord = async (payload: OtherInvestmentPayload) => {
  const data = normalizeOtherInvestmentPayload(payload);
  await execute(
    `INSERT INTO other_investment_records (
      id, title, asset_code, asset_name, market, asset_type, trade_date, trade_type,
      price, quantity, fee, tax, current_price, currency, notes
    ) VALUES (
      :id, :title, :assetCode, :assetName, :market, :assetType, :tradeDate, :tradeType,
      :price, :quantity, :fee, :tax, :currentPrice, :currency, :notes
    )`,
    { id: newId(), ...data },
  );
};

export const updateMysqlOtherInvestmentRecord = async (id: string, payload: OtherInvestmentPayload) => {
  const data = normalizeOtherInvestmentPayload(payload);
  await execute(
    `UPDATE other_investment_records SET
      title = :title,
      asset_code = :assetCode,
      asset_name = :assetName,
      market = :market,
      asset_type = :assetType,
      trade_date = :tradeDate,
      trade_type = :tradeType,
      price = :price,
      quantity = :quantity,
      fee = :fee,
      tax = :tax,
      current_price = :currentPrice,
      currency = :currency,
      notes = :notes
    WHERE id = :id AND archived = 0`,
    { id, ...data },
  );
};

export const deleteMysqlOtherInvestmentRecord = async (id: string) => {
  await execute("UPDATE other_investment_records SET archived = 1 WHERE id = :id", { id });
};
