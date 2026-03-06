import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// Interactive dot background similar to Manus AI
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
        const spacing = 30;
        const cols = Math.ceil(canvas.width / spacing);
        const rows = Math.ceil(canvas.height / spacing);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                dots.push({
                    x: i * spacing + spacing / 2,
                    y: j * spacing + spacing / 2,
                    baseOpacity: Math.random() * 0.15 + 0.05,
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
                const maxDist = 150;
                const intensity = Math.max(0, 1 - dist / maxDist);

                ctx.beginPath();
                ctx.fillStyle = `rgba(34, 211, 238, ${dot.baseOpacity + intensity * 0.4})`;
                ctx.arc(dot.x, dot.y, 1.5 + intensity * 2, 0, Math.PI * 2);
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
            const timer1 = setTimeout(() => setStep(1), 500);
            const timer2 = setTimeout(() => setStep(2), 1000);
            const timer3 = setTimeout(() => setStep(3), 1500);
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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Content */}
                        <div className="text-center space-y-6">
                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", damping: 15 }}
                                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25"
                            >
                                <Sparkles className="w-10 h-10 text-white" />
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 10 }}
                                transition={{ duration: 0.4 }}
                                className="text-3xl font-bold text-white"
                            >
                                Welcome to Datanauts
                            </motion.h2>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 10 }}
                                transition={{ duration: 0.4 }}
                                className="text-zinc-400 text-lg leading-relaxed"
                            >
                                Your gateway to exclusive college events, workshops, and tech community. Join thousands of students already connected.
                            </motion.p>

                            {/* Features */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 10 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-wrap justify-center gap-3 pt-2"
                            >
                                {["Real-time Updates", "Event Calendar", "Community Access"].map((feature, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-zinc-300 flex items-center gap-2"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                                        {feature}
                                    </span>
                                ))}
                            </motion.div>

                            {/* CTA Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 10 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="pt-4"
                            >
                                <Button
                                    onClick={onContinue}
                                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-semibold text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
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

    // Check if already logged in
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
            <InteractiveDotBackground />

            {/* Gradient overlays */}
            <div className="fixed inset-0 bg-gradient-to-b from-black via-transparent to-black/80 pointer-events-none z-[1]" />
            <div className="fixed inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none z-[1]" />

            {/* Main content */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Header */}
                <header className="px-6 py-6">
                    <nav className="max-w-7xl mx-auto flex justify-between items-center">
                        <span
                            className="text-xl font-bold cursor-pointer text-cyan-400"
                            style={{ textShadow: "0 0 20px rgba(34, 211, 238, 0.5)" }}
                            onClick={() => navigate("/")}
                        >
                            Datanauts
                        </span>
                    </nav>
                </header>

                {/* Hero Section - Manus AI Style */}
                <AnimatePresence mode="wait">
                    {!showAuthForm ? (
                        <motion.main
                            key="hero"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col items-center justify-center px-4 -mt-16"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-center space-y-8 max-w-3xl"
                            >
                                {/* Main headline */}
                                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-white leading-tight">
                                    What events are you
                                    <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                        looking for?
                                    </span>
                                </h1>

                                {/* Subtitle */}
                                <p className="text-zinc-400 text-lg sm:text-xl max-w-xl mx-auto">
                                    Discover workshops, hackathons, tech talks, and more. Stay connected with your college community.
                                </p>

                                {/* CTA Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleJoinNow}
                                        className="group relative px-8 py-4 bg-white text-black font-semibold rounded-xl text-base sm:text-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-white/20"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            Join Now
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate("/events")}
                                        className="px-8 py-4 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 font-medium rounded-xl text-base sm:text-lg transition-all"
                                    >
                                        Browse Events
                                    </motion.button>
                                </div>

                                {/* Feature pills */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex flex-wrap justify-center gap-3 pt-8"
                                >
                                    {[
                                        "Real-time notifications",
                                        "Event calendar",
                                        "Student community",
                                        "Important announcements"
                                    ].map((feature, i) => (
                                        <span
                                            key={i}
                                            className="px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-sm text-zinc-400"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                </motion.div>
                            </motion.div>
                        </motion.main>
                    ) : (
                        <motion.main
                            key="auth"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex items-center justify-center px-4 py-8"
                        >
                            <div className="w-full max-w-md">
                                {/* Back button */}
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => setShowAuthForm(false)}
                                    className="mb-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm"
                                >
                                    <ArrowRight className="w-4 h-4 rotate-180" />
                                    Back to home
                                </motion.button>

                                {/* Auth Card */}
                                <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                                            {isLogin ? "Welcome back" : "Create account"}
                                        </h2>
                                        <p className="text-zinc-500">
                                            {isLogin
                                                ? "Sign in to access your events"
                                                : "Join the tech community today"}
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {!isLogin && (
                                            <div className="space-y-2">
                                                <Label htmlFor="fullName" className="text-sm font-medium text-zinc-300">
                                                    Full Name
                                                </Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                                    <Input
                                                        id="fullName"
                                                        type="text"
                                                        placeholder="Your name"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        className="pl-11 h-12 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                                        required={!isLogin}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                                                Email
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="your@email.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-11 h-12 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                                                Password
                                            </Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-11 pr-11 h-12 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                                    required
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-semibold text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    {isLogin ? "Sign In" : "Create Account"}
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </form>

                                    <div className="mt-6 text-center">
                                        <p className="text-zinc-500">
                                            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                                            <button
                                                onClick={() => setIsLogin(!isLogin)}
                                                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                                            >
                                                {isLogin ? "Sign Up" : "Sign In"}
                                            </button>
                                        </p>
                                    </div>

                                    <div className="mt-4 text-center">
                                        <button
                                            onClick={() => navigate("/admin/login")}
                                            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                                        >
                                            Admin Login →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.main>
                    )}
                </AnimatePresence>
            </div>

            {/* Welcome Modal */}
            <WelcomeModal
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
                onContinue={handleWelcomeContinue}
            />
        </div>
    );
}
