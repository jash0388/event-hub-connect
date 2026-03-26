import { useState, useEffect, useRef } from "react";
import {
    motion,
    useScroll,
    useTransform,
    AnimatePresence,
} from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
    Orbit,
    ArrowUpRight,
    Play,
    Zap,
    Shield,
    Users,
    Heart,
    Radio,
    Lock,
    Rocket,
    Globe,
    Cpu,
    Satellite,
    Navigation,
    ChevronDown,
    ArrowRight,
    Mail,
    MapPin,
    X,
} from "lucide-react";

/* ──────────────────────────────────────────────
   GLOBAL STYLES (Liquid Glass CSS)
────────────────────────────────────────────── */
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap');

*::selection {
  background: rgba(255,255,255,0.3);
  color: white;
}

@layer components {
  .liquid-glass {
    background: rgba(255, 255, 255, 0.015);
    background-blend-mode: luminosity;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: none;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 24px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .liquid-glass::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
    background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.05) 80%, rgba(255,255,255,0.2) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
  }
  .liquid-glass-strong {
    background: rgba(255, 255, 255, 0.02);
    background-blend-mode: luminosity;
    backdrop-filter: blur(50px);
    -webkit-backdrop-filter: blur(50px);
    border: none;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2);
    position: relative; overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .liquid-glass-strong::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.2px;
    background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.4) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
  }
}
`;

/* ──────────────────────────────────────────────
   SHARED ANIMATION CONFIG
────────────────────────────────────────────── */
const smoothEase: any = [0.16, 1, 0.3, 1];

const fadeUpVariant = {
    hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.9, ease: smoothEase },
    },
};

/* ──────────────────────────────────────────────
   BlurText COMPONENT
────────────────────────────────────────────── */
function BlurText({ text, className = "", el: Tag = "h2", delay = 0 }: { text: string, className?: string, el?: any, delay?: number }) {
    const words = text.split(" ");
    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06,
                delayChildren: delay,
            },
        },
    };
    const child = {
        hidden: { filter: "blur(12px)", opacity: 0, y: 40 },
        visible: {
            filter: "blur(0px)",
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, ease: smoothEase },
        },
    };
    return (
        <Tag className={className}>
            <motion.span
                className="inline"
                variants={container}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
            >
                {words.map((word, i) => (
                    <motion.span key={i} className="inline-block mr-[0.35em]" variants={child}>
                        {word}
                    </motion.span>
                ))}
            </motion.span>
        </Tag>
    );
}

/* ──────────────────────────────────────────────
   ScrollReveal WRAPPER
────────────────────────────────────────────── */
function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: smoothEase, delay }}
        >
            {children}
        </motion.div>
    );
}

/* ──────────────────────────────────────────────
   A. NAVBAR
────────────────────────────────────────────── */
function Navbar({ openCodeModal }: { openCodeModal?: () => void }) {
    const [scrolled, setScrolled] = useState(false);
    const { user, signOut } = useAuth();

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 60);
        window.addEventListener("scroll", handler);
        return () => window.removeEventListener("scroll", handler);
    }, []);

    // Unified navigation items from Header.tsx logic
    const navItems = [
        { path: "/", label: "Home", guestOnly: true },
        { path: "/events", label: "Events" },
        { path: "/projects", label: "Projects" },
        { path: "/learn", label: "Learn" },
        { path: "/tasks", label: "Tasks" },
        { path: "/contact", label: "Contact", guestOnly: true },
    ];

    const visibleLinks = navItems.filter(item => {
        if (user) return !item.guestOnly;
        return item.path !== "/tasks";
    });

    return (
        <motion.nav
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: smoothEase, delay: 0.2 }}
            className={`fixed top-6 left-0 right-0 z-50 px-6 lg:px-12 flex items-center justify-between transition-all duration-500 ${scrolled ? "" : ""}`}
        >
            {/* Logo */}
            <Link to="/" className="liquid-glass w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-300">
                <Orbit className="w-5 h-5 text-white" />
            </Link>

            {/* Nav pill */}
            <div className="liquid-glass rounded-full px-2 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[calc(100vw-6rem)]">
                <div className="hidden md:flex items-center gap-1">
                    {visibleLinks.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="font-body text-sm whitespace-nowrap text-white/70 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 transition-all duration-300 relative"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {user ? (
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10 ml-1">
                        <Link to="/profile" className="font-body text-white/70 hover:text-white px-3 py-2 rounded-full hover:bg-white/5 transition-all duration-300 text-sm flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                <span className="text-white text-xs">{user.email?.charAt(0).toUpperCase()}</span>
                            </span>
                            <span className="hidden sm:inline">Profile</span>
                        </Link>
                        <button
                            onClick={() => signOut()}
                            className="font-body text-white/70 hover:text-white px-3 py-2 rounded-full hover:bg-white/5 transition-all duration-300 text-sm"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 ml-1">
                        {openCodeModal && (
                            <button
                                onClick={openCodeModal}
                                className="font-body text-white/70 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 transition-all duration-300 text-sm border border-white/20"
                            >
                                Enter Code
                            </button>
                        )}
                        <Link to="/login" className="bg-white inline-flex text-[#02040A] font-body flex-shrink-0 font-semibold text-sm px-5 py-2.5 rounded-full items-center gap-2 hover:bg-white/90 transition-all duration-300 hover:scale-105">
                            Join Now
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </motion.nav>
    );
}

/* ──────────────────────────────────────────────
   B. HERO SECTION
────────────────────────────────────────────── */
function HeroSection() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.15]);

    useEffect(() => {
        // Preload video but with low priority
        const preloadLink = document.createElement("link");
        preloadLink.rel = "preload";
        preloadLink.as = "video";
        preloadLink.href =
            "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_115329_5e00c9c5-4d69-49b7-94c3-9c31c60bb644.mp4";
        document.head.appendChild(preloadLink);
        return () => { if (document.head.contains(preloadLink)) document.head.removeChild(preloadLink); };
    }, []);

    return (
        <section ref={ref} id="home" className="relative h-[100dvh] overflow-hidden bg-slate-950">
            {/* Parallax video */}
            <motion.div className="absolute inset-0 w-full h-full" style={{ y, scale }}>
                <motion.div style={{ opacity }} className="w-full h-full">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_115329_5e00c9c5-4d69-49b7-94c3-9c31c60bb644.mp4"
                    />
                </motion.div>
            </motion.div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#02040A]/30 via-[#02040A]/50 to-[#02040A]" />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
                {/* Badge */}
                <ScrollReveal>
                    <div className="liquid-glass rounded-full px-5 py-2 mb-8 inline-flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="font-body text-xs uppercase tracking-[0.25em] text-white/80">
                            Sphoorthy Engineering College
                        </span>
                    </div>
                </ScrollReveal>

                {/* Heading */}
                <BlurText
                    text="Your Campus Life Starts Here at the Hub"
                    el="h1"
                    className="font-heading italic text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6.5rem] text-white tracking-tight text-balance max-w-5xl leading-[1.05]"
                    delay={0.3}
                />

                {/* Sub */}
                <ScrollReveal delay={0.6}>
                    <p className="font-body text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed mt-8">
                        The ultimate hub for college hackathons, career-shifting internships,
                        innovative projects, and everything happening on campus.
                    </p>
                </ScrollReveal>

                {/* CTAs */}
                <ScrollReveal delay={0.8}>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
                        <Link to="/events" className="liquid-glass-strong rounded-full px-8 py-4 font-body font-semibold text-white inline-flex items-center gap-3 hover:scale-105 transition-transform duration-300">
                            <Rocket className="w-5 h-5" />
                            Explore Events
                        </Link>
                        <Link to="/projects" className="font-body text-white/70 hover:text-white inline-flex items-center gap-3 px-6 py-4 rounded-full hover:bg-white/5 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                                <Play className="w-4 h-4 ml-0.5" />
                            </div>
                            View Projects
                        </Link>
                    </div>
                </ScrollReveal>
            </div>

            {/* Bottom scroll indicator */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
                <div className="w-6 h-10 rounded-full border border-white/20 flex items-start justify-center p-2">
                    <motion.div
                        className="w-1 h-2 bg-white/60 rounded-full"
                        animate={{ y: [0, 12, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                </div>
            </motion.div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   C. MISSION STATEMENT
────────────────────────────────────────────── */
function MissionStatement() {
    return (
        <section className="relative py-40 px-6 overflow-hidden">
            {/* Ambient orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

            {/* Vertical line */}
            <ScrollReveal className="flex justify-center mb-16">
                <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
            </ScrollReveal>

            <div className="max-w-4xl mx-auto text-center relative z-10">
                <BlurText
                    text="We are not just hosting events. We are shaping the future leaders of tomorrow."
                    el="h2"
                    className="font-heading italic text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight text-balance leading-[1.15]"
                />
            </div>

            <ScrollReveal className="flex justify-center mt-16">
                <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
            </ScrollReveal>
        </section>
    );
}

/* ──────────────────────────────────────────────
   D. VESSEL SPECS
────────────────────────────────────────────── */
function VesselSpecs() {
    const specs = [
        { icon: Zap, label: "Events", value: "50+", desc: "Hosted per year" },
        { icon: Shield, label: "Uptime", value: "99.9%", desc: "Platform reliability" },
        { icon: Users, label: "Students", value: "3,000+", desc: "Active members" },
        { icon: Heart, label: "Clubs", value: "25+", desc: "Student organizations" },
        { icon: Lock, label: "Security", value: "A+", desc: "Data protection" },
        { icon: Radio, label: "Updates", value: "Real-time", desc: "Instant notifications" },
    ];

    return (
        <section id="voyages" className="relative py-32 px-6 lg:px-12 overflow-hidden">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left: Image card */}
                <ScrollReveal>
                    <div className="liquid-glass rounded-[2.5rem] h-[500px] lg:h-[650px] overflow-hidden group cursor-pointer">
                        <div className="relative w-full h-full">
                            <img
                                src="/college.jpg"
                                alt="Sphoorthy Engineering College"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#02040A] via-[#02040A]/30 to-transparent" />
                            <div className="absolute bottom-8 left-8 right-8">
                                <span className="font-body text-xs uppercase tracking-[0.25em] text-white/50 mb-2 block">
                                    Featured Platform
                                </span>
                                <h3 className="font-heading italic text-4xl md:text-5xl text-white mb-1">
                                    Event Hub
                                </h3>
                                <p className="font-body text-white/50 text-lg">Connect · Learn · Grow</p>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>

                {/* Right: Specs */}
                <div className="flex flex-col justify-center">
                    <ScrollReveal>
                        <span className="font-body text-xs uppercase tracking-[0.25em] text-white/40 mb-4 block">
                            Platform Stats
                        </span>
                        <BlurText
                            text="Built for Students"
                            el="h2"
                            className="font-heading italic text-4xl md:text-5xl lg:text-6xl text-white tracking-tight mb-10"
                        />
                    </ScrollReveal>

                    <div className="grid grid-cols-2 gap-4">
                        {specs.map((spec, i) => (
                            <ScrollReveal key={spec.label} delay={i * 0.08}>
                                <div className="liquid-glass rounded-2xl p-5 hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
                                    <spec.icon className="w-5 h-5 text-white/40 mb-3" />
                                    <p className="font-body text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
                                        {spec.label}
                                    </p>
                                    <p className="font-heading italic text-2xl text-white">{spec.value}</p>
                                    <p className="font-body text-xs text-white/40 mt-1">{spec.desc}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   E. FEATURES GRID
────────────────────────────────────────────── */
function FeaturesGrid() {
    const features = [
        { icon: Rocket, title: "Event Discovery", desc: "Find hackathons, workshops, seminars, and cultural events happening across campus — all in one place." },
        { icon: Shield, title: "QR Check-In", desc: "Seamless attendance tracking with instant QR code scanning at every event entrance." },
        { icon: Globe, title: "Project Showcase", desc: "Share your innovations with the entire college. Get feedback, collaborate, and gain visibility." },
        { icon: Cpu, title: "Learn Hub", desc: "Access curated tutorials, coding challenges, and study resources built by students for students." },
        { icon: Satellite, title: "Live Feed", desc: "Real-time announcements, updates, and discussions keeping you connected to campus life 24/7." },
        { icon: Navigation, title: "Smart Profiles", desc: "Track your event participation, project contributions, and achievements in one unified dashboard." },
    ];

    return (
        <section id="innovation" className="relative py-32 px-6 lg:px-12 overflow-hidden">
            {/* Ambient orb */}
            <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <ScrollReveal>
                        <span className="font-body text-xs uppercase tracking-[0.25em] text-white/40 mb-4 block">
                            Platform Features
                        </span>
                    </ScrollReveal>
                    <BlurText
                        text="Everything You Need"
                        el="h2"
                        className="font-heading italic text-4xl md:text-5xl lg:text-6xl text-white tracking-tight"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feat, i) => (
                        <ScrollReveal key={feat.title} delay={i * 0.08}>
                            <div className="liquid-glass-strong rounded-3xl p-7 hover:-translate-y-1 transition-all duration-400 cursor-pointer group h-full">
                                <div className="rounded-2xl border border-white/10 w-14 h-14 flex items-center justify-center mb-5 group-hover:border-white/20 transition-colors duration-300">
                                    <feat.icon className="w-6 h-6 text-white/60 group-hover:text-white/80 transition-colors" />
                                </div>
                                <h3 className="font-heading italic text-2xl text-white mb-3">{feat.title}</h3>
                                <p className="font-body text-white/50 text-sm leading-relaxed">{feat.desc}</p>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   F. JOURNEY TIMELINE
────────────────────────────────────────────── */
function JourneyTimeline() {
    const steps = [
        {
            phase: "Step 01",
            title: "Sign Up & Explore",
            desc: "Create your student profile in seconds. Browse upcoming events, hackathons, workshops, and campus activities.",
            time: "Takes 2 minutes",
        },
        {
            phase: "Step 02",
            title: "Register & Participate",
            desc: "One-click registration for events. Get QR codes for check-in, add events to your calendar, and join team formations.",
            time: "Instant confirmation",
        },
        {
            phase: "Step 03",
            title: "Learn & Build",
            desc: "Access coding tutorials, work on projects, enter coding challenges, and collaborate with peers across departments.",
            time: "Available 24/7",
        },
        {
            phase: "Step 04",
            title: "Grow & Connect",
            desc: "Build your portfolio, earn participation certificates, track achievements, and connect with opportunities.",
            time: "Ongoing",
        },
    ];

    return (
        <section className="relative py-32 px-6 lg:px-12 overflow-hidden">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-20">
                    <ScrollReveal>
                        <span className="font-body text-xs uppercase tracking-[0.25em] text-white/40 mb-4 block">
                            How It Works
                        </span>
                    </ScrollReveal>
                    <BlurText
                        text="Your Journey Begins"
                        el="h2"
                        className="font-heading italic text-4xl md:text-5xl lg:text-6xl text-white tracking-tight"
                    />
                </div>

                <div className="relative">
                    {/* Center line */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent hidden md:block" />

                    {steps.map((step, i) => {
                        const isLeft = i % 2 === 0;
                        return (
                            <ScrollReveal key={step.title} delay={i * 0.1}>
                                <div className={`relative flex flex-col md:flex-row items-center mb-16 last:mb-0 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}>
                                    {/* Content */}
                                    <div className={`w-full md:w-[calc(50%-2rem)] ${isLeft ? "md:pr-8 md:text-right" : "md:pl-8 md:text-left"}`}>
                                        <div className="liquid-glass rounded-2xl p-6">
                                            <span className="font-body text-xs uppercase tracking-[0.2em] text-white/30 mb-2 block">
                                                {step.phase}
                                            </span>
                                            <h3 className="font-heading italic text-2xl text-white mb-3">{step.title}</h3>
                                            <p className="font-body text-sm text-white/50 leading-relaxed mb-3">{step.desc}</p>
                                            <span className="font-body text-xs text-white/30">{step.time}</span>
                                        </div>
                                    </div>

                                    {/* Node */}
                                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 items-center justify-center">
                                        <div className="w-4 h-4 rounded-full bg-white/10 border border-white/20 relative">
                                            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                                        </div>
                                    </div>

                                    {/* Spacer */}
                                    <div className="hidden md:block w-[calc(50%-2rem)]" />
                                </div>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   G. DESTINATIONS (BENTO GRID)
