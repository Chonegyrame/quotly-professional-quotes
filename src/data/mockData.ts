export type QuoteStatus = 'draft' | 'sent' | 'opened' | 'accepted' | 'declined' | 'expired' | 'revised';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  materials?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unit?: string;
  }[];
}

export interface QuoteEvent {
  id: string;
  quoteId: string;
  eventType: 'created' | 'sent' | 'opened' | 'accepted' | 'declined' | 'reminder_due' | 'edited' | 'revised';
  createdAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  status: QuoteStatus;
  notes: string;
  validUntil: string;
  createdAt: string;
  sentAt: string | null;
  openedAt: string | null;
  acceptedAt: string | null;
  items: QuoteItem[];
  events: QuoteEvent[];
  companyId: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  orgNumber: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  bankgiro: string;
  defaultVat: number;
  defaultValidityDays: number;
}

export const mockCompany: Company = {
  id: 'comp-1',
  userId: 'user-1',
  name: 'Lindqvist El AB',
  orgNumber: '556789-0123',
  address: 'Storgatan 12, 114 51 Stockholm',
  phone: '08-123 45 67',
  email: 'info@lindqvistel.se',
  logoUrl: '',
  bankgiro: '5432-1098',
  defaultVat: 25,
  defaultValidityDays: 30,
};

