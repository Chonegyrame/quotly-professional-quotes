import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setSent(true);
      toast.success('Återställningslänk skickad!');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte skicka återställningslänk');
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
            <CardTitle className="text-lg text-foreground">Återställ lösenord</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
            </p>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Mail className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm text-foreground">
                  Kolla din mejl för en återställningslänk. Det kan ta någon minut.
                </p>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Tillbaka till inloggning
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-post</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="du@exempel.se"
                      className="mt-1"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {submitting ? 'Skickar...' : 'Skicka återställningslänk'}
                  </Button>
                </form>
                <Link
                  to="/auth"
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Tillbaka till inloggning
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
