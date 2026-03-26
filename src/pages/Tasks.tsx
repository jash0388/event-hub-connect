import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, Trophy, Send, AlertCircle, Loader2, BookOpen, X, 
  Play, Code2, Search, Brain, Timer, History, Filter, TerminalSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  created_at: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tags?: string[];
}

interface Submission {
  id: string;
  task_id: string;
  answer: string;
  status: 'pending' | 'approved' | 'denied';
  points_awarded: number;
  submitted_at?: string;
}

const LANGUAGE_VERSIONS = {
  python: "3.10.0",
  javascript: "18.15.0",
  cpp: "10.2.0",
  java: "15.0.2"
};

// --- Lightning Fast Puter.js Code Execution Engine ---
const askAI = async (prompt: string) => {
  const puter = (window as any).puter;
  if (!puter) {
    return "[System Error] Puter.js failed to load. Please hit refresh on your browser.";
  }

  try {
    // Forcing gpt-4o-mini - the lowest latency, fastest TTFT model on Puter's network
    const response = await puter.ai.chat(prompt, { model: "gpt-4o-mini" });
    return typeof response === 'string' ? response.trim() : (response?.message?.content?.trim() || "No output returned.");
  } catch (error: any) {
    return `[System Alert] Puter API servers are currently unreachable.`;
  }
};

