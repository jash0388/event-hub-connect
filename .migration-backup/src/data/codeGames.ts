// Gamified coding challenges data

export interface QuizQuestion {
    id: string;
    question: string;
    code?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    language: string;
    difficulty: "easy" | "medium" | "hard";
    xp: number;
}

export interface BugChallenge {
    id: string;
    title: string;
    description: string;
    buggyCode: string;
    fixedCode: string;
    hint: string;
    language: string;
    difficulty: "easy" | "medium" | "hard";
    xp: number;
}

export interface PuzzleChallenge {
    id: string;
    title: string;
    description: string;
    correctOrder: string[];
    language: string;
    difficulty: "easy" | "medium" | "hard";
    xp: number;
}

export interface FillChallenge {
    id: string;
    title: string;
    description: string;
    codeTemplate: string; // Use ___ for blanks
    answers: string[];
    language: string;
    difficulty: "easy" | "medium" | "hard";
    xp: number;
}

export interface HeroChallenge {
    id: string;
    title: string;
    description: string;
    gridSize: number;
    startPos: { x: number; y: number };
    goalPos: { x: number; y: number };
    walls: { x: number; y: number }[];
    collectiblePos?: { x: number; y: number };
    initialCode: string;
    solutionKeywords: string[];
    language: string;
    difficulty: "easy" | "medium" | "hard";
    xp: number;
}

export interface TypeChallenge {
    id: string;
    title: string;
    code: string;
    language: string;
    difficulty: "easy" | "medium" | "hard";
    xp: number;
}

// ---- QUIZ QUESTIONS ----
export const quizQuestions: QuizQuestion[] = [
    {
        id: "q1",
        question: "What does HTML stand for?",
        options: [
            "Hyper Text Markup Language",
            "High Tech Modern Language",
            "Hyper Transfer Markup Language",
            "Home Tool Markup Language",
        ],
        correctIndex: 0,
        explanation: "HTML stands for Hyper Text Markup Language — the standard markup language for creating web pages.",
        language: "html",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "q2",
        question: "Which CSS property is used to change the text color?",
        options: ["font-color", "text-color", "color", "foreground-color"],
        correctIndex: 2,
        explanation: "The 'color' property in CSS is used to change the text color of an element.",
        language: "css",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "q3",
        question: "What is the output of: console.log(typeof null)?",
        code: 'console.log(typeof null);',
        options: ['"null"', '"undefined"', '"object"', '"boolean"'],
        correctIndex: 2,
        explanation: 'typeof null returns "object" in JavaScript — this is a well-known bug/quirk that has existed since the beginning.',
        language: "javascript",
        difficulty: "medium",
        xp: 20,
    },
    {
        id: "q4",
        question: "Which keyword is used to define a function in Python?",
        options: ["function", "func", "def", "define"],
        correctIndex: 2,
        explanation: "In Python, functions are defined using the 'def' keyword.",
        language: "python",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "q5",
        question: "What will this code output?",
        code: 'let x = 5;\nlet y = "5";\nconsole.log(x == y);',
        options: ["true", "false", "undefined", "Error"],
        correctIndex: 0,
        explanation: "The == operator performs type coercion, so 5 == '5' is true. Use === for strict comparison.",
        language: "javascript",
        difficulty: "medium",
        xp: 20,
    },
    {
        id: "q6",
        question: "What is the time complexity of binary search?",
        options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
        correctIndex: 2,
        explanation: "Binary search has O(log n) time complexity — it divides the search space in half with each step.",
        language: "dsa",
        difficulty: "medium",
        xp: 20,
    },
    {
        id: "q7",
        question: "Which data structure uses LIFO (Last In, First Out)?",
        options: ["Queue", "Stack", "Array", "Linked List"],
        correctIndex: 1,
        explanation: "A Stack follows LIFO — the last element added is the first to be removed, like a stack of plates.",
        language: "dsa",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "q8",
        question: "What does SQL stand for?",
        options: [
            "Strong Query Language",
            "Structured Question Language",
            "Structured Query Language",
            "Simple Query Language",
        ],
        correctIndex: 2,
        explanation: "SQL stands for Structured Query Language — used to communicate with relational databases.",
        language: "sql",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "q9",
        question: "What is the output of this Python code?",
        code: 'print(type([]) == list)',
        options: ["True", "False", "Error", "None"],
        correctIndex: 0,
        explanation: "type([]) returns <class 'list'>, which equals list in Python, so the output is True.",
        language: "python",
        difficulty: "medium",
        xp: 20,
    },
    {
        id: "q10",
        question: "In Java, which keyword is used to inherit a class?",
        options: ["inherits", "extends", "implements", "super"],
        correctIndex: 1,
        explanation: "In Java, the 'extends' keyword is used for class inheritance.",
        language: "java",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "q21",
        question: "Which of these is NOT a primitive data type in JavaScript?",
        options: ["String", "Boolean", "Object", "Number"],
        correctIndex: 2,
        explanation: "Object is a reference type. String, Boolean, Number, undefined, and null are primitives.",
        language: "javascript",
        difficulty: "medium",
        xp: 20,
    },
    {
        id: "q22",
        question: "What does the 'self' keyword represent in Python?",
        options: ["The class itself", "The instance of the class", "A global variable", "A static method"],
        correctIndex: 1,
        explanation: "In Python, 'self' represents the specific instance of the class being operated on.",
        language: "python",
        difficulty: "medium",
        xp: 20,
    },
    {
        id: "q23",
        question: "Which HTML attribute specifies an alternate text for an image?",
        options: ["title", "alt", "src", "longdesc"],
        correctIndex: 1,
        explanation: "The 'alt' attribute provides alternative text for screen readers or if the image fails to load.",
        language: "html",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "q24",
        question: "What is the result of 10 % 3?",
        options: ["3", "1", "0", "3.33"],
        correctIndex: 1,
        explanation: "The modulo operator % returns the remainder. 10 divided by 3 is 3 with a remainder of 1.",
        language: "javascript",
        difficulty: "easy",
        xp: 10,
    },
];

