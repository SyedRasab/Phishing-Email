import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const isAuthed = useAuthStore((s) => !!s.user && (s.expiresAt ?? 0) > Date.now());

  useEffect(() => {
    if (!isAuthed) {
      navigate({ to: "/auth/login", replace: true });
    }
  }, [isAuthed, navigate]);

  if (!isAuthed) return null;
  return <AppShell />;
}
