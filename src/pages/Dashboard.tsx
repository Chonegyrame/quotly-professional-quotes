import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuoteCard } from '@/components/QuoteCard';
import { mockQuotes, type QuoteStatus, getQuoteTotal, formatCurrency } from '@/data/mockData';

const filters: { label: string; value: QuoteStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Opened', value: 'opened' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
  { label: 'Expired', value: 'expired' },
];

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<QuoteStatus | 'all'>('all');

  const stats = useMemo(() => {
    const total = mockQuotes.length;
    const accepted = mockQuotes.filter(q => q.status === 'accepted').length;
    const pending = mockQuotes.filter(q => ['sent', 'opened'].includes(q.status)).length;
    const declined = mockQuotes.filter(q => q.status === 'declined').length;
    const totalValue = mockQuotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + getQuoteTotal(q.items), 0);
    return { total, accepted, pending, declined, totalValue };
  }, []);

  const filteredQuotes = useMemo(() => {
    if (activeFilter === 'all') return mockQuotes;
    return mockQuotes.filter(q => q.status === activeFilter);
  }, [activeFilter]);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your quotes</p>
        </div>
        <Link to="/quotes/new" className="md:hidden">
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            New Quote
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Quotes</span>
            </div>
            <div className="text-2xl font-heading font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Accepted</span>
            </div>
            <div className="text-2xl font-heading font-bold">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <div className="text-2xl font-heading font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Declined</span>
            </div>
            <div className="text-2xl font-heading font-bold">{stats.declined}</div>
          </CardContent>
        </Card>
      </div>

      {/* Accepted value */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <span className="text-xs text-muted-foreground">Total Accepted Value</span>
          <div className="text-3xl font-heading font-bold text-success">{formatCurrency(stats.totalValue)}</div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Quote list */}
      <div className="space-y-2">
        {filteredQuotes.map(quote => (
          <QuoteCard key={quote.id} quote={quote} />
        ))}
      </div>
    </div>
  );
}
