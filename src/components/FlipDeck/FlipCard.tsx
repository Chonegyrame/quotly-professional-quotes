// src/components/FlipDeck/FlipCard.tsx
// Scroll-triggered 3D flip card. Starts showing BACK, flips to FRONT once the
// card's vertical center crosses 40% down the viewport. Non-reversible —
// once flipped it stays flipped.
//
// A rAF loop reads the live rotation angle and toggles `visibility` on each
// face at the 90° midpoint. This dodges a Chrome bug where backface-visibility
// alone fails when children have box-shadow/borders, while keeping a real 3D
// rotation (no opacity crossfade).

import { useEffect, useRef, useState, type ReactNode } from 'react';

export type FlipAxis = 'x' | 'y';

interface FlipCardProps {
  /** Content of the back face (what the user sees before scroll trigger) */
  back: ReactNode;
  /** Content of the front face (revealed after the flip) */
  front: ReactNode;
  /** rotateX (vertical flip, index-card style) or rotateY (horizontal) */
  axis?: FlipAxis;
  /** Flip duration in ms */
  duration?: number;
  /** Card height in px */
  height?: number;
  /**
   * Trigger point down the viewport (0..1). Card flips when its vertical
   * center crosses this line. 0.4 means "40% down from the top".
   */
  triggerAt?: number;
  className?: string;
}

export function FlipCard({
  back,
  front,
  axis = 'x',
  duration = 820,
  height = 460,
  triggerAt = 0.4,
  className,
}: FlipCardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  // Scroll observer — non-reversible.
  useEffect(() => {
    if (flipped) return;
    const el = hostRef.current;
    if (!el) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      const cardCenter = r.top + r.height / 2;
      const trigger = window.innerHeight * (1 - triggerAt);
      if (cardCenter <= trigger) setFlipped(true);
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [flipped, triggerAt]);

  // rAF: toggle face visibility at the 90° midpoint.
  useEffect(() => {
    const inner = innerRef.current;
    const back = backRef.current;
    const front = frontRef.current;
    if (!inner || !back || !front) return;

    let raf = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      const cs = getComputedStyle(inner);
      const mt = cs.transform;
      let angle = flipped ? 180 : 0;
      if (mt && mt.startsWith('matrix3d')) {
        const nums = mt.slice(9, -1).split(',').map(parseFloat);
        angle = axis === 'x'
          ? Math.atan2(nums[6], nums[5]) * 180 / Math.PI
          : Math.atan2(-nums[2], nums[0]) * 180 / Math.PI;
      }
      const a = ((angle % 360) + 360) % 360;
      const frontVisible = a > 90 && a < 270;
      back.style.visibility = frontVisible ? 'hidden' : 'visible';
      front.style.visibility = frontVisible ? 'visible' : 'hidden';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [axis, flipped]);

  const rot = axis === 'x' ? 'rotateX' : 'rotateY';

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ perspective: 1800, height }}
    >
      <div
        ref={innerRef}
        className="relative h-full w-full"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transition: `transform ${duration}ms cubic-bezier(0.33, 0, 0.25, 1)`,
          transform: flipped ? `${rot}(180deg)` : `${rot}(0deg)`,
          willChange: 'transform',
        }}
      >
        <div
          ref={backRef}
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            pointerEvents: flipped ? 'none' : 'auto',
          }}
        >
          {back}
        </div>
        <div
          ref={frontRef}
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: `${rot}(180deg)`,
            visibility: 'hidden',
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          {front}
        </div>
      </div>
    </div>
  );
}
