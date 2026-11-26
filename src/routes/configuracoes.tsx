import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/pace/Header";
import { useSettings, type Settings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações — PACE CAM" }, { name: "description", content: "Unidades, indicadores e qualidade de gravação." },
    { property: "og:title", content: "Configurações — PACE CAM" }, { property: "og:description", content: "Ajuste o PACE CAM." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Config,
});

const labels: Record<keyof Settings["show"], string> = { distance: "Distância", pace: "Pace", avgPace: "Pace médio", speed: "Velocidade", time: "Tempo", elevation: "Elevação", gain: "Ganho de elevação" };

function Config() {
  const [s, up] = useSettings();
  const opt = "rounded-lg border px-3 py-2 text-sm";
  const on = (b: boolean) => `${opt} ${b ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`;
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Configurações</h1>
        <section className="space-y-2"><h2 className="font-semibold">Unidades</h2>
          <div className="flex gap-2">{(["km", "mi"] as const).map((u) => <button key={u} className={on(s.unit === u)} onClick={() => up({ unit: u })}>{u === "km" ? "Quilômetros" : "Milhas"}</button>)}</div></section>
        <section className="space-y-2"><h2 className="font-semibold">Indicadores visíveis</h2>
          <div className="flex flex-wrap gap-2">{(Object.keys(labels) as (keyof Settings["show"])[]).map((k) => <button key={k} className={on(s.show[k])} onClick={() => up({ show: { ...s.show, [k]: !s.show[k] } })}>{labels[k]}</button>)}</div></section>
        <section className="space-y-2"><h2 className="font-semibold">Formato e resolução</h2>
          <div className="flex flex-wrap gap-2">{(["9:16", "16:9", "1:1"] as const).map((f) => <button key={f} className={on(s.format === f)} onClick={() => up({ format: f })}>{f}</button>)}
          {([720, 1080] as const).map((r) => <button key={r} className={on(s.resolution === r)} onClick={() => up({ resolution: r })}>{r}p</button>)}</div></section>
        <section className="space-y-2"><h2 className="font-semibold">Qualidade</h2>
          <div className="flex gap-2">{[[4e6, "Econômica"], [8e6, "Alta"], [14e6, "Máxima"]].map(([b, l]) => <button key={l} className={on(s.bitrate === b)} onClick={() => up({ bitrate: b as number })}>{l}</button>)}</div></section>
        <section className="space-y-2"><h2 className="font-semibold">Áudio e armazenamento</h2>
          <div className="flex flex-wrap gap-2">
            <button className={on(s.recordAudio)} onClick={() => up({ recordAudio: !s.recordAudio })}>Gravar áudio original</button>
            <button className={on(s.cloudSync)} disabled={!supabase} onClick={() => up({ cloudSync: !s.cloudSync })}>Sincronizar com a nuvem</button>
          </div>
          <p className="text-xs text-muted-foreground">Vídeos ficam salvos no aparelho. {supabase ? "Nuvem configurada." : "Nuvem não configurada (defina as variáveis do Supabase)."}</p></section>
      </main>
    </div>
  );
}
