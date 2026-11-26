import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, MapPin, Gauge, Mic, Check, Loader2, X } from "lucide-react";
import { Header } from "@/components/pace/Header";
import { gpsStateFromAccuracy, type GpsState } from "@/lib/telemetry";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/preparar")({
  head: () => ({ meta: [
    { title: "Preparar atividade — PACE CAM" }, { name: "description", content: "Verifique câmera, GPS e sensores antes de gravar." },
    { property: "og:title", content: "Preparar atividade — PACE CAM" }, { property: "og:description", content: "Câmera, GPS e sensores prontos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Prep,
});

type St = "wait" | "ok" | "fail";
const gpsLabel: Record<GpsState, string> = { searching: "Procurando sinal…", weak: "Sinal fraco", ok: "GPS conectado", denied: "Permissão negada", unavailable: "GPS indisponível" };

function Row({ icon: I, label, st, detail }: { icon: typeof Camera; label: string; st: St; detail: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <I className="h-6 w-6 text-primary" />
      <div className="flex-1"><div className="font-semibold">{label}</div><div className="text-sm text-muted-foreground">{detail}</div></div>
      {st === "wait" ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : st === "ok" ? <Check className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-destructive" />}
    </div>
  );
}

function Prep() {
  const [settings, update] = useSettings();
  const [cam, setCam] = useState<St>("wait");
  const [mic, setMic] = useState<St>("wait");
  const [gps, setGps] = useState<GpsState>("searching");
  const [acc, setAcc] = useState<number | null>(null);
  const [sensors, setSensors] = useState("Verificando…");

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: true })
      .then((s) => { setCam("ok"); setMic(s.getAudioTracks().length ? "ok" : "fail"); s.getTracks().forEach((t) => t.stop()); })
      .catch(() => navigator.mediaDevices.getUserMedia({ video: true }).then((s) => { setCam("ok"); setMic("fail"); s.getTracks().forEach((t) => t.stop()); }).catch(() => { setCam("fail"); setMic("fail"); }));
    if (!navigator.geolocation) { setGps("unavailable"); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setAcc(p.coords.accuracy); setGps(gpsStateFromAccuracy(p.coords.accuracy)); },
      (e) => setGps(e.code === 1 ? "denied" : "searching"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    const parts: string[] = [];
    if ("DeviceMotionEvent" in window) parts.push("acelerômetro");
    if ("getBattery" in navigator) parts.push("bateria");
    setSensors(parts.length ? `Disponível: ${parts.join(", ")}. Altitude via GPS.` : "Altitude via GPS.");
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const ready = cam === "ok" && (gps === "ok" || gps === "weak");
  const types = [["corrida", "Corrida"], ["caminhada", "Caminhada"], ["pedal", "Pedal"]] as const;

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Início</Link>
        <h1 className="font-display text-3xl font-bold">Preparação</h1>
        <div className="grid grid-cols-3 gap-2">
          {types.map(([v, l]) => (
            <button key={v} onClick={() => update({ activity: v })} className={`rounded-lg border px-3 py-3 font-display font-semibold ${settings.activity === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{l}</button>
          ))}
        </div>
        <Row icon={Camera} label="Câmera" st={cam} detail={cam === "fail" ? "Permita o acesso à câmera no navegador" : cam === "ok" ? "Pronta" : "Solicitando permissão…"} />
        <Row icon={MapPin} label="GPS" st={gps === "ok" ? "ok" : gps === "weak" ? "ok" : gps === "searching" ? "wait" : "fail"} detail={`${gpsLabel[gps]}${acc ? ` · precisão ${Math.round(acc)} m` : ""}`} />
        <Row icon={Mic} label="Microfone" st={mic} detail={mic === "fail" ? "Vídeo será gravado sem áudio" : mic === "ok" ? "Pronto" : "Verificando…"} />
        <Row icon={Gauge} label="Sensores" st="ok" detail={sensors} />
        <p className="text-sm text-muted-foreground">Nada é gravado aqui. A gravação só começa quando você apertar REC.</p>
        <Link to="/camera" disabled={!ready} className={`block rounded-lg py-4 text-center font-display text-lg font-bold tracking-wider ${ready ? "bg-primary text-primary-foreground shadow-glow" : "pointer-events-none bg-muted text-muted-foreground"}`}>
          {ready ? "ABRIR CÂMERA ESPORTIVA" : "AGUARDANDO GPS E CÂMERA…"}
        </Link>
        {gps === "weak" && <p className="text-center text-xs text-accent">Sinal fraco: vá para um lugar aberto para mais precisão.</p>}
      </main>
    </div>
  );
}
