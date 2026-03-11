import { useMemo, useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { MaterialRowEditor } from './MaterialRowEditor';
import { LineItem, MaterialRow } from './types';
import { formatCurrency } from '@/data/mockData';

type MaterialTrade = 'build' | 'electric' | 'vvs';

interface LineItemEditorProps {
  item: LineItem;
  index: number;
  canRemove: boolean;
  defaultVat: number;
  availableMaterials: {
    id: string;
    name: string;
    unit_price: number;
    purchase_price: number;
    markup_percent: number;
    unit: string;
    category?: string | null;
  }[];
  onUpdate: (updated: LineItem) => void;
  onRemove: () => void;
}

const tradeLabels: Record<MaterialTrade, string> = {
  build: 'Bygg',
  electric: 'El',
  vvs: 'VVS',
};

const normalizeMaterialTrade = (value: string | null | undefined): MaterialTrade | 'general' => {
  if (!value) return 'general';
  const normalized = value.toLowerCase();

  if (normalized === 'build' || normalized === 'electric' || normalized === 'vvs') return normalized;
  if (normalized === 'electrical') return 'electric';
  if (normalized === 'plumbing') return 'vvs';
  if (normalized === 'carpentry') return 'build';

  return 'general';
};

export function LineItemEditor({
  item,
  index,
  canRemove,
  defaultVat,
  availableMaterials,
  onUpdate,
  onRemove,
}: LineItemEditorProps) {
  const [selectedTrade, setSelectedTrade] = useState<MaterialTrade>('build');
  const materialsTotal = item.materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0);
  const itemTotal = item.laborPrice + materialsTotal;

  const filteredMaterials = useMemo(
    () =>
      availableMaterials.filter(
        (material) => normalizeMaterialTrade(material.category) === selectedTrade
      ),
    [availableMaterials, selectedTrade]
  );

  const addMaterial = () => {
    onUpdate({
      ...item,
      materials: [
        ...item.materials,
        {
          id: Date.now().toString(),
          name: '',
          quantity: 1,
          unitPrice: 0,
          purchasePrice: 0,
          markupPercent: 0,
          unit: 'st',
        },
      ],
    });
  };

  const updateMaterial = (id: string, updated: MaterialRow) => {
    onUpdate({ ...item, materials: item.materials.map((m) => (m.id === id ? updated : m)) });
  };

  const removeMaterial = (id: string) => {
    onUpdate({ ...item, materials: item.materials.filter((m) => m.id !== id) });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Arbetsrad {index + 1}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">{formatCurrency(itemTotal)}</span>
            {canRemove && (
              <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label>Arbetsbeskrivning</Label>
          <Input
            placeholder="t.ex. Elinstallation badrum"
            value={item.description}
            onChange={(e) => onUpdate({ ...item, description: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Arbetskostnad (SEK)</Label>
          <Input
            type="number"
            min="0"
            value={item.laborPrice || ''}
            onChange={(e) => onUpdate({ ...item, laborPrice: parseFloat(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Inkludera moms ({defaultVat}%)</Label>
          <Switch checked={item.includeVat} onCheckedChange={(v) => onUpdate({ ...item, includeVat: v })} />
        </div>

        <div className="border-t pt-3">
          <div className="mb-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bransch</Label>
            <div className="flex gap-1.5 mt-1">
              {(Object.keys(tradeLabels) as MaterialTrade[]).map((trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => setSelectedTrade(trade)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTrade === trade
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {tradeLabels[trade]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Material {item.materials.length > 0 && `(${item.materials.length})`}
              </Label>
            </div>
            {item.materials.length > 0 && (
              <span className="text-xs text-muted-foreground">{formatCurrency(materialsTotal)}</span>
            )}
          </div>

          {item.materials.map((mat) => (
            <MaterialRowEditor
              key={mat.id}
              material={mat}
              availableMaterials={filteredMaterials}
              onChange={(updated) => updateMaterial(mat.id, updated)}
              onRemove={() => removeMaterial(mat.id)}
            />
          ))}

          <Button variant="ghost" size="sm" className="w-full gap-1.5 mt-1 text-xs" onClick={addMaterial}>
            <Plus className="h-3.5 w-3.5" /> Lägg till material
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
