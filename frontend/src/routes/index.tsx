import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhishGuard — AI Phishing Detection for Gmail" },
      { name: "description", content: "Connect Gmail and analyze every email with AI, header forensics, and SPF/DKIM/DMARC checks in seconds." },
      { property: "og:title", content: "PhishGuard — AI Phishing Detection for Gmail" },
      { property: "og:description", content: "See phishing before it sees you. AI-powered analysis of your Gmail inbox." },
    ],
  }),
  component: Landing,
});
