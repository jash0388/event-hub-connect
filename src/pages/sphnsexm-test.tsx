import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useExamSecurity, Violation } from "@/hooks/useExamSecurity";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import {
  Shield, AlertTriangle, Clock, Send, ChevronLeft, ChevronRight, X,
  CheckCircle2, Loader2, Lock, Maximize, Flag,
  BookOpen, FileText, CircleDot, Square, CheckSquare,
  TriangleAlert, ShieldAlert, ShieldOff, Monitor, Zap, ClipboardList,
  ArrowLeft, User, Hash, Users, Bot, Mail, Eye, EyeOff, GraduationCap
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { gradeExam } from "@/lib/gemini";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { signInWithGoogle, hasFirebaseConfig, resendVerificationEmail } from "@/integrations/firebase/client";

// ============================================================
// TYPES & UTILS
// ============================================================
interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  question_type: 'mcq' | 'paragraph' | 'code';
  correct_answer: string | null;
  marks: number;
  sort_order: number;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  max_violations: number;
  is_active: boolean;
  created_at: string;
}

const normalizeAnswer = (text: string) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[;.,]/g, '')
    .replace(/['"`]/g, '')
    .trim();
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// AUTH COMPONENT (Simplified UserAuth)
// ============================================================
function AuthView({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isResending, setIsResending] = useState(false);

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

  const { toast } = useToast();
  const { user, firebaseUser, signIn, signUp } = useAuth();

  useEffect(() => {
    const checkRegistration = async () => {
      if (user && !showRegistration) {
        const adminClient = supabaseAdmin || supabase;
        const { data, error } = await adminClient
          .from('user_registrations')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!data) {
          setRegisteredUser({
            uid: user.id,
            email: user.email,
            displayName: firebaseUser?.displayName || user.email?.split('@')[0] || 'User'
          });
          setShowRegistration(true);
        } else {
          onAuthSuccess();
        }
      }
    };
    checkRegistration();
  }, [user, showRegistration, onAuthSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        
        // Handle verification for Firebase email/pass users
        const resultUser = data?.user;
        const resultFirebaseUser = (data as any)?.firebaseUser;
        if (!resultUser && resultFirebaseUser && !resultFirebaseUser.emailVerified) {
          setIsVerificationSent(true);
          setIsLoading(false);
          return;
        }
      } else {
        if (!email.toLowerCase().endsWith('@gmail.com')) {
          toast({ title: "Access Restricted", description: "Use @gmail.com to register.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) throw error;
        setIsVerificationSent(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { user: gUser, error } = await signInWithGoogle();
      if (error) throw error;
      if (gUser) {
        const adminClient = supabaseAdmin || supabase;
        await adminClient.from('profiles').upsert({
          id: gUser.uid,
          email: gUser.email || '',
          full_name: gUser.displayName || 'Google User',
          firebase_uid: gUser.uid,
          is_firebase_user: true,
          updated_at: new Date().toISOString()
        });

        const { data: existingReg } = await adminClient
          .from('user_registrations')
          .select('*')
          .eq('user_id', gUser.uid)
          .single();

        if (!existingReg) {
          setRegisteredUser(gUser);
          setShowRegistration(true);
        } else {
          onAuthSuccess();
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      if (!registeredUser) return;
      const adminClient = supabaseAdmin || supabase;
      const { error } = await adminClient.from('user_registrations').insert({
        user_id: registeredUser.uid,
        email: registeredUser.email || '',
        full_name: registeredUser.displayName || 'User',
        ...registrationData,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      setShowRegistration(false);
      onAuthSuccess();
    } catch (error: any) {
      toast({ title: "Registration Error", description: error.message, variant: "destructive" });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6 relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[32px] border border-white/5 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">SPHN <span className="text-indigo-400">EXAMS</span></h1>
            <p className="text-slate-400 text-sm font-medium">Exam Portal</p>
          </div>

          {isVerificationSent ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/30">
                <Mail className="w-10 h-10 text-indigo-400" />
              </div>
              <p className="text-white font-bold">Check your Gmail for the link.</p>
              <Button onClick={() => setIsVerificationSent(false)} className="w-full bg-white text-slate-950 font-black">BACK TO LOGIN</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-14 bg-black/40 border-white/5 rounded-2xl focus:border-indigo-500/50 text-white font-mono"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-14 bg-black/40 border-white/5 rounded-2xl focus:border-indigo-500/50 text-white font-mono"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-14 rounded-2xl bg-white text-slate-950 font-black uppercase tracking-widest" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "LOGIN" : "SIGN UP"}
              </Button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.4em]"><span className="bg-[#0f172a] px-4 text-slate-500">OR CONTINUE WITH</span></div>
              </div>

              <Button type="button" variant="outline" onClick={handleGoogleSignIn} className="w-full h-14 rounded-2xl border-white/5 bg-white/5 text-white hover:bg-white/10" disabled={isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIGN IN WITH GOOGLE"}
              </Button>

              <div className="text-center mt-6">
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-300">
                  {isLogin ? "NEW? CREATE ACCOUNT" : "HAVE ACCOUNT? LOGIN"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
        <DialogContent className="bg-slate-900 border-white/5 text-white rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="font-black tracking-widest uppercase">Registration</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold">Please enter your details to complete setup.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegistrationSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <select
                value={registrationData.year}
                onChange={(e) => setRegistrationData({ ...registrationData, year: e.target.value })}
                className="w-full h-12 px-4 bg-black/40 border border-white/5 rounded-xl text-white outline-none focus:border-indigo-500/50"
                required
              >
                <option value="" className="bg-slate-900">YEAR</option>
                <option value="1st Year" className="bg-slate-900">1st Year</option>
                <option value="2nd Year" className="bg-slate-900">2nd Year</option>
                <option value="3rd Year" className="bg-slate-900">3rd Year</option>
                <option value="4th Year" className="bg-slate-900">4th Year</option>
                <option value="5th Year" className="bg-slate-900">5th Year</option>
              </select>
              <Input placeholder="SECTION" value={registrationData.section} onChange={(e) => setRegistrationData({ ...registrationData, section: e.target.value })} className="bg-black/40 border-white/5 rounded-xl h-12" required />
            </div>
            <Input placeholder="DEPARTMENT" value={registrationData.department} onChange={(e) => setRegistrationData({ ...registrationData, department: e.target.value })} className="bg-black/40 border-white/5 rounded-xl h-12" required />
            <Input placeholder="COLLEGE" value={registrationData.college} onChange={(e) => setRegistrationData({ ...registrationData, college: e.target.value })} className="bg-black/40 border-white/5 rounded-xl h-12" required />
            <Input placeholder="PHONE" value={registrationData.phone} onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })} className="bg-black/40 border-white/5 rounded-xl h-12" required />
            <Button type="submit" className="w-full h-14 rounded-xl bg-white text-slate-950 font-black" disabled={isRegistering}>
              {isRegistering ? "REGISTERING..." : "COMPLETE REGISTRATION"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// EXAM COMPONENTS (Selection, Form, Violation, Screens)
// ============================================================
function TestSelectionView({ exams, loading, onSelect, completedIds, completedTitles }: any) {
  return (
    <div className="min-h-screen bg-slate-950 px-8 py-16 relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="container mx-auto max-w-6xl relative z-10">
        <header className="mb-16">
          <Badge className="bg-indigo-500/10 text-indigo-400 uppercase tracking-widest mb-6">ALL EXAMS ACTIVE</Badge>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-4">Available <br /><span className="text-indigo-400">Exams</span></h2>
          <p className="text-slate-400 max-w-xl font-medium">Select an exam to begin. Your session will start shortly.</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /><p className="text-slate-500 font-black text-xs uppercase tracking-widest">Accessing Secure Repository...</p></div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-[48px] border border-white/5"><ShieldOff className="w-16 h-16 text-slate-700 mx-auto mb-6" /><h3 className="text-2xl font-black text-white">NO CHANNELS FOUND</h3></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {exams.map((ex: Exam) => {
              const isDone = completedIds.has(ex.id) || completedTitles.has(ex.title.trim().toLowerCase());
              return (
                <button
                  key={ex.id}
                  disabled={isDone}
                  onClick={() => onSelect(ex)}
                  className={`group relative p-8 rounded-[40px] text-left transition-all ${isDone ? 'bg-slate-900/40 opacity-50 cursor-not-allowed' : 'bg-slate-900/90 border border-white/5 hover:border-indigo-500/50 hover:bg-slate-900/60'}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border ${isDone ? 'bg-slate-800 border-white/5' : 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={isDone ? "bg-slate-800" : "bg-emerald-500/10 text-emerald-400"}>{isDone ? "FINALIZED" : "READY"}</Badge>
                    <span className="text-slate-500 text-[10px] font-black uppercase ml-auto">{ex.duration_minutes} MINS</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 group-hover:text-indigo-400 transition-colors">{ex.title}</h3>
                  <p className="text-slate-500 text-sm font-medium line-clamp-2">{ex.description || "Secure assessment protocol."}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentInfoFormView({ exam, onStart }: any) {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [agree, setAgree] = useState(false);
  const canStart = name.trim().length >= 2 && roll.trim().length >= 1 && agree;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[48px] overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-2xl">
        <div className="md:w-1/2 p-12 bg-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-800 opacity-90" />
          <div className="relative z-10 text-white">
            <Shield className="w-12 h-12 mb-8" />
            <h1 className="text-3xl font-black uppercase tracking-widest mb-4">Security Protocol</h1>
            <h2 className="text-xl font-bold mb-8 text-indigo-100">{exam.title}</h2>
            <div className="space-y-4">
              {["Timed mission active", "Neural link focus required", `Threshold: ${exam.max_violations} alerts`].map((txt, i) => (
                <div key={i} className="flex gap-3 text-xs font-black uppercase tracking-widest"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {txt}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 p-12 flex flex-col justify-center bg-slate-900">
          <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em] mb-8">IDENTITY VERIFICATION</h3>
          <div className="space-y-6 mb-10">
            <Input placeholder="FULL NAME" value={name} onChange={(e) => setName(e.target.value)} className="h-16 bg-black/40 border-white/5 rounded-2xl text-white font-mono" />
            <Input placeholder="IDENTIFICATION ID" value={roll} onChange={(e) => setRoll(e.target.value)} className="h-16 bg-black/40 border-white/5 rounded-2xl text-white font-mono" />
            <label className="flex items-start gap-4 cursor-pointer group" onClick={() => setAgree(!agree)}>
              <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${agree ? 'bg-indigo-500 border-indigo-500' : 'border-white/10'}`}>{agree && <CheckCircle2 className="w-4 h-4 text-white" />}</div>
              <span className="text-[10px] font-black uppercase text-slate-500 leading-tight">I acknowledge protocol agreement.</span>
            </label>
          </div>
          <Button onClick={() => onStart(name, roll)} disabled={!canStart} className="h-16 rounded-[24px] bg-white text-slate-950 font-black uppercase tracking-widest">START EXAM</Button>
        </div>
      </div>
    </div>
  );
}

function ViolationOverlay({ show, count, max, msg, onDismiss }: any) {
  if (!show) return null;
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-xl px-4 animate-in fade-in slide-in-from-top-4">
      <div className="bg-red-950/90 backdrop-blur-2xl border-2 border-red-500/50 p-6 rounded-[32px] shadow-2xl flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400 border border-red-500/30"><ShieldAlert className="w-6 h-6" /></div>
          <div>
            <h4 className="text-red-400 font-black text-[10px] tracking-widest uppercase mb-1">SECURITY_ALERT</h4>
            <div className="text-white font-black text-xl mb-1">VIOLATION_{count}/{max}</div>
            <p className="text-slate-400 text-xs font-medium italic">"{msg}"</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function FinalResultsView({ score, total, count, totalQ, violations, time, title, breakdown, onExit }: any) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPass = pct >= 40;
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[48px] overflow-hidden max-w-5xl w-full shadow-2xl relative z-10">
        <div className={`p-16 text-center relative border-b border-white/5 ${isPass ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6 ${isPass ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-red-500 shadow-red-500/40'}`}>
            {isPass ? <CheckCircle2 className="w-10 h-10 text-white" /> : <ShieldOff className="w-10 h-10 text-white" />}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{isPass ? "EXAM FINISHED" : "EXAM COMPLETED"}</h1>
          <Badge variant="outline" className="text-slate-500 tracking-widest uppercase">{title}</Badge>
        </div>
        <div className="p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[["SCORE", `${score}/${total}`], ["PERCENTAGE", `${pct}%`], ["SECURITY ALERTS", violations.length], ["TIME TAKEN", `${Math.floor(time/60)}m ${time%60}s`]].map(([l, v], i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{l}</div>
                <div className="text-2xl font-black text-white">{v}</div>
              </div>
            ))}
          </div>
          <Button onClick={onExit} className="w-full h-16 rounded-[24px] bg-white text-slate-950 font-black uppercase tracking-widest hover:scale-[1.02] transition-transform">BACK TO HOME</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE EXPORT
// ============================================================
export default function SphnsExmTest() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'auth' | 'select' | 'info' | 'exam' | 'results'>('auth');
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completedTitles, setCompletedTitles] = useState<Set<string>>(new Set());
  const [selectedEx, setSelectedEx] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingEx, setLoadingEx] = useState(false);
  
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [isEval, setIsEval] = useState(false);
  const [res, setRes] = useState<any>(null);

  const security = useExamSecurity({
    enabled: phase === 'exam',
    maxViolations: selectedEx?.max_violations || 2,
    onMaxViolationsReached: () => { handleAutoSubmit(); },
  });

  useEffect(() => {
    if (user) setPhase('select');
  }, [user]);

  useEffect(() => {
    if (phase === 'select' && user) fetchPortal();
  }, [phase, user]);

  const fetchPortal = async () => {
    setLoadingEx(true);
    try {
      const [eRes, sRes] = await Promise.all([
        supabase.from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('exam_submissions').select('exam_id, exams(title)').eq('user_id', user?.id)
      ]);
      if (eRes.data) setExams(eRes.data);
      const ids = new Set<string>();
      const titles = new Set<string>();
      sRes.data?.forEach((s: any) => {
        ids.add(s.exam_id);
        if (s.exams?.title) titles.add(s.exams.title.trim().toLowerCase());
      });
      setCompletedIds(ids);
      setCompletedTitles(titles);
    } finally { setLoadingEx(false); }
  };

  const handleSelect = async (ex: Exam) => {
    setLoadingEx(true);
    const { data: qData } = await supabase.from('exam_questions').select('*').eq('exam_id', ex.id).order('sort_order', { ascending: true });
    if (qData) {
      setQuestions(shuffleArray(qData.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])
      }))));
      setSelectedEx(ex);
      setPhase('info');
    }
    setLoadingEx(false);
  };

  const handleStart = async (n: string, r: string) => {
    setName(n); setRoll(r);
    setTimeLeft((selectedEx?.duration_minutes || 30) * 60);
    setStartTime(Date.now());
    setPhase('exam');
    security.enterFullscreen();
  };

  useEffect(() => {
    if (phase !== 'exam') return;
    const interval = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { handleAutoSubmit(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleAutoSubmit = () => {
    if (isEval) return;
    handleSubmit(true);
  };

  const handleSubmit = async (auto = false) => {
    setIsEval(true);
    const timeUsed = Math.floor((Date.now() - startTime) / 1000);
    try {
      let score = 0; let total = 0;
      const results: any[] = [];
      const aiItems: any[] = [];

      questions.forEach((q, i) => {
        total += q.marks;
        const ans = (answers[q.id] || '').trim();
        const cor = (q.correct_answer || '').trim();

        if (q.question_type === 'mcq') {
          const match = cor.toLowerCase().split('|').some(a => a.trim() === ans.toLowerCase());
          const s = match ? q.marks : 0;
          score += s;
          results.push({ question: q.question, score: s, max: q.marks, feedback: s > 0 ? "Correct" : "Incorrect" });
        } else {
          aiItems.push({ question: q.question, correctAnswer: cor, userAnswer: ans, maxMarks: q.marks, i });
        }
      });

      if (aiItems.length > 0) {
        const aiResults = await gradeExam(aiItems);
        aiItems.forEach((item, idx) => {
          const r = aiResults[idx];
          const s = r?.score || 0;
          score += s;
          results.push({ question: item.question, score: s, max: item.maxMarks, feedback: r?.feedback || "Eval done" });
        });
      }

      await supabase.from('exam_submissions').insert({
        exam_id: selectedEx?.id,
        user_id: user?.id,
        student_name: `${name} (${user?.email})`,
        roll_number: roll,
        score, total_marks: total,
        time_used_seconds: timeUsed,
        status: auto ? 'auto_submitted' : 'completed',
        exam_title: selectedEx?.title,
        answers: { ...answers, _breakdown: results }
      });

      setRes({ score, total, count: Object.keys(answers).length, totalQ: questions.length, violations: security.violations, time: timeUsed, title: selectedEx?.title, breakdown: results });
      security.exitFullscreen();
      setPhase('results');
    } catch (e) {
      toast({ title: "Submission Error", variant: "destructive" });
    } finally { setIsEval(false); }
  };

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>;

  if (phase === 'auth') return <AuthView onAuthSuccess={() => setPhase('select')} />;
  if (phase === 'select') return <TestSelectionView exams={exams} loading={loadingEx} onSelect={handleSelect} completedIds={completedIds} completedTitles={completedTitles} />;
  if (phase === 'info') return <StudentInfoFormView exam={selectedEx} onStart={handleStart} />;
  
  if (isEval) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
      <Bot className="w-16 h-16 animate-pulse text-indigo-400 mb-6" />
      <h2 className="text-2xl font-black uppercase tracking-widest mb-4">Grading in Progress</h2>
      <p className="text-slate-400 max-w-xs font-medium">Please wait while the AI is grading your answers.</p>
    </div>
  );

  if (phase === 'results') return <FinalResultsView {...res} onExit={() => window.location.reload()} />;

  // Main Exam Interface
  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden font-sans relative" onContextMenu={e => e.preventDefault()} style={{ userSelect: 'none' }}>
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <ViolationOverlay show={security.showWarning} count={security.violationCount} max={selectedEx?.max_violations || 2} msg={security.warningMessage} onDismiss={security.dismissWarning} />
      {!security.isFullscreen && <div className="fixed inset-0 z-[100000] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8"><Maximize className="w-16 h-16 text-indigo-500 mb-8 animate-pulse" /><h2 className="text-3xl font-black text-white mb-4">CONNECTION LOST</h2><p className="text-slate-400 mb-8 max-w-sm">Focus lost. Restore fullscreen mode immediately.</p><Button onClick={security.enterFullscreen} className="h-16 px-12 rounded-2xl bg-white text-slate-950 font-black">GO FULLSCREEN</Button></div>}

      <header className="h-20 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl px-10 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-4">
          <Shield className="w-6 h-6 text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <div className="flex flex-col"><span className="text-white font-black text-xs uppercase tracking-widest">{selectedEx?.title}</span><span className="text-[10px] text-slate-500 font-bold uppercase">{name}</span></div>
        </div>
        <div className={`px-6 h-12 flex items-center gap-3 rounded-full border ${timeLeft < 300 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/5 text-white'}`}>
          <Clock className="w-4 h-4" /><span className="font-mono text-xl font-black tracking-widest">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
        </div>
        <Button onClick={() => handleSubmit()} className="h-12 bg-white text-slate-950 font-black text-xs uppercase tracking-widest px-8 rounded-xl shadow-lg">FINISH EXAM</Button>
      </header>

      <main className="flex-1 overflow-hidden flex p-8 gap-8 relative z-10">
        <aside className="w-64 bg-slate-900/40 backdrop-blur-md rounded-[32px] border border-white/5 p-6 flex flex-col">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 px-1">Questions</div>
          <div className="grid grid-cols-4 gap-3 flex-1 overflow-y-auto no-scrollbar pb-6">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)} className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black border transition-all ${currentQ === i ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' : answers[questions[i].id] ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}>{i + 1}</button>
            ))}
          </div>
          <div className="pt-6 border-t border-white/5"><div className="flex justify-between text-[8px] font-black text-slate-500 mb-2"><span>PROGRESS</span><span>{Math.round((answeredCount/questions.length)*100)}%</span></div><div className="h-1.5 bg-slate-800 rounded-full overflow-hidden p-[0.5px]"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(answeredCount/questions.length)*100}%` }} /></div></div>
        </aside>

        <section className="flex-1 flex flex-col gap-8">
          <div className="flex-1 bg-slate-900/40 backdrop-blur-md rounded-[40px] border border-white/5 p-12 flex flex-col">
            <div className="flex justify-between items-center mb-10"><Badge className="bg-indigo-500/10 text-indigo-400 uppercase font-black px-3 py-1 text-[10px] tracking-widest">Question {String(currentQ+1).padStart(2,'0')}</Badge><div className="bg-white/5 px-4 h-8 rounded-lg flex items-center gap-2 border border-white/5"><span className="text-[9px] font-black text-slate-500 uppercase">Marks</span><span className="text-white font-black text-[10px]">{q.marks} Pts</span></div></div>
            <h2 className="text-3xl font-black text-white leading-tight mb-12 tracking-tight">{q.question}</h2>
            <div className="flex-1">
              {q.question_type === 'mcq' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, i) => (
                    <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))} className={`h-16 px-6 rounded-2xl border-2 text-left flex items-center gap-5 transition-all group ${answers[q.id] === opt ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-slate-800/20 border-white/5 text-slate-400 hover:border-white/20'}`}><div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black ${answers[q.id] === opt ? 'bg-indigo-500 border-white/20 text-white' : 'border-white/10 text-slate-500 group-hover:border-white/20'}`}>{String.fromCharCode(65+i)}</div><span className="font-bold text-sm tracking-tight">{opt}</span></button>
                  ))}
                </div>
              ) : (
                <textarea value={answers[q.id] || ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} className="w-full h-full bg-black/40 border-2 border-white/5 rounded-[32px] p-8 text-white font-mono focus:border-indigo-500/50 outline-none resize-none shadow-inner" placeholder="TYPE YOUR RESPONSE HERE..." />
              )}
            </div>
          </div>
          <footer className="h-20 bg-slate-900/40 backdrop-blur-md rounded-[32px] border border-white/5 px-8 flex items-center justify-between">
            <button onClick={() => setCurrentQ(p => Math.max(0, p-1))} disabled={currentQ === 0} className="h-12 px-6 rounded-2xl border border-white/10 text-slate-500 hover:text-white disabled:opacity-20 uppercase font-black text-[10px] tracking-widest">PREVIOUS</button>
            <div className="h-2 w-48 bg-slate-800 rounded-full overflow-hidden p-[0.5px]"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${((currentQ+1)/questions.length)*100}%` }} /></div>
            <button onClick={() => currentQ === questions.length - 1 ? handleSubmit() : setCurrentQ(p => p+1)} className="h-12 px-10 rounded-2xl bg-indigo-500 text-white uppercase font-black text-[10px] tracking-widest hover:bg-indigo-400 hover:scale-105 transition-all">{currentQ === questions.length - 1 ? "FINISH" : "NEXT"}</button>
          </footer>
        </section>
      </main>
    </div>
  );
}
