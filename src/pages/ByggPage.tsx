import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';
import { MarketingHeader } from '@/components/MarketingHeader';
import { PipelineDemo, type Example } from '@/components/PipelineDemo';
import { FormSliderShowcase, type SliderTemplate } from '@/components/FormSliderShowcase';
import { Footer } from '@/components/Footer';

const byggExamples: Example[] = [
  {
    id: 'attefall',
    tabLabel: 'Attefallshus 25 m²',
    customerName: 'Erik Sundberg',
    customerInitials: 'ES',
    customerVia: 'Privatperson',
    freeText:
      'Vill bygga ett attefallshus på tomten, 25 m². Attefallsanmälan godkänd, ritning klar. Vill ha klart innan augusti.',
    classifiedAs: 'Tillbyggnad',
    routedTo: 'Tillbyggnad',
    leadId: 'INC-2026-0142',
    submittedAt: 'kl 14:23 idag',
    customerEmail: 'erik.s@example.se',
    customerPhone: '070-123 45 67',
    customerAddress: 'Bromma, Stockholm',
    distanceKm: 12,
    templateName: 'Tillbyggnad',
    formLabel: 'tillbyggnad',
    formAnswers: [
      { label: 'Typ av tillbyggnad', value: 'Attefallshus' },
      { label: 'Fastighetstyp', value: 'Villa' },
      { label: 'Storlek', value: '25 m²' },
      { label: 'Bygglov', value: 'Attefallsanmälan gjord' },
      { label: 'Tidsram', value: 'Snart (1–3 mån)' },
      { label: 'Budget', value: '300 000–450 000 kr' },
      { label: 'ROT-avdrag', value: 'Nej (nybyggnad)' },
      { label: 'Bilder + ritning', value: '3 bifogade' },
    ],
    score: 94,
    tier: 'Mycket stark',
    fitScore: 96,
    intentScore: 95,
    clarityScore: 90,
    summary:
      'Attefallshus med godkänd anmälan och ritning, tydlig tidsram och budget. Boka platsbesök inom 48 h.',
    flags: [
      { label: 'Attefallsanmälan godkänd', type: 'green' },
      { label: 'Ritning bifogad', type: 'green' },
      { label: 'Konkret budget och tidsram', type: 'green' },
    ],
    quoteNumber: 'Q-2026-0142',
    quoteTitle: 'Attefallshus 25 m²',
    quoteLines: [
      { name: 'Plintgrund + dränering', qty: '1 lot', price: 38000 },
      { name: 'Stomvirke + reglar', qty: '1 lot', price: 52000 },
      { name: 'Isolering + vindskydd', qty: '25 m²', price: 18500 },
      { name: 'Yttre fasad (panel + målning)', qty: '60 m²', price: 42000 },
      { name: 'Tak (papp + plåt)', qty: '30 m²', price: 38000 },
      { name: 'Fönster + ytterdörr', qty: '4 st', price: 31000 },
      { name: 'Innerväggar + ytskikt', qty: '1 lot', price: 41000 },
    ],
    laborHours: 240,
    laborRate: 650,
    rotEligible: false,
    notes: 'Inkluderar ej el och VVS. Offereras separat vid behov.',
  },
  {
    id: 'takbyte',
    tabLabel: 'Takbyte villa',
    customerName: 'Anders Johansson',
    customerInitials: 'AJ',
    customerVia: 'Privatperson',
    freeText:
      'Hej, taket på vårt hus börjar bli gammalt och vi funderar på att lägga om det, ungefär 40 kvm. Skulle vilja veta ungefär vad det kostar.',
    classifiedAs: 'Takbyte',
    routedTo: 'Tak',
    leadId: 'INC-2026-0143',
    submittedAt: 'kl 11:08 idag',
    customerEmail: 'anders.j@example.se',
    customerPhone: '076-543 21 09',
    customerAddress: 'Täby, Stockholm',
    distanceKm: 18,
    templateName: 'Takbyte',
    formLabel: 'takbyte',
    formAnswers: [
      { label: 'Fastighetstyp', value: 'Villa, 1-plan' },
      { label: 'Taktyp', value: 'Sadeltak' },
      { label: 'Storlek (m²)', value: '40 m² (ungefär)' },
      { label: 'Befintligt material', value: 'Vet ej', vetEj: true },
      { label: 'Önskat material', value: 'Vet ej', vetEj: true },
      { label: 'Tidsram', value: 'Vet ej', vetEj: true },
      { label: 'Budget', value: 'Vet ej', vetEj: true },
      { label: 'ROT-utrymme kvar i år', value: '30 000 kr' },
    ],
    score: 63,
    tier: 'Mellan',
    fitScore: 80,
    intentScore: 45,
    clarityScore: 55,
    summary:
      'Takbyte på mindre villa, ungefärlig yta given men vag på material och tidsram. Platsbesök behövs.',
    flags: [
      { label: 'Tydlig fastighetstyp', type: 'green' },
      { label: 'ROT-berättigad', type: 'green' },
      { label: 'Vet ej takmaterial', type: 'red' },
      { label: 'Vag tidsram och budget', type: 'red' },
    ],
    quoteNumber: 'Q-2026-0143',
    quoteTitle: 'Takbyte villa, sadeltak ~40 m²',
    quoteLines: [
      { name: 'Container + bortforsling', qty: '1 st', price: 5500 },
      { name: 'Underlagspapp + läkt', qty: '40 m²', price: 7800 },
      { name: 'Tegelpannor (standardröd)', qty: '40 m²', price: 16000 },
      { name: 'Plåtbeslag (nock, vinkel, fotplåt)', qty: '1 lot', price: 6800 },
      { name: 'Hängrännor + stuprör', qty: '18 m', price: 4500 },
      { name: 'Ställning + säkerhet', qty: '1 lot', price: 9800 },
    ],
    laborHours: 60,
    laborRate: 650,
    rotEligible: true,
    notes: 'Preliminär baserat på kundens uppgivna ~40 m². Slutgiltig offert efter platsbesök och uppmätning.',
  },
];

