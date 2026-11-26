import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Activity } from "./gallery";
// Optional cloud sync. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. in Vercel env vars).
const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

/** `off`: sem variáveis; `login`: projeto sem login anônimo; `ready`: dá para sincronizar. */
export type CloudStatus = "off" | "login" | "ready";

/** O RLS exige `auth.uid()`, então sem sessão nenhuma linha é aceita. */
export function anonymousEnabled(settings: unknown): boolean {
  const external = (settings as { external?: Record<string, unknown> } | null)?.external;
  return external?.["anonymous_users"] === true;
}

export async function cloudStatus(): Promise<CloudStatus> {
  if (!supabase || !url || !key) return "off";
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return "login";
    return anonymousEnabled(await res.json()) ? "ready" : "login";
  } catch {
    return "login";
  }
}

async function ensureSession(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  return error ? null : (anon.user?.id ?? null);
}

export async function syncActivity(a: Activity): Promise<boolean> {
  if (!supabase) return false;
  const userId = await ensureSession();
  if (!userId) return false;
  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: userId,
      activity_type: a.type,
      distance: a.distance,
      duration: a.duration,
      average_pace: a.avgPace,
      average_speed: a.avgSpeed,
      maximum_speed: a.maxSpeed,
      elevation_gain: a.elevationGain,
      started_at: new Date(a.startedAt).toISOString(),
      finished_at: new Date(a.finishedAt).toISOString(),
      video_url: null,
    })
    .select("id")
    .single();
  if (error || !data) return false;
  const rows = a.records.map((r) => ({
    activity_id: data.id,
    elapsed_seconds: r.elapsed,
    distance: r.distance,
    pace: r.pace,
    speed: r.speed,
    elevation: r.elevation,
    latitude: r.lat,
    longitude: r.lon,
    recorded_at: new Date(r.t).toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 500)
    await supabase.from("activity_records").insert(rows.slice(i, i + 500));
  return true;
}
