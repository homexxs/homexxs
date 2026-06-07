import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SERVICE_LABELS = {
  cleaning: "Home Cleaning", fumigation: "Fumigation", lawn_care: "Lawn Care",
  pest_control: "Pest Control", deep_cleaning: "Deep Cleaning", pool_maintenance: "Pool Maintenance",
};

const HEADER = `
  <div style="background:linear-gradient(135deg,#6D28D9,#4338CA);padding:32px 32px 24px;">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Home <span style="color:#C4B5FD;">Xperts</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;letter-spacing:2px;text-transform:uppercase;">Home Care Experts</div>
  </div>`;

const FOOTER = `
  <div style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:20px 32px;text-align:center;">
    <p style="font-size:11px;color:#9CA3AF;margin:0;">📞 +234 8095490396 &nbsp;|&nbsp; ✉️ holdit.com@gmail.com</p>
    <p style="font-size:10px;color:#D1D5DB;margin:6px 0 0;">© ${new Date().getFullYear()} Home Xperts. All rights reserved.</p>
  </div>`;

function wrap(body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
    ${HEADER}${body}${FOOTER}
  </div></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_type, booking_id, ticket_id } = await req.json();

    if (event_type === "booking_confirmed" && booking_id) {
      const booking = await base44.asServiceRole.entities.Booking.get(booking_id);
      if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
      const svc = SERVICE_LABELS[booking.service_type] || booking.service_type?.replace(/_/g, " ") || "Service";
      const dateFormatted = booking.scheduled_date
        ? new Date(booking.scheduled_date).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "—";

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.client_email,
        subject: `Booking Confirmed: ${svc} — Home Xperts`,
        body: wrap(`
          <div style="padding:32px;">
            <div style="font-size:32px;margin-bottom:8px;">✅</div>
            <h2 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 8px;">Your booking is confirmed!</h2>
            <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:0 0 24px;">
              Hi ${booking.client_name || "there"}, we've received your booking and it's been confirmed.
            </p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:20px;margin-bottom:24px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;">Service</span>
                <span style="font-size:13px;font-weight:700;color:#111827;">${svc}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;">Date</span>
                <span style="font-size:13px;font-weight:700;color:#111827;">${dateFormatted}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;">Time</span>
                <span style="font-size:13px;font-weight:700;color:#111827;">${booking.scheduled_time || "TBC"}</span>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;">Address</span>
                <span style="font-size:13px;font-weight:700;color:#111827;text-align:right;max-width:60%;">${booking.address || "—"}</span>
              </div>
            </div>
            <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0;">
              Log in to your portal to view your booking details, reschedule or message us.
            </p>
          </div>`),
      });
      return Response.json({ success: true, type: "booking_confirmed" });
    }

    if (event_type === "ticket_resolved" && ticket_id) {
      const ticket = await base44.asServiceRole.entities.Ticket.get(ticket_id);
      if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ticket.client_email,
        subject: `Your ticket has been resolved — Home Xperts`,
        body: wrap(`
          <div style="padding:32px;">
            <div style="font-size:32px;margin-bottom:8px;">🎉</div>
            <h2 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 8px;">Ticket Resolved</h2>
            <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:0 0 24px;">
              Hi ${ticket.client_name || "there"}, your support ticket has been resolved.
            </p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:20px;margin-bottom:24px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;">Ticket</span>
                <span style="font-size:13px;font-weight:700;color:#111827;text-align:right;max-width:65%;">${ticket.title}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;">Category</span>
                <span style="font-size:13px;font-weight:700;color:#111827;">${ticket.category?.replace(/_/g, " ") || "—"}</span>
              </div>
              ${ticket.admin_notes ? `<div style="border-top:1px solid #E5E7EB;padding-top:12px;margin-top:4px;">
                <div style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;margin-bottom:6px;">Our Response</div>
                <div style="font-size:13px;color:#374151;line-height:1.6;">${ticket.admin_notes}</div>
              </div>` : ""}
            </div>
            <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0;">
              If you're still experiencing issues, please open a new ticket from your support portal.
            </p>
          </div>`),
      });
      return Response.json({ success: true, type: "ticket_resolved" });
    }

    return Response.json({ error: "Invalid event_type" }, { status: 400 });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});