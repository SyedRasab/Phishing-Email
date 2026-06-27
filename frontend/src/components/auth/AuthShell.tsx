import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { WireframeTopology } from "@/components/three/WireframeTopology";
import { LogoMark } from "@/components/Brand";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 text-slate-900 overflow-hidden">
      {/* 3D Wireframe Background */}
      <div className="absolute inset-0 -z-10 opacity-70 pointer-events-none">
        <WireframeTopology color="99, 102, 241" />
      </div>

      {/* Background Orbs */}
      <div className="pointer-events-none fixed top-0 left-0 -z-10 w-[400px] h-[400px] rounded-full bg-indigo-200/20 blur-[80px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 -z-10 w-[350px] h-[350px] rounded-full bg-violet-200/15 blur-[80px]" />

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent font-extrabold text-2xl tracking-tight">
              PhishGuard
            </span>
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.10)] p-8"
        >
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">{footer}</div>}
        </motion.div>
        <div className="mt-6 text-center text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-600">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
