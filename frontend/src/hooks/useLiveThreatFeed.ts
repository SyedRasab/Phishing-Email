import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScanResult } from "@/types/api";

export function useLiveThreatFeed() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Connect to FastAPI WebSocket
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "NEW_SCAN") {
          const scan: ScanResult = message.data;
          
          // Show toast alert based on risk
          if (scan.is_phishing) {
            toast.error(`⚠️ Phishing Threat Detected!`, {
              description: `Sender: ${scan.sender}\nScore: ${scan.risk_score}/100`,
              duration: 5000,
            });
          } else if (scan.risk_score >= 40) {
            toast.warning(`⚠️ Suspicious Email Scanned`, {
              description: `Sender: ${scan.sender}`,
              duration: 4000,
            });
          } else {
            toast.success(`✅ Safe Email Scanned`, {
              description: `Sender: ${scan.sender}`,
              duration: 3000,
            });
          }

          // Invalidate React Query caches to trigger UI refresh
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          queryClient.invalidateQueries({ queryKey: ["history"] });
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);
}
