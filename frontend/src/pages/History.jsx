import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/sessions?limit=50").then((r) => setSessions(r.data || [])).catch(() => {});
    api.get("/sensors/history?limit=200").then((r) => setHistory(r.data || [])).catch(() => {});
  }, []);

  const chart = history.map((r) => ({
    t: new Date(r.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    ph: r.ph,
    turbidity: r.turbidity,
  }));

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <div className="overline mb-1.5">// archive</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">History</h1>
          <p className="text-neutral-500 text-sm mt-1">Riwayat sesi pencucian & data sensor.</p>
        </div>

        <div className="card-flat p-4 sm:p-5">
          <div className="overline mb-4">Long-Term Sensor Trend (Last 200 readings)</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid stroke="#1E1E1E" vertical={false} />
              <XAxis dataKey="t" stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <YAxis stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", fontFamily: "JetBrains Mono", fontSize: 11 }} />
              <Line type="monotone" dataKey="ph" stroke="#06B6D4" dot={false} strokeWidth={1.8} />
              <Line type="monotone" dataKey="turbidity" stroke="#F59E0B" dot={false} strokeWidth={1.8} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="overline mb-3">Wash Sessions</div>
          {sessions.length === 0 ? (
            <div className="card-flat p-8 text-center text-neutral-500" data-testid="no-sessions">
              Belum ada sesi pencucian.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="sessions-grid">
              {sessions.map((s) => {
                const start = new Date(s.started_at);
                const end = s.ended_at ? new Date(s.ended_at) : null;
                const dur = end ? Math.round((end - start) / 1000) : null;
                return (
                  <div key={s.id} className="card-flat p-5" data-testid={`session-card-${s.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className={s.status === "running" ? "border-cyan-500/30 text-cyan-400" : "border-emerald-500/30 text-emerald-400"}>
                        {s.status === "running" ? "RUNNING" : "COMPLETED"}
                      </Badge>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {start.toLocaleDateString("id-ID")} {start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500">pH avg</div>
                        <div className="font-mono tabular text-cyan-400 text-xl mt-0.5">
                          {s.avg_ph ? s.avg_ph.toFixed(2) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500">NTU avg</div>
                        <div className="font-mono tabular text-amber-400 text-xl mt-0.5">
                          {s.avg_turbidity ? s.avg_turbidity.toFixed(1) : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-[#262626] pt-3 flex items-center justify-between text-xs">
                      <span className="text-neutral-500 inline-flex items-center gap-1.5">
                        <Clock size={12} />{dur ? `${dur}s` : "—"}
                      </span>
                      {s.cleanliness_score != null && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <Sparkles size={12} />{s.cleanliness_score}%
                        </span>
                      )}
                    </div>
                    {s.notes && (
                      <p className="text-xs text-neutral-400 mt-3 line-clamp-2">{s.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
