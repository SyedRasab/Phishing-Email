import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — PhishGuard" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password you don't reuse anywhere else."
      footer={<Link to="/auth/login" className="hover:text-foreground">← Back to sign in</Link>}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pw.length < 8) return toast.error("Use at least 8 characters");
          if (pw !== pw2) return toast.error("Passwords don't match");
          toast.success("Password updated");
          navigate({ to: "/auth/login" });
        }}
        className="space-y-3"
      >
        <label className="block">
          <div className="mb-1.5 text-xs text-muted-foreground">New password</div>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs text-muted-foreground">Confirm password</div>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
        </label>
        <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
