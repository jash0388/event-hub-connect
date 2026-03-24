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
  isAdmin: false,
  loading: true,
  error: null,
  isFirebaseUser: false,
  firebaseUser: null,
};

// Timeout for auth initialization to prevent hanging
const AUTH_INIT_TIMEOUT = 10000; // 10 seconds

let globalListeners: ((state: AuthState) => void)[] = [];
let isAuthInitialized = false;
let authInitTimeout: ReturnType<typeof setTimeout> | null = null;

const notifyListeners = () => {
  globalListeners.forEach(listener => listener(globalAuthState));
};

const setGlobalState = (newState: Partial<AuthState>) => {
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
    const now = Date.now();
    if (adminCache?.userId === userId && (now - adminCache.timestamp) < ADMIN_CACHE_DURATION) {
      return adminCache.isAdmin;
    }
    try {
      const adminStatus = await checkIsAdmin(userId);
      adminCache = { userId, isAdmin: adminStatus, timestamp: now };
      return adminStatus;
    } catch {
      return false;
    }
  };

  const handleFirebaseUser = useCallback(async (firebaseUser: FirebaseUserData | null) => {
    if (!firebaseUser) {
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
      return;
    }

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
        setGlobalState({ loading: false, error: new Error('Auth initialization timeout') });
      }, AUTH_INIT_TIMEOUT);

      // Subscribe to Supabase auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[useAuth] Supabase Auth Event:', event, session?.user?.id);

        // Handle initial session
        if (event === 'INITIAL_SESSION') {
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
          } else {
            // No session - set loading to false to allow app to proceed
            console.log('[useAuth] No initial session, setting loading to false');
            setGlobalState({ loading: false });
          }
          // Clear the timeout since we got a response
          if (authInitTimeout) {
            clearTimeout(authInitTimeout);
            authInitTimeout = null;
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
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
          setGlobalState({ loading: false });
        }, 5000);

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
        // No Firebase config - ensure loading is set to false
        setGlobalState({ loading: false });
      }
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
    await supabase.auth.signOut();

    if (hasFirebaseConfig) {
      await signOutFirebase();
    }

    adminCache = null;
    saveFirebaseUser(null);
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
