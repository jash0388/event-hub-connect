import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CyberCard } from "@/components/ui/CyberCard";

const teamMembers = [
    {
        name: "N. JASHWANTH SINGH",
        role: "FOUNDER & LEAD DEVELOPER",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=jashwanth&backgroundColor=00ff88",
        bio: "Full-stack developer with a passion for data science and innovative tech.",
        rollNumber: "24N81A6758",
    },
];



export default function About() {
    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Page Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Learn More</span>
                        </div>
                    </div>

                    {/* Team Section */}
                    <div className="mb-16">
                        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6 max-w-md mx-auto">
                            {teamMembers.map((member) => (
                                <CyberCard
                                    key={member.name}
                                    variant="hologram"
                                    className="text-center group"
                                >
                                    {/* Avatar */}
                                    <div className="relative w-24 h-24 mx-auto mb-4">
                                        <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse" />
                                        <img
                                            src={member.avatar}
                                            alt={member.name}
                                            className="w-full h-full rounded-full p-1"
                                        />
                                    </div>

                                    <h3 className="font-display text-lg font-bold tracking-wider text-foreground group-hover:text-primary transition-colors mb-1">
                                        {member.name}
                                    </h3>
                                    <div className="font-mono text-xs text-primary mb-1">
                                        {member.role}
                                    </div>
                                    {member.rollNumber && (
                                        <div className="font-mono text-xs text-amber-500 mb-2">
                                            Roll: {member.rollNumber}
                                        </div>
                                    )}
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {member.bio}
                                    </p>
                                </CyberCard>
                            ))}
                        </div>
                    </div>

                    {/* Mission Section */}
                    <CyberCard variant="terminal" padding="lg" className="max-w-3xl mx-auto">
                        {/* Terminal Header */}
                        <div className="flex items-center gap-2 -mt-2 mb-6">
                            <span className="w-3 h-3 rounded-full bg-neon-red" />
                            <span className="w-3 h-3 rounded-full bg-neon-amber" />
                            <span className="w-3 h-3 rounded-full bg-primary" />
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                                mission.txt
                            </span>
                        </div>
                        <div className="space-y-4 font-mono text-sm">
                            <p>
                                <span className="text-neon-green">➜</span> This project was built for{" "}
                                <span className="text-neon-cyan">DATANAUTS</span> club at{" "}
                                <span className="text-neon-magenta">Sphoorthy Engineering College</span>.
                            </p>
                            <p className="text-muted-foreground">
                                <span className="text-neon-green">➜</span> A platform to discover{" "}
                                <span className="text-neon-amber">tech events, workshops,</span> and{" "}
                                <span className="text-neon-cyan">hackathons</span> on campus.
                            </p>
                            <p className="text-muted-foreground">
                                <span className="text-neon-green">➜</span> Connecting innovators and building the{" "}
                                <span className="text-neon-green">future of campus tech communities</span>.
                            </p>
                        </div>
                    </CyberCard>
                </div>
            </main>

            <Footer />
        </div>
    );
}
