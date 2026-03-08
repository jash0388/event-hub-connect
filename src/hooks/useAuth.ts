import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin as checkIsAdmin } from '@/lib/isAdmin';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

// Global cache for admin status
let adminCache: { userId: string; isAdmin: boolean; timestamp: number } | null = null;
const ADMIN_CACHE_DURATION = 5 * 60 * 1000;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
    error: null,
  });

  const isInitialized = useRef(false);

  const getAdminStatus = useCallback(async (user: User | null) => {
    if (!user) return false;
    const now = Date.now();
    if (adminCache?.userId === user.id && (now - adminCache.timestamp) < ADMIN_CACHE_DURATION) {
      return adminCache.isAdmin;
    }
    try {
      // Pass user.id directly to avoid redundant auth.getUser() calls
      const adminStatus = await checkIsAdmin(user.id);
      adminCache = { userId: user.id, isAdmin: adminStatus, timestamp: now };
      return adminStatus;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    let isMounted = true;

    async function initialize() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        const user = session?.user ?? null;
        const isAdmin = await getAdminStatus(user);

        if (isMounted) {
          setState({
            user,
            session,
            isAdmin,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        console.error('[useAuth] Init Error:', err);
        if (isMounted) {
          setState(prev => ({ ...prev, loading: false, error: err }));
        }
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Prevent updates if component is unmounted or if event is irrelevant
      if (!isMounted || event === 'TOKEN_REFRESHED') return;

      const user = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        adminCache = null;
        setState({ user: null, session: null, isAdmin: false, loading: false, error: null });
      } else {
        const isAdmin = await getAdminStatus(user);
        setState({
          user,
          session,
          isAdmin,
          loading: false,
          error: null
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [getAdminStatus]);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      adminCache = null;
      setState({ user: null, session: null, isAdmin: false, loading: false, error: null });
    }
    return { error };
  };

  return { ...state, signIn, signUp, signOut };
}
