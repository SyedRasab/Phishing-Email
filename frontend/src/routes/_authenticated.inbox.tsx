import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listInbox } from "@/services/gmail/client";
import { useAnalyzerStore } from "@/store/analyzerStore";
import { getHistory } from "@/services/api/history";
import {
  Inbox as InboxIcon,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Loader2,
  Eye,
  Mail,
  Target,
  ArrowRight,
  RefreshCw as ReconnectIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — SOC Command Center" }] }),
  component: InboxLayout,
});

function InboxLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const showList = path === "/inbox";
  const { isDemo, accessToken, user } = useAuthStore();

  return (
    <div className="grid h-[calc(100vh-70px)] grid-cols-1 md:grid-cols-[400px_1fr] relative bg-[#F8FAFC]">
      <div className={`${showList ? "block" : "hidden md:block"} border-r border-slate-200 bg-white md:block`}>
        <InboxList />
      </div>
      <div className={`${showList ? "hidden md:block" : "block"} min-w-0 relative overflow-hidden bg-[#F8FAFC]`}>
        <Outlet />
      </div>
    </div>
  );
}

function ThreatChip({ id }: { id: string }) {
  const r = useAnalyzerStore((s) => s.results[id]);
  const loading = useAnalyzerStore((s) => s.loading[id]);

  if (loading) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!r) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
        <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
      </div>
    );
  }

  if (r.is_phishing) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 border border-red-200 shadow-sm">
        <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
      </div>
    );
  }
  if (r.risk_level === "Human Review Required") {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 border border-violet-200 shadow-sm">
        <Eye className="h-3.5 w-3.5 text-violet-600" />
      </div>
    );
  }
  if (r.risk_level === "Medium Risk" || r.risk_level === "High Risk") {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 border border-amber-200 shadow-sm">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
      </div>
    );
  }

  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 shadow-sm">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
    </div>
  );
}

