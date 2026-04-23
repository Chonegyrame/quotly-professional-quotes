import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Copy, Edit, CopyPlus, ExternalLink, ChevronDown, Download, Send, Loader2, CheckCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { downloadQuotePdf } from '@/lib/downloadPdf';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { TimelineEvent } from '@/components/TimelineEvent';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuotes } from '@/hooks/useQuotes';
import { mockQuotes, formatCurrency, formatDate, isReminderDue } from '@/data/mockData';
import { toast } from 'sonner';
import { useCompany } from '@/hooks/useCompany';
import { SendQuoteModal } from '@/components/SendQuoteModal';
import { resolveEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from '@/lib/emailTemplate';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quotes: dbQuotes, updateQuoteStatus, duplicateQuote, completeQuote, resendQuote, deleteQuote } = useQuotes();
  const { company } = useCompany();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [actualHoursInput, setActualHoursInput] = useState<number | ''>('');

  const { data: linkedRequest } = useQuery({
    queryKey: ['linked-request', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('incoming_requests')
        .select('id, submitter_name, ai_tier, ai_score, created_at')
        .eq('converted_to_quote_id', id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!id,
  });

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
        estimatedDays: (dbQ as any).estimated_days ?? null,
        estimatedHours: (dbQ as any).estimated_hours ?? null,
        actualHours: (dbQ as any).actual_hours ?? null,
        completedAt: (dbQ as any).completed_at ?? null,
        aiPromptText: (dbQ as any).ai_prompt_text ?? null,
        validUntil: dbQ.valid_until || '',
        createdAt: dbQ.created_at,
        sentAt: dbQ.sent_at,
        openedAt: dbQ.opened_at,
        acceptedAt: dbQ.accepted_at,
        companyId: dbQ.company_id,
        items: (dbQ.quote_items || []).map((i: any) => ({
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
            unit: m.unit,
          })),
        })),
        events: (dbQ.quote_events || []).map((e: any) => ({
          id: e.id,
          quoteId: e.quote_id,
          eventType: e.event_type,
          createdAt: e.created_at,
        })),
      };
    }
    return mockQuotes.find((q) => q.id === id);
  }, [id, dbQuotes]);

  if (!quote) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Offerten hittades inte</p>
        <Button variant="link" onClick={() => navigate('/')}>Till dashboard</Button>
      </div>
    );
  }

  const subtotal = quote.items.reduce((sum, item) => {
    const mats = (item as any).materials || [];
    const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unitPrice, 0);
    return sum + item.quantity * item.unitPrice + matsTotal;
  }, 0);

  const vat = quote.items.reduce((sum, item) => {
    const mats = (item as any).materials || [];
    const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unitPrice, 0);
    const itemTotal = item.quantity * item.unitPrice + matsTotal;
    return sum + itemTotal * (item.vatRate / 100);
  }, 0);

  const total = subtotal + vat;
  const isLocked = ['declined', 'expired'].includes(quote.status);
  const isCompleted = quote.status === 'completed';
  const canEdit = !isLocked && !isCompleted;
  const reminderDue = isReminderDue(quote);
  const publicLink = `${window.location.origin}/q/${quote.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Länk kopierad');
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadQuotePdf(quote.id, quote.customerName);
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte ladda ner PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleComplete = async () => {
    try {
      await completeQuote.mutateAsync({
        quoteId: quote.id,
        actualHours: actualHoursInput !== '' ? Number(actualHoursInput) : null,
      });
      setCompleteModalOpen(false);
      setActualHoursInput('');
      toast.success('Jobb markerat som slutfört');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte markera jobbet som slutfört');
    }
  };

  const handleDuplicate = async () => {
    try {
      const duplicatedQuote = await duplicateQuote.mutateAsync({ quoteId: quote.id });
      toast.success('Offert kopierad');
      navigate(`/quotes/${duplicatedQuote.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte kopiera offerten');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuote.mutateAsync({ quoteId: quote.id });
      toast.success('Offert borttagen');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte ta bort offerten');
    }
  };

  const canDelete = !['accepted', 'completed', 'revised'].includes(quote.status);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-heading font-bold">{quote.customerName}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(quote.createdAt)}</p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      {linkedRequest && (
        <Link to={`/inbox/${linkedRequest.id}`}>
          <Card className="mb-4 border-muted bg-muted/30 hover:bg-muted/50 transition-colors no-print">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Från förfrågan</p>
                <p className="text-sm font-medium">{linkedRequest.submitter_name ?? 'Okänd kund'}</p>
              </div>
              {linkedRequest.ai_tier && (
                <span className="text-xs text-muted-foreground">
                  {linkedRequest.ai_tier} · {linkedRequest.ai_score ?? '–'} p
                </span>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      {reminderDue && (
        <Card className="mb-4 border-warning/50 bg-warning/5 no-print">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-warning text-sm font-medium">Ingen respons efter 48h - överväg uppföljning</span>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto no-print">
        {quote.status === 'draft' && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setSendModalOpen(true)}>
            <Send className="h-3.5 w-3.5" /> Skicka
          </Button>
        )}
        {quote.status === 'revised' && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setSendModalOpen(true)}>
            <Send className="h-3.5 w-3.5" /> Skicka igen
          </Button>
        )}
        {quote.status === 'accepted' && (
          <Button size="sm" className="gap-1.5 shrink-0 bg-green-600 hover:bg-green-700 text-white" onClick={() => setCompleteModalOpen(true)}>
            <CheckCircle className="h-3.5 w-3.5" /> Markera som slutförd
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" /> Kopiera länk
        </Button>
        {canEdit && !isLocked && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
            <Edit className="h-3.5 w-3.5" /> Redigera
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleDownloadPdf} disabled={downloadingPdf}>
          {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloadingPdf ? 'Genererar...' : 'PDF'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 px-2">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={`/q/${quote.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                <ExternalLink className="h-4 w-4" /> Offert kundvy
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleDuplicate} disabled={duplicateQuote.isPending}>
              <CopyPlus className="h-4 w-4" /> {duplicateQuote.isPending ? 'Duplicerar...' : 'Duplicera'}
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={handleDelete} disabled={deleteQuote.isPending}>
                  <Trash2 className="h-4 w-4" /> Ta bort offert
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
            <p className="text-lg mt-1">{quote.customerName}</p>
          </div>
          <div className="text-right text-sm">
            <p>Datum: {formatDate(quote.createdAt)}</p>
            {quote.validUntil && <p>Giltig till: {formatDate(quote.validUntil)}</p>}
          </div>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-1 text-sm">
          <h3 className="font-semibold mb-2">Kund</h3>
          <p>{quote.customerName}</p>
          <p className="text-muted-foreground">{quote.customerEmail}</p>
          {quote.customerPhone && <p className="text-muted-foreground">{quote.customerPhone}</p>}
          {quote.customerAddress && <p className="text-muted-foreground">{quote.customerAddress}</p>}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group no-print">
              <h3 className="font-semibold text-sm">Arbetsrader ({quote.items.length})</h3>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-lg">{formatCurrency(total)}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 mt-4 pt-3 border-t">
                {quote.items.map((item) => {
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
            </CollapsibleContent>
          </Collapsible>

          <div className="hidden print-only">
            <h3 className="font-semibold text-sm mb-3">Arbetsrader ({quote.items.length})</h3>
            <div className="space-y-3">
              {quote.items.map((item) => {
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

          {((quote as any).estimatedDays || (quote as any).estimatedHours) && (
            <p className="mt-3 text-sm"><span className="text-muted-foreground">Beräknad arbetstid:</span>{' '}
              {[
                (quote as any).estimatedDays > 0 ? `${(quote as any).estimatedDays} dagar` : null,
                (quote as any).estimatedHours > 0 ? `${(quote as any).estimatedHours} timmar` : null,
              ].filter(Boolean).join(', ')}</p>
          )}
          {quote.notes && <p className="mt-3 text-sm text-muted-foreground italic">{quote.notes}</p>}
          {quote.validUntil && <p className="mt-2 text-xs text-muted-foreground no-print">Giltig till: {formatDate(quote.validUntil)}</p>}
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Tidslinje</h3>
          {quote.events.map((event, idx) => (
            <TimelineEvent key={event.id} eventType={event.eventType} createdAt={event.createdAt} isLast={idx === quote.events.length - 1} />
          ))}
        </CardContent>
      </Card>

      {quote.aiPromptText && (
        <Card className="no-print">
          <CardContent className="p-4">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <h3 className="font-semibold text-sm">AI-prompt (dev)</h3>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-3 whitespace-pre-wrap break-words text-xs font-mono text-muted-foreground bg-muted/30 border border-border rounded-md p-3 max-h-96 overflow-y-auto">
                  {quote.aiPromptText}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      <SendQuoteModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        customerEmail={quote.customerEmail}
        customerName={quote.customerName}
        quoteId={quote.id}
        total={formatCurrency(total)}
        validUntil={quote.validUntil ? formatDate(quote.validUntil) : ''}
        defaultMessage={resolveEmailTemplate(
          company?.email_template || DEFAULT_EMAIL_TEMPLATE,
          {
            customer_name: quote.customerName,
            company_name: company?.name || '',
            valid_until: quote.validUntil ? formatDate(quote.validUntil) : '',
          }
        )}
        onSentSuccess={async () => {
          if (quote.status === 'revised') {
            await resendQuote.mutateAsync({ quoteId: quote.id });
          } else {
            await updateQuoteStatus.mutateAsync({ quoteId: quote.id, status: 'sent' });
          }
        }}
      />

      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Markera jobb som slutfört</DialogTitle>
            <DialogDescription>
              Fyll i faktisk arbetstid för att förbättra framtida estimat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {((quote as any).estimatedDays || (quote as any).estimatedHours) && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Uppskattad arbetstid: </span>
                {[
                  (quote as any).estimatedDays > 0 ? `${(quote as any).estimatedDays} dagar` : null,
                  (quote as any).estimatedHours > 0 ? `${(quote as any).estimatedHours} timmar` : null,
                ].filter(Boolean).join(', ')}
              </div>
            )}
            {!(quote as any).estimatedDays && !(quote as any).estimatedHours && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Ingen uppskattning angiven
              </div>
            )}
            <div>
              <Label htmlFor="actual-hours">Faktisk arbetstid (timmar)</Label>
              <Input
                id="actual-hours"
                type="number"
                min="0"
                placeholder="t.ex. 8"
                value={actualHoursInput}
                onChange={(e) => setActualHoursInput(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCompleteModalOpen(false)} disabled={completeQuote.isPending}>
                Avbryt
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2" onClick={handleComplete} disabled={completeQuote.isPending}>
                {completeQuote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Slutför jobb
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
