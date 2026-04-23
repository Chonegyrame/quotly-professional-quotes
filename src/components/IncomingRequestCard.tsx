import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreRing } from './ScoreRing';
import { FlagsList } from './FlagsList';
import { useGenerateQuoteFromRequest, type IncomingRequest } from '@/hooks/useIncomingRequests';

type Props = {
  request: IncomingRequest;
  onDismiss: (id: string) => void;
};

const tierLabel: Record<string, string> = {
  Hett: '🟢 Hett',
  Ljummet: '🟡 Ljummet',
  Kallt: '🔴 Kallt',
};

const tierBadgeClass: Record<string, string> = {
  Hett: 'bg-green-100 text-green-800 border-green-200',
  Ljummet: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Kallt: 'bg-red-100 text-red-800 border-red-200',
};

export function IncomingRequestCard({ request, onDismiss }: Props) {
  const navigate = useNavigate();
  const { generate, generatingId } = useGenerateQuoteFromRequest();
  const isGenerating = generatingId === request.id;
  const verdict = request.ai_verdict;
  const parsed = verdict?.parsed_fields;

  const chips = [
    parsed?.job_type && { label: parsed.job_type },
    parsed?.budget_bucket && { label: parsed.budget_bucket },
    parsed?.timeframe_bucket && { label: parsed.timeframe_bucket },
    parsed?.property_type && { label: parsed.property_type },
  ].filter(Boolean) as { label: string }[];

  const isConverted = request.status === 'converted';
  const isScored = request.ai_score != null;


  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/inbox/${request.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <ScoreRing score={request.ai_score} tier={request.ai_tier} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">
                {request.submitter_name ?? 'Okänd kund'}
              </span>
              {request.ai_tier && (
                <Badge
                  variant="outline"
                  className={`text-xs ${tierBadgeClass[request.ai_tier] ?? ''}`}
                >
                  {tierLabel[request.ai_tier]}
                </Badge>
              )}
              {!isScored && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Poängsätts...
                </Badge>
              )}
              {request.status === 'new' && (
                <Badge variant="secondary" className="text-xs">Ny</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: sv })}
              {request.submitter_city ? ` · ${request.submitter_city}` : ''}
            </p>
          </div>
        </div>

        {/* Human review banner */}
        {request.needs_human_review && (
          <div className="rounded bg-yellow-50 border border-yellow-200 px-3 py-1.5 text-xs text-yellow-800">
            Manuell granskning rekommenderas
          </div>
        )}

        {/* Parsed field chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span
                key={i}
                className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* Flags */}
        {(verdict?.green_flags?.length || verdict?.red_flags?.length) ? (
          <FlagsList greenFlags={verdict?.green_flags} redFlags={verdict?.red_flags} />
        ) : null}

        {/* Summary */}
        {verdict?.summary && (
          <p className="text-xs text-foreground/80 italic">{verdict.summary}</p>
        )}

        {/* Actions */}
        <div
          className="flex items-center justify-between pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {isConverted ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5" />
              Offert skapad
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={isGenerating}
              onClick={() => generate(request)}
            >
              {isGenerating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analyserar...</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" />Generera offert</>
              )}
            </Button>
          )}
          {!isConverted && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={() => onDismiss(request.id)}
            >
              Markera som hanterad
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
