import { createFileRoute } from "@tanstack/react-router";
import { useSettingsStore, Theme } from "@/store/settingsStore";
import { Settings, Zap, Palette, KeyRound, HelpCircle, CheckCircle2, AlertTriangle, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SOC Command Center" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    googleClientId,
    googleClientSecret,
    setGoogleClientId,
    setGoogleClientSecret,
    liveFeedNotificationsEnabled,
    setLiveFeedNotificationsEnabled,
    lowPowerMode,
    setLowPowerMode,
    theme,
    setTheme,
  } = useSettingsStore();

  const [formClientId, setFormClientId] = useState(googleClientId);
  const [formClientSecret, setFormClientSecret] = useState(googleClientSecret);
  const [clientIdError, setClientIdError] = useState("");
  const [clientSecretError, setClientSecretError] = useState("");

  function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setClientIdError("");
    setClientSecretError("");
    let hasError = false;

    if (!formClientId) {
      setClientIdError("Google Client ID is required to connect Gmail integrations.");
      hasError = true;
    }
    if (!formClientSecret) {
      setClientSecretError("Client Secret is required to authenticate sessions.");
      hasError = true;
    }

    if (hasError) return;

    setGoogleClientId(formClientId);
    setGoogleClientSecret(formClientSecret);
    toast.success("OAuth client credentials saved locally!");
  }

  function handleClearCredentials() {
    setGoogleClientId("");
    setGoogleClientSecret("");
    setFormClientId("");
    setFormClientSecret("");
    toast.success("Local credentials cleared. Reverting to demo mode.");
  }

  const themes: { id: Theme; label: string; desc: string }[] = [
    { id: "light", label: "Light Mode (Corporate Trust)", desc: "Deep indigo, clean white grids" },
    { id: "earthy", label: "Dark Olive (Earthy)", desc: "Warm organic palette" },
    { id: "cyber", label: "Cyber (Dark Neon)", desc: "Monochrome tech wireframe" },
    { id: "system", label: "System Default", desc: "Syncs with host OS theme" },
  ];

  const isGmailConfigured = !!googleClientId && !!googleClientSecret;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            System Preferences
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Configure system themes, notifications, and customize Google OAuth credentials for simulated/live scans.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Credentials Section */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">Gmail API Integration</h2>
                  <p className="text-xs text-slate-500">Enable local syncing with your workspace inbox.</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isGmailConfigured
                  ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50/50 border-amber-200 text-amber-800"
              }`}>
                {isGmailConfigured ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold">Active Workspace Sync</div>
                      <p className="text-xs text-emerald-700/80 mt-0.5">
                        Client keys configured. Client-side fetch requests will pull live emails from your authorized Gmail inbox.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold">Demo Sandbox Mode</div>
                      <p className="text-xs text-amber-700/80 mt-0.5">
                        No local API keys detected. The application is running on virtualized mail lists and template mock data.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Google Client ID
                  </label>
                  <input
                    value={formClientId}
                    onChange={(e) => {
                      setFormClientId(e.target.value);
                      if (clientIdError) setClientIdError("");
                    }}
                    placeholder="123456789-xyz.apps.googleusercontent.com"
                    className={`w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none transition-colors ${
                      clientIdError
                        ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10"
                        : "border-slate-200 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                    }`}
                  />
                  {clientIdError && (
                    <p className="mt-1.5 text-xs font-medium text-red-600">{clientIdError}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Client Secret
                    </label>
                    <div className="group relative cursor-pointer">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
                      <div className="absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 scale-95 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-500 shadow-xl transition-all opacity-0 pointer-events-none group-hover:opacity-100 group-hover:scale-100 duration-150">
                        This secret is stored strictly in your browser session cookies/localStorage and is never sent to the backend database.
                      </div>
                    </div>
                  </div>
                  <input
                    type="password"
                    value={formClientSecret}
                    onChange={(e) => {
                      setFormClientSecret(e.target.value);
                      if (clientSecretError) setClientSecretError("");
                    }}
                    placeholder={googleClientSecret ? "••••••••••••••••" : "GOCSPX-xyz"}
                    className={`w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none transition-colors ${
                      clientSecretError
                        ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10"
                        : "border-slate-200 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                    }`}
                  />
                  {clientSecretError && (
                    <p className="mt-1.5 text-xs font-medium text-red-600">{clientSecretError}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  {isGmailConfigured && (
                    <button
                      type="button"
                      onClick={handleClearCredentials}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Disconnect Integration
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-btn hover:bg-indigo-700 transition-colors"
                  >
                    Save Credentials
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Preferences Section */}
          <div className="space-y-6">
            {/* System Preferences Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">System Preferences</h2>
                  <p className="text-xs text-slate-500">Configure visual themes and performance modes.</p>
                </div>
              </div>

              {/* WebSocket notifications toggle */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-indigo-600" /> WebSocket Push Alerts
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Trigger live desktop banners and dashboard notification updates automatically when threat logs register new scans.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={liveFeedNotificationsEnabled}
                    onChange={(e) => setLiveFeedNotificationsEnabled(e.target.checked)}
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {/* Low power mode toggle */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">Low Power Mode</div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Deactivates detailed background CSS filters and intensive blur orbs to save CPU and battery power.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={lowPowerMode}
                    onChange={(e) => setLowPowerMode(e.target.checked)}
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            </section>

            {/* Appearance selection */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">Color Themes</h2>
                  <p className="text-xs text-slate-500">Pick a custom workspace color template.</p>
                </div>
              </div>

              <div className="grid gap-3">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      document.documentElement.setAttribute("data-theme", t.id);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      theme === t.id
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className={`text-sm font-semibold ${theme === t.id ? "text-indigo-600" : "text-slate-900"}`}>
                        {t.label}
                      </div>
                      <div className="text-xs text-slate-500">{t.desc}</div>
                    </div>
                    {theme === t.id && (
                      <div className="h-2 w-2 rounded-full bg-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

