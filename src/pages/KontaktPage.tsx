import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Footer } from '@/components/Footer';

export default function KontaktPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Wire up real email send once a Quotly business email is configured.
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="bg-stone-100/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-stone-600 transition-colors hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till startsidan
          </Link>

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
            >
              <h1 className="font-heading text-3xl font-bold text-stone-900 sm:text-4xl lg:text-5xl">
                Vi finns här när du behöver oss.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-stone-600">
                Frågor om Quotly, hjälp att komma igång eller bara nyfiken på vad
                vi kan göra för din firma? Skriv några rader så hör vi av oss inom kort.
              </p>

              <div className="mt-8 flex items-center gap-3 text-sm text-stone-700">
                <Mail className="h-4 w-4 text-stone-500" />
                <a
                  href="mailto:quotly.se@gmail.com"
                  className="transition-colors hover:text-orange-700"
                >
                  quotly.se@gmail.com
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.4, 0, 1] }}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-lg sm:p-8"
            >
              {submitted ? (
                <div className="py-12 text-center">
                  <h2 className="font-heading text-2xl font-bold text-stone-900">
                    Tack!
                  </h2>
                  <p className="mt-3 text-stone-600">
                    Vi har tagit emot ditt meddelande och hör av oss inom kort.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="font-heading text-xl font-bold text-stone-900">
                    Fyll i formuläret så hör vi av oss inom kort.
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="kontakt-namn">Namn</Label>
                      <Input
                        id="kontakt-namn"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kontakt-epost">E-post</Label>
                      <Input
                        id="kontakt-epost"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kontakt-foretag">Företagets namn</Label>
                      <Input
                        id="kontakt-foretag"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kontakt-telefon">Telefonnummer</Label>
                      <Input
                        id="kontakt-telefon"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="kontakt-meddelande">Meddelande</Label>
                    <textarea
                      id="kontakt-meddelande"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2 bg-accent text-white hover:bg-accent/90"
                  >
                    Skicka
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
