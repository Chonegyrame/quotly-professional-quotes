import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import {
  authenticate,
  checkIpRateLimit,
  corsHeaders,
  getClientIp,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "generate-pdf";
const IP_LIMIT_PER_HOUR = 50;

const PAGE_W = 595.28; // A4 width in pts
const PAGE_H = 841.89; // A4 height in pts
const MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function fmtSEK(n: number): string {
  try {
    return new Intl.NumberFormat("sv-SE").format(Math.round(n)) + " kr";
  } catch {
    return Math.round(n).toString() + " kr";
  }
}

function fmtDate(s: string): string {
  try {
    return new Intl.DateTimeFormat("sv-SE").format(new Date(s));
  } catch {
    return s?.slice(0, 10) ?? "";
  }
}

// deno-lint-ignore no-explicit-any
type PDFFont = any;

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(test, size) > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  try {
    const { quoteId } = await req.json();
    if (!quoteId) {
      return jsonResponse({ error: "Missing quoteId" }, 400);
    }

    // Permission gate.
    // Two accepted caller types:
    //  1. The service role (used when send-quote invokes this internally) — trusted, skip further checks.
    //  2. A logged-in user — verify JWT locally, rate-limit by IP, verify row is visible via RLS.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[${FUNCTION_NAME}] 401 missing-auth ip=${getClientIp(req)}`);
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRoleCaller =
      serviceRoleKey.length > 0 && authHeader === `Bearer ${serviceRoleKey}`;

    if (!isServiceRoleCaller) {
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

      const { data: permCheck, error: permError } = await authClient
        .from("quotes")
        .select("id")
        .eq("id", quoteId)
        .maybeSingle();

      if (permError || !permCheck) {
        return jsonResponse({ error: "Quote not found" }, 404);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // deno-lint-ignore no-explicit-any
    const { data: quote, error } = await supabase
      .from("quotes")
      .select(`
        id, quote_number, customer_name, customer_email, customer_phone,
        customer_address, notes, valid_until, created_at, company_id,
        quote_items(id, description, quantity, unit_price, vat_rate, sort_order,
          quote_item_materials(id, name, quantity, unit_price, unit)
        ),
        companies(name, org_number, address, phone, email, bankgiro, logo_url)
      `)
      .eq("id", quoteId)
      .single();

    if (error || !quote) {
      return jsonResponse({ error: "Quote not found" }, 404);
    }

    // deno-lint-ignore no-explicit-any
    const company: any = (quote as any).companies ?? {};
    // deno-lint-ignore no-explicit-any
    const items: any[] = [...((quote as any).quote_items ?? [])].sort(
      // deno-lint-ignore no-explicit-any
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    // Calculate totals
    // deno-lint-ignore no-explicit-any
    const subtotal = items.reduce((s: number, i: any) => {
      // deno-lint-ignore no-explicit-any
      const mats = (i.quote_item_materials ?? []).reduce((ms: number, m: any) => ms + m.quantity * m.unit_price, 0);
      return s + i.quantity * i.unit_price + mats;
    }, 0);

    // deno-lint-ignore no-explicit-any
    const vat = items.reduce((s: number, i: any) => {
      // deno-lint-ignore no-explicit-any
      const mats = (i.quote_item_materials ?? []).reduce((ms: number, m: any) => ms + m.quantity * m.unit_price, 0);
      return s + (i.quantity * i.unit_price + mats) * ((i.vat_rate ?? 25) / 100);
    }, 0);

    const total = subtotal + vat;

    // === BUILD PDF ===
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // deno-lint-ignore no-explicit-any
    const pages: any[] = [];
    // deno-lint-ignore no-explicit-any
    let pg: any = pdfDoc.addPage([PAGE_W, PAGE_H]);
    pages.push(pg);
    let cur = PAGE_H - MARGIN; // cursor Y (pdf-lib coords: 0=bottom)

    const BLACK = rgb(0, 0, 0);
    const GRAY = rgb(0.4, 0.4, 0.4);
    const LGRAY = rgb(0.75, 0.75, 0.75);
    const BLUE = rgb(0.12, 0.33, 0.78);

    // Draw text at position
    const dt = (text: string, x: number, y: number, size: number, bold = false, color = BLACK) => {
      if (!text) return;
      pg.drawText(text, { x, y, size, font: bold ? fontB : font, color });
    };

    // Draw right-aligned text
    const dtr = (text: string, rightX: number, y: number, size: number, bold = false, color = BLACK) => {
      if (!text) return;
      const w = (bold ? fontB : font).widthOfTextAtSize(text, size);
      pg.drawText(text, { x: rightX - w, y, size, font: bold ? fontB : font, color });
    };

    // Draw horizontal line
    const hline = (y: number, thickness = 0.5, color = LGRAY) => {
      pg.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness, color });
    };

    // Add new page if needed, reset cursor
    const checkPage = (needed: number) => {
      if (cur - needed < MARGIN + 50) {
        pg = pdfDoc.addPage([PAGE_W, PAGE_H]);
        pages.push(pg);
        cur = PAGE_H - MARGIN;
      }
    };

    // === COMPANY HEADER ===
    // Try to embed logo top-right if available
    let logoDrawn = false;
    let logoBottomY = cur;
    if (company.logo_url) {
      try {
        const logoRes = await fetch(company.logo_url);
        if (logoRes.ok) {
          const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
          const logoImage = await pdfDoc.embedJpg(logoBytes).catch(() => pdfDoc.embedPng(logoBytes));
          const maxLogoH = 55;
          const maxLogoW = 180;
          const scaleH = logoImage.height > maxLogoH ? maxLogoH / logoImage.height : 1;
          const scaleW = logoImage.width > maxLogoW ? maxLogoW / logoImage.width : 1;
          const scale = Math.min(scaleH, scaleW);
          const logoW = logoImage.width * scale;
          const logoH = logoImage.height * scale;
          pg.drawImage(logoImage, {
            x: PAGE_W - MARGIN - logoW,
            y: cur - logoH,
            width: logoW,
            height: logoH,
          });
          logoBottomY = cur - logoH - 8;
          logoDrawn = true;
        }
      } catch {
        // Skip logo silently if fetch or embed fails
      }
    }

    if (company.name) {
      dt(company.name, MARGIN, cur, 17, true, BLUE);
      cur -= 20;
      const details: string[] = [];
      if (company.org_number) details.push(`Org.nr: ${company.org_number}`);
      if (company.address) details.push(company.address);
      if (company.phone) details.push(company.phone);
      if (company.email) details.push(company.email);
      if (details.length > 0) {
        const detailText = details.join("   ·   ");
        dt(detailText, MARGIN, cur, 7.5, false, GRAY);
        cur -= 14;
      }
    } else if (logoDrawn) {
      cur -= 50; // space for logo if no company name
    } else {
      cur -= 4;
    }

    // Divider under company — always below the logo
    if (logoDrawn && cur > logoBottomY) cur = logoBottomY;
    hline(cur, 1.2, rgb(0.15, 0.15, 0.15));
    cur -= 20;

    // === OFFERT TITLE + DATES ===
    dt("OFFERT", MARGIN, cur, 22, true);
    dtr(`Datum: ${fmtDate((quote as any).created_at)}`, PAGE_W - MARGIN, cur, 8.5, false, GRAY);
    cur -= 14;
    dt((quote as any).customer_name, MARGIN, cur, 10.5, false, GRAY);
    if ((quote as any).valid_until) {
      dtr(`Giltig till: ${fmtDate((quote as any).valid_until)}`, PAGE_W - MARGIN, cur, 8.5, false, GRAY);
    }
    cur -= 24;

    // === CUSTOMER BOX ===
    const custLines = [
      (quote as any).customer_name,
      (quote as any).customer_email,
      (quote as any).customer_phone,
      (quote as any).customer_address,
    ].filter(Boolean) as string[];

    const boxH = 16 + custLines.length * 13 + 8;
    const boxW = Math.min(CONTENT_W * 0.58, 280);

    pg.drawRectangle({
      x: MARGIN,
      y: cur - boxH,
      width: boxW,
      height: boxH,
      borderColor: LGRAY,
      borderWidth: 0.5,
      color: rgb(0.965, 0.965, 0.965),
    });

    cur -= 10;
    dt("KUND", MARGIN + 9, cur, 7.5, true, GRAY);
    cur -= 14;
    if (custLines[0]) {
      dt(custLines[0], MARGIN + 9, cur, 10, true);
      cur -= 13;
    }
    for (let i = 1; i < custLines.length; i++) {
      dt(custLines[i], MARGIN + 9, cur, 8.5, false, GRAY);
      cur -= 12;
    }
    cur -= 20;

    // === ITEMS SECTION HEADER ===
    checkPage(40);
    dt(`ARBETSRADER (${items.length})`, MARGIN, cur, 8, true, GRAY);
    cur -= 9;
    hline(cur, 0.5);
    cur -= 14;

    // === ITEMS ===
    for (const item of items) {
      // deno-lint-ignore no-explicit-any
      const mats: any[] = item.quote_item_materials ?? [];
      // deno-lint-ignore no-explicit-any
      const matsTotal = mats.reduce((s: number, m: any) => s + m.quantity * m.unit_price, 0);
      const laborTotal = item.quantity * item.unit_price;
      const itemTotal = laborTotal + matsTotal;

      const descLines = wrapText(item.description ?? "", fontB, 10, CONTENT_W * 0.68);
      const itemH = descLines.length * 13 + (item.unit_price > 0 ? 13 : 0) + mats.length * 12 + 16;
      checkPage(itemH);

      // Description + total
      for (let li = 0; li < descLines.length; li++) {
        dt(descLines[li], MARGIN, cur, 10, true);
        if (li === 0) {
          dtr(fmtSEK(itemTotal), PAGE_W - MARGIN, cur, 10, true);
        }
        cur -= 13;
      }

      // Labor line
      if (item.unit_price > 0) {
        dt("Arbete", MARGIN + 10, cur, 8.5, false, GRAY);
        dtr(fmtSEK(laborTotal), PAGE_W - MARGIN, cur, 8.5, false, GRAY);
        cur -= 12;
      }

      // Material lines
      for (const m of mats) {
        const matLabel = `${m.quantity} \u00d7 ${m.name}`;
        const matLines = wrapText(matLabel, font, 8.5, CONTENT_W * 0.72);
        for (let ml = 0; ml < matLines.length; ml++) {
          dt(matLines[ml], MARGIN + 18, cur, 8.5, false, GRAY);
          if (ml === 0) {
            dtr(fmtSEK(m.quantity * m.unit_price), PAGE_W - MARGIN, cur, 8.5, false, GRAY);
          }
          cur -= 12;
        }
      }

      // Item separator
      cur -= 5;
      hline(cur, 0.3, rgb(0.87, 0.87, 0.87));
      cur -= 10;
    }

    // === SUMMARY ===
    checkPage(85);
    cur -= 4;
    const sumX = PAGE_W - MARGIN - 210;

    dt("Delsumma", sumX, cur, 9, false, GRAY);
    dtr(fmtSEK(subtotal), PAGE_W - MARGIN, cur, 9, false, GRAY);
    cur -= 14;

    dt("Moms (25%)", sumX, cur, 9, false, GRAY);
    dtr(fmtSEK(vat), PAGE_W - MARGIN, cur, 9, false, GRAY);
    cur -= 10;

    // Draw summary separator spanning only the right half
    pg.drawLine({
      start: { x: sumX, y: cur },
      end: { x: PAGE_W - MARGIN, y: cur },
      thickness: 1.2,
      color: rgb(0.15, 0.15, 0.15),
    });
    cur -= 15;

    dt("Totalt inkl. moms", sumX, cur, 12, true);
    dtr(fmtSEK(total), PAGE_W - MARGIN, cur, 12, true);
    cur -= 22;

    // === NOTES ===
    if ((quote as any).notes) {
      checkPage(40);
      cur -= 4;
      hline(cur, 0.3, rgb(0.87, 0.87, 0.87));
      cur -= 14;
      const noteLines = wrapText((quote as any).notes, font, 8.5, CONTENT_W);
      for (const nl of noteLines) {
        dt(nl, MARGIN, cur, 8.5, false, GRAY);
        cur -= 12;
      }
    }

    // === PAGE FOOTERS ===
    const totalPages = pages.length;
    for (let i = 0; i < totalPages; i++) {
      const p = pages[i];
      const footerY = 28;

      const brand = "Quotly \u2014 Professional Quotes for Tradespeople";
      p.drawText(brand, { x: MARGIN, y: footerY, size: 7, font, color: rgb(0.78, 0.78, 0.78) });

      const pageLabel = `${i + 1} / ${totalPages}`;
      const plW = font.widthOfTextAtSize(pageLabel, 7.5);
      p.drawText(pageLabel, { x: (PAGE_W - plW) / 2, y: footerY, size: 7.5, font, color: LGRAY });

      if (company.bankgiro) {
        const bg = `Bankgiro: ${company.bankgiro}`;
        const bgW = font.widthOfTextAtSize(bg, 7.5);
        p.drawText(bg, { x: PAGE_W - MARGIN - bgW, y: footerY, size: 7.5, font, color: GRAY });
      }
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Offert-${((quote as any).customer_name || "offert").replace(/[^a-zA-Z0-9 _-]/g, "")}.pdf"`,
      },
    });
  } catch (err) {
    console.error(`[${FUNCTION_NAME}] unexpected:`, err);
    return jsonResponse({ error: "Internt serverfel vid PDF-generering" }, 500);
  }
});
