import { useAuthStore } from "@/store/authStore";
import type { Rule } from "@/types/api";

const API_BASE = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
const baseUrl = API_BASE ? API_BASE.replace(/\/$/, "") : "";

export async function getRules(): Promise<Rule[]> {
  const user = useAuthStore.getState().user;
  const url = new URL(`${baseUrl}/rules`, window.location.origin);
  if (user?.email) {
    url.searchParams.set("user_email", user.email);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`rules ${res.status}`);
  return await res.json();
}

export async function createRule(ruleData: any): Promise<any> {
  const user = useAuthStore.getState().user;
  const res = await fetch(`${baseUrl}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email: user?.email,
      pattern: ruleData.pattern,
      rule_type: ruleData.pattern.includes('@') ? 'email' : 'domain',
      status: ruleData.kind === 'whitelist' ? 'safe' : 'spam',
    }),
  });
  if (!res.ok) throw new Error(`create rule ${res.status}`);
  return await res.json();
}

export async function deleteRule(ruleId: string): Promise<any> {
  const user = useAuthStore.getState().user;
  const url = new URL(`${baseUrl}/rules/${ruleId}`, window.location.origin);
  if (user?.email) {
    url.searchParams.set("user_email", user.email);
  }
  const res = await fetch(url.toString(), { method: "DELETE" });
  if (!res.ok) throw new Error(`delete rule ${res.status}`);
  return await res.json();
}