// ---- BUG CHALLENGES ----
export const bugChallenges: BugChallenge[] = [
    {
        id: "bug1",
        title: "Fix the Loop",
        description: "This loop should print numbers 1 to 5, but it's stuck in an infinite loop! Can you spot the bug?",
        buggyCode: `let i = 1;\nwhile (i <= 5) {\n  console.log(i);\n  // Bug: forgot to increment i\n}`,
        fixedCode: `let i = 1;\nwhile (i <= 5) {\n  console.log(i);\n  i++;\n}`,
        hint: "Check if the loop variable is being updated",
        language: "javascript",
        difficulty: "easy",
        xp: 15,
    },
    {
        id: "bug2",
        title: "String Comparison",
        description: "This function should check if a user is an admin, but it always returns false.",
        buggyCode: `function isAdmin(role) {\n  if (role = "admin") {\n    return true;\n  }\n  return false;\n}`,
        fixedCode: `function isAdmin(role) {\n  if (role === "admin") {\n    return true;\n  }\n  return false;\n}`,
        hint: "Look at the comparison operator carefully. = vs == vs ===",
        language: "javascript",
        difficulty: "easy",
        xp: 15,
    },
    {
        id: "bug7",
        title: "Object Property Access",
        description: "Trying to access a property that doesn't exist!",
        buggyCode: `const user = { name: "Alice" };\nconsole.log(user.profile.age);`,
        fixedCode: `const user = { name: "Alice", profile: { age: 25 } };\nconsole.log(user.profile.age);`,
        hint: "Make sure all nested objects are defined before accessing their properties",
        language: "javascript",
        difficulty: "medium",
        xp: 25,
    },
    {
        id: "bug8",
        title: "Callback Context",
        description: "The 'this' keyword is lost in this callback!",
        buggyCode: `const counter = {\n  count: 0,\n  inc: function() {\n    setTimeout(function() {\n      this.count++;\n    }, 100);\n  }\n};`,
        fixedCode: `const counter = {\n  count: 0,\n  inc: function() {\n    setTimeout(() => {\n      this.count++;\n    }, 100);\n  }\n};`,
        hint: "Arrow functions don't have their own 'this' context",
        language: "javascript",
        difficulty: "hard",
        xp: 40,
    },
];

