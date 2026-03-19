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

let globalListeners: ((state: AuthState) => void)[] = [];
let isAuthInitialized = false;

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

    // Create a pseudo-user object for Firebase user
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

      // 1. Check Supabase session first
      const { data: { session } } = await supabase.auth.getSession();

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
      } else if (hasFirebaseConfig) {
        // 2. Check saved Firebase user
        const savedFirebaseUser = getSavedFirebaseUser();
        if (savedFirebaseUser) {
          await handleFirebaseUser(savedFirebaseUser);
        } else {
          // 3. Check current Firebase auth state
          const auth = getFirebaseAuth();
          if (auth?.currentUser) {
            await handleFirebaseUser({
              uid: auth.currentUser.uid,
              email: auth.currentUser.email,
              displayName: auth.currentUser.displayName,
              photoURL: auth.currentUser.photoURL,
            });
          } else {
            setGlobalState({ loading: false });
          }
        }
      } else {
        setGlobalState({ loading: false });
      }

      // 4. Subscribe to Supabase auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[useAuth] Supabase Auth Event:', event);

        if (event === 'SIGNED_OUT') {
          adminCache = null;
          // Also sign out from Firebase
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
        }
      });

      // 5. Subscribe to Firebase auth changes
      if (hasFirebaseConfig) {
        const unsubscribe = onFirebaseAuthStateChange(async (firebaseUser) => {
          console.log('[useAuth] Firebase Auth Event:', firebaseUser?.uid);

          if (firebaseUser) {
            await handleFirebaseUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          } else {
            // Check if there's still a Supabase session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
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
            }
          }
        });

        // Cleanup will be handled by the component
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
