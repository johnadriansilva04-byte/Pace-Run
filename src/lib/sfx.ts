// Short synthesised cues (no audio files, works offline). The AudioContext must be created from a
// user gesture, so the camera page calls unlockAudio() when recording starts.
type Ctor = typeof AudioContext;
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC: Ctor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  context();
}

export function closeAudio() {
  const c = ctx;
  ctx = null;
  void c?.close().catch(() => {});
}

type Note = { hz: number; at: number; dur: number; gain?: number; type?: OscillatorType };

function play(notes: Note[]) {
  const ac = context();
  if (!ac) return;
  const now = ac.currentTime + 0.01;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? "triangle";
    osc.frequency.value = n.hz;
    const peak = n.gain ?? 0.22;
    const start = now + n.at;
    const end = start + n.dur;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

// Two rising notes: milestone reached.
export function playMilestone() {
  play([
    { hz: 784, at: 0, dur: 0.16 },
    { hz: 1046.5, at: 0.16, dur: 0.26 },
  ]);
}

// Three quick notes: pace record.
export function playRecord() {
  play([
    { hz: 880, at: 0, dur: 0.11 },
    { hz: 1174.7, at: 0.1, dur: 0.11 },
    { hz: 1568, at: 0.2, dur: 0.24, gain: 0.26 },
  ]);
}

// Soft blip: recording started/stopped.
export function playBeep(high = false) {
  play([{ hz: high ? 1320 : 660, at: 0, dur: 0.1, gain: 0.16 }]);
}
