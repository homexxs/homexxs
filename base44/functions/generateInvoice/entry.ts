import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

const SERVICE_LABELS = {
  cleaning: "Home Cleaning",
  fumigation: "Fumigation",
  lawn_care: "Lawn Care",
  pest_control: "Pest Control",
  deep_cleaning: "Deep Cleaning",
  pool_maintenance: "Pool Maintenance",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { booking_id, send_email } = await req.json();
    if (!booking_id) return Response.json({ error: "booking_id required" }, { status: 400 });

    // Fetch booking
    const bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id });
    const booking = bookings[0];
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });

    // Check for existing invoice
    const existing = await base44.asServiceRole.entities.Invoice.filter({ booking_id });
    let invoice = existing[0];

    // Build line items
    const serviceLabel = SERVICE_LABELS[booking.service_type] || booking.service_type?.replace(/_/g, " ");
    const lineItems = [
      { description: serviceLabel, quantity: 1, unit_price: booking.price || 0, total: booking.price || 0 },
    ];
    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
    const tax = 0;
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = invoice?.invoice_number || `INV-${Date.now().toString().slice(-8)}`;

    // Create or update invoice record
    if (!invoice) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      invoice = await base44.asServiceRole.entities.Invoice.create({
        invoice_number: invoiceNumber,
        booking_id,
        client_email: booking.client_email,
        client_name: booking.client_name,
        service_type: booking.service_type,
        scheduled_date: booking.scheduled_date,
        line_items: lineItems,
        subtotal,
        tax,
        total,
        status: "draft",
        due_date: dueDate.toISOString().split("T")[0],
        notes: booking.notes || "",
      });
    }

    // Generate PDF
    const doc = new jsPDF();

    // Header bar
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 15, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Home Xperts`, 150, 12);
    doc.text(`holdit.com@gmail.com`, 150, 18);
    doc.text(`+234 8095490396`, 150, 24);

    // Invoice meta
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice #:`, 15, 45);
    doc.text(`Date:`, 15, 52);
    doc.text(`Due Date:`, 15, 59);
    doc.text(`Status:`, 15, 66);

    doc.setFont("helvetica", "normal");
    doc.text(invoiceNumber, 50, 45);
    doc.text(new Date().toLocaleDateString("en-NG"), 50, 52);
    doc.text(invoice.due_date || "—", 50, 59);
    doc.text((invoice.status || "draft").toUpperCase(), 50, 66);

    // Bill to
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Bill To:", 120, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(booking.client_name || "—", 120, 52);
    doc.text(booking.client_email || "—", 120, 58);
    doc.text(booking.address || "—", 120, 64, { maxWidth: 75 });

    // Service details box
    doc.setFillColor(245, 245, 250);
    doc.rect(15, 78, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(99, 102, 241);
    doc.text("SERVICE DATE", 18, 84);
    doc.text("DESCRIPTION", 70, 84);
    doc.text("QTY", 140, 84);
    doc.text("UNIT PRICE", 155, 84);
    doc.text("TOTAL", 188, 84);

    // Line items
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    let y = 95;
    for (const item of lineItems) {
      doc.text(booking.scheduled_date || "—", 18, y);
      doc.text(item.description, 70, y);
      doc.text(String(item.quantity), 142, y);
      doc.text(`₦${item.unit_price.toLocaleString()}`, 155, y);
      doc.text(`₦${item.total.toLocaleString()}`, 185, y);
      y += 10;
    }

    // Divider
    doc.setDrawColor(220, 220, 230);
    doc.line(15, y + 2, 195, y + 2);

    // Totals
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", 150, y); doc.text(`₦${subtotal.toLocaleString()}`, 185, y); y += 8;
    doc.text("Tax (0%):", 150, y); doc.text("₦0", 185, y); y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFillColor(99, 102, 241);
    doc.rect(145, y - 5, 50, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL:", 148, y + 2); doc.text(`₦${total.toLocaleString()}`, 175, y + 2); y += 18;

    // Payment status
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Payment Status: ${booking.payment_status?.toUpperCase() || "UNPAID"}`, 15, y);

    if (booking.notes) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Client Notes:", 15, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      const noteLines = doc.splitTextToSize(booking.notes, 170);
      doc.text(noteLines, 15, y);
      y += noteLines.length * 5;
    }

    // Footer
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 280, 210, 17, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("Thank you for choosing Home Xperts | holdit.com@gmail.com | +234 8095490396", 105, 290, { align: "center" });

    const pdfBytes = doc.output("arraybuffer");

    // Optionally send email
    if (send_email && booking.client_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.client_email,
        subject: `Your Invoice ${invoiceNumber} from Home Xperts`,
        body: `Dear ${booking.client_name || "Client"},\n\nPlease find attached your invoice ${invoiceNumber} for your ${serviceLabel} service.\n\nAmount Due: ₦${total.toLocaleString()}\nDue Date: ${invoice.due_date}\n\nThank you for choosing Home Xperts!\n\nBest regards,\nHome Xperts Team\nholdit.com@gmail.com`,
      });

      await base44.asServiceRole.entities.Invoice.update(invoice.id, { status: "sent" });
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: booking.client_email,
        title: "Invoice Sent 📄",
        message: `Invoice ${invoiceNumber} for ₦${total.toLocaleString()} has been sent to your email.`,
        type: "payment_received",
        related_id: invoice.id,
      });
    }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${invoiceNumber}.pdf`,
        "X-Invoice-Id": invoice.id,
        "X-Invoice-Number": invoiceNumber,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});