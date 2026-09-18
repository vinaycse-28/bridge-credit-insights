import { useQuery } from "@tanstack/react-query";
import { getBusiness, getLatestAnalysis, getTransactions, listBusinesses } from "./data";

export function useBusinesses() {
  return useQuery({ queryKey: ["businesses"], queryFn: listBusinesses });
}

export function useBusiness(id: string) {
  return useQuery({ queryKey: ["business", id], queryFn: () => getBusiness(id) });
}

export function useTransactions(id: string) {
  return useQuery({ queryKey: ["transactions", id], queryFn: () => getTransactions(id) });
}

export function useAnalysis(id: string) {
  return useQuery({ queryKey: ["analysis", id], queryFn: () => getLatestAnalysis(id) });
}
