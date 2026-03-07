import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { cn } from "@/lib/utils";

export function LandingHero() {
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGetStarted = () => {
    setShowGreeting(true);
    // Brief delay so the overlay mounts, then fade in
    timerRef.current = setTimeout(() => setGreetingVisible(true), 30);
    // Hold shimmer for 1.8s then fade out and navigate
    timerRef.current = setTimeout(() => setGreetingVisible(false), 1900);
    timerRef.current = setTimeout(() => {
      navigate("/login");
    }, 2500);
  };

  const handleLearnMore = () => {
    const section = document.getElementById("about-section");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Greeting Overlay */}
      {showGreeting && (
        <div
          className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-500",
            greetingVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <TextShimmer
            className="text-5xl md:text-7xl font-bold tracking-tight"
            duration={1.2}
          >
            Hi, how are you?
          </TextShimmer>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Gradient Orbs - static, no animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[hsl(355_78%_56%/0.1)]" />
          <div className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full bg-[hsl(199_89%_48%/0.08)]" />
        </div>

        {/* Simple Geometric Shapes - no heavy animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-24 right-[12%] w-24 h-24 border-2 border-foreground/10 rounded-2xl" style={{ transform: "rotate(12deg)" }} />
          <div className="absolute bottom-32 left-[8%] w-16 h-16 rounded-full bg-[hsl(var(--accent))]/20" />
          <div className="absolute top-1/2 right-[6%] w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/20" />
          <div className="absolute top-40 left-[15%] w-4 h-12 rounded-full bg-[hsl(var(--sage))]/30" style={{ transform: "rotate(-30deg)" }} />
          <div className="absolute bottom-48 right-[18%] w-10 h-10 bg-[hsl(var(--sky))]/20 rounded-lg" style={{ transform: "rotate(12deg)" }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-8"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(184,134,11,0.1) 100%)",
              border: "1px solid rgba(212,175,55,0.3)",
              boxShadow: "0 0 20px rgba(212,175,55,0.2)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span 
              className="text-sm font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #F4E4BC, #B8860B)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Sphoorthy Engineering College
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Discover </span>
            <span className="text-gradient">Amazing</span>
            <br />
            <span className="text-foreground">Campus Events</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
            Your gateway to hackathons, workshops, cultural festivals, and
            networking opportunities. Join thousands of students creating
            unforgettable experiences.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="rounded-full px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleLearnMore}
              className="rounded-full px-8 py-6 text-base border-border hover:bg-secondary"
            >
              Learn More
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { value: "50+", label: "Events Hosted" },
              { value: "1.2K", label: "Students" },
              { value: "25+", label: "Partners" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>
    </>
  );
}
