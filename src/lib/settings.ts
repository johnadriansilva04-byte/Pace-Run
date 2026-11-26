import { useEffect, useState } from "react";
export type Settings = {
  unit: "km" | "mi";
  format: "9:16" | "16:9" | "1:1";
  resolution: 720 | 1080;
  bitrate: number;
  recordAudio: boolean;
  activity: "corrida" | "caminhada" | "pedal";
  show: { distance: boolean; pace: boolean; avgPace: boolean; speed: boolean; time: boolean; elevation: boolean; gain: boolean };
  cloudSync: boolean;
};
export const defaultSettings: Settings = {
  unit: "km", format: "9:16", resolution: 1080, bitrate: 8_000_000, recordAudio: true, activity: "corrida",
  show: { distance: true, pace: true, avgPace: true, speed: true, time: true, elevation: true, gain: true },
  cloudSync: false,
};
const KEY = "pacecam.settings";
export function loadSettings(): Settings {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); return { ...defaultSettings, ...s, show: { ...defaultSettings.show, ...(s.show || {}) } }; }
  catch { return defaultSettings; }
}
export function useSettings() {
  const [s, setS] = useState<Settings>(defaultSettings);
  useEffect(() => setS(loadSettings()), []);
  const update = (p: Partial<Settings>) => setS((prev) => { const n = { ...prev, ...p }; localStorage.setItem(KEY, JSON.stringify(n)); return n; });
  return [s, update] as const;
}
export function frameSize(format: Settings["format"], res: number) {
  if (format === "9:16") return { w: res === 1080 ? 1080 : 720, h: res === 1080 ? 1920 : 1280 };
  if (format === "16:9") return { w: res === 1080 ? 1920 : 1280, h: res === 1080 ? 1080 : 720 };
  return { w: res, h: res };
}
