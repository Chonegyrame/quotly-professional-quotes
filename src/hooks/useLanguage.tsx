import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'sv' | 'en';

export type TranslationKey =
  | 'navbar.dashboard'
  | 'navbar.analytics'
  | 'navbar.templates'
  | 'navbar.materials'
  | 'navbar.settings'
  | 'navbar.newQuote'
  | 'navbar.signOut'
  | 'dashboard.title'
  | 'dashboard.subtitle.manage'
  | 'dashboard.subtitle.sample'
  | 'dashboard.cards.all'
  | 'dashboard.cards.accepted'
  | 'dashboard.cards.pending'
  | 'dashboard.cards.drafts'
  | 'dashboard.list.loading'
  | 'dashboard.list.empty'
  | 'settings.title'
  | 'settings.section.language'
  | 'settings.language.label'
  | 'settings.language.sv'
  | 'settings.language.en'
  | 'settings.section.company'
  | 'settings.section.defaults'
  | 'settings.section.emailTemplate'
  | 'settings.field.companyName'
  | 'settings.field.orgNumber'
  | 'settings.field.address'
  | 'settings.field.phone'
  | 'settings.field.email'
  | 'settings.field.bankgiro'
  | 'settings.field.defaultVat'
  | 'settings.field.validityDays'
  | 'settings.field.emailVariables'
  | 'settings.save'
  | 'settings.saved'
  | 'settings.saveFailed';

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'navbar.dashboard': 'Dashboard',
    'navbar.analytics': 'Analytics',
    'navbar.templates': 'Templates',
    'navbar.materials': 'Materials',
    'navbar.settings': 'Settings',
    'navbar.newQuote': 'New Quote',
    'navbar.signOut': 'Sign out',

    'dashboard.title': 'Dashboard',
    'dashboard.subtitle.manage': 'Manage your quotes',
    'dashboard.subtitle.sample': 'Sample data - create your first quote!',
    'dashboard.cards.all': 'All quotes',
    'dashboard.cards.accepted': 'Accepted',
    'dashboard.cards.pending': 'Sent / waiting response',
    'dashboard.cards.drafts': 'Drafts',
    'dashboard.list.loading': 'Loading quotes...',
    'dashboard.list.empty': 'No quotes in this filter.',

    'settings.title': 'Settings',
    'settings.section.language': 'Language',
    'settings.language.label': 'App language',
    'settings.language.sv': 'Swedish',
    'settings.language.en': 'English',
    'settings.section.company': 'Company Information',
    'settings.section.defaults': 'Quote Defaults',
    'settings.section.emailTemplate': 'Email Template',
    'settings.field.companyName': 'Company Name',
    'settings.field.orgNumber': 'Organisation Number',
    'settings.field.address': 'Address',
    'settings.field.phone': 'Phone',
    'settings.field.email': 'Email',
    'settings.field.bankgiro': 'Bankgiro',
    'settings.field.defaultVat': 'Default VAT (%)',
    'settings.field.validityDays': 'Validity (days)',
    'settings.field.emailVariables': 'Variables: {customer_name}, {company_name}, {quote_number}, {quote_link}',
    'settings.save': 'Save Settings',
    'settings.saved': 'Settings saved',
    'settings.saveFailed': 'Failed to save',
  },
  sv: {
    'navbar.dashboard': 'Dashboard',
    'navbar.analytics': 'Analys',
    'navbar.templates': 'Mallar',
    'navbar.materials': 'Material',
    'navbar.settings': 'Inställningar',
    'navbar.newQuote': 'Ny offert',
    'navbar.signOut': 'Logga ut',

    'dashboard.title': 'Dashboard',
    'dashboard.subtitle.manage': 'Hantera dina offerter',
    'dashboard.subtitle.sample': 'Exempeldata - skapa din första offert!',
    'dashboard.cards.all': 'Alla offerter',
    'dashboard.cards.accepted': 'Accepterade',
    'dashboard.cards.pending': 'Skickade / väntar svar',
    'dashboard.cards.drafts': 'Utkast',
    'dashboard.list.loading': 'Laddar offerter...',
    'dashboard.list.empty': 'Inga offerter i detta urval.',

    'settings.title': 'Inställningar',
    'settings.section.language': 'Språk',
    'settings.language.label': 'Appspråk',
    'settings.language.sv': 'Svenska',
    'settings.language.en': 'Engelska',
    'settings.section.company': 'Företagsinformation',
    'settings.section.defaults': 'Standard för offerter',
    'settings.section.emailTemplate': 'E-postmall',
    'settings.field.companyName': 'Företagsnamn',
    'settings.field.orgNumber': 'Organisationsnummer',
    'settings.field.address': 'Adress',
    'settings.field.phone': 'Telefon',
    'settings.field.email': 'E-post',
    'settings.field.bankgiro': 'Bankgiro',
    'settings.field.defaultVat': 'Standardmoms (%)',
    'settings.field.validityDays': 'Giltighet (dagar)',
    'settings.field.emailVariables': 'Variabler: {customer_name}, {company_name}, {quote_number}, {quote_link}',
    'settings.save': 'Spara inställningar',
    'settings.saved': 'Inställningar sparade',
    'settings.saveFailed': 'Kunde inte spara',
  },
};

const STORAGE_KEY = 'quotly_language';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'sv' || saved === 'en' ? saved : 'sv';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextType>(() => {
    const t = (key: TranslationKey) => translations[language][key];
    return { language, setLanguage, t };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
}
