import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { type, booking, user } = await req.json();

    if (!booking || !user) {
      return Response.json({ error: 'Missing booking or user' }, { status: 400 });
    }

    const SERVICE_LABELS = {
      cleaning: 'Home Cleaning',
      fumigation: 'Fumigation',
      lawn_care: 'Lawn Care',
      pest_control: 'Pest Control',
      deep_cleaning: 'Deep Cleaning',
      pool_maintenance: 'Pool Maintenance',
    };

    const serviceLabel = SERVICE_LABELS[booking.service_type] || booking.service_type?.replace(/_/g, ' ');
    let subject = '';
    let body = '';

    if (type === 'booking_created') {
      subject = '✅ Service Booking Confirmed - HomeX';
      body = `
        <h2 style="color: #4F46E5;">Booking Confirmed!</h2>
        <p>Hi ${user.full_name || user.email},</p>
        <p>Your ${serviceLabel} has been booked and is pending staff assignment.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>📅 Date:</strong> ${booking.scheduled_date}</p>
          <p><strong>🕐 Time:</strong> ${booking.scheduled_time}</p>
          <p><strong>📍 Address:</strong> ${booking.address}</p>
          <p><strong>💰 Amount:</strong> ₦${(booking.price || 0).toLocaleString()}</p>
        </div>
        
        <p>You'll receive an email once a technician is assigned. Check your Dashboard for real-time updates.</p>
        <p>Questions? Reply to this email or contact our support team.</p>
      `;
    } else if (type === 'booking_reminder') {
      subject = '⏰ Your HomeX Service is Tomorrow - ${serviceLabel}';
      body = `
        <h2 style="color: #4F46E5;">Service Reminder</h2>
        <p>Hi ${user.full_name || user.email},</p>
        <p>This is a friendly reminder about your upcoming ${serviceLabel} service.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>📅 Date:</strong> ${booking.scheduled_date}</p>
          <p><strong>🕐 Time:</strong> ${booking.scheduled_time}</p>
          <p><strong>📍 Address:</strong> ${booking.address}</p>
        </div>
        
        <p>Please ensure access is available. If you need to reschedule, log in to your Dashboard.</p>
      `;
    } else if (type === 'booking_confirmed_staff') {
      subject = '🚀 Your HomeX Service is Confirmed - Staff Assigned';
      body = `
        <h2 style="color: #4F46E5;">Staff Assigned!</h2>
        <p>Hi ${user.full_name || user.email},</p>
        <p>Your ${serviceLabel} has been confirmed and assigned to our team.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>👷 Team:</strong> ${booking.assigned_team || 'Professional Team'}</p>
          <p><strong>📅 Date:</strong> ${booking.scheduled_date}</p>
          <p><strong>🕐 Time:</strong> ${booking.scheduled_time}</p>
          <p><strong>📍 Address:</strong> ${booking.address}</p>
        </div>
        
        <p>Track your service in real-time on your Dashboard.</p>
      `;
    }

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject,
      body,
    });

    return Response.json({ success: true, message: 'Email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});