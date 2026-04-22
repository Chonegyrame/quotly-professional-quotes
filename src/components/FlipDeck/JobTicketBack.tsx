// src/components/FlipDeck/JobTicketBack.tsx
// The "back" face of every card — a physical job-ticket look.
// All per-card text comes from props; this component is pure presentation.

import { Stamp } from './atoms/Stamp';

interface JobTicketBackProps {
  idx: string;      // "01" .. "04"
  stamp: string;    // "AI · Offertmotor"
  teaser: string;   // mono quote line at the bottom of the card
}

export function JobTicketBack({ idx, stamp, teaser }: JobTicketBackProps) {
  return (
    <div
      className="relative grid h-full w-full grid-cols-2 items-stretch overflow-hidden rounded-lg border-[1.5px] border-stone-900 bg-[#fdfaf4] px-9 py-8"
      style={{ boxShadow: '3px 3px 0 #16140f' }}
    >
      {/* paper grain */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(22,20,15,0.05) 1px, transparent 1.2px)',
          backgroundSize: '14px 14px',
        }}
      />

      {/* left: stamps + big numeral + footer */}
      <div className="relative flex flex-col justify-between">
        <div className="flex gap-2">
          <Stamp>JOB · {idx} / 04</Stamp>
          <Stamp orange>QUOTLY</Stamp>
        </div>
        <div className="mt-5 font-display text-[110px] font-extrabold leading-[0.85] tracking-[-0.05em] tabular-nums text-stone-900">
          {idx}
        </div>
        <span className="font-mono text-[11px] text-stone-500">
          scrolla ↓ för att öppna
        </span>
      </div>

      {/* right: function label + teaser */}
      <div className="relative flex flex-col justify-between border-l-[1.5px] border-dashed border-stone-300 pl-8">
        <div>
          <div className="mb-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
            Funktion
          </div>
          <div className="font-display text-[22px] font-bold leading-tight tracking-tight text-stone-900">
            {stamp}
          </div>
        </div>
        <div className="mt-3.5 border-t border-dashed border-stone-300 pt-3.5 font-mono text-[13px] text-stone-700">
          "{teaser}"
        </div>
      </div>

      {/* corner hole-punch suggestion */}
      <div className="absolute right-3.5 top-3.5 flex gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-stone-300" />
        <div className="h-1.5 w-1.5 rounded-full bg-stone-300" />
      </div>
    </div>
  );
}
