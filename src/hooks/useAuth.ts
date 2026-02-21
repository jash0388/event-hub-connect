import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin as checkIsAdmin } from '@/lib/isAdmin';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
}

// Cache for admin status to avoid repeated DB queries
let adminCache: { userId: string; isAdmin: boolean; timestamp: number } | null = null;
const ADMIN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
  });

  // Check admin status with caching
  const checkAdminStatus = useCallback(async (user: User | null) => {
    if (!user) return false;

    // Check cache first
    const now = Date.now();
    if (adminCache && adminCache.userId === user.id && (now - adminCache.timestamp) < ADMIN_CACHE_DURATION) {
      return adminCache.isAdmin;
    }

    try {
      const adminStatus = await checkIsAdmin();
      // Update cache
      adminCache = { userId: user.id, isAdmin: adminStatus, timestamp: now };
      return adminStatus;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Initialize auth state - don't await, let it set loading first
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        const user = session?.user ?? null;
        const adminStatus = await checkAdminStatus(user);

        if (!isMounted) return;

        setState({
          user,
          session,
          isAdmin: adminStatus,
          loading: false,
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
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
      isMounted = false;
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
      // Clear admin cache on logout
      adminCache = null;
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
