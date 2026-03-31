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
  TriangleAlert, ShieldAlert, Monitor, Zap, ClipboardList,
  ArrowLeft, User, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ============================================================
// TYPES
// ============================================================
interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  question_type: 'mcq' | 'paragraph';
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
}: {
  exams: Exam[];
  loading: boolean;
  onSelectExam: (exam: Exam) => void;
  completedExamIds: Set<string>;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Exam Portal</h1>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-white mb-3"
          >
            Available Tests
          </motion.h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Select a test to begin. Each test is timed and proctored. Make sure you're ready before starting.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800/50">
            <ClipboardList className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Tests Available</h3>
            <p className="text-slate-500">Check back later for upcoming tests.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam, idx) => {
              const isCompleted = completedExamIds.has(exam.id);
              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <button
                    onClick={() => !isCompleted && onSelectExam(exam)}
                    disabled={isCompleted}
                    className={`w-full text-left p-6 rounded-2xl border transition-all duration-200 group ${
                      isCompleted
                        ? 'bg-slate-800/30 border-slate-700/20 cursor-not-allowed opacity-60'
                        : 'bg-slate-900/50 border-slate-700/30 hover:bg-slate-800/50 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-500/20">
                            Test {idx + 1}
                          </span>
                          {isCompleted && (
                            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold border border-green-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ended
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                          {exam.title}
                        </h3>
                        {exam.description && (
                          <p className="text-slate-400 text-sm line-clamp-2">{exam.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{exam.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Max {exam.max_violations} violations</span>
                        </div>
                        {!isCompleted && (
                          <ChevronRight className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-t-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{exam.title}</h1>
                {exam.description && <p className="text-indigo-100 text-sm mt-1">{exam.description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-200" />
                <span className="text-white text-sm font-medium">{exam.duration_minutes} Minutes</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-300" />
                <span className="text-white text-sm font-medium">Max {exam.max_violations} Violations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-b-2xl p-8">
          {/* Student Info Form */}
          <div className="mb-8">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">Full Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 rounded-xl h-12"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">Roll Number *</label>
                <Input
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="Enter your roll number"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 rounded-xl h-12"
                />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Exam Instructions
            </h3>
            <div className="space-y-3">
              {instructions.map((instruction, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/30">{i + 1}</span>
                  <span className="text-slate-300 leading-relaxed">{instruction}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold text-sm">Security Notice</p>
                <p className="text-red-200/70 text-xs mt-1 leading-relaxed">
                  This exam uses advanced proctoring. Tab switches, clipboard usage, and developer tools are monitored.
                  The exam auto-submits after {exam.max_violations} violations.
                </p>
              </div>
            </div>
          </div>

          {/* Agreement & Start */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group" onClick={() => setAgreedToTerms(!agreedToTerms)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${agreedToTerms ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-indigo-400'}`}>
                {agreedToTerms && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-slate-300 text-sm leading-relaxed">
                I have read and understood all instructions. I agree to follow the exam rules and understand that any violations will be recorded and the exam will auto-submit after {exam.max_violations} violations.
              </span>
            </label>

            <Button
              disabled={!canStart}
              onClick={() => onStart(name.trim(), rollNumber.trim())}
              className={`w-full h-14 text-lg font-semibold rounded-xl transition-all duration-300 ${
                canStart
                  ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 hover:from-indigo-600 hover:via-violet-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Maximize className="w-5 h-5 mr-2" />
              Enter Fullscreen & Start Exam
            </Button>
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
        <div className={`max-w-lg w-full rounded-2xl border shadow-2xl backdrop-blur-xl p-5 ${
          severity === 'critical' ? 'bg-red-950/95 border-red-500/50 shadow-red-500/20' : 'bg-amber-950/95 border-amber-500/50 shadow-amber-500/20'
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

// ============================================================
// SUBMIT CONFIRMATION
// ============================================================
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
function ResultsScreen({ score, totalMarks, answeredCount, totalQuestions, violations, timeUsed, examTitle, onExit }: {
  score: number; totalMarks: number; answeredCount: number; totalQuestions: number;
  violations: Violation[]; timeUsed: number; examTitle: string; onExit: () => void;
}) {
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className={`p-8 text-center relative overflow-hidden ${percentage >= 40 ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-rose-600'}`}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/20"
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white">Exam Submitted!</h2>
            <p className="text-white/80 mt-2">{examTitle}</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/30">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Score</p>
                <p className="text-2xl font-bold text-white">{score}/{totalMarks}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/30">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Percentage</p>
                <p className={`text-2xl font-bold ${percentage >= 40 ? 'text-green-400' : 'text-red-400'}`}>{percentage}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/30">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Time Used</p>
                <p className="text-2xl font-bold text-white">{formatTime(timeUsed)}</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${violations.length > 0 ? 'bg-red-950/30 border-red-500/20' : 'bg-green-950/30 border-green-500/20'}`}>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Violations</p>
                <p className={`text-2xl font-bold ${violations.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{violations.length}</p>
              </div>
            </div>

            {violations.length > 0 && (
              <div className="mb-8">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Violation Log
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                  {violations.map((v, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 flex items-start gap-3">
                      <span className="text-xs text-slate-500 font-mono flex-shrink-0">{v.timestamp.toLocaleTimeString()}</span>
                      <span className="text-slate-300 text-sm">{v.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={onExit} className="w-full h-12 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium">
              Return to Test Portal
            </Button>
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
  const { user, firebaseUser, isFirebaseUser } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase] = useState<'select' | 'info' | 'exam' | 'results'>('select');
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
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

  // Fetch available exams
  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      try {
        const { data, error } = await (supabase as any).from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (error) throw error;
        setExams(data || []);

        // Fetch completed exams for this user
        if (userId) {
          const { data: subs } = await (supabase as any).from('exam_submissions').select('exam_id').eq('user_id', userId);
          if (subs) {
            setCompletedExamIds(new Set(subs.map((s: any) => s.exam_id)));
          }
        }
      } catch (err: any) {
        console.error('Error fetching exams:', err);
        // If table doesn't exist yet, show empty state
        setExams([]);
      }
      setLoadingExams(false);
    };
    fetchExams();
  }, [userId]);

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
    setSelectedExam(exam);
    setLoadingQuestions(true);
    try {
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
    setShowSubmitDialog(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeUsed = Math.floor((Date.now() - startTime) / 1000);

    // Auto-grade MCQ questions
    let score = 0;
    let totalMarks = 0;
    questions.forEach(q => {
      totalMarks += q.marks;
      if (q.question_type === 'mcq' && q.correct_answer) {
        if (answers[q.id]?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
          score += q.marks;
        }
      }
      // Paragraph questions are graded manually by admin
    });

    setResultScore(score);
    setResultTotalMarks(totalMarks);
    setResultTimeUsed(timeUsed);

    // Save to Supabase
    if (userId && selectedExam) {
      try {
        await (supabase as any).from('exam_submissions').insert({
          exam_id: selectedExam.id,
          user_id: userId,
          student_name: studentName,
          roll_number: rollNumber,
          answers: answers,
          score: score,
          total_marks: totalMarks,
          violations: security.violationCount,
          time_used_seconds: timeUsed,
          status: isAutoSubmit ? 'auto_submitted' : 'completed',
        });
      } catch (err) {
        console.error('Error saving submission:', err);
      }
    }

    security.exitFullscreen();
    setPhase('results');
  }, [security, startTime, questions, answers, userId, selectedExam, studentName, rollNumber, isAutoSubmit]);

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
    return <TestSelectionScreen exams={exams} loading={loadingExams || loadingQuestions} onSelectExam={handleSelectExam} completedExamIds={completedExamIds} />;
  }

  // === INFO PHASE ===
  if (phase === 'info' && selectedExam) {
    return <StudentInfoForm exam={selectedExam} onStart={handleStartExam} />;
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

        <div className={`flex items-center gap-2 px-5 py-2 rounded-xl font-mono text-lg font-bold border ${
          timeLeft < 300 ? 'bg-red-950/50 text-red-400 border-red-500/30 animate-pulse' :
          timeLeft < 600 ? 'bg-amber-950/50 text-amber-400 border-amber-500/30' :
          'bg-slate-800/50 text-white border-slate-700/30'
        }`}>
          <Clock className="w-5 h-5" /> {formatTime(timeLeft)}
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            security.violationCount > 0 ? 'bg-red-950/30 text-red-400 border-red-500/20' : 'bg-green-950/30 text-green-400 border-green-500/20'
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
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                q.question_type === 'mcq' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {q.question_type === 'mcq' ? 'Multiple Choice' : 'Paragraph Answer'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">{q.marks} marks</span>
              <button onClick={() => toggleReview(q.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  markedForReview.has(q.id) ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
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
                          className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-center gap-4 group ${
                            isSelected ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'bg-slate-800/30 border-slate-700/30 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
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
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-semibold border transition-all hover:scale-105 ${
                      status === 'current' ? 'bg-indigo-500/30 border-indigo-500/50 text-indigo-300 ring-2 ring-indigo-500/30' :
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
