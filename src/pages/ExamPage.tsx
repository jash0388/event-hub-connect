import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useExamSecurity, Violation } from "@/hooks/useExamSecurity";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, AlertTriangle, Clock, Send, ChevronLeft, ChevronRight, X,
  CheckCircle2, Loader2, Lock, Maximize, Flag,
  BookOpen, FileText, CircleDot, Square, CheckSquare,
  TriangleAlert, ShieldAlert, ShieldOff, Monitor, Zap, ClipboardList,
  ArrowLeft, User, Hash, Users, Bot
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { gradeAnswer, gradeExam } from "@/lib/gemini";

// Helper to normalize text for comparison (ignores case, extra spaces, etc)
const normalizeAnswer = (text: string) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove ALL spaces for maximum leniency as requested
    .replace(/[;.,]/g, '') // Remove trailing punctuation
    .replace(/['"`]/g, '') // Remove quotes (often varied in SQL)
    .trim();
};

// ============================================================
// TYPES
//(writing this text just fir time pass soo blah blah blah blah oh i see it blah blah blah blah its a good muusic isnt it?)
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

// ============================================================
// SHUFFLE UTILITY (Fisher-Yates)
// ============================================================
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// TEST SELECTION SCREEN
// ============================================================
function TestSelectionScreen({
  exams,
  loading,
  onSelectExam,
  completedExamIds,
  completedExamTitles,
}: {
  exams: Exam[];
  loading: boolean;
  onSelectExam: (exam: Exam) => void;
  completedExamIds: Set<string>;
  completedExamTitles: Set<string>;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full" />
      <div className="scanline pointer-events-none" />

      {/* Persistent App Header */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl">
        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group px-4 py-2 rounded-xl hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Return to Base</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-white tracking-widest uppercase">DATANAUTS <span className="text-indigo-400">CORE</span></h1>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Secure Examination Protocol v4.0</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end mr-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400">ENCRYPTED</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-8 py-16 max-w-6xl relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6"
            >
              <Zap className="w-3 h-3" /> SYSTEM BROADCAST: EXAMINATIONS ACTIVE
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-none"
            >
              Select Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Neural Interface</span>
            </motion.h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl">
              Select an authorized assessment to begin. System verification and proctoring will be initialized upon entry.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-[24px] backdrop-blur-md">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
               <Users className="w-6 h-6" />
             </div>
             <div>
               <div className="text-2xl font-black text-white leading-none mb-1">{exams.length}</div>
               <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Channels</div>
             </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 bg-white/[0.02] border border-white/5 rounded-[48px] backdrop-blur-md">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <Bot className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xs uppercase tracking-[0.3em] mb-2">Syncing Metadata</p>
              <p className="text-slate-500 text-xs font-bold">Accessing Secure Repository...</p>
            </div>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-32 bg-white/[0.02] border border-white/5 rounded-[48px] backdrop-blur-md">
            <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-2xl">
              <ShieldOff className="w-12 h-12 text-slate-700" />
            </div>
            <h3 className="text-3xl font-black text-white mb-3">NO CHANNELS FOUND</h3>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Awaiting authorization for scheduled examinations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {exams.map((exam, idx) => {
              const examTitleNorm = (exam.title || '').trim().toLowerCase();
              const isCompleted = completedExamIds.has(exam.id) || completedExamTitles.has(examTitleNorm);
              
              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <button
                    onClick={() => !isCompleted && onSelectExam(exam)}
                    disabled={isCompleted}
                    className={`group w-full relative overflow-hidden text-left p-1 rounded-[40px] transition-all duration-500 ${
                      isCompleted 
                      ? 'bg-slate-900/40 grayscale opacity-60 cursor-not-allowed' 
                      : 'bg-gradient-to-b from-white/10 to-transparent hover:from-indigo-500/40'
                    }`}
                  >
                    <div className="bg-slate-900/90 backdrop-blur-2xl rounded-[39px] p-8 h-full flex flex-col relative overflow-hidden group-hover:bg-slate-900/60 transition-colors">
                      {/* Background Accents */}
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[60px] group-hover:bg-indigo-500/20 transition-all rounded-full" />
                      
                      <div className="relative flex-1">
                        <div className="flex items-center justify-between mb-8">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 relative ${
                            isCompleted ? 'bg-slate-800 border-white/5' : 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]'
                          }`}>
                            <FileText className={`w-7 h-7 transition-colors duration-500 ${isCompleted ? 'text-slate-600' : 'text-indigo-400 group-hover:text-white'}`} />
                            {!isCompleted && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />}
                          </div>
                          
                          <div className="text-right">
                             <div className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{exam.duration_minutes}m</div>
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Limit</div>
                          </div>
                        </div>

                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-2">
                            {isCompleted ? (
                              <Badge className="bg-slate-800 text-slate-500 border-none px-2 py-0 text-[9px] font-black uppercase tracking-widest h-5">Finalized</Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2 py-0 text-[10px] font-black uppercase tracking-widest h-5 animate-pulse">Ready to Breach</Badge>
                            )}
                          </div>
                          <h3 className="text-2xl font-black text-white group-hover:text-indigo-300 transition-colors tracking-tighter leading-tight">
                            {exam.title}
                          </h3>
                        </div>

                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 line-clamp-3">
                          {exam.description || "Sector specific secure assessment protocol. Authorization required for entry."}
                        </p>
                      </div>

                      <div className="pt-6 border-t border-white/5 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-1.5 text-slate-500">
                             <ShieldAlert className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-widest">{exam.max_violations}X</span>
                           </div>
                           <div className="flex items-center gap-1.5 text-slate-500">
                             <Lock className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Secure</span>
                           </div>
                        </div>

                        {!isCompleted && (
                          <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                            Initialize <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// NAME & ROLL NUMBER FORM
// ============================================================
function StudentInfoForm({
  exam,
  onStart,
}: {
  exam: Exam;
  onStart: (name: string, rollNumber: string) => void;
}) {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const canStart = name.trim().length >= 2 && rollNumber.trim().length >= 1 && agreedToTerms;

  const instructions = [
    "Timed mission: Clock begins upon initialization.",
    "Neural link mandatory: Tab switching is strictly prohibited.",
    `Violation threshold: ${exam.max_violations} alerts allowed before auto-termination.`,
    "Total surveillance: All interactions are logged with biometric timestamps.",
    "Dynamic sequences: Questions are randomized and cryptographically secured.",
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      <div className="scanline pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col md:flex-row h-full">

            {/* Left Panel: Intelligence Briefing */}
            <div className="w-full md:w-[45%] bg-indigo-600 p-12 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-900" />
              <div className="absolute inset-0 opacity-10 cyber-grid pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Core Access</span>
                    <h1 className="text-3xl font-black text-white leading-none">Security Portal</h1>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h2 className="text-white text-2xl font-black tracking-tight mb-3">{exam.title}</h2>
                    <p className="text-indigo-100/60 text-sm font-medium leading-relaxed italic line-clamp-4">
                      "{exam.description || "Secure digital assessment environment. All protocols active."}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 backdrop-blur-xl px-5 py-4 rounded-[24px] border border-white/10">
                      <div className="flex items-center gap-2 text-white/40 mb-2">
                        <Clock className="w-3 h-3" /> <span className="text-[9px] font-black uppercase tracking-[0.2em]">MISSION TIME</span>
                      </div>
                      <div className="text-white text-xl font-black tracking-widest">{exam.duration_minutes}M</div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xl px-5 py-4 rounded-[24px] border border-white/10">
                      <div className="flex items-center gap-2 text-white/40 mb-2">
                        <ShieldAlert className="w-3 h-3" /> <span className="text-[9px] font-black uppercase tracking-[0.2em]">MAX ALERTS</span>
                      </div>
                      <div className="text-white text-xl font-black tracking-widest">{exam.max_violations}X</div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                      <div className="w-4 h-[1px] bg-white/40" /> PROTOCOLS
                    </h3>
                    <div className="space-y-4">
                      {instructions.map((instr, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: 0.5 + (i * 0.1) }}
                          className="flex items-start gap-4 group"
                        >
                          <div className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/5 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                          <span className="text-white/80 text-[11px] font-bold leading-relaxed tracking-wide group-hover:text-white transition-colors">{instr}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Circle */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 border-[40px] border-white/5 rounded-full pointer-events-none" />
            </div>

            {/* Right Panel: Authorization Form */}
            <div className="flex-1 p-12 flex flex-col justify-between bg-slate-900/60 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] mb-12 flex items-center gap-3">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" /> 
                  IDENTITY VERIFICATION
                </h3>

                <div className="space-y-8 mb-12">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">FULL NAME (PRIMARY)</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-xl group-focus-within:bg-indigo-500/10 transition-all opacity-0 group-focus-within:opacity-100" />
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors relative z-10" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="AUTHENTICATION_NAME"
                        className="w-full bg-black/40 border border-white/5 focus:border-indigo-500/50 text-white pl-14 h-16 rounded-[24px] transition-all relative z-10 font-mono text-sm tracking-widest placeholder:text-slate-700 focus:bg-black/60 shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">IDENTIFICATION_ID</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-xl group-focus-within:bg-indigo-500/10 transition-all opacity-0 group-focus-within:opacity-100" />
                      <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors relative z-10" />
                      <input
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="ROLL_NUMBER_AUTH"
                        className="w-full bg-black/40 border border-white/5 focus:border-indigo-500/50 text-white pl-14 h-16 rounded-[24px] transition-all relative z-10 font-mono text-sm tracking-widest placeholder:text-slate-700 focus:bg-black/60 shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-black/40 border border-red-500/10 rounded-[32px] mb-12 relative overflow-hidden group hover:border-red-500/30 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[40px] pointer-events-none" />
                  <div className="flex gap-6 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0 border border-red-500/20 group-hover:bg-red-500/20 transition-all">
                      <AlertTriangle className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-red-400 font-black text-sm uppercase tracking-widest mb-1.5">INTENSIVE MONITORING ACTIVE</h4>
                      <p className="text-slate-500 text-xs leading-relaxed font-bold tracking-tight">
                        Security AI will terminate session upon {exam.max_violations} alert occurrences. Neural interface must remain active and in focus.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <label 
                  className="flex items-start gap-5 cursor-pointer group p-2" 
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                  <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-500 relative ${
                    agreedToTerms ? 'bg-indigo-500 border-indigo-500 rotate-0 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'border-white/10 group-hover:border-indigo-500/40 bg-black/40'
                  }`}>
                    {agreedToTerms && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </div>
                  <span className="text-slate-400 text-xs font-bold leading-relaxed group-hover:text-slate-300 transition-colors uppercase tracking-tight">
                    I acknowledge full protocol agreement. Ready for neural interface initialization.
                  </span>
                </label>

                <motion.button
                  disabled={!canStart}
                  onClick={() => onStart(name.trim(), rollNumber.trim())}
                  whileHover={canStart ? { scale: 1.02, y: -2 } : {}}
                  whileTap={canStart ? { scale: 0.98 } : {}}
                  className={`w-full h-20 rounded-[32px] text-xs font-black uppercase tracking-[0.4em] transition-all duration-500 group relative overflow-hidden ${
                    canStart
                    ? 'bg-white text-slate-950 shadow-[0_20px_40px_rgba(255,255,255,0.1)]'
                    : 'bg-white/5 text-slate-700 border border-white/5'
                  }`}
                >
                  {canStart && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  )}
                  <div className="relative flex items-center justify-center gap-4">
                    {canStart ? <Zap className="w-5 h-5 text-indigo-500" /> : <Lock className="w-5 h-5" />}
                    {canStart ? 'BREACH SYSTEM' : 'AUTHORIZATION_DENIED'}
                  </div>
                </motion.button>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// VIOLATION WARNING OVERLAY
// ============================================================
function ViolationWarning({ show, message, violationCount, maxViolations, onDismiss }: {
  show: boolean; message: string; violationCount: number; maxViolations: number; onDismiss: () => void;
}) {
  if (!show) return null;
  const severity = violationCount >= maxViolations - 1 ? 'critical' : 'warning';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
        className="fixed top-0 left-0 right-0 z-[99999] flex justify-center pt-8 px-6"
      >
        <div className={`max-w-xl w-full rounded-[32px] border-2 shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-3xl p-6 relative overflow-hidden ${
          severity === 'critical' ? 'bg-red-950/90 border-red-500/50 shadow-red-500/10' : 'bg-slate-900/90 border-amber-500/50 shadow-amber-500/10'
        }`}>
          {/* Cyber accents */}
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-20" />
          
          <div className="flex items-start justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className={`font-black text-xs uppercase tracking-[0.2em] ${severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                    {severity === 'critical' ? 'CRITICAL SECURITY BREACH' : 'SECURITY ALERT DETECTED'}
                  </h4>
                  <div className="h-[1px] flex-1 bg-white/10" />
                </div>
                <p className="text-white font-black text-2xl tracking-tighter mb-2">
                  CODE: VIOLATION_{violationCount}/{maxViolations}
                </p>
                <p className="text-slate-400 text-sm font-medium leading-relaxed italic">
                  "{message}"
                </p>
                {severity === 'critical' && (
                  <motion.p 
                    animate={{ opacity: [1, 0.5, 1] }} 
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="text-red-400 text-[10px] mt-4 font-black uppercase tracking-[0.2em] bg-red-500/10 py-1.5 px-3 rounded-lg inline-block border border-red-500/20"
                  >
                    FINAL WARNING: NEXT BREACH TRIGGERS TERMINATION
                  </motion.p>
                )}
              </div>
            </div>
            
            <button 
              onClick={onDismiss} 
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">STATUS:</span>
             <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden p-[1px] border border-white/5">
                <motion.div 
                  className={`h-full rounded-full ${severity === 'critical' ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                  initial={{ width: 0 }} 
                  animate={{ width: `${(violationCount / maxViolations) * 100}%` }} 
                  transition={{ duration: 0.8, ease: "circOut" }}
                />
             </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// FULLSCREEN LOST OVERLAY
// ============================================================
function FullscreenLostOverlay({ onReEnter }: { onReEnter: () => void }) {
  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="scanline pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-slate-900/60 border-2 border-red-500/50 rounded-[48px] p-12 md:p-16 text-center shadow-[0_0_100px_rgba(239,68,68,0.2)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        
        <div className="w-24 h-24 bg-red-500/20 border-2 border-red-500/30 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <Maximize className="w-12 h-12 text-red-500 animate-pulse" />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter uppercase">
          Neural Link <span className="text-red-500">Severed</span>
        </h2>
        
        <p className="text-slate-400 text-lg font-medium leading-relaxed mb-12 italic">
          Application detected an unauthorized focus shift. Connection to examination mainframe has been suspended. Restore fullscreen mode immediately to re-synchronize.
        </p>
        
        <motion.button
          onClick={onReEnter}
          whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255, 255, 255, 0.2)" }}
          whileTap={{ scale: 0.95 }}
          className="w-full h-20 rounded-[32px] bg-white text-slate-950 font-black uppercase tracking-[0.4em] text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-4 group shadow-xl"
        >
          <Zap className="w-5 h-5 text-indigo-500 group-hover:scale-125 transition-transform" />
          Restore Neural Stream
        </motion.button>
        
        <div className="mt-8 flex items-center justify-center gap-6 opacity-30">
           <div className="flex items-center gap-1.5 font-black text-[9px] text-white uppercase tracking-widest">
             <Shield className="w-3 h-3" /> Secure Link
           </div>
           <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
           <div className="flex items-center gap-1.5 font-black text-[9px] text-white uppercase tracking-widest">
             <Lock className="w-3 h-3" /> Monitoring Active
           </div>
        </div>
      </motion.div>
    </div>
  );
}

function SubmitConfirmation({ show, onConfirm, onCancel, answeredCount, totalCount, isAutoSubmit }: {
  show: boolean; onConfirm: () => void; onCancel: () => void; answeredCount: number; totalCount: number; isAutoSubmit: boolean;
}) {
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-slate-900/60 border-2 border-white/5 rounded-[48px] p-12 max-w-xl w-full shadow-2xl relative overflow-hidden backdrop-blur-3xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        
        {isAutoSubmit ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
              <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase whitespace-pre">TERMINATION_ACTIVE</h3>
            <p className="text-slate-400 text-base font-medium leading-relaxed mb-10 italic">Neural focus threshold exceeded. Automated session finalization initiated.</p>
            <button onClick={onConfirm} className="w-full h-16 rounded-[24px] bg-red-500 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-red-600 transition-all shadow-[0_10px_30px_rgba(239,68,68,0.2)]">Execute Termination</button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-indigo-500/20">
              <Send className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Submit Sequence?</h3>
            <div className="bg-black/40 rounded-3xl p-6 mb-10 border border-white/5">
              <div className="flex items-center justify-around">
                <div className="text-center">
                   <div className="text-2xl font-black text-emerald-400">{answeredCount}</div>
                   <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PROCESSED</div>
                </div>
                <div className="h-8 w-[1px] bg-white/10" />
                <div className="text-center">
                   <div className={`text-2xl font-black ${answeredCount < totalCount ? 'text-amber-400' : 'text-slate-400'}`}>{totalCount - answeredCount}</div>
                   <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PENDING</div>
                </div>
              </div>
              {answeredCount < totalCount && (
                <p className="text-amber-400/80 text-[10px] font-black uppercase tracking-widest mt-6 bg-amber-500/10 py-2 rounded-xl border border-amber-500/20 transition-all">
                  ⚠️ INCOMPLETE SEQUENCE DETECTED
                </p>
              )}
            </div>
            <div className="flex flex-col gap-4">
               <button onClick={onConfirm} className="w-full h-18 py-5 rounded-[24px] bg-white text-slate-950 font-black uppercase tracking-[0.3em] text-[10px] hover:bg-slate-100 transition-all hover:scale-[1.02] shadow-xl">Confirm Finalization</button>
               <button onClick={onCancel} className="w-full h-14 rounded-[24px] bg-white/5 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white hover:bg-white/10 transition-all">Resume Protocol</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// RESULTS SCREEN
// ============================================================
function ResultsScreen({
  score,
  totalMarks,
  answeredCount,
  totalQuestions,
  violations,
  timeUsed,
  examTitle,
  onExit,
  resultsBreakdown
}: {
  score: number;
  totalMarks: number;
  answeredCount: number;
  totalQuestions: number;
  violations: Violation[];
  timeUsed: number;
  examTitle: string;
  onExit: () => void;
  resultsBreakdown: Array<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
}) {
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const isPassed = percentage >= 40;
  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
      <div className="scanline pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
          
          {/* Header Section */}
          <div className="relative h-64 flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
             <div className={`absolute inset-0 opacity-20 ${isPassed ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />
             <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900 to-transparent" />
             
             <motion.div
               initial={{ scale: 0, rotate: -20 }}
               animate={{ scale: 1, rotate: 0 }}
               transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
               className={`w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 relative z-10 shadow-2xl ${
                 isPassed ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-rose-500 shadow-rose-500/40'
               }`}
             >
               {isPassed ? <CheckCircle2 className="w-12 h-12 text-white" /> : <ShieldOff className="w-12 h-12 text-white" />}
             </motion.div>
             
             <div className="relative z-10 text-center">
               <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2">
                 {isPassed ? 'MISSION SUCCESS' : 'SEQUENCE COMPLETED'}
               </h2>
               <div className="flex items-center justify-center gap-3">
                 <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400 font-black text-[10px] tracking-widest px-3 py-0.5">
                   {examTitle.toUpperCase()}
                 </Badge>
                 <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                 <span className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">AI Verified Assessment</span>
               </div>
             </div>
          </div>

          <div className="p-10 md:p-14">
            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { label: 'Core Score', value: `${score}/${totalMarks}`, icon: Zap, color: 'text-indigo-400' },
                { label: 'Efficiency', value: `${percentage}%`, icon: CheckSquare, color: isPassed ? 'text-emerald-400' : 'text-rose-400' },
                { label: 'Time Elapsed', value: formatTime(timeUsed), icon: Clock, color: 'text-white' },
                { label: 'Security Alerts', value: violations.length, icon: ShieldAlert, color: violations.length > 0 ? 'text-rose-400' : 'text-emerald-400' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/[0.08] transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <stat.icon className={`w-3 h-3 ${stat.color} opacity-60`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <div className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Detailed Analytics */}
            <div className="space-y-12">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.4em] flex items-center gap-3">
                  <div className="w-4 h-[1px] bg-indigo-500" /> SEQUENCE BREAKDOWN
                </h3>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {resultsBreakdown.length} DATA NODES ANALYZED
                </div>
              </div>

              <div className="space-y-6">
                {resultsBreakdown.map((res, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + (i * 0.05) }}
                    className="group relative"
                  >
                    <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-white/5 group-hover:bg-indigo-500/40 transition-colors" />
                    
                    <div className="bg-white/5 border border-white/5 rounded-[32px] p-8 transition-all hover:bg-white/[0.08] hover:border-white/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 flex flex-col items-end">
                        <div className={`text-2xl font-black ${res.score === res.maxScore ? 'text-emerald-400' : res.score > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {res.score}<span className="text-slate-600 text-sm ml-1">/ {res.maxScore}</span>
                        </div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">CREDITS</span>
                      </div>

                      <div className="max-w-[85%]">
                        <div className="flex items-start gap-4 mb-8">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-[10px] font-black text-white shrink-0 border border-white/5">
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          <h5 className="text-white font-bold text-lg leading-tight tracking-tight mt-0.5">{res.question}</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Transmission</span>
                            <div className={`text-sm font-bold ${res.score === 0 ? 'text-rose-400/80' : 'text-slate-300'}`}>
                              {res.userAnswer || <span className="italic text-slate-600 font-medium">TERMINAL_EMPTY_INPUT</span>}
                            </div>
                          </div>
                          <div className="bg-indigo-500/5 rounded-2xl p-6 border border-indigo-500/10">
                            <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest block mb-3">Expected Protocol</span>
                            <div className="text-sm font-bold text-indigo-300/80">
                              {res.correctAnswer ? res.correctAnswer.split('|')[0].trim() : "AI_DYNAMIC_VALIDATION"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-[24px]">
                          <Bot className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-1">AI MENTOR FEEDBACK</span>
                            <p className="text-sm text-indigo-100/70 font-medium leading-relaxed italic">
                              "{res.feedback}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mt-20 pt-10 border-t border-white/5"
            >
              <button
                onClick={onExit}
                className="w-full h-20 rounded-[32px] bg-white text-slate-950 font-black uppercase tracking-[0.3em] text-xs hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group"
              >
                Terminate Results View <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


// ============================================================

// MAIN EXAM PAGE
// ============================================================
export default function ExamPage() {
  const navigate = useNavigate();
  const { user, firebaseUser, isFirebaseUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase] = useState<'select' | 'info' | 'exam' | 'results'>('select');
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const [completedExamTitles, setCompletedExamTitles] = useState<Set<string>>(new Set());
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);


  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isAutoSubmit, setIsAutoSubmit] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [showQuestionPalette, setShowQuestionPalette] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results state
  const [resultScore, setResultScore] = useState(0);
  const [resultTotalMarks, setResultTotalMarks] = useState(0);
  const [resultTimeUsed, setResultTimeUsed] = useState(0);
  const [resultsBreakdown, setResultsBreakdown] = useState<any[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);



  const getUserId = () => user?.id || (isFirebaseUser && firebaseUser ? firebaseUser.uid : undefined);
  const userId = getUserId();

  // Security hook — 2 violations max
  const security = useExamSecurity({
    enabled: phase === 'exam',
    maxViolations: selectedExam?.max_violations || 2,
    onMaxViolationsReached: () => {
      setIsAutoSubmit(true);
      setShowSubmitDialog(true);
    },
  });


  // Fetch available exams & user status in parallel for speed
  useEffect(() => {
    let mounted = true;
    const fetchPortalData = async () => {
      // 1. Wait for Auth to resolve
      if (authLoading) return;

      // 2. If Auth finished and no user, stop loading
      if (!userId) {
        if (mounted) setLoadingExams(false);
        return;
      }
      
      setLoadingExams(true);
      try {
        const [examsRes, subsRes] = await Promise.all([
          (supabase as any).from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false }),
          (supabase as any).from('exam_submissions').select('exam_id, exams(title)').eq('user_id', userId)
        ]);

        if (!mounted) return;

        if (examsRes.error) throw examsRes.error;
        const freshExams = examsRes.data || [];
        
        // DEDUPLICATE by title - keep most recent
        const deduped: Record<string, any> = {};
        freshExams.forEach((ex: any) => {
          if (!deduped[ex.title] || new Date(ex.created_at) > new Date(deduped[ex.title].created_at)) {
            deduped[ex.title] = ex;
          }
        });
        setExams(Object.values(deduped));

        const ids = new Set<string>();
        const titles = new Set<string>();

        if (subsRes.data) {
          subsRes.data.forEach((s: any) => {
            ids.add(s.exam_id);
            const title = s.exams?.title || s.exam_title;
            if (title) titles.add(title.trim().toLowerCase());
          });
        }

        setCompletedExamIds(ids);
        setCompletedExamTitles(titles);
      } catch (err: any) {
        console.error('Error fetching portal data:', err);
        if (mounted) setExams([]);
      } finally {
        if (mounted) setLoadingExams(false);
      }
    };
    fetchPortalData();
    return () => { mounted = false; };
  }, [userId, authLoading]); // Simplified deps


  // Timer
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsAutoSubmit(true);
          setShowSubmitDialog(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const handleSelectExam = async (exam: Exam) => {
    // 1. Instant state check - ID or FUZZY TITLE
    const examTitleNorm = (exam.title || '').trim().toLowerCase();
    if (completedExamIds.has(exam.id) || completedExamTitles.has(examTitleNorm)) {
      toast({ title: "Access Denied", description: "You have already completed this examination (including any other versions).", variant: "destructive" });
      return;
    }

    setLoadingQuestions(true);
    try {
      // 2. BULLETPROOF SERVER CHECK: Hit DB again to ensure no sneaky dual-sessions
      if (userId) {
        const { data: existing } = await (supabase as any)
          .from('exam_submissions')
          .select('id')
          .eq('exam_id', exam.id)
          .eq('user_id', userId)
          .limit(1);

        if (existing && existing.length > 0) {
          setCompletedExamIds(prev => new Set([...prev, exam.id]));

          toast({ title: "Access Denied", description: "Server records show you have already completed this test.", variant: "destructive" });
          setLoadingQuestions(false);
          return;
        }
      }

      setSelectedExam(exam);
      const { data, error } = await (supabase as any).from('exam_questions').select('*').eq('exam_id', exam.id).order('sort_order', { ascending: true });
      if (error) throw error;

      const parsed = (data || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []),
      }));

      // SHUFFLE questions for each user
      setQuestions(shuffleArray(parsed));
    } catch (err: any) {
      console.error('Error fetching questions:', err);
      toast({ title: "Error", description: "Failed to load questions", variant: "destructive" });
      setSelectedExam(null);
      setLoadingQuestions(false);
      return;
    }
    setLoadingQuestions(false);
    setPhase('info');
  };

  const handleStartExam = async (name: string, roll: string) => {
    setStudentName(name);
    setRollNumber(roll);
    setTimeLeft((selectedExam?.duration_minutes || 30) * 60);
    setStartTime(Date.now());
    setAnswers({});
    setCurrentQuestion(0);
    setMarkedForReview(new Set());
    setPhase('exam');
    await security.enterFullscreen();
  };

  const handleSubmitExam = useCallback(async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setShowSubmitDialog(false);

    if (timerRef.current) clearInterval(timerRef.current);

    const timeUsed = Math.floor((Date.now() - startTime) / 1000);

    try {
      // Category-based Batch Grading for High Speed
      let score = 0;
      let totalMarks = 0;
      const aiBatch: any[] = [];
      const mcqResults: Record<number, number> = {};

      questions.forEach((q, i) => {
        totalMarks += q.marks;
        const userAnswer = (answers[q.id] || '').trim();
        const correctAnswer = (q.correct_answer || '').trim();

        if (q.question_type === 'mcq') {
          let qScore = 0;
          if (correctAnswer) {
            const alternatives = correctAnswer.toLowerCase().split('|').map(a => a.trim());
            const isMatch = alternatives.some(alt => userAnswer.toLowerCase() === alt);
            qScore = isMatch ? q.marks : 0;
          }
          mcqResults[i] = qScore;
          score += qScore;
        } else {
          // INSTANT GRADING CHECK: If correct_answer exists, try matching it first to avoid AI latency
          if (correctAnswer) {
            const alternatives = correctAnswer.split('|').map(a => normalizeAnswer(a));
            const normUser = normalizeAnswer(userAnswer);
            
            const isExactMatch = alternatives.some(alt => alt === normUser && normUser !== "");
            
            if (isExactMatch) {
               mcqResults[i] = q.marks; // Mark it as graded instantly
               score += q.marks;
               return;
            }
          }
          aiBatch.push({ question: q.question, correctAnswer, userAnswer, maxMarks: q.marks, originalIndex: i });
        }
      });

      // Execute Chunked AI Grading for High Speed & Reliability
      const CHUNK_SIZE = 5;
      const aiResults: any[] = [];
      
      const promises = [];
      for (let i = 0; i < aiBatch.length; i += CHUNK_SIZE) {
        const chunk = aiBatch.slice(i, i + CHUNK_SIZE).map(({ originalIndex, ...rest }) => rest);
        promises.push(gradeExam(chunk));
      }
      const chunkedResults = await Promise.all(promises);
      chunkedResults.forEach(res => aiResults.push(...res));

      const breakdown: any[] = [];
      let aiPtr = 0;
      let usedFallback = false;

      questions.forEach((q, i) => {
        let qScore = 0;
        let qFeedback = "";
        let gradedBy = 'mcq';

        if (q.question_type === 'mcq' || mcqResults[i] !== undefined) {
          qScore = mcqResults[i] || 0;
          qFeedback = qScore > 0 ? "Correct selection." : "Incorrect selection.";
          if (q.question_type !== 'mcq') {
            qFeedback = qScore > 0 ? "Correct! Exact match found." : "Evaluation complete.";
            gradedBy = 'exact_match';
          }
        } else {
          const res = aiResults[aiPtr++];
          qScore = res?.score || 0;
          qFeedback = res?.feedback || "Evaluation complete (Speed optimized).";
          gradedBy = res?.gradedBy || 'gemini';
          if (gradedBy === 'fallback') usedFallback = true;
          score += qScore;
        }

        breakdown.push({
          question: q.question,
          userAnswer: answers[q.id] || '',
          correctAnswer: q.correct_answer || '',
          score: qScore,
          maxScore: q.marks,
          feedback: qFeedback,
          gradedBy
        });
      });

      setResultScore(score);
      setResultTotalMarks(totalMarks);
      setResultTimeUsed(timeUsed);
      setResultsBreakdown(breakdown);

      // Save to Supabase
      if (userId && selectedExam) {
        const storageEmail = user?.email || (isFirebaseUser ? firebaseUser?.email : '') || 'Guest';
        const displayNameWithEmail = `${studentName} (${storageEmail})`;

        await (supabase as any).from('exam_submissions').insert({
          exam_id: selectedExam.id,
          user_id: userId,
          student_name: displayNameWithEmail,
          roll_number: rollNumber,
          answers: { 
            ...answers, 
            _results_breakdown: breakdown,
            _ai_status: usedFallback ? 'fallback' : 'ai_verified'
          },
          score: score,
          total_marks: totalMarks,
          violations: security.violations.length,
          time_used_seconds: timeUsed,
          status: isAutoSubmit ? 'auto_submitted' : 'completed',
          exam_title: selectedExam.title
        });

        // LOCK OUT: Immediately mark as completed in local state to prevent "double start" glitch
        const lowerTitle = selectedExam.title.trim().toLowerCase();
        setCompletedExamIds(prev => new Set(prev).add(selectedExam.id));
        setCompletedExamTitles(prev => new Set(prev).add(lowerTitle));
      }
    } catch (err) {
      console.error('Error during evaluation or saving submission:', err);
      toast({ title: "Evaluation Error", description: "There was a problem finalizing your score. Results might not be saved.", variant: "destructive" });
    } finally {
      setIsEvaluating(false);
      security.exitFullscreen();
      setPhase('results');
    }
  }, [security, startTime, questions, answers, userId, selectedExam, studentName, rollNumber, isAutoSubmit, isEvaluating]);


  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleReview = (questionId: string) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return next;
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;

  const getQuestionStatus = (qId: string): 'answered' | 'marked' | 'current' | 'unanswered' => {
    if (questions[currentQuestion]?.id === qId) return 'current';
    if (markedForReview.has(qId)) return 'marked';
    if (answers[qId]?.trim()) return 'answered';
    return 'unanswered';
  };

  // === SELECT PHASE ===
  if (phase === 'select') {
    return <TestSelectionScreen exams={exams} loading={loadingExams || loadingQuestions} onSelectExam={handleSelectExam} completedExamIds={completedExamIds} completedExamTitles={completedExamTitles} />;
  }

  // === INFO PHASE ===
  if (phase === 'info' && selectedExam) {
    return <StudentInfoForm exam={selectedExam} onStart={handleStartExam} />;
  }

  // === EVALUATION OVERLAY ===
  if (isEvaluating) {
    return (
      <div className="min-h-screen bg-[#05060b] flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <Bot className="w-10 h-10 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 tracking-tight">AI Mentor is Evaluating...</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            Please wait while our AI analyzes your responses for accuracy and provides personalized feedback.
          </p>
        </motion.div>

        {/* Background Effects */}
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>
    );
  }

  // === RESULTS PHASE ===

  if (phase === 'results') {
    return (
      <ResultsScreen
        score={resultScore} totalMarks={resultTotalMarks}
        answeredCount={answeredCount} totalQuestions={questions.length}
        violations={security.violations} timeUsed={resultTimeUsed}
        examTitle={selectedExam?.title || 'Exam'}
        onExit={() => { setPhase('select'); setSelectedExam(null); setQuestions([]); setAnswers({}); window.location.reload(); }}
        resultsBreakdown={resultsBreakdown}
      />
    );

  }

  // === EXAM PHASE ===
  if (phase === 'exam') {
    if (loadingQuestions) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      );
    }

    if (questions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
            <ClipboardList className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Questions Found</h2>
          <p className="text-slate-400 max-w-md mb-8">This exam doesn't have any questions yet. Please contact the administrator.</p>
          <Button onClick={() => setPhase('select')} className="bg-indigo-600">Back to Test Selection</Button>
        </div>
      );
    }

    const q = questions[currentQuestion];
    if (!q) return null;

    return (
      <div
        className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden select-none font-sans relative"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        onContextMenu={e => e.preventDefault()}
        onCopy={e => e.preventDefault()}
        onPaste={e => e.preventDefault()}
        onCut={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/5 to-purple-950/10 pointer-events-none" />
        <div className="scanline pointer-events-none" />

        <ViolationWarning show={security.showWarning} message={security.warningMessage}
          violationCount={security.violationCount} maxViolations={selectedExam?.max_violations || 2} onDismiss={security.dismissWarning}
        />

        {!security.isFullscreen && phase === 'exam' && <FullscreenLostOverlay onReEnter={security.enterFullscreen} />}

        <SubmitConfirmation show={showSubmitDialog} onConfirm={handleSubmitExam}
          onCancel={() => { setShowSubmitDialog(false); setIsAutoSubmit(false); }}
          answeredCount={answeredCount} totalCount={questions.length} isAutoSubmit={isAutoSubmit}
        />

        {/* TOP BAR / APP HEADER */}
        <div className="h-16 flex items-center justify-between px-8 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 relative z-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-white font-black text-sm uppercase tracking-widest">{selectedExam?.title}</h1>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Secure Link Active</span>
                </div>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-white/10" />

            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Candidate</span>
              <span className="text-white text-xs font-bold truncate max-w-[150px]">{studentName}</span>
            </div>
          </div>

          {/* TIMER CENTER */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className={`flex items-center gap-3 px-6 py-1.5 rounded-full border transition-all duration-300 ${
              timeLeft < 300 ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 
              'bg-white/5 border-white/10 text-white'
            }`}>
              <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
              <span className="font-mono text-xl font-black tracking-wider leading-none">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-4">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Security Log</span>
               <div className={`flex items-center gap-1.5 text-xs font-black ${security.violationCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                 <ShieldAlert className="w-3 h-3" />
                 {security.violationCount} / {selectedExam?.max_violations || 2} ALERT{security.violationCount !== 1 ? 'S' : ''}
               </div>
            </div>

            <button 
              onClick={() => setShowSubmitDialog(true)}
              className="px-6 h-10 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Send className="w-3 h-3" /> Terminate Session
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6 relative z-10">
          
          {/* LEFT SIDEBAR: QUESTION EXPLORER */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-72 bg-slate-900/40 backdrop-blur-md rounded-[32px] border border-white/5 overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 bg-white/5">
              <h3 className="text-white font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                <ClipboardList className="w-3 h-3 text-indigo-400" /> NAVIGATION MAP
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              <div className="grid grid-cols-4 gap-3">
                {questions.map((question, idx) => {
                  const status = getQuestionStatus(question.id);
                  const isCurrent = currentQuestion === idx;
                  
                  return (
                    <motion.button 
                      key={question.id} 
                      onClick={() => setCurrentQuestion(idx)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black border transition-all relative group ${
                        isCurrent ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] z-10' :
                        status === 'answered' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        status === 'marked' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' :
                        'bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {idx + 1}
                      {status === 'marked' && !isCurrent && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-slate-900" />
                      )}
                      {status === 'answered' && !isCurrent && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* SYSTEM HEATH MONITOR */}
            <div className="p-6 border-t border-white/5 space-y-4 bg-white/5">
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <span>PROGRESS</span>
                  <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden p-[1px]">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proctor AI</span>
                </div>
                <Zap className="w-3 h-3 text-indigo-400" />
              </div>
            </div>
          </motion.div>

          {/* MAIN QUESTION VIEWPORT */}
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="flex-1 bg-slate-900/40 backdrop-blur-md rounded-[40px] border border-white/5 overflow-hidden flex flex-col shadow-2xl relative"
              >
                {/* Header Section */}
                <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Inquiry Sequence</span>
                      <h4 className="text-white font-black text-2xl tracking-tighter flex items-center gap-2">
                        <span className="text-indigo-400">#</span>{String(currentQuestion + 1).padStart(2, '0')}
                      </h4>
                    </div>
                    <div className="h-10 w-[1px] bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Payload Type</span>
                      <Badge className={`px-2 py-0 text-[10px] uppercase font-black tracking-widest ${
                        q.question_type === 'mcq' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {q.question_type === 'mcq' ? 'Objective MCQ' : 'Conceptual Text'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-center">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block leading-none mb-1">Weight</span>
                      <span className="text-white font-black text-sm leading-none">{q.marks} Pts</span>
                    </div>
                    <button 
                      onClick={() => toggleReview(q.id)}
                      className={`h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                        markedForReview.has(q.id) 
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <Flag className={`w-3 h-3 ${markedForReview.has(q.id) ? 'fill-current' : ''}`} />
                      {markedForReview.has(q.id) ? 'FLAGGED FOR REVIEW' : 'FLAG FOR REVIEW'}
                    </button>
                  </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                  <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-3xl text-white font-black leading-tight mb-12 tracking-tight overflow-hidden">
                      {q.question}
                    </h2>

                    {q.question_type === 'mcq' && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((option, idx) => {
                          const isSelected = answers[q.id] === option;
                          const label = String.fromCharCode(65 + idx);
                          
                          return (
                            <motion.button 
                              key={idx} 
                              onClick={() => handleAnswer(q.id, option)} 
                              whileHover={{ scale: 1.02, x: 5 }} 
                              whileTap={{ scale: 0.98 }}
                              className={`w-full text-left p-6 rounded-[24px] border-2 transition-all flex items-center gap-5 relative group overflow-hidden ${
                                isSelected 
                                ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.2)]' 
                                : 'bg-slate-800/20 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/5'
                              }`}
                            >
                              {isSelected && (
                                <motion.div 
                                  layoutId="selection-glow"
                                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" 
                                />
                              )}
                              
                              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 font-black text-sm transition-all ${
                                isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/10 text-slate-500 group-hover:border-white/20'
                              }`}>
                                {label}
                              </div>
                              <span className={`text-[15px] font-bold leading-snug ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {option}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative group">
                        <textarea
                          value={answers[q.id] || ''}
                          onChange={e => handleAnswer(q.id, e.target.value)}
                          placeholder="Decrypt your response here..."
                          className="w-full h-64 bg-slate-950/50 border-2 border-white/5 rounded-[32px] p-8 text-indigo-100 font-mono text-base resize-none focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-700 transition-all shadow-inner"
                          spellCheck={false}
                          onPaste={e => e.preventDefault()}
                          onDrop={e => e.preventDefault()}
                          onCopy={e => e.preventDefault()}
                        />
                        <div className="absolute bottom-6 right-8 flex items-center gap-2 opacity-50 pointer-events-none">
                          <Bot className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI EVALUATION ENABLED</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* LOWER NAV / SYSTEM CONTROLS */}
            <div className="h-20 flex items-center justify-between px-8 bg-slate-900/40 backdrop-blur-md rounded-[32px] border border-white/5 overflow-hidden">
               <button 
                  onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))} 
                  disabled={currentQuestion === 0}
                  className="h-12 px-6 rounded-2xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-20 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 group"
               >
                 <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Sequence Reverse
               </button>

               <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Answered</span>
                    <span className="text-emerald-400 font-black text-sm">{answeredCount} <span className="text-slate-600">/ {questions.length}</span></span>
                  </div>
                  <div className="w-[1px] h-6 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Flagged</span>
                    <span className="text-amber-400 font-black text-sm">{markedForReview.size}</span>
                  </div>
               </div>

               {currentQuestion === questions.length - 1 ? (
                 <button 
                  onClick={() => setShowSubmitDialog(true)}
                  className="h-12 px-8 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                 >
                   Verify & Finalize <CheckCircle2 className="w-4 h-4" />
                 </button>
               ) : (
                 <button 
                  onClick={() => setCurrentQuestion(p => Math.min(questions.length - 1, p + 1))}
                  className="h-12 px-8 rounded-2xl bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-400 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.3)] group"
                 >
                   Advance Sequence <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                 </button>
               )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return null;
}

