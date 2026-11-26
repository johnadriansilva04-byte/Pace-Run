import { describe, expect, it } from "vitest";
import {
  computeBadges,
  computeStats,
  nextMilestone,
  remainingLabel,
  splitsFromRecords,
  streakDays,
  summarize,
  UNIT_M,
} from "@/lib/rewards";
import type { Activity, RecordPoint } from "@/lib/gallery";

/** Percurso reto a pace constante, amostrado a cada `step` segundos. */
function straightRun(distanceM: number, seconds: number, step = 1): RecordPoint[] {
  const out: RecordPoint[] = [];
  const perSec = distanceM / seconds;
  for (let t = 0; t <= seconds; t += step) {
    const distance = Math.min(distanceM, perSec * t);
    out.push({
      elapsed: t,
      distance,
      pace: 1000 / perSec,
      speed: perSec,
      elevation: 10,
      lat: null,
      lon: null,
      t: 1_700_000_000_000 + t * 1000,
    });
  }
  return out;
}

function activity(partial: Partial<Activity> & { id: string }): Activity {
  return {
    type: "corrida",
    startedAt: new Date(2026, 0, 12, 7, 0).getTime(),
    finishedAt: new Date(2026, 0, 12, 7, 30).getTime(),
    distance: 5000,
    duration: 1800,
    avgPace: 360,
    avgSpeed: 2.78,
    maxSpeed: 3.2,
    elevationGain: 20,
    mime: "video/webm",
    format: "9:16",
    thumb: "",
    records: [],
    ...partial,
  };
}

describe("splitsFromRecords", () => {
  it("fecha uma parcial por km a pace constante", () => {
    const splits = splitsFromRecords(straightRun(3000, 900));
    expect(splits).toHaveLength(3);
    expect(splits.map((s) => s.seconds)).toEqual([300, 300, 300]);
    expect(splits[0]!.paceSecPerKm).toBe(300);
  });

  it("interpola a virada do km entre duas amostras", () => {
    // 1 amostra a cada 10 s, 2 km em 200 s: o km cai no meio de uma amostra.
    const splits = splitsFromRecords(straightRun(2000, 200, 10));
    expect(splits).toHaveLength(2);
    expect(splits[0]!.seconds).toBe(100);
    expect(splits[1]!.seconds).toBe(100);
  });

  it("devolve parcial em milhas convertida para pace por km", () => {
    const splits = splitsFromRecords(straightRun(UNIT_M.mi * 2, 1200), "mi");
    expect(splits).toHaveLength(2);
    expect(splits[0]!.seconds).toBe(600);
    expect(splits[0]!.paceSecPerKm).toBeCloseTo(600 / 1.609344, 5);
  });

  it("não inventa parcial quando não há amostras suficientes", () => {
    expect(splitsFromRecords([])).toEqual([]);
    expect(splitsFromRecords(straightRun(500, 100).slice(0, 1))).toEqual([]);
  });
});

describe("streakDays", () => {
  const now = new Date(2026, 0, 12, 20, 0).getTime();
  const day = (d: number) => new Date(2026, 0, d, 8, 0).getTime();

  it("conta dias consecutivos incluindo hoje", () => {
    const list = [
      activity({ id: "a", startedAt: day(10) }),
      activity({ id: "b", startedAt: day(11) }),
    ];
    list.push(activity({ id: "c", startedAt: day(12) }));
    expect(streakDays(list, now)).toBe(3);
  });

  it("mantém a sequência viva quando o dia de hoje ainda não teve atividade", () => {
    const list = [
      activity({ id: "a", startedAt: day(10) }),
      activity({ id: "b", startedAt: day(11) }),
    ];
    expect(streakDays(list, now)).toBe(2);
  });

  it("quebra a sequência quando o último dia foi anteontem", () => {
    const list = [activity({ id: "a", startedAt: day(10) })];
    expect(streakDays(list, now)).toBe(0);
  });

  it("conta uma atividade por dia, mesmo com várias no mesmo dia", () => {
    const list = [
      activity({ id: "a", startedAt: day(12) }),
      activity({ id: "b", startedAt: new Date(2026, 0, 12, 18, 0).getTime() }),
    ];
    expect(streakDays(list, now)).toBe(1);
  });
});

