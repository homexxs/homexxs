import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, signOut } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { TrendingUp, Users, CreditCard, Ticket, Star, CheckCircle, BarChart2, LogOut, CalendarDays, Percent, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

export default function StaffManagerial() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await getMe();
      setUser(u);
      const [bkg, pmt, stf, tix] = await Promise.all([
        list(TABLES.bookings, "-scheduled_date", 500),
        list(TABLES.payments, "-created_date", 500),
        list(TABLES.staff_members, "full_name", 100),
        list(TABLES.tickets, "-created_date", 200),
      ]);
      setBookings(bkg);
      setPayments(pmt);
      setStaff(stf);
      setTickets(tix);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (user && !["admin", "staff_managerial"].includes(user.role)) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-4xl">🚫</div>
      <p className="text-gray-700 font-semibold text-lg">Access Denied</p>
      <p className="text-gray-400 text-sm">You don't have permission to access the Managerial portal.</p>
      <button onClick={() => signOut()} className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm">Sign Out</button>
    </div>
  );

  const totalRevenue = payments.filter(p => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0);
  const completedBookings = bookings.filter(b => b.status === "completed");
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const activeStaff = staff.filter(s => s.is_active);

  // Last 7 days bookings chart
  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const bookingChart = last7.map(d => {
    const ds = format(d, "yyyy-MM-dd");
    return {
      day: format(d, "EEE"),
      bookings: bookings.filter(b => b.scheduled_date === ds).length,
      revenue: payments.filter(p => p.status === "success" && p.created_date?.startsWith(ds)).reduce((s, p) => s + (p.amount || 0), 0),
    };
  });

  // Top staff by completed jobs
  const staffPerformance = staff
    .filter(s => (s.completed_jobs || 0) > 0)
    .sort((a, b) => (b.completed_jobs || 0) - (a.completed_jobs || 0))
    .slice(0, 5);

  const TABS = [
    { id: "overview",  label: "Overview",    icon: BarChart2 },
    { id: "staff",     label: "Team Report", icon: Users },
    { id: "tickets",   label: "Tickets",     icon: Ticket },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow">MG</div>
            <div>
              <div className="font-black text-gray-900 text-sm leading-none">Managerial Portal</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Home Xperts · Reports & Team Oversight</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 font-medium hidden sm:block">{user?.full_name}</div>
            <button onClick={() => signOut()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue",   value: `₦${totalRevenue.toLocaleString()}`, color: "from-violet-500 to-purple-600", icon: CreditCard },
            { label: "Total Bookings",  value: bookings.length,                      color: "from-indigo-500 to-blue-600",   icon: CalendarDays },
            { label: "Completed Jobs",  value: completedBookings.length,             color: "from-green-500 to-emerald-600", icon: CheckCircle },
            { label: "Active Staff",    value: activeStaff.length,                  color: "from-amber-400 to-orange-500",  icon: Users },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-xl font-black text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="font-bold text-gray-900 text-sm mb-4">Bookings — Last 7 Days</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bookingChart}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#7C3AED" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="font-bold text-gray-900 text-sm mb-4">Revenue Trend — Last 7 Days</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={bookingChart}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => `₦${v.toLocaleString()}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Completion Rate", value: bookings.length ? `${Math.round((completedBookings.length / bookings.length) * 100)}%` : "0%", Icon: Percent,       color: "from-green-500 to-emerald-600" },
                { label: "Open Tickets",    value: openTickets.length,                                                                               Icon: MessageSquare, color: "from-amber-400 to-orange-500" },
                { label: "Avg Rating",      value: staff.filter(s => s.rating).length ? (staff.filter(s => s.rating).reduce((s, m) => s + m.rating, 0) / staff.filter(s => s.rating).length).toFixed(1) + "/5" : "N/A", Icon: Star, color: "from-violet-500 to-purple-600" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                    <s.Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff Performance */}
        {tab === "staff" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {staff.length === 0 && <div className="text-center py-16 text-gray-400">No staff records.</div>}
              {staff.map((s, i) => {
                const assigned = bookings.filter(b => b.assigned_team === s.full_name);
                const completed = assigned.filter(b => b.status === "completed");
                const rate = assigned.length ? Math.round((completed.length / assigned.length) * 100) : 0;
                return (
                  <div key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {s.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{s.full_name}</div>
                      <div className="text-xs text-gray-400">{s.role_title || "Staff"} · {assigned.length} jobs assigned</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black text-gray-900">{rate}%</div>
                      <div className="text-xs text-gray-400">completion</div>
                    </div>
                    {s.rating && (
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-gray-700">{s.rating}</span>
                        </div>
                      </div>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tickets summary */}
        {tab === "tickets" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Open",        value: tickets.filter(t => t.status === "open").length,        color: "bg-blue-50 text-blue-700 border-blue-100" },
                { label: "In Progress", value: tickets.filter(t => t.status === "in_progress").length, color: "bg-amber-50 text-amber-700 border-amber-100" },
                { label: "Resolved",    value: tickets.filter(t => t.status === "resolved").length,    color: "bg-green-50 text-green-700 border-green-100" },
                { label: "Closed",      value: tickets.filter(t => t.status === "closed").length,      color: "bg-gray-50 text-gray-600 border-gray-100" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border p-5 text-center ${s.color}`}>
                  <div className="text-3xl font-black">{s.value}</div>
                  <div className="text-xs font-semibold mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {tickets.slice(0, 20).map(t => (
                  <div key={t.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{t.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{t.client_name} · {t.category?.replace("_", " ")}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0
                      ${t.priority === "urgent" ? "bg-red-50 text-red-700"
                      : t.priority === "high" ? "bg-orange-50 text-orange-700"
                      : "bg-gray-50 text-gray-500"}`}>
                      {t.priority}
                    </span>
                    <div className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">{t.created_date ? format(new Date(t.created_date), "MMM d") : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}