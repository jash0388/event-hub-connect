import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getTopicById, getAllTopics } from "@/data/tutorials";
import type { TutorialLesson, TutorialTopic } from "@/data/tutorials";
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Copy,
    Check,
    BookOpen,
    Code2,
    Menu,
    X,
    RotateCcw,
} from "lucide-react";

const Tutorial = () => {
    const { topicId, lessonId } = useParams<{ topicId: string; lessonId?: string }>();
    const navigate = useNavigate();
    const topic = topicId ? getTopicById(topicId) : undefined;

    const [activeLessonIndex, setActiveLessonIndex] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Find lesson index from URL
    useEffect(() => {
        if (topic && lessonId) {
            const idx = topic.lessons.findIndex((l) => l.id === lessonId);
            if (idx >= 0) setActiveLessonIndex(idx);
        }
    }, [topic, lessonId]);

    if (!topic) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-4">Topic Not Found</h1>
                    <Link to="/learn" className="text-[#9B59B6] underline">
                        Back to Learn Hub
                    </Link>
                </div>
            </div>
        );
    }

    const lesson = topic.lessons[activeLessonIndex];
    const prevLesson = activeLessonIndex > 0 ? topic.lessons[activeLessonIndex - 1] : null;
    const nextLesson =
        activeLessonIndex < topic.lessons.length - 1
            ? topic.lessons[activeLessonIndex + 1]
            : null;

    // Find next topic
    const allTopics = getAllTopics();
    const currentTopicIdx = allTopics.findIndex((t) => t.id === topicId);
    const nextTopic = currentTopicIdx < allTopics.length - 1 ? allTopics[currentTopicIdx + 1] : null;

    const handleSelectLesson = (index: number) => {
        setActiveLessonIndex(index);
        navigate(`/learn/${topicId}/${topic.lessons[index].id}`, { replace: true });
        setSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePrev = () => {
        if (prevLesson) handleSelectLesson(activeLessonIndex - 1);
    };

    const handleNext = () => {
        if (nextLesson) handleSelectLesson(activeLessonIndex + 1);
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Topic Header Bar */}
            <div
                className="fixed top-20 left-0 right-0 z-50 border-b border-border/50"
                style={{
                    background: `linear-gradient(135deg, ${topic.color}08, transparent)`,
                    backdropFilter: "blur(12px)",
                }}
            >
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex items-center h-14 gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <Link
                            to="/learn"
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Learn
                        </Link>

                        <span className="text-muted-foreground/40">/</span>

                        <div className="flex items-center gap-2">
                            <span className="text-lg">{topic.icon}</span>
                            <span className="font-semibold text-foreground">{topic.title}</span>
                        </div>

                        <span className="text-muted-foreground/40 hidden sm:inline">/</span>
                        <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[200px]">
                            {lesson.title}
                        </span>

                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-muted-foreground hidden md:inline">
                                {activeLessonIndex + 1} / {topic.lessons.length}
                            </span>
                            <div
                                className="h-1.5 w-24 rounded-full overflow-hidden hidden md:block"
                                style={{ background: `${topic.color}20` }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${((activeLessonIndex + 1) / topic.lessons.length) * 100}%`,
                                        background: topic.gradient,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-[136px] flex">
                {/* Sidebar */}
                <aside
                    className={`fixed lg:sticky top-[136px] left-0 h-[calc(100vh-136px)] w-72 bg-card border-r border-border z-40 overflow-y-auto transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                        }`}
                >
                    <div className="p-4">
                        <h3
                            className="text-xs font-semibold uppercase tracking-wider mb-4"
                            style={{ color: topic.color }}
                        >
                            {topic.title} Tutorial
                        </h3>
                        <nav className="space-y-1">
                            {topic.lessons.map((l, i) => (
                                <button
                                    key={l.id}
                                    onClick={() => handleSelectLesson(i)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${i === activeLessonIndex
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                        }`}
                                    style={
                                        i === activeLessonIndex
                                            ? {
                                                background: `${topic.color}15`,
                                                boxShadow: `inset 3px 0 0 ${topic.color}`,
                                            }
                                            : {}
                                    }
                                >
                                    <span
                                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                                        style={{
                                            background: i === activeLessonIndex ? topic.color : "transparent",
                                            color: i === activeLessonIndex ? "white" : "inherit",
                                            border: i === activeLessonIndex ? "none" : "1px solid currentColor",
                                            opacity: i === activeLessonIndex ? 1 : 0.3,
                                        }}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="truncate">{l.title}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Next Topic Link */}
                        {nextTopic && (
                            <div className="mt-8 pt-6 border-t border-border">
                                <p className="text-xs text-muted-foreground mb-2">Next Topic</p>
                                <Link
                                    to={`/learn/${nextTopic.id}`}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                                >
                                    <span className="text-lg">{nextTopic.icon}</span>
                                    <span>{nextTopic.title}</span>
                                    <ChevronRight className="w-4 h-4 ml-auto" />
                                </Link>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Overlay for mobile sidebar */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
                        {/* Lesson Title */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                    style={{ background: `${topic.color}15` }}
                                >
                                    {topic.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: topic.color }}>
                                        {topic.title}
                                    </p>
                                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{lesson.title}</h1>
                                </div>
                            </div>
                        </div>

                        {/* Lesson Content */}
                        <div
                            className="prose prose-neutral dark:prose-invert max-w-none mb-10 tutorial-content"
                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                        />

                        {/* Code Editor */}
                        {lesson.code && (
                            <CodeEditor
                                initialCode={lesson.code}
                                language={lesson.language || "javascript"}
                                topicColor={topic.color}
                            />
                        )}

                        {/* Navigation Controls */}
                        <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
                            {prevLesson ? (
                                <button
                                    onClick={handlePrev}
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <div className="text-left">
                                        <p className="text-xs text-muted-foreground">Previous</p>
                                        <p>{prevLesson.title}</p>
                                    </div>
                                </button>
                            ) : (
                                <div />
                            )}

                            {nextLesson ? (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium hover:bg-secondary transition-all"
                                    style={{ color: topic.color }}
                                >
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Next</p>
                                        <p>{nextLesson.title}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : nextTopic ? (
                                <Link
                                    to={`/learn/${nextTopic.id}`}
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-foreground bg-foreground/5 hover:bg-foreground/10 transition-all"
                                >
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Next Topic</p>
                                        <p>
                                            {nextTopic.icon} {nextTopic.title}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <div />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />

            {/* Tutorial content styles */}
            <style>{`
        .tutorial-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: hsl(var(--foreground));
        }
        .tutorial-content h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }
        .tutorial-content p {
          margin-bottom: 1rem;
          line-height: 1.8;
          color: hsl(var(--muted-foreground));
        }
        .tutorial-content ul {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .tutorial-content li {
          margin-bottom: 0.5rem;
          line-height: 1.7;
          color: hsl(var(--muted-foreground));
        }
        .tutorial-content code {
          background: hsl(var(--secondary));
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.875em;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          color: hsl(var(--foreground));
        }
        .tutorial-content strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }
      `}</style>
        </div>
    );
};

// Code Editor Component with "Try It Yourself" functionality
function CodeEditor({
    initialCode,
    language,
    topicColor,
}: {
    initialCode: string;
    language: string;
    topicColor: string;
}) {
    const [code, setCode] = useState(initialCode);
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"code" | "output">("code");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleRun = useCallback(() => {
        setIsRunning(true);
        setActiveTab("output");

        // For HTML/CSS we render in an iframe
        if (language === "html" || language === "css") {
            setOutput(code);
            setIsRunning(false);
            return;
        }

        // For JavaScript, run in a sandboxed way
        if (language === "javascript") {
            try {
                const logs: string[] = [];
                const mockConsole = {
                    log: (...args: unknown[]) => {
                        logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
                    },
                    error: (...args: unknown[]) => {
                        logs.push("❌ " + args.map((a) => String(a)).join(" "));
                    },
                    warn: (...args: unknown[]) => {
                        logs.push("⚠️ " + args.map((a) => String(a)).join(" "));
                    },
                };

                // Remove DOM-specific code, alert, document references for safe eval
                let safeCode = code
                    .replace(/document\.\w+/g, '""')
                    .replace(/alert\([^)]*\)/g, 'console.log("Alert shown")')
                    .replace(/window\.\w+/g, '""');

                const fn = new Function("console", safeCode);
                fn(mockConsole);
                setOutput(logs.join("\n") || "✅ Code executed successfully (no output)");
            } catch (err: unknown) {
                setOutput(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
            }
            setIsRunning(false);
            return;
        }

        // For other languages (Python, Java, C, etc.) — show the code as "output preview"
        setOutput(
            `📝 ${language.toUpperCase()} code preview:\n\nThis language runs on a server. Use our Compilers page to execute ${language.toUpperCase()} code!\n\n💡 Tip: Go to /compilers for a full online compiler.`
        );
        setIsRunning(false);
    }, [code, language]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setCode(initialCode);
        setOutput("");
        setActiveTab("code");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newCode = code.substring(0, start) + "  " + code.substring(end);
            setCode(newCode);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                }
            }, 0);
        }
        // Ctrl/Cmd + Enter to run
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleRun();
        }
    };

    const lineCount = code.split("\n").length;

    return (
        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
            {/* Editor Header */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b border-border"
                style={{ background: `${topicColor}08` }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-400/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                        <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <div className="flex items-center gap-1 bg-secondary/50 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setActiveTab("code")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "code"
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Code2 className="w-3.5 h-3.5" />
                            Code
                        </button>
                        <button
                            onClick={() => setActiveTab("output")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "output"
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Output
                        </button>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase">
                        {language}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Reset code"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Copy code"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ background: topicColor }}
                    >
                        <Play className="w-3.5 h-3.5" />
                        {isRunning ? "Running..." : "Try it »"}
                    </button>
                </div>
            </div>

            {/* Code Panel */}
            {activeTab === "code" && (
                <div className="relative flex" style={{ minHeight: "300px" }}>
                    {/* Line Numbers */}
                    <div
                        className="flex-shrink-0 px-3 py-4 text-right select-none border-r border-border/50"
                        style={{
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontSize: "13px",
                            lineHeight: "1.6",
                            color: "hsl(var(--muted-foreground))",
                            opacity: 0.4,
                            background: "hsl(var(--secondary) / 0.3)",
                        }}
                    >
                        {Array.from({ length: lineCount }, (_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                    </div>

                    {/* Code textarea */}
                    <textarea
                        ref={textareaRef}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                        className="flex-1 resize-none p-4 bg-transparent text-foreground focus:outline-none"
                        style={{
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontSize: "13px",
                            lineHeight: "1.6",
                            tabSize: 2,
                            minHeight: "300px",
                        }}
                    />
                </div>
            )}

            {/* Output Panel */}
            {activeTab === "output" && (
                <div style={{ minHeight: "300px" }}>
                    {language === "html" || language === "css" ? (
                        <iframe
                            srcDoc={output || "<p style='color:#999;padding:20px;font-family:sans-serif'>Click 'Try it »' to see the result</p>"}
                            className="w-full bg-white"
                            style={{ minHeight: "300px", border: "none" }}
                            sandbox="allow-scripts"
                            title="Output"
                        />
                    ) : (
                        <pre
                            className="p-4 text-sm overflow-auto"
                            style={{
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                lineHeight: "1.6",
                                minHeight: "300px",
                                color: "hsl(var(--foreground))",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {output || "Click 'Try it »' to run the code"}
                        </pre>
                    )}
                </div>
            )}

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    💡 Press <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-xs">Enter</kbd> to run
                </span>
                <span className="text-xs text-muted-foreground">
                    {lineCount} lines
                </span>
            </div>
        </div>
    );
}

export default Tutorial;
