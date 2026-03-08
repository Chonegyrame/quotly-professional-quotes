import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export function useTemplates() {
  const { company } = useCompany();

  const query = useQuery({
    queryKey: ['templates', company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
  });

  return { templates: query.data ?? [], isLoading: query.isLoading };
}
