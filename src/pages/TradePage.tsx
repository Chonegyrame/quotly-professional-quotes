import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';

const tradeConfig: Record<string, { label: string; description: string; color: string }> = {
  bygg: {
    label: 'Bygg',
    description: 'För byggföretag — hantera offerter, material och kunder på ett ställe.',
    color: 'from-amber-50 to-white',
  },
  vvs: {
    label: 'VVS',
    description: 'För VVS-företag — snabb offertgenerering med AI och automatisk prissättning.',
    color: 'from-blue-50 to-white',
  },
  el: {
    label: 'El',
    description: 'För elinstallatörer — strukturerade offerter med rätt material direkt.',
    color: 'from-yellow-50 to-white',
  },
  ovrigt: {
    label: 'Övrigt',
    description: 'Alla hantverkare — Quotly fungerar för alla typer av uppdrag.',
    color: 'from-green-50 to-white',
  },
};

export default function TradePage() {
  const { pathname } = useLocation();
  const trade = pathname.replace('/', '');
  const config = tradeConfig[trade] ?? null;

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Sidan hittades inte.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${config.color} text-foreground`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">Quotly</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Logga in
              </Button>
            </Link>
            <Link to="/auth?signup=true">
              <Button size="sm" className="gap-1.5 bg-accent text-white hover:bg-accent/90">
                Kom igång gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <TradeMenu />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 sm:py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent mb-4">
            {config.label}
          </span>
          <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl mb-6">
            Quotly för {config.label}
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground mb-10">
            {config.description}
          </p>
          <Link to="/auth?signup=true">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              <Button size="lg" className="gap-2 bg-accent text-white hover:bg-accent/90">
                Kom igång gratis
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
