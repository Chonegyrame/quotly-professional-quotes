import { Link } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { type Quote, getQuoteTotal, formatCurrency, formatDate, isReminderDue } from '@/data/mockData';

export function QuoteCard({ quote }: { quote: Quote }) {
  const total = getQuoteTotal(quote.items);
  const reminderDue = isReminderDue(quote);

  return (
    <Link to={`/quotes/${quote.id}`}>
      <Card className="flex items-center gap-3 p-4 hover:shadow-md transition-shadow active:bg-secondary/50 cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{quote.customerName}</span>
            {reminderDue && <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
          </div>
          <div className="text-xs text-muted-foreground">
            <span>{formatDate(quote.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="font-semibold text-sm">{formatCurrency(total)}</div>
            <StatusBadge status={quote.status} className="mt-1" />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
