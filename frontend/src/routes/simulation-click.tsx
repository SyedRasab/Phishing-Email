import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle2, ChevronRight, AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";
import { submitSimulationAction, getUser } from "@/services/api/users";
import { getScan } from "@/services/api/analyzer";
import { toast } from "sonner";

export const Route = createFileRoute("/simulation-click")({
  component: SimulationClickPage,
});

function SimulationClickPage() {
  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "clicked" | "reported" | "error">("loading");
  const [score, setScore] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Sync scan, log click, and load score
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("scan_id");
    setScanId(id);

    if (id) {
      const scanIdNum = Number(id);
      // Step 1: Log click action first
      submitSimulationAction(scanIdNum, "click")
        .then(() => {
          setStatus("clicked");
          // Step 2: Fetch scan record to get user email
          return getScan(scanIdNum);
        })
        .then((scanData) => {
          if (scanData?.user_email) {
            setEmail(scanData.user_email);
            // Step 3: Fetch user profile to read score
            return getUser(scanData.user_email);
          }
          throw new Error("No user email found on scan record.");
        })
        .then((userData) => {
          if (userData && userData.security_score !== undefined) {
            setScore(userData.security_score);
          }
        })
        .catch((err) => {
          console.error("Simulation initialization flow failed:", err);
          setStatus("error");
        });
    } else {
      setStatus("error");
    }
  }, []);

  async function handleReport() {
    if (!scanId) return;
    setSubmittingAction(true);
    try {
      await submitSimulationAction(Number(scanId), "report");
      setStatus("reported");
      toast.success("Simulation reported successfully!");
      
      // Refetch user score to reflect the +10 restoration
      if (email) {
        const userData = await getUser(email);
        if (userData && userData.security_score !== undefined) {
          setScore(userData.security_score);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report action.");
    } finally {
      setSubmittingAction(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs fitting the Corporate Trust light styling */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl bg-white border border-slate-200 p-8 md:p-12 rounded-3xl shadow-card relative z-10 text-center space-y-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-500 shadow-sm animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-red-600">
            Security Awareness Campaign
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Caution: You interacted with a mock threat!
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">
            This link was part of a **phishing simulation drill** dispatched by your security operations team to test defense training. In a real attack, clicking this link could lead to compromised login details or ransomware infection.
          </p>
        </div>

        {/* Live score matrix panel */}
        <div className="flex flex-col items-center justify-center p-5 bg-slate-50 border border-slate-200/80 rounded-2xl w-full space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Current Security Profile Score
          </span>
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-extrabold font-mono ${
              score !== null && score >= 70 ? "text-emerald-600" : score !== null && score >= 40 ? "text-amber-600" : "text-red-600"
            }`}>
              {score !== null ? `${score}%` : "Loading..."}
            </span>
            <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  score !== null && score >= 70 ? "bg-emerald-500" : score !== null && score >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${score || 0}%` }}
              />
            </div>
          </div>
          <div className="pt-1.5 text-xs font-medium">
            {status === "loading" && (
              <span className="text-slate-400 animate-pulse">Syncing diagnostic status...</span>
            )}
            {status === "clicked" && (
              <span className="text-red-600 flex items-center justify-center gap-1">
                ⚠️ Click tracked. -20 points deducted from score.
              </span>
            )}
            {status === "reported" && (
              <span className="text-emerald-700 flex items-center justify-center gap-1">
                🛡️ Reported! +10 points restored.
              </span>
            )}
            {status === "error" && (
              <span className="text-slate-500">Demo sandbox mode. Action status logged.</span>
            )}
          </div>
        </div>

        {/* Action Panel */}
        {status === "clicked" && (
          <div className="pt-2">
            <button
              onClick={handleReport}
              disabled={submittingAction}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-btn hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submittingAction ? "Reporting threat..." : "Report Phishing Simulation (+10 PTS)"}
            </button>
          </div>
        )}

        {status === "reported" && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Report submitted successfully. Your score has been adjusted.
          </div>
        )}

        {/* Educational Checklist Cards */}
        <div className="grid gap-4 sm:grid-cols-2 text-left pt-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Verify Sender Addresses
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phishing messages mimic popular services. Check headers. Look out for lookalike domains (e.g. <code>amazon-verify.net</code> vs <code>amazon.com</code>).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Audit Destination Links
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hover over links prior to clicking. If the redirect address redirects to an unfamiliar domain or HTTP protocol, report immediately.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors"
          >
            Go to Security Command Center <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

