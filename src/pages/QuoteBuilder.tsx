import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { SendQuoteModal } from '@/components/SendQuoteModal';
import { resolveEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from '@/lib/emailTemplate';

const steps = ['Kund', 'Arbetsrader', 'Förhandsgranska'];

const emptyItem = (): LineItem => ({
  id: Date.now().toString(),
  description: '',
  laborPrice: 0,
  includeVat: true,
  materials: [],
});

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams();
  const isEditMode = !!editId;
  const existingQuote = useQuote(editId);
  const { createQuote, updateQuote, updateQuoteStatus } = useQuotes();
  const { company } = useCompany();
  const { materials: availableMaterials } = useMaterials();
  const { templates } = useTemplates();
  const [currentStep, setCurrentStep] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [trade, setTrade] = useState<string>('general');
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const isAiQuote = !!aiSuggestions;

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerTelefon, setCustomerTelefon] = useState('');
  const [customerAdress, setCustomerAdress] = useState('');

  const defaultValidity = company?.default_validity_days || 30;
  const defaultVat = company?.default_vat || 25;

  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [notes, setNotes] = useState('');
  const [estimatedDays, setEstimatedDays] = useState<number | ''>('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>('');
  const [validityDays, setValidityDays] = useState(defaultValidity);

  useEffect(() => {
    if (isEditMode && existingQuote && !initialized) {
      setCustomerName(existingQuote.customer_name);
      setCustomerEmail(existingQuote.customer_email);
      setCustomerTelefon(existingQuote.customer_phone || '');
      setCustomerAdress(existingQuote.customer_address || '');
      setNotes(existingQuote.notes || '');
      setEstimatedDays((existingQuote as any).estimated_days ?? '');
      setEstimatedHours((existingQuote as any).estimated_hours ?? '');
      if ((existingQuote as any).trade) setTrade((existingQuote as any).trade);

      if (existingQuote.valid_until) {
        const validDate = new Date(existingQuote.valid_until);
        const now = new Date();
        const diffDays = Math.max(
          1,
          Math.round((validDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
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
          purchasePrice: m.purchase_price ?? m.unit_price,
          markupPercent: m.markup_percent ?? 0,
          unit: m.unit || 'st',
        })),
      }));
      if (quoteItems.length > 0) setItems(quoteItems);
      setInitialized(true);
    }
  }, [isEditMode, existingQuote, initialized]);

  // AI pre-fill: runs when navigated from AIQuoteModal with generated data
  useEffect(() => {
    const aiData = location.state?.aiData;
    if (!isEditMode && aiData && !initialized) {
      if (location.state?.trade) setTrade(location.state.trade);
      if (Array.isArray(aiData.keywords) && aiData.keywords.length > 0) setAiKeywords(aiData.keywords);
      // Store the raw AI response for later diffing
      setAiSuggestions(aiData);
      setCustomerName(aiData.customer_name || '');
      setCustomerAdress(aiData.customer_address || '');
      setNotes(aiData.notes || '');
      const mapped = (aiData.items || []).map((item: any, idx: number) => ({
        id: Date.now().toString() + idx,
        description: item.description,
        laborPrice: item.labor_price,
        includeVat: item.include_vat ?? true,
        materials: (item.materials || []).map((m: any, mi: number) => ({
          id: Date.now().toString() + idx + '-' + mi,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unit_price,
          purchasePrice: m.purchase_price,
          markupPercent: m.markup_percent,
          unit: m.unit || 'st',
        })),
      }));
      if (mapped.length > 0) setItems(mapped);
      setInitialized(true);
    }
  }, [location.state, isEditMode, initialized]);

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== id));
  };
  const updateItem = (id: string, updated: LineItem) =>
    setItems(items.map((i) => (i.id === id ? updated : i)));

  const handleTemplateSelect = (template: any) => {
    const defaultItems = template.default_items;
    if (Array.isArray(defaultItems) && defaultItems.length > 0) {
      setItems(
        defaultItems.map((di: any, idx: number) => ({
          id: Date.now().toString() + idx,
          description: di.description || template.name,
          laborPrice: di.labor_price || 0,
          includeVat: true,
          materials: (di.materials || []).map((m: any, mi: number) => ({
            id: Date.now().toString() + idx + '-' + mi,
            name: m.name || '',
            quantity: m.quantity || 1,
            unitPrice: m.unit_price || 0,
            purchasePrice: m.purchase_price ?? m.unit_price ?? 0,
            markupPercent: m.markup_percent || 0,
            unit: m.unit || 'st',
          })),
        }))
      );
    } else {
      setItems([{ ...emptyItem(), description: template.name }]);
    }
    toast.success(`Mall "${template.name}" inläst`);
  };

  const getItemMaterialCustomerTotal = (item: LineItem) =>
    item.materials.reduce((sum, material) => sum + material.quantity * material.unitPrice, 0);

  const getItemMaterialCostTotal = (item: LineItem) =>
    item.materials.reduce((sum, material) => sum + material.quantity * material.purchasePrice, 0);

  const getItemTotal = (item: LineItem) => item.laborPrice + getItemMaterialCustomerTotal(item);

  const subtotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);
  const totalMaterialCost = items.reduce((sum, item) => sum + getItemMaterialCostTotal(item), 0);
  const totalLaborCost = items.reduce((sum, item) => sum + item.laborPrice, 0);

  const vatRate = defaultVat / 100;
  const vat = items.reduce(
    (sum, item) => sum + (item.includeVat ? getItemTotal(item) * vatRate : 0),
    0
  );
  const total = subtotal + vat;

  const marginAmount = subtotal - totalMaterialCost - totalLaborCost;
  const marginPercent = subtotal > 0 ? (marginAmount / subtotal) * 100 : 0;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  const canProceedStep0 = customerName.trim() && customerEmail.trim();
  const canProceedStep1 = items.some(
    (i) => i.description.trim() && (i.laborPrice > 0 || i.materials.some((m) => m.unitPrice > 0))
  );

  const handleSave = async (status: 'draft' | 'sent') => {
    const effectiveStatus = status === 'sent' ? 'draft' : status;

    try {
      const quoteItems = items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description,
          quantity: 1,
          unit_price: getItemTotal(i),
          vat_rate: i.includeVat ? defaultVat : 0,
          _materials: i.materials.filter((m) => m.name.trim()),
          _laborPrice: i.laborPrice,
        }));

      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerTelefon,
        customer_address: customerAdress,
        notes,
        estimated_days: estimatedDays !== '' ? Number(estimatedDays) : null,
        estimated_hours: estimatedHours !== '' ? Number(estimatedHours) : null,
        valid_until: validUntil.toISOString().split('T')[0],
        status: effectiveStatus,
        trade: trade || 'general',
        keywords: aiKeywords.length > 0 ? aiKeywords : undefined,
        ai_suggestions: aiSuggestions || undefined,
        items: quoteItems.map((qi) => ({
          description: qi.description,
          quantity: qi.quantity,
          unit_price: qi._laborPrice,
          vat_rate: qi.vat_rate,
        })),
      };

      let quoteId: string;

      if (isEditMode && editId) {
        await updateQuote.mutateAsync({ ...payload, quoteId: editId });
        quoteId = editId;
      } else {
        const quote = await createQuote.mutateAsync(payload);
        quoteId = quote.id;
      }

      const { data: savedItems } = await supabase
        .from('quote_items')
        .select('id, description, sort_order')
        .eq('quote_id', quoteId)
        .order('sort_order');

      if (savedItems) {
        const materialsToInsert: any[] = [];
        savedItems.forEach((savedItem, idx) => {
          const originalItem = quoteItems[idx];
          if (originalItem?._materials) {
            originalItem._materials.forEach((material, materialIndex) => {
              materialsToInsert.push({
                quote_item_id: savedItem.id,
                material_id: material.materialId || null,
                name: material.name,
                quantity: material.quantity,
                unit_price: material.unitPrice,
                purchase_price: material.purchasePrice,
                markup_percent: material.markupPercent,
                unit: material.unit,
                sort_order: materialIndex,
              });
            });
          }
        });
        if (materialsToInsert.length > 0) {
          await supabase.from('quote_item_materials').insert(materialsToInsert);
        }
      }

      // Fire-and-forget keyword extraction for manual quotes
      if (!isAiQuote) {
        const descriptionTexts = items
          .filter((i) => i.description.trim())
          .map((i) => i.description.trim());
        const textBlob = [...descriptionTexts, notes].filter(Boolean).join('\n');
        if (textBlob.trim()) {
          supabase.functions.invoke('extract-keywords', {
            body: { quote_id: quoteId, text: textBlob, trade },
          }).catch(() => { /* silent — keyword extraction is non-critical */ });
        }
      }

      if (status === 'sent') {
        setSavedQuoteId(quoteId);
        setSendModalOpen(true);
      } else {
        toast.success('Offert sparad som utkast');
        navigate(isEditMode ? `/quotes/${editId}` : '/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte spara offert');
    }
  };

  const isPending = createQuote.isPending || updateQuote.isPending;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate('/'))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold">{isEditMode ? 'Redigera offert' : 'Ny offert'}</h1>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />

      {currentStep === 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Kunduppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Namn *</Label>
              <Input
                id="name"
                placeholder="t.ex. Anna Eriksson"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">E-post *</Label>
              <Input
                id="email"
                type="email"
                placeholder="anna@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                placeholder="070-123 45 67"
                value={customerTelefon}
                onChange={(e) => setCustomerTelefon(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address">Adress</Label>
              <Input
                id="address"
                placeholder="Gata, stad"
                value={customerAdress}
                onChange={(e) => setCustomerAdress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Bransch</Label>
              <div className="flex gap-2 mt-1">
                {[
                  { value: 'bygg', label: 'Bygg' },
                  { value: 'el', label: 'El' },
                  { value: 'vvs', label: 'VVS' },
                  { value: 'general', label: 'Allmänt' },
                ].map((t) => (
                  <Button
                    key={t.value}
                    type="button"
                    variant={trade === t.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTrade(t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={!canProceedStep0}
              onClick={() => setCurrentStep(1)}
            >
              Nästa <ArrowRight className="h-4 w-4" />
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
              onUpdate={(updated) => updateItem(item.id, updated)}
              onRemove={() => removeItem(item.id)}
            />
          ))}

          <Button variant="outline" className="w-full gap-2" onClick={addItem}>
            <Plus className="h-4 w-4" /> Lägg till arbetsrad
          </Button>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label>Beräknad arbetstid (valfritt)</Label>
                <div className="mt-1 flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Dagar"
                      value={estimatedDays}
                      onChange={(e) => setEstimatedDays(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="Timmar"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Noteringar (valfritt)</Label>
                <Textarea
                  placeholder="Eventuella extra noteringar till kunden..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Giltighet (dagar)</Label>
                <Input
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 30)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">Marginal (live)</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total materialkostnad</span>
                <span>{formatCurrency(totalMaterialCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total arbetstidskostnad</span>
                <span>{formatCurrency(totalLaborCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Totalt pris mot kund</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Beräknad marginal</span>
                <span>{marginPercent.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Delsumma</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Moms ({defaultVat}%)</span>
                <span>{formatCurrency(vat)}</span>
              </div>
              <div className="flex justify-between font-heading font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!canProceedStep1}
            onClick={() => setCurrentStep(2)}
          >
            Förhandsgranska <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-heading font-bold mb-3">Offertförhandsvisning</h3>
              <div className="space-y-1 text-sm mb-4">
                <p>
                  <span className="text-muted-foreground">Till:</span> {customerName}
                </p>
                <p>
                  <span className="text-muted-foreground">E-post:</span> {customerEmail}
                </p>
                {customerTelefon && (
                  <p>
                    <span className="text-muted-foreground">Telefon:</span> {customerTelefon}
                  </p>
                )}
                {customerAdress && (
                  <p>
                    <span className="text-muted-foreground">Adress:</span> {customerAdress}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Giltig till:</span>{' '}
                  {validUntil.toLocaleDateString('sv-SE')}
                </p>
              </div>

              {items
                .filter((i) => i.description)
                .map((item) => {
                  const matsTotal = item.materials.reduce(
                    (sum, material) => sum + material.quantity * material.unitPrice,
                    0
                  );
                  return (
                    <div key={item.id} className="border rounded-lg p-3 mb-3">
                      <div className="flex justify-between font-medium text-sm mb-1">
                        <span>{item.description}</span>
                        <span>{formatCurrency(getItemTotal(item))}</span>
                      </div>
                      {item.laborPrice > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Arbete</span>
                          <span>{formatCurrency(item.laborPrice)}</span>
                        </div>
                      )}
                      {item.materials
                        .filter((m) => m.name)
                        .map((material) => (
                          <div
                            key={material.id}
                            className="flex justify-between text-xs text-muted-foreground pl-3"
                          >
                            <span>
                              {material.quantity} × {material.name}
                            </span>
                            <span>{formatCurrency(material.quantity * material.unitPrice)}</span>
                          </div>
                        ))}
                      {matsTotal > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground pt-1 pl-3">
                          <span>Materialsumma</span>
                          <span>{formatCurrency(matsTotal)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delsumma</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moms ({defaultVat}%)</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-4 border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total materialkostnad</span>
                  <span>{formatCurrency(totalMaterialCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total arbetstidskostnad</span>
                  <span>{formatCurrency(totalLaborCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Totalt pris mot kund</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Beräknad marginal</span>
                  <span>{marginPercent.toFixed(1)}%</span>
                </div>
              </div>

              {(estimatedDays !== '' || estimatedHours !== '') && (
                <div className="mt-3 text-sm">
                  <span className="text-muted-foreground">Beräknad arbetstid:</span>{' '}
                  {[
                    estimatedDays !== '' && estimatedDays > 0 ? `${estimatedDays} dagar` : null,
                    estimatedHours !== '' && estimatedHours > 0 ? `${estimatedHours} timmar` : null,
                  ].filter(Boolean).join(', ')}
                </div>
              )}
              {notes && <p className="mt-3 text-sm text-muted-foreground italic">{notes}</p>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleSave('draft')}
              disabled={isPending}
            >
              <Save className="h-4 w-4" /> {isEditMode ? 'Spara' : 'Spara utkast'}
            </Button>
            <Button
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => handleSave('sent')}
              disabled={isPending}
            >
              <Send className="h-4 w-4" /> {isEditMode ? 'Uppdatera och skicka' : 'Skicka offert'}
            </Button>
          </div>
        </div>
      )}
      <SendQuoteModal
        open={sendModalOpen}
        onOpenChange={(open) => {
          setSendModalOpen(open);
          if (!open) navigate(savedQuoteId ? `/quotes/${savedQuoteId}` : '/');
        }}
        customerEmail={customerEmail}
        customerName={customerName}
        quoteId={savedQuoteId || ''}
        total={formatCurrency(total)}
        validUntil={validUntil.toLocaleDateString('sv-SE')}
        defaultMessage={resolveEmailTemplate(
          company?.email_template || DEFAULT_EMAIL_TEMPLATE,
          {
            customer_name: customerName,
            company_name: company?.name || '',
            valid_until: validUntil.toLocaleDateString('sv-SE'),
          }
        )}
        onSentSuccess={async () => {
          if (!savedQuoteId) return;
          await updateQuoteStatus.mutateAsync({ quoteId: savedQuoteId, status: 'sent' });
        }}
      />
    </div>
  );
}

