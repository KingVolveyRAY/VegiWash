import React, { useEffect, useState } from "react";

/** Animated bar equalizer — visualizes real-time sensor activity */
export default function LiveWaveform({ active = false, bars = 24, color = "#06B6D4" }) {
  const [heights, setHeights] = useState(() => Array.from({ length: bars }, () => 0.3 + Math.random() * 0.7));

  useEffect(() => {
    if (!active) {
      setHeights(Array.from({ length: bars }, () => 0.15));
      return;
    }
    const id = setInterval(() => {
      setHeights((prev) => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 180);
    return () => clearInterval(id);
  }, [active, bars]);

  return (
    <div className="flex items-end gap-[3px] h-10">
      {heights.map((h, i) => (
        <div
          key={`bar-${i}`}
          className="w-[3px] rounded-sm"
          style={{
            height: `${h * 100}%`,
            background: color,
            opacity: active ? 0.7 + h * 0.3 : 0.2,
            transition: "height 180ms cubic-bezier(0.4,0,0.2,1), opacity 300ms",
            boxShadow: active ? `0 0 6px ${color}90` : "none",
          }}
        />
      ))}
    </div>
  );
}
