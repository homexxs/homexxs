import { createClient } from 'npm:@base44/sdk@0.8.21';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRoleKey: "service" });

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, appUrl } = body;

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // Generate secure token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const tokenHex = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store token using service role (no user auth required)
    await base44.entities.AdminLoginToken.create({
      email,
      token: tokenHex,
      used: false,
      expires_at: expiresAt,
    });

    // Build magic link pointing to the app's AdminLogin page with token params
    const baseUrl = appUrl || 'https://app.base44.com';
    const magicLink = `${baseUrl}/AdminLogin?token=${tokenHex}&email=${encodeURIComponent(email)}`;

    const emailHtml = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900;">🔐 HomeX Admin Access</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
            Click the button below to securely log in to your HomeX admin dashboard.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
            ⏱️ <strong>This link expires in 15 minutes</strong> — if you didn't request this, please ignore it.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${magicLink}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
              ✓ Sign In to Admin Dashboard
            </a>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Or copy this link:<br/>
              <code style="background: white; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 11px; border: 1px solid #e5e7eb;">
                ${magicLink}
              </code>
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 11px; margin-top: 24px; margin-bottom: 0; text-align: center;">
            © HomeX Admin Portal · Secure access only
          </p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Home Xperts <onboarding@resend.dev>',
        to: [email],
        subject: '🔐 Your HomeX Admin Login Link',
        html: emailHtml,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', JSON.stringify(data));
      return Response.json({ error: data.message || 'Email delivery failed' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendMagicLink error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});