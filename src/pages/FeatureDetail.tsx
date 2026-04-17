import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Play, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showcaseItems } from '@/data/showcaseData';

export default function FeatureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const item = showcaseItems.find((s) => s.id === id);

  // Scroll to top on mount and when navigating between features
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  const currentIndex = showcaseItems.findIndex((s) => s.id === id);
  const nextItem = showcaseItems[(currentIndex + 1) % showcaseItems.length];
  const prevItem = showcaseItems[(currentIndex - 1 + showcaseItems.length) % showcaseItems.length];

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Funktionen hittades inte.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-white"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tillbaka
            </motion.button>
          </div>
          <Link to="/" className="flex items-center gap-2">
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
      </header>

      {/* Hero media area — contained with background */}
      <div className="bg-gradient-to-b from-stone-100 to-white px-4 py-12 sm:px-6 sm:py-16">
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
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0, 1] }}
        >
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            {item.tag}
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {item.title}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{item.subtitle}</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.4, 0, 1] }}
          className="mt-8 text-base text-muted-foreground leading-relaxed max-w-2xl"
        >
          {item.description}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.4, 0, 1] }}
          className="mt-8 space-y-4"
        >
          {item.highlights.map((h, i) => (
            <motion.li
              key={h}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.55 + i * 0.1 }}
              className="flex items-center gap-3 text-foreground"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                <CheckCircle2 className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm font-medium">{h}</span>
            </motion.li>
          ))}
        </motion.ul>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
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

        {/* Navigation to other features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-20 border-t border-stone-200 pt-10"
        >
          <p className="mb-6 text-sm font-medium text-muted-foreground">Utforska fler funktioner</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <motion.button
              whileHover={{ x: -4 }}
              onClick={() => navigate(`/features/${prevItem.id}`)}
              className="flex items-center gap-3 text-left group"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <p className="text-xs text-muted-foreground">{prevItem.tag}</p>
                <p className="text-sm font-semibold text-foreground">{prevItem.title}</p>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => navigate(`/features/${nextItem.id}`)}
              className="flex items-center gap-3 text-right group sm:flex-row-reverse"
            >
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <p className="text-xs text-muted-foreground">{nextItem.tag}</p>
                <p className="text-sm font-semibold text-foreground">{nextItem.title}</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
