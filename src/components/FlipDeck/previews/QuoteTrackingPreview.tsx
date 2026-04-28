// src/components/FlipDeck/previews/QuoteTrackingPreview.tsx
// Mini UI shown on the front of card 03 (Uppföljning · PDF).
// Lifecycle stamps along the top, then a customer-activity feed below
// showing PDF download and forward — the things that prove the quote
// reached the customer and is being acted on.

import { Stamp } from '../atoms/Stamp';

export function QuoteTrackingPreview() {
  const stages: Array<{ label: string; when: string; done: boolean; live?: boolean }> = [
    { label: 'UTKAST',  when: '18/4 09:12', done: true },
    { label: 'SKICKAD', when: '18/4 09:18', done: true },
    { label: 'ÖPPNAD',  when: '18/4 11:47', done: true, live: true },
    { label: 'GODKÄND', when: '—',          done: false },
  ];

  const activity: Array<{ time: string; text: string }> = [
    { time: '11:47', text: 'öppnade länken på mobilen' },
    { time: '11:49', text: 'laddade ner PDF' },
    { time: '11:52', text: 'vidarebefordrade till maka' },
  ];

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-display text-[13px] font-bold text-stone-900">Offert #1042</div>
          <div className="font-mono text-[10px] text-stone-500">K. Andersson · Storgatan 12</div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-green-800">
          <span className="h-1.5 w-1.5 rounded-full bg-green-800" />
          öppnad 2 min sen
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {stages.map((s, i) => (
          <div key={i} className="grid grid-cols-[88px_1fr_72px] items-center gap-2.5">
            <Stamp
              orange={s.live}
              className={`justify-center ${s.done ? '' : 'opacity-25 shadow-none'}`}
            >
              {s.label}
            </Stamp>
            <div
              className={`h-px ${s.done ? 'border-t-[1.5px] border-solid border-stone-900' : 'border-t-[1.5px] border-dashed border-stone-300'}`}
            />
            <span
              className={`text-right font-mono text-[10px] ${s.done ? 'text-stone-700' : 'text-stone-400'}`}
            >
              {s.when}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-dashed border-stone-200 pt-2.5">
        <div className="mb-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Kundaktivitet
        </div>
        <div className="flex flex-col gap-1">
          {activity.map((a, i) => (
            <div key={i} className="flex items-baseline gap-2 font-mono text-[10px] text-stone-700">
              <span className="text-stone-400">↳ {a.time}</span>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
