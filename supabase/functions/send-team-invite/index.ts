import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "send-team-invite";

// Resolve the app origin for the invite link. Prefer APP_URL secret, fall back
// to the calling Origin header (useful for localhost dev). Origin spoofing
// would only harm the sender themselves, not a third party.
function resolveAppUrl(req: Request): string {
  const fromEnv = Deno.env.get("APP_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  return "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

  let payload: { company_id?: string; email?: string; role?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const companyId = payload.company_id?.trim();
  const email = payload.email?.trim().toLowerCase();
  const role = payload.role?.trim();

  if (!companyId || !email || !role) {
    return jsonResponse(
      { error: "Missing required fields: company_id, email, role" },
      400,
    );
  }

  if (!isValidEmail(email)) {
    return jsonResponse({ error: "Invalid email format" }, 400);
  }

  if (role !== "admin" && role !== "member") {
    return jsonResponse(
      { error: "Invalid role. Must be 'admin' or 'member'" },
      400,
    );
  }

  // Verify caller is owner or admin of the company.
  const { data: callerMembership, error: memErr } = await adminClient
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memErr) {
    console.error(`[${FUNCTION_NAME}] membership-lookup-error: ${memErr.message}`);
    return jsonResponse({ error: "Database error" }, 500);
  }

  if (!callerMembership) {
    return jsonResponse({ error: "Not a member of this company" }, 403);
  }

  if (callerMembership.role !== "owner" && callerMembership.role !== "admin") {
    return jsonResponse(
      { error: "Only owners and admins can invite members" },
      403,
    );
  }

  // Block inviting someone who is already a member (by email → user id).
  // We can only check this if the user already exists in auth.users.
  const { data: existingUser } = await adminClient
    .from("company_memberships")
    .select("id, user_id")
    .eq("company_id", companyId);

  if (existingUser && existingUser.length > 0) {
    const userIds = existingUser.map((m) => m.user_id);
    const { data: emailMatches } = await adminClient.auth.admin.listUsers();
    const alreadyMember = emailMatches?.users.some(
      (u) => u.email?.toLowerCase() === email && userIds.includes(u.id),
    );
    if (alreadyMember) {
      return jsonResponse(
        { error: "Den här e-postadressen är redan medlem i företaget" },
        409,
      );
    }
  }

  // Block duplicate pending invites.
  const { data: pending } = await adminClient
    .from("company_invites")
    .select("id")
    .eq("company_id", companyId)
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (pending) {
    return jsonResponse(
      { error: "En aktiv inbjudan finns redan för denna e-postadress" },
      409,
    );
  }

  // Fetch company name for the email.
  const { data: company } = await adminClient
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  const companyName = company?.name ?? "ditt företag";

  // Generate a cryptographically random token. randomUUID gives 122 bits
  // which is well above the security threshold for unguessable tokens.
  const token = crypto.randomUUID();

  const { data: invite, error: insertErr } = await adminClient
    .from("company_invites")
    .insert({
      company_id: companyId,
      email,
      role,
      token,
      invited_by: userId,
    })
    .select("id, token, expires_at")
    .single();

  if (insertErr || !invite) {
    console.error(
      `[${FUNCTION_NAME}] insert-error: ${insertErr?.message ?? "no row"}`,
    );
    return jsonResponse({ error: "Kunde inte skapa inbjudan" }, 500);
  }

  // Send the invite email via Resend.
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error(`[${FUNCTION_NAME}] missing RESEND_API_KEY`);
    return jsonResponse(
      { error: "Email service not configured" },
      500,
    );
  }

  const appUrl = resolveAppUrl(req);
  const inviteLink = `${appUrl}/invite/${invite.token}`;
  const roleLabel = role === "admin" ? "administratör" : "medlem";

  const subject = `Du är inbjuden till ${companyName} på Quotly`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">Välkommen till ${companyName}</h2>
      <p>Du har blivit inbjuden att gå med i <strong>${companyName}</strong> på Quotly som <strong>${roleLabel}</strong>.</p>
      <p>Klicka på länken nedan för att acceptera inbjudan:</p>
      <p style="margin: 32px 0;">
        <a href="${inviteLink}"
           style="background: #ea580c; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Acceptera inbjudan
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">
        Länken är giltig i 7 dagar. Om knappen inte fungerar, kopiera denna URL:<br>
        <span style="word-break: break-all;">${inviteLink}</span>
      </p>
    </div>
  `;
  const text =
    `Du är inbjuden till ${companyName} på Quotly som ${roleLabel}.\n\n` +
    `Acceptera inbjudan här: ${inviteLink}\n\n` +
    `Länken är giltig i 7 dagar.`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: email,
      subject,
      html,
      text,
    }),
  });

  if (!resendResponse.ok) {
    const body = await resendResponse.text();
    console.error(
      `[${FUNCTION_NAME}] resend-failed status=${resendResponse.status} body=${body}`,
    );
    // We keep the invite row — the admin can resend. Surface a non-fatal warning.
    return jsonResponse(
      {
        ok: true,
        warning: "Inbjudan skapad men e-posten kunde inte skickas",
        invite_id: invite.id,
      },
      200,
    );
  }

  return jsonResponse({ ok: true, invite_id: invite.id }, 200);
});
