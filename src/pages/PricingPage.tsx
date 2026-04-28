import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Footer } from '@/components/Footer';

type Tier = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  priceSuffix?: string;
  pricePrefix?: string;
  features: string[];
  cta: { label: string; to: string };
  highlighted?: boolean;
  badge?: string;
};

const tiers: Tier[] = [
  {
    id: 'trial',
    name: 'Provperiod',
    tagline: 'Testa hela Quotly utan kort.',
    price: '0 kr',
    priceSuffix: '/14 dagar',
    features: [
      'Full Pro-funktionalitet i 14 dagar',
      'Inget kreditkort krävs',
      '10 AI-genererade offerter under perioden',
      'Alla yrken (bygg, el, VVS, övrigt)',
      'Skicka via e-post och SMS, PDF, kundvy',
      'Efter 14 dagar: kontot fryses till läsläge',
    ],
    cta: { label: 'Starta gratis', to: '/auth?signup=true' },
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'För hantverkare som skickar offerter regelbundet.',
    price: '599 kr',
    priceSuffix: '/mån',
    features: [
      '3 användare ingår, +149 kr/mån per extra',
      'Obegränsade inkomna offertförfrågningar',
      '50 AI-genererade offerter per månad',
      'AI lead-scoring (alla 4 nivåer)',
      'ROT-avdrag automatiskt på arbetsrader',
      'Materialbibliotek med påslag och lärande',
      'E-post + SMS-utskick, PDF, kundvy',
      'Mallar och grundanalys',
      'E-postsupport',
    ],
    cta: { label: 'Kom igång', to: '/auth?signup=true' },
    highlighted: true,
    badge: 'Mest populära',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'För större firmor, koncerner och franchise.',
    price: 'Kontakta oss',
    features: [
      'Allt i Pro, plus:',
      'Obegränsat antal användare',
      'Obegränsade AI-offerter',
      'SSO (Google, Microsoft, SAML)',
      'Roll- och behörighetsstyrning, audit log',
      'Multi-bolag under ett konto',
      'API + Fortnox/Visma-integrationer',
      'Avancerad analys och rapporter',
      'Dedikerad kontaktperson och SLA',
      'Custom DPA och avtal',
    ],
    cta: { label: 'Boka samtal', to: 'mailto:hej@quotly.se' },
  },
];

const faqs = [
  {
    q: 'Är det någon bindningstid?',
    a: 'Nej. Du betalar månad för månad och kan avsluta när du vill. Vi tror på att verktyget ska säljas av sig självt, inte av ett avtal.',
  },
  {
    q: 'Kostar varje ny användare extra?',
    a: 'På Pro ingår 3 användare. Behöver ni fler är det 149 kr/mån per extra användare. På Enterprise är användare obegränsat.',
  },
  {
    q: 'Vad händer när provperioden tar slut?',
    a: 'Kontot fryses till läsläge så du fortfarande kommer åt skickade offerter och kunddata. Uppgradera till Pro för att fortsätta skicka nya offerter.',
  },
  {
    q: 'Räknas ROT-avdrag automatiskt?',
    a: 'Ja, på alla planer. Quotly räknar 30 % på varje arbetsrad och håller koll på 50 000 kr-taket per person och år.',
  },
  {
    q: 'Kan jag byta mellan planer senare?',
    a: 'Ja, närsomhelst. Uppgraderingar gäller direkt, nedgraderingar nästa fakturaperiod.',
  },
  {
    q: 'Vad ingår i Enterprise jämfört med Pro?',
    a: 'Främst SSO, roll-styrning, multi-bolag, API och dedikerad support. Hör av dig så går vi igenom om Enterprise passar er, eller om Pro räcker.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white text-foreground">
      <MarketingHeader />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-28 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1] }}
        >
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent mb-4">
            Pris
          </span>
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl mb-5">
            Enkel prissättning. Ingen bindning.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Välj planen som passar din firma. Inga per-användare-avgifter på Pro, ingen
            12-månadsbindning, och full flexibilitet att uppgradera eller avsluta när du vill.
          </p>
        </motion.div>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8 lg:auto-rows-fr">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.4, 0, 1] }}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 sm:p-8 ${
                tier.highlighted
                  ? 'border-accent ring-2 ring-accent/30 shadow-xl shadow-accent/10 lg:-translate-y-2'
                  : 'border-stone-200 shadow-sm'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-accent/30">
                    <Sparkles className="h-3 w-3" />
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="font-heading text-xl font-bold text-foreground">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1.5">
                <span className="font-heading text-4xl font-bold text-foreground sm:text-5xl">
                  {tier.price}
                </span>
                {tier.priceSuffix && (
                  <span className="text-sm text-muted-foreground">{tier.priceSuffix}</span>
                )}
              </div>

              <ul className="mb-8 space-y-2.5">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <Check
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        tier.highlighted ? 'text-accent' : 'text-stone-400'
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {tier.cta.to.startsWith('mailto:') ? (
                  <a href={tier.cta.to} className="block">
                    <Button
                      size="lg"
                      className={`w-full gap-1.5 ${
                        tier.highlighted
                          ? 'bg-accent text-white hover:bg-accent/90'
                          : 'bg-foreground text-white hover:bg-foreground/90'
                      }`}
                    >
                      {tier.cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Link to={tier.cta.to} className="block">
                    <Button
                      size="lg"
                      className={`w-full gap-1.5 ${
                        tier.highlighted
                          ? 'bg-accent text-white hover:bg-accent/90'
                          : 'bg-foreground text-white hover:bg-foreground/90'
                      }`}
                    >
                      {tier.cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Reassurance row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-accent" />
            Ingen bindningstid
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-accent" />
            ROT-avdrag på alla planer
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-accent" />
            Avbryt närsomhelst
          </span>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              Vanliga frågor
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Det vi får mest frågor om innan företag väljer plan.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm"
              >
                <h3 className="font-heading text-base font-semibold text-foreground">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl mb-4">
            Redo att testa?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            14 dagar gratis. Inget kort, ingen bindning.
          </p>
          <Link to="/auth?signup=true">
            <Button
              size="lg"
              className="gap-2 bg-accent text-white hover:bg-accent/90 px-8 text-base shadow-lg shadow-accent/25"
            >
              Starta gratis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
