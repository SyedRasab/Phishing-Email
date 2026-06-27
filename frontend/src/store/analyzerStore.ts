import { create } from "zustand";
import type { AnalyzeResponse } from "@/types/api";

interface AnalyzerState {
  // Map message id (gmail or paste) -> result
  results: Record<string, AnalyzeResponse>;
  // Per-message in-flight state
  loading: Record<string, boolean>;
  setLoading: (id: string, v: boolean) => void;
  setResult: (id: string, result: AnalyzeResponse) => void;
  get: (id: string) => AnalyzeResponse | undefined;
  clear: () => void;
}

export const useAnalyzerStore = create<AnalyzerState>((set, get) => ({
  results: {},
  loading: {},
  setLoading: (id, v) => set((s) => ({ loading: { ...s.loading, [id]: v } })),
  setResult: (id, result) => set((s) => ({ results: { ...s.results, [id]: result } })),
  get: (id) => get().results[id],
  clear: () => set({ results: {}, loading: {} }),
}));