// ---- PUZZLE CHALLENGES ----
export const puzzleChallenges: PuzzleChallenge[] = [
    {
        id: "puz1",
        title: "Hello World Function",
        description: "Arrange the lines to create a function that prints 'Hello World'",
        correctOrder: [
            'function sayHello() {',
            '  const message = "Hello World";',
            '  console.log(message);',
            '}',
            'sayHello();',
        ],
        language: "javascript",
        difficulty: "easy",
        xp: 15,
    },
    {
        id: "puz2",
        title: "For Loop",
        description: "Arrange the code to print numbers 1 to 5",
        correctOrder: [
            'for (let i = 1; i <= 5; i++) {',
            '  console.log(i);',
            '}',
        ],
        language: "javascript",
        difficulty: "easy",
        xp: 15,
    },
];

// ---- FILL THE CODE CHALLENGES ----
export const fillChallenges: FillChallenge[] = [
    {
        id: "fill1",
        title: "Declare a Variable",
        description: "Fill in the blank to declare a constant variable",
        codeTemplate: '___ name = "DataNauts";',
        answers: ["const"],
        language: "javascript",
        difficulty: "easy",
        xp: 10,
    },
    {
        id: "fill2",
        title: "Array Method",
        description: "Fill in the blank to add an element to the end of an array",
        codeTemplate: 'const arr = [1, 2, 3];\narr.___(4);',
        answers: ["push"],
        language: "javascript",
        difficulty: "easy",
        xp: 10,
    },
];

