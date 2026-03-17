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
const AUTH_STORAGE_KEY = 'sb-auth-state-cache';
const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
const initialUser = savedAuth ? JSON.parse(savedAuth) : null;

let globalAuthState: AuthState = {
  user: initialUser,
  session: null,
  isAdmin: false,
  loading: true, // Start as loading to allow session recovery, but we have initialUser for UI
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
  if (globalAuthState.user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(globalAuthState.user));
  } else if (newState.user === null) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  notifyListeners();
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(globalAuthState);

  useEffect(() => {
    const listener = (newState: AuthState) => {
      setState(newState);
    };
    globalListeners.push(listener);
    
    // Sync current state immediately
    setState(globalAuthState);

    if (!isAuthInitialized) {
      isAuthInitialized = true;
      initializeAuth();
    }

    return () => {
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
    try {
      console.log('[useAuth] Initializing Auth with Session Recovery...');
      
      // 1. Get current session immediately
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      const isAdmin = await getAdminStatus(user);
      
      setGlobalState({
        user,
        session,
        isAdmin,
        loading: false,
        error: null,
      });

      // 2. Subscribe to auth changes for login/logout/token refresh
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[useAuth] Auth Event:', event, session?.user?.email);
        
        const user = session?.user ?? null;

        if (event === 'SIGNED_OUT') {
          adminCache = null;
          setGlobalState({ user: null, session: null, isAdmin: false, loading: false, error: null });
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || (event === 'TOKEN_REFRESHED' && !globalAuthState.user)) {
          const isAdmin = await getAdminStatus(user);
          setGlobalState({
            user,
            session,
            isAdmin,
            loading: false,
            error: null
          });
        }
      });

    } catch (err: any) {
      console.error('[useAuth] Auth Init Error:', err);
      setGlobalState({ loading: false, error: err });
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
