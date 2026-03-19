import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Trophy,
  Send,
  AlertCircle,
  Loader2,
  BookOpen
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
}

export default function Tasks() {
  const { user, firebaseUser, isFirebaseUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Get the correct user ID based on auth provider
  const getUserId = () => {
    if (isFirebaseUser && firebaseUser) {
      return firebaseUser.uid;
    }
    return user?.id;
  };

  useEffect(() => {
    const userId = getUserId();
    console.log('[Tasks] User ID for queries:', userId, { isFirebaseUser, firebaseUser });

    if (userId) {
      fetchTasksAndSubmissions(userId);

      // Set up real-time subscription for submissions
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
            fetchTasksAndSubmissions(userId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isFirebaseUser, firebaseUser]);

  const fetchTasksAndSubmissions = async (userId: string) => {
    try {
      setLoading(true);
      console.log('[Tasks] Fetching for userId:', userId);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('coding_tasks' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('[Tasks] Tasks error:', tasksError);
        throw tasksError;
      }

      console.log('[Tasks] Tasks fetched:', tasksData?.length || 0);
      setTasks(tasksData || []);

      // Fetch user's submissions using correct userId
      if (userId) {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('task_submissions' as any)
          .select('*')
          .eq('user_id', userId);

        if (submissionsError) {
          console.error('[Tasks] Submissions error:', submissionsError);
          throw submissionsError;
        }

        console.log('[Tasks] Submissions fetched:', submissionsData?.length || 0);
        const submissionsMap: Record<string, Submission> = {};
        submissionsData?.forEach((sub: Submission) => {
          submissionsMap[sub.task_id] = sub;
        });
        setSubmissions(submissionsMap);
      }
    } catch (error: any) {
      console.error('[Tasks] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load tasks.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (taskId: string) => {
    const userId = getUserId();
    const answer = answers[taskId];

    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to submit.",
        variant: "destructive"
      });
      return;
    }

    if (!answer || answer.trim().length < 5) {
      toast({
        title: "Invalid Submission",
        description: "Please provide a more detailed answer.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(taskId);
      console.log('[Tasks] Submitting answer for task:', taskId, 'userId:', userId);

      const payload = {
        task_id: taskId,
        user_id: userId,
        answer: answer,
        status: 'pending',
        points_awarded: 0
      };

      console.log('[Tasks] Submission payload:', payload);

      const { error } = await supabase
        .from('task_submissions' as any)
        .insert(payload);

      if (error) {
        console.error('[Tasks] Submission error:', error);
        throw error;
      }

      toast({
        title: "Submitted!",
        description: "Your answer has been sent for review.",
      });

      // Clear answer field
      setAnswers(prev => ({ ...prev, [taskId]: "" }));
      fetchTasksAndSubmissions(userId);
    } catch (error: any) {
      console.error('[Tasks] Submission failed:', error);
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-5xl">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border p-6 rounded-3xl flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-neon-cyan" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Points</p>
                <p className="text-2xl font-black">{totalPoints}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border p-6 rounded-3xl flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-neon-green/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-neon-green" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tasks Approved</p>
                <p className="text-2xl font-black">{completedCount}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border p-6 rounded-3xl flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-neon-magenta/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-neon-magenta" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Tasks</p>
                <p className="text-2xl font-black">{tasks.length}</p>
              </div>
            </motion.div>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-2">Coding Tasks</h1>
            <p className="text-muted-foreground">Complete the challenges assigned by your instructor to earn points.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-neon-cyan mb-4" />
              <p className="text-muted-foreground animate-pulse">Synchronizing with the hub...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h2 className="text-xl font-bold mb-2">No Tasks Available</h2>
              <p className="text-muted-foreground">Your instructor hasn't posted any tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {tasks.map((task, index) => {
                const submission = submissions[task.id];
                const isPending = submission?.status === 'pending';
                const isApproved = submission?.status === 'approved';
                const isDenied = submission?.status === 'denied';

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`p-8 rounded-3xl border-border transition-all duration-300 ${isApproved ? 'bg-neon-green/5 border-neon-green/20' : ''}`}>
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-2xl font-bold">{task.title}</h3>
                            <span className="px-3 py-1 rounded-full bg-secondary text-[10px] font-bold uppercase tracking-widest">
                              {task.points} Points
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap">
                            {task.description}
                          </p>

                          {isApproved ? (
                            <div className="flex items-center gap-2 text-neon-green bg-neon-green/10 w-fit px-4 py-2 rounded-xl border border-neon-green/20">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-bold">Challenge Completed (+{submission.points_awarded} XP)</span>
                            </div>
                          ) : isPending ? (
                            <div className="flex items-center gap-2 text-neon-amber bg-neon-amber/10 w-fit px-4 py-2 rounded-xl border border-neon-amber/20">
                              <Clock className="w-5 h-5" />
                              <span className="font-bold">Awaiting Review</span>
                            </div>
                          ) : isDenied ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-neon-red bg-neon-red/10 w-fit px-4 py-2 rounded-xl border border-neon-red/20">
                                <XCircle className="w-5 h-5" />
                                <span className="font-bold">Attempt Denied</span>
                              </div>
                              <Textarea
                                placeholder="Try again... provide a better solution."
                                value={answers[task.id] || ""}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [task.id]: e.target.value }))}
                                onPaste={(e) => e.preventDefault()}
                                className="min-h-[120px] rounded-2xl bg-background/50"
                              />
                              <Button
                                onClick={() => handleSubmitAnswer(task.id)}
                                disabled={submitting === task.id}
                                className="rounded-xl bg-foreground text-background hover:bg-foreground/90 px-8"
                              >
                                {submitting === task.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Resubmit Answer
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Initialize your response protocol here..."
                                value={answers[task.id] || ""}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [task.id]: e.target.value }))}
                                onPaste={(e) => e.preventDefault()}
                                className="min-h-[120px] rounded-2xl bg-background/50 border-border focus:border-neon-cyan transition-all"
                              />
                              <Button
                                onClick={() => handleSubmitAnswer(task.id)}
                                disabled={submitting === task.id}
                                className="rounded-xl bg-neon-cyan text-black hover:bg-neon-cyan/90 px-8 font-bold"
                              >
                                {submitting === task.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Submit for Review
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
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
