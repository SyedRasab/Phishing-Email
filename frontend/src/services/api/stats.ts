import type { StatsResponse } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

const API_BASE = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;

export async function getStats(overrideEmail?: string): Promise<StatsResponse> {
  const user = useAuthStore.getState().user;
  const baseUrl = API_BASE ? API_BASE.replace(/\/$/, "") : "";
  const url = new URL(`${baseUrl}/stats`, window.location.origin);
  const impersonatedEmail = useAuthStore.getState().impersonatedEmployeeId;
  const targetEmail = overrideEmail || impersonatedEmail;
  
  if (targetEmail) {
    url.searchParams.set("user_email", targetEmail);
  } else if (user?.role !== "admin" && user?.email) {
    url.searchParams.set("user_email", user.email);
  }
  
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return (await res.json()) as StatsResponse;
}
