import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin as checkIsAdmin } from '@/lib/isAdmin';
import {
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutFirebase,
  hasFirebaseConfig,
  onFirebaseAuthStateChange,
  getFirebaseAuth
} from '@/integrations/firebase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
  isFirebaseUser: boolean;
  firebaseUser?: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
}

// Global cache for admin status
let adminCache: { userId: string; isAdmin: boolean; timestamp: number } | null = null;
const ADMIN_CACHE_DURATION = 5 * 60 * 1000;

// Firebase auth state storage
const FIREBASE_AUTH_KEY = 'firebase-auth-state';

interface FirebaseUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const saveFirebaseUser = (user: FirebaseUserData | null) => {
  if (user) {
    localStorage.setItem(FIREBASE_AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(FIREBASE_AUTH_KEY);
  }
};

const getSavedFirebaseUser = (): FirebaseUserData | null => {
  const saved = localStorage.getItem(FIREBASE_AUTH_KEY);
  return saved ? JSON.parse(saved) : null;
};

let globalAuthState: AuthState = {
  user: null,
  session: null,
  isAdmin: localStorage.getItem('is-admin') === 'true',
  loading: true,
  error: null,
  isFirebaseUser: false,
  firebaseUser: null,
};

// Timeout for auth initialization to prevent hanging
const AUTH_INIT_TIMEOUT = 15000; // 15 seconds

let globalListeners: ((state: AuthState) => void)[] = [];
let isAuthInitialized = false;
let authInitTimeout: ReturnType<typeof setTimeout> | null = null;
let supabaseChecked = false;
let firebaseChecked = false;

const checkAndResolveLoading = () => {
  if (supabaseChecked && (!hasFirebaseConfig || firebaseChecked)) {
    if (!globalAuthState.user) {
      // Firebase onAuthStateChanged often fires a rapid `null` initially before extracting IndexedDB.
      // We must debounce dropping the loading state to prevent false-positive logouts!
      setTimeout(() => {
        if (!globalAuthState.user) {
          setGlobalState({ loading: false });
        }
      }, 1500);
    }
  }
};

const notifyListeners = () => {
  globalListeners.forEach(listener => listener(globalAuthState));
};

const setGlobalState = (newState: Partial<AuthState>) => {
  if (newState.isAdmin !== undefined) {
    localStorage.setItem('is-admin', String(newState.isAdmin));
  }
  globalAuthState = { ...globalAuthState, ...newState };
  notifyListeners();
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(globalAuthState);

  useEffect(() => {
    const listener = (newState: AuthState) => {
      setState(newState);
    };
    globalListeners.push(listener);
    setState(globalAuthState);

    if (!isAuthInitialized) {
      isAuthInitialized = true;
      initializeAuth();
    }

    return () => {
      globalListeners = globalListeners.filter(l => l !== listener);
    };
  }, []);

  const getAdminStatus = async (userId: string) => {
    try {
      // Always get fresh admin status - no caching for now to debug issues
      const adminStatus = await checkIsAdmin(userId, true);
      return adminStatus;
    } catch {
      return false;
    }
  };

  const handleFirebaseUser = useCallback(async (firebaseUser: FirebaseUserData | null) => {
    if (!firebaseUser) {
      firebaseChecked = true;
      if (globalAuthState.isFirebaseUser || !globalAuthState.user) {
        setGlobalState({
          user: null,
          session: null,
          isAdmin: false,
          error: null,
          isFirebaseUser: false,
          firebaseUser: null
        });
      }
      checkAndResolveLoading();
      saveFirebaseUser(null);
      return;
    }

    firebaseChecked = true;
    const pseudoUser = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'google', provider_id: 'firebase' },
      user_metadata: {
        full_name: firebaseUser.displayName,
        avatar_url: firebaseUser.photoURL
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    const isAdmin = await getAdminStatus(pseudoUser.id);

    setGlobalState({
      user: pseudoUser,
      session: null,
      isAdmin,
      loading: false,
      error: null,
      isFirebaseUser: true,
      firebaseUser: firebaseUser,
    });
    saveFirebaseUser(firebaseUser);
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('[useAuth] Initializing Auth...');

      // Set a timeout to prevent hanging forever
      authInitTimeout = setTimeout(() => {
        console.warn('[useAuth] Auth initialization timeout - resolving to unauthenticated state');
        supabaseChecked = true;
        firebaseChecked = true;
        checkAndResolveLoading();
      }, AUTH_INIT_TIMEOUT);

      // Instantly load session from storage to bypass INITIAL_SESSION delay
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          supabaseChecked = true;
          const isAdmin = await getAdminStatus(currentSession.user.id);
          setGlobalState({
            user: currentSession.user,
            session: currentSession,
            isAdmin,
            loading: false,
            error: null,
            isFirebaseUser: false,
          });
          if (authInitTimeout) {
            clearTimeout(authInitTimeout);
            authInitTimeout = null;
          }
        }
      } catch (e) {
        console.error("Error fetching explicit session", e);
      }

      // Handle visibility change - prevent session loss when switching tabs
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
          // Re-check session when page becomes visible again
          console.log('[useAuth] Page became visible, checking session...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && !globalAuthState.user) {
            // Session exists but not in state - restore it
            const isAdmin = await getAdminStatus(session.user.id);
            setGlobalState({
              user: session.user,
              session,
              isAdmin,
              loading: false,
              error: null,
              isFirebaseUser: false,
            });
          }
        }
      };

      // Add visibility change listener to prevent session issues when switching tabs
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Subscribe to Supabase auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[useAuth] Supabase Auth Event:', event, session?.user?.id);

        // Handle initial session
        if (event === 'INITIAL_SESSION') {
          supabaseChecked = true;
          // Clear the timeout since we got a response
          if (authInitTimeout) {
            clearTimeout(authInitTimeout);
            authInitTimeout = null;
          }

          if (session?.user) {
            const isAdmin = await getAdminStatus(session.user.id);
            setGlobalState({
              user: session.user,
              session,
              isAdmin,
              loading: false,
              error: null,
              isFirebaseUser: false,
            });
            return;
          }
          
          // No user found via Supabase yet, check if we can resolve loading
          checkAndResolveLoading();
        }

        if (event === 'SIGNED_OUT') {
          // Check if this might be a false positive due to tab switching
          // by re-checking the session before clearing state
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.user) {
            // Session actually exists - don't sign out
            console.log('[useAuth] Ignoring false SIGNED_OUT event, session still valid');
            return;
          }

          // Actual sign out
          adminCache = null;
          if (hasFirebaseConfig) {
            await signOutFirebase();
          }
          setGlobalState({
            user: null,
            session: null,
            isAdmin: false,
            loading: false,
            error: null,
            isFirebaseUser: false,
            firebaseUser: null
          });
          saveFirebaseUser(null);
        } else if (session?.user) {
          const isAdmin = await getAdminStatus(session.user.id);
          setGlobalState({
            user: session.user,
            session,
            isAdmin,
            loading: false,
            error: null,
            isFirebaseUser: false,
          });
          // Clear the timeout since we got a response
          if (authInitTimeout) {
            clearTimeout(authInitTimeout);
            authInitTimeout = null;
          }
        }
      });

      // Check for saved Firebase user
      if (hasFirebaseConfig) {
        // Set a shorter timeout for Firebase check
        const firebaseTimeout = setTimeout(() => {
          console.warn('[useAuth] Firebase auth check timeout');
          firebaseChecked = true;
          checkAndResolveLoading();
        }, 15000);

        try {
          const savedFirebaseUser = getSavedFirebaseUser();
          if (savedFirebaseUser) {
            await handleFirebaseUser(savedFirebaseUser);
          } else {
            const auth = getFirebaseAuth();
            if (auth?.currentUser) {
              await handleFirebaseUser({
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
                photoURL: auth.currentUser.photoURL,
              });
            }
          }
        } finally {
          clearTimeout(firebaseTimeout);
        }

        // Subscribe to Firebase auth changes (non-blocking)
        onFirebaseAuthStateChange(async (firebaseUser) => {
          console.log('[useAuth] Firebase Auth Event:', firebaseUser?.uid);
          if (firebaseUser) {
            await handleFirebaseUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          }
        });
      } else {
        // No Firebase config - explicitly check supabase one last time to avoid hanging
        if (!supabaseChecked) {
          const { data: { session } } = await (supabase.auth as any).getSession();
          supabaseChecked = true;
          if (session?.user) {
            getAdminStatus(session.user.id).then(isAdmin => {
              setGlobalState({
                user: session.user,
                session,
                isAdmin,
                loading: false,
                isFirebaseUser: false,
              });
            });
          } else {
            setGlobalState({ loading: false });
          }
        } else {
          setGlobalState({ loading: false });
        }
      }
    } catch (err: any) {
      console.error('[useAuth] Auth Init Error:', err);
      // Ensure we don't get stuck in loading state on critical failure
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
    await supabase.auth.signOut();

    if (hasFirebaseConfig) {
      await signOutFirebase();
    }

    adminCache = null;
    saveFirebaseUser(null);
    localStorage.removeItem('admin_access_code');
    setGlobalState({
      user: null,
      session: null,
      isAdmin: false,
      loading: false,
      error: null,
      isFirebaseUser: false,
      firebaseUser: null
    });
    return { error: null };
  };

  const signInWithGoogle = async () => {
    if (!hasFirebaseConfig) {
      return { error: new Error('Firebase is not configured') };
    }
    return await firebaseSignInWithGoogle();
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    hasFirebaseConfig
  };
}
