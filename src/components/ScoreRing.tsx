type Props = {
  score: number | null;
  tier: 'Hett' | 'Ljummet' | 'Kallt' | null;
  size?: number;
};

const tierColor = {
  Hett: '#22c55e',
  Ljummet: '#eab308',
  Kallt: '#ef4444',
};

export function ScoreRing({ score, tier, size = 56 }: Props) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = score != null ? (score / 100) * circumference : 0;
  const color = tier ? tierColor[tier] : '#94a3b8';
  const cx = size / 2;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={6} />
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - fill}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-bold"
        style={{ color }}
      >
        {score != null ? score : '–'}
      </span>
    </div>
  );
}
