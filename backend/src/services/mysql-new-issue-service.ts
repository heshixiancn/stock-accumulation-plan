import type { RowDataPacket } from "mysql2/promise";
import type {
  NewIssueMarket,
  NewIssueRecord,
  NewIssueStatus,
  NewIssueType,
} from "../types/domain.js";
import { execute, newId, queryRows } from "../lib/mysql.js";
import {
  calculateNewIssueMetrics,
  normalizeNewIssuePayload,
  type NewIssuePayload,
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

interface NewIssueRow extends RowDataPacket {
  id: string;
  title: string;
  security_code: string;
  security_name: string;
  market: NewIssueMarket;
  issue_type: NewIssueType;
  status: NewIssueStatus;
  subscription_date: Date | string;
  listing_date: Date | string | null;
  sale_date: Date | string | null;
  subscribed_quantity: string | number;
  allotted_quantity: string | number;
  issue_price: string | number;
  sale_price: string | number;
  fees: string | number;
  financing_interest: string | number;
  currency: "CNY" | "HKD";
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const mapNewIssueRow = (row: NewIssueRow): NewIssueRecord => {
  const allottedQuantity = toNumber(row.allotted_quantity);
  const issuePrice = toNumber(row.issue_price);
  const salePrice = toNumber(row.sale_price);
  const fees = toNumber(row.fees);
  const financingInterest = toNumber(row.financing_interest);

  return {
    id: row.id,
    title: row.title,
    securityCode: row.security_code,
    securityName: row.security_name,
    market: row.market,
    issueType: row.issue_type,
    status: row.status,
    subscriptionDate: toDateString(row.subscription_date),
    listingDate: toDateString(row.listing_date),
    saleDate: toDateString(row.sale_date),
    subscribedQuantity: toNumber(row.subscribed_quantity),
    allottedQuantity,
    issuePrice,
    salePrice,
    fees,
    financingInterest,
    currency: row.market === "港股" ? "HKD" : "CNY",
    ...calculateNewIssueMetrics({
      status: row.status,
      allottedQuantity,
      issuePrice,
      salePrice,
      fees,
      financingInterest,
    }),
    notes: row.notes ?? "",
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
};

export const listMysqlNewIssues = async () => {
  const rows = await queryRows<NewIssueRow>(
    `SELECT * FROM new_issue_records
     WHERE archived = 0
     ORDER BY COALESCE(sale_date, listing_date, subscription_date) DESC, created_at DESC`,
  );
  return rows.map(mapNewIssueRow);
};

export const createMysqlNewIssue = async (payload: NewIssuePayload) => {
  const data = normalizeNewIssuePayload(payload);
  await execute(
    `INSERT INTO new_issue_records (
      id, title, security_code, security_name, market, issue_type, status,
      subscription_date, listing_date, sale_date, subscribed_quantity, allotted_quantity,
      issue_price, sale_price, fees, financing_interest, currency,
      invested_amount, sale_proceeds, profit_loss, return_rate, notes
    ) VALUES (
      :id, :title, :securityCode, :securityName, :market, :issueType, :status,
      :subscriptionDate, :listingDate, :saleDate, :subscribedQuantity, :allottedQuantity,
      :issuePrice, :salePrice, :fees, :financingInterest, :currency,
      :investedAmount, :saleProceeds, :profitLoss, :returnRate, :notes
    )`,
    { id: newId(), ...data },
  );
};

export const updateMysqlNewIssueById = async (id: string, payload: NewIssuePayload) => {
  const data = normalizeNewIssuePayload(payload);
  await execute(
    `UPDATE new_issue_records SET
      title = :title,
      security_code = :securityCode,
      security_name = :securityName,
      market = :market,
      issue_type = :issueType,
      status = :status,
      subscription_date = :subscriptionDate,
      listing_date = :listingDate,
      sale_date = :saleDate,
      subscribed_quantity = :subscribedQuantity,
      allotted_quantity = :allottedQuantity,
      issue_price = :issuePrice,
      sale_price = :salePrice,
      fees = :fees,
      financing_interest = :financingInterest,
      currency = :currency,
      invested_amount = :investedAmount,
      sale_proceeds = :saleProceeds,
      profit_loss = :profitLoss,
      return_rate = :returnRate,
      notes = :notes
    WHERE id = :id AND archived = 0`,
    { id, ...data },
  );
};

export const deleteMysqlNewIssueById = async (id: string) => {
  await execute("UPDATE new_issue_records SET archived = 1 WHERE id = :id", { id });
};
