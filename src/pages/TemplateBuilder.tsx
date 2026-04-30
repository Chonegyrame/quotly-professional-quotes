import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Hammer, Zap, Wrench, Shapes, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineItemEditor } from '@/components/quote-builder/LineItemEditor';
import { LineItem } from '@/components/quote-builder/types';
import { useQuote } from '@/hooks/useQuotes';
import { useCompany } from '@/hooks/useCompany';
import { useMaterials } from '@/hooks/useMaterials';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TemplateCategory = 'build' | 'electric' | 'vvs' | 'general';

const categoryOptions: { value: TemplateCategory; label: string; icon: typeof Hammer }[] = [
  { value: 'build', label: 'Bygg', icon: Hammer },
  { value: 'electric', label: 'El', icon: Zap },
  { value: 'vvs', label: 'VVS', icon: Wrench },
  { value: 'general', label: 'Övrigt', icon: Shapes },
];

function deriveCategory(trade: string | null | undefined): TemplateCategory {
  if (!trade) return 'general';
  const t = trade.toLowerCase();
  if (t === 'bygg' || t === 'build' || t === 'carpentry') return 'build';
  if (t === 'el' || t === 'electric' || t === 'electrical') return 'electric';
  if (t === 'vvs' || t === 'plumbing') return 'vvs';
  return 'general';
}

const emptyItem = (): LineItem => ({
  id: Date.now().toString(),
  description: '',
  laborPrice: 0,
  includeVat: true,
  materials: [],
});

export default function TemplateBuilder() {
  const navigate = useNavigate();
  const { quoteId } = useParams();
  const sourceQuote = useQuote(quoteId);
  const { company } = useCompany();
  const { materials: availableMaterials } = useMaterials();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('general');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill from the source quote (when navigated via /templates/from-quote/:quoteId).
  // Reads raw db field names because useQuote returns the un-transformed row.
  useEffect(() => {
    if (sourceQuote && !initialized) {
      const sq: any = sourceQuote;
      const firstDesc = sq.quote_items?.[0]?.description?.trim();
      setName(firstDesc || `Mall från ${sq.customer_name}`);
      setCategory(deriveCategory(sq.trade));

      const mapped: LineItem[] = (sq.quote_items || []).map((qi: any, idx: number) => ({
        id: `${Date.now()}-${idx}`,
        description: qi.description,
        laborPrice: qi.unit_price ?? 0,
        includeVat: (qi.vat_rate ?? 25) > 0,
        materials: (qi.quote_item_materials || []).map((m: any, mi: number) => ({
          id: `${Date.now()}-${idx}-${mi}`,
          materialId: m.material_id || undefined,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unit_price,
          purchasePrice: m.purchase_price ?? m.unit_price,
          markupPercent: m.markup_percent ?? 0,
          unit: m.unit || 'st',
        })),
      }));

      if (mapped.length > 0) setItems(mapped);
      setInitialized(true);
    }
  }, [sourceQuote, initialized]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => {
    if (items.length > 1) setItems((prev) => prev.filter((i) => i.id !== id));
  };
  const updateItem = (id: string, updated: LineItem) =>
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));

  const defaultVat = company?.default_vat || 25;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('Inget företag valt');
      const validItems = items.filter((i) => i.description.trim());
      if (validItems.length === 0) throw new Error('Minst en arbetsrad krävs');

      const defaultItems = validItems.map((item) => ({
        description: item.description,
        labor_price: item.laborPrice,
        materials: item.materials
          .filter((m) => m.name.trim())
          .map((m: any) => ({
            material_id: m.materialId || null,
            name: m.name,
            quantity: m.quantity,
            unit_price: m.unitPrice,
            purchase_price: m.purchasePrice ?? m.unitPrice,
            markup_percent: m.markupPercent ?? 0,
            unit: m.unit || 'st',
          })),
      }));

      const { error } = await supabase.from('quote_templates').insert({
        company_id: company.id,
        name: name.trim(),
        category,
        description: description.trim(),
        default_items: defaultItems,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Mall sparad');
      navigate('/templates');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Kunde inte spara mall');
    },
  });

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold flex-1">
          {quoteId ? 'Spara som mall' : 'Ny mall'}
        </h1>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Sparar...' : 'Spara mall'}
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-4">
          <div>
            <Label htmlFor="template-name">Mallnamn *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. Badrumsrenovering"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Kategori</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {categoryOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground hover:border-stone-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="template-desc">Beskrivning (valfritt)</Label>
            <Input
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort beskrivning..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
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
      </div>
    </div>
  );
}
