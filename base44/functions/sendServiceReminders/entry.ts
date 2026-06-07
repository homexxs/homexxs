import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by a scheduler, so use service role
    const allBookings = await base44.asServiceRole.entities.Booking.list("-scheduled_date", 500);

    const now = new Date();
    // Target window: bookings scheduled between 23 and 25 hours from now
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const SERVICE_LABELS = {
      cleaning:         "Home Cleaning",
      fumigation:       "Fumigation",
      lawn_care:        "Lawn Care",
      pest_control:     "Pest Control",
      deep_cleaning:    "Deep Cleaning",
      pool_maintenance: "Pool Maintenance",
    };

    const remindedIds = [];
    const skippedIds  = [];

    for (const booking of allBookings) {
      // Only remind confirmed/pending bookings that haven't been reminded yet
      if (!["pending", "confirmed"].includes(booking.status)) continue;
      if (booking.reminder_sent) continue;
      if (!booking.scheduled_date || !booking.client_email) continue;

      // Parse the scheduled datetime (combine date + time)
      const timeStr = booking.scheduled_time || "09:00 AM";
      const dateTimeStr = `${booking.scheduled_date} ${timeStr}`;
      const scheduledAt = new Date(dateTimeStr);

      if (isNaN(scheduledAt.getTime())) { skippedIds.push(booking.id); continue; }

      if (scheduledAt >= windowStart && scheduledAt <= windowEnd) {
        const serviceLabel = SERVICE_LABELS[booking.service_type] || booking.service_type?.replace(/_/g, " ") || "Service";
        const dateFormatted = scheduledAt.toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

        // Send email via Core integration
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: booking.client_email,
          subject: `Reminder: Your ${serviceLabel} is tomorrow — Home Xperts`,
          body: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6D28D9,#4338CA);padding:32px 32px 24px;">
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Home <span style="color:#C4B5FD;">Xperts</span></div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;letter-spacing:2px;text-transform:uppercase;">Home Care Experts</div>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      <div style="font-size:26px;margin-bottom:8px;">⏰</div>
      <h2 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 8px;">Your service is tomorrow!</h2>
      <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:0 0 24px;">
        Hi ${booking.client_name || "there"}, just a friendly reminder that your upcoming service is scheduled for tomorrow.
      </p>
      <!-- Booking details card -->
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Service</span>
          <span style="font-size:13px;font-weight:700;color:#111827;">${serviceLabel}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Date</span>
          <span style="font-size:13px;font-weight:700;color:#111827;">${dateFormatted}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Time</span>
          <span style="font-size:13px;font-weight:700;color:#111827;">${booking.scheduled_time || "TBC"}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Address</span>
          <span style="font-size:13px;font-weight:700;color:#111827;text-align:right;max-width:60%;">${booking.address || "—"}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 8px;">
        Please ensure someone is available at the address. If you need to reschedule, log in to your portal.
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:20px 32px;text-align:center;">
      <p style="font-size:11px;color:#9CA3AF;margin:0;">📞 +234 8095490396 &nbsp;|&nbsp; ✉️ holdit.com@gmail.com</p>
      <p style="font-size:10px;color:#D1D5DB;margin:6px 0 0;">© ${new Date().getFullYear()} Home Xperts. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
        });

        // Create in-app notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: booking.client_email,
          title: `Service Reminder: ${serviceLabel} tomorrow`,
          message: `Your ${serviceLabel} is scheduled for ${dateFormatted} at ${booking.scheduled_time || "TBC"}.`,
          type: "booking_reminder",
          related_id: booking.id,
        });

        // Mark booking as reminded to avoid duplicates
        await base44.asServiceRole.entities.Booking.update(booking.id, { reminder_sent: true });

        remindedIds.push(booking.id);
      }
    }

    return Response.json({
      success: true,
      reminded: remindedIds.length,
      skipped: skippedIds.length,
      remindedIds,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});