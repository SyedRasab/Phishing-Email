import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/Brand";
import {
  ShieldAlert,
  Brain,
  Link2,
  Mail,
  Fingerprint,
  ArrowRight,
  Github,
  Twitter,
  Linkedin,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  BookOpen,
  Users,
  Database,
  RefreshCw,
  Server,
  FileText,
  Percent,
  Calendar,
  Zap,
  Play,
} from "lucide-react";
import { useEffect, useState } from "react";

const PIPELINE_STEPS = [
  { 
    step: 1, 
    name: "RFC 2822 Parser", 
    icon: FileText, 
    desc: "Loads the raw email structure, isolating the subject, sender headers (From, Return-Path), plain/HTML body, and attachments using Python's native email package.",
    color: "from-indigo-500 to-indigo-600"
  },
  { 
    step: 2, 
    name: "Heuristic Flags", 
    icon: Search, 
    desc: "Analyzes urgency keywords, matches attachment extension risks (.exe, .zip), and counts formatting anomalies in the body.",
    color: "from-blue-500 to-blue-600"
  },
  { 
    step: 3, 
    name: "DistilBERT Semantic", 
    icon: Brain, 
    desc: "Tokenizes body text (up to 512 tokens) and runs sequence classification on CPU using a fine-tuned Hugging Face transformer model, calculating semantic phishing probability with 98% accuracy.",
    color: "from-purple-500 to-purple-600"
  },
  { 
    step: 4, 
    name: "URL Guard Scanner", 
    icon: Link2, 
    desc: "Extracts all embedded links and passes them through a Scikit-Learn TF-IDF vectorizer and Logistic Regression classifier to isolate malicious phishing domains.",
    color: "from-violet-500 to-violet-600"
  },
  { 
    step: 5, 
    name: "Infrastructure Audit", 
    icon: Fingerprint, 
    desc: "Performs DNS queries to verify SPF records, DKIM key presence, and DMARC alignment, and queries rdap.org for domain registration age metrics.",
    color: "from-pink-500 to-pink-600"
  },
  { 
    step: 6, 
    name: "Scoring Engine", 
    icon: Percent, 
    desc: "Aggregates the 6 core components (AI, Link, SPF, DKIM, DMARC, Domain Age) into a straight average (0-100) and cross-references whitelist/blacklist rules for immediate override.",
    color: "from-rose-500 to-rose-600"
  },
  { 
    step: 7, 
    name: "SQLite Logging", 
    icon: Database, 
    desc: "Persists raw headers, individual risk scores, flagged keywords, trust parameters, and final evaluation metadata inside phishing.db using SQLAlchemy ORM.",
    color: "from-emerald-500 to-emerald-600"
  },
  { 
    step: 8, 
    name: "WebSocket Alert", 
    icon: RefreshCw, 
    desc: "Broadcasting a live NEW_SCAN payload to all active WebSockets on /ws to instantly push the alert notification to active administrator dashboards.",
    color: "from-amber-500 to-amber-600"
  },
];


