import { useState, useEffect, useRef } from "react";
import { Play, Copy, Check, Terminal, Code2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

declare global { interface Window { loadPyodide: any; } }

const defaultCode: Record<string, string> = {
    python: `print("Hello DataNauts!")
print("Welcome to Event Hub")

numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print("Sum =", total)

def greet(name):
    return "Hello, " + name + "!"

print(greet("Student"))`,

    javascript: `console.log("Hello DataNauts!");
console.log("Welcome to Event Hub");

const numbers = [1, 2, 3, 4, 5];
const total = numbers.reduce((a, b) => a + b, 0);
console.log("Sum = " + total);

function greet(name) {
    return "Hello, " + name + "!";
}

console.log(greet("Student"));`,
};

const Compilers = () => {
    const [lang, setLang] = useState("python");
    const [code, setCode] = useState(defaultCode.python);
    const [out, setOut] = useState("");
    const [pyodide, setPyodide] = useState<any>(null);
    const [pyLoading, setPyLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (window.loadPyodide) {
            window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' })
                .then((py: any) => { setPyodide(py); setPyLoading(false); })
                .catch(() => setPyLoading(false));
        } else {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
            s.onload = () => window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' })
                .then((py: any) => { setPyodide(py); setPyLoading(false); })
                .catch(() => setPyLoading(false));
            document.head.appendChild(s);
        }
    }, []);

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const run = () => {
        setOut("");
        setIsRunning(true);
        
        if (lang === "javascript") {
            const logs: string[] = [];
            const c = {
                log: (...a: any[]) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ")),
                error: (...a: any[]) => logs.push("Error: " + a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" "))
            };
            try { new Function("console", code)(c); } catch (e: any) { logs.push("Error: " + e.message); }
            setTimeout(() => {
                setOut(logs.join("\n") || "Done (no output)");
                setIsRunning(false);
            }, 300);
        }
        else if (lang === "python") {
            if (!pyodide) { setOut("Python is still loading... please wait a moment"); setIsRunning(false); return; }
            (async () => {
                try {
                    pyodide.runPython("import sys; from io import StringIO; sys.stdout = StringIO(); sys.stderr = StringIO()");
                    try { pyodide.runPython(code); } catch (e: any) { setOut("Error: " + e.message); setIsRunning(false); return; }
                    const o = pyodide.runPython("sys.stdout.getvalue()");
                    const e = pyodide.runPython("sys.stderr.getvalue()");
                    setOut(e ? "Error: " + e : (o || "Done (no output)"));
                } catch (e: any) { setOut("Error: " + e.message); }
                setIsRunning(false);
            })();
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#030303]">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[128px]" />
            </div>

            <Header />

            <main className="flex-1 pt-28 sm:pt-32 pb-16 relative z-10">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Header */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6">
                            <Terminal className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-zinc-400">Code Playground</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
                            Online Compiler
                        </h1>
                        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                            Write and run code directly in your browser - completely free!
                        </p>
                    </motion.div>

                    {/* Language Toggle */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex justify-center gap-3 mb-8"
                    >
                        <button
                            onClick={() => { setLang("python"); setCode(defaultCode.python); setOut(""); }}
                            className={cn(
                                "px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2",
                                lang === "python"
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                                    : "bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white"
                            )}
                        >
                            <span>Python</span>
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-md",
                                lang === "python" ? "bg-white/20" : "bg-white/[0.05]"
                            )}>
                                {pyLoading ? "Loading..." : pyodide ? "Ready" : "Error"}
                            </span>
                        </button>
                        <button
                            onClick={() => { setLang("javascript"); setCode(defaultCode.javascript); setOut(""); }}
                            className={cn(
                                "px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2",
                                lang === "javascript"
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                                    : "bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white"
                            )}
                        >
                            <span>JavaScript</span>
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-md",
                                lang === "javascript" ? "bg-white/20" : "bg-white/[0.05]"
                            )}>Ready</span>
                        </button>
                    </motion.div>

                    {/* Editor Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
                    >
                        {/* Editor Header */}
                        <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                    <Code2 className="w-4 h-4" />
                                    <span className="font-mono">
                                        {lang === "python" ? "main.py" : "main.js"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={copyCode}
                                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>

                        {/* Code Editor */}
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full h-72 p-5 font-mono text-sm text-zinc-100 bg-[#0a0a0a] resize-none focus:outline-none border-0"
                                spellCheck={false}
                                style={{ lineHeight: '1.7', tabSize: 4 }}
                                placeholder={lang === "python" ? "# Write your Python code here..." : "// Write your JavaScript code here..."}
                            />
                        </div>

                        {/* Run Button */}
                        <div className="px-5 py-4 bg-[#0a0a0a] border-t border-white/[0.06]">
                            <motion.button
                                onClick={run}
                                disabled={isRunning || (lang === "python" && pyLoading)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full h-12 bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className={cn("w-5 h-5", isRunning && "animate-pulse")} />
                                {isRunning ? "Running..." : "Run Code"}
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Output Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden"
                    >
                        <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-zinc-500" />
                            <span className="text-zinc-400 text-sm font-medium">Output</span>
                        </div>
                        <pre className="h-44 p-5 font-mono text-sm text-emerald-400 overflow-auto whitespace-pre-wrap bg-[#0a0a0a]">
                            {out || <span className="text-zinc-600">Click 'Run Code' to see output...</span>}
                        </pre>
                    </motion.div>

                    {/* Info */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-8 text-center space-y-2"
                    >
                        <p className="text-zinc-500 text-sm">
                            <strong className="text-zinc-400">Python</strong> runs via WebAssembly (Pyodide) • <strong className="text-zinc-400">JavaScript</strong> runs in browser
                        </p>
                        <p className="text-zinc-600 text-xs">
                            More languages coming soon!
                        </p>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Compilers;
