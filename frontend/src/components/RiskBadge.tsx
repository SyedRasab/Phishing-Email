import type { RiskLevel } from "@/types/api";
import { ShieldCheck, AlertTriangle, ShieldAlert, Flame, Eye } from "lucide-react";

const ICONS = {
  "Low Risk": ShieldCheck,
  "Medium Risk": AlertTriangle,
  "Human Review Required": Eye,
  "High Risk": ShieldAlert,
  "Critical Threat": Flame,
} as const;

export function RiskBadge({
  level,
  size = "sm",
  showIcon = true,
}: {
  level: RiskLevel;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
}) {
  const Icon = ICONS[level] || ShieldCheck;
  const padding =
    size === "xs"
      ? "px-2 py-0.5 text-[9px]"
      : size === "md"
        ? "px-3 py-1.5 text-xs"
        : "px-2.5 py-1 text-[11px]";

  // Corporate Trust color mappings
  let colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level === "Critical Threat" || level === "High Risk") {
    colorClasses = "bg-red-50 text-red-700 border-red-200";
  } else if (level === "Medium Risk") {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (level === "Human Review Required") {
    colorClasses = "bg-violet-50 text-violet-700 border-violet-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider ${colorClasses} ${padding}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {level}
    </span>
  );
}
