import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Send,
  BarChart3,
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

const features = [
  {
    icon: FileText,
    title: 'Strukturerade offerter',
    description: 'Skapa tydliga offerter med arbete och material uppdelat.',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Sparkles,
    title: 'AI-generering',
    description: 'Beskriv jobbet i fritext — AI:n skapar en komplett offert.',
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: Send,
    title: 'PDF & mejl',
    description: 'Skicka offerten med bifogad PDF direkt från appen.',
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Följ upp',
    description: 'Se vilka offerter som öppnats, godkänts eller väntar.',
    color: 'bg-purple-500/10 text-purple-600',
  },
];

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
/*  Feature cards (4 in a row)                                         */
/* ------------------------------------------------------------------ */

function FeatureCard({ feature }: { feature: (typeof features)[0] }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6, transition: { duration: 0.3, ease: 'easeOut' } }}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-foreground">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
    </motion.div>
  );
}

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
        className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md"
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
          className="relative mx-auto max-w-5xl aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl"
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
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const selectedItem = selectedFeature ? showcaseItems.find((s) => s.id === selectedFeature) : null;

  const featureRef = useRef(null);
  const featureInView = useInView(featureRef, { once: true, margin: '-60px' });
  const showcaseRef = useRef(null);

  // Hero image overlay — driven by PAGE scroll so animation starts immediately
  const heroImgRef = useRef(null);
  const { scrollY: pageScrollY } = useScroll();
  // Animation completes when user has scrolled 1200px from the top
  const heroImgScroll = useTransform(pageScrollY, [0, 1200], [0, 1]);
  // Image 2 fades in (phase 1)
  const img2FadeIn = useTransform(heroImgScroll, [0, 0.15], [0, 1]);
  // Whole strip shifts left — pushes Image 1 off-screen (phase 3)
  const stripX = useTransform(heroImgScroll, [0.2, 0.65], ['0%', '-55%']);
  // Text 1 shrinks/fades as it gets squished (phase 3, early)
  const text1Width = useTransform(heroImgScroll, [0.2, 0.45], ['100%', '0%']);
  const text1FadeOpacity = useTransform(heroImgScroll, [0.2, 0.4], [1, 0]);
  // Text 2 types in (phase 3, later) — title then subtitle
  const text2TitleProgress = useTransform(heroImgScroll, [0.5, 0.7], [0, 1]);
  const text2SubProgress = useTransform(heroImgScroll, [0.7, 1.0], [0, 1]);

  // Showcase scroll — fade feature cards as showcase rises
  const { scrollYProgress: showcaseScroll } = useScroll({
    target: showcaseRef,
    offset: ['start end', 'start 0.2'],
  });
  const featureFadeOpacity = useTransform(showcaseScroll, [0, 1], [1, 0]);
  const featureFadeScale = useTransform(showcaseScroll, [0, 1], [1, 0.95]);

  return (
    <div className="min-h-screen bg-white text-foreground" style={{ overflowX: 'clip' }}>
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md"
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
        <div className="sticky top-16 z-10 flex min-h-[calc(100vh-4rem)] flex-col items-stretch bg-gradient-to-b from-slate-50/80 to-white">
          <motion.div
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/5 blur-3xl"
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
            <motion.div style={{ x: stripX }} className="flex items-center gap-6">
              {/* Image 1 — always visible initially */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.25, 0.4, 0, 1] }}
                className="w-[55%] flex-shrink-0"
              >
                <div className="aspect-[4/3] w-full rounded-2xl bg-slate-200 shadow-lg flex items-center justify-center">
                  <span className="text-sm text-slate-400 font-medium">Bild 1</span>
                </div>
              </motion.div>

              {/* Text 1 — gets squished as strip moves left */}
              <motion.div
                style={{ width: text1Width, opacity: text1FadeOpacity }}
                className="flex-shrink-0 overflow-hidden"
              >
                <div className="min-w-[250px] sm:min-w-[350px]">
                  <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                    Skapa offerter snabbare
                  </h2>
                  <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                    Beskriv jobbet — Quotly bygger en komplett offert med arbete och material.
                  </p>
                </div>
              </motion.div>

              {/* Image 2 — fades in beside Text 1, then pushes left with the strip */}
              <motion.div
                style={{ opacity: img2FadeIn }}
                className="w-[55%] flex-shrink-0"
              >
                <div className="aspect-[4/3] w-full rounded-2xl bg-slate-300 shadow-lg flex items-center justify-center">
                  <span className="text-sm text-slate-500 font-medium">Bild 2</span>
                </div>
              </motion.div>

              {/* Text 2 — types out sequentially */}
              <div className="min-w-[250px] sm:min-w-[350px] flex-shrink-0">
                <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  <ScrollTypeWriter text="Byggd för hantverkare" progress={text2TitleProgress} />
                </h2>
                <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                  <ScrollTypeWriter
                    text="Oavsett om du jobbar med el, VVS eller bygg — Quotly anpassar sig efter ditt yrke."
                    progress={text2SubProgress}
                  />
                </p>
              </div>

            </motion.div>
          </div>
        </div>

        {/* Scroll spacer — provides room for sticky to pin through the full 1200px animation */}
        <div className="h-[1200px]" />
      </section>

      {/* Stacking sections — feature cards pinned, showcase slides up over them */}
      <div className="relative">
        {/* Feature cards — sticky, stays pinned while showcase covers them */}
        <motion.div
          className="sticky top-16 z-0 origin-top"
          style={{ opacity: featureFadeOpacity, scale: featureFadeScale }}
        >
          <section className="bg-slate-50/70 py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <FadeIn>
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                    Allt du behöver för dina offerter
                  </h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Från första förfrågan till godkänd offert — Quotly har dig täckt.
                  </p>
                </div>
              </FadeIn>

              <motion.div
                ref={featureRef}
                initial="hidden"
                animate={featureInView ? 'visible' : 'hidden'}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
                className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
              >
                {features.map((feature) => (
                  <FeatureCard key={feature.title} feature={feature} />
                ))}
              </motion.div>
            </div>
          </section>
        </motion.div>

        {/* Showcase — scrolls normally over the sticky feature cards */}
        <section
          ref={showcaseRef}
          className="relative z-10 rounded-t-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-800 py-20 sm:py-28"
        >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
                Se Quotly i aktion
              </h2>
              <p className="mt-4 text-lg text-slate-400">
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
                  className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-2xl ring-1 ring-white/10"
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
      </section>
      </div>

      {/* How it works */}
      <section className="bg-slate-50/70 py-20 sm:py-24">
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
      <footer className="border-t border-slate-200 bg-slate-50 py-8">
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
