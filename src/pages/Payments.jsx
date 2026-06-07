import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CreditCard, Download, CheckCircle, Clock, X, AlertCircle,
  Eye, FileText, MessageSquare, ChevronRight, RefreshCw,
  ChevronLeft as ChevLeft, Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  success:  { color: "bg-green-50 text-green-700 border-green-200",  icon: CheckCircle,   label: "Paid",     dot: "bg-green-500" },
  pending:  { color: "bg-amber-50 text-amber-600 border-amber-200",  icon: Clock,          label: "Pending",  dot: "bg-amber-400" },
  failed:   { color: "bg-red-50 text-red-600 border-red-200",        icon: AlertCircle,    label: "Failed",   dot: "bg-red-500" },
  refunded: { color: "bg-gray-50 text-gray-600 border-gray-200",     icon: RefreshCw,      label: "Refunded", dot: "bg-gray-400" },
};

const SERVICE_LABELS = {
  cleaning: "Home Cleaning", fumigation: "Fumigation", lawn_care: "Lawn Care",
  pest_control: "Pest Control", deep_cleaning: "Deep Cleaning", pool_maintenance: "Pool Maintenance",
};

function ReceiptCarousel({ receiptUrl, paidAt }) {
  // receiptUrl could be a single URL string or comma-separated URLs
  const urls = receiptUrl ? receiptUrl.split(",").map(u => u.trim()).filter(Boolean) : [];
  const [idx, setIdx] = useState(0);
  if (urls.length === 0) return null;

  return (
    <div className="px-6 pb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" /> Uploaded Receipt{urls.length > 1 ? `s (${urls.length})` : ""}
      </div>
      <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
        <a href={urls[idx]} target="_blank" rel="noopener noreferrer">
          <img
            src={urls[idx]}
            alt={`Receipt ${idx + 1}`}
            className="w-full object-contain max-h-56 hover:opacity-90 transition-opacity cursor-zoom-in"
          />
        </a>
        {/* Carousel nav */}
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + urls.length) % urls.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % urls.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {urls.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-purple-600 w-3" : "bg-gray-300"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Payment date */}
      <div className="mt-2 text-xs text-gray-400 text-center">
        {paidAt ? `Paid on ${format(new Date(paidAt), "MMMM d, yyyy · h:mm a")}` : "Date not available"}
      </div>
    </div>
  );
}

