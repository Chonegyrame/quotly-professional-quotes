import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock, FileText, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';
import { MarketingHeader } from '@/components/MarketingHeader';
import { PipelineDemo, type Example } from '@/components/PipelineDemo';
import { FormSliderShowcase, type SliderTemplate } from '@/components/FormSliderShowcase';
import { Footer } from '@/components/Footer';

const vvsExamples: Example[] = [
  {
    id: 'varmepump',
    tabLabel: 'Värmepumpsbyte',
    customerName: 'Karin Forsberg',
    customerInitials: 'KF',
    customerVia: 'Privatperson',
    freeText:
      'Vill byta vår luft/vatten F2025 från 2008, börjar låta konstigt och förbrukningen ökar. Helst NIBE. Vill ha klart före höstvintern.',
    classifiedAs: 'Värmepumpsbyte',
    routedTo: 'Värmepump',
    leadId: 'INC-2026-0356',
    submittedAt: 'kl 16:42 idag',
    customerEmail: 'karin.f@example.se',
    customerPhone: '070-987 65 43',
    customerAddress: 'Tyresö, Stockholm',
    distanceKm: 22,
    templateName: 'Värmepump byte',
    formLabel: 'värmepump',
    formAnswers: [
      { label: 'Befintlig anläggning', value: 'NIBE F2025, 2008' },
      { label: 'Önskad ny pump', value: 'Luft/vatten 10–12 kW' },
      { label: 'Märkespreferens', value: 'NIBE' },
      { label: 'Befintlig elcentral', value: '20 A, 3-fas' },
      { label: 'Husyta', value: '160 m², 1½-plan' },
      { label: 'Önskad start', value: 'Senast september 2026' },
      { label: 'Grön teknik-utrymme kvar i år', value: '50 000 kr' },
      { label: 'Bilder befintlig pump + central', value: '5 bifogade' },
    ],
    score: 81,
    tier: 'Stark',
    fitScore: 88,
    intentScore: 82,
    clarityScore: 75,
    summary:
      'Värmepumpsbyte med känd anläggning och tydlig tidsram. Platsbesök för exakt rörläggning.',
    flags: [
      { label: 'Anläggning dokumenterad', type: 'green' },
      { label: 'Tydlig tidsram och budget', type: 'green' },
      { label: 'Saknas: radiatordata', type: 'red' },
    ],
    quoteNumber: 'Q-2026-0356',
    quoteTitle: 'Värmepumpsbyte luft/vatten 12 kW',
    quoteLines: [
      { name: 'NIBE S2125-12, luft/vatten', qty: '1 st', price: 89000 },
      { name: 'Demontering befintlig F2025', qty: '1 lot', price: 4200 },
      { name: 'Rördragning + isolering', qty: '1 lot', price: 8500 },
      { name: 'Elanslutning (befintlig grupp)', qty: '1 lot', price: 4800 },
      { name: 'Påfyllning köldbärare + idriftsättning', qty: '1 lot', price: 6200 },
      { name: 'Bortforsling', qty: '1 lot', price: 2500 },
    ],
    laborHours: 22,
    laborRate: 850,
    rotEligible: true,
    notes: 'Berättigar till grön teknik-avdrag (50 % på arbete + material för värmepumpsbyte).',
  },
  {
    id: 'badrum-vag',
    tabLabel: 'Badrum, lite info',
    customerName: 'Peter Nilsson',
    customerInitials: 'PN',
    customerVia: 'Privatperson',
    freeText:
      'Hej, vi vill renovera badrummet. Vad kostar det ungefär? Det är ett vanligt badrum.',
    classifiedAs: 'Badrumsrenovering',
    routedTo: 'Badrum',
    leadId: 'INC-2026-0357',
    submittedAt: 'kl 13:05 idag',
    customerEmail: 'p.nilsson@example.se',
    customerPhone: '073-111 22 33',
    customerAddress: 'Solna, Stockholm',
    distanceKm: 8,
    templateName: 'Badrumsrenovering',
    formLabel: 'badrum',
    formAnswers: [
      { label: 'Fastighetstyp', value: 'Lägenhet i BRF' },
      { label: 'Storlek (m²)', value: 'Ca 5 m² (uppskattat)' },
      { label: 'Omfattning', value: 'Vet ej', vetEj: true },
      { label: 'Befintlig tätskikt-ålder', value: 'Vet ej', vetEj: true },
      { label: 'VVS-arbeten önskade', value: 'Vet ej', vetEj: true },
      { label: 'Styrelsegodkännande', value: 'Vet ej', vetEj: true },
      { label: 'Tidsram', value: 'Inom året någon gång' },
      { label: 'Budget', value: 'Vet ej', vetEj: true },
      { label: 'Bilder', value: '1 bifogad' },
    ],
    score: 50,
    tier: 'Mellan',
    fitScore: 70,
    intentScore: 45,
    clarityScore: 35,
    summary:
      'Allmän renoveringsförfrågan med lite uppskattad yta men vag på omfattning, VVS-arbeten och budget. Boka platsbesök för säker offert.',
    flags: [
      { label: 'Tydlig fastighetstyp', type: 'green' },
      { label: 'Vet ej omfattning', type: 'red' },
      { label: 'Vet ej VVS-arbeten eller styrelsekrav', type: 'red' },
    ],
    quoteNumber: 'Q-2026-0357',
    quoteTitle: 'Badrumsrenovering BRF, helrenovering',
    quoteLines: [
      { name: 'Demontering + bortforsling', qty: '5 m²', price: 8500 },
      { name: 'Tätskikt PCI VG2020 inkl. underlag', qty: '5 m²', price: 14500 },
      { name: 'Ny golvbrunn + avloppsanslutning', qty: '1 st', price: 6800 },
      { name: 'Klinker golv + kakel vägg, standard', qty: '5 m²', price: 28000 },
      { name: 'Inredning (WC, handfat, blandare)', qty: '1 lot', price: 18500 },
      { name: 'Belysning + el-arbeten', qty: '1 lot', price: 5500 },
      { name: 'Slutbesiktning + dokumentation', qty: '1 st', price: 3200 },
    ],
    laborHours: 50,
    laborRate: 850,
    rotEligible: true,
    notes: 'Indikativt baserat på antagen helrenovering, ca 5 m². Ytskiktsbyte (~45 000 kr) eller helrenovering med flytt av VVS (~165 000 kr) som alternativ. Slutgiltig offert efter platsbesök.',
  },
];

