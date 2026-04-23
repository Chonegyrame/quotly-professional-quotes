import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  FormFieldRenderer,
  FormField,
  FieldValue,
} from '@/components/FormFieldRenderer';

interface Firm {
  id: string;
  name: string;
  logo_url: string | null;
  form_slug: string;
  primary_trade: string;
  secondary_trades: string[];
  base_lat: number | null;
  base_lng: number | null;
  service_radius_km: number | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  sub_type: string;
  trade: string;
  form_schema: { fields: FormField[] };
  red_flag_rules: unknown;
}

type Stage =
  | 'loading'
  | 'not_found'
  | 'intro'
  | 'classifying'
  | 'form'
  | 'submitting'
  | 'done';

const PHOTO_BUCKET = 'incoming-request-photos';

// Geocode a free-text address via Nominatim. Best-effort — if it fails we
// still submit without coords; scoring falls back to AI geo-reasoning.
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = address.trim();
  if (!q) return null;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'se');
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const hits = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!hits.length) return null;
    return { lat: parseFloat(hits[0].lat), lng: parseFloat(hits[0].lon) };
  } catch {
    return null;
  }
}

export default function IncomingRequestForm() {
  const { firmSlug = '' } = useParams<{ firmSlug: string }>();

  const [stage, setStage] = useState<Stage>('loading');
  const [firm, setFirm] = useState<Firm | null>(null);
  const [freeText, setFreeText] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, FieldValue>>({});

  const [submitter, setSubmitter] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Resolve firm by slug
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_company_by_slug', {
        slug: firmSlug,
      });
      if (cancelled) return;
      if (error || !data || (data as Firm[]).length === 0) {
        setStage('not_found');
        return;
      }
      setFirm((data as Firm[])[0]);
      setStage('intro');
    })();
    return () => {
      cancelled = true;
    };
  }, [firmSlug]);

  const handleClassify = async () => {
    if (!freeText.trim() || !firm) return;
    setStage('classifying');
    try {
      const { data, error } = await supabase.functions.invoke(
        'classify-intake-request',
        {
          body: { firmSlug: firm.form_slug, freeText },
        },
      );
      if (error) throw new Error(error.message);
      if (!data?.template) throw new Error('Ingen mall returnerades');
      setTemplate(data.template as Template);
      // Seed default values from schema shape
      const defaults: Record<string, FieldValue> = {};
      for (const f of (data.template.form_schema?.fields ?? []) as FormField[]) {
        if (f.type === 'multi_select') defaults[f.id] = [];
        else if (f.type === 'file_upload') defaults[f.id] = [];
        else defaults[f.id] = '';
      }
      setValues(defaults);
      setStage('form');
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte klassificera förfrågan');
      setStage('intro');
    }
  };

  const handleFieldChange = (id: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const missingRequired = useMemo(() => {
    if (!template) return [];
    const missing: string[] = [];
    for (const f of template.form_schema.fields) {
      if (!f.required) continue;
      const v = values[f.id];
      if (v == null || v === '') missing.push(f.label);
      else if (Array.isArray(v) && v.length === 0) missing.push(f.label);
    }
    if (!submitter.name.trim()) missing.push('Namn');
    if (!submitter.email.trim() && !submitter.phone.trim())
      missing.push('E-post eller telefon');
    return missing;
  }, [template, values, submitter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firm || !template) return;
    if (missingRequired.length) {
      toast.error(`Fyll i: ${missingRequired.join(', ')}`);
      return;
    }
    setStage('submitting');

    try {
      // 1. Upload any File[] fields to storage; replace with URL[]
      const answersForSubmit: Record<string, unknown> = {};
      const photoUrls: string[] = [];

      for (const field of template.form_schema.fields) {
        const v = values[field.id];
        if (field.type === 'file_upload') {
          const files = Array.isArray(v) && v[0] instanceof File ? (v as File[]) : [];
          const urls: string[] = [];
          for (const file of files) {
            // Request a one-time signed upload URL from the server.
            // Server validates firm slug + content type and rate-limits
            // per IP. Customer's browser never writes to storage directly.
            const { data: signed, error: signErr } = await supabase.functions.invoke(
              'create-intake-upload-url',
              {
                body: {
                  firmSlug: firm.form_slug,
                  contentType: file.type || 'image/jpeg',
                  fileName: file.name,
                },
              },
            );
            if (signErr) throw new Error(`Kunde inte förbereda uppladdning: ${signErr.message}`);
            if (!signed?.path || !signed?.token) throw new Error('Ogiltigt svar från uppladdningstjänst');

            const { error: uploadErr } = await supabase.storage
              .from(PHOTO_BUCKET)
              .uploadToSignedUrl(signed.path, signed.token, file, {
                contentType: file.type || 'image/jpeg',
              });
            if (uploadErr) throw new Error(`Uppladdning misslyckades: ${uploadErr.message}`);

            urls.push(signed.publicUrl);
          }
          answersForSubmit[field.id] = urls;
          photoUrls.push(...urls);
        } else {
          answersForSubmit[field.id] = v ?? null;
        }
      }

      // 2. Try geocoding customer address for later distance scoring
      const addressRaw = (values['address'] as string) || '';
      const geo = addressRaw ? await geocode(addressRaw) : null;

      // 3. POST to submit-intake-request
      const { data, error } = await supabase.functions.invoke(
        'submit-intake-request',
        {
          body: {
            firmSlug: firm.form_slug,
            formTemplateSubType: template.sub_type,
            freeText,
            submittedAnswers: answersForSubmit,
            photos: photoUrls,
            submitter: {
              name: submitter.name || null,
              email: submitter.email || null,
              phone: submitter.phone || null,
              address: addressRaw || null,
              lat: geo?.lat ?? null,
              lng: geo?.lng ?? null,
            },
          },
        },
      );
      if (error) throw new Error(error.message);
      if (!data?.id) throw new Error('Oväntat svar från servern');

      setStage('done');
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte skicka förfrågan');
      setStage('form');
    }
  };

  // --------------- UI ---------------

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stage === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sidan hittades inte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Länken du följde är inte giltig. Kontrollera att adressen stämmer eller
              fråga firman om en ny länk.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl p-4 py-8">
        {/* Firm header */}
        <div className="mb-6 flex items-center gap-3">
          {firm?.logo_url ? (
            <img
              src={firm.logo_url}
              alt={firm.name}
              className="h-12 w-12 rounded-lg object-contain bg-muted/30 p-1"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="font-heading text-xl font-bold">{firm?.name}</h1>
            <p className="text-xs text-muted-foreground">
              Få en offert på ditt jobb
            </p>
          </div>
        </div>

        {stage === 'intro' && (
          <Card>
            <CardHeader>
              <CardTitle>Beskriv ditt jobb</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Skriv kort vad du behöver hjälp med. Vi väljer rätt formulär åt dig
                baserat på beskrivningen.
              </p>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="T.ex. Behöver installera en laddbox i garaget på min villa"
                rows={4}
                className="resize-none"
              />
              <Button
                onClick={handleClassify}
                disabled={!freeText.trim() || freeText.trim().length < 5}
                className="w-full gap-2"
              >
                Fortsätt <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {stage === 'classifying' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyserar din förfrågan...
              </p>
            </CardContent>
          </Card>
        )}

        {(stage === 'form' || stage === 'submitting') && template && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.description && (
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {template.form_schema.fields.map((field) => (
                  <FormFieldRenderer
                    key={field.id}
                    field={field}
                    value={values[field.id] ?? ''}
                    onChange={handleFieldChange}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dina kontaktuppgifter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>
                    Namn <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={submitter.name}
                    onChange={(e) =>
                      setSubmitter((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>E-post</Label>
                    <Input
                      type="email"
                      value={submitter.email}
                      onChange={(e) =>
                        setSubmitter((p) => ({ ...p, email: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={submitter.phone}
                      onChange={(e) =>
                        setSubmitter((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minst en av e-post eller telefon krävs.
                </p>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={stage === 'submitting'}
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {stage === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  Skicka förfrågan <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {stage === 'done' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <div>
                <h2 className="font-heading text-xl font-bold">Tack!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Din förfrågan är skickad till {firm?.name}. De hör av sig inom kort.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
