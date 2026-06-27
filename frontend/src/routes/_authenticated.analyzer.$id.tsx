import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useAnalyzerStore } from "@/store/analyzerStore";
import { ResultPanel } from "@/components/analyzer/ResultPanel";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analyzer/$id")({
  component: ReportFromPaste,
});

function ReportFromPaste() {
  const { id } = useParams({ from: "/_authenticated/analyzer/$id" });
  const result = useAnalyzerStore((s) => s.results[id]);

  if (!result) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Report not found.{" "}
        <Link to="/analyzer" className="text-primary hover:underline">Run a new analysis</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Link to="/analyzer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to analyzer
      </Link>
      <ResultPanel result={result} />
    </div>
  );
}