const vvsFormTemplates: SliderTemplate[] = [
  {
    id: 'badrum',
    label: 'Badrum helrenovering',
    description: 'Komplett renovering av badrum, från rivning till nya tätskikt och VVS.',
    fields: [
      ['Fastighetstyp', 'Lägenhet i BRF'],
      ['Storlek (m²)', '6 m²'],
      ['Omfattning', 'Helrenovering, nytt tätskikt'],
      ['Tätskikt-system', 'PCI VG2020'],
      ['VVS-arbeten', 'Byte av blandare, WC, golvbrunn'],
      ['Styrelsegodkännande', 'Klart'],
      ['Önskad start', 'Augusti 2026'],
      ['Budget', '160–210 000 kr'],
      ['ROT-utrymme kvar i år', '38 000 kr'],
    ],
  },
  {
    id: 'varmepump',
    label: 'Värmepumpsbyte',
    description: 'Byte av befintlig värmepump, luft/vatten eller bergvärme. Med eller utan ny inomhusenhet.',
    fields: [
      ['Befintlig anläggning', 'NIBE F2025, 2008'],
      ['Ny pump', 'Luft/vatten 12 kW'],
      ['Märkespreferens', 'NIBE'],
      ['Husyta', '160 m², 1½-plan'],
      ['Befintlig central', '20 A, 3-fas'],
      ['Önskad start', 'Senast september 2026'],
      ['Budget', '110–140 000 kr'],
      ['Grön teknik-utrymme kvar i år', '50 000 kr'],
      ['Bilder befintlig anläggning', '5 bifogade'],
    ],
  },
  {
    id: 'varmvattenberedare',
    label: 'Varmvattenberedare',
    description: 'Byte eller nyinstallation av varmvattenberedare, 100 till 300 liter.',
    fields: [
      ['Befintlig beredare', 'CTC 200L, 14 år'],
      ['Ny beredare', 'NIBE Eminent 300L'],
      ['Placering', 'Källare, befintlig anslutning'],
      ['Elanslutning', 'Befintlig 16 A 3-fas'],
      ['Bortforsling befintlig', 'Ingår'],
      ['Önskad start', 'Inom 2 veckor'],
      ['Budget', '14–18 000 kr'],
      ['ROT-utrymme kvar i år', '40 000 kr'],
      ['Bild befintlig + plats', '2 bifogade'],
    ],
  },
  {
    id: 'stambyte',
    label: 'Stambyte BRF',
    description: 'Stambyte i lägenhet, kök och bad, samordnat med föreningens stamentreprenör.',
    fields: [
      ['Lägenhetstyp', '3 rok, 78 m²'],
      ['Kök + bad', 'Båda ingår'],
      ['Befintliga stammar', 'Gjutjärn, 60-tal'],
      ['Föreningens entreprenör', 'Samordnas, klart'],
      ['Demontering & återställning', 'Ingår'],
      ['Önskad start', 'November 2026'],
      ['Budget', '180–230 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Ritningar + plan', '3 bifogade'],
    ],
  },
  {
    id: 'akut-lacka',
    label: 'Akut läcka',
    description: 'Akutjobb, läcka, stopp eller frusna ledningar. Timpris och framkörning.',
    fields: [
      ['Typ av problem', 'Läcka under diskbänk'],
      ['Vatten avstängt', 'Ja, via huvudkran'],
      ['Plats', 'Kök, lägenhet 4 tr'],
      ['Tillträde', 'Hemma fram till kl 19'],
      ['Önskad ETA', 'Inom 2 timmar'],
      ['Befintlig försäkring', 'Trygg-Hansa, anmäld'],
      ['Timpris (akut)', '950 kr/h'],
      ['Framkörning', '1 200 kr (zon Storstockholm)'],
      ['Bild på läckan', '2 bifogade'],
    ],
  },
  {
    id: 'ny-wc',
    label: 'Ny WC + handfat',
    description: 'Mindre installation, byte av WC och handfat utan ytskiktsarbete.',
    fields: [
      ['Antal WC', '1 st'],
      ['Modell', 'Ifö Sign vägghängd'],
      ['Antal handfat', '1 st'],
      ['Modell', 'Ifö Spira 60 cm'],
      ['Demontering befintligt', 'Ingår'],
      ['Bortforsling', 'Ingår'],
      ['Önskad start', 'Maj 2026'],
      ['Budget', '14–18 000 kr'],
      ['ROT-utrymme kvar i år', '46 000 kr'],
    ],
  },
  {
    id: 'undercentral',
    label: 'Undercentral villa',
    description: 'Ny undercentral för fjärrvärme eller värmepumpsanslutning. Rör + reglering.',
    fields: [
      ['Anslutningstyp', 'Fjärrvärme'],
      ['Husyta', '180 m²'],
      ['Befintlig central', 'Ja, ska bytas'],
      ['Reglering', 'Ny styrning, väderkomp'],
      ['Rörläggning', 'Ca 8 m, isolerad'],
      ['Önskad start', 'Juni 2026'],
      ['Budget', '45–60 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Ritning + bilder', '4 bifogade'],
    ],
  },
];

