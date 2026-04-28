import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormTemplateRow, FormTrade, useFormTemplates } from '@/hooks/useFormTemplates';

type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'single_select'
  | 'multi_select'
  | 'file_upload';

interface FieldDraft {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: { value: string; label: string }[];
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Kort text',
  long_text: 'Lång text',
  number: 'Nummer',
  single_select: 'Välj ett',
  multi_select: 'Välj flera',
  file_upload: 'Fil',
};

const TRADE_OPTIONS: { value: FormTrade; label: string }[] = [
  { value: 'el', label: 'El' },
  { value: 'vvs', label: 'VVS' },
  { value: 'bygg', label: 'Bygg' },
  { value: 'general', label: 'Övrigt' },
];

function slugify(s: string): string {
  const out = s
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return out || `mall_${Date.now().toString(36)}`;
}

function emptyField(idx: number): FieldDraft {
  return {
    id: `q${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
    label: '',
    type: 'short_text',
    required: false,
    options: [],
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  template?: FormTemplateRow;
  initialTrade?: FormTrade;
}

export function FormularEditorModal({ open, onClose, mode, template, initialTrade }: Props) {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const { data: allTemplates = [] } = useFormTemplates();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<FormTrade>('general');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [fields, setFields] = useState<FieldDraft[]>(() =>
    Array.from({ length: 6 }, (_, i) => emptyField(i))
  );
  const [saving, setSaving] = useState(false);

  // Initialise state when modal opens or context changes
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && template) {
      setName(template.name);
      setDescription(template.description ?? '');
      setSelectedTrade(template.trade);
      setKeywords(template.trigger_keywords ?? []);
      setKeywordInput('');
      const schemaFields = (template.form_schema?.fields ?? []) as any[];
      if (schemaFields.length === 0) {
        setFields(Array.from({ length: 6 }, (_, i) => emptyField(i)));
      } else {
        setFields(
          schemaFields.map((f, i) => ({
            id: f.id ?? `q${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
            label: f.label ?? '',
            type: (f.type ?? 'short_text') as FieldType,
            required: Boolean(f.required),
            options: Array.isArray(f.options)
              ? f.options.map((o: any) =>
                  typeof o === 'string'
                    ? { value: o, label: o }
                    : { value: o.value ?? '', label: o.label ?? '' }
                )
              : [],
          }))
        );
      }
    } else {
      setName('');
      setDescription('');
      setSelectedTrade(initialTrade ?? 'general');
      setKeywords([]);
      setKeywordInput('');
      setFields(Array.from({ length: 6 }, (_, i) => emptyField(i)));
    }
  }, [open, mode, template?.id, initialTrade]);

  function commitKeywordInput() {
    const raw = keywordInput.trim();
    if (!raw) return;
    const parts = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const merged = Array.from(new Set([...keywords, ...parts]));
    setKeywords(merged);
    setKeywordInput('');
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  function addField() {
    setFields([...fields, emptyField(fields.length)]);
  }

  function updateField(idx: number, patch: Partial<FieldDraft>) {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }

  function addOption(idx: number) {
    const f = fields[idx];
    updateField(idx, { options: [...f.options, { value: '', label: '' }] });
  }

  function updateOption(fieldIdx: number, optIdx: number, label: string) {
    const f = fields[fieldIdx];
    const newOptions = f.options.map((o, i) =>
      i === optIdx ? { value: slugify(label) || `opt_${optIdx}`, label } : o
    );
    updateField(fieldIdx, { options: newOptions });
  }

  function removeOption(fieldIdx: number, optIdx: number) {
    const f = fields[fieldIdx];
    updateField(fieldIdx, { options: f.options.filter((_, i) => i !== optIdx) });
  }

  // Conflict detection: which other ACTIVE templates share keywords with this one?
  const conflicts = useMemo(() => {
    if (keywords.length === 0) return [];
    const myId = template?.id;
    const out: { templateName: string; sharedKeyword: string }[] = [];
    for (const t of allTemplates) {
      if (!t.is_active) continue;
      if (t.id === myId) continue;
      for (const kw of keywords) {
        if ((t.trigger_keywords ?? []).includes(kw)) {
          out.push({ templateName: t.name, sharedKeyword: kw });
        }
      }
    }
    return out;
  }, [keywords, allTemplates, template?.id]);

  async function handleSave() {
    if (!company) return;
    if (!name.trim()) {
      toast.error('Formuläret behöver ett namn');
      return;
    }
    if (fields.some((f) => !f.label.trim())) {
      toast.error('Alla frågor behöver ett namn — eller ta bort dem');
      return;
    }
    if (keywordInput.trim()) commitKeywordInput();

    setSaving(true);

    const cleanFields = fields.map((f) => {
      const base: any = {
        id: f.id,
        label: f.label.trim(),
        type: f.type,
        required: f.required,
      };
      if (f.type === 'single_select' || f.type === 'multi_select') {
        base.options = f.options
          .filter((o) => o.label.trim())
          .map((o) => ({ value: o.value || slugify(o.label), label: o.label.trim() }));
      }
      return base;
    });

    const payload = {
      company_id: company.id,
      name: name.trim(),
      description: description.trim() || null,
      trade: selectedTrade,
      sub_type: slugify(name),
      form_schema: { fields: cleanFields },
      red_flag_rules: [],
      trigger_keywords: keywords,
      is_active: true,
    };

    try {
      if (mode === 'edit' && template?.source === 'custom') {
        // Update existing custom row
        const { error } = await supabase
          .from('company_form_templates')
          .update(payload)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        // Either creating new, or forking a global into a custom copy
        const insertPayload: any = { ...payload };
        if (mode === 'edit' && template?.source === 'global') {
          insertPayload.based_on_template_id = template.id;
        }
        const { error } = await supabase.from('company_form_templates').insert(insertPayload);
        if (error) throw error;
      }

      // Surface conflict warnings (non-blocking)
      for (const c of conflicts) {
        toast.warning(
          `Triggerordet "${c.sharedKeyword}" används redan i formuläret "${c.templateName}". Ditt eget formulär vinner om båda matchar.`
        );
      }

      toast.success(mode === 'create' ? 'Formulär skapat' : 'Formulär uppdaterat');
      queryClient.invalidateQueries({ queryKey: ['form-templates', company.id] });
      onClose();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('duplicate key') || msg.includes('unique')) {
        toast.error('Det finns redan ett formulär med det namnet. Välj ett annat.');
      } else {
        toast.error(msg || 'Kunde inte spara formuläret');
      }
    } finally {
      setSaving(false);
    }
  }

  const isEditingGlobal = mode === 'edit' && template?.source === 'global';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Skapa formulär' : 'Redigera formulär'}
          </DialogTitle>
          <DialogDescription>
            {isEditingGlobal
              ? 'Detta är en standardmall. Om du sparar skapas en egen kopia för din firma — standardmallen påverkas inte.'
              : 'Skapa formulär som passar just era jobb. Triggerord styr när formuläret visas för kunden.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name + trade + description */}
          <div className="space-y-3">
            <div>
              <Label>Namn</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="T.ex. Solcellsinstallation villa"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Yrke</Label>
              <Select
                value={selectedTrade}
                onValueChange={(v) => setSelectedTrade(v as FormTrade)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivning <span className="text-muted-foreground font-normal">(valfri)</span></Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Kort om vad formuläret är till för"
              />
            </div>
          </div>

          {/* Triggerord */}
          <div>
            <Label>Triggerord</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Skriv ord eller fraser som ska visa detta formulär. Avgränsa med komma eller Enter.
            </p>
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  commitKeywordInput();
                }
              }}
              onBlur={commitKeywordInput}
              placeholder="solceller, solpanel, batteri ..."
            />
            {keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/15 text-accent-foreground border border-accent/30 font-medium"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {conflicts.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                <strong>Obs:</strong>
                <ul className="mt-1 space-y-0.5">
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      "{c.sharedKeyword}" används också i "{c.templateName}". Ditt formulär vinner om båda matchar.
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Frågor</Label>
              <span className="text-xs text-muted-foreground">{fields.length} st</span>
            </div>
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={idx}
                  onChange={(patch) => updateField(idx, patch)}
                  onRemove={() => removeField(idx)}
                  onAddOption={() => addOption(idx)}
                  onUpdateOption={(optIdx, label) => updateOption(idx, optIdx, label)}
                  onRemoveOption={(optIdx) => removeOption(idx, optIdx)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" /> Lägg till fråga
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving ? 'Sparar...' : mode === 'create' ? 'Skapa formulär' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldRowProps {
  field: FieldDraft;
  index: number;
  onChange: (patch: Partial<FieldDraft>) => void;
  onRemove: () => void;
  onAddOption: () => void;
  onUpdateOption: (optIdx: number, label: string) => void;
  onRemoveOption: (optIdx: number) => void;
}

function FieldRow({
  field,
  index,
  onChange,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: FieldRowProps) {
  const showOptions = field.type === 'single_select' || field.type === 'multi_select';
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="text-xs font-medium text-muted-foreground bg-background border border-border rounded px-2 py-1 mt-1">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Frågans text — t.ex. 'Vad är fastighetstypen?'"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={field.type} onValueChange={(v) => onChange({ type: v as FieldType })}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Switch
                checked={field.required}
                onCheckedChange={(v) => onChange({ required: v })}
              />
              Obligatorisk
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {showOptions && (
        <div className="ml-9 space-y-1.5 pt-1 border-t border-border/50">
          <div className="text-xs text-muted-foreground pt-1.5">Alternativ</div>
          {field.options.length === 0 && (
            <p className="text-xs italic text-muted-foreground">
              Lägg till minst två alternativ för {FIELD_TYPE_LABELS[field.type].toLowerCase()}.
            </p>
          )}
          {field.options.map((opt, optIdx) => (
            <div key={optIdx} className="flex items-center gap-2">
              <Input
                value={opt.label}
                onChange={(e) => onUpdateOption(optIdx, e.target.value)}
                placeholder={`Alternativ ${optIdx + 1}`}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveOption(optIdx)}
                className="h-8 w-8 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddOption}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" /> Lägg till alternativ
          </Button>
        </div>
      )}
    </div>
  );
}
