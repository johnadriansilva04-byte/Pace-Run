import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Camera,
  Images,
  MapPin,
  Maximize2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Header } from "@/components/pace/Header";
import { DemoDash } from "@/components/pace/DemoDash";
import { InstallButton, InstallSection } from "@/components/pace/Install";
import { isInstalled } from "@/lib/pwa";

const highlights = [
  { icon: Smartphone, title: "Abre pelo ícone", text: "Tela cheia, sem barra de navegação." },
  { icon: ShieldCheck, title: "Sem permissões na instalação", text: "Câmera e GPS só ao iniciar." },
  { icon: WifiOff, title: "Essencial offline", text: "Interface e ícones ficam no cache." },
];

const steps = [
  {
    icon: MapPin,
    title: "Prepare a câmera",
    text: "Confira câmera, GPS e microfone antes de começar.",
  },
  {
    icon: Camera,
    title: "Registre o percurso",
    text: "Toque em REC: o painel é gravado junto com a imagem.",
  },
  {
    icon: Images,
    title: "Guarde e compartilhe",
    text: "Vídeos com telemetria na galeria do aparelho.",
  },
];

export function Landing() {
  // An installed app must never land on the install page: the icon opens /inicio and any
  // navigation to / in standalone mode bounces there.
  useEffect(() => {
    if (isInstalled()) window.location.replace("/inicio");
  }, []);

  return (
    <div className="min-h-dvh bg-hero">
      <Header logoTo="/" />
      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-10 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-display text-xs tracking-widest text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rec" /> APLICATIVO INSTALÁVEL ·
              ANDROID + CHROME
            </p>
            <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-6xl">
              SEU PERCURSO.
              <br />
              SEUS NÚMEROS.
              <br />
              <span className="text-speed">SUA HISTÓRIA.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              O PACE RUN grava suas corridas, caminhadas e pedais com distância, pace, velocidade e
              elevação direto no vídeo — e vive no seu celular como um aplicativo.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <InstallButton />
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-6 py-4 font-display font-bold tracking-wider text-foreground hover:bg-muted"
              >
                VER DEMONSTRAÇÃO
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Já instalou?{" "}
              <Link to="/inicio" className="text-primary underline underline-offset-4">
                abrir o aplicativo
              </Link>
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-xl border border-border bg-card/60 p-3">
                  <Icon className="mb-2 h-5 w-5 text-primary" />
                  <div className="font-display text-sm font-bold">{title}</div>
                  <div className="text-xs text-muted-foreground">{text}</div>
                </li>
              ))}
            </ul>
          </div>

          <div id="demo" className="relative mx-auto w-full max-w-[340px] scroll-mt-24">
            <div className="absolute -inset-8 rounded-[3rem] bg-speed opacity-20 blur-3xl" />
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2.2rem] border-[6px] border-secondary bg-card shadow-glow">
              <DemoDash />
              <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-glass px-3 py-1 font-display text-[10px] tracking-widest text-foreground backdrop-blur">
                DEMONSTRAÇÃO
              </span>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Câmera + telemetria, exatamente como aparece no vídeo gravado.
              <br />
              Nenhuma câmera é acessada nesta página.
            </p>
          </div>
        </section>

        <section className="speed-lines grid gap-5 rounded-2xl border border-border bg-card/60 p-6 md:grid-cols-3 md:p-10">
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

        <div className="py-10">
          <InstallSection />
        </div>

        <section className="grid gap-5 rounded-2xl border border-border bg-card/60 p-6 pb-8 md:grid-cols-2 md:p-10">
          <div>
            <h2 className="flex items-center gap-2 font-display text-sm tracking-widest text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> O QUE O APP FAZ
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Telemetria desenhada no quadro e gravada no arquivo final.</li>
              <li>GPS de alta precisão com filtro de ruído e distância acumulada.</li>
              <li>Painel configurável: pace, velocidade, distância, tempo e elevação.</li>
              <li>Galeria local com reprodução, download e compartilhamento.</li>
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-display text-sm tracking-widest text-muted-foreground">
              <Maximize2 className="h-4 w-4 text-accent" /> COMPATIBILIDADE
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">Prioridade:</span> Android com Chrome, instalado
                pelo botão INSTALAR PACE RUN.
              </li>
              <li>
                <span className="text-foreground">iPhone e iPad:</span> instalação pelo Safari
                (Compartilhar → Adicionar à Tela de Início).
              </li>
              <li>
                <span className="text-foreground">Vídeo:</span> o formato depende do navegador — MP4
                quando houver suporte, WebM como alternativa.
              </li>
              <li>
                <span className="text-foreground">Câmera, GPS e gravação:</span> dependem do
                aparelho e da permissão concedida no momento da atividade.
              </li>
            </ul>
          </div>
        </section>

        <footer className="flex flex-col items-center gap-2 py-10 text-center text-xs text-muted-foreground">
          <span className="font-display text-sm tracking-widest text-foreground">PACE RUN</span>
          <span>Instalável · Android + Chrome · iPhone/iPad via Safari</span>
        </footer>
      </main>
    </div>
  );
}
