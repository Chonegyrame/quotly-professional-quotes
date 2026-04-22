import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany, type CompanyRole } from './useCompany';

export interface CompanyInvite {
  id: string;
  email: string;
  role: Exclude<CompanyRole, 'owner'>;
  expires_at: string;
  created_at: string;
}

export function useCompanyInvites() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-invites', company?.id],
    queryFn: async (): Promise<CompanyInvite[]> => {
      if (!company) return [];
      const { data, error } = await supabase
        .from('company_invites')
        .select('id, email, role, expires_at, created_at')
        .eq('company_id', company.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanyInvite[];
    },
    enabled: !!company,
  });

  const sendInvite = useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: Exclude<CompanyRole, 'owner'>;
    }) => {
      if (!company) throw new Error('No company');
      const { data, error } = await supabase.functions.invoke(
        'send-team-invite',
        { body: { company_id: company.id, email, role } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['company-invites'] }),
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('company_invites')
        .delete()
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['company-invites'] }),
  });

  return { ...query, sendInvite, cancelInvite };
}
