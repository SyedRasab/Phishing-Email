import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { analyzeEmail } from "@/services/api/analyzer";
import { useAnalyzerStore } from "@/store/analyzerStore";
import { toast } from "sonner";
import { Loader2, Upload, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/analyzer/")({
  head: () => ({ meta: [{ title: "Analyzer — PhishGuard" }] }),
  component: AnalyzerPage,
});

function AnalyzerPage() {
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [loading, setLoading] = useState(false);
  const setResult = useAnalyzerStore((s) => s.setResult);

  async function handleAnalyze(text: string, source: "paste" | "upload") {
    if (!text.trim()) return toast.error("Please paste raw email headers + body first");
    setLoading(true);
    try {
      const subject = (text.match(/^Subject:\s*(.+)$/im)?.[1] || "").trim();
      const r = await analyzeEmail({ raw: text, subject, source });
      setResult(r.id, r);
      navigate({ to: "/analyzer/$id", params: { id: r.id } });
    } catch (e: any) {
      toast.error(e.message || "Manual scan diagnostics failed");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => handleAnalyze(String(r.result || ""), "upload");
    r.readAsText(f);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manual Threat Diagnostics</h1>
        <p className="text-sm text-slate-500">Paste raw email headers + body context, or drop a .eml file to perform multi-layered scanning.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-6">
        {/* Tab Controls */}
        <div className="mb-6 inline-flex rounded-full bg-slate-100 p-1 text-xs font-bold text-slate-600">
          {(["paste", "upload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative rounded-full px-4 py-2 capitalize transition-colors ${
                tab === t ? "text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab === t && (
                <motion.div
                  layoutId="analyzer-tab-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-indigo-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              {t === "paste" ? "Paste Headers & Body" : "Upload EML File"}
            </button>
          ))}
        </div>

        {tab === "paste" ? (
          <>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              placeholder={`From: Secure Bank <support@suspicious-domain.ru>\nTo: employee@company.com\nSubject: URGENT: Verification required\nDate: Fri, 26 Jun 2026 17:00:00 +0500\n\nClick the link to verify your credentials: http://suspicious-domain.ru/login`}
              className="h-72 w-full resize-none rounded-lg border border-slate-200 bg-white p-4 font-mono text-xs text-slate-700 outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleAnalyze(raw, "paste")}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <ShieldAlert className="h-4 w-4 text-white" />}
                {loading ? "Analyzing Lures…" : "Run Deep Analysis"}
              </button>
            </div>
          </>
        ) : (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex h-72 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 transition-all hover:border-indigo-400 hover:bg-slate-50"
          >
            <Upload className="h-8 w-8 text-slate-400" />
            <div className="mt-3 text-sm font-bold text-slate-700">Drop a .eml file here or click to browse</div>
            <div className="mt-1 text-xs text-slate-400">RFC 2822 files are parsed securely inside your session environment.</div>
            <input
              type="file"
              accept=".eml,message/rfc822,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => handleAnalyze(String(r.result || ""), "upload");
                r.readAsText(f);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
