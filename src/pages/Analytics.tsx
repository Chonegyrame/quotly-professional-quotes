import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, BarChart3, Target, DollarSign, Percent, Package, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuotes } from '@/hooks/useQuotes';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type DateFilter = 'month' | 'threeMonths' | 'year' | 'all';

const DATE_FILTERS: Array<{ key: DateFilter; label: string }> = [
  { key: 'month', label: 'Den här månaden' },
  { key: 'threeMonths', label: 'Senaste 3 månaderna' },
  { key: 'year', label: 'I år' },
  { key: 'all', label: 'Allt' },
];

const STATUS_COLORS: Record<string, string> = {
  accepted: 'hsl(var(--success))',
  declined: '#ef4444',
  draft: 'hsl(var(--accent))',
  sent: 'hsl(213, 53%, 24%)',
  opened: 'hsl(213, 53%, 24%)',
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status.toLowerCase()] || 'hsl(213, 53%, 24%)';
}

function formatSEK(n: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(n);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export default function Analytics() {
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

  const kpis = useMemo(() => {
    if (!quotes.length) return null;

    const sourceQuotes = filteredQuotes;
    const accepted = sourceQuotes.filter((q) => q.status === 'accepted');
    const sent = sourceQuotes.filter((q) => ['sent', 'opened', 'accepted', 'declined'].includes(q.status));
    const conversionRate = sent.length > 0 ? (accepted.length / sent.length) * 100 : 0;

    const totalRevenue = accepted.reduce((sum, q) => {
      const items = q.quote_items || [];
      return sum + items.reduce((s: number, i: any) => s + i.quantity * i.unit_price * (1 + i.vat_rate / 100), 0);
    }, 0);

    const avgQuoteValue = sourceQuotes.length > 0
      ? sourceQuotes.reduce((sum, q) => {
          const items = q.quote_items || [];
          return sum + items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
        }, 0) / sourceQuotes.length
      : 0;

    const pending = sourceQuotes.filter((q) => ['sent', 'opened'].includes(q.status));
    const pipelineValue = pending.reduce((sum, q) => {
      const items = q.quote_items || [];
      return sum + items.reduce((s: number, i: any) => s + i.quantity * i.unit_price * (1 + i.vat_rate / 100), 0);
    }, 0);

    const statusCounts = sourceQuotes.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const toMonthlyPoint = (monthDate: Date, showYear: boolean) => {
      const key = monthKey(monthDate);
      const monthQuotes = sourceQuotes.filter((q) => q.created_at?.startsWith(key));
      const monthAccepted = monthQuotes.filter((q) => q.status === 'accepted');
      const rev = monthAccepted.reduce((s, q) => {
        const items = q.quote_items || [];
        return s + items.reduce((ss: number, i: any) => ss + i.quantity * i.unit_price * (1 + i.vat_rate / 100), 0);
      }, 0);

      const label = monthDate.toLocaleDateString('sv-SE', showYear ? { month: 'short', year: '2-digit' } : { month: 'short' });
      return { month: label, sent: monthQuotes.length, accepted: monthAccepted.length, revenue: rev };
    };

    let monthlyData: { month: string; sent: number; accepted: number; revenue: number }[] = [];

    if (dateFilter === 'all') {
      const uniqueKeys = Array.from(
        new Set(
          sourceQuotes
            .map((q) => {
              const d = q.created_at ? new Date(q.created_at) : null;
              return d && !Number.isNaN(d.getTime()) ? monthKey(d) : null;
            })
            .filter((v): v is string => Boolean(v))
        )
      ).sort();

      monthlyData = uniqueKeys.map((key) => {
        const [year, month] = key.split('-').map(Number);
        return toMonthlyPoint(new Date(year, month - 1, 1), true);
      });
    } else {
      const now = new Date();
      const months: Date[] = [];

      if (dateFilter === 'month') {
        months.push(new Date(now.getFullYear(), now.getMonth(), 1));
      } else if (dateFilter === 'threeMonths') {
        for (let i = 2; i >= 0; i--) {
          months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
        }
      } else if (dateFilter === 'year') {
        for (let month = 0; month <= now.getMonth(); month++) {
          months.push(new Date(now.getFullYear(), month, 1));
        }
      }

      monthlyData = months.map((monthDate) => toMonthlyPoint(monthDate, false));
    }

    return {
      conversionRate,
      totalRevenue,
      avgQuoteValue,
      pipelineValue,
      statusData,
      monthlyData,
      totalQuotes: sourceQuotes.length,
      acceptedCount: accepted.length,
    };
  }, [quotes, filteredQuotes, dateFilter]);

  const aiStats = useMemo(() => {
    // Only AI quotes that have been sent (counts are populated on send
    // by recompute-user-profile; null means either manual or unsent AI).
    const aiSentQuotes = filteredQuotes.filter(
      (q: any) => q.ai_materials_added !== null && q.ai_materials_added !== undefined,
    );

    if (aiSentQuotes.length === 0) return null;

    const added = aiSentQuotes.map((q: any) => q.ai_materials_added ?? 0);
    const removed = aiSentQuotes.map((q: any) => q.ai_materials_removed ?? 0);
    const total = aiSentQuotes.map(
      (q: any) => (q.ai_materials_added ?? 0) + (q.ai_materials_removed ?? 0),
    );

    const buckets = [0, 0, 0, 0, 0, 0];
    for (const t of total) {
      buckets[Math.min(t, 5)]++;
    }
    const histogram = buckets.map((count, i) => ({
      bucket: i === 5 ? '5+' : String(i),
      count,
    }));

    return {
      n: aiSentQuotes.length,
      medianAdded: median(added),
      medianRemoved: median(removed),
      medianTotal: median(total),
      histogram,
    };
  }, [filteredQuotes]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading analytics...</div>;
  }

  if (!kpis) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-heading font-bold">Analytics</h1>
        </div>
        <Card><CardContent className="p-8 text-center text-muted-foreground">No data yet. Create some quotes first!</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-heading font-bold">Business Analytics</h1>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <div className="text-xl font-heading font-bold">{formatSEK(kpis.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Conversion</span>
            </div>
            <div className="text-xl font-heading font-bold">{kpis.conversionRate.toFixed(0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg. Quote</span>
            </div>
            <div className="text-xl font-heading font-bold">{formatSEK(kpis.avgQuoteValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Pipeline</span>
            </div>
            <div className="text-xl font-heading font-bold">{formatSEK(kpis.pipelineValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Monthly Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sent" name="Sent" fill="hsl(213, 53%, 24%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="accepted" name="Accepted" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => navigate('/analytics/material')}
        className="mb-6 w-full text-left"
      >
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Materialanalys</p>
                <p className="text-sm text-muted-foreground">Se marginaler, topplista och kostnadsutveckling</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
          </CardContent>
        </Card>
      </button>

      {aiStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI-offertkvalitet
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                n={aiStats.n} skickade AI-offerter
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg border bg-card/50 p-3 text-center">
                <div className="text-2xl font-heading font-bold">{aiStats.medianAdded}</div>
                <div className="text-xs text-muted-foreground mt-1">Median tillagda</div>
              </div>
              <div className="rounded-lg border bg-card/50 p-3 text-center">
                <div className="text-2xl font-heading font-bold">{aiStats.medianRemoved}</div>
                <div className="text-xs text-muted-foreground mt-1">Median borttagna</div>
              </div>
              <div className="rounded-lg border bg-card/50 p-3 text-center">
                <div className="text-2xl font-heading font-bold">{aiStats.medianTotal}</div>
                <div className="text-xs text-muted-foreground mt-1">Median totalt</div>
              </div>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiStats.histogram}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Offerter" fill="hsl(213, 53%, 24%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Antal material tillagda eller borttagna mellan AI-förslag och skickad offert.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Quote Status Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kpis.statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={70}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {kpis.statusData.map((entry) => (
                    <Cell key={entry.name} fill={getStatusColor(String(entry.name))} />
                  ))}
                </Pie>
                <text x="50%" y="48%" textAnchor="middle" className="fill-foreground text-[24px] font-bold">
                  {kpis.totalQuotes}
                </text>
                <text x="50%" y="62%" textAnchor="middle" className="fill-muted-foreground text-[12px]">
                  Totalt
                </text>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}





