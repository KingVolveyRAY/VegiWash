import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#0A0A0A]">
      {/* Left visual */}
      <div className="hidden lg:flex relative overflow-hidden border-r border-[#262626]">
        <img
          src="https://images.unsplash.com/photo-1708793559923-b1d38cdfacf0?crop=entropy&cs=srgb&fm=jpg&q=85"
          alt="Industrial vegetable washing"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-cyan-500 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#0A0A0A] blink-dot" />
            </div>
            <div>
              <div className="font-display font-black text-base tracking-tight">AGRIFLOW</div>
              <div className="overline text-[9px]">WashOps Console</div>
            </div>
          </div>
          <div className="space-y-4 max-w-md">
            <div className="overline">// realtime telemetry</div>
            <h1 className="font-display font-black text-4xl xl:text-5xl tracking-tight leading-[1.05]">
              Sistem Monitoring<br />Pencucian Sayuran<br />
              <span className="text-cyan-400">Berbasis IoT.</span>
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              pH water · turbidity · live camera · DC motor · nozzle · servo — semua dalam satu console industrial.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4">
              {["pH 7.2", "12.4 NTU", "98% CLEAN"].map((s) => (
                <div key={s} className="card-flat p-3">
                  <div className="font-mono text-cyan-400 text-sm tabular">{s}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="overline">esp32 // mqtt-ready</div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-md bg-cyan-500 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#0A0A0A]" />
            </div>
            <div className="font-display font-black tracking-tight">AGRIFLOW</div>
          </div>
          <div className="overline mb-3">// authenticate</div>
          <h2 className="font-display text-3xl font-black tracking-tight mb-2">Masuk Console</h2>
          <p className="text-neutral-500 text-sm mb-8">Akses dashboard real-time monitoring Anda.</p>
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div>
              <Label className="overline text-[10px] mb-2 block">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="bg-[#121212] border-[#262626] h-11 font-mono text-sm focus-visible:ring-cyan-500" />
            </div>
            <div>
              <Label className="overline text-[10px] mb-2 block">Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="bg-[#121212] border-[#262626] h-11 font-mono text-sm focus-visible:ring-cyan-500" />
            </div>
            <Button type="submit" disabled={loading}
              data-testid="login-submit-btn"
              className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-[#0A0A0A] font-bold tracking-wide">
              {loading ? <Loader2 className="animate-spin" size={16} /> : "MASUK →"}
            </Button>
          </form>
          <p className="text-sm text-neutral-500 mt-6 text-center">
            Belum punya akun?{" "}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium" data-testid="register-link">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
