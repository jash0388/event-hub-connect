import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase admin credentials');
}

// Admin client with service role key for privileged operations
export const supabaseAdmin = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Create a new admin user
 */
export async function createAdminUser(email: string, password?: string) {
  try {
    // Create the user in auth.users with email confirmed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true, // Always auto-confirm admin users
      user_metadata: {
        full_name: email.split('@')[0], // Default name from email
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Set admin role in user_roles table
    // First try to update, if not exists then insert
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', authData.user.id);

    // If update didn't work (no rows), insert new record
    if (roleError || roleError === null) {
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin'
        });

      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }
    }

    return { data: authData.user, error: null };
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return { data: null, error };
  }
}

/**
 * Send invite email to a user
 */
export async function sendAdminInvite(email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${window.location.origin}/admin/login`,
    });

    if (error) throw error;

    // The user will be created on invite, so we need to set their role
    // We'll do this after they accept the invite through a database trigger
    // or we can set it now if we have the user ID
    if (data.user) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: data.user.id,
          role: 'admin'
        }, {
          onConflict: 'user_id'
        });

      if (roleError) throw roleError;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error sending admin invite:', error);
    return { data: null, error };
  }
}

/**
 * Get all admin users
 */
export async function getAllAdmins() {
  try {
    // First get all admin user_roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (rolesError) throw rolesError;
    if (!userRoles || userRoles.length === 0) {
      return { data: [], error: null };
    }

    // Get user IDs
    const userIds = userRoles.map(ur => ur.user_id);

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Combine the data
    const admins = userRoles.map(role => ({
      user_id: role.user_id,
      role: role.role,
      created_at: role.created_at,
      profiles: profiles?.find(p => p.id === role.user_id) || null
    }));

    return { data: admins, error: null };
  } catch (error: any) {
    console.error('Error fetching admins:', error);
    return { data: null, error };
  }
}

/**
 * Revoke admin access (change role to 'user')
 */
export async function revokeAdminAccess(userId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'user' })
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error revoking admin access:', error);
    return { error };
  }
}

/**
 * Delete a user entirely
 */
export async function deleteAdminUser(userId: string) {
  try {
    // Delete from auth.users (cascade will handle user_roles and profiles)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    return { error };
  }
}
