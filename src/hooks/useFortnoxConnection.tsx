import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type FortnoxStatus =
  | { connected: false }
  | {
      connected: true;
      connected_at: string;
      scope: string;
      expires_at: string;
    };

// Scopes Quotly needs from Fortnox. invoice + customer cover the create-quote
// flow. companyinformation is harmless, useful for showing which Fortnox
// account is connected. Add new ones here as the integration grows.
// TODO(fortnox-spike): verify these scope strings against the Integrationer
// page on developer.fortnox.se — Fortnox sometimes uses slightly different
// names than its docs imply.
const REQUIRED_SCOPES = ['invoice', 'customer', 'companyinformation'];

const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';

// Persisted under this key in sessionStorage so the callback page can
// verify the state token Fortnox echoes back. Stored values:
//   { state: <nonce>, redirect_uri: <uri used in the request> }
const OAUTH_SESSION_KEY = 'fortnox_oauth_pending';

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Builds the URL Quotly redirects users to when they click "Anslut Fortnox".
// Stores the state nonce + redirect_uri in sessionStorage so the callback
// page can prove it originated this flow.
export function buildFortnoxConnectUrl(): string {
  const clientId = import.meta.env.VITE_FORTNOX_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error('VITE_FORTNOX_CLIENT_ID saknas i miljön.');
  }
  const redirectUri = `${window.location.origin}/auth/fortnox/callback`;
  const state = randomNonce();
  sessionStorage.setItem(
    OAUTH_SESSION_KEY,
    JSON.stringify({ state, redirect_uri: redirectUri }),
  );
  const params = new URLSearchParams({
    client_id: clientId,
    scope: REQUIRED_SCOPES.join(' '),
    state,
    access_type: 'offline',
    response_type: 'code',
    redirect_uri: redirectUri,
    account_type: 'service',
  });
  return `${FORTNOX_AUTH_URL}?${params.toString()}`;
}

export function consumeFortnoxOAuthSession():
  | { state: string; redirect_uri: string }
  | null {
  const raw = sessionStorage.getItem(OAUTH_SESSION_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(OAUTH_SESSION_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useFortnoxConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ['fortnox_status', user?.id],
    queryFn: async (): Promise<FortnoxStatus> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('fortnox-status', {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      if (error) throw error;
      return data as FortnoxStatus;
    },
    enabled: !!user,
  });

  const completeOAuth = useMutation({
    mutationFn: async ({
      code,
      redirect_uri,
    }: {
      code: string;
      redirect_uri: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke(
        'fortnox-oauth-callback',
        {
          body: { code, redirect_uri },
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['fortnox_status'] }),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const { error } = await supabase.functions.invoke('fortnox-disconnect', {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['fortnox_status'] }),
  });

  // Pushes an accepted quote to Fortnox as a draft invoice. Server-side
  // refuses if the quote isn't accepted, is already synced, or no
  // connection exists, so callers don't need to re-validate.
  const sendInvoice = useMutation({
    mutationFn: async (quoteId: string): Promise<{ fortnox_invoice_number: string }> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke(
        'create-fortnox-invoice',
        {
          body: { quoteId },
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        },
      );
      if (error) throw error;
      return data as { fortnox_invoice_number: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  return {
    status: status.data,
    isLoading: status.isLoading,
    completeOAuth,
    disconnect,
    sendInvoice,
  };
}
