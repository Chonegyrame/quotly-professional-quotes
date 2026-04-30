import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, FileText, ShieldCheck, FileSignature, Stamp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';
import { MarketingHeader } from '@/components/MarketingHeader';
import { PipelineDemo, type Example } from '@/components/PipelineDemo';
import { FormSliderShowcase, type SliderTemplate } from '@/components/FormSliderShowcase';
import { Footer } from '@/components/Footer';

const elExamples: Example[] = [
  {
    id: 'laddbox',
    tabLabel: 'Laddbox 22 kW',
    customerName: 'Maria Lundgren',
    customerInitials: 'ML',
    customerVia: 'Privatperson',
    freeText:
      'Vill installera laddbox för Tesla Model Y, gärna Easee Home 22 kW med lastbalansering. Befintlig 3-fas, 25 A huvudsäkring. Vill ha klart innan semesterresan i juni.',
    classifiedAs: 'Laddbox + lastbalansering',
    routedTo: 'Laddstation',
    leadId: 'INC-2026-0287',
    submittedAt: 'kl 09:14 idag',
    customerEmail: 'maria.l@example.se',
    customerPhone: '073-456 78 90',
    customerAddress: 'Sollentuna, Stockholm',
    distanceKm: 14,
    templateName: 'Laddbox',
    formLabel: 'laddbox',
    formAnswers: [
      { label: 'Laddstation', value: 'Easee Home 22 kW' },
      { label: 'Befintlig huvudsäkring', value: '25 A, 3-fas' },
      { label: 'Lastbalansering', value: 'Ja, Easee Equalizer' },
      { label: 'Avstånd elcentral → laddplats', value: '8 m, fritt utomhus' },
      { label: 'Montagetyp', value: 'Vägg i garage' },
      { label: 'Önskad start', value: 'Maj 2026' },
      { label: 'Grön teknik-utrymme kvar i år', value: '50 000 kr' },
      { label: 'Bilder elcentral + montageplats', value: '3 bifogade' },
    ],
    score: 89,
    tier: 'Mycket stark',
    fitScore: 92,
    intentScore: 90,
    clarityScore: 85,
    summary:
      'Konkret laddboxjobb med vald modell, befintlig 3-fas och tydlig tidsram. Kan offereras direkt utan platsbesök.',
    flags: [
      { label: 'Vald laddstation och modell', type: 'green' },
      { label: 'Befintlig 3-fas bekräftad', type: 'green' },
      { label: 'Tidsram låst', type: 'green' },
    ],
    quoteNumber: 'Q-2026-0287',
    quoteTitle: 'Laddbox Easee Home 22 kW + lastbalansering',
    quoteLines: [
      { name: 'Easee Home 22 kW, vit', qty: '1 st', price: 12800 },
      { name: 'Easee Equalizer (lastbalansering)', qty: '1 st', price: 3500 },
      { name: 'Kabel EKKJ 5G6, mantlad', qty: '12 m', price: 1800 },
      { name: 'Kabelkanal + infästning', qty: '1 lot', price: 1200 },
      { name: 'Säkring + jordfelsbrytare type B', qty: '1 lot', price: 2400 },
      { name: 'Märkning + driftinstruktion', qty: '1 st', price: 600 },
    ],
    laborHours: 8,
    laborRate: 750,
    rotEligible: false,
    notes: 'Berättigar till grön teknik-avdrag (50 %). Driftsättning och egenkontroll ingår.',
  },
  {
    id: 'solceller-vag',
    tabLabel: 'Solceller? Frågor',
    customerName: 'Johan Bergquist',
    customerInitials: 'JB',
    customerVia: 'Privatperson',
    freeText:
      'Hej, funderar på solceller, är det dyrt? Vad kostar det typ?',
    classifiedAs: 'Solcellsanläggning',
    routedTo: 'Solel',
    leadId: 'INC-2026-0288',
    submittedAt: 'kl 22:47 igår',
    customerEmail: 'jb_85@example.se',
    customerPhone: '—',
    customerAddress: 'Vet ej',
    distanceKm: 0,
    templateName: 'Solceller',
    formLabel: 'solcells',
    formAnswers: [
      { label: 'Fastighetstyp', value: 'Vet ej', vetEj: true },
      { label: 'Takmaterial', value: 'Vet ej', vetEj: true },
      { label: 'Takyta / orientering', value: 'Vet ej', vetEj: true },
      { label: 'Årlig elförbrukning (kWh)', value: 'Vet ej', vetEj: true },
      { label: 'Befintlig huvudsäkring', value: 'Vet ej', vetEj: true },
      { label: 'Tidsram', value: 'Vet ej', vetEj: true },
      { label: 'Budget', value: 'Vet ej', vetEj: true },
      { label: 'Bilder tak / fasad', value: '0 bifogade', vetEj: true },
    ],
    score: 33,
    tier: 'Svag',
    fitScore: 50,
    intentScore: 25,
    clarityScore: 20,
    summary:
      'Generell prisförfrågan utan information om tak, förbrukning eller fastighet. Skicka kort svar med prisspann och länk till fördjupningsformulär.',
    flags: [
      { label: 'Inget om tak eller fastighet', type: 'red' },
      { label: 'Ingen förbrukningsdata', type: 'red' },
      { label: 'Ingen tidsram eller budget', type: 'red' },
    ],
    quoteNumber: 'Q-2026-0288',
    quoteTitle: 'Solcellsanläggning, prisspann',
    quoteLines: [
      { name: 'Indikativt: 6 kW-paket (15–18 paneler)', qty: '1 lot', price: 95000 },
      { name: 'Indikativt: 10 kW-paket (24–28 paneler)', qty: '1 lot', price: 145000 },
      { name: 'Tillkommer: ev. förstärkt huvudsäkring', qty: '—', price: 0 },
    ],
    laborHours: 0,
    laborRate: 0,
    rotEligible: false,
    notes: 'Endast indikativa paketpriser. Slutgiltig offert kräver platsbesök, takmått och förbrukningsdata.',
  },
];

