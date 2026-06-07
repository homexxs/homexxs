import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState, useEffect } from "react";
import { Search, Users, X, Mail, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      list(TABLES.users, ),
      list(TABLES.bookings, "-created_date", 500),
      list(TABLES.payments, "-created_date", 500),
    ]).then(([u, b, p]) => {
      setClients(u.filter(u => u.role !== "admin"));
      setBookings(b);
      setPayments(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const getClientStats = (email) => {
    const bk = bookings.filter(b => b.client_email === email);
    const pm = payments.filter(p => p.client_email === email && p.status === "success");
    return {
      bookings: bk.length,
      completed: bk.filter(b => b.status === "completed").length,
      totalSpent: pm.reduce((s, p) => s + (p.amount || 0), 0),
      lastBooking: bk[0]?.scheduled_date,
    };
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clients Database</h2>
        <p className="text-sm text-gray-500 mt-1">{filtered.length} clients</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                {["Client","Email","Bookings","Completed","Total Spent","Last Booking","Since"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" /><div>No clients found</div>
                </td></tr>
              ) : filtered.map(c => {
                const stats = getClientStats(c.email);
                return (
                  <tr key={c.id} onClick={() => setSelected(c)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {c.full_name?.[0]?.toUpperCase() || c.email?.[0]?.toUpperCase()}
                        </div>
                        <div className="font-medium text-gray-900">{c.full_name || "—"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.email}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-center">{stats.bookings}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold text-center">{stats.completed}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₦{stats.totalSpent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{stats.lastBooking || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{c.created_date ? format(new Date(c.created_date), "MMM yyyy") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Detail Modal */}
      {selected && (() => {
        const stats = getClientStats(selected.email);
        const clientBookings = bookings.filter(b => b.client_email === selected.email).slice(0, 5);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {selected.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selected.full_name || "Unknown"}</div>
                    <div className="text-xs text-gray-500">{selected.email}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[["Bookings", stats.bookings], ["Completed", stats.completed], ["Spent", `₦${(stats.totalSpent/1000).toFixed(0)}k`]].map(([l,v]) => (
                    <div key={l} className="text-center bg-gray-50 rounded-2xl p-3">
                      <div className="text-xl font-bold text-gray-900">{v}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{selected.phone}</div>
                )}
                {selected.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />{selected.address}</div>
                )}
                {clientBookings.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Bookings</div>
                    <div className="space-y-2">
                      {clientBookings.map(b => (
                        <div key={b.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 capitalize">{b.service_type?.replace(/_/g, " ")}</div>
                            <div className="text-xs text-gray-400">{b.scheduled_date}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium
                            ${b.status === "completed" ? "bg-green-50 text-green-600" : b.status === "cancelled" ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-600"}`}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}