import type { AnalyzeResponse } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

export async function analyzeEmail(input: {
  raw?: string;
  subject?: string;
  source?: "paste" | "upload" | "gmail";
  gmailMessageId?: string;
  id?: string;
}): Promise<AnalyzeResponse> {
  const user = useAuthStore.getState().user;
  const url = API_BASE ? `${API_BASE.replace(/\/$/, "")}/scan/text` : "/scan/text";
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email_text: input.raw || "",
      user_email: user?.email,
      gmail_message_id: input.gmailMessageId || input.id || undefined,
    }),
  });
  
  if (!res.ok) throw new Error(`Analyzer error ${res.status}`);
  const data = await res.json();
  data.id = String(data.scan_id || data.id);
  
  if (data.url_guard_flagged_urls && Array.isArray(data.url_guard_flagged_urls)) {
    data.urls = data.url_guard_flagged_urls.map((u: string) => {
      let d = u;
      try { d = new URL(u).hostname; } catch(e) {}
      return { url: u, domain: d, risk: "critical", reason: "Flagged by URL Guard AI" };
    });
  }

  return data as AnalyzeResponse;
}

export async function requestReview(scanId: number): Promise<any> {
  const url = API_BASE ? `${API_BASE.replace(/\/$/, "")}/scan/${scanId}/review` : `/scan/${scanId}/review`;
  const res = await fetch(url, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Request review error ${res.status}`);
  return await res.json();
}

export async function resolveReview(scanId: number, verdict: "safe" | "phishing"): Promise<any> {
  const url = API_BASE ? `${API_BASE.replace(/\/$/, "")}/scan/${scanId}/resolve` : `/scan/${scanId}/resolve`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verdict }),
  });
  if (!res.ok) throw new Error(`Resolve review error ${res.status}`);
  return await res.json();
}

export async function getPendingReviews(): Promise<any> {
  const url = API_BASE ? `${API_BASE.replace(/\/$/, "")}/admin/reviews` : "/admin/reviews";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Get pending reviews error ${res.status}`);
  return await res.json();
}

export async function getScan(scanId: number): Promise<any> {
  const url = API_BASE ? `${API_BASE.replace(/\/$/, "")}/scan/${scanId}` : `/scan/${scanId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Get scan error ${res.status}`);
  return await res.json();
}

