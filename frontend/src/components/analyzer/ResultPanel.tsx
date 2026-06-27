import { motion } from "framer-motion";
import type { AnalyzeResponse, Flag, FlagSeverity, SenderForensics } from "@/types/api";
import { RiskBadge } from "@/components/RiskBadge";
import {
  AlertTriangle,
  Link2,
  Paperclip,
  Fingerprint,
  ChevronDown,
  Download,
  ShieldCheck,
  Activity,
  Scan,
  ShieldAlert,
  Eye,
  CheckCircle,
  XCircle,
  Brain,
  Calendar,
} from "lucide-react";
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

function asFlagObjects(flags: AnalyzeResponse["flags"]): Flag[] {
  if (!flags || flags.length === 0) return [];
  if (typeof flags[0] === "string") {
    return (flags as string[]).map((s, i) => ({
      id: `flag_${i}`,
      category: "text",
      severity: "medium",
      title: s,
      reason: "Detected by backend heuristics",
    }));
  }
  return flags as Flag[];
}

function asSender(sender: AnalyzeResponse["sender"]): SenderForensics {
  if (typeof sender === "string") {
    const match = sender.match(/^\s*(?:"?([^"<]+?)"?\s*)?<?([^>]+@[^>]+)>?\s*$/);
    const displayName = match?.[1]?.trim();
    const envelopeFrom = match?.[2]?.trim() ?? sender;
    const domain = envelopeFrom.split("@")[1] || "";
    return { displayName, envelopeFrom, fromDomain: domain, displayMismatch: false };
  }
  return sender;
}

