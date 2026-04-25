import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlipDeckSection } from '@/components/FlipDeck/FlipDeckSection';
import { LeadBox } from '@/components/LeadBox';
import { LearningSlot } from '@/components/LearningSlot';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useTransform,
  useInView,
  type MotionValue,
} from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';
import { showcaseItems, type ShowcaseItem } from '@/data/showcaseData';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const directionMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerChildren({
  children,
  className = '',
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.4, 0, 1] },
  },
};

/** Scroll-driven typewriter: reveals text character by character based on a MotionValue (0→1) */
function ScrollTypeWriter({
  text,
  progress,
  className = '',
}: {
  text: string;
  progress: MotionValue<number>;
  className?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    const unsubscribe = progress.on('change', (v) => {
      setVisibleCount(Math.round(v * text.length));
    });
    return unsubscribe;
  }, [progress, text.length]);

  return (
    <span className={className}>
      {text.slice(0, visibleCount)}
      {visibleCount < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-foreground/60 align-text-bottom animate-pulse ml-0.5" />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const steps = [
  {
    step: '1',
    title: 'Beskriv jobbet',
    description: 'Skriv en kort beskrivning eller låt AI:n tolka en förfrågan åt dig.',
  },
  {
    step: '2',
    title: 'Granska & justera',
    description: 'Finjustera rader, priser och material. Lägg till din egen touch.',
  },
  {
    step: '3',
    title: 'Skicka & följ upp',
    description: 'Skicka med ett klick. Se när kunden öppnar och svarar.',
  },
];

/* ------------------------------------------------------------------ */
/*  Feature overlay (expands from showcase card)                       */
/* ------------------------------------------------------------------ */

function FeatureOverlay({ item, onClose }: { item: ShowcaseItem; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-white overflow-y-auto"
    >
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </motion.button>
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">Quotly</span>
          </Link>
          <Link to="/auth?signup=true">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="sm" className="gap-1.5 bg-accent text-white hover:bg-accent/90">
                Kom igång gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.header>

      {/* Title section */}
      <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            {item.tag}
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {item.title}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{item.subtitle}</p>
        </motion.div>
      </div>

      {/* Video area */}
      <div className="px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          layoutId={`showcase-card-${item.id}`}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1] }}
          className="relative mx-auto max-w-5xl aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 shadow-2xl"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ scale: 1.1 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm cursor-pointer"
            >
              <Play className="h-9 w-9 text-white ml-1" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="text-sm text-white/60"
            >
              {item.mediaLabel}
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 sm:pb-20">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-8 text-base text-muted-foreground leading-relaxed max-w-2xl"
        >
          {item.description}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 space-y-4"
        >
          {item.highlights.map((h, i) => (
            <motion.li
              key={h}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.65 + i * 0.1 }}
              className="flex items-center gap-3 text-foreground"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                <CheckCircle2 className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm font-medium">{h}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-12"
        >
          <Link to="/auth?signup=true">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="gap-2 bg-accent text-white hover:bg-accent/90 px-8 text-base shadow-lg shadow-accent/25">
                Testa själv — gratis
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quote slot — scroll-driven quote writing animation                 */
/* ------------------------------------------------------------------ */

function fmtSEK(n: number): string {
  return new Intl.NumberFormat('sv-SE').format(n) + '\u00a0kr';
}

const QUOTE_LINES = [
  { desc: 'Arbete',             sub: 'VVS — elementbyte',      qty: 4, uLabel: 'h',  unitPrice: 650 },
  { desc: 'Element 600×1200',   sub: 'Radiator, vit',           qty: 1, uLabel: 'st', unitPrice: 2800 },
  { desc: 'Termostatventil',    sub: 'RA-N, vinklad',           qty: 1, uLabel: 'st', unitPrice: 450 },
  { desc: 'Elementfäste',       sub: 'Vägg, par',               qty: 2, uLabel: 'st', unitPrice: 125 },
  { desc: 'Kopplingsrör 15 mm', sub: 'Krom, tillskärning',      qty: 2, uLabel: 'm',  unitPrice: 85 },
];

const Q_SUBTOTAL = QUOTE_LINES.reduce((s, l) => s + l.qty * l.unitPrice, 0);
const Q_TAX      = Math.round(Q_SUBTOTAL * 0.25);
const Q_GRAND    = Q_SUBTOTAL + Q_TAX;

const QUOTE_SEGS = [
  ...QUOTE_LINES.flatMap((l, i) => [
    { key: `l${i}d`, value: l.desc },
    { key: `l${i}s`, value: l.sub },
    { key: `l${i}q`, value: `${l.qty}\u00a0${l.uLabel}` },
    { key: `l${i}u`, value: fmtSEK(l.unitPrice) },
    { key: `l${i}t`, value: fmtSEK(l.qty * l.unitPrice) },
  ]),
  { key: 'sub', value: fmtSEK(Q_SUBTOTAL) },
  { key: 'tax', value: fmtSEK(Q_TAX) },
  { key: 'gnd', value: fmtSEK(Q_GRAND) },
];

const QUOTE_PLAN = QUOTE_SEGS.flatMap(({ key, value }) =>
  [...value].map((_, ci) => ({ key, ci }))
);

function QuoteSlot({ progress, btnScale }: { progress: MotionValue<number>; btnScale: MotionValue<number> }) {
  const [revealed, setRevealed] = useState(0);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) { setRevealed(QUOTE_PLAN.length); return; }
    return progress.on('change', (v) =>
      setRevealed(Math.round(Math.max(0, Math.min(1, v)) * QUOTE_PLAN.length))
    );
  }, [progress, prefersReduced]);

  const revMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(revealed, QUOTE_PLAN.length); i++) {
    const k = QUOTE_PLAN[i].key;
    revMap[k] = (revMap[k] ?? 0) + 1;
  }
  const caretKey =
    revealed > 0 && revealed < QUOTE_PLAN.length
      ? QUOTE_PLAN[revealed - 1].key
      : null;

  const cell = (segKey: string, full: string) => {
    const n = revMap[segKey] ?? 0;
    if (n === 0) return null;
    return (
      <>
        {full.slice(0, n)}
        {caretKey === segKey && (
          <span className="inline-block w-[1.5px] h-[0.85em] bg-orange-500 align-text-bottom animate-pulse ml-px" />
        )}
      </>
    );
  };

  const pct = Math.round((revealed / QUOTE_PLAN.length) * 100);
  const isDone = revealed >= QUOTE_PLAN.length;

  return (
    <div
      className="relative h-full w-full rounded-2xl shadow-lg overflow-hidden"
      style={{
        backgroundColor: '#faf9f7',
        backgroundImage: 'radial-gradient(circle, rgba(100,116,139,0.18) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
      aria-label="Exempeloffert: Byt element — sovrum"
    >
      <div
        className="absolute bg-white border border-stone-200 rounded-xl flex flex-col overflow-hidden"
        style={{ inset: '16px', padding: '14px 16px', fontSize: '11px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded bg-primary">
              <FileText className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="font-heading text-xs font-bold text-foreground">Quotly</span>
          </div>
          <div
            className="font-mono text-[9px] font-semibold text-orange-500 border border-orange-400 rounded px-1.5 py-0.5 leading-none"
            style={{ boxShadow: '1.5px 1.5px 0 rgba(0,0,0,0.12)' }}
          >
            Utkast · Offert #1042
          </div>
        </div>

        {/* Meta */}
        <div className="mb-2 flex-shrink-0">
          <div className="font-heading text-xs font-bold text-foreground leading-snug">
            Byt element — sovrum
          </div>
          <div className="font-mono text-[9px] text-stone-400 mt-0.5">
            Andersson,&nbsp;K. · Storgatan&nbsp;12 · 2026-04-20
          </div>
        </div>

        {/* Combined header: Beskrivning label + customer request + Generera offert button */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-1 mb-1 flex-shrink-0">
          <span
            className="font-mono uppercase text-stone-400 flex-shrink-0"
            style={{ fontSize: '8px', letterSpacing: '0.1em' }}
          >
            Beskrivning
          </span>
          <span
            className="italic text-stone-600 truncate"
            style={{ fontSize: '9.5px', lineHeight: 1.3 }}
          >
            Hej, vi behöver byta ut ett <span className="not-italic font-semibold text-orange-700">element</span> i <span className="not-italic font-semibold text-orange-700">sovrummet</span>.
          </span>
          <motion.button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            style={{
              scale: btnScale,
              fontSize: '12px',
              padding: '7px 14px',
              boxShadow: '0 3px 10px hsl(17 88% 40% / 0.4)',
              transformOrigin: 'center',
            }}
            className="ml-auto flex-shrink-0 flex items-center gap-1.5 rounded-md bg-accent text-white font-semibold leading-none"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            Generera offert
          </motion.button>
        </div>

        {/* Line items */}
        <div className="overflow-hidden">
          {QUOTE_LINES.map((line, i) => {
            if ((revMap[`l${i}d`] ?? 0) === 0) return null;
            return (
              <div
                key={i}
                className="grid items-start"
                style={{ gridTemplateColumns: '1fr 36px 52px 56px', padding: '3px 0' }}
              >
                <div>
                  <div className="font-medium text-stone-800 leading-snug">
                    {cell(`l${i}d`, line.desc)}
                  </div>
                  {(revMap[`l${i}s`] ?? 0) > 0 && (
                    <div style={{ fontSize: '9px' }} className="text-stone-400">
                      {cell(`l${i}s`, line.sub)}
                    </div>
                  )}
                </div>
                <div className="text-right font-mono text-stone-600 tabular-nums">
                  {cell(`l${i}q`, `${line.qty}\u00a0${line.uLabel}`)}
                </div>
                <div className="text-right font-mono text-stone-600 tabular-nums">
                  {cell(`l${i}u`, fmtSEK(line.unitPrice))}
                </div>
                <div className="text-right font-mono font-medium text-stone-800 tabular-nums">
                  {cell(`l${i}t`, fmtSEK(line.qty * line.unitPrice))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Spacer — half of remaining space goes here (between items and footer) */}
        <div style={{ flexGrow: 1 }} />

        {/* Footer totals */}
        {(revMap['sub'] ?? 0) > 0 && (
          <div className="border-t border-dashed border-stone-200 pt-1.5 mt-1 flex-shrink-0 flex flex-col" style={{ gap: '2px' }}>
            <div className="flex justify-between font-mono text-stone-500" style={{ fontSize: '9px' }}>
              <span className="uppercase" style={{ letterSpacing: '0.08em' }}>Delsumma</span>
              <span className="tabular-nums">{cell('sub', fmtSEK(Q_SUBTOTAL))}</span>
            </div>
            {(revMap['tax'] ?? 0) > 0 && (
              <div className="flex justify-between font-mono text-stone-500" style={{ fontSize: '9px' }}>
                <span className="uppercase" style={{ letterSpacing: '0.08em' }}>Moms 25%</span>
                <span className="tabular-nums">{cell('tax', fmtSEK(Q_TAX))}</span>
              </div>
            )}
            {(revMap['gnd'] ?? 0) > 0 && (
              <div className="flex justify-between items-baseline border-t border-stone-800 pt-1 mt-0.5">
                <span className="font-mono font-bold text-stone-800 uppercase" style={{ fontSize: '8px', letterSpacing: '0.1em' }}>Totalt inkl. moms</span>
                <span className="font-heading font-extrabold text-stone-900 tabular-nums" style={{ fontSize: '15px', lineHeight: 1 }}>
                  {cell('gnd', fmtSEK(Q_GRAND))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress ruler */}
        <div className="mt-1.5 flex-shrink-0">
          <div className="h-[2px] bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%`, transition: 'none' }} />
          </div>
          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="mt-1.5 flex flex-col items-end gap-1"
              >
                <button
                  className="rounded bg-orange-500 text-white font-semibold leading-none"
                  style={{ fontSize: '11px', padding: '6px 18px' }}
                >
                  Skicka
                </button>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[3px] border border-orange-400 bg-orange-50">
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                      <path d="M1 2.5L2.8 4.2L6 1" stroke="#f97316" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="font-mono text-stone-500" style={{ fontSize: '10px' }}>bifoga pdf som bilaga</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                exit={{ opacity: 0 }}
                className="mt-0.5 text-right font-mono text-stone-400"
                style={{ fontSize: '8px' }}
              >
                {`${pct}%\u00a0skriven`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spacer — other half of remaining space goes here (below button) */}
        <div style={{ flexGrow: 1 }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroSlide((s) => (s + 1) % 3), 4500);
    return () => clearInterval(t);
  }, []);
  const selectedItem = selectedFeature ? showcaseItems.find((s) => s.id === selectedFeature) : null;

  const showcaseRef = useRef(null);
  // FlipDeck exit: shrink/fade starts BEFORE dark is visible, card 4 barely moves,
  // stays peeking out the top even when dark covers 80% of the viewport
  const flipDeckRef = useRef(null);
  const { scrollYProgress: flipDeckProgress } = useScroll({
    target: flipDeckRef,
    offset: ['end 97%', 'end 20%'],
  });
  const flipDeckTranslateY = useTransform(flipDeckProgress, [0, 1], [0, 590]);
  const flipDeckScale = useTransform(flipDeckProgress, [0, 1], [1, 0.86]);
  const flipDeckOpacity = useTransform(flipDeckProgress, [0, 0.7], [1, 0.55]);

  // Dark section: normal scroll speed — looks fast relative to barely-moving card 4
  const darkFoldRef = useRef(null);
  const { scrollYProgress: darkFoldProgress } = useScroll({
    target: darkFoldRef,
    offset: ['start end', 'start 30%'],
  });
  const darkRotateX = useTransform(darkFoldProgress, [0, 1], [10, 0]);
  const darkScale = useTransform(darkFoldProgress, [0, 1], [0.96, 1]);

  // ── "How it works" — sticky-pin / translated-stack zig-zag ──
  //
  // One sticky pin holds the whole stage in the viewport. Inside the pin a
  // "stack" div contains all 3 boxes + the SVG bars. The stack is moved via
  // translate3d driven by scroll progress. Box positions never change relative
  // to each other, so SVG paths are computed ONCE at layout (not per scroll).
  // Only stack.transform and stroke-dashoffset change per scroll — both are
  // single CSS properties the compositor handles cleanly, so no wobble.
  //
  // Phases (cumulative scroll-px, computed dynamically from box geometry):
  //   ENTER     — stack rises until Box 1 hits the freeze line
  //   FREEZE 1  — stack held; Bar 1 fills
  //   BETWEEN   — stack rises until Box 2 hits the freeze line
  //   FREEZE 2  — stack held; Bar 2 fills
  //   APPROACH3 — stack rises until Box 3 hits the freeze line
  //   FREEZE 3  — stack held; Box 3 content reveals
  //   LEAVE     — stack rises off-screen
  const driverRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const box1Ref = useRef<HTMLDivElement>(null);
  const box2Ref = useRef<HTMLDivElement>(null);
  const box3Ref = useRef<HTMLDivElement>(null);
  const fill1Ref = useRef<SVGPathElement>(null);
  const fill2Ref = useRef<SVGPathElement>(null);

  const leadBoxReveal = useMotionValue(0);
  const quoteRevealProgress = useMotionValue(0);
  const learningReveal = useMotionValue(0);
  const generateBtnScale = useMotionValue(1);

  useLayoutEffect(() => {
    const driver = driverRef.current;
    const stack = stackRef.current;
    const svg = svgRef.current;
    const f1 = fill1Ref.current;
    const f2 = fill2Ref.current;
    const b1 = box1Ref.current, b2 = box2Ref.current, b3 = box3Ref.current;
    if (!driver || !stack || !svg || !f1 || !f2 || !b1 || !b2 || !b3) return;

    // Tunables — match the demo file (scroll-line-demo-fixed.html)
    const FREEZE_Y_FRAC = 0.18;     // box lands at 18% from top of viewport
    const FREEZE_PX = 497;          // scroll-px to draw drop1+horizontal of bar
    const ENTER_PX = 200;           // scroll-px for Box 1 to settle at freeze line
    const FREEZE3_PX = 1400;        // scroll-px Box 3 holds while content reveals
    // Where Box 1 starts vertically (fraction of vh from top of pin). Keeps
    // Box 1 visible as soon as the section enters the viewport — no empty
    // pinned-scroll dead zone before the animation begins.
    const ENTER_START_FRAC = 0.20;

    const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Position relative to stack (offsetParent walk — independent of scroll).
    const localRect = (el: HTMLElement) => {
      let x = 0, y = 0;
      let node: HTMLElement | null = el;
      while (node && node !== stack) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };

    type BarGeom = { total: number; e2: number };
    let bar1: BarGeom = { total: 0, e2: 0 };
    let bar2: BarGeom = { total: 0, e2: 0 };

    const buildBar = (src: HTMLElement, dst: HTMLElement, fillEl: SVGPathElement): BarGeom => {
      const rs = localRect(src), rd = localRect(dst);
      const sx = rs.x + rs.w / 2;
      const sy = rs.y + rs.h;
      const dx = rd.x + rd.w / 2;
      const dy = rd.y;
      const horizY = (sy + dy) / 2;
      const drop1 = horizY - sy;
      const across = Math.abs(dx - sx);
      const drop2 = dy - horizY;
      const d = `M ${sx} ${sy} L ${sx} ${horizY} L ${dx} ${horizY} L ${dx} ${dy}`;
      fillEl.setAttribute('d', d);
      const total = drop1 + across + drop2;
      fillEl.style.strokeDasharray = `${total} ${total}`;
      fillEl.style.strokeDashoffset = String(total);
      return { total, e2: total > 0 ? (drop1 + across) / total : 0 };
    };

    const offsetForBoxAtFreeze = (boxEl: HTMLElement, vh: number) => {
      const r = localRect(boxEl);
      return vh * FREEZE_Y_FRAC - r.y;
    };

    type Phases = {
      T1: number; T2: number; T3: number; T4: number; T5: number; T6: number; T7: number;
      freeze1Px: number; freeze2Px: number; freeze3Px: number;
      offBox1: number; offBox2: number; offBox3: number;
      offEnterStart: number; offExitEnd: number;
    };
    let phases: Phases | null = null;

    const rebuild = () => {
      const w = stack.offsetWidth;
      const h = stack.offsetHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.style.width = w + 'px';
      svg.style.height = h + 'px';
      bar1 = buildBar(b1, b2, f1);
      bar2 = buildBar(b2, b3, f2);

      const vh = window.innerHeight;
      const offBox1 = offsetForBoxAtFreeze(b1, vh);
      const offBox2 = offsetForBoxAtFreeze(b2, vh);
      const offBox3 = offsetForBoxAtFreeze(b3, vh);
      // Start with Box 1 partially in view (translateY ≈ 40% of vh) so the
      // pinned area never shows a blank screen before the animation begins.
      const offEnterStart = vh * ENTER_START_FRAC - localRect(b1).y;
      // End the LEAVE phase as soon as Box 3 has cleared the freeze line —
      // no need to scroll it fully off-screen, that just adds blank scroll.
      const offExitEnd = offBox3 - vh * 0.3;

      const freeze1Px = bar1.e2 > 0 ? FREEZE_PX / bar1.e2 : FREEZE_PX;
      const freeze2Px = bar2.e2 > 0 ? FREEZE_PX / bar2.e2 : FREEZE_PX;
      const freeze3Px = FREEZE3_PX;

      // Between/approach/leave phases scroll at ~1px stack-rise per 1px scroll
      // (independent of ENTER_PX, which is tuned just for Box 1's settle). This
      // keeps box-to-box transitions at a natural reading pace regardless of
      // how snappy the entrance is.
      const TRANSIT_RATE = 1;
      const computedBetweenPx = (offBox1 - offBox2) / TRANSIT_RATE;
      const computedApproach3Px = (offBox2 - offBox3) / TRANSIT_RATE;
      const computedLeavePx = (offBox3 - offExitEnd) / TRANSIT_RATE;

      const T1 = ENTER_PX;
      const T2 = T1 + freeze1Px;
      const T3 = T2 + computedBetweenPx;
      const T4 = T3 + freeze2Px;
      const T5 = T4 + computedApproach3Px;
      const T6 = T5 + freeze3Px;
      const T7 = T6 + computedLeavePx;

      phases = {
        T1, T2, T3, T4, T5, T6, T7,
        freeze1Px, freeze2Px, freeze3Px,
        offBox1, offBox2, offBox3, offEnterStart, offExitEnd,
      };

      driver.style.height = T7 + 'px';
    };

    const update = () => {
      if (!phases) return;
      const dRect = driver.getBoundingClientRect();
      const scrolled = -dRect.top;
      const {
        T1, T2, T3, T4, T5, T6, T7,
        freeze1Px, freeze2Px, freeze3Px,
        offBox1, offBox2, offBox3, offEnterStart, offExitEnd,
      } = phases;

      let stackY: number, t1: number, t2: number;

      if (scrolled <= 0) {
        stackY = offEnterStart; t1 = 0; t2 = 0;
      } else if (scrolled < T1) {
        stackY = lerp(offEnterStart, offBox1, scrolled / T1);
        t1 = 0; t2 = 0;
      } else if (scrolled < T2) {
        stackY = offBox1;
        t1 = (scrolled - T1) / (T2 - T1);
        t2 = 0;
      } else if (scrolled < T3) {
        stackY = lerp(offBox1, offBox2, (scrolled - T2) / (T3 - T2));
        t1 = 1; t2 = 0;
      } else if (scrolled < T4) {
        stackY = offBox2;
        t1 = 1;
        t2 = (scrolled - T3) / (T4 - T3);
      } else if (scrolled < T5) {
        stackY = lerp(offBox2, offBox3, (scrolled - T4) / (T5 - T4));
        t1 = 1; t2 = 1;
      } else if (scrolled < T6) {
        stackY = offBox3;
        t1 = 1; t2 = 1;
      } else if (scrolled < T7) {
        stackY = lerp(offBox3, offExitEnd, (scrolled - T6) / (T7 - T6));
        t1 = 1; t2 = 1;
      } else {
        stackY = offExitEnd; t1 = 1; t2 = 1;
      }

      stack.style.transform = `translate3d(0, ${stackY}px, 0)`;
      f1.style.strokeDashoffset = String(bar1.total * (1 - clamp(t1)));
      f2.style.strokeDashoffset = String(bar2.total * (1 - clamp(t2)));

      // Content reveal windows for each box's progress MotionValue.
      // Box 1 starts revealing 400px BEFORE the pin engages so the rows are
      // already filling in as the box enters from below — not waiting for it
      // to land at the freeze line.
      const BOX1_EARLY_PX = 400;
      const box1End = T1 + freeze1Px / 2;
      leadBoxReveal.set(clamp((scrolled + BOX1_EARLY_PX) / (box1End + BOX1_EARLY_PX)));

      // Box 2 reveal starts AFTER the "Generera offert" button press
      // completes (T3 + 0.1*freeze2Px), so the press visually triggers the
      // typing rather than overlapping with it.
      const box2Start = T3 + freeze2Px * 0.1;
      const box2End = T3 + freeze2Px * 0.64;
      quoteRevealProgress.set(clamp((scrolled - box2Start) / (box2End - box2Start)));

      const box3End = T5 + freeze3Px / 2;
      learningReveal.set(clamp((scrolled - T5) / (box3End - T5)));

      // "Generera offert" button press — quick dip at the start of FREEZE 2.
      const btnStart = T3;
      const btnDur = freeze2Px * 0.1;
      let btnScale = 1;
      if (scrolled > btnStart && scrolled < btnStart + btnDur) {
        const u = (scrolled - btnStart) / btnDur;
        btnScale = lerp(1, 0.78, Math.sin(u * Math.PI));
      }
      generateBtnScale.set(btnScale);
    };

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => { rafId = null; update(); });
    };
    const onResize = () => { rebuild(); update(); };

    rebuild();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(() => { rebuild(); update(); });
    ro.observe(stack);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [leadBoxReveal, quoteRevealProgress, learningReveal, generateBtnScale]);


  return (
    <div className="min-h-screen bg-white text-foreground" style={{ overflowX: 'clip' }}>
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">Quotly</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="ghost" size="sm" className="text-sm font-medium">
                  Logga in
                </Button>
              </motion.div>
            </Link>
            <Link to="/auth?signup=true">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="sm" className="gap-1.5 bg-accent text-white hover:bg-accent/90">
                  Kom igång gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <TradeMenu />
          </div>
        </div>
      </motion.header>

      {/* ── Split Hero ── */}
      <section className="relative h-[calc(100vh-4rem)] overflow-hidden">
        {/* Image carousel — fills the full section behind the grey panel */}
        <div className="absolute inset-0">
          <AnimatePresence mode="sync">
            <motion.div
              key={heroSlide}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            >
              {heroSlide === 0 && (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: 'url(/zaptec.jpg)' }}
                />
              )}
              {heroSlide === 1 && (
                <div className="absolute inset-0 flex items-center justify-end bg-stone-500 pr-12">
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-300 mb-2">Byt ut mot riktig bild</p>
                    <p className="text-2xl font-bold text-white">VVS-tekniker</p>
                  </div>
                </div>
              )}
              {heroSlide === 2 && (
                <div className="absolute inset-0 flex items-center justify-end bg-stone-400 pr-12">
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-200 mb-2">Byt ut mot riktig bild</p>
                    <p className="text-2xl font-bold text-white">Byggare</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stone-grey parallelogram — diagonal right edge via clip-path */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, #1c1917 0%, #1c1917 32%, rgba(28,25,23,0.88) 44%, rgba(28,25,23,0.55) 56%, rgba(28,25,23,0.15) 68%, transparent 78%)',
          }}
        />

        {/* Text content — sits above both layers, constrained to the grey area */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-[50%] px-10 sm:px-14 lg:px-20">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0, 1] }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent"
            >
              <Sparkles className="h-4 w-4" />
              Nu med AI-genererade offerter
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0, 1] }}
              className="font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl"
            >
              Professionella offerter på minuter,{' '}
              <span className="text-accent">inte timmar.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0, 1] }}
              className="mt-4 text-base text-stone-300 sm:text-lg"
            >
              Quotly hjälper hantverkare att skapa, skicka och följa upp offerter — snabbt, snyggt och utan krångel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.4, 0, 1] }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link to="/auth?signup=true">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="gap-2 bg-accent text-white hover:bg-accent/90 px-8 text-base shadow-lg shadow-accent/30">
                    Skapa ditt konto
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              </Link>
              <p className="text-sm text-stone-400">Gratis att komma igång. Ingen kortuppgift.</p>
            </motion.div>
          </div>
        </div>

        {/* Solid fill below Läs mer — matches warm section, no gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{ backgroundColor: '#F8F6F3' }}
        />

        {/* Slide indicator dots + Läs mer button */}
        <div className="absolute bottom-20 right-6 flex items-center gap-4">
          <Link to={['/el', '/vvs', '/bygg'][heroSlide]}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Läs mer
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.div>
          </Link>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === heroSlide ? 'w-6 bg-white' : 'w-2 bg-white/40'
                }`}
                aria-label={`Bild ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── "How it works" — sticky-pin / translated-stack zig-zag ── */}
      {/* Heading sits above the pinned scene (in normal flow) */}
      <section
        className="relative pt-4 sm:pt-6"
        style={{ backgroundColor: '#F8F6F3' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            opacity: 0.08,
          }}
        />
        <div className="relative mx-auto w-[min(1280px,92vw)]">
          <FadeIn>
            <div className="mx-auto pb-6 text-center sm:pb-8">
              <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                Från lead till avslut
              </span>
              <h2 className="mt-4 font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Bättre leads. <span className="text-accent">Snabbare offerter.</span> Nöjdare kunder.
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-lg text-muted-foreground">
                Quotly sköter hela kedjan — sållar bort dåliga förfrågningar, skriver offerten åt dig och följer upp svaren automatiskt.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Driver: tall scroll container. Inside, a single sticky pin holds the
          stage in the viewport; the stack of boxes inside translates via JS. */}
      <div
        ref={driverRef}
        className="relative"
        style={{ backgroundColor: '#F8F6F3' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            opacity: 0.08,
          }}
        />
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <div className="relative mx-auto h-full w-[min(1280px,92vw)]">
            <div
              ref={stackRef}
              className="absolute inset-x-0 top-0"
              style={{ willChange: 'transform' }}
            >
              <svg
                ref={svgRef}
                className="pointer-events-none absolute inset-0"
                preserveAspectRatio="none"
                style={{ zIndex: 1, overflow: 'visible' }}
              >
                <path
                  ref={fill1Ref}
                  fill="none"
                  stroke="#c85a1f"
                  strokeWidth={14}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
                <path
                  ref={fill2Ref}
                  fill="none"
                  stroke="#c85a1f"
                  strokeWidth={14}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>

              <div className="flex w-full" style={{ position: 'relative', zIndex: 2 }}>
                <div
                  ref={box1Ref}
                  className="relative aspect-[4/3] w-[55%]"
                >
                  <LeadBox progress={leadBoxReveal} />
                </div>
              </div>

              <div style={{ height: 320 }} aria-hidden />

              <div className="flex w-full justify-end" style={{ position: 'relative', zIndex: 2 }}>
                <div
                  ref={box2Ref}
                  className="relative aspect-[4/3] w-[55%]"
                >
                  <QuoteSlot progress={quoteRevealProgress} btnScale={generateBtnScale} />
                </div>
              </div>

              <div style={{ height: 320 }} aria-hidden />

              <div className="flex w-full" style={{ position: 'relative', zIndex: 2 }}>
                <div
                  ref={box3Ref}
                  className="relative aspect-[4/3] w-[55%]"
                >
                  <LearningSlot progress={learningReveal} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FlipDeck: card 4 barely moves as dark section rises over it */}
      <motion.div
        ref={flipDeckRef}
        style={{ translateY: flipDeckTranslateY, scale: flipDeckScale, opacity: flipDeckOpacity }}
      >
        <FlipDeckSection />
      </motion.div>

      <div ref={darkFoldRef} className="relative z-20" style={{ perspective: '1000px' }}>
        {/* Showcase — normal scroll speed, covers nearly-stationary card 4 */}
        <motion.section
          ref={showcaseRef}
          style={{ rotateX: darkRotateX, scale: darkScale, transformOrigin: 'top center' }}
          className="relative rounded-t-[2.5rem] bg-gradient-to-b from-stone-900 to-stone-800 py-20 sm:py-28"
        >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
                Se Quotly i aktion
              </h2>
              <p className="mt-4 text-lg text-stone-400">
                Klicka på en funktion för att se mer.
              </p>
            </div>
          </FadeIn>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {showcaseItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0.4, 0, 1] }}
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                onClick={() => setSelectedFeature(item.id)}
                className="cursor-pointer"
              >
                <motion.div
                  layoutId={`showcase-card-${item.id}`}
                  className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-stone-700 to-stone-800 shadow-2xl ring-1 ring-white/10"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                      <Play className="h-6 w-6 text-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-10">
                    <span className="mb-1 inline-block rounded-full bg-accent/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      {item.tag}
                    </span>
                    <h3 className="font-heading text-lg font-bold text-white">{item.title}</h3>
                    <p className="mt-0.5 text-sm text-white/70">{item.subtitle}</p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
      </div>

      {/* How it works */}
      <section className="bg-stone-50/70 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Så enkelt fungerar det
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Tre steg från förfrågan till skickad offert.
              </p>
            </div>
          </FadeIn>

          <StaggerChildren className="mt-14 grid gap-8 sm:grid-cols-3" staggerDelay={0.15}>
            {steps.map(({ step, title, description }) => (
              <motion.div key={step} variants={staggerItem} className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white font-heading text-lg font-bold shadow-md shadow-accent/25"
                >
                  {step}
                </motion.div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
              </motion.div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <FadeIn>
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
              Redo att slippa krångliga offerter?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Kom igång gratis och skapa din första offert på under 5 minuter.
            </p>
            <motion.div className="mt-8" whileHover={{ scale: 1.02 }}>
              <Link to="/auth?signup=true">
                <Button size="lg" className="gap-2 bg-accent text-white hover:bg-accent/90 px-8 text-base shadow-lg shadow-accent/25">
                  Skapa konto
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="font-heading text-sm font-bold text-foreground">Quotly</span>
            </div>
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Quotly. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>

      {/* Feature overlay */}
      <AnimatePresence>
        {selectedItem && (
          <FeatureOverlay
            key={selectedItem.id}
            item={selectedItem}
            onClose={() => setSelectedFeature(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
