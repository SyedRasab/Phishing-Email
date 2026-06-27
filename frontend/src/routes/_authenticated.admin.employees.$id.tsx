import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/services/api/history";
import { useEmployeesStore } from "@/store/employeesStore";
import { useAuthStore } from "@/store/authStore";
import { ArrowLeft, Eye, KeyRound, ShieldCheck, ShieldAlert, Mail, Save, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/employees/$id")({
  component: EmployeeDetail,
});

function EmployeeDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/employees/$id" });
  const navigate = useNavigate();
  const employee = useEmployeesStore((s) => s.getById(id));
  const setCredentials = useEmployeesStore((s) => s.setCredentials);
  const updateEmployee = useEmployeesStore((s) => s.updateEmployee);
  const setEmployeeStatus = useEmployeesStore((s) => s.setEmployeeStatus);
  const deleteEmployee = useEmployeesStore((s) => s.deleteEmployee);
  const fetchEmployees = useEmployeesStore((s) => s.fetchEmployees);
  const impersonate = useAuthStore((s) => s.impersonate);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["history", employee?.email],
    queryFn: () => getHistory(employee?.email),
    enabled: !!employee?.email,
  });

  const [form, setForm] = useState({
    client_id: employee?.credentials?.client_id ?? "",
    client_secret: "",
    refresh_token: "",
  });

  // Sync state if employee loads later
  useEffect(() => {
    if (employee?.credentials?.client_id) {
      setForm((f) => ({ ...f, client_id: employee.credentials?.client_id ?? "" }));
    }
  }, [employee]);

  const [clientIdError, setClientIdError] = useState("");
  const [clientSecretError, setClientSecretError] = useState("");

  const [selectedTemplate, setSelectedTemplate] = useState("office");
  const [sendingSimulation, setSendingSimulation] = useState(false);

  if (!employee) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Employee profile loading or not found.{" "}
        <Link to="/admin/employees" className="text-indigo-600 font-semibold hover:underline">
          Back to employee directory
        </Link>
      </div>
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setClientIdError("");
    setClientSecretError("");

    let hasError = false;
    if (!form.client_id) {
      setClientIdError("Client ID is required.");
      hasError = true;
    }
    if (!form.client_secret && !employee?.credentials?.client_id) {
      setClientSecretError("Client Secret is required for initial configuration.");
      hasError = true;
    }

    if (hasError) return;

    setCredentials(id, form);
    toast.success("Gmail API credentials configured");
    setForm((f) => ({ ...f, client_secret: "", refresh_token: "" }));
  }

  function handleImpersonate() {
    impersonate(id);
    toast.success(`Viewing inbox as ${employee!.name || employee!.email.split("@")[0]}`);
    navigate({ to: "/inbox" });
  }

  async function handleSendSimulation() {
    setSendingSimulation(true);
    try {
      const { triggerSimulation } = await import("@/services/api/users");
      await triggerSimulation(employee!.email, selectedTemplate);
      toast.success("Simulation email injected into employee threat feed!");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger simulation");
    } finally {
      setSendingSimulation(false);
    }
  }

  async function handleDeleteEmployee() {
    const confirm = window.confirm(`Are you sure you want to permanently delete the profile for ${employee!.name || employee!.email}?`);
    if (!confirm) return;
    try {
      await deleteEmployee(employee!.email);
      toast.success("Employee deleted successfully");
      navigate({ to: "/admin/employees" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete employee");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        to="/admin/employees"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employee directory
      </Link>

      <div className="border border-slate-200/80 bg-white rounded-2xl p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white">
              {(employee.name || employee.email).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">{employee.name || employee.email.split("@")[0]}</h1>
              <div className="text-sm text-slate-500">{employee.email}</div>
              <div className="mt-1 text-xs text-slate-400">
                {employee.last_active
                  ? `Active ${formatDistanceToNow(new Date(employee.last_active))} ago`
                  : "Never signed in"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={employee.role}
              onChange={(e) => updateEmployee(id, { role: e.target.value as "admin" | "employee" })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={employee.status}
              onChange={async (e) => {
                const newStatus = e.target.value as "active" | "suspended" | "invited";
                await setEmployeeStatus(employee.email, newStatus);
                toast.success(`Account status updated to ${newStatus}`);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="invited">Invited</option>
            </select>
            <button
              onClick={handleImpersonate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-btn hover:bg-indigo-700 transition-colors"
            >
              <Eye className="h-4 w-4" /> View Inbox
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total Scanned" value={employee.scans_count.toLocaleString()} icon={Mail} color="primary" />
          <Stat label="Threats Caught" value={String(employee.threats_caught)} icon={ShieldAlert} color="phishing" />
          <Stat
            label="Safe Ratio"
            value={
              employee.scans_count > 0
                ? `${Math.round(((employee.scans_count - employee.threats_caught) / employee.scans_count) * 100)}%`
                : "—"
            }
            icon={ShieldCheck}
            color="safe"
          />
          {(() => {
            const score = employee.security_score !== undefined ? employee.security_score : 100;
            const getLetterGrade = (s: number) => {
              if (s >= 95) return "A+";
              if (s >= 90) return "A";
              if (s >= 80) return "B";
              if (s >= 70) return "C";
              if (s >= 60) return "D";
              return "F";
            };
            const grade = getLetterGrade(score);
            return (
              <Stat
                label={`Security Rating (${grade})`}
                value={`${score}%`}
                icon={ShieldCheck}
                color={score >= 80 ? "safe" : score >= 60 ? "suspicious" : "phishing"}
                showProgress={true}
                scoreValue={score}
              />
            );
          })()}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gmail credentials config */}
        <div className="border border-slate-200/80 bg-white rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">Gmail OAuth Credentials</h2>
          </div>
          <p className="text-sm text-slate-500">
            Map Google client keys to this employee's account for authentic live sync scanning. Stored securely and hashed.
          </p>

          {employee.credentials?.configured_at && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 font-semibold">
              <Lock className="h-3.5 w-3.5" /> Keys mapped {formatDistanceToNow(new Date(employee.credentials.configured_at))} ago
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Client ID *
              </label>
              <input
                value={form.client_id}
                onChange={(e) => {
                  setForm({ ...form, client_id: e.target.value });
                  if (clientIdError) setClientIdError("");
                }}
                placeholder="123456789-abc.apps.googleusercontent.com"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none transition-colors ${
                  clientIdError
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10"
                    : "border-slate-200 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                }`}
              />
              {clientIdError && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{clientIdError}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Client Secret *
              </label>
              <input
                type="password"
                value={form.client_secret}
                onChange={(e) => {
                  setForm({ ...form, client_secret: e.target.value });
                  if (clientSecretError) setClientSecretError("");
                }}
                placeholder={employee.credentials?.client_secret_masked || "••••••••••••••••"}
                className={`w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none transition-colors ${
                  clientSecretError
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10"
                    : "border-slate-200 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                }`}
              />
              {clientSecretError && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{clientSecretError}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                OAuth Refresh Token (Optional)
              </label>
              <input
                type="password"
                value={form.refresh_token}
                onChange={(e) => setForm({ ...form, refresh_token: e.target.value })}
                placeholder={employee.credentials?.refresh_token_masked || "••••••••••••••••"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-btn hover:bg-indigo-700 transition-colors"
              >
                <Save className="h-4 w-4" /> Save Credentials
              </button>
            </div>
          </form>
        </div>

        {/* Trigger simulations */}
        <div className="border border-slate-200/80 bg-white rounded-2xl p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <h2 className="font-display text-lg font-bold text-slate-900">Trigger Training Drill</h2>
            </div>
            <p className="text-sm text-slate-500">
              Queue a simulated attack mail targeting this employee. Evaluates their threat awareness. Failing drills will deduct security points, while reporting them restores metrics.
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Drill Template Selection
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              >
                <option value="bank">Chase Security Alert (Chase Impersonation)</option>
                <option value="office">Office 365 Expiration (Microsoft Impersonation)</option>
                <option value="gift">HR Amazon Gift Card Reward (Social Engineering)</option>
              </select>
            </div>
          </div>
          <div className="pt-6">
            <button
              onClick={handleSendSimulation}
              disabled={sendingSimulation}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4" />
              {sendingSimulation ? "Injecting Attack..." : "Dispatch Training Attack"}
            </button>
          </div>
        </div>
      </div>

      <div className="border border-slate-200/80 bg-white rounded-2xl p-6 shadow-card">
        <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Threat Detection Logs</h2>
        {loadingHistory ? (
          <div className="text-sm text-slate-500">Loading audit history...</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-slate-500">No scans logged for this employee.</div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
            {history.map((scan: any) => (
              <div key={scan.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">{scan.subject || "(no subject)"}</div>
                  <div className="text-xs text-slate-500 truncate">{scan.sender}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-bold uppercase tracking-wider ${
                    scan.risk_level === "safe" || scan.risk_level === "Low Risk" ? "text-emerald-600" : 
                    scan.risk_level === "suspicious" || scan.risk_level === "Medium Risk" || scan.risk_level === "High Risk" ? "text-amber-600" : "text-red-600"
                  }`}>
                    {scan.risk_level}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-medium">
                    {formatDistanceToNow(new Date(scan.scanned_at))} ago
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 space-y-4 shadow-sm">
        <h2 className="font-display text-lg font-bold text-red-600">Danger Zone</h2>
        <p className="text-sm text-slate-600">
          Permanently delete this employee's security profile, audit logs, and Gmail API keys. This dashboard action is irreversible.
        </p>
        <button
          onClick={handleDeleteEmployee}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" /> Delete Employee Profile
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  color,
  showProgress,
  scoreValue,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  showProgress?: boolean;
  scoreValue?: number;
}) {
  const colorMap: Record<string, string> = {
    primary: "text-indigo-600 border-indigo-100 bg-indigo-50/50",
    phishing: "text-red-600 border-red-100 bg-red-50/50",
    safe: "text-emerald-600 border-emerald-100 bg-emerald-50/50",
    suspicious: "text-amber-600 border-amber-100 bg-amber-50/50",
  };

  const c = colorMap[color] || colorMap.primary;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`p-1.5 rounded-lg border ${c}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-2xl font-bold text-slate-900">{value}</div>
      </div>
      {showProgress && scoreValue !== undefined && (
        <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              scoreValue >= 70 ? "bg-emerald-500" : scoreValue >= 40 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${scoreValue}%` }}
          />
        </div>
      )}
    </div>
  );
}

