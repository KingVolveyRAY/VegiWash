import React from "react";

export default function TickerStrip({ items = [] }) {
  if (!items.length) return null;
  // Duplicate for seamless loop
  const doubled = [...items.map((it, i) => ({ ...it, _k: `a-${i}` })),
                   ...items.map((it, i) => ({ ...it, _k: `b-${i}` }))];
  return (
    <div className="ticker h-10 flex items-center" data-testid="status-ticker">
      <div className="flex whitespace-nowrap marquee-track">
        {doubled.map((it) => (
          <div key={it._k} className="inline-flex items-center gap-2 px-6 text-[11px] font-mono uppercase tracking-[0.2em]">
            <span className="w-1 h-1 rounded-full" style={{ background: it.color || "#06B6D4" }} />
            <span className="text-neutral-500">{it.label}</span>
            <span className="text-neutral-200">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
