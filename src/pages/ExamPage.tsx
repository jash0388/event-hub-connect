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



// ============================================================
// TYPES
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
    <div className="min-h-screen bg-[#05060b] relative overflow-hidden">
      {/* Mesh Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Exit Portal</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">SPHOORTHY <span className="text-indigo-400">Proctor</span></h1>
          </div>
          <div className="w-24" />
        </div>
      </div>

      <div className="container mx-auto px-6 py-16 max-w-5xl relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Zap className="w-3 h-3" /> SPHOORTHY ENGINEERING COLLEGE | SECURE EXAM
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight"
          >
            Select Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Examination</span>
          </motion.h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
            Choose an active test to begin. Once started, you will enter a secured environment with mandatory proctoring rules.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            <p className="text-slate-500 font-medium animate-pulse">Syncing with secure server...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/20 rounded-[32px] border border-white/5 backdrop-blur-sm">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <ClipboardList className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Active Tests</h3>
            <p className="text-slate-500">There are no scheduled examinations available for you right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam, idx) => {
              const examTitleNorm = (exam.title || '').trim().toLowerCase();
              const isCompleted = completedExamIds.has(exam.id) || completedExamTitles.has(examTitleNorm);
              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <button
                    onClick={() => !isCompleted && onSelectExam(exam)}
                    disabled={isCompleted}
                    className={`w-full group relative overflow-hidden text-left p-8 rounded-[32px] border transition-all duration-500 ${isCompleted
                      ? 'bg-slate-900/20 border-white/5 cursor-not-allowed grayscale'
                      : 'bg-slate-900/40 border-white/10 hover:border-indigo-500/50 hover:bg-slate-900/60'
                      }`}
                  >
                    {!isCompleted && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] group-hover:bg-indigo-500/10 transition-colors duration-500" />
                    )}

                    <div className="relative flex flex-col h-full">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${isCompleted ? 'bg-slate-800/50 border-white/5' : 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:scale-110'
                            }`}>
                            <FileText className={`w-6 h-6 transition-colors duration-500 ${isCompleted ? 'text-slate-600' : 'text-indigo-400 group-hover:text-white'}`} />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Assignment {idx + 1}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {isCompleted ? (
                                <Badge variant="secondary" className="bg-slate-800/80 text-slate-400 border-none px-2 py-0 h-5 text-[10px] uppercase font-black">Completed</Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0 h-5 text-[10px] uppercase font-black">Live Now</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-white/90 group-hover:text-white transition-colors">{exam.duration_minutes}m</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duration</div>
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight group-hover:translate-x-1 transition-transform duration-300">
                        {exam.title}
                      </h3>
                      <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed mb-8 flex-1">
                        {exam.description || "No description provided for this examination."}
                      </p>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{exam.max_violations} MAX</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timed</span>
                          </div>
                        </div>

                        {!isCompleted && (
                          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm group-hover:gap-3 transition-all">
                            Start Quiz <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                        {isCompleted && (
                          <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                            Ended <CheckCircle2 className="w-4 h-4" />
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
    "This is a timed exam. The timer starts once you enter fullscreen mode.",
    "You cannot switch tabs, copy, paste, drag text, or use browser developer tools.",
    `Maximum ${exam.max_violations} violations allowed. After that, your exam will be auto-submitted.`,
    "Each violation is logged with a timestamp and will be visible to the examiner.",
    "Questions are randomly shuffled. Do NOT try to inspect or modify the page.",
    "Ensure you are in fullscreen mode throughout the exam.",
    "Once submitted, you cannot re-attempt the exam.",
  ];

  return (
    <div className="min-h-screen bg-[#05060b] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[10%] left-[5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="w-full max-w-4xl relative z-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl shadow-black/50">
          <div className="flex flex-col md:flex-row h-full">

            {/* Left Column: Details & Instructions */}
            <div className="w-full md:w-[45%] bg-indigo-600 p-8 md:p-12 flex flex-col relative overflow-hidden order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-800" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Examination Portal</span>
                    <h1 className="text-3xl font-black text-white leading-tight mt-1">Verification</h1>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-white text-xl font-bold mb-2">{exam.title}</h2>
                    <p className="text-indigo-100/70 text-sm leading-relaxed line-clamp-3">{exam.description || "Secure digital assessment environment."}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-2 text-white/50 mb-1">
                        <Clock className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase tracking-widest">Time</span>
                      </div>
                      <div className="text-white font-bold">{exam.duration_minutes}m</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-2 text-white/50 mb-1">
                        <ShieldAlert className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase tracking-widest">Limit</span>
                      </div>
                      <div className="text-white font-bold">{exam.max_violations}x</div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">Protocol Check</h3>
                    <div className="space-y-4">
                      {instructions.slice(0, 5).map((instr, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-white/80 text-xs leading-relaxed font-medium">{instr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Form & Start */}
            <div className="flex-1 p-8 md:p-12 order-2 flex flex-col justify-between bg-slate-900/40">
              <div>
                <h3 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /> Candidate Credentials
                </h3>

                <div className="space-y-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="bg-slate-950/30 border-white/5 focus:border-indigo-500/50 text-white pl-12 h-14 rounded-2xl transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Roll Number / ID</label>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                      <Input
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="Enter your roll number"
                        className="bg-slate-950/30 border-white/5 focus:border-indigo-500/50 text-white pl-12 h-14 rounded-2xl transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl mb-8">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-red-400 font-bold text-sm mb-1">Strict Proctoring Active</h4>
                      <p className="text-slate-500 text-xs leading-relaxed font-medium">
                        Tab switching and exiting fullscreen is prohibited. System will auto-submit after {exam.max_violations} alerts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-4 cursor-pointer group" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 ${agreedToTerms ? 'bg-indigo-500 border-indigo-500 rotate-0' : 'border-white/10 group-hover:border-indigo-500/50'}`}>
                    {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-slate-400 text-xs font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                    I acknowledge that I am entering a secure exam environment. I agree to comply with all rules.
                  </span>
                </label>

                <Button
                  disabled={!canStart}
                  onClick={() => onStart(name.trim(), rollNumber.trim())}
                  className={`w-full h-16 rounded-[20px] text-lg font-black uppercase tracking-widest transition-all duration-500 group relative overflow-hidden ${canStart
                    ? 'bg-white text-slate-950 hover:bg-white shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-[0.98]'
                    : 'bg-slate-800/50 text-slate-600 border border-white/5'
                    }`}
                >
                  {canStart && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-200/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  )}
                  <span className="relative flex items-center justify-center gap-3">
                    {canStart ? <Zap className="w-5 h-5 text-indigo-600" /> : <Lock className="w-5 h-5" />}
                    Initiate Sequence
                  </span>
                </Button>
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
        className="fixed top-0 left-0 right-0 z-[99999] flex justify-center pt-4 px-4"
      >
        <div className={`max-w-lg w-full rounded-2xl border shadow-2xl backdrop-blur-xl p-5 ${severity === 'critical' ? 'bg-red-950/95 border-red-500/50 shadow-red-500/20' : 'bg-amber-950/95 border-amber-500/50 shadow-amber-500/20'
          }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${severity === 'critical' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                <AlertTriangle className={`w-5 h-5 ${severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                  Violation #{violationCount} of {maxViolations}
                </p>
                <p className="text-slate-300 text-sm mt-1">{message}</p>
                {severity === 'critical' && (
                  <p className="text-red-400 text-xs mt-2 font-medium">⚠️ FINAL WARNING: Next violation will auto-submit!</p>
                )}
              </div>
            </div>
            <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
          </div>
          <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div className={`h-full rounded-full ${severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
              initial={{ width: 0 }} animate={{ width: `${(violationCount / maxViolations) * 100}%` }} transition={{ duration: 0.5 }}
            />
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99998] bg-slate-950/98 backdrop-blur-lg flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-amber-500/30">
          <Monitor className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Fullscreen Required</h2>
        <p className="text-slate-400 mb-8">You have exited fullscreen. Return to fullscreen to continue.</p>
        <Button onClick={onReEnter} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white px-8 h-12 rounded-xl font-medium shadow-lg">
          <Maximize className="w-5 h-5 mr-2" /> Return to Fullscreen
        </Button>
      </motion.div>
    </motion.div>
  );
}

// submit comformation page 
function SubmitConfirmation({ show, onConfirm, onCancel, answeredCount, totalCount, isAutoSubmit }: {
  show: boolean; onConfirm: () => void; onCancel: () => void; answeredCount: number; totalCount: number; isAutoSubmit: boolean;
}) {
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {isAutoSubmit ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/30">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-3">Exam Auto-Submitted</h3>
            <p className="text-slate-400 text-center mb-6">Maximum violations reached. Your exam has been auto-submitted.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-indigo-500/30">
              <Send className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-3">Submit Exam?</h3>
            <p className="text-slate-400 text-center mb-2">
              You answered <span className="text-indigo-400 font-semibold">{answeredCount}</span> / <span className="text-white font-semibold">{totalCount}</span> questions.
            </p>
            {answeredCount < totalCount && <p className="text-amber-400 text-center text-sm mb-6">⚠️ {totalCount - answeredCount} unanswered.</p>}
          </>
        )}
        <div className="flex gap-3">
          {!isAutoSubmit && (
            <Button onClick={onCancel} variant="outline" className="flex-1 h-12 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl">Go Back</Button>
          )}
          <Button onClick={onConfirm} className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium">
            {isAutoSubmit ? 'View Results' : 'Confirm Submit'}
          </Button>
        </div>
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
    <div className="min-h-screen bg-[#05060b] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[10%] left-[5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="w-full max-w-3xl relative z-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl shadow-black/50 p-8 md:p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className={`w-28 h-28 rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl ${isPassed ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
              }`}
          >
            {isPassed ? <CheckCircle2 className="w-14 h-14 text-white" /> : <AlertTriangle className="w-14 h-14 text-white" />}
          </motion.div>

          <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
            {isPassed ? 'Assessment Finalized' : 'Assessment Completed'}
          </h2>
          <p className="text-slate-400 font-medium mb-12">{examTitle}</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Score</div>
              <div className="text-2xl font-black text-white">{score}/{totalMarks}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Accuracy</div>
              <div className={`text-2xl font-black ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>{percentage}%</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Duration</div>
              <div className="text-2xl font-black text-white tracking-tighter">{formatTime(timeUsed)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Violations</div>
              <div className={`text-2xl font-black ${violations.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{violations.length}</div>
            </div>
          </div>

          {violations.length > 0 && (
            <div className="mb-10 text-left">
              <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldOff className="w-3 h-3" /> Security Log Summary
              </h4>
              <div className="space-y-3">
                {violations.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-slate-300 text-xs font-medium">{v.message}</span>
                    <span className="text-slate-600 text-[10px] font-bold ml-auto">{v.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question Breakdown */}
          <div className="mb-12 text-left">
            <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Detailed Assessment Feedback
            </h4>
            <div className="space-y-6">
              {resultsBreakdown.map((res, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-[32px] p-6 md:p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 flex flex-col items-end">
                    <span className={`text-sm font-black ${res.score === res.maxScore ? 'text-emerald-400' : res.score > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {res.score}/{res.maxScore}
                    </span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Points</span>
                  </div>

                  <div className="max-w-[85%]">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-white shrink-0 border border-white/5">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <h5 className="text-white font-bold text-sm leading-relaxed mt-1">{res.question}</h5>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Your Answer</div>
                        <div className={`text-xs font-medium ${res.score === 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {res.userAnswer || <span className="italic text-slate-600">No answer provided</span>}
                        </div>
                      </div>
                      <div className="bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10">
                        <div className="text-[8px] font-black text-indigo-400/60 uppercase tracking-widest mb-2">Recommended Key</div>
                        <div className="text-xs font-medium text-indigo-200">
                          {res.correctAnswer ? (
                            <>
                              {res.correctAnswer.split('|')[0].trim()}
                              {res.correctAnswer.includes('|') && <span className="ml-1 text-[8px] opacity-40">(+ alternatives)</span>}
                            </>
                          ) : (
                            <span className="italic opacity-60">AI Evaluated Knowledge</span>
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                      <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-indigo-100/80 font-medium leading-relaxed italic">
                        {res.feedback}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


          <Button
            onClick={onExit}
            className="w-full h-16 rounded-[24px] bg-white text-slate-950 font-black uppercase tracking-widest hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5"
          >
            Return to Learning Hub
          </Button>
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

      questions.forEach((q, i) => {
        let qScore = 0;
        let qFeedback = "";

        if (q.question_type === 'mcq') {
          qScore = mcqResults[i];
          qFeedback = qScore > 0 ? "Correct selection." : "Incorrect selection.";
        } else {
          const res = aiResults[aiPtr++];
          qScore = res?.score || 0;
          qFeedback = res?.feedback || "Evaluation complete (Speed optimized).";
          score += qScore;
        }

        breakdown.push({
          question: q.question,
          userAnswer: answers[q.id] || '',
          correctAnswer: q.correct_answer || '',
          score: qScore,
          maxScore: q.marks,
          feedback: qFeedback
        });
      });

      setResultScore(score);
      setResultTotalMarks(totalMarks);
      setResultTimeUsed(timeUsed);
      setResultsBreakdown(breakdown);

      // Save to Supabase
      if (userId && selectedExam) {
        // APPEND email to student_name for Admin Dashboard visibility
        const storageEmail = user?.email || (isFirebaseUser ? firebaseUser?.email : '') || 'Guest';
        const displayNameWithEmail = `${studentName} (${storageEmail})`;

        await (supabase as any).from('exam_submissions').insert({
          exam_id: selectedExam.id,
          user_id: userId,
          student_name: displayNameWithEmail,
          roll_number: rollNumber,
          answers: { ...answers, _results_breakdown: breakdown },
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
        className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden select-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        onContextMenu={e => e.preventDefault()}
        onCopy={e => e.preventDefault()}
        onPaste={e => e.preventDefault()}
        onCut={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
      >
        <ViolationWarning show={security.showWarning} message={security.warningMessage}
          violationCount={security.violationCount} maxViolations={selectedExam?.max_violations || 2} onDismiss={security.dismissWarning}
        />

        {!security.isFullscreen && phase === 'exam' && <FullscreenLostOverlay onReEnter={security.enterFullscreen} />}

        <SubmitConfirmation show={showSubmitDialog} onConfirm={handleSubmitExam}
          onCancel={() => { setShowSubmitDialog(false); setIsAutoSubmit(false); }}
          answeredCount={answeredCount} totalCount={questions.length} isAutoSubmit={isAutoSubmit}
        />

        {/* TOP BAR */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">{selectedExam?.title}</h1>
              <p className="text-slate-500 text-xs">{studentName} • {rollNumber}</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-5 py-2 rounded-xl font-mono text-lg font-bold border ${timeLeft < 300 ? 'bg-red-950/50 text-red-400 border-red-500/30 animate-pulse' :
            timeLeft < 600 ? 'bg-amber-950/50 text-amber-400 border-amber-500/30' :
              'bg-slate-800/50 text-white border-slate-700/30'
            }`}>
            <Clock className="w-5 h-5" /> {formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${security.violationCount > 0 ? 'bg-red-950/30 text-red-400 border-red-500/20' : 'bg-green-950/30 text-green-400 border-green-500/20'
              }`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {security.violationCount}/{selectedExam?.max_violations || 2}
            </div>
            <Button onClick={() => setShowSubmitDialog(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-9 px-5 rounded-lg text-sm font-medium"
            >
              <Send className="w-4 h-4 mr-2" /> Submit
            </Button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex overflow-hidden">
          {/* Question Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-8 py-4 bg-slate-900/40 border-b border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg text-sm font-semibold border border-indigo-500/30">
                  Q{currentQuestion + 1}/{questions.length}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${q.question_type === 'mcq' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                  {q.question_type === 'mcq' ? 'Multiple Choice' : 'Paragraph Answer'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">{q.marks} marks</span>
                <button onClick={() => toggleReview(q.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${markedForReview.has(q.id) ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                ><Flag className="w-3.5 h-3.5" /> {markedForReview.has(q.id) ? 'Marked' : 'Mark'}</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8">
              <AnimatePresence mode="wait">
                <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-10">{q.question}</h2>

                  {q.question_type === 'mcq' && q.options.length > 0 ? (
                    <div className="space-y-3 max-w-2xl">
                      {q.options.map((option, idx) => {
                        const isSelected = answers[q.id] === option;
                        return (
                          <motion.button key={idx} onClick={() => handleAnswer(q.id, option)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-center gap-4 group ${isSelected ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'bg-slate-800/30 border-slate-700/30 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600'
                              }`}
                          >
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                              }`}>
                              {isSelected ? <CircleDot className="w-4 h-4 text-white" /> : <span className="text-xs text-slate-500 font-medium">{String.fromCharCode(65 + idx)}</span>}
                            </div>
                            <span className="text-[15px]">{option}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="max-w-2xl">
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={e => handleAnswer(q.id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full h-40 bg-slate-800/50 border-2 border-slate-700/50 rounded-xl p-5 text-white font-mono text-sm resize-none focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                        spellCheck={false}
                        onPaste={e => e.preventDefault()}
                        onDrop={e => e.preventDefault()}
                        onCopy={e => e.preventDefault()}
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="px-8 py-4 bg-slate-900/40 border-t border-slate-800/50 flex items-center justify-between">
              <Button onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))} disabled={currentQuestion === 0}
                variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 h-10 rounded-lg"
              ><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="text-green-400 font-medium">{answeredCount}</span> answered •
                <span className="text-amber-400 font-medium">{markedForReview.size}</span> marked •
                <span className="text-slate-400 font-medium">{questions.length - answeredCount}</span> remaining
              </div>
              <Button onClick={() => setCurrentQuestion(p => Math.min(questions.length - 1, p + 1))} disabled={currentQuestion === questions.length - 1}
                className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 h-10 rounded-lg"
              >Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </div>

          {/* Question Palette Sidebar */}
          <div className={`${showQuestionPalette ? 'w-72' : 'w-0'} transition-all duration-300 border-l border-slate-800/50 bg-slate-900/50 overflow-hidden flex flex-col`}>
            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-400" /> Questions</h3>
              <button onClick={() => setShowQuestionPalette(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/40" /><span className="text-slate-400">Answered</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/40" /><span className="text-slate-400">Marked</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500/40" /><span className="text-slate-400">Current</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-700/50 border border-slate-600/30" /><span className="text-slate-400">Not Visited</span></div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((question, idx) => {
                  const status = getQuestionStatus(question.id);
                  return (
                    <button key={question.id} onClick={() => setCurrentQuestion(idx)}
                      className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-semibold border transition-all hover:scale-105 ${status === 'current' ? 'bg-indigo-500/30 border-indigo-500/50 text-indigo-300 ring-2 ring-indigo-500/30' :
                        status === 'answered' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                          status === 'marked' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                            'bg-slate-800/50 border-slate-700/30 text-slate-500'
                        }`}
                    >{idx + 1}</button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-slate-800/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-green-400">✅ {answeredCount}</span>
                <span className="text-amber-400">🔖 {markedForReview.size}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {!showQuestionPalette && (
            <button onClick={() => setShowQuestionPalette(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 p-2 rounded-l-lg hover:bg-indigo-500/30"
            ><ChevronLeft className="w-4 h-4" /></button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
