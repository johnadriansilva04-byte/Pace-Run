import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import { Header } from "@/components/pace/Header";
import { InstallButton } from "@/components/pace/Install";
import { useInstall } from "@/lib/pwa";
import { useSettings, type Settings } from "@/lib/settings";
import { cloudStatus, type CloudStatus } from "@/lib/supabase";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — PACE RUN" },
      { name: "description", content: "Unidades, indicadores e qualidade de gravação." },
      { property: "og:title", content: "Configurações — PACE RUN" },
      { property: "og:description", content: "Ajuste o PACE RUN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Config,
});

const labels: Record<keyof Settings["show"], string> = {
  distance: "Distância",
  pace: "Pace",
  avgPace: "Pace médio",
  speed: "Velocidade",
  time: "Tempo",
  elevation: "Elevação",
  gain: "Ganho de elevação",
};

function Config() {
  const [s, up] = useSettings();
  const { installed } = useInstall();
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  useEffect(() => {
    let alive = true;
    cloudStatus().then((c) => alive && setCloud(c));
    return () => {
      alive = false;
    };
  }, []);
  const cloudNote =
    cloud === null
      ? "Verificando a nuvem…"
      : cloud === "ready"
        ? "Nuvem pronta: a atividade sobe com login anônimo."
        : cloud === "login"
          ? "Nuvem configurada, mas o projeto Supabase está sem login anônimo (Authentication → Providers → Anonymous). Enquanto isso, tudo fica no aparelho."
          : "Nuvem não configurada (defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).";
  const opt = "rounded-lg border px-3 py-2 text-sm";
  const on = (b: boolean) =>
    `${opt} ${b ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`;
  return (
    <div className="min-h-dvh bg-hero">
      <Header />
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Configurações</h1>

        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Smartphone className="h-4 w-4 text-primary" /> Aplicativo
          </h2>
          <p className="text-sm text-muted-foreground">
            {installed
              ? "Você está usando o PACE RUN instalado."
              : "Instale para abrir em tela cheia, pelo ícone, sem a barra do navegador."}
          </p>
          {!installed && <InstallButton size="md" />}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Instalar não concede permissões: câmera e localização são pedidas apenas ao iniciar uma
            atividade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Unidades</h2>
          <div className="flex gap-2">
            {(["km", "mi"] as const).map((u) => (
              <button key={u} className={on(s.unit === u)} onClick={() => up({ unit: u })}>
                {u === "km" ? "Quilômetros" : "Milhas"}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Indicadores visíveis</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(labels) as (keyof Settings["show"])[]).map((k) => (
              <button
                key={k}
                className={on(s.show[k])}
                onClick={() => up({ show: { ...s.show, [k]: !s.show[k] } })}
              >
                {labels[k]}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Formato e resolução</h2>
          <div className="flex flex-wrap gap-2">
            {(["9:16", "16:9", "1:1"] as const).map((f) => (
              <button key={f} className={on(s.format === f)} onClick={() => up({ format: f })}>
                {f}
              </button>
            ))}
            {([720, 1080] as const).map((r) => (
              <button
                key={r}
                className={on(s.resolution === r)}
                onClick={() => up({ resolution: r })}
              >
                {r}p
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Qualidade</h2>
          <div className="flex gap-2">
            {[
              [4e6, "Econômica"],
              [8e6, "Alta"],
              [14e6, "Máxima"],
            ].map(([b, l]) => (
              <button
                key={l}
                className={on(s.bitrate === b)}
                onClick={() => up({ bitrate: b as number })}
              >
                {l}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Avisos durante a atividade</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={on(s.celebrations)}
              onClick={() => up({ celebrations: !s.celebrations })}
            >
              Km e recordes
            </button>
            <button className={on(s.sound)} onClick={() => up({ sound: !s.sound })}>
              Som dos avisos
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            A cada km (ou milha) o painel mostra PARABÉNS e toca um aviso; a parcial mais rápida até
            o momento aparece como RECORDE DE RITMO. Os avisos entram no vídeo gravado; o som sai
            apenas no alto-falante do aparelho.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Áudio e armazenamento</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={on(s.recordAudio)}
              onClick={() => up({ recordAudio: !s.recordAudio })}
            >
              Gravar áudio original
            </button>
            <button
              className={on(s.cloudSync)}
              disabled={cloud !== "ready"}
              onClick={() => up({ cloudSync: !s.cloudSync })}
            >
              Sincronizar com a nuvem
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Vídeos ficam salvos no aparelho. {cloudNote}
          </p>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />O formato do
            arquivo (MP4 ou WebM) depende do suporte de gravação do navegador no aparelho.
          </p>
        </section>
      </main>
    </div>
  );
}