export const mockQuotes: Quote[] = [
  {
    id: 'q-1',
    quoteNumber: 'Q-2026-001',
    customerName: 'Anna Eriksson',
    customerEmail: 'anna.eriksson@gmail.com',
    customerPhone: '070-123 45 67',
    customerAddress: 'Björkvägen 8, 112 34 Stockholm',
    status: 'accepted',
    notes: 'Arbete utförs vardagar 08-17',
    validUntil: '2026-04-07',
    createdAt: '2026-03-01T09:00:00Z',
    sentAt: '2026-03-01T10:30:00Z',
    openedAt: '2026-03-01T14:22:00Z',
    acceptedAt: '2026-03-02T08:15:00Z',
    companyId: 'comp-1',
    items: [
      { id: 'i-1', description: 'Elinstallation badrum', quantity: 1, unitPrice: 12500, vatRate: 25 },
      { id: 'i-2', description: 'Material (kablar, uttag, strömbrytare)', quantity: 1, unitPrice: 3200, vatRate: 25 },
      { id: 'i-3', description: 'Besiktning & certifikat', quantity: 1, unitPrice: 1800, vatRate: 25 },
    ],
    events: [
      { id: 'e-1', quoteId: 'q-1', eventType: 'created', createdAt: '2026-03-01T09:00:00Z' },
      { id: 'e-2', quoteId: 'q-1', eventType: 'sent', createdAt: '2026-03-01T10:30:00Z' },
      { id: 'e-3', quoteId: 'q-1', eventType: 'opened', createdAt: '2026-03-01T14:22:00Z' },
      { id: 'e-4', quoteId: 'q-1', eventType: 'accepted', createdAt: '2026-03-02T08:15:00Z' },
    ],
  },
  {
    id: 'q-2',
    quoteNumber: 'Q-2026-002',
    customerName: 'Magnus Johansson',
    customerEmail: 'magnus.j@outlook.com',
    customerPhone: '073-987 65 43',
    customerAddress: 'Ekvägen 21, 168 52 Bromma',
    status: 'sent',
    notes: '',
    validUntil: '2026-04-05',
    createdAt: '2026-03-03T11:00:00Z',
    sentAt: '2026-03-03T11:45:00Z',
    openedAt: null,
    acceptedAt: null,
    companyId: 'comp-1',
    items: [
      { id: 'i-4', description: 'Byta elcentral', quantity: 1, unitPrice: 18000, vatRate: 25 },
      { id: 'i-5', description: 'Material (säkringar, central)', quantity: 1, unitPrice: 6500, vatRate: 25 },
    ],
    events: [
      { id: 'e-5', quoteId: 'q-2', eventType: 'created', createdAt: '2026-03-03T11:00:00Z' },
      { id: 'e-6', quoteId: 'q-2', eventType: 'sent', createdAt: '2026-03-03T11:45:00Z' },
    ],
  },
  {
    id: 'q-3',
    quoteNumber: 'Q-2026-003',
    customerName: 'Sara Lindström',
    customerEmail: 'sara.lindstrom@yahoo.se',
    customerPhone: '076-456 78 90',
    customerAddress: 'Tallgatan 5, 752 20 Uppsala',
    status: 'opened',
    notes: 'Kunden vill ha arbetet klart innan midsommar',
    validUntil: '2026-04-02',
    createdAt: '2026-02-28T08:30:00Z',
    sentAt: '2026-02-28T09:00:00Z',
    openedAt: '2026-03-01T07:45:00Z',
    acceptedAt: null,
    companyId: 'comp-1',
    items: [
      { id: 'i-6', description: 'Komplett elinstallation nybygge garage', quantity: 1, unitPrice: 28000, vatRate: 25 },
      { id: 'i-7', description: 'Grävarbete för kabel', quantity: 1, unitPrice: 4500, vatRate: 25 },
      { id: 'i-8', description: 'Material', quantity: 1, unitPrice: 8200, vatRate: 25 },
    ],
    events: [
      { id: 'e-7', quoteId: 'q-3', eventType: 'created', createdAt: '2026-02-28T08:30:00Z' },
      { id: 'e-8', quoteId: 'q-3', eventType: 'sent', createdAt: '2026-02-28T09:00:00Z' },
      { id: 'e-9', quoteId: 'q-3', eventType: 'opened', createdAt: '2026-03-01T07:45:00Z' },
    ],
  },
  {
    id: 'q-4',
    quoteNumber: 'Q-2026-004',
    customerName: 'Erik Nilsson',
    customerEmail: 'erik.nilsson@telia.com',
    customerPhone: '070-222 33 44',
    customerAddress: 'Rosenlundsgatan 3, 118 53 Stockholm',
    status: 'declined',
    notes: '',
    validUntil: '2026-03-20',
    createdAt: '2026-02-20T14:00:00Z',
    sentAt: '2026-02-20T14:30:00Z',
    openedAt: '2026-02-21T10:00:00Z',
    acceptedAt: null,
    companyId: 'comp-1',
    items: [
      { id: 'i-9', description: 'Installation laddbox garage', quantity: 1, unitPrice: 8500, vatRate: 25 },
      { id: 'i-10', description: 'Laddbox Easee Home (material)', quantity: 1, unitPrice: 7900, vatRate: 25 },
    ],
    events: [
      { id: 'e-10', quoteId: 'q-4', eventType: 'created', createdAt: '2026-02-20T14:00:00Z' },
      { id: 'e-11', quoteId: 'q-4', eventType: 'sent', createdAt: '2026-02-20T14:30:00Z' },
      { id: 'e-12', quoteId: 'q-4', eventType: 'opened', createdAt: '2026-02-21T10:00:00Z' },
      { id: 'e-13', quoteId: 'q-4', eventType: 'declined', createdAt: '2026-02-22T16:00:00Z' },
    ],
  },
  {
    id: 'q-5',
    quoteNumber: 'Q-2026-005',
    customerName: 'Karin Svensson',
    customerEmail: 'karin.s@gmail.com',
    customerPhone: '072-111 22 33',
    customerAddress: 'Vasagatan 44, 411 37 Göteborg',
    status: 'draft',
    notes: 'Väntar på att kunden ska bekräfta omfattning',
    validUntil: '2026-04-08',
    createdAt: '2026-03-06T16:00:00Z',
    sentAt: null,
    openedAt: null,
    acceptedAt: null,
    companyId: 'comp-1',
    items: [
      { id: 'i-11', description: 'Elritning & projektering villa', quantity: 1, unitPrice: 5500, vatRate: 25 },
    ],
    events: [
      { id: 'e-14', quoteId: 'q-5', eventType: 'created', createdAt: '2026-03-06T16:00:00Z' },
    ],
  },
  {
    id: 'q-6',
    quoteNumber: 'Q-2026-006',
    customerName: 'Johan Bergström',
    customerEmail: 'johan.b@hotmail.com',
    customerPhone: '070-555 66 77',
    customerAddress: 'Kungsgatan 10, 753 21 Uppsala',
    status: 'expired',
    notes: '',
    validUntil: '2026-02-15',
    createdAt: '2026-01-15T10:00:00Z',
    sentAt: '2026-01-15T10:30:00Z',
    openedAt: '2026-01-16T09:00:00Z',
    acceptedAt: null,
    companyId: 'comp-1',
    items: [
      { id: 'i-12', description: 'Felsökning el villa', quantity: 3, unitPrice: 1200, vatRate: 25 },
      { id: 'i-13', description: 'Byte jordfelsbrytare', quantity: 2, unitPrice: 1800, vatRate: 25 },
    ],
    events: [
      { id: 'e-15', quoteId: 'q-6', eventType: 'created', createdAt: '2026-01-15T10:00:00Z' },
      { id: 'e-16', quoteId: 'q-6', eventType: 'sent', createdAt: '2026-01-15T10:30:00Z' },
      { id: 'e-17', quoteId: 'q-6', eventType: 'opened', createdAt: '2026-01-16T09:00:00Z' },
    ],
  },
  {
    id: 'q-7',
    quoteNumber: 'Q-2026-007',
    customerName: 'Lisa Karlsson',
    customerEmail: 'lisa.k@icloud.com',
    customerPhone: '073-888 99 00',
    customerAddress: 'Drottninggatan 55, 111 21 Stockholm',
    status: 'accepted',
    notes: 'Nyckel hämtas hos granne',
    validUntil: '2026-03-25',
    createdAt: '2026-02-25T07:30:00Z',
    sentAt: '2026-02-25T08:00:00Z',
    openedAt: '2026-02-25T12:00:00Z',
    acceptedAt: '2026-02-26T09:30:00Z',
    companyId: 'comp-1',
    items: [
      { id: 'i-14', description: 'Taklampa montering (5 st)', quantity: 5, unitPrice: 850, vatRate: 25 },
      { id: 'i-15', description: 'Dimmer installation', quantity: 3, unitPrice: 1100, vatRate: 25 },
      { id: 'i-16', description: 'Spotlights kök', quantity: 8, unitPrice: 650, vatRate: 25 },
    ],
    events: [
      { id: 'e-18', quoteId: 'q-7', eventType: 'created', createdAt: '2026-02-25T07:30:00Z' },
      { id: 'e-19', quoteId: 'q-7', eventType: 'sent', createdAt: '2026-02-25T08:00:00Z' },
      { id: 'e-20', quoteId: 'q-7', eventType: 'opened', createdAt: '2026-02-25T12:00:00Z' },
      { id: 'e-21', quoteId: 'q-7', eventType: 'accepted', createdAt: '2026-02-26T09:30:00Z' },
    ],
  },
  {
    id: 'q-8',
    quoteNumber: 'Q-2026-008',
    customerName: 'Oscar Andersson',
    customerEmail: 'oscar.a@gmail.com',
    customerPhone: '076-333 44 55',
    customerAddress: 'Linnégatan 19, 413 04 Göteborg',
    status: 'sent',
    notes: 'Kund vill ha offert senast fredag',
    validUntil: '2026-04-06',
    createdAt: '2026-03-05T13:00:00Z',
    sentAt: '2026-03-05T13:30:00Z',
    openedAt: null,
    acceptedAt: null,
    companyId: 'comp-1',
    items: [
      { id: 'i-17', description: 'Rördragning kök', quantity: 1, unitPrice: 15000, vatRate: 25 },
      { id: 'i-18', description: 'Blandare installation', quantity: 2, unitPrice: 2200, vatRate: 25 },
      { id: 'i-19', description: 'Material (rör, kopplingar)', quantity: 1, unitPrice: 4800, vatRate: 25 },
    ],
    events: [
      { id: 'e-22', quoteId: 'q-8', eventType: 'created', createdAt: '2026-03-05T13:00:00Z' },
      { id: 'e-23', quoteId: 'q-8', eventType: 'sent', createdAt: '2026-03-05T13:30:00Z' },
    ],
  },
];

export function getQuoteSubtotal(items: QuoteItem[]): number {
  return items.reduce((sum, item) => {
    const materialsTotal = (item.materials ?? []).reduce(
      (materialSum, material) => materialSum + material.quantity * material.unitPrice,
      0,
    );

    return sum + item.quantity * item.unitPrice + materialsTotal;
  }, 0);
}

export function getQuoteVat(items: QuoteItem[]): number {
  return items.reduce((sum, item) => {
    const materialsTotal = (item.materials ?? []).reduce(
      (materialSum, material) => materialSum + material.quantity * material.unitPrice,
      0,
    );
    const lineTotal = item.quantity * item.unitPrice + materialsTotal;

    return sum + lineTotal * (item.vatRate / 100);
  }, 0);
}

export function getQuoteTotal(items: QuoteItem[]): number {
  return getQuoteSubtotal(items) + getQuoteVat(items);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sv-SE');
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
}

export function isReminderDue(quote: Quote): boolean {
  if (quote.status !== 'sent' || quote.openedAt) return false;
  const sentDate = new Date(quote.sentAt!);
  const now = new Date();
  const hoursDiff = (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 48;
}

