import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — PhishGuard" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <AuthShell
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={sent ? "We've sent a link to reset your password." : "We'll email you a secure reset link."}
      footer={<Link to="/auth/login" className="hover:text-foreground">← Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-sm text-muted-foreground">If you don't see it within a few minutes, check your spam folder.</div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email) return toast.error("Enter your email");
            setSent(true);
          }}
          className="space-y-3"
        >
          <label className="block">
            <div className="mb-1.5 text-xs text-muted-foreground">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
              placeholder="you@company.com"
            />
          </label>
          <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
