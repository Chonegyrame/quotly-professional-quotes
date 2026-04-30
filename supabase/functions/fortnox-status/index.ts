// fortnox-status
// ----------------
// GET-style edge function (POST in practice, no body required) that returns
// the caller's company's Fortnox connection state without exposing tokens.
// The Settings page polls this on mount to render Anslut vs Connected.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  checkIpRateLimit,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "fortnox-status";
// 120/hour per IP. This endpoint is polled on Settings mount, so the
// limit is generous; it just prevents runaway clients from hammering it.
const IP_LIMIT_PER_HOUR = 120;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Look up the caller's company via the auth-scoped client so RLS
    // enforces that they actually belong to it.
    const { data: membership, error: membershipError } = await authClient
      .from("company_memberships")
      .select("company_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return jsonResponse({ error: "Inget företag kopplat till kontot." }, 404);
    }

    const { data: conn } = await adminClient
      .from("fortnox_connections")
      .select("connected_at, scope, expires_at")
      .eq("company_id", membership.company_id)
      .maybeSingle();

    return jsonResponse(
      conn
        ? {
            connected: true,
            connected_at: conn.connected_at,
            scope: conn.scope,
            expires_at: conn.expires_at,
          }
        : { connected: false },
      200,
    );
  } catch (err) {
    console.error(`[${FUNCTION_NAME}] unhandled-error`, err);
    return jsonResponse(
      { error: "Kunde inte hämta Fortnox-status." },
      500,
    );
  }
});
