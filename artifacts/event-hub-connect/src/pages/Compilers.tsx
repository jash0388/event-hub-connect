import { useState, useEffect, useRef } from "react";
import { Play, Copy, Check, Home } from "lucide-react";
import { Link } from "react-router-dom";

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
        setOut("⏳ Running...");
        if (lang === "javascript") {
            const logs: string[] = [];
            const c = {
                log: (...a: any[]) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ")),
                error: (...a: any[]) => logs.push("❌ " + a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" "))
            };
            try { new Function("console", code)(c); } catch (e: any) { logs.push("❌ Error: " + e.message); }
            setOut(logs.join("\n") || "✅ Done (no output)");
        }
        else if (lang === "python") {
            if (!pyodide) { setOut("⏳ Python loading... wait a moment"); return; }
            (async () => {
                try {
                    pyodide.runPython("import sys; from io import StringIO; sys.stdout = StringIO(); sys.stderr = StringIO()");
                    try { pyodide.runPython(code); } catch (e: any) { setOut("❌ Error: " + e.message); return; }
                    const o = pyodide.runPython("sys.stdout.getvalue()");
                    const e = pyodide.runPython("sys.stderr.getvalue()");
                    setOut(e ? "❌ Error: " + e : (o || "✅ Done (no output)"));
                } catch (e: any) { setOut("❌ Error: " + e.message); }
            })();
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        // Sync scroll if needed - for now simple textarea works
    };

    return (
        <div className="min-h-screen" style={{
            background: "linear-gradient(180deg, #0F172A 0%, #111827 100%)"
        }}>
            <div className="max-w-4xl mx-auto px-4 py-16">

                {/* Header with Home Button */}
                <div className="flex items-center justify-center mb-12 relative">
                    <Link
                        to="/"
                        className="absolute left-0 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
                    >
                        <Home size={20} />
                        <span className="font-medium">Home</span>
                    </Link>

                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-[#F9FAFB] mb-3">
                            Code Compiler
                            <span className="block w-24 h-1 bg-[#22C55E] mx-auto mt-3 rounded-full"></span>
                        </h1>
                        <p className="text-[#9CA3AF] text-lg">Write and run code in your browser - completely free!</p>
                    </div>
                </div>

                {/* Language Buttons */}
                <div className="flex justify-center gap-3 mb-8">
                    <button
                        onClick={() => { setLang("python"); setCode(defaultCode.python); setOut(""); }}
                        className={`px-6 py-3 rounded-full font-semibold transition-all ${lang === "python"
                            ? "bg-[#22C55E] text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                            : "bg-[#1E293B] text-gray-400 border border-white/10 hover:bg-[#334155] hover:text-white"
                            }`}
                    >
                        🐍 Python {pyLoading ? "..." : pyodide ? "✓ Ready" : "⏳"}
                    </button>
                    <button
                        onClick={() => { setLang("javascript"); setCode(defaultCode.javascript); setOut(""); }}
                        className={`px-6 py-3 rounded-full font-semibold transition-all ${lang === "javascript"
                            ? "bg-[#22C55E] text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                            : "bg-[#1E293B] text-gray-400 border border-white/10 hover:bg-[#334155] hover:text-white"
                            }`}
                    >
                        📜 JavaScript ✓ Ready
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-[#1E293B] rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden border border-white/[0.08]" style={{ animation: 'fadeInUp 0.6s ease-out both' }}>
                    {/* Editor Header */}
                    <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4 flex items-center justify-between border-b border-white/[0.08]">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-gray-400 font-mono text-sm">
                                {lang === "python" ? "🐍 main.py" : "📜 main.js"}
                            </span>
                        </div>
                        <button
                            onClick={copyCode}
                            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
                        >
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>

                    {/* Code Editor - Simple working textarea */}
                    <div className="bg-[#0F172A]">
                        <textarea
                            ref={textareaRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onScroll={handleScroll}
                            className="w-full h-72 p-6 font-mono text-sm text-gray-100 bg-[#0F172A] resize-none focus:outline-none border-0"
                            spellCheck={false}
                            style={{
                                lineHeight: '1.6',
                                tabSize: 4,
                            }}
                            placeholder={lang === "python" ? "# Write your Python code here..." : "// Write your JavaScript code here..."}
                        />
                    </div>

                    {/* Run Button */}
                    <div className="px-6 py-4 bg-[#0F172A] border-t border-white/[0.08]">
                        <button
                            onClick={run}
                            className="w-full py-4 bg-[#22C55E] text-white text-lg font-bold rounded-xl flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:shadow-[0_0_35px_rgba(34,197,94,0.5)] hover:bg-[#16A34A] transition-all"
                        >
                            <Play size={24} />
                            Run Code
                        </button>
                    </div>
                </div>

                {/* Output */}
                <div className="mt-6 bg-[#1E293B] rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden border border-white/[0.08]" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>
                    <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-3 border-b border-white/[0.08]">
                        <span className="text-gray-400 font-mono text-sm">📟 Output</span>
                    </div>
                    <pre className="h-48 p-6 font-mono text-sm text-[#22C55E] overflow-auto whitespace-pre-wrap">
                        {out || "👆 Click 'Run Code' to see output..."}
                    </pre>
                </div>

                {/* Info */}
                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        💡 <strong className="text-gray-400">Python</strong> runs via WebAssembly (Pyodide) • <strong className="text-gray-400">JavaScript</strong> runs in browser
                    </p>
                    <p className="text-gray-600 text-xs mt-2">
                        C/C++/Java require paid API keys. Contact us to add more languages!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Compilers;
