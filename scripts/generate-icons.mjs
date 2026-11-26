// Renders the PACE RUN icon set from vector primitives so the PNGs can be
// regenerated without an image toolchain: `node scripts/generate-icons.mjs`.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const S = 4; // supersampling factor for anti-aliasing

const LIME = [198, 255, 61];
const ORANGE = [255, 90, 31];
const WHITE = [244, 246, 240];
const BG_TOP = [24, 28, 37];
const BG_BOTTOM = [9, 11, 15];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function blend(dst, i, color, alpha) {
  if (alpha <= 0) return;
  const a = Math.min(1, alpha);
  const inv = 1 - a;
  dst[i] = color[0] * a + dst[i] * inv;
  dst[i + 1] = color[1] * a + dst[i + 1] * inv;
  dst[i + 2] = color[2] * a + dst[i + 2] * inv;
  dst[i + 3] = 255 * a + dst[i + 3] * inv;
}

// Shapes are implicit functions over the unit square (0..1), evaluated per pixel.
const arc = (cx, cy, r, width, from, to) => (x, y) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  let ang = Math.atan2(dy, dx);
  if (ang < 0) ang += Math.PI * 2;
  if (ang < from) ang += Math.PI * 2; // keep the sweep continuous across 0
  if (ang >= from && ang <= to && Math.abs(dist - r) <= width / 2) return 1;
  const capDist = (a) => Math.hypot(x - (cx + Math.cos(a) * r), y - (cy + Math.sin(a) * r));
  if (capDist(from) <= width / 2 || capDist(to) <= width / 2) return 1;
  return 0;
};

const segment = (x1, y1, x2, y2, width) => (x, y) => {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len = vx * vx + vy * vy;
  const t = len === 0 ? 0 : clamp01(((x - x1) * vx + (y - y1) * vy) / len);
  return Math.hypot(x - (x1 + vx * t), y - (y1 + vy * t)) <= width / 2 ? 1 : 0;
};

const disc = (cx, cy, r) => (x, y) => (Math.hypot(x - cx, y - cy) <= r ? 1 : 0);

const roundedSquare = (radius) => (x, y) => {
  const dx = Math.max(Math.abs(x - 0.5) - (0.5 - radius), 0);
  const dy = Math.max(Math.abs(y - 0.5) - (0.5 - radius), 0);
  return Math.hypot(dx, dy) <= radius ? 1 : 0;
};

function render(size, { maskable = false, apple = false } = {}) {
  const w = size * S;
  const buf = Buffer.alloc(w * w * 4);
  const bg = maskable || apple ? () => 1 : roundedSquare(0.225);
  const scale = maskable ? 0.78 : apple ? 0.86 : 0.9;
  const map = (v) => 0.5 + (v - 0.5) * scale;

  const mark = [
    { shape: arc(0.5, 0.58, 0.29, 0.13, 2.35, 7.07), color: LIME, alpha: 0.12 },
    { shape: arc(0.5, 0.58, 0.29, 0.085, 2.35, 7.07), color: LIME, alpha: 1 },
    {
      shape: segment(0.5, 0.56, 0.5 + Math.cos(-0.78) * 0.2, 0.58 + Math.sin(-0.78) * 0.2, 0.062),
      color: WHITE,
      alpha: 1,
    },
    { shape: disc(0.5, 0.58, 0.05), color: ORANGE, alpha: 1 },
  ];

  for (let py = 0; py < w; py++) {
    for (let px = 0; px < w; px++) {
      const x = (px + 0.5) / w;
      const y = (py + 0.5) / w;
      const i = (py * w + px) * 4;
      if (!bg(x, y)) continue;
      blend(buf, i, mix(BG_TOP, BG_BOTTOM, y), 1);
      for (const layer of mark) {
        if (layer.shape(map(x), map(y))) blend(buf, i, layer.color, layer.alpha);
      }
    }
  }

  // Box-downsample the supersampled buffer.
  const out = Buffer.alloc(size * size * 4);
  const n = S * S;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const i = ((y * S + sy) * w + (x * S + sx)) * 4;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
          a += buf[i + 3];
        }
      }
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, out);
}

function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bit count
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const files = [
  ["icons/icon-192.png", render(192)],
  ["icons/icon-512.png", render(512)],
  ["icons/icon-maskable-192.png", render(192, { maskable: true })],
  ["icons/icon-maskable-512.png", render(512, { maskable: true })],
  ["icons/apple-touch-icon.png", render(180, { apple: true })],
  ["icons/favicon-32.png", render(32)],
  ["icons/favicon-16.png", render(16)],
];

for (const [name, data] of files) {
  const target = join(OUT, name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  console.log(`${name} ${data.length} bytes`);
}

const icoData = ico([
  { size: 16, data: render(16) },
  { size: 32, data: render(32) },
  { size: 48, data: render(48) },
]);
writeFileSync(join(OUT, "favicon.ico"), icoData);
console.log(`favicon.ico ${icoData.length} bytes`);
