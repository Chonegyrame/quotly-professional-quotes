export interface ShowcaseItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  mediaLabel: string;
}

export const showcaseItems: ShowcaseItem[] = [
  {
    id: 'ai-quote',
    tag: 'AI',
    title: 'AI-genererade offerter',
    subtitle: 'Från fritext till komplett offert på sekunder.',
    description: 'Beskriv jobbet i vanlig text — så skapar AI:n en komplett offert med arbete, material och priser. Baserat på dina tidigare offerter och materialpriser.',
    highlights: ['Tolkar fritext och bilder', 'Lär sig från dina tidigare jobb', 'Föreslår material och priser'],
    mediaLabel: 'Se AI-generering i aktion',
  },
  {
    id: 'send-quote',
    tag: 'Leverans',
    title: 'Skicka med PDF & mejl',
    subtitle: 'Professionell leverans med ett klick.',
    description: 'Mejla offerten med bifogad PDF och ett personligt meddelande. Kunden får en tydlig offert med din logga och kan godkänna direkt online.',
    highlights: ['Eget mejlmeddelande per offert', 'PDF med din företagsinfo', 'Kunden godkänner direkt online'],
    mediaLabel: 'Se hur offerten ser ut för kunden',
  },
  {
    id: 'materials',
    tag: 'Material',
    title: 'Materialbank & mallar',
    subtitle: 'Återanvänd och spara tid på varje offert.',
    description: 'Spara dina vanligaste material med inköpspris och påslag. Skapa mallar från tidigare jobb och generera nya offerter på sekunder.',
    highlights: ['Spara material med priser', 'Skapa mallar från jobb', 'Automatisk prisberäkning'],
    mediaLabel: 'Se materialbanken i Quotly',
  },
  {
    id: 'tracking',
    tag: 'Uppföljning',
    title: 'Följ upp & analysera',
    subtitle: 'Full koll utan att behöva ringa.',
    description: 'Se vilka offerter som öppnats, godkänts eller väntar. Få statistik på din hitrate och genomsnittliga offertvärde.',
    highlights: ['Se när kunden öppnar', 'Statusöversikt på dashboard', 'Analysera din hitrate'],
    mediaLabel: 'Se analysvyn i Quotly',
  },
];
