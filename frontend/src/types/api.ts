// Types mirror the FastAPI phishing detector backend response shape.

export type RiskLevel = "Low Risk" | "Medium Risk" | "Human Review Required" | "High Risk" | "Critical Threat";
export type Verdict = "safe" | "suspicious" | "phishing";
export type FlagSeverity = "info" | "low" | "medium" | "high" | "critical";
export type Role = "admin" | "employee";

export interface Flag {
  id: string;
  category: "text" | "url" | "auth" | "spoofing" | "attachment" | "header";
  severity: FlagSeverity;
  title: string;
  reason: string;
}

export interface AuthCheck {
  status: "pass" | "fail" | "neutral" | "softfail" | "none";
  detail?: string;
}

export interface AuthChecks {
  spf: AuthCheck;
  dkim: AuthCheck;
  dmarc: AuthCheck;
}

export interface UrlAnalysis {
  url: string;
  domain: string;
  risk: FlagSeverity;
  redirects?: string[];
  reason?: string;
}

export interface AttachmentAnalysis {
  filename: string;
  mime: string;
  size: number;
  risk: FlagSeverity;
  reason?: string;
}

export interface SenderForensics {
  displayName?: string;
  envelopeFrom?: string;
  fromDomain?: string;
  displayMismatch: boolean;
  lookalikeOf?: string;
}

/**
 * Matches the FastAPI /scan/text response exactly,
 * plus optional rich frontend fields populated by the mock layer
 * (auth_checks, urls, attachments, sender forensics, headers, etc.)
 * so the report UI stays cinematic.
 */
export interface AnalyzeResponse {
  // Backend contract
  id: string;
  is_phishing: boolean;
  phishing_probability: number; // 0..1
  risk_score: number; // 0..100
  risk_level: RiskLevel;
  flags: string[] | Flag[];
  sender: string | SenderForensics;
  subject: string;
  date: string; // ISO
  snippet: string;
  body: string;
  url_guard_flagged: number;
  employee_id?: string;
  under_review?: boolean;
  is_simulation?: boolean;
  simulation_status?: string;
  spf?: string;
  dmarc?: string;
  dkim_status?: string;

  // Optional rich forensics from the frontend mock (populated when available)
  verdict?: Verdict;
  threat_score?: number;
  trust_score?: number;
  trust_analysis?: any;
  auth_checks?: AuthChecks;
  urls?: UrlAnalysis[];
  attachments?: AttachmentAnalysis[];
  headers?: Record<string, string>;
  analyzed_at?: string;
  source?: "paste" | "upload" | "gmail";
  gmail_message_id?: string;
}

export type ScanResult = AnalyzeResponse;

export interface StatsResponse {
  total_scans: number;
  safe_count: number;
  phishing_count: number;
  suspicious_count: number;
  critical_count: number;
  scans_today: number;
  avg_risk_score: number;
  top_attacked_domains: { domain: string; count: number }[];
  per_day: { date: string; safe: number; suspicious: number; phishing: number; human_review?: number; total?: number }[];
  human_review_count?: number;
  trends?: { date: string; total: number; phishing: number; safe: number; suspicious: number; human_review: number }[];
  security_score?: number;
  status?: string;
}

export interface Rule {
  id: number;
  user_email: string;
  pattern: string;
  rule_type: "email" | "domain";
  status: "safe" | "spam";
  created_at: string;
}

export interface SenderRule {
  id: string;
  pattern: string; // domain or email
  kind: "whitelist" | "blacklist";
  scope: "user" | "org";
  note?: string;
  created_at: string;
  owner_id: string;
}

export interface Employee {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: Role;
  org_id: string;
  status: "active" | "invited" | "suspended";
  security_score?: number;
  last_active?: string;
  scans_count: number;
  threats_caught: number;
  credentials?: {
    client_id?: string;
    client_secret_masked?: string;
    refresh_token_masked?: string;
    configured_at?: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "google" | "email";
  role: Role;
  org_id: string;
  security_score?: number;
  status?: "active" | "invited" | "suspended";
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return "Critical Threat";
  if (score >= 56) return "High Risk";
  if (score >= 45) return "Human Review Required";
  if (score >= 30) return "Medium Risk";
  return "Low Risk";
}

export function verdictFromRisk(level: RiskLevel): Verdict {
  if (level === "Critical Threat" || level === "High Risk") return "phishing";
  if (level === "Human Review Required" || level === "Medium Risk") return "suspicious";
  return "safe";
}

export function riskColor(level: RiskLevel): "safe" | "primary" | "suspicious" | "phishing" | "human-review" {
  if (level === "Critical Threat") return "phishing";
  if (level === "High Risk") return "phishing";
  if (level === "Human Review Required") return "human-review";
  if (level === "Medium Risk") return "suspicious";
  return "safe";
}
