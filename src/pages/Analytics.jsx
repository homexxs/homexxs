import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Download, TrendingUp, Calendar, CreditCard, Ticket, AlertCircle } from "lucide-react";

const SERVICE_COLORS = {
  cleaning: "#6366F1", fumigation: "#F97316", lawn_care: "#22C55E",
  pest_control: "#EF4444", deep_cleaning: "#A855F7", pool_maintenance: "#06B6D4",
};

const PIE_COLORS = ["#6366F1","#F97316","#22C55E","#EF4444","#A855F7","#06B6D4"];

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", days: 365 },
];

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState(30);
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    getMe().then(async u => {
      setUser(u);
      if (u?.role !== "admin") { setLoading(false); return; }
      const [b, p, t] = await Promise.all([
        list(TABLES.bookings, "-scheduled_date", 500),
        list(TABLES.payments, "-created_date", 500),
        list(TABLES.tickets, "-created_date", 500),
      ]);
      setBookings(b); setPayments(p); setTickets(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (user?.role !== "admin") return (
    <div className="flex items-center justify-center h-64">
      <AlertCircle className="w-10 h-10 text-red-300 mr-3" />
      <p className="text-gray-600 font-medium">Admin access required</p>
    </div>
  );

  const since = subDays(new Date(), datePreset);

  const filteredBookings = bookings.filter(b => {
    if (!b.scheduled_date) return false;
    const d = parseISO(b.scheduled_date);
    const inRange = isWithinInterval(d, { start: startOfDay(since), end: endOfDay(new Date()) });
    const inService = serviceFilter === "all" || b.service_type === serviceFilter;
    return inRange && inService;
  });

  const filteredPayments = payments.filter(p => {
    if (!p.created_date) return false;
    const d = new Date(p.created_date);
    return d >= since && (serviceFilter === "all" || p.service_type === serviceFilter);
  });

  const filteredTickets = tickets.filter(t => new Date(t.created_date) >= since);

  // Bookings over time (group by date)
  const bookingsByDate = {};
  filteredBookings.forEach(b => {
    const key = b.scheduled_date;
    bookingsByDate[key] = (bookingsByDate[key] || 0) + 1;
  });
  const bookingsTimeData = Object.entries(bookingsByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date: format(parseISO(date), "MMM d"), count }));

  // Revenue by week
  const revenueByDate = {};
  filteredPayments.filter(p => p.status === "success").forEach(p => {
    const key = format(new Date(p.created_date), "MMM d");
    revenueByDate[key] = (revenueByDate[key] || 0) + (p.amount || 0);
  });
  const revenueData = Object.entries(revenueByDate)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-20)
    .map(([date, revenue]) => ({ date, revenue }));

  // Popular services
  const serviceCounts = {};
  filteredBookings.forEach(b => {
    serviceCounts[b.service_type] = (serviceCounts[b.service_type] || 0) + 1;
  });
  const serviceData = Object.entries(serviceCounts)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value, key: name }))
    .sort((a, b) => b.value - a.value);

  // Ticket resolution rates
  const totalTickets = filteredTickets.length;
  const resolvedTickets = filteredTickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  const ticketStatusData = [
    { name: "Open", value: filteredTickets.filter(t => t.status === "open").length },
    { name: "In Progress", value: filteredTickets.filter(t => t.status === "in_progress").length },
    { name: "Resolved", value: filteredTickets.filter(t => t.status === "resolved").length },
    { name: "Closed", value: filteredTickets.filter(t => t.status === "closed").length },
  ].filter(d => d.value > 0);

  const totalRevenue = filteredPayments.filter(p => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0);
  const resolutionRate = totalTickets ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

  // Export CSV
  const exportCSV = (type) => {
    let rows, filename, headers;
    if (type === "bookings") {
      headers = ["Client", "Email", "Service", "Date", "Time", "Status", "Payment", "Price"];
      rows = filteredBookings.map(b => [b.client_name, b.client_email, b.service_type, b.scheduled_date, b.scheduled_time, b.status, b.payment_status, b.price]);
      filename = "homexp-bookings.csv";
    } else {
      headers = ["Client", "Email", "Service", "Invoice", "Amount", "Method", "Date", "Status"];
      rows = filteredPayments.map(p => [p.client_name, p.client_email, p.service_type, p.invoice_number, p.amount, p.payment_method, p.paid_at ? format(new Date(p.paid_at), "yyyy-MM-dd") : "", p.status]);
      filename = "homexp-payments.csv";
    }
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const services = ["all", "cleaning", "fumigation", "lawn_care", "pest_control", "deep_cleaning", "pool_maintenance"];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-500 mt-1 text-sm">Business performance overview and reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV("bookings")} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Bookings CSV
          </button>
          <button onClick={() => exportCSV("payments")} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Payments CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {DATE_PRESETS.map(p => (
            <button key={p.days} onClick={() => setDatePreset(p.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${datePreset === p.days ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white capitalize">
          {services.map(s => <option key={s} value={s}>{s === "all" ? "All Services" : s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bookings" value={filteredBookings.length} icon={Calendar} color="from-indigo-500 to-indigo-600" sub="in period" />
        <StatCard label="Revenue" value={`₦${totalRevenue.toLocaleString()}`} icon={CreditCard} color="from-green-500 to-emerald-600" sub="paid transactions" />
        <StatCard label="Tickets" value={filteredTickets.length} icon={Ticket} color="from-amber-400 to-orange-500" sub={`${resolutionRate}% resolved`} />
        <StatCard label="Completion" value={`${filteredBookings.length ? Math.round((filteredBookings.filter(b => b.status === "completed").length / filteredBookings.length) * 100) : 0}%`} icon={TrendingUp} color="from-purple-500 to-violet-600" sub="booking completion" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bookings Over Time */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Bookings Over Time</h3>
          {bookingsTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bookingsTimeData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Revenue Trend (₦)</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} formatter={v => [`₦${v.toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular Services */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Popular Services</h3>
          {serviceData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {serviceData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {serviceData.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-600 capitalize flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-bold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>

        {/* Ticket Resolution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Ticket Resolution Rate</h3>
          {ticketStatusData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative w-36 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ticketStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2} dataKey="value">
                        {ticketStatusData.map((_, i) => (
                          <Cell key={i} fill={["#F59E0B","#3B82F6","#10B981","#9CA3AF"][i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <div className="text-2xl font-black text-gray-900">{resolutionRate}%</div>
                    <div className="text-xs text-gray-400">resolved</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ticketStatusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ["#F59E0B","#3B82F6","#10B981","#9CA3AF"][i] }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-bold text-gray-900 ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No tickets in period</div>}
        </div>
      </div>
    </div>
  );
}