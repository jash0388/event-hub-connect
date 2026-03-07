"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, Users, Megaphone, ArrowRight, Sparkles, Play, ChevronRight } from "lucide-react";

// Rotating Text Component
const RotatingText = ({ texts }: { texts: string[] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [texts.length]);

  return (
    <span className="inline-block overflow-hidden h-[1.15em] align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 50, opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -50, opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

// 3D Floating Card Component
const FloatingCard3D = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformStyle: "preserve-3d",
      }}
      className={`${className}`}
    >
      {children}
    </motion.div>
  );
};

// Feature Card with 3D effect
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay,
  gradient,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
  gradient: string;
}) => (
  <FloatingCard3D delay={delay} className="h-full">
    <div className="group relative h-full bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] border border-slate-100 transition-all duration-500 overflow-hidden">
      {/* Gradient blob */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 ${gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
      
      <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`} style={{ transformStyle: "preserve-3d", transform: "translateZ(20px)" }}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ transform: "translateZ(15px)" }}>{title}</h3>
      <p className="text-slate-500 leading-relaxed" style={{ transform: "translateZ(10px)" }}>{description}</p>
    </div>
  </FloatingCard3D>
);

// Animated Blob Background
const AnimatedBlobs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{
        x: [0, 100, 50, 0],
        y: [0, 50, 100, 0],
        scale: [1, 1.1, 0.9, 1],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-20 left-[10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-200/40 to-cyan-200/40 rounded-full blur-3xl"
    />
    <motion.div
      animate={{
        x: [0, -50, -100, 0],
        y: [0, 100, 50, 0],
        scale: [1, 0.9, 1.1, 1],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute top-40 right-[10%] w-[400px] h-[400px] bg-gradient-to-br from-violet-200/40 to-purple-200/40 rounded-full blur-3xl"
    />
    <motion.div
      animate={{
        x: [0, 80, -80, 0],
        y: [0, -50, 50, 0],
        scale: [1, 1.05, 0.95, 1],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-20 left-[30%] w-[350px] h-[350px] bg-gradient-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-3xl"
    />
  </div>
);

// Stats Counter
const StatCounter = ({ value, label, delay }: { value: string; label: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="text-center"
  >
    <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">{value}</div>
    <div className="text-slate-500 mt-1">{label}</div>
  </motion.div>
);

export function CollegeEventsHub() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bell,
      title: "Real-time Notifications",
      description: "Get instant alerts for new events, updates, and announcements directly to your device.",
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
    },
    {
      icon: Calendar,
      title: "Event Calendar",
      description: "View all upcoming college events in one organized calendar with reminders and details.",
      gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
    },
    {
      icon: Users,
      title: "Student Community",
      description: "Connect with fellow students, share experiences, and stay engaged with campus life.",
      gradient: "bg-gradient-to-br from-pink-500 to-rose-500",
    },
    {
      icon: Megaphone,
      title: "Announcements",
      description: "Never miss critical updates about exams, holidays, or college-wide notifications.",
      gradient: "bg-gradient-to-br from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900">
      <AnimatedBlobs />

      {/* Header */}
      <header className="relative z-20">
        <nav className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-white/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Datanauts</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => navigate("/events")} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Events
              </button>
              <button onClick={() => navigate("/about")} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                About
              </button>
              <button onClick={() => navigate("/contact")} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Contact
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Sign In
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-[0_2px_20px_rgb(0,0,0,0.06)] border border-slate-100 text-sm font-medium text-slate-600">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Trusted by 500+ students at Sphoorthy Engineering College
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
            >
              Stay Connected with
              <br />
              <RotatingText texts={["Events", "Updates", "Announcements", "Activities"]} />
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Your one-stop platform for all college events, announcements, and updates. 
              Never miss what matters most in your campus life.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => navigate("/login")}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1 flex items-center gap-3"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/events")}
                className="group px-8 py-4 bg-white text-slate-700 rounded-2xl font-semibold text-lg shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-3"
              >
                <Play className="w-5 h-5 text-blue-600" />
                Browse Events
              </button>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          >
            <StatCounter value="500+" label="Students" delay={0.6} />
            <StatCounter value="50+" label="Events" delay={0.7} />
            <StatCounter value="20+" label="Clubs" delay={0.8} />
            <StatCounter value="24/7" label="Updates" delay={0.9} />
          </motion.div>
        </div>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Powerful features to keep you connected with your campus community</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <FeatureCard
                key={i}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                gradient={feature.gradient}
                delay={0.5 + i * 0.1}
              />
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <FloatingCard3D delay={0.6}>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 p-12 md:p-16 text-center text-white shadow-2xl shadow-blue-500/20">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '32px 32px',
                }} />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to get started?</h2>
                <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto mb-10">
                  Join thousands of students already using Datanauts to stay connected.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="group px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-3"
                >
                  Create Free Account
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </FloatingCard3D>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-slate-900">Datanauts</span>
              </div>
              
              <div className="flex items-center gap-8 text-sm text-slate-500">
                <button onClick={() => navigate("/about")} className="hover:text-slate-900 transition-colors">About</button>
                <button onClick={() => navigate("/events")} className="hover:text-slate-900 transition-colors">Events</button>
                <button onClick={() => navigate("/contact")} className="hover:text-slate-900 transition-colors">Contact</button>
                <button onClick={() => navigate("/admin")} className="hover:text-slate-900 transition-colors">Admin</button>
              </div>
              
              <p className="text-sm text-slate-400">2024 Datanauts. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default CollegeEventsHub;
