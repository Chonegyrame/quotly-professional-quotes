import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export type FormTrade = 'el' | 'bygg' | 'vvs' | 'general';

export interface FormTemplateRow {
  id: string;
  name: string;
  description: string | null;
  trade: FormTrade;
  sub_type: string;
  form_schema: any;
  red_flag_rules: any;
  trigger_keywords: string[];
  is_active: boolean;
  source: 'global' | 'custom';
  based_on_template_id?: string | null;
}

interface RawGlobal {
  id: string;
  name: string;
  description: string | null;
  trade: string;
  sub_type: string;
  form_schema: any;
  red_flag_rules: any;
  trigger_keywords: string[] | null;
  is_active: boolean;
}

interface RawCustom extends RawGlobal {
  based_on_template_id: string | null;
  company_id: string;
}

export function useFormTemplates() {
  const { company } = useCompany();

  return useQuery({
    queryKey: ['form-templates', company?.id],
    queryFn: async (): Promise<FormTemplateRow[]> => {
      const [globalRes, customRes] = await Promise.all([
        supabase
          .from('form_templates')
          .select('id, name, description, trade, sub_type, form_schema, red_flag_rules, trigger_keywords, is_active'),
        company
          ? supabase
              .from('company_form_templates')
              .select('id, name, description, trade, sub_type, form_schema, red_flag_rules, trigger_keywords, is_active, based_on_template_id')
              .eq('company_id', company.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (globalRes.error) throw globalRes.error;
      if (customRes.error) throw customRes.error;

      const globals: FormTemplateRow[] = (globalRes.data ?? []).map((g: RawGlobal) => ({
        ...g,
        trade: g.trade as FormTrade,
        trigger_keywords: g.trigger_keywords ?? [],
        source: 'global' as const,
      }));

      const customs: FormTemplateRow[] = ((customRes.data ?? []) as RawCustom[]).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        trade: c.trade as FormTrade,
        sub_type: c.sub_type,
        form_schema: c.form_schema,
        red_flag_rules: c.red_flag_rules,
        trigger_keywords: c.trigger_keywords ?? [],
        is_active: c.is_active,
        source: 'custom' as const,
        based_on_template_id: c.based_on_template_id,
      }));

      // Hide globals that have a custom override (linked via based_on_template_id).
      const overriddenIds = new Set(
        customs
          .map((c) => c.based_on_template_id)
          .filter((id): id is string => Boolean(id))
      );

      const visibleGlobals = globals.filter((g) => !overriddenIds.has(g.id));

      return [...visibleGlobals, ...customs];
    },
    enabled: true,
  });
}
