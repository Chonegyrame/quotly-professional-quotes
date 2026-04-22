// src/components/FlipDeck/previews/LearningFeedPreview.tsx
// Mini UI shown on the front of card 02 (Lärsystem · 4 lager).

export function LearningFeedPreview() {
  const insights: Array<{ layer: string; tag: string; text: string; strong: string; meta: string }> = [
    { layer: 'L1', tag: 'Prisprofil',  text: 'Timpenning på ramjobb: ', strong: '850 → 920 kr', meta: '6 jobb · 4 veckor' },
    { layer: 'L2', tag: 'Mönster',     text: 'Lägger alltid till ',      strong: 'container + frakt', meta: 'på rivningsjobb' },
    { layer: 'L4', tag: 'Korrigering', text: 'Simpson strap nu ',        strong: '3.15 kr',            meta: 'leverantörsbyte' },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-100/70 px-3 py-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Quotly lärde sig · 3 nya
        </span>
        <span className="font-mono text-[10px] text-stone-500">idag 14:22</span>
      </div>
      <div>
        {insights.map((it, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 px-3 py-2.5 ${i < insights.length - 1 ? 'border-b border-stone-200' : ''}`}
          >
            <span className="mt-[1px] flex-shrink-0 rounded-sm border border-orange-100 bg-orange-50 px-[5px] py-[2px] font-mono text-[10px] font-semibold leading-none text-orange-700">
              {it.layer}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] leading-snug text-stone-900">
                <span className="mr-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                  {it.tag}
                </span>
                {it.text}
                <strong className="font-mono font-semibold">{it.strong}</strong>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-stone-500">{it.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
