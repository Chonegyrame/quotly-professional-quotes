import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export function useMaterials() {
  const { company } = useCompany();

  const query = useQuery({
    queryKey: ['materials', company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
  });

  return { materials: query.data ?? [], isLoading: query.isLoading };
}
