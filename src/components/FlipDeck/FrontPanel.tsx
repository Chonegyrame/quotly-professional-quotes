// src/components/FlipDeck/FrontPanel.tsx
// The "front" face of a card — shown after the flip. Two-column layout:
// text on one side, product preview on the other. Alternates sides.
//
// Layout uses flexbox with items-start, so both the title text and the
// preview box anchor to the top of the card. Previously used CSS Grid
// which was centering the preview vertically inside its cell — taller
// previews (cards 2 and 4) ended up pushed down to the middle of the
// card and overflowed the bottom. Flex with items-start guarantees both
// sides start at the same vertical position regardless of content height.

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
  const textBlock = (
    <div className="flex-1 min-w-0">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="font-mono text-[13px] text-stone-500">/{idx}</span>
        <div className="h-px max-w-[48px] flex-1 bg-stone-200" />
        <Stamp>{stamp}</Stamp>
      </div>
      <h3 className="mb-3 max-w-[420px] font-display text-[32px] font-bold leading-[1.12] text-stone-900">
        {title}
      </h3>
      <p className="max-w-[440px] text-[15px] leading-[1.6] text-stone-700">
        {body}
      </p>
    </div>
  );

  const previewBlock = (
    <div className="w-[440px] flex-shrink-0">{preview}</div>
  );

  return (
    <div className="flex h-full w-full items-start gap-14 rounded-lg border border-stone-200 bg-white px-12 py-10 shadow-sm">
      {reverse ? (
        <>
          {previewBlock}
          {textBlock}
        </>
      ) : (
        <>
          {textBlock}
          {previewBlock}
        </>
      )}
    </div>
  );
}
