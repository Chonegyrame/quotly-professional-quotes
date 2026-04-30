// Fortnox API helpers shared by every fortnox-* edge function.
//
// References (verified against developer.fortnox.se as of 2026-04):
//   OAuth2 token endpoint : https://apps.fortnox.se/oauth-v1/token
//   API base              : https://api.fortnox.se/3/
//   Auth on API calls     : Authorization: Bearer {access_token}
//   Token TTL             : access_token ~1h, refresh_token rotates per refresh

import { type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const FORTNOX_TOKEN_URL = "https://apps.fortnox.se/oauth-v1/token";
export const FORTNOX_API_BASE = "https://api.fortnox.se/3";

export type FortnoxConnection = {
  company_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string;
  scope: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

function basicAuthHeader(): string {
  const id = Deno.env.get("FORTNOX_CLIENT_ID") ?? "";
  const secret = Deno.env.get("FORTNOX_CLIENT_SECRET") ?? "";
  // deno-lint-ignore no-explicit-any
  const encoder: any = btoa ?? ((s: string) => Buffer.from(s).toString("base64"));
  return `Basic ${encoder(`${id}:${secret}`)}`;
}

// Exchange an OAuth authorization code for an access + refresh token pair.
// Called once at the end of the connect flow, by fortnox-oauth-callback.
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(FORTNOX_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fortnox token exchange failed: ${res.status} ${text}`);
  }
  return await res.json() as TokenResponse;
}

// Use the stored refresh_token to mint a new access_token. Fortnox rotates
// the refresh_token each time, so the caller MUST persist both new values.
export async function refreshTokens(
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(FORTNOX_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fortnox token refresh failed: ${res.status} ${text}`);
  }
  return await res.json() as TokenResponse;
}

// Get a usable access_token for the given company, refreshing first if the
// stored one expires within the safety window (default 5 min). Concurrent
// callers near token expiry are handled via optimistic concurrency:
//
//   1. Two callers (A and B) read the same row with refresh_token X.
//   2. Both call Fortnox to refresh. Fortnox rotates X on first use, so
//      whichever call arrives second is rejected by Fortnox.
//   3. The losing call falls into the catch block and re-reads the row.
//      If the DB row's refresh_token has been replaced (the winner already
//      persisted), the loser uses the winner's fresh access_token instead
//      of failing the request.
//   4. The optimistic .eq("refresh_token", oldValue) on the persist also
//      defends against a Fortnox grace window where both refresh calls
//      succeed: only one persist wins; the other re-reads to converge.
export async function getAccessToken(
  adminClient: SupabaseClient,
  companyId: string,
  refreshIfExpiringWithinMs = 5 * 60 * 1000,
): Promise<string> {
  const { data: conn, error } = await adminClient
    .from("fortnox_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("company_id", companyId)
    .single();

  if (error || !conn) {
    throw new Error("Fortnox-anslutning saknas för detta företag.");
  }

  const expiresAt = new Date(conn.expires_at).getTime();
  const refreshAt = Date.now() + refreshIfExpiringWithinMs;

  if (expiresAt > refreshAt) {
    return conn.access_token as string;
  }

  let fresh;
  try {
    fresh = await refreshTokens(conn.refresh_token as string);
  } catch (refreshErr) {
    // Refresh might have failed because another caller already rotated the
    // refresh_token. Re-read; if the row changed, use the winner's tokens.
    const { data: maybeFresh } = await adminClient
      .from("fortnox_connections")
      .select("access_token, refresh_token, expires_at")
      .eq("company_id", companyId)
      .single();
    if (maybeFresh && maybeFresh.refresh_token !== conn.refresh_token) {
      const newExp = new Date(maybeFresh.expires_at).getTime();
      if (newExp > refreshAt) {
        return maybeFresh.access_token as string;
      }
    }
    throw refreshErr;
  }

  const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();

  const { data: updated, error: updateError } = await adminClient
    .from("fortnox_connections")
    .update({
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: newExpiresAt,
      token_type: fresh.token_type,
      scope: fresh.scope,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("refresh_token", conn.refresh_token as string)
    .select("access_token");

  if (updateError) {
    throw new Error(`Failed to persist refreshed tokens: ${updateError.message}`);
  }

  if (!updated || updated.length === 0) {
    // Another caller persisted first. Re-read to use the canonical fresh
    // tokens so the DB stays the single source of truth.
    const { data: finalConn } = await adminClient
      .from("fortnox_connections")
      .select("access_token")
      .eq("company_id", companyId)
      .single();
    if (!finalConn) {
      throw new Error("Fortnox-anslutning försvann under refresh.");
    }
    return finalConn.access_token as string;
  }

  return fresh.access_token;
}

// Wrapper around fetch() for Fortnox API calls. Adds auth + JSON headers
// and surfaces non-2xx responses as thrown errors with the body included.
export async function fortnoxFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${FORTNOX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fortnox ${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }

  return res;
}

// Persist tokens after the initial code exchange. Called by
// fortnox-oauth-callback. Upsert because reconnecting an already-connected
// company should overwrite the prior tokens, not error.
export async function upsertConnection(
  adminClient: SupabaseClient,
  companyId: string,
  tokens: TokenResponse,
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await adminClient
    .from("fortnox_connections")
    .upsert(
      {
        company_id: companyId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        token_type: tokens.token_type,
        scope: tokens.scope,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );

  if (error) {
    throw new Error(`Failed to upsert fortnox_connection: ${error.message}`);
  }
}
