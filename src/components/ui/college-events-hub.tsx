"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ArrowRight, Sparkles, Calendar, Bell, Users, Zap, ChevronRight, Star, Globe, ArrowUpRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Utility function
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Text Scramble Effect Component
const ScrambleText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(true);
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  
  useEffect(() => {
    if (!isAnimating) return;
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(prev => 
        text.split("").map((char, index) => {
          if (index < iteration) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join("")
      );
      if (iteration >= text.length) {
        clearInterval(interval);
        setIsAnimating(false);
      }
      iteration += 1/3;
    }, 30);
    return () => clearInterval(interval);
  }, [text, isAnimating]);
  
  return <span className={className}>{displayText}</span>;
};

// Rotating Words Component
const RotatingWords: React.FC<{ words: string[]; className?: string }> = ({ words, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);
  
  return (
    <span className={cn("relative inline-block", className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ y: 40, opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -40, opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="inline-block"
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

// Animated Gradient Orbs
const GradientOrbs: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div 
        animate={{ 
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <motion.div 
        animate={{ 
          x: [0, -100, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
          filter: 'blur(80px)',
        }}
      />
    </div>
  );
};

// Noise Texture Overlay
const NoiseOverlay: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
};

// Grid Pattern
const GridPattern: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

// Interactive Particles
const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Initialize particles
    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((particle, i) => {
        // Mouse interaction
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 150) {
          const force = (150 - dist) / 150;
          particle.vx -= (dx / dist) * force * 0.02;
          particle.vy -= (dy / dist) * force * 0.02;
        }
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Friction
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        
        // Bounds
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`;
        ctx.fill();
        
        // Draw connections
        particlesRef.current.slice(i + 1).forEach(other => {
          const dx2 = other.x - particle.x;
          const dy2 = other.y - particle.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          
          if (dist2 < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - dist2 / 100)})`;
            ctx.stroke();
          }
        });
      });
      
      animationId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};

// Bento Card Component
interface BentoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  gradient?: string;
}

const BentoCard: React.FC<BentoCardProps> = ({ icon, title, description, className, gradient }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "group relative rounded-3xl p-8 overflow-hidden cursor-pointer",
        "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
        "border border-white/[0.08] hover:border-white/[0.15]",
        "backdrop-blur-xl transition-all duration-500",
        className
      )}
    >
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        gradient || "bg-gradient-to-br from-blue-500/10 to-violet-500/10"
      )} />
      
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/[0.1] flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
        <p className="text-zinc-400 leading-relaxed text-sm">{description}</p>
      </div>
      
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        <ArrowUpRight className="w-5 h-5 text-blue-400" />
      </div>
    </motion.div>
  );
};

// Stats Counter Component
const AnimatedCounter: React.FC<{ value: string; label: string; delay: number }> = ({ value, label, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
        {value}
      </div>
      <div className="text-sm text-zinc-500 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
};

// Main Component
export const CollegeEventsHub: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const features = [
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Smart Notifications",
      description: "AI-powered alerts that learn your preferences and deliver what matters most.",
      gradient: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Event Calendar",
      description: "Beautifully organized calendar with seamless sync to your favorite apps.",
      gradient: "bg-gradient-to-br from-violet-500/10 to-purple-500/10"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community Hub",
      description: "Connect with peers, join groups, and build lasting relationships.",
      gradient: "bg-gradient-to-br from-pink-500/10 to-rose-500/10"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Instant Check-in",
      description: "QR-based registration that takes seconds, not minutes.",
      gradient: "bg-gradient-to-br from-amber-500/10 to-orange-500/10"
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#030303] text-white overflow-hidden">
      <NoiseOverlay />
      <GradientOrbs />
      <GridPattern />
      <ParticleField />

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled 
            ? "bg-black/60 backdrop-blur-2xl border-b border-white/[0.05]" 
            : ""
        )}
      >
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate("/")}
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center overflow-hidden">
              <Sparkles className="w-5 h-5 text-white relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <span className="text-xl font-bold tracking-tight">Datanauts</span>
          </motion.div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05]">
              <Globe className="w-3.5 h-3.5" />
              <span>Sphoorthy Engineering College</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => navigate('/events')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Events
              </button>
              <button 
                onClick={() => navigate('/about')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                About
              </button>
            </div>
            
            <motion.button 
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold overflow-hidden group"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute inset-0 z-10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">Sign In</span>
            </motion.button>
          </div>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-white/[0.1] mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-zinc-300">500+ students already connected</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8"
          >
            <span className="text-white">Stay ahead with</span>
            <br />
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                <RotatingWords 
                  words={["Events", "Updates", "News", "Activities"]} 
                />
              </span>
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            The modern platform for college events, announcements, and community. 
            Built for students who don't want to miss out.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.button
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-2xl overflow-hidden"
            >
              <span className="relative z-10">Get Started Free</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-violet-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
            
            <motion.button
              onClick={() => navigate('/events')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.02] transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-white font-medium">See How It Works</span>
            </motion.button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-8 text-zinc-500"
          >
            {[
              { icon: <Star className="w-4 h-4 text-yellow-500" />, text: "4.9 rating" },
              { icon: <Users className="w-4 h-4" />, text: "500+ users" },
              { icon: <Zap className="w-4 h-4 text-blue-500" />, text: "Instant updates" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/[0.2] flex items-start justify-center p-2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-2 rounded-full bg-white/50"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-sm text-blue-400 font-medium tracking-wider uppercase mb-4 block">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything you need,<br />nothing you don't
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Powerful features designed to keep you connected with what matters most in your college life.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <BentoCard key={i} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[40px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] p-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-violet-500/5" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-12">
              <AnimatedCounter value="500+" label="Active Users" delay={0} />
              <AnimatedCounter value="50+" label="Events" delay={0.1} />
              <AnimatedCounter value="20+" label="Workshops" delay={0.2} />
              <AnimatedCounter value="100%" label="Free" delay={0.3} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 blur-3xl" />
            <div className="relative bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-[40px] p-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to get started?
              </h2>
              <p className="text-zinc-400 text-lg mb-10 max-w-lg mx-auto">
                Join hundreds of students already using Datanauts. It's free, it's fast, and it's awesome.
              </p>
              <motion.button
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-100 transition-colors"
              >
                Create Your Account
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">Datanauts</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-zinc-500">
              <button onClick={() => navigate('/events')} className="hover:text-white transition-colors">Events</button>
              <button onClick={() => navigate('/about')} className="hover:text-white transition-colors">About</button>
              <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign In</button>
            </div>
            
            <p className="text-sm text-zinc-600">
              Sphoorthy Engineering College
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CollegeEventsHub;
