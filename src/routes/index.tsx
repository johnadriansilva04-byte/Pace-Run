import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Images, MapPin, Share2, Play } from "lucide-react";
import { Header } from "@/components/pace/Header";
import { DemoDash } from "@/components/pace/DemoDash";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PACE CAM — Seu percurso. Seus números. Sua história." },
      { name: "description", content: "Grave corridas, caminhadas e pedais com um painel de telemetria ao vivo gravado direto no vídeo." },
      { property: "og:title", content: "PACE CAM" },
      { property: "og:description", content: "Câmera esportiva com distância, pace, velocidade e elevação no vídeo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: MapPin, t: "Prepare sua câmera", d: "GPS, câmera e sensores verificados antes de começar." },
  { icon: Camera, t: "Registre seu percurso", d: "Aperte REC. O painel grava junto com a imagem." },
  { icon: Share2, t: "Compartilhe seu desempenho", d: "Vídeo pronto para Instagram, TikTok e WhatsApp." },
];

function Index() {
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-display text-xs tracking-widest text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rec" /> TELEMETRIA AO VIVO
            </p>
            <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-7xl">
              Seu percurso.<br />Seus números.<br /><span className="text-speed">Sua história.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Transforme suas corridas e aventuras em vídeos com dados reais de desempenho, capturados ao vivo enquanto você se movimenta.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/preparar" className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-4 font-display text-lg font-bold tracking-wider text-primary-foreground shadow-glow transition hover:scale-[1.02]">
                <Play className="h-5 w-5 fill-current" /> INICIAR ATIVIDADE
              </Link>
              <Link to="/galeria" className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-7 py-4 font-display text-lg font-bold tracking-wider hover:bg-muted">
                <Images className="h-5 w-5" /> MINHA GALERIA
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[340px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-speed opacity-20 blur-3xl" />
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2.2rem] border-[6px] border-secondary bg-card shadow-glow">
              <DemoDash />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Demonstração do painel</p>
          </div>
        </section>
        <section className="speed-lines grid gap-4 rounded-2xl border border-border bg-card/60 p-6 pb-8 md:grid-cols-3 md:p-10">
          <h2 className="font-display text-sm tracking-widest text-muted-foreground md:col-span-3">COMO FUNCIONA</h2>
          {steps.map((s, i) => (
            <div key={s.t} className="flex gap-4">
              <span className="font-display text-5xl font-bold text-primary/30">{i + 1}</span>
              <div>
                <s.icon className="mb-2 h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </section>
        <footer className="py-10 text-center text-xs text-muted-foreground">PACE CAM</footer>
      </main>
    </div>
  );
}
