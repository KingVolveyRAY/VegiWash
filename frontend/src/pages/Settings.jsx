import React from "react";
import Header from "../components/Header";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Bell, Smartphone, BookOpen, Activity, Droplet, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

const NOTIFICATIONS = [
  { icon: "▶️", color: "text-cyan-400", title: "Sesi Dimulai", desc: "Saat tombol MULAI PENCUCIAN ditekan", trigger: "session_start" },
  { icon: "✅", color: "text-emerald-400", title: "Pencucian Selesai", desc: "Saat sesi distop — kirim ringkasan pH avg & turbidity avg", trigger: "session_end" },
  { icon: "🚨", color: "text-red-400", title: "Auto Stop", desc: "Saat Auto Mode aktif & turbidity melewati threshold (cooldown 60s)", trigger: "auto_stop" },
  { icon: "💧", color: "text-amber-400", title: "Air Keruh", desc: "Turbidity tinggi tapi auto-mode off — peringatan ganti air (cooldown 3 menit)", trigger: "turbidity_high" },
  { icon: "⚠️", color: "text-amber-400", title: "pH di Luar Range", desc: "pH < min atau pH > max threshold (cooldown 3 menit)", trigger: "ph_alert" },
  { icon: "✨", color: "text-emerald-400", title: "Sayuran Bersih", desc: "Setelah analisa AI dengan skor ≥ 85", trigger: "ai_clean" },
  { icon: "⚠️", color: "text-amber-400", title: "Perlu Cuci Ulang", desc: "Setelah analisa AI dengan skor < 60", trigger: "ai_dirty" },
];

export default function Settings() {
  const { user } = useAuth();

  const sendTest = async () => {
    try {
      const r = await api.post("/notifications/test");
      if (r.data.sent > 0) toast.success(`Notifikasi terkirim ke ${r.data.sent} device`);
      else toast.warning("Belum ada subscription. Aktifkan bell di header dulu.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal kirim notif");
    }
  };

  return (
    <div className="min-h-screen bg-[#060607] mesh-bg">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <div className="overline mb-1.5">// account</div>
          <h1 className="font-display text-3xl font-black tracking-tight">Settings</h1>
        </div>

        <div className="card-flat p-5">
          <div className="overline mb-3">Profile</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm border-b border-[#1E1E1E] py-2">
              <span className="text-neutral-500">Nama</span>
              <span className="font-mono text-neutral-100">{user?.name}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-[#1E1E1E] py-2">
              <span className="text-neutral-500">Email</span>
              <span className="font-mono text-neutral-100">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-neutral-500">User ID</span>
              <span className="font-mono text-neutral-500 text-xs">{user?.id}</span>
            </div>
          </div>
        </div>

        <div className="card-flat p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Push Notifications · PWA</div>
            <Button onClick={sendTest} size="sm" data-testid="test-notification-btn"
              className="bg-cyan-500 hover:bg-cyan-400 text-[#060607] font-bold">
              <Bell size={12} className="mr-1.5" />TEST
            </Button>
          </div>
          <div className="flex items-start gap-3 mb-4 p-3 rounded-md bg-cyan-500/5 border border-cyan-500/20">
            <Smartphone size={18} className="text-cyan-400 mt-0.5 shrink-0" />
            <div className="text-sm text-neutral-300 leading-relaxed">
              <strong className="text-neutral-100">Cara aktifkan:</strong> klik ikon <Bell size={11} className="inline text-cyan-400" /> di header
              → izinkan notifikasi. Di HP, install dulu sebagai PWA via <em className="text-cyan-400">"Add to Home Screen"</em>.
            </div>
          </div>

          <div className="overline mb-3 text-[10px]">Notifikasi otomatis yang akan dikirim:</div>
          <div className="space-y-2">
            {NOTIFICATIONS.map((n) => (
              <div key={n.trigger} className="flex items-start gap-3 p-3 rounded-md bg-[#0A0A0B] border border-[#1A1A1C]">
                <span className="text-xl shrink-0">{n.icon}</span>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${n.color}`}>{n.title}</div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{n.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-md bg-[#0A0A0B] border border-[#1A1A1C] text-xs text-neutral-500 leading-relaxed">
            💡 Notifikasi pakai <strong className="text-neutral-300">cooldown</strong> supaya tidak spam.
            Saat kondisi terpenuhi, notifikasi dikirim sekali, lalu menunggu 60-180 detik sebelum dikirim ulang meski kondisi masih sama.
          </div>
        </div>

        <div className="card-flat p-5">
          <div className="overline mb-3">Hardware Integration</div>
          <p className="text-sm text-neutral-400 mb-3 leading-relaxed">
            Untuk menyambungkan ke ESP32 fisik, lihat kode contoh di halaman <strong className="text-cyan-400">ESP32 Code</strong>.
            ESP32 cukup mengirim HTTP POST ke endpoint <code className="font-mono text-cyan-400 text-xs px-1 py-0.5 rounded bg-[#0A0A0B]">/api/sensors/ingest</code>
            dengan JWT token Anda.
          </p>
          <a href="/arduino" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300">
            <BookOpen size={14} />Lihat firmware example →
          </a>
        </div>
      </main>
    </div>
  );
}
