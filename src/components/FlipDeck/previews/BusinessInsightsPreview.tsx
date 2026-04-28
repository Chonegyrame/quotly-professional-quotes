// src/components/FlipDeck/previews/BusinessInsightsPreview.tsx
// Mini UI shown on the front of card 04 (Affärsanalys).
// Two stacked panels of pure job/quote-behavior data: which job types
// actually convert, and how response speed correlates with win rate.
// Bottom strip drops the actionable insight in plain language.

export function BusinessInsightsPreview() {
  const jobTypes: Array<{ label: string; pct: number }> = [
    { label: 'VVS · akut',         pct: 73 },
    { label: 'El · installation',  pct: 58 },
    { label: 'Bygg · renovering',  pct: 41 },
  ];

  const responseTime: Array<{ label: string; pct: number }> = [
    { label: 'inom 2 h',   pct: 68 },
    { label: 'inom 24 h',  pct: 45 },
    { label: 'efter 24 h', pct: 22 },
  ];

  const Bar = ({ pct, highlight }: { pct: number; highlight?: boolean }) => (
    <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-stone-100">
      <div
        className={`h-full ${highlight ? 'bg-orange-500' : 'bg-stone-700'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-100/70 px-3 py-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Affärsanalys · senaste 6 mån
        </span>
        <span className="font-mono text-[10px] text-stone-500">142 offerter</span>
      </div>

      <div className="border-b border-stone-200 px-3 py-2">
        <div className="mb-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Vinstprocent per jobbtyp
        </div>
        <div className="flex flex-col gap-1">
          {jobTypes.map((j, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_36px] items-center gap-2.5">
              <span className="text-[11px] leading-tight text-stone-900">{j.label}</span>
              <Bar pct={j.pct} highlight={i === 0} />
              <span className="text-right font-mono text-[11px] font-semibold leading-tight tabular-nums text-stone-900">
                {j.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="mb-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Svarstid → vinstchans
        </div>
        <div className="flex flex-col gap-1">
          {responseTime.map((r, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_36px] items-center gap-2.5">
              <span className="text-[11px] leading-tight text-stone-900">{r.label}</span>
              <Bar pct={r.pct} highlight={i === 0} />
              <span className="text-right font-mono text-[11px] font-semibold leading-tight tabular-nums text-stone-900">
                {r.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-stone-900 bg-stone-50 px-3 py-1.5 font-mono text-[10px] leading-tight text-stone-700">
        <span className="font-semibold text-orange-700">Insikt:</span>{' '}
        svar inom 2 h tredubblar chansen.
      </div>
    </div>
  );
}
