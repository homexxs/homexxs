import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const { otp, to } = await req.json();

    const base44 = createClientFromRequest(req);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject: "HomeX — Verify Your Email",
      body: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:22px;font-weight:900;color:#111827;">Home<span style="color:#7c3aed;">X</span></div>
            <div style="font-size:10px;color:#9ca3af;letter-spacing:0.15em;text-transform:uppercase;">Email Verification</div>
          </div>
          <p style="font-size:14px;color:#374151;margin-bottom:8px;">Welcome to HomeX! Use the code below to verify your email address and complete your registration:</p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;background:#f3f4f6;border:2px dashed #7c3aed;border-radius:12px;padding:16px 40px;font-size:36px;font-weight:900;letter-spacing:8px;color:#7c3aed;">${otp}</div>
          </div>
          <p style="font-size:12px;color:#6b7280;text-align:center;">This code expires in 10 minutes. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="font-size:11px;color:#9ca3af;text-align:center;">If you didn't create a HomeX account, you can safely ignore this email.</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});