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
// AUTH COMPONENT
// ============================================================
function AuthView({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

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
    checkRegistration();
  }, [user, showRegistration, onAuthSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        if (!data?.user && (data as any)?.firebaseUser && !(data as any)?.firebaseUser.emailVerified) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[60%] bg-indigo-200 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-3xl p-6 sm:p-10 rounded-[32px] sm:rounded-[56px] border border-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)]">
          <div className="text-center mb-8 sm:mb-10">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-[20px] sm:rounded-[28px] flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-indigo-200 shadow-[0_20px_40px_-5px_rgba(79,70,229,0.3)]"><Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" /></motion.div>
            <h1 className="text-3xl sm:text-4xl font-[900] text-slate-900 tracking-tight mb-2 sm:mb-3 uppercase">SPHN <span className="text-indigo-600">EXAMS</span></h1>
            <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Authorized Portal Only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-1.5 sm:space-y-2"><Label className="text-[9px] sm:text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">EMAIL ADDRESS</Label><Input type="email" placeholder="student@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl focus:border-indigo-500 focus:bg-white text-slate-900 font-bold px-5 sm:px-6 transition-all" required /></div>
            <div className="space-y-1.5 sm:space-y-2"><Label className="text-[9px] sm:text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">PASSWORD</Label><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl focus:border-indigo-500 focus:bg-white text-slate-900 font-bold px-5 sm:px-6 transition-all" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
            <Button type="submit" className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-indigo-200 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all" disabled={isLoading}>{isLoading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : isLogin ? "LOGIN ACCESS" : "REGISTER ACCOUNT"}</Button>
            <div className="relative py-2 sm:py-4 text-center"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div><span className="relative bg-white px-3 sm:px-4 text-[9px] sm:text-[10px] font-black text-slate-300 tracking-widest uppercase">OR</span></div>
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl border-slate-100 bg-slate-50/50 text-slate-700 hover:bg-white hover:border-slate-200 font-bold flex items-center justify-center gap-2 sm:gap-3 transition-all text-[10px] sm:text-xs" disabled={isGoogleLoading}><svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg> GOOGLE LOGIN</Button>
            <div className="text-center pt-2"><button type="button" onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:text-indigo-700 underline underline-offset-8 decoration-indigo-200 transition-all">{isLogin ? "NEW? CREATE ID" : "BACK TO LOGIN"}</button></div>
          </form>
        </div>
      </motion.div>

      <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
        <DialogContent className="bg-white border-none text-slate-900 rounded-[32px] sm:rounded-[56px] p-8 sm:p-12 max-w-lg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] w-[95vw] sm:w-full">
          <DialogHeader className="mb-8 sm:mb-10">
            <DialogTitle className="text-2xl sm:text-3xl font-[900] tracking-tight text-center sm:text-left">Final Details</DialogTitle>
            <DialogDescription className="text-slate-500 font-bold text-center sm:text-left text-sm">Complete profile to start exam.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegistrationSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <select value={registrationData.year} onChange={(e) => setRegistrationData({ ...registrationData, year: e.target.value })} className="w-full h-14 sm:h-16 px-5 sm:px-6 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-slate-700 font-bold outline-none focus:border-indigo-500" required>
                <option value="">YEAR</option>
                {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <Input placeholder="SECTION" value={registrationData.section} onChange={(e) => setRegistrationData({ ...registrationData, section: e.target.value })} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl text-slate-900 font-bold px-5 sm:px-6" required />
            </div>
            <Input placeholder="DEPARTMENT" value={registrationData.department} onChange={(e) => setRegistrationData({ ...registrationData, department: e.target.value })} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl text-slate-900 font-bold px-5 sm:px-6" required />
            <Input placeholder="COLLEGE" value={registrationData.college} onChange={(e) => setRegistrationData({ ...registrationData, college: e.target.value })} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl text-slate-900 font-bold px-5 sm:px-6" required />
            <Input placeholder="PHONE" value={registrationData.phone} onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl text-slate-900 font-bold px-5 sm:px-6" required />
            <Button type="submit" className="w-full h-14 sm:h-18 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-black hover:opacity-90 transition-all text-sm uppercase tracking-widest shadow-xl shadow-indigo-100" disabled={isRegistering}>
              {isRegistering ? "SAVING..." : "COMPLETE"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SELECTION VIEW
// ============================================================
function TestSelectionView({ exams, loading, onSelect, completedIds, completedTitles }: any) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-8 py-12 sm:py-20 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[80%] sm:w-[50%] h-[50%] bg-gradient-to-br from-indigo-100/40 to-transparent blur-[80px] sm:blur-[100px] rounded-full will-change-transform" 
        />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <header className="mb-12 sm:mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="bg-indigo-600 text-white border-transparent px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-widest uppercase mb-4 sm:mb-6 shadow-indigo-200 shadow-xl">
              SYSTEM PORTAL ACTIVE
            </Badge>
            <h2 className="text-4xl sm:text-6xl font-[900] text-[#0F172A] tracking-tight mb-4 sm:mb-6 leading-tight uppercase">
              Select Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Secure Exam</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-base sm:text-lg font-medium leading-relaxed px-4 sm:px-0">
              Authenticate into the assessment environment. Your progression is monitored in real-time.
            </p>
          </motion.div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
              <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <p className="text-slate-400 font-bold text-[10px] sm:text-sm uppercase tracking-[0.2em]">Synchronizing Secure Data...</p>
          </div>
        ) : exams.length === 0 ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-24 bg-white rounded-[40px] sm:rounded-[60px] border border-slate-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] mx-4"
          >
            <ShieldOff className="w-16 h-16 sm:w-20 sm:h-20 text-slate-200 mx-auto mb-6 sm:mb-8" />
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">NO EXAMS DISCOVERED</h3>
            <p className="text-slate-400 text-sm">Available assessments will appear here once authorized.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            <AnimatePresence mode="popLayout">
              {exams.map((ex: Exam, idx: number) => {
                const isDone = completedIds.has(ex.id) || completedTitles.has(ex.title.trim().toLowerCase());
                return (
                  <motion.button
                    key={ex.id}
                    disabled={isDone}
                    onClick={() => onSelect(ex)}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, delay: idx * 0.05 }}
                    whileHover={!isDone ? { scale: 1.02, translateY: -8 } : {}}
                    whileTap={!isDone ? { scale: 0.98 } : {}}
                    className={`group relative p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] text-left transition-all backdrop-blur-md border ${
                      isDone 
                        ? "bg-slate-50/40 border-slate-100 opacity-60 cursor-not-allowed" 
                        : "bg-white/80 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:border-indigo-100 hover:bg-white"
                    } will-change-transform`}
                  >
                    <div className="flex flex-col h-full">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-6 sm:mb-8 transition-all duration-500 ${isDone ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"}`}><BookOpen className="w-6 h-6 sm:w-7 sm:h-7" /></div>
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Badge variant="secondary" className={isDone ? "bg-slate-200 text-slate-500" : "bg-emerald-50 text-emerald-600 border-none px-2 sm:px-3 font-bold text-[9px] sm:text-[10px]"}>{isDone ? "COMPLETE" : "AVAILABLE"}</Badge>
                        <span className="text-slate-400 text-[9px] sm:text-[10px] font-bold ml-auto tracking-widest">{ex.duration_minutes} MIN</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-[900] text-slate-900 mb-2 sm:mb-3 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{ex.title}</h3>
                      <p className="text-slate-500 text-[11px] sm:text-xs font-medium line-clamp-2 leading-relaxed mb-6">{ex.description || "Secure environment assessment protocol."}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {[1,2,3].map(i => <div key={i} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"><User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-300" /></div>)}
                        </div>
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><ChevronRight className="w-4 h-4 text-white" /></div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STUDENT INFO FORM
// ============================================================
function StudentInfoFormView({ exam, onStart }: any) {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [agree, setAgree] = useState(false);
  const canStart = name.trim().length >= 2 && roll.trim().length >= 1 && agree;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] sm:w-[60%] h-[60%] bg-indigo-100/50 blur-[100px] sm:blur-[140px] rounded-full" />
      </div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-8 sm:p-12 rounded-[40px] sm:rounded-[64px] border border-slate-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] max-w-2xl w-full relative z-10"
      >
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="bg-indigo-50 text-indigo-600 border-none px-4 py-1 font-black tracking-widest uppercase mb-4 sm:mb-6 text-[10px]">SECURITY VERIFICATION</Badge>
          <h2 className="text-2xl sm:text-4xl font-[900] text-slate-900 tracking-tight mb-2 sm:mb-4 uppercase">{exam.title}</h2>
          <p className="text-slate-400 text-sm font-medium">Verify your student identity to begin the session.</p>
        </div>

        <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-10">
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">FULL NAME</Label>
            <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl text-slate-900 font-bold px-6 focus:bg-white" />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">IDENTIFICATION ID</Label>
            <Input placeholder="ROLL / ID NUMBER" value={roll} onChange={(e) => setRoll(e.target.value)} className="h-14 sm:h-16 bg-slate-50 border-slate-100 rounded-xl sm:rounded-2xl text-slate-900 font-bold px-6 focus:bg-white" />
          </div>
          
          <label className="flex items-center gap-4 cursor-pointer p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100" onClick={() => setAgree(!agree)}>
            <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${agree ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
              {agree && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">I AGREE TO THE SECURE EXAM PROTOCOLS</span>
          </label>
        </div>

        <Button onClick={() => onStart(name, roll)} disabled={!canStart} className="w-full h-16 sm:h-20 rounded-2xl sm:rounded-3xl bg-indigo-600 text-white font-[900] text-base sm:text-lg uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-[12px] sm:text-base">
          START ASSESSMENT
        </Button>
      </motion.div>
    </div>
  );
}

// ============================================================
// VIOLATION OVERLAY
// ============================================================
function ViolationOverlay({ show, count, max, msg, onDismiss }: any) {
  if (!show) return null;
  return (
    <motion.div 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-6 sm:top-12 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-lg px-4"
    >
      <div className="bg-white/95 backdrop-blur-3xl border-2 border-red-100 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-2xl flex items-start gap-4 sm:gap-6">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 flex-shrink-0"><ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8" /></div>
        <div className="flex-1">
          <div className="text-red-600 font-black text-[9px] sm:text-[10px] tracking-[0.3em] uppercase mb-1 sm:mb-2 text-left">SECURITY ALERT</div>
          <div className="text-slate-900 font-black text-xl sm:text-2xl mb-1 sm:mb-2 text-left">VIOLATION {count}/{max}</div>
          <p className="text-slate-400 text-xs sm:text-sm font-bold leading-relaxed text-left">{msg}</p>
        </div>
        <button onClick={onDismiss} className="text-slate-300 hover:text-slate-900"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
      </div>
    </motion.div>
  );
}

// ============================================================
// RESULTS VIEW
// ============================================================
function FinalResultsView({ score, total, count, totalQ, violations, time, title, breakdown, onExit }: any) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPass = pct >= 40;
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className={`absolute top-[-20%] left-[-10%] w-[80%] sm:w-[60%] h-[60%] blur-[100px] sm:blur-[160px] rounded-full ${isPass ? 'bg-emerald-100/50' : 'bg-red-100/50'}`} />
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 sm:p-16 rounded-[40px] sm:rounded-[64px] border border-slate-100 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.12)] max-w-4xl w-full relative z-10 text-center"
      >
        <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-[20px] sm:rounded-[32px] flex items-center justify-center mx-auto mb-6 sm:mb-10 ${isPass ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
          {isPass ? <CheckCircle2 className="w-8 h-8 sm:w-12 sm:h-12" /> : <ShieldOff className="w-8 h-8 sm:w-12 sm:h-12" />}
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-[900] text-slate-900 tracking-tight mb-2 sm:mb-4 uppercase">{isPass ? "SESSION SUCCESS" : "SESSION COMPLETE"}</h1>
        <Badge className="bg-slate-100 text-slate-500 border-none px-4 py-1.5 font-black tracking-widest uppercase mb-8 sm:mb-12 text-[10px]">{title}</Badge>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-10 sm:mb-16 text-left sm:text-center">
          {[
            ["SCORE", `${score}/${total}`, "indigo"],
            ["PERCENT", `${pct}%`, "emerald"],
            ["ALERTS", violations.length, "red"],
            ["TIME", `${Math.floor(time/60)}m ${time%60}s`, "purple"]
          ].map(([l, v, c], i) => (
            <div key={i} className="bg-slate-50/50 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-100 transition-all hover:bg-white hover:shadow-xl group">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">{l}</div>
              <div className={`text-xl sm:text-3xl font-[900] transition-transform ${c === 'red' ? 'text-red-500' : 'text-slate-900'}`}>{v}</div>
            </div>
          ))}
        </div>
        
        <Button onClick={onExit} className="w-full h-16 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-900 text-white font-[900] text-base sm:text-lg uppercase tracking-widest shadow-2xl hover:bg-slate-800 active:scale-95 transition-all text-[12px] sm:text-base">
          EXIT SECURE SESSION
        </Button>
      </motion.div>
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

  if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center font-sans tracking-[0.3em] font-black text-slate-300 uppercase"><Loader2 className="w-8 h-8 animate-spin mr-4" /> Authenticating</div>;

  if (phase === 'auth') return <AuthView onAuthSuccess={() => setPhase('select')} />;
  if (phase === 'select') return <TestSelectionView exams={exams} loading={loadingEx} onSelect={handleSelect} completedIds={completedIds} completedTitles={completedTitles} />;
  if (phase === 'info') return <StudentInfoFormView exam={selectedEx} onStart={handleStart} />;
  
  if (isEval) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center font-sans">
      <Bot className="w-16 h-16 animate-pulse text-indigo-600 mb-6" />
      <h2 className="text-2xl font-black uppercase tracking-widest mb-4">Grading Assessment</h2>
      <p className="text-slate-400 max-w-xs font-medium uppercase text-[10px] tracking-widest">Synchronizing secure responses with neural baseline...</p>
    </div>
  );

  if (phase === 'results') return <FinalResultsView {...res} onExit={() => window.location.reload()} />;

  // Main Exam Interface
  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).length;

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
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">{name}</span>
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
              <Badge className="bg-indigo-50 text-indigo-600 border-none px-4 py-1.5 font-black text-[10px] tracking-widest">{q.marks} MARKS</Badge>
            </div>

            <h3 className="text-xl sm:text-4xl font-[900] text-slate-950 mb-8 lg:mb-14 leading-tight uppercase tracking-tight">{q.question}</h3>
            
            <div className="space-y-3 lg:space-y-4">
              {q.question_type === 'mcq' ? (
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
              ) : (
                <textarea 
                  value={answers[q.id] || ''} 
                  onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} 
                  className="w-full h-full min-h-[300px] bg-slate-50 border-2 border-slate-50 rounded-[28px] lg:rounded-[48px] p-8 lg:p-12 text-slate-900 font-bold text- base sm:text-2xl focus:border-indigo-100 focus:bg-white outline-none resize-none transition-all placeholder:text-slate-300 shadow-inner" 
                  placeholder="AUTHOR YOUR SECURE RESPONSE HERE..." 
                />
              )}
            </div>
          </motion.div>

          <footer className="h-20 lg:h-28 bg-white rounded-[24px] lg:rounded-[48px] border border-slate-100 px-6 lg:px-12 flex items-center justify-between shadow-sm flex-shrink-0">
            <Button variant="ghost" onClick={() => setCurrentQ(p => Math.max(0, p-1))} disabled={currentQ === 0} className="h-12 lg:h-16 px-4 lg:px-10 rounded-xl lg:rounded-2xl text-slate-400 font-black text-[10px] lg:text-sm tracking-[0.2em] uppercase">PREVIOUS</Button>
            <div className="h-2 w-32 sm:w-80 bg-slate-50 rounded-full overflow-hidden hidden md:block"><motion.div initial={{ width: 0 }} animate={{ width: `${((currentQ+1)/questions.length)*100}%` }} className="h-full bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" /></div>
            <Button onClick={() => currentQ === questions.length - 1 ? handleSubmit() : setCurrentQ(p => p+1)} className="h-12 lg:h-16 px-8 lg:px-14 rounded-xl lg:rounded-2xl bg-indigo-600 text-white font-[900] text-[10px] lg:text-sm tracking-[0.2em] uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">{currentQ === questions.length - 1 ? "FINALIZE" : "NEXT QUERY"}</Button>
          </footer>
        </section>
      </main>
    </div>
  );
}
