import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, signOut } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2, LogIn, AlertCircle } from "lucide-react";

function Logo() {
  return (
    <div className="flex items-center gap-2.5 justify-center">
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
        <path d="M50 10 L90 45 L80 45 L80 88 L20 88 L20 45 L10 45 Z" fill="#6B21A8" stroke="#4C1D95" strokeWidth="2"/>
        <rect x="38" y="60" width="24" height="28" rx="2" fill="#7C3AED"/>
        <rect x="38" y="38" width="24" height="18" rx="2" fill="#C4B5FD"/>
        <path d="M15 92 Q50 85 85 92" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
      </svg>
      <div>
        <div className="font-black text-xl leading-none tracking-tight text-white">HomeX</div>
        <div className="text-[9px] uppercase tracking-[0.2em] font-semibold text-white/40">Admin Portal</div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // On mount, check if already logged in as admin
  useEffect(() => {
    getMe()
      .then(user => {
        if (user?.role === "admin") {
          navigate("/AdminDashboard", { replace: true });
        } else if (user) {
          // Logged in but not admin
          setError("Access denied. This account does not have admin privileges.");
          setChecking(false);
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  const handleSignIn = () => {
    // Use the platform's native login flow — handles email/password + OTP verification
    window.location.href = '/SignIn';
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0618" }}>
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#0D0618", position: "relative", overflow: "hidden" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fadeUp { animation: fadeUp 0.4s ease both; }
      `}</style>

      {/* Background glow */}
      <div style={{ position: "absolute", top: "25%", left: "25%", width: 400, height: 400, background: "rgba(124,58,237,0.12)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "25%", right: "25%", width: 300, height: 300, background: "rgba(99,102,241,0.08)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

      <div className="relative z-10 w-full max-w-md anim-fadeUp">
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ height: 4, background: "linear-gradient(90deg, #7c3aed, #4f46e5)" }} />

          <div className="px-8 py-10 space-y-6 text-center">
            <Logo />

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Secure Admin Access</span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white mb-2">Admin Sign In</h2>
              <p className="text-sm text-white/40 leading-relaxed">
                Click below to sign in securely.<br />
                You will be redirected back after authentication.
              </p>
            </div>

            {error && (
              <div className="space-y-3">
                <div className="text-sm px-4 py-3 rounded-xl flex items-center gap-2 text-left" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
                <button
                  onClick={() => signOut("/AdminLogin")}
                  className="w-full py-3 text-white/70 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-white/10 hover:border-white/20 hover:text-white"
                >
                  Sign out &amp; use a different account
                </button>
              </div>
            )}

            {!error && (
              <button
                onClick={handleSignIn}
                className="w-full py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 8px 24px rgba(124,58,237,0.35)" }}
              >
                <LogIn className="w-4 h-4" />
                Sign In to Admin Dashboard
              </button>
            )}

            <p className="text-xs text-white/20">
              Only authorized admin accounts can access this portal.
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} Home Xperts · Secure Admin Access
        </p>
      </div>
    </div>
  );
}