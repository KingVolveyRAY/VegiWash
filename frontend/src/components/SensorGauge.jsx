import React, { useEffect, useRef, useState } from "react";

/**
 * Industrial dial gauge with SYNCED needle + fill arc (both sweep left→right as value grows).
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

  // Geometry — gauge sweeps from 7 o'clock (left-bottom) over the TOP to 5 o'clock (right-bottom)
  const radius = 70, cx = 90, cy = 90;
  const START_ANGLE = -210;  // 7 o'clock in SVG; using negative so +240° goes OVER THE TOP
  const END_ANGLE = 30;      // 5 o'clock in SVG (= START_ANGLE + 240)
  const TOTAL_SWEEP = 240;

  // Current angle sweeps from START → END as pct: 0 → 1 (visually left → top → right)
  const currentAngle = START_ANGLE + pct * TOTAL_SWEEP;   // -210 → -90 (top) → 30
  const needleAngleRad = currentAngle * Math.PI / 180;
  const needleX = cx + radius * 0.82 * Math.cos(needleAngleRad);
  const needleY = cy + radius * 0.82 * Math.sin(needleAngleRad);

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
          <div className="overline no-underline">{label}</div>
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
          {Array.from({ length: 9 }).map((_, i) => {
            const a = (START_ANGLE + (i * TOTAL_SWEEP) / 8) * Math.PI / 180;
            const r1 = radius + 4, r2 = radius + 10;
            return (
              <line key={i}
                x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)}
                x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)}
                stroke="#2a2a2c" strokeWidth="1.2" />
            );
          })}

          {/* Background track (full arc) */}
          <path d={buildArc(cx, cy, radius, START_ANGLE, END_ANGLE)}
            fill="none" stroke="#1C1C1E" strokeWidth="10" strokeLinecap="round" />

          {/* Filled arc: from START to current angle (always starts on LEFT, grows to RIGHT) */}
          {pct > 0.001 && (
            <path d={buildArc(cx, cy, radius, START_ANGLE, currentAngle)}
              fill="none" stroke={c} strokeWidth="10" strokeLinecap="round"
              style={{ transition: "d 600ms cubic-bezier(0.4,0,0.2,1), stroke 300ms",
                       filter: `drop-shadow(0 0 6px ${c}80)` }} />
          )}

          {/* Needle */}
          <line x1={cx} y1={cy} x2={needleX} y2={needleY}
            stroke={c} strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "x2 600ms cubic-bezier(0.4,0,0.2,1), y2 600ms cubic-bezier(0.4,0,0.2,1)",
                     filter: `drop-shadow(0 0 4px ${c})` }} />
          <circle cx={cx} cy={cy} r="7" fill="#060607" stroke={c} strokeWidth="2" />
          <circle cx={cx} cy={cy} r="2.5" fill={c} />
        </svg>
      </div>

      <div className="text-center -mt-1">
        <div className="font-mono tabular text-[2.5rem] leading-none font-bold text-neutral-50 no-underline"
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

/**
 * Builds an SVG arc path from `fromDeg` to `toDeg` (degrees in SVG coord space).
 * The arc is always drawn going counter-clockwise in math terms (decreasing angle),
 * so it visually goes left→right over the top. `fromDeg` must be >= `toDeg`.
 */
function buildArc(cx, cy, r, fromDeg, toDeg) {
  const start = polarToCartesian(cx, cy, r, fromDeg);
  const end = polarToCartesian(cx, cy, r, toDeg);
  const diff = Math.abs(fromDeg - toDeg);
  const largeArcFlag = diff > 180 ? "1" : "0";
  // sweep-flag = 0 → negative angle direction (counter-clockwise in SVG y-down = visually left→right over top)
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = angleDeg * Math.PI / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
