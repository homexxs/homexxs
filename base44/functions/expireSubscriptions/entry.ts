import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no user) and manual admin invocation
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user?.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const now = new Date().toISOString();

    // Fetch all users with active subscriptions that have an expiry date
    const allUsers = await base44.asServiceRole.entities.User.list("-created_date", 500);

    const expired = allUsers.filter(u =>
      u.subscription_status === "active" &&
      u.subscription_expires_at &&
      u.subscription_expires_at < now
    );

    let expiredCount = 0;
    for (const u of expired) {
      await base44.asServiceRole.entities.User.update(u.id, {
        subscription_status: "inactive",
      });

      // Notify the user
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: u.email,
        title: "Subscription Expired",
        message: "Your HomeX subscription has expired. Please renew to continue enjoying full access.",
        type: "general",
        related_id: u.id,
      });

      expiredCount++;
    }

    console.log(`[expireSubscriptions] Checked ${allUsers.length} users. Expired: ${expiredCount}.`);
    return Response.json({ success: true, checked: allUsers.length, expired: expiredCount });
  } catch (error) {
    console.error("[expireSubscriptions] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});