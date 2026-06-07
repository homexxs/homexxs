import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, full_name, phone, address } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if client already exists in the database
    const existing = await base44.asServiceRole.entities.Client.filter({ email }).catch(() => []);
    if (existing.length > 0) {
      return Response.json({ message: 'Client already exists' });
    }

    // Create client record in the Admin/HR database
    const client = await base44.asServiceRole.entities.Client.create({
      email,
      full_name: full_name || email.split('@')[0],
      phone: phone || '',
      address: address || '',
      status: 'active',
      source: 'self_registration',
      registered_at: new Date().toISOString(),
    });

    return Response.json({ success: true, client });
  } catch (error) {
    // Log but don't fail if Client entity doesn't exist yet
    if (error.message?.includes('not found')) {
      return Response.json({ message: 'Client sync not available yet' });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});