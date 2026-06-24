import { updateMe } from '@/lib/auth-helpers';
import { useState } from "react";
import { MessageCircle, SkipForward } from "lucide-react";

const PLAN_PRICES = {
  mini_flat: 10000,
  "2_bedroom_flat": 15000,
  "3_bedroom_flat": 20000,
  "3_bedroom_duplex": 25000,
  "4_bedroom_flat": 30000,
  "4_bedroom_duplex": 35000,
  "5_bedroom_mansion": 50000,
};

const PLAN_LABELS = {
  mini_flat: "Mini Flat",
  "2_bedroom_flat": "2 Bedroom Flat",
  "3_bedroom_flat": "3 Bedroom Flat",
  "3_bedroom_duplex": "3 Bedroom Duplex",
  "4_bedroom_flat": "4 Bedroom Flat",
  "4_bedroom_duplex": "4 Bedroom Duplex",
  "5_bedroom_mansion": "5 Bedroom Mansion",
};

const DURATIONS = [
  { key: "1_month",   label: "1 Month",   months: 1,  discount: 0 },
  { key: "3_months",  label: "3 Months",  months: 3,  discount: 0.02 },
  { key: "6_months",  label: "6 Months",  months: 6,  discount: 0.05 },
  { key: "1_year",    label: "1 Year",    months: 12, discount: 0.10 },
];

const WHATSAPP_NUMBER = "2348067644782";

function calcAmount(basePrice, months, discount) {
  const raw = basePrice * months;
  return Math.round(raw * (1 - discount));
}

export default function SubscriptionStep({ user, planKey, onComplete, onSkip }) {
  const basePrice = PLAN_PRICES[planKey] || 10000;
  const planLabel = PLAN_LABELS[planKey] || planKey?.replace(/_/g, " ");

  const [selectedDuration, setSelectedDuration] = useState(null);

  const dur = DURATIONS.find(d => d.key === selectedDuration);
  const totalAmount = dur ? calcAmount(basePrice, dur.months, dur.discount) : 0;
  const rawAmount = dur ? basePrice * dur.months : 0;
  const savings = rawAmount - totalAmount;

  const handleWhatsApp = () => {
    const msg = `Hello HomeX! I just completed my onboarding and would like to activate my subscription.\n\n*Subscription Summary*\n👤 *Name:* ${user?.full_name || user?.email}\n📧 *Email:* ${user?.email}\n🏠 *Plan:* ${planLabel}\n📅 *Duration:* ${dur?.label}\n💳 *Amount:* ₦${totalAmount.toLocaleString()}${savings > 0 ? ` (saving ₦${savings.toLocaleString()})` : ""}\n\nKindly assist me with payment and account activation. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    // Mark as pending and redirect
    updateMe({ subscription_status: "pending", subscription_duration: selectedDuration, subscription_amount: totalAmount })
      .then(() => onComplete("pending"))
      .catch(() => onComplete("pending"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Choose Your Subscription</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your plan: <span className="font-semibold text-purple-700">{planLabel}</span> · ₦{basePrice.toLocaleString()}/month
        </p>
      </div>

      {/* Duration Cards */}
      <div className="grid grid-cols-2 gap-3">
        {DURATIONS.map(d => {
          const amt = calcAmount(basePrice, d.months, d.discount);
          const raw = basePrice * d.months;
          const save = raw - amt;
          const isSelected = selectedDuration === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDuration(d.key)}
              className={`relative text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? "border-purple-500 bg-purple-50" : "border-gray-100 bg-white hover:border-purple-200"}`}
            >
              {d.discount > 0 && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  -{Math.round(d.discount * 100)}% OFF
                </div>
              )}
              <div className={`text-sm font-black mb-1 ${isSelected ? "text-purple-700" : "text-gray-800"}`}>{d.label}</div>
              <div className={`text-lg font-black ${isSelected ? "text-purple-700" : "text-gray-900"}`}>
                ₦{amt.toLocaleString()}
              </div>
              {save > 0 ? (
                <div className="text-[10px] text-green-600 font-semibold mt-0.5">Save ₦{save.toLocaleString()}</div>
              ) : (
                <div className="text-[10px] text-gray-400 mt-0.5">₦{basePrice.toLocaleString()} × {d.months}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Payment - Contact Accountant only */}
      {selectedDuration && (
        <div className="space-y-3">
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-center">
            <div className="text-sm text-gray-600">Total to pay</div>
            <div className="text-3xl font-black text-purple-700">₦{totalAmount.toLocaleString()}</div>
            {savings > 0 && <div className="text-xs text-green-600 font-semibold mt-1">You save ₦{savings.toLocaleString()} 🎉</div>}
          </div>
          <button
            onClick={handleWhatsApp}
            className="w-full flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all"
          >
            <MessageCircle className="w-7 h-7 text-green-600" />
            <div className="text-sm font-bold text-gray-800">Contact Accountant</div>
            <div className="text-[10px] text-gray-400 text-center">Pay via WhatsApp</div>
          </button>
        </div>
      )}

      {/* Skip */}
      <button
        onClick={onSkip}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <SkipForward className="w-4 h-4" /> Skip for now (account will be inactive)
      </button>
    </div>
  );
}
