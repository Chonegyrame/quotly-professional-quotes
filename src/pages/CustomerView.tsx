import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { mockQuotes, mockCompany, getQuoteSubtotal, getQuoteVat, getQuoteTotal, formatCurrency, formatDate } from '@/data/mockData';

export default function CustomerView() {
  const { id } = useParams();
  const quote = mockQuotes.find(q => q.id === id);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');

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

  const subtotal = getQuoteSubtotal(quote.items);
  const vat = getQuoteVat(quote.items);
  const total = getQuoteTotal(quote.items);
  const company = mockCompany;

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Offerten accepterad!</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Tack! {company.name} har fått en notifikation och kommer att kontakta dig inom kort.
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-lg mx-auto animate-fade-in">
        {/* Company header */}
        <div className="text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary mx-auto mb-3">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-heading font-bold text-lg">{company.name}</h2>
          <p className="text-xs text-muted-foreground">{company.orgNumber} · {company.phone}</p>
          <p className="text-xs text-muted-foreground">{company.address}</p>
        </div>

        {/* Quote header */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h1 className="font-heading font-bold text-lg">Offert {quote.quoteNumber}</h1>
                <p className="text-sm text-muted-foreground">Till: {quote.customerName}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Datum: {formatDate(quote.createdAt)}</p>
                <p>Giltig till: {formatDate(quote.validUntil)}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary">
                    <th className="text-left p-2 font-medium">Beskrivning</th>
                    <th className="text-right p-2 font-medium">Antal</th>
                    <th className="text-right p-2 font-medium">Pris</th>
                    <th className="text-right p-2 font-medium">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map(item => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Delsumma</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Moms (25%)</span><span>{formatCurrency(vat)}</span></div>
              <div className="flex justify-between font-heading font-bold text-xl border-t pt-2">
                <span>Totalt inkl. moms</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {quote.notes && <p className="mt-3 text-sm text-muted-foreground italic">{quote.notes}</p>}

            {company.bankgiro && (
              <p className="mt-2 text-xs text-muted-foreground">Bankgiro: {company.bankgiro}</p>
            )}
          </CardContent>
        </Card>

        {/* Accept section */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="Meddelande (valfritt)..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
            />
            <Button
              className="w-full h-14 text-lg font-heading font-bold gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setAccepted(true)}
            >
              <Check className="h-5 w-5" /> Acceptera offert
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Genom att acceptera godkänner du villkoren i offerten
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="font-semibold">Quotly</span>
        </p>
      </div>
    </div>
  );
}
