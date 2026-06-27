import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — PhishGuard Admin" }] }),
  component: () => <Outlet />,
});
