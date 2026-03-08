import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading, error } = useAuth();
  const location = useLocation();
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Fallback for loading state that hangs
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setIsTimedOut(true);
        console.warn('[ProtectedRoute] Loading timeout exceeded. Showing error UI.');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading spinner during initial auth check
  if (loading && !isTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-foreground font-medium text-lg">Verifying access...</p>
            <p className="text-muted-foreground font-mono text-xs">Securing your session</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error UI if loading hangs or reported an error
  if (isTimedOut || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Connection Issue</h2>
            <p className="text-muted-foreground text-sm">
              {error?.message || "Verification took longer than expected. This can happen on slow networks or if the security configuration is incomplete."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Retry Connection
            </button>
            <a
              href={requireAdmin ? "/admin/login" : "/login"}
              className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-delay"
            >
              Go to Login Page
            </a>
          </div>
          {!requireAdmin && (
            <p className="text-[10px] text-muted-foreground pt-4">
              Tip: Check if your VITE_SUPABASE_URL and KEY are correctly set in the dashboard.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Redirect to appropriate login page if not authenticated
  if (!user) {
    const loginPath = requireAdmin ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check admin privileges if required
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location, unauthorized: true }} replace />;
  }

  return <>{children}</>;
}
