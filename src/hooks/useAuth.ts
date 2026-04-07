import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin as checkIsAdmin } from '@/lib/isAdmin';
import {
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutFirebase,
  hasFirebaseConfig,
  onFirebaseAuthStateChange,
  getFirebaseAuth,
  signInFirebaseUser,
  signUpFirebaseUser
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
  emailVerified: boolean;
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
    if (globalAuthState.loading) {
      if (!globalAuthState.user) {
        // Firebase onAuthStateChanged often fires a rapid `null` initially before extracting IndexedDB.
        // We must debounce dropping the loading state slightly to prevent false-positive logouts
        setTimeout(() => {
          if (!globalAuthState.user && globalAuthState.loading) {
            setGlobalState({ loading: false });
          }
        }, 800);
      } else {
        setGlobalState({ loading: false });
      }
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
    firebaseChecked = true;
    
    if (!firebaseUser) {
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

    // Check email verification status for email/password users
    if (firebaseUser.email?.includes('@gmail.com') && !firebaseUser.emailVerified) {
       // We let them through only if it's Google Auth (Google Auth is auto-verified usually)
       // or we can handle it in the UI. For now, let's keep the user object but track verification.
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

    // Important: We should resolve loading AS SOON AS session is found,
    // but try to get admin status first if it doesn't take too long.
    const adminPromise = getAdminStatus(pseudoUser.id);
    
    // Set user and admin status together if admin check is fast
    const isAdmin = await Promise.race([
      adminPromise,
      new Promise<boolean>(r => setTimeout(() => r(globalAuthState.isAdmin), 1500))
    ]);

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
    
    // If we resolved with cached admin status, update it if it changes
    const actualAdmin = await adminPromise;
    if (actualAdmin !== isAdmin) {
      setGlobalState({ isAdmin: actualAdmin });
    }
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('[useAuth] Initializing Auth...');

      // Set a timeout to prevent hanging forever - reduced to 8 seconds
      authInitTimeout = setTimeout(() => {
        console.warn('[useAuth] Auth initialization timeout - resolving to current state');
        supabaseChecked = true;
        firebaseChecked = true;
        
        if (globalAuthState.loading) {
          setGlobalState({ loading: false });
        }
      }, 8000);

      // Instantly load session from storage to bypass INITIAL_SESSION delay
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          supabaseChecked = true;
          
          const adminPromise = getAdminStatus(currentSession.user.id);
          const isAdmin = await Promise.race([
            adminPromise,
            new Promise<boolean>(r => setTimeout(() => r(globalAuthState.isAdmin), 1500))
          ]);

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

          const actualAdmin = await adminPromise;
          if (actualAdmin !== isAdmin) setGlobalState({ isAdmin: actualAdmin });
        }
      } catch (e) {
        console.error("Error fetching explicit session", e);
      }

      // Handle visibility change - prevent session loss when switching tabs
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
          console.log('[useAuth] Page became visible, checking session...');
          try {
            // Use a short-lived promise race to prevent hanging the UI thread
            const sessionData = await Promise.race([
              supabase.auth.getSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Session fetch timeout')), 2000))
            ]) as any;

            const session = sessionData?.data?.session;
            if (session?.user && !globalAuthState.user) {
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
          } catch (e) {
            console.warn("[useAuth] Visibility session check timed out or failed - keeping current state", e);
          }
        }
      };


      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Subscribe to Supabase auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[useAuth] Supabase Auth Event:', event, session?.user?.id);

        if (event === 'INITIAL_SESSION') {
          supabaseChecked = true;
          if (authInitTimeout && (session?.user || !hasFirebaseConfig)) {
            clearTimeout(authInitTimeout);
            authInitTimeout = null;
          }

          if (session?.user) {
            setGlobalState({
              user: session.user,
              session,
              loading: false,
              error: null,
              isFirebaseUser: false,
            });
            
            const isAdmin = await getAdminStatus(session.user.id);
            if (isAdmin) setGlobalState({ isAdmin: true });
            return;
          }
          
          checkAndResolveLoading();
        }

        if (event === 'SIGNED_OUT') {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.user) {
            console.log('[useAuth] Ignoring false SIGNED_OUT event');
            return;
          }

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
          setGlobalState({
            user: session.user,
            session,
            loading: false,
            error: null,
            isFirebaseUser: false,
          });
          
          if (authInitTimeout) {
            clearTimeout(authInitTimeout);
            authInitTimeout = null;
          }
          
          const isAdmin = await getAdminStatus(session.user.id);
          if (isAdmin) setGlobalState({ isAdmin: true });
        }
      });

      // Check for saved Firebase user
      if (hasFirebaseConfig) {
        const firebaseCheckTimeout = setTimeout(() => {
          if (!firebaseChecked) {
            console.warn('[useAuth] Firebase auth check timeout');
            firebaseChecked = true;
            checkAndResolveLoading();
          }
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
                emailVerified: auth.currentUser.emailVerified,
              });
            }
          }
        } finally {
          // Note: we don't clear firebaseCheckTimeout here because onFirebaseAuthStateChange 
          // is the one that really confirms the final state
        }

        onFirebaseAuthStateChange(async (firebaseUser) => {
          console.log('[useAuth] Firebase Auth Event:', firebaseUser?.uid);
          await handleFirebaseUser(firebaseUser ? {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          } : null);
          
          clearTimeout(firebaseCheckTimeout);
        });
      } else {
        if (!supabaseChecked) {
          try {
            const { data: { session } } = await (supabase.auth as any).getSession();
            supabaseChecked = true;
            if (session?.user) {
              setGlobalState({
                user: session.user,
                session,
                loading: false,
                isFirebaseUser: false,
              });
              getAdminStatus(session.user.id).then(isAdmin => {
                if (isAdmin) setGlobalState({ isAdmin: true });
              });
            } else {
              setGlobalState({ loading: false });
            }
          } catch (e) {
            supabaseChecked = true;
            setGlobalState({ loading: false });
          }
        } else {
          setGlobalState({ loading: false });
        }
      }
    } catch (err: any) {
      console.error('[useAuth] Auth Init Error:', err);
      setGlobalState({ loading: false, error: err });
    }
  };

  const signIn = async (email: string, password: string) => {
    // Try Firebase First (New System)
    const { user: fUser, error: fError } = await signInFirebaseUser(email, password);
    if (!fError && fUser) {
      return { data: { user: globalAuthState.user, session: null }, error: null };
    }
    
    // Fallback to Supabase for existing users
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Switch completely to Firebase for new signups due to Supabase limits
    const { user, error } = await signUpFirebaseUser(email, password, fullName || email.split('@')[0]);
    if (error) return { data: { user: null, session: null }, error };
    return { data: { user: null, session: null }, error: null }; // Success but needs verification
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