function PaymentDetailModal({ payment, onClose, onDispute }) {
  const cfg = statusConfig[payment.status] || statusConfig.pending;
  const Icon = cfg.icon;

  const downloadReceipt = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Header background
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, 210, 40, "F");

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Home Xperts", 20, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("HOME CARE EXPERTS", 20, 26);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", 20, 36);

    // Status badge
    const statusColor = payment.status === "success" ? [22, 163, 74] : [245, 158, 11];
    doc.setFillColor(...statusColor);
    doc.roundedRect(148, 10, 42, 12, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text((payment.status || "").toUpperCase(), 169, 18, { align: "center" });

    // Body
    doc.setTextColor(17, 24, 39);
    let y = 55;

    const row = (label, value) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(label, 20, y);
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.text(String(value || "—"), 100, y);
      y += 10;
    };

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, 48, 180, 85, 4, 4, "F");
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 48, 180, 85, 4, 4, "S");

    y = 60;
    row("Invoice No.", payment.invoice_number || "—");
    row("Reference", payment.transaction_ref || "—");
    row("Client", payment.client_name || payment.client_email);
    row("Service", SERVICE_LABELS[payment.service_type] || payment.service_type?.replace(/_/g, " ") || "—");
    row("Date", payment.paid_at ? format(new Date(payment.paid_at), "MMMM d, yyyy · h:mm a") : "—");
    row("Method", payment.payment_method || "Online");
    row("Currency", payment.currency || "NGN");

    // Amount box
    y = 148;
    doc.setFillColor(109, 40, 217);
    doc.roundedRect(15, y, 180, 28, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL AMOUNT PAID", 20, y + 10);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`NGN ${(payment.amount || 0).toLocaleString()}`, 195, y + 20, { align: "right" });

    // Footer
    y = 190;
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for choosing Home Xperts!", 105, y, { align: "center" });
    doc.text("+234 8095490396  |  holdit.com@gmail.com", 105, y + 7, { align: "center" });
    doc.text(`© ${new Date().getFullYear()} Home Xperts. All rights reserved.`, 105, y + 14, { align: "center" });

    doc.save(`HomeXperts-Receipt-${payment.invoice_number || payment.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header strip */}
        <div className={`h-1.5 ${cfg.dot}`} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Payment Receipt</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Invoice body */}
        <div className="px-6 py-5 space-y-3">
          {[
            { label: "Invoice No.",   value: payment.invoice_number || "—" },
            { label: "Reference",     value: payment.transaction_ref || "—" },
            { label: "Service",       value: SERVICE_LABELS[payment.service_type] || payment.service_type?.replace(/_/g, " ") || "—" },
            { label: "Date",          value: payment.paid_at ? format(new Date(payment.paid_at), "MMM d, yyyy · h:mm a") : "—" },
            { label: "Method",        value: payment.payment_method || "Online" },
            { label: "Currency",      value: payment.currency || "NGN" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">{label}</span>
              <span className="font-semibold text-gray-900 text-right max-w-[55%]">{value}</span>
            </div>
          ))}
        </div>

        {/* Receipt images carousel */}
        {payment.receipt_url && (
          <ReceiptCarousel receiptUrl={payment.receipt_url} paidAt={payment.paid_at || payment.created_date} />
        )}

        {/* Subscription badge */}
        {payment.payment_type === "subscription" && (
          <div className="px-6 pb-4">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
              🔑 Subscription Payment · {payment.subscription_duration?.replace(/_/g, " ") || ""}
            </span>
          </div>
        )}

        {/* Amount footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-600">Amount</span>
          <span className="text-2xl font-black text-gray-900">₦{(payment.amount || 0).toLocaleString()}</span>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex gap-2 border-t border-gray-100">
          {payment.status === "success" && (
            <button onClick={downloadReceipt}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Download PDF Receipt
            </button>
          )}
          {payment.status === "failed" && (
            <button onClick={() => onDispute(payment)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">
              <MessageSquare className="w-4 h-4" /> Raise a Dispute
            </button>
          )}
          {payment.status === "success" && (
            <button onClick={() => onDispute(payment)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DisputeModal({ payment, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("billing");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="h-1 bg-red-500" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Raise a Dispute</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            Regarding invoice <span className="font-bold">{payment.invoice_number || payment.id}</span> · ₦{(payment.amount || 0).toLocaleString()}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Issue Type</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200">
              <option value="billing">Billing / Incorrect Charge</option>
              <option value="service_issue">Service Not Delivered</option>
              <option value="complaint">Quality Complaint</option>
              <option value="request">Refund Request</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Describe the Issue *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              rows={4} placeholder="Please describe the issue in detail..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSubmit(reason, category)} disabled={!reason || submitting}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2">
            {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : "Submit Dispute"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  const [user, setUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [unpaidBookings, setUnpaidBookings] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [disputePayment, setDisputePayment] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(async u => {
      setUser(u);
      const [p, b] = await Promise.all([
        filter(TABLES.payments, { client_email: u.email }, "-created_date", 50),
        filter(TABLES.bookings, { client_email: u.email, payment_status: "unpaid" }, "-created_date", 20),
      ]);
      setPayments(p);
      setUnpaidBookings(b.filter(b => b.status !== "cancelled"));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePay = async (booking) => {
    setProcessing(booking.id);
    const ref = `HXP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const invoiceNum = `INV-${new Date().getFullYear()}-${String(payments.length + 1).padStart(4, "0")}`;
    const payment = await create(TABLES.payments, {
      client_email: user.email,
      client_name: user.full_name,
      booking_id: booking.id,
      amount: booking.price || 0,
      currency: "NGN",
      status: "success",
      transaction_ref: ref,
      service_type: booking.service_type,
      invoice_number: invoiceNum,
      paid_at: new Date().toISOString(),
      payment_method: "Paystack",
    });
    await update(TABLES.bookings, booking.id, { payment_status: "paid" });
    await create(TABLES.notifications, {
      recipient_email: user.email,
      title: "Payment Successful ✓",
      message: `Payment of ₦${(booking.price || 0).toLocaleString()} received. Invoice: ${invoiceNum}`,
      type: "payment_received",
      related_id: payment.id,
    });
    setPayments(p => [payment, ...p]);
    setUnpaidBookings(p => p.filter(b => b.id !== booking.id));
    setProcessing(null);
  };

  const handleDisputeSubmit = async (reason, category) => {
    setSubmittingDispute(true);
    await create(TABLES.tickets, {
      client_email: user.email,
      client_name: user.full_name,
      title: `Payment Dispute – ${disputePayment.invoice_number || disputePayment.id}`,
      description: reason,
      category,
      priority: "high",
      status: "open",
    });
    await create(TABLES.notifications, {
      recipient_email: user.email,
      title: "Dispute Submitted",
      message: `Your dispute for invoice ${disputePayment.invoice_number || disputePayment.id} has been received. Our team will review it shortly.`,
      type: "ticket_update",
      related_id: disputePayment.id,
    });
    setSubmittingDispute(false);
    setDisputePayment(null);
    setSelectedPayment(null);
  };

  const totalPaid = payments.filter(p => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payments & Billing</h2>
        <p className="text-gray-500 mt-1 text-sm">Manage payments, view invoices, and raise disputes</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="text-sm font-medium opacity-80 mb-1">Total Paid</div>
          <div className="text-2xl font-bold">₦{totalPaid.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm text-gray-500 mb-1">Transactions</div>
          <div className="text-2xl font-bold text-gray-900">{payments.filter(p => p.status === "success").length}</div>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
          <div className="text-sm text-amber-600 mb-1">Pending Payments</div>
          <div className="text-2xl font-bold text-amber-700">{unpaidBookings.length}</div>
        </div>
      </div>



      {/* Unpaid Bookings — Pay Now */}
      {unpaidBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-amber-50 flex items-center justify-between">
            <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Payments ({unpaidBookings.length})
            </h3>
            <span className="text-xs text-amber-600">Complete payment to confirm your booking</span>
          </div>
          <div className="divide-y divide-gray-50">
            {unpaidBookings.map(b => (
              <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 capitalize">
                    {SERVICE_LABELS[b.service_type] || b.service_type?.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {b.scheduled_date ? format(new Date(b.scheduled_date), "MMM d, yyyy") : "—"} · {b.scheduled_time}
                  </div>
                </div>
                <div className="font-bold text-gray-900 text-sm">₦{(b.price || 0).toLocaleString()}</div>
                <button
                  onClick={() => handlePay(b)}
                  disabled={processing === b.id}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {processing === b.id ? (
                    <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <><CreditCard className="w-3 h-3" /> Pay Now</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Payment History</h3>
          <span className="text-xs text-gray-400">Click any row to view invoice</span>
        </div>
        <div className="divide-y divide-gray-50">
          {payments.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No payment history yet</p>
            </div>
          ) : payments.map(p => {
            const cfg = statusConfig[p.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPayment(p)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50/70 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 capitalize">
                    {SERVICE_LABELS[p.service_type] || p.service_type?.replace(/_/g, " ") || "Service"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    {p.invoice_number && <span className="font-mono">{p.invoice_number}</span>}
                    {p.invoice_number && <span>·</span>}
                    <span>{p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : format(new Date(p.created_date), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-gray-900 text-sm">₦{(p.amount || 0).toLocaleString()}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
                <Eye className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Dispute / Support link */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-gray-700">Have a payment issue?</div>
            <div className="text-xs text-gray-400">Raise a support ticket and our team will assist you</div>
          </div>
        </div>
        <Link to={createPageUrl("Support")}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          Go to Support <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onDispute={(p) => { setDisputePayment(p); setSelectedPayment(null); }}
        />
      )}

      {/* Dispute Modal */}
      {disputePayment && (
        <DisputeModal
          payment={disputePayment}
          onClose={() => setDisputePayment(null)}
          onSubmit={handleDisputeSubmit}
          submitting={submittingDispute}
        />
      )}
    </div>
  );
}