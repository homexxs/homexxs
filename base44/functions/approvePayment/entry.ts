import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'staff_account'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { payment_id, status, notes } = await req.json();

    if (!payment_id || !status) {
      return Response.json({ error: 'Missing payment_id or status' }, { status: 400 });
    }

    // Update payment record
    const payment = await base44.entities.Payment.update(payment_id, {
      status,
      approved_by: user.email,
      approved_at: new Date().toISOString(),
      notes: notes || '',
    });

    // Update associated booking payment status
    if (payment.booking_id) {
      await base44.entities.Booking.update(payment.booking_id, {
        payment_status: status === 'success' ? 'paid' : 'unpaid',
      });
    }

    // Send notification to client
    let title = '';
    let message = '';

    if (status === 'success') {
      title = 'Payment Confirmed ✅';
      message = `Your payment of ₦${payment.amount.toLocaleString()} has been confirmed and approved.`;
    } else if (status === 'failed') {
      title = 'Payment Failed ❌';
      message = `Your payment of ₦${payment.amount.toLocaleString()} could not be processed. Please try again.`;
    } else if (status === 'refunded') {
      title = 'Payment Refunded 💰';
      message = `A refund of ₦${payment.amount.toLocaleString()} has been processed to your account.`;
    }

    if (title) {
      await base44.entities.Notification.create({
        recipient_email: payment.client_email,
        title,
        message,
        type: 'payment_received',
        related_id: payment_id,
      });

      // Send email
      await base44.integrations.Core.SendEmail({
        to: payment.client_email,
        subject: title,
        body: `<p>${message}</p><p>Thank you for using HomeX!</p>`,
      });
    }

    return Response.json({ success: true, payment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});