import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useExamSecurity, Violation } from "@/hooks/useExamSecurity";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import {
  Shield, Clock, Send, ChevronRight, X,
  CheckCircle2, Loader2, Maximize,
  BookOpen, Zap,
  ArrowLeft, User, Mail, Eye, EyeOff,
  LogOut, History, Award, Check, Sparkles, Brain, Trophy, Activity,
  MonitorCheck, Star, Layers, Cpu, Fingerprint
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
import { signInWithGoogle, resendVerificationEmail, refreshUserStatus } from "@/integrations/firebase/client";

// ============================================================
// ULTRA-PREMIUM DESIGN SYSTEM
// ============================================================

const MasterBackground = () => (
  <div className="fixed inset-0 -z-20 overflow-hidden bg-[#020617]">
    {/* Deep Layered Orbs */}
    <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-[10%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-indigo-500/20 via-blue-600/10 to-transparent blur-[150px]" />
    <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-violet-600/20 via-purple-500/10 to-transparent blur-[150px]" />
    
    {/* Grid Overlay */}
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.4] mix-blend-overlay pointer-events-none" />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
  </div>
);

const PremiumCard = ({ children, className = "", onClick }: any) => (
  <motion.div 
    whileHover={onClick ? { y: -8, scale: 1.01 } : {}}
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={`relative overflow-hidden rounded-[44px] bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] transition-all duration-500 ${className}`}
  >
    {/* Inner Glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
    <div className="relative z-10 h-full">{children}</div>
  </motion.div>
);

const GodlyButton = ({ children, onClick, className = "", variant = "primary", disabled = false, type = "button" }: any) => {
  const isPrimary = variant === "primary";
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={{ scale: 1.02, boxShadow: isPrimary ? "0 20px 40px -10px rgba(79, 70, 229, 0.4)" : "none" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative group h-16 sm:h-20 w-full rounded-[24px] overflow-hidden flex items-center justify-center font-black tracking-[0.2em] transition-all disabled:opacity-50 ${isPrimary ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"} ${className}`}
    >
      <div className="relative z-10 flex items-center gap-3">{children}</div>
      {isPrimary && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />}
    </motion.button>
  );
};

// ============================================================
// CORE VIEWS
// ============================================================

function AuthView({ onAuthSuccess }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  
  const [regData, setRegData] = useState({ year: "", section: "", department: "", college: "", phone: "" });
  const [showReg, setShowReg] = useState(false);
  const [regUser, setRegUser] = useState<any>(null);

  const { toast } = useToast();
  const { user, firebaseUser, signIn, signUp } = useAuth();

  useEffect(() => {
    if (user && !showReg) {
      const initReg = async () => {
        const { data } = await (supabaseAdmin || supabase).from('user_registrations').select('*').eq('user_id', user.id).single();
        if (!data) {
          setRegUser({ uid: user.id, email: user.email, name: firebaseUser?.displayName || user.email?.split('@')[0] });
          setShowReg(true);
        } else { onAuthSuccess(); }
      };
      initReg();
    }
  }, [user, showReg, onAuthSuccess, firebaseUser]);

  const handleAuth = async (e: any) => {
    e.preventDefault(); setIsLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        if (!data?.user && (data as any)?.firebaseUser?.emailVerified === false) { setShowVerify(true); return; }
      } else {
        if (!email.toLowerCase().endsWith('@gmail.com')) throw new Error("Private Domain Required: use @gmail.com");
        const { error } = await signUp(email, password);
        if (error) throw error;
        setShowVerify(true);
      }
    } catch (e: any) { toast({ title: "Authorization Denied", description: e.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const finalizeReg = async (e: any) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const { error } = await (supabaseAdmin || supabase).from('user_registrations').insert({
        user_id: regUser.uid, email: regUser.email, full_name: regUser.name, ...regData
      });
      if (error) throw error;
      setShowReg(false); onAuthSuccess();
    } catch (e: any) { toast({ title: "Write Error", description: e.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  if (showVerify) return (
    <div className="min-h-screen flex items-center justify-center p-8 font-sans relative z-10">
      <PremiumCard className="w-full max-w-xl p-16 sm:p-24 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-indigo-500/20 rounded-[32px] flex items-center justify-center mx-auto mb-12 shadow-[0_0_40px_rgba(99,102,241,0.2)]"><Mail className="w-12 h-12 text-indigo-400" /></motion.div>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 uppercase tracking-tighter">AUTHENTICATE MAIL</h2>
        <p className="text-slate-400 font-bold text-[11px] tracking-widest uppercase mb-16 leading-relaxed">A specialized secure link is waiting in <span className="text-indigo-400">{email}</span>. Activate it to finalize clearance.</p>
        <GodlyButton onClick={() => window.location.reload()}>ACCESS PORTAL</GodlyButton>
      </PremiumCard>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-8 font-sans relative z-10">
      <PremiumCard className="w-full max-w-3xl p-10 sm:p-24">
        <div className="flex flex-col items-center mb-16">
          <motion.div whileHover={{ rotate: 15 }} className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center mb-10 shadow-2xl shadow-indigo-500/30"><Fingerprint className="w-10 h-10 text-white" /></motion.div>
          <h1 className="text-5xl sm:text-7xl font-black text-white uppercase tracking-tighter mb-4">SPHN<span className="text-indigo-500">_CORE</span></h1>
          <Badge className="bg-white/5 text-white/40 border-none px-6 py-2 rounded-full font-black text-[10px] tracking-[0.4em] uppercase">Security Level: High (Neural Pass)</Badge>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            <Input placeholder="NEURAL_EMAIL" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-20 bg-white/5 border-white/10 rounded-[28px] text-center font-black text-2xl text-white placeholder:text-slate-800 focus:bg-white/10 focus:ring-0 focus:border-indigo-500 transition-all" required />
            <Input placeholder="ACCESS_KEY" type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-20 bg-white/5 border-white/10 rounded-[28px] text-center font-black text-2xl text-white placeholder:text-slate-800 focus:bg-white/10 focus:ring-0 focus:border-indigo-500 transition-all" required />
          </div>
          <GodlyButton type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : isLogin ? "INITIALIZE LOGIN" : "REQUEST CLEARANCE"}</GodlyButton>
        </form>

        <div className="mt-12 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">{isLogin ? "NEW SUBJECT? REGISTER_NODE" : "BACK TO CONTROL_LOGIN"}</button>
        </div>
      </PremiumCard>

      <Dialog open={showReg} onOpenChange={setShowReg}>
        <DialogContent className="max-w-3xl bg-slate-950 border-white/5 rounded-[60px] p-12 sm:p-24 text-white">
          <DialogHeader className="mb-12 text-center"><DialogTitle className="text-5xl font-black uppercase tracking-tighter mb-4">NODE_CONFIGURATION</DialogTitle><DialogDescription className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Index institutional parameters for global assessment ranking.</DialogDescription></DialogHeader>
          <form onSubmit={finalizeReg} className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <select value={regData.year} onChange={e => setRegData({...regData, year: e.target.value})} className="h-20 bg-white/5 border border-white/10 rounded-[30px] px-10 font-bold text-white outline-none focus:border-indigo-500"><option value="">YEAR</option>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}</select>
              <Input placeholder="SECTION" value={regData.section} onChange={e => setRegData({...regData, section: e.target.value})} className="h-20 bg-white/5 border-white/10 rounded-[30px] px-10 font-bold text-center" />
            </div>
            <Input placeholder="DEPARTMENTAL_INDEX" value={regData.department} onChange={e => setRegData({...regData, department: e.target.value})} className="h-20 bg-white/5 border-white/10 rounded-[30px] px-10 font-bold text-center" />
            <Input placeholder="INSTITUTION_ID" value={regData.college} onChange={e => setRegData({...regData, college: e.target.value})} className="h-20 bg-white/5 border-white/10 rounded-[30px] px-10 font-bold text-center" />
            <Input placeholder="COMM_PROTOCOL (PHONE)" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="h-20 bg-white/5 border-white/10 rounded-[30px] px-10 font-bold text-center" />
            <GodlyButton type="submit" disabled={isLoading}>FINALIZE_INDEX</GodlyButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectionView({ exams, loading, onSelect, completedIds, completedTitles, onProfile }: any) {
  return (
    <div className="min-h-screen p-8 sm:p-16 lg:p-32 font-sans relative z-10">
      <header className="max-w-7xl mx-auto mb-24 flex flex-col md:flex-row md:items-end justify-between gap-16">
        <div className="space-y-8">
          <div className="flex items-center gap-4 text-indigo-400 font-black text-[12px] tracking-[0.6em] uppercase"><Cpu className="w-5 h-5" /> ASSESSMENT_GRID_ONLINE</div>
          <h1 className="text-7xl sm:text-9xl font-black text-white leading-[0.8] tracking-tighter uppercase whitespace-pre-line">EXPLORE {"\n"} THE <span className="text-white/20">CORE</span></h1>
        </div>
        <button onClick={onProfile} className="relative group w-28 h-28 sm:w-40 sm:h-40 bg-white/[0.03] backdrop-blur-3xl rounded-[50px] sm:rounded-[70px] border border-white/10 flex items-center justify-center transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-2xl">
          <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-indigo-600 rounded-full border-4 border-[#020617] flex items-center justify-center font-black text-xs text-white">ID</div>
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-96 bg-white/5 rounded-[60px] animate-pulse" />) : exams.map((ex: any, i: number) => {
          const isDone = completedIds.has(ex.id) || completedTitles.has(ex.title.trim().toLowerCase());
          return (
            <PremiumCard key={ex.id} onClick={() => !isDone && onSelect(ex)} className={`h-96 sm:h-[480px] p-12 flex flex-col justify-between ${isDone ? 'opacity-30 grayscale' : 'hover:border-indigo-500/50'}`}>
              <div className="space-y-10">
                <div className="flex items-center justify-between">
                  <div className="w-20 h-20 bg-white/5 rounded-[30px] flex items-center justify-center text-white border border-white/10 group-hover:bg-indigo-600 transition-colors"><BookOpen className="w-10 h-10" /></div>
                  <Badge className="bg-white/5 text-slate-500 border-none px-6 py-2 rounded-full font-black text-[10px] tracking-widest">{ex.duration_minutes} MNS</Badge>
                </div>
                <h3 className="text-4xl sm:text-5xl font-black text-white uppercase leading-tight tracking-tighter">{ex.title}</h3>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-8">
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">{isDone ? 'SESSION_ARCHIVED' : 'READY_FOR_EVAL'}</p>
                 <ChevronRight className="w-12 h-12 text-slate-800 transition-all hover:text-indigo-400" />
              </div>
            </PremiumCard>
          );
        })}
      </div>
    </div>
  );
}

function ProfileView({ user, submissions, onBack, onLogout }: any) {
  return (
    <div className="min-h-screen p-8 sm:p-16 lg:p-32 font-sans relative z-10">
      <header className="max-w-7xl mx-auto mb-24 flex items-center justify-between">
        <button onClick={onBack} className="w-20 h-20 bg-white/5 rounded-[32px] border border-white/10 flex items-center justify-center text-white transition-all hover:bg-white/10 active:scale-90"><ArrowLeft className="w-8 h-8" /></button>
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">NODE_CLEARANCE</h2>
        <button onClick={onLogout} className="w-20 h-20 bg-red-500/10 rounded-[32px] border border-red-500/20 flex items-center justify-center text-red-500 transition-all hover:bg-red-500 hover:text-white"><LogOut className="w-8 h-8" /></button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
        <section className="lg:col-span-1 space-y-12">
          <PremiumCard className="p-16 text-center">
            <div className="w-32 h-32 bg-indigo-600 rounded-[45px] flex items-center justify-center mx-auto mb-10 text-white shadow-3xl"><User className="w-16 h-16" /></div>
            <h3 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-4">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h3>
            <p className="text-slate-500 font-black text-xs uppercase tracking-widest mb-12">{user?.email}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge className="bg-emerald-500/20 text-emerald-400 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest border-none">CRYPTO_VERIFIED</Badge>
              <Badge className="bg-white/5 text-slate-500 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest border-none">ADMIN_OK</Badge>
            </div>
          </PremiumCard>
          
          <PremiumCard className="p-12">
            <div className="flex items-center gap-4 mb-10 text-indigo-400 font-black text-[12px] uppercase tracking-widest"><Activity className="w-5 h-5" /> GLOBAL_STATS</div>
            <div className="grid grid-cols-2 gap-10">
              <div><p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-2">RUNS</p><p className="text-6xl font-black text-white">{submissions.length}</p></div>
              <div><p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-2">SCORE</p><p className="text-6xl font-black text-indigo-500">{submissions.reduce((a:any, b:any) => a + (b.score || 0), 0)}</p></div>
            </div>
          </PremiumCard>
        </section>

        <section className="lg:col-span-2 space-y-10">
          <div className="flex items-center justify-between px-6">
             <h4 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.6em]">HISTORICAL_INDEX</h4>
             <Star className="w-6 h-6 text-indigo-500 animate-pulse" />
          </div>
          <div className="space-y-6">
            {submissions.map((s: any, i: number) => (
              <PremiumCard key={s.id} className="p-12 flex flex-col md:flex-row items-center justify-between gap-12 group">
                <div className="flex items-center gap-12 w-full sm:w-auto">
                   <div className={`w-24 h-24 rounded-[35px] flex items-center justify-center font-black text-3xl ${s.score/s.total_marks >= 0.4 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{Math.round((s.score/s.total_marks)*100)}%</div>
                   <div>
                     <h5 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-indigo-400 transition-colors">{s.exams?.title || s.exam_title}</h5>
                     <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest mb-2">NET_VAL</p>
                   <p className="text-5xl font-black text-white">{s.score}<span className="text-slate-800 text-2xl">/{s.total_marks}</span></p>
                </div>
              </PremiumCard>
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
  const { user, loading: authLoading, signOut: authSignOut } = useAuth();
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
    const { data: qData } = await (supabaseAdmin || supabase).from('exam_questions').select('*').eq('exam_id', ex.id).order('sort_order', { ascending: true });
    if (qData) {
      setQuestions(shuffleArray(qData.map(q => ({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []) }))));
      setSelectedEx(ex); setPhase('info');
    }
    setLoadingEx(false);
  };

  const handleStart = (n: string, r: string) => {
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
          results.push({ question: q.question, score: s, max: q.marks, feedback: s > 0 ? "PASSED" : "FAILED" });
        } else { aiItems.push({ question: q.question, correctAnswer: cor, userAnswer: ans, maxMarks: q.marks, i }); }
      });
      if (aiItems.length > 0) {
        const aiResults = await gradeExam(aiItems);
        aiItems.forEach((item, idx) => { const r = aiResults[idx]; const s = r?.score || 0; score += s; results.push({ question: item.question, score: s, max: item.maxMarks, feedback: r?.feedback || "GRADE_OK" }); });
      }
      await supabase.from('exam_submissions').insert({ exam_id: selectedEx?.id, user_id: user?.id, student_name: `${name} (${user?.email})`, roll_number: roll, score, total_marks: total, time_used_seconds: timeUsed, status: auto ? 'auto_submitted' : 'completed', exam_title: selectedEx?.title, answers: { ...answers, _breakdown: results } });
      setRes({ score, total, violations: security.violations, title: selectedEx?.title, breakdown: results });
      security.exitFullscreen(); setPhase('results');
    } catch (e) { toast({ title: "Write Failure", variant: "destructive" }); }
    finally { setIsEval(false); }
  };

  const handleLogout = async () => {
    try {
      toast({ title: "NUCLEAR_SIGNOUT_INITIATED", description: "Terminating neural sessions and purging local caches..." });
      // 1. Explicit clean
      localStorage.clear();
      sessionStorage.clear();
      
      // 2. Auth call
      await authSignOut();
      
      // 3. Force state reset
      setPhase('auth');
      
      // 4. Hard navigation to prevent back-button re-entry
      window.location.replace('/login');
    } catch (e) {
      window.location.href = '/';
    }
  };

  if (authLoading) return <MasterBackground />;

  return (
    <div className="relative min-h-screen selection:bg-indigo-500/30 selection:text-white">
      <MasterBackground />
      <AnimatePresence mode="wait">
        {phase === 'auth' && <AuthView key="auth" onAuthSuccess={() => setPhase('select')} />}
        {phase === 'select' && <SelectionView key="select" exams={exams} loading={loadingEx} onSelect={handleSelect} completedIds={completedIds} completedTitles={completedTitles} onProfile={() => setPhase('profile')} />}
        {phase === 'profile' && <ProfileView key="profile" user={user} submissions={submissions} onBack={() => setPhase('select')} onLogout={handleLogout} />}
        
        {phase === 'info' && (
          <div className="min-h-screen flex items-center justify-center p-8 font-sans relative z-10">
            <PremiumCard className="w-full max-w-2xl p-20 text-center">
              <div className="w-24 h-24 bg-indigo-600 rounded-[35px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/30"><Layers className="w-12 h-12 text-white" /></div>
              <h2 className="text-5xl font-black text-white mb-4 uppercase tracking-tighter">PRE_FLIGHT_CHECK</h2>
              <p className="text-slate-600 font-black text-[10px] tracking-widest uppercase mb-16">Bind subject identity to assessment session</p>
              <div className="space-y-6 mb-20">
                <Input placeholder="FULL_LEGAL_NAME" value={name} onChange={e => setName(e.target.value.toUpperCase())} className="h-20 bg-white/5 border-white/5 rounded-[30px] text-center font-black text-2xl text-white" />
                <Input placeholder="REGISTER_NODE_ID" value={roll} onChange={e => setRoll(e.target.value.toUpperCase())} className="h-20 bg-white/5 border-white/5 rounded-[30px] text-center font-black text-2xl text-white" />
              </div>
              <GodlyButton onClick={() => name && roll && handleStart(name, roll)}>AUTHORIZE_START</GodlyButton>
            </PremiumCard>
          </div>
        )}

        {phase === 'results' && (
          <div className="min-h-screen p-8 sm:p-32 font-sans relative z-10">
            <PremiumCard className="max-w-4xl mx-auto p-16 sm:p-24 text-center">
              <div className="w-32 h-32 bg-indigo-600/20 rounded-[45px] flex items-center justify-center mx-auto mb-12 text-indigo-400"><Trophy className="w-16 h-16" /></div>
              <h2 className="text-5xl sm:text-7xl font-black text-white mb-4 tracking-tighter uppercase">ASSESSMENT_LOCKED</h2>
              <p className="text-slate-600 font-black text-[11px] tracking-[0.4em] mb-20">{res?.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-24">
                <div className="bg-white/5 p-12 rounded-[50px]"><p className="text-slate-600 text-[10px] uppercase mb-2">RAW_VAL</p><p className="text-6xl font-black text-white">{res?.score}<span className="text-2xl text-slate-800">/{res?.total}</span></p></div>
                <div className="bg-white/5 p-12 rounded-[50px]"><p className="text-slate-600 text-[10px] uppercase mb-2">INTEGRITY_INDEX</p><p className="text-6xl font-black text-indigo-400">{100 - (res?.violations * 10)}%</p></div>
                <div className="bg-white/5 p-12 rounded-[50px]"><p className="text-slate-600 text-[10px] uppercase mb-2">STATUS</p><p className="text-4xl font-black text-emerald-400">ARCHIVED</p></div>
              </div>
              <GodlyButton onClick={onBack}>BACK_TO_TERMINAL</GodlyButton>
            </PremiumCard>
          </div>
        )}

        {phase === 'exam' && (
          <motion.div key="exam" className="h-screen w-screen flex flex-col bg-[#020617] overflow-hidden font-sans relative" onContextMenu={e => e.preventDefault()}>
            <ViolationOverlay show={security.showWarning} count={security.violationCount} max={selectedEx?.max_violations || 2} msg={security.warningMessage} onDismiss={security.dismissWarning} />
            <AnimatePresence>{!security.isFullscreen && (
                <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-8">
                  <Maximize className="w-24 h-24 text-indigo-500 mb-10 animate-ping" />
                  <h2 className="text-6xl font-black text-white mb-6 uppercase tracking-tight">SECURITY_DROP</h2>
                  <p className="text-slate-500 font-black uppercase text-xs tracking-widest mb-16">Enter fullscreen domain to continue assessment</p>
                  <GodlyButton onClick={security.enterFullscreen} className="max-w-md">RECONNECT_DOMAIN</GodlyButton>
                </div>
            )}</AnimatePresence>
            <header className="h-28 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl px-16 flex items-center justify-between relative z-50">
               <div className="flex items-center gap-8">
                 <div className="w-16 h-16 bg-indigo-600/20 rounded-[25px] flex items-center justify-center border border-indigo-500/30"><Shield className="w-8 h-8 text-indigo-400" /></div>
                 <div><p className="text-white font-black text-xs uppercase tracking-widest">{selectedEx?.title}</p><p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.2em]">{name || 'SUBJECT_ALPHA'}</p></div>
               </div>
               <div className={`px-12 h-16 flex items-center gap-6 rounded-full border-2 transition-all ${timeLeft < 300 ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-white/5 border-white/5 text-white'}`}><Clock className="w-7 h-7" /><span className="font-mono text-4xl font-black tracking-widest">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span></div>
               <GodlyButton onClick={() => handleSubmit()} className="h-16 px-12 rounded-[25px] w-auto text-xs">FINALIZE_SUBMIT</GodlyButton>
            </header>
            <main className="flex-1 flex p-10 gap-10 overflow-hidden relative z-10">
               <aside className="w-96 bg-white/[0.02] rounded-[70px] border border-white/5 p-12 flex flex-col">
                 <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.4em] mb-12">GRID_MAP</p>
                 <div className="grid grid-cols-4 gap-4 overflow-y-auto no-scrollbar pb-10">
                   {questions.map((_, i) => (
                     <button key={i} onClick={() => setCurrentQ(i)} className={`aspect-square rounded-[30px] flex items-center justify-center font-black border transition-all ${currentQ === i ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-500/50' : answers[questions[i].id] ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/5 text-slate-700'}`}>{i + 1}</button>
                   ))}
                 </div>
               </aside>
               <section className="flex-1 flex flex-col gap-10 h-full overflow-hidden">
                 <PremiumCard className="flex-1 p-20 overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between mb-20"><Badge className="bg-white/5 text-slate-700 border-none px-6 py-2 rounded-full font-black text-[10px] tracking-widest uppercase">Query_node::{currentQ + 1}</Badge><Badge className="bg-indigo-500/20 text-indigo-400 border-none px-6 py-2 rounded-full font-black text-[10px] tracking-widest">WEIGHT: {questions[currentQ]?.marks}</Badge></div>
                    <h3 className="text-4xl sm:text-6xl font-black text-white mb-20 leading-tight uppercase tracking-tighter">{questions[currentQ]?.question}</h3>
                    <div className="space-y-6">
                      {questions[currentQ]?.question_type === 'mcq' ? (
                        <div className="grid grid-cols-1 gap-6">
                          {questions[currentQ].options.map((opt, i) => (
                            <button key={i} onClick={() => setAnswers(p => ({ ...p, [questions[currentQ].id]: opt }))} className={`group w-full p-10 rounded-[45px] text-left border-2 transition-all flex items-center gap-10 ${answers[questions[currentQ].id] === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl' : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/10'}`}><div className={`w-14 h-14 rounded-3xl border-2 flex items-center justify-center font-black text-xl transition-all ${answers[questions[currentQ].id] === opt ? 'bg-white text-indigo-600 border-white' : 'border-slate-800'}`}>{String.fromCharCode(65 + i)}</div><span className="font-bold text-2xl">{opt}</span></button>
                          ))}
                        </div>
                      ) : (
                        <textarea value={answers[questions[currentQ]?.id] || ''} onChange={e => setAnswers(p => ({ ...p, [questions[currentQ].id]: e.target.value }))} className="w-full h-full min-h-[500px] bg-white/5 border-none rounded-[50px] p-20 text-white font-bold text-3xl focus:bg-white/10 outline-none resize-none transition-all placeholder:text-slate-800 shadow-inner" placeholder="DECRYPT AND AUTHOR_INPUT..." />
                      )}
                    </div>
                 </PremiumCard>
                 <footer className="h-32 bg-white/[0.02] rounded-[60px] border border-white/5 px-16 flex items-center justify-between">
                    <button onClick={() => setCurrentQ(p => Math.max(0, p - 1))} className="text-slate-600 font-black text-xs tracking-widest uppercase hover:text-white transition-colors">PREVIOUS_NODE</button>
                    <div className="h-1.5 w-full max-w-2xl bg-white/5 rounded-full mx-16 overflow-hidden"><motion.div animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} className="h-full bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.8)]" /></div>
                    <GodlyButton onClick={() => currentQ === questions.length - 1 ? handleSubmit() : setCurrentQ(p => p + 1)} className="max-w-[240px] h-20">{currentQ === questions.length - 1 ? "FINALIZE" : "NEXT_NODE"}</GodlyButton>
                 </footer>
               </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isEval && (
        <div className="fixed inset-0 z-[300000] bg-slate-950/90 backdrop-blur-[100px] flex flex-col items-center justify-center text-center font-sans h-full w-full">
           <Brain className="w-32 h-32 text-indigo-500 animate-bounce mb-12" />
           <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">NEURAL_DECRYPTION_ACTIVE</h2>
           <p className="text-[12px] font-black text-slate-700 uppercase tracking-[0.6em]">Indexing assessment data with global ground truth baseline...</p>
        </div>
      )}
    </div>
  );
}
