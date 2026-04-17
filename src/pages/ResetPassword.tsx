import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Lösenorden matchar inte');
      return;
    }

    if (password.length < 6) {
      toast.error('Lösenordet måste vara minst 6 tecken');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Lösenord uppdaterat!');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte uppdatera lösenord');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="auth-grid absolute inset-0" aria-hidden />
      <div className="auth-orb auth-orb-one" aria-hidden />
      <div className="auth-orb auth-orb-two" aria-hidden />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
        <Card className="w-full border-white/45 bg-white/95 shadow-2xl shadow-stone-950/35 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Nytt lösenord</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ange ditt nya lösenord nedan.
            </p>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-sm text-muted-foreground text-center">
                Verifierar återställningslänk...
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Nytt lösenord</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="mt-1"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Bekräfta lösenord</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    className="mt-1"
                    required
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {submitting ? 'Uppdaterar...' : 'Uppdatera lösenord'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
