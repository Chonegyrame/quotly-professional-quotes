import { type QuoteStatus } from '@/data/mockData';
import { cn } from '@/lib/utils';

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: 'Utkast', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Skickad', className: 'bg-info/10 text-info' },
  opened: { label: 'Öppnad', className: 'bg-warning/10 text-warning' },
  accepted: { label: 'Accepterad', className: 'bg-success/10 text-success' },
  declined: { label: 'Nekad', className: 'bg-destructive/10 text-destructive' },
  expired: { label: 'Utgången', className: 'bg-muted text-muted-foreground' },
  revised: { label: 'Reviderad - väntar godkännande', className: 'bg-warning/10 text-warning' },
};

export function StatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', config.className, className)}>
      {config.label}
    </span>
  );
}
