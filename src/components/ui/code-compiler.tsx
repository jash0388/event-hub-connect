"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Code2,
    Copy,
    Play,
    Home,
    ChevronRight,
    Terminal,
    FileCode,
    Layers,
    Box,
    Cpu,
    Database,
    Globe,
    Smartphone,
    Watch,
    Cloud,
    Shield,
    Zap as Lightning,
    ArrowRight,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info
} from 'lucide-react';

function cn(...classes: (string | undefined | null | boolean)[]): string {
    return classes.filter(Boolean).join(" ");
}

interface RotatingTextRef {
    next: () => void;
    previous: () => void;
    jumpTo: (index: number) => void;
    reset: () => void;
}

interface RotatingTextProps {
    texts: string[];
    mainClassName?: string;
    splitLevelClassName?: string;
    elementLevelClassName?: string;
}

const RotatingText = React.forwardRef<RotatingTextRef, RotatingTextProps>(
    ({ texts, mainClassName, splitLevelClassName, elementLevelClassName }, ref) => {
        const [currentTextIndex, setCurrentTextIndex] = useState<number>(0);
        const intervalRef = useRef<NodeJS.Timeout | null>(null);

        const splitIntoCharacters = (text: string): string[] => {
            if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
                try {
                    const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
                    return Array.from(segmenter.segment(text), (segment: any) => segment.segment);
                } catch (error) {
                    return text.split('');
                }
            }
            return text.split('');
        };

        const elements = useMemo(() => {
            const currentText: string = texts[currentTextIndex] ?? '';
            const words = currentText.split(/(\s+)/);
            let charCount = 0;
            return words.filter(part => part.length > 0).map((part) => {
                const isSpace = /^\s+$/.test(part);
                const chars = isSpace ? [part] : splitIntoCharacters(part);
                const startIndex = charCount;
                charCount += chars.length;
                return { characters: chars, isSpace: isSpace, startIndex: startIndex };
            });
        }, [texts, currentTextIndex]);

        const totalElements = useMemo(() => elements.reduce((sum, el) => sum + el.characters.length, 0), [elements]);

        const handleIndexChange = useCallback((newIndex: number) => {
            setCurrentTextIndex(newIndex);
        }, []);

        const next = useCallback(() => {
            const nextIndex = currentTextIndex === texts.length - 1 ? 0 : currentTextIndex + 1;
            if (nextIndex !== currentTextIndex) handleIndexChange(nextIndex);
        }, [currentTextIndex, texts.length, handleIndexChange]);

        const previous = useCallback(() => {
            const prevIndex = currentTextIndex === 0 ? texts.length - 1 : currentTextIndex - 1;
            if (prevIndex !== currentTextIndex) handleIndexChange(prevIndex);
        }, [currentTextIndex, texts.length, handleIndexChange]);

        const jumpTo = useCallback((index: number) => {
            const validIndex = Math.max(0, Math.min(index, texts.length - 1));
            if (validIndex !== currentTextIndex) handleIndexChange(validIndex);
        }, [texts.length, currentTextIndex, handleIndexChange]);

        const reset = useCallback(() => {
            if (currentTextIndex !== 0) handleIndexChange(0);
        }, [currentTextIndex, handleIndexChange]);

        React.useImperativeHandle(ref, () => ({ next, previous, jumpTo, reset }), [next, previous, jumpTo, reset]);

        useEffect(() => {
            intervalRef.current = setInterval(next, 2500);
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }, [next]);

        return (
            <motion.span
                className={cn("inline-flex flex-wrap whitespace-pre-wrap relative align-bottom", mainClassName)}
                layout
            >
                <span className="sr-only">{texts[currentTextIndex]}</span>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={currentTextIndex}
                        className={cn("inline-flex flex-wrap relative items-baseline", splitLevelClassName)}
                        layout
                        aria-hidden="true"
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "-120%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        {elements.map((elementObj, elementIndex) => (
                            <span
                                key={elementIndex}
                                className={cn("inline-flex", splitLevelClassName)}
                                style={{ whiteSpace: 'pre' }}
                            >
                                {elementObj.characters.map((char, charIndex) => {
                                    const globalIndex = elementObj.startIndex + charIndex;
                                    return (
                                        <motion.span
                                            key={`${char}-${charIndex}`}
                                            initial={{ y: "100%", opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{
                                                type: "spring",
                                                damping: 25,
                                                stiffness: 300,
                                                delay: globalIndex * 0.01,
                                            }}
                                            className={cn("inline-block leading-none tracking-tight", elementLevelClassName)}
                                        >
                                            {char === ' ' ? '\u00A0' : char}
                                        </motion.span>
                                    );
                                })}
                            </span>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </motion.span>
        );
    }
);
RotatingText.displayName = "RotatingText";

