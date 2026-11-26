import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Share2, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/pace/Header";
import { deleteActivity, extFor, getActivity, getVideo, type Activity } from "@/lib/gallery";
import { formatDistance, formatDuration, formatPace, formatSpeed } from "@/lib/telemetry";
import { loadSettings } from "@/lib/settings";
import { splitsFromRecords, type Unit } from "@/lib/rewards";

export const Route = createFileRoute("/galeria/$id")({
  head: () => ({
    meta: [
      { title: "Atividade — PACE RUN" },
      { name: "description", content: "Reproduza e compartilhe sua atividade." },
      { property: "og:title", content: "Atividade — PACE RUN" },
      { property: "og:description", content: "Vídeo com telemetria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [a, setA] = useState<Activity | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [unit, setUnit] = useState<Unit>("km");

  useEffect(() => {
    setUnit(loadSettings().unit);
    getActivity(id).then((x) => setA(x ?? null));
    getVideo(id).then((b) => {
      if (b) {
        setBlob(b);
        setUrl(URL.createObjectURL(b));
      }
    });
  }, [id]);

  const splits = useMemo(() => (a ? splitsFromRecords(a.records, unit) : []), [a, unit]);

  if (!a)
    return (
      <div className="min-h-screen bg-hero">
        <Header />
        <p className="p-8 text-muted-foreground">Carregando…</p>
      </div>
    );

  const name = `pacerun-${new Date(a.startedAt).toISOString().slice(0, 10)}.${extFor(a.mime)}`;
  const speedUnit = unit === "mi" ? "mph" : "km/h";
  const share = async () => {
    if (!blob) return;
    const f = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [f] }))
      await navigator.share({ files: [f], title: "PACE RUN" }).catch(() => {});
    else toast("Compartilhamento não suportado aqui. Use Salvar.");
  };
  const stats: [string, string][] = [
    ["Distância", `${formatDistance(a.distance, unit)} ${unit}`],
    ["Duração", formatDuration(a.duration)],
    ["Pace médio", `${formatPace(a.avgPace, unit)}/${unit}`],
    ["Vel. média", `${formatSpeed(a.avgSpeed, unit)} ${speedUnit}`],
    ["Vel. máx.", `${formatSpeed(a.maxSpeed, unit)} ${speedUnit}`],
    ["Ganho elev.", `+${Math.round(a.elevationGain)} m`],
  ];

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1fr_320px]">
        <div>
          <Link
            to="/galeria"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Galeria
          </Link>
          {url && (
            <video
              src={url}
              controls
              playsInline
              className="max-h-[75vh] w-full rounded-xl bg-card"
            />
          )}
        </div>
        <aside className="space-y-3">
          <h1 className="font-display text-2xl font-bold capitalize">{a.type}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(a.startedAt).toLocaleString("pt-BR")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {stats.map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className="font-display text-lg font-bold">{v}</div>
              </div>
            ))}
          </div>

          {splits.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="font-display text-[11px] tracking-[0.18em] text-muted-foreground">
                PARCIAIS
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {splits.map((s) => (
                  <span
                    key={s.index}
                    className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="text-foreground">
                      {s.index} {unit}
                    </span>{" "}
                    {formatPace(s.paceSecPerKm, unit)}
                  </span>
                ))}
              </div>
              <Link
                to="/conquistas"
                className="mt-3 inline-flex items-center gap-2 text-xs text-primary underline underline-offset-4"
              >
                <Trophy className="h-3.5 w-3.5" /> VER CONQUISTAS
              </Link>
            </div>
          )}

          <button
            onClick={share}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display font-bold text-primary-foreground"
          >
            <Share2 className="h-4 w-4" /> COMPARTILHAR
          </button>
          <a
            href={url}
            download={name}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-3 font-display font-bold"
          >
            <Download className="h-4 w-4" /> SALVAR NO CELULAR
          </a>
          <button
            onClick={async () => {
              await deleteActivity(id);
              toast("Gravação excluída");
              nav({ to: "/galeria" });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive py-3 font-display font-bold text-destructive"
          >
            <Trash2 className="h-4 w-4" /> EXCLUIR
          </button>
        </aside>
      </main>
    </div>
  );
}
