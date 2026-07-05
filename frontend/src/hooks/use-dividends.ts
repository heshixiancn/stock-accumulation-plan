import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DividendRecord } from "../types";

type DividendPayload = Omit<DividendRecord, "id">;

export const useDividends = (enabled = true) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dividends"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  return {
    query: useQuery({
      queryKey: ["dividends"],
      queryFn: api.getDividends,
      enabled,
    }),
    createMutation: useMutation({
      mutationFn: (payload: DividendPayload) => api.createDividend(payload),
      onSuccess: invalidate,
    }),
    updateMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: DividendPayload }) => api.updateDividend(id, payload),
      onSuccess: invalidate,
    }),
    deleteMutation: useMutation({
      mutationFn: (id: string) => api.deleteDividend(id),
      onSuccess: invalidate,
    }),
  };
};
