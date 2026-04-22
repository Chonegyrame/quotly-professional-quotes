import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PENDING_INVITE_KEY = 'quotly.pending_invite_token';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState<
    'idle' | 'accepting' | 'accepted' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // If the user isn't signed in yet, remember the token and send them to /auth.
  useEffect(() => {
    if (authLoading) return;
    if (!user && token) {
      sessionStorage.setItem(PENDING_INVITE_KEY, token);
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, token, navigate]);

  const handleAccept = async () => {
    if (!token) return;
    setState('accepting');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke(
        'accept-team-invite',
        { body: { token } },
      );
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error ?? 'Okänt fel');
      }

      sessionStorage.removeItem(PENDING_INVITE_KEY);
      // Fresh company/membership data — the user just joined.
      await queryClient.invalidateQueries({ queryKey: ['company'] });
      setState('accepted');
      toast.success('Du är nu medlem!');
      // Give the user a beat to see the success state, then send them home.
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Kunde inte acceptera inbjudan';
      setErrorMessage(message);
      setState('error');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Inbjudan till team</CardTitle>
          <CardDescription>
            Du är på väg att gå med i ett företag på Quotly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground">
                Bekräfta nedan för att acceptera inbjudan. Du får åtkomst till
                företagets offerter, material och inställningar utifrån den roll
                du fått.
              </p>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleAccept}
              >
                Acceptera inbjudan
              </Button>
            </>
          )}

          {state === 'accepting' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Accepterar inbjudan…
            </div>
          )}

          {state === 'accepted' && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Välkommen! Omdirigerar dig till dashboarden…
            </div>
          )}

          {state === 'error' && (
            <>
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/', { replace: true })}
              >
                Tillbaka
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { PENDING_INVITE_KEY };
