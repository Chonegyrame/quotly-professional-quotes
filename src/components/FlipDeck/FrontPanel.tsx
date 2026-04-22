// src/components/FlipDeck/FrontPanel.tsx
// The "front" face of a card — shown after the flip. Two-column layout:
// text on one side, product preview on the other. Alternates sides.

import type { ReactNode } from 'react';
import { Stamp } from './atoms/Stamp';

interface FrontPanelProps {
  idx: string;
  stamp: string;
  title: string;
  body: string;
  preview: ReactNode;
  /** If true, preview sits on the left and text on the right */
  reverse?: boolean;
}

export function FrontPanel({ idx, stamp, title, body, preview, reverse = false }: FrontPanelProps) {
  return (
    <div
      className="grid h-full w-full items-center gap-14 rounded-lg border border-stone-200 bg-white px-12 py-10 shadow-sm"
      style={{ gridTemplateColumns: reverse ? '440px 1fr' : '1fr 440px' }}
    >
      <div style={{ gridColumn: reverse ? 2 : 1 }}>
        <div className="mb-3.5 flex items-center gap-2.5">
          <span className="font-mono text-[13px] text-stone-500">/{idx}</span>
          <div className="h-px max-w-[48px] flex-1 bg-stone-200" />
          <Stamp>{stamp}</Stamp>
        </div>
        <h3 className="mb-3 max-w-[420px] font-display text-[32px] font-bold leading-[1.08] tracking-[-0.02em] text-stone-900">
          {title}
        </h3>
        <p className="max-w-[440px] text-[15px] leading-[1.6] text-stone-700">
          {body}
        </p>
      </div>
      <div style={{ gridColumn: reverse ? 1 : 2 }}>{preview}</div>
    </div>
  );
}
