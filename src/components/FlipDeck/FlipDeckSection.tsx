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

import { AIComposerPreview } from './previews/AIComposerPreview';
import { LearningFeedPreview } from './previews/LearningFeedPreview';
import { MaterialBankPreview } from './previews/MaterialBankPreview';
import { LifecyclePreview } from './previews/LifecyclePreview';

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
    stamp: 'AI · Offertmotor',
    title: 'Skriv jobbet. Få offerten.',
    body: 'En rad text eller ett foto räcker. Quotly plockar material, arbete och påslag och levererar en komplett offert — redo att skicka.',
    teaser: 'riv gipsvägg mellan kök och matsal, nya reglar, 3 eluttag...',
    preview: <AIComposerPreview />,
  },
  {
    idx: '02',
    stamp: 'Lärsystem · 4 lager',
    title: 'Varje jobb tränar nästa offert.',
    body: 'Quotly följer vad du faktiskt fakturerar, vad du lägger till manuellt och hur dina priser rör sig. Nästa offert sitter tätare än förra.',
    teaser: 'timpenning på ramjobb: 850 → 920 kr (lärde sig igår)',
    preview: <LearningFeedPreview />,
  },
  {
    idx: '03',
    stamp: 'Materialbank',
    title: 'Inköpspris in. Utpris ut.',
    body: 'Spara material en gång, sätt ett påslag, använd på varje jobb. Påslaget räknas per rad — moms också.',
    teaser: 'gipsskiva 112 kr  →  +33%  →  149 kr utpris',
    preview: <MaterialBankPreview />,
  },
  {
    idx: '04',
    stamp: 'Uppföljning',
    title: 'Du ser när kunden öppnar.',
    body: 'Varje offert stämplas längs vägen — utkast, skickad, öppnad, godkänd. Ring när den är varm, inte tre dagar senare.',
    teaser: 'offert #1042 · öppnad av Dave för 2 min sedan',
    preview: <LifecyclePreview />,
  },
];

export function FlipDeckSection() {
  return (
    <section className="bg-[#fdfaf4] px-12 pb-32 pt-20">
      {/* Section header */}
      <div className="mx-auto mb-14 max-w-[640px] text-center">
        <Stamp orange className="mb-4">
          FUNKTIONER · 04
        </Stamp>
        <h2 className="mb-3 font-display text-[44px] font-extrabold leading-[1.04] tracking-[-0.02em] text-stone-900">
          Fyra jobb-tickets. Öppna dem i tur och ordning.
        </h2>
        <p className="text-[16px] leading-[1.55] text-stone-700">
          Varje kort flippar upp när du scrollar förbi det. Först #1, sedan #2, #3, #4.
        </p>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-[1080px]">
        {CARDS.map((c, i) => (
          <FlipCard
            key={c.idx}
            axis="x"
            duration={820}
            height={460}
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
