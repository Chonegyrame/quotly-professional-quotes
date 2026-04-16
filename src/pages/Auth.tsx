import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, FileText, ShieldCheck } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const heroHighlights = [
  { icon: CheckCircle2, title: 'Strukturerade offerter', text: 'Håll ordning på arbete och material i varje jobb.' },
  { icon: Clock3, title: 'Snabbare återkoppling', text: 'Gå från förfrågan till skickad offert på några minuter.' },
  { icon: ShieldCheck, title: 'Proffsig leverans', text: 'Tydlig prissättning och professionell kundkommunikation.' },
];

const previewRows = [
  { name: 'Arbete - Elinstallation', value: '4 500 kr' },
  { name: 'Material - Kabel och uttag', value: '2 150 kr' },
  { name: 'Resa och etablering', value: '650 kr' },
];

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="auth-landing relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="auth-grid absolute inset-0" aria-hidden />
      <div className="auth-orb auth-orb-one" aria-hidden />
      <div className="auth-orb auth-orb-two" aria-hidden />
      <div className="auth-orb auth-orb-three" aria-hidden />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] items-center px-4 py-8 sm:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr_0.7fr]">
          <section className="hidden lg:block animate-fade-in">
            <div className="inline-flex rounded-2xl border border-white/25 bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="font-heading text-5xl font-bold leading-none text-white">Quotly</p>
            </div>
            <p className="mt-3 text-lg font-medium text-slate-200/90">Smidighet för hantverkare</p>

            <h1 className="mt-6 max-w-xl font-heading text-3xl font-bold leading-tight text-white xl:text-4xl">
              Offerter som ser lika professionella ut som ditt arbete.
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-200/90">
              Skapa tydliga och trygga offerter med klar prissättning på arbete och material som kunder snabbt kan godkänna.
            </p>

            <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-3 max-w-3xl">
              {heroHighlights.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-accent" />
                  <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs text-slate-200/80">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-lg rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Exempel på offert</p>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-medium text-emerald-100">
                  Utkast
                </span>
              </div>
              <div className="space-y-2.5 text-sm">
                {previewRows.map((row) => (
                  <div key={row.name} className="flex items-center justify-between text-slate-100">
                    <span className="text-slate-200/85">{row.name}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-white/20 pt-3 text-sm">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>Totalt</span>
                  <span>7 300 kr</span>
                </div>
              </div>
            </div>
          </section>

          <section className="animate-fade-in lg:justify-self-center lg:w-full lg:max-w-[520px]">
            <div className="mb-5 text-center lg:hidden">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h1 className="mt-3 font-heading text-3xl font-bold text-white">Quotly</h1>
              <p className="mt-1 text-sm text-slate-200">Professionella offerter på minuter.</p>
            </div>

            <Card className="border-white/45 bg-white/95 shadow-2xl shadow-slate-950/35 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-3 hidden items-center gap-2 lg:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                    <FileText className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-heading text-xl font-bold text-foreground">Quotly</p>
                    <p className="text-xs text-muted-foreground">Din offertyta</p>
                  </div>
                </div>
                <CardTitle className="text-lg text-foreground">
                  {isSignUp ? 'Skapa konto' : 'Logga in'}
                </CardTitle>
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
                    className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
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
          </section>

          <section className="hidden lg:flex animate-fade-in items-center justify-center">
            <DotLottieReact
              src="/login-bild.lottie"
              loop
              autoplay
              backgroundColor="transparent"
              className="auth-lottie-canvas h-[420px] w-[320px]"
            />
          </section>
        </div>
      </div>
    </div>
  );
}

