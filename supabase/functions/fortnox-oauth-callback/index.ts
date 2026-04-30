// fortnox-oauth-callback
// -----------------------
// Receives the authorization code that Fortnox sends back to Quotly's
// frontend after the user clicks "Tillåt" on Fortnox's consent screen.
// The frontend (FortnoxCallback page) forwards code + redirect_uri here;
// this function exchanges them for an access + refresh token pair using
// the server-only FORTNOX_CLIENT_SECRET, then persists them to
// fortnox_connections under the caller's company.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";
import { exchangeCodeForTokens, upsertConnection } from "../_shared/fortnox.ts";

const FUNCTION_NAME = "fortnox-oauth-callback";

type Payload = {
  code: string;
  redirect_uri: string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!Deno.env.get("FORTNOX_CLIENT_ID") || !Deno.env.get("FORTNOX_CLIENT_SECRET")) {
      // TODO(fortnox-spike): set FORTNOX_CLIENT_ID + FORTNOX_CLIENT_SECRET in
      // Supabase project secrets once the user has them from developer.fortnox.se.
      return jsonResponse(
        { error: "Fortnox-integration är inte konfigurerad än." },
        503,
      );
    }

    const auth = await authenticate(req, FUNCTION_NAME);
    if (!auth.ok) return auth.response;
    const { authClient, adminClient, userId } = auth;

    const { code, redirect_uri }: Payload = await req.json();
    if (!code?.trim() || !redirect_uri?.trim()) {
      return jsonResponse(
        { error: "Saknar code eller redirect_uri." },
        400,
      );
    }

    // Resolve company through RLS so users can't connect Fortnox under
    // a company they aren't a member of.
    const { data: membership, error: membershipError } = await authClient
      .from("company_memberships")
      .select("company_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return jsonResponse({ error: "Inget företag kopplat till kontot." }, 404);
    }

    // Owner/admin only — members shouldn't be able to swap out the firm's
    // accounting integration.
    if (membership.role !== "owner" && membership.role !== "admin") {
      return jsonResponse(
        { error: "Endast ägare eller admin kan ansluta Fortnox." },
        403,
      );
    }

    const tokens = await exchangeCodeForTokens(code, redirect_uri);
    await upsertConnection(adminClient, membership.company_id, tokens);

    return jsonResponse(
      {
        connected: true,
        scope: tokens.scope,
      },
      200,
    );
  } catch (err) {
    console.error(`[${FUNCTION_NAME}] error`, err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
