import { Lock, Sparkles, MessageCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WHATSAPP_NUMBER = "2348067644782";

export default function SubscriptionLock({ user, onClose }) {
  const navigate = useNavigate();
  const handleWhatsApp = () => {
    const msg = `Hello HomeX! I'd like to activate my subscription and unlock my account.\n\n👤 *Name:* ${user?.full_name || "Client"}\n📧 *Email:* ${user?.email}\n\nPlease help me get started. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Feature Locked</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          This feature requires an active HomeX subscription. Subscribe to unlock full access to all modules.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate("/Subscribe")}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all text-sm shadow-lg shadow-purple-200"
          >
            <Sparkles className="w-4 h-4" /> Subscribe & Unlock HomeX
          </button>
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 border border-green-200 font-semibold rounded-xl hover:bg-green-100 transition-all text-sm"
          >
            <MessageCircle className="w-4 h-4" /> Contact Accountant via WhatsApp
          </button>
        </div>
        {user?.subscription_status === "pending" && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-4">
            ⏳ Your payment is pending verification. Our accountant will activate your account shortly.
          </p>
        )}
      </div>
    </div>
  );
}