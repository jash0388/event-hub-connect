import { supabase } from "@/integrations/supabase/client";

/**
 * Check if the current user has admin role
 * Fails closed - returns false on any error
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    // Query the profiles table directly
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.role === 'admin';
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
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking role:', error);
      return false;
    }

    return data?.role === role;
  } catch (error) {
    console.error('Error in hasRole check:', error);
    return false;
  }
}
