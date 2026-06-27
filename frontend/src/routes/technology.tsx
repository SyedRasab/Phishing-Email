import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Brain, Link2, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/technology")({
  head: () => ({ meta: [{ title: "Our Technology — PhishGuard" }] }),
  component: TechnologyPage,
});

function TechnologyPage() {
  const models = [
    {
      title: "1. DistilBERT Semantic Engine",
      icon: Brain,
      color: "cyan",
      desc: "Traditional filters look for keywords. Our fine-tuned DistilBERT transformer model understands the actual context, urgency, and underlying intent of the email text. It reads emails like a human security analyst would, catching zero-day social engineering attacks in milliseconds.",
    },
    {
      title: "2. URL Vectorizer ML",
      icon: Link2,
      color: "violet",
      desc: "Attackers constantly spin up new domains to bypass blacklists. Instead of just checking databases, we extract all links and run their lexical structures through a secondary Machine Learning model (Logistic Regression with TF-IDF Vectorizer) trained specifically on millions of malicious URL patterns.",
    },
    {
      title: "3. Trust Heuristics Engine",
      icon: ShieldCheck,
      color: "magenta",
      desc: "We verify the sender's true identity by parsing SPF, DKIM, and DMARC records. We then cross-reference this with Domain Age lookups via RDAP/WHOIS, check for Typosquatting (e.g., 'paypaI.com'), and detect Display Name Spoofing to formulate a final overarching Trust Score.",
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
            <Link to="/why-us" className="hover:text-foreground">Why Us</Link>
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
            <Zap className="h-3.5 w-3.5 text-primary" /> The 3-Pillar Architecture
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            How we catch <span className="gradient-text">the uncatchable.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            No single model can catch every threat. PhishGuard uses a stacked architecture of three independent analytical engines that evaluate text, URLs, and metadata simultaneously.
          </p>
        </motion.div>

        <div className="mt-20 space-y-12">
          {models.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass relative overflow-hidden rounded-3xl p-8 md:p-12"
            >
              <div className={`absolute -right-10 -top-10 h-64 w-64 rounded-full bg-${m.color}/20 blur-3xl`} />
              <div className="relative">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-${m.color}/20 to-${m.color}/5 ring-1 ring-${m.color}/20`}>
                  <m.icon className={`h-6 w-6 text-${m.color}`} />
                </div>
                <h2 className="mt-6 font-display text-2xl font-semibold">{m.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{m.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24"
        >
          <h2 className="text-center font-display text-3xl font-semibold">The Analysis Process</h2>
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            <ol className="relative border-l border-white/10 ml-4 space-y-10">
              {[
                { title: "One-Click Sync", desc: "User connects their Gmail via OAuth. We fetch the raw MIME source of the email securely." },
                { title: "Parsing & Extraction", desc: "The raw headers, body text, and embedded URLs are cleanly extracted and separated." },
                { title: "Parallel Evaluation", desc: "DistilBERT scores the body text. The Vectorizer scores the URLs. The Trust Analyzer checks DNS records and headers." },
                { title: "Weighted Aggregation", desc: "The results are combined using a weighted algorithm to assign a final Threat level (Safe, Suspicious, Phishing)." },
              ].map((step, i) => (
                <li key={i} className="pl-8">
                  <span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-background ring-2 ring-white/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </span>
                  <h3 className="font-display text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
