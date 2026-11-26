import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, SwitchCamera, Crop, Pause, Play, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import { drawCover, drawHud } from "@/components/pace/hud";
import { TelemetryEngine, gpsStateFromAccuracy, type GpsState } from "@/lib/telemetry";
import { frameSize, loadSettings, type Settings } from "@/lib/settings";
import { pickMime, saveActivity, updateActivity, type RecordPoint } from "@/lib/gallery";
import { createPacer } from "@/lib/frame-pacer";
import { syncActivity } from "@/lib/supabase";

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Câmera esportiva — PACE RUN" },
      { name: "description", content: "Grave com o painel de telemetria ao vivo." },
      { property: "og:title", content: "Câmera esportiva — PACE RUN" },
      { property: "og:description", content: "Painel ao vivo gravado no vídeo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CameraPage,
});

const FORMATS: Settings["format"][] = ["9:16", "16:9", "1:1"];
// 30 fps keeps the canvas in step with captureStream(30) and avoids redrawing on 120 Hz screens.
const FRAME_MS = 1000 / 30;
const HUD_MS = 200;

function CameraPage() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef(new TelemetryEngine());
  const live = useRef({
    gps: "searching" as GpsState,
    battery: null as number | null,
    recording: false,
    paused: false,
  });
  const settingsRef = useRef<Settings | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const records = useRef<RecordPoint[]>([]);
  const startedAt = useRef(0);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [format, setFormat] = useState<Settings["format"]>("9:16");
  const [state, setState] = useState<"idle" | "rec" | "paused" | "saving">("idle");
  const [camErr, setCamErr] = useState("");
  const [attempt, setAttempt] = useState(0);

  // settings + mic + gps + battery + wake lock (once)
  useEffect(() => {
    const s = loadSettings();
    settingsRef.current = s;
    setFormat(s.format);
    if (s.recordAudio)
      navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true } })
        .then((a) => (audioStream.current = a))
        .catch(() => {});
    const gid = navigator.geolocation?.watchPosition(
      (p) => {
        live.current.gps = gpsStateFromAccuracy(p.coords.accuracy);
        engine.current.addFix({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          alt: p.coords.altitude,
          accuracy: p.coords.accuracy,
          speed: p.coords.speed,
          t: p.timestamp,
        });
      },
      (e) => {
        live.current.gps = e.code === 1 ? "denied" : "searching";
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    const nb = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        addEventListener: (e: string, f: () => void) => void;
      }>;
    };
    nb.getBattery?.().then((b) => {
      live.current.battery = b.level;
      b.addEventListener("levelchange", () => (live.current.battery = b.level));
    });
    let lock: { release: () => Promise<void> } | null = null;
    const wl = (
      navigator as Navigator & {
        wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> };
      }
    ).wakeLock;
    wl?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    const sample = setInterval(() => {
      if (!engine.current.running) return;
      const sn = engine.current.snapshot(Date.now());
      records.current.push({
        elapsed: sn.elapsed,
        distance: sn.distance,
        pace: sn.pace,
        speed: sn.speed,
        elevation: sn.elevation,
        lat: sn.lat,
        lon: sn.lon,
        t: Date.now(),
      });
    }, 1000);
    return () => {
      if (gid != null) navigator.geolocation.clearWatch(gid);
      clearInterval(sample);
      lock?.release().catch(() => {});
      audioStream.current?.getTracks().forEach((t) => t.stop());
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    };
  }, []);

  // camera stream (restarts on flip)
  useEffect(() => {
    let cancelled = false;
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setCamErr("A câmera exige uma conexão segura (HTTPS). Abra o PACE RUN pelo endereço https.");
      return;
    }
    setCamErr("");
    const s = settingsRef.current ?? loadSettings();
    const { w, h } = frameSize(format, s.resolution);
    // Ask only for what the canvas can actually show: a 720p dashboard does not need a 1080p
    // sensor stream, and oversized capture is the main source of dropped frames on phones.
    media
      .getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: Math.max(w, h) },
          height: { ideal: Math.min(w, h) },
          frameRate: { ideal: 30 },
        },
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        videoStream.current?.getTracks().forEach((t) => t.stop());
        videoStream.current = s;
        const v = videoRef.current!;
        v.srcObject = s;
        v.play().catch(() => {});
        setCamErr("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const denied =
          error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "SecurityError");
        setCamErr(
          denied
            ? "Permissão de câmera negada. Libere o acesso nas configurações do navegador e toque em tentar novamente."
            : "Não foi possível abrir a câmera. Feche outros apps que estejam usando a câmera e tente novamente.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [facing, attempt, format]);
  useEffect(() => () => videoStream.current?.getTracks().forEach((t) => t.stop()), []);

  // Render pipeline: the camera frame and the dashboard are composited on separate canvases.
  // The dashboard changes at most a few times per second, so it is painted to an offscreen canvas
  // at HUD_MS and only blitted per frame — that keeps text/gradient work out of the video path.
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;
    const s = settingsRef.current ?? loadSettings();
    const { w, h } = frameSize(format, s.resolution);
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";

    const hud = document.createElement("canvas");
    hud.width = w;
    hud.height = h;
    const hudCtx = hud.getContext("2d");
    if (!hudCtx) return;

    const mirror = facing === "user";
    const frameDue = createPacer(FRAME_MS);
    const hudDue = createPacer(HUD_MS);

    const paintHud = () => {
      hudCtx.clearRect(0, 0, w, h);
      drawHud(hudCtx, w, h, {
        snap: engine.current.snapshot(Date.now()),
        gps: live.current.gps,
        battery: live.current.battery,
        recording: live.current.recording,
        paused: live.current.paused,
        settings: settingsRef.current ?? s,
        blink: Math.floor(Date.now() / 500) % 2 === 0,
      });
    };
    const paintFrame = () => {
      drawCover(ctx, video, w, h, mirror);
      ctx.drawImage(hud, 0, 0);
    };

    paintHud();
    paintFrame();

    let raf = 0;
    const loop = (now: number) => {
      if (hudDue(now)) paintHud();
      if (frameDue(now)) paintFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [format, facing]);

  const startRec = () => {
    const mime = pickMime();
    if (!mime) {
      toast.error("Este navegador não suporta gravação de vídeo.");
      return;
    }
    const vs = canvasRef.current!.captureStream(30);
    audioStream.current?.getAudioTracks().forEach((t) => vs.addTrack(t));
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(vs, {
        mimeType: mime,
        videoBitsPerSecond: settingsRef.current?.bitrate ?? 8e6,
      });
    } catch {
      toast.error("Este navegador não conseguiu iniciar a gravação.");
      return;
    }
    chunks.current = [];
    records.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onerror = () => {
      toast.error("A gravação foi interrompida pelo navegador.");
      live.current.recording = false;
      setState("idle");
    };
    r.start(1000);
    recorder.current = r;
    startedAt.current = Date.now();
    engine.current = new TelemetryEngine();
    engine.current.start(Date.now());
    live.current.recording = true;
    live.current.paused = false;
    setState("rec");
  };
  const pause = () => {
    recorder.current?.pause();
    engine.current.pause(Date.now());
    live.current.paused = true;
    setState("paused");
  };
  const resume = () => {
    recorder.current?.resume();
    engine.current.start(Date.now());
    live.current.paused = false;
    setState("rec");
  };
  const finish = async () => {
    const r = recorder.current;
    if (!r) return;
    setState("saving");
    const now = Date.now();
    engine.current.pause(now);
    const snap = engine.current.snapshot(now);
    const thumb = (() => {
      const t = document.createElement("canvas");
      const src = canvasRef.current!;
      t.width = 360;
      t.height = Math.round((360 * src.height) / src.width);
      t.getContext("2d")!.drawImage(src, 0, 0, t.width, t.height);
      return t.toDataURL("image/jpeg", 0.75);
    })();
    await new Promise<void>((res) => {
      r.onstop = () => res();
      r.stop();
    });
    live.current.recording = false;
    const mime = r.mimeType || pickMime();
    const blob = new Blob(chunks.current, { type: mime.split(";")[0] ?? "video/webm" });
    const s = settingsRef.current!;
    const a = {
      id: crypto.randomUUID(),
      type: s.activity,
      startedAt: startedAt.current,
      finishedAt: now,
      distance: snap.distance,
      duration: snap.elapsed,
      avgPace: snap.avgPace,
      avgSpeed: snap.avgSpeed,
      maxSpeed: snap.maxSpeed,
      elevationGain: snap.elevationGain,
      mime: blob.type,
      format,
      thumb,
      records: records.current,
    };
    try {
      await saveActivity(a, blob);
    } catch {
      toast.error("Sem espaço no aparelho para salvar o vídeo. Libere espaço e grave novamente.");
      setState("idle");
      return;
    }
    if (s.cloudSync)
      syncActivity(a).then((ok) => {
        if (ok) void updateActivity({ ...a, synced: true });
      });
    toast.success("Atividade salva na galeria");
    nav({ to: "/galeria/$id", params: { id: a.id } });
  };

  const busy = state !== "idle";
  const btn =
    "grid h-12 w-12 place-items-center rounded-full bg-glass text-foreground backdrop-blur disabled:opacity-30";
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      {/* Kept visible-but-invisible: a display:none video can stop producing frames. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <canvas ref={canvasRef} className="h-full w-full object-contain" />
      {camErr && (
        <div className="absolute inset-x-6 top-1/3 space-y-3 rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{camErr}</p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" /> TENTAR NOVAMENTE
          </button>
        </div>
      )}
      <div className="absolute left-[max(0.75rem,env(safe-area-inset-left))] top-1/2 flex -translate-y-1/2 flex-col gap-3">
        <Link to="/preparar" disabled={busy} className={btn} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button
          className={btn}
          disabled={busy}
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          aria-label="Alternar câmera"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
        <button
          className={`${btn} text-[10px] font-bold`}
          disabled={busy}
          onClick={() => setFormat((f) => FORMATS[(FORMATS.indexOf(f) + 1) % 3]!)}
          aria-label="Enquadramento"
        >
          <span className="flex flex-col items-center">
            <Crop className="h-4 w-4" />
            {format}
          </span>
        </button>
      </div>
      <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-1/2 flex -translate-y-1/2 flex-col items-center gap-4">
        {state === "idle" && (
          <button
            onClick={startRec}
            aria-label="Gravar"
            className="grid h-20 w-20 place-items-center rounded-full border-4 border-foreground bg-glass"
          >
            <span className="h-14 w-14 rounded-full bg-rec" />
          </button>
        )}
        {(state === "rec" || state === "paused") && (
          <>
            <button
              onClick={state === "rec" ? pause : resume}
              className={`${btn} h-16 w-16`}
              aria-label={state === "rec" ? "Pausar" : "Retomar"}
            >
              {state === "rec" ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
            </button>
            <button
              onClick={finish}
              className="grid h-16 w-16 place-items-center rounded-full bg-rec text-foreground"
              aria-label="Finalizar"
            >
              <Square className="h-6 w-6 fill-current" />
            </button>
          </>
        )}
        {state === "saving" && (
          <span className="rounded-full bg-glass px-4 py-2 text-sm">Salvando…</span>
        )}
      </div>
    </div>
  );
}
