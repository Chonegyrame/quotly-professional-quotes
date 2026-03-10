import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Trash2, Pencil, Hammer, Zap, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useMaterials } from '@/hooks/useMaterials';
import { toast } from 'sonner';
import { starterTradeMeta, type StarterTrade } from '@/data/starterMaterials';

type MaterialCategory = StarterTrade | 'general';

const tradeOrder: StarterTrade[] = ['build', 'electric', 'vvs'];

const tradeIcons: Record<StarterTrade, typeof Hammer> = {
  build: Hammer,
  electric: Zap,
  vvs: Wrench,
};

const categoryLabels: Record<MaterialCategory, string> = {
  build: 'Bygg',
  electric: 'El',
  vvs: 'VVS',
  general: 'Övrigt',
};

const normalizeCategory = (
  value: string | null | undefined
): MaterialCategory => {
  if (!value) return 'general';
  if (value === 'build' || value === 'electric' || value === 'vvs') return value;
  if (value === 'electrical') return 'electric';
  if (value === 'plumbing') return 'vvs';
  if (value === 'carpentry') return 'build';
  return 'general';
};

export default function Materials() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const { materials, isLoading } = useMaterials();

  const [activeTrade, setActiveTrade] = useState<StarterTrade>('build');

  const [formMode, setFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('st');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('build');

  const filteredMaterials = useMemo(
    () =>
      materials.filter(
        (material) => normalizeCategory(material.category) === activeTrade
      ),
    [materials, activeTrade]
  );

  const resetForm = () => {
    setFormMode('none');
    setEditId(null);
    setFormName('');
    setFormPrice('');
    setFormUnit('st');
    setFormCategory(activeTrade);
  };

  const openAdd = () => {
    setFormMode('add');
    setEditId(null);
    setFormName('');
    setFormPrice('');
    setFormUnit('st');
    setFormCategory(activeTrade);
  };

  const openEdit = (material: any) => {
    setFormMode('edit');
    setEditId(material.id);
    setFormName(material.name);
    setFormPrice(String(material.unit_price));
    setFormUnit(material.unit || 'st');
    setFormCategory(normalizeCategory(material.category));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName,
        unit_price: parseFloat(formPrice) || 0,
        unit: formUnit,
        category: formCategory,
      };

      if (formMode === 'edit' && editId) {
        const { error } = await supabase
          .from('materials')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert({
          ...payload,
          company_id: company!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id] });
      toast.success(formMode === 'edit' ? 'Material uppdaterat' : 'Material tillagt');
      resetForm();
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id] });
      toast.success('Material borttaget');
    },
  });

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold flex-1">Material</h1>
        <Button
          size="sm"
          className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4" /> Lägg till
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm font-semibold mb-2">Välj bransch</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tradeOrder.map((trade) => {
            const Icon = tradeIcons[trade];
            const selected = activeTrade === trade;
            return (
              <button
                key={trade}
                type="button"
                onClick={() => setActiveTrade(trade)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{starterTradeMeta[trade].label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{starterTradeMeta[trade].subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="font-semibold">{starterTradeMeta[activeTrade].label}</p>
          <p className="text-sm text-muted-foreground">
            Standardmaterial finns redan i listan nedan och kan redigeras direkt.
          </p>
        </CardContent>
      </Card>

      {formMode !== 'none' && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Materialnamn *</Label>
              <Input
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="t.ex. Kabel 3x2.5mm"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pris (SEK)</Label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(event) => setFormPrice(event.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Enhet</Label>
                <Input
                  value={formUnit}
                  onChange={(event) => setFormUnit(event.target.value)}
                  placeholder="st / m / kg"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Kategori</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(Object.keys(categoryLabels) as MaterialCategory[]).map((categoryKey) => (
                  <button
                    key={categoryKey}
                    type="button"
                    onClick={() => setFormCategory(categoryKey)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      formCategory === categoryKey
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {categoryLabels[categoryKey]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!formName.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {formMode === 'edit' ? 'Spara ändringar' : 'Spara material'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Avbryt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground">Laddar...</p>
      ) : filteredMaterials.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Inga material hittades i vald bransch.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMaterials.map((material) => {
            const isEditing = formMode === 'edit' && editId === material.id;
            const normalizedCategory = normalizeCategory(material.category);

            return (
              <Card key={material.id} className={isEditing ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(material)}>
                    <p className="font-semibold text-sm truncate">{material.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(material.unit_price)} / {material.unit || 'st'} · {categoryLabels[normalizedCategory]}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => openEdit(material)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => deleteMaterial.mutate(material.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
