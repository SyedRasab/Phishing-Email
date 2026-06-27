import type { ParsedEmail } from "@/types/gmail";
import type { GmailMessageRaw, GmailPayload } from "@/types/gmail";
import { MOCK_EMAILS } from "@/lib/mocks/gmail";
import { useAuthStore } from "@/store/authStore";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";

function base64UrlDecode(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    if (typeof atob !== "undefined") {
      const bin = atob(padded);
      // Decode as UTF-8
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }
    return "";
  } catch {
    return "";
  }
}

function headerMap(headers: { name: string; value: string }[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) out[h.name] = h.value;
  return out;
}

function walk(parts: GmailPayload[] | undefined, body: { text: string; html: string; atts: ParsedEmail["attachments"] }) {
  if (!parts) return;
  for (const p of parts) {
    const mt = p.mimeType || "";
    if (p.filename && p.body?.attachmentId) {
      body.atts.push({ filename: p.filename, mime: mt, size: p.body.size || 0 });
    } else if (mt === "text/plain" && p.body?.data) {
      body.text += base64UrlDecode(p.body.data);
    } else if (mt === "text/html" && p.body?.data) {
      body.html += base64UrlDecode(p.body.data);
    }
    if (p.parts) walk(p.parts, body);
  }
}

export function parseGmailMessage(m: GmailMessageRaw): ParsedEmail {
  const headers = headerMap(m.payload.headers);
  const from = headers["From"] || "";
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]+)?>?$/);
  const fromName = (match?.[1] || from).trim().replace(/^"|"$/g, "");
  const fromEmail = (match?.[2] || from).trim();
  const fromDomain = fromEmail.includes("@") ? fromEmail.split("@")[1] : "";

  const body = { text: "", html: "", atts: [] as ParsedEmail["attachments"] };
  if (m.payload.body?.data) {
    if (m.payload.mimeType === "text/html") body.html = base64UrlDecode(m.payload.body.data);
    else body.text = base64UrlDecode(m.payload.body.data);
  }
  walk(m.payload.parts, body);

  const labels = m.labelIds || [];
  return {
    id: m.id,
    threadId: m.threadId,
    from,
    fromName,
    fromEmail,
    fromDomain,
    to: headers["To"] || "",
    subject: headers["Subject"] || "(no subject)",
    date: new Date(Number(m.internalDate)).toISOString(),
    snippet: m.snippet,
    bodyText: body.text,
    bodyHtml: body.html,
    headers,
    attachments: body.atts,
    labels,
    unread: labels.includes("UNREAD"),
    hasAttachments: body.atts.length > 0,
    raw: Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\n" + (body.text || body.html),
  };
}

async function gfetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().signOut();
    }
    throw new Error(`Gmail API ${res.status}`);
  }
  return (await res.json()) as T;
}

import { getHistory } from "@/services/api/history";

const API_BASE = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
const baseUrl = API_BASE ? API_BASE.replace(/\/$/, "") : "";

async function fetchSimulations(): Promise<ParsedEmail[]> {
  try {
    const history = await getHistory();
    const sims = history.filter((r: any) => r.is_simulation || r.trust_analysis?.simulation);
    return sims.map((s: any) => {
      let bodyText = s.body_text || s.subject;
      let bodyHtml = s.body_html || bodyText;
      if (s.trust_analysis) {
        bodyText = s.trust_analysis.body_text || bodyText;
        bodyHtml = s.trust_analysis.body_html || bodyHtml;
      }
      return {
        id: `sim_${s.id}`,
        threadId: `sim_${s.id}`,
        from: s.sender,
        fromName: s.sender.split("<")[0].trim().replace(/^"|"$/g, ""),
        fromEmail: s.sender.match(/<([^>]+)>/)?.[1] || s.sender,
        fromDomain: s.sender_domain,
        to: s.user_email || "you@company.com",
        subject: s.subject,
        date: s.scanned_at ? new Date(s.scanned_at).toISOString() : new Date().toISOString(),
        snippet: bodyText.slice(0, 100),
        bodyText: bodyText,
        bodyHtml: bodyHtml,
        headers: {},
        attachments: [],
        labels: s.simulation_status === "pending" ? ["UNREAD", "INBOX"] : ["INBOX"],
        unread: s.simulation_status === "pending",
        hasAttachments: false,
        raw: bodyText,
      };
    });
  } catch (e) {
    console.error("Failed to load simulated emails", e);
    return [];
  }
}