const elFormTemplates: SliderTemplate[] = [
  {
    id: 'laddbox',
    label: 'Laddbox',
    description: 'För installation av laddstation, från enkel wallbox till lastbalanserad anläggning.',
    fields: [
      ['Laddstation', 'Easee Home 22 kW'],
      ['Befintlig huvudsäkring', '25 A, 3-fas'],
      ['Lastbalansering', 'Ja'],
      ['Avstånd central → laddplats', '8 m'],
      ['Montagetyp', 'Vägg i garage'],
      ['Önskad start', 'Maj 2026'],
      ['Budget', '20–30 000 kr'],
      ['Grön teknik-utrymme kvar i år', '50 000 kr'],
      ['Bilder elcentral + plats', '3 bifogade'],
    ],
  },
  {
    id: 'solceller',
    label: 'Solcellsanläggning',
    description: 'Komplett solcellspaket, paneler, växelriktare, montagesystem och elanslutning.',
    fields: [
      ['Fastighetstyp', 'Villa, 1½-plan'],
      ['Takmaterial + lutning', 'Plåt, 27°'],
      ['Takyta sydvänd', '52 m²'],
      ['Önskad effekt', '8 kW (ca 20 paneler)'],
      ['Årlig elförbrukning', '14 200 kWh'],
      ['Befintlig huvudsäkring', '20 A, 3-fas'],
      ['Önskad start', 'Augusti 2026'],
      ['Budget', '120–160 000 kr'],
      ['Bilder tak + fasad', '8 bifogade'],
    ],
  },
  {
    id: 'sakringsskap',
    label: 'Säkringsskåpsbyte',
    description: 'Byte av gammal proppsentral mot modern central med jordfelsbrytare och egen mätning.',
    fields: [
      ['Fastighetstyp', 'Villa, 70-tal'],
      ['Befintlig central', 'Proppskåp, 16 grupper'],
      ['Önskad central', 'Modulär, jordfelsbrytare per grupp'],
      ['Behov av servisledning', 'Nej, befintlig OK'],
      ['Effekt-/elmätarbyte', 'Ej aktuellt'],
      ['Önskad start', 'Juni 2026'],
      ['Budget', '25–35 000 kr'],
      ['ROT-utrymme kvar i år', '38 000 kr'],
      ['Bilder befintlig central', '4 bifogade'],
    ],
  },
  {
    id: 'gruppcentral',
    label: 'Gruppcentral / undercentral',
    description: 'Ny gruppcentral i tillbyggnad, garage eller verkstad. Med eller utan egen mätning.',
    fields: [
      ['Placering', 'Garage, 18 m²'],
      ['Antal grupper', '8 grupper, 4 belysning + 4 uttag'],
      ['Tillkopplad effekt', 'Verkstad, 16 A 3-fas'],
      ['Avstånd huvudcentral', '14 m'],
      ['Markarbeten', 'Ingår, ca 12 m'],
      ['Önskad start', 'Juli 2026'],
      ['Budget', '35–50 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Ritning + situationsplan', '2 bifogade'],
    ],
  },
  {
    id: 'belysning',
    label: 'Belysning utomhus',
    description: 'Trädgårdsbelysning, fasadarmaturer, infart, pollare. Schakt och styrning.',
    fields: [
      ['Yta', 'Trädgård + infart, ca 320 m²'],
      ['Antal armaturer', '14 (8 pollare + 6 spot)'],
      ['Schakt + kabeldragning', 'Ca 60 lpm'],
      ['Styrning', 'Smart hub, app + skymningsrelä'],
      ['Befintlig kapacitet', 'Ledig grupp finns'],
      ['Önskad start', 'April 2026'],
      ['Budget', '40–55 000 kr'],
      ['ROT-utrymme kvar i år', '50 000 kr'],
      ['Bilder + skiss', '6 bifogade'],
    ],
  },
  {
    id: 'datanat',
    label: 'Datanät / nätverksuttag',
    description: 'Nätverksuttag i hela huset, patchpanel, switch och installationssamordning.',
    fields: [
      ['Fastighet', 'Villa, 2-plan, 165 m²'],
      ['Antal uttag', '12 st (Cat6a)'],
      ['Patchskåp', 'Klädkammare, ny placering'],
      ['Switchbehov', '24-port managed'],
      ['WiFi-AP', '2 takmonterade'],
      ['Önskad start', 'Maj 2026'],
      ['Budget', '20–28 000 kr'],
      ['ROT-utrymme kvar i år', '42 000 kr'],
      ['Ritningar + planlösning', '1 bifogad'],
    ],
  },
  {
    id: 'golvvarme',
    label: 'Värmekabel / elgolvvärme',
    description: 'Värmekabel under klinker eller laminat, från småbadrum till hela bottenvåningen.',
    fields: [
      ['Yta', '8 m², badrum'],
      ['Befintligt golv', 'Klinker, ska rivas'],
      ['Effekt', '120 W/m²'],
      ['Termostat', 'Programmerbar med golvgivare'],
      ['Anslutning', 'Befintlig grupp, jordfelsbrytare finns'],
      ['Önskad start', 'September 2026'],
      ['Budget', '12–18 000 kr'],
      ['ROT-utrymme kvar i år', '46 000 kr'],
      ['Bilder', '3 bifogade'],
    ],
  },
];

