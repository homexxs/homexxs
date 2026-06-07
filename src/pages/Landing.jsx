import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Star, ArrowRight, Phone, Mail, MapPin,
  ChevronDown, Menu, X, CheckCircle, Sparkles,
  Brush, Bug, Leaf, Shield, Armchair, Blinds, Wind, Flame, Zap, Wrench, Package,
  Clock, Wallet, Settings, Home, Award
} from "lucide-react";

/* ─── DATA ────────────────────────────────────────────────── */
const COVER_ITEMS = [
  { Icon: Brush,    title: "Deep Cleaning",      text: "Every 2 months" },
  { Icon: Bug,      title: "Fumigation",          text: "Twice a year" },
  { Icon: Leaf,     title: "Mattress Vacuuming",  text: "Twice a year" },
  { Icon: Armchair, title: "Chair Cleaning",      text: "Every 4 months" },
  { Icon: Blinds,   title: "Curtain Cleaning",    text: "Twice a year" },
  { Icon: Wind,     title: "AC Servicing",        text: "Once a year" },
  { Icon: Flame,    title: "Gas Cooker Service",  text: "Once a year" },
  { Icon: Zap,      title: "Generator Service",   text: "Twice a year" },
  { Icon: Wrench,   title: "Routine Fixes",       text: "On-demand" },
];

const PLANS = [
  { size: "Mini Flat",         price: 10000,  popular: false },
  { size: "2 Bedroom Flat",    price: 15000,  popular: false },
  { size: "3 Bedroom Flat",    price: 20000,  popular: true  },
  { size: "3 Bedroom Duplex",  price: 25000,  popular: false },
  { size: "4 Bedroom Flat",    price: 30000,  popular: false },
  { size: "4 Bedroom Duplex",  price: 35000,  popular: false },
  { size: "5 Bedroom Mansion", price: 50000,  popular: false },
];

const TESTIMONIALS = [
  { name: "Adaeze O.", role: "3 Bedroom Subscriber", rating: 5, text: "HomeX completely changed how I manage my home. The deep cleaning team is thorough and always on time!" },
  { name: "Emeka B.", role: "2 Bedroom Subscriber",  rating: 5, text: "Worth every kobo. My AC, generator and even the gas cooker got serviced. No stress at all." },
  { name: "Funke A.", role: "Duplex Subscriber",     rating: 5, text: "The routine fixes saved me so much. They fixed a leaking sink and replaced a socket within hours." },
];

/* ─── IONIC-STYLE SVG ICONS ──────────────────────────────── */
const IonicShield = () => (
  <svg viewBox="0 0 512 512" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M256 32L48 144v128c0 107 89.4 204.5 208 239.1C374.6 476.5 464 379 464 272V144L256 32zm-16 312l-80-80 22.6-22.6L240 299l105.4-105.4L368 216 240 344z"/>
  </svg>
);
const IonicTime = () => (
  <svg viewBox="0 0 512 512" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm20 208h-40V144h40v112zm0 80h-40v-40h40v40z"/>
    <path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm0 380c-94.9 0-172-77.1-172-172S161.1 84 256 84s172 77.1 172 172-77.1 172-172 172zm20-292h-40v120l104 62 20-33-84-50V136z"/>
  </svg>
);
const IonicWallet = () => (
  <svg viewBox="0 0 512 512" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M461.2 128H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h384c8.84 0 16-7.16 16-16 0-26.51-21.49-48-48-48H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h397.2c28.02 0 50.8-21.53 50.8-48V176c0-26.47-22.78-48-50.8-48zM416 336c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"/>
  </svg>
);
const IonicBuild = () => (
  <svg viewBox="0 0 512 512" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M495.9 166.6c3.2 8.7.5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4l-55.7 17.7c-8.8 2.8-18.6.4-24.5-6.8-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4c-1.1-8.3-1.7-16.8-1.7-25.4s.6-17.1 1.7-25.4l-43.3-39.4c-6.9-6.2-9.6-15.9-6.4-24.6 4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2 5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.4 24.5 6.8 8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 0 0 0 160z"/>
  </svg>
);
const IonicHome = () => (
  <svg viewBox="0 0 512 512" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M261.56 101.28a8 8 0 00-11.06 0L66.4 277.35a8 8 0 00-2.47 5.79L63.9 448a32 32 0 0032 32H192a16 16 0 0016-16V328a8 8 0 018-8h80a8 8 0 018 8v136a16 16 0 0016 16h96.06a32 32 0 0032-32V283.14a8 8 0 00-2.47-5.79z"/>
    <path d="M490.91 244.15l-74.8-71.56V64a16 16 0 00-16-16h-48a16 16 0 00-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0043 267.56L256 67.69l213 199.87a16 16 0 0022.39-.44c6.34-6.37 5.64-16.middot.39-22.15-.69z"/>
  </svg>
);
const IonicStar = () => (
  <svg viewBox="0 0 512 512" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M394 480a16 16 0 01-9.39-3L256 383.76 127.39 477a16 16 0 01-24.55-17.74l45-162.68L23.57 200.15a16 16 0 019.21-28.46l173.28-4 57.79-166.06a16 16 0 0130.3 0l57.79 166.06 173.28 4a16 16 0 019.21 28.46L409.16 296.56l45 162.68A16 16 0 01394 480z"/>
  </svg>
);

