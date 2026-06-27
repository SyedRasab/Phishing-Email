import { useEffect, useRef } from "react";

export function WireframeTopology({ 
  className, 
  color = "105, 117, 101" 
}: { 
  className?: string; 
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
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

    // 3D parameters
    const points: { x: number, y: number, z: number }[] = [];
    const rows = 24;
    const cols = 24;
    const size = 1200;
    
    // Create grid with terrain noise
    for(let i = 0; i < rows; i++) {
      for(let j = 0; j < cols; j++) {
        const x = (j - cols/2) * (size/cols);
        const z = (i - rows/2) * (size/rows);
        // Math combination to create cool cyber-terrain
        const y = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 180 + Math.sin(x * 0.02) * 50;
        points.push({ x, y, z });
      }
    }

    let angle = 0;
    const mouse = { x: 0, y: 0 };
    const targetMouse = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
      targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Smooth easing interpolation for buttery movement
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;
      
      const currentAngle = angle + mouse.x * 0.5;
      angle += 0.001; // slow continuous auto-rotation
      
      const cosA = Math.cos(currentAngle);
      const sinA = Math.sin(currentAngle);
      
      const currentTilt = 1.0 + mouse.y * 0.4;
      const cosT = Math.cos(currentTilt);
      const sinT = Math.sin(currentTilt);

      const fov = 600;
      const projected = points.map(p => {
        // Rotate Y (Spin)
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        
        // Tilt X (Look down)
        const ry = p.y * cosT - rz * sinT;
        const rz2 = p.y * sinT + rz * cosT;
        
        // Translate Z (Push back)
        const tz = rz2 + 800;
        
        // Project to 2D
        const scale = fov / (fov + tz);
        const px = (rx * scale) + width / 2;
        const py = (ry * scale) + height / 2 + 150; // Shift down slightly
        
        return { px, py, scale, tz };
      });

      // Draw Wireframe Lines
      ctx.strokeStyle = `rgba(${color}, 0.25)`; 
      ctx.lineWidth = 1;
      
      for(let i = 0; i < rows; i++) {
        for(let j = 0; j < cols; j++) {
          const idx = i * cols + j;
          const p = projected[idx];
          
          if (p.tz < -fov + 100) continue; // Behind camera
          
          // Connect to right neighbor
          if (j < cols - 1) {
            const right = projected[idx + 1];
            // Fade out lines that are far away
            const alpha = Math.max(0, 1 - (p.tz / 1500));
            ctx.strokeStyle = `rgba(${color}, ${alpha * 0.4})`;
            
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(right.px, right.py);
            ctx.stroke();
          }
          
          // Connect to bottom neighbor
          if (i < rows - 1) {
            const down = projected[idx + cols];
            const alpha = Math.max(0, 1 - (p.tz / 1500));
            ctx.strokeStyle = `rgba(${color}, ${alpha * 0.4})`;
            
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(down.px, down.py);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
