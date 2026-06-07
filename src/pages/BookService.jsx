import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { invokeFunction } from '@/lib/api';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, MapPin, Clock, CalendarDays, ChevronRight, CheckCircle, ChevronLeft, Users, Plus, Trash2, MessageCircle, Lock } from "lucide-react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isToday, isBefore, startOfDay } from "date-fns";

const timeSlots = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
];

const STEPS = ["Choose Service", "Pick Date & Time", "Details", "Confirm"];

export default function BookService() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [date, setDate] = useState(null);
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [bookedDays, setBookedDays] = useState([]);

  // Request for others
  const [forOthers, setForOthers] = useState(false);
  const [recipients, setRecipients] = useState([{ name: "", phone: "", address: "", package: "" }]);

  useEffect(() => {
    getMe().then(u => {
      setUser(u);
      if (u) {
        setAddress(u.address || "");
        filter(TABLES.bookings, { client_email: u.email }, "-scheduled_date", 100)
          .then(b => setBookedDays(b.filter(x => x.status !== "cancelled").map(x => x.scheduled_date)))
          .catch(() => {});
      }
    }).catch(() => {});

    // Load active services from DB (reflects admin changes in real-time)
    filter(TABLES.service_offerings, { is_active: true }, "name", 100)
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoadingServices(false));

    // Real-time: update services list when admin changes them
    const unsub = subscribe(TABLES.service_offerings, e => {
      if (e.type === "create" && e.data.is_active) setServices(p => [...p, e.data]);
      else if (e.type === "update") setServices(p => {
        const updated = p.filter(s => s.id !== e.id);
        return e.data.is_active ? [...updated, e.data] : updated;
      });
      else if (e.type === "delete") setServices(p => p.filter(s => s.id !== e.id));
    });
    return unsub;
  }, []);

  const selectedService = services.find(s => s.id === selected);
  // Use the service's own icon/color; fallback dot color for calendar
  const svcDotColor = "bg-indigo-600";
  const svcBadge = "bg-indigo-50 text-indigo-700 border-indigo-200";

  const days = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const startDayOfWeek = startOfMonth(calMonth).getDay();
  const today = startOfDay(new Date());

  const handleBook = async () => {
    if (!user) return;
    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");

    if (forOthers) {
      // Create a booking for each recipient
      for (const r of recipients) {
        if (!r.name || !r.address) continue;
        await create(TABLES.bookings, {
          client_email: user.email,
          client_name: r.name,
          service_type: selectedService?.slug || selected,
          scheduled_date: dateStr,
          scheduled_time: time,
          address: r.address,
          notes: `Requested by ${user.full_name} for ${r.name}${r.phone ? ` (${r.phone})` : ""}. Package: ${r.package || "Standard"}. ${notes}`.trim(),
          status: "pending",
          payment_status: "unpaid",
          price: selectedService?.price || 0,
        });
      }
      await create(TABLES.notifications, {
        recipient_email: user.email,
        title: "Group Booking Received! 🎉",
        message: `Your request for ${recipients.length} recipient(s) on ${dateStr} at ${time} is pending assignment.`,
        type: "booking_confirmed",
        related_id: user.id,
      });
      // Send email notification
      try {
        await invokeFunction('sendClientNotifications', {
          type: 'booking_created',
          booking: { service_type: selectedService?.slug, scheduled_date: dateStr, scheduled_time: time, address, price: selectedService?.price },
          user,
        });
      } catch (err) {
        // Email sending is optional
      }
    } else {
      const booking = await create(TABLES.bookings, {
        client_email: user.email,
        client_name: user.full_name,
        service_type: selectedService?.slug || selected,
        scheduled_date: dateStr,
        scheduled_time: time,
        address,
        notes,
        status: "pending",
        payment_status: "unpaid",
        price: selectedService?.price || 0,
      });
      await create(TABLES.notifications, {
        recipient_email: user.email,
        title: "Booking Received! 🎉",
        message: `Your ${selectedService?.name} on ${dateStr} at ${time} is confirmed and pending assignment.`,
        type: "booking_confirmed",
        related_id: booking.id,
      });
      // Send email notification
      try {
        await invokeFunction('sendClientNotifications', {
          type: 'booking_created',
          booking,
          user,
        });
      } catch (err) {
        // Email sending is optional
      }
    }
    setLoading(false);
    setDone(true);
  };

  const addRecipient = () => setRecipients(p => [...p, { name: "", phone: "", address: "", package: "" }]);
  const removeRecipient = (i) => setRecipients(p => p.filter((_, idx) => idx !== i));
  const updateRecipient = (i, field, val) => setRecipients(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const reset = () => {
    setDone(false); setStep(1); setSelected(null); setDate(null); setTime("");
    setAddress(user?.address || ""); setNotes("");
    setForOthers(false); setRecipients([{ name: "", phone: "", address: "", package: "" }]);
  };

  if (loadingServices) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  // Lock feature for inactive/pending clients
  if (user && user.subscription_status !== "active") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-purple-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Book a Service — Locked</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-sm leading-relaxed">
          {user?.subscription_status === "pending"
            ? "Your payment is pending verification. Booking will unlock once your account is activated by our team."
            : "An active HomeX subscription is required to book services."}
        </p>
        {user?.subscription_status === "pending" ? (
          <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold">
            ⏳ Awaiting account activation
          </span>
        ) : (
          <a href="/Subscribe" className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all text-sm shadow-lg shadow-purple-200">
            <Sparkles className="w-4 h-4" /> Subscribe to Unlock
          </a>
        )}
      </div>
    );
  }

  const totalAmount = (selectedService?.price || 0) * (forOthers ? recipients.filter(r => r.name).length : 1);

  const buildWhatsAppLink = () => {
    const phone = "2348067644782";
    let msg = `Hello HomeX! I just booked a service and would like to make payment.\n\n`;
    msg += `*Booking Summary*\n`;
    msg += `👤 *Client:* ${user?.full_name || user?.email}\n`;
    msg += `🛠️ *Service:* ${selectedService?.name}\n`;
    msg += `📅 *Date:* ${date ? format(date, "EEEE, MMMM d, yyyy") : "—"}\n`;
    msg += `🕐 *Time:* ${time}\n`;
    if (!forOthers) {
      msg += `📍 *Address:* ${address}\n`;
      if (notes) msg += `📝 *Notes:* ${notes}\n`;
    } else {
      const valid = recipients.filter(r => r.name);
      msg += `👥 *Booking for ${valid.length} recipient(s):*\n`;
      valid.forEach((r, i) => {
        msg += `  ${i + 1}. ${r.name}${r.phone ? ` (${r.phone})` : ""} — ${r.address}${r.package ? ` [${r.package}]` : ""}\n`;
      });
    }
    msg += `\n💳 *Total Amount:* ₦${totalAmount.toLocaleString()}\n`;
    msg += `\nKindly confirm payment details. Thank you! 🙏`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  if (done) return (
    <div className="flex items-center justify-center min-h-[80vh] p-6">
      <div className="text-center max-w-md w-full">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl">
          {selectedService?.icon || "🏠"}
        </div>
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto -mt-8 mb-4 ring-4 ring-white">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Submitted!</h2>
        <p className="text-gray-500 mb-1">{selectedService?.name} scheduled for</p>
        <p className="text-indigo-600 font-bold text-lg mb-1">{date ? format(date, "EEEE, MMMM d, yyyy") : ""}</p>
        <p className="text-gray-400 text-sm mb-6">at {time} · We'll notify you once confirmed</p>

        {/* Payment CTA */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 text-left">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="font-bold text-green-900 text-sm">Complete Your Payment</span>
          </div>
          <p className="text-sm text-green-800 mb-1">
            To confirm your booking, please pay <span className="font-black">₦{totalAmount.toLocaleString()}</span> via WhatsApp to our accountant.
          </p>
          <p className="text-xs text-green-700 mb-4">Send your payment proof and booking details via the link below.</p>
          <a
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md shadow-green-200"
          >
            <MessageCircle className="w-4 h-4" />
            Pay via WhatsApp · ₦{totalAmount.toLocaleString()}
          </a>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(createPageUrl("CalendarView"))} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            View Calendar
          </button>
          <button onClick={reset} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Book Another
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Book a Service</h2>
        <p className="text-gray-500 mt-1 text-sm">Schedule a professional home service in a few steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${step > i + 1 ? "bg-green-100 text-green-700" : step === i + 1 ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-gray-100 text-gray-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px]
                ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-white/20" : "bg-gray-200 text-gray-400"}`}>
                {step > i + 1 ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${step > i + 1 ? "bg-green-300" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Service Selection (live from DB) ── */}
      {step === 1 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.length === 0 && (
            <div className="col-span-3 py-16 text-center text-gray-400">
              <div className="text-4xl mb-3">🛠️</div>
              <p className="text-sm">No services available at the moment. Please check back soon.</p>
            </div>
          )}
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelected(s.id); setStep(2); }}
              className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg group
                ${selected === s.id ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-gray-100 bg-white hover:border-indigo-200"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{s.icon || "🏠"}</span>
                {s.duration_hours && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-indigo-50 text-indigo-600 border-indigo-200">
                    {s.duration_hours}h
                  </span>
                )}
              </div>
              <div className="font-bold text-gray-900">{s.name}</div>
              <div className="text-xs text-gray-500 mt-1 mb-3 leading-relaxed">{s.description}</div>
              <div className="flex items-center justify-between">
                <div className="text-indigo-600 font-bold text-sm">₦{(s.price || 0).toLocaleString()}</div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── STEP 2: Interactive Calendar ── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Service badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${svcBadge}`}>
            <span className="text-lg">{selectedService?.icon || "🏠"}</span>
            <span className="font-semibold text-sm">{selectedService?.name}</span>
            <span className="font-bold text-sm">· ₦{selectedService?.price?.toLocaleString()}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar picker */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm text-gray-900">{format(calMonth, "MMMM yyyy")}</span>
                <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-7 mb-1">
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1.5">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array(startDayOfWeek).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                  {days.map(day => {
                    const isPast = isBefore(day, today);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isDisabled = isPast || isWeekend;
                    const isSelected = date && isSameDay(day, date);
                    const hasBooking = bookedDays.some(d => isSameDay(new Date(d), day));
                    return (
                      <button
                        key={day.toISOString()}
                        disabled={isDisabled}
                        onClick={() => setDate(day)}
                        className={`h-9 w-full rounded-lg text-xs font-semibold transition-all relative
                          ${isDisabled ? "text-gray-200 cursor-not-allowed" :
                            isSelected ? "bg-indigo-600 text-white shadow-md" :
                            isToday(day) ? "ring-2 ring-inset ring-indigo-300 text-indigo-600 hover:bg-indigo-50" :
                            "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"}`}
                      >
                        {format(day, "d")}
                        {hasBooking && !isPast && (
                          <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-indigo-400"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {date && (
                <div className={`px-4 py-3 border-t border-gray-100 text-sm font-semibold text-center ${svcBadge}`}>
                  📅 {format(date, "EEEE, MMMM d, yyyy")}
                </div>
              )}
            </div>

            {/* Time slots */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Choose a Time
              </div>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map(t => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all
                      ${time === t
                        ? "bg-indigo-600 text-white border-transparent shadow-md"
                        : "border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Back
            </button>
            <button
              onClick={() => { if (date && time) setStep(3); }}
              disabled={!date || !time}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Address & Notes ── */}
      {step === 3 && (
        <div className="space-y-6 max-w-2xl">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${svcBadge}`}>
            <span className="text-lg">{selectedService?.icon || "🏠"}</span>
            <span className="font-semibold text-sm">{selectedService?.name}</span>
            <span className="text-gray-400 text-xs">·</span>
            <span className="text-sm font-medium">{date ? format(date, "MMM d") : ""} at {time}</span>
          </div>

          {/* Request for others toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Request for Others</div>
                  <div className="text-xs text-gray-400">Book for family, friends, church, etc.</div>
                </div>
              </div>
              <button
                onClick={() => setForOthers(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${forOthers ? "bg-indigo-600" : "bg-gray-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${forOthers ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </div>

          {/* For others: recipients */}
          {forOthers ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Recipient Details ({recipients.length})
                </div>
                <button onClick={addRecipient} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Person
                </button>
              </div>
              {recipients.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Person {i + 1}</div>
                    {recipients.length > 1 && (
                      <button onClick={() => removeRecipient(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                      <input
                        value={r.name}
                        onChange={e => updateRecipient(i, "name", e.target.value)}
                        placeholder="e.g. Chidi Okafor"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                      <input
                        value={r.phone}
                        onChange={e => updateRecipient(i, "phone", e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Home Address *</label>
                    <textarea
                      value={r.address}
                      onChange={e => updateRecipient(i, "address", e.target.value)}
                      rows={2}
                      placeholder="Their full home address for service delivery"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Package / Home Type</label>
                    <select
                      value={r.package}
                      onChange={e => updateRecipient(i, "package", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      <option value="">Select home type...</option>
                      <option value="Mini Flat">Mini Flat</option>
                      <option value="2 Bedroom Flat">2 Bedroom Flat</option>
                      <option value="3 Bedroom Flat">3 Bedroom Flat</option>
                      <option value="3 Bedroom Duplex">3 Bedroom Duplex</option>
                      <option value="4 Bedroom Flat">4 Bedroom Flat</option>
                      <option value="4 Bedroom Duplex">4 Bedroom Duplex</option>
                      <option value="5 Bedroom Mansion">5 Bedroom Mansion</option>
                      <option value="Office / Church / Others">Office / Church / Others</option>
                    </select>
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional Notes <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any extra instructions for all recipients"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
            </div>
          ) : (
            /* Normal: for self */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <MapPin className="w-4 h-4 inline mr-1 text-gray-400" /> Service Address *
                </label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Enter your full address"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Special Instructions <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any specific areas to focus on, access instructions, pets, etc."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Back
            </button>
            <button
              onClick={() => {
                const valid = forOthers
                  ? recipients.some(r => r.name && r.address)
                  : !!address;
                if (valid) setStep(4);
              }}
              disabled={forOthers ? !recipients.some(r => r.name && r.address) : !address}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Review Booking →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirm ── */}
      {step === 4 && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Colored top bar */}
            <div className="h-1.5 bg-indigo-500" />
            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${svcBadge}`}>
                  {selectedService?.icon || "🏠"}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">{selectedService?.name}</div>
                  <div className="text-indigo-600 font-bold">₦{selectedService?.price?.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Date",    value: date ? format(date, "EEEE, MMMM d, yyyy") : "—", icon: "📅" },
                  { label: "Time",    value: time, icon: "🕐" },
                  ...(!forOthers ? [
                    { label: "Address", value: address, icon: "📍" },
                    { label: "Notes",   value: notes || "None provided", icon: "📝" },
                  ] : [
                    { label: "Booking for", value: `${recipients.filter(r => r.name).length} recipient(s)`, icon: "👥" },
                  ]),
                  { label: "Payment", value: "You'll be directed to WhatsApp to pay after confirming", icon: "💳" },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex gap-3 text-sm">
                    <span className="text-base flex-shrink-0 w-6">{icon}</span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 font-medium mb-0.5">{label}</div>
                      <div className="font-medium text-gray-900">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {forOthers && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recipients</div>
                  {recipients.filter(r => r.name).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100">
                      <span className="text-indigo-500 font-bold text-xs mt-0.5">{i + 1}.</span>
                      <div className="flex-1 text-xs">
                        <div className="font-bold text-gray-900">{r.name} {r.phone && <span className="text-gray-400 font-normal">· {r.phone}</span>}</div>
                        <div className="text-gray-500 mt-0.5">{r.address}</div>
                        {r.package && <div className="text-indigo-600 font-medium mt-0.5">{r.package}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-indigo-50 border-t border-indigo-100 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Amount {forOthers && recipients.filter(r=>r.name).length > 1 && <span className="text-xs font-normal text-gray-500">(×{recipients.filter(r=>r.name).length})</span>}</span>
              <span className="text-xl font-black text-indigo-600">
                ₦{((selectedService?.price || 0) * (forOthers ? recipients.filter(r => r.name).length : 1)).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Back
            </button>
            <button
              onClick={handleBook}
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Booking...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Confirm Booking</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}