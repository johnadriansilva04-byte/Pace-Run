import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Award, Flame, MapPin, Timer, Trophy } from "lucide-react";
import { Header } from "@/components/pace/Header";
import { listActivities, type Activity } from "@/lib/gallery";
import { loadSettings } from "@/lib/settings";
import { formatDistance, formatDuration, formatPace } from "@/lib/telemetry";
import { computeBadges, computeStats, toPacePerKm, type Badge, type Unit } from "@/lib/rewards";

export const Route = createFileRoute("/conquistas")({
  head: () => ({
    meta: [
      { title: "Conquistas — PACE RUN" },
      { name: "description", content: "Medalhas, recordes e sequência de dias do PACE RUN." },
      { property: "og:title", content: "Conquistas — PACE RUN" },
      {
        property: "og:description",
        content: "O que você já conquistou, calculado das suas atividades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rewards,
});

const GROUP_TITLES: Record<Badge["group"], string> = {
  distancia: "Distância acumulada",
  atividades: "Constância",
  sequencia: "Sequência de dias",
  percurso: "Um único percurso",
};

function Stat({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <p className="text-[11px] tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function BadgeCard({ badge, unit }: { badge: Badge; unit: Unit }) {
  const current =
    badge.group === "atividades" || badge.group === "sequencia"
      ? String(badge.current)
      : formatDistance(badge.current, unit);
  const target =
    badge.group === "atividades" || badge.group === "sequencia"
      ? String(badge.target)
      : formatDistance(badge.target, unit);
  return (
    <div
      className={`rounded-xl border p-3 ${
        badge.unlocked ? "border-primary/60 bg-primary/5" : "border-border bg-card opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{badge.title}</p>
        {badge.unlocked ? (
          <Trophy className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {current}/{target}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{badge.detail}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-speed"
          style={{ width: `${Math.round(badge.progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Rewards() {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [unit, setUnit] = useState<Unit>("km");
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    setUnit(loadSettings().unit);
    listActivities()
      .then(setItems)
      .catch(() => {
        // Sem IndexedDB (modo privado, armazenamento bloqueado) não há histórico: avisa em vez
        // de deixar a página em branco.
        setStorageError(true);
        setItems([]);
      });
  }, []);

  const view = useMemo(() => {
    if (!items) return null;
    const stats = computeStats(items);
    const badges = computeBadges(stats, unit);
    const distanceBadges = badges.filter((b) => b.group === "distancia");
    const next = distanceBadges.find((b) => !b.unlocked) ?? null;
    return { stats, badges, next };
  }, [items, unit]);

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">CONQUISTAS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo aqui é calculado das atividades gravadas neste aparelho. Nada é enviado para fora.
        </p>

        {storageError && (
          <p className="mt-6 rounded-xl border border-destructive/60 bg-card p-4 text-sm text-muted-foreground">
            Este navegador não está deixando o PACE RUN ler o armazenamento local (modo privado ou
            armazenamento bloqueado). As conquistas aparecem quando o armazenamento funcionar.
          </p>
        )}
        {items && items.length === 0 && !storageError && (
          <div className="mt-8 rounded-xl border border-border bg-card p-10 text-center">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="text-muted-foreground">
              A primeira medalha aparece depois da primeira atividade.
            </p>
            <Link
              to="/preparar"
              className="mt-5 inline-block rounded-lg bg-primary px-6 py-3 font-display font-bold text-primary-foreground"
            >
              INICIAR ATIVIDADE
            </Link>
          </div>
        )}

        {view && items && items.length > 0 && (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat
                icon={MapPin}
                label="DISTÂNCIA TOTAL"
                value={`${formatDistance(view.stats.totalDistance, unit)} ${unit}`}
              />
              <Stat icon={Award} label="ATIVIDADES" value={String(view.stats.activities)} />
              <Stat icon={Flame} label="DIAS SEGUIDOS" value={String(view.stats.streakDays)} />
              <Stat
                icon={Timer}
                label={`MELHOR PARCIAL (1 ${unit})`}
                value={
                  view.stats.bestSplitSeconds == null
                    ? "--:--"
                    : formatPace(toPacePerKm(view.stats.bestSplitSeconds, unit), unit)
                }
              />
            </section>

            {view.next && (
              <section className="mt-6 rounded-xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-sm tracking-wider text-primary">
                    PRÓXIMO OBJETIVO
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(view.next.current, unit)} de{" "}
                    {formatDistance(view.next.target, unit)} {unit}
                  </p>
                </div>
                <p className="mt-1 text-lg font-semibold">{view.next.title}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-speed"
                    style={{ width: `${Math.round(view.next.progress * 100)}%` }}
                  />
                </div>
              </section>
            )}

            {(["distancia", "percurso", "atividades", "sequencia"] as const).map((group) => (
              <section key={group} className="mt-8">
                <h2 className="font-display text-sm tracking-widest text-muted-foreground">
                  {GROUP_TITLES[group].toUpperCase()}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {view.badges
                    .filter((b) => b.group === group)
                    .map((badge) => (
                      <BadgeCard key={badge.id} badge={badge} unit={unit} />
                    ))}
                </div>
              </section>
            ))}

            <section className="mt-8 rounded-xl border border-border bg-card p-4">
              <h2 className="font-display text-sm tracking-widest text-muted-foreground">
                RECORDES PESSOAIS
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Maior distância em uma atividade</span>
                  <span className="font-display font-bold">
                    {formatDistance(view.stats.longestDistance, unit)} {unit}
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Melhor pace médio</span>
                  <span className="font-display font-bold">
                    {view.stats.bestAvgPace == null
                      ? "--:--"
                      : `${formatPace(view.stats.bestAvgPace, unit)}/${unit}`}
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Tempo total em movimento</span>
                  <span className="font-display font-bold">
                    {formatDuration(view.stats.totalDuration)}
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Elevação acumulada</span>
                  <span className="font-display font-bold">
                    +{Math.round(view.stats.totalElevation)} m
                  </span>
                </li>
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
