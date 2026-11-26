import { get, set, del, keys } from "idb-keyval";
export type RecordPoint = {
  elapsed: number;
  distance: number;
  pace: number | null;
  speed: number | null;
  elevation: number | null;
  lat: number | null;
  lon: number | null;
  t: number;
};
export type Activity = {
  id: string;
  type: string;
  startedAt: number;
  finishedAt: number;
  distance: number;
  duration: number;
  avgPace: number | null;
  avgSpeed: number | null;
  maxSpeed: number;
  elevationGain: number;
  mime: string;
  format: string;
  thumb: string;
  records: RecordPoint[];
  synced?: boolean;
};
export async function saveActivity(a: Activity, video: Blob) {
  await set("vid:" + a.id, video);
  await set("act:" + a.id, a);
}
export async function listActivities(): Promise<Activity[]> {
  const ks = (await keys()).filter((k) => String(k).startsWith("act:"));
  const all = await Promise.all(ks.map((k) => get<Activity>(k)));
  return all.filter((x): x is Activity => !!x).sort((a, b) => b.startedAt - a.startedAt);
}
export const getActivity = (id: string) => get<Activity>("act:" + id);
export const getVideo = (id: string) => get<Blob>("vid:" + id);
export async function replaceVideo(id: string, blob: Blob, mime: string) {
  await set("vid:" + id, blob);
  const a = await getActivity(id);
  if (a) await set("act:" + id, { ...a, mime });
}
export async function updateActivity(a: Activity) {
  await set("act:" + a.id, a);
}
export async function deleteActivity(id: string) {
  await del("vid:" + id);
  await del("act:" + id);
}
export const extFor = (mime: string) => (mime.includes("mp4") ? "mp4" : "webm");
export function pickMime(): string {
  const c = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,opus",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return c.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}
