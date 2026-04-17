import { useState, useEffect } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('signup') === 'true') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast.success('Konto skapat! Kolla din mejl för bekräftelse, eller logga in direkt.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Välkommen tillbaka!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Autentisering misslyckades');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Simple header */}
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground">Quotly</span>
        </Link>
      </header>

      {/* Centered auth card */}
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md border-slate-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isSignUp ? 'Skapa konto' : 'Logga in'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Kom igång med Quotly gratis.' : 'Välkommen tillbaka till Quotly.'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <Label htmlFor="name">Fullständigt namn</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Anna Andersson"
                    className="mt-1"
                    required
                  />
                </div>
              )}
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
              <div>
                <Label htmlFor="password">Lösenord</Label>
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
              {!isSignUp && (
                <div className="flex justify-end">
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Glömt lösenord?
                  </Link>
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full gap-2 bg-accent text-white hover:bg-accent/90"
              >
                {submitting ? 'Vänta...' : isSignUp ? 'Skapa konto' : 'Logga in'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {isSignUp ? 'Har du redan ett konto? Logga in' : 'Har du inget konto? Skapa konto'}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
