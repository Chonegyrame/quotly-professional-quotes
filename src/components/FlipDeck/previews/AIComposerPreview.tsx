// src/components/FlipDeck/previews/AIComposerPreview.tsx
// Mini UI shown on the front of card 01 (AI · Offertmotor).
// Edit text/rows freely — this is pure presentational markup.

export function AIComposerPreview() {
  const rows: Array<[string, string, string]> = [
    ['Rivning gipsvägg',        '1 jobb',  '2\u202f200\u00a0kr'],
    ['Regelvirke 45×95 SPF',    '18 st',   '  936\u00a0kr'],
    ['Gipsskiva 13 mm',         ' 6 st',   '  894\u00a0kr'],
    ['Spackel & armeringstejp', '1 sats',  '  680\u00a0kr'],
    ['El · 3 uttag (UE)',       '1 jobb',  '4\u202f200\u00a0kr'],
    ['Arbete · snickare',       '8 h',     '6\u202f800\u00a0kr'],
    ['Bortforsling',            '1 jobb',  '1\u202f800\u00a0kr'],
  ];

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      {/* Prompt */}
      <div className="mb-3 rounded-sm border border-orange-100 bg-orange-50/60 px-3 py-2">
        <div className="mb-1 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-orange-700">
          Din text
        </div>
        <div className="font-mono text-[11px] leading-snug text-stone-700">
          "riv gipsvägg mellan kök och matsal, nya reglar, 3 eluttag, klart på fredag"
        </div>
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-1.5">
        {rows.map(([desc, qty, total], i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_56px_78px] items-baseline gap-2 font-mono text-[11px] tabular-nums text-stone-900"
          >
            <span>{desc}</span>
            <span className="text-right text-stone-500">{qty}</span>
            <span className="text-right font-semibold">{total}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 flex items-baseline justify-between border-t border-stone-900 pt-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Totalt inkl. moms
        </span>
        <span className="font-display text-[22px] font-extrabold tabular-nums tracking-tight text-stone-900">
          22 390 kr
        </span>
      </div>

      {/* AI signature */}
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-stone-200 pt-2.5 font-mono text-[10px]">
        <span className="text-stone-500">Skapad av Quotly · 1.8 s</span>
        <span className="text-orange-700">● klar att skicka</span>
      </div>
    </div>
  );
}
