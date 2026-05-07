import React, { useEffect, useRef, useState } from "react";

/**
 * Industrial gauge using POLYLINE arc (predictable, no SVG arc weirdness).
 * - 0% → needle at 7 o'clock (left-bottom)
 * - 50% → needle at 12 o'clock (top)
 * - 100% → needle at 5 o'clock (right-bottom)
 * - Arc fills from 7 o'clock THROUGH THE TOP to current position.
 */
export default function SensorGauge({
  value = 0, min = 0, max = 100, unit = "", label = "",
  status = "info", testId, history = [], icon: Icon = null,
}) {
  const v = Math.max(min, Math.min(max, value));
  const pct = (v - min) / (max - min);
  const colors = {
    success: "#10B981", warning: "#F59E0B",
    danger: "#EF4444", info: "#06B6D4",
  };
  const c = colors[status] || colors.info;

  const cx = 90, cy = 90, r = 70;

  // Map pct (0..1) to angle in DEGREES on screen.
  // We use a custom angle convention: 0° = 12 o'clock (top), positive = clockwise.
  // 0% → -120° (7 o'clock, top-left rotated 120° CCW from top)
  // 50% → 0° (top)
  // 100% → 120° (5 o'clock, top-right rotated 120° CW from top)
  const SPAN = 240; // total degrees swept
  const angleAtPct = (p) => -120 + p * SPAN;

  // Convert "screen angle" (0=top, +CW) to SVG (x, y) on circle of radius rr around (cx, cy)
  const point = (angleDeg, rr = r) => {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + rr * Math.cos(rad), y: cy + rr * Math.sin(rad) };
  };

  const needle = point(angleAtPct(pct), r * 0.82);

  // Build polyline path with many segments (smooth arc)
  const buildPath = (fromPct, toPct, segments = 100) => {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const p = fromPct + (toPct - fromPct) * (i / segments);
      const pt = point(angleAtPct(p), r);
      pts.push(`${i === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
    }
    return pts.join(" ");
  };

  const trackPath = buildPath(0, 1);
  const fillPath = pct > 0.001 ? buildPath(0, pct) : "";

  // Animated counter
  const [display, setDisplay] = useState(v);
  const prevRef = useRef(v);
  useEffect(() => {
    const from = prevRef.current;
    const to = v;
    const start = performance.now();
    const dur = 500;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v]);

  // Tick marks
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const tickPct = i / 8;
    const inner = point(angleAtPct(tickPct), r + 4);
    const outer = point(angleAtPct(tickPct), r + 10);
    return { ...inner, x2: outer.x, y2: outer.y, key: i };
  });

  // Sparkline
  const spark = history.slice(-24);
  const sMin = spark.length ? Math.min(...spark, v) : v;
  const sMax = spark.length ? Math.max(...spark, v) : v + 1;
  const sRange = sMax - sMin || 1;
  const sparkPath = spark.map((val, i) => {
    const x = (i / Math.max(1, spark.length - 1)) * 100;
    const y = 20 - ((val - sMin) / sRange) * 18;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  const decimals = unit === "" ? 0 : (max <= 14 ? 2 : 1);

  return (
    <div className="card-flat card-flat-hover p-5" data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="text-neutral-500" />}
          <div className="overline">{label}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full blink-dot" style={{ background: c }} />
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: c }}>
            {status === "success" ? "NORMAL" : status === "warning" ? "WARN" : status === "danger" ? "ALERT" : "LIVE"}
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 rounded-full blur-2xl opacity-20"
             style={{ background: `radial-gradient(ellipse at center, ${c}, transparent 60%)` }} />
        <svg width="180" height="120" viewBox="0 0 180 120" className="relative z-10">
          {/* Tick marks */}
          {ticks.map((t) => (
            <line key={t.key} x1={t.x} y1={t.y} x2={t.x2} y2={t.y2} stroke="#2a2a2c" strokeWidth="1.2" />
          ))}

          {/* Background track */}
          <path d={trackPath} fill="none" stroke="#1C1C1E" strokeWidth="10" strokeLinecap="round" />

          {/* Filled arc */}
          {fillPath && (
            <path d={fillPath} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round"
              style={{ transition: "stroke 300ms", filter: `drop-shadow(0 0 6px ${c}80)` }} />
          )}

          {/* Needle */}
          <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
            stroke={c} strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "x2 600ms cubic-bezier(0.4,0,0.2,1), y2 600ms cubic-bezier(0.4,0,0.2,1)",
                     filter: `drop-shadow(0 0 4px ${c})` }} />
          <circle cx={cx} cy={cy} r="7" fill="#060607" stroke={c} strokeWidth="2" />
          <circle cx={cx} cy={cy} r="2.5" fill={c} />
        </svg>
      </div>

      <div className="text-center -mt-1">
        <div className="font-mono tabular text-[2.5rem] leading-none font-bold text-neutral-50"
             style={{ textShadow: `0 0 24px ${c}40`, textDecoration: "none" }}>
          {display.toFixed(decimals)}
        </div>
        <div className="text-[10px] text-neutral-500 mt-2 uppercase tracking-[0.25em] font-medium">{unit}</div>
      </div>

      {spark.length >= 2 && (
        <div className="mt-3 pt-3 border-t border-[#1E1E20]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase tracking-widest text-neutral-600">24-reading trend</span>
            <span className="text-[10px] font-mono text-neutral-500">
              {sMin.toFixed(decimals)}–{sMax.toFixed(decimals)}
            </span>
          </div>
          <svg viewBox="0 0 100 22" className="w-full h-6" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${testId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.4" />
                <stop offset="100%" stopColor={c} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={sparkPath + ` L100,22 L0,22 Z`} fill={`url(#grad-${testId})`} />
            <path d={sparkPath} fill="none" stroke={c} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}
    </div>
  );
}
