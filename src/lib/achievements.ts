import type { Snapshot } from "./telemetry";

// Pure milestone logic: distance splits and pace records. No timers, no DOM — the camera page
// feeds snapshots and plays whatever comes back.
export type Achievement =
  | { kind: "milestone"; unit: "km" | "mi"; value: number; splitSec: number; pace: number | null }
  | {
      kind: "record";
      unit: "km" | "mi";
      value: number;
      splitSec: number;
      previousSec: number;
      pace: number | null;
      previousPace: number | null;
    };

const MIN_SPLIT_SEC = 20; // a split faster than this is a GPS artefact, not a run
const MAX_SPLIT_SEC = 3 * 3600;

export class AchievementTracker {
  private step: number;
  private nextAt: number;
  private splitStartElapsed = 0;
  private bestSplit: number | null = null;

  constructor(private unit: "km" | "mi" = "km") {
    this.step = unit === "mi" ? 1609.344 : 1000;
    this.nextAt = this.step;
  }

  reset() {
    this.nextAt = this.step;
    this.splitStartElapsed = 0;
    this.bestSplit = null;
  }

  get nextMilestone() {
    return this.nextAt;
  }

  get best() {
    return this.bestSplit;
  }

  // Returns the events crossed since the previous call. Distance only grows, so each call walks
  // forward from the last reached milestone.
  update(snap: Snapshot): Achievement[] {
    const out: Achievement[] = [];
    let guard = 0;
    while (snap.distance >= this.nextAt && guard++ < 64) {
      const splitSec = snap.elapsed - this.splitStartElapsed;
      const value = Math.round((this.nextAt / this.step) * 100) / 100;
      const sane = splitSec >= MIN_SPLIT_SEC && splitSec <= MAX_SPLIT_SEC;
      this.splitStartElapsed = snap.elapsed;
      if (sane) {
        out.push({
          kind: "milestone",
          unit: this.unit,
          value,
          splitSec,
          pace: (splitSec / this.nextAt) * 1000,
        });
        if (this.bestSplit != null && splitSec < this.bestSplit) {
          out.push({
            kind: "record",
            unit: this.unit,
            value,
            splitSec,
            previousSec: this.bestSplit,
            pace: (splitSec / this.nextAt) * 1000,
            previousPace: (this.bestSplit / this.nextAt) * 1000,
          });
          this.bestSplit = splitSec;
        } else if (this.bestSplit == null) {
          this.bestSplit = splitSec;
        }
      }
      this.nextAt += this.step;
    }
    return out;
  }
}
