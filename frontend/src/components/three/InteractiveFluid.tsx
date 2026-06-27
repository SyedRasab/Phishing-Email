import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/store/settingsStore";

export function InteractiveFluid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lowPowerMode = useSettingsStore(state => state.lowPowerMode);
  const theme = useSettingsStore(state => state.theme);

  useEffect(() => {
    if (lowPowerMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    
    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    window.addEventListener("resize", resize);
    resize();

    // Mouse state
    const mouse = { x: width / 2, y: height / 2, vx: 0, vy: 0, isDown: false };
    let lastMouse = { x: width / 2, y: height / 2 };

    const onMouseMove = (e: MouseEvent) => {
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.vx = mouse.x - lastMouse.x;
      mouse.vy = mouse.y - lastMouse.y;
    };
    
    const onMouseDown = () => (mouse.isDown = true);
    const onMouseUp = () => (mouse.isDown = false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    // Fluid Particles
    const particles: Particle[] = [];
    const numParticles = theme === "light" ? 40 : 80; // Less particles for cleaner look in light mode

    const colors = theme === "light" 
      ? [
          "rgba(30, 58, 95, 0.05)",  // Very subtle Navy
          "rgba(44, 110, 111, 0.05)",// Very subtle Teal
          "rgba(250, 247, 242, 0.8)",// Ivory
          "rgba(242, 236, 227, 0.6)",// Beige
        ]
      : [
          "rgba(105, 117, 101, 0.4)", // Sage Green
          "rgba(60, 61, 55, 0.3)",    // Dark Grey
          "rgba(236, 223, 204, 0.2)", // Beige
          "rgba(130, 140, 120, 0.5)", // Lighter Sage
        ];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      baseX: number;
      baseY: number;
      noiseOffset: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = 0;
        this.vy = 0;
        this.radius = Math.random() * 200 + 100; // Very large for fluid look
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.noiseOffset = Math.random() * 1000;
      }

      update(time: number) {
        // Slow moving gradient behavior
        const dx = Math.sin(time * 0.0005 + this.noiseOffset) * 0.5;
        const dy = Math.cos(time * 0.0005 + this.noiseOffset) * 0.5;
        this.vx += dx * 0.1;
        this.vy += dy * 0.1;

        // Mouse interaction (Swirl and Warp)
        const distToMouse = Math.hypot(mouse.x - this.x, mouse.y - this.y);
        const interactionRadius = mouse.isDown ? 400 : 200; // Bigger area when dragging
        
        if (distToMouse < interactionRadius) {
          const force = (interactionRadius - distToMouse) / interactionRadius;
          // When dragging, pull and swirl. When just moving, push.
          if (mouse.isDown) {
            // Swirl / Vortex effect
            const angle = Math.atan2(this.y - mouse.y, this.x - mouse.x);
            this.vx += Math.cos(angle + Math.PI/2) * force * 5;
            this.vy += Math.sin(angle + Math.PI/2) * force * 5;
            // Also pull slightly towards center
            this.vx -= Math.cos(angle) * force * 2;
            this.vy -= Math.sin(angle) * force * 2;
          } else {
            // Normal push based on mouse velocity
            this.vx += mouse.vx * force * 0.05;
            this.vy += mouse.vy * force * 0.05;
          }
        }

        // Friction and bounds
        this.vx *= 0.92;
        this.vy *= 0.92;

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen gently
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }

    let animationFrameId: number;

    const animate = (time: number) => {
      // Clear with slight transparency for motion blur effect
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);
      
      // Use "screen" or "lighter" for fluid blending of colors
      ctx.globalCompositeOperation = "screen";

      for (const p of particles) {
        p.update(time);
        p.draw(ctx);
      }

      mouse.vx *= 0.9;
      mouse.vy *= 0.9;

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (lowPowerMode) {
    return <div className={`relative w-full h-full bg-background ${className || ""}`} />;
  }

  return (
    <div className={`relative w-full h-full ${className || ""}`}>
      {/* Heavy blur to merge circles into liquid */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full blur-[60px] opacity-70"
        aria-hidden="true"
      />
    </div>
  );
}
