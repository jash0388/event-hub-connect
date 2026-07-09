import React, { useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Code2 } from "lucide-react";

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    language?: string;
    className?: string;
    minHeight?: string;
}

// VS Code color scheme - more accurate
const VSCODE_COLORS = {
    keywords: "#569cd6",       // Blue - keywords like def, class, if
    strings: "#ce9178",        // Orange-brown - strings
    numbers: "#b5cea8",        // Light green - numbers
    functions: "#dcdcaa",      // Yellow - function calls
    comments: "#6a9955",       // Green - comments
    operators: "#d4d4d4",      // Light gray - operators
    variables: "#9cdcfe",      // Light blue - variables
    brackets: "#ffd700",       // Gold - brackets
    properties: "#9cdcfe",     // Light blue - properties
};

function highlightCode(code: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    const lines = code.split("\n");

    const keywords = new Set([
        'def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import',
        'from', 'as', 'try', 'except', 'finally', 'with', 'async', 'await',
        'function', 'const', 'let', 'var', 'switch', 'case', 'break', 'continue',
        'new', 'this', 'typeof', 'instanceof', 'void', 'delete', 'throw',
        'public', 'private', 'protected', 'static', 'extends', 'implements',
        'true', 'false', 'null', 'undefined', 'and', 'or', 'not', 'in', 'is',
        'pass', 'raise', 'lambda', 'yield', 'global', 'nonlocal'
    ]);

    const builtins = new Set([
        'print', 'console', 'log', 'alert', 'Math', 'Array', 'Object', 'String',
        'Number', 'Boolean', 'Date', 'JSON', 'parseInt', 'parseFloat', 'len',
        'range', 'list', 'dict', 'set', 'tuple', 'int', 'str', 'float', 'input'
    ]);

    lines.forEach((line, lineIndex) => {
        const highlightedLine: React.ReactNode[] = [];
        let remaining = line;
        let keyIndex = 0;

        while (remaining.length > 0) {
            // Match multi-line strings first
            const stringMatch = remaining.match(/^(["'`])(?:(?!\1)[^\\]|\\.)*\1/);
            if (stringMatch) {
                highlightedLine.push(
                    <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.strings }}>
                        {stringMatch[0]}
                    </span>
                );
                remaining = remaining.slice(stringMatch[0].length);
                continue;
            }

            // Match comments
            const commentMatch = remaining.match(/^(\/\/.*|#.*)/);
            if (commentMatch) {
                highlightedLine.push(
                    <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.comments, fontStyle: 'italic' }}>
                        {commentMatch[0]}
                    </span>
                );
                remaining = remaining.slice(commentMatch[0].length);
                continue;
            }

            // Match numbers
            const numberMatch = remaining.match(/^(-?\d+\.?\d*)/);
            if (numberMatch) {
                highlightedLine.push(
                    <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.numbers }}>
                        {numberMatch[0]}
                    </span>
                );
                remaining = remaining.slice(numberMatch[0].length);
                continue;
            }

            // Match brackets and braces - gold as requested but VS Code style
            const bracketMatch = remaining.match(/^([{}[]()])/);
            if (bracketMatch) {
                highlightedLine.push(
                    <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.brackets }}>
                        {bracketMatch[0]}
                    </span>
                );
                remaining = remaining.slice(bracketMatch[0].length);
                continue;
            }

            // Match operators
            const operatorMatch = remaining.match(/^([+\-*/%=<>!&|^~?:]+)/);
            if (operatorMatch) {
                highlightedLine.push(
                    <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.operators }}>
                        {operatorMatch[0]}
                    </span>
                );
                remaining = remaining.slice(operatorMatch[0].length);
                continue;
            }

            // Match identifiers (keywords, builtins, variables)
            const identifierMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
            if (identifierMatch) {
                const word = identifierMatch[0];
                if (keywords.has(word)) {
                    highlightedLine.push(
                        <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.keywords }}>
                            {word}
                        </span>
                    );
                } else if (builtins.has(word)) {
                    highlightedLine.push(
                        <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.functions }}>
                            {word}
                        </span>
                    );
                } else {
                    highlightedLine.push(
                        <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.variables }}>
                            {word}
                        </span>
                    );
                }
                remaining = remaining.slice(word.length);
                continue;
            }

            // Match any other single character (including whitespace)
            highlightedLine.push(
                <span key={`${lineIndex}-${keyIndex++}`} style={{ color: VSCODE_COLORS.operators }}>
                    {remaining[0]}
                </span>
            );
            remaining = remaining.slice(1);
        }

        elements.push(
            <div key={lineIndex} className="whitespace-pre">
                {highlightedLine}
            </div>
        );
    });

    return elements;
}

export function CodeEditor({
    value,
    onChange,
    placeholder = "Write your code here...",
    language = "text",
    className,
    minHeight = "150px",
}: CodeEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    const lines = value.split("\n");
    const lineCount = lines.length;

    const highlightedCode = useMemo(() => {
        return highlightCode(value);
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();

            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            const newValue = value.substring(0, start) + "  " + value.substring(end);
            onChange(newValue);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            }, 0);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        // Scroll sync handled by CSS
    };

    return (
        <div
            className={cn(
                "relative flex rounded-2xl border border-border bg-[#1e1e1e] overflow-hidden",
                "focus-within:border-neon-cyan focus-within:ring-1 focus-within:ring-neon-cyan/30",
                className
            )}
            style={{ minHeight }}
        >
            {/* Line Numbers */}
            <div
                ref={lineNumbersRef}
                className="flex-shrink-0 py-3 px-2 bg-[#252526] border-r border-[#3c3c3c] text-right select-none"
                style={{ minWidth: "45px" }}
            >
                {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                    <div
                        key={i}
                        className="text-xs text-[#858585] font-mono leading-6"
                    >
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* Language Badge */}
                <div className="absolute top-2 right-2 z-10">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#2d2d2d] rounded-lg text-xs text-[#cccccc]">
                        <Code2 className="w-3 h-3" />
                        <span className="uppercase">{language}</span>
                    </div>
                </div>

                <div className="flex h-full overflow-auto">
                    {/* Highlighted Code Layer */}
                    <div
                        className="absolute inset-0 p-3 pt-10 font-mono text-sm leading-6 pointer-events-none overflow-auto"
                        style={{ color: "#d4d4d4" }}
                    >
                        {highlightedCode}
                    </div>

                    {/* Transparent Textarea Layer */}
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onScroll={(e) => {
                            // Sync scroll with parent
                            const target = e.target as HTMLTextAreaElement;
                            const parent = target.parentElement;
                            if (parent) {
                                parent.scrollTop = target.scrollTop;
                            }
                        }}
                        placeholder={placeholder}
                        spellCheck={false}
                        className="w-full h-full min-h-[150px] p-3 pt-10 bg-transparent text-transparent caret-white font-mono text-sm leading-6 resize-none focus:outline-none placeholder:text-[#6a6a6a]"
                        style={{
                            tabSize: 2,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}