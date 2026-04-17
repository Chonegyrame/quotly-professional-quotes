import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Trash2, Pencil, Hammer, Zap, Wrench, Search, Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useMaterials } from '@/hooks/useMaterials';
import { toast } from 'sonner';
import {
  starterMaterialsByTrade,
  starterTradeMeta,
  type StarterTrade,
} from '@/data/starterMaterials';

type MaterialCategory = StarterTrade | 'general';

const tradeOrder: MaterialCategory[] = ['build', 'electric', 'vvs', 'general'];

const tradeIcons: Record<MaterialCategory, typeof Hammer> = {
  build: Hammer,
  electric: Zap,
  vvs: Wrench,
  general: Shapes,
};

const categoryLabels: Record<MaterialCategory, string> = {
  build: 'Bygg',
  electric: 'El',
  vvs: 'VVS',
  general: 'Övrigt',
};

const categorySubtitles: Record<MaterialCategory, string> = {
  build: starterTradeMeta.build.subtitle,
  electric: starterTradeMeta.electric.subtitle,
  vvs: starterTradeMeta.vvs.subtitle,
  general: 'Specialmaterial, tillbehör och övriga artiklar',
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

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeUnit = (value: string | null | undefined) =>
  (value || '').trim().toLowerCase();

const parseNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateCustomerPrice = (purchasePrice: number, markupPercent: number) =>
  purchasePrice * (1 + markupPercent / 100);

const getMaterialPurchasePrice = (material: any) =>
  typeof material.purchase_price === 'number' ? material.purchase_price : material.unit_price || 0;

const getMaterialMarkupPercent = (material: any) =>
  typeof material.markup_percent === 'number' ? material.markup_percent : 0;

export default function Materials() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const { materials, isLoading } = useMaterials();

  const [activeTrade, setActiveTrade] = useState<MaterialCategory>('build');

  const [formMode, setFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formMarkupPercent, setFormMarkupPercent] = useState('');
  const [formUnit, setFormUnit] = useState('st');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('build');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteMaterial, setConfirmDeleteMaterial] = useState<{ id: string; isStarter: boolean; name: string } | null>(null);

  const starterMaterialKeys = useMemo(() => {
    const keys = new Set<string>();
    (Object.keys(starterMaterialsByTrade) as StarterTrade[]).forEach((trade) => {
      starterMaterialsByTrade[trade].forEach((starter) => {
        keys.add(`${trade}::${normalizeName(starter.name)}::${normalizeUnit(starter.unit)}`);
      });
    });
    return keys;
  }, []);

  const isStarterMaterial = (material: any) => {
    const category = normalizeCategory(material.category);
    if (category === 'general') return false;

    const key = `${category}::${normalizeName(material.name)}::${normalizeUnit(material.unit)}`;
    return starterMaterialKeys.has(key);
  };

  const filteredMaterials = useMemo(() => {
    const byTrade = materials.filter(
      (material) => normalizeCategory(material.category) === activeTrade
    );

    const query = normalizeName(searchQuery);
    if (!query) return byTrade;

    return byTrade.filter((material) => {
      const materialName = normalizeName(material.name);
      const materialUnit = normalizeUnit(material.unit);
      return materialName.includes(query) || materialUnit.includes(query);
    });
  }, [materials, activeTrade, searchQuery]);

  const formCustomerPrice = useMemo(() => {
    const purchasePrice = Math.max(0, parseNumber(formPurchasePrice));
    const markupPercent = Math.max(0, parseNumber(formMarkupPercent));
    return calculateCustomerPrice(purchasePrice, markupPercent);
  }, [formPurchasePrice, formMarkupPercent]);

  const resetForm = () => {
    setFormMode('none');
    setEditId(null);
    setFormName('');
    setFormPurchasePrice('');
    setFormMarkupPercent('');
    setFormUnit('st');
    setFormCategory(activeTrade);
  };

  const openAdd = () => {
    setFormMode('add');
    setEditId(null);
    setFormName('');
    setFormPurchasePrice('');
    setFormMarkupPercent('');
    setFormUnit('st');
    setFormCategory(activeTrade);
  };

  const openEdit = (material: any) => {
    const purchasePrice = getMaterialPurchasePrice(material);
    const markupPercent = getMaterialMarkupPercent(material);

    setFormMode('edit');
    setEditId(material.id);
    setFormName(material.name);
    setFormPurchasePrice(String(purchasePrice));
    setFormMarkupPercent(String(markupPercent));
    setFormUnit(material.unit || 'st');
    setFormCategory(normalizeCategory(material.category));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const duplicate = materials.find((material) => {
        const sameIdentity =
          normalizeCategory(material.category) === formCategory &&
          normalizeName(material.name) === normalizeName(formName) &&
          normalizeUnit(material.unit) === normalizeUnit(formUnit);

        if (!sameIdentity) return false;
        if (formMode === 'edit' && editId && material.id === editId) return false;
        return true;
      });

      if (duplicate) {
        throw new Error('Ett material med samma namn, kategori och enhet finns redan.');
      }

      const purchasePrice = Math.max(0, parseNumber(formPurchasePrice));
      const markupPercent = Math.max(0, parseNumber(formMarkupPercent));
      const unitPrice = calculateCustomerPrice(purchasePrice, markupPercent);

      const payload = {
        name: formName,
        purchase_price: purchasePrice,
        markup_percent: markupPercent,
        unit_price: unitPrice,
        unit: formUnit,
        category: formCategory,
        is_deleted: false,
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
    onError: (error: any) => {
      toast.error(error?.message || 'Kunde inte spara material');
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async ({ id }: { id: string; isStarter: boolean }) => {
      const { error } = await supabase
        .from('materials')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id] });
      toast.success(
        variables.isStarter ? 'Standardmaterial borttaget' : 'Material borttaget'
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Kunde inte ta bort material');
    },
  });

  const confirmDelete = (material: { id: string; isStarter: boolean }) => {
    if (editId === material.id) {
      resetForm();
    }

    deleteMaterial.mutate({ id: material.id, isStarter: material.isStarter });
  };

  const handleDelete = (material: any) => {
    const starter = isStarterMaterial(material);

    if (starter) {
      setConfirmDeleteMaterial({
        id: material.id,
        isStarter: true,
        name: material.name,
      });
      return;
    }

    confirmDelete({ id: material.id, isStarter: false });
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);

  const renderMaterialFormFields = () => (
    <>
      <div>
        <Label>Materialnamn *</Label>
        <Input
          value={formName}
          onChange={(event) => setFormName(event.target.value)}
          placeholder="t.ex. Kabel 3x2.5mm"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Inköpspris (kr)</Label>
          <Input
            type="number"
            min="0"
            value={formPurchasePrice}
            onChange={(event) => setFormPurchasePrice(event.target.value)}
            placeholder="0"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Påslag (%)</Label>
          <Input
            type="number"
            min="0"
            value={formMarkupPercent}
            onChange={(event) => setFormMarkupPercent(event.target.value)}
            placeholder="0"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Pris mot kund (kr)</Label>
          <Input
            value={formCustomerPrice.toFixed(2)}
            readOnly
            className="mt-1 bg-muted/40"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Enhet</Label>
          <Input
            value={formUnit}
            onChange={(event) => setFormUnit(event.target.value)}
            placeholder="st / m / kg"
            className="mt-1"
          />
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
      </div>
    </>
  );

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {tradeOrder.map((trade) => {
            const Icon = tradeIcons[trade];
            const selected = activeTrade === trade;
            const tradeCardThemeClass =
              trade === 'build'
                ? 'border-l-[#8B4513] bg-[#fdf6ee]'
                : trade === 'electric'
                  ? 'border-l-[#f0c000] bg-[#fffde7]'
                  : trade === 'vvs'
                    ? 'border-l-[#1565c0] bg-[#e8f0fe]'
                    : 'border-l-[#757575] bg-[#f5f5f5]';

            return (
              <button
                key={trade}
                type="button"
                onClick={() => setActiveTrade(trade)}
                className={`trade-card-interactive h-[220px] w-[200px] rounded-[12px] border-l-[4px] p-5 text-left ${tradeCardThemeClass} ${selected ? 'ring-2 ring-primary/25' : ''}`}
              >
                <div className="flex h-full flex-col justify-center text-stone-800">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-stone-700" />
                    <span className="text-[20px] font-semibold leading-tight">{categoryLabels[trade]}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-700">{categorySubtitles[trade]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -transtone-y-1/2" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={`Sök material i ${categoryLabels[activeTrade].toLowerCase()}...`}
          className="pl-9"
        />
      </div>

      {formMode === 'add' && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="p-4 space-y-3">
            {renderMaterialFormFields()}
            <div className="flex gap-2">
              <Button
                disabled={!formName.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Spara material
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
            {searchQuery.trim() ? 'Inga material matchar din sökning.' : 'Inga material hittades i vald bransch.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMaterials.map((material) => {
            const isEditing = formMode === 'edit' && editId === material.id;
            const normalizedCategory = normalizeCategory(material.category);
            const purchasePrice = getMaterialPurchasePrice(material);
            const markupPercent = getMaterialMarkupPercent(material);
            const materialRowThemeClass =
              normalizedCategory === 'build'
                ? 'material-row-theme-build'
                : normalizedCategory === 'electric'
                  ? 'material-row-theme-electric'
                  : normalizedCategory === 'vvs'
                    ? 'material-row-theme-vvs'
                    : 'material-row-theme-general';
            const materialRowClassName = `${materialRowThemeClass}${isEditing ? ' ring-2 ring-primary' : ''}`;

            return (
              <Card key={material.id} className={materialRowClassName}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(material)}>
                      <p className="font-semibold text-sm truncate">{material.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Kundpris {formatPrice(material.unit_price)} / {material.unit || 'st'} · Inköp {formatPrice(purchasePrice)} · Påslag {formatPercent(markupPercent)}% · {categoryLabels[normalizedCategory]}
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
                      onClick={() => handleDelete(material)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {isEditing && (
                    <div className="border-t pt-4 space-y-3 animate-fade-in">
                      {renderMaterialFormFields()}
                      <div className="flex gap-2">
                        <Button
                          disabled={!formName.trim() || saveMutation.isPending}
                          onClick={() => saveMutation.mutate()}
                          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          Spara ändringar
                        </Button>
                        <Button variant="outline" onClick={resetForm}>
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!confirmDeleteMaterial}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteMaterial(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Standardmaterialet "{confirmDeleteMaterial?.name}" tas bort från listan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDeleteMaterial) return;
                confirmDelete({
                  id: confirmDeleteMaterial.id,
                  isStarter: confirmDeleteMaterial.isStarter,
                });
                setConfirmDeleteMaterial(null);
              }}
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}





























