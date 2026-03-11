import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuotes } from '@/hooks/useQuotes';

type DateFilter = 'month' | 'threeMonths' | 'year' | 'all';

const DATE_FILTERS: Array<{ key: DateFilter; label: string }> = [
  { key: 'month', label: 'Den här månaden' },
  { key: 'threeMonths', label: 'Senaste 3 månaderna' },
  { key: 'year', label: 'I år' },
  { key: 'all', label: 'Allt' },
];

function formatSEK(n: number) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
  }).format(n);
}

type MaterialAggregate = {
  name: string;
  totalQty: number;
  totalCost: number;
  totalCustomer: number;
  avgPurchasePrice: number;
  avgCustomerPrice: number;
  marginPercent: number;
  marginAmount: number;
};

export default function MaterialAnalytics() {
  const navigate = useNavigate();
  const { quotes, isLoading } = useQuotes();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  const filteredQuotes = useMemo(() => {
    if (!quotes.length) return [];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThreeMonths = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return quotes.filter((q) => {
      const createdAt = q.created_at ? new Date(q.created_at) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return false;

      if (dateFilter === 'month') return createdAt >= startOfMonth;
      if (dateFilter === 'threeMonths') return createdAt >= startOfThreeMonths;
      if (dateFilter === 'year') return createdAt >= startOfYear;
      return true;
    });
  }, [quotes, dateFilter]);

  const metrics = useMemo(() => {
    const materialMap = new Map<string, { name: string; totalQty: number; totalCost: number; totalCustomer: number }>();

    filteredQuotes.forEach((quote: any) => {
      (quote.quote_items || []).forEach((item: any) => {
        (item.quote_item_materials || []).forEach((material: any) => {
          const name = (material.name || 'Okänt material').trim() || 'Okänt material';
          const quantity = Number(material.quantity) || 0;
          const customerUnitPrice = Number(material.unit_price) || 0;
          const purchaseUnitPrice =
            typeof material.purchase_price === 'number' ? material.purchase_price : customerUnitPrice;

          const customerTotal = quantity * customerUnitPrice;
          const costTotal = quantity * purchaseUnitPrice;

          if (!materialMap.has(name)) {
            materialMap.set(name, { name, totalQty: 0, totalCost: 0, totalCustomer: 0 });
          }

          const current = materialMap.get(name)!;
          current.totalQty += quantity;
          current.totalCost += costTotal;
          current.totalCustomer += customerTotal;
        });
      });
    });

    const materials: MaterialAggregate[] = Array.from(materialMap.values()).map((m) => {
      const marginAmount = m.totalCustomer - m.totalCost;
      const marginPercent = m.totalCustomer > 0 ? (marginAmount / m.totalCustomer) * 100 : 0;
      const avgPurchasePrice = m.totalQty > 0 ? m.totalCost / m.totalQty : 0;
      const avgCustomerPrice = m.totalQty > 0 ? m.totalCustomer / m.totalQty : 0;

      return {
        name: m.name,
        totalQty: m.totalQty,
        totalCost: m.totalCost,
        totalCustomer: m.totalCustomer,
        avgPurchasePrice,
        avgCustomerPrice,
        marginPercent,
        marginAmount,
      };
    });

    materials.sort((a, b) => b.marginAmount - a.marginAmount);

    const totalCustomer = materials.reduce((sum, m) => sum + m.totalCustomer, 0);
    const totalCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
    const grossMarginAmount = totalCustomer - totalCost;
    const grossMarginPercent = totalCustomer > 0 ? (grossMarginAmount / totalCustomer) * 100 : 0;

    return {
      grossMarginAmount,
      grossMarginPercent,
      topMaterials: materials.slice(0, 5),
    };
  }, [filteredQuotes]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Laddar materialanalys...</div>;
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/analytics')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold">Materialanalys</h1>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {DATE_FILTERS.map((filter) => (
          <Button
            key={filter.key}
            size="sm"
            variant={dateFilter === filter.key ? 'default' : 'outline'}
            onClick={() => setDateFilter(filter.key)}
            className={dateFilter === filter.key ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Genomsnittlig bruttomarginal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-heading font-bold">{metrics.grossMarginPercent.toFixed(1)}%</div>
          <p className="text-sm text-muted-foreground mt-1">{formatSEK(metrics.grossMarginAmount)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Topp 5 mest lönsamma material
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen materialdata för valt datumintervall.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Materialnamn</th>
                    <th className="py-2 pr-3 font-medium">Inköpspris</th>
                    <th className="py-2 pr-3 font-medium">Pris till kund</th>
                    <th className="py-2 font-medium">Marginal %</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topMaterials.map((material) => (
                    <tr key={material.name} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{material.name}</td>
                      <td className="py-2 pr-3">{formatSEK(material.avgPurchasePrice)}</td>
                      <td className="py-2 pr-3">{formatSEK(material.avgCustomerPrice)}</td>
                      <td className={`py-2 ${material.marginPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {material.marginPercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
