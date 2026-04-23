import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useCompanyBusinessProfile } from './useCompanyBusinessProfile';

export type AiVerdict = {
  reasoning?: string;
  parsed_fields?: {
    job_type?: string;
    budget?: string;
    budget_bucket?: string;
    timeframe?: string;
    timeframe_bucket?: string;
    property_type?: string;
    location?: string;
    rot_eligible?: boolean;
  };
  fit_score?: number;
  intent_score?: number;
  clarity_score?: number;
  score?: number;
  tier?: string;
  summary?: string;
  green_flags?: { label: string; evidence: string }[];
  red_flags?: { label: string; evidence: string; severity: string }[];
  next_step?: { action: string; suggested_message?: string };
  confidence?: string;
  needs_human_review?: boolean;
};

export type IncomingRequest = {
  id: string;
  company_id: string;
  form_template_id: string | null;
  submitted_answers: Record<string, any> | null;
  free_text: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_phone: string | null;
  submitter_address: string | null;
  submitter_postal_code: string | null;
  submitter_city: string | null;
  submitter_lat: number | null;
  submitter_lng: number | null;
  photos: string[] | null;
  ai_score: number | null;
  ai_tier: 'Hett' | 'Ljummet' | 'Kallt' | null;
  ai_confidence: 'hög' | 'medel' | 'låg' | null;
  ai_verdict: AiVerdict | null;
  needs_human_review: boolean;
  status: 'new' | 'viewed' | 'converted' | 'dismissed';
  converted_to_quote_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useIncomingRequests() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['incoming_requests', company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from('incoming_requests')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IncomingRequest[];
    },
    enabled: !!company,
  });

  const markViewed = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from('incoming_requests')
        .update({ status: 'viewed' })
        .eq('id', requestId)
        .eq('status', 'new');
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incoming_requests'] }),
  });

  const dismissRequest = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from('incoming_requests')
        .update({ status: 'dismissed' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incoming_requests'] }),
  });

  const convertRequest = useMutation({
    mutationFn: async ({ requestId, quoteId }: { requestId: string; quoteId: string }) => {
      const { error } = await supabase
        .from('incoming_requests')
        .update({ status: 'converted', converted_to_quote_id: quoteId })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incoming_requests'] }),
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    markViewed,
    dismissRequest,
    convertRequest,
  };
}

export function useIncomingRequest(requestId: string | undefined) {
  const { requests } = useIncomingRequests();
  return requests.find((r) => r.id === requestId) ?? null;
}

export function useGenerateQuoteFromRequest() {
  const { company } = useCompany();
  const { profile } = useCompanyBusinessProfile();
  const navigate = useNavigate();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  async function generate(request: IncomingRequest) {
    if (!company) return;
    setGeneratingId(request.id);
    try {
      const parts: string[] = [];
      if (request.free_text) parts.push(request.free_text);
      if (request.submitted_answers && Object.keys(request.submitted_answers).length > 0) {
        const rows = Object.entries(request.submitted_answers)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\n');
        parts.push('Formulärsvar:\n' + rows);
      }
      const text = parts.join('\n\n');
      const trade = profile?.primary_trade ?? 'general';

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('generate-quote', {
        body: { text, company_id: company.id, trade },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (error) {
        if ((error as any).context?.status === 429) {
          toast.error('Daglig gräns nådd (20 genereringar per dag)');
          return;
        }
        throw new Error(error.message);
      }
      if (!data?.items?.length) {
        toast.error('AI kunde inte tolka förfrågan — kontrollera att formuläret är ifyllt');
        return;
      }

      navigate('/quotes/new', {
        state: {
          incomingRequestId: request.id,
          trade,
          aiData: {
            ...data,
            customer_name: request.submitter_name ?? data.customer_name ?? '',
            customer_email: request.submitter_email ?? '',
            customer_phone: request.submitter_phone ?? '',
            customer_address: [request.submitter_address, request.submitter_city]
              .filter(Boolean)
              .join(', ') || data.customer_address || '',
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Något gick fel, försök igen');
    } finally {
      setGeneratingId(null);
    }
  }

  return { generate, generatingId };
}
