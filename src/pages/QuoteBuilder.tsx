import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Send, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StepIndicator } from '@/components/StepIndicator';
import { LineItemEditor } from '@/components/quote-builder/LineItemEditor';
import { TemplateSelector } from '@/components/quote-builder/TemplateSelector';
import { LineItem } from '@/components/quote-builder/types';
import { formatCurrency } from '@/data/mockData';
import { useQuotes, useQuote } from '@/hooks/useQuotes';
import { useCompany } from '@/hooks/useCompany';
import { useMaterials } from '@/hooks/useMaterials';
import { useTemplates } from '@/hooks/useTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const steps = ['Customer', 'Line Items', 'Preview'];

const emptyItem = (): LineItem => ({
  id: Date.now().toString(),
  description: '',
  laborPrice: 0,
  includeVat: true,
  materials: [],
});

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = !!editId;
  const existingQuote = useQuote(editId);
  const { createQuote, updateQuote } = useQuotes();
  const { company } = useCompany();
  const { materials: availableMaterials } = useMaterials();
  const { templates } = useTemplates();
  const [currentStep, setCurrentStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const defaultValidity = company?.default_validity_days || 30;
  const defaultVat = company?.default_vat || 25;

  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [notes, setNotes] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [validityDays, setValidityDays] = useState(defaultValidity);

  // Load existing quote data in edit mode
  useEffect(() => {
    if (isEditMode && existingQuote && !initialized) {
      setCustomerName(existingQuote.customer_name);
      setCustomerEmail(existingQuote.customer_email);
      setCustomerPhone(existingQuote.customer_phone || '');
      setCustomerAddress(existingQuote.customer_address || '');
      setNotes(existingQuote.notes || '');
      setEstimatedTime((existingQuote as any).estimated_time || '');
      
      if (existingQuote.valid_until) {
        const validDate = new Date(existingQuote.valid_until);
        const now = new Date();
        const diffDays = Math.max(1, Math.round((validDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        setValidityDays(diffDays);
      }

      const quoteItems = (existingQuote.quote_items || []).map((qi: any, idx: number) => ({
        id: Date.now().toString() + idx,
        description: qi.description,
        laborPrice: qi.unit_price,
        includeVat: qi.vat_rate > 0,
        materials: (qi.quote_item_materials || []).map((m: any, mi: number) => ({
          id: Date.now().toString() + idx + '-' + mi,
          materialId: m.material_id || undefined,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unit_price,
          unit: m.unit || 'st',
        })),
      }));
      if (quoteItems.length > 0) setItems(quoteItems);
      setInitialized(true);
    }
  }, [isEditMode, existingQuote, initialized]);

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const updateItem = (id: string, updated: LineItem) => setItems(items.map(i => i.id === id ? updated : i));

  const handleTemplateSelect = (template: any) => {
    const defaultItems = template.default_items;
    if (Array.isArray(defaultItems) && defaultItems.length > 0) {
      setItems(defaultItems.map((di: any, idx: number) => ({
        id: Date.now().toString() + idx,
        description: di.description || template.name,
        laborPrice: di.labor_price || 0,
        includeVat: true,
        materials: (di.materials || []).map((m: any, mi: number) => ({
          id: Date.now().toString() + idx + '-' + mi,
          name: m.name || '',
          quantity: m.quantity || 1,
          unitPrice: m.unit_price || 0,
          unit: m.unit || 'st',
        })),
      })));
    } else {
      // Just set description from template name
      setItems([{ ...emptyItem(), description: template.name }]);
    }
    toast.success(`Template "${template.name}" loaded`);
  };

  // Calculations
  const getItemTotal = (item: LineItem) => {
    const matsTotal = item.materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0);
    return item.laborPrice + matsTotal;
  };

  const subtotal = items.reduce((sum, i) => sum + getItemTotal(i), 0);
  const vatRate = defaultVat / 100;
  const vat = items.reduce((sum, i) => i.includeVat ? getItemTotal(i) * vatRate : 0 + sum, 0);
  const total = subtotal + vat;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  const canProceedStep0 = customerName.trim() && customerEmail.trim();
  const canProceedStep1 = items.some(i => i.description.trim() && (i.laborPrice > 0 || i.materials.some(m => m.unitPrice > 0)));

  const handleSave = async (status: 'draft' | 'sent') => {
    try {
      // Create the quote with labor as line items
      const quoteItems = items.filter(i => i.description.trim()).map(i => ({
        description: i.description,
        quantity: 1,
        unit_price: getItemTotal(i),
        vat_rate: i.includeVat ? defaultVat : 0,
        // Store materials separately after
        _materials: i.materials.filter(m => m.name.trim()),
        _laborPrice: i.laborPrice,
      }));

      const quote = await createQuote.mutateAsync({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        notes,
        estimated_time: estimatedTime || '',
        valid_until: validUntil.toISOString().split('T')[0],
        status,
        items: quoteItems.map(qi => ({
          description: qi.description,
          quantity: qi.quantity,
          unit_price: qi._laborPrice,
          vat_rate: qi.vat_rate,
        })),
      });

      // Insert materials for each quote item
      if (quote) {
        const { data: savedItems } = await supabase
          .from('quote_items')
          .select('id, description, sort_order')
          .eq('quote_id', quote.id)
          .order('sort_order');

        if (savedItems) {
          const materialsToInsert: any[] = [];
          savedItems.forEach((si, idx) => {
            const originalItem = quoteItems[idx];
            if (originalItem?._materials) {
              originalItem._materials.forEach((m, mi) => {
                materialsToInsert.push({
                  quote_item_id: si.id,
                  material_id: m.materialId || null,
                  name: m.name,
                  quantity: m.quantity,
                  unit_price: m.unitPrice,
                  unit: m.unit,
                  sort_order: mi,
                });
              });
            }
          });
          if (materialsToInsert.length > 0) {
            await supabase.from('quote_item_materials').insert(materialsToInsert);
          }
        }
      }

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
          <TemplateSelector templates={templates} onSelect={handleTemplateSelect} />

          {items.map((item, idx) => (
            <LineItemEditor
              key={item.id}
              item={item}
              index={idx}
              canRemove={items.length > 1}
              defaultVat={defaultVat}
              availableMaterials={availableMaterials}
              onUpdate={updated => updateItem(item.id, updated)}
              onRemove={() => removeItem(item.id)}
            />
          ))}

          <Button variant="outline" className="w-full gap-2" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add Job
          </Button>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label>Beräknad arbetstid (optional)</Label>
                <Input placeholder="e.g. 2 dagar, 3–4 timmar" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} className="mt-1" />
              </div>
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

              {items.filter(i => i.description).map(item => {
                const matsTotal = item.materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0);
                return (
                  <div key={item.id} className="border rounded-lg p-3 mb-3">
                    <div className="flex justify-between font-medium text-sm mb-1">
                      <span>{item.description}</span>
                      <span>{formatCurrency(getItemTotal(item))}</span>
                    </div>
                    {item.laborPrice > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Labor</span>
                        <span>{formatCurrency(item.laborPrice)}</span>
                      </div>
                    )}
                    {item.materials.filter(m => m.name).map(m => (
                      <div key={m.id} className="flex justify-between text-xs text-muted-foreground pl-3">
                        <span>{m.quantity} × {m.name}</span>
                        <span>{formatCurrency(m.quantity * m.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT ({defaultVat}%)</span><span>{formatCurrency(vat)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>

              {estimatedTime && (
                <div className="mt-3 text-sm"><span className="text-muted-foreground">Beräknad arbetstid:</span> {estimatedTime}</div>
              )}
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
