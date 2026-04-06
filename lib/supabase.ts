import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function signUp(username: string, password: string, businessName: string) {
  // Convert username to valid email format
  const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = `${sanitizedUsername}@hissabwala.local`;
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
      data: {
        username: username,
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  // Create business
  const { data: businessData, error: businessError } = await supabase
    .from('businesses')
    .insert({ name: businessName })
    .select()
    .single();

  if (businessError) throw businessError;

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      business_id: businessData.id,
      role: 'owner',
      username,
    });

  if (profileError) throw profileError;

  return { user: authData.user, business: businessData };
}

export async function signIn(username: string, password: string) {
  // Use the same email format for login
  const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = `${sanitizedUsername}@hissabwala.local`;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single();

  return data;
}
