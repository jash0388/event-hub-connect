import { useState, useEffect, useRef } from "react";
import { Play, Copy, Check } from "lucide-react";

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
            background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)"
        }}>
            <div className="max-w-4xl mx-auto px-4 py-12">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mb-4 shadow-lg">
                        <span className="text-4xl">⚡</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Code <span className="text-orange-600">Compiler</span>
                    </h1>
                    <p className="text-gray-600 text-lg">Write and run code in your browser - completely free!</p>
                </div>

                {/* Language Buttons */}
                <div className="flex justify-center gap-3 mb-6">
                    <button
                        onClick={() => { setLang("python"); setCode(defaultCode.python); setOut(""); }}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${lang === "python"
                                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg"
                                : "bg-white text-gray-700 shadow-md hover:shadow-lg"
                            }`}
                    >
                        🐍 Python {pyLoading ? "..." : pyodide ? "✓ Ready" : "⏳"}
                    </button>
                    <button
                        onClick={() => { setLang("javascript"); setCode(defaultCode.javascript); setOut(""); }}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${lang === "javascript"
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
                                : "bg-white text-gray-700 shadow-md hover:shadow-lg"
                            }`}
                    >
                        📜 JavaScript ✓ Ready
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Editor Header */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-gray-300 font-mono text-sm">
                                {lang === "python" ? "🐍 main.py" : "📜 main.js"}
                            </span>
                        </div>
                        <button
                            onClick={copyCode}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                        >
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>

                    {/* Code Editor - Simple working textarea */}
                    <div className="bg-[#1e1e1e]">
                        <textarea
                            ref={textareaRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onScroll={handleScroll}
                            className="w-full h-72 p-6 font-mono text-sm text-gray-100 bg-[#1e1e1e] resize-none focus:outline-none border-0"
                            spellCheck={false}
                            style={{
                                lineHeight: '1.6',
                                tabSize: 4,
                            }}
                            placeholder={lang === "python" ? "# Write your Python code here..." : "// Write your JavaScript code here..."}
                        />
                    </div>

                    {/* Run Button */}
                    <div className="px-6 py-4 bg-gray-50 border-t">
                        <button
                            onClick={run}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                        >
                            <Play size={24} />
                            Run Code
                        </button>
                    </div>
                </div>

                {/* Output */}
                <div className="mt-6 bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-3">
                        <span className="text-gray-400 font-mono text-sm">📟 Output</span>
                    </div>
                    <pre className="h-48 p-6 font-mono text-sm text-green-400 overflow-auto whitespace-pre-wrap">
                        {out || "👆 Click 'Run Code' to see output..."}
                    </pre>
                </div>

                {/* Info */}
                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        💡 <strong>Python</strong> runs via WebAssembly (Pyodide) • <strong>JavaScript</strong> runs in browser
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                        C/C++/Java require paid API keys. Contact us to add more languages!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Compilers;
