// src/pages/AnvandarvillkorPage.tsx
// Quotly's Användarvillkor (Terms of Service).
//
// IMPORTANT — DRAFT ONLY:
// This document was drafted as a working starting point based on common
// Swedish B2B SaaS practice and a public reference (Bygglet's villkor).
// It is NOT a substitute for review by a qualified Swedish lawyer.
// Before Quotly is offered commercially or relied on by paying users,
// have a real lawyer audit:
//   - liability cap and force-majeure language (section 9)
//   - GDPR processor designation (section 7) and the linked DPA
//   - termination + data-export windows (sections 5, 8)
//   - Stockholm court venue choice (section 11)
//   - placeholder org.nr / address / email (section 1, footer)
// All currency, statutes, and legal terms here are real Swedish ones.

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Footer } from '@/components/Footer';
import type { ReactNode } from 'react';

const SECTIONS = [
  { id: '1',  title: 'Allmänt' },
  { id: '2',  title: 'Tjänsten' },
  { id: '3',  title: 'Konto och registrering' },
  { id: '4',  title: 'Avgifter och betalning' },
  { id: '5',  title: 'Avtalstid och uppsägning' },
  { id: '6',  title: 'Användarens åtaganden' },
  { id: '7',  title: 'Personuppgifter och dataskydd' },
  { id: '8',  title: 'Användarens data' },
  { id: '9',  title: 'Ansvarsbegränsning' },
  { id: '10', title: 'Ändringar av villkoren' },
  { id: '11', title: 'Tillämplig lag och tvistlösning' },
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-5 font-heading text-2xl font-bold text-stone-900 sm:text-3xl">
        <span className="mr-3 font-mono text-base font-normal text-stone-400">{id}.</span>
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-stone-700">
        {children}
      </div>
    </section>
  );
}

