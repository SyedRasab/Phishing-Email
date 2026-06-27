import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useEmployeesStore } from "@/store/employeesStore";
import { useAuthStore } from "@/store/authStore";
import { Search, Eye, KeyRound, CheckCircle2, Clock, Ban, Plus, X } from "lucide-react";
import { registerUser } from "@/services/api/users";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/employees/")({
  component: EmployeesList,
});

function EmployeesList() {
  const employees = useEmployeesStore((s) => s.employees);
  const fetchEmployees = useEmployeesStore((s) => s.fetchEmployees);
  const impersonate = useAuthStore((s) => s.impersonate);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("employee");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    if (!newEmail) {
      setEmailError("Email address is required.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(newEmail, newRole);
      toast.success("Employee added successfully");
      setIsAddModalOpen(false);
      setNewEmail("");
      setNewRole("employee");
      fetchEmployees();
    } catch (err: any) {
      setEmailError(err.message || "Failed to add employee. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = employees.filter(
    (e) =>
      (e.name || "").toLowerCase().includes(q.toLowerCase()) ||
      (e.email || "").toLowerCase().includes(q.toLowerCase()),
  );

  function handleImpersonate(id: string, name: string) {
    impersonate(id);
    toast.success(`Viewing dashboard as ${name}`);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Employees Directory</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage team access levels, configure Google Client ID mappings, and impersonate inboxes to investigate potential scams.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search employees by name or email..."
              className="w-72 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>
          <button
            onClick={() => {
              setEmailError("");
              setIsAddModalOpen(true);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-all shadow-btn hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      </div>

      <div className="border border-slate-200/80 bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Scans</th>
                <th className="px-5 py-3.5 text-right">Threats</th>
                <th className="px-5 py-3.5 text-right">Security Score</th>
                <th className="px-5 py-3.5">Credentials</th>
                <th className="px-5 py-3.5">Last Active</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    No employees found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const score = e.security_score !== undefined ? e.security_score : 100;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <Link to="/admin/employees/$id" params={{ id: e.id }} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                            {(e.name || e.email).slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate hover:text-indigo-600 transition-colors">
                              {e.name || e.email.split("@")[0]}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{e.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          e.role === "admin"
                            ? "bg-violet-50 text-violet-700 border border-violet-200/60"
                            : "bg-slate-50 text-slate-600 border border-slate-200/60"
                        }`}>
                          {e.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={e.status} />
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs text-slate-700">
                        {(e.scans_count || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs font-semibold text-red-600">
                        {e.threats_caught}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-mono text-xs font-bold ${
                            score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {score}%
                          </span>
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {e.credentials?.client_id ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                            <CheckCircle2 className="h-3 w-3" /> Active Sync
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/50">
                            <KeyRound className="h-3 w-3 text-slate-400" /> Demo Mode
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[11px] text-slate-500">
                        {e.last_active ? `${formatDistanceToNow(new Date(e.last_active))} ago` : "Never"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(ev) => {
                            ev.preventDefault();
                            handleImpersonate(e.id, e.name || e.email.split("@")[0]);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" /> Impersonate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900 font-display">Add New Employee</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-4 text-left">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                    emailError
                      ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10"
                      : "border-slate-200 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  }`}
                  placeholder="employee@company.com"
                />
                {emailError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{emailError}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                >
                  <option value="employee">Employee (Limited Inbox Access)</option>
                  <option value="admin">Administrator (Full Dashboard Audits)</option>
                </select>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-btn hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Adding Employee..." : "Create Employee Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "invited" | "suspended" }) {
  const map = {
    active: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", icon: CheckCircle2, label: "Active" },
    invited: { bg: "bg-amber-50 text-amber-700 border-amber-200/60", icon: Clock, label: "Invited" },
    suspended: { bg: "bg-red-50 text-red-700 border-red-200/60", icon: Ban, label: "Suspended" },
  } as const;
  const m = map[status] || map.active;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${m.bg}`}>
      <m.icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

