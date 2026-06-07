import { getMe, signInWithPassword, signOut } from '@/lib/auth-helpers';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { ROLE_HOME } from "@/lib/roles";

function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10 L90 45 L80 45 L80 88 L20 88 L20 45 L10 45 Z" fill="#6B21A8" stroke="#4C1D95" strokeWidth="2"/>
        <rect x="38" y="60" width="24" height="28" rx="2" fill="#7C3AED"/>
        <rect x="38" y="38" width="24" height="18" rx="2" fill="#C4B5FD"/>
        <path d="M15 92 Q50 85 85 92" stroke={dark ? "white" : "#1F2937"} strokeWidth="3" strokeLinecap="round" fill="none"/>
      </svg>
      <div>
        <div className={`font-black text-lg leading-none tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
          HomeX
        </div>
        <div className={`text-[9px] uppercase tracking-[0.2em] font-semibold ${dark ? "text-white/40" : "text-gray-400"}`}>
          Staff Portal
        </div>
      </div>
    </div>
  );
}

const STAFF_ROLES = ["staff_hr", "staff_account", "staff_operations", "staff_managerial"];

export default function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await signInWithPassword(email, password);
      const user = await getMe();
      const role = user?.role || "";

      // Only allow staff roles (and admin as fallback)
      if (role !== "admin" && !STAFF_ROLES.includes(role)) {
        setError("This portal is for staff only. Clients should use the Client Sign In.");
        await signOut(false);
        setLoading(false);
        return;
      }

      navigate(ROLE_HOME[role] || "/Dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fadeUp { animation: fadeUp 0.45s ease both; }
        @keyframes spinSlow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .anim-spin { animation: spinSlow 20s linear infinite; }
      `}</style>

      {/* ── LEFT: Dark hero panel ── */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-shrink-0 bg-[#0A0F1E] flex-col items-center justify-center">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-slate-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-indigo-700/15 rounded-full blur-[80px]" />
        <div className="anim-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-slate-600/20 rounded-full" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 px-14 text-center">
          <div className="flex justify-center mb-10">
            <Logo dark />
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-white/70" />
          </div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4">
            Staff Portal
          </h2>
          <p className="text-white/40 text-sm leading-relaxed mb-10 max-w-xs mx-auto">
            Access your department dashboard with the credentials provided by your administrator.
          </p>
          <div className="flex flex-col gap-2 items-center text-left">
            {[
              "HR Department",
              "Accounts Department",
              "Operations Department",
              "Managerial Department",
            ].map(dept => (
              <div key={dept} className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-sm w-full max-w-[260px]">
                <span className="w-2 h-2 bg-indigo-400 rounded-full flex-shrink-0" />
                <span>{dept}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Sign In form ── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="lg:hidden px-6 pt-8 pb-4 border-b border-gray-100">
          <Logo />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-14 xl:px-20 py-12">
          <div className="w-full max-w-md anim-fadeUp">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-bold text-slate-700">Staff Portal</span>
              </div>
              <h1 className="text-3xl font-black text-gray-900">Staff Sign In</h1>
              <p className="text-gray-500 text-sm mt-1">Use the credentials provided by your administrator.</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@homexperts.com" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Your password" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder-gray-300 pr-11" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading || !email || !password}
                className="w-full py-3.5 bg-gradient-to-r from-slate-700 to-slate-900 text-white font-bold rounded-xl hover:from-slate-800 hover:to-black disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                  : <><Sparkles className="w-4 h-4" /> Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
              Don't have credentials? Contact your administrator.<br />
              <Link to="/Landing" className="text-gray-400 hover:text-gray-600 transition-colors mt-2 inline-block">← Back to Home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}