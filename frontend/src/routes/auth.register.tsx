import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/register")({
  head: () => ({ meta: [{ title: "Create account — PhishGuard" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const setDemoSession = useAuthStore((s) => s.setDemoSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { name?: string; email?: string; password?: string } = {};

    if (!name) {
      newErrors.name = "Full name is required";
    }

    if (!email) {
      newErrors.email = "Work email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setDemoSession({ name, email });
    toast.success("Account created successfully");
    navigate({ to: "/auth/verify-email" });
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Free, no credit card required"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/auth/login" className="font-bold text-indigo-600 hover:underline">
            Sign in
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
          <div className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</div>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Ada Lovelace"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.name ? "border-red-400 focus:ring-red-300 focus:border-red-400" : "border-slate-200"
            }`}
          />
          {errors.name && <div className="text-xs text-red-600 mt-1 font-semibold">{errors.name}</div>}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Work Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="you@company.com"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.email ? "border-red-400 focus:ring-red-300 focus:border-red-400" : "border-slate-200"
            }`}
          />
          {errors.email && <div className="text-xs text-red-600 mt-1 font-semibold">{errors.email}</div>}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Min. 8 characters"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.password ? "border-red-400 focus:ring-red-300 focus:border-red-400" : "border-slate-200"
            }`}
          />
          {errors.password && <div className="text-xs text-red-600 mt-1 font-semibold">{errors.password}</div>}
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
        >
          Create Account
        </button>
      </form>
    </AuthShell>
  );
}
