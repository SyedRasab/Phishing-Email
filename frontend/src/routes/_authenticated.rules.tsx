import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRulesStore } from "@/store/rulesStore";
import { useAuthStore } from "@/store/authStore";
import { Plus, Trash2, ShieldCheck, ShieldAlert, ListFilter, Trash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rules")({
  head: () => ({ meta: [{ title: "Sender Rules — PhishGuard Rules Command" }] }),
  component: RulesPage,
});

function RulesPage() {
  const user = useAuthStore((s) => s.user);
  const rules = useRulesStore((s) => s.rules);
  const fetchRules = useRulesStore((s) => s.fetchRules);
  const addRule = useRulesStore((s) => s.addRule);
  const removeRule = useRulesStore((s) => s.removeRule);

  useEffect(() => {
    fetchRules();
  }, []);

  const [pattern, setPattern] = useState("");
  const [kind, setKind] = useState<"whitelist" | "blacklist">("whitelist");
  const [scope, setScope] = useState<"user" | "org">("org");
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  // Live pattern classification badge check
  const ruleType = pattern.trim().includes("@") ? "Email" : "Domain";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = pattern.trim();
    if (!trimmed) return toast.error("Please enter an email address or domain pattern");
    
    setLoading(true);
    try {
      await addRule({
        pattern: trimmed.toLowerCase(),
        kind,
        scope: isAdmin ? scope : "user",
        owner_id: user.id,
      });
      setPattern("");
      toast.success(`Pattern added to ${kind}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save custom rule");
    } finally {
      setLoading(false);
    }
  }

  // Filter whitelist and blacklist lists
  const whitelists = rules.filter((r) => r.kind === "whitelist");
  const blacklists = rules.filter((r) => r.kind === "blacklist");

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Custom Detection Rules</h1>
        <p className="text-sm text-slate-500">
          Configure domain or email address overrides to override ML model classification scores.
        </p>
      </div>

      {/* Rules Builder Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <ListFilter className="w-4 h-4 text-indigo-600" /> Create Security Override Rule
        </h3>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-12 items-end">
            {/* Input Pattern */}
            <div className="md:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Domain or Email pattern</span>
                {pattern && (
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    Live Match: {ruleType} Rule
                  </span>
                )}
              </div>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g. partner-brand.com or secure@company.com"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-semibold outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Kind Selector */}
            <div className="md:col-span-3 space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rule Type</div>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold text-slate-600 w-full">
                <button
                  type="button"
                  onClick={() => setKind("whitelist")}
                  className={`flex-1 rounded-md py-2 transition-all ${
                    kind === "whitelist" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Whitelist (Safe)
                </button>
                <button
                  type="button"
                  onClick={() => setKind("blacklist")}
                  className={`flex-1 rounded-md py-2 transition-all ${
                    kind === "blacklist" ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Blacklist (Spam)
                </button>
              </div>
            </div>

            {/* Scope selector (admin only) */}
            <div className="md:col-span-3 space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scope Authority</div>
              {isAdmin ? (
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold text-slate-600 w-full">
                  <button
                    type="button"
                    onClick={() => setScope("org")}
                    className={`flex-1 rounded-md py-2 transition-all ${
                      scope === "org" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("user")}
                    className={`flex-1 rounded-md py-2 transition-all ${
                      scope === "user" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Personal
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  disabled
                  value="Personal (User-Level)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 font-bold"
                />
              )}
            </div>

            {/* Submit Button */}
            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 shrink-0" /> Add
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Whitelist Senders Column */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Whitelisted (Override Safe - Score 10)
            </h3>
            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {whitelists.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
            {whitelists.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No whitelists active.</p>
            ) : (
              whitelists.map((rule) => {
                const isEmail = rule.pattern.includes("@");
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all hover:shadow-sm"
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-800 truncate max-w-[220px]" title={rule.pattern}>
                        {rule.pattern}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase">
                          {isEmail ? "Email" : "Domain"}
                        </span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 uppercase">
                          {rule.scope}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        removeRule(rule.id);
                        toast.success("Rule removed");
                      }}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Blacklist Senders Column */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Blacklisted (Override Spam - Score 90)
            </h3>
            <span className="rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              {blacklists.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
            {blacklists.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No blacklists active.</p>
            ) : (
              blacklists.map((rule) => {
                const isEmail = rule.pattern.includes("@");
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all hover:shadow-sm"
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-800 truncate max-w-[220px]" title={rule.pattern}>
                        {rule.pattern}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase">
                          {isEmail ? "Email" : "Domain"}
                        </span>
                        <span className="rounded bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600 uppercase">
                          {rule.scope}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        removeRule(rule.id);
                        toast.success("Rule removed");
                      }}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
