import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
    quizQuestions,
    bugChallenges,
    puzzleChallenges,
    fillChallenges,
    typeChallenges,
    heroChallenges,
    getLevelForXP,
    achievements,
} from "@/data/codeGames";
import { useAuth } from "@/hooks/useAuth";
import type {
    QuizQuestion,
    BugChallenge,
    PuzzleChallenge,
    FillChallenge,
    TypeChallenge,
    HeroChallenge,
} from "@/data/codeGames";
import {
    Trophy,
    Zap,
    Target,
    Bug,
    Puzzle,
    Keyboard,
    PenTool,
    ArrowLeft,
    Star,
    Flame,
    ChevronRight,
    RotateCcw,
    Lightbulb,
    Check,
    X,
    Sparkles,
    Award,
    Code2,
    Gamepad2,
    Shield,
    Diamond,
} from "lucide-react";

type GameMode = null | "quiz" | "bugs" | "puzzle" | "fill" | "type" | "hero";

interface PlayerData {
    xp: number;
    streak: number;
    bestStreak: number;
    completed: string[];
    achievements: string[];
    gamesPlayed: number;
}

const CodeQuest = () => {
    const { user } = useAuth();
    const storageKey = useMemo(() =>
        user ? `codequest_data_${user.id}` : "codequest_data_guest",
        [user]);

    const [gameMode, setGameMode] = useState<GameMode>(null);
    const [playerData, setPlayerData] = useState<PlayerData>({
        xp: 0,
        streak: 0,
        bestStreak: 0,
        completed: [] as string[],
        achievements: [] as string[],
        gamesPlayed: 0
    });
    const [showAchievement, setShowAchievement] = useState<string | null>(null);

    // Load data when user changes
    useEffect(() => {
        try {
            const data = localStorage.getItem(storageKey);
            if (data) {
                setPlayerData(JSON.parse(data));
            } else {
                setPlayerData({
                    xp: 0,
                    streak: 0,
                    bestStreak: 0,
                    completed: [] as string[],
                    achievements: [] as string[],
                    gamesPlayed: 0
                });
            }
        } catch { /* ignore */ }
    }, [storageKey]);

    const saveStoredData = useCallback((data: any) => {
        localStorage.setItem(storageKey, JSON.stringify(data));
    }, [storageKey]);

    const level = getLevelForXP(playerData.xp);

    const addXP = useCallback((amount: number) => {
        setPlayerData((prev) => {
            const newData = { ...prev, xp: prev.xp + amount };
            saveStoredData(newData);
            return newData;
        });
    }, [saveStoredData]);

    const incrementStreak = useCallback(() => {
        setPlayerData((prev) => {
            const newStreak = prev.streak + 1;
            const newData = {
                ...prev,
                streak: newStreak,
                bestStreak: Math.max(newStreak, prev.bestStreak),
            };
            saveStoredData(newData);
            return newData;
        });
    }, [saveStoredData]);

    const resetStreak = useCallback(() => {
        setPlayerData((prev) => {
            const newData = { ...prev, streak: 0 };
            saveStoredData(newData);
            return newData;
        });
    }, [saveStoredData]);

    const markComplete = useCallback((id: string) => {
        setPlayerData((prev) => {
            if (prev.completed.includes(id)) return prev;
            const newData = { ...prev, completed: [...prev.completed, id], gamesPlayed: prev.gamesPlayed + 1 };
            saveStoredData(newData);
            return newData;
        });
    }, [saveStoredData]);

    const unlockAchievement = useCallback((id: string) => {
        setPlayerData((prev) => {
            if (prev.achievements.includes(id)) return prev;
            const newData = { ...prev, achievements: [...prev.achievements, id] };
            saveStoredData(newData);
            setShowAchievement(id);
            setTimeout(() => setShowAchievement(null), 3000);
            return newData;
        });
    }, [saveStoredData]);

    // Check achievements
    useEffect(() => {
        if (playerData.xp >= 100 && !playerData.achievements.includes("xp_100")) unlockAchievement("xp_100");
        if (playerData.xp >= 500 && !playerData.achievements.includes("xp_500")) unlockAchievement("xp_500");
        if (playerData.streak >= 3 && !playerData.achievements.includes("streak_3")) unlockAchievement("streak_3");
        if (playerData.streak >= 5 && !playerData.achievements.includes("streak_5")) unlockAchievement("streak_5");
        if (level.level >= 5 && !playerData.achievements.includes("level_5")) unlockAchievement("level_5");
    }, [playerData, level, unlockAchievement]);

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="pt-24 pb-16">
                {/* Achievement Toast */}
                {showAchievement && (
                    <AchievementToast achievementId={showAchievement} />
                )}

                {!gameMode ? (
                    <GameLobby
                        playerData={playerData}
                        level={level}
                        onSelectMode={setGameMode}
                    />
                ) : (
                    <div className="container mx-auto px-4 md:px-6">
                        <button
                            onClick={() => setGameMode(null)}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Games
                        </button>

                        {gameMode === "quiz" && (
                            <QuizGame
                                addXP={addXP}
                                incrementStreak={incrementStreak}
                                resetStreak={resetStreak}
                                markComplete={markComplete}
                                unlockAchievement={unlockAchievement}
                                completedIds={playerData.completed}
                            />
                        )}
                        {gameMode === "bugs" && (
                            <BugGame
                                addXP={addXP}
                                incrementStreak={incrementStreak}
                                resetStreak={resetStreak}
                                markComplete={markComplete}
                                unlockAchievement={unlockAchievement}
                                completedIds={playerData.completed}
                            />
                        )}
                        {gameMode === "puzzle" && (
                            <PuzzleGame
                                addXP={addXP}
                                incrementStreak={incrementStreak}
                                resetStreak={resetStreak}
                                markComplete={markComplete}
                                unlockAchievement={unlockAchievement}
                                completedIds={playerData.completed}
                            />
                        )}
                        {gameMode === "fill" && (
                            <FillGame
                                addXP={addXP}
                                incrementStreak={incrementStreak}
                                resetStreak={resetStreak}
                                markComplete={markComplete}
                                unlockAchievement={unlockAchievement}
                                completedIds={playerData.completed}
                            />
                        )}
                        {gameMode === "type" && (
                            <TypeGame
                                addXP={addXP}
                                markComplete={markComplete}
                                unlockAchievement={unlockAchievement}
                                completedIds={playerData.completed}
                            />
                        )}
                        {gameMode === "hero" && (
                            <HeroGame
                                addXP={addXP}
                                incrementStreak={incrementStreak}
                                resetStreak={resetStreak}
                                markComplete={markComplete}
                                unlockAchievement={unlockAchievement}
                                completedIds={playerData.completed}
                            />
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

// ==================== GAME LOBBY ====================
function GameLobby({
    playerData,
    level,
    onSelectMode,
}: {
    playerData: PlayerData;
    level: ReturnType<typeof getLevelForXP>;
    onSelectMode: (mode: GameMode) => void;
}) {
    const gameModes = [
        {
            id: "quiz" as GameMode,
            title: "Quiz Arena",
            desc: "Test your knowledge with coding MCQs",
            icon: Target,
            color: "#E44D26",
            gradient: "linear-gradient(135deg, #E44D26, #FF6B35)",
            count: `${quizQuestions.length} Questions`,
        },
        {
            id: "bugs" as GameMode,
            title: "Bug Hunter",
            desc: "Find and fix bugs in broken code",
            icon: Bug,
            color: "#22C55E",
            gradient: "linear-gradient(135deg, #22C55E, #16A34A)",
            count: `${bugChallenges.length} Bugs`,
        },
        {
            id: "puzzle" as GameMode,
            title: "Code Puzzle",
            desc: "Arrange scrambled code in the right order",
            icon: Puzzle,
            color: "#8B5CF6",
            gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            count: `${puzzleChallenges.length} Puzzles`,
        },
        {
            id: "fill" as GameMode,
            title: "Fill the Code",
            desc: "Complete the missing parts of code",
            icon: PenTool,
            color: "#F59E0B",
            gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
            count: `${fillChallenges.length} Blanks`,
        },
        {
            id: "type" as GameMode,
            title: "Speed Type",
            desc: "Type code as fast and accurately as you can",
            icon: Keyboard,
            color: "#06B6D4",
            gradient: "linear-gradient(135deg, #06B6D4, #0891B2)",
            count: `${typeChallenges.length} Challenges`,
        },
        {
            id: "hero" as GameMode,
            title: "Hero Quest",
            desc: "Control a hero using real code commands!",
            icon: Gamepad2,
            color: "#D946EF",
            gradient: "linear-gradient(135deg, #D946EF, #C026D3)",
            count: `${heroChallenges.length} Levels`,
        },
    ];

    return (
        <>
            {/* Hero */}
            <section className="relative pb-12 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)" }} />
                </div>

                <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                        <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                        <span className="text-sm font-medium text-muted-foreground">Learn by Playing</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
                        <span className="text-foreground">Code</span>
                        <span className="text-gradient">Quest</span>
                        <span className="text-foreground"> ⚔️</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
                        Learn programming by playing interactive coding games.
                        Earn XP, level up, and unlock achievements!
                    </p>
                </div>
            </section>

            {/* Player Stats */}
            <section className="container mx-auto px-4 md:px-6 mb-12">
                <div className="bg-card rounded-3xl border border-border p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Level Badge */}
                        <div className="flex-shrink-0 relative">
                            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl" style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
                                {level.emoji}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                                {level.level}
                            </div>
                        </div>

                        {/* XP Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold text-foreground">{level.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3">Level {level.level}</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${level.progress}%`,
                                            background: "linear-gradient(90deg, #8B5CF6, #D946EF)",
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {playerData.xp} XP {level.nextLevel ? `/ ${level.nextLevel.minXP}` : "MAX"}
                                </span>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="flex gap-4">
                            {[
                                { icon: Zap, label: "XP", value: playerData.xp, color: "#F59E0B" },
                                { icon: Flame, label: "Streak", value: playerData.streak, color: "#E44D26" },
                                { icon: Star, label: "Best", value: playerData.bestStreak, color: "#8B5CF6" },
                                { icon: Trophy, label: "Done", value: playerData.completed.length, color: "#22C55E" },
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-1" style={{ background: `${stat.color}15` }}>
                                        <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                                    </div>
                                    <div className="text-lg font-bold text-foreground">{stat.value}</div>
                                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Game Modes */}
            <section className="container mx-auto px-4 md:px-6 mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <div className="w-1 h-7 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#D946EF]" />
                    Choose Your Game
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {gameModes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => onSelectMode(mode.id)}
                            className="group relative bg-card rounded-2xl p-6 border border-border text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-transparent overflow-hidden"
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${mode.color}08, ${mode.color}15)` }} />
                            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: mode.gradient, borderRadius: "0 16px 0 100%" }} />

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: `${mode.color}15` }}>
                                    <mode.icon className="w-7 h-7" style={{ color: mode.color }} />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">{mode.title}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{mode.desc}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: `${mode.color}12`, color: mode.color }}>{mode.count}</span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: mode.color }} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Achievements */}
            <section className="container mx-auto px-4 md:px-6 mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <div className="w-1 h-7 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#E44D26]" />
                    Achievements
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {achievements.map((a) => {
                        const unlocked = playerData.achievements.includes(a.id);
                        return (
                            <div
                                key={a.id}
                                className={`rounded-2xl p-4 border text-center transition-all ${unlocked
                                    ? "bg-card border-[#F59E0B]/30 shadow-md"
                                    : "bg-card/30 border-border opacity-40 grayscale"
                                    }`}
                            >
                                <div className="text-3xl mb-2">{a.emoji}</div>
                                <div className="text-sm font-bold text-foreground">{a.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">{a.desc}</div>
                                {unlocked && (
                                    <div className="mt-2 text-xs text-[#F59E0B] font-medium">✅ Unlocked</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </>
    );
}

// ==================== ACHIEVEMENT TOAST ====================
function AchievementToast({ achievementId }: { achievementId: string }) {
    const a = achievements.find((x) => x.id === achievementId);
    if (!a) return null;
    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up">
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-card border border-[#F59E0B]/30 shadow-2xl" style={{ boxShadow: "0 0 40px rgba(245,158,11,0.2)" }}>
                <div className="text-3xl">{a.emoji}</div>
                <div>
                    <div className="text-xs text-[#F59E0B] font-semibold uppercase">Achievement Unlocked!</div>
                    <div className="text-sm font-bold text-foreground">{a.title}</div>
                </div>
            </div>
        </div>
    );
}

// ==================== FEEDBACK ANIMATION ====================
function FeedbackOverlay({ correct, xp }: { correct: boolean; xp?: number }) {
    return (
        <div className={`absolute inset-0 z-20 flex items-center justify-center rounded-2xl pointer-events-none animate-fade-in-up ${correct ? "bg-green-500/10" : "bg-indigo-500/10"}`}>
            <div className="text-center">
                <div className="text-5xl mb-2">{correct ? "✅" : "❌"}</div>
                <div className={`text-xl font-bold ${correct ? "text-green-500" : "text-indigo-600"}`}>
                    {correct ? "Correct!" : "Wrong!"}
                </div>
                {correct && xp && (
                    <div className="text-sm text-[#F59E0B] font-bold mt-1 animate-bounce">+{xp} XP ⚡</div>
                )}
            </div>
        </div>
    );
}

// ==================== QUIZ GAME ====================
interface GameProps {
    addXP: (n: number) => void;
    incrementStreak: () => void;
    resetStreak: () => void;
    markComplete: (id: string) => void;
    unlockAchievement: (id: string) => void;
    completedIds: string[];
}

function QuizGame({ addXP, incrementStreak, resetStreak, markComplete, unlockAchievement, completedIds }: GameProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);

    const shuffled = useMemo(() => [...quizQuestions].sort(() => Math.random() - 0.5).slice(0, 10), []);
    const q = shuffled[currentIndex];

    const handleSelect = (index: number) => {
        if (showResult) return;
        setSelected(index);
        setShowResult(true);

        const correct = index === q.correctIndex;
        if (correct) {
            setScore((s) => s + 1);
            addXP(q.xp);
            incrementStreak();
            markComplete(q.id);
            if (!completedIds.includes("first_quiz_done")) unlockAchievement("first_quiz");
        } else {
            resetStreak();
        }

        setTimeout(() => {
            if (currentIndex < shuffled.length - 1) {
                setCurrentIndex((i) => i + 1);
                setSelected(null);
                setShowResult(false);
            } else {
                setFinished(true);
            }
        }, 1800);
    };

    if (finished) {
        return (
            <GameComplete
                title="Quiz Arena"
                score={score}
                total={shuffled.length}
                emoji="🎯"
                color="#E44D26"
                onReplay={() => { setCurrentIndex(0); setScore(0); setFinished(false); setSelected(null); setShowResult(false); }}
            />
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Question {currentIndex + 1} of {shuffled.length}</span>
                <span className="text-sm font-medium" style={{ color: "#E44D26" }}>Score: {score}/{shuffled.length}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary mb-8 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / shuffled.length) * 100}%`, background: "linear-gradient(90deg, #E44D26, #FF6B35)" }} />
            </div>

            {/* Question Card */}
            <div className="relative bg-card rounded-2xl border border-border p-8 mb-6">
                {showResult && <FeedbackOverlay correct={selected === q.correctIndex} xp={selected === q.correctIndex ? q.xp : undefined} />}

                <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase" style={{ background: q.difficulty === "easy" ? "#22C55E20" : q.difficulty === "medium" ? "#F59E0B20" : "#EF444420", color: q.difficulty === "easy" ? "#22C55E" : q.difficulty === "medium" ? "#F59E0B" : "#EF4444" }}>
                        {q.difficulty}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary text-muted-foreground">{q.language}</span>
                    <span className="ml-auto text-xs text-[#F59E0B] font-bold">+{q.xp} XP</span>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-4">{q.question}</h3>

                {q.code && (
                    <pre className="p-4 rounded-xl bg-secondary/50 mb-6 text-sm overflow-x-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {q.code}
                    </pre>
                )}

                <div className="grid gap-3">
                    {q.options.map((opt, i) => {
                        let style = "border-border hover:border-foreground/30 hover:bg-secondary/50";
                        if (showResult) {
                            if (i === q.correctIndex) style = "border-green-500 bg-green-500/10 text-green-700";
                            else if (i === selected && i !== q.correctIndex) style = "border-indigo-500 bg-indigo-500/10 text-indigo-700";
                            else style = "border-border opacity-40";
                        }
                        return (
                            <button
                                key={i}
                                onClick={() => handleSelect(i)}
                                disabled={showResult}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ${style}`}
                            >
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-xs font-bold mr-3">
                                    {String.fromCharCode(65 + i)}
                                </span>
                                {opt}
                            </button>
                        );
                    })}
                </div>

                {showResult && (
                    <div className="mt-4 p-4 rounded-xl bg-secondary/50 text-sm text-muted-foreground animate-fade-in-up">
                        💡 {q.explanation}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==================== BUG GAME ====================
function BugGame({ addXP, incrementStreak, resetStreak, markComplete, unlockAchievement, completedIds }: GameProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userCode, setUserCode] = useState("");
    const [showHint, setShowHint] = useState(false);
    const [result, setResult] = useState<"correct" | "wrong" | null>(null);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [bugsFixed, setBugsFixed] = useState(0);

    const challenges = useMemo(() => [...bugChallenges].sort(() => Math.random() - 0.5), []);
    const bug = challenges[currentIndex];

    useEffect(() => {
        setUserCode(bug.buggyCode);
        setShowHint(false);
        setResult(null);
    }, [currentIndex, bug.buggyCode]);

    const handleSubmit = () => {
        const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
        const correct = normalize(userCode) === normalize(bug.fixedCode);

        setResult(correct ? "correct" : "wrong");
        if (correct) {
            setScore((s) => s + 1);
            addXP(bug.xp);
            incrementStreak();
            markComplete(bug.id);
            const newCount = bugsFixed + 1;
            setBugsFixed(newCount);
            if (newCount >= 3) unlockAchievement("bug_hunter");
        } else {
            resetStreak();
        }

        setTimeout(() => {
            if (currentIndex < challenges.length - 1) {
                setCurrentIndex((i) => i + 1);
            } else {
                setFinished(true);
            }
        }, 2000);
    };

    const handleShowSolution = () => {
        setUserCode(bug.fixedCode);
    };

    if (finished) {
        return <GameComplete title="Bug Hunter" score={score} total={challenges.length} emoji="🐛" color="#22C55E" onReplay={() => { setCurrentIndex(0); setScore(0); setFinished(false); setBugsFixed(0); }} />;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Bug {currentIndex + 1} of {challenges.length}</span>
                <span className="text-sm font-medium text-green-500">Fixed: {score}/{challenges.length}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary mb-8 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / challenges.length) * 100}%`, background: "linear-gradient(90deg, #22C55E, #16A34A)" }} />
            </div>

            <div className="relative bg-card rounded-2xl border border-border p-6 md:p-8">
                {result && <FeedbackOverlay correct={result === "correct"} xp={result === "correct" ? bug.xp : undefined} />}

                <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-5 h-5 text-green-500" />
                    <h3 className="text-xl font-bold text-foreground">{bug.title}</h3>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase ml-auto" style={{ background: bug.difficulty === "easy" ? "#22C55E20" : "#F59E0B20", color: bug.difficulty === "easy" ? "#22C55E" : "#F59E0B" }}>
                        {bug.difficulty}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{bug.description}</p>

                <textarea
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    spellCheck={false}
                    className="w-full min-h-[200px] p-4 rounded-xl bg-secondary/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", lineHeight: "1.6" }}
                />

                <div className="flex items-center gap-3 mt-4">
                    <button onClick={handleSubmit} disabled={!!result} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors">
                        <Check className="w-4 h-4" /> Submit Fix
                    </button>
                    <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Lightbulb className="w-4 h-4" /> Hint
                    </button>
                    <button onClick={handleShowSolution} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-auto">
                        Show Solution
                    </button>
                </div>
                {showHint && (
                    <div className="mt-3 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-sm text-[#F59E0B]">
                        💡 {bug.hint}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==================== PUZZLE GAME ====================
function PuzzleGame({ addXP, incrementStreak, resetStreak, markComplete, unlockAchievement, completedIds }: GameProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lines, setLines] = useState<string[]>([]);
    const [result, setResult] = useState<"correct" | "wrong" | null>(null);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [puzzlesSolved, setPuzzlesSolved] = useState(0);

    const challenges = useMemo(() => [...puzzleChallenges].sort(() => Math.random() - 0.5), []);
    const puzzle = challenges[currentIndex];

    useEffect(() => {
        setLines([...puzzle.correctOrder].sort(() => Math.random() - 0.5));
        setResult(null);
    }, [currentIndex, puzzle.correctOrder]);

    const moveUp = (idx: number) => {
        if (idx === 0) return;
        const newLines = [...lines];
        [newLines[idx - 1], newLines[idx]] = [newLines[idx], newLines[idx - 1]];
        setLines(newLines);
    };

    const moveDown = (idx: number) => {
        if (idx === lines.length - 1) return;
        const newLines = [...lines];
        [newLines[idx], newLines[idx + 1]] = [newLines[idx + 1], newLines[idx]];
        setLines(newLines);
    };

    const handleCheck = () => {
        const correct = JSON.stringify(lines) === JSON.stringify(puzzle.correctOrder);
        setResult(correct ? "correct" : "wrong");

        if (correct) {
            setScore((s) => s + 1);
            addXP(puzzle.xp);
            incrementStreak();
            markComplete(puzzle.id);
            const newCount = puzzlesSolved + 1;
            setPuzzlesSolved(newCount);
            if (newCount >= 3) unlockAchievement("puzzle_master");
        } else {
            resetStreak();
        }

        setTimeout(() => {
            if (currentIndex < challenges.length - 1) {
                setCurrentIndex((i) => i + 1);
            } else {
                setFinished(true);
            }
        }, 2000);
    };

    if (finished) {
        return <GameComplete title="Code Puzzle" score={score} total={challenges.length} emoji="🧩" color="#8B5CF6" onReplay={() => { setCurrentIndex(0); setScore(0); setFinished(false); setPuzzlesSolved(0); }} />;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Puzzle {currentIndex + 1} of {challenges.length}</span>
                <span className="text-sm font-medium text-[#8B5CF6]">Solved: {score}/{challenges.length}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary mb-8 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / challenges.length) * 100}%`, background: "linear-gradient(90deg, #8B5CF6, #D946EF)" }} />
            </div>

            <div className="relative bg-card rounded-2xl border border-border p-6 md:p-8">
                {result && <FeedbackOverlay correct={result === "correct"} xp={result === "correct" ? puzzle.xp : undefined} />}

                <div className="flex items-center gap-2 mb-2">
                    <Puzzle className="w-5 h-5 text-[#8B5CF6]" />
                    <h3 className="text-xl font-bold text-foreground">{puzzle.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{puzzle.description}</p>
                <p className="text-xs text-muted-foreground mb-4">⬆️⬇️ Click the arrows to reorder the lines</p>

                <div className="space-y-2 mb-6">
                    {lines.map((line, i) => (
                        <div key={`${line}-${i}`} className="flex items-center gap-2 group">
                            <div className="flex flex-col gap-0.5">
                                <button onClick={() => moveUp(i)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" disabled={i === 0}>▲</button>
                                <button onClick={() => moveDown(i)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" disabled={i === lines.length - 1}>▼</button>
                            </div>
                            <div className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border font-mono text-sm text-foreground group-hover:border-[#8B5CF6]/30 transition-colors">
                                <span className="text-muted-foreground/40 mr-3 text-xs">{i + 1}</span>
                                {line}
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleCheck} disabled={!!result} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 transition-colors">
                    <Check className="w-4 h-4" /> Check Order
                </button>
            </div>
        </div>
    );
}

// ==================== FILL GAME ====================
function FillGame({ addXP, incrementStreak, resetStreak, markComplete, unlockAchievement, completedIds }: GameProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<string[]>([]);
    const [result, setResult] = useState<"correct" | "wrong" | null>(null);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [fillCount, setFillCount] = useState(0);

    const challenges = useMemo(() => [...fillChallenges].sort(() => Math.random() - 0.5), []);
    const fill = challenges[currentIndex];

    useEffect(() => {
        setUserAnswers(fill.answers.map(() => ""));
        setResult(null);
    }, [currentIndex, fill.answers]);

    const handleSubmit = () => {
        const correct = userAnswers.every((a, i) =>
            a.trim().toLowerCase() === fill.answers[i].toLowerCase()
        );
        setResult(correct ? "correct" : "wrong");

        if (correct) {
            setScore((s) => s + 1);
            addXP(fill.xp);
            incrementStreak();
            markComplete(fill.id);
            const newCount = fillCount + 1;
            setFillCount(newCount);
            if (newCount >= 5) unlockAchievement("fill_pro");
        } else {
            resetStreak();
        }

        setTimeout(() => {
            if (currentIndex < challenges.length - 1) {
                setCurrentIndex((i) => i + 1);
            } else {
                setFinished(true);
            }
        }, 2000);
    };

    if (finished) {
        return <GameComplete title="Fill the Code" score={score} total={challenges.length} emoji="✏️" color="#F59E0B" onReplay={() => { setCurrentIndex(0); setScore(0); setFinished(false); setFillCount(0); }} />;
    }

    // Render code template with input fields
    const renderTemplate = () => {
        const parts = fill.codeTemplate.split("___");
        return (
            <pre className="p-4 rounded-xl bg-secondary/30 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {parts.map((part, i) => (
                    <span key={i}>
                        <span className="text-foreground">{part}</span>
                        {i < parts.length - 1 && (
                            <input
                                type="text"
                                value={userAnswers[i] || ""}
                                onChange={(e) => {
                                    const newAnswers = [...userAnswers];
                                    newAnswers[i] = e.target.value;
                                    setUserAnswers(newAnswers);
                                }}
                                className="inline-block w-32 mx-1 px-2 py-0.5 rounded-lg border-2 border-[#F59E0B]/30 bg-[#F59E0B]/5 text-foreground text-center font-mono focus:outline-none focus:border-[#F59E0B] transition-colors"
                                placeholder="???"
                                disabled={!!result}
                                autoFocus={i === 0}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            />
                        )}
                    </span>
                ))}
            </pre>
        );
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Challenge {currentIndex + 1} of {challenges.length}</span>
                <span className="text-sm font-medium text-[#F59E0B]">Score: {score}/{challenges.length}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary mb-8 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / challenges.length) * 100}%`, background: "linear-gradient(90deg, #F59E0B, #D97706)" }} />
            </div>

            <div className="relative bg-card rounded-2xl border border-border p-6 md:p-8">
                {result && <FeedbackOverlay correct={result === "correct"} xp={result === "correct" ? fill.xp : undefined} />}

                <div className="flex items-center gap-2 mb-2">
                    <PenTool className="w-5 h-5 text-[#F59E0B]" />
                    <h3 className="text-xl font-bold text-foreground">{fill.title}</h3>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary text-muted-foreground ml-auto">{fill.language}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{fill.description}</p>

                {renderTemplate()}

                {result === "wrong" && (
                    <div className="mt-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm">
                        <span className="text-indigo-600 font-bold">Answer:</span>{" "}
                        <code className="text-foreground font-mono">{fill.answers.join(", ")}</code>
                    </div>
                )}

                <button onClick={handleSubmit} disabled={!!result || userAnswers.some((a) => !a.trim())} className="flex items-center gap-2 mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 transition-colors">
                    <Check className="w-4 h-4" /> Check Answer
                </button>
            </div>
        </div>
    );
}

