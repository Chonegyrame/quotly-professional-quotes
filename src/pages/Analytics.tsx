import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Target, DollarSign, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuotes } from '@/hooks/useQuotes';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(213, 53%, 24%)', 'hsl(0, 84%, 60%)', 'hsl(215, 14%, 45%)'];

function formatSEK(n: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(n);
}

export default function Analytics() {
  const navigate = useNavigate();
  const { quotes, isLoading } = useQuotes();

  const kpis = useMemo(() => {
    if (!quotes.length) return null;

    const accepted = quotes.filter(q => q.status === 'accepted');
    const sent = quotes.filter(q => ['sent', 'opened', 'accepted', 'declined'].includes(q.status));
    const conversionRate = sent.length > 0 ? (accepted.length / sent.length) * 100 : 0;

    const totalRevenue = accepted.reduce((sum, q) => {
      const items = q.quote_items || [];
      return sum + items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price * (1 + i.vat_rate / 100)), 0);
    }, 0);

    const avgQuoteValue = quotes.length > 0
      ? quotes.reduce((sum, q) => {
          const items = q.quote_items || [];
          return sum + items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
        }, 0) / quotes.length
      : 0;

    const pending = quotes.filter(q => ['sent', 'opened'].includes(q.status));
    const pipelineValue = pending.reduce((sum, q) => {
      const items = q.quote_items || [];
      return sum + items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price * (1 + i.vat_rate / 100)), 0);
    }, 0);

    // Status breakdown
    const statusCounts = quotes.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Monthly data (last 6 months)
    const monthlyData: { month: string; sent: number; accepted: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en', { month: 'short' });
      const monthQuotes = quotes.filter(q => q.created_at?.startsWith(key));
      const monthAccepted = monthQuotes.filter(q => q.status === 'accepted');
      const rev = monthAccepted.reduce((s, q) => {
        const items = q.quote_items || [];
        return s + items.reduce((ss: number, i: any) => ss + i.quantity * i.unit_price * (1 + i.vat_rate / 100), 0);
      }, 0);
      monthlyData.push({ month: label, sent: monthQuotes.length, accepted: monthAccepted.length, revenue: rev });
    }

    return { conversionRate, totalRevenue, avgQuoteValue, pipelineValue, statusData, monthlyData, totalQuotes: quotes.length, acceptedCount: accepted.length };
  }, [quotes]);

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

      {/* KPI Cards */}
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

      {/* Monthly chart */}
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

      {/* Status breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Quote Status Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kpis.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {kpis.statusData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
