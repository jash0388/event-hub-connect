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
import { Shield, ArrowLeft, Loader2, Mail, Lock } from 'lucide-react';

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

      toast({
        title: "Login Successful",
        description: "Verifying admin access...",
      });

      setTimeout(async () => {
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
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 pt-28 pb-16">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          <div className="bg-card rounded-3xl p-8 border border-border card-3d animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-foreground rounded-2xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-background" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
                <p className="text-muted-foreground text-sm">DataNauts Dashboard</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-11 h-12 rounded-xl bg-secondary border-none focus-visible:ring-2 focus-visible:ring-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-11 h-12 rounded-xl bg-secondary border-none focus-visible:ring-2 focus-visible:ring-foreground"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
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

            <p className="text-center text-muted-foreground text-xs mt-6">
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
