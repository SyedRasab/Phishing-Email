import { useAuthStore } from "@/store/authStore";

const API_BASE = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
const baseUrl = API_BASE ? API_BASE.replace(/\/$/, "") : "";

export async function getHistory(overrideEmail?: string): Promise<any> {
  const user = useAuthStore.getState().user;
  const url = new URL(`${baseUrl}/history`, window.location.origin);
  const impersonatedEmail = useAuthStore.getState().impersonatedEmployeeId;
  const targetEmail = overrideEmail || impersonatedEmail || user?.email;
  
  if (targetEmail && (overrideEmail || impersonatedEmail || user?.role !== "admin")) {
    url.searchParams.set("user_email", targetEmail);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`history ${res.status}`);
  return await res.json();
}