const byggFormTemplates: SliderTemplate[] = [
  {
    id: 'badrum',
    label: 'Badrumsrenovering',
    description: 'För renoveringar av badrum, från ytskiktsbyte till helrenovering.',
    fields: [
      ['Fastighetstyp', 'Lägenhet i BRF'],
      ['Storlek (m²)', '6 m²'],
      ['Omfattning', 'Helrenovering'],
      ['VVS-arbeten', 'Byte av blandare och WC'],
      ['Styrelsegodkännande', 'Klart'],
      ['Önskad start', 'Augusti 2026'],
      ['Budget', '150–200 000 kr'],
      ['ROT-utrymme kvar i år', '28 000 kr'],
      ['Bilder', '4 bifogade'],
    ],
  },
  {
    id: 'kok',
    label: 'Köksrenovering',
    description: 'För kök, från luckbyte och bänkskivor till komplett ombyggnad.',
    fields: [
      ['Fastighetstyp', 'Villa'],
      ['Storlek (m²)', '14 m²'],
      ['Omfattning', 'Stomme + luckor + bänkskiva'],
      ['Vitvaror', 'Behålls (3 av 4)'],
      ['VVS- och el-arbeten', 'Diskho flyttas, ny häll 3-fas'],
      ['Önskad start', 'September 2026'],
      ['Budget', '200–280 000 kr'],
      ['ROT-utrymme kvar i år', '42 500 kr'],
      ['Bilder', '7 bifogade'],
    ],
  },
  {
    id: 'takbyte',
    label: 'Takbyte',
    description: 'Komplett takbyte, läkt, papp, plåt eller tegel.',
    fields: [
      ['Fastighetstyp', 'Villa, 1½-plan'],
      ['Takyta (m²)', '138 m²'],
      ['Befintligt material', 'Betongpannor, 80-tal'],
      ['Nytt material', 'Plåt, falsat, svart'],
      ['Hängrännor & stuprör', 'Byts'],
      ['Önskad start', 'Maj–juni 2026'],
      ['Budget', '250–300 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Bilder', '9 bifogade'],
    ],
  },
  {
    id: 'tillbyggnad',
    label: 'Tillbyggnad',
    description: 'För tillbyggnader, uterum, sovrum, garage eller sidobyggnad.',
    fields: [
      ['Typ', 'Uterum, isolerat'],
      ['Yta (m²)', '18 m²'],
      ['Bygglov + Attefall', 'Beviljat 2026-02'],
      ['Grund', 'Plintar'],
      ['Anslutning bef. hus', 'Ny dörr i fasad'],
      ['Önskad start', 'April 2026'],
      ['Budget', '220–280 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Bilder & ritningar', '5 bifogade'],
    ],
  },
  {
    id: 'fasad',
    label: 'Fasadrenovering',
    description: 'Ommålning, panelbyte eller putslagning, hela eller del av fasaden.',
    fields: [
      ['Fastighetstyp', 'Villa, 1-plan'],
      ['Fasadyta (m²)', '186 m²'],
      ['Befintlig fasad', 'Stående träpanel'],
      ['Åtgärd', 'Skrapas + målas'],
      ['Färgsystem', 'Linoljefärg, faluröd'],
      ['Önskad start', 'Juni 2026'],
      ['Budget', '90–130 000 kr'],
      ['ROT-utrymme kvar i år', '31 000 kr'],
      ['Bilder', '6 bifogade'],
    ],
  },
  {
    id: 'altan',
    label: 'Altanbygge',
    description: 'Nybyggnad eller renovering av altan, trall och räcken.',
    fields: [
      ['Typ', 'Nybyggnad'],
      ['Yta (m²)', '24 m²'],
      ['Höjd över mark', '0,8 m'],
      ['Grund', 'Plintar, 12 st'],
      ['Trall', 'Tryckimpregnerad furu, NTR AB'],
      ['Önskad start', 'Maj 2026'],
      ['Budget', '60–90 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Bilder', '3 bifogade'],
    ],
  },
  {
    id: 'dranering',
    label: 'Dräneringsarbete',
    description: 'Dränering runt grund, schakt, dräneringsrör och fuktskydd.',
    fields: [
      ['Husgrund', 'Villa, källare'],
      ['Längd (lpm)', '32 lpm'],
      ['Schaktdjup', 'Ca 2,4 m'],
      ['Fukttecken', 'Lukt + saltutfällning'],
      ['Åtkomst grävmaskin', 'God, fri infart'],
      ['Önskad start', 'Maj 2026 (efter tjäle)'],
      ['Budget', '180–240 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Bilder', '4 bifogade'],
    ],
  },
];

