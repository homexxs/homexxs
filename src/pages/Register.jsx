import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, updateMe, signInWithPassword, signUp, verifyOtp, resendOtp } from '@/lib/auth-helpers';
import { invokeFunction } from '@/lib/api';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Sparkles, CheckCircle, Eye, EyeOff, Home,
  ArrowRight, Mail, RefreshCw, KeyRound, Phone, MapPin
} from "lucide-react";
import SubscriptionStep from "@/components/subscription/SubscriptionStep";

const PLANS = [
  { key: "mini_flat",         label: "Mini Flat",         price: 10000 },
  { key: "2_bedroom_flat",    label: "2 Bedroom Flat",    price: 15000 },
  { key: "3_bedroom_flat",    label: "3 Bedroom Flat",    price: 20000, popular: true },
  { key: "3_bedroom_duplex",  label: "3 Bedroom Duplex",  price: 25000 },
  { key: "4_bedroom_flat",    label: "4 Bedroom Flat",    price: 30000 },
  { key: "4_bedroom_duplex",  label: "4 Bedroom Duplex",  price: 35000 },
  { key: "5_bedroom_mansion", label: "5 Bedroom Mansion", price: 50000 },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
        <path d="M50 10 L90 45 L80 45 L80 88 L20 88 L20 45 L10 45 Z" fill="#7C3AED"/>
        <rect x="38" y="60" width="24" height="28" rx="2" fill="#8B5CF6"/>
        <rect x="38" y="38" width="24" height="18" rx="2" fill="#C4B5FD"/>
      </svg>
      <span className="font-black text-lg text-gray-900">HomeX</span>
    </div>
  );
}

