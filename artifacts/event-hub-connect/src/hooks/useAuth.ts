// Compatibility shim: the app used to have a dual Supabase+Firebase auth hook.
// It now wraps the roll-number + email-OTP AuthContext, but keeps the same
// shape (`user.id`, `user.email`, `user.user_metadata.full_name`, `isAdmin`,
// `signOut`, etc.) so existing pages that call `useAuth()` keep working.
import { useAppAuth } from "@/context/AuthContext";

export interface ShimUser {
  id: string;
  email: string;
  user_metadata: { full_name: string };
}

export function useAuth() {
  const { user, loading, isLoggedIn, logout, token } = useAppAuth();

  const shimUser: ShimUser | null = user
    ? {
        id: user.rollNumber,
        email: user.email,
        user_metadata: { full_name: user.fullName },
      }
    : null;

  return {
    user: shimUser,
    isAdmin: !!user?.isAdmin,
    isMainAdmin: !!user?.isMainAdmin,
    rollNumber: user?.rollNumber ?? null,
    fullName: user?.fullName ?? null,
    token,
    loading,
    isLoggedIn,
    error: null as string | null,
    // Legacy Firebase/Supabase-password auth is gone; login now happens via
    // roll number + email OTP on the /login page.
    isFirebaseUser: false,
    firebaseUser: null,
    hasFirebaseConfig: false,
    signIn: async () => ({ error: new Error("Use the roll number + OTP login page.") }),
    signUp: async () => ({ error: new Error("Use the roll number + OTP login page.") }),
    signInWithGoogle: async () => ({ error: new Error("Google sign-in has been removed.") }),
    signOut: async () => {
      logout();
    },
  };
}
