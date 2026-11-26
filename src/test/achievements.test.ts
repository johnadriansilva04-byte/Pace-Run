import { describe, expect, it } from "vitest";
import { AchievementTracker } from "@/lib/achievements";
import type { Snapshot } from "@/lib/telemetry";

const snap = (distance: number, elapsed: number): Snapshot => ({
  elapsed,
  distance,
  speed: 3,
  pace: 333,
  avgPace: 333,
  avgSpeed: 3,
  maxSpeed: 4,
  elevation: 800,
  elevationGain: 10,
  accuracy: 6,
  lat: -23,
  lon: -46,
});

describe("AchievementTracker", () => {
  it("fires once per kilometre, not once per snapshot", () => {
    const t = new AchievementTracker("km");
    expect(t.update(snap(400, 120))).toHaveLength(0);
    expect(t.update(snap(1000, 300))).toHaveLength(1);
    expect(t.update(snap(1010, 301))).toHaveLength(0);
    expect(t.update(snap(2000, 600)).map((a) => a.kind)).toEqual(["milestone"]);
    expect(t.nextMilestone).toBe(3000);
  });

  it("uses miles when the unit is miles", () => {
    const t = new AchievementTracker("mi");
    expect(t.update(snap(1609, 600))).toHaveLength(0);
    expect(t.update(snap(1610, 601))).toHaveLength(1);
    expect(t.update(snap(1611, 602))).toHaveLength(0);
    expect(t.update(snap(3218.7, 1200))[0]).toMatchObject({ kind: "milestone", unit: "mi" });
  });

  it("flags a faster split as a pace record", () => {
    const t = new AchievementTracker("km");
    t.update(snap(1000, 300)); // first km: reference only
    const events = t.update(snap(2000, 560)); // 260 s split
    expect(events.map((e) => e.kind)).toEqual(["milestone", "record"]);
    expect(events[1]).toMatchObject({ kind: "record", splitSec: 260, previousSec: 300 });
  });

  it("does not call a slower split a record", () => {
    const t = new AchievementTracker("km");
    t.update(snap(1000, 300));
    expect(t.update(snap(2000, 900)).map((e) => e.kind)).toEqual(["milestone"]);
  });

  it("ignores impossible splits instead of celebrating a GPS jump", () => {
    const t = new AchievementTracker("km");
    expect(t.update(snap(5000, 1))).toHaveLength(0);
    expect(t.nextMilestone).toBe(6000);
  });

  it("reset clears the reference split", () => {
    const t = new AchievementTracker("km");
    t.update(snap(1000, 300));
    t.reset();
    expect(t.nextMilestone).toBe(1000);
    expect(t.best).toBeNull();
    expect(t.update(snap(1000, 400)).map((e) => e.kind)).toEqual(["milestone"]);
  });
});
