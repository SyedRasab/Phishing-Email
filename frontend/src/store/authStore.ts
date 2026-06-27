import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/types/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  expiresAt: number | null;
  isDemo: boolean;
  /** When set, admin is viewing the app as if they were this employee. */
  impersonatedEmployeeId: string | null;
  setSession: (user: User, accessToken: string, expiresIn: number) => void;
  setDemoSession: (overrides?: Partial<User>) => void;
  signOut: () => void;
  isAuthenticated: () => boolean;
  setRole: (role: Role) => void;
  impersonate: (employeeId: string | null) => void;
}

const DEFAULT_DEMO: User = {
  id: "demo_admin",
  email: "admin@phishguard.dev",
  name: "Alex Morgan",
  picture: undefined,
  provider: "google",
  role: "admin",
  org_id: "org_phishguard",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      expiresAt: null,
      isDemo: false,
      impersonatedEmployeeId: null,
      setSession: (user, accessToken, expiresIn) =>
        set({
          user,
          accessToken,
          expiresAt: Date.now() + expiresIn * 1000,
          isDemo: false,
          impersonatedEmployeeId: null,
        }),
      setDemoSession: (overrides) =>
        set({
          user: { ...DEFAULT_DEMO, ...overrides },
          accessToken: "demo_token",
          expiresAt: Date.now() + 3600 * 1000,
          isDemo: true,
          impersonatedEmployeeId: null,
        }),
      signOut: () =>
        set({
          user: null,
          accessToken: null,
          expiresAt: null,
          isDemo: false,
          impersonatedEmployeeId: null,
        }),
      isAuthenticated: () => {
        const { user, expiresAt } = get();
        return !!user && !!expiresAt && expiresAt > Date.now();
      },
      setRole: (role) => {
        const u = get().user;
        if (!u) return;
        set({ user: { ...u, role }, impersonatedEmployeeId: null });
      },
      impersonate: (employeeId) => set({ impersonatedEmployeeId: employeeId }),
    }),
    { name: "phishguard.auth" },
  ),
);

/**
 * Effective employee id for filtering — either the signed-in user, or the
 * employee an admin is currently impersonating.
 */
export function useEffectiveEmployeeId(): string | null {
  const user = useAuthStore((s) => s.user);
  const impersonated = useAuthStore((s) => s.impersonatedEmployeeId);
  return impersonated ?? user?.id ?? null;
}
