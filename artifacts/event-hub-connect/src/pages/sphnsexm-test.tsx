import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { gradeExam } from "@/lib/gemini";
import {
  Shield, AlertCircle, Eye, EyeOff, Mail, Lock, ArrowLeft, RefreshCw,
  LogOut, Activity, Target, ShieldAlert, Award, FileText, Clock, PlayCircle, History, AlertTriangle,
  CheckCircle2, BrainCircuit, XCircle, ChevronLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// ==========================================
// 1. AUTH VIEW (Exact Replit UI)
// ==========================================
function AuthView({ onAuthSuccess }: any) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onAuthSuccess();
      } else {
        if (!email.toLowerCase().endsWith("@gmail.com")) {
          throw new Error("Only @gmail.com accounts are permitted.");
        }
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({ title: "Account created", description: "You are now signed in." });
        onAuthSuccess();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Authentication Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary rounded-full blur-[150px] opacity-[0.04]" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="credentials"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm z-10"
        >
          <Card className="border-border bg-card/90 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-3 pb-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">ExamPortal</CardTitle>
                <CardDescription className="text-muted-foreground mt-1 text-sm">
                  Secure Academic Assessment
                </CardDescription>
              </div>

              <div className="flex rounded-lg border border-border bg-muted/30 p-1 gap-1">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${
                      mode === m
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleAuth} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-background focus:ring-primary/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 bg-background focus:ring-primary/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : mode === "signin" ? "Sign In" : "Continue"}
                </Button>
              </form>

              <div className="relative mt-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 mt-4 bg-card border-border hover:bg-muted/30"
                onClick={async () => {
                  setIsLoading(true);
                  const { error } = await signInWithGoogle();
                  setIsLoading(false);
                  if (error) { toast({ variant: "destructive", title: "Google Sign-In failed", description: error.message }); } else { onAuthSuccess(); }
                }}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border mt-6">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Only <span className="text-foreground font-medium">@gmail.com</span> accounts allowed. Please use your official email.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// 2. DASHBOARD VIEW (Exact Replit UI)
