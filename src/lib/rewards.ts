// Recompensas: o que o app devolve ao pesquisador depois do esforço.
//
// Tudo aqui é derivado das atividades já gravadas (nada de estado paralelo que possa
// divergir): sequência de dias, totais, parciais por km/milha, medalhas e comparação
// com o histórico. Funções puras para poderem ser testadas sem navegador.
import { formatDistance, formatDuration, formatPace, formatSpeed } from "./telemetry";
import type { Activity, RecordPoint } from "./gallery";

export type Unit = "km" | "mi";

export const UNIT_M: Record<Unit, number> = { km: 1000, mi: 1609.344 };

export type Split = { index: number; seconds: number; paceSecPerKm: number };

/** Converte segundos gastos em uma unidade para o pace em s/km que `formatPace` espera. */
export function toPacePerKm(secondsForUnit: number, unit: Unit): number {
  return unit === "mi" ? secondsForUnit / 1.609344 : secondsForUnit;
}

/**
 * Parciais por unidade. As amostras são de ~1 s, então o instante da virada é
 * interpolado entre duas amostras — sem isso o km fecharia sempre "no segundo cheio"
 * e a parcial sairia torta.
 */
export function splitsFromRecords(records: RecordPoint[], unit: Unit = "km"): Split[] {
  const unitM = UNIT_M[unit];
  if (records.length < 2) return [];
  const sorted = [...records].sort((a, b) => a.elapsed - b.elapsed);
  const out: Split[] = [];
  let target = unitM;
  let startT = sorted[0]!.elapsed;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    while (cur.distance >= target) {
      const span = cur.distance - prev.distance;
      const frac = span > 0 ? (target - prev.distance) / span : 0;
      const clamped = Math.min(1, Math.max(0, frac));
      const at = prev.elapsed + clamped * (cur.elapsed - prev.elapsed);
      const seconds = Math.round(at - startT);
      if (seconds > 0) {
        out.push({
          index: out.length + 1,
          seconds,
          paceSecPerKm: toPacePerKm(seconds, unit),
        });
      }
      startT = at;
      target += unitM;
    }
  }
  return out;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayKeyOf(date: Date): string {
  return dayKey(date.getTime());
}

