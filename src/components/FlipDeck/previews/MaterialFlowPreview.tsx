// src/components/FlipDeck/previews/MaterialFlowPreview.tsx
// Mini UI shown on the front of card 02 (Materialbank · Påslag).
// Shows the material list with a global markup that most rows inherit, plus
// per-item override capability. Bottom strip teases the upcoming live
// supplier integration (Ahlsell, Onninen, Dahl).

import { Stamp } from '../atoms/Stamp';

export function MaterialFlowPreview() {
  const rows: Array<{ desc: string; buy: number; mk: number; global: boolean }> = [
    { desc: 'Gipsskiva 13 mm',  buy: 112,   mk: 20, global: true },
    { desc: 'Regelvirke 45×95', buy:  39,   mk: 20, global: true },
    { desc: 'Simpson LSTA24',   buy:   2.4, mk: 35, global: false },
    { desc: 'Takskruv 5×80 A4', buy:  85,   mk: 20, global: true },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-100/70 px-3 py-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Materialbank · 142 artiklar
        </span>
        <span className="font-mono text-[10px] font-semibold text-orange-700">
          + 20% globalt påslag
        </span>
      </div>

      <div className="grid grid-cols-[1fr_56px_64px_56px] gap-1 border-b border-stone-200 px-3 py-1.5">
        {['Artikel', 'Inköp', 'Påslag', 'Utpris'].map((label, i) => (
          <span
            key={label}
            className={`font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-stone-500 ${i > 0 ? 'text-right' : ''}`}
          >
            {label}
          </span>
        ))}
      </div>

      {rows.map((r, i) => {
        const out = r.buy * (1 + r.mk / 100);
        return (
          <div
            key={i}
            className={`grid grid-cols-[1fr_56px_64px_56px] items-baseline gap-1 px-3 py-1.5 ${i < rows.length - 1 ? 'border-b border-stone-200' : ''}`}
          >
            <span className="text-[12px] text-stone-900">{r.desc}</span>
            <span className="text-right font-mono text-[11px] tabular-nums text-stone-500">
              {r.buy.toLocaleString('sv-SE')} kr
            </span>
            <span
              className={`text-right font-mono text-[10px] ${
                r.global ? 'text-stone-500' : 'font-semibold text-orange-700'
              }`}
            >
              {r.global ? `+${r.mk}% glob` : `+${r.mk}% egen`}
            </span>
            <span className="text-right font-mono text-[11px] font-semibold tabular-nums text-stone-900">
              {out.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
            </span>
          </div>
        );
      })}

      <div className="flex items-center justify-between border-t border-stone-900 bg-stone-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
          <span className="font-mono text-[11px] font-semibold leading-tight text-stone-900">
            Ahlsell · Onninen · Dahl
          </span>
        </div>
        <Stamp orange>Snart live</Stamp>
      </div>
    </div>
  );
}
