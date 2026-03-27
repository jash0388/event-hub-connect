import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Bug, Zap, Trophy, Timer, CheckCircle2, XCircle, Star, Flame, Target, Award, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ==================== DATA ====================
const DAILY_QUIZZES = [
  { q: "What is the time complexity of binary search?", opts: ["O(n)", "O(log n)", "O(n²)", "O(1)"], ans: 1 },
  { q: "Which data structure uses LIFO?", opts: ["Queue", "Array", "Stack", "Linked List"], ans: 2 },
  { q: "What does SQL stand for?", opts: ["Simple Query Language", "Structured Query Language", "Standard Query Logic", "System Query Language"], ans: 1 },
  { q: "Which sorting algorithm has the best average case?", opts: ["Bubble Sort", "Merge Sort", "Selection Sort", "Insertion Sort"], ans: 1 },
  { q: "What is the space complexity of a recursive fibonacci?", opts: ["O(1)", "O(n)", "O(n²)", "O(2ⁿ)"], ans: 1 },
  { q: "Which protocol is used for secure web browsing?", opts: ["HTTP", "FTP", "HTTPS", "SMTP"], ans: 2 },
  { q: "What is a deadlock in OS?", opts: ["Fast execution", "Circular waiting", "Memory leak", "Buffer overflow"], ans: 1 },
  { q: "Which layer of OSI handles routing?", opts: ["Physical", "Data Link", "Network", "Transport"], ans: 2 },
  { q: "What does DOM stand for?", opts: ["Document Object Model", "Data Object Method", "Digital Output Mode", "Document Order Map"], ans: 0 },
  { q: "What is the worst case of QuickSort?", opts: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"], ans: 2 },
  { q: "Which keyword is used for inheritance in Java?", opts: ["implements", "inherits", "extends", "super"], ans: 2 },
  { q: "What is a primary key?", opts: ["Any column", "A unique identifier", "A foreign reference", "An index"], ans: 1 },
  { q: "What does API stand for?", opts: ["Application Programming Interface", "Applied Program Integration", "Automated Protocol Interface", "Application Process Input"], ans: 0 },
  { q: "Which is NOT a JavaScript data type?", opts: ["Boolean", "Float", "String", "Undefined"], ans: 1 },
  { q: "What is polymorphism?", opts: ["Data hiding", "Multiple forms", "Single instance", "Memory management"], ans: 1 },
  { q: "TCP is a ____ protocol", opts: ["Connectionless", "Connection-oriented", "Stateless", "Broadcast"], ans: 1 },
  { q: "What is normalization in DBMS?", opts: ["Adding redundancy", "Removing redundancy", "Creating tables", "Dropping indexes"], ans: 1 },
  { q: "Which is a non-linear data structure?", opts: ["Array", "Stack", "Tree", "Queue"], ans: 2 },
  { q: "What does OOP stand for?", opts: ["Object Oriented Programming", "Open Operation Protocol", "Ordered Object Process", "Output Oriented Program"], ans: 0 },
  { q: "What is the base case in recursion?", opts: ["First call", "Largest input", "Termination condition", "Loop start"], ans: 2 },
];

const BUG_HUNTS = [
  { code: `function sum(arr) {\n  let total = 0;\n  for (let i = 0; i <= arr.length; i++) {\n    total += arr[i];\n  }\n  return total;\n}`, bug: "Off-by-one error: i <= arr.length should be i < arr.length", hint: "Look at the loop boundary condition" },
  { code: `def is_palindrome(s):\n    return s = s[::-1]`, bug: "Assignment (=) used instead of comparison (==)", hint: "Look at the comparison operator" },
  { code: `int[] findMax(int[] arr) {\n  int max = 0;\n  for(int i=0; i<arr.length; i++){\n    if(arr[i] > max)\n      max = arr[i];\n  }\n  return max;\n}`, bug: "Return type is int[] but should be int. Also max=0 fails for negative arrays", hint: "Check the return type and initial value" },
  { code: `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) +\n         fibonacci(n-3);\n}`, bug: "fibonacci(n-3) should be fibonacci(n-2)", hint: "Check the recursive calls" },
  { code: `class Stack:\n  def __init__(self):\n    self.items = []\n  def pop(self):\n    return self.items.pop(0)`, bug: "pop(0) removes from front (Queue behavior). Should be pop() for Stack (LIFO)", hint: "Which end should a stack remove from?" },
  { code: `SELECT name, age\nFROM students\nWHERE age = NULL`, bug: "Cannot use = with NULL. Should be WHERE age IS NULL", hint: "How do you compare NULL in SQL?" },
];

const GUESS_OUTPUTS = [
  { code: `console.log(typeof null)`, opts: ["null", "undefined", "object", "error"], ans: 2, explanation: "typeof null returns 'object' — a famous JavaScript bug!" },
  { code: `print(2 ** 3 ** 2)`, opts: ["64", "512", "8", "81"], ans: 1, explanation: "** is right-associative: 3**2=9, then 2**9=512" },
  { code: `console.log(0.1 + 0.2 == 0.3)`, opts: ["true", "false", "error", "undefined"], ans: 1, explanation: "Floating point precision! 0.1+0.2 = 0.30000000000000004" },
  { code: `System.out.println(10 + 20 + "30")`, opts: ["102030", "3030", "60", "error"], ans: 1, explanation: "10+20=30 (int math), then 30+'30'='3030' (string concat)" },
  { code: `console.log("5" - 3)`, opts: ["53", "2", "NaN", "error"], ans: 1, explanation: "The - operator coerces '5' to number: 5-3=2" },
  { code: `print(bool("False"))`, opts: ["False", "True", "0", "error"], ans: 1, explanation: "Any non-empty string is truthy in Python, even 'False'!" },
  { code: `console.log([] == ![])`, opts: ["true", "false", "error", "undefined"], ans: 0, explanation: "![] is false, [] == false coerces both to 0. 0 == 0 is true!" },
  { code: `x = [1, 2, 3]\ny = x\ny.append(4)\nprint(len(x))`, opts: ["3", "4", "error", "None"], ans: 1, explanation: "y = x creates a reference, not a copy. Both point to the same list." },
];

// Daily shuffle helper: deterministic shuffle based on date
const getDailySeed = () => {
  const today = new Date().toDateString();
  return today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
};

const shuffleDaily = <T,>(arr: T[], count: number): T[] => {
  const seed = getDailySeed();
  const shuffled = [...arr].sort((a, b) => {
    const ha = (seed * 31 + arr.indexOf(a) * 17) % 100;
    const hb = (seed * 31 + arr.indexOf(b) * 17) % 100;
    return ha - hb;
  });
  return shuffled.slice(0, count);
};

// Auto-reset daily progress for guess & bugs
const checkDailyReset = () => {
  const today = new Date().toDateString();
  const lastGuessDay = localStorage.getItem('guess_last_day');
  const lastBugDay = localStorage.getItem('bugs_last_day');
  if (lastGuessDay !== today) {
    localStorage.removeItem('guess_answered_set');
    localStorage.setItem('guess_last_day', today);
  }
  if (lastBugDay !== today) {
    localStorage.removeItem('bugs_found_set');
    localStorage.setItem('bugs_last_day', today);
  }
};

const getDailyQuizzes = () => shuffleDaily(DAILY_QUIZZES, 5);
const getDailyBugs = () => shuffleDaily(BUG_HUNTS, 4);
const getDailyGuess = () => shuffleDaily(GUESS_OUTPUTS, 5);

// ==================== ACHIEVEMENT BADGES ====================
interface Badge { id: string; name: string; desc: string; icon: string; earned: boolean; }

const checkBadges = (): Badge[] => {
  const quizDone = localStorage.getItem('quiz_completed_today') === new Date().toDateString();
  const bugsDone = parseInt(localStorage.getItem('bugs_found') || '0');
  const guessCorrect = parseInt(localStorage.getItem('guess_correct') || '0');
  const quizStreak = parseInt(localStorage.getItem('quiz_streak') || '0');
  const totalXP = parseInt(localStorage.getItem('mini_xp') || '0');
  
  return [
    { id: 'first_quiz', name: 'Quiz Rookie', desc: 'Complete your first daily quiz', icon: '🧠', earned: quizDone || quizStreak > 0 },
    { id: 'bug_hunter', name: 'Bug Hunter', desc: 'Find 3 bugs', icon: '🐛', earned: bugsDone >= 3 },
    { id: 'bug_slayer', name: 'Bug Slayer', desc: 'Find all 6 bugs', icon: '⚔️', earned: bugsDone >= 6 },
    { id: 'oracle', name: 'Code Oracle', desc: 'Guess 5 outputs correctly', icon: '🔮', earned: guessCorrect >= 5 },
    { id: 'streak_3', name: 'On Fire', desc: '3-day quiz streak', icon: '🔥', earned: quizStreak >= 3 },
    { id: 'xp_50', name: 'Rising Star', desc: 'Earn 10 points from activities', icon: '⭐', earned: totalXP >= 10 },
    { id: 'xp_100', name: 'Champion', desc: 'Earn 20 points from activities', icon: '👑', earned: totalXP >= 20 },
    { id: 'perfectionist', name: 'Perfectionist', desc: 'Score 5/5 on daily quiz', icon: '💎', earned: localStorage.getItem('perfect_quiz') === 'true' },
  ];
};

// ==================== COMPONENTS ====================
type GameTab = 'quiz' | 'bugs' | 'guess' | 'badges';

const MiniGames: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameTab>('quiz');
  const [liveXP, setLiveXP] = useState(parseInt(localStorage.getItem('mini_xp') || '0'));

  // Reset progress if new day
  useEffect(() => { checkDailyReset(); }, []);

  // Poll localStorage every 500ms to show live XP
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveXP(parseInt(localStorage.getItem('mini_xp') || '0'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const games: { id: GameTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'quiz', label: 'Daily Quiz', icon: <Brain className="w-4 h-4" />, color: 'bg-violet-500' },
    { id: 'bugs', label: 'Bug Hunt', icon: <Bug className="w-4 h-4" />, color: 'bg-rose-500' },
    { id: 'guess', label: 'Guess Output', icon: <Zap className="w-4 h-4" />, color: 'bg-amber-500' },
    { id: 'badges', label: 'Badges', icon: <Trophy className="w-4 h-4" />, color: 'bg-emerald-500' },
  ];

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quick Challenges</h2>
            <p className="text-xs text-slate-500">Daily brain teasers, bug hunts, and more</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-2">
          <Star className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-bold text-violet-700">{liveXP}</span>
          <span className="text-xs text-violet-500">pts</span>
        </div>
      </div>

      {/* Game Tabs */}
      <div className="flex gap-2 mb-4">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGame(g.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeGame === g.id
                ? `${g.color} text-white shadow-md`
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>

      {/* Game Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeGame} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeGame === 'quiz' && <DailyQuiz />}
          {activeGame === 'bugs' && <BugHunt />}
          {activeGame === 'guess' && <GuessOutput />}
          {activeGame === 'badges' && <BadgeWall />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ==================== DAILY QUIZ ====================
const DailyQuiz: React.FC = () => {
  const [questions] = useState(getDailyQuizzes);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('quiz_completed_today') === new Date().toDateString()) {
      setAlreadyDone(true);
    }
  }, []);

  useEffect(() => {
    if (finished || alreadyDone || selected !== null) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { handleAnswer(-1); return 30; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [current, finished, alreadyDone, selected]);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].ans;
    const newScore = correct ? score + 1 : score;
    if (correct) {
      setScore(newScore);
      // Award 1 point immediately
      const prevXP = parseInt(localStorage.getItem('mini_xp') || '0');
      localStorage.setItem('mini_xp', String(prevXP + 1));
    }
    
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1);
        setSelected(null);
        setTimeLeft(30);
      } else {
        setFinished(true);
        localStorage.setItem('quiz_completed_today', new Date().toDateString());
        if (newScore === 5) localStorage.setItem('perfect_quiz', 'true');
        // Streak
        const lastQuiz = localStorage.getItem('last_quiz_date');
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const streak = parseInt(localStorage.getItem('quiz_streak') || '0');
        if (lastQuiz === yesterday.toDateString()) {
          localStorage.setItem('quiz_streak', String(streak + 1));
        } else if (lastQuiz !== new Date().toDateString()) {
          localStorage.setItem('quiz_streak', '1');
        }
        localStorage.setItem('last_quiz_date', new Date().toDateString());
      }
    }, 1200);
  };

  if (alreadyDone) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Quiz Complete!</h3>
        <p className="text-slate-500 text-sm">Come back tomorrow for new questions.</p>
        <p className="text-xs text-violet-600 font-medium mt-2">🔥 Streak: {localStorage.getItem('quiz_streak') || '0'} days</p>
      </div>
    );
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="text-5xl mb-3">{score >= 4 ? '🏆' : score >= 2 ? '👏' : '💪'}</div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">{score}/5 Correct!</h3>
        <p className="text-slate-500 text-sm mb-2">You earned <span className="font-bold text-violet-600">{score} point{score !== 1 ? 's' : ''}</span></p>
        {score === 5 && <p className="text-xs text-amber-600 font-bold">🎉 PERFECT SCORE! Badge unlocked!</p>}
      </motion.div>
    );
  }

  const q = questions[current];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-slate-400">Question {current + 1}/5</span>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${timeLeft <= 10 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
            <Timer className="w-3 h-3" /> {timeLeft}s
          </div>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < current ? 'bg-violet-500' : i === current ? 'bg-violet-300' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-4">{q.q}</h3>
      <div className="grid grid-cols-2 gap-2">
        {q.opts.map((opt, i) => {
          let cls = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300';
          if (selected !== null) {
            if (i === q.ans) cls = 'bg-emerald-50 border-emerald-300 text-emerald-700';
            else if (i === selected) cls = 'bg-red-50 border-red-300 text-red-600';
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selected !== null}
              className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${cls}`}
            >
              <span className="text-xs font-bold text-slate-400 mr-2">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==================== BUG HUNT ====================
const BugHunt: React.FC = () => {
  const [bugs] = useState(getDailyBugs);
  const [currentBug, setCurrentBug] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [found, setFound] = useState<Set<number>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('bugs_found_set');
    if (saved) setFound(new Set(JSON.parse(saved)));
  }, []);

  const markFound = () => {
    setRevealed(true);
    const newFound = new Set(found);
    newFound.add(currentBug);
    setFound(newFound);
    localStorage.setItem('bugs_found_set', JSON.stringify([...newFound]));
    localStorage.setItem('bugs_found', String(newFound.size));
    if (!found.has(currentBug)) {
      const prevXP = parseInt(localStorage.getItem('mini_xp') || '0');
      localStorage.setItem('mini_xp', String(prevXP + 1));
    }
  };

  const nextBug = () => {
    setRevealed(false);
    setCurrentBug((c) => (c + 1) % bugs.length);
  };

  if (found.size >= bugs.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="text-4xl mb-3">🐛✅</div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">All Bugs Found!</h3>
        <p className="text-slate-500 text-sm">Come back tomorrow for new bugs to squash.</p>
      </div>
    );
  }

  const bug = bugs[currentBug];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Bug {currentBug + 1}/{bugs.length}</span>
          {found.has(currentBug) && <span className="text-xs text-emerald-600 font-medium">✓ Found</span>}
        </div>
        <span className="text-xs font-medium text-rose-500">{found.size}/{bugs.length} bugs squashed 🐛</span>
      </div>

      <p className="text-sm font-semibold text-slate-900 mb-3">Find the bug in this code:</p>
      <div className="bg-[#0d1117] rounded-xl p-4 mb-4 font-mono text-sm text-[#e6edf3] whitespace-pre-wrap leading-relaxed border border-[#30363d]">
        {bug.code}
      </div>

      {!revealed ? (
        <div className="flex items-center gap-3">
          <Button onClick={markFound} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-9 px-4 text-sm">
            <Bug className="w-3.5 h-3.5 mr-1.5" /> Reveal Bug
          </Button>
          <p className="text-xs text-slate-400 italic">💡 Hint: {bug.hint}</p>
        </div>
      ) : (
        <div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
            <p className="text-sm font-medium text-rose-700">🐛 {bug.bug}</p>
          </div>
          <Button onClick={nextBug} variant="outline" className="rounded-xl h-9 text-sm">
            Next Bug <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ==================== GUESS THE OUTPUT ====================
const GuessOutput: React.FC = () => {
  const [questions] = useState(getDailyGuess);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(parseInt(localStorage.getItem('guess_correct') || '0'));
  const [answered, setAnswered] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('guess_answered_set');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (answered.size >= questions.length) {
      setFinished(true);
    } else {
      // Skip to first unanswered
      let next = 0;
      while (answered.has(next) && next < GUESS_OUTPUTS.length) next++;
      setCurrentQ(next);
    }
  }, []);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const newAnswered = new Set(answered);
    newAnswered.add(currentQ);
    setAnswered(newAnswered);
    localStorage.setItem('guess_answered_set', JSON.stringify([...newAnswered]));
    if (idx === questions[currentQ].ans) {
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      localStorage.setItem('guess_correct', String(newCount));
      const prevXP = parseInt(localStorage.getItem('mini_xp') || '0');
      localStorage.setItem('mini_xp', String(prevXP + 1));
    }
  };

  const nextQ = () => {
    setSelected(null);
    // Find next unanswered question
    let next = currentQ + 1;
    while (next < questions.length && answered.has(next)) next++;
    if (next >= questions.length) {
      setFinished(true);
    } else {
      setCurrentQ(next);
    }
  };

  if (finished) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">All Done!</h3>
        <p className="text-slate-500 text-sm">You got <span className="font-bold text-amber-600">{correctCount}/{questions.length}</span> correct.</p>
        <p className="text-xs text-slate-400 mt-2">New questions tomorrow!</p>
      </div>
    );
  }

  const q = questions[currentQ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-slate-400">Challenge {answered.size + 1}/{questions.length}</span>
        <span className="text-xs font-medium text-amber-600">{correctCount} correct ⚡</span>
      </div>

      <p className="text-sm font-semibold text-slate-900 mb-3">What's the output?</p>
      <div className="bg-[#0d1117] rounded-xl p-4 mb-4 font-mono text-sm text-[#e6edf3] border border-[#30363d]">
        {q.code}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {q.opts.map((opt, i) => {
          let cls = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
          if (selected !== null) {
            if (i === q.ans) cls = 'bg-emerald-50 border-emerald-300 text-emerald-700';
            else if (i === selected) cls = 'bg-red-50 border-red-300 text-red-600';
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
              className={`p-3 rounded-xl border text-sm font-mono font-medium transition-all ${cls}`}>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`rounded-xl p-3 mb-3 text-sm ${selected === q.ans ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
            {selected === q.ans ? '✅ ' : '❌ '}{q.explanation}
          </div>
          <Button onClick={nextQ} variant="outline" className="rounded-xl h-9 text-sm">
            Next Challenge <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

// ==================== BADGE WALL ====================
const BadgeWall: React.FC = () => {
  const badges = checkBadges();
  const earned = badges.filter((b) => b.earned).length;
  const totalXP = localStorage.getItem('mini_xp') || '0';

  const resetProgress = () => {
    if (confirm('Reset all mini-game progress? This cannot be undone.')) {
      ['mini_xp', 'quiz_completed_today', 'quiz_streak', 'last_quiz_date', 'perfect_quiz', 'bugs_found', 'bugs_found_set', 'guess_correct', 'guess_answered_set'].forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">{earned}/{badges.length} Badges Earned</h3>
          <p className="text-xs text-slate-500">Total XP from activities: <span className="font-bold text-violet-600">{totalXP}</span></p>
        </div>
        <button onClick={resetProgress} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {badges.map((badge) => (
          <div key={badge.id} className={`rounded-xl p-4 text-center border transition-all ${badge.earned ? 'bg-gradient-to-b from-amber-50 to-white border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50 grayscale'}`}>
            <div className="text-3xl mb-2">{badge.icon}</div>
            <p className="text-xs font-bold text-slate-900">{badge.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{badge.desc}</p>
            {badge.earned && <span className="text-[10px] text-emerald-600 font-medium mt-1 block">✓ Unlocked</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniGames;
