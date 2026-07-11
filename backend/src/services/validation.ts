import { z } from "zod";
import {
  OTHER_INVESTMENT_ASSET_TYPE_OPTIONS,
  OTHER_INVESTMENT_CURRENCY_OPTIONS,
  OTHER_INVESTMENT_MARKET_OPTIONS,
  OTHER_INVESTMENT_RECORD_TYPE_OPTIONS,
  STOCK_STATUS_OPTIONS,
  TRADE_TYPE_OPTIONS,
} from "../types/notion.js";
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

export const tradePayloadSchema = z.object({
  title: textField.optional().default(""),
  stockCode: textField.min(1, "股票代码不能为空"),
  stockName: textField.min(1, "股票名称不能为空"),
  tradeDate: z.string().trim().min(1, "交易日期不能为空"),
  tradeType: z.enum(OTHER_INVESTMENT_RECORD_TYPE_OPTIONS),
  price: z.coerce.number().finite().positive("成交价格必须大于 0"),
  shares: z.coerce.number().finite().positive("股数必须大于 0"),
  fee: numberField.default(0),
  tax: numberField.default(0),
  notes: textField.default(""),
});

export const otherInvestmentPayloadSchema = z
  .object({
    title: textField.optional().default(""),
    assetCode: textField.default(""),
    assetName: textField.min(1, "资产名称不能为空"),
    market: z.enum(OTHER_INVESTMENT_MARKET_OPTIONS),
    assetType: z.enum(OTHER_INVESTMENT_ASSET_TYPE_OPTIONS),
    tradeDate: z.string().trim().min(1, "交易日期不能为空"),
    tradeType: z.enum(OTHER_INVESTMENT_RECORD_TYPE_OPTIONS),
    price: z.coerce.number().finite().positive("成交价格必须大于 0"),
    quantity: z.coerce.number().finite().positive("数量必须大于 0"),
    fee: numberField.default(0),
    tax: numberField.default(0),
    currentPrice: numberField.default(0),
    currency: z.enum(OTHER_INVESTMENT_CURRENCY_OPTIONS),
    notes: textField.default(""),
  })
  .superRefine((payload, context) => {
    if (payload.market !== "美股" && !Number.isInteger(payload.quantity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "A股和港股数量必须是整数",
      });
    }
  });

export const otherInvestmentAssetPayloadSchema = z.object({
  assetCode: textField.default(""),
  assetName: textField.min(1, "资产名称不能为空"),
  market: z.enum(OTHER_INVESTMENT_MARKET_OPTIONS),
  assetType: z.enum(OTHER_INVESTMENT_ASSET_TYPE_OPTIONS),
  currentPrice: numberField.default(0),
  currency: z.enum(OTHER_INVESTMENT_CURRENCY_OPTIONS),
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

export const normalizeTradePayload = (payload: z.infer<typeof tradePayloadSchema>) => ({
  ...payload,
  title:
    payload.title ||
    `${payload.tradeDate}-${payload.stockName || payload.stockCode}-${payload.tradeType}${roundTo(payload.shares)}股`,
  fee: roundTo(payload.fee),
  tax: roundTo(payload.tax),
});

const normalizeInvestmentQuantity = (market: z.infer<typeof otherInvestmentPayloadSchema>["market"], quantity: number) =>
  market === "美股" ? roundTo(quantity, 4) : Math.round(quantity);

export const normalizeOtherInvestmentPayload = (payload: z.infer<typeof otherInvestmentPayloadSchema>) => {
  const quantity = normalizeInvestmentQuantity(payload.market, payload.quantity);

  return {
    ...payload,
    title:
      payload.title ||
      (payload.tradeType === "分红"
        ? `${payload.tradeDate}-${payload.market}-${payload.assetName || payload.assetCode}-分红`
        : `${payload.tradeDate}-${payload.market}-${payload.assetName || payload.assetCode}-${payload.tradeType}${quantity}`),
    price: roundTo(payload.price, 4),
    quantity,
    fee: roundTo(payload.fee, 4),
    tax: roundTo(payload.tax, 4),
    currentPrice: roundTo(payload.currentPrice, 4),
  };
};

export const normalizeOtherInvestmentAssetPayload = (payload: z.infer<typeof otherInvestmentAssetPayloadSchema>) => ({
  ...payload,
  currentPrice: roundTo(payload.currentPrice, 4),
});

export type StockPayload = z.infer<typeof stockPayloadSchema>;
export type DividendPayload = z.infer<typeof dividendPayloadSchema>;
export type TradePayload = z.infer<typeof tradePayloadSchema>;
export type OtherInvestmentPayload = z.infer<typeof otherInvestmentPayloadSchema>;
export type OtherInvestmentAssetPayload = z.infer<typeof otherInvestmentAssetPayloadSchema>;
