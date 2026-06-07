import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Download, CheckCircle, Clock, X, AlertCircle, FileText, Edit2 } from "lucide-react";
import { jsPDF } from "jspdf";
import PaymentApprovalModal from "@/components/payments/PaymentApprovalModal";

const STATUS_CONFIG = {
  success: { badge: "bg-green-50 text-green-700 border-green-100", icon: CheckCircle, label: "Paid" },
  pending: { badge: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock, label: "Pending" },
  failed:  { badge: "bg-red-50 text-red-600 border-red-100",   icon: AlertCircle, label: "Failed" },
  refunded:{ badge: "bg-gray-50 text-gray-600 border-gray-100", icon: X, label: "Refunded" },
};

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    list(TABLES.payments, "-created_date", 500)
      .then(setPayments).catch(() => {}).finally(() => setLoading(false));

    const unsub = subscribe(TABLES.payments, e => {
      if (e.type === "create") setPayments(p => [e.data, ...p]);
      else if (e.type === "update") setPayments(p => p.map(x => x.id === e.id ? e.data : x));
      else if (e.type === "delete") setPayments(p => p.filter(x => x.id !== e.id));
    });
    return unsub;
  }, []);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.client_name?.toLowerCase().includes(q) || p.client_email?.toLowerCase().includes(q) || p.invoice_number?.toLowerCase().includes(q) || p.transaction_ref?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = filtered.filter(p => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    const now = format(new Date(), "dd MMM yyyy, HH:mm");

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont(undefined, "bold");
    doc.text("HomeX — Payments Report", 14, 13);
    doc.setFontSize(8); doc.setFont(undefined, "normal");
    const revenue = filtered.filter(p => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0);
    doc.text(`Generated: ${now}  ·  ${filtered.length} transactions  ·  Revenue: NGN ${revenue.toLocaleString()}`, 14, 22);

    doc.setFillColor(243, 244, 246);
    doc.rect(0, 32, 210, 8, "F");
    doc.setTextColor(100, 100, 120);
    doc.setFontSize(7); doc.setFont(undefined, "bold");
    const cols = [14, 55, 100, 130, 155, 180];
    const heads = ["CLIENT", "SERVICE", "AMOUNT (₦)", "METHOD", "DATE", "STATUS"];
    heads.forEach((h, i) => doc.text(h, cols[i], 37));

    doc.setFont(undefined, "normal");
    let y = 44;
    filtered.forEach((p, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(0, y - 4, 210, 8, "F"); }
      doc.setTextColor(30, 30, 30); doc.setFontSize(7.5);
      doc.text((p.client_name || "—").slice(0, 22), cols[0], y);
      doc.text((p.service_type || "—").replace(/_/g, " ").slice(0, 18), cols[1], y);
      doc.text((p.amount || 0).toLocaleString(), cols[2], y);
      doc.text((p.payment_method || "—").slice(0, 14), cols[3], y);
      const dt = p.paid_at || p.created_date;
      doc.text(dt ? format(new Date(dt), "MMM d, yyyy") : "—", cols[4], y);
      doc.text(p.status || "—", cols[5], y);
      y += 8;
    });

    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text("HomeX Home Care Tech · Confidential", 14, 290);
    doc.save(`homex-payments-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportCSV = () => {
    const headers = ["Invoice","Client","Email","Service","Amount","Method","Date","Status","Ref"];
    const rows = filtered.map(p => [p.invoice_number, p.client_name, p.client_email, p.service_type, p.amount, p.payment_method, p.paid_at ? format(new Date(p.paid_at), "yyyy-MM-dd") : "", p.status, p.transaction_ref]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "homexp-all-payments.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Payments</h2>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} transactions · Total: ₦{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="text-xs font-medium opacity-70 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs text-gray-500 mb-1">Paid Transactions</div>
          <div className="text-2xl font-bold text-gray-900">{filtered.filter(p => p.status === "success").length}</div>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
          <div className="text-xs text-amber-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-700">{filtered.filter(p => p.status === "pending").length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, invoice, reference..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
          <option value="all">All Status</option>
          {["success","pending","failed","refunded"].map(s => <option key={s} value={s} className="capitalize">{STATUS_CONFIG[s]?.label || s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                {["Invoice","Client","Service","Amount","Method","Date","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400">No payments found</td></tr>
              ) : filtered.map(p => {
                const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.invoice_number || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.client_name || "—"}</div>
                      <div className="text-xs text-gray-400">{p.client_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs">{p.service_type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">₦{(p.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.payment_method || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : p.created_date ? format(new Date(p.created_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${cfg.badge}`}>{cfg.label}</span>
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Edit payment status"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Approval Modal */}
      {selectedPayment && (
        <PaymentApprovalModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onApproved={() => {
            setPayments(p => p.map(x => x.id === selectedPayment.id ? { ...selectedPayment } : x));
          }}
        />
      )}
    </div>
  );
}