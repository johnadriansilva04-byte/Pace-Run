import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC = join(process.cwd(), "public");
const read = (path: string) => readFileSync(join(PUBLIC, path));

type Icon = { src: string; sizes: string; type: string; purpose?: string };
type Manifest = {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  theme_color: string;
  background_color: string;
  lang: string;
  icons: Icon[];
  shortcuts?: { name: string; url: string }[];
};

const manifest = JSON.parse(read("manifest.webmanifest").toString()) as Manifest;

function pngSize(buffer: Buffer) {
  expect(buffer.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("PWA manifest", () => {
  it("describes an installable standalone app that opens on the app home", () => {
    expect(manifest.name).toContain("PACE RUN");
    expect(manifest.short_name).toBe("PACE RUN");
    expect(manifest.display).toBe("standalone");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url.startsWith("/inicio")).toBe(true);
    expect(manifest.lang).toBe("pt-BR");
    expect(manifest.orientation).toBeTruthy();
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("ships icons whose real pixel size matches the declared size", () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);

    for (const icon of manifest.icons) {
      expect(icon.type).toBe("image/png");
      const file = join(PUBLIC, icon.src);
      expect(existsSync(file), `${icon.src} deve existir`).toBe(true);
      const [width, height] = icon.sizes.split("x").map(Number) as [number, number];
      expect(pngSize(read(icon.src.replace(/^\//, "")))).toEqual({ width, height });
    }
  });

  it("keeps install shortcuts pointing at real app routes", () => {
    const urls = (manifest.shortcuts ?? []).map((shortcut) => shortcut.url);
    expect(urls).toContain("/preparar");
    expect(urls).toContain("/galeria");
  });

  it("provides the apple touch icon referenced by the app shell", () => {
    expect(existsSync(join(PUBLIC, "icons/apple-touch-icon.png"))).toBe(true);
    expect(pngSize(read("icons/apple-touch-icon.png"))).toEqual({ width: 180, height: 180 });
  });
});

describe("service worker", () => {
  const source = read("sw.js").toString();

  it("is valid JavaScript and versions its caches", () => {
    expect(() => new Function(source)).not.toThrow();
    expect(source).toMatch(/CACHE_VERSION = "pacerun-/);
    expect(source).toContain("skipWaiting");
    expect(source).toContain("clients.claim");
  });

  it("precaches files that actually exist", () => {
    const block = source.slice(source.indexOf("const ESSENTIALS"), source.indexOf("];"));
    const paths = [...block.matchAll(/"(\/[^"]*)"/g)].map((match) => match[1]!);
    expect(paths.length).toBeGreaterThan(5);
    for (const path of paths) {
      if (path.startsWith("/offline")) continue;
      expect(existsSync(join(PUBLIC, path)), `${path} deve existir`).toBe(true);
    }
    expect(existsSync(join(PUBLIC, "offline.html"))).toBe(true);
  });

  it("serves navigations network-first with an offline fallback", () => {
    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain("networkFirst");
    expect(source).toContain("OFFLINE_URL");
  });
});
