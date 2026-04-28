type Tier = 'Mycket stark' | 'Stark' | 'Mellan' | 'Svag';

type Props = {
  score: number | null;
  tier: Tier | null;
  size?: number;
};

const tierColor: Record<Tier, string> = {
  'Mycket stark': '#16a34a', // green-600
  Stark: '#84cc16', // lime-500
  Mellan: '#f59e0b', // amber-500
  Svag: '#a8a29e', // stone-400
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
