import { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Upload } from 'lucide-react';

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'single_select'
  | 'multi_select'
  | 'file_upload';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  required?: boolean;
  help?: string;
  /** Default value applied when the form is first rendered. */
  default?: string | number;
  /** When set, the field is only rendered if the referenced field's value matches. */
  visible_when?: { field: string; value: string };
}

/** True when the field has no visibility condition or the condition is met. */
export function isFieldVisible(
  field: FormField,
  values: Record<string, FieldValue>,
): boolean {
  if (!field.visible_when) return true;
  const target = values[field.visible_when.field];
  return target === field.visible_when.value;
}

export type FieldValue = string | number | string[] | File[] | null;

interface Props {
  field: FormField;
  value: FieldValue;
  onChange: (id: string, value: FieldValue) => void;
}

export function FormFieldRenderer({ field, value, onChange }: Props) {
  const labelNode = (
    <Label htmlFor={field.id} className="flex items-center gap-1">
      {field.label}
      {field.required && <span className="text-destructive">*</span>}
    </Label>
  );

  const helpNode = field.help ? (
    <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>
  ) : null;

  if (field.type === 'short_text') {
    return (
      <div>
        {labelNode}
        <Input
          id={field.id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
          className="mt-1"
        />
        {helpNode}
      </div>
    );
  }

  if (field.type === 'long_text') {
    return (
      <div>
        {labelNode}
        <Textarea
          id={field.id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
          className="mt-1"
          rows={4}
        />
        {helpNode}
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        {labelNode}
        <Input
          id={field.id}
          type="number"
          inputMode="numeric"
          value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange(field.id, v === '' ? null : Number(v));
          }}
          required={field.required}
          className="mt-1"
        />
        {helpNode}
      </div>
    );
  }

  if (field.type === 'single_select') {
    const current = typeof value === 'string' ? value : '';
    return (
      <div>
        {labelNode}
        <Select value={current} onValueChange={(v) => onChange(field.id, v)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Välj..." />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {helpNode}
      </div>
    );
  }

  if (field.type === 'multi_select') {
    const current = Array.isArray(value) && value.every((v) => typeof v === 'string')
      ? (value as string[])
      : [];
    const toggle = (v: string, checked: boolean) => {
      onChange(
        field.id,
        checked ? Array.from(new Set([...current, v])) : current.filter((x) => x !== v),
      );
    };
    return (
      <div>
        {labelNode}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(field.options ?? []).map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer"
            >
              <Checkbox
                checked={current.includes(o.value)}
                onCheckedChange={(c) => toggle(o.value, !!c)}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
        {helpNode}
      </div>
    );
  }

  if (field.type === 'file_upload') {
    const files = Array.isArray(value) && value[0] instanceof File ? (value as File[]) : [];
    const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      if (!picked.length) return;
      onChange(field.id, [...files, ...picked].slice(0, 10));
      e.target.value = '';
    };
    const removeAt = (idx: number) => {
      const next = files.slice();
      next.splice(idx, 1);
      onChange(field.id, next);
    };
    return (
      <div>
        {labelNode}
        <div className="mt-1 space-y-2">
          <label className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 cursor-pointer hover:bg-muted/30">
            <Upload className="h-4 w-4" />
            <span className="text-sm">Välj bilder</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFile}
            />
          </label>
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate">{f.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => removeAt(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {helpNode}
      </div>
    );
  }

  return null;
}
