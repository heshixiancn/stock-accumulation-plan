import type { MarketQuote, OtherInvestmentMarket, StockPlan } from "../types/domain.js";
import { HttpError } from "../utils/errors.js";
import { roundTo } from "../utils/math.js";

export interface AssetMarketTarget {
  assetCode: string;
  assetName: string;
  market: OtherInvestmentMarket;
  currentPrice?: number;
}

export interface AssetMarketQuote {
  assetCode: string;
  assetName?: string;
  market: OtherInvestmentMarket;
  currentPrice: number;
  provider: string;
  updatedAt?: string;
}

const getEastMoneySecId = (stockCode: string) => {
  const normalized = stockCode.trim();
  if (/^(5|6|9)/.test(normalized)) return `1.${normalized}`;
  return `0.${normalized}`;
};

const getSinaSymbol = (stockCode: string) => {
  const normalized = stockCode.trim();
  if (/^(5|6|9)/.test(normalized)) return `sh${normalized}`;
  return `sz${normalized}`;
};

const decodeQuoteResponse = (buffer: ArrayBuffer) => {
  try {
    return new TextDecoder("gb18030").decode(buffer);
  } catch {
    return new TextDecoder().decode(buffer);
  }
};

const buildQuote = (
  stock: StockPlan,
  currentPrice: number,
  provider: string,
  updatedAt?: string,
  stockName?: string,
  previousClose?: number,
  marketDividendYield?: number,
): MarketQuote => {
  const dividendYield =
    marketDividendYield && marketDividendYield > 0
      ? marketDividendYield
      : stock.dividendPerShare > 0
        ? stock.dividendPerShare / currentPrice
        : stock.dividendYield;

  return {
    stockCode: stock.stockCode,
    stockName: stockName || stock.stockName,
    currentPrice: roundTo(currentPrice),
    previousClose: previousClose ? roundTo(previousClose) : undefined,
    dividendYield: roundTo(dividendYield, 6),
    provider,
    updatedAt,
  };
};

const fetchEastMoneyQuoteMeta = async (stock: StockPlan) => {
  const query = new URLSearchParams({
    secid: getEastMoneySecId(stock.stockCode),
    fields: "f57,f58,f126",
  });
  const response = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?${query.toString()}`, {
    headers: {
      Referer: "https://quote.eastmoney.com/",
      "User-Agent": "stock-accumulator-notion/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: {
      f58?: string;
      f126?: number;
    };
  };
  const dividendYieldPercent = Number(data.data?.f126 ?? 0);

  return {
    stockName: data.data?.f58,
    dividendYield: Number.isFinite(dividendYieldPercent) && dividendYieldPercent > 0 ? dividendYieldPercent / 100 : undefined,
  };
};

const fetchEastMoneyDailyCloseQuote = async (stock: StockPlan): Promise<MarketQuote> => {
  const query = new URLSearchParams({
    secid: getEastMoneySecId(stock.stockCode),
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
    klt: "101",
    fqt: "1",
    end: "20500101",
    lmt: "1",
  });
  const response = await fetch(`https://push2his.eastmoney.com/api/qt/stock/kline/get?${query.toString()}`, {
    headers: {
      Referer: "https://quote.eastmoney.com/",
      "User-Agent": "stock-accumulator-notion/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: {
      name?: string;
      klines?: string[];
    };
  };
  const latestKline = data.data?.klines?.[0];
  const fields = latestKline?.split(",") ?? [];
  const tradeDate = fields[0];
  const closePrice = Number(fields[2] ?? 0);

  if (!Number.isFinite(closePrice) || closePrice <= 0) {
    throw new Error("invalid daily close price");
  }

  const meta = await fetchEastMoneyQuoteMeta(stock).catch(() => null);

  return buildQuote(
    stock,
    closePrice,
    "eastmoney-daily-close",
    tradeDate,
    data.data?.name || meta?.stockName,
    undefined,
    meta?.dividendYield,
  );
};

