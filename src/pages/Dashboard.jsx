import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Sparkles, CalendarDays, CheckCircle, Clock,
  XCircle, RefreshCw, TrendingUp, Star, MessageSquare,
  Brush, Bug, Leaf, Shield, Droplets, Waves, Trash2
} from "lucide-react";
import { format, isBefore, startOfDay, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import RescheduleModal from "@/components/dashboard/RescheduleModal";
import ChatBot from "@/components/dashboard/ChatBot";
import MessagingThread from "@/components/messaging/MessagingThread";
import AppointmentCalendar from "@/components/dashboard/AppointmentCalendar";
import SubscriptionLock from "@/components/subscription/SubscriptionLock";
import DownloadReportButton from "@/components/dashboard/DownloadReportButton";

function getWATGreeting() {
  // Nigeria WAT = UTC+1
  const watHour = (new Date().getUTCHours() + 1) % 24;
  if (watHour < 12) return "Good morning";
  if (watHour < 17) return "Good afternoon";
  return "Good evening";
}

const SERVICE_LABELS = {
  cleaning:         { label: "Home Cleaning", Icon: Brush,    color: "bg-blue-100 text-blue-700" },
  fumigation:       { label: "Fumigation",    Icon: Bug,      color: "bg-orange-100 text-orange-700" },
  lawn_care:        { label: "Lawn Care",     Icon: Leaf,     color: "bg-green-100 text-green-700" },
  pest_control:     { label: "Pest Control",  Icon: Shield,   color: "bg-red-100 text-red-700" },
  deep_cleaning:    { label: "Deep Cleaning", Icon: Droplets, color: "bg-purple-100 text-purple-700" },
  pool_maintenance: { label: "Pool Service",  Icon: Waves,    color: "bg-cyan-100 text-cyan-700" },
};

const STATUS_CONFIG = {
  pending:     { color: "text-amber-700 bg-amber-50 border-amber-200",   dot: "bg-amber-400",  label: "Pending",     icon: Clock },
  confirmed:   { color: "text-indigo-700 bg-indigo-50 border-indigo-200", dot: "bg-indigo-500", label: "Confirmed",   icon: CheckCircle },
  in_progress: { color: "text-blue-700 bg-blue-50 border-blue-200",       dot: "bg-blue-500",   label: "In Progress", icon: TrendingUp },
  completed:   { color: "text-green-700 bg-green-50 border-green-200",    dot: "bg-green-500",  label: "Completed",   icon: CheckCircle },
  cancelled:   { color: "text-red-600 bg-red-50 border-red-200",          dot: "bg-red-400",    label: "Cancelled",   icon: XCircle },
  rescheduled: { color: "text-yellow-700 bg-yellow-50 border-yellow-200", dot: "bg-yellow-400", label: "Rescheduled", icon: RefreshCw },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function BookingCard({ booking, onReschedule, onCancel, onMessage, showActions }) {
  const svc = SERVICE_LABELS[booking.service_type] || { label: booking.service_type?.replace(/_/g, " "), Icon: Brush, color: "bg-gray-100 text-gray-700" };
  const canAct = showActions && !["cancelled", "completed"].includes(booking.status);
  const SvcIcon = svc.Icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1 ${STATUS_CONFIG[booking.status]?.dot || "bg-gray-300"}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${svc.color}`}>
              <SvcIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">{svc.label}</div>
              <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">{booking.address}</div>
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-2.5">
            <div className="text-[10px] text-gray-400 mb-0.5">Date</div>
            <div className="text-xs font-semibold text-gray-900">
              {booking.scheduled_date ? format(new Date(booking.scheduled_date), "MMM d, yyyy") : "—"}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <div className="text-[10px] text-gray-400 mb-0.5">Time</div>
            <div className="text-xs font-semibold text-gray-900">{booking.scheduled_time || "—"}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-purple-600">₦{(booking.price || 0).toLocaleString()}</div>
          {canAct && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => onReschedule(booking)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                <RefreshCw className="w-3 h-3" /> Reschedule
              </button>
              <button onClick={() => onCancel(booking)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <XCircle className="w-3 h-3" /> Cancel
              </button>
              <button onClick={() => onMessage(booking)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                <MessageSquare className="w-3 h-3" /> Message
              </button>
            </div>
          )}
          {booking.status === "completed" && booking.rating && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < booking.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SERVICE_PLAN_COLORS = {
  "Routine Checks and Fixes":  "bg-blue-100 text-blue-700",
  "Deep Cleaning of Home":     "bg-purple-100 text-purple-700",
  "Fumigation of Home":        "bg-orange-100 text-orange-700",
  "Vacuuming of Chairs":       "bg-green-100 text-green-700",
  "Vacuuming of Mattress":     "bg-teal-100 text-teal-700",
  "Washing of Curtain":        "bg-pink-100 text-pink-700",
  "AC Servicing":              "bg-cyan-100 text-cyan-700",
  "Gas Cooker Check":          "bg-yellow-100 text-yellow-700",
  "Servicing of Generator":    "bg-red-100 text-red-700",
  "Pool Maintenance":          "bg-sky-100 text-sky-700",
  "Lawn Care":                 "bg-lime-100 text-lime-700",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [messagingBooking, setMessagingBooking] = useState(null);
  const [planServices, setPlanServices] = useState([]);
  const [lockVisible, setLockVisible] = useState(false);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const load = async () => {
      const u = await getMe();
      setUser(u);
      const [b, p] = await Promise.all([
        filter(TABLES.bookings, { client_email: u.email }, "-scheduled_date", 50),
        filter(TABLES.payments, { client_email: u.email }, "-created_date", 100).catch(() => []),
      ]);
      setBookings(b);
      setPayments(p);

      // Load upcoming planned services from the active year plan
      const plans = await filter(TABLES.year_plans, { is_published: true }, "-year", 1).catch(() => []);
      if (plans.length > 0) {
        const plan = plans[0];
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const upcoming = [];
        (plan.months || []).forEach(m => {
          // Show services from current month and up to 2 months ahead
          if (m.month >= currentMonth && m.month <= currentMonth + 2) {
            (m.weeks || []).forEach(w => {
              (w.services || []).forEach(svc => {
                upcoming.push({ service: svc, month: m.month_name, monthNum: m.month, week: w.week });
              });
            });
          }
        });
        // Sort by month then week
        upcoming.sort((a, b) => a.monthNum - b.monthNum || a.week - b.week);
        setPlanServices(upcoming);
      }

      setLoading(false);
    };
    load().catch(() => setLoading(false));

    const unsub = subscribe(TABLES.bookings, e => {
      if (e.type === "create") setBookings(p => [e.data, ...p]);
      else if (e.type === "update") setBookings(p => p.map(b => b.id === e.id ? e.data : b));
      else if (e.type === "delete") setBookings(p => p.filter(b => b.id !== e.id));
    });
    return () => unsub();
  }, []);

  const today = startOfDay(new Date());
  const upcoming = bookings.filter(b =>
    !["cancelled", "completed"].includes(b.status) &&
    b.scheduled_date && !isBefore(new Date(b.scheduled_date), today)
  );
  const past = bookings.filter(b =>
    ["cancelled", "completed"].includes(b.status) ||
    (b.scheduled_date && isBefore(new Date(b.scheduled_date), today))
  );

  const nextBooking = upcoming.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0];

  const handleCancel = async (booking) => {
    if (!confirm("Cancel this booking?")) return;
    const updated = await update(TABLES.bookings, booking.id, { status: "cancelled" });
    setBookings(p => p.map(b => b.id === booking.id ? updated : b));
  };

  const handleDelete = async (booking) => {
    if (!confirm("Permanently delete this cancelled booking?")) return;
    await remove(TABLES.bookings, booking.id);
    setBookings(p => p.filter(b => b.id !== booking.id));
  };

  const handleReschedule = async (date, time) => {
    if (!rescheduleTarget || !date || !time) return;
    setSaving(true);
    const updated = await update(TABLES.bookings, rescheduleTarget.id, {
      scheduled_date: format(date, "yyyy-MM-dd"),
      scheduled_time: time,
      status: "rescheduled",
    });
    setBookings(p => p.map(b => b.id === rescheduleTarget.id ? updated : b));
    await create(TABLES.notifications, {
      recipient_email: user.email,
      title: "Booking Rescheduled",
      message: `Your service has been rescheduled to ${format(date, "MMM d, yyyy")} at ${time}.`,
      type: "booking_confirmed",
      related_id: rescheduleTarget.id,
    });
    setSaving(false);
    setRescheduleTarget(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-10 h-10 border-[3px] border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  const displayList = tab === "upcoming" ? upcoming : past;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-7">

      {/* Lock overlay */}
      {lockVisible && <SubscriptionLock user={user} onClose={() => setLockVisible(false)} />}

      {/* Subscription Status Banner */}
      {user && user.subscription_status !== "active" && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-sm flex-wrap
          ${user.subscription_status === "pending" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${user.subscription_status === "pending" ? "bg-amber-400" : "bg-red-400"}`} />
            <span className={`font-semibold ${user.subscription_status === "pending" ? "text-amber-800" : "text-red-700"}`}>
              {user.subscription_status === "pending" ? "⏳ Payment Pending Verification" : "🔒 Account Inactive — Subscribe to unlock features"}
            </span>
          </div>
          <button
            onClick={() => setLockVisible(true)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${user.subscription_status === "pending" ? "bg-amber-200 text-amber-800 hover:bg-amber-300" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
            {user.subscription_status === "pending" ? "View Status" : "Subscribe Now"}
          </button>
        </div>
      )}
      {user && user.subscription_status === "active" && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-2xl w-fit text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-bold text-green-800">
            ACTIVE: {user.subscription_duration?.replace(/_/g, " ")?.replace(/\b\w/g, c => c.toUpperCase()) || "Subscription"} Plan
          </span>
        </div>
      )}

      {/* Welcome + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {getWATGreeting()},{" "}
            {user?.full_name?.split(" ")[0] || (user?.email?.split("@")[0]?.replace(/[^a-zA-Z]/g, " ").trim().split(" ")[0]) || "there"} 👋
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Welcome to your Home Xperts portal</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {user?.subscription_status === "active" ? (
            <Link to={createPageUrl("BookService")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-700 text-white text-sm font-semibold rounded-xl hover:bg-purple-800 transition-all shadow-lg shadow-purple-200">
              <Sparkles className="w-4 h-4" /> Book a Service
            </Link>
          ) : (
            <button onClick={() => setLockVisible(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-700 text-white text-sm font-semibold rounded-xl hover:bg-purple-800 transition-all shadow-lg shadow-purple-200 opacity-80">
              <Sparkles className="w-4 h-4" /> Book a Service 🔒
            </button>
          )}
          <Link to={createPageUrl("Conversations")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <MessageSquare className="w-4 h-4" /> Chat with HomeX
          </Link>
          <DownloadReportButton user={user} bookings={bookings} payments={payments} />
        </div>
      </div>

      {/* Next Appointment Banner */}
      {nextBooking && (() => {
        const svc = SERVICE_LABELS[nextBooking.service_type] || { Icon: Brush, label: "Service" };
        const NextIcon = svc.Icon;
        return (
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-2">Next Appointment</div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <NextIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg">{svc.label}</div>
                  <div className="text-white/70 text-sm">
                    {format(new Date(nextBooking.scheduled_date), "EEEE, MMMM d")} · {nextBooking.scheduled_time}
                  </div>
                </div>
              </div>
              <StatusBadge status={nextBooking.status} />
            </div>
          </div>
        );
      })()}

      {/* Stats — simple 3 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Upcoming",  value: upcoming.length,                                    icon: CalendarDays, color: "from-indigo-500 to-indigo-600" },
          { label: "Completed", value: bookings.filter(b => b.status === "completed").length, icon: CheckCircle,  color: "from-green-500 to-emerald-600" },
          { label: "Total Bookings", value: bookings.length,                               icon: Sparkles,     color: "from-purple-500 to-violet-600" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Planned Services from Year Plan */}
      {tab === "upcoming" && planServices.length > 0 && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <h4 className="font-bold text-gray-900 text-sm">Upcoming Planned Services</h4>
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">{planServices.length}</span>
            </div>
            <Link to={createPageUrl("Schedules")} className="text-xs text-indigo-600 font-semibold hover:underline">View Full Schedule →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {planServices.map((item, i) => {
              const colorClass = SERVICE_PLAN_COLORS[item.service] || "bg-gray-100 text-gray-600";
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colorClass.split(" ")[0].replace("bg-", "bg-").replace("100", "500")}`} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{item.service}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.month} · Week {item.week}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colorClass}`}>{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bookings */}
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {[["upcoming", "Upcoming", upcoming.length], ["past", "Past", past.length]].map(([id, label, count]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {label}{" "}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === id ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"}`}>{count}</span>
            </button>
          ))}
        </div>

        {displayList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
            <div className="text-4xl mb-3">{tab === "upcoming" ? "📅" : "📋"}</div>
            <p className="text-gray-500 text-sm font-medium">
              {tab === "upcoming" ? "No upcoming appointments" : "No past bookings yet"}
            </p>
            {tab === "upcoming" && (
              <Link to={createPageUrl("BookService")} className="text-purple-700 text-sm font-semibold mt-2 inline-block hover:underline">
                Book your first service →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayList.map(b => (
              <div key={b.id} className="relative">
                <BookingCard booking={b} onReschedule={setRescheduleTarget}
                  onCancel={handleCancel} onMessage={setMessagingBooking} showActions={tab === "upcoming"} />
                {b.status === "cancelled" && tab === "past" && (
                  <button onClick={() => handleDelete(b)}
                    title="Delete this booking"
                    className="absolute top-2 right-2 w-7 h-7 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center justify-center text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appointment Calendar */}
      <AppointmentCalendar
        bookings={bookings}
        onRescheduleSuccess={() => filter(TABLES.bookings, { client_email: user?.email }, "-scheduled_date", 50).then(setBookings).catch(() => {})}
      />

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <RescheduleModal booking={rescheduleTarget} onClose={() => setRescheduleTarget(null)}
          onConfirm={handleReschedule} saving={saving} />
      )}

      {/* Messaging Thread */}
      {messagingBooking && (
        <MessagingThread booking={messagingBooking} user={user} onClose={() => setMessagingBooking(null)} />
      )}

      {/* AI ChatBot */}
      <ChatBot user={user} />
    </div>
  );
}