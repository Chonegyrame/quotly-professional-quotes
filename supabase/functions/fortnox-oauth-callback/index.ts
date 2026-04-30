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
  checkIpRateLimit,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";
import { exchangeCodeForTokens, upsertConnection } from "../_shared/fortnox.ts";

const FUNCTION_NAME = "fortnox-oauth-callback";
// 30/hour per IP. This is a token-minting endpoint and a hot CSRF/XSRF
// target if a client_secret ever leaks; cap brute attempts.
const IP_LIMIT_PER_HOUR = 30;

// Allow-list of redirect URIs Quotly itself will issue. Set via env so
// adding the prod domain doesn't require a code change. Format is a
// comma-separated list, e.g.
//   FORTNOX_REDIRECT_URIS=http://localhost:8081/auth/fortnox/callback,https://quotly.se/auth/fortnox/callback
function allowedRedirectUris(): string[] {
  const raw = (Deno.env.get("FORTNOX_REDIRECT_URIS") ?? "").trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

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
    const { authClient, adminClient, userId, ip } = auth;

    const ipResp = await checkIpRateLimit(
      adminClient,
      ip,
      FUNCTION_NAME,
      IP_LIMIT_PER_HOUR,
      60,
    );
    if (ipResp) return ipResp;

    const { code, redirect_uri }: Payload = await req.json();
    if (!code?.trim() || !redirect_uri?.trim()) {
      return jsonResponse(
        { error: "Saknar code eller redirect_uri." },
        400,
      );
    }

    // Defense in depth: even though Fortnox itself rejects mismatched
    // redirect_uri at code exchange (the URI is bound to the auth-step
    // call), validate it against our own allow-list before forwarding.
    // This means a malformed/poisoned redirect_uri bounced through the
    // browser can't even start a Fortnox token call.
    const allowed = allowedRedirectUris();
    if (allowed.length > 0 && !allowed.includes(redirect_uri)) {
      console.error(
        `[${FUNCTION_NAME}] redirect-uri-not-allowed redirect_uri=${redirect_uri}`,
      );
      return jsonResponse(
        { error: "Redirect-URI är inte tillåten." },
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

    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, redirect_uri);
    } catch (err) {
      console.error(`[${FUNCTION_NAME}] code-exchange-failed`, err);
      return jsonResponse(
        { error: "Fortnox kunde inte verifiera anslutningen. Försök igen." },
        502,
      );
    }

    try {
      await upsertConnection(adminClient, membership.company_id, tokens);
    } catch (err) {
      console.error(`[${FUNCTION_NAME}] persist-failed`, err);
      return jsonResponse(
        { error: "Kunde inte spara Fortnox-anslutningen. Försök igen om en stund." },
        500,
      );
    }

    return jsonResponse(
      {
        connected: true,
        scope: tokens.scope,
      },
      200,
    );
  } catch (err) {
    console.error(`[${FUNCTION_NAME}] unhandled-error`, err);
    return jsonResponse(
      { error: "Något gick fel vid anslutning till Fortnox." },
      500,
    );
  }
});
