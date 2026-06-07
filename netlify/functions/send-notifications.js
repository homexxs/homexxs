import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Replaces base44.functions.invoke('sendClientNotifications', ...)
 * Inserts a notification record; plug in Resend/SendGrid/Nodemailer for emails.
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { recipient_email, title, message, type, related_id } = JSON.parse(event.body);

    // Save notification to database
    const { error } = await supabase.from('notifications').insert({
      recipient_email,
      title,
      message,
      type: type || 'general',
      is_read: false,
      related_id,
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    // ── Optional: send email via Resend ──
    // Uncomment and set RESEND_API_KEY in Netlify env vars
    //
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     from: 'HomeX <noreply@yourdomain.com>',
    //     to: [recipient_email],
    //     subject: title,
    //     html: `<p>${message}</p>`
    //   })
    // });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
