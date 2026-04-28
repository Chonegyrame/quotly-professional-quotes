import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import './FormSliderShowcase.css';

export type SliderTemplate = {
  id: string;
  label: string;
  description: string;
  fields: [string, string][];
};

type SlotStyle = {
  x: number;
  z: number;
  rotY: number;
  scale: number;
  opacity: number;
  zIndex: number;
};

// Slot 0 = active center; ±1 = front-flank; ±2 = back; ±3..±4 = hidden.
const SLOT_STYLES: Record<string, SlotStyle> = {
  '-4': { x: -720, z: -560, rotY:  30, scale: 0.62, opacity: 0, zIndex: 0 },
  '-3': { x: -625, z: -450, rotY:  29, scale: 0.69, opacity: 0, zIndex: 1 },
  '-2': { x: -450, z: -290, rotY:  27, scale: 0.79, opacity: 1, zIndex: 2 },
  '-1': { x: -290, z:  -95, rotY:  16, scale: 0.90, opacity: 1, zIndex: 3 },
   '0': { x:    0, z:   65, rotY:   0, scale: 1.00, opacity: 1, zIndex: 5 },
   '1': { x:  290, z:  -95, rotY: -16, scale: 0.90, opacity: 1, zIndex: 3 },
   '2': { x:  450, z: -290, rotY: -27, scale: 0.79, opacity: 1, zIndex: 2 },
   '3': { x:  625, z: -450, rotY: -29, scale: 0.69, opacity: 0, zIndex: 1 },
   '4': { x:  720, z: -560, rotY: -30, scale: 0.62, opacity: 0, zIndex: 0 },
};

function modIndex(i: number, n: number) {
  return ((i % n) + n) % n;
}

// Signed slot offset (shortest distance from active in either direction)
// so cards wrap around correctly.
function slotFor(idx: number, activeIdx: number, n: number) {
  let raw = idx - activeIdx;
  if (raw > n / 2) raw -= n;
  if (raw < -n / 2) raw += n;
  return raw;
}

function TemplateCard({
  template,
  slot,
  onClick,
  isActive,
  index,
  total,
}: {
  template: SliderTemplate;
  slot: number;
  onClick: (s: number) => void;
  isActive: boolean;
  index: number;
  total: number;
}) {
  const style = SLOT_STYLES[String(slot)] || SLOT_STYLES['4'];
  const transform = `translate(-50%, -50%) translate3d(${style.x}px, 0, ${style.z}px) rotateY(${style.rotY}deg) scale(${style.scale})`;
  const visible = style.opacity > 0;

  return (
    <button
      type="button"
      className={'slider-card' + (isActive ? ' is-active' : '')}
      style={{
        transform,
        opacity: style.opacity,
        zIndex: style.zIndex,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={() => onClick(slot)}
      aria-label={template.label}
      tabIndex={visible ? 0 : -1}
    >
      <div className="slider-card-inner">
        <div className="slider-card-stamp">FORMULÄR</div>
        <div className="slider-card-title">{template.label}</div>
        <div className="slider-card-meta">
          <span className="slider-card-meta-num">
            {index + 1}/{total}
          </span>
        </div>
        <div className="slider-card-glow" aria-hidden="true"></div>
        <div className="slider-card-corner slider-card-corner--tl"></div>
        <div className="slider-card-corner slider-card-corner--tr"></div>
        <div className="slider-card-corner slider-card-corner--bl"></div>
        <div className="slider-card-corner slider-card-corner--br"></div>
      </div>
    </button>
  );
}

function FormDetails({
  template,
  transitionKey,
}: {
  template: SliderTemplate;
  transitionKey: string;
}) {
  return (
    <div className="form-details" key={transitionKey}>
      <div className="form-details-head">
        <div className="q-stamp">FORMULÄR</div>
        <div className="form-details-title">{template.label}</div>
        <div className="form-details-desc">{template.description}</div>
      </div>
      <div className="form-details-rows">
        {template.fields.map(([k, v], i) => (
          <div
            className="form-row"
            key={k}
            style={{ ['--i' as string]: i } as CSSProperties}
          >
            <span className="form-row-key">{k}</span>
            <span className="form-row-dots" aria-hidden="true"></span>
            <span className="form-row-val">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSliderShowcase({
  templates,
  eyebrow = 'FORMULÄRBIBLIOTEK',
  headline = 'Ett formulär per jobbtyp.',
  intro = 'Quotly har formulär per jobbtyp så förfrågan samlar in exakt det som behövs. Klicka för att se vad varje formulär frågar.',
}: {
  templates: SliderTemplate[];
  eyebrow?: string;
  headline?: string;
  intro?: string;
}) {
  const [active, setActive] = useState(0);
  const n = templates.length;

  const rotateBy = (delta: number) => {
    setActive((prev) => modIndex(prev + delta, n));
  };

  // Keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') rotateBy(1);
      else if (e.key === 'ArrowLeft') rotateBy(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const cards = useMemo(
    () => templates.map((t, i) => ({ template: t, idx: i, slot: slotFor(i, active, n) })),
    [active, n, templates],
  );

  if (n === 0) return null;
  const activeTemplate = templates[active];

  return (
    <section className="slider-page">
      <div className="slider-header">
        <div className="q-stamp">{eyebrow}</div>
        <h2 className="slider-headline">{headline}</h2>
        <p className="slider-sub">{intro}</p>
      </div>

      <div className="slider-stage-wrap">
        <button
          className="slider-arrow slider-arrow--prev"
          onClick={() => rotateBy(-1)}
          aria-label="Föregående formulär"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="slider-stage">
          <div className="slider-stage-3d">
            {cards.map(({ template, idx, slot }) => (
              <TemplateCard
                key={template.id}
                template={template}
                slot={slot}
                isActive={slot === 0}
                onClick={(s) => rotateBy(s)}
                index={idx}
                total={n}
              />
            ))}
          </div>
          <div className="slider-floor"></div>
        </div>

        <button
          className="slider-arrow slider-arrow--next"
          onClick={() => rotateBy(1)}
          aria-label="Nästa formulär"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <FormDetails template={activeTemplate} transitionKey={activeTemplate.id} />
    </section>
  );
}
