import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { TradeRecord } from "../types/domain.js";
import { calculateTradeLedger, findOversoldTrade } from "./trade-ledger.js";

const makeTrade = (values: Partial<TradeRecord>): TradeRecord => ({
  ...values,
  id: values.id ?? randomUUID(),
  title: values.title ?? "test",
  stockCode: values.stockCode ?? "600000",
  stockName: values.stockName ?? "测试股票",
  tradeDate: values.tradeDate ?? "2026-01-01",
  tradeType: values.tradeType ?? "买入",
  price: values.price ?? 10,
  shares: values.shares ?? 100,
  fee: values.fee ?? 0,
  tax: values.tax ?? 0,
  notes: values.notes ?? "",
});

test("moving-average ledger includes buy fees and sell fees", () => {
  const result = calculateTradeLedger([
    makeTrade({ id: "buy-1", tradeDate: "2026-01-01", price: 10, shares: 100, fee: 1 }),
    makeTrade({ id: "buy-2", tradeDate: "2026-01-02", price: 12, shares: 100, fee: 1 }),
    makeTrade({ id: "sell-1", tradeDate: "2026-01-03", tradeType: "卖出", price: 15, shares: 50, fee: 1 }),
  ]);

  assert.equal(result.holdingShares, 150);
  assert.ok(Math.abs(result.costBasis - 1651.5) < 1e-8);
  assert.ok(Math.abs(result.realizedProfitLoss - 198.5) < 1e-8);
});

test("invalid historical oversell cannot inflate realized profit", () => {
  const result = calculateTradeLedger([
    makeTrade({ id: "buy-1", shares: 10, price: 10 }),
    makeTrade({ id: "sell-1", tradeType: "卖出", shares: 20, price: 20 }),
  ]);

  assert.equal(result.holdingShares, 0);
  assert.equal(result.costBasis, 0);
  assert.equal(result.realizedProfitLoss, 100);
  assert.equal(findOversoldTrade([
    makeTrade({ id: "buy-1", shares: 10, price: 10 }),
    makeTrade({ id: "sell-1", tradeType: "卖出", shares: 20, price: 20 }),
  ])?.availableShares, 10);
});