const elPainPoints = [
  {
    pain: 'Kunden vet inte amperén och du gissar tills platsbesök.',
    solution: 'Quotly ställer rätt frågor (befintlig huvudsäkring, antal grupper, jordfelsbrytare) så små jobb kan offereras utan platsbesök.',
  },
  {
    pain: 'Grön teknik-avdrag räknas i huvudet på varenda laddbox- och solcellsoffert.',
    solution: 'Quotly markerar grön teknik-berättigade rader och visar slutpriset till kund automatiskt, 50 % av arbete + material upp till taket.',
  },
  {
    pain: 'Kontrollrapporten skrivs i bilen mellan jobben.',
    solution: 'Mall för kontrollrapport och egenkontroll följer med varje genererad offert, klar att fyllas i digitalt på plats.',
  },
  {
    pain: 'Kunden lägger till "fixa lite el i samma veva" på sista minuten.',
    solution: 'Tilläggsarbeten läggs som separata rader med egen avdragsflagga, så priset motiveras utan diskussion.',
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

export default function ElPage() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <MarketingHeader />

      {/* Hero — half-height, image on the right with a soft mask fading into
          the sage gradient (no diagonal parallelogram, no hard seam). */}
      <section className="relative h-[60vh] min-h-[520px] overflow-hidden">
        <div
          className="absolute inset-y-0 right-0 left-[28%] bg-contain bg-right bg-no-repeat"
          style={{
            backgroundImage: 'url(/bilder/el-page-hero.jpg)',
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 12%, black 28%)',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(168,200,163,0.95) 0%, rgba(168,200,163,0.95) 40%, rgba(168,200,163,0.75) 55%, rgba(168,200,163,0.45) 70%, rgba(168,200,163,0.2) 85%, transparent 96%)',
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
              EL
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0, 1] }}
              className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Säkringsskåp till solceller. <br className="hidden sm:inline" />Snabba offerter, rätt material.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0, 1] }}
              className="mt-4 max-w-xl text-base text-stone-700 sm:text-lg"
            >
              Quotly samlar in huvudsäkring, takyta och förbrukning innan förfrågan landar hos dig.
              Du gör jobbet, Quotly räknar grön teknik-avdraget.
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
        examples={elExamples}
        heading="Du gör jobbet. Quotly gör resten."
        intro="Quotly samlar in säkring, kabelareor och takdata redan från första kontakt och bygger offerten åt dig. Slipp uppföljningssamtal, fokusera på installationen."
      />

      {/* Section 3 — El form templates 3D slider */}
      <FormSliderShowcase templates={elFormTemplates} />

      {/* Section 4 — Grön teknik-avdrag */}
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
                Grön teknik
              </span>
              <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">
                Grön teknik-avdrag, automatiskt på rätt rader
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Laddboxar, solceller och batterilager berättigar till grön teknik-avdrag, 50 % av
                arbete och material upp till 50&nbsp;000&nbsp;kr per person och år. Quotly markerar
                vilka rader som omfattas och räknar slutpriset åt kunden.
              </p>
              <p className="text-lg text-muted-foreground">
                Kunden ser sitt slutpris efter avdraget redan i offerten. Inga manuella uträkningar,
                inga "ska det inte vara billigare?" från kunden.
              </p>
            </motion.div>

            {/* Mock quote card — Grön teknik */}
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
                    <div className="font-heading text-base font-bold mt-0.5">Laddbox 22 kW + lastbalansering</div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">Q-2026-0287</div>
                </div>

                {/* Material */}
                <div className="px-6 py-4 border-b border-stone-100 bg-accent/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                      Material
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      Grön teknik-berättigat
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Easee Home 22 kW + Equalizer</span>
                      <span className="tabular-nums text-foreground">16&nbsp;300&nbsp;kr</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Övriga material (4 rader)</span>
                      <span className="tabular-nums">6&nbsp;000&nbsp;kr</span>
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
                      Grön teknik-berättigat
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">8 timmar × 750 kr</span>
                    <span className="tabular-nums text-foreground">6&nbsp;000&nbsp;kr</span>
                  </div>
                </div>

                {/* Subtotal + Grön teknik */}
                <div className="px-6 py-4 border-b border-stone-100 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Summa</span>
                    <span className="tabular-nums text-foreground">28&nbsp;300&nbsp;kr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700 font-medium">Grön teknik-avdrag (50 %)</span>
                    <span className="tabular-nums text-emerald-700 font-medium">−14&nbsp;150&nbsp;kr</span>
                  </div>
                </div>

                {/* Du betalar */}
                <div className="px-6 py-5 bg-stone-50">
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-base font-bold">Du betalar</span>
                    <span className="font-heading text-2xl font-bold tabular-nums">14&nbsp;150&nbsp;kr</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Slutpris efter grön teknik-avdrag, exkl. moms
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 5 — Behörighet & dokumentation */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-14">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent mb-4">
              Behörighet & dokumentation
            </span>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">
              Allt papper, automatiskt på plats
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Elsäkerhetsverket, kontrollrapport och driftinstruktion — Quotly fyller i det som ska
              fyllas i, varje gång.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                icon: ShieldCheck,
                title: 'Auktorisation på varje offert',
                body: 'Ditt registreringsnummer hos Elsäkerhetsverket och företagets behörighet visas automatiskt i offert och faktura — kunden ser direkt att du är registrerad.',
              },
              {
                icon: FileSignature,
                title: 'Kontrollrapport som mall',
                body: 'Egenkontroll och kontrollrapport genereras med rätt rader för jobbtypen. Fyll i digitalt på plats, signera, skicka som PDF.',
              },
              {
                icon: Stamp,
                title: 'Märkning + driftinstruktion',
                body: 'Kund får märkningsetiketter och driftinstruktion (laddbox, solanläggning, gruppcentral) bifogat i samma utskick som offerten godkänns.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.4, 0, 1] }}
                className="rounded-2xl border border-stone-200 bg-stone-50/40 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <item.icon className="h-5 w-5 text-accent" strokeWidth={2.2} />
                </div>
                <h3 className="font-heading text-base font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
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
              Det här fixar Quotly så du kan lägga tiden där den hör hemma. På elcentralen, inte vid skrivbordet.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto lg:auto-rows-fr">
            {elPainPoints.map((p, i) => (
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
            Redo att vinna fler el-jobb?
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
