import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Edit, CopyPlus, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { TimelineEvent } from '@/components/TimelineEvent';
import { useQuotes } from '@/hooks/useQuotes';
import { mockQuotes, getQuoteSubtotal, getQuoteVat, getQuoteTotal, formatCurrency, formatDate, isReminderDue } from '@/data/mockData';
import { toast } from 'sonner';
import { useMemo } from 'react';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quotes: dbQuotes } = useQuotes();

  // Map DB quote or fall back to mock
  const quote = useMemo(() => {
    const dbQ = dbQuotes.find((q: any) => q.id === id);
    if (dbQ) {
      return {
        id: dbQ.id,
        quoteNumber: dbQ.quote_number,
        customerName: dbQ.customer_name,
        customerEmail: dbQ.customer_email,
        customerPhone: dbQ.customer_phone || '',
        customerAddress: dbQ.customer_address || '',
        status: dbQ.status as any,
        notes: dbQ.notes || '',
        validUntil: dbQ.valid_until || '',
        createdAt: dbQ.created_at,
        sentAt: dbQ.sent_at,
        openedAt: dbQ.opened_at,
        acceptedAt: dbQ.accepted_at,
        companyId: dbQ.company_id,
        items: (dbQ.quote_items || []).map((i: any) => ({
          id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, vatRate: i.vat_rate,
        })),
        events: (dbQ.quote_events || []).map((e: any) => ({
          id: e.id, quoteId: e.quote_id, eventType: e.event_type, createdAt: e.created_at,
        })),
      };
    }
    return mockQuotes.find(q => q.id === id);
  }, [id, dbQuotes]);

  if (!quote) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Quote not found</p>
        <Button variant="link" onClick={() => navigate('/')}>Back to dashboard</Button>
      </div>
    );
  }

  const subtotal = getQuoteSubtotal(quote.items);
  const vat = getQuoteVat(quote.items);
  const total = getQuoteTotal(quote.items);
  const canEdit = ['draft', 'sent'].includes(quote.status);
  const reminderDue = isReminderDue(quote);
  const publicLink = `${window.location.origin}/q/${quote.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Link copied!');
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-heading font-bold">{quote.quoteNumber}</h1>
          <p className="text-sm text-muted-foreground">{quote.customerName}</p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      {reminderDue && (
        <Card className="mb-4 border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-warning text-sm font-medium">⚠️ No response after 48h — consider following up</span>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" /> Copy Link
        </Button>
        <Link to={`/q/${quote.id}`} target="_blank">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> View as Customer
          </Button>
        </Link>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => toast.info('Quote duplicated (coming soon)')}>
          <CopyPlus className="h-3.5 w-3.5" /> Duplicate
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-1 text-sm">
          <h3 className="font-semibold mb-2">Customer</h3>
          <p>{quote.customerName}</p>
          <p className="text-muted-foreground">{quote.customerEmail}</p>
          {quote.customerPhone && <p className="text-muted-foreground">{quote.customerPhone}</p>}
          {quote.customerAddress && <p className="text-muted-foreground">{quote.customerAddress}</p>}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Line Items</h3>
          <div className="space-y-2">
            {quote.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p>{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                </div>
                <span className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT (25%)</span><span>{formatCurrency(vat)}</span></div>
            <div className="flex justify-between font-heading font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
          {quote.notes && <p className="mt-3 text-sm text-muted-foreground italic">{quote.notes}</p>}
          {quote.validUntil && <p className="mt-2 text-xs text-muted-foreground">Valid until: {formatDate(quote.validUntil)}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Timeline</h3>
          {quote.events.map((event, idx) => (
            <TimelineEvent key={event.id} eventType={event.eventType} createdAt={event.createdAt} isLast={idx === quote.events.length - 1} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
