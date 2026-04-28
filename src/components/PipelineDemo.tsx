import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export type Tier = 'Mycket stark' | 'Stark' | 'Mellan' | 'Svag';

export type FormAnswer = {
  label: string;
  value: string;
  vetEj?: boolean;
};

export type Flag = {
  label: string;
  type: 'green' | 'red';
};

export type QuoteLine = {
  name: string;
  qty: string;
  price: number;
};

export type Example = {
  id: string;
  tabLabel: string;

  // Box 1 — incoming request
  customerName: string;
  customerInitials: string;
  customerVia: string;
  freeText: string;
  classifiedAs: string;
  routedTo: string;
  leadId: string;
  submittedAt: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  distanceKm: number;

  // Box 2 — form + score
  templateName: string;
  /** Short noun used in Box 1 footer: "kunden skickas till {formLabel} formuläret". */
  formLabel?: string;
  formAnswers: FormAnswer[];
  score: number;
  tier: Tier;
  fitScore: number;
  intentScore: number;
  clarityScore: number;
  summary: string;
  flags: Flag[];

  // Box 3 — quote
  quoteNumber: string;
  quoteTitle: string;
  quoteLines: QuoteLine[];
  laborHours: number;
  laborRate: number;
  rotEligible: boolean;
  notes?: string;
};

const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
  'Mycket stark': { bg: 'bg-green-600', text: 'text-green-700' },
  Stark: { bg: 'bg-lime-500', text: 'text-lime-700' },
  Mellan: { bg: 'bg-amber-500', text: 'text-amber-700' },
  Svag: { bg: 'bg-stone-400', text: 'text-stone-600' },
};

// Small orange connector arrow that visually links the previous card to this
// one. Rendered on the RECEIVING card's wrapper (i > 0) so its Y position
// follows that card's actual bottom edge — which is what makes arrow 1 sit
// at card 2's bottom, arrow 2 at card 3's bottom, even when cards have
// different heights. Sibling of the animated motion.div so it doesn't scale
// with the spring pop-in. Color + stroke style match the chunky orange line
// from the landing page (LandingPage.tsx).
function PipelineConnector() {
  return (
    <>
      {/* Mobile / stacked: vertical, points down at the top of this card */}
      <div
        aria-hidden
        className="lg:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10"
      >
        <svg width="14" height="28" viewBox="0 0 14 28" fill="none">
          <path
            d="M7 0 L7 22 M1 16 L7 22 L13 16"
            stroke="#c85a1f"
            strokeWidth={4}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
      {/* Desktop: horizontal, points right. Tip sits ~22px to the left of
          this card's edge (well inside the gap, with breathing room before
          the receiving card); tail extends ~40px past the previous card's
          right edge — visually overlaps onto the previous card's bottom
          corner area, which reads as "the arrow originates from there". */}
      <div
        aria-hidden
        className="hidden lg:block absolute right-full bottom-3 mr-4 z-10"
      >
        <svg width="56" height="12" viewBox="0 0 56 12" fill="none">
          <path
            d="M0 6 L50 6 M46 1 L50 6 L46 11"
            stroke="#c85a1f"
            strokeWidth={4}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
    </>
  );
}

