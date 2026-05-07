import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell, BellOff, LogOut, Activity, History, Settings as SettingsIcon, Cpu, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import api, { urlBase64ToUint8Array } from "../lib/api";
import { toast } from "sonner";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pushOn, setPushOn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.pushManager?.getSubscription().then((sub) => setPushOn(!!sub));
      });
    }
  }, []);

  const togglePush = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Browser tidak mendukung push notification");
        return;
      }
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) reg = await navigator.serviceWorker.register("/service-worker.js");
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
        setPushOn(false);
        toast.success("Notifikasi dimatikan");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast.error("Izin notifikasi ditolak"); return; }
      const { data } = await api.get("/notifications/vapid-public");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.public_key),
      });
      const subJson = sub.toJSON();
      await api.post("/notifications/subscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      });
      setPushOn(true);
      toast.success("Notifikasi aktif!");
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengaktifkan notifikasi");
    }
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: Activity },
    { to: "/history", label: "History", icon: History },
    { to: "/arduino", label: "ESP32 Code", icon: Cpu },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-[#262626]" data-testid="app-header">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-neutral-300" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="flex items-center gap-2.5" data-testid="brand-logo">
            <div className="w-8 h-8 rounded-md bg-cyan-500 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#0A0A0A] blink-dot" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-[15px] tracking-tight">AGRIFLOW</span>
              <span className="overline text-[9px]">WashOps · v1.0</span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                className={`px-3 h-9 inline-flex items-center gap-2 rounded-md text-[13px] font-medium transition-colors ${
                  active ? "bg-[#1E1E1E] text-cyan-400" : "text-neutral-400 hover:bg-[#161616] hover:text-neutral-100"
                }`}>
                <Icon size={15} />{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={togglePush}
            data-testid="push-toggle-btn"
            className={`h-9 w-9 inline-flex items-center justify-center rounded-md border border-[#262626] hover:bg-[#161616] transition-colors ${pushOn ? "text-cyan-400 pulse-ring" : "text-neutral-500"}`}
            title={pushOn ? "Notifikasi aktif" : "Aktifkan notifikasi"}>
            {pushOn ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-md bg-[#121212] border border-[#262626]">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-[11px] flex items-center justify-center font-mono uppercase">
              {user?.name?.[0] || "U"}
            </div>
            <span className="text-[13px] text-neutral-200 font-medium" data-testid="user-name">{user?.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/login"); }}
            data-testid="logout-btn"
            className="h-9 w-9 p-0 text-neutral-500 hover:text-red-400 hover:bg-[#161616]">
            <LogOut size={16} />
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#262626] bg-[#0A0A0A]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                data-testid={`mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                className={`flex items-center gap-3 px-6 py-3 text-[14px] border-b border-[#1A1A1A] ${
                  active ? "bg-[#121212] text-cyan-400" : "text-neutral-300"
                }`}>
                <Icon size={16} />{item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