export default function AnvandarvillkorPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Back link */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-stone-600 transition-colors hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till startsidan
        </Link>

        {/* Title block */}
        <h1 className="mb-3 font-heading text-4xl font-bold text-stone-900 sm:text-5xl">
          Användarvillkor
        </h1>
        <div className="mb-12 font-mono text-sm text-stone-500">
          Senast uppdaterad: 26 april 2026
        </div>

        {/* Table of contents */}
        <nav
          aria-label="Innehåll"
          className="mb-16 rounded-lg border border-stone-200 bg-stone-50 p-6"
        >
          <div className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
            Innehåll
          </div>
          <ol className="space-y-1.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex gap-1 text-stone-700 transition-colors hover:text-orange-700"
                >
                  <span className="inline-block w-7 font-mono text-stone-400">{s.id}.</span>
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          <Section id="1" title="Allmänt">
            <p>
              Dessa användarvillkor ("Villkoren") gäller mellan Quotly AB, org.nr 559123-4567, med säte i Stockholm
              ("Quotly", "vi") och den näringsidkare som registrerar ett konto eller på annat sätt använder Quotlys
              tjänst ("Användaren", "du").
            </p>
            <p>
              Genom att registrera ett konto eller använda tjänsten godkänner Användaren Villkoren. Quotlys tjänst
              är avsedd att användas i kommersiell verksamhet av näringsidkare. Tjänsten är inte avsedd för
              konsumenter och konsumentskyddsregler är därför inte tillämpliga.
            </p>
          </Section>

          <Section id="2" title="Tjänsten">
            <p>
              Quotlys tjänst är en molnbaserad plattform där Användaren kan skapa, hantera och skicka offerter till
              sina kunder. Tjänsten innefattar bland annat AI-baserad offertgenerering, hantering av materialpriser
              och påslag, kundregister samt uppföljning av skickade offerter.
            </p>
            <p>
              Quotly utvecklar tjänsten löpande och kan komma att lägga till, ändra eller ta bort funktioner. Quotly
              strävar efter hög tillgänglighet men garanterar inte att tjänsten alltid är tillgänglig utan avbrott
              eller fel.
            </p>
            <p>
              Quotly och dess underleverantörer behåller alla immateriella rättigheter till tjänsten, inklusive
              programvara, design och varumärken. Inget i Villkoren ska tolkas som att rättigheter överlåts till
              Användaren utöver den begränsade nyttjanderätt som följer av Villkoren.
            </p>
          </Section>

          <Section id="3" title="Konto och registrering">
            <p>
              Konto kan registreras av en behörig företrädare för en juridisk person eller en enskild näringsidkare.
              Användaren ansvarar för att de uppgifter som lämnas vid registrering är korrekta och hålls
              uppdaterade.
            </p>
            <p>
              Användaren ansvarar för all aktivitet som sker under kontot, inklusive obehörig användning som beror
              på att inloggningsuppgifter inte hanterats säkert. Inloggningsuppgifter får inte delas med tredje
              part.
            </p>
            <p>
              Quotly har rätt att stänga av eller säga upp ett konto vid väsentligt avtalsbrott, utebliven betalning
              eller misstänkt missbruk.
            </p>
          </Section>

          <Section id="4" title="Avgifter och betalning">
            <p>
              Avgifter framgår av Quotlys vid var tid gällande prislista. Avgifter anges exklusive mervärdesskatt
              och betalas i förskott enligt vald faktureringsperiod (månadsvis eller årsvis).
            </p>
            <p>
              Vid utebliven eller försenad betalning utgår dröjsmålsränta enligt räntelagen (1975:635) samt
              påminnelse- och inkassoavgifter enligt lag.
            </p>
            <p>
              Quotly har rätt att justera avgifter. Ändrade avgifter aviseras minst 30 dagar i förväg och börjar
              gälla vid nästa faktureringsperiod. Om Användaren inte accepterar ändringen kan avtalet sägas upp
              till utgången av innevarande period.
            </p>
          </Section>

          <Section id="5" title="Avtalstid och uppsägning">
            <p>
              Avtalet löper från registreringen och tills det sägs upp. Vid månadsabonnemang förnyas avtalet
              automatiskt månadsvis. Vid årsabonnemang förnyas avtalet automatiskt årsvis.
            </p>
            <p>
              Uppsägning ska ske skriftligen senast vid utgången av innevarande faktureringsperiod. Erlagda avgifter
              återbetalas inte vid uppsägning.
            </p>
            <p>
              Quotly har rätt att säga upp avtalet med omedelbar verkan vid väsentligt avtalsbrott från Användarens
              sida, vid utebliven betalning som inte regleras inom 30 dagar från påminnelse, eller om Användaren
              använder tjänsten i strid med Villkoren eller gällande lag.
            </p>
            <p>
              Vid avtalets upphörande har Användaren möjlighet att exportera sin data inom 30 dagar. Därefter
              raderar Quotly Användarens data.
            </p>
          </Section>

          <Section id="6" title="Användarens åtaganden">
            <p>Användaren åtar sig att:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>använda tjänsten i enlighet med Villkoren och gällande lag,</li>
              <li>inte använda tjänsten för olaglig verksamhet,</li>
              <li>
                inte försöka kringgå tekniska säkerhetsfunktioner, dekompilera, kopiera eller på annat sätt
                obehörigt komma åt programvaran bakom tjänsten,
              </li>
              <li>inte använda automatiserade verktyg (bots, skrapor) för att hämta data från tjänsten,</li>
              <li>
                ansvara för att eget material som laddas upp inte kränker tredje parts rättigheter eller på annat
                sätt strider mot lag,
              </li>
              <li>
                fullgöra sina skyldigheter enligt dataskyddsförordningen (GDPR) gentemot sina egna kunder och övriga
                personer vars personuppgifter Användaren behandlar via tjänsten.
              </li>
            </ul>
            <p>
              Användaren ersätter Quotly för skada som uppkommer på grund av Användarens åsidosättande av sina
              åtaganden enligt detta avsnitt.
            </p>
          </Section>

          <Section id="7" title="Personuppgifter och dataskydd">
            <h3 className="!mt-2 font-heading text-lg font-semibold text-stone-900">
              <span className="mr-2 font-mono text-sm font-normal text-stone-400">7.1</span>
              Roller och tillämpligt regelverk
            </h3>
            <p>
              I den utsträckning Användaren genom tjänsten behandlar personuppgifter (såsom uppgifter om sina
              kunder, leads och kontaktpersoner) är Användaren personuppgiftsansvarig och Quotly
              personuppgiftsbiträde i enlighet med dataskyddsförordningen (EU 2016/679, "GDPR") och annan
              tillämplig dataskyddslagstiftning.
            </p>
            <p>
              Detta avsnitt 7 utgör Quotlys personuppgiftsbiträdesavtal med Användaren och uppfyller kraven i
              artikel 28 GDPR.
            </p>
            <p>
              Quotly behandlar därutöver Användarens egna personuppgifter (kontaktuppgifter, kontoinformation
              och motsvarande) i egenskap av personuppgiftsansvarig. Information om denna behandling finns i
              Quotlys integritetspolicy.
            </p>

            <h3 className="!mt-6 font-heading text-lg font-semibold text-stone-900">
              <span className="mr-2 font-mono text-sm font-normal text-stone-400">7.2</span>
              Föremål, varaktighet, art och syfte
            </h3>
            <p>
              Föremålet för behandlingen är de personuppgifter som Användaren laddar upp eller skapar i tjänsten
              i syfte att skapa, skicka och följa upp offerter samt hantera kundrelationer. Behandlingen pågår så
              länge avtalet löper, samt en (1) månad därefter för att möjliggöra dataexport, om inte längre
              lagring krävs enligt lag.
            </p>
            <p>
              Behandlingen sker i syfte att tillhandahålla den tjänst som Användaren har beställt och innefattar
              typiskt sett insamling, lagring, ändring, utlämning, sammanställning och radering.
            </p>

            <h3 className="!mt-6 font-heading text-lg font-semibold text-stone-900">
              <span className="mr-2 font-mono text-sm font-normal text-stone-400">7.3</span>
              Personuppgifter och kategorier av registrerade
            </h3>
            <p>
              Personuppgifter som behandlas omfattar typiskt sett namn, adress, e-postadress, telefonnummer,
              organisationsnummer, fastighetsbeteckning samt övrig information som Användaren själv väljer att
              lägga in i tjänsten. Kategorier av registrerade utgörs av Användarens kunder, kontaktpersoner och
              övriga personer vars uppgifter Användaren behandlar via tjänsten.
            </p>
            <p>
              Användaren ska inte lägga in särskilda kategorier av personuppgifter (såsom uppgifter om hälsa,
              etniskt ursprung eller politiska åsikter enligt artikel 9 GDPR) eller personuppgifter rörande
              fällande domar i brottmål enligt artikel 10 GDPR i tjänsten.
            </p>

            <h3 className="!mt-6 font-heading text-lg font-semibold text-stone-900">
              <span className="mr-2 font-mono text-sm font-normal text-stone-400">7.4</span>
              Quotlys åtaganden
            </h3>
            <p>Quotly åtar sig att:</p>
            <ul className="ml-5 list-[lower-alpha] space-y-2">
              <li>
                endast behandla personuppgifter enligt dokumenterade instruktioner från Användaren, vilka anses
                utgöras av Villkoren och funktionaliteten i tjänsten,
              </li>
              <li>
                säkerställa att personer med åtkomst till personuppgifterna har förbundit sig att iaktta sekretess
                eller omfattas av lämplig lagstadgad tystnadsplikt,
              </li>
              <li>
                vidta lämpliga tekniska och organisatoriska säkerhetsåtgärder enligt artikel 32 GDPR för att
                skydda personuppgifterna mot obehörig eller olaglig behandling och mot förlust, förstöring eller
                skada,
              </li>
              <li>
                bistå Användaren, så långt det är möjligt, vid uppfyllande av Användarens skyldigheter att besvara
                begäran från registrerade om att utöva sina rättigheter enligt kapitel III GDPR,
              </li>
              <li>
                bistå Användaren med att uppfylla skyldigheterna enligt artiklarna 32–36 GDPR (säkerhet, anmälan
                av personuppgiftsincident, konsekvensbedömning samt förhandssamråd) med beaktande av behandlingens
                art och den information som Quotly har tillgång till,
              </li>
              <li>
                vid avtalets upphörande, enligt Användarens val, antingen radera eller återlämna samtliga
                personuppgifter samt radera befintliga kopior, om inte unionsrätten eller svensk lag föreskriver
                lagring,
              </li>
              <li>
                ge Användaren tillgång till den information som krävs för att visa att skyldigheterna i artikel 28
                GDPR har fullgjorts, och möjliggöra och bidra till granskningar som genomförs av Användaren eller
                en av Användaren utsedd revisor.
              </li>
            </ul>

            <h3 className="!mt-6 font-heading text-lg font-semibold text-stone-900">
              <span className="mr-2 font-mono text-sm font-normal text-stone-400">7.5</span>
              Underbiträden
            </h3>
            <p>
              Användaren ger Quotly ett generellt förhandsgodkännande att anlita underbiträden för behandlingen,
              inklusive leverantörer av molntjänster, e-postutskick och betalningsförmedling. En aktuell
              förteckning över underbiträden finns tillgänglig i tjänsten eller på begäran.
            </p>
            <p>
              Quotly ska informera Användaren om planerade ändringar avseende tillägg eller ersättning av
              underbiträden minst trettio (30) dagar i förväg. Användaren har rätt att inom denna tid invända mot
              ändringen. Vid invändning som Quotly inte kan tillmötesgå har Användaren rätt att säga upp avtalet
              med verkan från det att ändringen träder i kraft.
            </p>
            <p>
              Quotly ska säkerställa att underbiträden åläggs samma dataskyddsskyldigheter som de som åvilar
              Quotly enligt detta avsnitt 7.
            </p>

            <h3 className="!mt-6 font-heading text-lg font-semibold text-stone-900">
              <span className="mr-2 font-mono text-sm font-normal text-stone-400">7.6</span>
              Personuppgiftsincident
            </h3>
            <p>
              Quotly ska utan onödigt dröjsmål underrätta Användaren efter att ha fått kännedom om en
              personuppgiftsincident som rör personuppgifter som behandlas på Användarens vägnar. Underrättelsen
              ska innehålla den information som anges i artikel 33.3 GDPR i den utsträckning informationen finns
              tillgänglig.
            </p>

            <h3 className="!mt-6 font-heading text-lg font-semibold text-stone-900">
              <span className="mr-2 font-mono text-sm font-normal text-stone-400">7.7</span>
              Tredjelandsöverföring
            </h3>
            <p>
              Personuppgifter behandlas som utgångspunkt inom EU/EES. För det fall överföring till tredje land
              ändå förekommer ska Quotly säkerställa att överföringen sker med stöd av en sådan rättslig grund som
              anges i artiklarna 44–49 GDPR, exempelvis EU-kommissionens standardavtalsklausuler.
            </p>
          </Section>

          <Section id="8" title="Användarens data">
            <p>
              Användaren behåller alla rättigheter till den data som Användaren laddar upp eller skapar i tjänsten
              ("Användardata"). Quotly får en begränsad rätt att behandla Användardata i den utsträckning det krävs
              för att tillhandahålla, underhålla och förbättra tjänsten.
            </p>
            <p>
              Quotly kan komma att använda aggregerad och anonymiserad data för att utveckla och förbättra
              tjänsten. Sådan data är inte hänförlig till någon enskild Användare eller enskild person.
            </p>
            <p>
              Vid avtalets upphörande har Användaren möjlighet att exportera sin data inom 30 dagar. Därefter
              raderar Quotly Användardata, med undantag för data som måste bevaras enligt lag (till exempel
              räkenskapsmaterial enligt bokföringslagen (1999:1078)).
            </p>
          </Section>

          <Section id="9" title="Ansvarsbegränsning">
            <p>
              Tjänsten tillhandahålls i befintligt skick. Quotly ansvarar inte för att tjänsten är fri från fel
              eller alltid tillgänglig.
            </p>
            <p>
              Quotly ansvarar inte för indirekt skada såsom utebliven vinst, förlorade intäkter, förlust av data
              eller goodwill, eller andra följdskador.
            </p>
            <p>
              Quotlys totala ansvar gentemot Användaren är begränsat till ett belopp motsvarande de avgifter
              Användaren erlagt under de tolv (12) månader som föregår den händelse som ligger till grund för
              anspråket, eller ett (1) prisbasbelopp enligt socialförsäkringsbalken (2010:110), beroende på vilket
              belopp som är lägst.
            </p>
            <p>
              Begränsningarna ovan gäller inte vid uppsåt eller grov vårdslöshet från Quotlys sida.
            </p>
            <p>
              Anspråk mot Quotly ska framställas skriftligen utan oskäligt dröjsmål och senast inom sex (6) månader
              från det att Användaren upptäckt eller bort upptäcka grunden för anspråket. Anspråk som framställs
              senare är preskriberade.
            </p>
            <p>
              Quotly ansvarar inte för dröjsmål eller hinder att fullgöra avtalet om dröjsmålet eller hindret beror
              på omständighet utanför Quotlys kontroll, såsom myndighetsåtgärd, krig, naturkatastrof, strömavbrott,
              störningar i internetuppkoppling eller motsvarande omständigheter (force majeure).
            </p>
          </Section>

          <Section id="10" title="Ändringar av villkoren">
            <p>
              Quotly har rätt att ändra Villkoren. Ändringar aviseras till Användaren via e-post eller i tjänsten
              minst 30 dagar innan de träder i kraft.
            </p>
            <p>
              Om Användaren inte accepterar ändringarna har Användaren rätt att säga upp avtalet till den dag
              ändringarna träder i kraft. Fortsatt användning av tjänsten efter att ändringarna trätt i kraft
              innebär att Användaren accepterar de nya villkoren.
            </p>
          </Section>

          <Section id="11" title="Tillämplig lag och tvistlösning">
            <p>
              Svensk lag ska tillämpas på Villkoren och på avtalsförhållandet mellan parterna, dock med undantag
              för svenska lagvalsregler.
            </p>
            <p>
              Tvister med anledning av Villkoren ska avgöras av allmän domstol med Stockholms tingsrätt som första
              instans.
            </p>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
