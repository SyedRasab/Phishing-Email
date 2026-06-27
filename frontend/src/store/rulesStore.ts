import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SenderRule } from "@/types/api";
import { getRules, createRule as apiCreateRule, deleteRule as apiDeleteRule } from "@/services/api/rules";

interface RulesState {
  rules: SenderRule[];
  loading: boolean;
  fetchRules: () => Promise<void>;
  addRule: (rule: Omit<SenderRule, "id" | "created_at">) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  clearForOwner: (ownerId: string) => void;
}

export const useRulesStore = create<RulesState>()(
  persist(
    (set, get) => ({
      rules: [],
      loading: false,
      fetchRules: async () => {
        set({ loading: true });
        try {
          const data = await getRules();
          // Map backend rule format to SenderRule
          const mapped = data.map((r: any) => ({
            id: String(r.id),
            pattern: r.pattern,
            kind: (r.status === 'safe' ? 'whitelist' : 'blacklist') as 'whitelist' | 'blacklist',
            scope: (r.scope ?? 'org') as 'user' | 'org',
            note: "",
            created_at: new Date().toISOString(),
            owner_id: r.user_email,
          }));
          set({ rules: mapped, loading: false });
        } catch (e) {
          console.error("Failed to fetch rules", e);
          set({ loading: false });
        }
      },
      addRule: async (r) => {
        try {
          await apiCreateRule(r);
          await get().fetchRules();
        } catch (e) {
          console.error("Failed to add rule", e);
        }
      },
      removeRule: async (id) => {
        try {
          await apiDeleteRule(id);
          await get().fetchRules();
        } catch (e) {
          console.error("Failed to delete rule", e);
        }
      },
      clearForOwner: (ownerId) =>
        set((s) => ({ rules: s.rules.filter((r) => r.owner_id !== ownerId) })),
    }),
    { name: "phishguard.rules" },
  ),
);
