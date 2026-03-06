import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2, X, Calendar, Bell, Users, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import type { Transition, VariantLabels, TargetAndTransition } from "framer-motion";

// Interactive Dot Background
const InteractiveDotBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const mousePosition = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const dots: { x: number; y: number; baseOpacity: number }[] = [];
        const spacing = 40;
        const cols = Math.ceil(canvas.width / spacing);
        const rows = Math.ceil(canvas.height / spacing);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                dots.push({
                    x: i * spacing + spacing / 2,
                    y: j * spacing + spacing / 2,
                    baseOpacity: Math.random() * 0.12 + 0.03,
                });
            }
        }

        const handleMouseMove = (e: MouseEvent) => {
            mousePosition.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener("mousemove", handleMouseMove);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            dots.forEach((dot) => {
                const dx = mousePosition.current.x - dot.x;
                const dy = mousePosition.current.y - dot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 180;
                const intensity = Math.max(0, 1 - dist / maxDist);

                ctx.beginPath();
                ctx.fillStyle = `rgba(59, 130, 246, ${dot.baseOpacity + intensity * 0.5})`;
                ctx.arc(dot.x, dot.y, 1.5 + intensity * 2.5, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouseMove);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

// Rotating Text Component
interface RotatingTextProps {
    texts: string[];
    transition?: Transition;
    initial?: boolean | VariantLabels | TargetAndTransition;
    animate?: boolean | VariantLabels | TargetAndTransition;
    exit?: VariantLabels | TargetAndTransition;
    rotationInterval?: number;
    staggerDuration?: number;
    staggerFrom?: "first" | "last" | "center" | "random" | number;
    loop?: boolean;
    auto?: boolean;
    splitBy?: "characters" | "words" | "lines" | string;
    mainClassName?: string;
    splitLevelClassName?: string;
    elementLevelClassName?: string;
    style?: React.CSSProperties;
}

const RotatingText = ({
    texts,
    transition = { type: "spring", damping: 25, stiffness: 300 },
    initial = { y: "100%", opacity: 0 },
    animate = { y: 0, opacity: 1 },
    exit = { y: "-120%", opacity: 0 },
    rotationInterval = 2500,
    staggerDuration = 0.025,
    staggerFrom = "first",
    loop = true,
    auto = true,
    splitBy = "characters",
    mainClassName,
    splitLevelClassName,
    elementLevelClassName,
    style,
}: RotatingTextProps) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    useEffect(() => {
        if (!auto) return;
        const interval = setInterval(() => {
            setCurrentTextIndex((prev) =>
                loop ? (prev + 1) % texts.length : Math.min(prev + 1, texts.length - 1)
            );
        }, rotationInterval);
        return () => clearInterval(interval);
    }, [auto, loop, rotationInterval, texts.length]);

    const splitText = (text: string) => {
        if (splitBy === "characters") return text.split("");
        if (splitBy === "words") return text.split(" ");
        if (splitBy === "lines") return text.split("\n");
        return text.split(splitBy);
    };

    const getStaggerDelay = (index: number, total: number) => {
        if (staggerFrom === "first") return index * staggerDuration;
        if (staggerFrom === "last") return (total - 1 - index) * staggerDuration;
        if (staggerFrom === "center") {
            const center = (total - 1) / 2;
            return Math.abs(center - index) * staggerDuration;
        }
        if (staggerFrom === "random") return Math.random() * staggerDuration * total;
        if (typeof staggerFrom === "number") {
            return Math.abs(staggerFrom - index) * staggerDuration;
        }
        return index * staggerDuration;
    };

    const elements = splitText(texts[currentTextIndex]);

    return (
        <motion.span className={`inline-flex ${mainClassName || ""}`} style={style}>
            <AnimatePresence mode="wait">
                <motion.span
                    key={currentTextIndex}
                    className={`inline-flex ${splitLevelClassName || ""}`}
                >
                    {elements.map((element, i) => (
                        <motion.span
                            key={`${currentTextIndex}-${i}`}
                            initial={initial}
                            animate={animate}
                            exit={exit}
                            transition={{
                                ...transition,
                                delay: getStaggerDelay(i, elements.length),
                            }}
                            className={`inline-block ${elementLevelClassName || ""}`}
                        >
                            {element === " " ? "\u00A0" : element}
                        </motion.span>
                    ))}
                </motion.span>
            </AnimatePresence>
        </motion.span>
    );
};

// Welcome Modal Component
const WelcomeModal = ({
    isOpen,
    onClose,
    onContinue,
}: {
    isOpen: boolean;
    onClose: () => void;
    onContinue: () => void;
}) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            const timer1 = setTimeout(() => setStep(1), 400);
            const timer2 = setTimeout(() => setStep(2), 800);
            const timer3 = setTimeout(() => setStep(3), 1200);
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-3xl p-8 shadow-2xl shadow-black/50"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 text-zinc-600 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center space-y-6">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.1, type: "spring", damping: 12 }}
                                className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/30"
                            >
                                <Sparkles className="w-10 h-10 text-white" />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 15 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-3xl font-bold text-white tracking-tight">
                                    Welcome to Datanauts
                                </h2>
                                <p className="text-zinc-500 mt-2 text-sm">
                                    Sphoorthy Engineering College
                                </p>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 15 }}
                                transition={{ duration: 0.5 }}
                                className="text-zinc-400 text-base leading-relaxed"
                            >
                                Your gateway to exclusive college events, workshops, hackathons, and the tech community.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 15 }}
                                transition={{ duration: 0.5 }}
                                className="grid grid-cols-2 gap-3 pt-2"
                            >
                                {[
                                    { icon: Bell, label: "Real-time Alerts" },
                                    { icon: Calendar, label: "Event Calendar" },
                                    { icon: Users, label: "Community" },
                                    { icon: Megaphone, label: "Announcements" },
                                ].map((feature, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/50 rounded-xl text-sm text-zinc-300"
                                    >
                                        <feature.icon className="w-4 h-4 text-blue-400" />
                                        {feature.label}
                                    </div>
                                ))}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 15 }}
                                transition={{ duration: 0.5, delay: 0.15 }}
                                className="pt-4"
                            >
                                <Button
                                    onClick={onContinue}
                                    className="w-full h-13 bg-white text-black hover:bg-zinc-100 font-semibold text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Continue to Sign In
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default function UserAuth() {
    const [showWelcome, setShowWelcome] = useState(false);
    const [showAuthForm, setShowAuthForm] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        let isMounted = true;

        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (isMounted && user) {
                    navigate("/profile", { replace: true });
                }
            } catch (error) {
                // Ignore errors during check
            }
        };

        checkUser();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const handleJoinNow = () => {
        setShowWelcome(true);
    };

    const handleWelcomeContinue = () => {
        setShowWelcome(false);
        setTimeout(() => setShowAuthForm(true), 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
                toast({ title: "Welcome back!", description: "Login successful" });
                navigate("/profile", { replace: true });
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });

                if (error) throw error;

                if (data.user) {
                    await supabase.from("profiles").insert({
                        id: data.user.id,
                        email: email,
                        full_name: fullName,
                    });
                }

                toast({ title: "Account created!", description: "Please check your email to verify" });
                navigate("/profile", { replace: true });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Something went wrong";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <div className="fixed inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 pointer-events-none z-0" />
            <InteractiveDotBackground />

            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Header */}
                <header className="px-6 py-5 border-b border-zinc-900/50">
                    <nav className="max-w-6xl mx-auto flex justify-between items-center">
                        <span
                            className="text-xl font-bold cursor-pointer text-blue-400 tracking-tight"
                            onClick={() => navigate("/")}
                        >
                            Datanauts
                        </span>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800/50">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Sphoorthy Engineering College
                            </span>
                        </div>
                    </nav>
                </header>

                <AnimatePresence mode="wait">
                    {!showAuthForm ? (
                        <motion.main
                            key="hero"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col"
                        >
                            {/* Hero Section */}
                            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1, duration: 0.6 }}
                                    className="text-center max-w-4xl mx-auto"
                                >
                                    {/* Main Headline */}
                                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                                        Stay Connected with
                                        <br />
                                        <span className="inline-flex h-[1.15em] overflow-hidden align-bottom">
                                            <RotatingText
                                                texts={["Events", "Updates", "Announcements", "Activities"]}
                                                style={{ color: "#3B82F6" }}
                                                staggerFrom="last"
                                                initial={{ y: "-100%", opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: "110%", opacity: 0 }}
                                                staggerDuration={0.025}
                                                transition={{ type: "spring", damping: 22, stiffness: 200 }}
                                                rotationInterval={2800}
                                                splitBy="characters"
                                                auto={true}
                                                loop={true}
                                            />
                                        </span>
                                    </h1>

                                    {/* Subtitle */}
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto mt-6 leading-relaxed"
                                    >
                                        Your one-stop platform for all college events, announcements, and updates. 
                                        Never miss what matters most in your campus life.
                                    </motion.p>

                                    {/* CTA Buttons */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
                                    >
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleJoinNow}
                                            className="group px-8 py-4 bg-white text-black font-semibold rounded-xl text-base overflow-hidden transition-all hover:shadow-xl hover:shadow-white/10 flex items-center gap-2"
                                        >
                                            Join Now
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => navigate("/events")}
                                            className="px-8 py-4 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 hover:bg-zinc-900/50 font-medium rounded-xl text-base transition-all"
                                        >
                                            Browse Events
                                        </motion.button>
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* Features Section */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="px-6 pb-16"
                            >
                                <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { icon: Bell, title: "Real-time Notifications", desc: "Get instant alerts for new events, updates, and announcements directly to your device." },
                                        { icon: Calendar, title: "Event Calendar", desc: "View all upcoming college events in one organized calendar with reminders and details." },
                                        { icon: Users, title: "Student Community", desc: "Connect with fellow students, share experiences, and stay engaged with campus life." },
                                        { icon: Megaphone, title: "Important Announcements", desc: "Never miss critical updates about exams, holidays, or college-wide notifications." },
                                    ].map((feature, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6 + i * 0.1 }}
                                            className="group p-5 bg-zinc-950/80 border border-zinc-800/50 rounded-2xl hover:border-zinc-700/50 hover:bg-zinc-900/50 transition-all duration-300"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:border-blue-500/30 transition-colors">
                                                    <feature.icon className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                                                    <p className="text-zinc-500 text-xs leading-relaxed">{feature.desc}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.main>
                    ) : (
                        <motion.main
                            key="auth"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex items-center justify-center px-6 py-12"
                        >
                            <div className="w-full max-w-md">
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => setShowAuthForm(false)}
                                    className="mb-8 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm group"
                                >
                                    <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                    Back to home
                                </motion.button>

                                <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl shadow-black/50">
                                    <div className="text-center mb-8">
                                        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                                            <User className="w-6 h-6 text-white" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">
                                            {isLogin ? "Welcome back" : "Create account"}
                                        </h2>
                                        <p className="text-zinc-500 text-sm mt-1">
                                            {isLogin
                                                ? "Sign in to access your events"
                                                : "Join the Datanauts community"}
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {!isLogin && (
                                            <div className="space-y-2">
                                                <Label htmlFor="fullName" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                                    Full Name
                                                </Label>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                    <Input
                                                        id="fullName"
                                                        type="text"
                                                        placeholder="Your name"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        className="pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                                        required={!isLogin}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                                Email Address
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="your@email.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                                Password
                                            </Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                                    required
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-12 bg-white text-black hover:bg-zinc-100 font-semibold text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] mt-6"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    {isLogin ? "Sign In" : "Create Account"}
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </form>

                                    <div className="mt-6 text-center">
                                        <p className="text-zinc-500 text-sm">
                                            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                                            <button
                                                onClick={() => setIsLogin(!isLogin)}
                                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                            >
                                                {isLogin ? "Sign Up" : "Sign In"}
                                            </button>
                                        </p>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-zinc-800/50 text-center">
                                        <button
                                            onClick={() => navigate("/admin/login")}
                                            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                                        >
                                            Admin Login
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.main>
                    )}
                </AnimatePresence>
            </div>

            <WelcomeModal
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
                onContinue={handleWelcomeContinue}
            />
        </div>
    );
}