// ==================== TYPE GAME ====================
function TypeGame({
    addXP,
    markComplete,
    unlockAchievement,
    completedIds,
}: Omit<GameProps, "incrementStreak" | "resetStreak">) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [finished, setFinished] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const challenges = useMemo(() => [...typeChallenges].sort(() => Math.random() - 0.5), []);
    const challenge = challenges[currentIndex];
    const targetCode = challenge.code;

    useEffect(() => {
        setUserInput("");
        setStartTime(null);
        setEndTime(null);
        inputRef.current?.focus();
    }, [currentIndex]);

    const handleChange = (value: string) => {
        if (!startTime) setStartTime(Date.now());
        setUserInput(value);

        if (value === targetCode) {
            const end = Date.now();
            setEndTime(end);
            addXP(challenge.xp);
            markComplete(challenge.id);
            unlockAchievement("speed_demon");

            setTimeout(() => {
                if (currentIndex < challenges.length - 1) {
                    setCurrentIndex((i) => i + 1);
                } else {
                    setFinished(true);
                }
            }, 2000);
        }
    };

    const elapsed = startTime && endTime ? ((endTime - startTime) / 1000).toFixed(1) : null;
    const wpm = elapsed && targetCode
        ? Math.round((targetCode.length / 5) / (parseFloat(elapsed) / 60))
        : null;

    // Render target with character highlighting
    const renderTarget = () => {
        return targetCode.split("").map((char, i) => {
            let color = "text-muted-foreground/30";
            if (i < userInput.length) {
                color = userInput[i] === char ? "text-green-500" : "text-indigo-600 bg-indigo-500/10";
            }
            return (
                <span key={i} className={`${color} ${i === userInput.length ? "border-l-2 border-[#06B6D4] animate-pulse" : ""}`}>
                    {char === "\n" ? "↵\n" : char}
                </span>
            );
        });
    };

    if (finished) {
        return <GameComplete title="Speed Type" score={challenges.length} total={challenges.length} emoji="⚡" color="#06B6D4" onReplay={() => { setCurrentIndex(0); setFinished(false); }} />;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Challenge {currentIndex + 1} of {challenges.length}</span>
                <span className="text-sm font-medium text-[#06B6D4]">{challenge.title}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary mb-8 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentIndex) / challenges.length) * 100}%`, background: "linear-gradient(90deg, #06B6D4, #0891B2)" }} />
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                    <Keyboard className="w-5 h-5 text-[#06B6D4]" />
                    <h3 className="text-lg font-bold text-foreground">Type the code below as fast as you can!</h3>
                </div>

                {/* Target Code */}
                <pre className="p-4 rounded-xl bg-secondary/30 mb-6 text-sm font-mono leading-relaxed whitespace-pre-wrap select-none">
                    {renderTarget()}
                </pre>

                {/* Input area */}
                <textarea
                    ref={inputRef}
                    value={userInput}
                    onChange={(e) => handleChange(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full min-h-[120px] p-4 rounded-xl bg-transparent border-2 border-[#06B6D4]/30 text-foreground focus:outline-none focus:border-[#06B6D4] resize-none transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", lineHeight: "1.6" }}
                    placeholder="Start typing here..."
                    disabled={!!endTime}
                />

                {/* Stats */}
                <div className="flex items-center gap-6 mt-4">
                    <div className="text-sm text-muted-foreground">
                        Characters: <span className="text-foreground font-mono">{userInput.length}/{targetCode.length}</span>
                    </div>
                    {elapsed && (
                        <>
                            <div className="text-sm text-muted-foreground">
                                Time: <span className="text-green-500 font-bold">{elapsed}s</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Speed: <span className="text-[#06B6D4] font-bold">{wpm} WPM</span>
                            </div>
                            <div className="text-sm text-[#F59E0B] font-bold">+{challenge.xp} XP ⚡</div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== GAME COMPLETE SCREEN ====================
function GameComplete({
    title,
    score,
    total,
    emoji,
    color,
    onReplay,
}: {
    title: string;
    score: number;
    total: number;
    emoji: string;
    color: string;
    onReplay: () => void;
}) {
    const pct = Math.round((score / total) * 100);
    const grade = pct >= 90 ? "S" : pct >= 70 ? "A" : pct >= 50 ? "B" : pct >= 30 ? "C" : "D";
    const gradeEmoji = pct >= 90 ? "🌟" : pct >= 70 ? "⭐" : pct >= 50 ? "✨" : "💪";

    return (
        <div className="max-w-lg mx-auto text-center py-12">
            <div className="bg-card rounded-3xl border border-border p-10 shadow-xl">
                <div className="text-6xl mb-4">{emoji}</div>
                <h2 className="text-3xl font-bold text-foreground mb-2">{title} Complete!</h2>
                <p className="text-muted-foreground mb-8">Great work! Here are your results:</p>

                <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 relative" style={{ background: `conic-gradient(${color} ${pct}%, transparent ${pct}%)`, padding: "6px" }}>
                    <div className="w-full h-full rounded-full bg-card flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">{grade}</span>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                </div>

                <div className="flex justify-center gap-8 mb-8">
                    <div>
                        <div className="text-2xl font-bold text-foreground">{score}</div>
                        <div className="text-xs text-muted-foreground">Correct</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{total - score}</div>
                        <div className="text-xs text-muted-foreground">Wrong</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold" style={{ color }}>{gradeEmoji}</div>
                        <div className="text-xs text-muted-foreground">Grade</div>
                    </div>
                </div>

                <div className="flex gap-3 justify-center">
                    <button onClick={onReplay} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: color }}>
                        <RotateCcw className="w-4 h-4" /> Play Again
                    </button>
                    <Link to="/learn" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        📚 Learn More
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ==================== HERO GAME ====================
function HeroGame({ addXP, incrementStreak, resetStreak, markComplete, unlockAchievement, completedIds }: GameProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userCode, setUserCode] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [collected, setCollected] = useState(false);
    const [result, setResult] = useState<"correct" | "wrong" | null>(null);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const challenges = useMemo(() => heroChallenges, []);
    const level = challenges[currentIndex];

    useEffect(() => {
        setPlayerPos(level.startPos);
        setCollected(false);
        setResult(null);
        setUserCode(level.initialCode);
        setMessage(null);
        setIsExecuting(false);
    }, [currentIndex, level]);

    const runCode = async () => {
        if (isExecuting) return;
        setIsExecuting(true);
        setPlayerPos(level.startPos);
        setCollected(false);
        setMessage("Executing code...");

        const commands = userCode.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        const currentPos = { ...level.startPos };
        let hasCollected = false;

        for (const cmd of commands) {
            await new Promise(r => setTimeout(r, 600));

            if (cmd.includes("moveRight()")) currentPos.x = Math.min(level.gridSize - 1, currentPos.x + 1);
            else if (cmd.includes("moveLeft()")) currentPos.x = Math.max(0, currentPos.x - 1);
            else if (cmd.includes("moveDown()")) currentPos.y = Math.min(level.gridSize - 1, currentPos.y + 1);
            else if (cmd.includes("moveUp()")) currentPos.y = Math.max(0, currentPos.y - 1);

            // Check walls
            if (level.walls.some(w => w.x === currentPos.x && w.y === currentPos.y)) {
                setMessage("Ouch! You hit a wall 🧱");
                setResult("wrong");
                setIsExecuting(false);
                return;
            }

            setPlayerPos({ ...currentPos });

            // Check collectible
            if (level.collectiblePos && currentPos.x === level.collectiblePos.x && currentPos.y === level.collectiblePos.y) {
                hasCollected = true;
                setCollected(true);
            }
        }

        await new Promise(r => setTimeout(r, 400));

        const reachedGoal = currentPos.x === level.goalPos.x && currentPos.y === level.goalPos.y;
        const needsCollectible = !!level.collectiblePos;
        const success = reachedGoal && (!needsCollectible || hasCollected);

        if (success) {
            setMessage("Level Complete! 🏁");
            setResult("correct");
            setScore(s => s + 1);
            addXP(level.xp);
            markComplete(level.id);
            if (currentIndex === 0) unlockAchievement("puzzle_master");

            setTimeout(() => {
                if (currentIndex < challenges.length - 1) {
                    setCurrentIndex(i => i + 1);
                } else {
                    setFinished(true);
                }
            }, 2000);
        } else {
            setMessage(reachedGoal && needsCollectible && !hasCollected ? "You forgot the gem! 💎" : "Try again!");
            setResult("wrong");
        }
        setIsExecuting(false);
    };

    if (finished) {
        return <GameComplete title="Hero Quest" score={challenges.length} total={challenges.length} emoji="🧙" color="#D946EF" onReplay={() => { setCurrentIndex(0); setScore(0); setFinished(false); }} />;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Game Side */}
                <div className="flex-1 order-2 lg:order-1">
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-foreground">Level {currentIndex + 1}: {level.title}</h3>
                            <span className="text-xs text-[#F59E0B] font-bold">+{level.xp} XP</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">{level.description}</p>

                        {/* Grid */}
                        <div
                            className="aspect-square w-full max-w-[400px] mx-auto grid gap-1 p-2 bg-secondary/50 rounded-xl relative"
                            style={{ gridTemplateColumns: `repeat(${level.gridSize}, 1fr)` }}
                        >
                            {[...Array(level.gridSize * level.gridSize)].map((_, i) => {
                                const x = i % level.gridSize;
                                const y = Math.floor(i / level.gridSize);
                                const isWall = level.walls.some(w => w.x === x && w.y === y);
                                const isGoal = level.goalPos.x === x && level.goalPos.y === y;
                                const isGem = level.collectiblePos?.x === x && level.collectiblePos?.y === y && !collected;
                                const isPlayer = playerPos.x === x && playerPos.y === y;

                                return (
                                    <div key={i} className="aspect-square bg-card/50 rounded-lg flex items-center justify-center text-2xl relative border border-border/10">
                                        {isWall && <span className="animate-in fade-in zoom-in">🧱</span>}
                                        {isGoal && <span className="animate-pulse">🏁</span>}
                                        {isGem && <span className="animate-bounce">💎</span>}
                                        {isPlayer && (
                                            <div className="absolute transition-all duration-300 transform scale-125 z-10">
                                                🧙
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {message && (
                            <div className={`mt-6 p-4 rounded-xl text-center font-bold animate-fade-in-up ${result === "correct" ? "bg-green-500/10 text-green-500" : "bg-card border border-border text-muted-foreground"}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Code Side */}
                <div className="w-full lg:w-[400px] order-1 lg:order-2">
                    <div className="bg-[#1e1e2e] rounded-2xl border border-border p-6 shadow-xl flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <Code2 className="w-5 h-5 text-purple-400" />
                            <h4 className="font-bold text-white">Code Editor</h4>
                        </div>

                        <div className="flex-1 mb-4">
                            <textarea
                                value={userCode}
                                onChange={(e) => setUserCode(e.target.value)}
                                spellCheck={false}
                                placeholder="// Type your code here..."
                                className="w-full min-h-[300px] bg-[#282a36] text-[#f8f8f2] p-4 rounded-xl font-mono text-sm border-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={runCode}
                                disabled={isExecuting}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                <Zap className="w-4 h-4" /> {isExecuting ? "Executing..." : "Run Code"}
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="p-2 bg-white/5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={() => setUserCode(prev => prev + "hero.moveRight();\n")}>moveRight()</button>
                                <button className="p-2 bg-white/5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={() => setUserCode(prev => prev + "hero.moveDown();\n")}>moveDown()</button>
                                <button className="p-2 bg-white/5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={() => setUserCode(prev => prev + "hero.moveLeft();\n")}>moveLeft()</button>
                                <button className="p-2 bg-white/5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={() => setUserCode(prev => prev + "hero.moveUp();\n")}>moveUp()</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CodeQuest;