const ABOUT_BENEFITS = [
  {
    Icon: IonicShield,
    title: "Full Annual Protection",
    desc: "One subscription covers your entire home for 365 days — scheduled services, routine checks, and on-demand fixes all year long.",
    color: "from-purple-500 to-purple-700",
    glow: "shadow-purple-200",
  },
  {
    Icon: IonicTime,
    title: "Reclaim Your Time",
    desc: "Work demands, family commitments, social engagements — life is full. Stop chasing handymen and let HomeX handle it all.",
    color: "from-indigo-500 to-indigo-700",
    glow: "shadow-indigo-200",
  },
  {
    Icon: IonicWallet,
    title: "Affordable Monthly Plans",
    desc: "Starting from just ₦10,000/month, our plans are designed to be accessible for every Nigerian home — big or small.",
    color: "from-violet-500 to-violet-700",
    glow: "shadow-violet-200",
  },
  {
    Icon: IonicBuild,
    title: "Repairs Without the Hassle",
    desc: "Bad bulb, broken tap, leaking sink, bad socket? Fixes within 10% of your cover are done without hesitation. For major fixes — you only pay for materials.",
    color: "from-fuchsia-500 to-fuchsia-700",
    glow: "shadow-fuchsia-200",
  },
];

/* ─── HELPERS ────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function CountUp({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function Logo({ size = 40, dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [aboutRef, aboutVisible] = useInView();

  const faqs = [
    { q: "What is included in the annual cover?", a: "Your cover includes deep cleaning every 2 months, twice-yearly fumigation, mattress & chair vacuuming, curtain cleaning, AC, gas cooker & generator servicing, routine fixes, and a Bluefusion home essentials box." },
    { q: "How does the monthly payment work?", a: "You pay a fixed monthly fee based on your home size. This gives you full annual coverage — all scheduled services and routine fixes are handled throughout the year at no extra cost." },
    { q: "What if I need a major repair?", a: "Minor fixes within 10% of your annual cover are done free of charge without hesitation. For major fixes, you only pay the basic cost of materials — all labour is on us." },
    { q: "Can I upgrade my plan?", a: "Yes! You can upgrade to a larger home category at any time. Simply contact us and we'll seamlessly adjust your plan." },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp   { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes floatY   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
        @keyframes scaleIn  { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
        @keyframes shimmer  { 0% { background-position:200% center; } 100% { background-position:-200% center; } }
        @keyframes spinSlow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .anim-fadeUp   { animation: fadeUp   0.7s ease both; }
        .anim-fadeIn   { animation: fadeIn   0.6s ease both; }
        .anim-floatY   { animation: floatY   4s ease-in-out infinite; }
        .anim-scaleIn  { animation: scaleIn  0.5s ease both; }
        .anim-shimmer  { background-size:300% auto; animation: shimmer 4s linear infinite; }
        .anim-spin     { animation: spinSlow 20s linear infinite; }
        .delay-100 { animation-delay:0.1s; }
        .delay-200 { animation-delay:0.2s; }
        .delay-300 { animation-delay:0.3s; }
        .delay-400 { animation-delay:0.4s; }
        .delay-500 { animation-delay:0.5s; }
        .delay-600 { animation-delay:0.6s; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo size={36} />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#about"   className="hover:text-purple-700 transition-colors">About</a>
            <a href="#cover"   className="hover:text-purple-700 transition-colors">Coverage</a>
            <a href="#pricing" className="hover:text-purple-700 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-purple-700 transition-colors">Contact</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/SignIn" className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
              Sign In
            </Link>
            <Link to={createPageUrl("Register")} className="px-5 py-2.5 bg-purple-700 text-white text-sm font-bold rounded-xl hover:bg-purple-800 transition-all shadow-lg shadow-purple-200/60">
              Get Started →
            </Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-3">
            {[["about","About"],["cover","Coverage"],["pricing","Pricing"],["contact","Contact"]].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-1">{label}</a>
            ))}
            <Link to="/SignIn" className="block w-full text-center py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Sign In
            </Link>
            <Link to={createPageUrl("Register")} className="block w-full text-center py-2.5 bg-purple-700 text-white text-sm font-bold rounded-xl">
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════
          HERO — CENTERED, PREMIUM, NON-GENERIC
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0D0618]">
        {/* Deep space background layers */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0618] via-purple-950/80 to-[#0D0618]" />
          {/* Glowing orbs */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-400/10 rounded-full blur-[80px]" />
          {/* Rotating ring */}
          <div className="anim-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-purple-800/20 rounded-full" />
          <div className="anim-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-purple-700/15 rounded-full" style={{animationDirection:"reverse",animationDuration:"15s"}} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{backgroundImage:"linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)",backgroundSize:"60px 60px"}} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-5 py-32 text-center">
          {/* Badge */}
          <div className="anim-fadeUp inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-300 text-xs font-semibold tracking-widest uppercase">Premier Home Care Technology</span>
          </div>

          {/* Headline */}
          <h1 className="anim-fadeUp delay-100 text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight">
            Your Home Deserves<br />
            <span className="anim-shimmer text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-violet-200 to-indigo-300">
              Expert Care
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="anim-fadeUp delay-200 text-lg md:text-xl text-white/60 leading-relaxed mb-10 max-w-2xl mx-auto font-light">
            Subscribe once. Pay monthly. Enjoy a <span className="text-white/90 font-semibold">complete annual cover</span> — deep cleaning, fumigation, repairs, servicing and more. All handled for you.
          </p>

          {/* CTAs */}
          <div className="anim-fadeUp delay-300 flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link to={createPageUrl("Register")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-2xl shadow-purple-500/30 text-sm">
              Start Your Subscription <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#cover"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/10 bg-white/5 text-white/80 font-semibold rounded-2xl hover:bg-white/10 hover:text-white transition-all text-sm backdrop-blur-sm">
              Explore Coverage
            </a>
          </div>

          {/* Floating service pills */}
          <div className="anim-fadeIn delay-400 flex flex-wrap justify-center gap-2 mb-14">
            {[
              { Icon: Brush,   label: "Deep Cleaning" },
              { Icon: Bug,     label: "Fumigation" },
              { Icon: Wind,    label: "AC Service" },
              { Icon: Wrench,  label: "Repairs" },
              { Icon: Zap,     label: "Generator" },
              { Icon: Leaf,    label: "Mattress Care" },
            ].map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 font-medium backdrop-blur-sm">
                <Icon className="w-3 h-3" />{label}
              </span>
            ))}
          </div>

          {/* Pricing anchor strip */}
          <div className="anim-fadeUp delay-500 inline-flex items-center gap-6 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-2xl font-black text-white">₦10K</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Mini Flat</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">₦20K</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">3-Bed Flat</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">₦50K</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Mansion</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-xs text-white/50 font-medium">per</div>
              <div className="text-white font-bold text-sm">month</div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <a href="#about" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </a>
      </section>

      {/* ══════════════════════════════════════════
          ABOUT — PREMIUM DARK CARDS WITH ANIMATION
      ══════════════════════════════════════════ */}
      <section id="about" className="py-28 bg-[#0F0A1A] relative overflow-hidden" ref={aboutRef}>
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{backgroundImage:"radial-gradient(circle, #a78bfa 1px, transparent 1px)",backgroundSize:"32px 32px"}} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        <div className="max-w-6xl mx-auto px-5 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-5 transition-all duration-700 ${aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" /> About HomeX
            </div>
            <h2 className={`text-3xl md:text-5xl font-black text-white leading-tight mb-5 transition-all duration-700 delay-100 ${aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              Life is full. Your home<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">shouldn't be a chore.</span>
            </h2>
            <p className={`text-white/50 max-w-2xl mx-auto text-base leading-relaxed transition-all duration-700 delay-200 ${aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              HomeX is an exclusive home care subscription that ensures your home is always well taken care of — from routine deep cleaning and fumigation to routine checks and quick fixes. Subscribe, pay monthly, and enjoy total home care cover for a full year.
            </p>
          </div>

          {/* Benefit cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ABOUT_BENEFITS.map(({ Icon, title, desc, color, glow }, i) => (
              <div
                key={title}
                className={`group relative bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-purple-500/30 rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:${glow} cursor-default
                  ${aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: aboutVisible ? `${i * 120}ms` : "0ms" }}
              >
                {/* Glow orb on hover */}
                <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${color} blur-[60px] -z-10`} style={{opacity:0.05}} />

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon />
                </div>

                <h3 className="font-bold text-white text-base mb-2 leading-snug">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed group-hover:text-white/60 transition-colors duration-300">{desc}</p>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-60 transition-opacity duration-300 rounded-full`} />
              </div>
            ))}
          </div>

          {/* Quote strip */}
          <div className={`mt-14 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 backdrop-blur-sm p-8 text-center transition-all duration-700 delay-500 ${aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-white/70 text-lg font-light leading-relaxed max-w-3xl mx-auto">
              "Once you subscribe and make your monthly payment, your home will have the{" "}
              <span className="text-purple-300 font-semibold">total HomeX care cover for one full year</span> — with no hidden charges and no surprises."
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT'S COVERED ── */}
      <section id="cover" className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" /> Annual Cover
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Everything Included in Your Cover
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">One subscription. Ten comprehensive services. Total peace of mind for your home all year round.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {COVER_ITEMS.map((item, i) => (
              <div key={i} className="group bg-white/[0.03] hover:bg-purple-500/10 border border-white/[0.06] hover:border-purple-500/30 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 cursor-default">
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 group-hover:scale-110 transition-all duration-300">
                    <item.Icon className="w-5 h-5 text-purple-300" />
                  </div>
                </div>
                <div className="text-sm font-bold text-white/80 mb-1 group-hover:text-white transition-colors">{item.title}</div>
                <div className="text-xs text-white/30 group-hover:text-purple-300 transition-colors">{item.text}</div>
              </div>
            ))}
          </div>

          {/* Bonus box */}
          <div className="mt-8 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/20 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm">
            <div className="anim-floatY flex-shrink-0 w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Package className="w-7 h-7 text-purple-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black text-white mb-2">Bluefusion Home Essentials Box</h3>
              <p className="text-white/50 text-sm leading-relaxed">Every subscriber receives a complimentary box of Bluefusion home essentials — premium cleaning and home care products curated for your household.</p>
            </div>
            <Link to={createPageUrl("Register")} className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-purple-500 hover:to-indigo-500 transition-all text-sm whitespace-nowrap shadow-lg shadow-purple-500/30">
              Claim Yours →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-[#0D0618] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]"
          style={{backgroundImage:"linear-gradient(rgba(139,92,246,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,.5) 1px,transparent 1px)",backgroundSize:"48px 48px"}} />
        <div className="max-w-6xl mx-auto px-5 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" /> Pricing Plans
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">Priced for Every Home</h2>
            <p className="text-white/40 max-w-xl mx-auto">Choose the plan that matches your home size. Every plan includes the complete annual cover.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {PLANS.map(plan => (
              <div key={plan.size} className={`relative group rounded-3xl border transition-all duration-300 hover:-translate-y-1 overflow-hidden
                ${plan.popular
                  ? "border-purple-500/60 bg-gradient-to-b from-purple-900/40 to-indigo-900/30 shadow-2xl shadow-purple-500/20"
                  : "border-white/[0.07] bg-white/[0.03] hover:border-purple-500/30 hover:bg-white/[0.06]"}`}>
                {plan.popular && (
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold text-center py-2 tracking-widest uppercase flex items-center justify-center gap-1.5">
                    <Star className="w-3 h-3 fill-current" /> Most Popular
                  </div>
                )}
                <div className="p-6">
                  <div className="mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center">
                      <Home className="w-5 h-5 text-purple-300" />
                    </div>
                  </div>
                  <div className="font-bold text-white mb-1">{plan.size}</div>
                  <div className="text-3xl font-black text-white mb-0.5">
                    ₦{plan.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/30 mb-2">per month</div>
                  <div className="text-xs text-white/30 mb-6">
                    ₦<span className="text-white/50 font-semibold">{(plan.price * 12).toLocaleString()}</span> / year
                  </div>
                  <Link
                    to={createPageUrl("Register")}
                    className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all
                      ${plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/30"
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-purple-500/20 hover:text-white hover:border-purple-500/40"}`}
                  >
                    Subscribe Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/25 mt-6">
            All plans include the <span className="text-white/50 font-semibold">full HomeX annual cover</span>. No hidden charges.
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" /> Testimonials
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">What Our Subscribers Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-purple-500/30 rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-white/50 text-sm leading-relaxed mb-6 group-hover:text-white/70 transition-colors">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{t.name}</div>
                    <div className="text-xs text-white/30">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 bg-[#0D0618] relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" /> FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all duration-200 ${activeFaq === i ? "border-purple-500/40" : "border-white/[0.06] hover:border-white/10"}`}>
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-white/80 text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform flex-shrink-0 ${activeFaq === i ? "rotate-180" : ""}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-5 text-sm text-white/40 leading-relaxed border-t border-white/[0.04] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto px-5 text-center relative z-10">
          <div className="anim-floatY mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Home className="w-8 h-8 text-purple-300" />
          </div>
        </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight">
            Ready to Protect<br />Your Home?
          </h2>
          <p className="text-white/50 text-lg mb-10 leading-relaxed">
            Join Nigerian families who've handed their home care worries to HomeX.<br />Start from just <span className="text-white font-bold">₦10,000/month</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl("Register")} className="inline-flex items-center justify-center gap-2 px-9 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-2xl shadow-purple-500/30 text-sm">
              Get Started Today <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#pricing" className="inline-flex items-center justify-center gap-2 px-9 py-4 border border-white/10 bg-white/5 text-white/70 font-semibold rounded-2xl hover:bg-white/10 hover:text-white transition-all text-sm">
              View Pricing Plans
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#070310] text-white py-14 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div>
              <Logo size={40} dark />
              <p className="text-white/30 text-sm mt-4 leading-relaxed">
                Nigeria's premier home care technology service. HomeX takes care of your home so you can take care of everything else.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-white/50">Services Covered</h4>
              <ul className="space-y-2 text-sm text-white/30">
                {["Deep Cleaning","Fumigation","AC Servicing","Generator Servicing","Curtain & Mattress Cleaning","Routine Repairs"].map(s => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-purple-500 rounded-full flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-white/50">Get In Touch</h4>
              <div className="space-y-3 text-sm text-white/30">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-purple-400" /> holdit.com@gmail.com</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-purple-400" /> +234 8095490396</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-purple-400" /> +234 8067644782</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.05] pt-6" />
        </div>
      </footer>
    </div>
  );
}