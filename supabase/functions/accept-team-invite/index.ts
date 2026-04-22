import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "accept-team-invite";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await authenticate(req, FUNCTION_NAME);
  if (!auth.ok) return auth.response;
  const { userId, adminClient } = auth;

  let payload: { token?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const token = payload.token?.trim();
  if (!token) {
    return jsonResponse({ error: "Missing token" }, 400);
  }

  // Look up the invite with service_role (bypasses RLS — the invitee
  // can't see other members of the firm yet, and invites_select only
  // lets existing members read).
  const { data: invite, error: lookupErr } = await adminClient
    .from("company_invites")
    .select("id, company_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (lookupErr) {
    console.error(`[${FUNCTION_NAME}] lookup-error: ${lookupErr.message}`);
    return jsonResponse({ error: "Database error" }, 500);
  }

  if (!invite) {
    return jsonResponse({ error: "Inbjudan hittades inte" }, 404);
  }

  if (invite.accepted_at) {
    return jsonResponse({ error: "Inbjudan har redan accepterats" }, 410);
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return jsonResponse({ error: "Inbjudan har gått ut" }, 410);
  }

  // Verify the authenticated user's email matches the invited email.
  const { data: userRecord, error: userErr } =
    await adminClient.auth.admin.getUserById(userId);
  if (userErr || !userRecord?.user) {
    console.error(
      `[${FUNCTION_NAME}] user-lookup-error: ${userErr?.message ?? "no user"}`,
    );
    return jsonResponse({ error: "Användare hittades inte" }, 500);
  }

  const userEmail = userRecord.user.email?.toLowerCase() ?? "";
  if (userEmail !== invite.email.toLowerCase()) {
    return jsonResponse(
      { error: "Den här inbjudan är för en annan e-postadress" },
      403,
    );
  }

  // Insert the membership. UNIQUE (company_id, user_id) guards against
  // double-accept races.
  const { error: insertErr } = await adminClient
    .from("company_memberships")
    .insert({
      company_id: invite.company_id,
      user_id: userId,
      role: invite.role,
      invited_by: null,
    });

  if (insertErr) {
    // 23505 = unique_violation. Safe to treat as "already joined".
    const code = (insertErr as { code?: string }).code;
    if (code !== "23505") {
      console.error(`[${FUNCTION_NAME}] insert-error: ${insertErr.message}`);
      return jsonResponse({ error: "Kunde inte skapa medlemskap" }, 500);
    }
  }

  // Mark the invite accepted. Best-effort; membership is the source of truth.
  await adminClient
    .from("company_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return jsonResponse(
    {
      ok: true,
      company_id: invite.company_id,
      role: invite.role,
    },
    200,
  );
});
