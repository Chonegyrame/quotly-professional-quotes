import { ArrowLeft, Plus, Eye, Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFormTemplates, FormTrade, FormTemplateRow } from '@/hooks/useFormTemplates';

const TRADE_LABEL: Record<FormTrade, string> = {
  el: 'El',
  vvs: 'VVS',
  bygg: 'Bygg',
  general: 'Övrigt',
};

interface Props {
  trade: FormTrade;
  onBack: () => void;
  onCreate: (trade: FormTrade) => void;
  onEdit: (template: FormTemplateRow) => void;
  onPreview: (template: FormTemplateRow) => void;
  onToggleActive: (template: FormTemplateRow) => void;
  onAddKeyword: (template: FormTemplateRow) => void;
}

export function FormularTradeView({
  trade,
  onBack,
  onCreate,
  onEdit,
  onPreview,
  onToggleActive,
  onAddKeyword,
}: Props) {
  const { data: templates = [], isLoading } = useFormTemplates();
  const inTrade = templates.filter((t) => t.trade === trade);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-heading font-bold">{TRADE_LABEL[trade]}-formulär</h2>
        <div className="ml-auto">
          <Button
            onClick={() => onCreate(trade)}
            size="sm"
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Skapa formulär
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar formulär…</p>
      ) : (
        <div className="space-y-3">
          {inTrade.map((tpl) => (
            <FormularCard
              key={tpl.id}
              template={tpl}
              onEdit={onEdit}
              onPreview={onPreview}
              onToggleActive={onToggleActive}
              onAddKeyword={onAddKeyword}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  template: FormTemplateRow;
  onEdit: (template: FormTemplateRow) => void;
  onPreview: (template: FormTemplateRow) => void;
  onToggleActive: (template: FormTemplateRow) => void;
  onAddKeyword: (template: FormTemplateRow) => void;
}

function FormularCard({ template, onEdit, onPreview, onToggleActive, onAddKeyword }: CardProps) {
  const isCustom = template.source === 'custom';
  const isLinkedCopy = isCustom && Boolean(template.based_on_template_id);

  return (
    <Card className={!template.is_active ? 'opacity-60' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-semibold text-base truncate">{template.name}</h3>
              {!isCustom && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  Standard
                </span>
              )}
              {isLinkedCopy && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Anpassad standard
                </span>
              )}
              {isCustom && !isLinkedCopy && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  Eget
                </span>
              )}
              {!template.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                  Inaktiv
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
            )}
          </div>
        </div>

        {/* Triggerord chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-accent shrink-0 mr-0.5">Trigger-ord:</span>
          {template.trigger_keywords.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">Inga triggerord</span>
          ) : (
            template.trigger_keywords.map((kw) => (
              <span
                key={kw}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isCustom
                    ? 'bg-accent/15 text-accent-foreground border border-accent/30'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {kw}
              </span>
            ))
          )}
          <button
            onClick={() => onAddKeyword(template)}
            className="text-xs text-muted-foreground hover:text-accent ml-1 underline-offset-2 hover:underline"
          >
            + lägg till
          </button>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={() => onPreview(template)} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Förhandsgranska
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(template)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Redigera
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onToggleActive(template)} className="gap-1.5 ml-auto">
            <Power className="h-3.5 w-3.5" />
            {template.is_active ? 'Inaktivera' : 'Aktivera'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