// Circular threat score gauge using SVG arc
function ThreatScoreArc({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const radius = 56;
  const c = 2 * Math.PI * radius;
  const dash = (pct / 100) * c;

  let colorHex = "#10B981"; // Emerald
  let label = "Low Risk";
  if (pct >= 70) {
    colorHex = "#EF4444"; // Red
    label = "Critical";
  } else if (pct >= 40) {
    colorHex = "#F59E0B"; // Amber
    label = "Suspicious";
  }

  return (
    <div className="relative h-44 w-44 flex flex-col items-center justify-center bg-white rounded-full border border-slate-100 shadow-sm">
      <svg viewBox="0 0 140 140" className="absolute top-0 left-0 w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="10" />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={colorHex}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-slate-800">{pct}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Threat Score</span>
        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export function ResultPanel({ result }: { result: AnalyzeResponse }) {
  const [showHeaders, setShowHeaders] = useState(false);
  const flags = asFlagObjects(result.flags);
  const sender = asSender(result.sender);
  const phishingPct = Math.round(result.phishing_probability);
  const trust = result.trust_score ?? Math.max(0, 100 - result.risk_score);

  const [flagging, setFlagging] = useState(false);
  const [isUnderReview, setIsUnderReview] = useState(!!result.under_review || result.risk_level === "Human Review Required");

  async function handleFlagForReview() {
    setFlagging(true);
    try {
      const { requestReview } = await import("@/services/api/analyzer");
      await requestReview(Number(result.id));
      toast.success("Flagged this scan for administrator review");
      setIsUnderReview(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to flag scan");
    } finally {
      setFlagging(false);
    }
  }

  // 6 Vector breakdown values
  const aiScore = phishingPct;
  const urlScore = result.url_guard_flagged > 0 ? 100 : 0;
  const spfPass = result.trust_analysis?.spf?.risk === "SAFE";
  const dkimPass = result.trust_analysis?.dkim?.dkim_pass || result.trust_analysis?.dkim?.risk === "SAFE";
  const dmarcPass = result.trust_analysis?.dmarc?.risk === "SAFE";
  const ageRisk = result.trust_analysis?.domain_age?.risk_level || "UNKNOWN";
  
  const vectors = [
    {
      name: "AI Model NLP",
      score: aiScore,
      status: aiScore >= 70 ? "fail" : aiScore >= 40 ? "warning" : "pass",
      desc: "DistilBERT text pattern check",
      icon: Brain,
    },
    {
      name: "URL Guard",
      score: urlScore,
      status: result.url_guard_flagged > 0 ? "fail" : "pass",
      desc: "TF-IDF Logistic link scans",
      icon: Link2,
    },
    {
      name: "SPF verification",
      score: spfPass ? 0 : 100,
      status: spfPass ? "pass" : result.trust_analysis?.spf?.risk === "UNKNOWN" ? "warning" : "fail",
      desc: "DNS sender mechanism alignment",
      icon: ShieldAlert,
    },
    {
      name: "DKIM signature",
      score: dkimPass ? 0 : 100,
      status: dkimPass ? "pass" : result.trust_analysis?.dkim?.risk === "UNKNOWN" ? "warning" : "fail",
      desc: "Header cryptographic verify",
      icon: Fingerprint,
    },
    {
      name: "DMARC policy",
      score: dmarcPass ? 0 : 100,
      status: dmarcPass ? "pass" : result.trust_analysis?.dmarc?.risk === "UNKNOWN" ? "warning" : "fail",
      desc: "Sender anti-spoofing policy",
      icon: CheckCircle,
    },
    {
      name: "Domain age",
      score: ageRisk === "SAFE" || ageRisk === "TRUSTED" ? 0 : ageRisk === "MEDIUM" ? 50 : 100,
      status: ageRisk === "SAFE" || ageRisk === "TRUSTED" ? "pass" : ageRisk === "MEDIUM" ? "warning" : "fail",
      desc: "WHOIS / RDAP registration check",
      icon: Calendar,
    },
  ];

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("PhishGuard Forensic Summary Report", 20, yPos);
    yPos += 15;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Subject: ${result.subject || "(no subject)"}`, 20, yPos); yPos += 7;
    doc.text(`Sender: ${sender.displayName || sender.envelopeFrom} <${sender.envelopeFrom}>`, 20, yPos); yPos += 7;
    doc.text(`Date Scanned: ${new Date(result.analyzed_at || Date.now()).toLocaleString()}`, 20, yPos); yPos += 15;

    // Scores
    doc.setFontSize(14);
    doc.text("Security Score Metrics", 20, yPos); yPos += 8;
    doc.setFontSize(11);
    doc.text(`Threat Score: ${result.risk_score}/100`, 20, yPos); yPos += 6;
    doc.text(`Risk Level: ${result.risk_level}`, 20, yPos); yPos += 6;
    doc.text(`Trust Score: ${trust}/100`, 20, yPos); yPos += 15;

    // Authentication Checks
    doc.setFontSize(14);
    doc.text("DNS Infrastructure Audits", 20, yPos); yPos += 8;
    doc.setFontSize(11);
    doc.text(`SPF: ${result.trust_analysis?.spf?.spf_mechanism || result.spf || "none"}`, 20, yPos); yPos += 6;
    doc.text(`DKIM: ${result.trust_analysis?.dkim?.dkim_pass ? "PASS" : "FAIL/MISSING"}`, 20, yPos); yPos += 6;
    doc.text(`DMARC: ${result.trust_analysis?.dmarc?.policy || result.dmarc || "none"}`, 20, yPos); yPos += 6;
    doc.text(`Domain Age: ${result.trust_analysis?.domain_age?.age_days || "Unknown"} days`, 20, yPos); yPos += 15;

    // Anomalies
    if (flags.length > 0) {
      doc.setFontSize(14);
      doc.text("Detected Anomalies & Indicators", 20, yPos); yPos += 8;
      doc.setFontSize(11);
      flags.forEach(f => {
        const text = `• [${f.severity.toUpperCase()}] ${f.title}: ${f.reason}`;
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, 20, yPos);
        yPos += lines.length * 5 + 2;
      });
    }

    doc.save(`PhishGuard_Forensic_Report_${result.id}.pdf`);
    toast.success("Forensic PDF exported successfully");
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Verdict */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-6">
        <div className="grid gap-6 md:grid-cols-12 items-center">
          
          {/* Radial score block */}
          <div className="md:col-span-4 flex justify-center">
            <ThreatScoreArc score={result.risk_score} />
          </div>

          {/* Details header block */}
          <div className="md:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RiskBadge level={result.risk_level} size="md" />
                {result.is_phishing && (
                  <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700">
                    Phishing Threat
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isUnderReview ? (
                  <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-3 py-1 text-xs font-bold">
                    <Eye className="w-3.5 h-3.5" /> Flagged for Review
                  </span>
                ) : (
                  <button
                    onClick={handleFlagForReview}
                    disabled={flagging}
                    className="bg-white border border-slate-200 text-slate-700 rounded-full px-4 py-1.5 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Flag for Review
                  </button>
                )}
                <button
                  onClick={handleDownloadReport}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" /> Export Report
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{result.subject || "(no subject)"}</h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <span>Sender:</span>
                <span className="text-slate-700 font-bold">{sender.displayName || sender.envelopeFrom}</span>
                <span className="font-mono">&lt;{sender.envelopeFrom}&gt;</span>
              </div>
            </div>

            {/* Trust Score meter */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500">Domain Reputation Trust Score</span>
                <span className="text-emerald-600">{trust}% Verified</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${trust}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Vector Breakdown Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3">6-Vector Forensic Breakdown</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vectors.map((vec, idx) => {
            const IconComponent = vec.icon;
            
            // Status Badge and Color definitions
            let statusText = "Pass";
            let statusBg = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
            let dotBg = "bg-emerald-500";
            let strokeColor = "#10B981"; // Emerald
            let iconBg = "bg-emerald-50 border-emerald-100/50";
            let iconColor = "text-emerald-600 group-hover:text-white";
            let iconHoverBg = "group-hover:bg-emerald-600 group-hover:border-emerald-600";
            
            if (vec.status === "fail") {
              statusText = "Failed";
              statusBg = "bg-red-50 text-red-700 border-red-200/50";
              dotBg = "bg-red-500";
              strokeColor = "#EF4444"; // Red
              iconBg = "bg-red-50 border-red-100/50";
              iconColor = "text-red-600 group-hover:text-white";
              iconHoverBg = "group-hover:bg-red-600 group-hover:border-red-600";
            } else if (vec.status === "warning") {
              statusText = "Warning";
              statusBg = "bg-amber-50 text-amber-700 border-amber-200/50";
              dotBg = "bg-amber-500";
              strokeColor = "#F59E0B"; // Amber
              iconBg = "bg-amber-50 border-amber-100/50";
              iconColor = "text-amber-600 group-hover:text-white";
              iconHoverBg = "group-hover:bg-amber-600 group-hover:border-amber-600";
            }

            return (
              <div 
                key={vec.name} 
                className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 p-5 backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md group animate-fade-in"
              >
                {/* Glowing background hint on hover */}
                <div className={`pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-10 blur-xl ${
                  vec.status === "fail" ? "bg-red-500" : vec.status === "warning" ? "bg-amber-500" : "bg-emerald-500"
                }`} />
                
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-300 ${iconBg} ${iconColor} ${iconHoverBg}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusBg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dotBg} ${vec.status === "fail" ? "animate-pulse" : ""}`} />
                    {statusText}
                  </span>
                </div>

                <h4 className="mt-3 font-semibold text-slate-800 text-sm tracking-tight group-hover:text-slate-900 transition-colors">
                  {vec.name}
                </h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold leading-relaxed min-h-[32px]">
                  {vec.desc}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Analysis Score</span>
                    <span className="text-sm font-extrabold text-slate-800">{vec.score}%</span>
                  </div>
                  
                  {/* Sleek SVG Radial Gauge */}
                  <div className="relative flex items-center justify-center h-10 w-10">
                    <svg className="w-10 h-10 transform -rotate-90">
                      {/* Background track */}
                      <circle cx="20" cy="20" r="16" stroke="#F1F5F9" strokeWidth="2.5" fill="transparent" />
                      {/* Progress circle */}
                      <circle 
                        cx="20" 
                        cy="20" 
                        r="16" 
                        stroke={strokeColor} 
                        strokeWidth="2.5" 
                        fill="transparent"
                        strokeDasharray="100.53"
                        strokeDashoffset={100.53 - (100.53 * (vec.score / 100))}
                        strokeLinecap="round" 
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-[8px] font-black text-slate-700">{vec.score}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flags / Anomalies */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-800">Anomaly Audit Flags ({flags.length})</h3>
        </div>
        
        {flags.length === 0 ? (
          <p className="text-xs text-slate-400">No heuristic threat flags detected in headers or body text.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {flags.map((flag) => {
              let style = "bg-amber-50 text-amber-700 border-amber-200";
              if (flag.severity === "critical" || flag.severity === "high") {
                style = "bg-red-50 text-red-700 border-red-200";
              }
              return (
                <div
                  key={flag.id}
                  className={`inline-flex flex-col rounded-xl border p-3 ${style} w-full`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{flag.title}</span>
                    <span className="text-[9px] uppercase tracking-wider bg-white/50 px-2 py-0.5 rounded-full font-bold">
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1.5 opacity-80 leading-relaxed">{flag.reason}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* URL Analysis & DNS Records */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* URL scan lists */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800">URL Threat Classification</h3>
          </div>
          
          {!result.urls || result.urls.length === 0 ? (
            <p className="text-xs text-slate-400">No links extracted from email body.</p>
          ) : (
            <div className="space-y-3">
              {result.urls.map((u, i) => {
                const isBad = u.risk === "critical" || u.risk === "high";
                return (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono text-indigo-600 break-all">{u.url}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Domain: {u.domain}</span>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      isBad ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {isBad ? "Bad" : "Good"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DNS / Infrastructure Records */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800">DNS & WHOIS Infrastructure</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">SPF Record</span>
              <span className="text-xs font-mono text-slate-800 font-semibold">{result.trust_analysis?.spf?.spf_mechanism || result.spf || "none"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">DKIM alignment</span>
              <span className="text-xs font-mono text-slate-800 font-semibold">
                {result.trust_analysis?.dkim?.dkim_pass ? "Cryptographic alignment pass" : result.dkim_status || "missing"}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">DMARC Policy</span>
              <span className="text-xs font-mono text-slate-800 font-semibold">{result.trust_analysis?.dmarc?.policy || result.dmarc || "none"}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Domain Registration Age</span>
              <span className="text-xs font-mono text-slate-800 font-semibold">{result.trust_analysis?.domain_age?.age_days || "Unknown"} days old</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Raw Headers */}
      {result.headers && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] overflow-hidden">
          <button
            onClick={() => setShowHeaders(!showHeaders)}
            className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-bold text-slate-800">Raw RFC 2822 Headers Dump</span>
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showHeaders ? "rotate-180" : ""}`} />
          </button>
          {showHeaders && (
            <div className="border-t border-slate-100 bg-slate-950 p-5">
              <pre className="overflow-x-auto font-mono text-[10px] leading-loose text-indigo-400 select-all">
                {Object.entries(result.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
