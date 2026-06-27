import type {
  AnalyzeResponse,
  Verdict,
  RiskLevel,
  Flag,
  SenderForensics,
} from "@/types/api";
import { riskLevelFromScore, verdictFromRisk } from "@/types/api";

const samples = [
  {
    seed: "phish-bank",
    risk_score: 92,
    p: 0.94,
    is_phishing: true,
    flag_strings: [
      "Display name spoofing",
      "Lookalike URL (homoglyph)",
      "Urgency manipulation language",
      "Failed SPF",
      "Credential harvest pattern",
    ],
    flags: [
      { id: "f1", category: "spoofing", severity: "critical", title: "Display name spoofing", reason: "Display name claims 'Secure Bank Support' but envelope is from sender at suspicious-domain.ru" },
      { id: "f2", category: "url", severity: "critical", title: "Lookalike URL", reason: "URL uses Cyrillic homoglyphs to imitate paypal.com" },
      { id: "f3", category: "text", severity: "high", title: "Urgency manipulation", reason: "Phrases like 'account will be suspended in 24 hours' detected" },
      { id: "f4", category: "auth", severity: "high", title: "SPF failed", reason: "Sender IP not authorized for claimed domain" },
      { id: "f5", category: "text", severity: "medium", title: "Credential harvest pattern", reason: "Email requests password verification through external link" },
    ],
    auth: { spf: "fail", dkim: "fail", dmarc: "fail" },
    url_guard_flagged: 2,
    sender_display: "Secure Bank Support",
    sender_email: "noreply@suspicious-domain.ru",
    sender_domain: "suspicious-domain.ru",
    lookalike: "paypal.com",
    display_mismatch: true,
  },
  {
    seed: "safe-news",
    risk_score: 12,
    p: 0.04,
    is_phishing: false,
    flag_strings: ["Standard newsletter tracking pixel"],
    flags: [
      { id: "f1", category: "url", severity: "info", title: "Tracking pixel", reason: "Standard newsletter tracking pixel present" },
    ],
    auth: { spf: "pass", dkim: "pass", dmarc: "pass" },
    url_guard_flagged: 0,
    sender_display: "Newsletter Team",
    sender_email: "team@example.com",
    sender_domain: "example.com",
    display_mismatch: false,
  },
  {
    seed: "invoice",
    risk_score: 58,
    p: 0.58,
    is_phishing: false,
    flag_strings: [
      "Macro-enabled document attached",
      "Reply-To header mismatch",
      "DMARC policy neutral",
    ],
    flags: [
      { id: "f1", category: "attachment", severity: "high", title: "Macro-enabled document", reason: ".docm attachment can execute code on open" },
      { id: "f2", category: "spoofing", severity: "medium", title: "Reply-to mismatch", reason: "Reply-To address differs from From address" },
      { id: "f3", category: "auth", severity: "medium", title: "DMARC neutral", reason: "DMARC policy not enforced for sender domain" },
    ],
    auth: { spf: "pass", dkim: "neutral", dmarc: "neutral" },
    url_guard_flagged: 1,
    sender_display: "Acme Invoicing",
    sender_email: "billing@acme-invoices.co",
    sender_domain: "acme-invoices.co",
    display_mismatch: false,
  },
  {
    seed: "critical-wallet",
    risk_score: 97,
    p: 0.98,
    is_phishing: true,
    flag_strings: [
      "Crypto credential harvest",
      "Newly registered domain (3 days)",
      "DKIM signature missing",
      "Suspicious shortened URL chain",
    ],
    flags: [
      { id: "f1", category: "text", severity: "critical", title: "Crypto seed phrase request", reason: "Email asks user to submit recovery phrase" },
      { id: "f2", category: "url", severity: "critical", title: "Newly registered domain", reason: "wallet-verify.io registered 3 days ago" },
      { id: "f3", category: "auth", severity: "high", title: "DKIM missing", reason: "No DKIM signature present" },
    ],
    auth: { spf: "fail", dkim: "fail", dmarc: "fail" },
    url_guard_flagged: 3,
    sender_display: "Crypto Wallet Alerts",
    sender_email: "support@wallet-verify.io",
    sender_domain: "wallet-verify.io",
    lookalike: "metamask.io",
    display_mismatch: true,
  },
] as const;

