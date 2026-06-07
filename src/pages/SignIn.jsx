import { getMe, signInWithPassword, signOut, resetPasswordForEmail } from '@/lib/auth-helpers';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Eye, EyeOff, Sparkles, ArrowRight, CalendarCheck, CreditCard, Bell } from "lucide-react";
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
          Home Care Tech
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setError("");
    try {
      await resetPasswordForEmail(resetEmail);
      setResetSent(true);
    } catch (err) {
      setError(err?.message || "Failed to send reset email. Please check the address.");
    }
    setResetLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await signInWithPassword(email, password);
      const user = await getMe();
      const role = user?.role || "user";
      if (role !== "user") {
        setError("This portal is for clients only. Staff should use /StaffLogin.");
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
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-shrink-0 bg-[#0D0618] flex-col items-center justify-center">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-indigo-500/15 rounded-full blur-[80px]" />
        <div className="anim-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-purple-700/20 rounded-full" />
        <div className="anim-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-purple-600/15 rounded-full" style={{ animationDirection: "reverse", animationDuration: "14s" }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 px-14 text-center">
          <div className="flex justify-center mb-10">
            <Logo dark />
          </div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4">
            Welcome Back to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-violet-200 to-indigo-300">
              Home Xperts
            </span>
          </h2>
          <p className="text-white/40 text-sm leading-relaxed mb-10 max-w-xs mx-auto">
            Sign in to manage your home care subscription, bookings, and service history.
          </p>
          <div className="flex flex-col gap-3 items-center">
            {[
              { Icon: CalendarCheck, label: "Track your cleaning schedule" },
              { Icon: CreditCard,    label: "Manage bookings & payments" },
              { Icon: Bell,          label: "Get real-time service updates" },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm w-full max-w-[260px]">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80" alt="Home cleaning" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0618] via-[#0D0618]/60 to-transparent" />
        </div>
      </div>

      {/* ── RIGHT: Sign In form ── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="lg:hidden px-6 pt-8 pb-4 border-b border-gray-100">
          <Link to="/Landing"><Logo /></Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-14 xl:px-20 py-12">
          <div className="w-full max-w-md anim-fadeUp">

            {/* ── FORGOT PASSWORD ── */}
            {forgotMode ? (
              <div>
                <button onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">← Back to Sign In</button>
                <div className="mb-8">
                  <h1 className="text-3xl font-black text-gray-900">Reset Password</h1>
                  <p className="text-gray-500 text-sm mt-2">Enter your email and we'll send a reset link.</p>
                </div>
                {resetSent ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-6 text-center">
                    <div className="text-3xl mb-3">📬</div>
                    <div className="font-bold text-green-800 mb-1">Reset email sent!</div>
                    <div className="text-sm text-green-600">Check your inbox at <span className="font-semibold">{resetEmail}</span>.</div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                        placeholder="you@example.com" required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all placeholder-gray-300" />
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
                    <button type="submit" disabled={resetLoading || !resetEmail}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-800 hover:to-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                      {resetLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</> : "Send Reset Link"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* ── SIGN IN FORM ── */
              <>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 mb-3">
                    <span className="text-xs font-bold text-purple-700">Client Portal</span>
                  </div>
                  <h1 className="text-3xl font-black text-gray-900">Welcome back</h1>
                  <p className="text-gray-500 text-sm mt-1">Sign in to access your home care dashboard.</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all placeholder-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="Your password" required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all placeholder-gray-300 pr-11" />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
                  <div className="text-right">
                    <button type="button" onClick={() => { setForgotMode(true); setResetEmail(email); setError(""); }}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold">
                      Forgot password?
                    </button>
                  </div>
                  <button type="submit" disabled={loading || !email || !password}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-800 hover:to-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                      : <><Sparkles className="w-4 h-4" /> Sign In <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-medium">New here?</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <Link to="/Register"
                  className="block w-full text-center py-3 border-2 border-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-all text-sm">
                  Create a New Account →
                </Link>

                <p className="text-center text-xs text-gray-400 mt-6">
                  <Link to="/Landing" className="hover:text-gray-600 transition-colors">← Back to Home</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}