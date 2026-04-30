import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, FileText, CheckCircle, Send, Pencil, Search, Sparkles, ArrowUpDown, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QuoteCard } from '@/components/QuoteCard';
import { AIQuoteModal } from '@/components/AIQuoteModal';
import { SendQuoteModal } from '@/components/SendQuoteModal';
import { useQuotes, useArchivedQuotes } from '@/hooks/useQuotes';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { mockQuotes, type QuoteStatus, type Quote, getQuoteTotal, formatCurrency, formatDate } from '@/data/mockData';
import { DEFAULT_REMINDER_TEMPLATE, resolveEmailTemplate } from '@/lib/emailTemplate';

type DashboardFilter = 'all' | 'sent' | 'accepted' | 'draft' | 'archived';
type AgeFilter = 'all' | 'fresh' | 'cooling' | 'old' | 'dead';
type SortOption = 'newest' | 'oldest' | 'value-desc' | 'value-asc' | 'customer-asc';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Senaste först' },
  { value: 'oldest', label: 'Äldst först' },
  { value: 'value-desc', label: 'Högst värde' },
  { value: 'value-asc', label: 'Lägst värde' },
  { value: 'customer-asc', label: 'Kund A–Ö' },
];

const topFilters = [
  { label: 'Alla', value: 'all', icon: FileText, iconColor: 'text-stone-900' },
  { label: 'Skickade', value: 'sent', icon: Send, iconColor: 'text-amber-500' },
  { label: 'Accepterade', value: 'accepted', icon: CheckCircle, iconColor: 'text-success' },
  { label: 'Utkast', value: 'draft', icon: Pencil, iconColor: 'text-muted-foreground' },
  { label: 'Arkiverade', value: 'archived', icon: Archive, iconColor: 'text-muted-foreground' },
] as const;

const AGE_BUCKETS: Record<Exclude<AgeFilter, 'all'>, { label: string; subtitle: string; min: number; max: number }> = {
  fresh:   { label: 'F\u00e4rska',  subtitle: '0\u20137 d',   min: 0,  max: 7 },
  cooling: { label: 'Svalnar', subtitle: '8\u201330 d',  min: 8,  max: 30 },
  old:     { label: 'Gamla',   subtitle: '31\u201360 d', min: 31, max: 60 },
  dead:    { label: 'D\u00f6da',    subtitle: '60+ d',   min: 61, max: Number.POSITIVE_INFINITY },
};

