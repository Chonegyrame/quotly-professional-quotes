import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  consumeFortnoxOAuthSession,
  useFortnoxConnection,
} from '@/hooks/useFortnoxConnection';

// Landing page Fortnox redirects to after the user clicks "Tillåt".
// Reads ?code= and ?state= from the URL, verifies state matches the nonce
// we stored in sessionStorage when the connect button was clicked, then
// hands the code to fortnox-oauth-callback to swap for tokens. Redirects
// back to /settings on success or shows an error inline on failure.
export default function FortnoxCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuth } = useFortnoxConnection();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Guard against React StrictMode double-invoke in dev. Each `code` is
  // single-use; if completeOAuth fires twice the second call gets a
  // 400 from Fortnox.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const code = params.get('code');
    const stateParam = params.get('state');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(`Fortnox avbröt anslutningen: ${errorParam}`);
      return;
    }
    if (!code || !stateParam) {
      setError('Saknar code eller state från Fortnox.');
      return;
    }

    const session = consumeFortnoxOAuthSession();
    if (!session) {
      setError(
        'Kunde inte hitta ursprungliga anslutningsdata. Försök igen från Inställningar.',
      );
      return;
    }
    if (session.state !== stateParam) {
      setError('State-värdet matchar inte. Avbröt av säkerhetsskäl.');
      return;
    }

    completeOAuth.mutate(
      { code, redirect_uri: session.redirect_uri },
      {
        onSuccess: () => {
          setDone(true);
          toast.success('Fortnox är anslutet.');
          setTimeout(() => navigate('/settings', { replace: true }), 1200);
        },
        onError: (err) => setError((err as Error).message),
      },
    );
  }, [params, completeOAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-4" />
            <h1 className="font-heading text-xl font-bold mb-2">
              Anslutningen misslyckades
            </h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/settings')}>
              Tillbaka till Inställningar
            </Button>
          </>
        ) : done ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-4" />
            <h1 className="font-heading text-xl font-bold mb-2">
              Fortnox är anslutet
            </h1>
            <p className="text-sm text-muted-foreground">
              Skickar dig tillbaka till Inställningar…
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground mb-4" />
            <h1 className="font-heading text-xl font-bold mb-2">
              Slutför anslutningen…
            </h1>
            <p className="text-sm text-muted-foreground">
              Vi byter koden mot säkra tokens hos Fortnox.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