function InboxList() {
  const [activeTab, setActiveTab] = useState<"gmail" | "simulated">("gmail");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const selectedId = path.split("/inbox/")[1];
  const { isDemo, accessToken } = useAuthStore();

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["inbox", q],
    queryFn: () => listInbox({ q: q || undefined }),
  });

  const { data: historyList } = useQuery({
    queryKey: ["history", "inbox"],
    queryFn: () => getHistory(),
  });

  // Populate analyzerStore with existing logs from database
  useEffect(() => {
    if (historyList) {
      const results = { ...useAnalyzerStore.getState().results };
      let changed = false;
      for (const h of historyList) {
        const key = h.gmail_message_id || (h.is_simulation ? `sim_${h.id}` : h.id?.toString());
        if (key && !results[key]) {
          results[key] = {
            id: key,
            is_phishing: h.is_phishing === 1,
            phishing_probability: (h.risk_score || 0) / 100,
            risk_score: h.risk_score || 0,
            risk_level: h.risk_level || "Low Risk",
            trust_score: h.trust_score || 0,
            trust_analysis: h.trust_analysis || {},
            flags: h.flags || [],
            sender: h.sender || "",
            subject: h.subject || "",
            date: h.scanned_at || "",
            snippet: "",
            body: "",
            url_count: h.url_count || 0,
            attachment_count: h.attachment_count || 0,
            attachment_risk: h.attachment_risk || "low",
            spf: h.spf || "none",
            dmarc: h.dmarc || "none",
            url_guard_checked: h.url_guard_checked || 0,
            url_guard_flagged: h.url_guard_flagged || 0,
            url_guard_flagged_urls: h.url_guard_flagged_urls || [],
            url_guard_active: (h.url_guard_checked || 0) > 0,
            is_simulation: h.is_simulation === 1,
            simulation_status: h.simulation_status || "pending",
          } as any;
          changed = true;
        }
      }
      if (changed) {
        useAnalyzerStore.setState({ results });
      }
    }
  }, [historyList]);

  // Filter messages based on Active Tab
  const allMessages = data?.messages || [];
  const filteredMessages = allMessages.filter((m) => {
    const isSim = m.id.startsWith("sim_");
    return activeTab === "simulated" ? isSim : !isSim;
  });

  const gmailTokenInvalid = !isDemo && !accessToken;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header Panel */}
      <div className="border-b border-slate-200 p-4 bg-white sticky top-0 z-40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Threat Inbox Feed</div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Sync</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold text-slate-600 w-full">
          <button
            onClick={() => {
              setActiveTab("gmail");
              setPage(1);
            }}
            className={`flex-1 rounded-md py-2 transition-all ${
              activeTab === "gmail" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Gmail Inbox
          </button>
          <button
            onClick={() => {
              setActiveTab("simulated");
              setPage(1);
            }}
            className={`flex-1 rounded-md py-2 transition-all ${
              activeTab === "simulated" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Simulated Inbox
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search threat vectors..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Inbox List Area */}
      <div className="flex-1 overflow-y-auto pr-1 pl-1 py-2 space-y-1 select-none custom-scrollbar">
        {gmailTokenInvalid && activeTab === "gmail" ? (
          <div className="p-6 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Gmail Integration Expired</h4>
            <p className="text-xs text-slate-500">Google API credentials or session token is missing. Sync is currently in mock demo fallback mode.</p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <ReconnectIcon className="w-3.5 h-3.5" /> Reconnect Gmail
            </Link>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 border border-slate-200/50 animate-pulse" />
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <InboxIcon className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Emails Found</h4>
            <p className="text-xs text-slate-400">All evaluated threats in this view are secure.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full relative">
            <ul className="flex flex-col gap-1.5 px-2 pb-20">
              {filteredMessages.slice((page - 1) * limit, page * limit).map((m) => {
                const active = selectedId === m.id;
                const r = useAnalyzerStore.getState().results[m.id];
                const isPhishing = r?.is_phishing;

                // Status pill for simulation emails
                let simStatusBadge = null;
                if (m.id.startsWith("sim_") && r) {
                  if (r.simulation_status === "reported") {
                    simStatusBadge = (
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        +10 reported
                      </span>
                    );
                  } else if (r.simulation_status === "clicked") {
                    simStatusBadge = (
                      <span className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                        -20 clicked
                      </span>
                    );
                  } else {
                    simStatusBadge = (
                      <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                        Pending
                      </span>
                    );
                  }
                }

                return (
                  <li key={m.id}>
                    <Link
                      to="/inbox/$messageId"
                      params={{ messageId: m.id }}
                      className={`group relative flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 ${
                        active
                          ? "border-indigo-500 bg-indigo-50/50 shadow-sm"
                          : r
                          ? isPhishing
                            ? "border-red-200 bg-red-50/30 hover:bg-red-50/60"
                            : "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
                      }`}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600" />
                      )}

                      <div className="mt-0.5 shrink-0">
                        <ThreatChip id={m.id} />
                      </div>
                      
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate text-xs ${m.unread ? "font-bold text-slate-800" : "text-slate-600"}`}>
                            {m.fromName || m.fromEmail?.split("@")[0]}
                          </span>
                          <span className="shrink-0 font-mono text-[9px] text-slate-400">
                            {formatDistanceToNow(new Date(m.date), { addSuffix: false })}
                          </span>
                        </div>
                        
                        <div className={`truncate text-xs ${m.unread ? "font-bold text-slate-800" : "text-slate-600"}`}>
                          {m.subject}
                        </div>
                        
                        <div className="truncate text-[10px] text-slate-400">
                          {m.snippet}
                        </div>

                        {/* Add inline status indicators */}
                        <div className="flex items-center justify-between pt-1">
                          {simStatusBadge}
                          {r && (
                            <span className={`font-mono text-[9px] font-bold ml-auto ${isPhishing ? "text-red-600" : "text-emerald-600"}`}>
                              VERDICT: {isPhishing ? "Phish" : "Safe"} ({r.risk_score}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Pagination Panel */}
            {filteredMessages.length > limit && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-3 flex items-center justify-between z-30 shadow-sm">
                <span className="font-mono text-[10px] text-slate-400">
                  {Math.min(filteredMessages.length, (page - 1) * limit + 1)}-
                  {Math.min(filteredMessages.length, page * limit)} of {filteredMessages.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    PREV
                  </button>
                  <button
                    onClick={() => setPage(Math.min(Math.ceil(filteredMessages.length / limit), page + 1))}
                    disabled={page >= Math.ceil(filteredMessages.length / limit)}
                    className="flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    NEXT
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
