import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAdmin, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/admin/dashboard';
  const unauthorized = location.state?.unauthorized;

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate(from, { replace: true });
    }
  }, [user, isAdmin, loading, navigate, from]);

  useEffect(() => {
    if (unauthorized) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin area.",
        variant: "destructive",
      });
    }
  }, [unauthorized, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Show success message
      toast({
        title: "Login Successful",
        description: "Verifying admin access...",
      });

      // Wait a moment for auth state to update, then check admin status
      setTimeout(async () => {
        // Re-check if user is admin after successful login
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          toast({
            title: "Error",
            description: "Authentication failed. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Check admin status
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);

        if (roleError) {
          toast({
            title: "Error",
            description: "Unable to verify your permissions. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const hasAdminRole = roleData?.some(({ role }) => role === 'admin');

        if (hasAdminRole) {
          // Navigate to dashboard
          navigate(from, { replace: true });
        } else {
          toast({
            title: "Access Denied",
            description: "You don't have admin permissions.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(to bottom, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)'
    }}>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 relative z-10 pt-20 pb-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/40">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-xl flex items-center justify-center shadow-md shadow-blue-100/50">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Login</h1>
                <p className="text-gray-500 text-sm">Datanauts</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 rounded-xl bg-gray-50/80 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 rounded-xl bg-gray-50/80 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <p className="text-center text-gray-400 text-xs mt-5 sm:mt-6">
              Admin access is required to manage events.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLogin;
