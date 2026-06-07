import { invokeFunction } from '@/lib/api';
import { useState } from "react";
import { X, Download, Mail, Loader2, CheckCircle, FileText } from "lucide-react";

const STATUS_STYLES = {
  draft:   "bg-gray-100 text-gray-600 border-gray-200",
  sent:    "bg-blue-50 text-blue-700 border-blue-200",
  paid:    "bg-green-50 text-green-700 border-green-200",
  overdue: "bg-red-50 text-red-600 border-red-200",
};

export default function InvoiceModal({ booking, onClose, onInvoiceCreated }) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null); // "downloaded" | "sent"
  const [invoiceId, setInvoiceId] = useState(null);

  const handleDownload = async () => {
    setLoading(true);
    setDone(null);
    const response = await invokeFunction("generateInvoice", {
      booking_id: booking.id,
      send_email: false,
    });
    // response.data is arraybuffer — but via SDK it's base64 or blob
    // Re-fetch as blob using fetch directly
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const invoiceNum = response.headers?.["x-invoice-number"] || "invoice";
    a.href = url;
    a.download = `${invoiceNum}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setDone("downloaded");
    if (onInvoiceCreated) onInvoiceCreated();
    setLoading(false);
  };

  const handleSendEmail = async () => {
    setSending(true);
    setDone(null);
    await invokeFunction("generateInvoice", {
      booking_id: booking.id,
      send_email: true,
    });
    setDone("sent");
    if (onInvoiceCreated) onInvoiceCreated();
    setSending(false);
  };

  const SERVICE_LABELS = {
    cleaning: "Home Cleaning", fumigation: "Fumigation", lawn_care: "Lawn Care",
    pest_control: "Pest Control", deep_cleaning: "Deep Cleaning", pool_maintenance: "Pool Maintenance",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Generate Invoice</h3>
              <p className="text-xs text-gray-500 mt-0.5">{booking.client_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Booking summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {[
              { label: "Service", value: SERVICE_LABELS[booking.service_type] || booking.service_type?.replace(/_/g, " ") },
              { label: "Date", value: booking.scheduled_date },
              { label: "Amount", value: `₦${(booking.price || 0).toLocaleString()}` },
              { label: "Payment", value: booking.payment_status || "unpaid" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900 capitalize">{value}</span>
              </div>
            ))}
          </div>

          {/* Success feedback */}
          {done === "downloaded" && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> Invoice PDF downloaded successfully.
            </div>
          )}
          {done === "sent" && (
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> Invoice emailed to {booking.client_email}.
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button onClick={handleDownload} disabled={loading || sending}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? "Generating PDF..." : "Download PDF"}
            </button>
            <button onClick={handleSendEmail} disabled={loading || sending}
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {sending ? "Sending..." : `Email to ${booking.client_email}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}