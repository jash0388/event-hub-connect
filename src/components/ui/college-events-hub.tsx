"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, Users, Megaphone, ArrowRight, Sparkles } from "lucide-react";

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
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block text-blue-500"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

// Particle Background
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 20000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
        ctx.fill();

        // Connect nearby particles
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
};

// Feature Card
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300"
  >
    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-blue-400" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

export function CollegeEventsHub() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bell,
      title: "Real-time Notifications",
      description: "Get instant alerts for new events, updates, and announcements directly to your device.",
    },
    {
      icon: Calendar,
      title: "Event Calendar",
      description: "View all upcoming college events in one organized calendar with reminders and details.",
    },
    {
      icon: Users,
      title: "Student Community",
      description: "Connect with fellow students, share experiences, and stay engaged with campus life.",
    },
    {
      icon: Megaphone,
      title: "Important Announcements",
      description: "Never miss critical updates about exams, holidays, or college-wide notifications.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <ParticleBackground />

      {/* Gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Datanauts</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/events")}
              className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
            >
              Events
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Sign In
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="pt-20 pb-24 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Trusted by 500+ students
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
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
            className="text-lg text-zinc-400 max-w-xl mx-auto mb-10"
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
              className="group px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-zinc-100 transition-colors flex items-center gap-2"
            >
              Join Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/events")}
              className="px-6 py-3 border border-zinc-700 text-white rounded-xl font-medium hover:bg-zinc-900 hover:border-zinc-600 transition-colors"
            >
              Browse Events
            </button>
          </motion.div>
        </div>

        {/* Features */}
        <section className="pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <FeatureCard
                key={i}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={0.4 + i * 0.1}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-zinc-900">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <span>2024 Datanauts. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <button onClick={() => navigate("/about")} className="hover:text-white transition-colors">About</button>
              <button onClick={() => navigate("/events")} className="hover:text-white transition-colors">Events</button>
              <button onClick={() => navigate("/contact")} className="hover:text-white transition-colors">Contact</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default CollegeEventsHub;
