import type { DashboardSummary, DividendRecord, SetupPayload, SetupStatus, StockPlan } from "../types";

type StockPayload = Omit<
  StockPlan,
  | "id"
  | "totalHoldingCost"
  | "marketValue"
  | "estimatedTargetCapital"
  | "remainingTargetCapital"
  | "unrealizedProfitLoss"
  | "unrealizedProfitLossRate"
  | "estimatedDividend"
  | "estimatedDividendYieldOnCost"
  | "estimatedDividendYieldOnMarket"
  | "estimatedDividendAtTarget"
  | "estimatedDividendAtTargetYieldOnCapital"
  | "progress"
>;

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
  init: () => request<{ message: string }>("/api/init", { method: "POST" }),
  getStocks: () => request<StockPlan[]>("/api/stocks"),
  createStock: (payload: StockPayload) =>
    request("/api/stocks", { method: "POST", body: JSON.stringify(payload) }),
  updateStock: (id: string, payload: StockPayload) =>
    request(`/api/stocks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStock: (id: string) => request(`/api/stocks/${id}`, { method: "DELETE" }),
  getDividends: () => request<DividendRecord[]>("/api/dividends"),
  createDividend: (payload: Omit<DividendRecord, "id">) =>
    request("/api/dividends", { method: "POST", body: JSON.stringify(payload) }),
  updateDividend: (id: string, payload: Omit<DividendRecord, "id">) =>
    request(`/api/dividends/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteDividend: (id: string) => request(`/api/dividends/${id}`, { method: "DELETE" }),
  getDashboard: () => request<DashboardSummary>("/api/dashboard"),
};