const fetchSinaPreviousCloseQuote = async (stock: StockPlan): Promise<MarketQuote> => {
  const response = await fetch(`https://hq.sinajs.cn/list=${getSinaSymbol(stock.stockCode)}`, {
    headers: {
      Referer: "https://finance.sina.com.cn/",
      "User-Agent": "stock-accumulator-notion/1.0",
    },
  });

  if (!response.ok) {
    throw new HttpError(502, "行情接口请求失败，请稍后重试。", `HTTP ${response.status}`);
  }

  const text = decodeQuoteResponse(await response.arrayBuffer());
  const match = text.match(/="([^"]*)"/);
  const fields = match?.[1]?.split(",") ?? [];
  const previousClose = Number(fields[2] ?? 0);

  if (!Number.isFinite(previousClose) || previousClose <= 0) {
    throw new HttpError(502, `未获取到 ${stock.stockCode} 的有效行情数据。`);
  }

  const tradeDate = fields[30];
  const meta = await fetchEastMoneyQuoteMeta(stock).catch(() => null);

  return buildQuote(
    stock,
    previousClose,
    "sina-previous-close",
    tradeDate,
    fields[0] || meta?.stockName,
    previousClose,
    meta?.dividendYield,
  );
};

export const fetchStockMarketQuote = async (stock: StockPlan): Promise<MarketQuote> => {
  try {
    return await fetchEastMoneyDailyCloseQuote(stock);
  } catch {
    return fetchSinaPreviousCloseQuote(stock);
  }
};

const toStockPlanTarget = (target: AssetMarketTarget): StockPlan => ({
  id: "",
  stockCode: target.assetCode,
  stockName: target.assetName,
  currentPrice: target.currentPrice ?? 0,
  costPrice: 0,
  targetShares: 0,
  holdingShares: 0,
  totalHoldingCost: 0,
  marketValue: 0,
  estimatedTargetCapital: 0,
  remainingTargetCapital: 0,
  unrealizedProfitLoss: 0,
  unrealizedProfitLossRate: 0,
  realizedProfitLoss: 0,
  dividendIncome: 0,
  totalProfitLoss: 0,
  isClosed: false,
  hasTradeLedger: false,
  dividendYield: 0,
  dividendPerShare: 0,
  estimatedDividend: 0,
  estimatedDividendYieldOnCost: 0,
  estimatedDividendYieldOnMarket: 0,
  estimatedDividendAtTarget: 0,
  estimatedDividendAtTargetYieldOnCapital: 0,
  actualDividend: 0,
  status: "持有中",
  notes: "",
  progress: 0,
});

const getYahooSymbol = (target: AssetMarketTarget) => {
  const code = target.assetCode.trim();
  if (!code) {
    throw new HttpError(400, `${target.assetName || "标的"} 缺少资产代码，无法同步行情。`);
  }

  if (target.market === "美股") return code.toUpperCase();
  if (target.market === "港股") {
    if (/\.HK$/i.test(code)) return code.toUpperCase();
    if (/^\d+$/.test(code)) return `${String(Number(code)).padStart(4, "0")}.HK`;
    return code.toUpperCase();
  }

  throw new HttpError(400, `暂不支持同步 ${target.market} 的行情。`);
};

const getEastMoneyGlobalSecIds = (target: AssetMarketTarget) => {
  const code = target.assetCode.trim().replace(/\.HK$/i, "").replace(/\.US$/i, "");
  if (!code) {
    throw new HttpError(400, `${target.assetName || "标的"} 缺少资产代码，无法同步行情。`);
  }

  if (target.market === "港股") return [`116.${code.padStart(5, "0")}`];
  if (target.market === "美股") {
    const symbol = code.toUpperCase();
    return [`105.${symbol}`, `106.${symbol}`, `107.${symbol}`];
  }

  throw new HttpError(400, `暂不支持同步 ${target.market} 的行情。`);
};