const vvsPainPoints = [
  {
    pain: 'Akutjobb dyker upp samtidigt som offertarbetet ligger på hög.',
    solution: 'Quotly har två parallella mallar, akut (timpris + framkörning) och planerat (fast pris), så ingen offert glöms bort när telefonen ringer.',
  },
  {
    pain: 'Kunden vill ha "ungefärligt pris" på badrum utan att veta yta, val eller vad som finns bakom kaklet.',
    solution: 'Anpassade frågor (yta, val av blandare, dolda VVS-arbeten, styrelsegodkännande) ger en tidig prisspann utan platsbesök.',
  },
  {
    pain: 'Framkörning, hjälpmaterial och container glöms bort på hälften av jobben.',
    solution: 'Standardrader läggs till automatiskt på rätt jobbtyp, akut får framkörning, badrum får hjälpmaterial-påslag.',
  },
  {
    pain: 'Värmepumpskunder jämför priser med Polarpumpen och vill förhandla.',
    solution: 'Quotly visar split mellan pump (varumärkespris) och installation (din kostnad), så förhandlingen handlar bara om ditt arbete.',
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

const heatPumpTiers = [
  {
    label: 'Luft/luft',
    base: 35000,
    deduction: 5500,
    detail: 'Kompakt installation, 1–2 inomhusenheter, idriftsättning.',
  },
  {
    label: 'Luft/vatten',
    base: 145000,
    deduction: 30000,
    detail: 'Inkl. demontering, rörläggning, elanslutning, idriftsättning.',
    highlight: true,
  },
  {
    label: 'Bergvärme',
    base: 240000,
    deduction: 50000,
    detail: 'Borrning, kollektor, inomhusenhet, full installation och igångkörning.',
  },
];

function formatKr(n: number) {
  return n.toLocaleString('sv-SE').replace(/,/g, ' ');
}

export default function VvsPage() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <MarketingHeader />

      {/* Hero — half-height, image fades into the water-blue gradient via mask */}
      <section className="relative h-[60vh] min-h-[520px] overflow-hidden">
        <div
          className="absolute inset-y-0 right-0 left-[28%] bg-contain bg-right bg-no-repeat"
          style={{
            backgroundImage: 'url(/bilder/vvs-page-hero.jpg)',
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%)',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(126,182,217,0.95) 0%, rgba(126,182,217,0.95) 40%, rgba(126,182,217,0.75) 55%, rgba(126,182,217,0.45) 70%, rgba(126,182,217,0.2) 85%, transparent 96%)',
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
              VVS
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0, 1] }}
              className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Akutjobb och stora projekt. <br className="hidden sm:inline" />Offerter på minuter.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0, 1] }}
              className="mt-4 max-w-xl text-base text-stone-700 sm:text-lg"
            >
              Quotly skiljer akutjobben från de planerade och bygger rätt offert för båda.
              Värmepumpsbyte, stambyte eller läcka i diskbänken, allt i samma flöde.
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
        examples={vvsExamples}
        heading="Du gör jobbet. Quotly gör resten."
        intro="Quotly samlar in befintlig anläggning, husyta och tidsram redan från första kontakt och bygger offerten åt dig. Slipp uppföljningssamtal, fokusera på rörläggningen."
      />

      {/* Section 3 — VVS form templates 3D slider */}
      <FormSliderShowcase templates={vvsFormTemplates} />

      {/* Section 4 — Värmepumpsstege */}
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
                Värmepumpsmarknaden 2026
              </span>
              <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">
                Tre prisklasser, ett offertflöde
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Värmepumpsbyten dominerar VVS-marknaden 2026. Quotly har separata mallar för
                luft/luft, luft/vatten och bergvärme, så rätt rader, rätt arbetstid och rätt grön
                teknik-avdrag följer med automatiskt.
              </p>
              <p className="text-lg text-muted-foreground">
                Kunden ser ett rent prisspann i offerten, inte ett klotter av rader. Du slipper
                svara på "vad blir det efter avdrag?" tre gånger per kund.
              </p>
            </motion.div>

            {/* Värmepumpsstege */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
              className="order-1 lg:order-2"
            >
              <div className="space-y-3">
                {heatPumpTiers.map((tier, i) => {
                  const finalPrice = tier.base - tier.deduction;
                  return (
                    <motion.div
                      key={tier.label}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.4, delay: i * 0.1, ease: [0.25, 0.4, 0, 1] }}
                      className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
                        tier.highlight ? 'border-accent shadow-md' : 'border-stone-200'
                      }`}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-heading text-base font-bold">{tier.label}</span>
                            {tier.highlight && (
                              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                                Vanligast
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums line-through">
                            {formatKr(tier.base)} kr
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          {tier.detail}
                        </p>
                        <div className="flex items-baseline justify-between border-t border-stone-100 pt-3">
                          <span className="text-[11px] font-medium text-emerald-700">
                            Efter grön teknik (50 % på arbete)
                          </span>
                          <span className="font-heading text-xl font-bold tabular-nums">
                            {formatKr(finalPrice)}&nbsp;kr
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 5 — Akut vs Planerat */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-14">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent mb-4">
              Två flöden, ett system
            </span>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">
              Akut eller planerat. Quotly vet skillnaden.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Larmsamtalet kl 14:30 och helrenoveringen i augusti, samma inkorg, två olika mallar.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto">
            {/* Akut */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1] }}
              className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                  <Clock className="h-5 w-5 text-red-700" strokeWidth={2.2} />
                </div>
                <h3 className="font-heading text-base font-bold">Akutjobb</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Läcka, stopp eller frysning. Quotly slipper de tunga frågorna och fokuserar på
                tillträde, ETA och försäkring.
              </p>
              <div className="space-y-2 border-t border-red-200/60 pt-4">
                {[
                  ['Prismodell', 'Timpris + framkörning'],
                  ['Frågor', 'Tillträde, ETA, försäkring'],
                  ['Standardrader', 'Framkörning 1 200 kr, jourtillägg'],
                  ['Offert klar på', '< 5 min'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Planerat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.4, 0, 1] }}
              className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <Wrench className="h-5 w-5 text-emerald-700" strokeWidth={2.2} />
                </div>
                <h3 className="font-heading text-base font-bold">Planerat jobb</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Badrum, värmepump, stambyte. Quotly samlar in fastighet, omfattning, val av
                material och styrelsegodkännande.
              </p>
              <div className="space-y-2 border-t border-emerald-200/60 pt-4">
                {[
                  ['Prismodell', 'Fast pris från offert'],
                  ['Frågor', 'Yta, omfattning, materialval'],
                  ['Standardrader', 'Hjälpmaterial-påslag, container'],
                  ['Offert klar på', '< 15 min'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 6 — Pain points */}
      <section className="bg-stone-50/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">
              Slipp det jobbiga med offertarbetet
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Det här fixar Quotly så du kan lägga tiden där den hör hemma. Vid rören, inte vid skrivbordet.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto lg:auto-rows-fr">
            {vvsPainPoints.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: i * 0.15, ease: [0.25, 0.4, 0, 1] }}
                className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch lg:h-full"
              >
                <div className="rounded-xl border border-red-200/60 bg-red-50/40 px-5 py-4 flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 shrink-0 mt-0.5">
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{p.pain}</p>
                </div>

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

      {/* Section 7 — Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-6">
            Redo att vinna fler VVS-jobb?
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
