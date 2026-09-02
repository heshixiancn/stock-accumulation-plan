import type {
  DashboardSummary,
  DividendRecord,
  EmailReportConfig,
  EmailReportConfigPayload,
  IpoRecord,
  MarketQuote,
  MarketSyncResult,
  OtherInvestmentMarketSyncResult,
  OtherInvestmentAsset,
  OtherInvestmentOverview,
  OtherInvestmentPosition,
  OtherInvestmentRecord,
  SetupPayload,
  SetupStatus,
  StockPlan,
  TradeRecord,
} from "../types";

type StockPayload = Omit<
  StockPlan,
  | "id"
  | "totalHoldingCost"
  | "marketValue"
  | "estimatedTargetCapital"
  | "remainingTargetCapital"
  | "unrealizedProfitLoss"
  | "unrealizedProfitLossRate"
  | "realizedProfitLoss"
  | "dividendIncome"
  | "totalProfitLoss"
  | "isClosed"
  | "hasTradeLedger"
  | "estimatedDividend"
  | "estimatedDividendYieldOnCost"
  | "estimatedDividendYieldOnMarket"
  | "estimatedDividendAtTarget"
  | "estimatedDividendAtTargetYieldOnCapital"
  | "progress"
>;

type TradePayload = Omit<TradeRecord, "id">;
type IpoPayload = Omit<
  IpoRecord,
  "id" | "investedAmount" | "saleProceeds" | "profitLoss" | "returnRate" | "createdAt" | "updatedAt"
>;
type OtherInvestmentPayload = Omit<OtherInvestmentRecord, "id">;
type OtherInvestmentAssetPayload = Pick<
  OtherInvestmentAsset,
  "assetCode" | "assetName" | "market" | "assetType" | "currentPrice" | "currency" | "notes"
>;
type OtherInvestmentSyncAsset = Pick<OtherInvestmentPosition, "assetCode" | "assetName" | "market" | "currency">;
type DataSource = "notion" | "mysql";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | { message?: string; errors?: { fieldErrors?: Record<string, string[]> } }
      | null;
    const fieldErrors = error?.errors?.fieldErrors
      ? Object.values(error.errors.fieldErrors).flat().filter(Boolean)
      : [];
    throw new Error(fieldErrors[0] ?? error?.message ?? "请求失败");
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSetupStatus: () => request<SetupStatus>("/api/setup/status"),
  saveSetup: (payload: SetupPayload) => request<{ message: string }>("/api/setup", { method: "POST", body: JSON.stringify(payload) }),
  getEmailReportConfig: () => request<EmailReportConfig>("/api/setup/email-report"),
  saveEmailReportConfig: (payload: EmailReportConfigPayload) =>
    request<{ message: string }>("/api/setup/email-report", { method: "POST", body: JSON.stringify(payload) }),
  exportData: async (source: DataSource) => {
    const response = await fetch(`/api/setup/data/export?source=${source}`);
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(error?.message ?? "导出失败");
    }
    return response.blob();
  },
  importData: (target: DataSource, payload: unknown) =>
    request<{ message: string; imported: Record<string, number> }>(`/api/setup/data/import?target=${target}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  syncMysqlToNotion: () =>
    request<{ message: string; imported: Record<string, number> }>("/api/setup/data/sync-mysql-to-notion", {
      method: "POST",
    }),
  init: () => request<{ message: string }>("/api/init", { method: "POST" }),
  getStocks: () => request<StockPlan[]>("/api/stocks"),
  createStock: (payload: StockPayload) =>
    request("/api/stocks", { method: "POST", body: JSON.stringify(payload) }),
  updateStock: (id: string, payload: StockPayload) =>
    request(`/api/stocks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  syncStockMarket: (id: string) =>
    request<{ message: string; quote: MarketQuote }>(`/api/stocks/${id}/sync-market`, { method: "POST" }),
  syncStocksMarket: (ids: string[]) =>
    request<MarketSyncResult>("/api/stocks/sync-market", { method: "POST", body: JSON.stringify({ ids }) }),
  deleteStock: (id: string) => request(`/api/stocks/${id}`, { method: "DELETE" }),
  getDividends: () => request<DividendRecord[]>("/api/dividends"),
  createDividend: (payload: Omit<DividendRecord, "id">) =>
    request("/api/dividends", { method: "POST", body: JSON.stringify(payload) }),
  updateDividend: (id: string, payload: Omit<DividendRecord, "id">) =>
    request(`/api/dividends/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteDividend: (id: string) => request(`/api/dividends/${id}`, { method: "DELETE" }),
  getTrades: () => request<TradeRecord[]>("/api/trades"),
  createTrade: (payload: TradePayload) =>
    request("/api/trades", { method: "POST", body: JSON.stringify(payload) }),
  updateTrade: (id: string, payload: TradePayload) =>
    request(`/api/trades/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTrade: (id: string) => request(`/api/trades/${id}`, { method: "DELETE" }),
  getNewIssues: () => request<IpoRecord[]>("/api/new-issues"),
  createNewIssue: (payload: IpoPayload) =>
    request<{ message: string }>("/api/new-issues", { method: "POST", body: JSON.stringify(payload) }),
  updateNewIssue: (id: string, payload: IpoPayload) =>
    request<{ message: string }>(`/api/new-issues/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNewIssue: (id: string) => request<{ message: string }>(`/api/new-issues/${id}`, { method: "DELETE" }),
  getOtherInvestments: () => request<OtherInvestmentOverview>("/api/other-investments"),
  createOtherInvestment: (payload: OtherInvestmentPayload) =>
    request("/api/other-investments", { method: "POST", body: JSON.stringify(payload) }),
  updateOtherInvestment: (id: string, payload: OtherInvestmentPayload) =>
    request(`/api/other-investments/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateOtherInvestmentAsset: (id: string, payload: OtherInvestmentAssetPayload) =>
    request(`/api/other-investments/assets/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  syncOtherInvestmentsMarket: (assets: OtherInvestmentSyncAsset[]) =>
    request<OtherInvestmentMarketSyncResult>("/api/other-investments/sync-market", {
      method: "POST",
      body: JSON.stringify({ assets }),
    }),
  deleteOtherInvestmentAsset: (id: string) => request(`/api/other-investments/assets/${id}`, { method: "DELETE" }),
  deleteOtherInvestment: (id: string) => request(`/api/other-investments/${id}`, { method: "DELETE" }),
  getDashboard: () => request<DashboardSummary>("/api/dashboard"),
};
