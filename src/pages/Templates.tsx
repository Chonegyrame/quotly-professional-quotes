import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Hammer,
  Zap,
  Wrench,
  Trash2,
  Pencil,
  Package,
  Shapes,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaterialRowEditor } from '@/components/quote-builder/MaterialRowEditor';
import { MaterialRow } from '@/components/quote-builder/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useMaterials } from '@/hooks/useMaterials';
import { toast } from 'sonner';

type TemplateCategory = 'build' | 'electric' | 'vvs' | 'general';

const categoryIcons: Record<TemplateCategory, typeof Hammer> = {
  build: Hammer,
  electric: Zap,
  vvs: Wrench,
  general: Shapes,
};

const categoryLabels: Record<TemplateCategory, string> = {
  build: 'Bygg',
  electric: 'El',
  vvs: 'VVS',
  general: 'Övrigt',
};

const categoryOrder: TemplateCategory[] = ['build', 'electric', 'vvs', 'general'];

const emptyMaterial = (): MaterialRow => ({
  id: Date.now().toString() + Math.random(),
  name: '',
  quantity: 1,
  unitPrice: 0,
  purchasePrice: 0,
  markupPercent: 0,
  unit: 'st',
});

function normalizeTemplateCategory(value: string | null | undefined): TemplateCategory {
  if (!value) return 'general';

  const normalized = value.toLowerCase();

  if (normalized === 'build' || normalized === 'electric' || normalized === 'vvs' || normalized === 'general') {
    return normalized;
  }

  if (normalized === 'electrical') return 'electric';
  if (normalized === 'plumbing') return 'vvs';
  if (normalized === 'carpentry') return 'build';

  return 'general';
}

function normalizeMaterialCategory(value: string | null | undefined): TemplateCategory {
  return normalizeTemplateCategory(value);
}

export default function Templates() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const { materials: availableMaterials } = useMaterials();

  const [formMode, setFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<TemplateCategory>('build');
  const [formDesc, setFormDesc] = useState('');
  const [formMaterials, setFormMaterials] = useState<MaterialRow[]>([]);

  const filteredMaterials = useMemo(() => {
    if (formCategory === 'general') {
      return availableMaterials;
    }

    return availableMaterials.filter(
      (material) => normalizeMaterialCategory(material.category) === formCategory
    );
  }, [availableMaterials, formCategory]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
  });

  const resetForm = () => {
    setFormMode('none');
    setEditId(null);
    setFormName('');
    setFormCategory('build');
    setFormDesc('');
    setFormMaterials([]);
  };

  const openAdd = () => {
    resetForm();
    setFormMode('add');
    setFormCategory('build');
  };

  const openEdit = (template: any) => {
    setFormMode('edit');
    setEditId(template.id);
    setFormName(template.name);
    setFormCategory(normalizeTemplateCategory(template.category));
    setFormDesc(template.description || '');

    const items = Array.isArray(template.default_items) ? template.default_items : [];

    const materials =
      items.length > 0 && Array.isArray(items[0]?.materials)
        ? items[0].materials.map((material: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            materialId: material.material_id || undefined,
            name: material.name || '',
            quantity: material.quantity || 1,
            unitPrice: material.unit_price || 0,
            purchasePrice: material.purchase_price ?? material.unit_price ?? 0,
            markupPercent: material.markup_percent || 0,
            unit: material.unit || 'st',
          }))
        : [];

    setFormMaterials(materials);
  };

  const buildDefaultItems = () => {
    const materials = formMaterials.filter((material) => material.name.trim());

    return [
      {
        description: formName,
        labor_price: 0,
        materials: materials.map((material) => ({
          material_id: material.materialId || null,
          name: material.name,
          quantity: material.quantity,
          unit_price: material.unitPrice,
          purchase_price: material.purchasePrice,
          markup_percent: material.markupPercent,
          unit: material.unit,
        })),
      },
    ];
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName,
        category: formCategory,
        description: formDesc,
        default_items: buildDefaultItems(),
      };

      if (formMode === 'edit' && editId) {
        const { error } = await supabase.from('quote_templates').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('quote_templates').insert({
          ...payload,
          company_id: company!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(formMode === 'edit' ? 'Mall uppdaterad' : 'Mall skapad');
      resetForm();
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quote_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Mall borttagen');
    },
  });

  const addMaterialRow = () => setFormMaterials([...formMaterials, emptyMaterial()]);

  const updateMaterialRow = (id: string, updated: MaterialRow) => {
    setFormMaterials(formMaterials.map((material) => (material.id === id ? updated : material)));
  };

  const removeMaterialRow = (id: string) => {
    setFormMaterials(formMaterials.filter((material) => material.id !== id));
  };

  const getTemplateMaterialCount = (template: any) => {
    const items = Array.isArray(template.default_items) ? template.default_items : [];

    if (items.length > 0 && Array.isArray(items[0]?.materials)) {
      return items[0].materials.filter((material: any) => material.name).length;
    }

    return 0;
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold flex-1">Mallar</h1>
        <Button
          size="sm"
          className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4" /> Lägg till
        </Button>
      </div>

      {formMode !== 'none' && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Mallnamn *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="t.ex. Badrumsrenovering"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Kategori</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {categoryOrder.map((categoryKey) => (
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
            <div>
              <Label>Beskrivning</Label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Kort beskrivning..."
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Standardmaterial
              </Label>
              {formMaterials.length > 0 && (
                <div className="space-y-2 mb-2">
                  {formMaterials.map((material) => (
                    <MaterialRowEditor
                      key={material.id}
                      material={material}
                      availableMaterials={filteredMaterials}
                      onChange={(updated) => updateMaterialRow(material.id, updated)}
                      onRemove={() => removeMaterialRow(material.id)}
                    />
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={addMaterialRow}
              >
                <Plus className="h-3.5 w-3.5" /> Lägg till material
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                disabled={!formName.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {formMode === 'edit' ? 'Spara ändringar' : 'Spara mall'}
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
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Inga mallar än. Lägg till din första!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(templates as any[]).map((template) => {
            const normalizedCategory = normalizeTemplateCategory(template.category);
            const Icon = categoryIcons[normalizedCategory] || Shapes;
            const isEditing = formMode === 'edit' && editId === template.id;
            const materialCount = getTemplateMaterialCount(template);

            return (
              <Card key={template.id} className={isEditing ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(template)}>
                    <p className="font-semibold text-sm truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabels[normalizedCategory]}
                      {template.description ? ` · ${template.description}` : ''}
                      {materialCount > 0 ? ` · ${materialCount} material${materialCount > 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => openEdit(template)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => deleteTemplate.mutate(template.id)}
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


