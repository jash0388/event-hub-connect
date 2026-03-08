import { Calendar, Code2, Users, Zap, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Calendar,
    title: "Event Discovery",
    description: "Browse through curated tech events, hackathons, and workshops tailored for your interests.",
    color: "bg-[hsl(var(--accent))]",
    link: "/events",
  },
  {
    icon: Code2,
    title: "Project Showcase",
    description: "Explore innovative projects built by our community — from web apps to AI experiments.",
    color: "bg-[hsl(var(--sage))]",
    link: "/projects",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with like-minded developers, designers, and tech enthusiasts on campus.",
    color: "bg-[hsl(var(--sky))]",
    link: "/about",
  },
  {
    icon: Zap,
    title: "Internships",
    description: "Discover exclusive internship opportunities from our partner companies and startups.",
    color: "bg-foreground",
    link: "/internships",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-sm font-medium text-foreground mb-4">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-balance text-foreground">
            Everything you need to
            <br />
            <span className="text-gradient">thrive on campus</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-balance">
            From discovering events to connecting with peers, we've got you covered
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Link
              key={feature.title}
              to={feature.link}
              className="group relative bg-card rounded-3xl p-8 card-3d border border-border hover:border-border/80 transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}
              >
                <feature.icon className="w-6 h-6 text-background" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-foreground/80 transition-colors flex items-center gap-2">
                {feature.title}
                <ArrowUpRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Gradient */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-secondary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
