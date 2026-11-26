import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/pace/Header";
import { deleteActivity, extFor, getActivity, getVideo, type Activity } from "@/lib/gallery";
import { formatDistance, formatDuration, formatPace, formatSpeed } from "@/lib/telemetry";

export const Route = createFileRoute("/galeria/$id")({
  head: () => ({ meta: [
    { title: "Atividade — PACE CAM" }, { name: "description", content: "Reproduza e compartilhe sua atividade." },
    { property: "og:title", content: "Atividade — PACE CAM" }, { property: "og:description", content: "Vídeo com telemetria." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [a, setA] = useState<Activity | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    getActivity(id).then((x) => setA(x ?? null));
    getVideo(id).then((b) => { if (b) { setBlob(b); setUrl(URL.createObjectURL(b)); } });
  }, [id]);
  if (!a) return <div className="min-h-screen bg-hero"><Header /><p className="p-8 text-muted-foreground">Carregando…</p></div>;
  const name = `pacecam-${new Date(a.startedAt).toISOString().slice(0, 10)}.${extFor(a.mime)}`;
  const share = async () => {
    if (!blob) return;
    const f = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: "PACE CAM" }).catch(() => {});
    else toast("Compartilhamento não suportado aqui. Use Salvar.");
  };
  const stats = [["Distância", `${formatDistance(a.distance)} km`], ["Duração", formatDuration(a.duration)], ["Pace médio", `${formatPace(a.avgPace)}/km`],
    ["Vel. média", `${formatSpeed(a.avgSpeed)} km/h`], ["Vel. máx.", `${formatSpeed(a.maxSpeed)} km/h`], ["Ganho elev.", `+${Math.round(a.elevationGain)} m`]];
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1fr_320px]">
        <div>
          <Link to="/galeria" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Galeria</Link>
          {url && <video src={url} controls playsInline className="max-h-[75vh] w-full rounded-xl bg-card" />}
        </div>
        <aside className="space-y-3">
          <h1 className="font-display text-2xl font-bold capitalize">{a.type}</h1>
          <p className="text-sm text-muted-foreground">{new Date(a.startedAt).toLocaleString("pt-BR")}</p>
          <div className="grid grid-cols-2 gap-2">
            {stats.map(([l, v]) => <div key={l} className="rounded-lg border border-border bg-card p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="font-display text-lg font-bold">{v}</div></div>)}
          </div>
          <button onClick={share} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display font-bold text-primary-foreground"><Share2 className="h-4 w-4" /> COMPARTILHAR</button>
          <a href={url} download={name} className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-3 font-display font-bold"><Download className="h-4 w-4" /> SALVAR NO CELULAR</a>
          <button onClick={async () => { await deleteActivity(id); toast("Gravação excluída"); nav({ to: "/galeria" }); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive py-3 font-display font-bold text-destructive"><Trash2 className="h-4 w-4" /> EXCLUIR</button>
        </aside>
      </main>
    </div>
  );
}
