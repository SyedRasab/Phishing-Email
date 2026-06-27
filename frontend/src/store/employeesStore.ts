import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Employee } from "@/types/api";
import { getUsers, updateCredentials, deleteUser, updateUserStatus } from "@/services/api/users";

interface EmployeesState {
  employees: Employee[];
  loading: boolean;
  fetchEmployees: () => Promise<void>;
  setCredentials: (
    email: string,
    creds: { client_id: string; client_secret?: string; refresh_token?: string },
  ) => Promise<void>;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (email: string) => Promise<void>;
  setEmployeeStatus: (email: string, status: "active" | "suspended" | "invited") => Promise<void>;
  getById: (id: string) => Employee | undefined;
}

export const useEmployeesStore = create<EmployeesState>()(
  persist(
    (set, get) => ({
      employees: [],
      loading: false,
      fetchEmployees: async () => {
        set({ loading: true });
        try {
          const data = await getUsers();
          const mapped = data.map((u: any) => ({
            id: u.email,
            name: u.email.split("@")[0],
            email: u.email,
            role: u.role,
            status: u.status || "active",
            security_score: u.security_score !== undefined ? u.security_score : 100,
            scans_count: u.scans_count || 0,
            threats_caught: u.threats_caught || 0,
            last_active: new Date().toISOString(),
            credentials: u.google_client_id ? {
              client_id: u.google_client_id,
              client_secret_masked: "****",
              refresh_token_masked: "****",
              configured_at: new Date().toISOString()
            } : undefined
          }));
          set({ employees: mapped, loading: false });
        } catch (e) {
          console.error("Failed to fetch employees", e);
          set({ loading: false });
        }
      },
      setCredentials: async (email, creds) => {
        try {
          await updateCredentials(email, creds.client_id);
          await get().fetchEmployees();
        } catch (e) {
          console.error("Failed to set credentials", e);
        }
      },
      updateEmployee: (id, patch) =>
        set((s) => ({
          employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEmployee: async (email) => {
        try {
          await deleteUser(email);
          await get().fetchEmployees();
        } catch (e) {
          console.error("Failed to delete employee", e);
        }
      },
      setEmployeeStatus: async (email, status) => {
        try {
          await updateUserStatus(email, status);
          await get().fetchEmployees();
        } catch (e) {
          console.error("Failed to update employee status", e);
        }
      },
      getById: (id) => get().employees.find((e) => e.id === id),
    }),
    { name: "phishguard.employees" },
  ),
);
