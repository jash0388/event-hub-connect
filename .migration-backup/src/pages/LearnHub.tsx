import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { tutorialCategories, getAllTopics } from "@/data/tutorials";
import type { TutorialTopic } from "@/data/tutorials";
import { BookOpen, Code2, Search, ArrowRight, Sparkles, GraduationCap, Zap, Gamepad2, Target, Bug, Puzzle, PenTool, Keyboard } from "lucide-react";

const LearnHub = () => {
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    const allTopics = getAllTopics();

    const filteredCategories = search.trim()
        ? tutorialCategories
            .map((cat) => ({
                ...cat,
                topics: cat.topics.filter(
                    (t) =>
                        t.title.toLowerCase().includes(search.toLowerCase()) ||
                        t.description.toLowerCase().includes(search.toLowerCase())
                ),
            }))
            .filter((cat) => cat.topics.length > 0)
        : tutorialCategories;

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden">
                    {/* Background effects */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div
                            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
                            style={{
                                background: "radial-gradient(circle, rgba(155,89,182,0.12) 0%, transparent 70%)",
                            }}
                        />
                        <div
                            className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full"
                            style={{
                                background: "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)",
                            }}
                        />
                        {/* Grid pattern */}
                        <div
                            className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage: `linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)`,
                                backgroundSize: "40px 40px",
                            }}
                        />
                    </div>

                    <div className="relative z-10 container mx-auto px-6 text-center">
                        {/* Badge */}
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: "linear-gradient(135deg, rgba(155,89,182,0.15), rgba(212,175,55,0.1))",
                                border: "1px solid rgba(155,89,182,0.25)",
                            }}
                        >
                            <Sparkles className="w-4 h-4 text-[#9B59B6]" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Free Learning Platform for Students
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                            <span className="text-foreground">Learn </span>
                            <span className="text-gradient">To Code</span>
                            <br />
                            <span className="text-foreground">Like a Pro</span>
                        </h1>

                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                            W3Schools-style tutorials built for Sphoorthy Engineering College
                            students. Learn HTML, CSS, JavaScript, Python, Java, DSA, and more
                            — with interactive code examples.
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-xl mx-auto relative mb-12">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search tutorials... (HTML, Python, DSA...)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9B59B6]/40 focus:border-[#9B59B6]/50 transition-all text-base"
                            />
                        </div>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-4">
                            {[
                                { icon: BookOpen, value: `${allTopics.length}+`, label: "Topics" },
                                {
                                    icon: Code2,
                                    value: `${allTopics.reduce((acc, t) => acc + t.lessons.length, 0)}+`,
                                    label: "Lessons",
                                },
                                { icon: GraduationCap, value: "Free", label: "Forever" },
                                { icon: Zap, value: "Live", label: "Code Editor" },
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: "rgba(155,89,182,0.1)" }}
                                    >
                                        <stat.icon className="w-5 h-5 text-[#9B59B6]" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-lg font-bold text-foreground">{stat.value}</div>
                                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CodeQuest Game Banner */}
                <section className="py-8">
                    <div className="container mx-auto px-6">
                        <button
                            onClick={() => navigate("/learn/codequest")}
                            className="group relative w-full rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                            style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)" }}
                        >
                            {/* Animated border glow */}
                            <div
                                className="absolute inset-0 rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                style={{
                                    background: "linear-gradient(135deg, #8B5CF6, #D946EF, #F59E0B, #22C55E, #06B6D4)",
                                    padding: "2px",
                                    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                                    maskComposite: "exclude",
                                    WebkitMaskComposite: "xor",
                                }}
                            />

                            {/* Background particles */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-4 left-[10%] w-2 h-2 rounded-full bg-[#8B5CF6]/30 animate-pulse" />
                                <div className="absolute top-8 right-[15%] w-3 h-3 rounded-full bg-[#D946EF]/20 animate-pulse" style={{ animationDelay: "0.5s" }} />
                                <div className="absolute bottom-6 left-[25%] w-2 h-2 rounded-full bg-[#F59E0B]/25 animate-pulse" style={{ animationDelay: "1s" }} />
                                <div className="absolute bottom-4 right-[30%] w-2 h-2 rounded-full bg-[#22C55E]/20 animate-pulse" style={{ animationDelay: "1.5s" }} />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-8 md:p-10">
                                {/* Left: Icon + Text */}
                                <div className="flex-1 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 mb-4">
                                        <Gamepad2 className="w-4 h-4 text-[#D946EF]" />
                                        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Learn by Playing</span>
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                        Code<span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #8B5CF6, #D946EF)" }}>Quest</span> ⚔️
                                    </h2>
                                    <p className="text-white/60 text-sm md:text-base max-w-md mb-4">
                                        Learn programming the fun way! Play coding games, earn XP, level up, and unlock achievements.
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm text-white transition-all group-hover:gap-3" style={{ background: "linear-gradient(135deg, #8B5CF6, #D946EF)" }}>
                                        Play Now
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* Right: Game Mode Icons */}
                                <div className="flex flex-wrap gap-3 justify-center md:justify-end">
                                    {[
                                        { icon: Target, label: "Quiz", color: "#E44D26" },
                                        { icon: Bug, label: "Bug Fix", color: "#22C55E" },
                                        { icon: Puzzle, label: "Puzzle", color: "#8B5CF6" },
                                        { icon: PenTool, label: "Fill Code", color: "#F59E0B" },
                                        { icon: Keyboard, label: "Speed Type", color: "#06B6D4" },
                                    ].map((mode, i) => (
                                        <div
                                            key={i}
                                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-transform group-hover:scale-105"
                                            style={{ background: `${mode.color}15`, transitionDelay: `${i * 50}ms` }}
                                        >
                                            <mode.icon className="w-6 h-6" style={{ color: mode.color }} />
                                            <span className="text-[10px] font-medium text-white/60">{mode.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Course Categories */}
                <section className="py-16">
                    <div className="container mx-auto px-6">
                        {filteredCategories.map((category) => (
                            <div key={category.id} className="mb-16">
                                <div className="flex items-center gap-3 mb-8">
                                    <div
                                        className="w-1 h-8 rounded-full"
                                        style={{ background: "linear-gradient(to bottom, #9B59B6, #D4AF37)" }}
                                    />
                                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                                        {category.title}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {category.topics.map((topic) => (
                                        <TopicCard
                                            key={topic.id}
                                            topic={topic}
                                            onClick={() => navigate(`/learn/${topic.id}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {filteredCategories.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-muted-foreground text-lg">
                                    No tutorials found for "{search}"
                                </p>
                                <button
                                    onClick={() => setSearch("")}
                                    className="mt-4 text-[#9B59B6] underline underline-offset-4 hover:text-[#8E44AD] transition-colors"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-card border-t border-border">
                    <div className="container mx-auto px-6 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Ready to Start Learning?
                        </h2>
                        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                            Pick any topic above and start coding. Every tutorial has
                            interactive code examples you can try right away.
                        </p>
                        <button
                            onClick={() => navigate("/learn/html")}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
                        >
                            Start with HTML
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

// Topic Card Component
function TopicCard({ topic, onClick }: { topic: TutorialTopic; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="group relative bg-card rounded-2xl p-6 border border-border text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-transparent w-full"
            style={{
                ["--topic-color" as string]: topic.color,
            }}
        >
            {/* Hover glow */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `linear-gradient(135deg, ${topic.color}08, ${topic.color}15)`,
                    border: `1px solid ${topic.color}30`,
                }}
            />

            <div className="relative z-10">
                {/* Icon */}
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                    style={{
                        background: `${topic.color}15`,
                    }}
                >
                    {topic.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-foreground">
                    {topic.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {topic.description}
                </p>

                {/* Lesson count + Arrow */}
                <div className="flex items-center justify-between">
                    <span
                        className="text-xs font-medium px-3 py-1 rounded-full"
                        style={{
                            background: `${topic.color}12`,
                            color: topic.color,
                        }}
                    >
                        {topic.lessons.length} {topic.lessons.length === 1 ? "Lesson" : "Lessons"}
                    </span>
                    <ArrowRight
                        className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform"
                        style={{ color: topic.color }}
                    />
                </div>
            </div>
        </button>
    );
}

export default LearnHub;
