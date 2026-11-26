// Pure telemetry engine: GPS fixes in, filtered metrics out. No browser APIs here.
export type Fix = {
  lat: number;
  lon: number;
  alt: number | null;
  accuracy: number;
  speed: number | null;
  t: number;
};
export type Snapshot = {
  elapsed: number; // active seconds
  distance: number; // meters
  displayDistance?: number; // distance with a short interpolation, for the live HUD only
  speed: number | null; // m/s instant (null = unreliable)
  pace: number | null; // s/km instant
  avgPace: number | null;
  avgSpeed: number | null;
  maxSpeed: number;
  elevation: number | null;
  elevationGain: number;
  accuracy: number | null;
  lat: number | null;
  lon: number | null;
};

export const MAX_ACCURACY_M = 25; // fixes worse than this are ignored
const MIN_STEP_M = 2; // GPS jitter below this is not movement
const MAX_SPEED_MS = 40; // physically implausible jump filter
const ELEV_THRESHOLD_M = 3; // hysteresis for elevation gain
const MIN_MOVING_SPEED = 0.5; // below this, pace is "--"

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function paceFromSpeed(ms: number | null): number | null {
  if (ms == null || ms < MIN_MOVING_SPEED) return null;
  return 1000 / ms;
}

export function formatPace(secPerKm: number | null, unit: "km" | "mi" = "km") {
  if (secPerKm == null || !isFinite(secPerKm)) return "--:--";
  const s = unit === "mi" ? secPerKm * 1.609344 : secPerKm;
  if (s > 59 * 60) return "--:--";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r === 60 ? `${m + 1}:00` : `${m}:${String(r).padStart(2, "0")}`;
}

export function formatDuration(sec: number) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const rr = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${rr}` : `${mm}:${rr}`;
}

export function formatDistance(m: number, unit: "km" | "mi" = "km") {
  const v = unit === "mi" ? m / 1609.344 : m / 1000;
  return v.toFixed(2);
}

export function formatSpeed(ms: number | null, unit: "km" | "mi" = "km") {
  if (ms == null) return "--";
  return (unit === "mi" ? ms * 2.236936 : ms * 3.6).toFixed(1);
}

export class TelemetryEngine {
  private last: Fix | null = null;
  private recent: Fix[] = [];
  private elevRef: number | null = null;
  private smoothAlt: number | null = null;
  private activeMs = 0;
  private runningSince: number | null = null;
  distance = 0;
  maxSpeed = 0;
  elevationGain = 0;
  latestAccuracy: number | null = null;
  latest: Fix | null = null;
  private lastFixAt: number | null = null;
  private emaSpeed: number | null = null;

  get running() {
    return this.runningSince != null;
  }

  start(now: number) {
    if (this.runningSince == null) {
      this.runningSince = now;
      this.last = null;
      this.recent = [];
      this.emaSpeed = null;
    }
  }
  pause(now: number) {
    if (this.runningSince != null) {
      this.activeMs += now - this.runningSince;
      this.runningSince = null;
    }
  }

  elapsed(now: number) {
    return (this.activeMs + (this.runningSince != null ? now - this.runningSince : 0)) / 1000;
  }

  addFix(f: Fix) {
    this.latestAccuracy = f.accuracy;
    if (f.accuracy > MAX_ACCURACY_M) return;
    this.latest = f;
    this.lastFixAt = f.t;
    if (f.alt != null)
      this.smoothAlt = this.smoothAlt == null ? f.alt : this.smoothAlt * 0.8 + f.alt * 0.2;
    if (!this.running) return;

    if (this.smoothAlt != null) {
      if (this.elevRef == null) this.elevRef = this.smoothAlt;
      const d = this.smoothAlt - this.elevRef;
      if (d >= ELEV_THRESHOLD_M) {
        this.elevationGain += d;
        this.elevRef = this.smoothAlt;
      } else if (d <= -ELEV_THRESHOLD_M) this.elevRef = this.smoothAlt;
    }

    if (this.last) {
      const step = haversine(this.last, f);
      const dt = (f.t - this.last.t) / 1000;
      if (dt <= 0) return;
      if (step / dt > MAX_SPEED_MS) return; // jump: drop fix
      if (step < Math.max(MIN_STEP_M, f.accuracy * 0.3)) return; // jitter: wait for more movement
      this.distance += step;
    }
    this.last = f;
    this.recent.push(f);
    this.recent = this.recent.filter((r) => f.t - r.t <= 10000);
    const s = this.currentSpeed();
    if (s != null && s > this.maxSpeed) this.maxSpeed = s;
    // Asymmetric smoothing: follows a slowdown fast (no stuck pace) but softens the noisy
    // instant speed the GPS reports.
    if (s != null)
      this.emaSpeed =
        this.emaSpeed == null
          ? s
          : this.emaSpeed + (s - this.emaSpeed) * (s > this.emaSpeed ? 0.45 : 0.8);
  }

  currentSpeed(): number | null {
    if (!this.running) return null;
    const l = this.latest;
    if (l && l.speed != null && l.speed >= 0) return l.speed;
    if (this.recent.length < 2) return null;
    let d = 0;
    for (let i = 1; i < this.recent.length; i++)
      d += haversine(this.recent[i - 1]!, this.recent[i]!);
    const dt = (this.recent[this.recent.length - 1]!.t - this.recent[0]!.t) / 1000;
    return dt > 0 ? d / dt : null;
  }

  // `interpolate` extrapolates the distance between fixes so the HUD keeps moving instead of
  // jumping once per second. Never used for stored records.
  snapshot(now: number, opts?: { interpolate?: boolean }): Snapshot {
    const elapsed = this.elapsed(now);
    const raw = this.currentSpeed();
    const speed = this.emaSpeed ?? raw;
    let displayDistance = this.distance;
    if (
      opts?.interpolate &&
      this.running &&
      this.lastFixAt != null &&
      raw != null &&
      raw > MIN_MOVING_SPEED
    ) {
      // Only bridge the gap between two fixes: a stale fix must not keep inflating the number.
      const age = now - this.lastFixAt;
      if (age > 0 && age <= 2000) displayDistance += raw * Math.min(age / 1000, 1.5);
    }
    const avgSpeed = elapsed > 0 && this.distance > 0 ? this.distance / elapsed : null;
    return {
      elapsed,
      distance: this.distance,
      displayDistance,
      speed,
      pace: paceFromSpeed(speed),
      avgPace: this.distance >= 50 ? (elapsed / this.distance) * 1000 : null,
      avgSpeed,
      maxSpeed: this.maxSpeed,
      elevation: this.smoothAlt,
      elevationGain: this.elevationGain,
      accuracy: this.latestAccuracy,
      lat: this.latest?.lat ?? null,
      lon: this.latest?.lon ?? null,
    };
  }
}

export type GpsState = "searching" | "weak" | "ok" | "denied" | "unavailable";
export function gpsStateFromAccuracy(acc: number | null): GpsState {
  if (acc == null) return "searching";
  if (acc <= 15) return "ok";
  return "weak";
}
