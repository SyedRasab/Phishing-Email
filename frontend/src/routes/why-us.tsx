import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Users, ArrowRight, Clock, Lock } from "lucide-react";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/why-us")({
  head: () => ({ meta: [{ title: "Why PhishGuard?" }] }),
  component: WhyUsPage,
});

function WhyUsPage() {
  const reasons = [
    {
      title: "One-Click Gmail Integration",
      icon: Mail,
      desc: "No MX record changes, no complex gateways. Employees just sign in with Google OAuth, and our backend securely syncs and analyzes their latest emails in real-time.",
    },
    {
      title: "Absolute Privacy",
      icon: Lock,
      desc: "We use a read-only Gmail scope. Your emails are analyzed in memory and immediately discarded. Only metadata and the final threat score are saved to your history.",
    },
    {
      title: "Lightning Fast Analysis",
      icon: Clock,
      desc: "Our localized DistilBERT and Vectorizer models run inference in under 150ms. Employees don't have to wait to find out if an email is safe to open.",
    },
    {
      title: "Centralized Admin Control",
      icon: Users,
      desc: "Security teams get a unified dashboard to monitor threats across the entire organization. Manage custom whitelists, blacklists, and investigate incidents globally.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/technology" className="hover:text-foreground">Technology</Link>
            <Link to="/traditional-vs-modern" className="hover:text-foreground">Traditional vs AI</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth/login" className="group inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-cyan to-violet px-3.5 py-1.5 text-sm font-medium text-background transition-all hover:opacity-90">
              Get started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="absolute inset-0 -z-10 grid-bg opacity-30" />

      <main className="mx-auto max-w-5xl px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-safe" /> Built for modern teams
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Why choose <span className="gradient-text">PhishGuard?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            We built PhishGuard because existing solutions were either too complex to deploy or too slow to use. We combine enterprise-grade AI with consumer-grade user experience.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass rounded-3xl p-8 transition-colors hover:bg-white/[0.04]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold">{r.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
