import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  useEffect(() => {
    // GIS token client handles the callback in-page; this route just bounces.
    const t = setTimeout(() => navigate({ to: "/dashboard" }), 600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="glass-strong flex items-center gap-3 rounded-xl px-6 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Completing sign-in…</span>
      </div>
    </div>
  );
}
