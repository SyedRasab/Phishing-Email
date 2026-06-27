import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number; error?: string; error_description?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void; callback: unknown };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = (import.meta as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env?.VITE_GOOGLE_CLIENT_ID;
const GMAIL_SCOPE = "openid email profile https://www.googleapis.com/auth/gmail.readonly";

let scriptLoading: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
  callback: (resp: { access_token?: string; expires_in?: number; error?: string; error_description?: string }) => void;
};

export function useGoogleAuth() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<TokenClient | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const setDemoSession = useAuthStore((s) => s.setDemoSession);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setReady(true);
      return;
    }
    loadGisScript()
      .then(() => {
        tokenClientRef.current = window.google!.accounts!.oauth2!.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GMAIL_SCOPE,
          callback: () => {},
        }) as TokenClient;
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function signIn(): Promise<boolean> {
    if (!GOOGLE_CLIENT_ID) {
      setDemoSession();
      return true;
    }
    return new Promise<boolean>((resolve) => {
      if (!tokenClientRef.current) {
        setError("Google auth not ready");
        resolve(false);
        return;
      }
      tokenClientRef.current.callback = async (resp) => {
        if (resp.error || !resp.access_token) {
          setError(resp.error_description || "Sign-in failed");
          resolve(false);
          return;
        }
        try {
          const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          const profile = await profileRes.json();
          
          let role: "admin" | "employee" = profile.email.toLowerCase() === "rasab1781@gmail.com" ? "admin" : "employee";
          try {
            const { registerUser, getUser } = await import("@/services/api/users");
            await registerUser(profile.email, role);
            const dbUser = await getUser(profile.email);
            if (dbUser) {
              if (dbUser.status === "suspended") {
                setError("Your account has been suspended. Please contact the administrator.");
                resolve(false);
                return;
              }
              if (dbUser.role) {
                role = dbUser.role;
              }
            }
            if (profile.email.toLowerCase() === "rasab1781@gmail.com") {
              role = "admin";
            }
          } catch (backendErr) {
            console.error("Backend auth sync failed:", backendErr);
          }

          setSession(
            {
              id: profile.sub,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              provider: "google",
              role: role,
              org_id: "org_phishguard",
            },
            resp.access_token,
            resp.expires_in || 3600,
          );
          resolve(true);
        } catch {
          setError("Failed to load profile");
          resolve(false);
        }
      };
      tokenClientRef.current.requestAccessToken({ prompt: "consent" });
    });
  }

  function demoSignIn() {
    setDemoSession();
  }

  return { ready, error, signIn, demoSignIn, hasClientId: !!GOOGLE_CLIENT_ID };
}
