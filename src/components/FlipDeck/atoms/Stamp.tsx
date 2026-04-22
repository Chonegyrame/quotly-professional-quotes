// src/components/FlipDeck/atoms/Stamp.tsx
// Quotly "rubber-stamp" placard. Use for status labels, job numbers, trade tags.
// Two variants: stone-900 (default) and orange (accent).

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils'; // adjust import to wherever your cn helper lives

interface StampProps {
  children: ReactNode;
  orange?: boolean;
  className?: string;
}

export function Stamp({ children, orange = false, className }: StampProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border-[1.5px] bg-[#fdfaf4] px-[7px] py-[3px]',
        'font-display text-[9px] font-bold uppercase leading-none tracking-[0.14em]',
        orange
          ? 'border-orange-600 text-orange-700 shadow-[1.5px_1.5px_0_theme(colors.orange.600)]'
          : 'border-stone-900 text-stone-900 shadow-[1.5px_1.5px_0_theme(colors.stone.900)]',
        className
      )}
    >
      {children}
    </span>
  );
}
