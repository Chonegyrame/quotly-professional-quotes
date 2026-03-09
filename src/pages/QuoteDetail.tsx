import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Edit, CopyPlus, ExternalLink, ChevronDown, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { TimelineEvent } from '@/components/TimelineEvent';
import { useQuotes } from '@/hooks/useQuotes';
import { mockQuotes, getQuoteSubtotal, getQuoteVat, getQuoteTotal, formatCurrency, formatDate, isReminderDue } from '@/data/mockData';
import { toast } from 'sonner';
import { useCompany } from '@/hooks/useCompany';
import { SendQuoteModal } from '@/components/SendQuoteModal';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quotes: dbQuotes, updateQuoteStatus } = useQuotes();
  const { company } = useCompany();
  const [sendModalOpen, setSendModalOpen] = useState(false);

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
        estimatedTime: (dbQ as any).estimated_time || '',
        validUntil: dbQ.valid_until || '',
        createdAt: dbQ.created_at,
        sentAt: dbQ.sent_at,
        openedAt: dbQ.opened_at,
        acceptedAt: dbQ.accepted_at,
        companyId: dbQ.company_id,
        items: (dbQ.quote_items || []).map((i: any) => ({
          id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, vatRate: i.vat_rate,
          materials: (i.quote_item_materials || []).map((m: any) => ({
            id: m.id, name: m.name, quantity: m.quantity, unitPrice: m.unit_price, unit: m.unit,
          })),
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

  // Calculate totals including materials
  const subtotal = quote.items.reduce((sum, item) => {
    const mats = (item as any).materials || [];
    const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unitPrice, 0);
    return sum + (item.quantity * item.unitPrice) + matsTotal;
  }, 0);
  
  const vat = quote.items.reduce((sum, item) => {
    const mats = (item as any).materials || [];
    const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unitPrice, 0);
    const itemTotal = (item.quantity * item.unitPrice) + matsTotal;
    return sum + (itemTotal * (item.vatRate / 100));
  }, 0);
  
  const total = subtotal + vat;
  const isLocked = ['declined', 'expired'].includes(quote.status);
  const canEdit = !isLocked;
  const reminderDue = isReminderDue(quote);
  const publicLink = `${window.location.origin}/q/${quote.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Link copied!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      {/* Action bar — hidden when printing */}
      <div className="flex items-center gap-3 mb-4 no-print">
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
        <Card className="mb-4 border-warning/50 bg-warning/5 no-print">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-warning text-sm font-medium">⚠️ No response after 48h — consider following up</span>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto no-print">
        {quote.status === 'draft' && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={async () => {
            await updateQuoteStatus.mutateAsync({ quoteId: quote.id, status: 'sent' });
            setSendModalOpen(true);
          }}>
            <Send className="h-3.5 w-3.5" /> Skicka
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" /> Copy Link
        </Button>
        <Link to={`/q/${quote.id}`} target="_blank">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> View as Customer
          </Button>
        </Link>
        {canEdit && !isLocked && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
        {isLocked && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 opacity-50 cursor-not-allowed" disabled title={`Cannot edit ${quote.status} quotes`}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handlePrint}>
          <Download className="h-3.5 w-3.5" /> PDF
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => toast.info('Quote duplicated (coming soon)')}>
          <CopyPlus className="h-3.5 w-3.5" /> Duplicate
        </Button>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print-only mb-6">
        {company && (
          <div className="mb-4 pb-4 border-b-2 border-foreground">
            <h2 className="text-2xl font-heading font-bold">{company.name}</h2>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3">
              {company.org_number && <span>Org.nr: {company.org_number}</span>}
              {company.address && <span>{company.address}</span>}
              {company.phone && <span>{company.phone}</span>}
              {company.email && <span>{company.email}</span>}
              {company.bankgiro && <span>Bankgiro: {company.bankgiro}</span>}
            </div>
          </div>
        )}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-heading font-bold">OFFERT</h1>
            <p className="text-lg mt-1">{quote.quoteNumber}</p>
          </div>
          <div className="text-right text-sm">
            <p>Datum: {formatDate(quote.createdAt)}</p>
            {quote.validUntil && <p>Giltig till: {formatDate(quote.validUntil)}</p>}
          </div>
        </div>
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
          {/* In print mode, always show expanded content */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group no-print">
              <h3 className="font-semibold text-sm">Line Items ({quote.items.length})</h3>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-lg">{formatCurrency(total)}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 mt-4 pt-3 border-t">
                {quote.items.map(item => {
                  const mats = (item as any).materials || [];
                  const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unitPrice, 0);
                  return (
                    <div key={item.id} className="py-2 border-b border-border/50 last:border-0">
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <span className="font-medium shrink-0 ml-3">{formatCurrency(item.quantity * item.unitPrice + matsTotal)}</span>
                      </div>
                      {mats.length > 0 && (
                        <div className="mt-1 ml-3 space-y-0.5">
                          {mats.map((m: any) => (
                            <div key={m.id} className="flex justify-between text-xs text-muted-foreground">
                              <span>{m.quantity} × {m.name}</span>
                              <span>{formatCurrency(m.quantity * m.unitPrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-t mt-3 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (25%)</span><span>{formatCurrency(vat)}</span></div>
                <div className="flex justify-between font-heading font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Print-only: always-visible line items */}
          <div className="hidden print-only">
            <h3 className="font-semibold text-sm mb-3">Line Items ({quote.items.length})</h3>
            <div className="space-y-3">
              {quote.items.map(item => {
                const mats = (item as any).materials || [];
                const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unitPrice, 0);
                return (
                  <div key={item.id} className="py-2 border-b border-border/50 last:border-0">
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <span className="font-medium shrink-0 ml-3">{formatCurrency(item.quantity * item.unitPrice + matsTotal)}</span>
                    </div>
                    {mats.length > 0 && (
                      <div className="mt-1 ml-3 space-y-0.5">
                        {mats.map((m: any) => (
                          <div key={m.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>{m.quantity} × {m.name}</span>
                            <span>{formatCurrency(m.quantity * m.unitPrice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Delsumma</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Moms (25%)</span><span>{formatCurrency(vat)}</span></div>
              <div className="flex justify-between font-heading font-bold text-lg border-t pt-2"><span>Totalt</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>

          {(quote as any).estimatedTime && (
            <p className="mt-3 text-sm"><span className="text-muted-foreground">Beräknad arbetstid:</span> {(quote as any).estimatedTime}</p>
          )}
          {quote.notes && <p className="mt-3 text-sm text-muted-foreground italic">{quote.notes}</p>}
          {quote.validUntil && <p className="mt-2 text-xs text-muted-foreground no-print">Valid until: {formatDate(quote.validUntil)}</p>}
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Timeline</h3>
          {quote.events.map((event, idx) => (
            <TimelineEvent key={event.id} eventType={event.eventType} createdAt={event.createdAt} isLast={idx === quote.events.length - 1} />
          ))}
        </CardContent>
      </Card>

      <SendQuoteModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        customerEmail={quote.customerEmail}
        quoteNumber={quote.quoteNumber}
        quoteId={quote.id}
        total={formatCurrency(total)}
        validUntil={quote.validUntil ? formatDate(quote.validUntil) : ''}
      />
    </div>
  );
}