import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { TradeRecord } from "../types";

type TradePayload = Omit<TradeRecord, "id">;

export const useTrades = (enabled = true) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trades"] }),
      queryClient.invalidateQueries({ queryKey: ["stocks"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  return {
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
