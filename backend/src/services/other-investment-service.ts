import { archivePage, createPage, ensureDatabases, isPageObject, queryDatabase, updatePage } from "../lib/notion.js";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { fetchAssetMarketQuote, type AssetMarketQuote } from "./market-data-service.js";
import type {
  OtherInvestmentAsset,
  OtherInvestmentCurrency,
  OtherInvestmentMarket,
  OtherInvestmentOverview,
  OtherInvestmentPosition,
  OtherInvestmentRecord,
  OtherInvestmentSummary,
} from "../types/domain.js";
import { numberProperty, richText, selectProperty, title, dateProperty } from "../utils/notion-helpers.js";
import { percentage, roundTo } from "../utils/math.js";
import { mapOtherInvestmentAssetPage, mapOtherInvestmentPage } from "./notion-mappers.js";
import {
  normalizeOtherInvestmentAssetPayload,
  normalizeOtherInvestmentPayload,
  type OtherInvestmentAssetPayload,
  type OtherInvestmentPayload,
} from "./validation.js";

const roundMoney = (value: number) => roundTo(value, 4);
const roundQuantity = (market: OtherInvestmentMarket, value: number) => (market === "美股" ? roundTo(value, 4) : Math.round(value || 0));

const assetKey = (record: Pick<OtherInvestmentRecord | OtherInvestmentAsset, "market" | "assetCode" | "assetName">) =>
  `${record.market}:${record.assetCode || record.assetName}`.trim();

