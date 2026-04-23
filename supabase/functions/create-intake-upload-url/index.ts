import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  getClientIp,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "create-intake-upload-url";
const IP_LIMIT_PER_HOUR = 60; // photos are cheap; let honest customers upload many
const BUCKET = "incoming-request-photos";
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILES_PER_REQUEST = 15;

// ============================================================
// Public (anonymous) endpoint. Given a firm slug + a content-type,
// returns a short-lived signed upload URL. The customer's browser
// uses this URL to upload the photo directly to Supabase Storage.
// After upload, the caller knows the public URL of the uploaded file.
//
// This replaces the previous anon-INSERT policy on storage.objects,
// which let any client write arbitrary files to the bucket.
// ============================================================

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

  // Per-IP rate limit (60/hour). Generous — a single lead might need
  // 10 photos, and retries happen.
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
      { error: "För många uppladdningar, försök igen om en timme" },
      429,
    );
  }

  let payload: { firmSlug?: string; contentType?: string; fileName?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const firmSlug = (payload.firmSlug ?? "").trim();
  const contentType = (payload.contentType ?? "").toLowerCase().trim();
  const fileName = (payload.fileName ?? "").trim();

  if (!firmSlug) {
    return jsonResponse({ error: "firmSlug krävs" }, 400);
  }
  if (!ALLOWED_MIME.includes(contentType)) {
    return jsonResponse(
      { error: `Otillåten filtyp. Godkända: ${ALLOWED_MIME.join(", ")}` },
      400,
    );
  }

  // Verify the firm exists (prevents signing URLs for nonexistent slugs).
  const { data: firmRows, error: firmErr } = await adminClient.rpc(
    "get_company_by_slug",
    { slug: firmSlug },
  );
  if (firmErr || !firmRows?.[0]) {
    return jsonResponse({ error: "Firman hittades inte" }, 404);
  }

  // Derive file extension from content type (not from user-supplied name).
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
  };
  const ext = extMap[contentType];
  const path = `${firmSlug}/${crypto.randomUUID()}.${ext}`;

  // Generate a signed upload URL. createSignedUploadUrl is valid once + ~2h TTL.
  const { data: signed, error: signErr } = await adminClient
    .storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (signErr || !signed) {
    console.error(`[${FUNCTION_NAME}] sign-error: ${signErr?.message}`);
    return jsonResponse({ error: "Kunde inte skapa uppladdningslänk" }, 500);
  }

  // Derive the public URL the file will have once uploaded (bucket is public-read).
  const { data: pub } = adminClient.storage.from(BUCKET).getPublicUrl(path);

  // Record rate-limit usage on success.
  await adminClient.from("ai_ip_usage").insert({
    ip,
    function_name: FUNCTION_NAME,
  });

  return jsonResponse(
    {
      signedUrl: signed.signedUrl,
      token: signed.token,
      path,
      publicUrl: pub.publicUrl,
      maxFiles: MAX_FILES_PER_REQUEST,
      // Unused in the return — the fileName is just advisory for the client.
      suggestedName: fileName || `photo.${ext}`,
    },
    200,
  );
});
