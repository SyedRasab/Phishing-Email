import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth/verify-email")({
  head: () => ({ meta: [{ title: "Verify email — PhishGuard" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  return (
    <AuthShell title="Verify your email" subtitle="We've sent a confirmation link to your inbox.">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 ring-1 ring-white/10">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Click the link in the email to activate your account. You can close this tab.</p>
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Continue to workspace
        </button>
        <Link to="/auth/login" className="mt-4 text-xs text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
