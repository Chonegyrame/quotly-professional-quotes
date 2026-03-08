import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Wrench, Zap, Droplets, Paintbrush, Hammer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

const categoryIcons: Record<string, any> = {
  electrical: Zap,
  plumbing: Droplets,
  painting: Paintbrush,
  carpentry: Hammer,
  general: Wrench,
};

const categoryLabels: Record<string, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  painting: 'Painting',
  carpentry: 'Carpentry',
  general: 'General',
};

export default function Templates() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newDesc, setNewDesc] = useState('');

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

  const addTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('quote_templates').insert({
        company_id: company!.id,
        name: newName,
        category: newCategory,
        description: newDesc,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowAdd(false);
      setNewName('');
      setNewDesc('');
      toast.success('Template added');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quote_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template removed');
    },
  });

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-heading font-bold flex-1">Quote Templates</h1>
        <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Template Name *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Bathroom Rewire" className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setNewCategory(key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${newCategory === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description..." className="mt-1" />
            </div>
            <Button disabled={!newName.trim() || addTemplate.isPending} onClick={() => addTemplate.mutate()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Save Template
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : templates.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No templates yet. Add your first one!</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {templates.map((t: any) => {
            const Icon = categoryIcons[t.category] || Wrench;
            return (
              <Card key={t.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabels[t.category] || t.category}{t.description ? ` · ${t.description}` : ''}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteTemplate.mutate(t.id)}>
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
