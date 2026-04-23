import { useEffect, useState, type ReactNode } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import { FileText, X, Check } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const CUSTOMER_MSG =
  'Hej, vi behöver byta ut ett element i sovrummet. Kan ni ge en offert?';

type MsgToken = { text: string; highlight?: boolean };
const MSG_TOKENS: MsgToken[] = [
  { text: 'Hej, vi behöver byta ut ett ' },
  { text: 'element', highlight: true },
  { text: ' i ' },
  { text: 'sovrummet', highlight: true },
  { text: '. Kan ni ge en offert?' },
];

type JobRow = { num: string; kws: { label: string; match: boolean }[] };
const JOBS: JobRow[] = [
  { num: '19', kws: [
    { label: 'element', match: true },
    { label: 'sovrum',  match: true },
    { label: 'fukt',    match: false },
  ] },
  { num: '24', kws: [
    { label: 'element', match: true },
    { label: 'sovrum',  match: true },
  ] },
  { num: '28', kws: [
    { label: 'element',       match: true },
    { label: 'sovrum',        match: true },
    { label: 'nyproduktion',  match: false },
  ] },
  { num: '31', kws: [
    { label: 'element',     match: true },
    { label: 'kök',         match: false },
    { label: 'ventilation', match: false },
  ] },
];

// jobsUsed = how many of the TOTAL_JOBS matched past jobs used this material.
// Excluded rows are pulled from the cluster but filtered out by context mismatch.
const TOTAL_JOBS = 4;
type MatRow = {
  name: string;
  jobsUsed: number;
  excluded?: { source: string };
};
const MATS: MatRow[] = [
  { name: 'Termostatventil',              jobsUsed: 4 }, // 4/4
  { name: 'Element 600×1200',             jobsUsed: 3 }, // 3/4
  { name: 'Elementfäste',                 jobsUsed: 3 }, // 3/4
  { name: 'Kopplingsrör 15 mm',           jobsUsed: 2 }, // 2/4
  {
    name: 'Köksfläkt-anslutning 125 mm',
    jobsUsed: 1, // 1/4 — only in #31 (kök · ventilation); filtered out for sovrum
    excluded: { source: '#31' },
  },
  {
    name: 'Ventilationsgaller 160×80',
    jobsUsed: 1, // 1/4 — also only in #31 (kök · ventilation); filtered out for sovrum
    excluded: { source: '#31' },
  },
];

/* ------------------------------------------------------------------ */
/*  Reveal plan                                                        */
/*                                                                     */
/*  Each segment contributes its value's char length to the reveal     */
/*  budget. Only 'msg' actually types char-by-char — every other       */
/*  segment pops in as soon as its first char ticks over, using its    */
/*  value length solely to weight the scroll timing.                   */
/* ------------------------------------------------------------------ */

type Seg = { key: string; value: string };

const LEARNING_SEGS: Seg[] = [
  { key: 'msg',   value: CUSTOMER_MSG },
  { key: 'kwL',   value: 'Nyckelord extraherade' },
  { key: 'kw1',   value: 'element___' },
  { key: 'kw2',   value: 'sovrum___' },
  { key: 'jobsL', value: '4 liknande jobb i din historik' },
  { key: 'j1',    value: 'Offert #19 — element · sovrum · fukt' },
  { key: 'j2',    value: 'Offert #24 — element · sovrum' },
  { key: 'j3',    value: 'Offert #28 — element · sovrum · nyproduktion' },
  { key: 'j4',    value: 'Offert #31 — element · kök · ventilation' },
  { key: 'matL',  value: 'Material hämtat från dessa jobb' },
  { key: 'm1',    value: 'Termostatventil — 4 av 4 jobb' },
  { key: 'm2',    value: 'Element 600×1200 — 3 av 4 jobb' },
  { key: 'm3',    value: 'Elementfäste — 3 av 4 jobb' },
  { key: 'm4',    value: 'Kopplingsrör 15 mm — 2 av 4 jobb' },
  { key: 'm5',    value: 'Köksfläkt-anslutning 125 mm — 1 av 4 jobb — filtrerat från #31' },
  { key: 'm6',    value: 'Ventilationsgaller 160×80 — 1 av 4 jobb — filtrerat från #31' },
  { key: 'close', value: 'Quotly fyller i åt dig — innan du börjat skriva.' },
];

