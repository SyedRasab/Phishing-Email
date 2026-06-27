import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function GoogleSignInButton({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const { signIn, demoSignIn, hasClientId, ready, error } = useGoogleAuth();
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    try {
      const ok = await signIn();
      if (ok) {
        toast.success("Connected to Google Workspace");
        navigate({ to: redirectTo });
      } else if (error) {
        toast.error(error);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDemo() {
    demoSignIn();
    toast.success("Signed in as Demo Administrator");
    navigate({ to: redirectTo });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading || !ready}
        className="group relative inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <GoogleIcon />}
        <span>{hasClientId ? "Continue with Google" : "Continue with Google (Demo)"}</span>
      </button>
      
      {!hasClientId && (
        <button
          type="button"
          onClick={handleDemo}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
        >
          <ShieldCheck className="h-4 w-4" /> Continue as Demo
        </button>
      )}
      
      {!hasClientId && (
        <p className="text-center text-[10px] text-slate-400 leading-normal">
          Provide <code className="rounded bg-slate-100 px-1 py-0.5 text-indigo-600 font-bold">VITE_GOOGLE_CLIENT_ID</code> in environment variables to configure actual Google API access.
        </p>
      )}
    </div>
  );
}
