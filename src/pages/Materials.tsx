import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export default function Materials() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const queryClient = useQueryClient();

  // Shared form state for add & edit
  const [formMode, setFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('st');
  const [formCategory, setFormCategory] = useState('');

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials', company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
  });

  const resetForm = () => {
    setFormMode('none');
    setEditId(null);
    setFormName('');
    setFormPrice('');
    setFormUnit('st');
    setFormCategory('');
  };

  const openAdd = () => {
    resetForm();
    setFormMode('add');
  };

  const openEdit = (m: any) => {
    setFormMode('edit');
    setEditId(m.id);
    setFormName(m.name);
    setFormPrice(String(m.unit_price));
    setFormUnit(m.unit || 'st');
    setFormCategory(m.category || '');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (formMode === 'edit' && editId) {
        const { error } = await supabase.from('materials').update({
          name: formName,
          unit_price: parseFloat(formPrice) || 0,
          unit: formUnit,
          category: formCategory || 'general',
        }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert({
          company_id: company!.id,
          name: formName,
          unit_price: parseFloat(formPrice) || 0,
          unit: formUnit,
          category: formCategory || 'general',
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success(formMode === 'edit' ? 'Material updated' : 'Material added');
      resetForm();
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material removed');
    },
  });

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-heading font-bold flex-1">Materials</h1>
        <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {formMode !== 'none' && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Material Name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Kabel 3x2.5mm" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (SEK)</Label>
                <Input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="st / m / kg" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Input value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="e.g. Cables, Fittings" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button disabled={!formName.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                {formMode === 'edit' ? 'Save Changes' : 'Save Material'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : materials.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No materials yet. Add your commonly used materials here.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {materials.map((m: any) => {
            const isEditing = formMode === 'edit' && editId === m.id;
            return (
              <Card key={m.id} className={isEditing ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(m)}>
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(m.unit_price)} / {m.unit}{m.category !== 'general' ? ` · ${m.category}` : ''}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(m)}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteMaterial.mutate(m.id)}>
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
