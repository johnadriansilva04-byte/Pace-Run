import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, Flame, Images, MapPin, Play, Share2, ShieldCheck, Trophy } from "lucide-react";
import { Header } from "@/components/pace/Header";
import { DemoDash } from "@/components/pace/DemoDash";
import { InstallButton } from "@/components/pace/Install";
import { useInstall } from "@/lib/pwa";
import { listActivities } from "@/lib/gallery";
import { loadSettings } from "@/lib/settings";
import { formatDistance } from "@/lib/telemetry";
import { computeStats, type Unit } from "@/lib/rewards";

const steps = [
  {
    icon: MapPin,
    title: "Verifique câmera e GPS",
    text: "Nada é acessado antes de você tocar em INICIAR ATIVIDADE.",
  },
  {
    icon: Camera,
    title: "Grave com o painel",
    text: "Aperte REC. A telemetria entra no vídeo.",
  },
  {
    icon: Share2,
    title: "Compartilhe",
    text: "Vídeo pronto para Instagram, TikTok e WhatsApp.",
  },
];

/**
 * Faixa de progresso do pesquisador. Só existe quando há atividade gravada — um
 * visitante novo não vê zeros, e quem já corre vê o que conquistou sem abrir nada.
 */
function ProgressStrip() {
  const [data, setData] = useState<{ distance: number; activities: number; streak: number } | null>(
    null,
  );
  const [unit, setUnit] = useState<Unit>("km");
  useEffect(() => {
    setUnit(loadSettings().unit);
    listActivities()
      .then((list) => {
        const stats = computeStats(list);
        setData({
          distance: stats.totalDistance,
          activities: stats.activities,
          streak: stats.streakDays,
        });
      })
      .catch(() => setData(null));
  }, []);
  if (!data || data.activities === 0) return null;
  return (
    <section className="mb-8 grid gap-3 rounded-2xl border border-border bg-card/60 p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
      <div>
        <p className="text-[11px] tracking-wider text-muted-foreground">DISTÂNCIA TOTAL</p>
        <p className="font-display text-2xl font-bold">
          {formatDistance(data.distance, unit)} {unit}
        </p>
      </div>
      <div>
        <p className="text-[11px] tracking-wider text-muted-foreground">ATIVIDADES</p>
        <p className="font-display text-2xl font-bold">{data.activities}</p>
      </div>
      <div>
        <p className="flex items-center gap-1 text-[11px] tracking-wider text-muted-foreground">
          <Flame className="h-3 w-3 text-primary" /> DIAS SEGUIDOS
        </p>
        <p className="font-display text-2xl font-bold">{data.streak}</p>
      </div>
      <Link
        to="/conquistas"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-5 py-3 font-display text-sm font-bold"
      >
        <Trophy className="h-4 w-4 text-primary" /> CONQUISTAS
      </Link>
    </section>
  );
}

function InstallBanner() {
  const { installed } = useInstall();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || installed) return null;
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-display text-sm font-bold tracking-wider">INSTALE O PACE RUN</p>
        <p className="text-xs text-muted-foreground">
          Abra pelo ícone, em tela cheia, sem a barra do navegador.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <InstallButton size="md" />
        <Link to="/" className="text-xs text-muted-foreground underline underline-offset-4">
          como instalar
        </Link>
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-dvh bg-hero">
      <Header />
      <main className="mx-auto max-w-6xl px-4">
        <InstallBanner />
        <section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-display text-xs tracking-widest text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rec" /> TELEMETRIA AO VIVO
            </p>
            <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-7xl">
              PRONTO PARA
              <br />
              A PRÓXIMA
              <br />
              <span className="text-speed">ATIVIDADE?</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Corrida, caminhada ou pedal: o PACE RUN grava seu percurso com os números reais do
              desempenho dentro do vídeo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/preparar"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-4 font-display text-lg font-bold tracking-wider text-primary-foreground shadow-glow transition hover:scale-[1.02]"
              >
                <Play className="h-5 w-5 fill-current" /> INICIAR ATIVIDADE
              </Link>
              <Link
                to="/galeria"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-7 py-4 font-display text-lg font-bold tracking-wider hover:bg-muted"
              >
                <Images className="h-5 w-5" /> MINHA GALERIA
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Câmera e localização só são
              solicitadas depois que você inicia a atividade.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-[340px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-speed opacity-20 blur-3xl" />
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2.2rem] border-[6px] border-secondary bg-card shadow-glow">
              <DemoDash />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Demonstração do painel</p>
          </div>
        </section>
        <ProgressStrip />
        <section className="speed-lines grid gap-4 rounded-2xl border border-border bg-card/60 p-6 pb-8 md:grid-cols-3 md:p-10">
          <h2 className="font-display text-sm tracking-widest text-muted-foreground md:col-span-3">
            COMO FUNCIONA
          </h2>
          {steps.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className="flex gap-4">
              <span className="font-display text-5xl font-bold text-primary/30">{index + 1}</span>
              <div>
                <Icon className="mb-2 h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </section>
        <footer className="py-10 text-center text-xs text-muted-foreground">PACE RUN</footer>
      </main>
    </div>
  );
}
