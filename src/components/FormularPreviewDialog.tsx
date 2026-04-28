import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FormFieldRenderer, FormField, FieldValue } from '@/components/FormFieldRenderer';
import { FormTemplateRow } from '@/hooks/useFormTemplates';

const TRADE_LABEL: Record<string, string> = {
  el: 'El',
  vvs: 'VVS',
  bygg: 'Bygg',
  general: 'Övrigt',
};

interface Props {
  open: boolean;
  onClose: () => void;
  template: FormTemplateRow | null;
}

export function FormularPreviewDialog({ open, onClose, template }: Props) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});

  const fields = useMemo<FormField[]>(() => {
    if (!template) return [];
    const schema = (template.form_schema ?? {}) as { fields?: any[] };
    const raw = Array.isArray(schema.fields) ? schema.fields : [];
    return raw.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      options: Array.isArray(f.options) ? f.options : undefined,
      help: f.help,
    }));
  }, [template]);

  function handleChange(id: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      setValues({});
      onClose();
    }
  }

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle>{template.name}</DialogTitle>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {TRADE_LABEL[template.trade] ?? template.trade}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
              Förhandsgranskning
            </span>
          </div>
          <DialogDescription>
            {template.description ??
              'Så här ser formuläret ut för kunder som skickar en förfrågan.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Detta formulär har inga frågor ännu.
            </p>
          ) : (
            fields.map((field) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                value={values[field.id] ?? null}
                onChange={handleChange}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