const AGE_FILTER_ORDER: AgeFilter[] = ['all', 'fresh', 'cooling', 'old', 'dead'];

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function ageKeyForDays(days: number): Exclude<AgeFilter, 'all'> | null {
  for (const [key, b] of Object.entries(AGE_BUCKETS)) {
    if (days >= b.min && days <= b.max) return key as Exclude<AgeFilter, 'all'>;
  }
  return null;
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = ((['all', 'sent', 'accepted', 'draft', 'archived'].includes(searchParams.get('filter') || '')
    ? searchParams.get('filter')
    : 'all') ?? 'all') as DashboardFilter;
  const ageFilter = ((AGE_FILTER_ORDER as string[]).includes(searchParams.get('age') || '')
    ? (searchParams.get('age') as AgeFilter)
    : 'all');
  const sortBy = (sortOptions.find((s) => s.value === searchParams.get('sort'))?.value ?? 'newest') as SortOption;
  const [searchQuery, setSearchQuery] = useState('');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [reminderQuote, setReminderQuote] = useState<Quote | null>(null);
  const { quotes: activeQuotes, isLoading: loadingActive } = useQuotes();
  const { quotes: archivedRawQuotes } = useArchivedQuotes();
  const { company } = useCompany();
  const isArchivedView = activeFilter === 'archived';
  const dbQuotes = isArchivedView ? archivedRawQuotes : activeQuotes;
  const isLoading = isArchivedView ? false : loadingActive;

  const setActiveFilter = (next: DashboardFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('filter');
    else params.set('filter', next);
    if (next !== 'sent') params.delete('age');
    setSearchParams(params, { replace: true });
  };

  const setAgeFilter = (next: AgeFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('age');
    else params.set('age', next);
    setSearchParams(params, { replace: true });
  };

  const setSortBy = (next: SortOption) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'newest') params.delete('sort');
    else params.set('sort', next);
    setSearchParams(params, { replace: true });
  };

  const hasDbQuotes = activeQuotes.length > 0 || archivedRawQuotes.length > 0;

  const transformQuote = (q: any): Quote => ({
    id: q.id,
    quoteNumber: q.quote_number,
    customerName: q.customer_name,
    customerEmail: q.customer_email,
    customerPhone: q.customer_phone || '',
    customerAddress: q.customer_address || '',
    status: q.status as QuoteStatus,
    notes: q.notes || '',
    validUntil: q.valid_until || '',
    createdAt: q.created_at,
    sentAt: q.sent_at,
    openedAt: q.opened_at,
    acceptedAt: q.accepted_at,
    companyId: q.company_id,
    items: (q.quote_items || []).map((i: any) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      vatRate: i.vat_rate,
      materials: (i.quote_item_materials || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        quantity: m.quantity,
        unitPrice: m.unit_price,
        unit: m.unit || 'st',
      })),
    })),
    events: (q.quote_events || []).map((e: any) => ({
      id: e.id,
      quoteId: e.quote_id,
      eventType: e.event_type,
      createdAt: e.created_at,
    })),
  });

  // Transform raw db data once for both lists. Active list falls back to
  // mockQuotes when the company has no real data yet (onboarding sample).
  const activeTransformed = useMemo(
    () => (hasDbQuotes ? activeQuotes.map(transformQuote) : mockQuotes),
    [activeQuotes, hasDbQuotes],
  );
  const archivedTransformed = useMemo(
    () => archivedRawQuotes.map(transformQuote),
    [archivedRawQuotes],
  );

  const displayQuotes = isArchivedView ? archivedTransformed : activeTransformed;

  // Stats always come from BOTH lists so the chip counts stay accurate
  // regardless of which view is currently active.
  const stats = useMemo(() => {
    const all = activeTransformed.length;
    const sent = activeTransformed.filter((q) => ['sent', 'opened'].includes(q.status)).length;
    const accepted = activeTransformed.filter((q) => q.status === 'accepted').length;
    const draft = activeTransformed.filter((q) => q.status === 'draft').length;
    const archived = archivedTransformed.length;
    const totalValue = activeTransformed
      .filter((q) => q.status === 'accepted')
      .reduce((sum, q) => sum + getQuoteTotal(q.items), 0);

    return { all, sent, accepted, draft, archived, totalValue };
  }, [activeTransformed, archivedTransformed]);

  const filteredQuotes = useMemo(() => {
    // In archived view we show ALL archived (any status). In every other view
    // we filter the active list by status.
    let byStatus =
      isArchivedView || activeFilter === 'all'
        ? displayQuotes
        : activeFilter === 'sent'
          ? displayQuotes.filter((q) => ['sent', 'opened'].includes(q.status))
          : activeFilter === 'accepted'
            ? displayQuotes.filter((q) => q.status === 'accepted')
            : displayQuotes.filter((q) => q.status === 'draft');

    if (activeFilter === 'sent' && ageFilter !== 'all') {
      const bucket = AGE_BUCKETS[ageFilter];
      byStatus = byStatus.filter((q) => {
        if (!q.sentAt) return false;
        const days = daysSince(q.sentAt);
        return days >= bucket.min && days <= bucket.max;
      });
    }

    const query = normalizeText(searchQuery.trim());
    const matched = !query
      ? byStatus
      : byStatus.filter((q) => normalizeText(q.customerName).includes(query));

    const sorted = [...matched];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'value-desc':
        sorted.sort((a, b) => getQuoteTotal(b.items) - getQuoteTotal(a.items));
        break;
      case 'value-asc':
        sorted.sort((a, b) => getQuoteTotal(a.items) - getQuoteTotal(b.items));
        break;
      case 'customer-asc':
        sorted.sort((a, b) => a.customerName.localeCompare(b.customerName, 'sv'));
        break;
    }
    return sorted;
  }, [activeFilter, ageFilter, displayQuotes, searchQuery, sortBy, isArchivedView]);

  // Counts of sent/opened quotes by age bucket — populates the age filter row.
  const ageCounts = useMemo(() => {
    const sent = displayQuotes.filter((q) => ['sent', 'opened'].includes(q.status));
    const counts: Record<AgeFilter, number> = { all: sent.length, fresh: 0, cooling: 0, old: 0, dead: 0 };
    for (const q of sent) {
      if (!q.sentAt) continue;
      const key = ageKeyForDays(daysSince(q.sentAt));
      if (key) counts[key] += 1;
    }
    return counts;
  }, [displayQuotes]);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {hasDbQuotes ? 'Hantera dina offerter' : 'Exempeldata - skapa din första offert!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAIModalOpen(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Skapa med AI
          </Button>
          <Link to="/quotes/new">
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" />
              Ny offert
            </Button>
          </Link>
        </div>
      </div>

      <AIQuoteModal open={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />

      <Card className="mb-4">
        <CardContent className="p-4">
          <span className="text-xs text-muted-foreground">Totalt accepterat värde</span>
          <div className="text-3xl font-heading font-bold text-success">{formatCurrency(stats.totalValue)}</div>
        </CardContent>
      </Card>

      {/* Sticky filter toolbar — sits just below the in-app navbar (top-[57px]).
          Holds filter chips + search; sort + markera buttons land here in later steps. */}
      <div className="sticky top-[57px] z-30 -mx-4 md:-mx-6 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {topFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.value;
                const count =
                  filter.value === 'all'
                    ? stats.all
                    : filter.value === 'sent'
                      ? stats.sent
                      : filter.value === 'accepted'
                        ? stats.accepted
                        : filter.value === 'draft'
                          ? stats.draft
                          : stats.archived;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground hover:border-stone-400'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? '' : filter.iconColor}`} />
                    <span className="font-medium">{filter.label}</span>
                    <span className={isActive ? 'opacity-70' : 'text-muted-foreground'}>· {count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-w-[8px]" />

            <div className="relative w-48 sm:w-56">
              <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök kund..."
                className="pl-8 h-9 text-sm"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortOptions.find((s) => s.value === sortBy)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {sortOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={opt.value === sortBy ? 'bg-accent/10 font-medium' : ''}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {activeFilter === 'sent' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {AGE_FILTER_ORDER.map((key) => {
                const isActive = ageFilter === key;
                const meta =
                  key === 'all'
                    ? { label: 'Alla skickade', subtitle: '' }
                    : AGE_BUCKETS[key];
                const count = ageCounts[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAgeFilter(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'border-accent bg-accent text-accent-foreground'
                        : key === 'old' || key === 'dead'
                          ? 'border-destructive/30 bg-destructive/5 text-foreground hover:border-destructive/50'
                          : 'border-border bg-background text-foreground hover:border-stone-400'
                    }`}
                  >
                    <span className="font-medium">{meta.label}</span>
                    {meta.subtitle && (
                      <span className={`ml-1.5 ${isActive ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                        {meta.subtitle}
                      </span>
                    )}
                    <span className={`ml-2 ${isActive ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>
                      · {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Laddar offerter...</p>
      ) : filteredQuotes.length > 0 ? (
        <div className="space-y-2">
          {filteredQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              isArchived={isArchivedView}
              onSendReminder={(q) => setReminderQuote(q)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {isArchivedView
              ? 'Inga arkiverade offerter.'
              : 'Inga offerter matchar din sökning.'}
          </CardContent>
        </Card>
      )}

      {/* Reminder modal — opened from per-row "Skicka påminnelse" action.
          Mirrors the initial-send flow but pre-fills the body with reminder copy
          and logs a 'reminder_sent' event instead of changing quote status. */}
      <SendQuoteModal
        open={!!reminderQuote}
        onOpenChange={(open) => { if (!open) setReminderQuote(null); }}
        customerEmail={reminderQuote?.customerEmail || ''}
        customerName={reminderQuote?.customerName || ''}
        quoteId={reminderQuote?.id || ''}
        total={reminderQuote ? formatCurrency(getQuoteTotal(reminderQuote.items)) : ''}
        validUntil={reminderQuote?.validUntil ? formatDate(reminderQuote.validUntil) : ''}
        defaultMessage={reminderQuote ? resolveEmailTemplate(DEFAULT_REMINDER_TEMPLATE, {
          customer_name: reminderQuote.customerName,
          company_name: company?.name || '',
          valid_until: reminderQuote.validUntil ? formatDate(reminderQuote.validUntil) : '',
        }) : ''}
        onSentSuccess={async () => {
          if (!reminderQuote) return;
          await supabase.from('quote_events').insert({
            quote_id: reminderQuote.id,
            event_type: 'reminder_sent',
          });
        }}
      />
    </div>
  );
}
