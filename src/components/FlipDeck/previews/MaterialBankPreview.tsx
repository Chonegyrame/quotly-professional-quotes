// src/components/FlipDeck/previews/MaterialBankPreview.tsx
// Mini UI shown on the front of card 03 (Materialbank).

export function MaterialBankPreview() {
  const rows: Array<{ desc: string; buy: number; mk: number }> = [
    { desc: 'Gipsskiva 13 mm',    buy: 112,  mk: 33 },
    { desc: 'Regelvirke 45×95',   buy:  39,  mk: 34 },
    { desc: 'Simpson LSTA24',     buy:   2.4, mk: 31 },
    { desc: 'Takskruv 5×80 A4',   buy:  85,  mk: 42 },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-100/70 px-3 py-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Materialbank · 142 artiklar
        </span>
      </div>

      <div className="grid grid-cols-[1fr_56px_44px_60px] gap-1 border-b border-stone-200 px-3 py-1.5">
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
            className={`grid grid-cols-[1fr_56px_44px_60px] items-baseline gap-1 px-3 py-1.5 ${i < rows.length - 1 ? 'border-b border-stone-200' : ''}`}
          >
            <span className="text-[12px] text-stone-900">{r.desc}</span>
            <span className="text-right font-mono text-[11px] text-stone-500">
              {r.buy.toLocaleString('sv-SE')} kr
            </span>
            <span className="text-right font-mono text-[11px] text-orange-700">+{r.mk}%</span>
            <span className="text-right font-mono text-[11px] font-semibold text-stone-900">
              {out.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
            </span>
          </div>
        );
      })}
    </div>
  );
}