// ==========================================
function DashboardView({ exams, submissions, onStartExam, onLogout, user }: any) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
  };

  const stats = {
    totalAttempts: submissions.length,
    averageScore: submissions.length > 0 ? submissions.reduce((a:any, b:any) => a + (b.score/b.total_marks)*100, 0) / submissions.length : 0,
    highestScore: submissions.length > 0 ? Math.max(...submissions.map((s:any) => s.score/s.total_marks*100)) : 0,
    totalViolations: submissions.reduce((a:any, b:any) => a + (b.violations || b.violations_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <span className="font-semibold tracking-tight text-sm sm:text-base">ExamPortal</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block truncate max-w-[200px]">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-foreground shrink-0 px-2 sm:px-3">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Disconnect</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 mt-6 sm:mt-8">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 sm:space-y-10">
          
          <motion.div variants={item}>
            <h2 className="text-base sm:text-xl font-medium tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Telemetry
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between text-muted-foreground mb-3">
                    <span className="text-xs sm:text-sm font-medium">Exams Taken</span>
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">{stats.totalAttempts}</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between text-muted-foreground mb-3">
                    <span className="text-xs sm:text-sm font-medium">Avg. Score</span>
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {stats.totalAttempts > 0 ? `${Math.round(stats.averageScore)}%` : '--'}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between text-muted-foreground mb-3">
                    <span className="text-xs sm:text-sm font-medium">High Score</span>
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary">
                    {stats.totalAttempts > 0 ? `${Math.round(stats.highestScore)}%` : '--'}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-destructive/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-destructive/10 rounded-bl-full pointer-events-none" />
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between text-destructive/80 mb-3">
                    <span className="text-xs sm:text-sm font-medium">Violations</span>
                    <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-destructive">{stats.totalViolations}</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <motion.div variants={item} className="lg:col-span-2 space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-xl font-medium tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Active Deployments
              </h2>
              {exams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {exams.map((exam: any) => {
                    const isCompleted = submissions.some((s: any) => s.exam_id === exam.id);
                    return (
                    <Card key={exam.id} className={`bg-card transition-colors border-border flex flex-col group relative overflow-hidden ${isCompleted ? 'opacity-60 saturate-50' : 'hover:bg-card/80'}`}>
                      <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${isCompleted ? 'bg-muted' : 'bg-primary/40 group-hover:bg-primary'}`} />
                      <CardHeader className="pb-3 pl-5">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-xs uppercase tracking-wider font-mono bg-background">
                            Assessment
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground font-mono">
                            <Clock className="w-3 h-3 mr-1" />
                            {exam.duration_minutes}m
                          </div>
                        </div>
                        <CardTitle className="text-base sm:text-lg leading-tight">{exam.title}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">
                          {exam.description || 'No description provided.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3 mt-auto pl-5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">
                            Marks: <span className="text-foreground font-medium">100</span>
                          </span>
                          <span className="text-muted-foreground flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1 text-destructive/70" />
                            {exam.max_violations || 2} violations
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="pl-5">
                        <Button 
                          className={`w-full text-sm ${isCompleted ? 'bg-muted text-muted-foreground border-transparent cursor-not-allowed' : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20'}`}
                          onClick={() => !isCompleted && onStartExam(exam)}
                          disabled={isCompleted}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Initialize Exam
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  )})}
                </div>
              ) : (
                <Card className="bg-background border-dashed border-border/50">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Shield className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No active deployments available.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            <motion.div variants={item} className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-xl font-medium tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Attempt Log
              </h2>
              <Card className="bg-card/50 border-border">
                <ScrollArea className="h-[320px] sm:h-[400px]">
                  {submissions.length > 0 ? (
                    <div className="divide-y divide-border/50">
                      {submissions.map((attempt: any) => (
                        <div key={attempt.id} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <div className="min-w-0">
                              <p className="font-medium text-sm leading-tight mb-1 truncate">{attempt.exam_title || attempt.exams?.title}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {format(new Date(attempt.created_at), 'MMM d, yyyy HH:mm')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-primary text-sm">
                                {Math.round((attempt.score / (attempt.total_marks || 1)) * 100)}%
                              </span>
                            </div>
                          </div>
                          {(attempt.violations || attempt.violations_count || 0) > 0 && (
                            <div className="flex items-center text-[10px] text-destructive uppercase font-mono tracking-wider mt-1">
                              <ShieldAlert className="w-3 h-3 mr-1" />
                              {attempt.violations || attempt.violations_count} violations
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No logs found.
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// ==========================================
// 3. EXAM TAKING VIEW (Exact Replit UI)
// ==========================================
function ExamTakingView({ exam, questions, onSubmit, user }: any) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [breachOverlay, setBreachOverlay] = useState(false);
  const [timeLeft, setTimeLeft] = useState((exam?.duration_minutes || 60) * 60);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [violationCount, setViolationCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processSubmit = useCallback((auto = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsProcessing(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
    onSubmit(answers, auto, violationCount, (exam?.duration_minutes || 60) * 60 - timeLeft);
  }, [answers, violationCount, timeLeft, exam, onSubmit]);

  useEffect(() => {
    if (timeLeft <= 0 || breachOverlay) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); processSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, breachOverlay, processSubmit]);

  useEffect(() => {
    const handleSecurityBreach = () => {
      if (breachOverlay) return;
      setBreachOverlay(true);
      const newViolationCount = violationCount + 1;
      setViolationCount(newViolationCount);
      
      if (newViolationCount >= (exam.max_violations || 2)) {
        processSubmit(true);
      } else {
        setTimeout(() => {
          setBreachOverlay(false);
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
          }
        }, 3000);
      }
    };

    const onFullscreenChange = () => {
      if (isSubmittingRef.current) return;
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) handleSecurityBreach();
    };
    const onVisibilityChange = () => { if (!isSubmittingRef.current && document.visibilityState === 'hidden') handleSecurityBreach(); };
    const onBlur = () => { if (!isSubmittingRef.current) handleSecurityBreach(); };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [breachOverlay, violationCount, exam, processSubmit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isFullscreen && !breachOverlay) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight mb-2">Fullscreen Required</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This assessment requires fullscreen mode. Exiting fullscreen or switching tabs will log a security violation.
            </p>
          </div>
          <Button size="lg" className="w-full h-12" onClick={handleEnterFullscreen}>
             Enter Fullscreen & Begin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col cursor-default select-none">
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
          >
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">Analyzing Responses</h1>
            <p className="text-muted-foreground">Evaluating your answers and enforcing security heuristics...</p>
          </motion.div>
        )}
        {breachOverlay && !isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-destructive flex flex-col items-center justify-center text-destructive-foreground p-6 text-center"
          >
            <ShieldAlert className="w-16 h-16 sm:w-24 sm:h-24 mb-6 animate-pulse" />
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-3">INTEGRITY BREACH</h1>
            <p className="text-base sm:text-xl opacity-90 max-w-md font-mono">
              Unauthorized window activity detected. Violation logged.
            </p>
            <div className="mt-8 text-base font-mono opacity-70">
              Violations: {violationCount} / {exam.max_violations || 2}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-card border-b border-border/50 select-none">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 sm:hidden">
          <span className="font-bold text-sm truncate max-w-[55%]">{exam.title}</span>
          <div className="flex items-center gap-1 text-destructive font-mono text-xs font-bold bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
            <ShieldAlert className="w-3 h-3" />
            {violationCount}/{exam.max_violations || 2}
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-3 sm:hidden">
          <div className="flex items-center gap-1.5 font-mono font-bold text-lg tracking-wider">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className={timeLeft < 300 ? "text-destructive animate-pulse" : "text-primary"}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold text-xs" onClick={() => processSubmit(false)}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> SUBMIT
          </Button>
        </div>

        <div className="hidden sm:flex items-center justify-between py-3 px-6">
          <div className="flex items-center gap-4 min-w-0">
            <span className="font-bold tracking-tight text-base truncate max-w-xs">{exam.title}</span>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-destructive font-mono text-sm font-bold bg-destructive/10 px-3 py-1 rounded border border-destructive/20 shrink-0">
              <ShieldAlert className="w-4 h-4" />
              VIOLATIONS: {violationCount}/{exam.max_violations || 2}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xl font-mono font-bold tracking-wider">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className={timeLeft < 300 ? "text-destructive animate-pulse" : "text-primary"}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => processSubmit(false)}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> SUBMIT EXAM
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-10 pb-24">
        {questions.map((q: any, idx: number) => (
          <div key={q.id} className="space-y-4">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center text-xs sm:text-sm font-bold font-mono border border-border mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-4 min-w-0">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="text-base sm:text-lg font-medium leading-relaxed">{q.question}</h3>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded border border-border shrink-0">
                    {q.marks} pts
                  </span>
                </div>

                {(() => {
                  const isMcq = q.question_type?.toLowerCase() === 'mcq' || (Array.isArray(q.options) && q.options.length > 0 && q.options[0] !== "");
                  return isMcq ? (
                  <RadioGroup 
                    className="space-y-2 mt-3" 
                    value={answers[q.id] || ""} 
                    onValueChange={(val) => setAnswers(p => ({ ...p, [q.id]: val }))}
                  >
                    {(Array.isArray(q.options) ? q.options : []).map((opt: string, i: number) => (
                      <div 
                        key={i} 
                        className="flex items-center space-x-3 bg-card p-3 sm:p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors cursor-pointer" 
                        onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))}
                      >
                        <RadioGroupItem value={opt} id={`q${q.id}-opt${i}`} />
                        <Label htmlFor={`q${q.id}-opt${i}`} className="flex-1 text-sm sm:text-base cursor-pointer font-normal leading-relaxed">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  ) : (
                  <Textarea 
                    className="min-h-[160px] sm:min-h-[200px] mt-3 bg-card border-border/50 focus-visible:ring-primary text-sm sm:text-base leading-relaxed font-sans resize-y"
                    placeholder="Enter your answer here or write code..."
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  />
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

// ==========================================
// 4. RESULTS VIEW (Exact Replit UI)
// ==========================================
function ResultsView({ result, onBack }: any) {
  const percentage = Math.round((result.score / result.total) * 100);
  const isPass = percentage >= 50;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground -ml-2 px-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="text-sm">Dashboard</span>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary opacity-50" />
            <span className="font-medium text-xs sm:text-sm text-muted-foreground">Analysis Report</span>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 mt-6 sm:mt-8">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
          <div className="text-center space-y-2 mb-8 sm:mb-12">
            <motion.div variants={item} className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-card border border-border shadow-2xl mb-4 relative">
              <div className={`absolute inset-0 rounded-full border-4 ${isPass ? 'border-primary' : 'border-destructive'} opacity-20`} />
              <span className="text-2xl sm:text-3xl font-bold">{percentage}%</span>
            </motion.div>
            <motion.h1 variants={item} className="text-xl sm:text-3xl font-bold tracking-tight px-4">
              {result.title}
            </motion.h1>
            <motion.p variants={item} className="text-muted-foreground font-mono text-xs sm:text-sm uppercase tracking-wider">
              Status:{" "}
              {result.violations >= 2 ? <span className="text-destructive font-bold">SECURITY BREACH</span> : isPass ? <span className="text-primary font-bold">PASSED</span> : <span className="text-destructive font-bold">FAILED</span>}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <motion.div variants={item}>
              <Card className="bg-card border-border">
                <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Final Score</p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {Math.round(result.score)} <span className="text-sm sm:text-lg text-muted-foreground font-normal">/ {result.total} pts</span>
                    </p>
                  </div>
                  <Award className={`w-7 h-7 sm:w-8 sm:h-8 ${isPass ? 'text-primary' : 'text-muted-foreground'}`} />
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={item}>
              <Card className={`bg-card ${result.violations > 0 ? 'border-destructive/30' : 'border-border'}`}>
                <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Security Violations</p>
                    <p className={`text-xl sm:text-2xl font-bold ${result.violations > 0 ? 'text-destructive' : 'text-primary'}`}>{result.violations}</p>
                  </div>
                  {result.violations > 0 ? <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-destructive opacity-80" /> : <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-primary opacity-80" />}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {result.breakdown && (
            <motion.div variants={item} className="space-y-4 sm:space-y-6">
              <h2 className="text-base sm:text-xl font-medium tracking-tight flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Evaluation Breakdown
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {result.breakdown.map((b: any, i: number) => (
                  <Card key={i} className="bg-card/50 border-border overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="flex gap-3 sm:gap-4">
                        <div className="flex flex-col items-center gap-2 pt-0.5 shrink-0">
                          {b.score > 0 ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 bg-background">Q{i + 1}</Badge>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Question</p>
                                <p className="text-sm font-medium leading-relaxed">{b.question || "Unknown Question"}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Your Answer</p>
                                  <div className={`p-2 rounded border text-xs sm:text-sm ${b.score > 0 ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-destructive/5 border-destructive/20 text-destructive'}`}>
                                    {b.user_answer || <span className="italic opacity-50">No answer provided</span>}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Correct Answer</p>
                                  <div className="p-2 rounded border bg-muted/40 border-border text-xs sm:text-sm text-foreground">
                                    {b.correct_answer || <span className="italic opacity-50">N/A</span>}
                                  </div>
                                </div>
                              </div>
                              {b.feedback && b.feedback !== "PASSED" && b.feedback !== "FAILED" && b.feedback !== "GRADE_OK" && (
                                <div className="bg-background/50 p-2 sm:p-3 rounded border border-border/50 mt-2">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">AI Context & Feedback</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{b.feedback}</p>
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-bold text-xs bg-muted px-2 py-1 rounded border border-border shrink-0">{b.score} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

// ==========================================
// MAIN CONTROLLER
// ==========================================
export default function SphnsExmTest() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  
  const [phase, setPhase] = useState<"auth" | "dashboard" | "exam" | "results" | "error">("auth");
  const [insertErrorData, setInsertErrorData] = useState<string>("");
  const [exams, setExams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedEx, setSelectedEx] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [evalResult, setEvalResult] = useState<any>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          setPhase("dashboard");
          fetchData();
        }
      } else {
        hasInitializedRef.current = false;
        setPhase("auth");
      }
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    const [eRes, sRes] = await Promise.all([
      supabase.from("exams").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("exam_submissions").select("*, exams(title)").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);
    if (eRes.data) setExams(eRes.data);
    if (sRes.data) setSubmissions(sRes.data);
  };

  const handleStartExam = async (ex: any) => {
    const { data: qData } = await (supabaseAdmin || supabase).from("exam_questions").select("*").eq("exam_id", ex.id).order("sort_order", { ascending: true });
    if (qData) {
      setQuestions(shuffleArray(qData.map(q => ({ ...q, options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []) }))));
      setSelectedEx(ex);
      setPhase("exam");
    }
  };

  const handleSubmitExam = async (answers: Record<number, string>, auto: boolean, violations: number, timeTakenSeconds: number) => {
    let score = 0; let total = 0; const results: any[] = []; const aiItems: any[] = [];
    questions.forEach((q, i) => {
      total += q.marks; 
      const ans = (answers[q.id] || "").trim(); 
      const cor = (q.correct_answer || "").trim();
      const isMcq = q.question_type?.toLowerCase() === 'mcq' || (Array.isArray(q.options) && q.options.length > 0 && q.options[0] !== "");
      
      if (isMcq) {
        const match = cor.toLowerCase().split("|").some((a: string) => a.trim() === ans.toLowerCase());
        const s = match ? q.marks : 0; score += s;
        // Map to exact index for breakdown UI alignment
        results[i] = { question: q.question, user_answer: ans, correct_answer: cor, score: s, max: q.marks, feedback: s > 0 ? "PASSED" : "FAILED" };
      } else {
        // Only use AI if NO correct_answer matches perfectly first
        // If they provided a correct answer and no options, standard regex first
        if (cor && cor.toLowerCase() === ans.toLowerCase()) {
           score += q.marks;
           results[i] = { question: q.question, user_answer: ans, correct_answer: cor, score: q.marks, max: q.marks, feedback: "GRADE_OK" };
        } else {
           aiItems.push({ question: q.question, correctAnswer: cor, userAnswer: ans, maxMarks: q.marks, arrayIndex: i });
        }
      }
    });

    try {
      if (aiItems.length > 0) {
        toast({ title: "Grading Exam...", description: "AI is verifying qualitative answers." });
        const aiResults = await gradeExam(aiItems);
        aiItems.forEach((item, idx) => { 
          const r = aiResults[idx]; const s = r?.score || 0; score += s; 
          results[item.arrayIndex] = { question: item.question, user_answer: item.userAnswer, correct_answer: item.correctAnswer, score: s, max: item.maxMarks, feedback: r?.feedback || "GRADE_OK" }; 
        });
      }
      
      // Filter out any undefined slots just in case
      const compactResults = results.filter(Boolean);
      // Execute Supabase Insert with strict 10s timeout to prevent infinite hang on network drops
      const insertPromise = supabase.from("exam_submissions").insert({
        exam_id: selectedEx?.id,
        user_id: user?.id,
        student_name: `${user?.email?.split('@')[0] || "Student"} (${user?.email})`,
        roll_number: "Unknown",
        score,
        total_marks: total,
        time_used_seconds: timeTakenSeconds,
        status: auto ? "auto_submitted" : "completed",
        answers: { ...answers, _breakdown: compactResults },
        violations: violations,
        violations_count: violations,
        exam_title: selectedEx?.title
      });

      const { data: _data, error: insertErr } = await Promise.race([
        insertPromise,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Database connection timed out during submission. Please try again.")), 10000))
      ]);
      
      if (insertErr) {
        console.error("Insertion error: ", insertErr);
        setInsertErrorData(JSON.stringify(insertErr, null, 2));
        setPhase("error");
        return;
      }
      
      setEvalResult({ score, total, violations, title: selectedEx?.title, breakdown: compactResults });
      setPhase("results");
      fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: e.message });
      setPhase("dashboard");
    }
  };

  const handleLogout = async () => {
    setPhase("auth");
    await signOut();
    window.location.reload();
  };

  if (authLoading) return <div className="min-h-screen bg-background" />;

  return (
    <>
      {phase === "auth" && <AuthView onAuthSuccess={() => setPhase("dashboard")} />}
      {phase === "dashboard" && <DashboardView exams={exams} submissions={submissions} onStartExam={handleStartExam} onLogout={handleLogout} user={user} />}
      {phase === "exam" && <ExamTakingView exam={selectedEx} questions={questions} onSubmit={handleSubmitExam} user={user} />}
      {phase === "results" && <ResultsView result={evalResult} onBack={() => { setEvalResult(null); setPhase("dashboard"); }} />}
      {phase === "error" && (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
          <div className="bg-destructive/10 text-destructive p-8 rounded-lg max-w-2xl w-full font-mono whitespace-pre-wrap break-words shadow-xl border border-destructive/30">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              DATABASE INSERTION ERROR
            </h2>
            <p>Please screenshot this and show it to the AI:</p>
            <div className="mt-4 p-4 bg-background border border-destructive/20 rounded shadow-inner text-sm text-foreground overflow-auto">
              {insertErrorData}
            </div>
            <Button className="mt-6" onClick={() => setPhase("dashboard")}>Return to Dashboard</Button>
          </div>
        </div>
      )}
    </>
  );
}

