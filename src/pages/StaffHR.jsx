import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, signOut } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { Users, Ticket, Star, Phone, Mail, LogOut, TrendingUp, CheckCircle, Clock, AlertCircle, ToggleLeft, ToggleRight, CheckCircle2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_COLORS = {
  low:    "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high:   "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_COLORS = {
  open:        "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  resolved:    "bg-green-50 text-green-700",
  closed:      "bg-gray-50 text-gray-500",
};

export default function StaffHR() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("staff");
  const [staffList, setStaffList] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await getMe();
      setUser(u);
      const [staff, tix, users, bkgs] = await Promise.all([
        list(TABLES.staff_members, "full_name", 100),
        list(TABLES.tickets, "-created_date", 100),
        list(TABLES.users, ),
        list(TABLES.bookings, "-scheduled_date", 200),
      ]);
      setStaffList(staff);
      setTickets(tix);
      setClients(users.filter(u => u.role === "user"));
      setBookings(bkgs);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  if (user && !["admin", "staff_hr"].includes(user.role)) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-4xl">🚫</div>
      <p className="text-gray-700 font-semibold text-lg">Access Denied</p>
      <p className="text-gray-400 text-sm">You don't have permission to access the HR portal.</p>
      <button onClick={() => signOut()} className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm">Sign Out</button>
    </div>
  );

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const activeStaff = staffList.filter(s => s.is_active);

  const toggleStaffActive = async (member) => {
    const updated = await update(TABLES.staff_members, member.id, { is_active: !member.is_active });
    setStaffList(p => p.map(s => s.id === member.id ? updated : s));
  };

  const resolveTicket = async (ticket) => {
    const updated = await update(TABLES.tickets, ticket.id, { status: "resolved", resolved_at: new Date().toISOString() });
    setTickets(p => p.map(t => t.id === ticket.id ? updated : t));
  };

  const TABS = [
    { id: "staff",   label: "Staff Team",      icon: Users,  badge: activeStaff.length },
    { id: "tickets", label: "Client Tickets",  icon: Ticket, badge: openTickets.length },
    { id: "clients", label: "Clients",         icon: Phone,  badge: clients.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-black text-sm shadow">HR</div>
            <div>
              <div className="font-black text-gray-900 text-sm leading-none">HR Portal</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Home Xperts · Staff & Client Relations</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 font-medium hidden sm:block">{user?.full_name}</div>
            <a href="/Conversations" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Conversations
            </a>
            <button onClick={() => signOut()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Active Staff",    value: activeStaff.length,      color: "from-pink-500 to-rose-600",    icon: Users },
            { label: "Total Clients",   value: clients.length,           color: "from-violet-500 to-purple-600", icon: Phone },
            { label: "Open Tickets",    value: openTickets.length,       color: "from-amber-400 to-orange-500", icon: Ticket },
            { label: "Total Bookings",  value: bookings.length,          color: "from-teal-500 to-cyan-600",    icon: CheckCircle },
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? "bg-pink-100 text-pink-600" : "bg-gray-200 text-gray-500"}`}>{t.badge}</span>
            </button>
          ))}
        </div>

        {/* Staff Tab */}
        {tab === "staff" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.length === 0 && <div className="col-span-3 text-center py-16 text-gray-400">No staff records found.</div>}
            {staffList.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${s.avatar_color || "bg-purple-100"} flex items-center justify-center font-bold text-purple-700 text-sm`}>
                    {s.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-sm truncate">{s.full_name}</div>
                    <div className="text-xs text-gray-400">{s.role_title || "Staff"}</div>
                  </div>
                  <button onClick={() => toggleStaffActive(s)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 transition-colors ${s.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                    {s.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                    {s.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {s.email}</div>
                  {s.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.phone}</div>}
                  {s.rating && <div className="flex items-center gap-1.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {s.rating}/5 · {s.completed_jobs || 0} jobs done</div>}
                </div>
                {s.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {s.specializations.map(sp => (
                      <span key={sp} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full capitalize">{sp.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tickets Tab */}
        {tab === "tickets" && (
          <div className="space-y-3">
            {tickets.length === 0 && <div className="text-center py-16 text-gray-400">No tickets found.</div>}
            {tickets.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-gray-900 text-sm">{t.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[t.priority] || ""}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || ""}`}>{t.status?.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{t.client_name} · {t.category?.replace("_", " ")}</div>
                  <div className="text-xs text-gray-400">{t.description?.slice(0, 120)}{t.description?.length > 120 ? "…" : ""}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-xs text-gray-400">{t.created_date ? format(new Date(t.created_date), "MMM d") : ""}</div>
                  {(t.status === "open" || t.status === "in_progress") && (
                    <button onClick={() => resolveTicket(t)}
                      className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clients Tab */}
        {tab === "clients" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {clients.length === 0 && <div className="text-center py-16 text-gray-400">No clients found.</div>}
              {clients.map(c => {
                const clientBookings = bookings.filter(b => b.client_email === c.email);
                return (
                  <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{c.full_name}</div>
                      <div className="text-xs text-gray-400">{c.email}</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div className="font-bold text-gray-700">{clientBookings.length} bookings</div>
                      <div>{clientBookings.filter(b => b.status === "completed").length} completed</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}