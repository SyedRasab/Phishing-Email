import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/traditional-vs-modern")({
  head: () => ({ meta: [{ title: "Traditional vs AI Security" }] }),
  component: ComparisonPage,
});

function ComparisonPage() {
  const comparisons = [
    {
      category: "Threat Detection",
      traditional: "Relies on static keyword lists and regular expressions. Easily bypassed by attackers misspelling words or using synonyms.",
      modern: "DistilBERT understands the semantic meaning of the text. It catches urgency and manipulation even if the attacker uses entirely novel phrasing.",
    },
    {
      category: "Link Scanning",
      traditional: "Checks URLs against a static blacklist (e.g., Spamhaus). Zero-day phishing links that haven't been reported yet will slip right through.",
      modern: "Our URL Vectorizer evaluates the lexical structure of the link in real-time. It catches zero-day attacks by recognizing suspicious patterns, not just known bad domains.",
    },
    {
      category: "Sender Verification",
      traditional: "Relies solely on the 'From' email address displayed in the client, which is trivial to spoof.",
      modern: "The Trust Analyzer performs deep header forensics. It extracts SPF, DKIM, and DMARC results directly from the MIME source and cross-references them with domain age.",
    },
    {
      category: "Adaptability",
      traditional: "Requires manual updates by IT teams when new phishing campaigns are discovered.",
      modern: "Machine Learning models continuously adapt to new data. Custom organizational rules allow admins to immediately patch specific edge cases.",
    },
  ];

  const gmailComparison = [
    {
      title: "Zero-Day Attack Recognition",
      gmail: "Gmail relies heavily on global reputation and known blacklists. If a phishing attack uses a brand new domain, it often lands in the primary inbox.",
      phishguard: "Our AI evaluates the underlying *intent* and lexical structure. Even if the domain was registered 5 minutes ago and has no bad reputation, we catch it.",
    },
    {
      title: "Targeted Spear Phishing",
      gmail: "Struggles to detect highly personalized spear-phishing (e.g., CEO fraud) because the text looks 'normal' to standard keyword filters.",
      phishguard: "DistilBERT understands tone and psychological manipulation (urgency, fear, financial requests) to flag CEO fraud and spear-phishing instantly.",
    },
    {
      title: "Detailed Forensics & Transparency",
      gmail: "Shows a generic red banner: 'This message seems dangerous.' It doesn't tell you exactly *why* it was flagged.",
      phishguard: "Provides a granular breakdown of exactly what failed (e.g., 'SPF Failed', 'Lookalike URL: paypaI.com instead of paypal.com'), empowering security teams.",
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
            <Link to="/why-us" className="hover:text-foreground">Why Us</Link>
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
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Why traditional filters <span className="text-phishing">fail.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Legacy email security Gateways (SEGs) were built for the threats of 2010. Today's attackers use LLMs to write perfect copy and spin up zero-day domains in seconds.
          </p>
        </motion.div>

        <div className="mt-20 space-y-8">
          {comparisons.map((c, i) => (
            <motion.div
              key={c.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass overflow-hidden rounded-3xl"
            >
              <div className="border-b border-white/10 bg-white/[0.02] px-6 py-4">
                <h3 className="font-display text-xl font-semibold">{c.category}</h3>
              </div>
              <div className="grid sm:grid-cols-2">
                <div className="border-b sm:border-b-0 sm:border-r border-white/10 p-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-phishing">
                    <AlertTriangle className="h-4 w-4" /> Traditional Approach
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.traditional}</p>
                </div>
                <div className="bg-white/[0.02] p-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-safe">
                    <CheckCircle2 className="h-4 w-4" /> PhishGuard AI
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.modern}</p>
                </div>
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
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Gmail is good. <span className="text-primary">We're better.</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Why use PhishGuard when Gmail already has built-in spam filters? Because Google's filters are designed for the masses, while PhishGuard is an enterprise-grade forensic engine built to catch the 1% of highly sophisticated attacks that slip through.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {gmailComparison.map((g, i) => (
              <motion.div
                key={g.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass relative flex flex-col justify-between overflow-hidden rounded-3xl p-6"
              >
                <div>
                  <h3 className="font-display text-lg font-semibold">{g.title}</h3>
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Standard Gmail</div>
                      <p className="text-sm text-muted-foreground/80">{g.gmail}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> PhishGuard
                      </div>
                      <p className="text-sm text-foreground/90">{g.phishguard}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
