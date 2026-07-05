import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useDashboard = (enabled = true) =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
    enabled,
  });
