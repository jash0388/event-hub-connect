import { Calendar, Code2, Users, Zap } from "lucide-react";
import { CyberCard } from "@/components/ui/CyberCard";

const features = [
  {
    icon: Calendar,
    title: "EVENT UPDATES",
    description: "Stay tuned with the latest tech events, hackathons, and workshops happening in our community.",
    color: "text-primary",
    glow: "glow-green",
  },
  {
    icon: Code2,
    title: "PROJECTS",
    description: "Explore innovative projects built by our team, from web apps to AI experiments.",
    color: "text-secondary",
    glow: "glow-cyan",
  },
  {
    icon: Users,
    title: "ALPHA TEAM",
    description: "Meet the creative minds behind Techtoons - developers, designers, and tech enthusiasts.",
    color: "text-accent",
    glow: "glow-magenta",
  },
  {
    icon: Zap,
    title: "TECH INSIGHTS",
    description: "Access tutorials, tech news, and exclusive content to level up your skills.",
    color: "text-neon-amber",
    glow: "glow-amber",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
            <span className="text-muted-foreground">[</span>
            <span className="text-foreground"> SYSTEM MODULES </span>
            <span className="text-muted-foreground">]</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground max-w-md mx-auto">
            Explore the core features and modules of the Techtoons ecosystem
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <CyberCard
              key={feature.title}
              variant="glowing"
              className="group hover:-translate-y-2 transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative z-10">
                <div className={`mb-4 ${feature.color}`}>
                  <feature.icon size={32} className={feature.glow} />
                </div>
                <h3 className="font-display text-lg font-semibold tracking-wider mb-2 text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </CyberCard>
          ))}
        </div>
      </div>
    </section>
  );
}