const sortRecordsAsc = (records: OtherInvestmentRecord[]) =>
  [...records].sort((a, b) => {
    const dateCompare = (a.tradeDate ?? "").localeCompare(b.tradeDate ?? "");
    return dateCompare || (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });

const calculateRecordSummary = (records: OtherInvestmentRecord[]) => {
  const sorted = sortRecordsAsc(records);
  let holdingQuantity = 0;
  let costBasis = 0;
  let realizedProfitLoss = 0;
  let totalBuyAmount = 0;

  for (const record of sorted) {
    const feeAndTax = record.fee + record.tax;

    if (record.tradeType === "买入") {
      holdingQuantity += record.quantity;
      totalBuyAmount += record.price * record.quantity;
      costBasis += record.price * record.quantity + feeAndTax;
      continue;
    }

    if (record.tradeType === "分红") {
      realizedProfitLoss += record.price * record.quantity - feeAndTax;
      continue;
    }

    const averageCost = holdingQuantity > 0 ? costBasis / holdingQuantity : 0;
    const sellQuantity = Math.min(record.quantity, holdingQuantity);
    const netProceeds = record.price * record.quantity - feeAndTax;
    realizedProfitLoss += netProceeds - averageCost * sellQuantity;
    costBasis = Math.max(0, costBasis - averageCost * sellQuantity);
    holdingQuantity = Math.max(0, holdingQuantity - record.quantity);

    if (holdingQuantity === 0) {
      costBasis = 0;
    }
  }

  return {
    sorted,
    holdingQuantity,
    costBasis,
    realizedProfitLoss,
    totalBuyAmount,
    latest: sorted.at(-1) ?? null,
    latestPriceRecord: [...sorted].reverse().find((record) => record.currentPrice > 0 || record.price > 0) ?? null,
  };
};

const buildPosition = (asset: OtherInvestmentAsset, assetRecords: OtherInvestmentRecord[]): OtherInvestmentPosition => {
  const { holdingQuantity, costBasis, realizedProfitLoss, totalBuyAmount, latest, latestPriceRecord } =
    calculateRecordSummary(assetRecords);
  const currentPrice = asset.currentPrice || latestPriceRecord?.currentPrice || latestPriceRecord?.price || 0;
  const marketValue = currentPrice * holdingQuantity;
  const unrealizedProfitLoss = marketValue - costBasis;
  const totalProfitLoss = unrealizedProfitLoss + realizedProfitLoss;
  const normalizedHoldingQuantity = roundQuantity(asset.market, holdingQuantity);
  const isClosed = assetRecords.length > 0 ? normalizedHoldingQuantity === 0 : asset.isClosed;

  return {
    ...asset,
    currentPrice: roundMoney(currentPrice),
    holdingQuantity: normalizedHoldingQuantity,
    costBasis: roundMoney(costBasis),
    costPrice: normalizedHoldingQuantity > 0 ? roundMoney(costBasis / normalizedHoldingQuantity) : 0,
    marketValue: roundMoney(marketValue),
    unrealizedProfitLoss: roundMoney(unrealizedProfitLoss),
    unrealizedProfitLossRate: percentage(unrealizedProfitLoss, costBasis),
    realizedProfitLoss: roundMoney(realizedProfitLoss),
    totalProfitLoss: roundMoney(totalProfitLoss),
    totalProfitLossRate: percentage(totalProfitLoss, totalBuyAmount),
    isClosed,
    tradeCount: assetRecords.length,
    latestTradeDate: latest?.tradeDate ?? null,
  };
};

const buildPositions = (records: OtherInvestmentRecord[], assets: OtherInvestmentAsset[]): OtherInvestmentPosition[] => {
  const grouped = new Map<string, OtherInvestmentRecord[]>();

  for (const record of records) {
    const key = assetKey(record);
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  return assets
    .map((asset) => buildPosition(asset, grouped.get(assetKey(asset)) ?? []))
    .sort((a, b) => b.marketValue - a.marketValue || b.totalProfitLoss - a.totalProfitLoss || a.assetName.localeCompare(b.assetName));
};

const buildSummary = (positions: OtherInvestmentPosition[]): OtherInvestmentSummary => {
  const byMarketMap = new Map<OtherInvestmentMarket, { marketValue: number; totalProfitLoss: number }>();
  const byCurrencyMap = new Map<
    OtherInvestmentCurrency,
    {
      marketValue: number;
      costBasis: number;
      unrealizedProfitLoss: number;
      realizedProfitLoss: number;
      totalProfitLoss: number;
      positionCount: number;
    }
  >();

  for (const position of positions) {
    const marketSummary = byMarketMap.get(position.market) ?? { marketValue: 0, totalProfitLoss: 0 };
    marketSummary.marketValue += position.marketValue;
    marketSummary.totalProfitLoss += position.totalProfitLoss;
    byMarketMap.set(position.market, marketSummary);

    const currencySummary = byCurrencyMap.get(position.currency) ?? {
      marketValue: 0,
      costBasis: 0,
      unrealizedProfitLoss: 0,
      realizedProfitLoss: 0,
      totalProfitLoss: 0,
      positionCount: 0,
    };
    currencySummary.marketValue += position.marketValue;
    currencySummary.costBasis += position.costBasis;
    currencySummary.unrealizedProfitLoss += position.unrealizedProfitLoss;
    currencySummary.realizedProfitLoss += position.realizedProfitLoss;
    currencySummary.totalProfitLoss += position.totalProfitLoss;
    currencySummary.positionCount += 1;
    byCurrencyMap.set(position.currency, currencySummary);
  }

  return {
    totalMarketValue: roundMoney(positions.reduce((sum, item) => sum + item.marketValue, 0)),
    totalCostBasis: roundMoney(positions.reduce((sum, item) => sum + item.costBasis, 0)),
    totalUnrealizedProfitLoss: roundMoney(positions.reduce((sum, item) => sum + item.unrealizedProfitLoss, 0)),
    totalRealizedProfitLoss: roundMoney(positions.reduce((sum, item) => sum + item.realizedProfitLoss, 0)),
    totalProfitLoss: roundMoney(positions.reduce((sum, item) => sum + item.totalProfitLoss, 0)),
    positionCount: positions.length,
    openPositionCount: positions.filter((item) => !item.isClosed).length,
    closedPositionCount: positions.filter((item) => item.isClosed).length,
    byMarket: [...byMarketMap.entries()]
      .map(([market, value]) => ({
        market,
        marketValue: roundMoney(value.marketValue),
        totalProfitLoss: roundMoney(value.totalProfitLoss),
      }))
      .sort((a, b) => b.marketValue - a.marketValue),
    byCurrency: [...byCurrencyMap.entries()]
      .map(([currency, value]) => ({
        currency,
        marketValue: roundMoney(value.marketValue),
        costBasis: roundMoney(value.costBasis),
        unrealizedProfitLoss: roundMoney(value.unrealizedProfitLoss),
        realizedProfitLoss: roundMoney(value.realizedProfitLoss),
        totalProfitLoss: roundMoney(value.totalProfitLoss),
        positionCount: value.positionCount,
      }))
      .sort((a, b) => b.marketValue - a.marketValue),
  };
};

const recordProperties = (payload: OtherInvestmentPayload) => {
  const data = normalizeOtherInvestmentPayload(payload);

  return {
    记录标题: title(data.title),
    资产代码: richText(data.assetCode),
    资产名称: richText(data.assetName),
    市场: selectProperty(data.market),
    交易日期: dateProperty(data.tradeDate),
    交易类型: selectProperty(data.tradeType),
    成交价格: numberProperty(data.price),
    数量: numberProperty(data.quantity),
    手续费: numberProperty(data.fee),
    税费: numberProperty(data.tax),
    备注: richText(data.notes),
  };
};

const assetProperties = (
  payload: OtherInvestmentAssetPayload,
  summary: Partial<
    Pick<
      OtherInvestmentPosition,
      | "costPrice"
      | "holdingQuantity"
      | "costBasis"
      | "marketValue"
      | "unrealizedProfitLoss"
      | "realizedProfitLoss"
      | "totalProfitLoss"
      | "isClosed"
    >
  > = {},
) => {
  const data = normalizeOtherInvestmentAssetPayload(payload);

  return {
    标的名称: title(data.assetName),
    资产代码: richText(data.assetCode),
    市场: selectProperty(data.market),
    资产类型: selectProperty(data.assetType),
    币种: selectProperty(data.currency),
    当前价格: numberProperty(data.currentPrice),
    成本价: numberProperty(roundMoney(summary.costPrice ?? 0)),
    持仓数量: numberProperty(roundQuantity(payload.market, summary.holdingQuantity ?? 0)),
    持仓成本: numberProperty(roundMoney(summary.costBasis ?? 0)),
    持仓市值: numberProperty(roundMoney(summary.marketValue ?? 0)),
    持仓盈亏: numberProperty(roundMoney(summary.unrealizedProfitLoss ?? 0)),
    已实现盈亏: numberProperty(roundMoney(summary.realizedProfitLoss ?? 0)),
    总盈亏: numberProperty(roundMoney(summary.totalProfitLoss ?? 0)),
    状态: selectProperty(summary.isClosed ? "已清仓" : "持有中"),
    备注: richText(data.notes),
  };
};

const assetPayloadFromRecord = (record: OtherInvestmentRecord): OtherInvestmentAssetPayload => ({
  assetCode: record.assetCode,
  assetName: record.assetName,
  market: record.market,
  assetType: record.assetType,
  currentPrice: record.currentPrice || record.price,
  currency: record.currency,
  notes: "",
});

const assetPayloadFromPosition = (position: OtherInvestmentPosition): OtherInvestmentAssetPayload => ({
  assetCode: position.assetCode,
  assetName: position.assetName,
  market: position.market,
  assetType: position.assetType,
  currentPrice: position.currentPrice,
  currency: position.currency,
  notes: position.notes,
});

const recordPayload = (record: OtherInvestmentRecord, updates: Partial<OtherInvestmentPayload> = {}): OtherInvestmentPayload => ({
  title: record.title,
  assetCode: record.assetCode,
  assetName: record.assetName,
  market: record.market,
  assetType: record.assetType,
  tradeDate: record.tradeDate ?? record.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  tradeType: record.tradeType,
  price: record.price,
  quantity: record.quantity,
  fee: record.fee,
  tax: record.tax,
  currentPrice: record.currentPrice,
  currency: record.currency,
  notes: record.notes,
  ...updates,
});

const listOtherInvestmentAssets = async () => {
  const { otherInvestmentAssetDbId } = await ensureDatabases();
  const response = await queryDatabase(otherInvestmentAssetDbId);
  return response.results.filter(isPageObject).map(mapOtherInvestmentAssetPage);
};

export const listOtherInvestmentRecords = async () => {
  const { otherInvestmentDbId } = await ensureDatabases();
  const response = await queryDatabase(otherInvestmentDbId);
  return response.results
    .filter(isPageObject)
    .map(mapOtherInvestmentPage)
    .sort((a, b) => {
      const dateCompare = (b.tradeDate ?? "").localeCompare(a.tradeDate ?? "");
      return dateCompare || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
};

const createAssetPage = async (payload: OtherInvestmentAssetPayload, summary?: OtherInvestmentPosition) => {
  const { otherInvestmentAssetDbId } = await ensureDatabases();
  const response = await createPage(otherInvestmentAssetDbId, assetProperties(payload, summary));
  if (!("properties" in response)) {
    throw new Error("创建其他投资标的失败：Notion 未返回页面属性。");
  }
  return mapOtherInvestmentAssetPage(response as PageObjectResponse);
};

const updateAssetPage = async (id: string, payload: OtherInvestmentAssetPayload, summary?: OtherInvestmentPosition) => {
  await updatePage(id, assetProperties(payload, summary));
};

const updateRecordPage = async (id: string, payload: OtherInvestmentPayload) => {
  await updatePage(id, recordProperties(payload));
};

const ensureAssetPagesForRecords = async (records: OtherInvestmentRecord[], assets: OtherInvestmentAsset[]) => {
  const nextAssets = [...assets];
  const existingKeys = new Set(nextAssets.map(assetKey));
  const grouped = new Map<string, OtherInvestmentRecord[]>();

  for (const record of records) {
    const key = assetKey(record);
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  for (const [key, assetRecords] of grouped.entries()) {
    if (existingKeys.has(key)) continue;

    const sorted = sortRecordsAsc(assetRecords);
    const latest = sorted.at(-1)!;
    const virtualAsset: OtherInvestmentAsset = {
      id: "",
      ...assetPayloadFromRecord(latest),
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
      notes: "",
    };
    const position = buildPosition(virtualAsset, assetRecords);
    const created = await createAssetPage(assetPayloadFromPosition(position), position);
    nextAssets.push(created);
    existingKeys.add(key);
  }

  return nextAssets;
};

const getOtherInvestmentState = async () => {
  const [records, rawAssets] = await Promise.all([listOtherInvestmentRecords(), listOtherInvestmentAssets()]);
  const assets = await ensureAssetPagesForRecords(records, rawAssets);
  const positions = buildPositions(records, assets);

  return { records, assets, positions };
};

const refreshAssetSummary = async (asset: OtherInvestmentAsset, records: OtherInvestmentRecord[]) => {
  const position = buildPosition(asset, records.filter((record) => assetKey(record) === assetKey(asset)));
  await updateAssetPage(asset.id, assetPayloadFromPosition(position), position);
  return position;
};

const refreshAssetSummaryByKey = async (key: string) => {
  const { records, assets } = await getOtherInvestmentState();
  const asset = assets.find((item) => assetKey(item) === key);
  if (!asset) return null;
  return refreshAssetSummary(asset, records);
};

export const getOtherInvestmentOverview = async (): Promise<OtherInvestmentOverview> => {
  const { records, positions } = await getOtherInvestmentState();

  return {
    records,
    positions,
    summary: buildSummary(positions),
  };
};

const findOrCreateAssetForPayload = async (payload: OtherInvestmentPayload) => {
  const { records, assets } = await getOtherInvestmentState();
  const key = assetKey(payload);
  const existing = assets.find((asset) => assetKey(asset) === key);
  if (existing) return { asset: existing, records };

  const recordLike = {
    ...payload,
    id: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies OtherInvestmentRecord;
  const created = await createAssetPage(assetPayloadFromRecord(recordLike));
  return { asset: created, records };
};

export const createOtherInvestmentRecord = async (payload: OtherInvestmentPayload) => {
  const data = normalizeOtherInvestmentPayload(payload);
  await findOrCreateAssetForPayload(data);
  const { otherInvestmentDbId } = await ensureDatabases();
  await createPage(otherInvestmentDbId, recordProperties(data));
  await refreshAssetSummaryByKey(assetKey(data));
};

export const updateOtherInvestmentRecordById = async (id: string, payload: OtherInvestmentPayload) => {
  const data = normalizeOtherInvestmentPayload(payload);
  const { records } = await getOtherInvestmentState();
  const existing = records.find((record) => record.id === id);
  await findOrCreateAssetForPayload(data);
  await updateRecordPage(id, data);
  await refreshAssetSummaryByKey(assetKey(data));
  if (existing && assetKey(existing) !== assetKey(data)) {
    await refreshAssetSummaryByKey(assetKey(existing));
  }
};

export const deleteOtherInvestmentRecordById = async (id: string) => {
  const { records } = await getOtherInvestmentState();
  const existing = records.find((record) => record.id === id);
  await archivePage(id);
  if (existing) {
    await refreshAssetSummaryByKey(assetKey(existing));
  }
};

export const updateOtherInvestmentAssetById = async (id: string, payload: OtherInvestmentAssetPayload) => {
  const data = normalizeOtherInvestmentAssetPayload(payload);
  const { records, assets } = await getOtherInvestmentState();
  const existing = assets.find((asset) => asset.id === id);
  if (!existing) return;

  const oldKey = assetKey(existing);
  const nextKey = assetKey(data);
  const matchingRecords = records.filter((record) => assetKey(record) === oldKey);

  await Promise.all(
    matchingRecords.map((record) =>
      updateRecordPage(record.id, {
        ...recordPayload(record),
        assetCode: data.assetCode,
        assetName: data.assetName,
        market: data.market,
      }),
    ),
  );

  const updatedRecords = records.map((record) =>
    assetKey(record) === oldKey
      ? {
          ...record,
          assetCode: data.assetCode,
          assetName: data.assetName,
          market: data.market,
        }
      : record,
  );
  const updatedAsset: OtherInvestmentAsset = {
    ...existing,
    ...data,
  };
  const position = buildPosition(
    updatedAsset,
    updatedRecords.filter((record) => assetKey(record) === nextKey),
  );
  await updateAssetPage(id, assetPayloadFromPosition(position), position);
};

export const deleteOtherInvestmentAssetById = async (id: string) => {
  const { records, assets } = await getOtherInvestmentState();
  const asset = assets.find((item) => item.id === id);
  if (!asset) return;
  const key = assetKey(asset);
  const matchingRecords = records.filter((record) => assetKey(record) === key);
  await Promise.all(matchingRecords.map((record) => archivePage(record.id)));
  await archivePage(id);
};

export const syncOtherInvestmentMarketData = async (
  assets?: Array<Pick<OtherInvestmentPosition, "assetCode" | "assetName" | "market" | "currency">>,
) => {
  const { records, positions } = await getOtherInvestmentState();
  const requestedKeys = assets && assets.length > 0 ? new Set(assets.map(assetKey)) : null;
  const targets = requestedKeys ? positions.filter((position) => requestedKeys.has(assetKey(position))) : positions;
  const results: Array<{
    assetCode: string;
    assetName: string;
    market: OtherInvestmentMarket;
    ok: boolean;
    message?: string;
    quote?: AssetMarketQuote;
  }> = [];

  for (const position of targets) {
    try {
      const quote = await fetchAssetMarketQuote({
        assetCode: position.assetCode,
        assetName: position.assetName,
        market: position.market,
        currentPrice: position.currentPrice,
      });
      const nextAsset = { ...position, currentPrice: quote.currentPrice };
      const nextPosition = buildPosition(
        nextAsset,
        records.filter((record) => assetKey(record) === assetKey(position)),
      );

      await updateAssetPage(position.id, assetPayloadFromPosition(nextPosition), nextPosition);

      results.push({
        assetCode: position.assetCode,
        assetName: position.assetName,
        market: position.market,
        ok: true,
        quote,
      });
    } catch (error) {
      results.push({
        assetCode: position.assetCode,
        assetName: position.assetName,
        market: position.market,
        ok: false,
        message: error instanceof Error ? error.message : "同步失败",
      });
    }
  }

  return {
    total: targets.length,
    successCount: results.filter((item) => item.ok).length,
    failedCount: results.filter((item) => !item.ok).length,
    results,
  };
};
