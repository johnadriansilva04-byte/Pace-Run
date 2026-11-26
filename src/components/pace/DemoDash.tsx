import { useEffect, useRef } from "react";
import { drawCelebration, drawHud } from "./hud";
import { defaultSettings } from "@/lib/settings";
import { createPacer } from "@/lib/frame-pacer";

// Landing-page illustration of the dashboard over a stylised trail (labelled as demonstration).
// The scene is painted once into an offscreen canvas and the dashboard only a few times per
// second, so this animation does not burn the main thread of a phone.

const W = 1080;
const H = 1920;
const FRAME_MS = 1000 / 30;
const HUD_MS = 200;
const CELEBRATION_S = 2.6;

function paintScene(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "#ff8a3d");
  sky.addColorStop(1, "#ffd27a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f6f0d8";
  ctx.beginPath();
  ctx.arc(W * 0.7, H * 0.36, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b2a3f";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.5);
  for (let x = 0; x <= W; x += 60) ctx.lineTo(x, H * 0.45 + Math.sin(x / 140 + 1) * 60);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = "#1d1a22";
  ctx.beginPath();
  ctx.moveTo(W * 0.44, H * 0.52);
  ctx.lineTo(W * 0.56, H * 0.52);
  ctx.lineTo(W * 1.1, H);
  ctx.lineTo(-W * 0.1, H);
  ctx.fill();
}

export function DemoDash() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: false });
    if (!ctx) return;
    c.width = W;
    c.height = H;

    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    const bgCtx = bg.getContext("2d");
    if (!bgCtx) return;
    paintScene(bgCtx);

    const hud = document.createElement("canvas");
    hud.width = W;
    hud.height = H;
    const hudCtx = hud.getContext("2d");
    if (!hudCtx) return;

    const frameDue = createPacer(FRAME_MS);
    const hudDue = createPacer(HUD_MS);
    const t0 = performance.now();

    const paintHud = (t: number) => {
      const speed = 3.2 + Math.sin(t / 2) * 0.4;
      hudCtx.clearRect(0, 0, W, H);
      drawHud(hudCtx, W, H, {
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
    };

    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      if (hudDue(now)) paintHud(t);
      if (frameDue(now)) {
        ctx.drawImage(bg, 0, 0);
        ctx.strokeStyle = "#f6f0d8";
        ctx.lineWidth = 10;
        for (let i = 0; i < 8; i++) {
          const p = ((i / 8 + t * 0.35) % 1) ** 2;
          const y = H * 0.52 + p * H * 0.48;
          ctx.beginPath();
          ctx.moveTo(W / 2, y);
          ctx.lineTo(W / 2, y + 20 + p * 120);
          ctx.stroke();
        }
        ctx.drawImage(hud, 0, 0);
        // Showcase of the milestone card: same renderer used while recording.
        const phase = t % 12;
        if (phase < CELEBRATION_S) {
          drawCelebration(ctx, W, H, {
            title: "5 KM",
            detail: "PARABÉNS · 26:00 · 5:12/km",
            tone: "accent",
            progress: phase / CELEBRATION_S,
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf || !visible) return;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    paintHud(0);
    start();

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    io.observe(c);

    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  return (
    <canvas ref={ref} className="h-full w-full" aria-label="Demonstração do painel PACE RUN" />
  );
}
