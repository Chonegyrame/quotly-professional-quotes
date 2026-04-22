import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany, type CompanyRole } from './useCompany';

export interface CompanyMember {
  user_id: string;
  email: string;
  role: CompanyRole;
  joined_at: string;
}

export function useCompanyMembers() {
  const { company } = useCompany();

  return useQuery({
    queryKey: ['company-members', company?.id],
    queryFn: async (): Promise<CompanyMember[]> => {
      if (!company) return [];
      const { data, error } = await supabase.rpc('get_company_members', {
        p_company_id: company.id,
      });
      if (error) throw error;
      return (data ?? []) as CompanyMember[];
    },
    enabled: !!company,
  });
}