const LEARNING_PLAN = LEARNING_SEGS.flatMap(({ key, value }) =>
  [...value].map((_, ci) => ({ key, ci })),
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LearningSlot({ progress }: { progress: MotionValue<number> }) {
  const [revealed, setRevealed] = useState(0);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) {
      setRevealed(LEARNING_PLAN.length);
      return;
    }
    return progress.on('change', (v) =>
      setRevealed(Math.round(Math.max(0, Math.min(1, v)) * LEARNING_PLAN.length)),
    );
  }, [progress, prefersReduced]);

  const revMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(revealed, LEARNING_PLAN.length); i++) {
    const k = LEARNING_PLAN[i].key;
    revMap[k] = (revMap[k] ?? 0) + 1;
  }
  const caretKey =
    revealed > 0 && revealed < LEARNING_PLAN.length
      ? LEARNING_PLAN[revealed - 1].key
      : null;

  const shown = (k: string) => (revMap[k] ?? 0) > 0;
  const msgCharsShown = Math.min(revMap['msg'] ?? 0, CUSTOMER_MSG.length);

  const pct = Math.round((revealed / LEARNING_PLAN.length) * 100);
  const isDone = revealed >= LEARNING_PLAN.length;

  return (
    <div
      className="relative h-full w-full rounded-2xl shadow-lg overflow-hidden"
      style={{
        backgroundColor: '#faf9f7',
        backgroundImage:
          'radial-gradient(circle, rgba(100,116,139,0.18) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
      aria-label="Så lär sig Quotly av dina tidigare offerter"
    >
      <div
        className="absolute bg-white border border-stone-200 rounded-xl flex flex-col overflow-hidden"
        style={{ inset: '16px', padding: '14px 16px', fontSize: '13px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="font-heading text-sm font-bold text-foreground">
              Quotly lär sig
            </span>
          </div>
          <div
            className="font-mono text-[10px] font-semibold text-orange-500 border border-orange-400 rounded px-1.5 py-0.5 leading-none"
            style={{ boxShadow: '1.5px 1.5px 0 rgba(0,0,0,0.12)' }}
          >
            Kundens förfrågan
          </div>
        </div>

        {/* Act 1 — customer message */}
        <div className="flex-shrink-0">
          <SectionLabel>Inkommande meddelande</SectionLabel>
          <div
            className="text-stone-700 italic mt-0.5"
            style={{ fontSize: '12.5px', lineHeight: 1.45 }}
          >
            {renderMessage(msgCharsShown, caretKey === 'msg')}
          </div>
        </div>

        {/* Act 2 — keywords */}
        <ActGate show={shown('kwL')} className="mt-2 flex-shrink-0">
          <ArrowLabel>Nyckelord extraherade</ArrowLabel>
          <div className="flex items-center gap-1.5 mt-1">
            {shown('kw1') && <Chip>element</Chip>}
            {shown('kw2') && <Chip>sovrum</Chip>}
          </div>
        </ActGate>

        {/* Act 3 — matched jobs, 2×2 grid */}
        <ActGate show={shown('jobsL')} className="mt-2.5 flex-shrink-0">
          <ArrowLabel>4 liknande jobb i din historik</ArrowLabel>
          <div
            className="mt-1 grid grid-cols-2"
            style={{ columnGap: '14px', rowGap: '3px' }}
          >
            {JOBS.map((j, i) => shown(`j${i + 1}`) && (
              <SlideRow key={j.num}>
                <div
                  className="flex items-center gap-1.5"
                  style={{ fontSize: '11px', padding: '1.5px 0' }}
                >
                  <span className="font-mono text-stone-500 flex-shrink-0">
                    Offert&nbsp;#{j.num}
                  </span>
                  <span className="flex items-center gap-1 min-w-0 flex-wrap">
                    {j.kws.map((k) => (
                      <MiniChip key={k.label} active={k.match}>{k.label}</MiniChip>
                    ))}
                  </span>
                </div>
              </SlideRow>
            ))}
          </div>
        </ActGate>

        {/* Act 4 — materials tagged by job-coverage, with filtered-out rows */}
        <ActGate show={shown('matL')} className="mt-2.5 flex-shrink-0">
          <ArrowLabel>Material hämtat från dessa jobb</ArrowLabel>
          <div className="mt-1 space-y-[2px]">
            {MATS.map((m, i) => shown(`m${i + 1}`) && (
              <SlideRow key={m.name}>
                <div
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: '1fr auto 54px',
                    fontSize: '11px',
                    columnGap: '8px',
                    padding: '1.5px 0',
                  }}
                >
                  <span className="text-stone-800 font-medium truncate">{m.name}</span>
                  <span className="font-mono tabular-nums text-right text-stone-600 whitespace-nowrap">
                    {m.excluded && (
                      <span className="text-stone-400 font-normal mr-1">
                        (offert {m.excluded.source})
                      </span>
                    )}
                    {m.jobsUsed}/{TOTAL_JOBS}&nbsp;jobb
                  </span>
                  <span className="flex justify-end">
                    {m.excluded ? (
                      <X className="h-4 w-4 text-red-500" strokeWidth={3} />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" strokeWidth={3} />
                    )}
                  </span>
                </div>
              </SlideRow>
            ))}
          </div>
        </ActGate>

        {/* Closing */}
        <ActGate show={shown('close')} className="mt-auto flex-shrink-0 pt-2">
          <div
            className="font-heading font-bold text-stone-900"
            style={{ fontSize: '12.5px' }}
          >
            Quotly fyller i åt dig — innan du börjat skriva.
          </div>
        </ActGate>

        {/* Progress ruler */}
        <div className="mt-2 flex-shrink-0">
          <div className="h-[2px] bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${pct}%`, transition: 'none' }}
            />
          </div>
          <div className="mt-0.5 text-right font-mono text-stone-400" style={{ fontSize: '9px' }}>
            {isDone ? 'Analys\u00a0klar' : `${pct}%\u00a0analyserat`}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function renderMessage(charsShown: number, showCaret: boolean): ReactNode {
  let remaining = charsShown;
  const nodes: ReactNode[] = [];

  MSG_TOKENS.forEach((tok, i) => {
    if (remaining <= 0) {
      nodes.push(<span key={i} />);
      return;
    }
    const visible = Math.min(remaining, tok.text.length);
    const text = tok.text.slice(0, visible);
    remaining -= visible;
    const fullyTyped = visible === tok.text.length;

    if (tok.highlight) {
      nodes.push(
        <motion.span
          key={i}
          initial={false}
          animate={fullyTyped ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0, 1] }}
          className={
            fullyTyped
              ? 'rounded px-1 py-px bg-orange-100 text-orange-700 font-semibold not-italic'
              : 'text-stone-800 font-semibold not-italic'
          }
          style={{ display: 'inline-block' }}
        >
          {text}
        </motion.span>,
      );
    } else {
      nodes.push(<span key={i}>{text}</span>);
    }
  });

  if (showCaret && charsShown < CUSTOMER_MSG.length) {
    nodes.push(
      <span
        key="caret"
        className="inline-block w-[1.5px] h-[0.85em] bg-orange-500 align-text-bottom animate-pulse ml-px"
      />,
    );
  }

  return nodes;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="font-mono uppercase text-stone-400 block"
      style={{ fontSize: '10px', letterSpacing: '0.1em' }}
    >
      {children}
    </span>
  );
}

function ArrowLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-orange-500" style={{ fontSize: '12px', lineHeight: 1 }}>↓</span>
      <SectionLabel>{children}</SectionLabel>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.4, 0, 1] }}
      className="rounded-md bg-orange-100 text-orange-700 font-semibold px-2.5 py-0.5"
      style={{ fontSize: '11px' }}
    >
      {children}
    </motion.span>
  );
}

function MiniChip({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={
        active
          ? 'rounded bg-orange-100 text-orange-700 font-medium px-1.5 py-px'
          : 'rounded bg-stone-100 text-stone-500 font-medium px-1.5 py-px'
      }
      style={{ fontSize: '10px' }}
    >
      {children}
    </span>
  );
}

function SlideRow({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.4, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ActGate({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.4, 0, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
