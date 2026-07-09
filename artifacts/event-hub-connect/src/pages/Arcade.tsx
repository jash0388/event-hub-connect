import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card as CyberCard } from "@/components/ui/card";
import {
    Gamepad2,
    Trophy,
    Zap,
    RotateCcw,
    Play,
    Pause,
    ArrowBigUp,
    ArrowBigDown,
    ArrowBigLeft,
    ArrowBigRight,
    Sparkles,
    Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types & Constants ---
type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type GameStatus = "IDLE" | "PLAYING" | "PAUSED" | "GAME_OVER";

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

const FOOD_TYPES = [
    { label: "JS", color: "#F7DF1E", xp: 10 },
    { label: "PY", color: "#3776AB", xp: 15 },
    { label: "TS", color: "#3178C6", xp: 20 },
    { label: "React", color: "#61DAFB", xp: 25 },
    { label: "HTML", color: "#E34F26", xp: 5 },
    { label: "CSS", color: "#1572B6", xp: 5 },
];

const Arcade = () => {
    const [status, setStatus] = useState<GameStatus>("IDLE");
    const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
    const [food, setFood] = useState<Point & { type: typeof FOOD_TYPES[0] }>({ x: 5, y: 5, type: FOOD_TYPES[0] });
    const [direction, setDirection] = useState<Direction>("UP");
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [isMuted, setIsMuted] = useState(false);

    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);

    // --- High Score Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem("arcade_snake_highscore");
        if (saved) setHighScore(parseInt(saved));
    }, []);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("arcade_snake_highscore", score.toString());
        }
    }, [score, highScore]);

    // --- Game Logic ---
    const generateFood = useCallback((currentSnake: Point[]) => {
        let newFood: Point;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            // Check if food spawned on snake
            if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
                break;
            }
        }
        const randomType = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
        setFood({ ...newFood, type: randomType });
    }, []);

    const resetGame = () => {
        setSnake([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
        setDirection("UP");
        setScore(0);
        setSpeed(INITIAL_SPEED);
        setStatus("PLAYING");
        generateFood([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
    };

    const gameOver = () => {
        setStatus("GAME_OVER");
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };

    const moveSnake = useCallback(() => {
        setSnake((prevSnake) => {
            const head = prevSnake[0];
            const newHead = { ...head };

            switch (direction) {
                case "UP": newHead.y -= 1; break;
                case "DOWN": newHead.y += 1; break;
                case "LEFT": newHead.x -= 1; break;
                case "RIGHT": newHead.x += 1; break;
            }

            // --- Collision Detection ---
            // Wall collision
            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                gameOver();
                return prevSnake;
            }

            // Self collision
            if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                gameOver();
                return prevSnake;
            }

            const newSnake = [newHead, ...prevSnake];

            // --- Food Detection ---
            if (newHead.x === food.x && newHead.y === food.y) {
                setScore(s => s + food.type.xp);
                setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
                generateFood(newSnake);
            } else {
                newSnake.pop(); // Remove tail
            }

            return newSnake;
        });
    }, [direction, food, generateFood]);

    // --- Game Loop ---
    useEffect(() => {
        if (status === "PLAYING") {
            gameLoopRef.current = setInterval(moveSnake, speed);
        } else {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [status, moveSnake, speed]);

    // --- Inputs ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp": case "w": if (direction !== "DOWN") setDirection("UP"); break;
                case "ArrowDown": case "s": if (direction !== "UP") setDirection("DOWN"); break;
                case "ArrowLeft": case "a": if (direction !== "RIGHT") setDirection("LEFT"); break;
                case "ArrowRight": case "d": if (direction !== "LEFT") setDirection("RIGHT"); break;
                case " ": if (status === "PLAYING") setStatus("PAUSED"); else if (status === "PAUSED") setStatus("PLAYING"); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [direction, status]);

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <Header />

            <main className="pt-28 pb-16 px-4 md:px-6">
                <div className="container mx-auto max-w-6xl">
                    {/* Retro Arcade Header */}
                    <div className="text-center mb-12 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-magenta/10 border border-neon-magenta/30 mb-6">
                            <Gamepad2 className="w-4 h-4 text-neon-magenta animate-pulse" />
                            <span className="text-xs font-bold tracking-widest text-neon-magenta uppercase">Retro Arcade Hub</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            CODE<span className="text-neon-cyan">ARCADE</span>
                        </h1>
                        <p className="text-gray-400 max-w-xl mx-auto font-mono">
                            Level up your skills with classic games reimagined for developers.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Game Area */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <CyberCard
                                className="aspect-square w-full max-w-[600px] mx-auto overflow-hidden bg-black/80 border-2 border-white/10 relative p-0"
                            >
                                {/* CRT Screen Overlay */}
                                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 to-transparent opacity-20 z-10" />
                                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10" />

                                {/* Game Grid */}
                                <div className="relative w-full h-full grid p-4 gap-px" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                                    {/* Food */}
                                    <div
                                        className="absolute z-20 transition-all duration-300 flex items-center justify-center font-bold text-[10px]"
                                        style={{
                                            left: `${(food.x / GRID_SIZE) * 100}%`,
                                            top: `${(food.y / GRID_SIZE) * 100}%`,
                                            width: `${100 / GRID_SIZE}%`,
                                            height: `${100 / GRID_SIZE}%`,
                                        }}
                                    >
                                        <div
                                            className="w-4/5 h-4/5 rounded-sm flex items-center justify-center animate-bounce shadow-[0_0_10px_currentColor]"
                                            style={{ backgroundColor: food.type.color + "40", color: food.type.color, border: `1px solid ${food.type.color}` }}
                                        >
                                            {food.type.label}
                                        </div>
                                    </div>

                                    {/* Snake */}
                                    {snake.map((segment, i) => (
                                        <div
                                            key={`${i}-${segment.x}-${segment.y}`}
                                            className={cn(
                                                "absolute z-10 transition-all duration-150 rounded-sm shadow-[0_0_15px_rgba(34,197,94,0.3)]",
                                                i === 0 ? "bg-neon-green border border-white/40" : "bg-neon-green/60"
                                            )}
                                            style={{
                                                left: `${(segment.x / GRID_SIZE) * 100}%`,
                                                top: `${(segment.y / GRID_SIZE) * 100}%`,
                                                width: `${100 / GRID_SIZE}%`,
                                                height: `${100 / GRID_SIZE}%`,
                                                scale: i === 0 ? "1.1" : "0.9"
                                            }}
                                        >
                                            {i === 0 && (
                                                <div className="flex gap-1 justify-center mt-1">
                                                    <div className="w-1 h-1 bg-black rounded-full" />
                                                    <div className="w-1 h-1 bg-black rounded-full" />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Empty Cells for Grid Effect */}
                                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                                        <div key={i} className="border-[0.5px] border-white/5" />
                                    ))}
                                </div>

                                {/* Overlays */}
                                {status === "IDLE" && (
                                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                        <h2 className="text-4xl font-bold mb-6 text-neon-green animate-pulse tracking-widest">CODE SNAKE</h2>
                                        <Button
                                            size="lg"
                                            onClick={resetGame}
                                            className="bg-neon-green text-black hover:bg-neon-green/80 font-bold px-10 rounded-none border-b-4 border-green-800 active:translate-y-1 active:border-b-0"
                                        >
                                            <Play className="w-5 h-5 mr-2" /> INSERT COIN (START)
                                        </Button>
                                    </div>
                                )}

                                {status === "PAUSED" && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold text-white mb-4 tracking-widest">PAUSED</h2>
                                            <Button variant="outline" onClick={() => setStatus("PLAYING")}>RESUME</Button>
                                        </div>
                                    </div>
                                )}

                                {status === "GAME_OVER" && (
                                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-sm">
                                        <h2 className="text-6xl font-black text-red-500 mb-2 drop-shadow-2xl">YOU DIED</h2>
                                        <p className="text-white/80 font-mono mb-8">Process exited with status 1</p>
                                        <div className="flex gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={resetGame}
                                                className="border-white text-white hover:bg-white hover:text-black"
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" /> REBOOT
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CyberCard>

                            {/* Mobile Controls */}
                            <div className="flex justify-center gap-4 lg:hidden">
                                <div className="grid grid-cols-3 gap-2">
                                    <div />
                                    <button onClick={() => direction !== "DOWN" && setDirection("UP")} className="w-14 h-14 bg-white/10 flex items-center justify-center rounded-xl"><ArrowBigUp /></button>
                                    <div />
                                    <button onClick={() => direction !== "RIGHT" && setDirection("LEFT")} className="w-14 h-14 bg-white/10 flex items-center justify-center rounded-xl"><ArrowBigLeft /></button>
                                    <button onClick={() => direction !== "UP" && setDirection("DOWN")} className="w-14 h-14 bg-white/10 flex items-center justify-center rounded-xl"><ArrowBigDown /></button>
                                    <button onClick={() => direction !== "LEFT" && setDirection("RIGHT")} className="w-14 h-14 bg-white/10 flex items-center justify-center rounded-xl"><ArrowBigRight /></button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2 tracking-tighter">
                                        <Trophy className="w-3 h-3 text-neon-amber" /> Current Score
                                    </div>
                                    <div className="text-4xl font-black text-white leading-none tracking-tighter">{score}</div>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2 tracking-tighter">
                                        <Zap className="w-3 h-3 text-neon-cyan" /> Best Score
                                    </div>
                                    <div className="text-4xl font-black text-neon-cyan leading-none tracking-tighter">{highScore}</div>
                                </div>
                            </div>

                            <CyberCard className="bg-white/5 p-6">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-neon-magenta" /> How to Play
                                </h3>
                                <ul className="space-y-3 text-sm text-gray-400 font-mono">
                                    <li className="flex items-start gap-3">
                                        <span className="text-neon-cyan">01</span>
                                        Eat technical tokens (JS, PY, React) to grow your code.
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-neon-cyan">02</span>
                                        Use <span className="text-white px-1.5 py-0.5 bg-white/10 rounded uppercase">Arrows</span> or <span className="text-white px-1.5 py-0.5 bg-white/10 rounded uppercase">WASD</span> to steer.
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-neon-cyan">03</span>
                                        Each token gives different XP based on its complexity.
                                    </li>
                                    <li className="flex items-start gap-3 text-red-400">
                                        <span className="text-red-500">04</span>
                                        Don't hit the compiler walls or your own tail!
                                    </li>
                                </ul>
                            </CyberCard>

                            <CyberCard className="bg-black p-6">
                                <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-gray-500 flex items-center justify-between">
                                    Global Leaderboard
                                    <Flame className="w-4 h-4 text-neon-red" />
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { name: "CodeWizard", score: 2450, rank: 1 },
                                        { name: "Pythonista", score: 1820, rank: 2 },
                                        { name: "ReactGod", score: 1540, rank: 3 },
                                        { name: "DebugQueen", score: 980, rank: 4 },
                                    ].map((player, i) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold",
                                                    i === 0 ? "bg-neon-amber text-black" : "bg-white/10 text-white/40"
                                                )}>
                                                    #{player.rank}
                                                </span>
                                                <span className="text-sm font-mono group-hover:text-neon-cyan transition-colors">{player.name}</span>
                                            </div>
                                            <span className="text-sm font-black tracking-tighter">{player.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </CyberCard>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Arcade;