export function mockAnalyze(input: {
  id?: string;
  subject?: string;
  source?: "paste" | "upload" | "gmail";
  gmailMessageId?: string;
  raw?: string;
  body?: string;
  snippet?: string;
  employee_id?: string;
}): AnalyzeResponse {
  const text = (input.subject ?? "") + " " + (input.raw ?? "") + " " + (input.body ?? "");
  const lower = text.toLowerCase();
  let s: (typeof samples)[number] = samples[2];
  if (/wallet|seed|recovery|crypto|metamask/.test(lower)) s = samples[3];
  else if (/bank|verify|suspend|password|paypal|apple ?id|appleid/.test(lower)) s = samples[0];
  else if (/newsletter|digest|weekly|update|unsubscribe|deployment|figma|notion/.test(lower)) s = samples[1];
  else if (/invoice|payment|receipt|attached|document/.test(lower)) s = samples[2];

  const id = input.id ?? `analysis_${Math.random().toString(36).slice(2, 10)}`;
  const subject = input.subject ?? "(no subject)";
  const risk_level: RiskLevel = riskLevelFromScore(s.risk_score);
  const verdict: Verdict = verdictFromRisk(risk_level);
  const sender: SenderForensics = {
    displayName: s.sender_display,
    envelopeFrom: s.sender_email,
    fromDomain: s.sender_domain,
    displayMismatch: s.display_mismatch,
    lookalikeOf: "lookalike" in s ? s.lookalike : undefined,
  };

  return {
    id,
    is_phishing: s.is_phishing,
    phishing_probability: s.p,
    risk_score: s.risk_score,
    risk_level,
    flags: [...s.flags] as Flag[],
    sender,
    subject,
    date: new Date().toISOString(),
    snippet: input.snippet ?? (input.body ?? input.raw ?? "").slice(0, 160),
    body: input.body ?? input.raw ?? "",
    url_guard_flagged: s.url_guard_flagged,
    employee_id: input.employee_id,

    verdict,
    threat_score: s.risk_score,
    trust_score: Math.max(0, 100 - s.risk_score),
    auth_checks: {
      spf: { status: s.auth.spf as "pass" | "fail", detail: s.auth.spf === "pass" ? "v=spf1 include:_spf.example.com ~all" : "Sender IP 203.0.113.42 not authorized" },
      dkim: { status: s.auth.dkim as "pass" | "fail", detail: s.auth.dkim === "pass" ? "Signature verified" : "Signature missing or invalid" },
      dmarc: { status: s.auth.dmarc as "pass" | "fail", detail: s.auth.dmarc === "pass" ? "p=reject, aligned" : "Policy not aligned" },
    },
    urls: s.is_phishing
      ? [
          { url: "https://раypal-secure.ru/verify", domain: "раypal-secure.ru", risk: "critical", reason: "Homoglyph imitation", redirects: ["http://203.0.113.42/r?u=..."] },
          { url: "https://t.suspicious-tracker.co/abc", domain: "suspicious-tracker.co", risk: "medium" },
        ]
      : s.risk_score > 40
        ? [{ url: "https://invoices.acme-invoices.co/4821", domain: "acme-invoices.co", risk: "low" }]
        : [{ url: "https://news.example.com/issue/482", domain: "news.example.com", risk: "info" }],
    attachments: s.risk_score > 40 && s.risk_score < 80
      ? [{ filename: "invoice_4821.docm", mime: "application/vnd.ms-word.document.macroenabled.12", size: 84212, risk: "high", reason: "Macro-enabled document" }]
      : [],
    headers: {
      Received: "from mail.example.com (mail.example.com [203.0.113.42]) by mx.gmail.com",
      "Authentication-Results": s.is_phishing ? "spf=fail dkim=fail dmarc=fail" : "spf=pass dkim=pass dmarc=pass",
      "Message-ID": `<${id}@mail.example.com>`,
      Subject: subject,
      Date: new Date().toUTCString(),
    },
    analyzed_at: new Date().toISOString(),
    source: input.source ?? "paste",
    gmail_message_id: input.gmailMessageId,
  };
}
