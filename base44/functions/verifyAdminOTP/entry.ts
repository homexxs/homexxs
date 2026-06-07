import { createClient } from 'npm:@base44/sdk@0.8.21';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRoleKey: "service" });

Deno.serve(async (req) => {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return Response.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Find recent unused tokens for this email
    const tokens = await base44.entities.AdminLoginToken.filter({ email, used: false });

    if (!tokens || tokens.length === 0) {
      return Response.json({ error: 'Invalid OTP. Please check the code and try again.' }, { status: 401 });
    }

    // Find the one matching our OTP
    const tokenRecord = tokens.find(t => t.token === otp);
    if (!tokenRecord) {
      return Response.json({ error: 'Invalid OTP. Please check the code and try again.' }, { status: 401 });
    }

    // Check expiry
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return Response.json({ error: 'OTP has expired. Please request a new one.' }, { status: 401 });
    }

    // Mark as used
    await base44.entities.AdminLoginToken.update(tokenRecord.id, {
      used: true,
      verified_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('verifyAdminOTP error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});