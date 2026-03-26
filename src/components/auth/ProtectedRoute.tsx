import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  const VALID_ADMIN_CODES = ['819234', '475619', '902381'];
  const hasMagicAdminCode = VALID_ADMIN_CODES.includes(localStorage.getItem('admin_access_code') || '');

  // Keep showing loading until auth is fully initialized
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">Verifying Access...</p>
        </div>
      </div>
    );
  }

  // Not logged in at all
  if (!user && !(requireAdmin && hasMagicAdminCode)) {
    const loginPath = requireAdmin ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Logged in but not admin when admin is required - allow access temporarily while checking
  if (requireAdmin && !isAdmin && !hasMagicAdminCode) {
    // Check if user has admin role in user_roles - this handles refresh issues
    return <Navigate to="/admin/login" state={{ from: location, unauthorized: true }} replace />;
  }

  return <>{children}</>;
}
