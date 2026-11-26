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
import { nextMilestone, remainingLabel } from "@/lib/rewards";

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

// Gradients and font strings are expensive to build and are identical for every frame, so they
// are cached per canvas size. shadowBlur is avoided on purpose: it is one of the slowest
// operations on Android canvas, and the halo is faked with an extra translucent stroke.
type HudCache = {
  w: number;
  h: number;
  top?: CanvasGradient;
  bottom?: CanvasGradient;
  font?: string;
};
const caches = new WeakMap<CanvasRenderingContext2D, HudCache>();

function cacheFor(ctx: CanvasRenderingContext2D, w: number, h: number): HudCache {
  let c = caches.get(ctx);
  if (!c || c.w !== w || c.h !== h) {
    c = { w, h };
    caches.set(ctx, c);
  }
  return c;
}

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
  if (f <= 0) return;
  const end = a0 + (a1 - a0) * f;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = lw * 2.2;
  ctx.beginPath();
  ctx.arc(x, y, r, a0, end);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, a0, end);
  ctx.stroke();
}

function text(
  ctx: CanvasRenderingContext2D,
  cache: HudCache,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "center",
  weight = 700,
) {
  const font = `${weight} ${Math.round(size)}px ${FONT}`;
  if (cache.font !== font) {
    ctx.font = font;
    cache.font = font;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(s, x, y);
}

export function drawHud(ctx: CanvasRenderingContext2D, w: number, h: number, st: HudState) {
  const { snap, settings: s } = st;
  const u = s.unit;
  // The interpolated value only exists for the live HUD; stored records use the real distance.
  const distance = snap.displayDistance ?? snap.distance;
  const k = Math.min(w, h) / 1080; // scale unit
  const pad = 40 * k;
  const cache = cacheFor(ctx, w, h);

  // top scrim
  if (!cache.top) {
    const g = ctx.createLinearGradient(0, 0, 0, 200 * k);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    cache.top = g;
  }
  ctx.fillStyle = cache.top;
  ctx.fillRect(0, 0, w, 200 * k);

  // REC + time
  const recY = pad + 40 * k;
  if (st.recording) {
    ctx.fillStyle = st.paused ? C.dim : st.blink ? C.rec : "rgba(255,45,61,0.35)";
    ctx.beginPath();
    ctx.arc(pad + 16 * k, recY - 14 * k, 14 * k, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, cache, st.paused ? "PAUSA" : "REC", pad + 42 * k, recY, 34 * k, C.text, "left");
  } else text(ctx, cache, "PRONTO", pad, recY, 34 * k, C.accent, "left");
  if (s.show.time)
    text(ctx, cache, formatDuration(snap.elapsed), pad, recY + 62 * k, 60 * k, C.text, "left");

  // GPS bars + battery (top-right)
  const gx = w - pad;
  const bars = st.gps === "ok" ? 4 : st.gps === "weak" ? 2 : 0;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i < bars ? C.accent : C.track;
    const bh = (12 + i * 9) * k;
    ctx.fillRect(gx - (4 - i) * 16 * k, recY - bh, 10 * k, bh);
  }
  text(ctx, cache, "GPS", gx - 76 * k, recY, 26 * k, C.dim, "right", 600);
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
      cache,
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
  if (!cache.bottom) {
    const g = ctx.createLinearGradient(0, top - 80 * k, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.45, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0.8)");
    cache.bottom = g;
  }
  ctx.fillStyle = cache.bottom;
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
    text(ctx, cache, formatSpeed(snap.speed, u), left, cy + 18 * k, 64 * k, C.text);
    text(ctx, cache, u === "mi" ? "MPH" : "KM/H", left, cy + 58 * k, 24 * k, C.dim, "center", 600);
  }
  // right gauge: distance (progress to next unit)
  if (s.show.distance) {
    const next = nextMilestone(distance, u);
    gauge(ctx, right, cy, r, next.progress, C.accent, 16 * k);
    text(ctx, cache, formatDistance(distance, u), right, cy + 18 * k, 64 * k, C.text);
    text(ctx, cache, u.toUpperCase(), right, cy + 58 * k, 24 * k, C.dim, "center", 600);
    // The gap to the next unit is the live goal of the run: showing it turns the gauge into a
    // countdown and gives the milestone something to land on.
    text(
      ctx,
      cache,
      remainingLabel(next.remaining, u),
      right,
      cy + 92 * k,
      22 * k,
      C.accent,
      "center",
      700,
    );
  }
  // center: the hero number, PACE
  if (s.show.pace) {
    text(ctx, cache, "PACE", w / 2, cy - 96 * k, 26 * k, C.accent, "center", 700);
    const pace = formatPace(snap.pace, u);
    ctx.globalAlpha = 0.18;
    text(ctx, cache, pace, w / 2, cy + 30 * k, 156 * k, C.accent, "center", 700);
    ctx.globalAlpha = 1;
    text(ctx, cache, pace, w / 2, cy + 30 * k, 150 * k, C.text, "center", 700);
    text(
      ctx,
      cache,
      u === "mi" ? "MIN/MI" : "MIN/KM",
      w / 2,
      cy + 70 * k,
      24 * k,
      C.dim,
      "center",
      600,
    );
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
    text(ctx, cache, val, x, sy - 4 * k, 40 * k, C.text);
    text(ctx, cache, label, x, sy - 50 * k, 20 * k, C.dim, "center", 600);
  });
}

export type Celebration = {
  title: string;
  detail: string;
  progress: number; // 0..1 across the display window
  tone?: "accent" | "hot";
};

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Celebration card drawn over the live frame while a milestone or a pace record is fresh.
// It is drawn on the recorded canvas too, so the highlight ends up inside the video.
export function drawCelebration(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  c: Celebration,
) {
  const k = Math.min(w, h) / 1080;
  const appear = Math.min(1, c.progress / 0.12);
  const fade = c.progress > 0.82 ? 1 - (c.progress - 0.82) / 0.18 : 1;
  const alpha = Math.max(0, Math.min(appear, fade));
  if (alpha <= 0) return;

  const accent = c.tone === "hot" ? C.hot : C.accent;
  const ease = 1 - (1 - appear) ** 3;
  const titleSize = 116 * k;
  const detailSize = 36 * k;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(w / 2, h * 0.33);
  const scale = 0.94 + 0.06 * ease;
  ctx.scale(scale, scale);

  const titleFont = `700 ${Math.round(titleSize)}px ${FONT}`;
  const detailFont = `600 ${Math.round(detailSize)}px ${FONT}`;
  ctx.font = titleFont;
  const tw = ctx.measureText(c.title).width;
  ctx.font = detailFont;
  const dw = ctx.measureText(c.detail).width;
  const padX = 64 * k;
  const padY = 46 * k;
  const gap = 18 * k;
  const cw = Math.max(tw, dw) + padX * 2;
  const ch = titleSize + detailSize + padY * 2 + gap;

  rounded(ctx, -cw / 2, -ch / 2, cw, ch, 26 * k);
  ctx.fillStyle = "rgba(10,12,16,0.86)";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4 * k;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = titleFont;
  ctx.fillStyle = accent;
  ctx.fillText(c.title, 0, -ch / 2 + padY + titleSize * 0.78);
  ctx.font = detailFont;
  ctx.fillStyle = C.text;
  ctx.fillText(c.detail, 0, ch / 2 - padY - detailSize * 0.2);
  ctx.restore();
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
