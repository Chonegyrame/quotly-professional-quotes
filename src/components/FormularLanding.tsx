import { useState, useMemo } from 'react';
import { Zap, Droplets, Hammer, Wrench, ChevronRight, Loader2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFormTemplates, FormTrade, FormTemplateRow } from '@/hooks/useFormTemplates';

const TRADE_META: Record<FormTrade, { label: string; icon: typeof Zap; bg: string; iconColor: string }> = {
  el: { label: 'El', icon: Zap, bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200', iconColor: 'text-amber-600' },
  vvs: { label: 'VVS', icon: Droplets, bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200', iconColor: 'text-blue-600' },
  bygg: { label: 'Bygg', icon: Hammer, bg: 'bg-stone-50 hover:bg-stone-100 border-stone-200', iconColor: 'text-stone-700' },
  general: { label: 'Övrigt', icon: Wrench, bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200', iconColor: 'text-slate-600' },
};

const TRADE_ORDER: FormTrade[] = ['el', 'vvs', 'bygg', 'general'];

type TestMethod = 'keyword' | 'tie-ai' | 'ai-fallback';

interface TestEntry {
  template: FormTemplateRow;
  hits: string[];
}

interface TestResult {
  method: TestMethod;
  // Single-winner cases hold one entry. Tied cases hold all tied entries.
  // ai-fallback case holds the assumed general/allman fallback (if found).
  entries: TestEntry[];
  reason: string;
}

interface Props {
  onSelectTrade: (trade: FormTrade) => void;
  onPreview: (template: FormTemplateRow) => void;
}

export function FormularLanding({ onSelectTrade, onPreview }: Props) {
  const { data: templates = [], isLoading } = useFormTemplates();
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const counts = useMemo(() => {
    const c: Record<FormTrade, number> = { el: 0, vvs: 0, bygg: 0, general: 0 };
    for (const t of templates) {
      if (t.is_active) c[t.trade] += 1;
    }
    return c;
  }, [templates]);

  function runTest() {
    if (!testInput.trim()) return;
    setIsTesting(true);

    // Mirror the edge function logic: keyword match → tie detection → AI step
    // (which we can't actually run client-side, so we surface the ambiguity).
    const text = testInput.toLowerCase();
    const active = templates.filter((t) => t.is_active);

    const matches: TestEntry[] = [];
    for (const t of active) {
      const hits = (t.trigger_keywords ?? []).filter((kw) => text.includes(kw.toLowerCase()));
      if (hits.length > 0) matches.push({ template: t, hits });
    }
    // Custom > global, then more hits = better.
    matches.sort((a, b) => {
      if (a.template.source !== b.template.source) {
        return a.template.source === 'custom' ? -1 : 1;
      }
      return b.hits.length - a.hits.length;
    });

    setTimeout(() => {
      if (matches.length > 0) {
        const top = matches[0];
        const tied = matches.filter(
          (m) =>
            m.template.source === top.template.source &&
            m.hits.length === top.hits.length
        );
        if (tied.length === 1) {
          setTestResult({
            method: 'keyword',
            entries: [top],
            reason: `Matchade triggerord: ${top.hits.map((h) => `"${h}"`).join(', ')}`,
          });
        } else {
          setTestResult({
            method: 'tie-ai',
            entries: tied,
            reason: `${tied.length} formulär matchade lika. AI väljer mellan dem baserat på kundens beskrivning.`,
          });
        }
      } else {
        const fallback =
          templates.find(
            (t) => t.is_active && t.trade === 'general' && t.sub_type === 'allman'
          ) ?? null;
        setTestResult({
          method: 'ai-fallback',
          entries: fallback ? [{ template: fallback, hits: [] }] : [],
          reason:
            'Inga triggerord matchade. AI klassificerar baserat på beskrivningen, annars faller den tillbaka till den allmänna mallen.',
        });
      }
      setIsTesting(false);
    }, 200);
  }

  const methodBadge = (method: TestMethod) => {
    if (method === 'keyword') return { text: 'Triggerord', className: 'bg-emerald-100 text-emerald-700' };
    if (method === 'tie-ai') return { text: 'Lika — AI avgör', className: 'bg-amber-100 text-amber-700' };
    return { text: 'AI-fallback', className: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="space-y-4">
      {/* Test classification box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testa kundinput</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Skriv en exempelbeskrivning som en kund skulle kunna fylla i, så ser du vilket formulär som matchar.
          </p>
          <div className="flex gap-2">
            <Input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runTest();
              }}
              placeholder='T.ex. "ska byta vägguttag i köket"'
              className="flex-1"
            />
            <Button
              onClick={runTest}
              disabled={!testInput.trim() || isTesting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testa'}
            </Button>
          </div>

          {testResult && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-2">
              {(() => {
                const badge = methodBadge(testResult.method);
                return (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.text}
                    </span>
                    <span className="text-muted-foreground">{testResult.reason}</span>
                  </div>
                );
              })()}
              {testResult.entries.length > 0 && (
                <ul className="space-y-1.5">
                  {testResult.entries.map(({ template, hits }) => (
                    <li
                      key={template.id}
                      className="flex items-center gap-2 rounded-md bg-background border border-border/60 px-2.5 py-1.5"
                    >
                      <span className="font-medium text-foreground">{template.name}</span>
                      {hits.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {hits.map((h) => `"${h}"`).join(', ')}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreview(template)}
                        className="ml-auto h-7 gap-1.5 text-accent hover:text-accent hover:bg-accent/10"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspektera
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4 trade cards */}
      <div className="grid grid-cols-2 gap-3">
        {TRADE_ORDER.map((trade) => {
          const meta = TRADE_META[trade];
          const Icon = meta.icon;
          const count = counts[trade];
          return (
            <button
              key={trade}
              onClick={() => onSelectTrade(trade)}
              className={`text-left rounded-xl border p-4 transition ${meta.bg}`}
            >
              <div className="flex items-start justify-between">
                <div className={`h-10 w-10 rounded-lg bg-white/60 flex items-center justify-center ${meta.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-3">
                <div className="font-heading font-bold text-lg text-foreground">{meta.label}</div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? '…' : count === 1 ? '1 formulär' : `${count} formulär`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
