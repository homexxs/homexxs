import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, signOut } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { CreditCard, TrendingUp, FileText, AlertCircle, CheckCircle, Clock, LogOut, CheckCircle2, Users } from "lucide-react";
import { format } from "date-fns";
import ClientActivation from "@/components/subscription/ClientActivation";

const STATUS_COLORS = {
  success:  "bg-green-50 text-green-700 border-green-200",
  pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  failed:   "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-600 border-gray-200",
};
const INVOICE_COLORS = {
  paid:     "bg-green-50 text-green-700",
  sent:     "bg-blue-50 text-blue-700",
  overdue:  "bg-red-50 text-red-700",
  draft:    "bg-gray-50 text-gray-500",
};

export default function StaffAccount() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await getMe();
      setUser(u);
      const [pmt, inv, bkg] = await Promise.all([
        list(TABLES.payments, "-created_date", 200),
        list(TABLES.invoices, "-created_date", 200),
        list(TABLES.bookings, "-scheduled_date", 200),
      ]);
      setPayments(pmt);
      setInvoices(inv);
      setBookings(bkg);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (user && !["admin", "staff_account"].includes(user.role)) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-4xl">🚫</div>
      <p className="text-gray-700 font-semibold text-lg">Access Denied</p>
      <p className="text-gray-400 text-sm">You don't have permission to access the Accounts portal.</p>
      <button onClick={() => signOut()} className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm">Sign Out</button>
    </div>
  );

  const markPaymentReceived = async (payment) => {
    const updated = await update(TABLES.payments, payment.id, { status: "success", paid_at: new Date().toISOString() });
    setPayments(p => p.map(x => x.id === payment.id ? updated : x));
    // Update booking payment status if linked
    if (payment.booking_id) {
      update(TABLES.bookings, payment.booking_id, { payment_status: "paid" }).catch(() => {});
    }
  };

  const updateInvoiceStatus = async (invoice, status) => {
    const data = { status };
    if (status === "paid") data.paid_at = new Date().toISOString();
    const updated = await update(TABLES.invoices, invoice.id, data);
    setInvoices(p => p.map(x => x.id === invoice.id ? updated : x));
  };

  const totalRevenue = payments.filter(p => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0);
  const pendingPayments = payments.filter(p => p.status === "pending");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const unpaidBookings = bookings.filter(b => b.payment_status === "unpaid" && b.status !== "cancelled");

  const TABS = [
    { id: "payments",    label: "Payments",       icon: CreditCard, badge: payments.length },
    { id: "invoices",    label: "Invoices",        icon: FileText,   badge: invoices.length },
    { id: "unpaid",      label: "Unpaid Bookings", icon: AlertCircle,badge: unpaidBookings.length },
    { id: "activations", label: "Client Accounts", icon: Users,      badge: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow">AC</div>
            <div>
              <div className="font-black text-gray-900 text-sm leading-none">Accounts Portal</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Home Xperts · Financials & Billing</div>
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
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue",    value: `₦${totalRevenue.toLocaleString()}`, color: "from-emerald-500 to-teal-600",   icon: TrendingUp },
            { label: "All Payments",     value: payments.length,                      color: "from-indigo-500 to-blue-600",    icon: CreditCard },
            { label: "Pending Payments", value: pendingPayments.length,               color: "from-amber-400 to-orange-500",   icon: Clock },
            { label: "Overdue Invoices", value: overdueInvoices.length,               color: "from-red-500 to-rose-600",       icon: AlertCircle },
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
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>{t.badge}</span>
            </button>
          ))}
        </div>

        {/* Payments */}
        {tab === "payments" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {payments.length === 0 && <div className="text-center py-16 text-gray-400">No payment records found.</div>}
              {payments.map(p => (
                <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{p.client_name || p.client_email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.service_type?.replace(/_/g, " ")} · {p.transaction_ref || p.invoice_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-gray-900 text-sm">₦{(p.amount || 0).toLocaleString()}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[p.status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>{p.status}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-xs text-gray-400 hidden sm:block">{p.created_date ? format(new Date(p.created_date), "MMM d") : ""}</div>
                    {p.status === "pending" && (
                      <button onClick={() => markPaymentReceived(p)}
                        className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Mark Received
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        {tab === "invoices" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {invoices.length === 0 && <div className="text-center py-16 text-gray-400">No invoices found.</div>}
              {invoices.map(inv => (
                <div key={inv.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{inv.client_name || inv.client_email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{inv.invoice_number} · {inv.service_type?.replace(/_/g, " ")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-gray-900 text-sm">₦{(inv.total || 0).toLocaleString()}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_COLORS[inv.status] || "bg-gray-50 text-gray-500"}`}>{inv.status}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-xs text-gray-400 hidden sm:block">{inv.due_date ? format(new Date(inv.due_date), "MMM d") : ""}</div>
                    {inv.status !== "paid" && (
                      <select value={inv.status} onChange={e => updateInvoiceStatus(inv, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white">
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Account Activations */}
        {tab === "activations" && <ClientActivation />}

        {/* Unpaid Bookings */}
        {tab === "unpaid" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {unpaidBookings.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">All bookings are paid!</div>}
              {unpaidBookings.map(b => (
                <div key={b.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{b.client_name || b.client_email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{b.service_type?.replace(/_/g, " ")} · {b.scheduled_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-gray-900 text-sm">₦{(b.price || 0).toLocaleString()}</div>
                    <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">Unpaid</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}