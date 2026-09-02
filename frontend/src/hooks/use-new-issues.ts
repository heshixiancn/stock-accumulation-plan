import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { IpoRecord } from "../types";

export type IpoPayload = Omit<
  IpoRecord,
  "id" | "investedAmount" | "saleProceeds" | "profitLoss" | "returnRate" | "createdAt" | "updatedAt"
>;

export const useNewIssues = (enabled = true) => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["new-issues"] });

  return {
    query: useQuery({
      queryKey: ["new-issues"],
      queryFn: api.getNewIssues,
      enabled,
    }),
    createMutation: useMutation({
      mutationFn: (payload: IpoPayload) => api.createNewIssue(payload),
      onSuccess: invalidate,
    }),
    updateMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: IpoPayload }) => api.updateNewIssue(id, payload),
      onSuccess: invalidate,
    }),
    deleteMutation: useMutation({
      mutationFn: (id: string) => api.deleteNewIssue(id),
      onSuccess: invalidate,
    }),
  };
};
