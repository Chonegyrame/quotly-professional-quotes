// fortnox-disconnect
// -------------------
// Removes the firm's stored Fortnox tokens. Quotly stops being able to
// call Fortnox until the firm reconnects. We do not call Fortnox's revoke
// endpoint — Fortnox tokens auto-expire and the firm can also revoke
// access from their Fortnox account settings if they want immediate
// cutoff.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "fortnox-disconnect";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const auth = await authenticate(req, FUNCTION_NAME);
    if (!auth.ok) return auth.response;
    const { authClient, adminClient, userId } = auth;

    const { data: membership, error: membershipError } = await authClient
      .from("company_memberships")
      .select("company_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return jsonResponse({ error: "Inget företag kopplat till kontot." }, 404);
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return jsonResponse(
        { error: "Endast ägare eller admin kan koppla bort Fortnox." },
        403,
      );
    }

    const { error: deleteError } = await adminClient
      .from("fortnox_connections")
      .delete()
      .eq("company_id", membership.company_id);

    if (deleteError) {
      console.error(`[${FUNCTION_NAME}] delete-error`, deleteError);
      return jsonResponse(
        { error: "Kunde inte koppla bort Fortnox just nu. Försök igen om en stund." },
        500,
      );
    }

    return jsonResponse({ disconnected: true }, 200);
  } catch (err) {
    console.error(`[${FUNCTION_NAME}] unhandled-error`, err);
    return jsonResponse(
      { error: "Något gick fel vid bortkoppling av Fortnox." },
      500,
    );
  }
});
