import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import jsPDF from "jspdf";

const SERVICE_LABELS = {
  cleaning: "Home Cleaning", fumigation: "Fumigation", lawn_care: "Lawn Care",
  pest_control: "Pest Control", deep_cleaning: "Deep Cleaning", pool_maintenance: "Pool Service",
};

export default function DownloadReportButton({ user, bookings, payments }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    const doc = new jsPDF();
    const today = startOfDay(new Date());
    const pageW = doc.internal.pageSize.getWidth();
    let y = 0;

    const checkPage = (needed = 10) => {
      if (y + needed > 270) { doc.addPage(); y = 20; }
    };

    // ── Header ──
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, pageW, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("HomeX Client Report", 14, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "EEEE, MMMM d, yyyy")}`, 14, 28);
    doc.text(`Client: ${user?.full_name || user?.email || "—"}  |  Email: ${user?.email || "—"}`, 14, 34);
    y = 50;

    // ── Subscription info ──
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Subscription", 14, y);
    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, pageW - 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const subStatus = user?.subscription_status || "inactive";
    const subDuration = user?.subscription_duration?.replace(/_/g, " ") || "—";
    const subExpiry = user?.subscription_expires_at ? format(new Date(user.subscription_expires_at), "MMM d, yyyy") : "—";
    doc.text(`Status: ${subStatus.toUpperCase()}`, 14, y);
    doc.text(`Duration: ${subDuration}`, 70, y);
    doc.text(`Expires: ${subExpiry}`, 130, y);
    y += 14;

    // ── Upcoming Appointments ──
    const upcoming = bookings.filter(b =>
      !["cancelled", "completed"].includes(b.status) &&
      b.scheduled_date && !isBefore(new Date(b.scheduled_date), today)
    ).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    checkPage(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(`Upcoming Appointments (${upcoming.length})`, 14, y);
    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, pageW - 14, y);
    y += 5;

    if (upcoming.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("No upcoming appointments.", 14, y);
      y += 10;
    } else {
      // Table header
      doc.setFillColor(245, 240, 255);
      doc.rect(14, y, pageW - 28, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 60, 140);
      doc.text("Service", 16, y + 5);
      doc.text("Date", 72, y + 5);
      doc.text("Time", 118, y + 5);
      doc.text("Status", 154, y + 5);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      upcoming.forEach((b, i) => {
        checkPage(8);
        if (i % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(14, y - 2, pageW - 28, 7, "F"); }
        doc.setFontSize(8);
        doc.text(SERVICE_LABELS[b.service_type] || b.service_type || "—", 16, y + 3);
        doc.text(b.scheduled_date ? format(new Date(b.scheduled_date), "MMM d, yyyy") : "—", 72, y + 3);
        doc.text(b.scheduled_time || "—", 118, y + 3);
        doc.text((b.status || "—").replace(/_/g, " "), 154, y + 3);
        y += 8;
      });
    }
    y += 8;

    // ── Service History ──
    const history = bookings.filter(b =>
      ["completed", "cancelled"].includes(b.status) ||
      (b.scheduled_date && isBefore(new Date(b.scheduled_date), today))
    ).sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));

    checkPage(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(`Service History (${history.length})`, 14, y);
    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, pageW - 14, y);
    y += 5;

    if (history.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("No past service history.", 14, y);
      y += 10;
    } else {
      doc.setFillColor(245, 240, 255);
      doc.rect(14, y, pageW - 28, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 60, 140);
      doc.text("Service", 16, y + 5);
      doc.text("Date", 72, y + 5);
      doc.text("Status", 118, y + 5);
      doc.text("Amount (₦)", 154, y + 5);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      history.forEach((b, i) => {
        checkPage(8);
        if (i % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(14, y - 2, pageW - 28, 7, "F"); }
        doc.setFontSize(8);
        doc.text(SERVICE_LABELS[b.service_type] || b.service_type || "—", 16, y + 3);
        doc.text(b.scheduled_date ? format(new Date(b.scheduled_date), "MMM d, yyyy") : "—", 72, y + 3);
        doc.text((b.status || "—").replace(/_/g, " "), 118, y + 3);
        doc.text(b.price ? b.price.toLocaleString() : "—", 154, y + 3);
        y += 8;
      });
    }
    y += 8;

    // ── Payments ──
    const successPayments = payments.filter(p => p.status === "success")
      .sort((a, b) => new Date(b.paid_at || b.created_date) - new Date(a.paid_at || a.created_date));
    const totalSpent = successPayments.reduce((s, p) => s + (p.amount || 0), 0);

    checkPage(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(`Payment History (${successPayments.length})`, 14, y);
    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, pageW - 14, y);
    y += 5;

    if (successPayments.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("No payment records found.", 14, y);
      y += 10;
    } else {
      doc.setFillColor(245, 240, 255);
      doc.rect(14, y, pageW - 28, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 60, 140);
      doc.text("Reference", 16, y + 5);
      doc.text("Service / Type", 62, y + 5);
      doc.text("Date", 118, y + 5);
      doc.text("Amount (₦)", 154, y + 5);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      successPayments.forEach((p, i) => {
        checkPage(8);
        if (i % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(14, y - 2, pageW - 28, 7, "F"); }
        doc.setFontSize(8);
        const ref = (p.transaction_ref || p.invoice_number || "—").slice(0, 16);
        const svcLabel = (p.service_type || p.payment_type || "—").slice(0, 28);
        const dateStr = p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : "—";
        doc.text(ref, 16, y + 3);
        doc.text(svcLabel, 62, y + 3);
        doc.text(dateStr, 118, y + 3);
        doc.text((p.amount || 0).toLocaleString(), 154, y + 3);
        y += 8;
      });

      y += 2;
      checkPage(10);
      doc.setFillColor(109, 40, 217);
      doc.rect(14, y, pageW - 28, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Total Spent", 16, y + 5.5);
      doc.text(`₦${totalSpent.toLocaleString()}`, 154, y + 5.5);
      y += 14;
    }

    // ── Footer on each page ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`HomeX Client Report · ${user?.email || ""}  |  Page ${i} of ${pageCount}`, 14, 290);
    }

    doc.save(`HomeX_Report_${user?.full_name?.replace(/\s+/g, "_") || "Client"}_${format(new Date(), "yyyyMMdd")}.pdf`);
    setLoading(false);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> : <Download className="w-4 h-4 text-purple-600" />}
      {loading ? "Generating..." : "Download Report"}
    </button>
  );
}