const painPoints = [
  {
    pain: 'Kunder skriver "kan du ge en ungefärlig kostnad?" utan budget, tidsram eller bilder.',
    solution: 'Quotly anpassar frågeformulär efter jobbtypen och samlar in budget-spann, tidsram och bilder innan förfrågan når dig.',
  },
  {
    pain: 'Ritningar och bilder fastnar i 4 olika mejl-trådar.',
    solution: 'Allt material laddas upp direkt i förfrågan, samlat på leadkortet.',
  },
  {
    pain: 'Du räknar om ROT-avdrag manuellt på varje rad.',
    solution: 'ROT räknas automatiskt på alla arbetsrader, så kunden ser slutpriset direkt.',
  },
  {
    pain: 'Även med mallar måste du justera priser och material på varje ny offert.',
    solution: 'Quotly lär sig dina material och priser från tidigare jobb, så varje ny offert blir vassare än den förra.',
  },
];

function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-white shadow-sm ${className}`}
    >
      <span className="text-[10px] uppercase tracking-wider text-stone-400">Bild kommer</span>
    </div>
  );
}

export default function ByggPage() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <MarketingHeader />

      {/* Hero — half-height, image fades into the tan gradient via mask */}
      <section className="relative h-[60vh] min-h-[520px] overflow-hidden">
        <div
          className="absolute inset-y-0 right-0 left-[28%] bg-contain bg-right bg-no-repeat"
          style={{
            backgroundImage: 'url(/bilder/bygg-page-hero.jpg)',
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%)',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(200,160,121,0.95) 0%, rgba(200,160,121,0.95) 40%, rgba(200,160,121,0.75) 55%, rgba(200,160,121,0.45) 70%, rgba(200,160,121,0.2) 85%, transparent 96%)',
          }}
        />

        <div className="absolute inset-0 flex items-center">
          <div className="w-1/2 pl-20 sm:pl-32 lg:pl-44 pr-6">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0, 1] }}
              className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent mb-4"
            >
              BYGG
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0, 1] }}
              className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Sluta jaga förfrågningar. <br className="hidden sm:inline" />Börja vinna jobben.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0, 1] }}
              className="mt-4 max-w-xl text-base text-stone-700 sm:text-lg"
            >
              Med strukturerade förfrågningar kan du snabbt se vilka jobb som är värda att lägga
              tid på. Quotly gör offertarbetet, så att du kan göra jobbet.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.4, 0, 1] }}
              className="mt-8"
            >
              <Link to="/auth?signup=true">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
                  <Button size="lg" className="gap-2 bg-accent text-white hover:bg-accent/90 px-8 text-base shadow-lg shadow-accent/30">
                    Kom igång gratis
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2 — Pipeline demo */}
      <PipelineDemo
        examples={byggExamples}
        heading="Du gör jobbet. Quotly gör resten."
        intro="Quotly samlar in mått, bilder och bygglov redan från första kontakt och bygger offerten åt dig. Slipp uppföljningssamtal, fokusera på hantverket."
      />

      {/* Section 3 — Bygg form templates 3D slider */}
      <FormSliderShowcase templates={byggFormTemplates} />

      {/* Section 4 — ROT-avdrag automation */}
      <section className="bg-stone-50/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
              className="order-2 lg:order-1"
            >
              <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent mb-4">
                ROT-avdrag
              </span>
              <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">
                ROT räknas automatiskt, per arbetsrad
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Redan i kundformuläret anger kunden om ROT-avdrag ska användas och hur
                mycket av årets 50&nbsp;000&nbsp;kr-tak som redan är förbrukat. Quotly
                räknar alltid på rätt belopp.
              </p>
              <p className="text-lg text-muted-foreground">
                Kunden ser sitt slutpris efter ROT redan i offerten. Inga manuella uträkningar,
                inga frågor från Skatteverket på efterhand.
              </p>
            </motion.div>

            {/* Mock quote card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
              className="order-1 lg:order-2"
            >
              <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="border-b border-stone-100 px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                      Offert
                    </div>
                    <div className="font-heading text-base font-bold mt-0.5">Takbyte villa</div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">Q-2026-0143</div>
                </div>

                {/* Material */}
                <div className="px-6 py-4 border-b border-stone-100">
                  <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-3">
                    Material
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Tegelpannor (standardröd)</span>
                      <span className="tabular-nums text-foreground">16&nbsp;000&nbsp;kr</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Underlagspapp + läkt</span>
                      <span className="tabular-nums text-foreground">7&nbsp;800&nbsp;kr</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Övriga material (4 rader)</span>
                      <span className="tabular-nums">26&nbsp;600&nbsp;kr</span>
                    </div>
                  </div>
                </div>

                {/* Arbete */}
                <div className="px-6 py-4 border-b border-stone-100 bg-accent/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                      Arbete
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      ROT-berättigat
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">60 timmar × 650 kr</span>
                    <span className="tabular-nums text-foreground">39&nbsp;000&nbsp;kr</span>
                  </div>
                </div>

                {/* Subtotal + ROT */}
                <div className="px-6 py-4 border-b border-stone-100 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Summa</span>
                    <span className="tabular-nums text-foreground">89&nbsp;400&nbsp;kr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700 font-medium">ROT-avdrag (30% av arbete)</span>
                    <span className="tabular-nums text-emerald-700 font-medium">−11&nbsp;700&nbsp;kr</span>
                  </div>
                </div>

                {/* Du betalar */}
                <div className="px-6 py-5 bg-stone-50">
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-base font-bold">Du betalar</span>
                    <span className="font-heading text-2xl font-bold tabular-nums">77&nbsp;700&nbsp;kr</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Slutpris efter ROT-avdrag, exkl. moms
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 4 — Pain points (Innan / Med Quotly) */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">
              Slipp det jobbiga med offertarbetet
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Det här fixar Quotly så du kan lägga tiden där den hör hemma. På taket, inte vid skrivbordet.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto lg:auto-rows-fr">
            {painPoints.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: i * 0.15, ease: [0.25, 0.4, 0, 1] }}
                className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch lg:h-full"
              >
                {/* Pain card */}
                <div className="rounded-xl border border-red-200/60 bg-red-50/40 px-5 py-4 flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 shrink-0 mt-0.5">
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{p.pain}</p>
                </div>

                {/* Arrow (desktop only) */}
                <div className="hidden lg:flex items-center justify-center px-2">
                  <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
                    <path
                      d="M0 7 L26 7 M22 1 L26 7 L22 13"
                      stroke="#c85a1f"
                      strokeWidth={3}
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                    />
                  </svg>
                </div>

                {/* Solution card */}
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-5 py-4 flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{p.solution}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-6">
            Redo att vinna fler bygg-jobb?
          </h2>
          <Link to="/auth?signup=true">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              <Button size="lg" className="gap-2 bg-accent text-white hover:bg-accent/90">
                Skapa ditt konto gratis
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
