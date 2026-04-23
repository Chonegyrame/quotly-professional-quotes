import { useState } from 'react';
import { Inbox as InboxIcon, Flame, Snowflake, Clock, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { useIncomingRequests } from '@/hooks/useIncomingRequests';
import { IncomingRequestCard } from '@/components/IncomingRequestCard';

type Filter = 'alla' | 'Hett' | 'Ljummet' | 'Kallt' | 'obesvarade';

const filterCards: { id: Filter; label: string; icon: React.ElementType }[] = [
  { id: 'alla', label: 'Alla', icon: Layers },
  { id: 'Hett', label: 'Hett', icon: Flame },
  { id: 'Ljummet', label: 'Ljummet', icon: InboxIcon },
  { id: 'Kallt', label: 'Kallt', icon: Snowflake },
  { id: 'obesvarade', label: 'Obesvarade', icon: Clock },
];

export default function Inbox() {
  const { requests, isLoading, dismissRequest } = useIncomingRequests();
  const [activeFilter, setActiveFilter] = useState<Filter>('alla');

  const counts: Record<Filter, number> = {
    alla: requests.filter((r) => r.status !== 'dismissed').length,
    Hett: requests.filter((r) => r.ai_tier === 'Hett' && r.status !== 'dismissed').length,
    Ljummet: requests.filter((r) => r.ai_tier === 'Ljummet' && r.status !== 'dismissed').length,
    Kallt: requests.filter((r) => r.ai_tier === 'Kallt' && r.status !== 'dismissed').length,
    obesvarade: requests.filter((r) => r.status === 'new').length,
  };

  const filtered = requests.filter((r) => {
    if (r.status === 'dismissed') return false;
    if (activeFilter === 'alla') return true;
    if (activeFilter === 'obesvarade') return r.status === 'new';
    return r.ai_tier === activeFilter;
  });

  function handleDismiss(id: string) {
    dismissRequest.mutate(
      { requestId: id },
      { onSuccess: () => toast.success('Markerad som hanterad') },
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">Förfrågningar</h1>
        <p className="text-sm text-muted-foreground">Inkomna förfrågningar poängsatta av AI</p>
      </div>

      {/* Filter cards — mirrors Dashboard stat grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {filterCards.map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.id;
          return (
            <button key={f.id} type="button" onClick={() => setActiveFilter(f.id)} className="text-left">
              <Card className={isActive ? 'border-primary ring-1 ring-primary/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                  </div>
                  <div className="text-2xl font-heading font-bold">{counts[f.id]}</div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Laddar förfrågningar...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {activeFilter === 'alla'
              ? 'Inga förfrågningar ännu. Dela din publika länk för att börja ta emot leads.'
              : 'Inga förfrågningar matchar detta filter.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <IncomingRequestCard key={r.id} request={r} onDismiss={handleDismiss} />
          ))}
        </div>
      )}
    </div>
  );
}
