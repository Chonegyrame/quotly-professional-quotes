import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  checkIpRateLimit,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "send-lead-decline";
const IP_LIMIT_PER_HOUR = 30;

type Payload = {
  requestId: string;
  recipient: string;
  message: string;
};

function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
    }

    const resendApiKey = (Deno.env.get("RESEND_API_KEY") ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!resendApiKey) {
      return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);
    }

    const auth = await authenticate(req, FUNCTION_NAME);
    if (!auth.ok) return auth.response;
    const { ip, authClient, adminClient } = auth;

    const ipResp = await checkIpRateLimit(
      adminClient,
      ip,
      FUNCTION_NAME,
      IP_LIMIT_PER_HOUR,
      60,
    );
    if (ipResp) return ipResp;

    const { requestId, recipient, message }: Payload = await req.json();
    if (!requestId || !recipient || !message?.trim()) {
      return jsonResponse(
        { error: "Invalid payload. Required: requestId, recipient, message." },
        400,
      );
    }

    // Look up the lead via the auth-scoped client so RLS enforces that the
    // caller belongs to the company that owns this request.
    const { data: request, error: requestError } = await authClient
      .from("incoming_requests")
      .select("id, company_id, status")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return jsonResponse(
        {
          error: "Kunde inte hitta förfrågan",
          details: requestError?.message,
        },
        404,
      );
    }

    if (request.status === "converted") {
      return jsonResponse(
        { error: "Den här förfrågan har redan konverterats till en offert." },
        400,
      );
    }

    // Pull firm contact info for reply-to + signature context.
    const { data: company } = await authClient
      .from("companies")
      .select("name, email")
      .eq("id", request.company_id)
      .single();

    const subject = `Svar på din förfrågan${
      company?.name ? ` från ${company.name}` : ""
    }`;
    const html = textToHtml(message.trim());

    const resendBody: Record<string, unknown> = {
      from: "onboarding@resend.dev",
      to: recipient.trim(),
      subject,
      html,
    };
    if (company?.email) {
      resendBody.reply_to = company.email;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    const resendRaw = await resendRes.text();
    let resendJson: unknown = resendRaw;
    try {
      resendJson = JSON.parse(resendRaw);
    } catch {
      // keep raw if not JSON
    }

    if (!resendRes.ok) {
      const errMsg =
        typeof resendJson === "object" &&
        resendJson !== null &&
        "message" in resendJson
          ? String((resendJson as { message?: unknown }).message ?? "Resend request failed")
          : "Resend request failed";
      return jsonResponse(
        {
          error: errMsg,
          status: resendRes.status,
          resend: resendJson,
        },
        resendRes.status,
      );
    }

    // Mark the lead as declined. RLS again enforces ownership.
    const { error: updateError } = await authClient
      .from("incoming_requests")
      .update({ status: "declined" })
      .eq("id", requestId);

    if (updateError) {
      // Email already went out — we don't want the client to retry. Log and
      // succeed; the firm can manually fix the row if status is critical.
      console.error(
        `[${FUNCTION_NAME}] status-update-failed id=${requestId} err=${updateError.message}`,
      );
    }

    return jsonResponse({ success: true, resend: resendJson }, 200);
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] unexpected:`, error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      { error: "Unexpected error while sending decline", message: errMessage },
      500,
    );
  }
});