────────────────────────────────────────────── */
function Destinations() {
    const destinations = [
        {
            name: "Hackathons",
            tagline: "Code. Compete. Conquer.",
            img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop",
            span: true,
        },
        {
            name: "Workshops",
            tagline: "Hands-on Learning",
            img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1600&auto=format&fit=crop",
            span: false,
        },
        {
            name: "Tech Talks",
            tagline: "Industry Insights",
            img: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1600&auto=format&fit=crop",
            span: false,
        },
        {
            name: "Cultural Fests",
            tagline: "Celebrate Together",
            img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop",
            span: true,
        },
    ];

    return (
        <section id="worlds" className="relative py-32 px-6 lg:px-12 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div>
                        <ScrollReveal>
                            <span className="font-body text-xs uppercase tracking-[0.25em] text-white/40 mb-4 block">
                                Explore Categories
                            </span>
                        </ScrollReveal>
                        <BlurText
                            text="Events Await"
                            el="h2"
                            className="font-heading italic text-4xl md:text-5xl lg:text-6xl text-white tracking-tight"
                        />
                    </div>
                    <ScrollReveal>
                        <a
                            href="#"
                            className="font-body text-sm text-white/50 hover:text-white flex items-center gap-2 transition-colors duration-300"
                        >
                            View All Events <ArrowRight className="w-4 h-4" />
                        </a>
                    </ScrollReveal>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    {destinations.map((dest, i) => (
                        <ScrollReveal
                            key={dest.name}
                            delay={i * 0.1}
                            className={dest.span ? "md:col-span-2" : "md:col-span-2 md:col-span-1 lg:col-span-1"}
                        >
                            <div className={`group relative rounded-3xl overflow-hidden cursor-pointer ${dest.span ? "h-[400px] md:col-span-2" : "h-[400px]"}`}>
                                <img
                                    src={dest.img}
                                    alt={dest.name}
                                    className="w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#02040A] via-[#02040A]/20 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <span className="font-body text-xs uppercase tracking-[0.2em] text-white/40 mb-2 block">
                                        {dest.tagline}
                                    </span>
                                    <h3 className="font-heading italic text-3xl text-white mb-4">{dest.name}</h3>
                                    <Link to="/events" className="liquid-glass rounded-full px-5 py-2.5 font-body text-sm inline-flex text-white/80 hover:text-white items-center gap-2 transition-all duration-300 w-fit">
                                        View Details <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   H. FAQ ACCORDION
────────────────────────────────────────────── */
function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const questions = [
        {
            q: "Who can use the Event Hub?",
            a: "All students of Sphoorthy Engineering College can sign up using their college email. Faculty advisors and club coordinators also have access to manage events and announcements.",
        },
        {
            q: "How do I register for an event?",
            a: "Simply browse upcoming events, click Register, and you will receive a confirmation with a QR code. Show the QR code at the event entrance for instant check-in.",
        },
        {
            q: "Can I submit my own project or event?",
            a: "Yes! Students can submit project showcases and club heads can create events through the dashboard. All submissions go through a quick review before going live.",
        },
        {
            q: "Is the Learn Hub free for all students?",
            a: "Absolutely. All tutorials, coding challenges, and learning resources on the platform are free and open to every registered student of the college.",
        },
    ];

    return (
        <section className="relative py-32 px-6 lg:px-12 overflow-hidden">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-16">
                    <ScrollReveal>
                        <span className="font-body text-xs uppercase tracking-[0.25em] text-white/40 mb-4 block">
                            Frequently Asked
                        </span>
                    </ScrollReveal>
                    <BlurText
                        text="Common Inquiries"
                        el="h2"
                        className="font-heading italic text-4xl md:text-5xl text-white tracking-tight"
                    />
                </div>

                <div className="space-y-3">
                    {questions.map((item, i) => (
                        <ScrollReveal key={i} delay={i * 0.05}>
                            <div className="liquid-glass rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className="font-body text-white/80 text-base pr-4">{item.q}</span>
                                    <motion.div
                                        animate={{ rotate: openIndex === i ? 180 : 0 }}
                                        transition={{ duration: 0.3, ease: smoothEase }}
                                        className="flex-shrink-0"
                                    >
                                        <ChevronDown className="w-5 h-5 text-white/40" />
                                    </motion.div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {openIndex === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: smoothEase }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 pt-0">
                                                <p className="font-body text-sm text-white/50 leading-loose">{item.a}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────
   I. FOOTER
────────────────────────────────────────────── */
function Footer() {
    const missionLinks = ["Hackathons", "Workshops", "Tech Talks", "Cultural Fests", "Community Events"];
    const companyLinks = ["About Us", "Contact", "Admin Login", "Privacy Policy", "Feedback"];

    return (
        <footer id="launch" className="relative border-t border-white/5 pt-20 pb-8 px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Col 1 - Brand */}
                    <div className="lg:col-span-2">
                        <ScrollReveal>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="liquid-glass w-10 h-10 rounded-full flex items-center justify-center">
                                    <Orbit className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-heading italic text-xl text-white">Event Hub</span>
                            </div>
                            <h3 className="font-heading italic text-3xl md:text-4xl text-white mb-6 tracking-tight">
                                Stay in the loop
                            </h3>
                            <div className="flex gap-2 max-w-md">
                                <div className="liquid-glass rounded-full flex-1 px-5 py-3">
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        className="bg-transparent w-full font-body text-sm text-white placeholder-white/30 outline-none"
                                    />
                                </div>
                                <Link to="/login" className="bg-white text-[#02040A] font-body font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition-all duration-300 inline-flex items-center gap-2 hover:scale-105">
                                    <Mail className="w-4 h-4" />
                                    Subscribe
                                </Link>
                            </div>
                        </ScrollReveal>
                    </div>

                    {/* Col 2 - Missions */}
                    <div>
                        <ScrollReveal delay={0.1}>
                            <h4 className="font-body text-xs uppercase tracking-[0.25em] text-white/30 mb-6">Events</h4>
                            <ul className="space-y-3">
                                {missionLinks.map((item) => (
                                    <li key={item}>
                                        <a href="#" className="font-body text-sm text-white/50 hover:text-white transition-colors duration-300">
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </ScrollReveal>
                    </div>

                    {/* Col 3 - Company */}
                    <div>
                        <ScrollReveal delay={0.2}>
                            <h4 className="font-body text-xs uppercase tracking-[0.25em] text-white/30 mb-6">Quick Links</h4>
                            <ul className="space-y-3">
                                {companyLinks.map((item) => (
                                    <li key={item}>
                                        <a href="#" className="font-body text-sm text-white/50 hover:text-white transition-colors duration-300">
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </ScrollReveal>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="font-body text-xs text-white/30">
                        © 2026 Sphoorthy Engineering College Event Hub. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">
                            Terms of Service
                        </a>
                        <a href="#" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">
                            Cookie Preferences
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-body text-xs text-white/20">Departments</span>
                        {["CSE", "ECE", "EEE"].map((p) => (
                            <span key={p} className="font-heading italic text-sm text-white/30">{p}</span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

/* ──────────────────────────────────────────────
   MAIN APP
────────────────────────────────────────────── */
export default function CinematicLanding() {
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [enteredCode, setEnteredCode] = useState("");
    const navigate = useNavigate();
    const { toast } = useToast();

    const openCodeModal = () => setIsCodeModalOpen(true);
    const closeCodeModal = () => {
        setIsCodeModalOpen(false);
        setEnteredCode("");
    };

    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = enteredCode.trim();
        if (code) {
            const ADMIN_CODES = ['819234', '475619', '902381'];
            if (ADMIN_CODES.includes(code)) {
                localStorage.setItem('admin_access_code', code);
                toast({
                    title: "Access Granted",
                    description: "Welcome to the Admin Dashboard",
                });
                closeCodeModal();
                navigate('/admin/dashboard');
                return;
            } else {
                toast({
                    title: "Invalid Code",
                    description: "The access code you entered is incorrect.",
                    variant: "destructive"
                });
                setEnteredCode("");
            }
        }
    };

    return (
        <div className="bg-[#02040A] text-white min-h-[100dvh] font-body selection:bg-white/30 selection:text-white overflow-x-hidden">
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
            <Navbar openCodeModal={openCodeModal} />
            <main>
                <HeroSection />
                <MissionStatement />
                <VesselSpecs />
                <FeaturesGrid />
                <JourneyTimeline />
                <Destinations />
                <FAQ />
            </main>
            <Footer />

            {/* Code Entry Modal */}
            <AnimatePresence>
                {isCodeModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
                        onClick={closeCodeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-[#02040A]">Enter Code</h3>
                                <button
                                    onClick={closeCodeModal}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                            <form onSubmit={handleCodeSubmit}>
                                <input
                                    type="text"
                                    value={enteredCode}
                                    onChange={(e) => setEnteredCode(e.target.value)}
                                    placeholder="Enter your access code"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#02040A] placeholder-gray-400 focus:border-[#02040A] focus:outline-none transition-colors text-lg"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="w-full mt-4 bg-[#02040A] text-white py-3 rounded-xl font-semibold hover:bg-[#02040A]/90 transition-colors"
                                >
                                    Submit
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
