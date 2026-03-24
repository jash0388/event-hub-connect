import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Clock,
  Trophy,
  Send,
  AlertCircle,
  Loader2,
  BookOpen,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  created_at: string;
}

interface Submission {
  id: string;
  task_id: string;
  answer: string;
  status: 'pending' | 'approved' | 'denied';
  points_awarded: number;
  submitted_at?: string;
}

// Fullscreen Modal Component - Light Theme
function CodeEditorModal({
  isOpen,
  onClose,
  task,
  onSubmit,
  submitting,
  onRunCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSubmit: (taskId: string, answer: string) => void;
  submitting: boolean;
  onRunCode: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    setCode("");
  }, [task?.id]);

  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-[95vw] h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar - White */}
          <div className="flex items-center justify-end px-6 py-4 bg-white border-b border-slate-200 gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-100 text-slate-900 text-sm px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all hover:scale-105"
              onClick={() => onRunCode(code)}
            >
              Run Code
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold transition-all hover:scale-105"
              onClick={() => onSubmit(task.id, code)}
              disabled={submitting || !code.trim()}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Main Content - Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Problem Description (40%) - White Background */}
            <div className="w-[40%] min-w-[350px] overflow-y-auto bg-white border-r border-slate-200">
              <div className="p-6 space-y-6">
                {/* Title & Badges */}
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">{task.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                      Easy
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                      {task.points} Points
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Description</h4>
                  <p className="text-slate-700 leading-relaxed text-base whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>

                {/* Example Box - Light Gray */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Example</h4>
                  <p className="text-slate-800 leading-relaxed font-mono text-sm">
                    {task.description.substring(0, 200)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Code Editor (60%) - Light Theme */}
            <div className="flex-1 flex flex-col bg-slate-50">
              <div className="flex-1 p-4">
                <div className="h-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <div className="h-full" style={{ background: '#ffffff' }}>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="// Write your code here..."
                      className="w-full h-full p-4 bg-transparent text-slate-900 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                      style={{
                        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                      }}
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Tasks() {
  const { user, firebaseUser, isFirebaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [codeAnswer, setCodeAnswer] = useState("");

  const getUserId = () => {
    if (isFirebaseUser && firebaseUser) {
      return firebaseUser.uid;
    }
    return user?.id;
  };

  const userId = getUserId();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['coding_tasks', userId],
    queryFn: async () => {
      const { data: tasksData, error: taskError } = await supabase
        .from('coding_tasks' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const submissionsMap: Record<string, Submission> = {};
      
      if (userId) {
        const { data: submissionsData } = await supabase
          .from('task_submissions' as any)
          .select('*')
          .eq('user_id', userId)
          .limit(200);
          
        (submissionsData || []).forEach((sub: any) => {
          if (!submissionsMap[sub.task_id] ||
            new Date(sub.submitted_at || 0) > new Date(submissionsMap[sub.task_id].submitted_at || 0)) {
            submissionsMap[sub.task_id] = sub;
          }
        });
      }

      return { tasks: (tasksData || []) as Task[], submissions: submissionsMap };
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const tasks = data?.tasks || [];
  const submissions = data?.submissions || {};

  useEffect(() => {
    if (userId) {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_submissions',
            filter: `user_id=eq.${userId}`
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['coding_tasks', userId] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, queryClient]);

  const handleOpenModal = (task: Task) => {
    setSelectedTask(task);
    setCodeAnswer("");
    setIsModalOpen(true);
  };

  const handleSubmitAnswer = async (taskId: string, answer?: string) => {
    const userId = getUserId();
    const finalAnswer = answer || codeAnswer;

    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit answers.",
        variant: "destructive"
      });
      return;
    }

    if (!finalAnswer || finalAnswer.trim().length < 5) {
      toast({
        title: "Invalid Submission",
        description: "Please provide a more detailed answer.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(taskId);

      const payload = {
        task_id: taskId,
        user_id: userId,
        answer: finalAnswer,
        status: 'pending',
        points_awarded: 0
      };

      const { error } = await supabase
        .from('task_submissions' as any)
        .insert(payload);

      if (error) throw error;

      toast({
        title: "Submitted!",
        description: "Your answer has been sent for review.",
      });

      setIsModalOpen(false);
      setCodeAnswer("");
      queryClient.invalidateQueries({ queryKey: ['coding_tasks', userId] });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(null);
    }
  };

  const totalPoints = Object.values(submissions).reduce((acc, sub) => acc + (sub.points_awarded || 0), 0);
  const completedCount = Object.values(submissions).filter(sub => sub.status === 'approved').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-['Inter',system-ui,sans-serif]">
      <Header />

      <CodeEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSubmit={handleSubmitAnswer}
        submitting={submitting !== null}
        onRunCode={async (code: string) => {
          if (!code.trim()) {
            toast({
              title: "No Code",
              description: "Write some code before running.",
              variant: "destructive"
            });
            return;
          }
          try {
            await navigator.clipboard.writeText(code);
            toast({
              title: "Code Copied!",
              description: "Paste it in the compiler and run.",
            });
            window.open("https://www.programiz.com/python-programming/online-compiler/", "_blank");
          } catch (err) {
            toast({
              title: "Failed to Copy",
              description: "Please copy your code manually.",
              variant: "destructive"
            });
          }
        }}
      />

      <main className="flex-1 pt-28 pb-16 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Points</p>
                <p className="text-2xl font-bold text-slate-900">{totalPoints}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
                <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</p>
                <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
              </div>
            </motion.div>
          </div>

          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Coding Tasks</h1>
            <p className="text-slate-600">Complete the challenges assigned by your instructor to earn points.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-600 mb-4" />
              <p className="text-slate-500 animate-pulse">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">No Tasks Available</h2>
              <p className="text-slate-600">Your instructor hasn't posted any tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => {
                const submission = submissions[task.id];
                const isPending = submission?.status === 'pending';
                const isApproved = submission?.status === 'approved';

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{task.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            Easy
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700">
                            {task.points} Points
                          </span>
                        </div>
                      </div>
                      {isApproved ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm font-semibold">Completed +{submission.points_awarded} XP</span>
                        </div>
                      ) : isPending ? (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-semibold">Pending Review</span>
                        </div>
                      ) : null}
                    </div>

                    <p className="text-slate-600 leading-relaxed mb-4 line-clamp-2">
                      {task.description}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Example</p>
                      <p className="text-sm text-slate-700 font-mono">
                        {task.description.substring(0, 150)}...
                      </p>
                    </div>

                    {!isApproved && !isPending && (
                      <Button
                        onClick={() => handleOpenModal(task)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Solve Problem
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
