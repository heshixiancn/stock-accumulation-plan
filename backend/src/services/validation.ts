import { z } from "zod";
import {
  OTHER_INVESTMENT_ASSET_TYPE_OPTIONS,
  OTHER_INVESTMENT_CURRENCY_OPTIONS,
  OTHER_INVESTMENT_MARKET_OPTIONS,
  OTHER_INVESTMENT_RECORD_TYPE_OPTIONS,
  NEW_ISSUE_CURRENCY_OPTIONS,
  NEW_ISSUE_MARKET_OPTIONS,
  NEW_ISSUE_STATUS_OPTIONS,
  NEW_ISSUE_TYPE_OPTIONS,
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
  tradeType: z.enum(TRADE_TYPE_OPTIONS),
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

const isoDateField = z
  .string()
  .trim()
  .min(1, "日期不能为空")
  .refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "日期格式应为 YYYY-MM-DD");

const optionalDateField = isoDateField.optional().nullable().or(z.literal("")).transform((value) => value || null);

export const newIssuePayloadSchema = z
  .object({
    title: textField.optional().default(""),
    securityCode: textField.min(1, "证券代码不能为空"),
    securityName: textField.min(1, "证券名称不能为空"),
    market: z.enum(NEW_ISSUE_MARKET_OPTIONS),
    issueType: z.enum(NEW_ISSUE_TYPE_OPTIONS),
    status: z.enum(NEW_ISSUE_STATUS_OPTIONS),
    subscriptionDate: isoDateField,
    listingDate: optionalDateField,
    saleDate: optionalDateField,
    subscribedQuantity: z.coerce.number().finite().int("申购数量必须是整数").positive("申购数量必须大于 0"),
    allottedQuantity: z.coerce.number().finite().int("中签数量必须是整数").nonnegative(),
    issuePrice: numberField,
    salePrice: numberField,
    fees: numberField.default(0),
    financingInterest: numberField.default(0),
    currency: z.enum(NEW_ISSUE_CURRENCY_OPTIONS).optional(),
    notes: textField.default(""),
  })
  .superRefine((payload, context) => {
    if (payload.market === "港股" && payload.issueType === "新债") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["issueType"],
        message: "港股打新暂不支持新债",
      });
    }

    if (payload.allottedQuantity > payload.subscribedQuantity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allottedQuantity"],
        message: "中签数量不能大于申购数量",
      });
    }

    if (payload.listingDate && payload.listingDate < payload.subscriptionDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["listingDate"],
        message: "上市日期不能早于申购日期",
      });
    }

    if (payload.saleDate && payload.saleDate < payload.subscriptionDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["saleDate"],
        message: "卖出日期不能早于申购日期",
      });
    }

    if (payload.listingDate && payload.saleDate && payload.saleDate < payload.listingDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["saleDate"],
        message: "卖出日期不能早于上市日期",
      });
    }

    if ((payload.status === "申购中" || payload.status === "未中签") && payload.allottedQuantity !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allottedQuantity"],
        message: `${payload.status}记录的中签数量必须为 0`,
      });
    }

    if ((payload.status === "持有中" || payload.status === "已卖出") && payload.allottedQuantity <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allottedQuantity"],
        message: `${payload.status}记录的中签数量必须大于 0`,
      });
    }

    if ((payload.status === "持有中" || payload.status === "已卖出") && payload.issuePrice <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["issuePrice"],
        message: `${payload.status}记录的发行价格必须大于 0`,
      });
    }

    if (payload.status === "已卖出") {
      if (!payload.saleDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["saleDate"],
          message: "已卖出记录必须填写卖出日期",
        });
      }
      if (payload.salePrice <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["salePrice"],
          message: "已卖出记录的卖出价格必须大于 0",
        });
      }
    }
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

export const calculateNewIssueMetrics = (
  payload: Pick<
    z.infer<typeof newIssuePayloadSchema>,
    "status" | "allottedQuantity" | "issuePrice" | "salePrice" | "fees" | "financingInterest"
  >,
) => {
  const investedAmount = roundTo(payload.issuePrice * payload.allottedQuantity, 4);
  const saleProceeds = payload.status === "已卖出" ? roundTo(payload.salePrice * payload.allottedQuantity, 4) : 0;
  const expenses = payload.fees + payload.financingInterest;
  const profitLoss =
    payload.status === "申购中"
      ? 0
      : payload.status === "已卖出"
        ? roundTo((payload.salePrice - payload.issuePrice) * payload.allottedQuantity - expenses, 4)
        : roundTo(-expenses, 4);

  return {
    investedAmount,
    saleProceeds,
    profitLoss,
    returnRate: investedAmount > 0 ? roundTo((profitLoss / investedAmount) * 100, 2) : 0,
  };
};

export const normalizeNewIssuePayload = (payload: z.infer<typeof newIssuePayloadSchema>) => {
  const data = {
    ...payload,
    title:
      payload.title ||
      `${payload.subscriptionDate}-${payload.market}-${payload.issueType}-${payload.securityName || payload.securityCode}`,
    subscribedQuantity: roundTo(payload.subscribedQuantity, 4),
    allottedQuantity: roundTo(payload.allottedQuantity, 4),
    issuePrice: roundTo(payload.issuePrice, 4),
    salePrice: roundTo(payload.salePrice, 4),
    fees: roundTo(payload.fees, 4),
    financingInterest: roundTo(payload.financingInterest, 4),
    currency: payload.market === "港股" ? ("HKD" as const) : ("CNY" as const),
  };

  return {
    ...data,
    ...calculateNewIssueMetrics(data),
  };
};

export type StockPayload = z.infer<typeof stockPayloadSchema>;
export type DividendPayload = z.infer<typeof dividendPayloadSchema>;
export type TradePayload = z.infer<typeof tradePayloadSchema>;
export type OtherInvestmentPayload = z.infer<typeof otherInvestmentPayloadSchema>;
export type OtherInvestmentAssetPayload = z.infer<typeof otherInvestmentAssetPayloadSchema>;
export type NewIssuePayload = z.infer<typeof newIssuePayloadSchema>;