export async function listInbox(opts: { q?: string; pageToken?: string; maxResults?: number } = {}): Promise<{ messages: ParsedEmail[]; nextPageToken?: string }> {
  const { isDemo } = useAuthStore.getState();
  const simEmails = await fetchSimulations();

  let standardMessages: ParsedEmail[] = [];
  let nextPageToken: string | undefined;

  if (isDemo) {
    await new Promise((r) => setTimeout(r, 400));
    standardMessages = [...MOCK_EMAILS];
  } else {
    const params = new URLSearchParams();
    params.set("maxResults", String(opts.maxResults ?? 25));
    if (opts.q) params.set("q", opts.q);
    if (opts.pageToken) params.set("pageToken", opts.pageToken);
    params.set("labelIds", "INBOX");
    try {
      const list = await gfetch<{ messages?: { id: string; threadId: string }[]; nextPageToken?: string }>(`/users/me/messages?${params}`);
      nextPageToken = list.nextPageToken;
      if (list.messages?.length) {
        const fulls = await Promise.all(
          list.messages.map((m) => gfetch<GmailMessageRaw>(`/users/me/messages/${m.id}?format=full`)),
        );
        standardMessages = fulls.map(parseGmailMessage);
      }
    } catch (e) {
      console.error("Failed to fetch Gmail messages, falling back to mocks", e);
      standardMessages = [...MOCK_EMAILS];
    }
  }

  let combined = [...simEmails, ...standardMessages];
  if (opts.q) {
    const q = opts.q.toLowerCase();
    combined = combined.filter((m) => 
      m.subject.toLowerCase().includes(q) || 
      m.fromName.toLowerCase().includes(q) || 
      m.snippet.toLowerCase().includes(q)
    );
  }

  return { messages: combined, nextPageToken };
}

export async function getMessage(id: string): Promise<ParsedEmail> {
  if (id.startsWith("sim_")) {
    const scanId = id.replace("sim_", "");
    const res = await fetch(`${baseUrl}/scan/${scanId}`);
    if (!res.ok) throw new Error(`Failed to load simulation scan: ${res.status}`);
    const s = await res.json();
    
    let bodyText = s.body_text || s.subject;
    let bodyHtml = s.body_html || bodyText;
    if (s.trust_analysis) {
      bodyText = s.trust_analysis.body_text || bodyText;
      bodyHtml = s.trust_analysis.body_html || bodyHtml;
    }
    return {
      id: `sim_${s.scan_id || s.id}`,
      threadId: `sim_${s.scan_id || s.id}`,
      from: s.sender,
      fromName: s.sender.split("<")[0].trim().replace(/^"|"$/g, ""),
      fromEmail: s.sender.match(/<([^>]+)>/)?.[1] || s.sender,
      fromDomain: s.sender_domain,
      to: s.user_email || "you@company.com",
      subject: s.subject,
      date: s.scanned_at ? new Date(s.scanned_at).toISOString() : new Date().toISOString(),
      snippet: bodyText.slice(0, 100),
      bodyText: bodyText,
      bodyHtml: bodyHtml,
      headers: {},
      attachments: [],
      labels: s.simulation_status === "pending" ? ["UNREAD", "INBOX"] : ["INBOX"],
      unread: s.simulation_status === "pending",
      hasAttachments: false,
      raw: bodyText,
    };
  }

  const { isDemo } = useAuthStore.getState();
  if (isDemo) {
    await new Promise((r) => setTimeout(r, 250));
    const found = MOCK_EMAILS.find((m) => m.id === id);
    if (!found) throw new Error("Message not found");
    return found;
  }
  const raw = await gfetch<GmailMessageRaw>(`/users/me/messages/${id}?format=full`);
  return parseGmailMessage(raw);
}
