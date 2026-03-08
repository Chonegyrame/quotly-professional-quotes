import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MaterialRow } from './types';
import { formatCurrency } from '@/data/mockData';

interface MaterialRowEditorProps {
  material: MaterialRow;
  availableMaterials: { id: string; name: string; unit_price: number; unit: string }[];
  onChange: (updated: MaterialRow) => void;
  onRemove: () => void;
}

export function MaterialRowEditor({ material, availableMaterials, onChange, onRemove }: MaterialRowEditorProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = availableMaterials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const pickMaterial = (m: { id: string; name: string; unit_price: number; unit: string }) => {
    onChange({ ...material, materialId: m.id, name: m.name, unitPrice: m.unit_price, unit: m.unit });
    setShowSearch(false);
    setSearch('');
  };

  return (
    <div className="flex items-start gap-2 py-2 pl-4 border-l-2 border-primary/20">
      <Package className="h-4 w-4 text-muted-foreground mt-2.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="relative">
          <Input
            placeholder="Material name (type or search)"
            value={material.name}
            onChange={e => {
              onChange({ ...material, name: e.target.value, materialId: undefined });
              setSearch(e.target.value);
              setShowSearch(e.target.value.length > 0 && availableMaterials.length > 0);
            }}
            onFocus={() => {
              if (material.name && availableMaterials.length > 0) {
                setSearch(material.name);
                setShowSearch(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            className="text-sm h-9"
          />
          {showSearch && filtered.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 bg-popover border rounded-md shadow-md mt-1 max-h-32 overflow-y-auto">
              {filtered.slice(0, 5).map(m => (
                <button
                  key={m.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 flex justify-between"
                  onMouseDown={() => pickMaterial(m)}
                >
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(m.unit_price)}/{m.unit}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Input
              type="number"
              min="1"
              value={material.quantity === 0 ? '' : material.quantity}
              onChange={e => onChange({ ...material, quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              className="text-sm h-8"
              placeholder="Qty"
            />
          </div>
          <div>
            <Input
              type="number"
              min="0"
              value={material.unitPrice || ''}
              onChange={e => onChange({ ...material, unitPrice: parseFloat(e.target.value) || 0 })}
              className="text-sm h-8"
              placeholder="Price"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {formatCurrency(material.quantity * material.unitPrice)}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
