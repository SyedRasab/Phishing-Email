import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useAnalyzerStore } from "@/store/analyzerStore";
import { ResultPanel } from "@/components/analyzer/ResultPanel";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/$messageId")({
  component: ReportFromGmail,
});

function ReportFromGmail() {
  const { messageId } = useParams({ from: "/_authenticated/reports/$messageId" });
  const result = useAnalyzerStore((s) => s.results[messageId]);

  if (!result) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        No report for this message yet.{" "}
        <Link to="/inbox/$messageId" params={{ messageId }} className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
          Open and analyze it
        </Link>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
        <Link
          to="/inbox/$messageId"
          params={{ messageId }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Analysis Sandbox
        </Link>
        <ResultPanel result={result} />
      </div>
    </div>
  );
}
