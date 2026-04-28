// src/components/Footer.tsx
// Shared site footer. Used on the landing page and all marketing/legal
// pages. Covers Swedish e-handelslag § 8 reachability (företagsnamn,
// org.nr, adress, e-post, momsnummer) and GDPR/LEK link-out points.
//
// NOTE: Org.nr, VAT, address, and email are placeholders. Swap these
// for real values once Quotly AB is registered.

import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50/70">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-12 sm:gap-8">
          {/* Brand block */}
          <div className="col-span-2 sm:col-span-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-heading text-xl font-bold text-foreground">Quotly</span>
            </div>
            <p className="max-w-[320px] text-sm leading-relaxed text-stone-600">
              Offertverktyget för hantverkare som vill jobba smartare.
            </p>
          </div>

          {/* Quotly */}
          <div className="col-span-1 sm:col-span-3">
            <div className="mb-4 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
              Quotly
            </div>
            <ul className="space-y-2.5 text-sm text-stone-900">
              <li><Link to="/pris" className="transition-colors hover:text-orange-700">Priser</Link></li>
              <li><a href="#" className="transition-colors hover:text-orange-700">Blogg</a></li>
              <li><a href="#" className="transition-colors hover:text-orange-700">Lär dig mer</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1 sm:col-span-4">
            <div className="mb-4 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
              Support
            </div>
            <ul className="space-y-2.5 text-sm text-stone-900">
              <li>
                <a href="mailto:quotly.se@gmail.com" className="transition-colors hover:text-orange-700">
                  quotly.se@gmail.com
                </a>
              </li>
              <li><Link to="/fragor-och-svar" className="transition-colors hover:text-orange-700">Frågor och svar</Link></li>
              <li><Link to="/anvandarvillkor" className="transition-colors hover:text-orange-700">Användarvillkor</Link></li>
              <li><a href="#" className="transition-colors hover:text-orange-700">Integritetspolicy</a></li>
              <li><a href="#" className="transition-colors hover:text-orange-700">Cookie-inställningar</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-stone-200 pt-6 font-mono text-xs text-stone-500 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>© {new Date().getFullYear()} Quotly AB</span>
            <span className="text-stone-300">·</span>
            <span>Org.nr 559123-4567</span>
            <span className="text-stone-300">·</span>
            <span>Storgatan 12, 111 22 Stockholm</span>
          </div>
          <div>Byggt i Sverige</div>
        </div>
      </div>
    </footer>
  );
}
