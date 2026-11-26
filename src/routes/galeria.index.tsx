import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/pace/Header";
import { listActivities, type Activity } from "@/lib/gallery";
import { formatDistance, formatDuration, formatPace } from "@/lib/telemetry";

export const Route = createFileRoute("/galeria/")({
  head: () => ({ meta: [
    { title: "Minha galeria — PACE CAM" }, { name: "description", content: "Suas atividades gravadas." },
    { property: "og:title", content: "Minha galeria — PACE CAM" }, { property: "og:description", content: "Vídeos com telemetria." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Gallery,
});

function Gallery() {
  const [items, setItems] = useState<Activity[] | null>(null);
  useEffect(() => { listActivities().then(setItems); }, []);
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">MINHA GALERIA</h1>
        {items && items.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="mb-4 text-muted-foreground">Nenhuma gravação ainda.</p>
            <Link to="/preparar" className="rounded-lg bg-primary px-6 py-3 font-display font-bold text-primary-foreground">INICIAR ATIVIDADE</Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items?.map((a) => (
            <Link key={a.id} to="/galeria/$id" params={{ id: a.id }} className="overflow-hidden rounded-xl border border-border bg-card hover:border-primary">
              <img src={a.thumb} alt="" className="aspect-[3/4] w-full object-cover" />
              <div className="p-3 text-sm">
                <div className="font-display font-bold capitalize">{a.type} · {formatDistance(a.distance)} km</div>
                <div className="text-muted-foreground">{new Date(a.startedAt).toLocaleDateString("pt-BR")} · {formatDuration(a.duration)} · {formatPace(a.avgPace)}/km</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
