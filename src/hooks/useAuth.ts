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

// Global cache for auth state to prevent redundant fetches and race conditions
let globalAuthState: AuthState = {
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  error: null,
};
let globalListeners: ((state: AuthState) => void)[] = [];
let isAuthInitialized = false;

// Notify all listeners of state changes
const notifyListeners = () => {
  globalListeners.forEach(listener => listener(globalAuthState));
};

// Update global state and notify listeners
const setGlobalState = (newState: Partial<AuthState>) => {
  globalAuthState = { ...globalAuthState, ...newState };
  notifyListeners();
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(globalAuthState);

  useEffect(() => {
    // Add this component's state setter to the global listeners
    const listener = (newState: AuthState) => {
      setState(newState);
    };
    globalListeners.push(listener);

    // Sync current state immediately
    setState(globalAuthState);

    // Initialize auth only once globally
    if (!isAuthInitialized) {
      isAuthInitialized = true;
      initializeAuth();
    }

    return () => {
      // Remove listener on unmount
      globalListeners = globalListeners.filter(l => l !== listener);
    };
  }, []);

  const getAdminStatus = async (user: User | null) => {
    if (!user) return false;
    const now = Date.now();
    if (adminCache?.userId === user.id && (now - adminCache.timestamp) < ADMIN_CACHE_DURATION) {
      return adminCache.isAdmin;
    }
    try {
      const adminStatus = await checkIsAdmin(user.id);
      adminCache = { userId: user.id, isAdmin: adminStatus, timestamp: now };
      return adminStatus;
    } catch {
      return false;
    }
  };

  const initializeAuth = async () => {
    // Safety timeout
    const timeout = setTimeout(() => {
      if (globalAuthState.loading) {
        console.warn('[useAuth] Initialization timed out after 5s. Forcing loading false.');
        setGlobalState({ loading: false });
      }
    }, 5000);

    try {
      console.log('[useAuth] Initializing...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[useAuth] getSession error:', error);
        throw error;
      }

      const user = session?.user ?? null;
      const isAdmin = await getAdminStatus(user);

      console.log('[useAuth] Init success, user:', user?.email, 'isAdmin:', isAdmin);
      setGlobalState({
        user,
        session,
        isAdmin,
        loading: false,
        error: null,
      });

      // Set up subscription only once
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[useAuth] Auth state change:', event, session?.user?.email);
        
        // Ignore TOKEN_REFRESHED unless session was previously null (edge case)
        if (event === 'TOKEN_REFRESHED' && globalAuthState.session) return;

        const user = session?.user ?? null;

        if (event === 'SIGNED_OUT') {
          adminCache = null;
          setGlobalState({ user: null, session: null, isAdmin: false, loading: false, error: null });
        } else {
          // Keep loading true while checking admin status to prevent flicker/redirect
          if (!user) {
             setGlobalState({ user: null, session: null, isAdmin: false, loading: false, error: null });
          } else {
             // If user changed, re-check admin status
             const isAdmin = await getAdminStatus(user);
             setGlobalState({
               user,
               session,
               isAdmin,
               loading: false,
               error: null
             });
          }
        }
      });

    } catch (err: any) {
      console.error('[useAuth] Init Error:', err);
      setGlobalState({ loading: false, error: err });
    } finally {
      clearTimeout(timeout);
    }
  };

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
      setGlobalState({ user: null, session: null, isAdmin: false, loading: false, error: null });
    }
    return { error };
  };

  return { ...state, signIn, signUp, signOut };
}
