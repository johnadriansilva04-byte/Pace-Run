import { describe, expect, it } from "vitest";
import { closeAudio, playBeep, playMilestone, playRecord, unlockAudio } from "@/lib/sfx";

// jsdom has no AudioContext: the cues must degrade to a no-op instead of throwing.
describe("sfx", () => {
  it("does nothing when the browser has no AudioContext", () => {
    expect(() => {
      unlockAudio();
      playMilestone();
      playRecord();
      playBeep(true);
      closeAudio();
    }).not.toThrow();
  });
});
