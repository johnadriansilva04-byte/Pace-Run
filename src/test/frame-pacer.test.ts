import { describe, expect, it } from "vitest";
import { createPacer } from "@/lib/frame-pacer";

describe("createPacer", () => {
  it("draws the first frame and then respects the interval", () => {
    const due = createPacer(33);
    expect(due(0)).toBe(true);
    expect(due(8)).toBe(false);
    expect(due(16)).toBe(false);
    expect(due(33)).toBe(true);
  });

  it("caps a 120 Hz display to the target rate", () => {
    const due = createPacer(33);
    const drawn = [0, 8.3, 16.7, 25, 33.3, 41.7, 50, 58.3, 66.7].filter((t) => due(t));
    expect(drawn.length).toBe(3);
  });

  it("keeps independent timers per pacer", () => {
    const frames = createPacer(33);
    const hud = createPacer(200);
    expect(frames(0) && hud(0)).toBe(true);
    expect(frames(33)).toBe(true);
    expect(hud(33)).toBe(false);
    expect(hud(200)).toBe(true);
  });
});
