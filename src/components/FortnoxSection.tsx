import { useState } from 'react';
import { Loader2, Plug, PlugZap, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  buildFortnoxConnectUrl,
  useFortnoxConnection,
} from '@/hooks/useFortnoxConnection';
import { useAuth } from '@/hooks/useAuth';

// Surfaces Fortnox connection state in Settings. Two visual states:
//   - Disconnected: explains the integration + "Anslut Fortnox" button.
//   - Connected   : shows when it was connected and a "Koppla bort" action.
// Connection details are fetched via the fortnox-status edge function (no
// tokens hit the browser).
export function FortnoxSection() {
  const { user } = useAuth();
  const { status, isLoading, disconnect } = useFortnoxConnection();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConnect() {
    if (!user?.id) {
      toast.error('Du måste vara inloggad för att ansluta Fortnox.');
      return;
    }
    try {
      const url = buildFortnoxConnectUrl(user.id);
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function handleDisconnect() {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        toast.success('Fortnox-anslutningen är borttagen.');
        setConfirmOpen(false);
      },
      onError: (err) => toast.error((err as Error).message),
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Hämtar Fortnox-status…
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected === true;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {isConnected ? (
              <PlugZap className="h-5 w-5 text-success" />
            ) : (
              <Plug className="h-5 w-5 text-muted-foreground" />
            )}
            Fortnox
          </CardTitle>
          {isConnected && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              Ansluten
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Skicka accepterade offerter direkt som utkastfaktura i Fortnox. Du
          kan koppla bort när som helst, vi rör inga tidigare fakturor.
        </p>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Anslöt{' '}
              <span className="font-medium text-foreground">
                {format(new Date(status.connected_at), 'd MMMM yyyy, HH:mm', {
                  locale: sv,
                })}
              </span>
              .
            </div>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kopplar bort…
                </>
              ) : (
                'Koppla bort Fortnox'
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Anslut Fortnox
          </Button>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Koppla bort Fortnox?</AlertDialogTitle>
            <AlertDialogDescription>
              Quotly kommer inte längre kunna skicka fakturor till Fortnox.
              Tidigare skickade fakturor påverkas inte. Du kan ansluta igen
              när du vill.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>
              Koppla bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
