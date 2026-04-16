import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  org_number: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  bankgiro: string;
  default_vat: number;
  default_validity_days: number;
  email_template: string | null;
}

export function useCompany() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Company | null;
    },
    enabled: !!user,
  });

  const createCompany = useMutation({
    mutationFn: async (company: Partial<Company>) => {
      const { data, error } = await supabase
        .from('companies')
        .insert({ ...company, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company'] }),
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company'] }),
  });

  return { company: query.data, isLoading: query.isLoading, createCompany, updateCompany };
}