const parseEastMoneyScaledPrice = (value: unknown, decimals: unknown) => {
  const numericValue = Number(value ?? 0);
  const numericDecimals = Number(decimals ?? 2);
  const divisor = 10 ** (Number.isFinite(numericDecimals) ? numericDecimals : 2);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue / divisor : 0;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchYahooDailyCloseQuote = async (target: AssetMarketTarget): Promise<AssetMarketQuote> => {
  const symbol = getYahooSymbol(target);
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10d&interval=1d`, {
    headers: {
      "User-Agent": "stock-accumulator-notion/1.0",
    },
  });

  if (!response.ok) {
    throw new HttpError(502, `行情接口请求失败：${target.assetName || target.assetCode}（${symbol}）`, `HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          shortName?: string;
          longName?: string;
          regularMarketPrice?: number;
        };
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            close?: Array<number | null>;
          }>;
        };
      }>;
    };
  };
  const result = data.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const timestamps = result?.timestamp ?? [];
  let closePrice = 0;
  let updatedAt: string | undefined;

  for (let index = closes.length - 1; index >= 0; index -= 1) {
    const close = Number(closes[index] ?? 0);
    if (Number.isFinite(close) && close > 0) {
      closePrice = close;
      const timestamp = timestamps[index];
      updatedAt = timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : undefined;
      break;
    }
  }

  const fallbackPrice = Number(result?.meta?.regularMarketPrice ?? 0);
  const currentPrice = closePrice || fallbackPrice;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new HttpError(502, `未获取到 ${target.assetName || target.assetCode}（${symbol}）的有效行情数据。`);
  }

  return {
    assetCode: target.assetCode,
    assetName: result?.meta?.shortName || result?.meta?.longName || target.assetName,
    market: target.market,
    currentPrice: roundTo(currentPrice, 4),
    provider: "yahoo-daily-close",
    updatedAt,
  };
};

const fetchEastMoneyGlobalQuote = async (target: AssetMarketTarget): Promise<AssetMarketQuote> => {
  const secIds = getEastMoneyGlobalSecIds(target);
  const errors: string[] = [];

  for (const secid of secIds) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const query = new URLSearchParams({
          secid,
          fields: "f43,f57,f58,f59,f60",
        });
        const response = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?${query.toString()}`, {
          headers: {
            Referer: "https://quote.eastmoney.com/",
            "User-Agent": "stock-accumulator-notion/1.0",
          },
        });

        if (!response.ok) {
          errors.push(`${secid}#${attempt}: HTTP ${response.status}`);
          await sleep(250 * attempt);
          continue;
        }

        const data = (await response.json()) as {
          data?: {
            f43?: number;
            f57?: string;
            f58?: string;
            f59?: number;
          } | null;
        };
        const currentPrice = parseEastMoneyScaledPrice(data.data?.f43, data.data?.f59);
        if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
          errors.push(`${secid}#${attempt}: empty quote`);
          await sleep(250 * attempt);
          continue;
        }

        return {
          assetCode: target.assetCode,
          assetName: data.data?.f58 || target.assetName,
          market: target.market,
          currentPrice: roundTo(currentPrice, 4),
          provider: "eastmoney-global-quote",
        };
      } catch (error) {
        errors.push(`${secid}#${attempt}: ${error instanceof Error ? error.message : "unknown error"}`);
        await sleep(250 * attempt);
      }
    }
  }

  throw new HttpError(
    502,
    `行情接口请求失败：${target.assetName || target.assetCode}（${secIds.join(" / ")}）`,
    errors.join("; "),
  );
};

export const fetchAssetMarketQuote = async (target: AssetMarketTarget): Promise<AssetMarketQuote> => {
  if (target.market === "A股") {
    const quote = await fetchStockMarketQuote(toStockPlanTarget(target));
    return {
      assetCode: target.assetCode,
      assetName: quote.stockName || target.assetName,
      market: target.market,
      currentPrice: roundTo(quote.currentPrice, 4),
      provider: quote.provider,
      updatedAt: quote.updatedAt,
    };
  }

  if (target.market === "美股" || target.market === "港股") {
    try {
      return await fetchYahooDailyCloseQuote(target);
    } catch {
      return fetchEastMoneyGlobalQuote(target);
    }
  }

  throw new HttpError(400, `暂不支持同步 ${target.market} 的行情。`);
};
