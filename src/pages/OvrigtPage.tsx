import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Footer } from '@/components/Footer';

const TRADES = [
  {
    name: 'Snickeri',
    desc: 'Inredningssnickeri, kök, lister och specialarbeten.',
  },
  {
    name: 'Måleri',
    desc: 'Invändig och utvändig målning, tapetsering och fasader.',
  },
  {
    name: 'Plattsättning',
    desc: 'Badrum, kök och klinker, från enstaka rum till totalrenoveringar.',
  },
  {
    name: 'Golvläggning',
    desc: 'Parkett, laminat, vinyl och klinker.',
  },
  {
    name: 'Takläggning',
    desc: 'Nyläggning, omläggning och löpande takunderhåll.',
  },
  {
    name: 'Markarbete',
    desc: 'Plattläggning, dränering, asfalt och grundarbete.',
  },
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.25, 0.4, 0, 1] as const },
};

export default function OvrigtPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white text-foreground">
      <MarketingHeader />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <span className="mb-4 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            Övrigt
          </span>
          <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
            Du är hantverkare.<br />Quotly är till för dig.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Bygg, el och VVS är inte hela hantverkar-Sverige. Quotly fungerar lika bra för måleri, snickeri,
            plattsättning, golv, tak och mark, så länge du skickar offerter till kunder, så löser Quotly resten.
          </p>
          <div className="mt-10">
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
          </div>
        </motion.div>
      </section>

      {/* Trades — text-only grid */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-28">
        <motion.div {...fadeUp} className="mb-14 text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Yrken vi redan ser kunder inom
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Sex hantverkargrupper utöver bygg, el och VVS som redan använder Quotly i sin vardag.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {TRADES.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.25, 0.4, 0, 1] }}
              className="border-l-2 border-stone-200 pl-5"
            >
              <h3 className="font-heading text-xl font-bold text-foreground">{t.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why it works for any trade */}
      <section className="border-y border-stone-200 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div {...fadeUp}>
            <h2 className="mb-6 font-heading text-3xl font-bold text-foreground sm:text-4xl">
              Samma jobb, samma problem, oavsett yrke.
            </h2>
            <div className="space-y-5 text-[17px] leading-relaxed text-stone-700">
              <p>
                Det spelar ingen roll om du målar fasader, lägger klinker eller bygger kök, offertarbetet ser
                ungefär likadant ut. Du sitter med en lista material, försöker komma ihåg vad timmarna brukar
                landa på, och skickar något som förhoppningsvis ser proffsigt ut innan kunden hinner be om
                tre andra offerter.
              </p>
              <p>
                Quotly är byggt för just det. Du lägger upp dina egna materialpriser med inköp och påslag,
                bygger en offert med arbete och materialrader, och skickar den som PDF eller e-post till kunden.
                Hela offerten är strukturerad, du får notiser när den öppnas och du ser direkt om kunden tackar
                ja eller nej.
              </p>
              <p>
                Det finns inte en knapp som heter <span className="font-semibold text-foreground">"Måleri"</span> eller
                <span className="font-semibold text-foreground"> "Plattsättning"</span> i Quotly. Det behövs inte. Du
                anpassar materialregistret efter ditt yrke, och resten fungerar precis likadant som för alla andra.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Missing your trade? */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
        <motion.div {...fadeUp}>
          <h2 className="mb-5 font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Hittar du inte ditt yrke?
          </h2>
          <p className="text-[17px] leading-relaxed text-stone-700">
            Quotlys offertbyggare är yrkesneutral. Vi har lagt fokus på de sex yrken där vi redan har flest
            kunder, men det betyder inte att Quotly bara fungerar för dem. Är du fönsterputsare, smed,
            städföretagare eller något helt annat där du skickar offerter, fungerar Quotly för dig också.
            Skapa ett konto, ladda in dina egna materialpriser, och bygg din första offert på några minuter.
          </p>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24 text-center sm:px-6 sm:pb-32">
        <motion.div {...fadeUp}>
          <h2 className="mb-6 font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Testa Quotly gratis. Inget kort, ingen bindning.
          </h2>
          <Link to="/auth?signup=true">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
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
