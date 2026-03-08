import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Send, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { StepIndicator } from '@/components/StepIndicator';
import { formatCurrency } from '@/data/mockData';
import { useQuotes } from '@/hooks/useQuotes';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  includeVat: boolean;
}

const steps = ['Customer', 'Line Items', 'Preview'];

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { createQuote } = useQuotes();
  const { company } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const defaultValidity = company?.default_validity_days || 30;
  const defaultVat = company?.default_vat || 25;

  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, includeVat: true },
  ]);
  const [notes, setNotes] = useState('');
  const [validityDays, setValidityDays] = useState(defaultValidity);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, includeVat: true }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | boolean) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const vatRate = defaultVat / 100;
  const vat = items.reduce((sum, i) => i.includeVat ? sum + i.quantity * i.unitPrice * vatRate : sum, 0);
  const total = subtotal + vat;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  const canProceedStep0 = customerName.trim() && customerEmail.trim();
  const canProceedStep1 = items.some(i => i.description.trim() && i.unitPrice > 0);

  const handleSave = async (status: 'draft' | 'sent') => {
    try {
      await createQuote.mutateAsync({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        notes,
        valid_until: validUntil.toISOString().split('T')[0],
        status,
        items: items.filter(i => i.description.trim()).map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          vat_rate: i.includeVat ? defaultVat : 0,
        })),
      });
      toast.success(status === 'sent' ? 'Quote sent!' : 'Quote saved as draft');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quote');
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold">New Quote</h1>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />

      {currentStep === 0 && (
        <Card className="animate-fade-in">
          <CardHeader><CardTitle className="text-lg">Customer Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="e.g. Anna Eriksson" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="anna@example.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="070-123 45 67" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="Street, City" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="mt-1" />
            </div>
            <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!canProceedStep0} onClick={() => setCurrentStep(1)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <div className="space-y-4 animate-fade-in">
          {items.map((item, idx) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label>Description</Label>
                  <Input placeholder="e.g. Elinstallation badrum" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Unit Price (SEK)</Label>
                    <Input type="number" min="0" value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Include VAT ({defaultVat}%)</Label>
                  <Switch checked={item.includeVat} onCheckedChange={v => updateItem(item.id, 'includeVat', v)} />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full gap-2" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Any additional notes for the customer..." value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Validity (days)</Label>
                <Input type="number" min="1" value={validityDays} onChange={e => setValidityDays(parseInt(e.target.value) || 30)} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">VAT ({defaultVat}%)</span>
                <span>{formatCurrency(vat)}</span>
              </div>
              <div className="flex justify-between font-heading font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!canProceedStep1} onClick={() => setCurrentStep(2)}>
            Preview <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-heading font-bold mb-3">Quote Preview</h3>
              <div className="space-y-1 text-sm mb-4">
                <p><span className="text-muted-foreground">To:</span> {customerName}</p>
                <p><span className="text-muted-foreground">Email:</span> {customerEmail}</p>
                {customerPhone && <p><span className="text-muted-foreground">Phone:</span> {customerPhone}</p>}
                {customerAddress && <p><span className="text-muted-foreground">Address:</span> {customerAddress}</p>}
                <p><span className="text-muted-foreground">Valid until:</span> {validUntil.toLocaleDateString('sv-SE')}</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium">Qty</th>
                      <th className="text-right p-2 font-medium">Price</th>
                      <th className="text-right p-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.filter(i => i.description).map(item => (
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

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT ({defaultVat}%)</span><span>{formatCurrency(vat)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>

              {notes && <p className="mt-3 text-sm text-muted-foreground italic">{notes}</p>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="gap-2" onClick={() => handleSave('draft')} disabled={createQuote.isPending}>
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleSave('sent')} disabled={createQuote.isPending}>
              <Send className="h-4 w-4" /> Send Quote
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
