import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Footer } from '@/components/Footer';

const FAQS = [
  {
    q: 'Vad är Quotly?',
    a: 'Quotly är en offertplattform byggd för svenska hantverkare inom bygg, el och VVS. Du skapar strukturerade offerter med arbete och material, skickar dem till kund och följer upp status, allt på ett ställe.',
  },
  {
    q: 'Hur fungerar AI-offertgeneringen?',
    a: 'Du beskriver jobbet i text eller laddar upp en bild, väljer yrke och låter AI:n föreslå en komplett offert med arbete och materialrader. Förslaget anpassas över tid efter dina priser och vanor.',
  },
  {
    q: 'Vad kostar det att använda Quotly?',
    a: 'Du kan testa Quotly gratis. Pris för fortsatt användning hittar du på sidan Priser. Inga bindningstider och du säger upp när du vill.',
  },
  {
    q: 'Är mina kund- och offertdata säkra?',
    a: 'All data lagras krypterat hos Supabase med servrar inom EU. Endast du och de du bjuder in till ditt företag kommer åt era offerter och kundregister.',
  },
  {
    q: 'Kan jag skicka offerter direkt till kund?',
    a: 'Ja. Du skickar offerten via e-post med bifogad PDF, och kunden kan öppna den i en publik vy utan att behöva logga in. Du ser när offerten har öppnats och accepterats.',
  },
  {
    q: 'Vad händer när en kund accepterar en offert?',
    a: 'Statusen uppdateras automatiskt till accepterad, och du får en notis. Hela händelsekedjan från skickad till accepterad sparas som logg på offerten.',
  },
  {
    q: 'Kan jag importera mina egna materialpriser?',
    a: 'Ja. Du lägger till material manuellt med inköpspris och påslag, eller använder vårt startpaket per yrke som du sedan justerar efter dina egna priser.',
  },
  {
    q: 'Hur säger jag upp mitt abonnemang?',
    a: 'Du säger upp ditt abonnemang direkt under Inställningar. Uppsägningen träder i kraft vid nästa faktureringsperiod och dina data finns kvar tills du själv väljer att radera dem.',
  },
] as const;

function FaqCard({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white transition-colors hover:border-stone-300">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-heading text-base font-semibold text-stone-900 sm:text-lg">
          {q}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-stone-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.4, 0, 1] }}
          >
            <div className="px-5 pb-5 text-[15px] leading-relaxed text-stone-700">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FragorOchSvarPage() {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-stone-600 transition-colors hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till startsidan
        </Link>

        <h1 className="mb-3 font-heading text-4xl font-bold text-stone-900 sm:text-5xl">
          Frågor och svar
        </h1>
        <p className="mb-12 text-lg text-stone-600">
          Svar på de vanligaste frågorna om Quotly. Hittar du inte det du söker, kontakta oss via e-post i sidfoten.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FAQS.map((item, i) => (
            <FaqCard
              key={item.q}
              q={item.q}
              a={item.a}
              isOpen={openSet.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