describe("computeStats", () => {
  it("soma totais e acha os melhores", () => {
    const list = [
      activity({ id: "a", distance: 3000, duration: 900, elevationGain: 10, avgPace: 300 }),
      activity({ id: "b", distance: 8000, duration: 2400, elevationGain: 40, avgPace: 320 }),
    ];
    const stats = computeStats(list, new Date(2026, 0, 12, 20, 0).getTime());
    expect(stats.activities).toBe(2);
    expect(stats.totalDistance).toBe(11000);
    expect(stats.totalDuration).toBe(3300);
    expect(stats.totalElevation).toBe(50);
    expect(stats.longestDistance).toBe(8000);
    expect(stats.bestAvgPace).toBe(300);
  });

  it("zera tudo sem atividades", () => {
    const stats = computeStats([], Date.now());
    expect(stats.activities).toBe(0);
    expect(stats.bestSplitSeconds).toBeNull();
    expect(stats.lastActivityAt).toBeNull();
  });
});

describe("computeBadges", () => {
  it("desbloqueia o marco atingido e mede o progresso do próximo", () => {
    const stats = computeStats([activity({ id: "a", distance: 6000 })]);
    const badges = computeBadges(stats, "km");
    const five = badges.find((b) => b.id === "dist-5");
    const ten = badges.find((b) => b.id === "dist-10");
    expect(five?.unlocked).toBe(true);
    expect(ten?.unlocked).toBe(false);
    expect(ten?.progress).toBeCloseTo(0.6, 5);
  });

  it("usa marcos em milhas quando a unidade é milha", () => {
    const stats = computeStats([activity({ id: "a", distance: 2000 })]);
    const badges = computeBadges(stats, "mi");
    expect(badges.some((b) => b.id === "dist-3.1")).toBe(true);
    expect(badges.find((b) => b.id === "dist-3.1")?.unlocked).toBe(false);
  });
});

describe("nextMilestone", () => {
  it("aponta o próximo km e quanto falta", () => {
    const next = nextMilestone(4680);
    expect(next.target).toBe(5000);
    expect(next.remaining).toBe(320);
    expect(next.progress).toBeCloseTo(0.68, 5);
  });

  it("formata o texto do painel", () => {
    expect(remainingLabel(320)).toBe("FALTAM 320 M");
    expect(remainingLabel(1200)).toBe("FALTAM 1.2 KM");
    expect(remainingLabel(UNIT_M.mi / 4, "mi")).toBe("FALTAM 0.25 MI");
  });
});

describe("summarize", () => {
  const unit = "km" as const;

  it("trata a primeira atividade como estreia e desbloqueia as medalhas de base", () => {
    const a = activity({ id: "a", distance: 6000, records: straightRun(6000, 1800) });
    const summary = summarize(a, [], { unit, now: a.startedAt + 1 });
    expect(summary.isFirst).toBe(true);
    expect(summary.splits).toHaveLength(6);
    expect(summary.records).toEqual([]);
    expect(summary.newBadges.map((b) => b.id)).toContain("act-1");
    expect(summary.newBadges.map((b) => b.id)).toContain("long-5");
  });

  it("marca recorde só quando supera o histórico", () => {
    const old = activity({ id: "old", distance: 4000, duration: 3600, avgPace: 400 });
    const better = activity({ id: "new", distance: 6000, duration: 1800, avgPace: 300 });
    const summary = summarize(better, [old], { unit, now: better.startedAt + 1 });
    const distance = summary.records.find((r) => r.label === "Maior distância");
    const pace = summary.records.find((r) => r.label === "Melhor pace médio");
    expect(distance?.beaten).toBe(true);
    expect(pace?.beaten).toBe(true);
    expect(summary.isFirst).toBe(false);
  });

  it("não marca recorde quando a atividade ficou abaixo do histórico", () => {
    const old = activity({ id: "old", distance: 9000, duration: 5400, avgPace: 280 });
    // 9 km + 0,3 km não cruza nenhum marco novo: o que se testa é o recorde, não a soma.
    const weaker = activity({ id: "new", distance: 300, duration: 1200, avgPace: 420 });
    const summary = summarize(weaker, [old], { unit, now: weaker.startedAt + 1 });
    expect(summary.records.find((r) => r.label === "Maior distância")?.beaten).toBe(false);
    expect(summary.records.find((r) => r.label === "Melhor pace médio")?.beaten).toBe(false);
    expect(summary.newBadges).toEqual([]);
  });

  it("formata os números na unidade do app", () => {
    const a = activity({ id: "a", distance: 1609.344, avgPace: 400 });
    const summary = summarize(a, [], { unit: "mi", now: a.startedAt + 1 });
    expect(summary.distance).toBe("1.00 mi");
    expect(summary.avgPace).toBe("10:44/mi");
  });
});
