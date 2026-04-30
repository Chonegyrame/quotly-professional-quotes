import { useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Check, FileText, RefreshCw, X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { usePublicQuote } from '@/hooks/useQuotes';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/data/mockData';
import { downloadQuotePdf } from '@/lib/downloadPdf';
import { toast } from 'sonner';

export default function CustomerView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const { data: quote, isLoading } = usePublicQuote(id);
  const [responded, setResponded] = useState(false);
  const [responseType, setResponseType] = useState<'accepted' | 'declined'>('accepted');
  const [message, setMessage] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!quote) return;
    setDownloadingPdf(true);
    try {
      await downloadQuotePdf(quote.id, quote.customer_name);
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte ladda ner PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const isRevised = quote?.status === 'revised';
  const isAlreadyAccepted = quote?.status === 'accepted';
  const isDeclined = quote?.status === 'declined';

  useState(() => {
    // Skip the "opened" side effect when this view is rendered as a contractor preview
    // (avoids marking the quote as opened by the customer when the contractor previews it).
    if (id && !isPreview) {
      const statusUpdate =
        quote?.status === 'sent'
          ? { opened_at: new Date().toISOString(), status: 'opened' }
          : { opened_at: new Date().toISOString() };

      supabase
        .from('quotes')
        .update(statusUpdate)
        .eq('id', id)
        .is('opened_at', null)
        .then(() => {
          supabase.from('quote_events').insert({ quote_id: id, event_type: 'opened' });
        });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Laddar offert...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-xl font-heading font-bold mb-1">Offerten hittades inte</h1>
          <p className="text-muted-foreground text-sm">Länken kan vara felaktig eller offerten har tagits bort.</p>
        </div>
      </div>
    );
  }

  const items = quote.quote_items || [];

  const subtotal = items.reduce((s: number, i: any) => {
    const matsTotal = (i.quote_item_materials || []).reduce(
      (ms: number, m: any) => ms + m.quantity * m.unit_price,
      0
    );
    return s + i.quantity * i.unit_price + matsTotal;
  }, 0);

  const vat = items.reduce((s: number, i: any) => {
    const matsTotal = (i.quote_item_materials || []).reduce(
      (ms: number, m: any) => ms + m.quantity * m.unit_price,
      0
    );
    return s + (i.quantity * i.unit_price + matsTotal) * (i.vat_rate / 100);
  }, 0);

  const total = subtotal + vat;

  // ROT display reads the persisted discount from the quote row so the customer
  // sees exactly what the firm sent. We do not recompute here.
  const rotEligible = (quote as any).rot_eligible === true;
  const rotDiscount = Number((quote as any).rot_discount_amount ?? 0);
  const customerPays = total - rotDiscount;

  const handleAccept = async () => {
    // In preview mode, skip the DB write but still flip the local state so the
    // contractor can see what the success screen looks like.
    if (!isPreview) {
      await supabase
        .from('quotes')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      await supabase.from('quote_events').insert({ quote_id: quote.id, event_type: 'accepted' });
    }

    setResponseType('accepted');
    setResponded(true);
  };

  const handleDecline = async () => {
    if (!isPreview) {
      await supabase
        .from('quotes')
        .update({
          status: 'declined',
        })
        .eq('id', quote.id);

      await supabase.from('quote_events').insert({ quote_id: quote.id, event_type: 'declined' });
    }

    setResponseType('declined');
    setResponded(true);
  };

  if (responded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center animate-fade-in max-w-sm">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4 ${
              responseType === 'accepted' ? 'bg-success/10' : 'bg-destructive/10'
            }`}
          >
            {responseType === 'accepted' ? (
              <Check className="h-8 w-8 text-success" />
            ) : (
              <X className="h-8 w-8 text-destructive" />
            )}
          </div>

          <h1 className="text-2xl font-heading font-bold mb-2">
            {responseType === 'accepted' ? 'Offerten accepterad!' : 'Offerten nekad'}
          </h1>

          <p className="text-muted-foreground text-sm mb-4">
            {responseType === 'accepted'
              ? 'Tack! Företaget har fått en notifikation och kommer att kontakta dig inom kort.'
              : 'Företaget har informerats om ditt beslut.'}
          </p>

          {message && (
            <Card>
              <CardContent className="p-3 text-sm">
                <span className="text-muted-foreground">Ditt meddelande:</span>
                <p className="mt-1">{message}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (isAlreadyAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Offerten är accepterad</h1>
          <p className="text-muted-foreground text-sm">Denna offert har redan godkänts. Kontakta företaget vid frågor.</p>
        </div>
      </div>
    );
  }

  if (isDeclined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Offerten nekad</h1>
          <p className="text-muted-foreground text-sm">Denna offert har nekats. Kontakta företaget om du vill diskutera vidare.</p>
        </div>
      </div>
    );
  }

  // Mirrors the PDF layout. Branding fields come from the
  // get_quote_company_branding RPC (whitelisted columns only — see migration).
  const branding = (quote as any).company_branding as
    | { name: string; org_number: string; address: string; phone: string; email: string; logo_url: string; bankgiro: string }
    | null;

  const brandingDetails = branding
    ? ([
        branding.org_number && `Org.nr: ${branding.org_number}`,
        branding.address,
        branding.phone,
        branding.email,
      ].filter(Boolean) as string[])
    : [];

  const customerLines = [
    quote.customer_name,
    quote.customer_email,
    (quote as any).customer_phone,
    (quote as any).customer_address,
  ].filter(Boolean) as string[];

  return (
    <div className={`bg-background ${isPreview ? 'p-3' : 'min-h-screen p-4 md:p-6'}`}>
      <div className="max-w-2xl mx-auto animate-fade-in">

        <Card className="mb-4">
          <CardContent className="p-6 sm:p-8">

            {/* Company header — name + contact info left, logo right */}
            <div className="flex justify-between items-start gap-4 mb-3">
              <div className="flex-1 min-w-0">
                {branding?.name ? (
                  <h2 className="font-heading text-xl font-bold text-primary mb-1.5 leading-tight">
                    {branding.name}
                  </h2>
                ) : (
                  <h2 className="font-heading text-xl font-bold text-primary mb-1.5 leading-tight">
                    Offert
                  </h2>
                )}
                {brandingDetails.length > 0 && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {brandingDetails.join('   ·   ')}
                  </p>
                )}
              </div>
              {branding?.logo_url && (
                <img
                  src={branding.logo_url}
                  alt={branding.name || 'Logo'}
                  className="h-12 sm:h-14 w-auto object-contain shrink-0"
                />
              )}
            </div>

            {/* Divider under company header */}
            <div className="h-px bg-stone-300 mb-5" />

            {/* OFFERT title + dates */}
            <div className="flex justify-between items-end mb-1 gap-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight">OFFERT</h1>
              <p className="text-xs text-muted-foreground">Datum: {formatDate(quote.created_at)}</p>
            </div>
            <div className="flex justify-between items-start mb-6 gap-3">
              <p className="text-sm text-muted-foreground">{quote.customer_name}</p>
              {quote.valid_until && (
                <p className="text-xs text-muted-foreground">Giltig till: {formatDate(quote.valid_until)}</p>
              )}
            </div>

            {/* KUND box */}
            {customerLines.length > 0 && (
              <div className="mb-6 rounded border border-stone-200 bg-stone-50 px-4 py-3 max-w-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Kund
                </p>
                {customerLines[0] && <p className="font-semibold text-sm">{customerLines[0]}</p>}
                {customerLines.slice(1).map((line, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            )}

            {/* ARBETSRADER header */}
            <div className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Arbetsrader ({items.length})
              </p>
              <div className="h-px bg-stone-200 mt-1.5" />
            </div>

            {/* Items list */}
            <div className="mb-6">
              {items.map((item: any, idx: number) => {
                const mats = item.quote_item_materials || [];
                const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unit_price, 0);
                const laborTotal = item.quantity * item.unit_price;
                const itemTotal = laborTotal + matsTotal;
                return (
                  <div key={item.id} className={`pt-3 pb-3 ${idx > 0 ? 'border-t border-stone-100' : ''}`}>
                    <div className="flex justify-between gap-4 mb-1">
                      <p className="font-semibold text-sm">{item.description}</p>
                      <p className="font-semibold text-sm shrink-0">{formatCurrency(itemTotal)}</p>
                    </div>
                    {item.unit_price > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground pl-3 mb-0.5">
                        <span>Arbete</span>
                        <span>{formatCurrency(laborTotal)}</span>
                      </div>
                    )}
                    {mats.length > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground pl-3 mt-1 mb-0.5">Material</div>
                        {mats.map((m: any) => (
                          <div key={m.id} className="flex justify-between text-xs text-muted-foreground pl-5 mb-0.5">
                            <span className="truncate pr-2">{m.quantity} × {m.name}</span>
                            <span className="shrink-0">{formatCurrency(m.quantity * m.unit_price)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary — right-aligned */}
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Delsumma</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Moms (25%)</span>
                <span>{formatCurrency(vat)}</span>
              </div>
              <div className="h-[1.5px] bg-stone-700 my-1.5" />
              <div className="flex justify-between font-bold text-base">
                <span>Totalt inkl. moms</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {rotEligible && rotDiscount > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground pt-2">
                    <span>ROT-avdrag (30 % av arbete)</span>
                    <span>−{formatCurrency(rotDiscount)}</span>
                  </div>
                  <div className="h-[1.5px] bg-stone-700 my-1.5" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Du betalar</span>
                    <span>{formatCurrency(customerPays)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Notes + estimated time */}
            {(quote.notes || (quote as any).estimated_days || (quote as any).estimated_hours) && (
              <>
                <div className="h-px bg-stone-100 my-5" />
                {((quote as any).estimated_days || (quote as any).estimated_hours) && (
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium">Beräknad arbetstid:</span>{' '}
                    {[
                      (quote as any).estimated_days > 0 ? `${(quote as any).estimated_days} dagar` : null,
                      (quote as any).estimated_hours > 0 ? `${(quote as any).estimated_hours} timmar` : null,
                    ].filter(Boolean).join(', ')}
                  </p>
                )}
                {quote.notes && (
                  <p className="text-xs text-muted-foreground italic leading-relaxed">{quote.notes}</p>
                )}
              </>
            )}

            {/* Brand footer with bankgiro */}
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
              <span>Quotly — Professional Quotes for Tradespeople</span>
              {branding?.bankgiro && (
                <span className="text-muted-foreground">Bankgiro: {branding.bankgiro}</span>
              )}
            </div>

            {/* PDF download */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 gap-2 text-muted-foreground"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloadingPdf ? 'Genererar PDF...' : 'Ladda ner som PDF'}
            </Button>
          </CardContent>
        </Card>

        {isRevised && (
          <Card className="mb-4 border-warning/50 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning">Offerten har reviderats</p>
                <p className="text-xs text-muted-foreground">Företaget har gjort ändringar i offerten. Granska och godkänn eller neka de nya villkoren.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="Meddelande (valfritt)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              disabled={isPreview}
            />
            <Button
              className="w-full h-14 text-lg font-heading font-bold gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleAccept}
              disabled={isPreview}
            >
              <Check className="h-5 w-5" /> {isRevised ? 'Godkänn ändringarna' : 'Acceptera offert'}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:text-destructive"
              onClick={handleDecline}
              disabled={isPreview}
            >
              <X className="h-4 w-4" /> {isRevised ? 'Neka ändringarna' : 'Neka offert'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {isPreview
                ? 'Knapparna är inaktiva i förhandsgranskningen.'
                : 'Genom att acceptera godkänner du villkoren i offerten'}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">Skapad med <span className="font-semibold">Quotly</span></p>
      </div>
    </div>
  );
}
