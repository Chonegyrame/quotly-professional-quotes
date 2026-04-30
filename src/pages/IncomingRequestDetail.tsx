import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp, Image, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreRing } from '@/components/ScoreRing';
import { FlagsList } from '@/components/FlagsList';
import { DeclineRequestDialog } from '@/components/DeclineRequestDialog';
import { useIncomingRequest, useIncomingRequests, useGenerateQuoteFromRequest } from '@/hooks/useIncomingRequests';

const tierBadgeClass: Record<string, string> = {
  'Mycket stark': 'bg-green-100 text-green-800 border-green-200',
  Stark: 'bg-lime-100 text-lime-800 border-lime-200',
  Mellan: 'bg-amber-100 text-amber-800 border-amber-200',
  Svag: 'bg-stone-100 text-stone-700 border-stone-200',
};

export default function IncomingRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const request = useIncomingRequest(id);
  const { markViewed, dismissRequest } = useIncomingRequests();
  const { generate, generatingId } = useGenerateQuoteFromRequest();
  const isGenerating = generatingId === id;
  const [showReasoning, setShowReasoning] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  useEffect(() => {
    if (request?.status === 'new') {
      markViewed.mutate({ requestId: request.id });
    }
  }, [request?.id]);

  if (!request) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Förfrågan hittades inte.</p>
      </div>
    );
  }

  const verdict = request.ai_verdict;
  const parsed = verdict?.parsed_fields;


  function handleDismiss() {
    dismissRequest.mutate(
      { requestId: request!.id },
      {
        onSuccess: () => {
          toast.success('Markerad som hanterad');
          navigate('/inbox');
        },
      },
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 max-w-3xl mx-auto space-y-4">
      {/* Back */}
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/inbox')}
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till förfrågningar
      </button>

      {/* Header card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <ScoreRing score={request.ai_score} tier={request.ai_tier} size={64} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold">
                  {request.submitter_name ?? 'Okänd kund'}
                </h1>
                {request.ai_tier && (
                  <Badge
                    variant="outline"
                    className={tierBadgeClass[request.ai_tier]}
                  >
                    {request.ai_tier}
                  </Badge>
                )}
                {request.ai_confidence && (
                  <span className="text-xs text-muted-foreground">
                    Konfidens: {request.ai_confidence}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(new Date(request.created_at), 'd MMM yyyy, HH:mm', { locale: sv })}
                {' · '}
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: sv })}
              </p>
              {verdict?.summary && (
                <p className="text-sm mt-2 italic text-foreground/80">{verdict.summary}</p>
              )}
            </div>
          </div>

          {request.needs_human_review && (
            <div className="mt-3 rounded bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
              Manuell granskning rekommenderas
            </div>
          )}

          {/* Sub-scores */}
          {(verdict?.fit_score != null || verdict?.intent_score != null || verdict?.clarity_score != null) && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Matchning', value: verdict?.fit_score },
                { label: 'Avsikt', value: verdict?.intent_score },
                { label: 'Tydlighet', value: verdict?.clarity_score },
              ].map((s) => (
                <div key={s.label} className="rounded bg-muted p-2">
                  <p className="text-lg font-bold">{s.value ?? '–'}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {request.status === 'converted' ? (
              <Badge variant="outline">Offert skapad</Badge>
            ) : request.status === 'declined' ? (
              <Badge variant="outline">Avböjd</Badge>
            ) : (
              <>
                <Button
                  onClick={() => generate(request)}
                  disabled={isGenerating}
                  className="gap-1.5"
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Analyserar...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" />Generera offert</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeclineOpen(true)}
                  disabled={!request.submitter_email}
                  title={!request.submitter_email ? 'Kunden har inte angett e-post' : undefined}
                  className="gap-1.5"
                >
                  <X className="h-4 w-4" />
                  Avböj kund
                </Button>
              </>
            )}
            {request.status !== 'converted' &&
              request.status !== 'dismissed' &&
              request.status !== 'declined' && (
                <button
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  onClick={handleDismiss}
                >
                  Markera som hanterad
                </button>
              )}
          </div>
        </CardContent>
      </Card>

      <DeclineRequestDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        request={request}
      />

      {/* Flags */}
      {(verdict?.green_flags?.length || verdict?.red_flags?.length) ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Flaggor</CardTitle>
          </CardHeader>
          <CardContent>
            <FlagsList greenFlags={verdict?.green_flags} redFlags={verdict?.red_flags} />
          </CardContent>
        </Card>
      ) : null}

      {/* Contact info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Kontaktuppgifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {request.submitter_email && <p>E-post: {request.submitter_email}</p>}
          {request.submitter_phone && <p>Telefon: {request.submitter_phone}</p>}
          {(request.submitter_address || request.submitter_city) && (
            <p>
              Adress:{' '}
              {[request.submitter_address, request.submitter_postal_code, request.submitter_city]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Form answers */}
      {request.submitted_answers && Object.keys(request.submitted_answers).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Formulärsvar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {request.free_text && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Beskrivning</p>
                <p className="whitespace-pre-wrap">{request.free_text}</p>
              </div>
            )}
            {Object.entries(request.submitted_answers).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground mb-0.5">{key}</p>
                <p>{Array.isArray(value) ? value.join(', ') : String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {request.photos && request.photos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              Bilder ({request.photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {request.photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`Bild ${i + 1}`}
                    className="rounded-md w-full h-32 object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI reasoning (expandable) */}
      {verdict?.reasoning && (
        <Card>
          <button
            className="w-full"
            onClick={() => setShowReasoning((v) => !v)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                AI-resonemang (internt)
                {showReasoning ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </button>
          {showReasoning && (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {verdict.reasoning}
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
