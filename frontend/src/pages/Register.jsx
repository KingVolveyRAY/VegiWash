import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password minimal 6 karakter");
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Registrasi berhasil");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] grid-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-md bg-cyan-500 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#0A0A0A]" />
          </div>
          <div className="font-display font-black tracking-tight text-lg">AGRIFLOW</div>
        </div>
        <div className="card-flat p-6 sm:p-8">
          <div className="overline mb-3">// new operator</div>
          <h2 className="font-display text-2xl font-black tracking-tight mb-2">Daftar Akun Baru</h2>
          <p className="text-neutral-500 text-sm mb-6">Buat console personal untuk mesin pencucian Anda.</p>
          <form onSubmit={submit} className="space-y-4" data-testid="register-form">
            <div>
              <Label className="overline text-[10px] mb-2 block">Nama</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)}
                data-testid="register-name-input"
                className="bg-[#121212] border-[#262626] h-11 focus-visible:ring-cyan-500" />
            </div>
            <div>
              <Label className="overline text-[10px] mb-2 block">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email-input"
                className="bg-[#121212] border-[#262626] h-11 font-mono text-sm focus-visible:ring-cyan-500" />
            </div>
            <div>
              <Label className="overline text-[10px] mb-2 block">Password (min. 6)</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                data-testid="register-password-input"
                className="bg-[#121212] border-[#262626] h-11 font-mono text-sm focus-visible:ring-cyan-500" />
            </div>
            <Button type="submit" disabled={loading}
              data-testid="register-submit-btn"
              className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-[#0A0A0A] font-bold tracking-wide">
              {loading ? <Loader2 className="animate-spin" size={16} /> : "BUAT AKUN →"}
            </Button>
          </form>
          <p className="text-sm text-neutral-500 mt-6 text-center">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium" data-testid="login-link">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
