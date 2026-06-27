import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — PhishGuard" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setDemoSession = useAuthStore((s) => s.setDemoSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setDemoSession({ email, name: email.split("@")[0] });
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    }, 600);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your PhishGuard workspace"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/auth/register" className="font-bold text-indigo-600 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <GoogleSignInButton redirectTo="/dashboard" />
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
        <div className="h-px flex-1 bg-slate-100" /> or with email <div className="h-px flex-1 bg-slate-100" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <div className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.email ? "border-red-400 focus:ring-red-300 focus:border-red-400" : "border-slate-200"
              }`}
              placeholder="you@company.com"
            />
          </div>
          {errors.email && <div className="text-xs text-red-600 mt-1 font-semibold">{errors.email}</div>}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Password</span>
            <Link to="/auth/forgot-password" className="hover:text-indigo-600">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.password ? "border-red-400 focus:ring-red-300 focus:border-red-400" : "border-slate-200"
              }`}
              placeholder="••••••••"
            />
          </div>
          {errors.password && <div className="text-xs text-red-600 mt-1 font-semibold">{errors.password}</div>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
