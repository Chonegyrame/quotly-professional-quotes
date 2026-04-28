// src/components/FlipDeck/previews/ROTCalcPreview.tsx
// Mini UI shown on the front of card 01 (ROT · Avdrag).
// Standard quote view: subtotal, ROT deduction, what the customer pays.
// Material line includes a fine-print breakdown so the reader sees this
// is an itemised quote, not just a lump-sum total. Cap status at the
// bottom shows the customer's remaining ROT-tak for the year — the real
// workflow win this card sells.

import { Stamp } from '../atoms/Stamp';

const MATERIAL_ROWS: Array<[string, string]> = [
  ['Klinker golv + vägg (15 m²)', '6 200'],
  ['Tätskikt komplett',           '2 400'],
  ['WC + handfat',                '4 100'],
  ['Blandare + duschset',         '2 800'],
  ['Övrigt rör + el',             '3 100'],
];

export function ROTCalcPreview() {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-2.5 flex items-baseline justify-between">
        <div>
          <div className="font-display text-[12px] font-bold text-stone-900">Offert #1042</div>
          <div className="font-mono text-[10px] text-stone-500">Badrumsrenovering · K. Andersson</div>
        </div>
        <Stamp orange>ROT</Stamp>
      </div>

      <div className="border-t border-stone-200 pt-2">
        <div className="flex items-baseline justify-between py-0.5 font-mono text-[11px] text-stone-700">
          <span>Arbete · 28 h</span>
          <span className="tabular-nums">24 200 kr</span>
        </div>
        <div className="flex items-baseline justify-between py-0.5 font-mono text-[11px] text-stone-700">
          <span>Material</span>
          <span className="tabular-nums">18 600 kr</span>
        </div>

        {/* Fine-print material breakdown */}
        <div className="mt-0.5 ml-3 border-l border-stone-200 pl-2">
          {MATERIAL_ROWS.map(([desc, value]) => (
            <div
              key={desc}
              className="flex items-baseline justify-between font-mono text-[9px] leading-tight text-stone-400"
            >
              <span>{desc}</span>
              <span className="tabular-nums">{value} kr</span>
            </div>
          ))}
        </div>

        <div className="mt-1.5 flex items-baseline justify-between border-t border-stone-200 pt-1.5 font-mono text-[11px] text-stone-900">
          <span>Summa exkl. ROT</span>
          <span className="font-semibold tabular-nums">42 800 kr</span>
        </div>
      </div>

      <div className="mt-2 rounded-sm border border-orange-100 bg-orange-50/60 px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-orange-700">
            ROT-avdrag · 30% av arbete
          </span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-orange-700">
            −7 260 kr
          </span>
        </div>
      </div>

      <div className="mt-2 rounded-sm border-2 border-stone-900 bg-white px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-900">
            Kund betalar
          </span>
          <span className="font-mono text-[20px] font-bold tabular-nums tracking-tight text-stone-900">
            35 540 kr
          </span>
        </div>
      </div>
    </div>
  );
}