function StepIndicator({ step }) {
  const steps = ["Account & Verify", "Details & Plan", "Subscription"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done ? "bg-purple-600 text-white" : active ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${active ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${idx < step ? "bg-purple-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();

  // phase: "credentials" | "otp" | "details"
  const [phase, setPhase] = useState("credentials");
  const [step, setStep] = useState(1); // 1 = account+verify, 2 = details+plan

  // Step 1 — credentials
  const [creds, setCreds] = useState({ email: "", password: "", confirm_password: "" });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [authError, setAuthError] = useState("");

  // OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  // Step 2 — profile + plan
  const [profile, setProfile] = useState({ full_name: "", phone: "", address: "" });
  const [selectedPlan, setSelectedPlan] = useState("");
  const [saving, setSaving] = useState(false);

  const passwordsMatch = creds.password === creds.confirm_password;
  const canRegister = creds.email && creds.password && creds.confirm_password && passwordsMatch && agreed;
  const canFinish = profile.full_name && profile.phone && profile.address && selectedPlan;

  // ── Step 1a: Register account and send Base44 OTP ──
const handleRegister = async (e) => {
    e.preventDefault();
    if (!canRegister) return;
    setRegistering(true);
    setAuthError("");
    try {
      await signUp({ email: creds.email, password: creds.password });
      // Email confirmation is OFF — sign in immediately, skip OTP
      try { await signInWithPassword(creds.email, creds.password); } catch { /* already logged in */ }
    } catch (err) {
      const msg = err?.message || "";
      if (!msg.toLowerCase().includes("already") && !msg.toLowerCase().includes("exist")) {
        setAuthError(msg || "Registration failed. Please try again.");
        setRegistering(false);
        return;
      }
      // If already registered, just sign in
      try { await signInWithPassword(creds.email, creds.password); } catch { /* ignore */ }
    }
    setPhase("details");
    setStep(2);
    setRegistering(false);
  };

  // ── Step 1b: Verify OTP — Base44 verifies + creates session ──
  const handleVerifyOTP = async () => {
    setOtpError("");
    setOtpVerifying(true);
    try {
      await verifyOtp({ email: creds.email, otpCode: otpCode.trim() });
      // Ensure session is active after verification
      try { await signInWithPassword(creds.email, creds.password); } catch { /* already logged in */ }
      setPhase("details");
      setStep(2);
    } catch (err) {
      setOtpError(err?.message || "Incorrect or expired code. Please try again.");
    }
    setOtpVerifying(false);
  };

  // ── Resend OTP ──
  const handleResendOTP = async () => {
    setOtpError("");
    setOtpSuccess("");
    try {
      await resendOtp(creds.email);
    } catch {
      // ignore errors
    }
    setOtpSuccess(`A new code was sent to ${creds.email}`);
  };

  // ── Step 2: Save profile + plan and advance to Step 3 ──
  const handleFinish = async (e) => {
    e.preventDefault();
    if (!canFinish) return;
    setSaving(true);
    try {
      await updateMe({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        plan: selectedPlan,
        subscription_status: "inactive",
      });

      // Sync client to Admin/HR database
      try {
        await invokeFunction('syncClientToDatabase', {
          email: creds.email,
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        });
      } catch (err) {
        // Client sync is optional
      }
    } catch (err) {
      // proceed anyway
    }
    setPhase("subscription");
    setStep(3);
    setSaving(false);
  };

  // ── Step 3: Subscription complete ──
  const handleSubscriptionComplete = (status) => {
    navigate(createPageUrl("Dashboard"), { replace: true });
  };

  const handleSubscriptionSkip = async () => {
    await updateMe({ subscription_status: "inactive" }).catch(() => {});
    navigate(createPageUrl("Dashboard"), { replace: true });
  };

  const [subscriptionUser, setSubscriptionUser] = useState(null);
  const loadSubscriptionUser = async () => {
    const u = await getMe().catch(() => null);
    setSubscriptionUser(u);
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fadeUp { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-shrink-0 bg-[#0D0618] flex-col items-center justify-center">
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="relative z-10 px-12 text-center">
          <div className="flex justify-center mb-8">
            <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
              <path d="M50 10 L90 45 L80 45 L80 88 L20 88 L20 45 L10 45 Z" fill="#7C3AED"/>
              <rect x="38" y="60" width="24" height="28" rx="2" fill="#8B5CF6"/>
              <rect x="38" y="38" width="24" height="18" rx="2" fill="#C4B5FD"/>
              <path d="M15 92 Q50 85 85 92" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div className="text-white font-black text-3xl mb-2">HomeX</div>
          <div className="text-white/30 text-xs uppercase tracking-widest mb-8">Home Care Tech</div>
          <h2 className="text-2xl font-black text-white leading-snug mb-4">
            Your home deserves<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">expert care</span>
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">
            One subscription. Full annual coverage. Deep cleaning, fumigation, repairs, servicing and more — all handled for you.
          </p>
          <div className="mt-10 space-y-3">
            {["Create & verify your account", "Set up your home profile & plan", "Choose your subscription"].map((s, i) => (
              <div key={s} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                ${step === i + 1 ? "bg-purple-500/20 border-purple-500/40" : "bg-white/5 border-white/5"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-purple-500 text-white" : "bg-white/10 text-white/30"}`}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`text-sm font-medium ${step === i + 1 ? "text-white" : "text-white/30"}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <Logo />
          <Link to={createPageUrl("SignIn")} className="text-sm text-gray-500 hover:text-gray-700">
            Already have an account? <span className="text-purple-700 font-semibold">Sign In</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-14 xl:px-20 py-10">
          <div className="w-full max-w-lg anim-fadeUp" key={phase}>

            <StepIndicator step={step} />

            {/* ── CREDENTIALS ── */}
            {phase === "credentials" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-black text-gray-900">Create your account</h1>
                  <p className="text-gray-500 text-sm mt-1">You'll verify your email with a code in the next step.</p>
                </div>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                    <input type="email" value={creds.email} onChange={e => setCreds(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com" required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={creds.password}
                        onChange={e => setCreds(f => ({ ...f, password: e.target.value }))}
                        placeholder="Create a password" required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-300 pr-11" />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password *</label>
                    <div className="relative">
                      <input type={showConfirm ? "text" : "password"} value={creds.confirm_password}
                        onChange={e => setCreds(f => ({ ...f, confirm_password: e.target.value }))}
                        placeholder="Repeat your password" required
                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-300 pr-11
                          ${creds.confirm_password && !passwordsMatch ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {creds.confirm_password && !passwordsMatch && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                    onClick={() => setAgreed(!agreed)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all
                      ${agreed ? "bg-purple-600 border-purple-600" : "border-gray-300"}`}>
                      {agreed && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-600 leading-relaxed">
                      I agree to HomeX's <span className="text-purple-700 font-semibold">Terms of Service</span> and <span className="text-purple-700 font-semibold">Privacy Policy</span>
                    </span>
                  </label>
                  {authError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{authError}</p>}
                  <button type="submit" disabled={!canRegister || registering}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                    {registering
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account...</>
                      : <>Continue <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </>
            )}

            {/* ── OTP VERIFICATION ── */}
            {phase === "otp" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-black text-gray-900">Verify your email</h1>
                  <p className="text-gray-500 text-sm mt-1">
                    We sent a 6-digit code to <span className="font-semibold text-gray-700">{creds.email}</span>
                  </p>
                </div>
                {otpSuccess && (
                  <div className="mb-4 flex items-center gap-2 text-sm px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700">
                    <Mail className="w-4 h-4 flex-shrink-0" /> {otpSuccess}
                  </div>
                )}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enter OTP Code</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      className="w-full border border-gray-200 rounded-xl px-4 py-4 text-3xl font-black tracking-[0.5em] text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-200"
                    />
                  </div>
                  {otpError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{otpError}</p>}
                  <button onClick={handleVerifyOTP} disabled={otpCode.length < 6 || otpVerifying}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                    <KeyRound className="w-4 h-4" /> Verify & Continue
                  </button>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={handleResendOTP}
                      className="text-sm text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Resend Code
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── SUBSCRIPTION ── */}
            {phase === "subscription" && (() => {
              // Load user lazily
              if (!subscriptionUser) { loadSubscriptionUser(); return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>; }
              return (
                <SubscriptionStep
                  user={subscriptionUser}
                  planKey={selectedPlan}
                  onComplete={handleSubscriptionComplete}
                  onSkip={handleSubscriptionSkip}
                />
              );
            })()}

            {/* ── DETAILS + PLAN ── */}
            {phase === "details" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-black text-gray-900">Complete your profile</h1>
                  <p className="text-gray-500 text-sm mt-1">Tell us about yourself and pick a home care plan.</p>
                </div>
                <form onSubmit={handleFinish} className="space-y-4">
                  {/* Profile fields */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                    <input type="text" value={profile.full_name} onChange={e => setProfile(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="e.g. Adaeze Okonkwo" required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone Number *</span>
                    </label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+234 800 000 0000" required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Home Address *</span>
                    </label>
                    <textarea value={profile.address} onChange={e => setProfile(f => ({ ...f, address: e.target.value }))}
                      placeholder="e.g. 12 Banana Island Road, Ikoyi, Lagos" required rows={2}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-300 resize-none" />
                  </div>

                  {/* Plan selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Select Your Home Plan *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PLANS.map(plan => (
                        <button key={plan.key} type="button" onClick={() => setSelectedPlan(plan.key)}
                          className={`relative text-left rounded-2xl border-2 p-4 transition-all
                            ${selectedPlan === plan.key ? "border-purple-500 bg-purple-50" : "border-gray-100 hover:border-purple-200 bg-white"}`}>
                          {plan.popular && (
                            <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">Popular</span>
                          )}
                          <div className="flex items-center gap-2 mb-1">
                            <Home className={`w-4 h-4 ${selectedPlan === plan.key ? "text-purple-600" : "text-gray-400"}`} />
                            <span className={`text-sm font-bold ${selectedPlan === plan.key ? "text-purple-700" : "text-gray-800"}`}>{plan.label}</span>
                          </div>
                          <div className={`text-xl font-black ${selectedPlan === plan.key ? "text-purple-700" : "text-gray-900"}`}>
                            ₦{plan.price.toLocaleString()}
                            <span className="text-xs font-normal text-gray-400 ml-1">/ month</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={!canFinish || saving}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                    {saving
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Setting up...</>
                      : <><Sparkles className="w-4 h-4" /> Go to My Dashboard</>}
                  </button>
                  <p className="text-xs text-gray-400 text-center">You can always change your plan later from your profile.</p>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
