import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full" 
        fill="none" 
        stroke="url(#logo-grad)" 
        strokeWidth="3.5"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Outer Wireframe Hexagon/Cube lines */}
        <path d="M50 15 L22 31.2 L22 68.8 L50 85 M50 15 L78 31.2 L78 68.8 L50 85" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 31.2 L50 47.5 L78 31.2" strokeWidth="3" strokeDasharray="3 3" opacity="0.6" />
        <path d="M50 47.5 L50 85" strokeWidth="3" strokeDasharray="3 3" opacity="0.6" />

        {/* Center Solid Shield/Mortarboard Cap */}
        <path 
          d="M50 32 L32 42 L50 52 L68 42 Z" 
          fill="url(#logo-grad)" 
          stroke="url(#logo-grad)"
          strokeWidth="2"
        />
        <path 
          d="M32 42 V52 C32 58 50 63 50 63 C50 63 68 58 68 52 V42" 
          fill="url(#logo-grad)" 
          fillOpacity="0.15"
          stroke="url(#logo-grad)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Fishhook curve wrapping down to the bottom */}
        <path 
          d="M50 52 V72 C50 81 41 83 38 78 C35 73 37 68 42 68 C45 68 47 70 47 73" 
          stroke="url(#logo-grad)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />

        {/* Node Vertex Circles */}
        <circle cx="50" cy="15" r="4.5" fill="url(#logo-grad)" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="22" cy="31.2" r="4.5" fill="url(#logo-grad)" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="78" cy="31.2" r="4.5" fill="url(#logo-grad)" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="22" cy="68.8" r="4.5" fill="url(#logo-grad)" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="78" cy="68.8" r="4.5" fill="url(#logo-grad)" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="50" cy="85" r="4.5" fill="url(#logo-grad)" stroke="#FFF" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <LogoMark className={small ? "h-7 w-7" : "h-8 w-8"} />
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight text-slate-800">PhishGuard</span>
        {!small && <span className="text-[10px] uppercase font-bold tracking-[0.18em] text-slate-400 mt-0.5">AI Email Defense</span>}
      </div>
    </Link>
  );
}
