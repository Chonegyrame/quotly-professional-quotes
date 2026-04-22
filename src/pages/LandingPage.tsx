import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlipDeckSection } from '@/components/FlipDeck/FlipDeckSection';
import { LearningSlot } from '@/components/LearningSlot';
import {
  AnimatePresence,
  motion,
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
      className="relative w-full aspect-[4/3] rounded-2xl shadow-lg overflow-hidden"
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

  // Hero image overlay — driven by PAGE scroll so animation starts immediately
  const heroImgRef = useRef(null);
  const { scrollY: pageScrollY } = useScroll();
  // Full animation spans 2400px: Images 2 & 3 each get 1200px of scroll room
  const heroImgScroll = useTransform(pageScrollY, [0, 2400], [0, 1]);
  // Button press: stronger + longer shrink so it's visible, then quote fills in
  const generateBtnScale = useTransform(heroImgScroll, [0, 0.035, 0.07], [1, 0.78, 1]);
  const quoteRevealProgress = useTransform(heroImgScroll, [0.07, 0.257], [0, 1]);

  // Phase 1a (0 → 0.25): Image 2 flows in from off-screen right.
  const img2SpacerWidth = useTransform(heroImgScroll, [0, 0.25], ['28vw', '0vw']);
  const img2FadeIn = useTransform(heroImgScroll, [0, 0.075], [0, 1]);
  // Learning card reveal: starts as Image 2 becomes visible, ends as Text 2 finishes typing.
  const learningReveal = useTransform(heroImgScroll, [0.05, 0.5], [0, 1]);

  // Phase 2a (0.25 → 0.41): Text 1 squishes, strip shifts left to center Image 2.
  const stripX = useTransform(heroImgScroll, [0.25, 0.41], ['0%', '-55%']);
  const text1Width = useTransform(heroImgScroll, [0.25, 0.35], ['350px', '0px']);
  const text1ScaleX = useTransform(heroImgScroll, [0.25, 0.34], [1, 0.15]);
  const text1ScaleY = useTransform(heroImgScroll, [0.25, 0.29, 0.34], [1, 1.14, 1.05]);
  const text1FadeOpacity = useTransform(heroImgScroll, [0.31, 0.35], [1, 0]);

  // Phase 3a (0.35 → 0.5): Text 2 types in.
  const text2TitleProgress = useTransform(heroImgScroll, [0.35, 0.425], [0, 1]);
  const text2SubProgress = useTransform(heroImgScroll, [0.425, 0.5], [0, 1]);

  // Phase 1b (0.5 → 0.75): Image 3 flows in — mirror of Image 2's phase 1a.
  const img3SpacerWidth = useTransform(heroImgScroll, [0.5, 0.75], ['28vw', '0vw']);
  const img3FadeIn = useTransform(heroImgScroll, [0.5, 0.575], [0, 1]);

  // Phase 2b (0.75 → 0.91): Text 2 squishes, strip shifts left again to center Image 3.
  const stripX2 = useTransform(heroImgScroll, [0.75, 0.91], ['0%', '-55%']);
  const text2Width = useTransform(heroImgScroll, [0.75, 0.85], ['350px', '0px']);
  const text2ScaleX = useTransform(heroImgScroll, [0.75, 0.84], [1, 0.15]);
  const text2ScaleY = useTransform(heroImgScroll, [0.75, 0.79, 0.84], [1, 1.14, 1.05]);
  const text2FadeOpacity = useTransform(heroImgScroll, [0.81, 0.85], [1, 0]);

  // Phase 3b (0.85 → 1.0): Text 3 types in.
  const text3TitleProgress = useTransform(heroImgScroll, [0.85, 0.925], [0, 1]);
  const text3SubProgress = useTransform(heroImgScroll, [0.925, 1.0], [0, 1]);

  // Combined strip X: accumulates both left-shifts.
  const combinedStripX = useTransform(
    [stripX, stripX2],
    ([x1, x2]) => `calc(${x1 as string} + ${x2 as string})`,
  );


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
          </div>
        </div>
      </motion.header>

      {/* Hero — text + image strip all pinned together, scrolling drives animation */}
      <section ref={heroImgRef} className="relative">
        <div className="sticky top-16 z-10 flex min-h-[calc(100vh-4rem)] flex-col items-stretch bg-gradient-to-b from-stone-50 to-white">
          <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 -z-20" />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -transtone-x-1/2 rounded-full bg-accent/10 blur-3xl"
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Hero text */}
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0, 1] }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent"
              >
                <Sparkles className="h-4 w-4" />
                Nu med AI-genererade offerter
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0, 1] }}
                className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                Professionella offerter på minuter,{' '}
                <span className="text-accent">inte timmar.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0, 1] }}
                className="mt-4 text-base text-muted-foreground sm:text-lg"
              >
                Quotly hjälper hantverkare att skapa, skicka och följa upp offerter — snabbt, snyggt och utan krångel.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.4, 0, 1] }}
                className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              >
                <Link to="/auth?signup=true">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="gap-2 bg-accent text-white hover:bg-accent/90 px-8 text-base shadow-lg shadow-accent/25">
                      Skapa ditt konto
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
                <p className="text-sm text-muted-foreground">Gratis att komma igång. Ingen kortuppgift.</p>
              </motion.div>
            </div>
          </div>

          {/* Image strip */}
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
            <motion.div style={{ x: combinedStripX }} className="flex items-center gap-6">
              {/* Image 1 — always visible initially */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.25, 0.4, 0, 1] }}
                className="w-[55%] flex-shrink-0"
              >
                <QuoteSlot progress={quoteRevealProgress} btnScale={generateBtnScale} />
              </motion.div>

              {/* Text 1 — gets squished as strip moves left.
                  Outer collapses width (layout). Inner scales glyphs (visual squish). */}
              <motion.div
                style={{ width: text1Width, opacity: text1FadeOpacity }}
                className="flex-shrink-0 overflow-hidden"
              >
                <motion.div
                  style={{
                    scaleX: text1ScaleX,
                    scaleY: text1ScaleY,
                    transformOrigin: 'left center',
                  }}
                  className="min-w-[250px] sm:min-w-[350px]"
                >
                  <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                    Skapa offerter snabbare
                  </h2>
                  <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                    Beskriv jobbet — Quotly bygger en komplett offert med arbete och material.
                  </p>
                </motion.div>
              </motion.div>

              {/* Spacer — shrinks as user scrolls, pulling Image 2 toward Text 1 through flex layout. */}
              <motion.div
                aria-hidden
                style={{ width: img2SpacerWidth }}
                className="flex-shrink-0"
              />

              {/* Image 2 — natural flex position. No translate; it moves purely because the spacer shrinks. */}
              <motion.div
                style={{ opacity: img2FadeIn }}
                className="w-[55%] flex-shrink-0"
              >
                <LearningSlot progress={learningReveal} />
              </motion.div>

              {/* Text 2 — types in during phase 3a, squishes in phase 2b. */}
              <motion.div
                style={{ width: text2Width, opacity: text2FadeOpacity }}
                className="flex-shrink-0 overflow-hidden"
              >
                <motion.div
                  style={{ scaleX: text2ScaleX, scaleY: text2ScaleY, transformOrigin: 'left center' }}
                  className="min-w-[250px] sm:min-w-[350px]"
                >
                  <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                    <ScrollTypeWriter text="Byggd för hantverkare" progress={text2TitleProgress} />
                  </h2>
                  <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                    <ScrollTypeWriter
                      text="Oavsett om du jobbar med el, VVS eller bygg — Quotly anpassar sig efter ditt yrke."
                      progress={text2SubProgress}
                    />
                  </p>
                </motion.div>
              </motion.div>

              {/* Spacer — shrinks to pull Image 3 in. */}
              <motion.div aria-hidden style={{ width: img3SpacerWidth }} className="flex-shrink-0" />

              {/* Image 3 — slides in from off-screen right via spacer collapse. */}
              <motion.div style={{ opacity: img3FadeIn }} className="w-[55%] flex-shrink-0">
                <div className="aspect-[4/3] w-full rounded-2xl bg-stone-400 shadow-lg flex items-center justify-center">
                  <span className="text-sm text-stone-600 font-medium">Bild 3</span>
                </div>
              </motion.div>

              {/* Text 3 — types out sequentially */}
              <div className="min-w-[250px] sm:min-w-[350px] flex-shrink-0">
                <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  <ScrollTypeWriter text="Följ upp i realtid" progress={text3TitleProgress} />
                </h2>
                <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                  <ScrollTypeWriter
                    text="Se när kunden öppnar offerten och svara snabbt när läget är rätt."
                    progress={text3SubProgress}
                  />
                </p>
              </div>

            </motion.div>
          </div>
        </div>

        {/* Scroll spacer — provides room for sticky to pin through the full 2400px animation */}
        <div className="h-[2400px]" />
      </section>

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
