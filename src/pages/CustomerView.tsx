import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Check, FileText, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { usePublicQuote } from '@/hooks/useQuotes';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/data/mockData';

export default function CustomerView() {
  const { id } = useParams();
  const { data: quote, isLoading } = usePublicQuote(id);
  const [responded, setResponded] = useState(false);
  const [responseType, setResponseType] = useState<'accepted' | 'declined'>('accepted');
  const [message, setMessage] = useState('');

  const isRevised = quote?.status === 'revised';
  const isAlreadyAccepted = quote?.status === 'accepted';
  const isDeclined = quote?.status === 'declined';

  // Track opened
  useState(() => {
    if (id) {
      // Only mark as opened if it's sent (not revised — we want to keep revised status)
      const statusUpdate = quote?.status === 'sent' ? { opened_at: new Date().toISOString(), status: 'opened' } : { opened_at: new Date().toISOString() };
      supabase.from('quotes').update(statusUpdate).eq('id', id).is('opened_at', null).then(() => {
        supabase.from('quote_events').insert({ quote_id: id, event_type: 'opened' });
      });
    }
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Laddar offert...</p></div>;
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
    const matsTotal = (i.quote_item_materials || []).reduce((ms: number, m: any) => ms + m.quantity * m.unit_price, 0);
    return s + i.quantity * i.unit_price + matsTotal;
  }, 0);
  const vat = items.reduce((s: number, i: any) => {
    const matsTotal = (i.quote_item_materials || []).reduce((ms: number, m: any) => ms + m.quantity * m.unit_price, 0);
    return s + (i.quantity * i.unit_price + matsTotal) * (i.vat_rate / 100);
  }, 0);
  const total = subtotal + vat;

  const handleAccept = async () => {
    await supabase.from('quotes').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    }).eq('id', quote.id);
    await supabase.from('quote_events').insert({ quote_id: quote.id, event_type: 'accepted' });
    setResponseType('accepted');
    setResponded(true);
  };

  const handleDecline = async () => {
    await supabase.from('quotes').update({
      status: 'declined',
    }).eq('id', quote.id);
    await supabase.from('quote_events').insert({ quote_id: quote.id, event_type: 'declined' });
    setResponseType('declined');
    setResponded(true);
  };

  if (responded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center animate-fade-in max-w-sm">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4 ${responseType === 'accepted' ? 'bg-success/10' : 'bg-destructive/10'}`}>
            {responseType === 'accepted' ? <Check className="h-8 w-8 text-success" /> : <X className="h-8 w-8 text-destructive" />}
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
            <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Ditt meddelande:</span><p className="mt-1">{message}</p></CardContent></Card>
          )}
        </div>
      </div>
    );
  }

  // Already accepted and not revised — show confirmation
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary mx-auto mb-3">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-heading font-bold text-lg">Offert {quote.quote_number}</h2>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h1 className="font-heading font-bold text-lg">Offert {quote.quote_number}</h1>
                <p className="text-sm text-muted-foreground">Till: {quote.customer_name}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Datum: {formatDate(quote.created_at)}</p>
                {quote.valid_until && <p>Giltig till: {formatDate(quote.valid_until)}</p>}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden mb-4">
              {items.map((item: any) => {
                const mats = item.quote_item_materials || [];
                const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unit_price, 0);
                return (
                  <div key={item.id} className="border-b last:border-b-0 p-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{item.description}</span>
                      <span>{formatCurrency(item.quantity * item.unit_price + matsTotal)}</span>
                    </div>
                    {item.unit_price > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                        <span>Arbete</span>
                        <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                      </div>
                    )}
                    {mats.length > 0 && mats.map((m: any) => (
                      <div key={m.id} className="flex justify-between text-xs text-muted-foreground mt-0.5 pl-3">
                        <span>{m.quantity} × {m.name}</span>
                        <span>{formatCurrency(m.quantity * m.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Delsumma</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Moms (25%)</span><span>{formatCurrency(vat)}</span></div>
              <div className="flex justify-between font-heading font-bold text-xl border-t pt-2">
                <span>Totalt inkl. moms</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {(quote as any).estimated_time && (
              <p className="mt-3 text-sm"><span className="text-muted-foreground">Beräknad arbetstid:</span> {(quote as any).estimated_time}</p>
            )}
            {quote.notes && <p className="mt-3 text-sm text-muted-foreground italic">{quote.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea placeholder="Meddelande (valfritt)..." value={message} onChange={e => setMessage(e.target.value)} rows={2} />
            <Button className="w-full h-14 text-lg font-heading font-bold gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAccept}>
              <Check className="h-5 w-5" /> Acceptera offert
            </Button>
            <p className="text-xs text-center text-muted-foreground">Genom att acceptera godkänner du villkoren i offerten</p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">Powered by <span className="font-semibold">Quotly</span></p>
      </div>
    </div>
  );
}
