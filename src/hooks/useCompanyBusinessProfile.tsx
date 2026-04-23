import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export type PrimaryTrade = 'el' | 'bygg' | 'vvs' | 'general';

export interface CompanyBusinessProfile {
  id: string;
  company_id: string;
  primary_trade: PrimaryTrade;
  secondary_trades: string[];
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
  service_radius_km: number | null;
  min_ticket_sek: number | null;
  specialties: string[];
  created_at: string;
  updated_at: string;
}

export type BusinessProfileInput = Omit<
  CompanyBusinessProfile,
  'id' | 'created_at' | 'updated_at' | 'company_id'
>;

export function useCompanyBusinessProfile() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-business-profile', company?.id],
    queryFn: async (): Promise<CompanyBusinessProfile | null> => {
      if (!company) return null;
      const { data, error } = await supabase
        .from('company_business_profile' as any)
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return (data as CompanyBusinessProfile | null) ?? null;
    },
    enabled: !!company,
  });

  const upsertProfile = useMutation({
    mutationFn: async (
      input: BusinessProfileInput & { companyId?: string },
    ) => {
      const { companyId, ...rest } = input;
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) throw new Error('No company loaded');
      const payload = { ...rest, company_id: resolvedCompanyId };
      const { data, error } = await supabase
        .from('company_business_profile' as any)
        .upsert(payload, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data as CompanyBusinessProfile;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['company-business-profile'] }),
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    upsertProfile,
  };
}
