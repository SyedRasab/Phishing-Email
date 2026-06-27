import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useEmployeesStore } from "@/store/employeesStore";
import { useLiveThreatFeed } from "@/hooks/useLiveThreatFeed";
import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/services/api/stats";
import { getHistory } from "@/services/api/history";
import { LogoMark } from "@/components/Brand";
import {
  Inbox,
  Shield,
  Settings,
  Users,
  BookOpen,
  BarChart2,
  LogOut,
  Bell,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ALL = [
  { to: "/dashboard", label: "Dashboard", icon: Shield, roles: ["admin", "employee"] },
  { to: "/inbox", label: "Inbox", icon: Inbox, roles: ["admin", "employee"] },
  { to: "/analyzer", label: "Analyzer", icon: Search, roles: ["admin", "employee"] },
  { to: "/rules", label: "Sender Rules", icon: BookOpen, roles: ["admin", "employee"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin", "employee"] },
] as const;

const NAV_ADMIN = [
  { to: "/admin", label: "Analytics Overview", icon: BarChart2 },
  { to: "/admin/employees", label: "Employees", icon: Users },
] as const;

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const signOut = useAuthStore((s) => s.signOut);
  const setRole = useAuthStore((s) => s.setRole);
  const impersonatedId = useAuthStore((s) => s.impersonatedEmployeeId);
  const impersonate = useAuthStore((s) => s.impersonate);
  const getById = useEmployeesStore((s) => s.getById);
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const theme = useSettingsStore((s) => s.theme);

  // Initialize global live threat feed listener
  useLiveThreatFeed();

  // Fetch real statistics for threat indicators
  const { data: stats } = useQuery({
    queryKey: ["stats", user?.email],
    queryFn: () => getStats(user?.email || undefined),
    enabled: !!user && !isDemo,
  });

  const { data: historyList, isLoading: loadingNotifications } = useQuery({
    queryKey: ["history", "notifications"],
    queryFn: () => getHistory(),
    enabled: !!user && !isDemo,
  });

  const demoNotifications = [
    {
      id: 1,
      gmail_message_id: "demo_1",
      subject: "Urgent: Direct Deposit Banking Update Required",
      sender: "hr-benefits@payroll-verification-portal.com",
      risk_score: 94,
      is_phishing: 1,
      scanned_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: 2,
      gmail_message_id: "demo_2",
      subject: "Security Alert: Unauthorized login attempt detected",
      sender: "security@accounts-google-verify.com",
      risk_score: 87,
      is_phishing: 1,
      scanned_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 3,
      gmail_message_id: "demo_3",
      subject: "Weekly Team Sync Notes & Action Items",
      sender: "manager@company.com",
      risk_score: 4,
      is_phishing: 0,
      scanned_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    }
  ];

  const finalHistoryList = isDemo ? demoNotifications : (historyList || []).slice(0, 5);

  const unreadThreats = stats?.phishing_count || (isDemo ? 3 : 0);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", "light");
    root.classList.remove("dark");
  }, []);

  function handleSignOut() {
    signOut();
    navigate({ to: "/" });
  }

  const impersonated = impersonatedId ? getById(impersonatedId) : null;

  return (
    <div className="relative flex min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans overflow-x-hidden">
      
      {/* Dynamic Blur Orbs (Non-Interactive) */}
      <div className="pointer-events-none fixed top-[-100px] left-[-100px] -z-10 w-[500px] h-[500px] rounded-full bg-indigo-200/30 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[-100px] right-[-100px] -z-10 w-[400px] h-[400px] rounded-full bg-violet-200/20 blur-[100px]" />

      {/* SIDEBAR (Desktop) */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white shadow-sm md:flex md:flex-col overflow-hidden transition-all duration-300 ease-in-out z-30 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo Area */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-5 py-5 h-[70px] relative border-b border-slate-100`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setIsCollapsed(true)}
                title="Collapse Sidebar"
                className="hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none"
              >
                <LogoMark className="h-7 w-7" />
              </button>
              <Link to="/dashboard" className="flex items-center">
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent font-extrabold text-xl tracking-tight">
                  PhishGuard
                </span>
              </Link>
            </div>
          ) : (
            <button 
              onClick={() => setIsCollapsed(false)}
              title="Expand Sidebar"
              className="flex h-10 w-10 items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none"
            >
              <LogoMark className="h-8 w-8" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {NAV_ALL.filter(n => !(impersonatedId && n.to === "/inbox")).map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link key={n.to} to={n.to} className="block">
                <div
                  className={`group relative flex items-center ${
                    isCollapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-4 py-3'
                  } rounded-xl text-sm font-semibold transition-all ${
                    active 
                      ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 rounded-l-none" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  title={isCollapsed ? n.label : undefined}
                >
                  <n.icon className={`h-5 w-5 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {!isCollapsed && <span>{n.label}</span>}
                </div>
              </Link>
            );
          })}

          {/* Admin Space */}
          {user?.role === "admin" && (
            <div className="pt-5">
              {!isCollapsed ? (
                <div className="mb-2.5 flex items-center gap-2 px-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Console</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              ) : (
                <div className="mb-2.5 flex items-center justify-center">
                  <div className="h-px w-8 bg-slate-100" />
                </div>
              )}
              <div className="space-y-1.5">
                {NAV_ADMIN.map((n) => {
                  const active = path === n.to || path.startsWith(n.to + "/");
                  return (
                    <Link key={n.to} to={n.to} className="block">
                      <div
                        className={`group relative flex items-center ${
                          isCollapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-4 py-3'
                        } rounded-xl text-sm font-semibold transition-all ${
                          active 
                            ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 rounded-l-none" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                        title={isCollapsed ? n.label : undefined}
                      >
                        <n.icon className={`h-5 w-5 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        {!isCollapsed && <span>{n.label}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User Card Bottom Sidebar */}
        <div className={`m-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 ${isCollapsed ? 'flex justify-center p-2' : ''}`}>
          <div className="flex items-center gap-3 w-full">
            {user?.picture ? (
              <img src={user.picture} alt="" className="h-8 w-8 shrink-0 rounded-full border border-slate-200" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-800">{user?.name || user?.email?.split('@')[0]}</div>
                <div className="truncate text-[10px] text-slate-500 font-semibold uppercase">
                  {user?.role} {isDemo && "· Demo"}
                </div>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="mt-3 flex w-full justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOPBAR */}
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden hover:bg-slate-50"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand */}
            <div className="md:hidden">
              <Link to="/dashboard" className="text-lg font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                PhishGuard
              </Link>
            </div>
            <div className="hidden sm:flex text-slate-400 text-sm font-medium">
              Secure Cybersecurity Perimeter
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Demo Role Switcher */}
            {isDemo && user && (
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                {(["admin", "employee"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-full px-3 py-1 capitalize transition-colors ${
                      user.role === r 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Notification Bell & Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications" 
                className={`relative rounded-lg p-2 border transition-colors ${
                  showNotifications 
                    ? "bg-slate-100 text-slate-800 border-slate-300" 
                    : "text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Bell className="h-4 w-4" />
                {unreadThreats > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white animate-pulse">
                    {unreadThreats}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    {/* Click outside backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)} 
                    />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 sm:w-[400px] rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
                    >
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">Threat Notifications</span>
                          {unreadThreats > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600 border border-red-100">
                              {unreadThreats} New
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Dropdown Body */}
                      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                        {loadingNotifications && !isDemo ? (
                          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                            <span className="text-xs">Loading threat history...</span>
                          </div>
                        ) : finalHistoryList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
                              <Bell className="h-5 w-5" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-700">All Scans Safe</h4>
                            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                              No high risk phishing emails have been detected in your inbox.
                            </p>
                          </div>
                        ) : (
                          finalHistoryList.map((h: any) => {
                            const key = h.gmail_message_id || (h.is_simulation ? `sim_${h.id}` : h.id?.toString());
                            const isPhishing = h.is_phishing === 1 || (h.risk_score && h.risk_score >= 50);
                            
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  setShowNotifications(false);
                                  navigate({ to: `/inbox/${key}` });
                                }}
                                className="flex w-full items-start gap-3 p-3.5 hover:bg-slate-50 text-left transition-colors group"
                              >
                                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                  isPhishing 
                                    ? "bg-red-50 border-red-100 text-red-600" 
                                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                }`}>
                                  {isPhishing ? (
                                    <AlertTriangle className="h-4.5 w-4.5" />
                                  ) : (
                                    <CheckCircle2 className="h-4.5 w-4.5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                      {h.subject || "No Subject"}
                                    </span>
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                      isPhishing 
                                        ? "bg-red-100/60 text-red-700" 
                                        : "bg-emerald-100/60 text-emerald-700"
                                    }`}>
                                      {h.risk_score || 0}%
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    From: {h.sender || "Unknown Sender"}
                                  </p>
                                  <span className="text-[9px] font-medium text-slate-400 block mt-1">
                                    {h.scanned_at ? new Date(h.scanned_at).toLocaleDateString() : "Just now"}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 text-center">
                        <Link
                          to="/inbox"
                          onClick={() => setShowNotifications(false)}
                          className="inline-block text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          View all inbox message logs &rarr;
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar / Profile */}
            <Link
              to="/settings"
              className="flex items-center gap-2 border border-slate-200 rounded-full p-1 pr-3 hover:bg-slate-50 transition-all"
            >
              {user?.picture ? (
                <img src={user.picture} alt="" className="h-7 w-7 rounded-full border border-slate-100" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-xs font-bold text-white">
                  {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-semibold text-slate-700">
                {user?.name || user?.email?.split('@')[0]}
              </span>
            </Link>

            <button
              onClick={handleSignOut}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </header>

        {/* Active Impersonation Warning Banner */}
        {impersonated && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-800 shadow-inner">
            <div className="flex items-center gap-2 font-semibold">
              <Eye className="h-4 w-4 text-amber-600 animate-pulse" />
              <span>
                Active Impersonation: Currently viewing context as employee <span className="underline">{impersonated.name}</span> ({impersonated.email})
              </span>
            </div>
            <button
              onClick={() => impersonate(null)}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 font-bold text-amber-700 shadow-sm hover:bg-amber-100 transition-colors"
            >
              <X className="h-3 w-3" /> Exit Impersonation
            </button>
          </div>
        )}

        {/* Content Area Routing */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 shadow-xl md:hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 h-[70px]">
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent font-extrabold text-xl">
                  PhishGuard
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 space-y-1.5 px-4 py-6">
                {NAV_ALL.filter(n => !(impersonatedId && n.to === "/inbox")).map((n) => {
                  const active = path === n.to || path.startsWith(n.to + "/");
                  return (
                    <Link key={n.to} to={n.to} onClick={() => setMobileMenuOpen(false)} className="block">
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          active 
                            ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 rounded-l-none" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <n.icon className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                        <span>{n.label}</span>
                      </div>
                    </Link>
                  );
                })}

                {user?.role === "admin" && (
                  <div className="pt-6">
                    <div className="mb-2 flex items-center gap-2 px-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Console</span>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="space-y-1.5">
                      {NAV_ADMIN.map((n) => {
                        const active = path === n.to || path.startsWith(n.to + "/");
                        return (
                          <Link key={n.to} to={n.to} onClick={() => setMobileMenuOpen(false)} className="block">
                            <div
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                active 
                                  ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 rounded-l-none" 
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <n.icon className="h-5 w-5 text-slate-400" />
                              <span>{n.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </nav>
              <div className="border-t border-slate-100 p-4">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
