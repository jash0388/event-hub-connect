import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, Code2, Users, Rocket, GraduationCap, Heart, Github, Linkedin, Mail, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function About() {
    const values = [
        {
            icon: Rocket,
            title: "Our Mission",
            desc: "Built for the DATANAUTS club - a platform to discover tech events, workshops, and hackathons on campus.",
            color: "blue"
        },
        {
            icon: Users,
            title: "Community First",
            desc: "Connecting innovators and building the future of campus tech communities, one event at a time.",
            color: "violet"
        },
        {
            icon: GraduationCap,
            title: "For Students",
            desc: "Designed by students, for students. Stay updated with everything at Sphoorthy Engineering College.",
            color: "emerald"
        },
        {
            icon: Heart,
            title: "Open & Inclusive",
            desc: "Every student deserves access to opportunities. We make campus life more connected and informed.",
            color: "rose"
        }
    ];

    const colorMap: Record<string, { icon: string; bg: string; border: string }> = {
        blue: { icon: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        violet: { icon: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
        emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        rose: { icon: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    };

    const techStack = ["React", "TypeScript", "Supabase", "Vite", "Tailwind CSS", "Framer Motion"];

    return (
        <div className="min-h-screen flex flex-col bg-[#030303]">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[128px]" />
            </div>

            <Header />

            <main className="flex-1 pt-28 sm:pt-32 pb-16 relative z-10">
                <div className="container mx-auto px-4 max-w-5xl">

                    {/* Hero Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6">
                            <Sparkles className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-zinc-400">About Us</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight">
                            Building the Future of
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-rose-400">
                                Campus Tech
                            </span>
                        </h1>
                        <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Datanauts is a student-driven platform connecting innovators, creators, and learners at Sphoorthy Engineering College.
                        </p>
                    </motion.div>

                    {/* Founder Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-16"
                    >
                        <div className="max-w-md mx-auto">
                            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 text-center relative overflow-hidden">
                                {/* Gradient accent */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-rose-500" />
                                
                                {/* Avatar */}
                                <div className="relative w-24 h-24 mx-auto mb-5">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-rose-500 p-[2px]">
                                        <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                                            <img
                                                src="https://api.dicebear.com/7.x/bottts/svg?seed=jashwanth&backgroundColor=6366f1"
                                                alt="Jashwanth Singh"
                                                className="w-full h-full rounded-full p-1"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1">N. JASHWANTH SINGH</h3>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-medium text-blue-400 mb-2">
                                    <Code2 className="w-3.5 h-3.5" />
                                    Founder & Lead Developer
                                </div>
                                <p className="text-xs text-zinc-600 font-mono mb-4">24N81A6758</p>
                                <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                                    Full-stack developer with a passion for data science and innovative tech solutions.
                                </p>

                                {/* Social Links */}
                                <div className="flex items-center justify-center gap-2">
                                    {[Github, Linkedin, Mail, Globe].map((Icon, i) => (
                                        <button 
                                            key={i}
                                            className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all"
                                        >
                                            <Icon className="w-4 h-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Values Grid */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16"
                    >
                        {values.map((item, idx) => {
                            const colors = colorMap[item.color];
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + idx * 0.1 }}
                                    className="group bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
                                >
                                    <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <item.icon className={`w-6 h-6 ${colors.icon}`} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                    <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* Tech Stack */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center"
                    >
                        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 inline-block">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Built With</p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {techStack.map((tech) => (
                                    <span
                                        key={tech}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white transition-all cursor-default"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
