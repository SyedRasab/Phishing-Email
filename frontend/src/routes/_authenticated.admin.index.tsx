import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { getPendingReviews, resolveReview } from "@/services/api/analyzer";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  Legend,
  CartesianGrid,
} from "recharts";
import { getStats } from "@/services/api/stats";
import { useEmployeesStore } from "@/store/employeesStore";
import { ShieldAlert, ShieldCheck, Users, Mail, AlertTriangle, ArrowRight, Eye, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Console — PhishGuard" }] }),
  component: AdminDashboard,
});

const COLORS = {
  safe: "#10B981", // emerald-500
  suspicious: "#F59E0B", // amber-500
  phishing: "#EF4444", // red-500
  primary: "#4F46E5", // indigo-600
  human_review: "#8B5CF6", // violet-500
};

function AdminDashboard() {
  const { data: stats, refetch, isLoading: statsLoading } = useQuery({ queryKey: ["stats"], queryFn: () => getStats() });
  const employees = useEmployeesStore((s) => s.employees);

  const overviewStats = [
    { label: "Total Scans", value: stats?.total_scans ?? 0, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", icon: Mail },
    { label: "Safe Emails", value: stats?.safe_count ?? 0, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", icon: ShieldCheck },
    { label: "Suspicious", value: stats?.suspicious_count ?? 0, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", icon: AlertTriangle },
    { label: "Human Review", value: stats?.human_review_count ?? 0, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", icon: Eye },
    { label: "Threats Blocked", value: stats?.phishing_count ?? 0, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", icon: ShieldAlert },
  ];

  const chartData = stats?.per_day?.map((d: any) => {
    return {
      date: d.date,
      total: d.total || 0,
      phishing: d.phishing || 0,
      review: d.human_review || 0,
    };
  }) ?? [];

  const distribution = stats
    ? [
        { name: "Safe", value: stats.safe_count, color: COLORS.safe },
        { name: "Suspicious", value: stats.suspicious_count, color: COLORS.suspicious },
        { name: "Review", value: stats.human_review_count || 0, color: COLORS.human_review },
        { name: "Phishing", value: stats.phishing_count, color: COLORS.phishing },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Admin Console</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time mail validation diagnostics, user awareness testing metrics, and security dispatch queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              refetch();
              toast.success("Refetched security diagnostics");
            }}
            disabled={statsLoading}
            className="rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50 text-slate-500 transition-colors"
            aria-label="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/admin/employees"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-btn hover:bg-indigo-700 transition-colors"
          >
            <Users className="h-4 w-4" /> Manage Employees
          </Link>
        </div>
      </div>

      {/* Grid Cards Section */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {overviewStats.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-card flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</div>
              <div className={`p-1.5 rounded-lg border ${k.bg} ${k.border} ${k.color}`}>
                <k.icon className="h-4 w-4" />
              </div>
            </div>
            <div className={`mt-4 font-display text-3xl font-bold ${k.color}`}>{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Graphs Row */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card">
          <h2 className="font-display text-base font-bold text-slate-900">Scan Activity History</h2>
          <p className="text-xs text-slate-400">Trend of analyzed emails compared to threats blocked (last 7 days).</p>
          <div className="mt-4 h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No telemetry logged.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.human_review} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={COLORS.human_review} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPhishing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.phishing} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLORS.phishing} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 10, fill: "#64748B" }} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="total" name="Total Scans" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="review" name="Under Review" stroke={COLORS.human_review} strokeWidth={2} fillOpacity={1} fill="url(#colorReview)" />
                  <Area type="monotone" dataKey="phishing" name="Phishing Alerts" stroke={COLORS.phishing} strokeWidth={2} fillOpacity={1} fill="url(#colorPhishing)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card">
          <h2 className="font-display text-base font-bold text-slate-900">Verdict Distribution</h2>
          <p className="text-xs text-slate-400">Proportion of scan risk categories in active database.</p>
          <div className="mt-4 h-72 flex items-center justify-center">
            {distribution.length === 0 ? (
              <div className="text-xs text-slate-400">No distribution records found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {distribution.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 5 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Top attacked domains */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card">
          <h2 className="font-display text-base font-bold text-slate-900">Impersonation Target Brands</h2>
          <p className="text-xs text-slate-400">Most-impersonated brand domains caught across the network.</p>
          <div className="mt-4 h-72 w-full">
            {!stats?.top_attacked_domains || stats.top_attacked_domains.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No impersonation attacks logged.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top_attacked_domains} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#94A3B8" tick={{ fontSize: 10, fill: "#64748B" }} />
                  <YAxis dataKey="domain" type="category" stroke="#94A3B8" tick={{ fontSize: 10, fill: "#64748B" }} width={160} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" name="Caught Attacks" fill={COLORS.phishing} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top defenders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">Security Champions</h2>
                <p className="text-xs text-slate-400">Employees reporting the most phishing simulations.</p>
              </div>
              <Link to="/admin/employees" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                View All
              </Link>
            </div>
            <div className="mt-4 space-y-2.5">
              {[...employees]
                .filter((e) => e.status === "active")
                .sort((a, b) => b.threats_caught - a.threats_caught)
                .slice(0, 5)
                .map((e) => (
                  <Link
                    key={e.id}
                    to="/admin/employees/$id"
                    params={{ id: e.id }}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 transition-all hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                      {(e.name || e.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{e.name || e.email.split("@")[0]}</div>
                      <div className="text-[11px] text-slate-400 truncate">{e.email}</div>
                    </div>
                    <div className="text-right pr-1">
                      <div className="font-display text-sm font-bold text-indigo-600">{e.threats_caught}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">caught</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Reviews Queue */}
      <ReviewQueueSection />
    </div>
  );
}

function ReviewQueueSection() {
  const { data: reviews = [], refetch, isLoading } = useQuery({
    queryKey: ["pending-reviews"],
    queryFn: () => getPendingReviews()
  });

  const [resolvingId, setResolvingId] = useState<number | null>(null);

  async function handleResolve(id: number, verdict: "safe" | "phishing") {
    setResolvingId(id);
    try {
      await resolveReview(id, verdict);
      toast.success(`Scan successfully resolved as ${verdict}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve scan");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">Collaborative Review Queue</h2>
          <p className="text-xs text-slate-400">Validation audits requested by team members or flagged for verification.</p>
        </div>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200/60 text-xs font-mono font-bold text-indigo-600">
          {reviews.length}
        </span>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500">Loading audit queue...</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-sm text-slate-500 font-medium">All clear! No pending verification reviews currently.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-2 space-y-2">
          {reviews.map((r: any) => (
            <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 truncate">{r.subject || "(no subject)"}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  Sender: <span className="font-semibold text-slate-600">{r.sender}</span> | Reporter: <span className="font-semibold text-slate-600">{r.user_email}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="inline-flex rounded bg-slate-50 border border-slate-200/60 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-600">
                    URLs: {r.url_count} | Attachments: {r.attachment_count}
                  </span>
                  <span className={`inline-flex rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border ${
                    r.is_phishing 
                      ? 'bg-red-50 border-red-200/60 text-red-700' 
                      : 'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                  }`}>
                    AI Verdict: {r.is_phishing ? 'Phishing' : 'Safe'} (Risk Score: {r.risk_score})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResolve(r.id, "safe")}
                  disabled={resolvingId === r.id}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Approve Safe
                </button>
                <button
                  onClick={() => handleResolve(r.id, "phishing")}
                  disabled={resolvingId === r.id}
                  className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Block Phishing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

