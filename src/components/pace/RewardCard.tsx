import type { ActivitySummary } from "@/lib/rewards";

/**
 * Cartão de recompensa da atividade recém-concluída. Usa o mesmo desenho no fim da
 * gravação e em qualquer lugar que queira resumir a sessão, para o pesquisador
 * reconhecer o resultado de imediato.
 */
export function RewardCard({ summary }: { summary: ActivitySummary }) {
  const beaten = summary.records.filter((r) => r.beaten);
  const splits = summary.splits.slice(0, 8);
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-left shadow-glow">
      <p className="font-display text-[11px] tracking-[0.22em] text-primary">
        {summary.isFirst ? "PRIMEIRA ATIVIDADE" : "ATIVIDADE CONCLUÍDA"}
      </p>
      <p className="mt-1 font-display text-5xl font-bold leading-none">{summary.distance}</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["TEMPO", summary.duration],
          ["PACE", summary.avgPace],
          ["ELEVAÇÃO", summary.elevation],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-secondary px-2 py-2 text-center">
            <p className="text-[10px] tracking-wider text-muted-foreground">{label}</p>
            <p className="font-display text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      {beaten.length > 0 && (
        <div className="mt-4 rounded-lg border border-speed/50 bg-speed/10 p-3">
          <p className="font-display text-[11px] tracking-[0.18em] text-speed">
            {beaten.length === 1 ? "RECORDE PESSOAL" : `${beaten.length} RECORDES PESSOAIS`}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {beaten.map((r) => (
              <li key={r.label} className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-display font-bold">{r.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {splits.length > 0 && (
        <div className="mt-4">
          <p className="font-display text-[11px] tracking-[0.18em] text-muted-foreground">
            PARCIAIS
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {splits.map((s) => (
              <span
                key={s.label}
                className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground"
              >
                <span className="text-foreground">{s.label}</span> {s.pace}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.newBadges.length > 0 && (
        <div className="mt-4">
          <p className="font-display text-[11px] tracking-[0.18em] text-primary">
            {summary.newBadges.length === 1 ? "MEDALHA NOVA" : "MEDALHAS NOVAS"}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {summary.newBadges.map((b) => (
              <span
                key={b.id}
                className="rounded-md border border-primary/50 bg-primary/10 px-2 py-1 text-xs text-foreground"
              >
                {b.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.records.length > 0 && beaten.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Sem recorde desta vez. O histórico está guardado — a próxima tentativa compara com ele.
        </p>
      )}
    </div>
  );
}
