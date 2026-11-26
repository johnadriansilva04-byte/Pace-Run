import { useEffect, useRef } from "react";
import { drawHud } from "./hud";
import { defaultSettings } from "@/lib/settings";

// Landing-page illustration of the dashboard over a stylised trail (labelled as demonstration).
export function DemoDash() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = (c.width = 1080),
      h = (c.height = 1920);
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, "#ff8a3d");
      sky.addColorStop(1, "#ffd27a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#f6f0d8";
      ctx.beginPath();
      ctx.arc(w * 0.7, h * 0.36, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3b2a3f";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      for (let x = 0; x <= w; x += 60) ctx.lineTo(x, h * 0.45 + Math.sin(x / 140 + 1) * 60);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = "#1d1a22";
      ctx.beginPath();
      ctx.moveTo(w * 0.44, h * 0.52);
      ctx.lineTo(w * 0.56, h * 0.52);
      ctx.lineTo(w * 1.1, h);
      ctx.lineTo(-w * 0.1, h);
      ctx.fill();
      ctx.strokeStyle = "#f6f0d8";
      ctx.lineWidth = 10;
      for (let i = 0; i < 8; i++) {
        const p = ((i / 8 + t * 0.35) % 1) ** 2;
        const y = h * 0.52 + p * h * 0.48;
        ctx.beginPath();
        ctx.moveTo(w / 2, y);
        ctx.lineTo(w / 2, y + 20 + p * 120);
        ctx.stroke();
      }
      const speed = 3.2 + Math.sin(t / 2) * 0.4;
      drawHud(ctx, w, h, {
        snap: {
          elapsed: 1520 + t,
          distance: 5230 + t * speed,
          speed,
          pace: 1000 / speed,
          avgPace: 312,
          avgSpeed: 3.2,
          maxSpeed: 4.1,
          elevation: 812,
          elevationGain: 64,
          accuracy: 5,
          lat: 0,
          lon: 0,
        },
        gps: "ok",
        battery: 0.78,
        recording: true,
        paused: false,
        settings: defaultSettings,
        blink: Math.floor(t * 2) % 2 === 0,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas ref={ref} className="h-full w-full" aria-label="Demonstração do painel PACE RUN" />
  );
}
