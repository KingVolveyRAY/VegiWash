import React, { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import SensorGauge from "../components/SensorGauge";
import LiveWaveform from "../components/LiveWaveform";
import TickerStrip from "../components/TickerStrip";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid } from "recharts";
import { Droplet, Gauge, Power, Sparkles, ArrowDownToLine, Loader2, Activity, AlertTriangle, FlaskConical, Waves, Wand2 } from "lucide-react";
import { toast } from "sonner";

const POLL_INTERVAL = 2000;

export default function Dashboard() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [control, setControl] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [thrOpen, setThrOpen] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const [l, h, c] = await Promise.all([
          api.get("/sensors/latest"),
          api.get("/sensors/history?limit=40"),
          api.get("/control"),
        ]);
        setLatest(l.data || null);
        setHistory(h.data || []);
        setControl(c.data || null);
      } catch (e) {
        console.error("Dashboard polling failed:", e);
      }
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // load any running session
    api.get("/sessions?limit=1").then((r) => {
      const s = r.data?.[0];
      if (s && s.status === "running") setActiveSession(s);
    }).catch((e) => console.error("Failed to load active session:", e));
  }, []);

  const updateControl = async (patch) => {
    try {
      const r = await api.post("/control", patch);
      setControl(r.data);
    } catch (e) { toast.error("Gagal update kontrol"); }
  };

  const startSession = async () => {
    try {
      const r = await api.post("/sessions/start");
      setActiveSession(r.data);
      await updateControl({ motor_speed: 60, nozzle_on: true });
      toast.success("Sesi pencucian dimulai");
    } catch (e) { toast.error("Gagal memulai sesi"); }
  };

  const stopSession = async () => {
    if (!activeSession) return;
    try {
      const r = await api.post(`/sessions/${activeSession.id}/stop`);
      setActiveSession(null);
      await updateControl({ motor_speed: 0, nozzle_on: false });
      toast.success("Sesi selesai. Skor pH avg: " + (r.data?.avg_ph?.toFixed(2) ?? "—"));
    } catch (e) { toast.error("Gagal menghentikan sesi"); }
  };

  const pushServo = async () => {
    await updateControl({ servo_push: true });
    setTimeout(() => updateControl({ servo_push: false }), 1500);
    toast.info("Servo mendorong hasil cucian…");
  };

  const onSnapshot = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setSnapshot(dataUrl);
      setAnalyzing(true);
      setAnalysis(null);
      try {
        const r = await api.post("/ai/analyze-vegetable", {
          image_base64: dataUrl,
          session_id: activeSession?.id,
        });
        setAnalysis(r.data);
        toast.success(`Skor kebersihan: ${r.data.cleanliness_score}/100`);
      } catch (e) {
        toast.error(e.response?.data?.detail || "Analisa gagal");
      } finally { setAnalyzing(false); }
    };
    reader.readAsDataURL(file);
  };

  const ph = latest?.ph ?? 0;
  const tu = latest?.turbidity ?? 0;
  const phStatus = ph < (control?.threshold_ph_min ?? 6) || ph > (control?.threshold_ph_max ?? 8.5) ? "danger" : "success";
  const tuStatus = tu > (control?.threshold_turbidity ?? 50) ? "danger" : tu > 25 ? "warning" : "success";

  const chartData = history.map((r) => ({
    t: new Date(r.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    ph: r.ph,
    turbidity: r.turbidity,
    motor: r.motor_speed,
  }));

  return (
    <div className="min-h-screen bg-[#060607] mesh-bg">
      <Header />
      <TickerStrip items={[
        { label: "pH", value: ph.toFixed(2), color: "#06B6D4" },
        { label: "TURBIDITY", value: `${tu.toFixed(1)} NTU`, color: "#F59E0B" },
        { label: "MOTOR", value: `${control?.motor_speed ?? 0}%`, color: "#10B981" },
        { label: "NOZZLE", value: control?.nozzle_on ? "ON" : "OFF", color: control?.nozzle_on ? "#10B981" : "#525252" },
        { label: "MODE", value: control?.auto_mode ? "AUTO" : "MANUAL", color: control?.auto_mode ? "#06B6D4" : "#737373" },
        { label: "SESSION", value: activeSession ? "RUNNING" : "IDLE", color: activeSession ? "#10B981" : "#525252" },
        { label: "ESP32", value: "CONNECTED", color: "#10B981" },
        { label: "SYS", value: new Date().toLocaleTimeString("id-ID"), color: "#06B6D4" },
      ]} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero status bar */}
        <div className="relative card-flat p-5 sm:p-7 overflow-hidden float-up">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-10 blur-3xl bg-cyan-500" />
          <div className="absolute inset-0 dot-grid opacity-30" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all ${
                  activeSession ? "border-cyan-500 glow-pulse" : "border-[#262628]"
                }`}>
                  <Waves className={activeSession ? "text-cyan-400" : "text-neutral-600"} size={22} />
                </div>
                {activeSession && <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full blink-dot" />}
              </div>
              <div>
                <div className="overline mb-1">// live console · agriflow v1.0</div>
                <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-none">
                  {activeSession ? "Mencuci..." : "Dashboard"}
                </h1>
                <p className="text-neutral-500 text-sm mt-1.5">
                  {activeSession
                    ? <><span className="text-cyan-400 font-mono">▲ SESSION ACTIVE</span> · telemetry polling every 2s</>
                    : "Real-time telemetry · mesin standby"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LiveWaveform active={!!activeSession || (control?.motor_speed ?? 0) > 0} />
              {!activeSession ? (
                <Button onClick={startSession} data-testid="start-session-btn"
                  className="relative bg-cyan-500 hover:bg-cyan-400 text-[#060607] font-bold h-12 px-6 tracking-wide overflow-hidden group">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Activity size={16} className="mr-2" />MULAI PENCUCIAN
                </Button>
              ) : (
                <Button onClick={stopSession} variant="destructive" data-testid="stop-session-btn"
                  className="h-12 px-6 font-bold tracking-wide">
                  <Power size={16} className="mr-2" />STOP & SIMPAN
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* KPI gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="float-up float-up-1">
            <SensorGauge value={ph} min={0} max={14} unit="pH" label="Water pH Level"
              status={phStatus} testId="gauge-ph"
              history={history.map((r) => r.ph)} icon={FlaskConical} />
          </div>
          <div className="float-up float-up-2">
            <SensorGauge value={tu} min={0} max={150} unit="NTU" label="Turbidity"
              status={tuStatus} testId="gauge-turbidity"
              history={history.map((r) => r.turbidity)} icon={Droplet} />
          </div>
          <div className="float-up float-up-3">
            <SensorGauge value={analysis?.cleanliness_score ?? 0} min={0} max={100} unit="% CLEAN"
              label="AI Cleanliness Score"
              status={(analysis?.cleanliness_score ?? 0) >= 80 ? "success" : (analysis?.cleanliness_score ?? 0) >= 50 ? "warning" : "info"}
              testId="gauge-cleanliness" icon={Sparkles} />
          </div>
        </div>

        {/* Camera + Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Camera */}
          <div className="lg:col-span-2 card-flat p-4 sm:p-5 float-up float-up-4" data-testid="camera-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 blink-dot" />
                <div className="overline">Live Camera Feed · ESP32-CAM</div>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className="hidden" onChange={(e) => onSnapshot(e.target.files?.[0])}
                  data-testid="camera-upload-input" />
                <Button size="sm" onClick={() => fileRef.current?.click()} disabled={analyzing}
                  data-testid="snapshot-analyze-btn"
                  className="relative overflow-hidden bg-cyan-500 hover:bg-cyan-400 text-[#060607] font-bold group">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {analyzing ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Wand2 size={14} className="mr-1.5" />}
                  ANALISA AI
                </Button>
              </div>
            </div>
            <div className="aspect-video relative rounded-md overflow-hidden border border-[#262628] bg-[#0A0A0B]">
              <img
                src={snapshot || "https://images.unsplash.com/photo-1700515268322-c462b72cdf5a?crop=entropy&cs=srgb&fm=jpg&q=85"}
                alt="Camera feed" className="w-full h-full object-cover" />
              {/* Scan line animation */}
              <div className="scan-line" />
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 border-cyan-400" />
              <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 border-cyan-400" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-cyan-400" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-cyan-400" />
              {/* Overlays */}
              <div className="absolute top-4 left-10 px-2 py-1 rounded bg-black/70 backdrop-blur text-[10px] font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 blink-dot" />LIVE · CAM01
              </div>
              <div className="absolute top-4 right-10 px-2 py-1 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                REC 1080p · 30FPS
              </div>
              <div className="absolute bottom-4 left-10 px-2 py-1 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-neutral-300">
                {new Date().toLocaleTimeString("id-ID")}
              </div>
              <div className="absolute bottom-4 right-10 px-2 py-1 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-neutral-400">
                ISO 400 · f/2.0
              </div>
            </div>
            {analysis && (
              <div className="mt-3 p-4 rounded-md bg-gradient-to-br from-cyan-950/40 to-[#0A0A0B] border border-cyan-500/30 float-up glow-cyan"
                   data-testid="ai-analysis-result">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="overline text-cyan-400">AI REPORT</span>
                      <span className="font-mono text-[11px] text-neutral-500">gemini-2.5-flash</span>
                    </div>
                    <div className="text-sm text-neutral-200 leading-relaxed">{analysis.description}</div>
                    {analysis.recommendations?.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {analysis.recommendations.map((r, i) => (
                          <li key={`rec-${i}-${r.slice(0, 20)}`} className="text-xs text-neutral-400 flex gap-2 leading-relaxed">
                            <span className="text-cyan-500 font-mono shrink-0">0{i + 1}</span>{r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual control */}
          <div className="card-flat p-5 space-y-5 float-up float-up-5" data-testid="control-panel">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge size={12} className="text-neutral-500" />
                <div className="overline">Manual Control</div>
              </div>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-md border transition-colors ${
                control?.auto_mode ? "border-cyan-500/40 bg-cyan-500/5" : "border-[#262628]"
              }`}>
                <span className={`text-[10px] uppercase tracking-widest font-mono ${control?.auto_mode ? "text-cyan-400" : "text-neutral-500"}`}>Auto</span>
                <Switch checked={control?.auto_mode || false}
                  onCheckedChange={(v) => updateControl({ auto_mode: v })}
                  data-testid="auto-mode-switch" />
              </div>
            </div>

            {/* Motor */}
            <div className="p-4 rounded-lg bg-[#0A0A0B] border border-[#1A1A1C]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${(control?.motor_speed ?? 0) > 0 ? "bg-cyan-500/15 rotate-slow" : "bg-[#1A1A1C]"}`}>
                    <Gauge size={12} className={(control?.motor_speed ?? 0) > 0 ? "text-cyan-400" : "text-neutral-600"} />
                  </div>
                  <span className="text-sm font-medium text-neutral-200">DC Motor</span>
                </div>
                <span className="font-mono tabular text-cyan-400 text-xl font-bold">{control?.motor_speed ?? 0}<span className="text-xs text-neutral-500 ml-0.5">%</span></span>
              </div>
              <Slider value={[control?.motor_speed ?? 0]} max={100} step={5}
                onValueChange={(v) => updateControl({ motor_speed: v[0] })}
                data-testid="motor-slider" />
              <div className="flex justify-between mt-2 text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>

            {/* Nozzle */}
            <div className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
              control?.nozzle_on ? "bg-cyan-500/5 border-cyan-500/30" : "bg-[#0A0A0B] border-[#1A1A1C]"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${control?.nozzle_on ? "bg-cyan-500/20" : "bg-[#1A1A1C]"}`}>
                  <Droplet size={12} className={control?.nozzle_on ? "text-cyan-400" : "text-neutral-600"} />
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-200">Water Nozzle</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                    {control?.nozzle_on ? "flowing" : "closed"}
                  </div>
                </div>
              </div>
              <Switch checked={control?.nozzle_on || false}
                onCheckedChange={(v) => updateControl({ nozzle_on: v })}
                data-testid="nozzle-switch" />
            </div>

            {/* Servo */}
            <Button onClick={pushServo}
              data-testid="servo-push-btn"
              className="w-full h-12 bg-gradient-to-r from-[#1A1A1C] to-[#141416] hover:from-cyan-500/20 hover:to-cyan-500/10 text-neutral-100 border border-[#262628] hover:border-cyan-500/40 font-medium group transition-all">
              <ArrowDownToLine size={15} className="mr-2 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
              DORONG HASIL CUCIAN (SERVO)
            </Button>

            {/* Threshold settings */}
            <Dialog open={thrOpen} onOpenChange={setThrOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="threshold-settings-btn"
                  className="w-full text-[11px] text-neutral-500 hover:text-cyan-400 font-mono tracking-widest">
                  <AlertTriangle size={12} className="mr-1.5" />THRESHOLD · AUTO-MODE
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#121214] border-[#262628]">
                <DialogHeader>
                  <DialogTitle className="font-display">Threshold Settings</DialogTitle>
                  <DialogDescription className="text-neutral-500 text-sm">
                    Mesin akan otomatis berhenti jika sensor melebihi batas saat Auto Mode aktif.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="overline text-[10px]">Turbidity Max (NTU)</Label>
                    <Input type="number" defaultValue={control?.threshold_turbidity ?? 50}
                      onBlur={(e) => updateControl({ threshold_turbidity: parseFloat(e.target.value) })}
                      data-testid="threshold-turbidity-input"
                      className="mt-2 bg-[#0A0A0B] border-[#262628] font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="overline text-[10px]">pH Min</Label>
                      <Input type="number" step="0.1" defaultValue={control?.threshold_ph_min ?? 6.0}
                        onBlur={(e) => updateControl({ threshold_ph_min: parseFloat(e.target.value) })}
                        data-testid="threshold-ph-min-input"
                        className="mt-2 bg-[#0A0A0B] border-[#262628] font-mono" />
                    </div>
                    <div>
                      <Label className="overline text-[10px]">pH Max</Label>
                      <Input type="number" step="0.1" defaultValue={control?.threshold_ph_max ?? 8.5}
                        onBlur={(e) => updateControl({ threshold_ph_max: parseFloat(e.target.value) })}
                        data-testid="threshold-ph-max-input"
                        className="mt-2 bg-[#0A0A0B] border-[#262628] font-mono" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setThrOpen(false)} className="bg-cyan-500 hover:bg-cyan-400 text-[#060607]">
                    Tersimpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Charts */}
        <div className="card-flat p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Wash Session Telemetry</div>
            <div className="flex gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-cyan-400" /> pH</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-400" /> NTU</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400" /> Motor%</span>
            </div>
          </div>
          <Tabs defaultValue="combined">
            <TabsList className="bg-[#0E0E0E] border border-[#262626]">
              <TabsTrigger value="combined" data-testid="chart-tab-combined">Combined</TabsTrigger>
              <TabsTrigger value="ph" data-testid="chart-tab-ph">pH</TabsTrigger>
              <TabsTrigger value="turbidity" data-testid="chart-tab-turbidity">Turbidity</TabsTrigger>
            </TabsList>
            <TabsContent value="combined" className="mt-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#1E1E1E" vertical={false} />
                  <XAxis dataKey="t" stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                  <YAxis stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                  <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                  <Line type="monotone" dataKey="ph" stroke="#06B6D4" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="turbidity" stroke="#F59E0B" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="motor" stroke="#10B981" dot={false} strokeWidth={1.5} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="ph" className="mt-4">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="#1E1E1E" vertical={false} />
                  <XAxis dataKey="t" stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                  <YAxis stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} domain={[5, 9]} />
                  <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                  <Area type="monotone" dataKey="ph" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="turbidity" className="mt-4">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="#1E1E1E" vertical={false} />
                  <XAxis dataKey="t" stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                  <YAxis stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                  <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                  <Area type="monotone" dataKey="turbidity" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
