import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { StockPlan } from "../types";

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

export const useStocks = (enabled = true) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["stocks"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  return {
    query: useQuery({
      queryKey: ["stocks"],
      queryFn: api.getStocks,
      enabled,
    }),
    createMutation: useMutation({
      mutationFn: (payload: StockPayload) => api.createStock(payload),
      onSuccess: invalidate,
    }),
    updateMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: StockPayload }) => api.updateStock(id, payload),
      onSuccess: invalidate,
    }),
    syncMarketMutation: useMutation({
      mutationFn: (id: string) => api.syncStockMarket(id),
      onSuccess: invalidate,
    }),
    syncMarketsMutation: useMutation({
      mutationFn: (ids: string[]) => api.syncStocksMarket(ids),
      onSuccess: invalidate,
    }),
    deleteMutation: useMutation({
      mutationFn: (id: string) => api.deleteStock(id),
      onSuccess: invalidate,
    }),
  };
};
