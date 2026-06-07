import { createClient } from '@supabase/supabase-js';

// Uses service_role key — never expose this in frontend code
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, role } = JSON.parse(event.body);

    // Send invite email via Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role }
    });

    if (error) {
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }

    // Set their role in the users table (the trigger creates the row on signup)
    await supabase
      .from('users')
      .update({ role })
      .eq('email', email);

    // Upsert into staff_members
    await supabase
      .from('staff_members')
      .upsert({ email, portal_role: role, is_active: true }, { onConflict: 'email' });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, user_id: data.user?.id })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
