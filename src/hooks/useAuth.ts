import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin as checkIsAdmin } from '@/lib/isAdmin';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
  });

  // Check admin status - memoized to avoid recreating on each render
  const checkAdminStatus = useCallback(async (user: User | null) => {
    if (!user) return false;
    try {
      return await checkIsAdmin();
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        const adminStatus = await checkAdminStatus(user);
        setState({
          user,
          session,
          isAdmin: adminStatus,
          loading: false,
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip TOKEN_REFRESHED events to avoid unnecessary updates
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        const user = session?.user ?? null;
        const adminStatus = await checkAdminStatus(user);
        setState({
          user,
          session,
          isAdmin: adminStatus,
          loading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setState({
        user: null,
        session: null,
        isAdmin: false,
        loading: false,
      });
    }
    return { error };
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  };
}
