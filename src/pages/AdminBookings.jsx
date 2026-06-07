import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { invokeFunction } from '@/lib/api';
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, X, FileText, MessageSquare, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { SERVICE_CONFIG, STATUS_CONFIG } from "@/components/shared/ColorConfig";
import InvoiceModal from "@/components/invoices/InvoiceModal";
import MessagingThread from "@/components/messaging/MessagingThread";

const ALL_STATUSES = ["pending","confirmed","in_progress","completed","cancelled","rescheduled"];
const ALL_SERVICES = ["cleaning","fumigation","lawn_care","pest_control","deep_cleaning","pool_maintenance"];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [messagingBooking, setMessagingBooking] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => { getMe().then(setAdminUser).catch(() => {}); }, []);

  useEffect(() => {
    Promise.all([
      list(TABLES.bookings, "-created_date", 300),
      filter(TABLES.staff_members, { is_active: true }),
    ]).then(([b, s]) => { setBookings(b); setStaff(s); setLoading(false); }).catch(() => setLoading(false));

    const unsub = subscribe(TABLES.bookings, e => {
      if (e.type === "create") setBookings(p => [e.data, ...p]);
      else if (e.type === "update") setBookings(p => p.map(b => b.id === e.id ? e.data : b));
      else if (e.type === "delete") setBookings(p => p.filter(b => b.id !== e.id));
    });
    return unsub;
  }, []);

  const updateBooking = async (id, data) => {
    setSaving(true);
    const updated = await update(TABLES.bookings, id, data);
    setBookings(p => p.map(b => b.id === id ? updated : b));
    setSelected(updated);
    // Send confirmation email when status changes to "confirmed"
    if (data.status === "confirmed") {
      invokeFunction("sendEventEmails", { event_type: "booking_confirmed", booking_id: id }).catch(() => {});
    }
    setSaving(false);
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.client_name?.toLowerCase().includes(q) || b.client_email?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchService = serviceFilter === "all" || b.service_type === serviceFilter;
    return matchSearch && matchStatus && matchService;
  });

  const exportBookingsPDF = () => {
    const doc = new jsPDF();
    const now = format(new Date(), "dd MMM yyyy, HH:mm");

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont(undefined, "bold");
    doc.text("HomeX — Booked Services Report", 14, 13);
    doc.setFontSize(8); doc.setFont(undefined, "normal");
    doc.text(`Generated: ${now}  ·  ${filtered.length} bookings`, 14, 22);

    // Table header
    doc.setFillColor(243, 244, 246);
    doc.rect(0, 32, 210, 8, "F");
    doc.setTextColor(100, 100, 120);
    doc.setFontSize(7); doc.setFont(undefined, "bold");
    const cols = [14, 60, 95, 125, 152, 175];
    const heads = ["CLIENT", "SERVICE", "DATE & TIME", "STATUS", "PAYMENT", "PRICE (₦)"];
    heads.forEach((h, i) => doc.text(h, cols[i], 37));

    // Rows
    doc.setFont(undefined, "normal");
    let y = 44;
    filtered.forEach((b, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(0, y - 4, 210, 8, "F"); }
      doc.setTextColor(30, 30, 30); doc.setFontSize(7.5);
      doc.text((b.client_name || "—").slice(0, 22), cols[0], y);
      doc.text((b.service_type || "—").replace(/_/g, " ").slice(0, 16), cols[1], y);
      doc.text(`${b.scheduled_date || "—"} ${b.scheduled_time || ""}`.slice(0, 20), cols[2], y);
      doc.text((b.status || "—").replace(/_/g, " "), cols[3], y);
      doc.text(b.payment_status || "unpaid", cols[4], y);
      doc.text((b.price || 0).toLocaleString(), cols[5], y);
      y += 8;
    });

    // Footer
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text("HomeX Home Care Tech · Confidential", 14, 290);
    doc.save(`homex-bookings-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportBookingDetailPDF = (b) => {
    const doc = new jsPDF();
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont(undefined, "bold");
    doc.text("HomeX — Booking Detail", 14, 13);
    doc.setFontSize(8); doc.setFont(undefined, "normal");
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, 14, 22);

    doc.setTextColor(30, 30, 30);
    const rows = [
      ["Client Name", b.client_name || "—"],
      ["Client Email", b.client_email || "—"],
      ["Service", (b.service_type || "—").replace(/_/g, " ")],
      ["Date", b.scheduled_date || "—"],
      ["Time", b.scheduled_time || "—"],
      ["Address", b.address || "—"],
      ["Status", (b.status || "—").replace(/_/g, " ")],
      ["Payment Status", b.payment_status || "unpaid"],
      ["Assigned Team", b.assigned_team || "Unassigned"],
      ["Price", `NGN ${(b.price || 0).toLocaleString()}`],
    ];
    let y = 40;
    rows.forEach(([label, value]) => {
      doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(100, 100, 120);
      doc.text(label.toUpperCase(), 14, y);
      doc.setFont(undefined, "normal"); doc.setTextColor(30, 30, 30); doc.setFontSize(10);
      doc.text(String(value).slice(0, 80), 14, y + 5);
      doc.setDrawColor(230, 230, 235); doc.line(14, y + 9, 196, y + 9);
      y += 16;
    });
    if (b.notes) {
      doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(100, 100, 120);
      doc.text("NOTES", 14, y);
      doc.setFont(undefined, "normal"); doc.setTextColor(30, 30, 30); doc.setFontSize(9);
      const lines = doc.splitTextToSize(b.notes, 180);
      doc.text(lines, 14, y + 6);
    }
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text("HomeX Home Care Tech · Confidential", 14, 290);
    doc.save(`homex-booking-${b.id?.slice(0, 8) || "detail"}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Booked Services</h2>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} of {bookings.length} bookings</p>
        </div>
        <button onClick={exportBookingsPDF} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, email, address..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
          <option value="all">All Services</option>
          {ALL_SERVICES.map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                {["Client","Service","Date & Time","Status","Payment","Assigned","Price"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400">No bookings found</td></tr>
              ) : filtered.map(b => {
                const svc = SERVICE_CONFIG[b.service_type];
                const sts = STATUS_CONFIG[b.status];
                return (
                  <tr key={b.id} onClick={() => setSelected(b)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.client_name || "—"}</div>
                      <div className="text-xs text-gray-400">{b.client_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${svc?.badge || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {svc?.label || b.service_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {b.scheduled_date} <span className="text-gray-400">·</span> {b.scheduled_time}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${sts?.badge || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {sts?.label || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${b.payment_status === "paid" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                        {b.payment_status || "unpaid"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{b.assigned_team || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₦{(b.price || 0).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Booking Details</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                ["Client", selected.client_name],
                ["Email", selected.client_email],
                ["Service", selected.service_type?.replace(/_/g, " ")],
                ["Date", selected.scheduled_date],
                ["Time", selected.scheduled_time],
                ["Address", selected.address],
                ["Price", `₦${(selected.price || 0).toLocaleString()}`],
                ["Payment", selected.payment_status],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%] capitalize">{v || "—"}</span>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Update Status</label>
                <select defaultValue={selected.status} onChange={e => updateBooking(selected.id, { status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {ALL_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign Staff</label>
                <select defaultValue={selected.assigned_team || ""} onChange={e => updateBooking(selected.id, { assigned_team: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">— Unassigned —</option>
                  {staff.map(s => <option key={s.id} value={s.full_name}>{s.full_name} ({s.role_title || "Staff"})</option>)}
                </select>
              </div>
              {selected.notes && <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600"><span className="font-semibold text-xs text-gray-500 block mb-1">Notes</span>{selected.notes}</div>}

              {/* Invoice + Messaging + PDF actions */}
              <div className="flex gap-2 pt-2 flex-wrap">
                <button onClick={() => { setInvoiceBooking(selected); setSelected(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors">
                  <FileText className="w-4 h-4" /> Invoice
                </button>
                <button onClick={() => { setMessagingBooking(selected); setSelected(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-purple-200 text-purple-600 text-sm font-semibold rounded-xl hover:bg-purple-50 transition-colors">
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
                <button onClick={() => exportBookingDetailPDF(selected)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {invoiceBooking && (
        <InvoiceModal booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} />
      )}
      {messagingBooking && adminUser && (
        <MessagingThread booking={messagingBooking} user={adminUser} onClose={() => setMessagingBooking(null)} />
      )}
    </div>
  );
}