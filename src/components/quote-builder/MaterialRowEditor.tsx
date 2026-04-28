import { useMemo, useState } from 'react';
import { Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaterialRow } from './types';
import { formatCurrency } from '@/data/mockData';

interface MaterialRowEditorProps {
  material: MaterialRow;
  availableMaterials: {
    id: string;
    name: string;
    unit_price: number;
    purchase_price: number;
    markup_percent: number;
    unit: string;
  }[];
  onChange: (updated: MaterialRow) => void;
  onRemove: () => void;
}

const toNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateCustomerPrice = (purchasePrice: number, markupPercent: number) =>
  purchasePrice * (1 + markupPercent / 100);

const calculateMarkupPercent = (purchasePrice: number, unitPrice: number) => {
  if (purchasePrice <= 0) return 0;
  // Round to 1 decimal so back-calculated markups don't render as 14.285714285.
  return Math.round(((unitPrice / purchasePrice) - 1) * 1000) / 10;
};

export function MaterialRowEditor({
  material,
  availableMaterials,
  onChange,
  onRemove,
}: MaterialRowEditorProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const sortedMaterials = useMemo(
    () => [...availableMaterials].sort((a, b) => a.name.localeCompare(b.name, 'sv')),
    [availableMaterials]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const startsWithMatches = sortedMaterials.filter((materialOption) =>
    materialOption.name.toLowerCase().startsWith(normalizedSearch)
  );

  const matches = normalizedSearch.length > 0 ? startsWithMatches : sortedMaterials;

  const pickMaterial = (materialOption: {
    id: string;
    name: string;
    unit_price: number;
    purchase_price: number;
    markup_percent: number;
    unit: string;
  }) => {
    onChange({
      ...material,
      materialId: materialOption.id,
      name: materialOption.name,
      unitPrice: materialOption.unit_price,
      purchasePrice: materialOption.purchase_price ?? materialOption.unit_price,
      markupPercent: materialOption.markup_percent ?? 0,
      unit: materialOption.unit,
    });
    setSearch(materialOption.name);
    setShowSearch(false);
  };

  // Purchase price changes auto-fill customer price ONLY when markup is > 0.
  // This way "only inköp filled" leaves kundpris at 0, which the save validator
  // catches with a "Pris ej angett" toast.
  const updatePurchasePrice = (value: string) => {
    const purchasePrice = toNumber(value);
    const markupPercent = material.markupPercent || 0;

    onChange({
      ...material,
      purchasePrice,
      unitPrice: markupPercent > 0
        ? calculateCustomerPrice(purchasePrice, markupPercent)
        : material.unitPrice,
    });
  };

  // Markup changes always recalc kundpris (user is explicitly engaging with pricing).
  // Including markup = 0 (selling at cost) which sets kundpris = inköp.
  const updateMarkupPercent = (value: string) => {
    const markupPercent = toNumber(value);
    const purchasePrice = material.purchasePrice || 0;

    onChange({
      ...material,
      markupPercent,
      unitPrice: purchasePrice > 0
        ? calculateCustomerPrice(purchasePrice, markupPercent)
        : material.unitPrice,
    });
  };

  // Customer price changes back-calc markup if inköp is set.
  // If inköp is empty, just store kundpris and leave markup untouched.
  const updateUnitPrice = (value: string) => {
    const unitPrice = toNumber(value);
    const purchasePrice = material.purchasePrice || 0;

    onChange({
      ...material,
      unitPrice,
      markupPercent: purchasePrice > 0
        ? calculateMarkupPercent(purchasePrice, unitPrice)
        : material.markupPercent,
    });
  };

  return (
    <div className="flex items-start gap-2 py-2 pl-4 border-l-2 border-primary/20">
      <Package className="h-4 w-4 text-muted-foreground mt-2.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="relative">
          <Input
            placeholder="Materialnamn (skriv eller sök)"
            value={material.name}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ ...material, name: value, materialId: undefined });
              setSearch(value);
              setShowSearch(true);
            }}
            onFocus={() => {
              setSearch(material.name || '');
              setShowSearch(true);
            }}
            onBlur={() => setTimeout(() => setShowSearch(false), 120)}
            className="text-sm h-9"
          />

          {showSearch && (
            <div className="absolute z-10 top-full left-0 right-0 bg-popover border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto">
              {matches.length > 0 ? (
                matches.slice(0, 20).map((materialOption) => (
                  <button
                    key={materialOption.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 flex items-center justify-between"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pickMaterial(materialOption);
                    }}
                  >
                    <span className="truncate pr-2">{materialOption.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {formatCurrency(materialOption.unit_price)}/{materialOption.unit}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">Inga matchande material</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input
            type="number"
            min="1"
            value={material.quantity === 0 ? '' : material.quantity}
            onChange={(event) =>
              onChange({
                ...material,
                quantity: event.target.value === '' ? 0 : parseFloat(event.target.value),
              })
            }
            className="text-sm h-8"
            placeholder="Antal"
          />

          <div className="relative">
            <Input
              type="number"
              min="0"
              value={material.purchasePrice || ''}
              onChange={(event) => updatePurchasePrice(event.target.value)}
              className="text-sm h-8 pr-8"
              placeholder="Inköpspris"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
              kr
            </span>
          </div>

          <div className="relative">
            <Input
              type="number"
              min="0"
              value={material.markupPercent || ''}
              onChange={(event) => updateMarkupPercent(event.target.value)}
              className="text-sm h-8 pr-7"
              placeholder="Påslag"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
              %
            </span>
          </div>

          <div className="relative">
            <Input
              type="number"
              min="0"
              value={material.unitPrice || ''}
              onChange={(event) => updateUnitPrice(event.target.value)}
              className="text-sm h-8 pr-8"
              placeholder="Kundpris"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
              kr
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-1">
          <span className="text-[11px] text-muted-foreground">Antal</span>
          <span className="text-[11px] text-muted-foreground">Inköpspris</span>
          <span className="text-[11px] text-muted-foreground">Påslag</span>
          <span className="text-[11px] text-muted-foreground">Kundpris</span>
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
  );
}
