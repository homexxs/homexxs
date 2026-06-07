import { supabase } from '@/api/supabaseClient';

/**
 * Drop-in replacement for getMe()
 * Returns the authenticated user merged with their public profile.
 */
export async function getMe() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  return { ...user, ...profile, email: user.email, id: user.id };
}

/**
 * Drop-in replacement for updateMe(data)
 * Updates the user's profile in the public.users table.
 */
export async function updateMe(updates) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function signInWithPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp({ email, password }) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut(redirect) {
  await supabase.auth.signOut();
  if (typeof redirect === 'string') {
    window.location.href = redirect.startsWith('/') ? redirect : `/${redirect}`;
  }
}

export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function verifyOtp({ email, otpCode }) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otpCode,
    type: 'email',
  });
  if (error) throw error;
}

export async function resendOtp(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}
