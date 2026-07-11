import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { OtherInvestmentAsset, OtherInvestmentPosition, OtherInvestmentRecord } from "../types";

type OtherInvestmentPayload = Omit<OtherInvestmentRecord, "id">;
type OtherInvestmentAssetPayload = Pick<
  OtherInvestmentAsset,
  "assetCode" | "assetName" | "market" | "assetType" | "currentPrice" | "currency" | "notes"
>;
type OtherInvestmentSyncAsset = Pick<OtherInvestmentPosition, "assetCode" | "assetName" | "market" | "currency">;

export const useOtherInvestments = (enabled = true) => {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["other-investments"] });

  return {
    query: useQuery({
      queryKey: ["other-investments"],
      queryFn: api.getOtherInvestments,
      enabled,
    }),
    createMutation: useMutation({
      mutationFn: (payload: OtherInvestmentPayload) => api.createOtherInvestment(payload),
      onSuccess: invalidate,
    }),
    updateMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: OtherInvestmentPayload }) =>
        api.updateOtherInvestment(id, payload),
      onSuccess: invalidate,
    }),
    updateAssetMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: OtherInvestmentAssetPayload }) =>
        api.updateOtherInvestmentAsset(id, payload),
      onSuccess: invalidate,
    }),
    syncMarketsMutation: useMutation({
      mutationFn: (assets: OtherInvestmentSyncAsset[]) => api.syncOtherInvestmentsMarket(assets),
      onSuccess: invalidate,
    }),
    deleteAssetMutation: useMutation({
      mutationFn: (id: string) => api.deleteOtherInvestmentAsset(id),
      onSuccess: invalidate,
    }),
    deleteMutation: useMutation({
      mutationFn: (id: string) => api.deleteOtherInvestment(id),
      onSuccess: invalidate,
    }),
  };
};
