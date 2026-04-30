import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Target,
  DollarSign,
  Percent,
  Package,
  ArrowRight,
  Sparkles,
  Clock,
  AlertCircle,
  Wallet,
  Users,
  Layers,
} from 'lucide-react';
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

// 30 % of labor cost, capped at 50 000 kr per person per year (2026 rules).
const ROT_RATE_PERCENT = 30;
const ROT_CAP_SEK = 50_000;

const TRADE_LABEL: Record<string, string> = {
  bygg: 'Bygg',
  el: 'El',
  vvs: 'VVS',
  general: 'Övrigt',
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

// Heuristic: an item counts as labor (ROT-eligible) when its description
// references arbete/arbetstid. Matches the form-template convention
// ("Arbete · 28 h"). A future migration can replace this with an explicit
// is_labor flag on quote_items.
function isLaborItem(description: string | null | undefined): boolean {
  if (!description) return false;
  return description.toLowerCase().includes('arbet');
}

function quoteLaborExVat(items: any[]): number {
  return items
    .filter((i) => isLaborItem(i.description))
    .reduce((s, i) => s + i.quantity * i.unit_price, 0);
}

function quoteTotalIncVat(items: any[]): number {
  return items.reduce((s, i) => s + i.quantity * i.unit_price * (1 + i.vat_rate / 100), 0);
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function hoursBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  const diff = (tb - ta) / 3_600_000;
  return diff > 0 ? diff : null;
}

function tradeLabel(trade: string | null | undefined): string {
  if (!trade) return 'Övrigt';
  return TRADE_LABEL[trade] || trade;
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

  // Win rate per trade (decided = accepted + declined; ignores draft/sent/opened
  // so a hot pipeline doesn't deflate the percentage).
  const winRateByTrade = useMemo(() => {
    const tradeKeys = ['bygg', 'el', 'vvs', 'general'];
    const rows = tradeKeys
      .map((trade) => {
        const tradeQuotes = filteredQuotes.filter((q: any) => (q.trade || 'general') === trade);
        const decided = tradeQuotes.filter((q) => ['accepted', 'declined'].includes(q.status));
        const won = decided.filter((q) => q.status === 'accepted');
        return {
          trade,
          label: tradeLabel(trade),
          total: tradeQuotes.length,
          decided: decided.length,
          won: won.length,
          winRate: decided.length > 0 ? (won.length / decided.length) * 100 : null,
        };
      })
      .filter((r) => r.total > 0);
    const totalDecided = rows.reduce((s, r) => s + r.decided, 0);
    const totalWon = rows.reduce((s, r) => s + r.won, 0);
    return {
      rows,
      overallWinRate: totalDecided > 0 ? (totalWon / totalDecided) * 100 : null,
      totalDecided,
      totalWon,
    };
  }, [filteredQuotes]);

  // Time-from-sent-to-accepted on accepted quotes only.
  const responseTime = useMemo(() => {
    const acceptedQuotes = filteredQuotes.filter(
      (q: any) => q.status === 'accepted' && q.sent_at && q.accepted_at,
    );
    const hours = acceptedQuotes
      .map((q: any) => hoursBetween(q.sent_at, q.accepted_at))
      .filter((v): v is number => v !== null);

    const buckets = [
      { label: '< 2 h', min: 0, max: 2, count: 0 },
      { label: '2–24 h', min: 2, max: 24, count: 0 },
      { label: '1–3 dagar', min: 24, max: 72, count: 0 },
      { label: '3–7 dagar', min: 72, max: 168, count: 0 },
      { label: '> 7 dagar', min: 168, max: Number.POSITIVE_INFINITY, count: 0 },
    ];
    for (const h of hours) {
      const b = buckets.find((bucket) => h >= bucket.min && h < bucket.max);
      if (b) b.count++;
    }

    return {
      n: hours.length,
      medianHours: median(hours),
      histogram: buckets.map((b) => ({ bucket: b.label, count: b.count })),
    };
  }, [filteredQuotes]);

  // Offertstock — outstanding quotes (sent / opened) by age. Always full data
  // (not date-filtered) since aging is meaningful regardless of filter.
  const offertstock = useMemo(() => {
    const pending = quotes.filter(
      (q: any) => ['sent', 'opened'].includes(q.status) && q.sent_at,
    );
    const buckets = [
      { key: 'fresh', label: 'Färska', subtitle: '0–7 dagar', min: 0, max: 7, items: [] as any[] },
      { key: 'cooling', label: 'Svalnar', subtitle: '8–30 dagar', min: 8, max: 30, items: [] as any[] },
      { key: 'old', label: 'Gamla', subtitle: '31–60 dagar', min: 31, max: 60, items: [] as any[] },
      { key: 'dead', label: 'Döda', subtitle: '60+ dagar', min: 61, max: Number.POSITIVE_INFINITY, items: [] as any[] },
    ];
    for (const q of pending) {
      const days = daysSince(q.sent_at);
      const b = buckets.find((bucket) => days >= bucket.min && days <= bucket.max);
      if (b) b.items.push(q);
    }
    return buckets.map((b) => ({
      key: b.key,
      label: b.label,
      subtitle: b.subtitle,
      count: b.items.length,
      value: b.items.reduce((s, q: any) => s + quoteTotalIncVat(q.quote_items || []), 0),
    }));
  }, [quotes]);

  // ROT-attributable revenue share (in the active date filter).
  const rotMetrics = useMemo(() => {
    const accepted = filteredQuotes.filter((q) => q.status === 'accepted');
    let total = 0;
    let labor = 0;
    for (const q of accepted) {
      const items = q.quote_items || [];
      total += quoteTotalIncVat(items);
      labor += quoteLaborExVat(items);
    }
    const rotDeduction = labor * (ROT_RATE_PERCENT / 100);
    const rotShare = total > 0 ? (labor / total) * 100 : 0;
    return { total, labor, rotDeduction, rotShare, n: accepted.length };
  }, [filteredQuotes]);

  // Per-customer ROT consumption — always year-to-date regardless of filter
  // (the cap is annual). Aggregates by email when available, name otherwise.
  const rotByCustomer = useMemo(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
    const accepted = quotes.filter((q: any) => {
      if (q.status !== 'accepted' || !q.accepted_at) return false;
      const t = new Date(q.accepted_at).getTime();
      return !Number.isNaN(t) && t >= startOfYear;
    });

    const byKey = new Map<string, { name: string; email: string; rotUsed: number; jobs: number }>();
    for (const q of accepted) {
      const key = ((q as any).customer_email || q.customer_name || '').toLowerCase().trim();
      if (!key) continue;
      const labor = quoteLaborExVat(q.quote_items || []);
      const rot = labor * (ROT_RATE_PERCENT / 100);
      const existing = byKey.get(key);
      if (existing) {
        existing.rotUsed += rot;
        existing.jobs += 1;
      } else {
        byKey.set(key, {
          name: q.customer_name,
          email: (q as any).customer_email || '',
          rotUsed: rot,
          jobs: 1,
        });
      }
    }

    return Array.from(byKey.values())
      .filter((c) => c.rotUsed > 0)
      .sort((a, b) => b.rotUsed - a.rotUsed)
      .slice(0, 8);
  }, [quotes]);

  // Gross margin per trade — uses quote_item_materials.purchase_price as
  // the cost basis, and sum of items as the realized revenue (ex VAT).
  const marginByTrade = useMemo(() => {
    const tradeKeys = ['bygg', 'el', 'vvs', 'general'];
    return tradeKeys
      .map((trade) => {
        const accepted = filteredQuotes.filter(
          (q: any) => q.status === 'accepted' && (q.trade || 'general') === trade,
        );
        let revenue = 0;
        let cost = 0;
        for (const q of accepted) {
          const items = q.quote_items || [];
          for (const item of items) {
            revenue += item.quantity * item.unit_price;
            const mats = (item as any).quote_item_materials || [];
            for (const m of mats) {
              cost += (m.purchase_price || 0) * (m.quantity || 0);
            }
          }
        }
        const gross = revenue - cost;
        const grossPct = revenue > 0 ? (gross / revenue) * 100 : 0;
        return {
          trade,
          label: tradeLabel(trade),
          revenue,
          cost,
          gross,
          grossPct,
          n: accepted.length,
        };
      })
      .filter((r) => r.n > 0);
  }, [filteredQuotes]);

  const aiStats = useMemo(() => {
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

  const offertstockTotals = offertstock.reduce(
    (acc, b) => ({ count: acc.count + b.count, value: acc.value + b.value }),
    { count: 0, value: 0 },
  );

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

      {/* Offertvinstgrad per yrke */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Offertvinstgrad per yrke
            {winRateByTrade.overallWinRate !== null && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                Totalt: {winRateByTrade.overallWinRate.toFixed(0)}% · {winRateByTrade.totalWon}/{winRateByTrade.totalDecided} avgjorda
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {winRateByTrade.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga avgjorda offerter i perioden ännu.</p>
          ) : (
            <div className="space-y-3">
              {winRateByTrade.rows.map((row) => (
                <div key={row.trade}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{row.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.winRate !== null
                        ? `${row.winRate.toFixed(0)}% · ${row.won}/${row.decided} avgjorda`
                        : `${row.total} ej avgjorda`}
                      {row.winRate !== null && row.total - row.decided > 0 && (
                        <span className="ml-2 text-muted-foreground/70">
                          (+{row.total - row.decided} väntar svar)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full bg-accent transition-[width] duration-500"
                      style={{ width: `${row.winRate ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Andel accepterade av avgjorda offerter (accepterade + avböjda).
            Utkast och sända offerter räknas inte med förrän kunden svarat.
          </p>
        </CardContent>
      </Card>

      {/* Svarstid → vinstchans */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Svarstid till accepterad offert
            <span className="ml-auto text-xs font-normal text-muted-foreground">n={responseTime.n}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {responseTime.n === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga accepterade offerter i perioden ännu.
            </p>
          ) : (
            <>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="font-heading text-2xl font-bold">
                  {responseTime.medianHours < 24
                    ? `${responseTime.medianHours.toFixed(1)} h`
                    : `${(responseTime.medianHours / 24).toFixed(1)} dagar`}
                </span>
                <span className="text-xs text-muted-foreground">median från skickad till accepterad</span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseTime.histogram}>
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Offerter" fill="hsl(213, 53%, 24%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Hur snabbt kunden accepterar efter att offerten skickats. Snabba svar är vanligen heta jobb,
                långa svarstider tyder på tveksamhet eller jämförelse med konkurrenter.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Offertstock — aged outstanding quotes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-accent" />
            Offertstock
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {offertstockTotals.count} aktiva · {formatSEK(offertstockTotals.value)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offertstockTotals.count === 0 ? (
            <p className="text-sm text-muted-foreground">Inga obesvarade offerter just nu.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {offertstock.map((b) => (
                <Link
                  key={b.key}
                  to={`/?filter=sent&age=${b.key}`}
                  className={`block rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    b.key === 'old' || b.key === 'dead'
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border bg-card/50'
                  } ${b.count === 0 ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {b.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80">{b.subtitle}</div>
                  <div className="mt-2 font-heading text-2xl font-bold">{b.count}</div>
                  <div className="text-xs text-muted-foreground">{formatSEK(b.value)}</div>
                </Link>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Sända offerter som inte är besvarade. Offerter äldre än 30 dagar är värda en följ-upp,
            över 60 dagar ofta värt att stänga som avböjda för att hålla statistiken ren.
          </p>
        </CardContent>
      </Card>

      {/* ROT-andel av intäkten */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-accent" />
            ROT-andel av intäkten
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {rotMetrics.n} accepterade i perioden
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rotMetrics.n === 0 ? (
            <p className="text-sm text-muted-foreground">Inga accepterade offerter i perioden ännu.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-card/50 p-3">
                  <div className="text-xs text-muted-foreground">Total intäkt</div>
                  <div className="mt-1 font-heading text-xl font-bold">{formatSEK(rotMetrics.total)}</div>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <div className="text-xs text-muted-foreground">Varav arbete (ROT-grund)</div>
                  <div className="mt-1 font-heading text-xl font-bold">{formatSEK(rotMetrics.labor)}</div>
                  <div className="text-xs text-muted-foreground">{rotMetrics.rotShare.toFixed(0)}% av intäkten</div>
                </div>
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <div className="text-xs text-muted-foreground">Beräknat ROT-avdrag (30%)</div>
                  <div className="mt-1 font-heading text-xl font-bold text-accent">
                    {formatSEK(rotMetrics.rotDeduction)}
                  </div>
                </div>
              </div>
              {rotMetrics.rotShare > 60 && (
                <p className="mt-3 text-xs text-amber-700">
                  ⚠ Hög ROT-andel ({rotMetrics.rotShare.toFixed(0)}%). Om ROT-reglerna ändras igen
                  påverkar det en stor del av intäkten — företagskunder och BRF kan vara värt att
                  prospektera som hedge.
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Arbete identifieras via offertraderna. ROT-avdraget beräknas på 30% av arbetskostnad
                (2026 års regel) och visas exklusive moms.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Per-customer ROT-utrymme */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            ROT-utrymme per kund (i år)
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {rotByCustomer.length} kund{rotByCustomer.length === 1 ? '' : 'er'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rotByCustomer.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga ROT-grundande arbeten registrerade i år ännu.
            </p>
          ) : (
            <div className="space-y-3">
              {rotByCustomer.map((c) => {
                const used = Math.min(c.rotUsed, ROT_CAP_SEK);
                const usedPct = (used / ROT_CAP_SEK) * 100;
                const remaining = Math.max(0, ROT_CAP_SEK - c.rotUsed);
                const overCap = c.rotUsed > ROT_CAP_SEK;
                return (
                  <div key={c.email || c.name}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {c.jobs} jobb
                        </span>
                      </div>
                      <span className="text-xs">
                        <span className="font-semibold">{formatSEK(c.rotUsed)}</span>
                        <span className="text-muted-foreground">
                          {' / '}
                          {formatSEK(ROT_CAP_SEK)}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full transition-[width] duration-500 ${overCap ? 'bg-destructive' : 'bg-accent'}`}
                        style={{ width: `${Math.min(100, usedPct)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {overCap ? (
                        <span className="text-destructive">Över kapet med {formatSEK(c.rotUsed - ROT_CAP_SEK)}</span>
                      ) : (
                        <>Kvar i år: {formatSEK(remaining)}</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Varje privatperson har 50 000 kr ROT-tak per år. Listan visar hur mycket av kapet som
            har använts hos dig — Skatteverkets totala uppgift kan vara högre om kunden anlitat fler firmor.
          </p>
        </CardContent>
      </Card>

      {/* Bruttomarginal per yrke */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" />
            Bruttomarginal per yrke
          </CardTitle>
        </CardHeader>
        <CardContent>
          {marginByTrade.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga accepterade offerter med materialdata i perioden ännu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Yrke</th>
                    <th className="pb-2 pr-3 text-right font-medium">Intäkt</th>
                    <th className="pb-2 pr-3 text-right font-medium">Materialkostnad</th>
                    <th className="pb-2 pr-3 text-right font-medium">Bruttoresultat</th>
                    <th className="pb-2 text-right font-medium">Marginal</th>
                  </tr>
                </thead>
                <tbody>
                  {marginByTrade.map((row) => (
                    <tr key={row.trade} className="border-b last:border-b-0">
                      <td className="py-2.5 pr-3 font-medium">
                        {row.label}
                        <span className="ml-1.5 text-xs text-muted-foreground">({row.n})</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right">{formatSEK(row.revenue)}</td>
                      <td className="py-2.5 pr-3 text-right text-muted-foreground">{formatSEK(row.cost)}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold">{formatSEK(row.gross)}</td>
                      <td className="py-2.5 text-right">
                        <span className={row.grossPct >= 35 ? 'text-success' : row.grossPct >= 20 ? 'text-foreground' : 'text-destructive'}>
                          {row.grossPct.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Intäkt och materialkostnad visas exklusive moms. Bruttoresultat = intäkt − materialkostnad.
            Arbetskostnad räknas inte som kostnad eftersom det är din egen tid.
          </p>
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
