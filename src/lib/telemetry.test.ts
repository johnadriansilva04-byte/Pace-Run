import { describe, expect, it } from "vitest";
import { TelemetryEngine, formatPace, haversine, paceFromSpeed } from "./telemetry";

const base = { lat: -23.55, lon: -46.63 };
const north = (m: number) => ({ lat: base.lat + m / 111195, lon: base.lon });

describe("telemetry", () => {
  it("haversine ~100m", () => {
    expect(haversine(base, north(100))).toBeCloseTo(100, 0);
  });
  it("pace of 5 min/km at 3.333 m/s", () => {
    expect(formatPace(paceFromSpeed(1000 / 300))).toBe("5:00");
  });
  it("ignores fixes with poor accuracy", () => {
    const e = new TelemetryEngine();
    e.start(0);
    e.addFix({ ...north(0), alt: null, accuracy: 5, speed: null, t: 0 });
    e.addFix({ ...north(50), alt: null, accuracy: 80, speed: null, t: 10000 });
    expect(e.distance).toBe(0);
  });
  it("does not count distance or time while paused", () => {
    const e = new TelemetryEngine();
    e.start(0);
    e.addFix({ ...north(0), alt: null, accuracy: 5, speed: null, t: 0 });
    e.addFix({ ...north(30), alt: null, accuracy: 5, speed: null, t: 10000 });
    e.pause(10000);
    e.addFix({ ...north(200), alt: null, accuracy: 5, speed: null, t: 60000 });
    expect(e.distance).toBeCloseTo(30, 0);
    expect(e.elapsed(60000)).toBe(10);
  });
  it("drops implausible jumps", () => {
    const e = new TelemetryEngine();
    e.start(0);
    e.addFix({ ...north(0), alt: null, accuracy: 5, speed: null, t: 0 });
    e.addFix({ ...north(1000), alt: null, accuracy: 5, speed: null, t: 1000 });
    expect(e.distance).toBe(0);
  });
});
