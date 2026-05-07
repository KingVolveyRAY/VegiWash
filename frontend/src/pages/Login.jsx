import React, { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState({ ph: 7.22, ntu: 12.4, clean: 97 });

  useEffect(() => {
    const id = setInterval(() => {
      setTick({
        ph: +(7 + Math.random() * 0.8).toFixed(2),
        ntu: +(8 + Math.random() * 12).toFixed(1),
        clean: Math.floor(88 + Math.random() * 10),
      });
    }, 1800);
    return () => clearInterval(id);
  }, []);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Login berhasil");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login gagal");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-[#060607] mesh-bg">
      {/* Left visual */}
      <div className="hidden lg:flex lg:col-span-3 relative overflow-hidden border-r border-[#262628]">
        <img
          src="https://images.unsplash.com/photo-1708793559923-b1d38cdfacf0?crop=entropy&cs=srgb&fm=jpg&q=85"
          alt="Industrial vegetable washing"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#060607] via-[#060607]/85 to-transparent" />
        <div className="absolute inset-0 grid-bg opacity-30" />

        {/* Rotating rings */}
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] pointer-events-none">
          <div className="absolute inset-0 rounded-full border border-cyan-500/20 rotate-slow" />
          <div className="absolute inset-6 rounded-full border border-cyan-500/15" style={{ animation: "rotate-slow 30s linear infinite reverse" }} />
          <div className="absolute inset-14 rounded-full border border-cyan-500/10" />
          <div className="absolute inset-24 rounded-full border-2 border-dashed border-cyan-400/10 rotate-slow" style={{ animationDuration: "60s" }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-md bg-cyan-500 flex items-center justify-center glow-strong">
              <div className="w-3.5 h-3.5 rounded-full bg-[#060607] blink-dot" />
            </div>
            <div>
              <div className="font-display font-black text-base tracking-tight">AGRIFLOW</div>
              <div className="overline text-[9px]">WashOps Console · v1.0</div>
            </div>
          </div>

          <div className="space-y-6 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
              <div className="h-px w-8 bg-cyan-500/40" />
              <div className="overline text-cyan-400">realtime iot telemetry</div>
            </div>
            <h1 className="font-display font-black text-5xl xl:text-6xl tracking-[-0.03em] leading-[0.95]">
              Sistem Monitoring<br />
              Pencucian Sayuran<br />
              <span className="relative inline-block">
                <span className="relative z-10 text-cyan-400">Berbasis IoT.</span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 bg-cyan-500/20 blur-md" />
              </span>
            </h1>
            <p className="text-neutral-400 text-[15px] leading-relaxed max-w-md">
              Sensor pH air · turbidity · live camera · DC motor · nozzle · servo —
              <span className="text-neutral-200"> semua dalam satu console industrial.</span>
            </p>

            {/* Live simulated metrics */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
                { label: "WATER PH", value: tick.ph.toFixed(2), c: "#06B6D4" },
                { label: "TURBIDITY", value: `${tick.ntu} NTU`, c: "#F59E0B" },
                { label: "AI CLEAN", value: `${tick.clean}%`, c: "#10B981" },
              ].map((s) => (
                <div key={s.label} className="card-flat p-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: s.c, opacity: 0.4 }} />
                  <div className="overline text-[8px] mb-1">{s.label}</div>
                  <div className="font-mono tabular text-xl font-bold" style={{ color: s.c, textShadow: `0 0 12px ${s.c}40` }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-600">
            <span>esp32 // mqtt-ready</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink-dot" />
              system online
            </span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        <div className="w-full max-w-sm relative">
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <div className="w-8 h-8 rounded-md bg-cyan-500 flex items-center justify-center glow-strong">
              <div className="w-3 h-3 rounded-full bg-[#060607]" />
            </div>
            <div className="font-display font-black tracking-tight">AGRIFLOW</div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#262628]" />
            <div className="overline text-[10px]">// authenticate</div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#262628]" />
          </div>
          <h2 className="font-display text-4xl font-black tracking-[-0.03em] mb-2">Masuk Console.</h2>
          <p className="text-neutral-500 text-sm mb-8">Akses dashboard real-time monitoring Anda.</p>

          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div>
              <Label className="overline text-[10px] mb-2.5 block">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                placeholder="operator@agriflow.com"
                className="bg-[#0E0E10] border-[#262628] h-12 font-mono text-sm focus-visible:ring-cyan-500 focus-visible:border-cyan-500/50 transition-colors" />
            </div>
            <div>
              <Label className="overline text-[10px] mb-2.5 block">Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                placeholder="••••••••"
                className="bg-[#0E0E10] border-[#262628] h-12 font-mono text-sm focus-visible:ring-cyan-500 focus-visible:border-cyan-500/50 transition-colors" />
            </div>
            <Button type="submit" disabled={loading}
              data-testid="login-submit-btn"
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 text-[#060607] font-bold tracking-wide relative overflow-hidden group">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading ? <Loader2 className="animate-spin" size={16} /> : (
                <span className="flex items-center gap-2">MASUK <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" /></span>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#262628]" /></div>
            <div className="relative flex justify-center"><span className="bg-[#060607] px-3 text-[10px] font-mono uppercase tracking-widest text-neutral-600">atau</span></div>
          </div>

          <p className="text-sm text-neutral-500 text-center">
            Belum punya akun?{" "}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium underline-offset-4 hover:underline" data-testid="register-link">
              Daftar gratis →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
