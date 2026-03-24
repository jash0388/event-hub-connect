import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a user has admin role
 * Checks user_roles table first, then profiles table
 * 
 * @param userId - The user ID to check
 * @param forceRefresh - If true, bypasses any caching to get fresh data (default: true for debug)
 */
// Admin email addresses - add your email here to get admin access
const ADMIN_EMAILS = [
  'jashwanthsingh0707@gmail.com', // Add your email here
  'admin@example.com',
];

export async function isAdmin(userId?: string, forceRefresh: boolean = true): Promise<boolean> {
  try {
    let targetUserId = userId;
    let userEmail = '';

    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;
      targetUserId = user.id;
      userEmail = user.email || '';
    }

    // Check if user email is in admin list
    if (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      console.log('[isAdmin] User is admin by email whitelist:', targetUserId, userEmail);
      return true;
    }

    // If no email yet, try to get from profiles table
    if (!userEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', targetUserId)
        .single();

      if (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase())) {
        console.log('[isAdmin] User is admin by email from profile:', targetUserId, profile.email);
        return true;
      }
    }

    // First check user_roles table with timeout
    const rolePromise = supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId);

    const roleTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const roleResult = await Promise.race([rolePromise, roleTimeout]) as any;

    if (roleResult && !roleResult.error && roleResult.data?.some((entry: any) => entry.role === 'admin')) {
      console.log('[isAdmin] User has admin role in user_roles:', targetUserId);
      return true;
    }

    // Also check profiles table for is_admin flag
    const profilePromise = supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', targetUserId)
      .single();

    const profileTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const profileResult = await Promise.race([profilePromise, profileTimeout]) as any;

    if (profileResult && !profileResult.error && profileResult.data?.is_admin === true) {
      console.log('[isAdmin] User has is_admin flag in profiles:', targetUserId);
      return true;
    }

    console.log('[isAdmin] User is NOT admin:', targetUserId);
    return false;
  } catch (error) {
    console.error('Error in isAdmin check:', error);
    return false;
  }
}

/**
 * Check if a specific user has a given role
 */
export async function hasRole(userId: string, role: 'admin' | 'moderator' | 'user'): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking role:', error);
      return false;
    }

    return data?.some((entry) => entry.role === role) ?? false;
  } catch (error) {
    console.error('Error in hasRole check:', error);
    return false;
  }
}
