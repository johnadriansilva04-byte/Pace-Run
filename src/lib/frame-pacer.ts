// Limits work to a target rate independent of the display refresh rate (120 Hz phones included).
export function createPacer(intervalMs: number) {
  let last = -Infinity;
  return (now: number) => {
    if (now - last < intervalMs) return false;
    last = now;
    return true;
  };
}