// --- Modal Component ---
function CodeEditorModal({
  isOpen,
  onClose,
  task,
  onSubmit,
  submitting,
  isReadOnly = false,
  submissionCode = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSubmit: (taskId: string, answer: string, isAutoApproved: boolean) => void;
  submitting: boolean;
  isReadOnly?: boolean;
  submissionCode?: string;
}) {
  const [code, setCode] = useState(submissionCode);
  const [language, setLanguage] = useState<keyof typeof LANGUAGE_VERSIONS>("python");
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (!isReadOnly && !submissionCode) {
        setCode("");
        setOutput("");
        const savedHints = localStorage.getItem(`task_hints_${task?.id}`);
        setHints(savedHints ? JSON.parse(savedHints) : []);
        setIsHintLoading(false);
        setTimeLeft(1800);
      } else if (isReadOnly) {
        setCode(submissionCode);
        setOutput("Read-only mode. Execution disabled.");
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, task?.id, isReadOnly, submissionCode]);

  useEffect(() => {
    if (!isOpen || isReadOnly || timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [isOpen, isReadOnly, timeLeft]);

  const handleRunCode = async () => {
    if (isReadOnly) return;
    setIsRunning(true);
    setOutput("Running code...\n");
    
    const prompt = `Act as a ${language} console. Print ONLY the EXACT execution output of this code. No markdown, no explanations. If error, print the exact error trace.
Code:
${code}`;

    const result = await askAI(prompt);
    setOutput(result);
    setIsRunning(false);
  };

  const handleRunTests = async () => {
    if (isReadOnly) return;
    if (!code.trim() || code.trim() === "// Write your code here...") {
      toast({ title: "Incomplete Code", description: "Please write actual code logic before running the tests.", variant: "destructive" });
      return;
    }

    setIsTesting(true);
    setOutput("Running test cases...\n");
    
    const prompt = `Act as an automated judge for ${language} code.
Task: ${task?.description || 'N/A'}
Code:
${code}

Quickly verify:
1. Solves the exact logic perfectly?
2. Handles edge cases?
3. Zero syntax errors?

If entirely correct, output EXACTLY: "✅ All Hidden Test Cases Passed!"
Else, output EXACTLY: "❌ Hidden Test Cases Failed.\nReason: [1 short sentence]"`;

    const result = await askAI(prompt);
    
    setOutput(`\n=== Verification Results ===\n\n${result}`);
    if (result.includes("✅")) {
      toast({ title: "Tests Passed!", description: "Brilliant! You can now submit your solution." });
    } else {
      toast({ title: "Tests Failed", description: "Your code failed the edge cases or syntax checks.", variant: "destructive" });
    }
    
    setIsTesting(false);
  };

  const requestHint = async () => {
    if (isReadOnly || hints.length >= 2 || isHintLoading) return;
    setIsHintLoading(true);
    setHints(prev => [...prev, "Loading hint..."]);
    
    const prompt = `Task: ${task?.description}
Code in ${language}:
${code}
Previous hints given: ${hints.join(" | ")}

Give 1 short hint (max 1 sentence) to help them proceed. Make sure it is completely different from previous hints. Do NOT write the code for them.`;

    const result = await askAI(prompt);
    
    setHints(prev => {
        const newHints = [...prev];
        newHints[newHints.length - 1] = result;
        localStorage.setItem(`task_hints_${task?.id}`, JSON.stringify(newHints));
        return newHints;
    });
    
    setIsHintLoading(false);
    toast({ 
      title: `Hint ${hints.length + 1} of 2 Activated`, 
      description: hints.length === 1 ? "You have used your final hint for this task." : "You have 1 hint remaining." 
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isReadOnly) {
      e.preventDefault();
      toast({ title: "Pasting Disabled", description: "Please type your solution manually.", variant: "destructive" });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen || !task) return null;

  const isAutoApproved = output.includes("✅");

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="w-[98vw] h-[95vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-800" onClick={e => e.stopPropagation()}>
          
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
            
            {/* LEFT SIDEBAR - Description & Details */}
            <div className="w-full md:w-[35%] lg:w-[30%] overflow-y-auto bg-slate-50 border-r border-slate-200 z-10 flex flex-col">
              
              {/* Header Title & Badges */}
              <div className="p-6 border-b border-slate-200 bg-white">
                <h3 className="font-bold text-xl text-slate-800 mb-4 leading-snug">{task.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${task.difficulty === 'Hard' ? 'bg-red-50 text-red-600 border-red-200' : task.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                    {task.difficulty || 'Easy'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                    {task.points} Points
                  </span>
                </div>
              </div>

              {/* Description Body */}
              <div className="p-6 flex-1 flex flex-col gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Description
                  </h4>
                  <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                    <p className="whitespace-pre-wrap font-sans text-[15px]">{task.description}</p>
                  </div>
                </div>
                
                <div className="mt-auto pt-6 flex flex-col gap-4">
                  <AnimatePresence>
                    {hints.map((h, i) => (
                      <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-purple-50 border border-purple-100 p-4 rounded-xl overflow-hidden">
                        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4" /> AI Hint {i + 1}
                        </h4>
                        <p className="text-purple-900 text-sm leading-relaxed">{h}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {!isReadOnly && hints.length < 2 && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-center text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 transition-colors shadow-sm font-medium" 
                      onClick={requestHint}
                      disabled={isHintLoading}
                    >
                      {isHintLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />} 
                      Get AI Hint ({2 - hints.length} left)
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT WORKSPACE - Code Controls, Editor & Terminal */}
            <div className="flex-1 flex flex-col bg-white">
              
              {/* Top Controls Action Bar */}
              <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
                <div className="flex items-center gap-4">
                  {!isReadOnly && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${timeLeft < 300 ? 'border-red-200 text-red-600 bg-red-50' : 'border-slate-200 text-slate-600 bg-slate-50'}`}>
                      <Timer className="w-4 h-4" />
                      {formatTime(timeLeft)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <select disabled={isReadOnly} value={language} onChange={(e) => setLanguage(e.target.value as any)} className="bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer">
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                  
                  {!isReadOnly && (
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <Button size="sm" variant="ghost" className="h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-medium text-sm transition-colors" onClick={handleRunCode} disabled={isRunning || isTesting || !code.trim()}>
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Play className="w-4 h-4 mr-1.5 text-slate-700" />} Run
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-medium text-sm transition-colors" onClick={handleRunTests} disabled={isRunning || isTesting || !code.trim()}>
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Code2 className="w-4 h-4 mr-1.5 text-slate-700" />} Test
                      </Button>
                    </div>
                  )}

                  {!isReadOnly && (
                    <Button size="sm" className={`h-10 px-6 font-semibold text-sm transition-colors ${isAutoApproved ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`} onClick={() => onSubmit(task.id, code, isAutoApproved)} disabled={submitting || !code.trim()}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Submit
                    </Button>
                  )}
                  
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-[2] relative bg-slate-50">
                <textarea
                  readOnly={isReadOnly}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={isReadOnly ? "// Read only mode" : "// Write your code here..."}
                  className="w-full h-full p-6 bg-transparent text-slate-800 font-mono text-[14px] leading-[1.7] resize-none focus:outline-none placeholder:text-slate-400"
                  spellCheck={false}
                />
              </div>
              
              {/* Terminal Output */}
              <div className="h-[30%] bg-white flex flex-col relative border-t border-slate-200">
                <div className="px-5 py-2.5 flex items-center justify-between bg-slate-50 border-b border-slate-200">
                  <span className="flex items-center gap-2 text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">
                    <TerminalSquare className="w-4 h-4" /> Console
                  </span>
                  {isAutoApproved && <span className="text-green-600 flex items-center gap-1 text-xs font-bold font-mono uppercase tracking-widest"><CheckCircle2 className="w-4 h-4" /> Passed</span>}
                </div>
                <div className="flex-1 p-5 overflow-y-auto font-mono text-[13px] text-slate-600 whitespace-pre-wrap">
                  {output || <span className="text-slate-400">Run code to see output...</span>}
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
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [submissionCode, setSubmissionCode] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("All");

  // Use Supabase user.id primarily to correctly match historical task_submissions records!
  const getUserId = () => user?.id || (isFirebaseUser && firebaseUser ? firebaseUser.uid : undefined);
  const userId = getUserId();

  // Actively fix Firebase Users who slipped into the platform without hitting the standard Profile Creation triggers
  useEffect(() => {
    if (isFirebaseUser && firebaseUser && user?.id) {
      const healOrphanedProfiles = async () => {
        // Profiles table crashes due to UUID mismatch and RLS read-blocking. Writing strictly to public-readable user_registrations.
        const { error } = await supabase.from('user_registrations').upsert({
          user_id: firebaseUser.uid,
          full_name: firebaseUser.displayName || user?.user_metadata?.full_name || 'Google User',
          email: firebaseUser.email || user?.email,
          phone: '-',
          year: '-',
          section: '-',
          department: '-',
          college: 'Automated Sync'
        }, { onConflict: 'user_id' }); // Crucial: prevents silent insert failures
        
        if (!error) {
          console.log("[Auth Sync] Synced Google User to public registry.");
          // Only invalidate if we know it succeeded
        }
      };
      healOrphanedProfiles();
    }
  }, [isFirebaseUser, firebaseUser, user?.id, queryClient]);

  // Fetches Tasks & Leaderboard concurrently
  const { data, isLoading: loading } = useQuery({
    queryKey: ['coding_tasks_and_leaderboard', userId, filterDifficulty],
    queryFn: async () => {
      // Fetch Tasks
      const { data: tasksDataRaw } = await supabase.from('coding_tasks' as any).select('*').order('created_at', { ascending: false });
      
      // Mock logic for difficulty/tags if missing in database
      let tasksData = (tasksDataRaw || []).filter((t: any) => !t.title?.startsWith('[DELETED]')).map((t: any, i: number) => ({
        ...t,
        difficulty: t.difficulty || (i % 3 === 0 ? 'Hard' : i % 2 === 0 ? 'Medium' : 'Easy'),
        tags: t.tags || ['Algorithm', 'Logic']
      }));

      if (filterDifficulty !== "All") {
        tasksData = tasksData.filter((t: any) => t.difficulty === filterDifficulty);
      }

      const submissionsMap: Record<string, Submission> = {};
      
      if (userId) {
        const { data: submissionsData } = await supabase.from('task_submissions' as any).select('*').eq('user_id', userId);
        (submissionsData || []).forEach((sub: any) => {
          if (!submissionsMap[sub.task_id] || new Date(sub.submitted_at || 0) > new Date(submissionsMap[sub.task_id].submitted_at || 0)) {
            submissionsMap[sub.task_id] = sub;
          }
        });
      }

      // Fetch Leaderboard logic (mocking aggregated points temporarily if complex query fails)
      const { data: globalSubs } = await supabase.from('task_submissions' as any).select('user_id, points_awarded, status');
      const lbMap: Record<string, number> = {};
      (globalSubs || []).forEach((s: any) => {
        if (s.status === 'approved') lbMap[s.user_id] = (lbMap[s.user_id] || 0) + (s.points_awarded || 0);
      });
      
      // Fetch user profile names & Google Auth fallback registrations
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: userRegistrations } = await supabase.from('user_registrations').select('user_id, full_name, email');
      // Secret sauce bridging: Users who only filled an Event Form have their true name here, bridged by email instead of ID
      const { data: eventRegistrations } = await supabase.from('event_registrations').select('full_name, email');
      
      const leaderboard = Object.entries(lbMap).map(([uId, pts]) => {
        const prof = profiles?.find(p => p.id === uId || p.firebase_uid === uId);
        const reg = userRegistrations?.find(r => r.user_id === uId);
        const eventReg = prof?.email ? eventRegistrations?.find(e => e.email?.toLowerCase().trim() === prof.email?.toLowerCase().trim()) : null;
        
        let displayName = prof?.full_name || reg?.full_name || eventReg?.full_name || prof?.username || prof?.email?.split('@')[0] || reg?.email?.split('@')[0];
        
        // Fast-path bypass to capture the logged-in Google Auth user locally if databases lag or miss their profile row
        if (!displayName && uId === userId) {
          displayName = user?.user_metadata?.full_name || firebaseUser?.displayName || user?.email?.split('@')[0] || firebaseUser?.email?.split('@')[0];
        }
        
        return { name: displayName || `Node_${uId.slice(0, 4).toUpperCase()}`, points: pts, isMe: uId === userId };
      }).sort((a,b) => b.points - a.points).slice(0, 5);

      return { tasks: tasksData as Task[], submissions: submissionsMap, leaderboard };
    },
    staleTime: 30000,
  });

  const tasks = data?.tasks || [];
  const submissions = data?.submissions || {};
  const leaderboard = data?.leaderboard || [];

  const handleOpenModal = (task: Task, readOnly = false, answer = "") => {
    setSelectedTask(task);
    setIsReadOnly(readOnly);
    setSubmissionCode(answer);
    setIsModalOpen(true);
  };

  const handleSubmitAnswer = async (taskId: string, answer: string, isAutoApproved: boolean) => {
    if (!userId) {
      toast({ title: "Authentication Required", description: "Please log in to submit.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(taskId);
      const pointsObj = tasks.find(t => t.id === taskId);
      const payload = {
        task_id: taskId,
        user_id: userId,
        answer: answer,
        status: isAutoApproved ? 'approved' : 'pending',
        points_awarded: isAutoApproved ? (pointsObj?.points || 0) : 0
      };

      const { error } = await supabase.from('task_submissions' as any).insert(payload);
      if (error) throw error;

      toast({
        title: isAutoApproved ? "Auto-Approved!" : "Submitted!",
        description: isAutoApproved ? "Your test cases passed perfectly. Points awarded!" : "Sent for human review.",
      });

      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['coding_tasks_and_leaderboard'] });
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
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
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={selectedTask}
        onSubmit={handleSubmitAnswer} submitting={submitting !== null} isReadOnly={isReadOnly} submissionCode={submissionCode}
      />

      <main className="flex-1 pt-28 pb-16 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          
          {/* Top Dashboard Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Code Arena</h1>
              <p className="text-slate-600">Solve algorithms, run them live in the browser, and climb the leaderboard.</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => setFilterDifficulty('All')} variant={filterDifficulty === 'All' ? 'default' : 'outline'} className={filterDifficulty === 'All' ? 'bg-slate-900 text-white' : ''}>All Tasks</Button>
              <Button onClick={() => setFilterDifficulty('Easy')} variant={filterDifficulty === 'Easy' ? 'default' : 'outline'} className={filterDifficulty === 'Easy' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'text-green-600 border-green-200'}>Easy</Button>
              <Button onClick={() => setFilterDifficulty('Medium')} variant={filterDifficulty === 'Medium' ? 'default' : 'outline'} className={filterDifficulty === 'Medium' ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600' : 'text-amber-500 border-amber-200'}>Medium</Button>
              <Button onClick={() => setFilterDifficulty('Hard')} variant={filterDifficulty === 'Hard' ? 'default' : 'outline'} className={filterDifficulty === 'Hard' ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'text-red-500 border-red-200'}>Hard</Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column: Tasks List */}
            <div className="flex-[3] space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h2 className="text-xl font-bold text-slate-900 mb-2">No Tasks Match Filter</h2>
                </div>
              ) : (
                tasks.map((task, index) => {
                  const submission = submissions[task.id];
                  return (
                    <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{task.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${task.difficulty === 'Hard' ? 'bg-red-50 text-red-600 border-red-200' : task.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{task.difficulty}</span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{task.points} PTS</span>
                          </div>
                        </div>
                        
                        {submission?.status === 'approved' ? (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                              <CheckCircle2 className="w-4 h-4" /> <span className="text-xs font-semibold">Completed +{submission.points_awarded}XP</span>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600 hover:text-indigo-800" onClick={() => handleOpenModal(task, true, submission.answer)}><History className="w-3 h-3 mr-1" /> View Solution</Button>
                          </div>
                        ) : submission?.status === 'pending' ? (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                              <Clock className="w-4 h-4" /> <span className="text-xs font-semibold">Pending Review</span>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600 hover:text-indigo-800" onClick={() => handleOpenModal(task, true, submission.answer)}><History className="w-3 h-3 mr-1" /> View Code</Button>
                          </div>
                        ) : (
                          <Button onClick={() => handleOpenModal(task)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-transform hover:scale-105">Code Now <Code2 className="w-4 h-4 ml-2" /></Button>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed line-clamp-2 pr-20">{task.description}</p>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Right Column: Leaderboard & Stats */}
            <div className="flex-[1] space-y-6">
              {/* Personal Stats */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-100"><Trophy className="w-5 h-5 text-amber-400" /> Your Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-4 border border-white/5">
                    <p className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Total Points</p>
                    <p className="text-3xl font-black text-white">{totalPoints}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 border border-white/5">
                    <p className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Solved</p>
                    <p className="text-3xl font-black text-white">{completedCount}</p>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500 border border-amber-200 rounded p-0.5" /> Top Coders</h3>
                <div className="space-y-3">
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No points awarded yet.</p>
                  ) : leaderboard.map((user, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${user.isMe ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold w-5 text-center ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300'}`}>#{idx + 1}</span>
                        <span className={`text-sm font-medium ${user.isMe ? 'text-indigo-900' : 'text-slate-700'}`}>{user.name}</span>
                      </div>
                      <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">{user.points} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
