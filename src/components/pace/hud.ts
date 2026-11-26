// Canvas dashboard ("painel") drawn on top of the camera frame. Same function renders the live
// view and the recorded video, so the exported file contains exactly what the user sees.
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  type Snapshot,
  type GpsState,
} from "@/lib/telemetry";
import type { Settings } from "@/lib/settings";

// Canvas cannot read Tailwind classes; palette mirrors the --hud-* tokens in styles.css.
const C = {
  accent: "#c6ff3d",
  hot: "#ff5a1f",
  text: "#f4f6f0",
  dim: "rgba(244,246,240,0.6)",
  track: "rgba(255,255,255,0.14)",
  rec: "#ff2d3d",
};
const FONT = "'Chakra Petch', 'Rajdhani', sans-serif";

export type HudState = {
  snap: Snapshot;
  gps: GpsState;
  battery: number | null;
  recording: boolean;
  paused: boolean;
  settings: Settings;
  blink: boolean;
};

function gauge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  frac: number,
  color: string,
  lw: number,
) {
  const a0 = Math.PI * 0.75,
    a1 = Math.PI * 2.25;
  ctx.lineCap = "round";
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.track;
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.stroke();
  // ticks
  ctx.lineWidth = lw * 0.18;
  ctx.strokeStyle = C.dim;
  for (let i = 0; i <= 10; i++) {
    const a = a0 + ((a1 - a0) * i) / 10;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - lw * 1.1), y + Math.sin(a) * (r - lw * 1.1));
    ctx.lineTo(
      x + Math.cos(a) * (r - lw * (i % 5 ? 1.5 : 2)),
      y + Math.sin(a) * (r - lw * (i % 5 ? 1.5 : 2)),
    );
    ctx.stroke();
  }
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = lw * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a0 + (a1 - a0) * f);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "center",
  weight = 700,
) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(s, x, y);
}

export function drawHud(ctx: CanvasRenderingContext2D, w: number, h: number, st: HudState) {
  const { snap, settings: s } = st;
  const u = s.unit;
  const k = Math.min(w, h) / 1080; // scale unit
  const pad = 40 * k;

  // top scrim
  let g = ctx.createLinearGradient(0, 0, 0, 200 * k);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 200 * k);

  // REC + time
  const recY = pad + 40 * k;
  if (st.recording) {
    ctx.fillStyle = st.paused ? C.dim : st.blink ? C.rec : "rgba(255,45,61,0.35)";
    ctx.beginPath();
    ctx.arc(pad + 16 * k, recY - 14 * k, 14 * k, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, st.paused ? "PAUSA" : "REC", pad + 42 * k, recY, 34 * k, C.text, "left");
  } else text(ctx, "PRONTO", pad, recY, 34 * k, C.accent, "left");
  if (s.show.time)
    text(ctx, formatDuration(snap.elapsed), pad, recY + 62 * k, 60 * k, C.text, "left");

  // GPS bars + battery (top-right)
  const gx = w - pad;
  const bars = st.gps === "ok" ? 4 : st.gps === "weak" ? 2 : 0;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i < bars ? C.accent : C.track;
    const bh = (12 + i * 9) * k;
    ctx.fillRect(gx - (4 - i) * 16 * k, recY - bh, 10 * k, bh);
  }
  text(ctx, "GPS", gx - 76 * k, recY, 26 * k, C.dim, "right", 600);
  if (st.battery != null) {
    const bw = 64 * k,
      bh = 28 * k,
      bx = gx - bw - 4 * k,
      by = recY + 26 * k;
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 3 * k;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = C.text;
    ctx.fillRect(bx + bw, by + bh * 0.3, 5 * k, bh * 0.4);
    ctx.fillStyle = st.battery < 0.2 ? C.rec : C.text;
    ctx.fillRect(bx + 4 * k, by + 4 * k, (bw - 8 * k) * st.battery, bh - 8 * k);
    text(
      ctx,
      `${Math.round(st.battery * 100)}%`,
      bx - 12 * k,
      by + bh - 4 * k,
      26 * k,
      C.dim,
      "right",
      600,
    );
  }

  // bottom dashboard
  const panelH = 400 * k;
  const top = h - panelH;
  g = ctx.createLinearGradient(0, top - 80 * k, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = g;
  ctx.fillRect(0, top - 80 * k, w, panelH + 80 * k);

  const cy = top + 190 * k;
  const r = 130 * k;
  const span = Math.min(w, 1500 * k);
  const left = w / 2 - span / 2 + r + pad,
    right = w / 2 + span / 2 - r - pad;

  // left gauge: speed
  if (s.show.speed) {
    const max = s.activity === "pedal" ? 50 : 25;
    gauge(ctx, left, cy, r, ((snap.speed ?? 0) * 3.6) / max, C.hot, 16 * k);
    text(ctx, formatSpeed(snap.speed, u), left, cy + 18 * k, 64 * k, C.text);
    text(ctx, u === "mi" ? "MPH" : "KM/H", left, cy + 58 * k, 24 * k, C.dim, "center", 600);
  }
  // right gauge: distance (progress to next unit)
  if (s.show.distance) {
    const unitM = u === "mi" ? 1609.344 : 1000;
    gauge(ctx, right, cy, r, (snap.distance % unitM) / unitM, C.accent, 16 * k);
    text(ctx, formatDistance(snap.distance, u), right, cy + 18 * k, 64 * k, C.text);
    text(ctx, u.toUpperCase(), right, cy + 58 * k, 24 * k, C.dim, "center", 600);
  }
  // center: the hero number, PACE
  if (s.show.pace) {
    text(ctx, "PACE", w / 2, cy - 96 * k, 26 * k, C.accent, "center", 700);
    ctx.shadowColor = "rgba(198,255,61,0.55)";
    ctx.shadowBlur = 30 * k;
    text(ctx, formatPace(snap.pace, u), w / 2, cy + 30 * k, 150 * k, C.text, "center", 700);
    ctx.shadowBlur = 0;
    text(ctx, u === "mi" ? "MIN/MI" : "MIN/KM", w / 2, cy + 70 * k, 24 * k, C.dim, "center", 600);
  }
  // bottom strip
  const items: [string, string][] = [];
  if (s.show.avgPace) items.push(["PACE MÉDIO", formatPace(snap.avgPace, u)]);
  if (s.show.elevation)
    items.push(["ELEVAÇÃO", snap.elevation == null ? "-- m" : `${Math.round(snap.elevation)} m`]);
  if (s.show.gain) items.push(["GANHO", `+${Math.round(snap.elevationGain)} m`]);
  const sy = h - pad;
  const cw = span / Math.max(1, items.length);
  items.forEach(([label, val], i) => {
    const x = w / 2 - span / 2 + cw * i + cw / 2;
    text(ctx, val, x, sy - 4 * k, 40 * k, C.text);
    text(ctx, label, x, sy - 50 * k, 20 * k, C.dim, "center", 600);
  });
}

// Draw a video frame with object-fit: cover (no stretching).
export function drawCover(
  ctx: CanvasRenderingContext2D,
  v: HTMLVideoElement,
  w: number,
  h: number,
  mirror: boolean,
) {
  const vw = v.videoWidth,
    vh = v.videoHeight;
  if (!vw || !vh) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const sc = Math.max(w / vw, h / vh);
  const dw = vw * sc,
    dh = vh * sc;
  ctx.save();
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.restore();
}
