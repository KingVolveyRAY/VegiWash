import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="font-mono text-cyan-500 text-sm tracking-widest">LOADING…</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
