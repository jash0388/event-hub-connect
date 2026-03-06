import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, Code2, Users, Rocket, GraduationCap, Heart } from "lucide-react";

export default function About() {
    return (
        <div className="min-h-screen flex flex-col" style={{
            background: 'linear-gradient(to bottom, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)'
        }}>
            <Header />

            <main className="flex-1 pt-24 sm:pt-28 pb-16 relative z-10">
                <div className="container mx-auto px-4 max-w-4xl">

                    {/* Hero Section */}
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                            <span className="text-xs font-semibold text-white/90 uppercase tracking-widest">About Us</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4" style={{
                            textShadow: '0 2px 12px rgba(0,0,0,0.4)'
                        }}>
                            Building the Future of
                            <br />
                            <span style={{
                                background: 'linear-gradient(135deg, #67E8F9, #A78BFA, #F472B6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>Campus Tech</span>
                        </h1>
                        <p className="text-white/70 text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{
                            textShadow: '0 1px 4px rgba(0,0,0,0.3)'
                        }}>
                            Datanauts is a student-driven platform connecting innovators,
                            creators, and learners at Sphoorthy Engineering College.
                        </p>
                    </div>

                    {/* Founder Card */}
                    <div className="mb-12 sm:mb-16">
                        <div className="max-w-sm mx-auto">
                            <div className="relative rounded-3xl p-[1px]" style={{
                                background: 'linear-gradient(135deg, rgba(103,232,249,0.5), rgba(167,139,250,0.5), rgba(244,114,182,0.3))'
                            }}>
                                <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 text-center">
                                    {/* Avatar */}
                                    <div className="relative w-24 h-24 mx-auto mb-5">
                                        <div className="absolute inset-0 rounded-full" style={{
                                            background: 'linear-gradient(135deg, #67E8F9, #A78BFA, #F472B6)',
                                            padding: '3px'
                                        }}>
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                <img
                                                    src="https://api.dicebear.com/7.x/bottts/svg?seed=jashwanth&backgroundColor=6366f1"
                                                    alt="Jashwanth Singh"
                                                    className="w-full h-full rounded-full p-1"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 tracking-wide">
                                        N. JASHWANTH SINGH
                                    </h3>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2" style={{
                                        background: 'linear-gradient(135deg, #EDE9FE, #DBEAFE)',
                                        color: '#6366F1'
                                    }}>
                                        <Code2 className="w-3 h-3" />
                                        Founder & Lead Developer
                                    </div>
                                    <p className="text-xs text-amber-600 font-mono font-semibold mb-3">24N81A6758</p>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        Full-stack developer with a passion for data science and innovative tech.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mission & Values */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-12 sm:mb-16">
                        {[
                            {
                                icon: Rocket,
                                title: "Our Mission",
                                desc: "Built for the DATANAUTS club — a platform to discover tech events, workshops, and hackathons on campus.",
                                gradient: "from-cyan-500/20 to-blue-500/20",
                                iconColor: "text-cyan-500",
                                iconBg: "bg-cyan-50"
                            },
                            {
                                icon: Users,
                                title: "Community First",
                                desc: "Connecting innovators and building the future of campus tech communities, one event at a time.",
                                gradient: "from-violet-500/20 to-purple-500/20",
                                iconColor: "text-violet-500",
                                iconBg: "bg-violet-50"
                            },
                            {
                                icon: GraduationCap,
                                title: "For Students",
                                desc: "Designed by students, for students. Stay updated with everything happening at Sphoorthy Engineering College.",
                                gradient: "from-pink-500/20 to-rose-500/20",
                                iconColor: "text-pink-500",
                                iconBg: "bg-pink-50"
                            },
                            {
                                icon: Heart,
                                title: "Open & Inclusive",
                                desc: "Every student deserves access to opportunities. We make campus life more connected and informed.",
                                gradient: "from-amber-500/20 to-orange-500/20",
                                iconColor: "text-amber-500",
                                iconBg: "bg-amber-50"
                            }
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-white/30 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center mb-4`}>
                                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tech Stack Badge */}
                    <div className="text-center">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/15 inline-block">
                            <p className="text-white/50 text-xs uppercase tracking-widest mb-3 font-semibold">Built With</p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {["React", "TypeScript", "Supabase", "Vite", "Tailwind CSS"].map((tech) => (
                                    <span
                                        key={tech}
                                        className="px-3 py-1.5 rounded-full text-xs font-semibold"
                                        style={{
                                            background: 'rgba(255,255,255,0.12)',
                                            color: 'rgba(255,255,255,0.8)',
                                            border: '1px solid rgba(255,255,255,0.15)'
                                        }}
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