/** Dias seguidos com pelo menos uma atividade, contando a partir de hoje (ou ontem). */
export function streakDays(activities: Activity[], now: number = Date.now()): number {
  const days = new Set(activities.map((a) => dayKey(a.startedAt)));
  if (days.size === 0) return 0;
  const cursor = new Date(now);
  // O dia de hoje só conta se já houve atividade; senão a sequência ainda está viva
  // até o fim do dia e a contagem começa em ontem.
  if (!days.has(dayKeyOf(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKeyOf(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type RewardStats = {
  activities: number;
  totalDistance: number;
  totalDuration: number;
  totalElevation: number;
  longestDistance: number;
  bestSplitSeconds: number | null;
  bestAvgPace: number | null;
  streakDays: number;
  lastActivityAt: number | null;
};

export function computeStats(activities: Activity[], now: number = Date.now()): RewardStats {
  if (activities.length === 0) {
    return {
      activities: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalElevation: 0,
      longestDistance: 0,
      bestSplitSeconds: null,
      bestAvgPace: null,
      streakDays: 0,
      lastActivityAt: null,
    };
  }
  let totalDistance = 0;
  let totalDuration = 0;
  let totalElevation = 0;
  let longestDistance = 0;
  let bestSplitSeconds: number | null = null;
  let bestAvgPace: number | null = null;
  let lastActivityAt = 0;
  for (const a of activities) {
    totalDistance += a.distance;
    totalDuration += a.duration;
    totalElevation += a.elevationGain ?? 0;
    longestDistance = Math.max(longestDistance, a.distance);
    lastActivityAt = Math.max(lastActivityAt, a.startedAt);
    if (a.avgPace != null && a.avgPace > 0 && (bestAvgPace == null || a.avgPace < bestAvgPace)) {
      bestAvgPace = a.avgPace;
    }
    const best = splitsFromRecords(a.records).reduce<number | null>(
      (min, s) => (min == null || s.seconds < min ? s.seconds : min),
      null,
    );
    if (best != null && (bestSplitSeconds == null || best < bestSplitSeconds))
      bestSplitSeconds = best;
  }
  return {
    activities: activities.length,
    totalDistance,
    totalDuration,
    totalElevation,
    longestDistance,
    bestSplitSeconds,
    bestAvgPace,
    streakDays: streakDays(activities, now),
    lastActivityAt: lastActivityAt || null,
  };
}

export type Badge = {
  id: string;
  group: "distancia" | "atividades" | "sequencia" | "percurso";
  title: string;
  /** Texto do critério, já formatado na unidade escolhida. */
  detail: string;
  unlocked: boolean;
  progress: number;
  current: number;
  target: number;
};

const DISTANCE_MILESTONES: Record<Unit, number[]> = {
  km: [5, 10, 21.1, 42.2, 100, 250, 500],
  mi: [3.1, 6.2, 13.1, 26.2, 50, 100, 200],
};
const ACTIVITY_MILESTONES = [1, 5, 15, 50];
const STREAK_MILESTONES = [3, 7, 30];
const LONGEST_MILESTONES: Record<Unit, number[]> = {
  km: [5, 10, 21.1, 42.2],
  mi: [3.1, 6.2, 13.1, 26.2],
};

/** "10 km", "21.1 km", "3.1 mi": a unidade decide as casas, não o número de metros. */
function milestoneText(value: number, unit: Unit): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

function badge(
  id: string,
  group: Badge["group"],
  title: string,
  detail: string,
  current: number,
  target: number,
): Badge {
  return {
    id,
    group,
    title,
    detail,
    current,
    target,
    unlocked: current >= target,
    progress: target > 0 ? Math.min(1, current / target) : 0,
  };
}

export function computeBadges(stats: RewardStats, unit: Unit = "km"): Badge[] {
  const out: Badge[] = [];
  for (const value of DISTANCE_MILESTONES[unit]) {
    const target = value * UNIT_M[unit];
    out.push(
      badge(
        `dist-${value}`,
        "distancia",
        `${milestoneText(value, unit)} acumulados`,
        "Somatório de todas as atividades",
        stats.totalDistance,
        target,
      ),
    );
  }
  for (const value of ACTIVITY_MILESTONES) {
    out.push(
      badge(
        `act-${value}`,
        "atividades",
        value === 1 ? "Primeira atividade" : `${value} atividades gravadas`,
        "Constância conta mais que intensidade",
        stats.activities,
        value,
      ),
    );
  }
  for (const value of STREAK_MILESTONES) {
    out.push(
      badge(
        `streak-${value}`,
        "sequencia",
        `${value} dias seguidos`,
        "Uma atividade por dia, sem furar a fila",
        stats.streakDays,
        value,
      ),
    );
  }
  for (const value of LONGEST_MILESTONES[unit]) {
    const target = value * UNIT_M[unit];
    out.push(
      badge(
        `long-${value}`,
        "percurso",
        `Percurso de ${milestoneText(value, unit)}`,
        "Distância em uma única atividade",
        stats.longestDistance,
        target,
      ),
    );
  }
  return out;
}

/** Progresso até o próximo marco cheio (o km/milha que está por vir). */
export function nextMilestone(distanceM: number, unit: Unit = "km") {
  const unitM = UNIT_M[unit];
  const done = Math.floor(Math.max(0, distanceM) / unitM);
  const target = (done + 1) * unitM;
  const remaining = Math.max(0, target - distanceM);
  return { target, remaining, progress: (Math.max(0, distanceM) - done * unitM) / unitM };
}

/** "FALTAM 320 M" curto, para caber embaixo do medidor de distância. */
export function remainingLabel(remainingM: number, unit: Unit = "km"): string {
  if (unit === "mi") return `FALTAM ${(remainingM / UNIT_M.mi).toFixed(2)} MI`;
  const m = Math.max(0, Math.round(remainingM));
  return m >= 1000 ? `FALTAM ${(m / 1000).toFixed(1)} KM` : `FALTAM ${m} M`;
}

export type SummaryRecord = { label: string; value: string; beaten: boolean };

export type ActivitySummary = {
  distance: string;
  duration: string;
  avgPace: string;
  maxSpeed: string;
  elevation: string;
  splits: { label: string; pace: string }[];
  records: SummaryRecord[];
  newBadges: Badge[];
  isFirst: boolean;
};

/**
 * Resumo de recompensa da atividade recém-concluída: números finais, parciais,
 * recordes pessoais batidos e medalhas desbloqueadas agora.
 */
export function summarize(
  activity: Activity,
  previous: Activity[],
  opts: { unit?: Unit; now?: number } = {},
): ActivitySummary {
  const unit = opts.unit ?? "km";
  const now = opts.now ?? Date.now();
  const stats = computeStats(previous, now);
  const allStats = computeStats([activity, ...previous], now);
  const prevBadges = new Set(
    computeBadges(stats, unit)
      .filter((b) => b.unlocked)
      .map((b) => b.id),
  );
  const newBadges = computeBadges(allStats, unit).filter(
    (b) => b.unlocked && !prevBadges.has(b.id),
  );

  const splits = splitsFromRecords(activity.records, unit).map((s) => ({
    label: `${s.index} ${unit}`,
    pace: formatPace(s.paceSecPerKm, unit),
  }));
  const ownBest = splitsFromRecords(activity.records, unit).reduce<number | null>(
    (min, s) => (min == null || s.seconds < min ? s.seconds : min),
    null,
  );

  const records: SummaryRecord[] = [];
  if (previous.length > 0) {
    records.push({
      label: "Maior distância",
      value: `${formatDistance(activity.distance, unit)} ${unit}`,
      beaten: activity.distance > stats.longestDistance,
    });
    records.push({
      label: "Maior tempo em movimento",
      value: formatDuration(activity.duration),
      beaten: activity.duration > Math.max(...previous.map((p) => p.duration)),
    });
    if (activity.avgPace != null) {
      records.push({
        label: "Melhor pace médio",
        value: formatPace(activity.avgPace, unit),
        beaten: stats.bestAvgPace == null || activity.avgPace < stats.bestAvgPace,
      });
    }
    if (ownBest != null && stats.bestSplitSeconds != null) {
      records.push({
        label: `Melhor parcial de 1 ${unit}`,
        value: formatPace(toPacePerKm(ownBest, unit), unit),
        beaten: ownBest < stats.bestSplitSeconds,
      });
    }
  }

  return {
    distance: `${formatDistance(activity.distance, unit)} ${unit}`,
    duration: formatDuration(activity.duration),
    avgPace: `${formatPace(activity.avgPace, unit)}/${unit}`,
    maxSpeed: `${formatSpeed(activity.maxSpeed, unit)} ${unit === "mi" ? "mph" : "km/h"}`,
    elevation: `+${Math.round(activity.elevationGain ?? 0)} m`,
    splits,
    records,
    newBadges,
    isFirst: previous.length === 0,
  };
}
