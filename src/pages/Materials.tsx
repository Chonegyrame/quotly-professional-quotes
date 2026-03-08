import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Trash2 } from 'lucide-react';
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
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('st');
  const [category, setCategory] = useState('');

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

  const addMaterial = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('materials').insert({
        company_id: company!.id,
        name,
        unit_price: parseFloat(unitPrice) || 0,
        unit,
        category: category || 'general',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowAdd(false);
      setName('');
      setUnitPrice('');
      toast.success('Material added');
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
        <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Material Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kabel 3x2.5mm" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (SEK)</Label>
                <Input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="st / m / kg" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Cables, Fittings" className="mt-1" />
            </div>
            <Button disabled={!name.trim() || addMaterial.isPending} onClick={() => addMaterial.mutate()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Save Material
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : materials.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No materials yet. Add your commonly used materials here.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {materials.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(m.unit_price)} / {m.unit}{m.category !== 'general' ? ` · ${m.category}` : ''}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteMaterial.mutate(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
