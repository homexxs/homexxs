import { createClient } from 'npm:@base44/sdk@0.8.21';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRoleKey: "service" });

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store token using service role (no user auth required)
    await base44.entities.AdminLoginToken.create({
      email,
      token: otp,
      used: false,
      expires_at: expiresAt,
    });

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Home Xperts <onboarding@resend.dev>',
        to: [email],
        subject: 'HomeX Admin — Your OTP Code',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="font-size:22px;font-weight:900;color:#111827;">Home<span style="color:#7c3aed;">X</span></div>
              <div style="font-size:10px;color:#9ca3af;letter-spacing:0.15em;text-transform:uppercase;">Admin Login OTP</div>
            </div>
            <p style="font-size:14px;color:#374151;margin-bottom:8px;">Your one-time password to access the Admin Portal:</p>
            <div style="text-align:center;margin:24px 0;">
              <div style="display:inline-block;background:#f3f4f6;border:2px dashed #7c3aed;border-radius:12px;padding:16px 40px;font-size:36px;font-weight:900;letter-spacing:8px;color:#7c3aed;">${otp}</div>
            </div>
            <p style="font-size:12px;color:#6b7280;text-align:center;">Expires in 10 minutes. Do not share it with anyone.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="font-size:11px;color:#9ca3af;text-align:center;">© HomeX Admin Portal</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', JSON.stringify(data));
      return Response.json({ error: data.message || 'Email delivery failed' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendAdminOTP error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});