import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { TradeRecord } from "../types";

type TradePayload = Omit<TradeRecord, "id">;

export const useTrades = (enabled = true) => {
  const queryClient = useQueryClient();
  const [refreshError, setRefreshError] = useState("");

  const invalidate = async () => {
    const results = await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["trades"] }, { throwOnError: true }),
      queryClient.invalidateQueries({ queryKey: ["stocks"] }, { throwOnError: true }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }, { throwOnError: true }),
    ]);
    const failed = results.find((result) => result.status === "rejected");

    if (failed?.status === "rejected") {
      const details = failed.reason instanceof Error ? `：${failed.reason.message}` : "";
      setRefreshError(`交易操作已完成，但页面数据自动刷新失败，请点击右上角“刷新数据”重试${details}`);
      return;
    }

    setRefreshError("");
  };

  const clearRefreshError = () => setRefreshError("");

  return {
    refreshError,
    clearRefreshError,
    query: useQuery({
      queryKey: ["trades"],
      queryFn: api.getTrades,
      enabled,
    }),
    createMutation: useMutation({
      mutationFn: (payload: TradePayload) => api.createTrade(payload),
      onSuccess: invalidate,
    }),
    updateMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: TradePayload }) => api.updateTrade(id, payload),
      onSuccess: invalidate,
    }),
    deleteMutation: useMutation({
      mutationFn: (id: string) => api.deleteTrade(id),
      onSuccess: invalidate,
    }),
  };
};
