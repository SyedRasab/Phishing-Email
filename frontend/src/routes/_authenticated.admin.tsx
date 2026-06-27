import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (role && role !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [role, navigate]);

  if (role !== "admin") return null;
  return <Outlet />;
}
