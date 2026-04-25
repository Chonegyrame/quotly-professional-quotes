import { useRef, useEffect, useState } from 'react';
import {
  motion,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import { FileText } from 'lucide-react';
import './LeadBox.css';

type Lead = {
  initials: string;
  name: string;
  trade: string;
  score: number;
  project: string;
  budget: string;
  timeline: string;
  tags: string[];
};

const LEADS: Lead[] = [
  {
    initials: 'AA',
    name: 'Anna Andersson',
    trade: 'HETT',
    score: 87,
    project: 'Badrumsrenovering · Villa, Sollentuna',
    budget: '180–220 000 kr',
    timeline: 'Före augusti (3–4 mån)',
    tags: ['Konkret budget & tidsram', 'ROT-påtänkt'],
  },
  {
    initials: 'MJ',
    name: 'Magnus Jönsson',
    trade: 'VARM',
    score: 74,
    project: 'Köksinstallation · Lägenhet, Vasastan',
    budget: '95–120 000 kr',
    timeline: 'Inom 6 veckor',
    tags: ['Ritning bifogad', 'ROT-påtänkt'],
  },
  {
    initials: 'EL',
    name: 'Elin Lindqvist',
    trade: 'LJUM',
    score: 62,
    project: 'Altanbygge · Radhus, Bromma',
    budget: '60–80 000 kr',
    timeline: 'Flexibel start, klar v.32',
    tags: ['Foton bifogade', 'Vill ha 3 offerter'],
  },
];

const DESIGN_WIDTH = 704;

function tierOf(score: number): 'high' | 'mid' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function LeadBox({ progress }: { progress: MotionValue<number> }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / DESIGN_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="leadbox-outer">
      <div className="leadbox-scaler" style={{ transform: `scale(${scale})` }}>
        <div className="leadbox">
          <div className="leadbox-header">
            <div className="leadbox-brand">
              <div className="leadbox-brand-icon">
                <FileText />
              </div>
              <span className="leadbox-brand-name">Quotly</span>
            </div>
            <div className="leadbox-badge">
              <span className="dot" />3 NEW LEADS · LIVE
            </div>
          </div>

          {LEADS.map((lead, i) => (
            <LeadRow key={lead.initials} lead={lead} index={i} progress={progress} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  index,
  progress,
}: {
  lead: Lead;
  index: number;
  progress: MotionValue<number>;
}) {
  const segStart = index / LEADS.length;
  const segEnd = (index + 1) / LEADS.length;

  // Local progress within this row's segment (0 → 1)
  const local = useTransform(progress, [segStart, segEnd], [0, 1]);

  // Slide transform: -110% → 0%, fires during local 0 → 0.65
  const translateXStr = useTransform(local, (v) => {
    const slide = clamp01(v / 0.65);
    const x = (1 - easeOutCubic(slide)) * -110;
    return `translateX(${x}%)`;
  });

  // Score fill progress: 0 → 1 during local 0.55 → 1
  const fillEased = useTransform(local, (v) => {
    const f = clamp01((v - 0.55) / 0.45);
    return easeOutCubic(f);
  });

  const [scoreNum, setScoreNum] = useState(0);
  const [barWidth, setBarWidth] = useState('0%');
  const [isIn, setIsIn] = useState(false);

  useMotionValueEvent(fillEased, 'change', (v) => {
    setScoreNum(Math.round(v * lead.score));
    setBarWidth(`${v * lead.score}%`);
  });

  useMotionValueEvent(local, 'change', (v) => {
    const slide = clamp01(v / 0.65);
    setIsIn(slide > 0.85);
  });

  const tier = tierOf(lead.score);

  return (
    <motion.div
      className={`lead ${isIn ? 'is-in' : ''}`}
      style={{ transform: translateXStr }}
    >
      <div className="lead-head">
        <div className="lead-avatar">{lead.initials}</div>
        <div>
          <div className="lead-name">{lead.name}</div>
          <div className="lead-trade">
            <span className="pip" />
            {lead.trade}
          </div>
        </div>
      </div>

      <div className="lead-score">
        <div className="score-row">
          <span className="score-label">Score</span>
          <span className={`score-num ${tier}`}>{scoreNum}</span>
        </div>
        <div className="score-bar">
          <div className={`score-fill ${tier}`} style={{ width: barWidth }} />
        </div>
      </div>

      <div className="lead-project">{lead.project}</div>

      <div className="lead-meta">
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
          </svg>
          <span className="v">{lead.budget}</span>
        </div>
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span className="v">{lead.timeline}</span>
        </div>
      </div>

      <div className="lead-tags">
        {lead.tags.map((t) => (
          <span key={t} className="tag check">
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
