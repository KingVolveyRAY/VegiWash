import React from "react";
import Header from "../components/Header";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Bell, Smartphone, Github, BookOpen } from "lucide-react";

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
    <div className="min-h-screen bg-[#0A0A0A]">
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
          <div className="overline mb-3">Push Notifications (PWA)</div>
          <div className="flex items-start gap-3 mb-4">
            <Smartphone size={20} className="text-cyan-400 mt-0.5" />
            <div className="text-sm text-neutral-400 leading-relaxed">
              Aktifkan ikon <Bell size={12} className="inline" /> di header untuk berlangganan notifikasi.
              Notifikasi akan dikirim saat: pencucian selesai, auto-mode mendeteksi turbidity tinggi, atau peringatan pH air.
              <br />
              <span className="text-neutral-500 text-xs">
                Tip: Pada HP, klik "Add to Home Screen" untuk install sebagai aplikasi (PWA).
              </span>
            </div>
          </div>
          <Button onClick={sendTest} data-testid="test-notification-btn"
            className="bg-cyan-500 hover:bg-cyan-400 text-[#0A0A0A] font-bold">
            <Bell size={14} className="mr-2" />KIRIM NOTIFIKASI TEST
          </Button>
        </div>

        <div className="card-flat p-5">
          <div className="overline mb-3">Hardware Integration</div>
          <p className="text-sm text-neutral-400 mb-3">
            Untuk menyambungkan ke ESP32 fisik, lihat kode contoh di halaman <strong className="text-cyan-400">ESP32 Code</strong>.
            ESP32 cukup mengirim HTTP POST ke endpoint <code className="font-mono text-cyan-400 text-xs">/api/sensors/ingest</code>
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
