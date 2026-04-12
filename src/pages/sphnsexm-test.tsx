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
  LogOut, History, Award, Check, Sparkles, Brain, Trophy, Activity,
  LayoutDashboard, UserCircle, Settings, ChevronDown, MonitorCheck
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
// DESIGN SYSTEM - MESH BACKGROUND
// ============================================================
const GodlyBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-[#F0F4F8]">
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-200/40 to-transparent blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-violet-200/40 to-transparent blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
    <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-gradient-to-bl from-rose-100/30 to-transparent blur-[100px]" />
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
  </div>
);

// ============================================================
// TYPES & UTILS
// ============================================================
interface ExamQuestion {
  id: string; question: string; options: string[]; question_type: 'mcq' | 'paragraph' | 'code';
  correct_answer: string | null; marks: number; sort_order: number;
}

interface Exam {
  id: string; title: string; description: string; duration_minutes: number;
  max_violations: number; is_active: boolean; created_at: string;
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
// SUB-COMPONENTS (GODLY VIEWS)
// ============================================================

function ViolationOverlay({ show, count, max, msg, onDismiss }: any) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200000] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8 text-center text-white">
          <div className="max-w-xl">
            <motion.div initial={{ y: -50, scale: 0.8 }} animate={{ y: 0, scale: 1 }} className="w-32 h-32 bg-red-500 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(239,68,68,0.5)]"><ShieldAlert className="w-16 h-16 text-white" /></motion.div>
            <h2 className="text-5xl font-black mb-8 tracking-tighter uppercase">INTEGRITY BREACH</h2>
            <p className="text-xl font-medium text-slate-400 mb-12 leading-relaxed uppercase tracking-widest">{msg}</p>
            <div className="flex justify-center gap-12 mb-16">
              <div className="text-center"><div className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">VIOLATION</div><div className="text-5xl font-black text-red-500">{count}</div></div>
              <div className="text-center"><div className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">THRESHOLD</div><div className="text-5xl font-black text-slate-200">{max}</div></div>
            </div>
            <Button onClick={onDismiss} className="h-20 px-20 rounded-full bg-white text-slate-950 font-black text-xl uppercase tracking-tighter hover:bg-slate-100 active:scale-95 transition-all shadow-2xl">RESTORE INTEGRITY</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuthView({ onAuthSuccess }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  
  const [showReg, setShowReg] = useState(false);
  const [regUser, setRegUser] = useState<any>(null);
  const [regData, setRegData] = useState({ year: "", section: "", department: "", college: "", phone: "" });
  
  const { toast } = useToast();
  const { user, firebaseUser, signIn, signUp } = useAuth();

  useEffect(() => {
    if (user && !showReg) {
      const check = async () => {
        const { data } = await (supabaseAdmin || supabase).from('user_registrations').select('*').eq('user_id', user.id).single();
        if (!data) {
          setRegUser({ uid: user.id, email: user.email, displayName: firebaseUser?.displayName || user.email?.split('@')[0] });
          setShowReg(true);
        } else { onAuthSuccess(); }
      };
      check();
    }
  }, [user, showReg, onAuthSuccess, firebaseUser]);

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setIsLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        if (!data?.user && (data as any)?.firebaseUser && !(data as any)?.firebaseUser.emailVerified) { setShowVerification(true); return; }
      } else {
        if (!email.toLowerCase().endsWith('@gmail.com')) { toast({ title: "Access Blocked", description: "Use @gmail.com addresses only.", variant: "destructive" }); return; }
        const { error } = await signUp(email, password);
        if (error) throw error;
        setShowVerification(true);
      }
    } catch (e: any) { toast({ title: "Security Failure", description: e.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleReg = async (e: any) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const { error } = await (supabaseAdmin || supabase).from('user_registrations').insert({ user_id: regUser.uid, email: regUser.email, full_name: regUser.displayName, ...regData });
      if (error) throw error;
      setShowReg(false); onAuthSuccess();
    } catch (e: any) { toast({ title: "Profile Error", description: e.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  if (showVerification) return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white p-12 rounded-[50px] shadow-2xl text-center border border-white">
        <div className="w-24 h-24 bg-indigo-50 rounded-[35px] flex items-center justify-center mx-auto mb-10"><Mail className="w-12 h-12 text-indigo-600" /></div>
        <h2 className="text-4xl font-black text-slate-900 mb-6 uppercase tracking-tighter">SECURE LINK DISPATCHED</h2>
        <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-12 leading-relaxed">Identity confirmation required. Please access the verification link sent to <span className="text-indigo-600">{email}</span></p>
        <Button onClick={() => window.location.reload()} className="w-full h-20 rounded-3xl bg-indigo-600 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700">CONTINUE TO PORTAL</Button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl bg-white/40 backdrop-blur-3xl p-10 sm:p-20 rounded-[80px] border border-white/60 shadow-[0_100px_200px_-50px_rgba(0,0,0,0.1)]">
        <div className="w-24 h-24 bg-indigo-600 rounded-[35px] flex items-center justify-center mx-auto mb-12 shadow-2xl shadow-indigo-200"><Shield className="w-12 h-12 text-white" /></div>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter uppercase mb-2">SPHN <span className="text-indigo-600">PORTAL</span></h1>
          <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">{isLogin ? "Neural Identity Match Required" : "Initialize New Student Profile"}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input placeholder="GMAIL ADDRESS" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-20 rounded-3xl bg-white border-none shadow-sm px-10 font-bold text-xl text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-indigo-100 transition-all text-center" />
          <Input placeholder="SECURE KEY" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-20 rounded-3xl bg-white border-none shadow-sm px-10 font-bold text-xl text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-indigo-100 transition-all text-center" />
          <Button type="submit" className="w-full h-24 rounded-[40px] bg-slate-950 text-white font-black text-xl uppercase tracking-tighter shadow-2xl hover:bg-indigo-600 transition-all" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin w-8 h-8" /> : isLogin ? "INITIATE ACCESS" : "AUTHORIZE PROFILE"}</Button>
        </form>
        <div className="mt-12 text-center"><button onClick={() => setIsLogin(!isLogin)} className="text-[11px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-all">{isLogin ? "NEW SUBJECT? REGISTER" : "BACK TO IDENTIFICATION"}</button></div>
      </motion.div>

      <Dialog open={showReg} onOpenChange={setShowReg}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-none rounded-[60px] p-12 sm:p-20 shadow-2xl">
          <DialogHeader className="mb-12"><DialogTitle className="text-4xl font-black text-slate-950 uppercase tracking-tighter">STUDENT DATA CENTER</DialogTitle><DialogDescription className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Verify institutional parameters for secure record indexing.</DialogDescription></DialogHeader>
          <form onSubmit={handleReg} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <select value={regData.year} onChange={e => setRegData({...regData, year: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold text-slate-900 outline-none" required><option value="">YEAR</option>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}</select>
              <Input placeholder="SECTION" value={regData.section} onChange={e => setRegData({...regData, section: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold" required />
            </div>
            <Input placeholder="DEPARTMENT" value={regData.department} onChange={e => setRegData({...regData, department: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold" required />
            <Input placeholder="COLLEGE" value={regData.college} onChange={e => setRegData({...regData, college: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold" required />
            <Input placeholder="PHONE" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold" required />
            <Button type="submit" className="w-full h-24 rounded-[40px] bg-indigo-600 text-white font-black text-xl uppercase tracking-widest shadow-2xl hover:bg-slate-950 transition-all" disabled={isLoading}>FINALIZE REGISTRATION</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectionView({ exams, loading, onSelect, completedIds, completedTitles, onProfile }: any) {
  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 font-sans">
      <header className="max-w-7xl mx-auto mb-20 flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div>
          <div className="flex items-center gap-4 text-indigo-600 font-black text-[11px] tracking-[0.5em] uppercase mb-6"><MonitorCheck className="w-5 h-5" /> ASSESSMENT GRID ACTIVE</div>
          <h1 className="text-6xl sm:text-8xl font-black text-slate-900 leading-[0.85] tracking-tighter uppercase">PORTAL<br/><span className="text-slate-300">EXPLORER</span></h1>
        </div>
        <button onClick={onProfile} className="group relative w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-[40px] sm:rounded-[50px] shadow-2xl shadow-indigo-100 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
          <User className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center font-black text-[10px] text-white">HI</div>
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {loading ? Array(6).fill(0).map((_, i) => <div key={i} className="h-80 sm:h-[400px] bg-white rounded-[60px] animate-pulse" />) : exams.map((ex: any, i: number) => {
          const isDone = completedIds.has(ex.id) || completedTitles.has(ex.title.trim().toLowerCase());
          return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={ex.id}
              onClick={() => !isDone && onSelect(ex)}
              className={`group relative h-80 sm:h-[400px] rounded-[60px] p-12 flex flex-col justify-between transition-all cursor-pointer ${isDone ? 'bg-slate-100/50 grayscale opacity-60' : 'bg-white hover:bg-slate-950 hover:shadow-[0_50px_100px_-20px_rgba(79,70,229,0.3)] shadow-[0_20px_50px_rgba(0,0,0,0.02)]'}`}
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center shadow-lg transition-all ${isDone ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white group-hover:bg-white group-hover:text-indigo-600'}`}>{isDone ? <Check /> : <Zap className="w-10 h-10" />}</div>
                  <div className={`text-[11px] font-black uppercase tracking-widest ${isDone ? 'text-slate-300' : 'text-slate-400 group-hover:text-white/40'}`}>{ex.duration_minutes} MNS</div>
                </div>
                <h3 className={`text-3xl sm:text-4xl font-black uppercase leading-tight tracking-tighter transition-all ${isDone ? 'text-slate-400' : 'text-slate-900 group-hover:text-white'}`}>{ex.title}</h3>
              </div>
              <div className="flex items-center justify-between">
                 <p className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all ${isDone ? 'text-slate-300' : 'text-slate-400 group-hover:text-indigo-400'}`}>{isDone ? 'METRIC LOCKED' : 'SECURE SESSION READY'}</p>
                 <ChevronRight className={`w-12 h-12 transition-all ${isDone ? 'text-slate-100' : 'text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-3'}`} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileView({ user, submissions, onBack, onLogout }: any) {
  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 font-sans">
      <header className="max-w-7xl mx-auto mb-20 flex items-center justify-between">
        <button onClick={onBack} className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-indigo-100 transition-all hover:scale-110 active:scale-95"><ArrowLeft className="w-8 h-8 text-slate-950" /></button>
        <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">STUDENT COMMAND</h2>
        <button onClick={onLogout} className="w-20 h-20 bg-rose-50 rounded-[32px] flex items-center justify-center shadow-2xl shadow-rose-100 transition-all hover:bg-rose-500 group"><LogOut className="w-8 h-8 text-rose-500 group-hover:text-white" /></button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-1 space-y-12">
          <div className="bg-white p-12 rounded-[60px] shadow-2xl shadow-indigo-100 text-center border border-white">
            <div className="w-32 h-32 bg-indigo-600 rounded-[45px] flex items-center justify-center mx-auto mb-8 text-white shadow-2xl"><User className="w-16 h-16" /></div>
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">{user?.email}</p>
            <div className="flex justify-center gap-4">
              <Badge className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest border-none">ACTIVE STUDENT</Badge>
              <Badge className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest border-none">VERIFIED</Badge>
            </div>
          </div>
          <div className="bg-slate-950 p-12 rounded-[60px] text-white">
              <div className="flex items-center gap-4 mb-8 text-indigo-400 font-black text-[11px] uppercase tracking-widest"><Activity className="w-5 h-5" /> OVERALL METRICS</div>
              <div className="grid grid-cols-2 gap-8">
                <div><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">TOTAL SESSIONS</p><p className="text-4xl font-black">{submissions.length}</p></div>
                <div><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">GLOBAL SCORE</p><p className="text-4xl font-black text-indigo-400">{submissions.reduce((a:any, b:any) => a + (b.score || 0), 0)}</p></div>
              </div>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-10">
          <div className="flex items-center justify-between px-6">
            <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">ASSESSMENT LOGS</h4>
            <Sparkles className="w-6 h-6 text-indigo-200" />
          </div>
          <div className="space-y-6">
            {submissions.map((s: any, i: number) => (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={s.id} className="bg-white p-10 rounded-[45px] border border-slate-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-10 hover:shadow-2xl hover:shadow-indigo-100 transition-all">
                <div className="flex items-center gap-10 w-full sm:w-auto">
                  <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center font-black text-2xl ${s.score/s.total_marks >= 0.4 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{Math.round((s.score/s.total_marks)*100)}%</div>
                  <div>
                    <h5 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-1">{s.exams?.title || s.exam_title}</h5>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="h-full w-px bg-slate-100 hidden md:block" />
                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">AGGREGATE</p>
                    <p className="text-3xl font-black text-slate-900">{s.score}<span className="text-slate-300 text-lg">/{s.total_marks}</span></p>
                  </div>
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center"><Award className="w-7 h-7 text-indigo-400" /></div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
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
  const [submissions, setSubmissions] = useState<any[]>([]);
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
    if (user) { setPhase('select'); fetchPortal(); }
    else { setPhase('auth'); }
  }, [user]);

  const fetchPortal = async () => {
    if (!user) return; setLoadingEx(true);
    try {
      const [eRes, sRes] = await Promise.all([
        supabase.from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('exam_submissions').select('*, exams(title)').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      if (eRes.data) setExams(eRes.data);
      if (sRes.data) setSubmissions(sRes.data);
      const ids = new Set<string>(); const titles = new Set<string>();
      sRes.data?.forEach((s: any) => { ids.add(s.exam_id); if (s.exams?.title) titles.add(s.exams.title.trim().toLowerCase()); });
      setCompletedIds(ids); setCompletedTitles(titles);
    } finally { setLoadingEx(false); }
  };

  const handleSelect = async (ex: Exam) => {
    setLoadingEx(true);
    const { data: qData } = await supabase.from('exam_questions').select('*').eq('exam_id', ex.id).order('sort_order', { ascending: true });
    if (qData) {
      setQuestions(shuffleArray(qData.map(q => ({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []) }))));
      setSelectedEx(ex); setPhase('info');
    }
    setLoadingEx(false);
  };

  const handleStart = async (n: string, r: string) => {
    setName(n); setRoll(r); setTimeLeft((selectedEx?.duration_minutes || 30) * 60);
    setStartTime(Date.now()); setPhase('exam'); security.enterFullscreen();
  };

  const handleAutoSubmit = () => { if (!isEval) handleSubmit(true); };

  const handleSubmit = async (auto = false) => {
    setIsEval(true); const timeUsed = Math.floor((Date.now() - startTime) / 1000);
    try {
      let score = 0; let total = 0; const results: any[] = []; const aiItems: any[] = [];
      questions.forEach((q, i) => {
        total += q.marks; const ans = (answers[q.id] || '').trim(); const cor = (q.correct_answer || '').trim();
        if (q.question_type === 'mcq') {
          const match = cor.toLowerCase().split('|').some(a => a.trim() === ans.toLowerCase());
          const s = match ? q.marks : 0; score += s;
          results.push({ question: q.question, score: s, max: q.marks, feedback: s > 0 ? "Correct" : "Incorrect" });
        } else { aiItems.push({ question: q.question, correctAnswer: cor, userAnswer: ans, maxMarks: q.marks, i }); }
      });
      if (aiItems.length > 0) {
        const aiResults = await gradeExam(aiItems);
        aiItems.forEach((item, idx) => { const r = aiResults[idx]; const s = r?.score || 0; score += s; results.push({ question: item.question, score: s, max: item.maxMarks, feedback: r?.feedback || "Evaluated" }); });
      }
      await supabase.from('exam_submissions').insert({ exam_id: selectedEx?.id, user_id: user?.id, student_name: `${name} (${user?.email})`, roll_number: roll, score, total_marks: total, time_used_seconds: timeUsed, status: auto ? 'auto_submitted' : 'completed', exam_title: selectedEx?.title, answers: { ...answers, _breakdown: results } });
      setRes({ score, total, count: Object.keys(answers).length, totalQ: questions.length, violations: security.violations, time: timeUsed, title: selectedEx?.title, breakdown: results });
      security.exitFullscreen(); setPhase('results');
    } catch (e) { toast({ title: "Portal Error", variant: "destructive" }); }
    finally { setIsEval(false); }
  };

  const handleLogout = async () => {
    try {
      toast({ title: "Logging out...", description: "Securing session data..." });
      await signOut();
      setPhase('auth');
      window.location.href = '/'; // Hard redirect to ensure clean state
    } catch (e) {
      window.location.reload();
    }
  };

  if (authLoading) return <GodlyBackground />;

  return (
    <div className="relative min-h-screen selection:bg-indigo-100 selection:text-indigo-600">
      <GodlyBackground />
      <AnimatePresence mode="wait">
        {phase === 'auth' && <AuthView key="auth" onAuthSuccess={() => setPhase('select')} />}
        {phase === 'select' && <SelectionView key="select" exams={exams} loading={loadingEx} onSelect={handleSelect} completedIds={completedIds} completedTitles={completedTitles} onProfile={() => setPhase('profile')} />}
        {phase === 'profile' && <ProfileView key="profile" user={user} submissions={submissions} onBack={() => setPhase('select')} onLogout={handleLogout} />}
        {phase === 'info' && <StudentInfoFormView key="info" exam={selectedEx} onStart={handleStart} />}
        {phase === 'results' && <FinalResultsView key="results" {...res} onExit={() => setPhase('select')} />}
        
        {phase === 'exam' && (
          <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen w-screen flex flex-col bg-white overflow-hidden font-sans relative" onContextMenu={e => e.preventDefault()} style={{ userSelect: 'none' }}>
            <ViolationOverlay show={security.showWarning} count={security.violationCount} max={selectedEx?.max_violations || 2} msg={security.warningMessage} onDismiss={security.dismissWarning} />
            <AnimatePresence>{!security.isFullscreen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-8">
                  <Maximize className="w-24 h-24 text-indigo-600 mb-10 animate-pulse" />
                  <h2 className="text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight">SECURITY DISCONNECT</h2>
                  <p className="text-slate-500 mb-12 max-w-sm font-bold uppercase text-xs tracking-widest">Assessment paused. Fullscreen verification required to resume.</p>
                  <Button onClick={security.enterFullscreen} className="h-24 px-20 rounded-[40px] bg-indigo-600 text-white font-black text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">RESTORE PROTOCOL</Button>
                </motion.div>
            )}</AnimatePresence>
            <header className="h-24 border-b border-slate-100 bg-white/80 backdrop-blur-xl px-12 flex items-center justify-between relative z-50">
              <div className="flex items-center gap-6"><div className="w-14 h-14 bg-indigo-600 rounded-[20px] flex items-center justify-center shadow-xl shadow-indigo-100"><Shield className="w-7 h-7 text-white" /></div><div><span className="text-slate-900 font-black text-sm uppercase tracking-widest block">{selectedEx?.title}</span><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{name}</span></div></div>
              <div className={`px-10 h-14 flex items-center gap-4 rounded-full border-2 transition-all ${timeLeft < 300 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-50 text-slate-950'}`}><Clock className="w-6 h-6" /><span className="font-mono text-3xl font-black tracking-widest">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span></div>
              <Button onClick={() => handleSubmit()} className="h-14 bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest px-12 rounded-[20px] shadow-2xl hover:bg-slate-800 transition-all hidden lg:flex">SUBMIT ARCHIVE</Button>
            </header>
            <main className="flex-1 overflow-hidden flex flex-col lg:flex-row p-10 gap-10 bg-[#F8FAFC]">
              <aside className="lg:w-80 bg-white rounded-[60px] border border-slate-100 p-10 flex flex-col shadow-sm">
                <div className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-10 px-4">QUERY MATRIX</div>
                <div className="grid grid-cols-4 lg:grid-cols-4 gap-4 overflow-y-auto no-scrollbar pb-10">
                  {questions.map((_, i) => (
                    <button key={i} onClick={() => setCurrentQ(i)} className={`aspect-square rounded-[22px] flex items-center justify-center text-xs font-black border transition-all ${currentQ === i ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200' : answers[questions[i].id] ? 'bg-emerald-50 border-emerald-50 text-emerald-600' : 'bg-slate-50 border-slate-50 text-slate-400'}`}>{i + 1}</button>
                  ))}
                </div>
              </aside>
              <section className="flex-1 flex flex-col gap-10 overflow-hidden">
                <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex-1 bg-white rounded-[60px] border border-slate-100 p-16 overflow-y-auto no-scrollbar relative shadow-sm">
                  <div className="flex items-center justify-between mb-16"><Badge className="bg-slate-50 text-slate-400 border-none px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">IDENTIFIER {currentQ + 1}</Badge><Badge className="bg-indigo-50 text-indigo-600 border-none px-6 py-2 rounded-full font-black text-[10px] tracking-widest">METRIC: {questions[currentQ]?.marks}</Badge></div>
                  <h3 className="text-3xl sm:text-5xl font-black text-slate-950 mb-16 leading-tight uppercase tracking-tighter">{questions[currentQ]?.question}</h3>
                  <div className="space-y-4">
                    {questions[currentQ]?.question_type === 'mcq' ? (
                      <div className="grid grid-cols-1 gap-4">
                        {questions[currentQ].options.map((opt, i) => (
                          <button key={i} onClick={() => setAnswers(p => ({ ...p, [questions[currentQ].id]: opt }))} className={`group w-full p-8 rounded-[35px] text-left border-2 transition-all flex items-center gap-10 ${answers[questions[currentQ].id] === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-slate-50 border-slate-50 text-slate-500 hover:bg-white hover:border-indigo-100'}`}><div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black transition-all ${answers[questions[currentQ].id] === opt ? 'bg-white text-indigo-600 border-white' : 'border-slate-200 text-slate-300'}`}>{String.fromCharCode(65 + i)}</div><span className="font-bold text-xl">{opt}</span></button>
                        ))}
                      </div>
                    ) : (
                      <textarea value={answers[questions[currentQ]?.id] || ''} onChange={e => setAnswers(p => ({ ...p, [questions[currentQ].id]: e.target.value }))} className="w-full h-full min-h-[400px] bg-slate-50 border-none rounded-[40px] p-12 text-slate-900 font-bold text-2xl focus:bg-white outline-none resize-none transition-all placeholder:text-slate-200 shadow-inner" placeholder="DECRYPT AND AUTHOR RESPONSE..." />
                    )}
                  </div>
                </motion.div>
                <footer className="h-28 bg-white rounded-[50px] border border-slate-100 px-12 flex items-center justify-between shadow-sm">
                  <Button variant="ghost" onClick={() => setCurrentQ(p => Math.max(0, p-1))} disabled={currentQ === 0} className="h-16 px-12 rounded-2xl text-slate-400 font-black text-sm uppercase tracking-widest">PREVIOUS</Button>
                  <div className="h-2 w-full max-w-lg bg-slate-50 rounded-full mx-10 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${((currentQ+1)/questions.length)*100}%` }} className="h-full bg-indigo-600 rounded-full" /></div>
                  <Button onClick={() => currentQ === questions.length - 1 ? handleSubmit() : setCurrentQ(p => p+1)} className="h-16 px-16 rounded-[25px] bg-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-slate-950 transition-all">{currentQ === questions.length - 1 ? "FINALIZE" : "NEXT QUERY"}</Button>
                </footer>
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isEval && (
        <div className="fixed inset-0 z-[300000] bg-slate-50/80 backdrop-blur-3xl flex flex-col items-center justify-center text-center font-sans">
          <Brain className="w-24 h-24 text-indigo-600 animate-pulse mb-8" />
          <h2 className="text-4xl font-black text-slate-950 uppercase tracking-tighter mb-4">NEURAL EVALUATION ACTIVE</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synchronizing student responses with ground truth baseline...</p>
        </div>
      )}
    </div>
  );
}

function FinalResultsView({ score, total, violations, time, title, breakdown, onExit }: any) {
  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 font-sans">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-12 sm:p-24 rounded-[80px] border border-white shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
          <div className="w-32 h-32 bg-emerald-50 rounded-[45px] flex items-center justify-center mx-auto mb-12 text-emerald-500 shadow-xl shadow-emerald-50"><Trophy className="w-16 h-16" /></div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 mb-4 tracking-tighter uppercase">ASSESSMENT ARCHIVED</h2>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] mb-16">{title}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-20">
            <div className="bg-slate-50 p-12 rounded-[50px]"><div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">SCORE</div><div className="text-5xl font-black text-indigo-600">{score}<span className="text-2xl text-slate-300">/{total}</span></div></div>
            <div className="bg-slate-50 p-12 rounded-[50px]"><div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">ACCURACY</div><div className="text-5xl font-black text-slate-950">{Math.round((score/total)*100)}%</div></div>
            <div className="bg-red-50 p-12 rounded-[50px]"><div className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-2">STRIKES</div><div className="text-5xl font-black text-red-500">{violations}</div></div>
          </div>

          <Button onClick={onExit} className="w-full h-24 rounded-[40px] bg-slate-950 text-white font-black text-xl uppercase tracking-tighter shadow-2xl hover:bg-indigo-600 transition-all">FINALIZE & EXIT</Button>
        </motion.div>
      </div>
    </div>
  );
}
