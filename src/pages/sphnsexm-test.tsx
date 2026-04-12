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
  ArrowLeft, User, Hash, Users, Bot, Mail, Eye, EyeOff, GraduationCap,
  LogOut, History, Award, Check, Sparkles, Brain
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
import { signInWithGoogle, hasFirebaseConfig, resendVerificationEmail, refreshUserStatus } from "@/integrations/firebase/client";

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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// SUB-COMPONENTS (VIEWS)
// ============================================================

function ViolationOverlay({ show, count, max, msg, onDismiss }: { show: boolean; count: number; max: number; msg: string; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200000] bg-red-600/90 backdrop-blur-xl flex items-center justify-center p-6 sm:p-12 text-center text-white font-sans">
          <div className="max-w-xl">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="w-24 h-24 sm:w-32 sm:h-32 bg-white/20 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl"><ShieldAlert className="w-12 h-12 sm:w-16 sm:h-16 text-white" /></motion.div>
            <h2 className="text-4xl sm:text-6xl font-black mb-6 uppercase tracking-tight">SECURITY ALERT</h2>
            <p className="text-lg sm:text-2xl font-bold mb-10 opacity-90 leading-relaxed uppercase tracking-wide">{msg}</p>
            <div className="bg-black/20 p-8 rounded-[32px] mb-12 border border-white/10">
              <div className="text-[10px] sm:text-[12px] font-black tracking-[0.3em] uppercase opacity-60 mb-2">INTEGRITY SCORE REDUCED</div>
              <div className="text-3xl sm:text-5xl font-black">{count} <span className="text-xl sm:text-2xl opacity-40">/ {max}</span></div>
            </div>
            <Button onClick={onDismiss} className="h-16 sm:h-20 px-12 sm:px-16 rounded-[24px] sm:rounded-[40px] bg-white text-red-600 font-black text-lg sm:text-xl uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-2xl">RESUME ASSESSMENT</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TestSelectionView({ exams, loading, onSelect, completedIds, completedTitles }: any) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 sm:p-12 font-sans overflow-y-auto no-scrollbar">
      <header className="max-w-7xl mx-auto mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div>
          <div className="text-indigo-600 font-black text-[10px] tracking-[0.4em] uppercase mb-4 flex items-center gap-3"><Monitor className="w-4 h-4" /> SECURE TESTING ENVIRONMENT</div>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight uppercase leading-[0.9]">PORTAL <span className="text-slate-300">HUB</span></h1>
        </div>
        <div className="bg-white px-8 py-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="text-right">
            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">METRICS</div>
            <div className="text-xl font-black text-slate-900 uppercase">{exams.length} ACTIVE</div>
          </div>
          <div className="h-10 w-px bg-slate-100"></div>
          <Sparkles className="w-6 h-6 text-indigo-200" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
        {loading ? Array(6).fill(0).map((_, i) => <div key={i} className="h-64 sm:h-80 bg-white rounded-[48px] animate-pulse border border-slate-50" />) : exams.map((ex: any, i: number) => {
          const isDone = completedIds.has(ex.id) || completedTitles.has(ex.title.trim().toLowerCase());
          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={ex.id} 
              onClick={() => !isDone && onSelect(ex)} 
              className={`group relative h-64 sm:h-80 rounded-[48px] p-8 sm:p-10 flex flex-col justify-between transition-all cursor-pointer ${isDone ? 'bg-slate-50 grayscale opacity-60 pointer-events-none' : 'bg-white hover:bg-slate-900 hover:scale-[1.02] active:scale-95 border border-slate-100 hover:border-slate-900 shadow-sm hover:shadow-2xl hover:shadow-indigo-200/20'}`}
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl flex items-center justify-center transition-all ${isDone ? 'bg-slate-200 text-white' : 'bg-indigo-600 text-white group-hover:bg-white group-hover:text-indigo-600'}`}>{isDone ? <CheckCircle2 className="w-7 h-7" /> : <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />}</div>
                  <Badge className={`px-4 py-1.5 rounded-full font-black text-[9px] sm:text-[10px] tracking-widest ${isDone ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-400 border-none group-hover:bg-white/10 group-hover:text-white'}`}>{ex.duration_minutes} MIN</Badge>
                </div>
                <h3 className={`text-2xl sm:text-3xl font-black uppercase leading-tight transition-colors ${isDone ? 'text-slate-400' : 'text-slate-900 group-hover:text-white'}`}>{ex.title}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-4 transition-colors ${isDone ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-500'}`}>{isDone ? 'Assessment Completed' : 'Session Ready'}</p>
              </div>
              <ChevronRight className={`w-10 h-10 transition-all ${isDone ? 'text-slate-100' : 'text-slate-100 group-hover:text-indigo-500 group-hover:translate-x-2'}`} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StudentInfoFormView({ exam, onStart }: any) {
  const [n, setN] = useState('');
  const [r, setR] = useState('');
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 sm:p-12 font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-white p-10 sm:p-20 rounded-[64px] border border-slate-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] text-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-200"><ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-white" /></div>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tight">VERIFY IDENTITY</h2>
        <div className="text-[10px] sm:text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-12">Institutional Credentials Required</div>
        <div className="space-y-6 sm:space-y-8 mb-16">
          <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left block ml-6">Student Full Name</Label><Input placeholder="EX: JOHN DOE" value={n} onChange={e => setN(e.target.value.toUpperCase())} className="h-16 sm:h-20 bg-slate-50 border-none rounded-[28px] text-center font-black text-lg sm:text-2xl text-slate-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all uppercase" /></div>
          <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left block ml-6">Registration ID / Roll No</Label><Input placeholder="EX: 24CS101" value={r} onChange={e => setR(e.target.value.toUpperCase())} className="h-16 sm:h-20 bg-slate-50 border-none rounded-[28px] text-center font-black text-lg sm:text-2xl text-slate-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all uppercase" /></div>
        </div>
        <Button onClick={() => n && r && onStart(n, r)} className="w-full h-20 sm:h-24 rounded-[32px] sm:rounded-[40px] bg-indigo-600 text-white font-black uppercase tracking-widest text-lg sm:text-xl shadow-2xl shadow-indigo-100 hover:bg-slate-950 active:scale-95 transition-all">START SECURE SESSION</Button>
      </motion.div>
    </div>
  );
}

function FinalResultsView({ score, total, violations, time, title, breakdown, onExit }: any) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 sm:p-12 font-sans overflow-y-auto no-scrollbar">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 sm:p-20 rounded-[64px] border border-slate-100 shadow-sm text-center mb-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600"></div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50 rounded-[40px] flex items-center justify-center mx-auto mb-10 text-indigo-600"><CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" /></div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-2 uppercase tracking-tight">ASSESSMENT COMPLETE</h2>
          <p className="text-slate-400 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] mb-16">{title}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-10 mb-20">
            <div className="p-8 bg-slate-50 rounded-[40px] text-center">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">SCORE</div>
              <div className="text-3xl sm:text-5xl font-black text-indigo-600">{score}<span className="text-xl sm:text-2xl text-slate-300"> / {total}</span></div>
            </div>
            <div className="p-8 bg-slate-50 rounded-[40px] text-center">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">ACCURACY</div>
              <div className="text-3xl sm:text-5xl font-black text-slate-900">{Math.round((score/total)*100)}%</div>
            </div>
            <div className="p-8 bg-slate-50 rounded-[40px] text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">VIOLATIONS</div>
              <div className="text-3xl sm:text-5xl font-black text-red-500">{violations}</div>
            </div>
          </div>

          <Button onClick={onExit} className="w-full h-18 sm:h-24 rounded-[32px] sm:rounded-[40px] bg-slate-950 text-white font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all">RETURN TO TERMINAL</Button>
        </motion.div>

        {breakdown && (
          <div className="space-y-6 p-2">
            <div className="flex items-center gap-4"><div className="h-0.5 flex-1 bg-slate-100"></div><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Detailed Breakdown</span><div className="h-0.5 flex-1 bg-slate-100"></div></div>
            {breakdown.map((b: any, i: number) => (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }} key={i} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                <div className="max-w-[70%]"><div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">QUERY {i + 1}</div><h4 className="text-lg font-black text-slate-900 leading-tight uppercase line-clamp-2">{b.question}</h4></div>
                <div className={`px-5 py-3 rounded-2xl font-black text-lg ${b.score > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>+{b.score}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// AUTH COMPONENT (FIREBASE ONLY)
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
        const { data } = await adminClient.from('user_registrations').select('*').eq('user_id', user.id).single();
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
    if (user) checkRegistration();
  }, [user, showRegistration, onAuthSuccess, firebaseUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        const fUser = (data as any)?.firebaseUser;
        if (!data?.user && fUser && !fUser.emailVerified) {
          setIsVerificationSent(true);
          return;
        }
      } else {
        if (!email.toLowerCase().endsWith('@gmail.com')) {
          toast({ title: "Access Restricted", description: "Use @gmail.com to register.", variant: "destructive" });
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

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await resendVerificationEmail();
      if (error) throw error;
      toast({ title: "Email Sent", description: "A verification link has been sent to your Gmail." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const checkVerification = async () => {
    setIsLoading(true);
    const { user: refreshedUser } = await refreshUserStatus();
    if (refreshedUser?.emailVerified) {
       toast({ title: "Verified!", description: "Your email has been verified. Welcome!" });
       window.location.reload();
    } else {
       toast({ title: "Not Verified", description: "Please click the link in your email first.", variant: "destructive" });
    }
    setIsLoading(false);
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
        const { data: existingReg } = await adminClient.from('user_registrations').select('*').eq('user_id', gUser.uid).single();
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

  if (isVerificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8"><Mail className="w-10 h-10 text-indigo-600 animate-bounce" /></div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">VERIFY YOUR IDENTITY</h2>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed uppercase text-[10px] tracking-widest">A verification link has been dispatched to <span className="text-indigo-600 font-bold">{email}</span>. Please verify to activate your session.</p>
          <div className="space-y-3">
            <Button onClick={checkVerification} className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100" disabled={isLoading}>{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "I HAVE VERIFIED"}</Button>
            <Button onClick={handleResendEmail} variant="ghost" className="w-full h-12 rounded-xl text-slate-400 font-bold uppercase text-[10px] tracking-widest" disabled={isResending}>{isResending ? "SENDING..." : "RESEND VERIFICATION LINK"}</Button>
            <Button onClick={() => setIsVerificationSent(false)} variant="link" className="text-slate-300 text-[10px] font-black uppercase">Back to login</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[60%] bg-indigo-200 blur-[100px] rounded-full" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-3xl p-8 sm:p-12 rounded-[48px] sm:rounded-[64px] border border-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)]">
          <header className="text-center mb-10">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200"><Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" /></motion.div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">SPHN <span className="text-indigo-600">EXAMS</span></h1>
            <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">{isLogin ? "Authorized Assessment Portal" : "Student Registration Phase"}</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2"><Label className="text-[9px] font-black text-slate-400 ml-1 tracking-widest uppercase">EMAIL ADDRESS</Label><Input type="email" placeholder="student@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white text-slate-900 font-bold px-6 transition-all" required /></div>
            <div className="space-y-2"><Label className="text-[9px] font-black text-slate-400 ml-1 tracking-widest uppercase">SECURE PASSWORD</Label><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white text-slate-900 font-bold px-6 transition-all" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
            <Button type="submit" className="w-full h-14 sm:h-18 rounded-2xl sm:rounded-3xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all" disabled={isLoading}>{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : isLogin ? "INITIATE SESSION" : "REGISTER PROFILE"}</Button>
            <div className="relative py-4 text-center"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div><span className="relative bg-white px-4 text-[9px] font-black text-slate-300 tracking-widest uppercase">VERIFIED ACCESS ONLY</span></div>
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} className="w-full h-14 sm:h-16 rounded-2xl border-slate-100 bg-slate-50/50 text-slate-700 hover:bg-white hover:border-slate-200 font-bold flex items-center justify-center gap-3 transition-all text-[10px] sm:text-xs" disabled={isGoogleLoading}><svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg> LOGIN WITH GOOGLE</Button>
            <div className="text-center pt-2"><button type="button" onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:text-indigo-700 underline underline-offset-8 decoration-indigo-200 transition-all">{isLogin ? "NEW STUDENT? REGISTER" : "BACK TO AUTHENTICATION"}</button></div>
          </form>
        </div>
      </motion.div>

      <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
        <DialogContent className="bg-white border-none text-slate-900 rounded-[48px] p-8 sm:p-12 max-w-lg shadow-2xl w-[95vw] sm:w-full">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-center sm:text-left">Student Profile</DialogTitle>
            <DialogDescription className="text-slate-500 font-bold text-center sm:text-left text-xs uppercase tracking-widest">Complete your institutional details to continue.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegistrationSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select value={registrationData.year} onChange={(e) => setRegistrationData({ ...registrationData, year: e.target.value })} className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-indigo-500" required>
                <option value="">YEAR</option>
                {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <Input placeholder="SECTION" value={registrationData.section} onChange={(e) => setRegistrationData({ ...registrationData, section: e.target.value })} className="h-14 bg-slate-50 border-slate-100 rounded-2xl text-slate-900 font-bold px-6" required />
            </div>
            <Input placeholder="DEPARTMENT" value={registrationData.department} onChange={(e) => setRegistrationData({ ...registrationData, department: e.target.value })} className="h-14 bg-slate-50 border-slate-100 rounded-2xl text-slate-900 font-bold px-6" required />
            <Input placeholder="COLLEGE" value={registrationData.college} onChange={(e) => setRegistrationData({ ...registrationData, college: e.target.value })} className="h-14 bg-slate-50 border-slate-100 rounded-2xl text-slate-900 font-bold px-6" required />
            <Input placeholder="PHONE" value={registrationData.phone} onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })} className="h-14 bg-slate-50 border-slate-100 rounded-2xl text-slate-900 font-bold px-6" required />
            <Button type="submit" className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all text-sm uppercase tracking-widest shadow-xl shadow-indigo-100" disabled={isRegistering}>{isRegistering ? "SAVING..." : "COMPLETE REGISTRATION"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// MAIN PAGE EXPORT
// ============================================================
export default function SphnsExmTest() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  
  const [phase, setPhase] = useState<'auth' | 'select' | 'info' | 'exam' | 'results' | 'profile'>('auth');
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completedTitles, setCompletedTitles] = useState<Set<string>>(new Set());
  const [selectedEx, setSelectedEx] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingEx, setLoadingEx] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  
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
    if (user) {
      setPhase('select');
      fetchPortal();
    }
  }, [user]);

  const fetchPortal = async () => {
    if (!user) return;
    setLoadingEx(true);
    try {
      const [eRes, sRes] = await Promise.all([
        supabase.from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('exam_submissions').select('*, exams(title)').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      
      if (eRes.data) setExams(eRes.data);
      if (sRes.data) setSubmissions(sRes.data);
      
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

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center font-sans tracking-[0.3em] font-black text-slate-300 uppercase"><Loader2 className="w-8 h-8 animate-spin mr-4" /> Authenticating</div>;

  if (phase === 'auth') return <AuthView onAuthSuccess={() => setPhase('select')} />;
  
  if (phase === 'profile') return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <header className="h-20 sm:h-24 bg-white border-b border-slate-100 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setPhase('select')} className="w-10 h-10 rounded-xl p-0"><ArrowLeft className="w-5 h-5 text-slate-500" /></Button>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">STUDENT PROFILE</h2>
        </div>
        <Button onClick={handleLogout} variant="destructive" className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200">LOGOUT</Button>
      </header>
      <main className="flex-1 p-6 sm:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-4xl mx-auto space-y-10">
          <section className="bg-white p-8 sm:p-12 rounded-[48px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-8 sm:gap-12 text-center sm:text-left">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-indigo-600 rounded-[32px] sm:rounded-[48px] flex items-center justify-center text-white shadow-2xl shadow-indigo-100">
              <User className="w-12 h-12 sm:w-16 sm:h-16" />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 uppercase">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h3>
              <p className="text-slate-400 font-bold text-sm tracking-widest uppercase mb-6">{user?.email}</p>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Badge className="bg-slate-50 text-slate-500 border-none px-4 py-1.5 font-bold uppercase text-[10px] tracking-widest">{submissions.length} ASSESSMENTS</Badge>
                <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Check className="w-3 h-3" /> VERIFIED GENUINE</div>
              </div>
            </div>
          </section>

          <div className="space-y-6 px-2">
            <div className="flex items-center gap-4">
              <div className="h-0.5 flex-1 bg-slate-100"></div>
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Submission Timeline</h4>
              <div className="h-0.5 flex-1 bg-slate-100"></div>
            </div>
            <div className="grid grid-cols-1 gap-5">
              {submissions.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[48px]">
                  <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No previous metrics discovered</p>
                </div>
              ) : submissions.map((s, i) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={s.id} className="bg-white p-6 sm:p-10 rounded-[40px] border border-slate-50 shadow-sm group hover:border-indigo-100 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Award className="w-3 h-3" />
                        {s.exams?.title || s.exam_title || 'Former Assessment'}
                      </div>
                      <div className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">SUBMITTED ON PORTAL CLOUD</p>
                    </div>
                    <div className="flex items-center gap-8 justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">AGGREGATE</div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900">{s.score}<span className="text-slate-300 text-sm font-bold ml-1">/{s.total_marks}</span></div>
                      </div>
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[24px] flex items-center justify-center font-black text-lg sm:text-xl shadow-sm ${s.score/s.total_marks >= 0.4 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {Math.round((s.score/s.total_marks)*100)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  if (phase === 'select') return (
    <div className="relative h-full w-full overflow-hidden">
      <TestSelectionView 
        exams={exams} 
        loading={loadingEx} 
        onSelect={handleSelect} 
        completedIds={completedIds} 
        completedTitles={completedTitles} 
      />
      
      {/* Dynamic Profile Toggle */}
      <motion.button 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setPhase('profile')} 
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-200 flex items-center justify-center z-[100] border-4 border-white group"
      >
        <User className="w-8 sm:w-10 h-8 sm:h-10" />
        <div className="absolute -top-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-white animate-pulse" />
      </motion.button>
    </div>
  );

  if (phase === 'info') return <StudentInfoFormView exam={selectedEx} onStart={handleStart} />;
  
  if (isEval) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center font-sans">
      <Bot className="w-16 h-16 animate-pulse text-indigo-600 mb-6" />
      <h2 className="text-2xl font-black uppercase tracking-widest mb-4">Grading Assessment</h2>
      <p className="text-slate-400 max-w-xs font-medium uppercase text-[10px] tracking-widest">Synchronizing secure responses with neural baseline...</p>
    </div>
  );

  if (phase === 'results') return <FinalResultsView {...res} onExit={() => setPhase('select')} />;

  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).length;

  if (!q && phase === 'exam') return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-300">Synchronizing Queries...</div>;

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden font-sans relative" onContextMenu={e => e.preventDefault()} style={{ userSelect: 'none' }}>
      <ViolationOverlay show={security.showWarning} count={security.violationCount} max={selectedEx?.max_violations || 2} msg={security.warningMessage} onDismiss={security.dismissWarning} />
      
      <AnimatePresence>
        {!security.isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-white/80 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-6 sm:p-8"
          >
            <Maximize className="w-16 h-16 sm:w-20 sm:h-20 text-indigo-600 mb-6 sm:mb-8 animate-pulse" />
            <h2 className="text-3xl sm:text-4xl font-[900] text-slate-900 mb-4 uppercase tracking-tight">SECURITY DISCONNECTED</h2>
            <p className="text-slate-500 mb-8 sm:mb-10 max-w-sm font-medium text-sm sm:text-base">Your session is paused. Please enter fullscreen mode to resume assessment.</p>
            <Button onClick={security.enterFullscreen} className="h-16 sm:h-20 px-12 sm:px-16 rounded-2xl sm:rounded-[32px] bg-indigo-600 text-white font-[900] text-base sm:text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">RESTORE SESSION</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="h-20 sm:h-24 border-b border-slate-100 bg-white/80 backdrop-blur-xl px-4 sm:px-12 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100"><Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-black text-xs sm:text-sm uppercase tracking-widest line-clamp-1 max-w-[100px] sm:max-w-none">{selectedEx?.title}</span>
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">{name || user?.email?.split('@')[0]}</span>
          </div>
        </div>
        
        <div className={`px-4 sm:px-8 h-10 sm:h-12 flex items-center gap-2 rounded-full border-2 transition-all ${timeLeft < 300 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-50 text-slate-900'}`}>
          <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          <span className="font-mono text-base sm:text-2xl font-black tracking-widest">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
        </div>
        
        <Button onClick={() => handleSubmit()} className="h-10 sm:h-12 bg-slate-900 text-white font-[900] text-[9px] sm:text-xs uppercase tracking-widest px-4 sm:px-10 rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-800 transition-all hidden sm:flex">SUBMIT FINAL</Button>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 sm:p-10 gap-4 sm:gap-10 relative z-10 bg-[#F8FAFC]">
        {/* Mobile Action Bar */}
        <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question {currentQ + 1} / {questions.length}</div>
           <Button onClick={() => handleSubmit()} className="h-10 bg-slate-900 text-white font-[900] text-[10px] uppercase tracking-widest px-6 rounded-xl shadow-lg">SUBMIT</Button>
        </div>

        <aside className="lg:w-72 bg-white rounded-[24px] lg:rounded-[48px] border border-slate-100 p-4 lg:p-8 flex flex-col shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 lg:mb-8 px-2 hidden lg:block">Navigation Matrix</div>
          <div className="flex lg:grid lg:grid-cols-4 gap-2 lg:gap-4 overflow-x-auto lg:overflow-y-auto no-scrollbar pb-2 lg:pb-8 flex-1">
            {questions.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentQ(i)} 
                className={`flex-shrink-0 w-10 lg:w-auto h-10 lg:h-auto aspect-square rounded-xl lg:rounded-[18px] flex items-center justify-center text-[10px] lg:text-xs font-black border transition-all ${currentQ === i ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : answers[questions[i].id] ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-4 lg:gap-10 overflow-hidden">
          <motion.div 
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 bg-white rounded-[32px] lg:rounded-[48px] border border-slate-100 p-6 lg:p-12 overflow-y-auto no-scrollbar relative shadow-sm"
          >
            <div className="flex items-center justify-between mb-8 lg:mb-12">
              <Badge className="bg-slate-50 text-slate-400 border-none px-4 py-1.5 font-black text-[10px] uppercase tracking-widest">QUERY {currentQ + 1}</Badge>
              <Badge className="bg-indigo-50 text-indigo-600 border-none px-4 py-1.5 font-black text-[10px] tracking-widest">{q?.marks || 0} MARKS</Badge>
            </div>

            <h3 className="text-xl sm:text-4xl font-[900] text-slate-950 mb-8 lg:mb-14 leading-tight uppercase tracking-tight">{q?.question || 'Identifying Security baseline...'}</h3>
            
            <div className="space-y-3 lg:space-y-4">
              {q?.question_type === 'mcq' ? (
                <div className="grid grid-cols-1 gap-3 lg:gap-6">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))}
                      className={`group w-full p-5 lg:p-8 rounded-[24px] lg:rounded-[40px] text-left border-2 transition-all flex items-center gap-4 lg:gap-8 ${answers[q.id] === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.01]' : 'bg-slate-50 border-slate-50 text-slate-600 hover:border-indigo-100 hover:bg-white'}`}
                    >
                      <div className={`w-8 h-8 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl border-2 flex items-center justify-center text-xs lg:text-base font-black transition-all ${answers[q.id] === opt ? 'bg-white text-indigo-600 border-white' : 'border-slate-200 text-slate-300 group-hover:border-indigo-200'}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="font-bold text-sm sm:text-xl">{opt}</span>
                    </button>
                  ))}
                </div>
              ) : q ? (
                <textarea 
                  value={answers[q.id] || ''} 
                  onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} 
                  className="w-full h-full min-h-[300px] bg-slate-50 border-2 border-slate-50 rounded-[28px] lg:rounded-[48px] p-8 lg:p-12 text-slate-900 font-bold text- base sm:text-2xl focus:border-indigo-100 focus:bg-white outline-none resize-none transition-all placeholder:text-slate-300 shadow-inner" 
                  placeholder="AUTHOR YOUR SECURE RESPONSE HERE..." 
                />
              ) : null}
            </div>
          </motion.div>

          <footer className="h-20 lg:h-28 bg-white rounded-[24px] lg:rounded-[48px] border border-slate-100 px-6 lg:px-12 flex items-center justify-between shadow-sm flex-shrink-0">
            <Button variant="ghost" onClick={() => setCurrentQ(p => Math.max(0, p-1))} disabled={currentQ === 0} className="h-12 lg:h-16 px-4 lg:px-10 rounded-xl lg:rounded-2xl text-slate-400 font-black text-[10px] lg:text-sm tracking-[0.2em] uppercase">PREVIOUS</Button>
            <div className="h-2 w-32 sm:w-80 bg-slate-50 rounded-full overflow-hidden hidden md:block"><motion.div initial={{ width: 0 }} animate={{ width: `${((currentQ+1)/(questions.length || 1))*100}%` }} className="h-full bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" /></div>
            <Button onClick={() => currentQ === questions.length - 1 ? handleSubmit() : setCurrentQ(p => p+1)} className="h-12 lg:h-16 px-8 lg:px-14 rounded-xl lg:rounded-2xl bg-indigo-600 text-white font-[900] text-[10px] lg:text-sm tracking-[0.2em] uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">{currentQ === questions.length - 1 ? "FINALIZE" : "NEXT QUERY"}</Button>
          </footer>
        </section>
      </main>
    </div>
  );
}
