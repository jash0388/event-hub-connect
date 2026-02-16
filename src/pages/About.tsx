import { Code2, Heart, Rocket, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CyberCard } from "@/components/ui/CyberCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const teamMembers = [
  {
    name: "DATANAUTS",
    role: "FOUNDER & LEAD DEV",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=datanauts&backgroundColor=00ff88",
    bio: "Full-stack developer with a passion for data science and innovative tech.",
  },
  {
    name: "ALPHA-01",
    role: "UI/UX DESIGNER",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=alpha01&backgroundColor=00d4ff",
    bio: "Creating futuristic interfaces that blend form and function seamlessly.",
  },
  {
    name: "BYTE",
    role: "BACKEND ARCHITECT",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=byte&backgroundColor=ff0080",
    bio: "Building scalable systems and APIs that power our applications.",
  },
  {
    name: "PIXEL",
    role: "CREATIVE DIRECTOR",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=pixel&backgroundColor=ff8c00",
    bio: "Turning creative visions into digital reality through art and design.",
  },
];

const stats = [
  { icon: Code2, value: "10+", label: "PROJECTS LAUNCHED" },
  { icon: Rocket, value: "20+", label: "EVENTS HOSTED" },
  { icon: Heart, value: "∞", label: "PASSION FOR TECH" },
];

export default function About() {
  const [stats, setStats] = useState([
    { icon: Users, value: "-", label: "ADMINS" },
    { icon: Code2, value: "-", label: "PROJECTS" },
    { icon: Rocket, value: "-", label: "EVENTS" },
    { icon: Heart, value: "∞", label: "PASSION FOR TECH" },
  ]);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch admins count from user_roles where role = 'admin'
        const { count: adminsCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");

        // Fetch events count
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });

        // Fetch projects count
        const { count: projectsCount } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true });

        setStats([
          { icon: Users, value: String(adminsCount || 0), label: "ADMINS" },
          { icon: Code2, value: String(projectsCount || 0), label: "PROJECTS" },
          { icon: Rocket, value: String(eventsCount || 0), label: "EVENTS" },
          { icon: Heart, value: "∞", label: "PASSION FOR TECH" },
        ]);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-16 max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-sm text-primary">//</span>
              <span className="font-mono text-sm text-muted-foreground">ABOUT</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-6">
              <span className="text-foreground">ABOUT</span>{" "}
              <span className="text-accent glow-magenta">ALPHA TEAM</span>
            </h1>
            <div className="space-y-4 font-mono text-muted-foreground">
              <p>
                We are <span className="text-primary">DATANAUTS SPHN</span>, a collective of tech enthusiasts,
                developers, and designers united by our passion for innovation and data science.
              </p>
              <p>
                Founded in 2024, our mission is to build cutting-edge projects, host
                community events, and create a space where technology meets creativity.
                The <span className="text-secondary">ALPHABAY X</span> platform represents our vision for the future
                of tech communities.
              </p>
              <p>
                Whether you're a seasoned developer or just starting your journey,
                there's a place for you in our community. Join us as we explore the
                frontiers of technology together.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {stats.map((stat) => (
              <CyberCard
                key={stat.label}
                variant="terminal"
                className="text-center"
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="font-display text-3xl font-black text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="font-mono text-xs text-muted-foreground tracking-wider">
                  {stat.label}
                </div>
              </CyberCard>
            ))}
          </div>

          {/* Team Section */}
          <div className="mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-8">
              <span className="text-muted-foreground">[</span>
              <span className="text-foreground"> THE ALPHA TEAM </span>
              <span className="text-muted-foreground">]</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <div className="font-mono text-xs text-primary mb-3">
                    {member.role}
                  </div>
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

            <div className="font-mono text-sm space-y-4">
              <p className="text-primary">
                {">"} OUR MISSION
              </p>
              <p className="text-muted-foreground pl-4">
                To build a thriving tech community that embraces innovation,
                creativity, and collaboration. We believe in pushing boundaries
                and creating technology that inspires.
              </p>
              <p className="text-secondary">
                {">"} OUR VISION
              </p>
              <p className="text-muted-foreground pl-4">
                A world where technology is accessible to all, where communities
                come together to solve problems, and where the next generation
                of tech leaders are nurtured and empowered.
              </p>
              <p className="text-accent">
                {">"} OUR VALUES
              </p>
              <ul className="text-muted-foreground pl-4 space-y-1">
                <li>• Innovation without limits</li>
                <li>• Community over competition</li>
                <li>• Learning through doing</li>
                <li>• Open source, open minds</li>
              </ul>
            </div>
          </CyberCard>
        </div>
      </main>

      <Footer />
    </div>
  );
}
