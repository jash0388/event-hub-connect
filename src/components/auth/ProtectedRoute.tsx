import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner only for admin routes during initial auth check
  // For regular user routes, allow access while loading to prevent UI flash
  if (loading && requireAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // For non-admin protected routes (like /profile), allow access if user is logged in
  // Don't block on admin check
  if (!requireAdmin && !user && !loading) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user && !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location, unauthorized: true }} replace />;
  }

  return <>{children}</>;
}
