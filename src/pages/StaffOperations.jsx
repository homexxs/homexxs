import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, signOut } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { CalendarDays, CheckCircle2, Clock, MapPin, Users, Package, LogOut, AlertCircle, ArrowUpCircle, XCircle, Brush, Bug, Leaf, Shield, Droplets, Waves, Plus, MessageSquare } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import MaterialRequestForm from "@/components/staff/MaterialRequestForm";

const STATUS_COLORS = {
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed:   "bg-green-50 text-green-700 border-green-200",
  cancelled:   "bg-red-50 text-red-600 border-red-200",
  rescheduled: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const SERVICE_ICON = {
  cleaning:         Brush,
  fumigation:       Bug,
  lawn_care:        Leaf,
  pest_control:     Shield,
  deep_cleaning:    Droplets,
  pool_maintenance: Waves,
};

function BookingRow({ b, highlight }) {
  const SvcIcon = SERVICE_ICON[b.service_type] || Brush;
  return (
    <div className={`px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${highlight === "missed" ? "bg-red-50/40" : ""}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight === "missed" ? "bg-red-100" : "bg-indigo-50"}`}>
        <SvcIcon className={`w-4 h-4 ${highlight === "missed" ? "text-red-500" : "text-indigo-500"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm">{b.client_name || b.client_email}</div>
        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" />{b.address?.slice(0, 40)}{b.address?.length > 40 ? "…" : ""}
        </div>
        {b.reminder_sent && (
          <div className="text-[10px] text-green-600 font-semibold mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Reminder sent
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-xs font-bold ${highlight === "missed" ? "text-red-600" : "text-gray-700"}`}>
          {b.scheduled_date ? format(new Date(b.scheduled_date), "MMM d") : "—"}
        </div>
        <div className="text-xs text-gray-400">{b.scheduled_time}</div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 hidden sm:inline ${STATUS_COLORS[b.status] || ""}`}>
        {b.status?.replace(/_/g, " ")}
      </span>
    </div>
  );
}

export default function StaffOperations() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialBooking, setMaterialBooking] = useState(null);

  useEffect(() => {
    const load = async () => {
      const u = await getMe();
      setUser(u);
      const [bkg, staff, mreq] = await Promise.all([
        list(TABLES.bookings, "-scheduled_date", 300),
        filter(TABLES.staff_members, { is_active: true }),
        list(TABLES.material_requests, "-created_date", 100),
      ]);
      setBookings(bkg);
      setStaffList(staff);
      setMaterialRequests(mreq);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
    </div>
  );

  if (user && !["admin", "staff_operations"].includes(user.role)) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-4xl">🚫</div>
      <p className="text-gray-700 font-semibold text-lg">Access Denied</p>
      <p className="text-gray-400 text-sm">You don't have permission to access the Operations portal.</p>
      <button onClick={() => signOut()} className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm">Sign Out</button>
    </div>
  );

  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");
  const todayBookings = bookings.filter(b => b.scheduled_date === todayStr);
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const pendingMaterials = materialRequests.filter(m => m.status === "pending");
  const unassigned = bookings.filter(b => !b.assigned_team && !["cancelled", "completed"].includes(b.status));

  // Upcoming: future bookings (today included) that are not cancelled/completed
  const upcomingBookings = bookings.filter(b => {
    if (!b.scheduled_date) return false;
    if (["cancelled", "completed"].includes(b.status)) return false;
    return !isBefore(new Date(b.scheduled_date), today);
  }).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  // Missed: past bookings (before today) that were never completed or cancelled properly
  const missedBookings = bookings.filter(b => {
    if (!b.scheduled_date) return false;
    if (["completed", "cancelled"].includes(b.status)) return false;
    return isBefore(new Date(b.scheduled_date), today);
  }).sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));

  const TABS = [
    { id: "upcoming",   label: "Upcoming",        icon: ArrowUpCircle, badge: upcomingBookings.length },
    { id: "missed",     label: "Missed",          icon: XCircle,       badge: missedBookings.length },
    { id: "today",      label: "Today",           icon: Clock,         badge: todayBookings.length },
    { id: "pending",    label: "Pending",         icon: AlertCircle,   badge: pendingBookings.length },
    { id: "materials",  label: "Material Requests", icon: Package,     badge: pendingMaterials.length },
    { id: "my_requests", label: "My Requests", icon: Plus, badge: 0 },
    ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow">OP</div>
            <div>
              <div className="font-black text-gray-900 text-sm leading-none">Operations Portal</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Home Xperts · Field Operations & Scheduling</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 font-medium hidden sm:block">{user?.full_name}</div>
            <a href="/Conversations" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Conversations
            </a>
            <button onClick={() => signOut()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Today's Jobs",   value: todayBookings.length,   color: "from-cyan-500 to-blue-600",     icon: Clock },
            { label: "Active Staff",   value: staffList.length,        color: "from-indigo-500 to-violet-600", icon: Users },
            { label: "Unassigned",     value: unassigned.length,       color: "from-amber-400 to-orange-500",  icon: AlertCircle },
            { label: "Pending Matl.",  value: pendingMaterials.length, color: "from-rose-500 to-red-600",      icon: Package },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-black text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Unassigned alert */}
        {unassigned.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-amber-800 font-medium">{unassigned.length} booking{unassigned.length > 1 ? "s" : ""} not yet assigned to a staff member.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon className={`w-3.5 h-3.5 ${t.id === "missed" && missedBookings.length > 0 ? "text-red-500" : ""}`} />
              {t.label}
              {t.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                  ${tab === t.id
                    ? t.id === "missed" ? "bg-red-100 text-red-700" : "bg-cyan-100 text-cyan-700"
                    : t.id === "missed" && t.badge > 0 ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Upcoming */}
        {tab === "upcoming" && (
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm text-indigo-700 font-medium">
              <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />
              {upcomingBookings.length} upcoming job{upcomingBookings.length !== 1 ? "s" : ""} — clients with a green dot have already received their 24-hr reminder email.
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {upcomingBookings.length === 0
                ? <div className="text-center py-16 text-gray-400 text-sm">No upcoming bookings.</div>
                : upcomingBookings.map(b => <BookingRow key={b.id} b={b} />)}
            </div>
          </div>
        )}

        {/* Missed */}
        {tab === "missed" && (
          <div className="space-y-3">
            {missedBookings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm text-red-700 font-medium">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {missedBookings.length} booking{missedBookings.length !== 1 ? "s" : ""} passed their scheduled date without being completed or cancelled.
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {missedBookings.length === 0
                ? <div className="text-center py-16 text-gray-400 text-sm">No missed bookings. All jobs are on track.</div>
                : missedBookings.map(b => <BookingRow key={b.id} b={b} highlight="missed" />)}
            </div>
          </div>
        )}

        {/* Bookings list (today / pending) */}
        {(tab === "today" || tab === "pending") && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {(() => {
              const list = tab === "today" ? todayBookings : pendingBookings;
              if (!list.length) return <div className="text-center py-16 text-gray-400 text-sm">No bookings in this view.</div>;
              return list.map(b => <BookingRow key={b.id} b={b} />);
            })()}
          </div>
        )}

        {/* Material Requests */}
        {/* My Requests */}
        {tab === "my_requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Submit a request for materials needed for a job.</p>
              <button onClick={() => { setMaterialBooking(null); setShowMaterialForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-xl hover:bg-cyan-700 transition-colors">
                <Plus className="w-4 h-4" /> New Request
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {materialRequests.filter(m => m.staff_email === user?.email).length === 0 ? (
                  <div className="text-center py-14 text-gray-400 text-sm">No requests submitted yet.</div>
                ) : materialRequests.filter(m => m.staff_email === user?.email).map(m => (
                  <div key={m.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{m.service_type?.replace(/_/g, " ")} · {m.booking_date || "—"}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {m.items?.map((it, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{it.quantity_requested}× {it.item_name}</span>
                        ))}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex-shrink-0
                      ${m.status === "approved" ? "bg-green-50 text-green-700 border-green-200"
                      : m.status === "rejected" ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "materials" && (
          <div className="space-y-3">
            {materialRequests.length === 0 && <div className="text-center py-16 text-gray-400">No material requests found.</div>}
            {materialRequests.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{m.staff_name}</div>
                    <div className="text-xs text-gray-400">{m.service_type?.replace(/_/g, " ")} · {m.booking_date}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border
                    ${m.status === "approved" ? "bg-green-50 text-green-700 border-green-200"
                    : m.status === "rejected" ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {m.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.items?.map((item, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                      {item.item_name} × {item.quantity_requested} {item.unit}
                    </span>
                  ))}
                </div>
                {m.notes && <div className="mt-2 text-xs text-gray-500 italic">{m.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showMaterialForm && (
        <MaterialRequestForm
          booking={materialBooking}
          staffName={user?.full_name}
          staffEmail={user?.email}
          onClose={() => setShowMaterialForm(false)}
          onSubmitted={() => {
            list(TABLES.material_requests, "-created_date", 100).then(setMaterialRequests).catch(() => {});
          }}
        />
      )}
    </div>
  );
}