import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Code2, Users, Rocket, GraduationCap, Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-6 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-sm font-medium text-foreground mb-4">
              About Us
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
              Building the Future of
              <br />
              <span className="text-gradient">Campus Tech</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed text-balance">
              DataNauts is a student-driven platform connecting innovators,
              creators, and learners at Sphoorthy Engineering College.
            </p>
          </div>

          {/* Founder Card */}
          <div className="mb-20">
            <div className="max-w-md mx-auto">
              <div className="bg-card rounded-3xl p-8 text-center border border-border card-3d">
                {/* Avatar */}
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-foreground p-1">
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                      <img
                        src="https://api.dicebear.com/7.x/bottts/svg?seed=jashwanth&backgroundColor=6366f1"
                        alt="Jashwanth Singh"
                        className="w-full h-full rounded-full p-1"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">
                  N. JASHWANTH SINGH
                </h3>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-sm font-medium text-foreground mb-3">
                  <Code2 className="w-4 h-4" />
                  Founder & Lead Developer
                </div>
                <p className="text-sm text-muted-foreground font-mono mb-4">24N81A6758</p>
                <p className="text-muted-foreground leading-relaxed">
                  Full-stack developer with a passion for data science and innovative tech.
                </p>
              </div>
            </div>
          </div>

          {/* Mission & Values */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What We Stand For
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Our core values drive everything we build
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: Rocket,
                  title: "Our Mission",
                  desc: "Built for the DATANAUTS club — a platform to discover tech events, workshops, and hackathons on campus.",
                  color: "bg-[hsl(var(--accent))]",
                },
                {
                  icon: Users,
                  title: "Community First",
                  desc: "Connecting innovators and building the future of campus tech communities, one event at a time.",
                  color: "bg-[hsl(var(--sage))]",
                },
                {
                  icon: GraduationCap,
                  title: "For Students",
                  desc: "Designed by students, for students. Stay updated with everything happening at Sphoorthy Engineering College.",
                  color: "bg-[hsl(var(--sky))]",
                },
                {
                  icon: Heart,
                  title: "Open & Inclusive",
                  desc: "Every student deserves access to opportunities. We make campus life more connected and informed.",
                  color: "bg-foreground",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-card rounded-3xl p-8 border border-border card-3d animate-fade-in-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-6`}>
                    <item.icon className="w-6 h-6 text-background" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-foreground rounded-3xl p-8 md:p-12 text-center mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-background mb-6">Built With Modern Tech</h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["React", "TypeScript", "Supabase", "Vite", "Tailwind CSS"].map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-background/10 text-background border border-background/20"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-8 rounded-3xl bg-secondary/50 border border-border">
              <div className="text-left">
                <h3 className="text-xl font-bold text-foreground mb-1">
                  Ready to get started?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Explore events and join our community today
                </p>
              </div>
              <Link to="/events">
                <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 group">
                  Explore Events
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