const SCORING_VECTORS = [
  { 
    name: "AI NLP Text Model", 
    weight: 16.7, 
    desc: "Contextual classification of urgency lures",
    icon: Brain,
    iconBg: "bg-indigo-50 border-indigo-100/50",
    iconColor: "text-indigo-600 group-hover:text-white",
    iconHoverBg: "group-hover:bg-indigo-600 group-hover:border-indigo-600",
  },
  { 
    name: "URL Guard Classifier", 
    weight: 16.7, 
    desc: "TF-IDF Logistic Regression URL scans",
    icon: Link2,
    iconBg: "bg-violet-50 border-violet-100/50",
    iconColor: "text-violet-600 group-hover:text-white",
    iconHoverBg: "group-hover:bg-violet-600 group-hover:border-violet-600",
  },
  { 
    name: "SPF Mechanism Audit", 
    weight: 16.7, 
    desc: "DNS record sender verification",
    icon: ShieldAlert,
    iconBg: "bg-blue-50 border-blue-100/50",
    iconColor: "text-blue-600 group-hover:text-white",
    iconHoverBg: "group-hover:bg-blue-600 group-hover:border-blue-600",
  },
  { 
    name: "DKIM Signature Match", 
    weight: 16.7, 
    desc: "Header alignment and crypto signature check",
    icon: Fingerprint,
    iconBg: "bg-purple-50 border-purple-100/50",
    iconColor: "text-purple-600 group-hover:text-white",
    iconHoverBg: "group-hover:bg-purple-600 group-hover:border-purple-600",
  },
  { 
    name: "DMARC Policy Enforcement", 
    weight: 16.7, 
    desc: "Reject/Quarantine policy compliance",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 border-emerald-100/50",
    iconColor: "text-emerald-600 group-hover:text-white",
    iconHoverBg: "group-hover:bg-emerald-600 group-hover:border-emerald-600",
  },
  { 
    name: "Domain Registration Age", 
    weight: 16.7, 
    desc: "RDAP check for newly registered domains",
    icon: Calendar,
    iconBg: "bg-amber-50 border-amber-100/50",
    iconColor: "text-amber-600 group-hover:text-white",
    iconHoverBg: "group-hover:bg-amber-600 group-hover:border-amber-600",
  },
];