function ScoreBar({
  score,
  tier,
  size = 'sm',
}: {
  score: number;
  tier: Tier;
  size?: 'sm' | 'md';
}) {
  const colors = TIER_COLORS[tier];

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-14 h-1 rounded-full bg-stone-200 overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bg}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-xs font-bold tabular-nums ${colors.text}`}>{score}</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Score
        </span>
        <span className={`font-heading text-2xl font-bold tabular-nums ${colors.text}`}>
          {score}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bg}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function Box1({ example, minHeight }: { example: Example; minHeight?: number }) {
  return (
    <div
      className="rounded-2xl border border-accent/20 bg-white shadow-[0_8px_32px_-8px_rgba(200,90,31,0.29)] overflow-hidden flex flex-col"
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="border-b border-stone-100 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white text-base font-bold shadow-sm">
              1
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Förfrågan
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">{example.leadId}</div>
        </div>
      </div>

      <div className="px-5 py-5 flex-1">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-foreground shrink-0">
              {example.customerInitials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{example.customerName}</div>
              <div className="text-[11px] text-muted-foreground">{example.customerVia}</div>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
            Webformulär
          </span>
        </div>

        <p className="text-sm text-foreground leading-relaxed mb-4">{example.freeText}</p>

        <ul className="ml-4 space-y-1 text-xs text-muted-foreground list-disc marker:text-stone-400">
          <li>{example.customerAddress}</li>
          <li>
            <span className="text-foreground font-medium">{example.distanceKm} km</span> från ditt
            kontor
          </li>
          <li>{example.submittedAt}</li>
          <li>{example.customerPhone}</li>
          <li>{example.customerEmail}</li>
        </ul>
      </div>

      <div className="border-t border-stone-100 bg-stone-50 px-5 py-3.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Kunden ombeds beskriva jobbet kortfattat. Här identifierar Quotly uppdraget och
          kunden skickas till{' '}
          <span className="font-bold text-accent">
            {example.formLabel ?? example.templateName.toLowerCase()}
          </span>{' '}
          formuläret för att samla in tillräckligt med information för en tydlig bild av
          uppdraget.
        </p>
      </div>
    </div>
  );
}

function Box2({ example }: { example: Example }) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-white shadow-[0_8px_32px_-8px_rgba(200,90,31,0.29)] overflow-hidden flex flex-col">
      <div className="border-b border-stone-100 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white text-base font-bold shadow-sm">
              2
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Bedömning
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {example.templateName} formulär
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex-1">
        <div className="space-y-2">
          {example.formAnswers.map((a, i) => (
            <div key={i} className="flex justify-between items-start gap-3 text-xs">
              <span className="text-muted-foreground shrink-0">{a.label}</span>
              <span
                className={`font-medium text-right ${a.vetEj ? 'text-amber-600' : 'text-foreground'}`}
              >
                {a.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-stone-100 bg-stone-50 px-5 py-4">
        <ScoreBar score={example.score} tier={example.tier} size="md" />
        <div className="flex items-center gap-1.5 mt-3">
          <span
            className={`text-xs font-bold uppercase tracking-wide ${TIER_COLORS[example.tier].text}`}
          >
            {example.tier}
          </span>
          <span className="text-[10px] text-muted-foreground">· Quotlys bedömning</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 mb-3">
          fit {example.fitScore} · intent {example.intentScore} · clarity {example.clarityScore}
        </div>
        <p className="text-xs text-foreground leading-relaxed mb-3">{example.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          {example.flags.map((f, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                f.type === 'green' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {f.type === 'green' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {f.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Box3({ example }: { example: Example }) {
  const materialTotal = example.quoteLines.reduce((s, l) => s + l.price, 0);
  const laborTotal = example.laborHours * example.laborRate;
  const subtotal = materialTotal + laborTotal;
  const rot = example.rotEligible ? Math.round(laborTotal * 0.3) : 0;
  const total = subtotal - rot;
  const fmt = (n: number) => n.toLocaleString('sv-SE');

  return (
    <div className="rounded-2xl border border-accent/20 bg-white shadow-[0_8px_32px_-8px_rgba(200,90,31,0.29)] overflow-hidden flex flex-col">
      <div className="border-b border-stone-100 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white text-base font-bold shadow-sm">
              3
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Offert
            </span>
          </div>
          <div className="text-[11px] font-semibold text-foreground truncate ml-2">
            {example.quoteTitle}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex-1">
        <div className="space-y-1.5">
          {example.quoteLines.map((l, i) => (
            <div key={i} className="flex justify-between items-baseline gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate">{l.name}</div>
                <div className="text-[10px] text-muted-foreground">{l.qty}</div>
              </div>
              <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                {fmt(l.price)} kr
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-stone-100 space-y-1">
          <div className="flex justify-between items-baseline gap-3 text-xs">
            <span className="text-muted-foreground">Material</span>
            <span className="text-foreground font-medium tabular-nums">{fmt(materialTotal)} kr</span>
          </div>
          <div className="flex justify-between items-baseline gap-3 text-xs">
            <span className="text-muted-foreground">
              Arbete ({example.laborHours} tim × {example.laborRate} kr)
            </span>
            <span className="text-foreground font-medium tabular-nums">{fmt(laborTotal)} kr</span>
          </div>
          {example.rotEligible && (
            <div className="flex justify-between items-baseline gap-3 text-xs">
              <span className="text-muted-foreground">ROT-avdrag (30 % på arbete)</span>
              <span className="text-green-700 font-medium tabular-nums">−{fmt(rot)} kr</span>
            </div>
          )}
        </div>

        {example.notes && (
          <p className="mt-3 pt-3 border-t border-stone-100 text-[11px] text-muted-foreground italic">
            {example.notes}
          </p>
        )}
      </div>

      <div className="border-t border-stone-100 bg-stone-50 px-5 py-4">
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Slutsumma
          </span>
          <span className="font-heading text-lg font-bold text-foreground tabular-nums">
            {fmt(total)} kr
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground text-right mt-0.5">exkl. moms</div>
      </div>
    </div>
  );
}

export function PipelineDemo({
  examples,
  heading = 'Från förfrågan till offert',
  intro,
}: {
  examples: Example[];
  heading?: string;
  intro?: string;
}) {
  const [activeId, setActiveId] = useState(examples[0]?.id ?? '');
  const active = examples.find((e) => e.id === activeId) ?? examples[0];

  // Wrapper refs + Box 1 min-height: keep the visible gap below Box 1
  // (between its bottom and arrow 1) equal to the gap below Box 2.
  // Math: Box 1 = 2 * Box 2 - Box 3 (so Box2 - Box1 == Box3 - Box2).
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const [box1MinHeight, setBox1MinHeight] = useState<number | undefined>();

  useLayoutEffect(() => {
    const measure = () => {
      const box2El = wrapperRefs.current[1];
      const box3El = wrapperRefs.current[2];
      if (!box2El || !box3El) return;
      const h2 = box2El.offsetHeight;
      const h3 = box3El.offsetHeight;
      const target = 2 * h2 - h3;
      setBox1MinHeight(target > 0 ? target : undefined);
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [activeId]);

  if (!active) return null;

  return (
    <section className="bg-stone-50/60 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl mb-4">{heading}</h2>
          {intro && <p className="text-muted-foreground max-w-xl mx-auto">{intro}</p>}
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-2xl border border-stone-200 bg-stone-50 p-1.5 gap-1">
            {examples.map((e) => {
              const isActive = e.id === active.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setActiveId(e.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{e.tabLabel}</span>
                  <ScoreBar score={e.score} tier={e.tier} size="sm" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 boxes — staggered spring pop-in, re-fires on tab switch (key remount).
            items-start (not items-stretch) so each wrapper matches its own card's
            natural height — required for the connector to anchor at the right Y. */}
        <div key={active.id} className="grid gap-6 lg:grid-cols-3 items-start">
          {[
            <Box1 key="b1" example={active} minHeight={box1MinHeight} />,
            <Box2 key="b2" example={active} />,
            <Box3 key="b3" example={active} />,
          ].map((box, i) => (
            <div key={box.key} className="relative">
              <motion.div
                ref={(el) => {
                  wrapperRefs.current[i] = el;
                }}
                initial={{ opacity: 0, scale: 0.85, y: 32 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 18,
                  delay: i * 0.12,
                }}
              >
                {box}
              </motion.div>
              {i > 0 && <PipelineConnector />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
