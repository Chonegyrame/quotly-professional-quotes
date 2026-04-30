// src/components/FlipDeck/FlipDeckSection.tsx
// The whole "4 flip cards" section. Drop this in place of the existing
// FeaturesSection on the landing page.
//
// To change text: edit the CARDS array below. To change a card's preview:
// swap the `preview` entry for a different component.
// Everything presentational lives in this file or the `previews/` folder;
// the flip mechanics live in FlipCard.tsx (you should not need to touch it).

import type { ReactNode } from 'react';
import { FlipCard } from './FlipCard';
import { JobTicketBack } from './JobTicketBack';
import { FrontPanel } from './FrontPanel';
import { Stamp } from './atoms/Stamp';

import { ROTCalcPreview } from './previews/ROTCalcPreview';
import { MaterialFlowPreview } from './previews/MaterialFlowPreview';
import { QuoteTrackingPreview } from './previews/QuoteTrackingPreview';
import { BusinessInsightsPreview } from './previews/BusinessInsightsPreview';

interface FlipCardData {
  idx: string;
  stamp: string;        // appears on the back ("Funktion: {stamp}") and the front
  title: string;        // front headline
  body: string;         // front paragraph
  teaser: string;       // back mono-quote line
  preview: ReactNode;
}

const CARDS: FlipCardData[] = [
  {
    idx: '01',
    stamp: 'ROT · Avdrag',
    title: 'ROT-avdraget räknas automatiskt.',
    body: 'Quotly skiljer arbete från material, kollar takgränsen mot kunden och visar rätt belopp direkt på offerten.',
    teaser: 'rot 30% av arbete · 31 200 kr kvar i år för K. Andersson',
    preview: <ROTCalcPreview />,
  },
  {
    idx: '02',
    stamp: 'Materialbank · Påslag',
    title: 'Inköpspris in. Kundpris ut. Påslag automatiskt.',
    body: 'Sätt ett globalt påslag (eller per artikel), så räknar Quotly resten. Snart även live-priser från Ahlsell, Onninen och Dahl, så listan alltid är uppdaterad.',
    teaser: 'gipsskiva 112 kr  →  +20% globalt  →  134 kr kundpris',
    preview: <MaterialFlowPreview />,
  },
  {
    idx: '03',
    stamp: 'Uppföljning · PDF',
    title: 'Spåra offerten från skickad till godkänd.',
    body: 'Varje offert stämplas längs vägen, från utkast till godkänd. Kunden får en länk de kan dela vidare och ladda ner som PDF, helt utan inlogg.',
    teaser: 'offert #1042 · öppnad 11:47 · pdf nedladdad 11:49',
    preview: <QuoteTrackingPreview />,
  },
  {
    idx: '04',
    stamp: 'Affärsanalys',
    title: 'Statistik som visar vinstmönstret.',
    body: 'Quotly sammanställer varje offert och varje svar. Vilka jobb du faktiskt vinner, vilka som dräller, och hur snabbt du borde svara för att få jobbet.',
    teaser: 'vvs-akut: 73% blir affär · svar inom 2h tredubblar chansen',
    preview: <BusinessInsightsPreview />,
  },
];

export function FlipDeckSection() {
  return (
    <section className="bg-[#F8F6F3] px-12 pb-32 pt-20">
      {/* Section header */}
      <div className="mx-auto mb-14 max-w-[640px] text-center">
        <Stamp orange className="mb-4">
          FUNKTIONER · 04
        </Stamp>
        <h2 className="mb-3 font-display text-[44px] font-bold leading-[1.08] text-stone-900">
          Mer än bara en offerttjänst.
        </h2>
        <p className="text-[16px] leading-[1.55] text-stone-700">
          Quotly håller koll på de små detaljerna som avgör om en offert blir en affär.
        </p>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-[1080px]">
        {CARDS.map((c, i) => (
          <FlipCard
            key={c.idx}
            axis="x"
            duration={820}
            height={360}
            triggerAt={0.4}
            className="mb-6"
            back={
              <JobTicketBack idx={c.idx} stamp={c.stamp} teaser={c.teaser} />
            }
            front={
              <FrontPanel
                idx={c.idx}
                stamp={c.stamp}
                title={c.title}
                body={c.body}
                preview={c.preview}
                reverse={i % 2 === 1}
              />
            }
          />
        ))}
      </div>

      {/* Footer hint */}
      <div className="mx-auto mt-12 max-w-[1080px] border-t border-stone-200 pt-7 text-center">
        <span className="font-mono text-[11px] text-stone-500">
          ↓ scroll för att öppna varje kort · öppnade kort förblir öppna
        </span>
      </div>
    </section>
  );
}
