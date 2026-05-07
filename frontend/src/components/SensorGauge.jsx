import React from "react";

/**
 * Industrial dial gauge.
 * Props: value, min, max, unit, label, status: 'success'|'warning'|'danger'|'info'
 */
export default function SensorGauge({ value = 0, min = 0, max = 100, unit = "", label = "", status = "info", testId }) {
  const v = Math.max(min, Math.min(max, value));
  const pct = (v - min) / (max - min);
  const angle = -120 + pct * 240; // -120deg → +120deg
  const colors = {
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#06B6D4",
  };
  const c = colors[status] || colors.info;

  // SVG arc
  const radius = 70;
  const cx = 90, cy = 90;
  const startAngle = -210;
  const endAngle = 30;
  const arcLen = (endAngle - startAngle) * (Math.PI / 180) * radius;
  const filled = pct * arcLen;

  return (
    <div className="card-flat p-4 sm:p-5" data-testid={testId}>
      <div className="overline mb-3">{label}</div>
      <div className="relative flex items-center justify-center">
        <svg width="180" height="120" viewBox="0 0 180 120">
          <path
            d={describeArc(cx, cy, radius, startAngle, endAngle)}
            fill="none" stroke="#262626" strokeWidth="10" strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, radius, startAngle, endAngle)}
            fill="none" stroke={c} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${filled} ${arcLen}`}
            style={{ transition: "stroke-dasharray 600ms ease-out, stroke 300ms" }}
          />
          {/* Needle */}
          <line x1={cx} y1={cy} x2={cx + radius * 0.85 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={cy + radius * 0.85 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke={c} strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "all 600ms ease-out" }} />
          <circle cx={cx} cy={cy} r="6" fill="#0A0A0A" stroke={c} strokeWidth="2" />
        </svg>
      </div>
      <div className="text-center mt-1">
        <div className="font-mono tabular text-3xl sm:text-4xl font-bold text-neutral-100">
          {typeof value === "number" ? value.toFixed(unit === "" ? 0 : (max <= 14 ? 2 : 1)) : "--"}
        </div>
        <div className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">{unit}</div>
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = (angleDeg) * Math.PI / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}
