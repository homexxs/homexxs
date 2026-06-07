import { createClient } from 'npm:@base44/sdk@0.8.21';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRoleKey: "service" });

Deno.serve(async (req) => {
  try {
    const { token, email } = await req.json();

    if (!token || !email) {
      return Response.json({ error: 'Missing token or email' }, { status: 400 });
    }

    // Find token record using service role (no user auth required)
    const tokens = await base44.entities.AdminLoginToken.filter({ token, email });

    if (!tokens || tokens.length === 0) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 401 });
    }

    const tokenRecord = tokens[0];

    if (tokenRecord.used) {
      return Response.json({ error: 'Link already used' }, { status: 401 });
    }

    const now = new Date();
    if (now > new Date(tokenRecord.expires_at)) {
      return Response.json({ error: 'Link expired' }, { status: 401 });
    }

    // Mark as used
    await base44.entities.AdminLoginToken.update(tokenRecord.id, {
      used: true,
      verified_at: now.toISOString(),
    });

    return Response.json({ success: true, email });
  } catch (error) {
    console.error('verifyMagicLink error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});