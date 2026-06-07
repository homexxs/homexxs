import { createClient } from 'npm:@base44/sdk@0.8.21';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRoleKey: "service" });

Deno.serve(async (req) => {
  try {
    const email = "homexxs.com@gmail.com";
    const password = "Homexxs.com2100!";

    // Register the user
    const result = await base44.auth.register({ email, password });
    console.log("Register result:", JSON.stringify(result));

    return Response.json({ success: true, message: `Account created for ${email}. Now set role to admin from Base44 dashboard > Users.` });
  } catch (error) {
    console.error('Register error:', error.message);
    return Response.json({ 
      info: "Account may already exist or registration failed.", 
      error: error.message,
      next: "Please go to Base44 Dashboard > Users, find homexxs.com@gmail.com and set role to 'admin'."
    }, { status: 200 });
  }
});