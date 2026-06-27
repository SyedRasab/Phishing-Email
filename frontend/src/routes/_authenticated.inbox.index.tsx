import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { getStats } from "@/services/api/stats";
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity, Cpu, Shield, ArrowUpRight, Zap, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inbox/")({
  component: InboxDashboard,
});

function InboxDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: stats } = useQuery({ 
    queryKey: ["stats", user?.email], 
    queryFn: () => getStats(user?.email || undefined) 
  });

  const cards = [
    { 
      label: "Analyzed Signals", 
      value: stats?.total_scans ?? 0, 
      color: "text-indigo-600", 
      bg: "bg-indigo-50", 
      border: "border-indigo-100", 
      icon: Activity 
    },
    { 
      label: "Secure Vectors", 
      value: stats?.safe_count ?? 0, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50", 
      border: "border-emerald-100", 
      icon: ShieldCheck 
    },
    { 
      label: "Active Threats", 
      value: (stats?.phishing_count ?? 0) + (stats?.suspicious_count ?? 0), 
      color: "text-red-600", 
      bg: "bg-red-50", 
      border: "border-red-100", 
      icon: ShieldAlert 
    },
  ];

  const score = stats?.security_score !== undefined ? stats.security_score : 100;
  const getLetterGrade = (s: number) => {
    if (s >= 95) return "A+";
    if (s >= 90) return "A";
    if (s >= 80) return "B";
    if (s >= 70) return "C";
    if (s >= 60) return "D";
    return "F";
  };
  const grade = getLetterGrade(score);
  
  let gradeColor = "text-emerald-700 border-emerald-200 bg-emerald-50";
  if (grade.startsWith("B")) {
    gradeColor = "text-indigo-700 border-indigo-200 bg-indigo-50";
  } else if (grade.startsWith("C") || grade.startsWith("D")) {
    gradeColor = "text-amber-700 border-amber-200 bg-amber-50";
  } else if (grade.startsWith("F")) {
    gradeColor = "text-red-700 border-red-200 bg-red-50";
  }

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 bg-[#F8FAFC]">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Threat Intelligence Sandbox</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          Mailbox validation mode operational. Select an email from the feed list to inspect forensic details.
        </p>
      </motion.div>

      {/* Stats Cards Row */}
      <div className="grid gap-6 sm:grid-cols-3">
        {cards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={`rounded-xl border ${s.border} bg-white p-5 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.05)]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
              <div className={`rounded-lg ${s.bg} p-2`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <div className={`mt-3 text-3xl font-extrabold ${s.color}`}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Security Score Overview Card */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Employee Awareness Rating</h3>
              <p className="text-xs text-slate-400">Calculated posture score based on simulation responses.</p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black ${gradeColor}`}>
              {grade}
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Security Alertness Score</span>
              <span>{score} / 100</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            
            <div className="pt-2 divide-y divide-slate-100">
              {[
                { label: "Active DNS SPF Checks", status: "Active", style: "text-emerald-600" },
                { label: "DKIM Signature Auditing", status: "Enforced", style: "text-emerald-600" },
                { label: "DMARC Policy Checks", status: "Strict Mode", style: "text-emerald-600" },
                { label: "Custom Rule Overrides", status: "Enabled", style: "text-indigo-600" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-2 font-semibold">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={item.style}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Classifier Architecture Details Card */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">AI Classification Engine</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                <div className="rounded-full bg-indigo-50 p-2 text-indigo-600 shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Transformer Language Lure Scanner</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    DistilBERT evaluates NLP patterns for urgency words, CEO impersonations, and financial account requests.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                <div className="rounded-full bg-indigo-50 p-2 text-indigo-600 shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">URL Guard Classification</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Logistic regression maps all link paths against lexical and domain attributes to catch zero-day payloads.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/analyzer"
            className="mt-6 w-full flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
          >
            Open Manual Analyzer <ArrowUpRight className="h-3.5 w-3.5 text-white" />
          </Link>
        </div>
      </div>
    </div>
  );
}
