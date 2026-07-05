import { z } from "zod";
import { STOCK_STATUS_OPTIONS } from "../types/notion.js";
import { getEffectiveDividendPerShare } from "../utils/dividend.js";
import { roundTo } from "../utils/math.js";

const numberField = z.coerce.number().finite().nonnegative();
const textField = z.string().trim();
const dividendYieldField = z.coerce
  .number()
  .finite()
  .min(0)
  .max(100)
  .transform((value) => (value > 1 ? value / 100 : value));

export const stockPayloadSchema = z.object({
  stockCode: textField.min(1, "股票代码不能为空"),
  stockName: textField.min(1, "股票名称不能为空"),
  currentPrice: numberField,
  costPrice: numberField,
  targetShares: numberField,
  holdingShares: numberField,
  dividendYield: dividendYieldField,
  dividendPerShare: numberField,
  actualDividend: numberField.default(0),
  status: z.enum(STOCK_STATUS_OPTIONS),
  notes: textField.default(""),
});

export const dividendPayloadSchema = z.object({
  title: textField.min(1, "记录标题不能为空"),
  stockCode: textField.min(1, "股票代码不能为空"),
  stockName: textField.min(1, "股票名称不能为空"),
  year: z.coerce.number().int().min(2000).max(3000),
  exDividendDate: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  paymentDate: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  dividendPerShare: numberField,
  holdingShares: numberField,
  grossDividend: numberField.optional(),
  netDividend: numberField,
  notes: textField.default(""),
});

export const normalizeStockPayload = (payload: z.infer<typeof stockPayloadSchema>) => {
  const effectiveDividendPerShare = getEffectiveDividendPerShare(
    payload.currentPrice,
    payload.dividendYield,
    payload.dividendPerShare,
  );

  return {
    ...payload,
    totalHoldingCost: roundTo(payload.costPrice * payload.holdingShares),
    estimatedDividend: roundTo(payload.holdingShares * effectiveDividendPerShare),
  };
};

export const normalizeDividendPayload = (payload: z.infer<typeof dividendPayloadSchema>) => ({
  ...payload,
  grossDividend: roundTo(payload.grossDividend ?? payload.holdingShares * payload.dividendPerShare),
});

export type StockPayload = z.infer<typeof stockPayloadSchema>;
export type DividendPayload = z.infer<typeof dividendPayloadSchema>;
