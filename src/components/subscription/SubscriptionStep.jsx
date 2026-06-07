import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { updateMe } from '@/lib/auth-helpers';
import { uploadFile } from '@/lib/integrations';
import { useState } from "react";
import { CheckCircle, MessageCircle, Upload, X, CreditCard, Phone, ArrowRight, SkipForward } from "lucide-react";

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

// HomeX bank account details
const ACCOUNT_DETAILS = {
  bank: "Stanbic Bank",
  account_name: "Hold It Services Limited",
  account_number: "0076802099",
};

const WHATSAPP_NUMBER = "2348067644782";

function calcAmount(basePrice, months, discount) {
  const raw = basePrice * months;
  return Math.round(raw * (1 - discount));
}

export default function SubscriptionStep({ user, planKey, onComplete, onSkip }) {
  const basePrice = PLAN_PRICES[planKey] || 10000;
  const planLabel = PLAN_LABELS[planKey] || planKey?.replace(/_/g, " ");

  const [selectedDuration, setSelectedDuration] = useState(null);
  const [payMode, setPayMode] = useState(null); // "pay_now" | "contact_accountant" | null
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const dur = DURATIONS.find(d => d.key === selectedDuration);
  const totalAmount = dur ? calcAmount(basePrice, dur.months, dur.discount) : 0;
  const rawAmount = dur ? basePrice * dur.months : 0;
  const savings = rawAmount - totalAmount;

  const handleUploadReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile({ file });
    setReceiptUrl(file_url);
    setUploading(false);
  };

  const handleSubmitPayment = async () => {
    if (!receiptUrl || !dur) return;
    setSubmitting(true);

    // Create pending payment record
    const ref = `SUB-${Date.now()}`;
    await create(TABLES.payments, {
      client_email: user.email,
      client_name: user.full_name,
      booking_id: ref,
      amount: totalAmount,
      currency: "NGN",
      status: "pending",
      payment_type: "subscription",
      subscription_duration: selectedDuration,
      transaction_ref: ref,
      service_type: `Subscription - ${dur.label} (${planLabel})`,
      receipt_url: receiptUrl,
      notes: `Self-onboarding subscription. Plan: ${planLabel}, Duration: ${dur.label}, Amount: ₦${totalAmount.toLocaleString()}`,
    });

    // Update user subscription_status to "pending" (awaiting admin activation)
    await updateMe({
      subscription_status: "pending",
      subscription_duration: selectedDuration,
      subscription_amount: totalAmount,
    });

    setDone(true);
    setSubmitting(false);
    // small delay then proceed to dashboard
    setTimeout(() => onComplete("pending"), 1500);
  };

  const handleWhatsApp = () => {
    const msg = `Hello HomeX! I just completed my onboarding and would like to activate my subscription.\n\n*Subscription Summary*\n👤 *Name:* ${user?.full_name || user?.email}\n📧 *Email:* ${user?.email}\n🏠 *Plan:* ${planLabel}\n📅 *Duration:* ${dur?.label}\n💳 *Amount:* ₦${totalAmount.toLocaleString()}${savings > 0 ? ` (saving ₦${savings.toLocaleString()})` : ""}\n\nKindly assist me with payment and account activation. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    // Mark as pending and redirect
    updateMe({ subscription_status: "pending", subscription_duration: selectedDuration, subscription_amount: totalAmount })
      .then(() => onComplete("pending"))
      .catch(() => onComplete("pending"));
  };

  if (done) return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-black text-gray-900">Receipt Submitted!</h3>
      <p className="text-gray-500 text-sm">Our accountant will verify your payment and activate your account shortly.</p>
    </div>
  );

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
              onClick={() => { setSelectedDuration(d.key); setPayMode(null); setReceiptUrl(null); }}
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

      {/* Payment Method */}
      {selectedDuration && !payMode && (
        <div className="space-y-3">
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-center">
            <div className="text-sm text-gray-600">Total to pay</div>
            <div className="text-3xl font-black text-purple-700">₦{totalAmount.toLocaleString()}</div>
            {savings > 0 && <div className="text-xs text-green-600 font-semibold mt-1">You save ₦{savings.toLocaleString()} 🎉</div>}
          </div>
          <p className="text-sm font-semibold text-gray-700 text-center">How would you like to pay?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPayMode("pay_now")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all"
            >
              <CreditCard className="w-6 h-6 text-purple-600" />
              <div className="text-sm font-bold text-gray-800">Pay Now</div>
              <div className="text-[10px] text-gray-400 text-center">Transfer & upload receipt</div>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all"
            >
              <MessageCircle className="w-6 h-6 text-green-600" />
              <div className="text-sm font-bold text-gray-800">Contact Accountant</div>
              <div className="text-[10px] text-gray-400 text-center">Pay via WhatsApp</div>
            </button>
          </div>
        </div>
      )}

      {/* Pay Now: Account Details + Receipt Upload */}
      {payMode === "pay_now" && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-3">Bank Transfer Details</div>
            <div className="space-y-2">
              {[
                { label: "Bank", value: ACCOUNT_DETAILS.bank },
                { label: "Account Name", value: ACCOUNT_DETAILS.account_name },
                { label: "Account Number", value: ACCOUNT_DETAILS.account_number },
                { label: "Amount", value: `₦${totalAmount.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Payment Receipt *</label>
            {!receiptUrl ? (
              <label className="flex flex-col items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all">
                <Upload className="w-7 h-7 text-gray-300" />
                <span className="text-sm text-gray-500 font-medium">Click to upload receipt</span>
                <span className="text-xs text-gray-400">PNG, JPG, PDF accepted</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadReceipt} />
                {uploading && <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mt-1" />}
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-800 flex-1">Receipt uploaded ✓</span>
                <button onClick={() => setReceiptUrl(null)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmitPayment}
            disabled={!receiptUrl || submitting}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : <><ArrowRight className="w-4 h-4" /> Submit & Go to Dashboard</>}
          </button>
          <button onClick={() => setPayMode(null)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">← Change payment method</button>
        </div>
      )}

      {/* Skip */}
      {!payMode && (
        <button
          onClick={onSkip}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <SkipForward className="w-4 h-4" /> Skip for now (account will be inactive)
        </button>
      )}
    </div>
  );
}