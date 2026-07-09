import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AppUser {
  rollNumber: string;
  fullName: string;
  email: string;
  isAdmin: boolean;
  isMainAdmin: boolean;
}

interface StoredSession {
  token: string;
  expiresAt: string;
  user: AppUser;
}

interface SendOtpResult {
  success: boolean;
  message?: string;
  error?: string;
  needsRegistration?: boolean;
}

interface VerifyOtpResult {
  success: boolean;
  error?: string;
}

interface AuthState {
  isLoggedIn: boolean;
  loading: boolean;
  user: AppUser | null;
  token: string | null;
  sendOTP: (rollNumber: string, email?: string, fullName?: string) => Promise<SendOtpResult>;
  verifyOTP: (rollNumber: string, otp: string) => Promise<VerifyOtpResult>;
  logout: () => void;
}

const STORAGE_KEY = "dn_auth_session";

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  loading: true,
  user: null,
  token: null,
  sendOTP: async () => ({ success: false }),
  verifyOTP: async () => ({ success: false }),
  logout: () => {},
});

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadSession();
    if (!stored) {
      setLoading(false);
      return;
    }
    // Re-validate against the server so a revoked/expired session doesn't stay "logged in".
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSession({ token: stored.token, expiresAt: data.user.expiresAt ?? stored.expiresAt, user: data.user });
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
        }
      })
      .catch(() => {
        // Network hiccup: keep the locally cached session until next check.
        setSession(stored);
      })
      .finally(() => setLoading(false));
  }, []);

  const sendOTP = useCallback(async (rollNumber: string, email?: string, fullName?: string) => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber, email, fullName }),
      });
      const data = await res.json();
      return {
        success: !!data.success,
        message: data.message,
        error: data.error,
        needsRegistration: !!data.needsRegistration,
      };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const verifyOTP = useCallback(async (rollNumber: string, otp: string) => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber, otp }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error || "Incorrect OTP." };
      }
      const next: StoredSession = { token: data.token, expiresAt: data.expiresAt, user: data.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSession(next);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const logout = useCallback(() => {
    const current = session;
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    if (current?.token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${current.token}` },
      }).catch(() => {});
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!session,
        loading,
        user: session?.user ?? null,
        token: session?.token ?? null,
        sendOTP,
        verifyOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  return useContext(AuthContext);
}
