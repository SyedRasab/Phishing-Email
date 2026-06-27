import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getStats } from "@/services/api/stats";
import { getHistory } from "@/services/api/history";
import { resolveReview } from "@/services/api/analyzer";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Mail,
  ShieldAlert,
  Target,
  Activity,
  CheckCircle,
  Eye,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PhishGuard Admin Command Center" }] }),
  component: DashboardPage,
});

const PIE_COLORS = ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats", user?.email],
    queryFn: () => getStats(user?.email || undefined),
  });

  const { data: historyList = [], isLoading: historyLoading } = useQuery({
    queryKey: ["history", user?.email],
    queryFn: () => getHistory(),
  });

  // State to hold live scan notifications from WebSocket
  const [liveScans, setLiveScans] = useState<any[]>([]);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Sync initial live scans with the top elements of historyList
  useEffect(() => {
    if (historyList && historyList.length > 0) {
      setLiveScans(historyList.slice(0, 5));
    }
  }, [historyList]);

  // Connect WebSocket listener for live threat feed updates
  useEffect(() => {
    const wsUrl = "ws://localhost:8000/ws";
    let ws: WebSocket;

    function connect() {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "NEW_SCAN") {
            const newScan = message.data;
            // Prepend new scan to live feed list
            setLiveScans((prev) => [newScan, ...prev].slice(0, 10));
            // Trigger refetches via cache invalidation
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["history"] });
          }
        } catch (e) {
          console.error("Failed parsing WebSocket data", e);
        }
      };

      ws.onclose = () => {
        // Retry connection after 5 seconds
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, [queryClient]);

  // Handle Mark Resolved
  async function handleResolve(scanId: number) {
    setResolvingId(scanId);
    try {
      await resolveReview(scanId, "safe");
      toast.success("Threat marked as resolved (safe)");
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to resolve threat");
    } finally {
      setResolvingId(null);
    }
  }

  // Calculate Average Threat Score using real database-computed stats
  const avgThreatScore = stats?.avg_risk_score ?? (historyList.length
    ? Math.round(historyList.reduce((acc: number, curr: any) => acc + curr.risk_score, 0) / historyList.length)
    : 0);

  // Calculate Simulations count from history
  const simulationsCount = historyList.filter((h: any) => h.is_simulation).length || (isDemo ? 2 : 0);

  const statsRow = [
    {
      label: "Total Scans",
      value: stats?.total_scans ?? 0,
      icon: Mail,
      iconBg: "bg-indigo-50 text-indigo-600",
      shadow: "shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)]",
    },
    {
      label: "High Risk Emails",
      value: stats?.phishing_count ?? 0,
      icon: ShieldAlert,
      iconBg: "bg-red-50 text-red-600",
      shadow: "shadow-[0_4px_20px_-2px_rgba(239,68,68,0.10)]",
    },
    {
      label: "Simulations Triggered",
      value: simulationsCount,
      icon: Target,
      iconBg: "bg-amber-50 text-amber-600",
      shadow: "shadow-[0_4px_20px_-2px_rgba(245,158,11,0.10)]",
    },
    {
      label: "Avg Threat Score",
      value: `${avgThreatScore}/100`,
      icon: Activity,
      iconBg: "bg-violet-50 text-violet-600",
      shadow: "shadow-[0_4px_20px_-2px_rgba(124,58,237,0.10)]",
    },
  ];

  // Recharts Trends Mappings
  const chartData = stats?.trends?.map((d: any) => {
    return {
      name: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
      scans: d.total || 0,
      phishing: d.phishing || 0,
    };
  }) || [];

  const pieData = stats
    ? [
        { name: "Safe", value: stats.safe_count ?? 0 },
        { name: "Suspicious", value: stats.suspicious_count ?? 0 },
        { name: "Critical", value: stats.critical_count ?? 0 },
        { name: "Under Review", value: stats.human_review_count ?? 0 },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Command Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time mail validation diagnostics and employee awareness statistics.</p>
        </div>
        <button 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["history"] });
            toast.success("Refetched security metrics");
          }} 
          className="rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50 text-slate-500"
          aria-label="Refresh stats"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Row Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsRow.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-slate-100 bg-white p-6 transition-all hover:shadow-[0_10px_25px_-5px_rgba(79,70,229,0.15)] hover:-translate-y-0.5 duration-200 ${card.shadow}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-500 font-medium">{card.label}</span>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{card.value}</h3>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold ${card.iconBg}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Side: Recent Scans and Analytics Charts */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Recent Scans Table */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Email Diagnostics</h3>
                <p className="text-xs text-slate-500">History of analysed records from user/organisation accounts.</p>
              </div>
              <Link
                to="/analyzer"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Scan Email →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-2">Sender</th>
                    <th className="py-3 px-2">Subject</th>
                    <th className="py-3 px-2">Threat Score</th>
                    <th className="py-3 px-2">Timestamp</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                        <span className="text-xs mt-2 block">Loading audit logs...</span>
                      </td>
                    </tr>
                  ) : historyList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No email history scans located in this database.
                      </td>
                    </tr>
                  ) : (
                    historyList.slice(0, 6).map((log: any) => {
                      const score = log.risk_score;
                      let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      if (score >= 70) badgeStyle = "bg-red-50 text-red-700 border-red-200";
                      else if (score >= 40) badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";

                      return (
                        <tr key={log.id} className="text-xs text-slate-600 hover:bg-slate-50/50">
                          <td className="py-3 px-2 font-semibold truncate max-w-[150px]" title={log.sender}>
                            {log.sender?.includes("<") ? log.sender.split("<")[0].replace(/"/g, "") : log.sender}
                          </td>
                          <td className="py-3 px-2 truncate max-w-[200px]" title={log.subject}>
                            {log.subject || "(no subject)"}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold ${badgeStyle}`}>
                              {score}/100 ({log.risk_level})
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-400">
                            {new Date(log.scanned_at || log.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-2 text-right space-x-2">
                            <Link
                              to="/analyzer/$id"
                              params={{ id: String(log.id) }}
                              className="inline-flex items-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              Inspect
                            </Link>
                            {log.is_phishing && !log.resolved && (
                              <button
                                onClick={() => handleResolve(log.id)}
                                disabled={resolvingId === log.id}
                                className="inline-flex items-center text-[11px] font-bold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                              >
                                {resolvingId === log.id ? "..." : "Resolve"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recharts Analytics Block */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Line/Area Chart */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
              <h4 className="text-sm font-bold text-slate-800">Scan Activity History</h4>
              <p className="text-[11px] text-slate-400 mb-4">Total email scans compared to blocked threats (last 7 days).</p>
              
              <div className="h-60 w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No chart data compiled.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradientScans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradientPhishing" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94A3B8" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      <Area type="monotone" dataKey="scans" name="Scans" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#gradientScans)" />
                      <Area type="monotone" dataKey="phishing" name="Threats" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#gradientPhishing)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pie/Donut Chart */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
              <h4 className="text-sm font-bold text-slate-800">Threat Distribution</h4>
              <p className="text-[11px] text-slate-400 mb-4">Proportion of scan risk categories in database.</p>
              
              <div className="h-60 w-full flex items-center justify-center">
                {pieData.length === 0 ? (
                  <div className="text-xs text-slate-400">No category distributions available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Threat Feed (WebSocket sync list) */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-card h-full flex flex-col">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Live Threat Activity
              </h3>
              <p className="text-xs text-slate-500 mt-1">Real-time WebSocket alerts incoming from internal diagnostics.</p>
            </div>

            <div className="mt-6 flex-1 space-y-4 overflow-y-auto max-h-[580px] pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {liveScans.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-400 py-12 text-xs">
                    No scan notifications recorded yet.
                  </div>
                ) : (
                  liveScans.map((scan: any, i: number) => {
                    const score = scan.risk_score;
                    let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (score >= 70) badgeStyle = "bg-red-50 text-red-700 border-red-200";
                    else if (score >= 40) badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";

                    return (
                      <motion.div
                        key={scan.id || `live-${i}`}
                        initial={{ opacity: 0, x: 20, y: -10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2 hover:border-slate-200 hover:bg-slate-50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate block max-w-[150px]">
                            {scan.sender?.includes("<") ? scan.sender.split("<")[0].replace(/"/g, "") : scan.sender || "Unknown Sender"}
                          </span>
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold border shrink-0 ${badgeStyle}`}>
                            Score: {score}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {scan.subject || "(no subject)"}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/50">
                          <span>{scan.sender_domain}</span>
                          <span>
                            {new Date(scan.scanned_at || scan.date || Date.now()).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
