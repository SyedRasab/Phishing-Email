import type { StatsResponse } from "@/types/api";

function dayKey(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

export function mockStats(): StatsResponse {
  const per_day = Array.from({ length: 14 }).map((_, i) => {
    const offset = 13 - i;
    const seed = (offset * 37) % 11;
    return {
      date: dayKey(offset),
      safe: 40 + ((seed * 7) % 30),
      suspicious: 8 + ((seed * 3) % 12),
      phishing: 3 + ((seed * 2) % 6),
    };
  });

  const totals = per_day.reduce(
    (acc, d) => ({
      safe: acc.safe + d.safe,
      suspicious: acc.suspicious + d.suspicious,
      phishing: acc.phishing + d.phishing,
    }),
    { safe: 0, suspicious: 0, phishing: 0 },
  );

  const total = totals.safe + totals.suspicious + totals.phishing;
  const today = per_day[per_day.length - 1];

  return {
    total_scans: total,
    safe_count: totals.safe,
    phishing_count: totals.phishing,
    suspicious_count: totals.suspicious,
    critical_count: Math.floor(totals.phishing * 0.35),
    scans_today: today.safe + today.suspicious + today.phishing,
    avg_risk_score: 32,
    top_attacked_domains: [
      { domain: "paypal-secure.ru", count: 24 },
      { domain: "appleid.appie.com", count: 18 },
      { domain: "wallet-verify.io", count: 15 },
      { domain: "secure-bank-login.co", count: 12 },
      { domain: "microsoft-account.work", count: 9 },
      { domain: "dropbox-share.xyz", count: 7 },
    ],
    per_day,
  };
}
