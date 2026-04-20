import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// CORS headers shared by every function.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export type AuthSuccess = {
  ok: true;
  userId: string;
  token: string;
  ip: string;
  authHeader: string;
  authClient: SupabaseClient;
  adminClient: SupabaseClient;
};

export type AuthFailure = { ok: false; response: Response };

// Verify JWT locally via JWKS (supabase.auth.getClaims) — no auth-server roundtrip.
// Replaces the old getUser() pattern. Required on projects with asymmetric JWT keys
// because the edge functions gateway cannot verify ES256 and must run with
// verify_jwt = false (see https://supabase.com/docs/guides/functions/auth).
export async function authenticate(
  req: Request,
  functionName: string,
): Promise<AuthSuccess | AuthFailure> {
  const ip = getClientIp(req);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error(`[${functionName}] 401 missing-auth ip=${ip}`);
    return {
      ok: false,
      response: jsonResponse({ error: "Missing authorization header" }, 401),
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await authClient.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) {
    console.error(
      `[${functionName}] 401 invalid-jwt ip=${ip} err=${error?.message ?? "no-claims"}`,
    );
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const adminClient = createClient(url, serviceRoleKey);

  return { ok: true, userId, token, ip, authHeader, authClient, adminClient };
}

// Per-IP rate limit. Records the call on success.
// Returns a 429 Response if the limit is exceeded, otherwise null.
export async function checkIpRateLimit(
  adminClient: SupabaseClient,
  ip: string,
  functionName: string,
  limit: number,
  windowMinutes: number,
): Promise<Response | null> {
  if (ip === "unknown") {
    // Can't enforce per-IP if we can't identify the caller; let it through.
    // (Supabase edge runtime always provides x-forwarded-for in practice.)
    return null;
  }

  const windowStart = new Date(
    Date.now() - windowMinutes * 60 * 1000,
  ).toISOString();

  const { count, error } = await adminClient
    .from("ai_ip_usage")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("function_name", functionName)
    .gte("used_at", windowStart);

  if (error) {
    console.error(`[${functionName}] ip-limit query-error: ${error.message}`);
    return null; // fail open to avoid blocking real users on infra hiccups
  }

  if ((count ?? 0) >= limit) {
    console.error(
      `[${functionName}] 429 ip-rate-limit ip=${ip} count=${count} limit=${limit}`,
    );
    return jsonResponse(
      { error: "För många förfrågningar från din IP, försök igen senare" },
      429,
    );
  }

  await adminClient
    .from("ai_ip_usage")
    .insert({ ip, function_name: functionName });
  return null;
}

// Global 24h ceiling across AI-cost-incurring functions.
// Circuit breaker for runaway abuse that somehow cleared per-user + per-IP limits.
export async function checkGlobalAiCeiling(
  adminClient: SupabaseClient,
  limit: number,
  functionName: string,
): Promise<Response | null> {
  const windowStart = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { count, error } = await adminClient
    .from("ai_ip_usage")
    .select("*", { count: "exact", head: true })
    .in("function_name", ["generate-quote", "extract-keywords"])
    .gte("used_at", windowStart);

  if (error) {
    console.error(
      `[${functionName}] global-ceiling query-error: ${error.message}`,
    );
    return null;
  }

  if ((count ?? 0) >= limit) {
    console.error(
      `[${functionName}] 503 global-ceiling count=${count} limit=${limit}`,
    );
    return jsonResponse(
      { error: "AI-tjänsten är tillfälligt otillgänglig, försök igen senare" },
      503,
    );
  }

  return null;
}
