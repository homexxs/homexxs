import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, updateMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SubscriptionStep from "@/components/subscription/SubscriptionStep";

export default function Subscribe() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => { navigate("/SignIn", { replace: true }); });
  }, []);

  const handleComplete = () => navigate("/Dashboard", { replace: true });
  const handleSkip = async () => {
    await updateMe({ subscription_status: "inactive" }).catch(() => {});
    navigate("/Dashboard", { replace: true });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');`}</style>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
            <path d="M50 10 L90 45 L80 45 L80 88 L20 88 L20 45 L10 45 Z" fill="#7C3AED"/>
            <rect x="38" y="60" width="24" height="28" rx="2" fill="#8B5CF6"/>
            <rect x="38" y="38" width="24" height="18" rx="2" fill="#C4B5FD"/>
          </svg>
          <span className="font-black text-xl text-gray-900">HomeX</span>
        </div>
        <SubscriptionStep
          user={user}
          planKey={user?.plan || "3_bedroom_flat"}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}