// ---- HERO QUEST CHALLENGES ----
export const heroChallenges: HeroChallenge[] = [
    {
        id: "hero1",
        title: "The First Step",
        description: "Your hero needs to reach the diamond 💎. Type 'hero.moveRight()' twice to reach it!",
        gridSize: 5,
        startPos: { x: 0, y: 2 },
        goalPos: { x: 2, y: 2 },
        walls: [],
        initialCode: "// Use hero.moveRight() to reach the goal\n",
        solutionKeywords: ["moveRight", "moveRight"],
        language: "javascript",
        difficulty: "easy",
        xp: 20,
    },
    {
        id: "hero2",
        title: "Zig Zag",
        description: "Navigate around the walls 🧱 to get the diamond! You'll need to move right and then down.",
        gridSize: 5,
        startPos: { x: 0, y: 0 },
        goalPos: { x: 2, y: 2 },
        walls: [{ x: 1, y: 0 }, { x: 1, y: 1 }],
        initialCode: "hero.moveDown();\nhero.moveDown();\n",
        solutionKeywords: ["moveRight", "moveRight", "moveDown", "moveDown"],
        language: "javascript",
        difficulty: "easy",
        xp: 25,
    },
    {
        id: "hero3",
        title: "Diamond Collector",
        description: "Get the gem 💎 and then get to the exit 🏁!",
        gridSize: 5,
        startPos: { x: 0, y: 4 },
        collectiblePos: { x: 2, y: 4 },
        goalPos: { x: 4, y: 4 },
        walls: [{ x: 2, y: 3 }],
        initialCode: "hero.moveRight();\n",
        solutionKeywords: ["moveRight", "moveRight", "moveRight", "moveRight"],
        language: "javascript",
        difficulty: "medium",
        xp: 35,
    },
    {
        id: "hero4",
        title: "Obstacle Course",
        description: "A narrow path! Navigate carefully.",
        gridSize: 5,
        startPos: { x: 0, y: 0 },
        goalPos: { x: 4, y: 4 },
        walls: [
            { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
            { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }
        ],
        initialCode: "",
        solutionKeywords: ["moveRight", "moveDown", "moveDown", "moveRight", "moveRight", "moveDown", "moveDown", "moveRight"],
        language: "javascript",
        difficulty: "hard",
        xp: 50,
    },
    {
        id: "hero5",
        title: "The Great Maze",
        description: "Find the path to the exit! It's a bit longer this time.",
        gridSize: 6,
        startPos: { x: 0, y: 0 },
        goalPos: { x: 5, y: 5 },
        walls: [
            { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
            { x: 3, y: 5 }, { x: 3, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 2 },
            { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }
        ],
        initialCode: "",
        solutionKeywords: ["moveDown", "moveRight"],
        language: "javascript",
        difficulty: "hard",
        xp: 60,
    },
    {
        id: "hero6",
        title: "Rescue Mission",
        description: "Collect both gems 💎 and find the flag 🏁!",
        gridSize: 5,
        startPos: { x: 0, y: 2 },
        collectiblePos: { x: 2, y: 0 },
        goalPos: { x: 4, y: 2 },
        walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
        initialCode: "",
        solutionKeywords: ["moveUp", "moveRight"],
        language: "javascript",
        difficulty: "hard",
        xp: 75,
    }
];

// ---- TYPE CHALLENGES ----
export const typeChallenges: TypeChallenge[] = [
    {
        id: "type1",
        title: "Hello World",
        code: 'console.log("Hello World!");',
        language: "javascript",
        difficulty: "easy",
        xp: 10,
    },
];

// XP Level Thresholds
export const levels = [
    { level: 1, title: "Newbie Coder", minXP: 0, emoji: "🌱" },
    { level: 2, title: "Level 2 Learner", minXP: 500, emoji: "📖" },
    { level: 3, title: "Level 3 Explorer", minXP: 1500, emoji: "�" },
    { level: 4, title: "Level 4 Code Hunter", minXP: 3000, emoji: "⚔️" },
    { level: 5, title: "Level 5 Tech Master", minXP: 5500, emoji: "🧠" },
    { level: 6, title: "Level 6 Stack Ace", minXP: 9000, emoji: "📚" },
    { level: 7, title: "Level 7 Full Stack Hero", minXP: 14000, emoji: "🦸" },
    { level: 8, title: "Level 8 Code Ninja", minXP: 20000, emoji: "🥷" },
    { level: 9, title: "Level 9 Tech Wizard", minXP: 30000, emoji: "🧙" },
    { level: 10, title: "Level 10 DataNaut Legend", minXP: 50000, emoji: "🚀" },
];

export function getLevelForXP(xp: number) {
    let current = levels[0];
    for (const lvl of levels) {
        if (xp >= lvl.minXP) current = lvl;
        else break;
    }
    const nextLevel = levels.find((l) => l.minXP > xp) || null;
    const progress = nextLevel
        ? ((xp - current.minXP) / (nextLevel.minXP - current.minXP)) * 100
        : 100;
    return { ...current, xp, nextLevel, progress };
}

// Achievements
export const achievements = [
    { id: "first_quiz", title: "First Quiz!", desc: "Complete your first quiz question", emoji: "🎯" },
    { id: "bug_hunter", title: "Bug Hunter", desc: "Fix 3 bugs", emoji: "🐛" },
    { id: "bug_expert", title: "Bug Expert", desc: "Fix 10 bugs", emoji: "🛡️" },
    { id: "puzzle_master", title: "Puzzle Master", desc: "Solve 3 code puzzles", emoji: "🧩" },
    { id: "hero_apprentice", title: "Hero Apprentice", desc: "Complete 3 Hero Quest levels", emoji: "🛡️" },
    { id: "hero_master", title: "Hero Master", desc: "Complete all Hero Quest levels", emoji: "👑" },
    { id: "speed_demon", title: "Speed Demon", desc: "Complete 5 speed typing challenges", emoji: "⚡" },
    { id: "xp_1000", title: "XP Millionaire", desc: "Reach 1,000 total XP", emoji: "💰" },
    { id: "streak_10", title: "Unstoppable", desc: "Reach a 10-day coding streak", emoji: "🔥" },
];
