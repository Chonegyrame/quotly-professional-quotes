import { cn } from '@/lib/utils';
import { Check, Send, Eye, ThumbsUp, ThumbsDown, Clock, PenLine, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/data/mockData';

const eventConfig: Record<string, { icon: typeof Check; label: string; color: string }> = {
  created: { icon: Clock, label: 'Offert skapad', color: 'text-muted-foreground bg-muted' },
  sent: { icon: Send, label: 'Offert skickad till kund', color: 'text-info bg-info/10' },
  opened: { icon: Eye, label: 'Kunden öppnade offerten', color: 'text-warning bg-warning/10' },
  accepted: { icon: ThumbsUp, label: 'Kunden accepterade offerten', color: 'text-success bg-success/10' },
  declined: { icon: ThumbsDown, label: 'Kunden nekade offerten', color: 'text-destructive bg-destructive/10' },
  reminder_due: { icon: Clock, label: 'Påminnelse för uppföljning', color: 'text-warning bg-warning/10' },
  edited: { icon: PenLine, label: 'Offert redigerad', color: 'text-muted-foreground bg-muted' },
  revised: { icon: RefreshCw, label: 'Offert reviderad - väntar kundens godkännande', color: 'text-warning bg-warning/10' },
};

interface TimelineEventProps {
  eventType: string;
  createdAt: string;
  isLast?: boolean;
}

export function TimelineEvent({ eventType, createdAt, isLast }: TimelineEventProps) {
  const config = eventConfig[eventType] || eventConfig.created;
  const Icon = config.icon;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border my-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium">{config.label}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(createdAt)}</p>
      </div>
    </div>
  );
}
