import React from "react";
import { Droplet, Sun, Wind, CheckCircle2, Circle } from "lucide-react";

const STAGES = [
  { key: "washing", label: "Pencucian", icon: Droplet, color: "#06B6D4" },
  { key: "sterilizing", label: "Sterilisasi UV", icon: Sun, color: "#A855F7" },
  { key: "drying", label: "Pengeringan", icon: Wind, color: "#10B981" },
  { key: "done", label: "Selesai", icon: CheckCircle2, color: "#22D3EE" },
];

const ORDER = ["idle", "washing", "sterilizing", "drying", "done"];

export default function PipelineStages({ stage = "idle", onAdvance, onReset }) {
  const currentIdx = ORDER.indexOf(stage);

  return (
    <div className="card-flat p-5" data-testid="pipeline-stages">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="overline mb-1">// pipeline workflow</div>
          <h3 className="font-display text-xl font-black tracking-tight">Tahapan Proses</h3>
        </div>
        <div className="flex gap-2">
          {stage !== "idle" && stage !== "done" && (
            <button onClick={onAdvance}
              data-testid="advance-pipeline-btn"
              className="px-4 h-9 rounded-md bg-cyan-500 hover:bg-cyan-400 text-[#060607] font-bold text-xs uppercase tracking-widest transition-colors">
              Lanjut Tahap →
            </button>
          )}
          {stage !== "idle" && (
            <button onClick={onReset}
              data-testid="reset-pipeline-btn"
              className="px-3 h-9 rounded-md border border-[#262628] hover:border-red-500/40 text-neutral-400 hover:text-red-400 text-xs uppercase tracking-widest transition-colors">
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-5 right-5 h-px bg-[#262628]" />
        {/* Active line (animated width) */}
        <div className="absolute top-5 left-5 h-px transition-all duration-700"
             style={{
               width: currentIdx <= 1 ? "0%" :
                      currentIdx === 2 ? "33%" :
                      currentIdx === 3 ? "66%" : "calc(100% - 40px)",
               background: "linear-gradient(90deg, #06B6D4, #A855F7, #10B981, #22D3EE)",
               boxShadow: "0 0 12px rgba(6, 182, 212, 0.5)",
             }} />

        <div className="relative flex justify-between">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const isActive = stage === s.key;
            const isPast = currentIdx > i + 1;
            const isPending = currentIdx <= i;

            return (
              <div key={s.key} className="flex flex-col items-center gap-2 flex-1">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all relative ${
                  isActive ? "scale-110" : ""
                }`}
                  style={{
                    background: isActive ? `${s.color}15` : isPast ? `${s.color}10` : "#0A0A0B",
                    borderColor: isActive || isPast ? s.color : "#262628",
                    boxShadow: isActive ? `0 0 20px ${s.color}60, inset 0 0 10px ${s.color}20` : "none",
                  }}>
                  {isActive && <span className="absolute inset-0 rounded-full pulse-ring" style={{ boxShadow: `0 0 0 0 ${s.color}80` }} />}
                  <Icon size={16} style={{ color: isActive || isPast ? s.color : "#525252" }} />
                </div>
                <div className="text-center">
                  <div className={`text-[11px] uppercase tracking-widest font-mono font-medium transition-colors ${
                    isActive ? "" : isPast ? "text-neutral-300" : "text-neutral-600"
                  }`} style={{ color: isActive ? s.color : undefined }}>
                    {s.label}
                  </div>
                  {isActive && (
                    <div className="text-[9px] font-mono text-neutral-500 mt-1 flex items-center justify-center gap-1">
                      <span className="w-1 h-1 rounded-full blink-dot" style={{ background: s.color }} />
                      AKTIF
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stage === "idle" && (
        <div className="mt-5 p-3 rounded-md bg-[#0A0A0B] border border-[#1A1A1C] text-xs text-neutral-500 text-center">
          Klik <strong className="text-cyan-400">MULAI PENCUCIAN</strong> untuk memulai pipeline otomatis
        </div>
      )}
    </div>
  );
}