function PlexusBackground() {
  useEffect(() => {
    const canvas = document.getElementById("plexus-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: 0, y: 0 };
    const targetMouse = { x: 0, y: 0 };
    let rawMouseX = -1000;
    let rawMouseY = -1000;
    let pulseTime = 0;

    class Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      offsetX: number;
      offsetY: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 1.6 + 0.4; // depth layer: 0.4 to 2.0
        this.vx = (Math.random() * 0.15 - 0.075) * this.z; // gentle drift
        this.vy = (Math.random() * 0.15 - 0.075) * this.z;
        this.radius = (Math.random() * 4 + 2.0) * this.z; // elegant stylish bubbles
        const isIndigo = Math.random() > 0.4;
        this.color = isIndigo ? "99, 102, 241" : "139, 92, 246";
        this.offsetX = 0;
        this.offsetY = 0;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around boundary screen smoothly
        if (this.x < -100) this.x = width + 100;
        if (this.x > width + 100) this.x = -100;
        if (this.y < -100) this.y = height + 100;
        if (this.y > height + 100) this.y = -100;

        // Parallax shift calculation
        const parallaxX = mouse.x * this.z * 35;
        const parallaxY = mouse.y * this.z * 35;
        const currentActualX = this.x + parallaxX;
        const currentActualY = this.y + parallaxY;

        // Mouse interaction (repulsion)
        if (rawMouseX > -500 && rawMouseY > -500) {
          const dx = currentActualX - rawMouseX;
          const dy = currentActualY - rawMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const repulsionRadius = 180;

          if (dist < repulsionRadius) {
            const force = (repulsionRadius - dist) / repulsionRadius;
            // push particles away
            const angle = Math.atan2(dy, dx);
            const targetOffsetX = Math.cos(angle) * force * 35 * this.z;
            const targetOffsetY = Math.sin(angle) * force * 35 * this.z;

            // Ease towards the repulsion offset
            this.offsetX += (targetOffsetX - this.offsetX) * 0.1;
            this.offsetY += (targetOffsetY - this.offsetY) * 0.1;
          } else {
            // Spring back to 0 offset
            this.offsetX += (0 - this.offsetX) * 0.05;
            this.offsetY += (0 - this.offsetY) * 0.05;
          }
        } else {
          // Spring back to 0 offset if mouse leaves window
          this.offsetX += (0 - this.offsetX) * 0.05;
          this.offsetY += (0 - this.offsetY) * 0.05;
        }
      }

      draw() {
        if (!ctx) return;

        const parallaxX = mouse.x * this.z * 35;
        const parallaxY = mouse.y * this.z * 35;
        const drawX = this.x + parallaxX + this.offsetX;
        const drawY = this.y + parallaxY + this.offsetY;

        // Subtle pulsing factor for standard particles
        const pulse = Math.sin(pulseTime * 0.02 + this.z * 10) * 0.15 + 1.0;
        const currentRadius = this.radius * pulse;

        ctx.beginPath();
        ctx.arc(drawX, drawY, currentRadius, 0, Math.PI * 2);
        const alpha = ((this.z - 0.4) / 1.6) * 0.15 + 0.06;
        ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
        ctx.fill();

        // Soft outer glow ring
        if (this.z > 0.8) {
          ctx.beginPath();
          ctx.arc(drawX, drawY, currentRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${this.color}, ${alpha * 0.25})`;
          ctx.fill();
        }
      }
    }

    const particles: Particle[] = [];
    const particleCount = Math.min(80, Math.floor((width * height) / 24000));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      rawMouseX = e.clientX;
      rawMouseY = e.clientY;
      // Normalized coordinates from -1 to 1
      targetMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const handleMouseLeave = () => {
      rawMouseX = -1000;
      rawMouseY = -1000;
      targetMouse.x = 0;
      targetMouse.y = 0;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth lerp for mouse coordinates to enable buttery movement
      mouse.x += (targetMouse.x - mouse.x) * 0.06;
      mouse.y += (targetMouse.y - mouse.y) * 0.06;
      pulseTime += 1;

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      id="plexus-canvas"
      className="pointer-events-none fixed inset-0 z-0 opacity-80"
    />
  );
}

export function Landing() {
  const [scannedToday, setScannedToday] = useState(0);

  // --- Interactive Scanner States ---
  const MOCK_TEMPLATES = [
    {
      label: "Netflix Fraud",
      subject: "Action Required: Update your Netflix payment method",
      body: "URGENT: We were unable to process your monthly subscription payment. To avoid service disruption, click here immediately to verify your billing details: http://netflix-secure-billing-login.com/update",
      score: 94,
      verdict: "High risk url detected pointing to a domain registered 2 days ago. DistilBERT flagged psychological urgency lure.",
      flags: ["Suspect Link", "Urgency Hook", "New Domain"],
      trust: 12,
    },
    {
      label: "CEO Impersonation",
      subject: "Quick Task (Confidential)",
      body: "Are you at your desk? I am currently in a meeting and need you to urgently buy 5 Google Play gift cards of $100 each for a client presentation. Email me the codes as soon as possible. Thanks, CEO.",
      score: 87,
      verdict: "DistilBERT model flagged severe social engineering urgency keywords. Sender name lookalike anomaly detected (Display Name Spoofing).",
      flags: ["Display Spoof", "Urgency Keyword", "Financial Request"],
      trust: 40,
    },
    {
      label: "Meeting Invite",
      subject: "Sync Meeting: Project Roadmaps",
      body: "Hi team, let's schedule a 30-minute sync tomorrow at 10 AM to review the upcoming release roadmap. We will use the standard video link. Best, Team Lead.",
      score: 8,
      verdict: "Email parsed safe. DNS records (SPF, DKIM, DMARC) show fully aligned authentic signatures. No threat indicators found.",
      flags: ["SPF Pass", "DKIM Valid", "DMARC Align"],
      trust: 98,
    }
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<"idle" | "parsing" | "analyzing" | "dns" | "done">("idle");
  const [scanScore, setScanScore] = useState(0);

  // --- Pricing Toggle State ---
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleStartScan = () => {
    setScanning(true);
    setScanScore(0);
    setScanStep("parsing");
    
    // Animate scanning steps
    setTimeout(() => {
      setScanStep("analyzing");
      setTimeout(() => {
        setScanStep("dns");
        setTimeout(() => {
          setScanStep("done");
          setScanning(false);
          // Animate score count-up
          let currentScore = 0;
          const target = MOCK_TEMPLATES[selectedTemplate].score;
          const interval = setInterval(() => {
            if (currentScore >= target) {
              setScanScore(target);
              clearInterval(interval);
            } else {
              currentScore += Math.min(5, target - currentScore);
              setScanScore(currentScore);
            }
          }, 20);
        }, 800);
      }, 800);
    }, 600);
  };

  useEffect(() => {
    // Mock incrementing scans counter
    setScannedToday(1420);
    const interval = setInterval(() => {
      setScannedToday(prev => prev + Math.floor(Math.random() * 2) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <PlexusBackground />
      
      {/* Background Blur Orbs */}
      <div className="pointer-events-none absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-indigo-200/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-[400px] right-0 w-[400px] h-[400px] rounded-full bg-violet-200/15 blur-[100px]" />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent font-extrabold text-xl tracking-tight">
              PhishGuard
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#scoring" className="hover:text-indigo-600 transition-colors">Scoring Weights</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 px-3 py-2">
              Sign In
            </Link>
            <Link
              to="/auth/login"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
            >
              Analyze Email
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          
          {/* Left Column Content */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/50 px-3.5 py-1 text-xs font-bold text-indigo-700">
              🛡️ AI-Powered Email Security
            </div>
            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
              Detect Phishing <br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Before It Strikes
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-500 leading-relaxed">
              Multi-layer detection combining DistilBERT NLP, URL threat classification, and real-time DNS verification (SPF, DKIM, DMARC) to protect your organization.
            </p>
            
            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/analyzer"
                className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
              >
                Analyze an Email
              </Link>
              <Link
                to="/dashboard"
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                Admin Dashboard
              </Link>
            </div>

            {/* Real Stats Trust Row */}
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-200/60 pt-8">
              <div>
                <div className="text-2xl font-extrabold text-indigo-600">6</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Threat Vectors</div>
                <div className="text-[11px] text-slate-500 mt-0.5">AI, Link ML, DNS & Age</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-indigo-600">2</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">ML Models</div>
                <div className="text-[11px] text-slate-500 mt-0.5">DistilBERT + URL Classifier</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-indigo-600">Real-time</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">DNS Audit</div>
                <div className="text-[11px] text-slate-500 mt-0.5">SPF/DKIM/DMARC lookup</div>
              </div>
            </div>
          </div>

          {/* Right Column Interactive Scan Simulator */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
            >
              {/* Top border decoration */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-600 animate-pulse" />
                    Interactive Threat Sandbox
                  </h3>
                  <p className="text-[10px] text-slate-400">Select a template below and trigger the scan</p>
                </div>
              </div>

              {/* Template Selector Tabs */}
              <div className="mt-4 flex gap-2">
                {MOCK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!scanning) {
                        setSelectedTemplate(idx);
                        setScanStep("idle");
                        setScanScore(0);
                      }
                    }}
                    disabled={scanning}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all border ${
                      selectedTemplate === idx
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-black shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Email Content Box */}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 relative min-h-[140px] flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Email Subject</span>
                  <div className="text-xs font-bold text-slate-700 mt-0.5 border-b border-slate-100 pb-1.5">
                    {MOCK_TEMPLATES[selectedTemplate].subject}
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-2.5 block">Email Body Preview</span>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-3 font-sans">
                    {MOCK_TEMPLATES[selectedTemplate].body}
                  </div>
                </div>

                {/* Scan Button or Progress Loader */}
                <div className="mt-4">
                  {scanStep === "idle" && (
                    <button
                      onClick={handleStartScan}
                      className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Run AI Scan Pipeline
                    </button>
                  )}

                  {scanning && (
                    <div className="flex flex-col items-center justify-center py-2 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-[11px] uppercase tracking-wider">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {scanStep === "parsing" && "📂 Step 1: Parsing RFC 2822..."}
                        {scanStep === "analyzing" && "🧠 Step 2: Evaluating DistilBERT NLP..."}
                        {scanStep === "dns" && "🔒 Step 3: Verifying DNS SPF/DKIM..."}
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                          style={{
                            width: 
                              scanStep === "parsing" ? "25%" : 
                              scanStep === "analyzing" ? "60%" : 
                              scanStep === "dns" ? "85%" : "0%"
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scan Results Panel */}
              {scanStep === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 border-t border-slate-100 pt-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Forensic Verdict</span>
                      <span className={`text-xs font-black mt-0.5 ${
                        MOCK_TEMPLATES[selectedTemplate].score >= 70 ? "text-red-600" : "text-emerald-600"
                      }`}>
                        {MOCK_TEMPLATES[selectedTemplate].score >= 70 ? "🚨 Threat Detected" : "🟢 Fully Verified Safe"}
                      </span>
                    </div>
                    {/* Score badge */}
                    <div className={`rounded-full border px-3 py-1 text-xs font-black tracking-wide ${
                      MOCK_TEMPLATES[selectedTemplate].score >= 70
                        ? "bg-red-50 border-red-200 text-red-700 animate-pulse"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}>
                      Threat Score: {scanScore}/100
                    </div>
                  </div>

                  {/* Flags */}
                  <div className="flex flex-wrap gap-1.5">
                    {MOCK_TEMPLATES[selectedTemplate].flags.map((flg, idx) => (
                      <span 
                        key={idx} 
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                          MOCK_TEMPLATES[selectedTemplate].score >= 70
                            ? "bg-red-50 border border-red-200/50 text-red-700"
                            : "bg-emerald-50 border border-emerald-200/50 text-emerald-700"
                        }`}
                      >
                        {flg}
                      </span>
                    ))}
                  </div>

                  {/* Trust bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-extrabold">
                      <span className="text-slate-500">Infrastructure Trust Rating</span>
                      <span className="text-indigo-600">{MOCK_TEMPLATES[selectedTemplate].trust}% Secure</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000" 
                        style={{ width: `${MOCK_TEMPLATES[selectedTemplate].trust}%` }} 
                      />
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className={`rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed border ${
                    MOCK_TEMPLATES[selectedTemplate].score >= 70
                      ? "bg-red-50/50 border-red-100"
                      : "bg-emerald-50/50 border-emerald-100"
                  }`}>
                    <strong>Analysis Verdict:</strong> {MOCK_TEMPLATES[selectedTemplate].verdict}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* SaaS Trusted-By Logo Ticker */}
      <section className="bg-white border-y border-slate-200/50 py-10 overflow-hidden relative">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
        `}} />
        <div className="mx-auto max-w-7xl px-6 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trusted by fast-growing SaaS & Enterprise security teams</span>
          <div className="mt-6 relative w-full overflow-hidden flex items-center">
            {/* Fade overlays for side blending */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            
            <div className="flex gap-20 whitespace-nowrap animate-marquee">
              {[
                "Sentinel Security", "Apex Global", "TechVanguard", "CloudForce", "CyberShield", "HBL Corp", "SecureNet",
                "Sentinel Security", "Apex Global", "TechVanguard", "CloudForce", "CyberShield", "HBL Corp", "SecureNet"
              ].map((logo, idx) => (
                <span key={idx} className="text-sm font-extrabold text-slate-400 hover:text-indigo-600 transition-colors cursor-default tracking-wider uppercase font-mono">
                  🛡️ {logo}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-t border-slate-200/50 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/50 px-3 py-1 text-xs font-bold text-indigo-700 mb-4">
              🔄 THE FORENSIC PIPELINE
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              PhishGuard Verification Pipeline
            </h2>
            <p className="mt-4 text-slate-500 leading-relaxed">
              Every email analyzed by PhishGuard undergoes an automated 8-stage verification process running heuristics, natural language AI models, and real-time network infrastructure lookups.
            </p>
          </div>

          {/* Timeline Container */}
          <div className="relative mt-16 max-w-5xl mx-auto">
            {/* Central Vertical Connector Line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-violet-500 via-pink-500 via-emerald-500 to-amber-500 transform md:-translate-x-1/2 opacity-30" />

            <div className="space-y-12 relative">
              {PIPELINE_STEPS.map((s, idx) => {
                const IconComponent = s.icon;
                const isEven = idx % 2 === 0;
                
                return (
                  <div 
                    key={s.step} 
                    className={`flex flex-col md:flex-row items-start relative ${
                      isEven ? "md:justify-start" : "md:justify-end"
                    }`}
                  >
                    {/* Pulsing Timeline Node */}
                    <div className="absolute left-4 md:left-1/2 top-6 -translate-x-1/2 z-10 flex items-center justify-center">
                      <div className="h-4 w-4 rounded-full bg-white border-4 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse" />
                    </div>

                    {/* Card container */}
                    <div className={`w-full md:w-[45%] pl-12 md:pl-0 ${isEven ? "md:pr-8" : "md:pl-8"}`}>
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-500/20 group">
                        {/* Top gradient border */}
                        <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${s.color} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
                        
                        {/* Step Index number in background */}
                        <span className="absolute top-3 right-4 font-mono text-3xl font-black text-slate-100 group-hover:text-indigo-500/5 select-none">
                          0{s.step}
                        </span>

                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                            <IconComponent className="h-5 w-5" />
                          </div>
                        </div>

                        <h3 className="mt-4 text-sm font-extrabold text-slate-800 uppercase tracking-wider group-hover:text-indigo-900 transition-colors">
                          {s.name}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      {/* Security Score Section */}
      <section id="scoring" className="py-20 border-t border-slate-200/50 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/50 px-3 py-1 text-xs font-bold text-indigo-700 mb-4">
              ⚖️ SCORING SYSTEM
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Threat Score Aggregation
            </h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
              The overall score (0-100) is a straight average across 6 core components, overrides by whitelist/blacklist Custom Rules apply immediately.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SCORING_VECTORS.map((v, idx) => {
              const IconComponent = v.icon;
              return (
                <div 
                  key={v.name} 
                  className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-6 backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 group"
                >
                  {/* Decorative glowing gradient circle on hover */}
                  <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-xl" />
                  
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300 ${v.iconBg} ${v.iconColor} ${v.iconHoverBg}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-4 font-display text-base font-bold text-slate-800 tracking-tight group-hover:text-indigo-950 transition-colors">
                    {v.name}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed min-h-[36px]">
                    {v.desc}
                  </p>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight Contribution</span>
                      <span className="text-sm font-extrabold text-slate-800">{v.weight}%</span>
                    </div>
                    
                    {/* Sleek SVG Radial Gauge */}
                    <div className="relative flex items-center justify-center h-12 w-12">
                      <svg className="w-12 h-12 transform -rotate-90">
                        {/* Background track */}
                        <circle cx="24" cy="24" r="20" stroke="#F1F5F9" strokeWidth="3" fill="transparent" />
                        {/* Gradient definition inside each SVG */}
                        <defs>
                          <linearGradient id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                        {/* Foreground animated stroke */}
                        <circle 
                          cx="24" 
                          cy="24" 
                          r="20" 
                          stroke={`url(#grad-${idx})`} 
                          strokeWidth="3" 
                          fill="transparent"
                          strokeDasharray="125.66"
                          strokeDashoffset={125.66 - (125.66 * (v.weight / 100))}
                          strokeLinecap="round" 
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <span className="absolute text-[9px] font-black text-indigo-600">{Math.round(v.weight)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-slate-200/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Plans & Pricing
            </h2>
            <p className="mt-4 text-slate-500">Choose the security tier that matches your team size.</p>

            {/* Pricing Toggle Switch */}
            <div className="mt-8 flex justify-center">
              <div className="relative flex items-center p-1 bg-slate-100 rounded-full border border-slate-200/80 shadow-inner">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`relative px-4 py-1.5 text-xs font-extrabold rounded-full transition-all duration-300 ${
                    billingCycle === "monthly" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`relative px-4 py-1.5 text-xs font-extrabold rounded-full transition-all duration-300 ${
                    billingCycle === "yearly" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Annually
                  <span className="absolute -top-2.5 -right-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full shadow-sm tracking-wider uppercase">
                    -20%
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { name: "Community", price: "$0", desc: "For individual developers", features: ["1 Synced Account", "DistilBERT NLP Scans", "Basic Headers Check"] },
              { name: "Pro", price: billingCycle === "yearly" ? "$39" : "$49", desc: "For scaling IT teams", features: ["Up to 50 Employee Accounts", "URL Guard Link Classifier", "Admin Security Score Tracking", "Simulations Integration"], saveBadge: billingCycle === "yearly" ? "Save 20%" : undefined },
              { name: "Enterprise", price: "Custom", desc: "For large organizations", features: ["Unlimited Accounts Sync", "Custom Fine-tuned Weights", "Dedicated API Outbounds", "Priority RDAP Lookup limits"], featured: true },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl bg-white p-8 border border-slate-200/60 shadow-sm relative ${plan.featured ? 'ring-2 ring-indigo-600' : ''}`}>
                {plan.featured && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-bold text-white uppercase">
                    Enterprise
                  </div>
                )}
                <h3 className="font-display text-lg font-bold text-slate-800">{plan.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{plan.desc}</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-extrabold text-slate-900">{plan.price}</span>
                  {plan.price !== "Custom" && (
                    <span className="text-xs text-slate-400">
                      /mo {billingCycle === "yearly" && " (billed annually)"}
                    </span>
                  )}
                  {plan.saveBadge && (
                    <span className="ml-2 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">
                      {plan.saveBadge}
                    </span>
                  )}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth/login"
                  className={`mt-8 block w-full rounded-full py-2.5 text-center text-xs font-bold transition-all ${
                    plan.featured 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Configure Account
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-t border-slate-200/50 bg-slate-50/50">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-12 space-y-4">
            {[
              { q: "Is email text stored on the server?", a: "No. The FastAPI backend processes sequence tokens inside temporary CPU memory. Scan results, scores, and metadata flags are saved to the database, but full decrypted body text is not logged unless it is injected by administrators as training simulation templates." },
              { q: "How does the URL Guard model operate?", a: "Extracted links are evaluated using TF-IDF tokenization mapping. The Logistic Regression classifier compares lexical elements against known malicious patterns to detect phishing domains." },
              { q: "What happens when an employee reports a simulation?", a: "When an employee reports an injected template, the action updates the database. The employee earns +10 points to their individual security score, while failing and clicking subtracts 20 points." },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h4 className="font-bold text-sm text-slate-800">{faq.q}</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="bg-gradient-to-r from-indigo-900 to-indigo-950 py-16 text-center text-white">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Start Detecting Threats Now
          </h2>
          <p className="mt-4 text-indigo-200 text-sm max-w-md mx-auto">
            Analyze suspicious email texts, files, or simulated templates in real-time.
          </p>
          <div className="mt-8">
            <Link
              to="/analyzer"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-indigo-950 shadow-sm hover:bg-slate-50 hover:scale-[1.02] transition-all"
            >
              Analyze Suspicious Email
            </Link>
          </div>
        </div>
      </section>

      {/* Small footer copy */}
      <footer className="py-8 bg-slate-950 text-slate-500 text-xs text-center border-t border-slate-900">
        <div className="flex justify-center gap-4 mb-4">
          <a href="#" className="hover:text-slate-400"><Github className="h-4 w-4" /></a>
          <a href="#" className="hover:text-slate-400"><Twitter className="h-4 w-4" /></a>
          <a href="#" className="hover:text-slate-400"><Linkedin className="h-4 w-4" /></a>
        </div>
        © {new Date().getFullYear()} PhishGuard Security. Academic Portfolio Project.
      </footer>
    </div>
  );
}
