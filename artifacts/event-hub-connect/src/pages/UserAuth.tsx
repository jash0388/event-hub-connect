import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import {
  requestOTPForRollNumber,
  verifyOTPAndLogin,
  setCurrentSession,
  getCurrentSession,
  logoutRollNumberUser,
  type RollNumberStudent
} from "@/integrations/supabase/rollnumber-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

type AuthStep = "roll" | "otp" | "success";

export default function UserAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Roll Number + OTP state
  const [step, setStep] = useState<AuthStep>("roll");
  const [rollNumber, setRollNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [studentInfo, setStudentInfo] = useState<RollNumberStudent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Registration popup state
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    year: "",
    section: "",
    department: "",
    college: "",
    phone: ""
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleRequestOTP = async () => {
    if (!rollNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter your roll number",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestOTPForRollNumber(rollNumber.toUpperCase());

      if (result.success) {
        toast({
          title: "OTP Sent",
          description: result.message
        });
        setStep("otp");
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request OTP",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter all 6 digits",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOTPAndLogin(rollNumber.toUpperCase(), otpString);

      if (result.success && result.student) {
        setStudentInfo(result.student);
        setCurrentSession(result.student);

        // Upsert student info into user_registrations
        try {
          const adminClient = supabaseAdmin || supabase;
          await adminClient
            .from('user_registrations')
            .upsert({
              user_id: result.student.roll_number || result.student.id,
              email: result.student.email,
              full_name: result.student.full_name,
              created_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (e) {
          console.warn('[UserAuth] Failed to upsert registration:', e);
        }

        // Push session into global auth state so all pages recognize the user
        const { refreshAuthFromLocalStorage } = await import('@/hooks/useAuth');
        refreshAuthFromLocalStorage();

        setStep("success");
        // Redirect after 1.5 seconds
        setTimeout(() => {
          const from = (location.state as any)?.from?.pathname || "/";
          navigate(from, { replace: true });
        }, 1500);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInfo) return;

    setIsRegistering(true);
    try {
      const adminClient = supabaseAdmin || supabase;

      // Update existing registration with additional details
      const { error } = await adminClient
        .from('user_registrations')
        .upsert({
          user_id: studentInfo.id,
          email: studentInfo.email,
          full_name: studentInfo.full_name,
          phone: registrationData.phone || studentInfo.phone,
          year: registrationData.year || studentInfo.year,
          section: registrationData.section || studentInfo.section,
          department: registrationData.department || studentInfo.department,
          college: registrationData.college || studentInfo.college,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Registration Complete!",
        description: "Welcome to DataNauts HUB!"
      });

      setShowRegistration(false);
      setStep("success");

      // Redirect after 2 seconds
      setTimeout(() => {
        const from = (location.state as any)?.from?.pathname || "/";
        navigate(from, { replace: true });
      }, 2000);
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

  const handleBackToRoll = () => {
    setStep("roll");
    setOtp(["", "", "", "", "", ""]);
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

            <AnimatePresence mode="wait">
              {step === "roll" && (
                <motion.div
                  key="roll"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">Welcome Back! 👋</h2>
                    <p className="text-muted-foreground text-sm">
                      Enter your roll number to get started
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rollNumber" className="text-sm font-semibold">
                        Roll Number
                      </Label>
                      <Input
                        id="rollNumber"
                        type="text"
                        placeholder="e.g., CS21001"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === "Enter" && handleRequestOTP()}
                        className="h-12 text-lg font-semibold tracking-wide mt-2"
                      />
                    </div>

                    <Button
                      onClick={handleRequestOTP}
                      disabled={isLoading}
                      className="w-full h-12 text-base font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          Send OTP
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">Enter OTP</h2>
                    <p className="text-muted-foreground text-sm">
                      Check your email for the 6-digit code
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, index) => (
                        <Input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !digit && index > 0) {
                              const prevInput = document.getElementById(`otp-${index - 1}`);
                              prevInput?.focus();
                            }
                          }}
                          className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg"
                        />
                      ))}
                    </div>

                    <Button
                      onClick={handleVerifyOTP}
                      disabled={isLoading || otp.join("").length !== 6}
                      className="w-full h-12 text-base font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Login
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleBackToRoll}
                      className="w-full h-12"
                    >
                      Back
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center space-y-4"
                >
                  <div className="flex justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Welcome, {studentInfo?.full_name}!
                    </h2>
                    <p className="text-muted-foreground text-sm mt-2">
                      Redirecting to your dashboard...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Registration Dialog */}
      <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Help us know more about you to personalize your experience
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="year" className="text-sm font-semibold">
                Year
              </Label>
              <Input
                id="year"
                placeholder="e.g., 2021"
                value={registrationData.year}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, year: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="section" className="text-sm font-semibold">
                Section
              </Label>
              <Input
                id="section"
                placeholder="e.g., A"
                value={registrationData.section}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, section: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="department" className="text-sm font-semibold">
                Department
              </Label>
              <Input
                id="department"
                placeholder="e.g., Computer Science"
                value={registrationData.department}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, department: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="college" className="text-sm font-semibold">
                College
              </Label>
              <Input
                id="college"
                placeholder="e.g., Your College Name"
                value={registrationData.college}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, college: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="e.g., 9876543210"
                value={registrationData.phone}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, phone: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <Button
              type="submit"
              disabled={isRegistering}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
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
