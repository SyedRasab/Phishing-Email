import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMessage } from "@/services/gmail/client";
import { useAnalyzerStore } from "@/store/analyzerStore";
import { analyzeEmail } from "@/services/api/analyzer";
import { ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, Mail, AlertCircle, Link as LinkIcon, FileText, CheckCircle2, XCircle, ArrowUpRight, Eye, Loader2, Paperclip, ChevronRight, Scan } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/inbox/$messageId")({
  component: MessageDetail,
});

function MessageDetail() {
  const { messageId } = useParams({ from: "/_authenticated/inbox/$messageId" });
  const navigate = useNavigate();
  const { data: msg, isLoading } = useQuery({
    queryKey: ["msg", messageId],
    queryFn: () => getMessage(messageId),
  });

  const setLoading = useAnalyzerStore((s) => s.setLoading);
  const setResult = useAnalyzerStore((s) => s.setResult);
  const cached = useAnalyzerStore((s) => s.results[messageId]);
  const analyzing = useAnalyzerStore((s) => s.loading[messageId]);

  const [showImages, setShowImages] = useState(true);
  const [reportingSim, setReportingSim] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        iframe.style.height = `${doc.documentElement.scrollHeight + 40}px`;
        
        // Force all links in the email body to open in a new tab
        const anchors = doc.getElementsByTagName("a");
        for (let i = 0; i < anchors.length; i++) {
          anchors[i].setAttribute("target", "_blank");
        }
      } catch (e) {
        console.error("Iframe resizing or link formatting failed", e);
      }
    }
  };

  async function handleReportSimulation() {
    setReportingSim(true);
    try {
      const scanId = Number(messageId.replace("sim_", ""));
      const { submitSimulationAction } = await import("@/services/api/users");
      await submitSimulationAction(scanId, "report");
      toast.success("Simulation reported successfully! +10 points to score.");
      
      // Update local cache
      setResult(messageId, {
        ...cached,
        simulation_status: "reported"
      } as any);
    } catch (err: any) {
      toast.error(err.message || "Failed to report simulation");
    } finally {
      setReportingSim(false);
    }
  }

  async function handleAnalyze() {
    if (!msg) return;
    setLoading(messageId, true);
    try {
      const r = await analyzeEmail({
        id: messageId,
        raw: msg.raw,
        subject: msg.subject,
        source: "gmail",
        gmailMessageId: messageId,
      });
      setResult(messageId, r);
      toast.success(`Analysis complete: ${r.risk_level}`);
      navigate({ to: "/reports/$messageId", params: { messageId } });
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(messageId, false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 animate-[spin_3s_linear_infinite] rounded-full border-t-2 border-indigo-200" />
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
        <div className="mt-4 font-mono text-xs uppercase tracking-[0.15em] text-slate-500">Decrypting payload...</div>
      </div>
    );
  }
  if (!msg) {
    return <div className="p-10 text-center text-slate-500 font-mono">Payload not found.</div>;
  }

  const html = msg.bodyHtml
    ? DOMPurify.sanitize(showImages ? msg.bodyHtml : msg.bodyHtml.replace(/<img[^>]+>/gi, ""), { USE_PROFILES: { html: true } })
    : null;

  const riskScore = cached?.risk_score ?? (cached?.is_phishing ? 90 : 10);
  const isPhishing = cached?.is_phishing;
  const isHumanReview = cached?.risk_level === "Human Review Required";
  const isSuspicious = cached?.risk_level === "Medium Risk" || cached?.risk_level === "High Risk";

  return (
    <div className="flex h-full flex-col overflow-y-auto custom-scrollbar relative bg-[#F8FAFC] text-slate-800">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-0 top-0 h-[400px] w-full bg-gradient-to-b from-indigo-500/5 to-transparent" />

      <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10 relative z-10">
        
        {/* Forensic Header */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
        >
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="space-y-3">
              <h1 className="font-display text-2xl font-bold text-slate-900 leading-snug">{msg.subject}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200">
                  <span className="font-semibold text-slate-800">{msg.fromName || msg.fromEmail?.split("@")[0]}</span>
                  <span className="font-mono text-xs text-slate-400">&lt;{msg.fromEmail}&gt;</span>
                </div>
                <div className="font-mono text-xs uppercase tracking-[0.1em]">{new Date(msg.date).toLocaleString()}</div>
              </div>
              <div className="text-xs text-slate-400 font-mono">DESTINATION: {msg.to}</div>
            </div>

            {/* Status Indicators */}
            {cached && (
              <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm shrink-0">
                <div className="text-center">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 mb-1 font-bold">Threat Status</div>
                  <div className="flex items-center justify-center gap-1.5">
                    {isPhishing ? (
                      <><ShieldAlert className="w-4 h-4 text-red-600" /><span className="font-mono text-xs font-bold tracking-wider text-red-600">MALICIOUS</span></>
                    ) : isHumanReview ? (
                      <><Eye className="w-4 h-4 text-violet-600" /><span className="font-mono text-xs font-bold tracking-wider text-violet-600">REVIEW</span></>
                    ) : isSuspicious ? (
                      <><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="font-mono text-xs font-bold tracking-wider text-amber-600">SUSPICIOUS</span></>
                    ) : (
                      <><ShieldCheck className="w-4 h-4 text-emerald-600" /><span className="font-mono text-xs font-bold tracking-wider text-emerald-600">SECURE</span></>
                    )}
                  </div>
                </div>
                <div className="w-px h-10 border-l border-slate-200" />
                <div className="text-center">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 mb-1 font-bold">Risk Score</div>
                  <div className={`font-display text-xl font-bold ${isPhishing ? 'text-red-600' : isHumanReview ? 'text-violet-600' : isSuspicious ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {riskScore}/100
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Controls */}
        {messageId.startsWith("sim_") ? (
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-card">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-600">Simulated Phishing Drill</span>
            </div>
            
            {cached?.simulation_status === "pending" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 leading-relaxed">
                  This email is a **simulated training threat** sent by the administration. Spot the vectors and submit a report to restore security points.
                </p>
                <button
                  onClick={handleReportSimulation}
                  disabled={reportingSim}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-btn hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {reportingSim ? "Submitting Report..." : "Report Phishing Simulation (+10 PTS)"}
                </button>
              </div>
            )}

            {cached?.simulation_status === "reported" && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-800 text-sm font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Excellent catch! You successfully flagged and reported this simulated threat. +10 score points restored.</span>
              </div>
            )}

            {cached?.simulation_status === "clicked" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-800 text-sm font-semibold">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <span>Security drill failed: Link click detected. Alertness rating deducted by 20 points.</span>
                </div>
                <p className="text-xs text-slate-500">
                  You can still report this threat drill to complete the awareness module and recover 10 points.
                </p>
                <button
                  onClick={handleReportSimulation}
                  disabled={reportingSim}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  {reportingSim ? "Reporting..." : "Report Simulation Drill Now"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center gap-3"
          >
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-btn hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
              <span>{analyzing ? "Running Diagnostics…" : cached ? "Re-run Diagnostics" : "Initiate Full Analysis"}</span>
            </button>
            
            {cached && (
              <Link
                to="/reports/$messageId"
                params={{ messageId }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Access Intelligence Report <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            )}
          </motion.div>
        )}

        {/* Main Content Area */}
        <div className="space-y-6">
          
          {/* Attachment Scanner */}
          {msg.hasAttachments && (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
            >
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Paperclip className="h-4 w-4 text-slate-400" /> Message Attachments
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {msg.attachments.map((a, i) => (
                  <div key={i} className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40 p-3 hover:bg-slate-50 transition-colors">
                    <span className="truncate font-semibold text-xs text-slate-700 pl-2">{a.filename}</span>
                    <span className="text-[10px] font-mono text-slate-400">{(a.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Reading Environment Card */}
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card w-full"
          >
            {/* Top warning bar for images */}
            {!showImages && msg.bodyHtml?.includes("<img") && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 font-semibold">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>External resources and images sandboxed.</span>
                </div>
                <button 
                  onClick={() => setShowImages(true)} 
                  className="font-bold border border-amber-300 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-colors uppercase text-[10px] tracking-wider"
                >
                  Allow Render
                </button>
              </div>
            )}
            
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-10 pointer-events-none">
              <Scan className="w-12 h-12 text-slate-400" />
            </div>

            <div className="relative z-10 max-h-[800px] overflow-y-auto overflow-x-auto custom-scrollbar pr-2">
              {html ? (
                <iframe 
                  ref={iframeRef}
                  onLoad={handleIframeLoad}
                  srcDoc={html} 
                  className="w-full bg-white rounded-md border border-slate-100" 
                  sandbox="allow-same-origin allow-popups"
                  title="Email Content"
                  style={{ minHeight: "550px", height: "auto" }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700 bg-slate-50 p-4 border border-slate-100 rounded-md">
                  {msg.bodyText || msg.snippet}
                </pre>
              )}
            </div>
          </motion.div>

          {/* Message Headers (Horizontal Grid below email body) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-4"
          >
            <h2 className="font-display text-base font-bold text-slate-900">Message Headers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Message-ID</div>
                <div className="font-mono text-[10px] break-all text-slate-700 leading-normal">{msg.id}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DKIM / SPF</div>
                <div className="font-mono text-[10px] text-emerald-600 font-bold">PASS (simulated)</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Return-Path</div>
                <div className="font-mono text-[10px] break-all text-slate-700 leading-normal">{msg.fromEmail}</div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

