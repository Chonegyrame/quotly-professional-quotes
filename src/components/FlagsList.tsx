import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

type GreenFlag = { label: string; evidence: string };
type RedFlag = { label: string; evidence: string; severity: string };

type Props = {
  greenFlags?: GreenFlag[];
  redFlags?: RedFlag[];
};

function severityIcon(severity: string) {
  if (severity === 'hög') return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
}

export function FlagsList({ greenFlags = [], redFlags = [] }: Props) {
  if (!greenFlags.length && !redFlags.length) return null;

  return (
    <div className="flex gap-4 flex-wrap">
      {greenFlags.length > 0 && (
        <div className="flex-1 min-w-0 space-y-1">
          {greenFlags.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      )}
      {redFlags.length > 0 && (
        <div className="flex-1 min-w-0 space-y-1">
          {redFlags.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {severityIcon(f.severity)}
              <span className="text-xs text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
