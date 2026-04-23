import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  getClientIp,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "submit-intake-request";
const IP_LIMIT_PER_HOUR = 10; // leads are rarer than classifier calls

// ============================================================
// Public (anonymous) endpoint: customer submits a filled-in intake form.
// Inserts an incoming_requests row under service role (bypasses RLS).
// AI scoring (Phase 3) fires asynchronously in a separate edge function
// — not here. This endpoint only persists the submission.
// ============================================================

type SubmitPayload = {
  firmSlug?: string;
  formTemplateSubType?: string;
  freeText?: string;
  submittedAnswers?: Record<string, unknown>;
  submitter?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  photos?: string[];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const adminClient = createClient(url, serviceRoleKey);
  const ip = getClientIp(req);

  // Per-IP rate limit (10/hour — discourage abuse, allow honest retry).
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await adminClient
    .from("ai_ip_usage")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("function_name", FUNCTION_NAME)
    .gte("used_at", windowStart);

  if ((count ?? 0) >= IP_LIMIT_PER_HOUR) {
    console.error(`[${FUNCTION_NAME}] 429 ip-rate-limit ip=${ip}`);
    return jsonResponse(
      { error: "För många förfrågningar, försök igen om en timme" },
      429,
    );
  }

  let payload: SubmitPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const firmSlug = (payload.firmSlug ?? "").trim();
  if (!firmSlug) {
    return jsonResponse({ error: "firmSlug krävs" }, 400);
  }

  // Resolve firm
  const { data: firmRows, error: firmErr } = await adminClient.rpc(
    "get_company_by_slug",
    { slug: firmSlug },
  );
  if (firmErr || !firmRows?.[0]) {
    return jsonResponse({ error: "Firman hittades inte" }, 404);
  }
  const companyId = (firmRows[0] as { id: string }).id;

  // Resolve form template (optional — null means "no matching template")
  let formTemplateId: string | null = null;
  if (payload.formTemplateSubType) {
    const { data: tpl } = await adminClient
      .from("form_templates")
      .select("id")
      .eq("sub_type", payload.formTemplateSubType)
      .eq("is_active", true)
      .maybeSingle();
    formTemplateId = (tpl as { id: string } | null)?.id ?? null;
  }

  // Sanity limits — prevent abusive payloads
  const freeText = (payload.freeText ?? "").slice(0, 4000);
  const submittedAnswers = payload.submittedAnswers ?? {};
  const submitter = payload.submitter ?? {};
  const photos = Array.isArray(payload.photos)
    ? payload.photos.slice(0, 15).filter((p) => typeof p === "string")
    : [];

  // Basic email format check if provided
  if (submitter.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter.email)) {
    return jsonResponse({ error: "Ogiltig e-postadress" }, 400);
  }

  const row = {
    company_id: companyId,
    form_template_id: formTemplateId,
    submitted_answers: submittedAnswers,
    free_text: freeText || null,
    submitter_name: submitter.name?.slice(0, 200) ?? null,
    submitter_email: submitter.email?.slice(0, 200) ?? null,
    submitter_phone: submitter.phone?.slice(0, 50) ?? null,
    submitter_address: submitter.address?.slice(0, 300) ?? null,
    submitter_postal_code: submitter.postalCode?.slice(0, 20) ?? null,
    submitter_city: submitter.city?.slice(0, 100) ?? null,
    submitter_lat: typeof submitter.lat === "number" ? submitter.lat : null,
    submitter_lng: typeof submitter.lng === "number" ? submitter.lng : null,
    photos,
    status: "new" as const,
  };

  const { data: inserted, error: insertErr } = await adminClient
    .from("incoming_requests")
    .insert(row)
    .select("id")
    .single();

  if (insertErr) {
    console.error(`[${FUNCTION_NAME}] insert-error: ${insertErr.message}`);
    return jsonResponse({ error: "Kunde inte spara förfrågan" }, 500);
  }

  // Record rate-limit usage after success.
  await adminClient.from("ai_ip_usage").insert({
    ip,
    function_name: FUNCTION_NAME,
  });

  // Phase 3 hook — fire-and-forget scoring call goes here once implemented.
  // Left as a comment for now; the row is persisted with ai_verdict=null.

  return jsonResponse({ id: (inserted as { id: string }).id }, 200);
});
