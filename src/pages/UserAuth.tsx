import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { signInWithGoogle, hasFirebaseConfig } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft, GraduationCap, BookOpen, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function UserAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Registration popup state
  const [showRegistration, setShowRegistration] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState({
    year: "",
    section: "",
    department: "",
    college: "",
    phone: ""
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted && user) {
          navigate("/", { replace: true });
        }
      } catch (error) {
        // Ignore errors during check
      }
    };

    checkUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { user, error } = await signInWithGoogle();

      if (error) {
        const errorMessage = error.message || '';
        const errorCode = (error as any).code;
        if (errorMessage.includes('popup') || errorCode === 'auth/popup-closed-by-user') {
          toast({
            title: "Sign in cancelled",
            description: "Please try again and complete the Google sign-in",
          });
          return;
        }
        throw error;
      }

      if (user) {
        // Create or update profile for Firebase user using admin client (bypasses RLS)
        const adminClient = supabaseAdmin || supabase;
        const { error: profileError } = await adminClient
          .from('profiles')
          .upsert({
            id: user.uid, // Use Firebase UID as profile ID
            email: user.email || '',
            full_name: user.displayName || user.email?.split('@')[0] || 'Google User',
            avatar_url: user.photoURL || '',
            firebase_uid: user.uid,
            is_firebase_user: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('[UserAuth] Error creating profile:', profileError);
        } else {
          console.log('[UserAuth] Profile created/updated for Firebase user');
        }

        // Check if user has already registered their details (use admin client to bypass RLS)
        const { data: existingReg, error: regCheckError } = await adminClient
          .from('user_registrations')
          .select('*')
          .eq('user_id', user.uid)
          .single();

        console.log('[UserAuth] Registration check:', { existingReg, regCheckError });

        if (!existingReg || regCheckError) {
          // Show registration popup for new users
          setRegisteredUser(user);
          setRegistrationData({
            year: "",
            section: "",
            department: "",
            college: "",
            phone: ""
          });
          setShowRegistration(true);
        } else {
          toast({ title: "Welcome back!", description: "Successfully signed in with Google" });
          navigate("/", { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive"
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle registration form submission
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    try {
      if (!registeredUser) return;

      // Use admin client to bypass RLS for Firebase users
      const adminClient = supabaseAdmin || supabase;
      const { error: regError } = await adminClient
        .from('user_registrations')
        .insert({
          user_id: registeredUser.uid,
          email: registeredUser.email || '',
          full_name: registeredUser.displayName || registeredUser.email?.split('@')[0] || 'Google User',
          year: registrationData.year,
          section: registrationData.section,
          department: registrationData.department,
          college: registrationData.college,
          phone: registrationData.phone,
          created_at: new Date().toISOString()
        });

      if (regError) {
        console.error('[UserAuth] Registration error:', regError);
        throw regError;
      }

      toast({
        title: "Registration Complete!",
        description: "Welcome to DataNauts HUB! Your account has been created."
      });
      setShowRegistration(false);
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message || "Failed to complete registration",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast({ title: "Welcome back!", description: "Login successful" });
        navigate("/", { replace: true });
      } else {
        // Sign up with Supabase - show registration popup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Create profile for new user
          const adminClient = supabaseAdmin || supabase;
          await adminClient.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: email.split('@')[0],
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

          // Show registration popup
          setRegisteredUser({ uid: data.user.id, email: email, displayName: email.split('@')[0], photoURL: null });
          setRegistrationData({
            year: "",
            section: "",
            department: "",
            college: "",
            phone: ""
          });
          setShowRegistration(true);
        } else {
          toast({ title: "Check your email!", description: "Please confirm your email to complete registration" });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 -left-20 w-[400px] h-[400px] rounded-full floating"
          style={{
            background: "radial-gradient(circle, hsl(221 83% 53% / 0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-1/4 -right-20 w-[300px] h-[300px] rounded-full floating-delayed"
          style={{
            background: "radial-gradient(circle, hsl(199 89% 48% / 0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Back to home */}
      <div className="relative z-10 p-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to home
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl p-8 border border-border card-3d animate-fade-in-up relative z-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/50 bg-background/50 shadow-inner">
                  <img 
                    src="/logo.png" 
                    alt="DataNauts" 
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
                  />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Data<span className="text-[hsl(var(--accent))]">Nauts</span>
                </span>
              </Link>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isLogin
                  ? "Sign in to manage your events"
                  : "Join our tech community today"}
              </p>
            </div>

            {/* Login - Email/Password Form (Supabase) */}
            {isLogin && (
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
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 rounded-xl bg-secondary border-none focus-visible:ring-2 focus-visible:ring-foreground"
                      required
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
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 rounded-xl bg-secondary border-none focus-visible:ring-2 focus-visible:ring-foreground"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Sign In" : "Sign Up"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Registration options - Shown when NOT logged in */}
            {!isLogin && (
              <div className="text-center py-4">
                {hasFirebaseConfig ? (
                  <>
                    <p className="text-muted-foreground text-sm mb-2">
                      Create your account quickly with Google
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No email verification needed
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Fill in your details to create an account
                  </p>
                )}
              </div>
            )}

            {/* Divider */}
            {hasFirebaseConfig && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {isLogin ? "Or continue with" : "Sign up with"}
                  </span>
                </div>
              </div>
            )}

            {/* Google Sign In - Both Login and Sign Up */}
            {hasFirebaseConfig && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl font-medium border-border hover:bg-secondary transition-all flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {isLogin ? "Continue with Google" : "Sign up with Google"}
                  </>
                )}
              </Button>
            )}

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-foreground hover:text-[hsl(var(--accent))] font-semibold transition-colors"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/admin/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Popup Dialog */}
      <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Complete Your Registration</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please provide your details to complete your account setup.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegistrationSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year" className="text-foreground">Year</Label>
                <select
                  id="year"
                  value={registrationData.year}
                  onChange={(e) => setRegistrationData({ ...registrationData, year: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-secondary border-none text-foreground"
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section" className="text-foreground">Section</Label>
                <Input
                  id="section"
                  placeholder="A, B, C..."
                  value={registrationData.section}
                  onChange={(e) => setRegistrationData({ ...registrationData, section: e.target.value })}
                  className="h-10 rounded-xl bg-secondary border-none"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="text-foreground">Department</Label>
              <Input
                id="department"
                placeholder="CSE, IT, ECE, AI/ML..."
                value={registrationData.department}
                onChange={(e) => setRegistrationData({ ...registrationData, department: e.target.value })}
                className="h-10 rounded-xl bg-secondary border-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college" className="text-foreground">College</Label>
              <Input
                id="college"
                placeholder="Your College Name"
                value={registrationData.college}
                onChange={(e) => setRegistrationData({ ...registrationData, college: e.target.value })}
                className="h-10 rounded-xl bg-secondary border-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 9876543210"
                value={registrationData.phone}
                onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })}
                className="h-10 rounded-xl bg-secondary border-none"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-medium mt-4"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