const CodeCompiler: React.FC = () => {
    const [activeLanguage, setActiveLanguage] = useState<'python' | 'javascript'>('python');
    const [copied, setCopied] = useState<boolean>(false);
    const [output, setOutput] = useState<string>('Click "Run Code" to see output...');
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const rotatingTextRef = React.useRef<RotatingTextRef>(null);

    const pythonCode = `print("Hello DataNauts!")
print("Welcome to Event Hub")

numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print("Sum =", total)

def greet(name):
    return "Hello, " + name + "!"

print(greet("Student"))`;

    const jsCode = `console.log("Hello DataNauts!");
console.log("Welcome to Event Hub");

const numbers = [1, 2, 3, 4, 5];
const total = numbers.reduce((a, b) => a + b, 0);
console.log("Sum =", total);

function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("Student"));`;

    const [codeContent, setCodeContent] = useState<string>(pythonCode);

    const handleCopy = () => {
        navigator.clipboard.writeText(codeContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput('Running...');

        const logs: string[] = [];

        if (activeLanguage === 'javascript') {
            try {
                // Create a custom console that captures logs
                const customConsole = {
                    log: (...args: any[]) => {
                        const output = args.map(arg => {
                            if (arg === undefined) return 'undefined';
                            if (arg === null) return 'null';
                            if (typeof arg === 'object') {
                                try {
                                    return JSON.stringify(arg, null, 2);
                                } catch {
                                    return String(arg);
                                }
                            }
                            return String(arg);
                        }).join(' ');
                        logs.push(output);
                    },
                    error: (...args: any[]) => {
                        logs.push('Error: ' + args.map(String).join(' '));
                    },
                    warn: (...args: any[]) => {
                        logs.push('Warning: ' + args.map(String).join(' '));
                    },
                    info: (...args: any[]) => {
                        logs.push('Info: ' + args.map(String).join(' '));
                    }
                };

                // Create a sandboxed function with custom console
                const sandboxedCode = `
                    (function(console) {
                        ${codeContent}
                    })
                `;

                // Use eval in a try-catch with custom console
                const fn = new Function('console', codeContent);
                fn(customConsole);

                if (logs.length > 0) {
                    setOutput(logs.join('\n'));
                } else {
                    setOutput('Code executed successfully (no output)');
                }
            } catch (error: any) {
                setOutput(`Error: ${error.message}`);
            }
        } else {
            // Python parser - more robust implementation
            try {
                const pythonOutput: string[] = [];
                const variables: Record<string, any> = {};
                const functions: Record<string, string> = {};

                const lines = codeContent.split('\n');
                let i = 0;

                while (i < lines.length) {
                    const line = lines[i];
                    const trimmed = line.trim();

                    // Skip empty lines and comments
                    if (!trimmed || trimmed.startsWith('#')) {
                        i++;
                        continue;
                    }

                    // Function definition
                    const funcMatch = trimmed.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*:/);
                    if (funcMatch) {
                        const funcName = funcMatch[1];
                        const params = funcMatch[2].split(',').map((p: string) => p.trim()).filter((p: string) => p);
                        let funcBody = '';
                        i++;
                        while (i < lines.length && !lines[i].trim().startsWith('def ') && lines[i].trim() !== '' && !lines[i].match(/^\s*[^#]/)) {
                            funcBody += lines[i] + '\n';
                            i++;
                        }
                        functions[funcName] = funcBody;
                        continue;
                    }

                    // Print statement with string literal: print("hello") or print('hello')
                    const printStringMatch = trimmed.match(/^print\s*\(\s*['"](.*?)['"]\s*\)$/);
                    if (printStringMatch) {
                        pythonOutput.push(printStringMatch[1]);
                        i++;
                        continue;
                    }

                    // Print statement with concatenation: print("hello " + name)
                    const printConcatMatch = trimmed.match(/^print\s*\(\s*['"](.*?)['"]\s*\+\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/);
                    if (printConcatMatch) {
                        const str = printConcatMatch[1];
                        const varName = printConcatMatch[2];
                        const value = variables[varName] ?? '';
                        pythonOutput.push(str + value);
                        i++;
                        continue;
                    }

                    // Print statement with variable: print(x)
                    const printVarMatch = trimmed.match(/^print\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/);
                    if (printVarMatch) {
                        const varName = printVarMatch[1];
                        if (variables[varName] !== undefined) {
                            pythonOutput.push(String(variables[varName]));
                        } else {
                            pythonOutput.push('');
                        }
                        i++;
                        continue;
                    }

                    // Print statement with expression: print(1+2) or print("hello")
                    const printExprMatch = trimmed.match(/^print\s*\(\s*(.+)\s*\)$/);
                    if (printExprMatch) {
                        const expr = printExprMatch[1].trim();
                        // Check if it's a string literal
                        if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
                            pythonOutput.push(expr.slice(1, -1));
                        } else if (!isNaN(Number(expr))) {
                            pythonOutput.push(expr);
                        } else if (variables[expr] !== undefined) {
                            pythonOutput.push(String(variables[expr]));
                        } else {
                            // Try to evaluate simple math
                            try {
                                const mathExpr = expr.replace(/([a-zA-Z_][a-zA-Z0-9_]*)/g, (match) => {
                                    return variables[match] !== undefined ? String(variables[match]) : match;
                                });
                                // eslint-disable-next-line no-eval
                                const result = eval(mathExpr);
                                pythonOutput.push(String(result));
                            } catch {
                                pythonOutput.push('');
                            }
                        }
                        i++;
                        continue;
                    }

                    // Variable assignment: x = 5 or name = "John"
                    const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
                    if (assignMatch && !trimmed.includes('==') && !trimmed.includes('!=') && !trimmed.includes('<=') && !trimmed.includes('>=')) {
                        const varName = assignMatch[1];
                        let varValue: any = assignMatch[2].trim();

                        // Remove trailing semicolon if present
                        varValue = varValue.replace(/;$/, '');

                        // Parse the value
                        if (!isNaN(Number(varValue))) {
                            variables[varName] = Number(varValue);
                        } else if ((varValue.startsWith('"') && varValue.endsWith('"')) || (varValue.startsWith("'") && varValue.endsWith("'"))) {
                            variables[varName] = varValue.slice(1, -1);
                        } else if (variables[varValue] !== undefined) {
                            variables[varName] = variables[varValue];
                        } else if (varValue.includes('+')) {
                            // String or number concatenation
                            const parts = varValue.split('+').map((p: string) => p.trim());
                            const evaluated = parts.map((p: string) => {
                                if (!isNaN(Number(p))) return Number(p);
                                if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) return p.slice(1, -1);
                                if (variables[p] !== undefined) return variables[p];
                                return p;
                            });
                            variables[varName] = evaluated.join('');
                        } else {
                            variables[varName] = varValue;
                        }
                        i++;
                        continue;
                    }

                    // For loop: for i in range(5):
                    const forMatch = trimmed.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+range\s*\(\s*(\d+)\s*\):$/);
                    if (forMatch) {
                        const loopVar = forMatch[1];
                        const limit = parseInt(forMatch[2]);
                        let loopBody = '';
                        i++;
                        while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('for ') && !lines[i].trim().startsWith('def ')) {
                            loopBody = lines[i].replace(/^\s{4}/, '');
                            // Execute print in loop
                            const loopPrintMatch = loopBody.match(/^print\s*\(\s*(.+)\s*\)$/);
                            if (loopPrintMatch) {
                                const expr = loopPrintMatch[1].trim();
                                if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
                                    pythonOutput.push(expr.slice(1, -1));
                                } else if (expr === loopVar || variables[expr] !== undefined) {
                                    // This is just a placeholder - actual loop execution would need more work
                                }
                            }
                            i++;
                        }
                        // Simple loop execution
                        for (let j = 0; j < limit; j++) {
                            variables[loopVar] = j;
                            pythonOutput.push(String(j));
                        }
                        continue;
                    }

                    i++;
                }

                if (pythonOutput.length > 0) {
                    setOutput(pythonOutput.join('\n'));
                } else {
                    setOutput('Code executed successfully (no output)');
                }
            } catch (error: any) {
                setOutput(`Error: ${error.message}`);
            }
        }

        setIsRunning(false);
    };

    const handleLanguageSwitch = (lang: 'python' | 'javascript') => {
        setActiveLanguage(lang);
        setCodeContent(lang === 'python' ? pythonCode : jsCode);
        setOutput('Click "Run Code" to see output...');
    };

    return (
        <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <header className="px-6 py-4 border-b border-slate-200/60 bg-white/70 backdrop-blur-md shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg"
                        >
                            <Zap className="w-5 h-5 text-white" fill="white" />
                        </motion.div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                DataNauts
                            </h1>
                            <p className="text-xs text-slate-500">Code Compiler</p>
                        </div>
                    </div>
                    <a
                        href="/"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:shadow-md transition-all text-sm font-medium text-slate-700"
                    >
                        <Home className="w-4 h-4" />
                        Back to Home
                    </a>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 md:py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-4xl mx-auto space-y-8"
                >
                    {/* Hero Section */}
                    <div className="text-center space-y-5">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/30 mx-auto"
                        >
                            <Zap className="w-12 h-12 text-white" fill="white" />
                        </motion.div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                            Code <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Compiler</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                            Write and run code in your browser - completely free!
                        </p>
                    </div>

                    {/* Language Switcher */}
                    <div className="flex items-center justify-center gap-3">
                        <motion.button
                            onClick={() => handleLanguageSwitch('python')}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={cn(
                                "px-7 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg",
                                activeLanguage === 'python'
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/50"
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-slate-200/50"
                            )}
                        >
                            <Code2 className="w-4 h-4" />
                            Python {activeLanguage === 'python' && '✓ Ready'}
                        </motion.button>

                        <motion.button
                            onClick={() => handleLanguageSwitch('javascript')}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={cn(
                                "px-7 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg",
                                activeLanguage === 'javascript'
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/50"
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-slate-200/50"
                            )}
                        >
                            <Code2 className="w-4 h-4" />
                            JavaScript {activeLanguage === 'javascript' && '✓ Ready'}
                        </motion.button>
                    </div>

                    {/* Code Editor */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-5 py-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors cursor-pointer"></div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                                    <Code2 className="w-4 h-4" />
                                    <span>main.{activeLanguage === 'python' ? 'py' : 'js'}</span>
                                </div>
                            </div>
                            <motion.button
                                onClick={handleCopy}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors text-white text-sm font-medium shadow-lg"
                            >
                                <Copy className="w-4 h-4" />
                                {copied ? 'Copied!' : 'Copy'}
                            </motion.button>
                        </div>

                        <div className="bg-[#0f172a] p-6 max-h-[400px] overflow-y-auto">
                            <textarea
                                value={codeContent}
                                onChange={(e) => setCodeContent(e.target.value)}
                                className="w-full h-[300px] bg-transparent text-sm font-mono text-slate-100 leading-relaxed resize-none outline-none border-none"
                                spellCheck={false}
                                placeholder="Write your code here..."
                            />
                        </div>

                        <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 border-t border-slate-200/60">
                            <motion.button
                                onClick={handleRunCode}
                                disabled={isRunning}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-500/30"
                            >
                                {isRunning ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Terminal className="w-5 h-5" />
                                        </motion.div>
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5" fill="white" />
                                        Run Code
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Output Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-5 py-3.5 flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500 animate-pulse"></div>
                            <span className="text-slate-300 text-sm font-semibold">Output</span>
                            {isRunning && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="ml-auto text-xs text-yellow-400"
                                >
                                    Executing...
                                </motion.span>
                            )}
                        </div>

                        <div className="bg-[#0f172a] p-6 min-h-[140px]">
                            {output === 'Click "Run Code" to see output...' ? (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">Click "Run Code" to see output...</span>
                                </div>
                            ) : (
                                <pre className="text-sm font-mono text-emerald-400 leading-relaxed">
                                    {output.split('\n').map((line, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className="text-slate-600">➜</span>
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                </pre>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="py-6 border-t border-slate-200/60 bg-white/50">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <p className="text-sm text-slate-500">
                        Built with ⚡ by DataNauts Team
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default CodeCompiler;
