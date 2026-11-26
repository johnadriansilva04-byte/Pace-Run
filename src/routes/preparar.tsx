import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  MapPin,
  Gauge,
  Mic,
  Check,
  Loader2,
  Minus,
  ShieldCheck,
  X,
} from "lucide-react";
import { Header } from "@/components/pace/Header";
import { gpsStateFromAccuracy, type GpsState } from "@/lib/telemetry";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/preparar")({
  head: () => ({
    meta: [
      { title: "Preparar atividade — PACE RUN" },
      { name: "description", content: "Verifique câmera, GPS e sensores antes de gravar." },
      { property: "og:title", content: "Preparar atividade — PACE RUN" },
      { property: "og:description", content: "Câmera, GPS e sensores prontos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Prep,
});

type St = "idle" | "wait" | "ok" | "fail";
type GpsUi = GpsState | "idle";

const gpsLabel: Record<GpsUi, string> = {
  idle: "Ainda não verificado",
  searching: "Procurando sinal…",
  weak: "Sinal fraco",
  ok: "GPS conectado",
  denied: "Permissão negada",
  unavailable: "GPS indisponível",
};

function Row({
  icon: Icon,
  label,
  st,
  detail,
}: {
  icon: typeof Camera;
  label: string;
  st: St;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <Icon className="h-6 w-6 text-primary" />
      <div className="flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-muted-foreground">{detail}</div>
      </div>
      {st === "wait" ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : st === "ok" ? (
        <Check className="h-5 w-5 text-primary" />
      ) : st === "fail" ? (
        <X className="h-5 w-5 text-destructive" />
      ) : (
        <Minus className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

function Prep() {
  const [settings, update] = useSettings();
  const [cam, setCam] = useState<St>("idle");
  const [mic, setMic] = useState<St>("idle");
  const [gps, setGps] = useState<GpsUi>("idle");
  const [acc, setAcc] = useState<number | null>(null);
  const [sensors, setSensors] = useState("Aguardando sua verificação");
  const [checking, setChecking] = useState(false);
  const watchId = useRef<number | null>(null);

  // Permissions are requested only after an explicit tap: installing the app never opens
  // the camera or the GPS.
  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    };
  }, []);

  const watchGps = () => {
    if (!navigator.geolocation) {
      setGps("unavailable");
      return;
    }
    if (watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setAcc(p.coords.accuracy);
        setGps(gpsStateFromAccuracy(p.coords.accuracy));
      },
      (e) => setGps(e.code === 1 ? "denied" : "searching"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  const verify = async () => {
    setChecking(true);
    setCam("wait");
    setMic("wait");
    watchGps();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("fail");
      setMic("fail");
      setChecking(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      setCam("ok");
      setMic(stream.getAudioTracks().length ? "ok" : "fail");
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCam("ok");
        setMic("fail");
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setCam("fail");
        setMic("fail");
      }
    }

    const parts: string[] = [];
    if ("DeviceMotionEvent" in window) parts.push("acelerômetro");
    if ("getBattery" in navigator) parts.push("bateria");
    setSensors(
      parts.length ? `Disponível: ${parts.join(", ")}. Altitude via GPS.` : "Altitude via GPS.",
    );
    setChecking(false);
  };

  // O GPS é desejável, não pré-requisito: quem negou a localização (ou está num aparelho
  // sem GPS) ainda consegue gravar o vídeo — o painel avisa que os números não vão andar.
  const gpsOk = gps === "ok" || gps === "weak";
  const ready = cam === "ok";
  const verified = cam !== "idle" || gps !== "idle";
  const types = [
    ["corrida", "Corrida"],
    ["caminhada", "Caminhada"],
    ["pedal", "Pedal"],
  ] as const;

  return (
    <div className="min-h-dvh bg-hero">
      <Header />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
        <Link to="/inicio" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Início
        </Link>
        <h1 className="font-display text-3xl font-bold">Preparação</h1>
        <div className="grid grid-cols-3 gap-2">
          {types.map(([value, label]) => (
            <button
              key={value}
              onClick={() => update({ activity: value })}
              className={`rounded-lg border px-3 py-3 font-display font-semibold ${
                settings.activity === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Row
          icon={Camera}
          label="Câmera"
          st={cam}
          detail={
            cam === "fail"
              ? "Não foi possível abrir. Permita a câmera nas configurações do navegador e tente de novo."
              : cam === "ok"
                ? "Pronta (teste encerrado, câmera desligada)"
                : cam === "wait"
                  ? "Solicitando permissão…"
                  : "Aguardando sua verificação"
          }
        />
        <Row
          icon={MapPin}
          label="GPS"
          st={
            gps === "ok" || gps === "weak"
              ? "ok"
              : gps === "searching"
                ? "wait"
                : gps === "idle"
                  ? "idle"
                  : "fail"
          }
          detail={`${gpsLabel[gps]}${acc ? ` · precisão ${Math.round(acc)} m` : ""}`}
        />
        <Row
          icon={Mic}
          label="Microfone"
          st={mic}
          detail={
            mic === "fail"
              ? "O vídeo será gravado sem áudio"
              : mic === "ok"
                ? "Pronto"
                : mic === "wait"
                  ? "Verificando…"
                  : "Aguardando sua verificação"
          }
        />
        <Row icon={Gauge} label="Sensores" st={verified ? "ok" : "idle"} detail={sensors} />
        <p className="text-sm text-muted-foreground">
          Nada é gravado aqui. A câmera abre apenas durante a verificação e é desligada em seguida.
        </p>

        {!ready && (
          <button
            onClick={verify}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-4 font-display text-lg font-bold tracking-wider text-primary disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            {verified ? "VERIFICAR NOVAMENTE" : "VERIFICAR CÂMERA, GPS E MICROFONE"}
          </button>
        )}

        <Link
          to="/camera"
          disabled={!ready}
          className={`block rounded-lg py-4 text-center font-display text-lg font-bold tracking-wider ${
            ready
              ? "bg-primary text-primary-foreground shadow-glow"
              : "pointer-events-none bg-muted text-muted-foreground"
          }`}
        >
          {ready
            ? gpsOk
              ? "ABRIR CÂMERA ESPORTIVA"
              : "ABRIR CÂMERA (SEM GPS)"
            : "VERIFIQUE A CÂMERA PARA CONTINUAR"}
        </Link>
        {gps === "weak" && (
          <p className="text-center text-xs text-accent">
            Sinal fraco: vá para um lugar aberto para mais precisão.
          </p>
        )}
        {cam === "ok" && !gpsOk && (
          <p className="text-center text-xs text-accent">
            Sem GPS: o vídeo grava normalmente, mas distância, pace e velocidade ficam zerados até o
            sinal voltar.
          </p>
        )}
        <p className="pb-safe text-center text-xs text-muted-foreground">
          A gravação só começa quando você apertar REC.
        </p>
      </main>
    </div>
  );
}
