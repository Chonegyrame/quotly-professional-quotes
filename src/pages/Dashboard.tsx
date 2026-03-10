import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle, Send, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuoteCard } from '@/components/QuoteCard';
import { useQuotes } from '@/hooks/useQuotes';
import { mockQuotes, type QuoteStatus, getQuoteTotal, formatCurrency } from '@/data/mockData';

type DashboardFilter = 'all' | 'sent' | 'accepted' | 'draft';

const topFilters = [
  { label: 'Alla offerter', value: 'all', icon: FileText },
  { label: 'Skickade offerter', value: 'sent', icon: Send },
  { label: 'Accepterade', value: 'accepted', icon: CheckCircle },
  { label: 'Utkast', value: 'draft', icon: Pencil },
] as const;

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');
  const { quotes: dbQuotes, isLoading } = useQuotes();

  const hasDbQuotes = dbQuotes.length > 0;

  const displayQuotes = useMemo(() => {
    if (!hasDbQuotes) return mockQuotes;

    return dbQuotes.map((q: any) => ({
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
    }));
  }, [dbQuotes, hasDbQuotes]);

  const stats = useMemo(() => {
    const all = displayQuotes.length;
    const sent = displayQuotes.filter((q) => ['sent', 'opened'].includes(q.status)).length;
    const accepted = displayQuotes.filter((q) => q.status === 'accepted').length;
    const draft = displayQuotes.filter((q) => q.status === 'draft').length;
    const totalValue = displayQuotes
      .filter((q) => q.status === 'accepted')
      .reduce((sum, q) => sum + getQuoteTotal(q.items), 0);

    return { all, sent, accepted, draft, totalValue };
  }, [displayQuotes]);

  const filteredQuotes = useMemo(() => {
    if (activeFilter === 'all') return displayQuotes;
    if (activeFilter === 'sent') {
      return displayQuotes.filter((q) => ['sent', 'opened'].includes(q.status));
    }
    if (activeFilter === 'accepted') {
      return displayQuotes.filter((q) => q.status === 'accepted');
    }
    return displayQuotes.filter((q) => q.status === 'draft');
  }, [activeFilter, displayQuotes]);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {hasDbQuotes ? 'Hantera dina offerter' : 'Exempeldata - skapa din första offert!'}
          </p>
        </div>
        <Link to="/quotes/new" className="md:hidden">
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            Ny offert
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                  : stats.draft;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className="text-left"
            >
              <Card className={isActive ? 'border-primary ring-1 ring-primary/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{filter.label}</span>
                  </div>
                  <div className="text-2xl font-heading font-bold">{count}</div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <span className="text-xs text-muted-foreground">Totalt accepterat värde</span>
          <div className="text-3xl font-heading font-bold text-success">{formatCurrency(stats.totalValue)}</div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Laddar offerter...</p>
      ) : filteredQuotes.length > 0 ? (
        <div className="space-y-2">
          {filteredQuotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Inga offerter i denna kategori ännu.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
