import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { cn } from "@/lib/utils";

export function LandingHero() {
  const [loaded, setLoaded] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoaded(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
        {/* Background Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full floating"
            style={{
              background:
                "radial-gradient(circle, hsl(355 78% 56% / 0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full floating-delayed"
            style={{
              background:
                "radial-gradient(circle, hsl(199 89% 48% / 0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/4 w-[200px] h-[200px] blob floating"
            style={{
              background:
                "radial-gradient(circle, hsl(142 35% 45% / 0.1) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Floating 3D Geometric Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large rotating cube outline - top right */}
          <div
            className={cn(
              "absolute top-24 right-[12%] w-32 h-32 floating transition-all duration-1000",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
            style={{ animationDelay: "0.2s" }}
          >
            <div
              className="w-full h-full border-2 border-foreground/20 rounded-2xl"
              style={{
                transform: "perspective(400px) rotateX(15deg) rotateY(-20deg)",
              }}
            />
          </div>

          {/* Coral sphere - bottom left */}
          <div
            className={cn(
              "absolute bottom-32 left-[8%] floating-delayed transition-all duration-1000 delay-200",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
          >
            <div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(355_78%_45%)]"
              style={{
                boxShadow: "0 20px 40px -10px hsl(355 78% 56% / 0.3)",
              }}
            />
          </div>

          {/* Small dotted ring - middle right */}
          <div
            className={cn(
              "absolute top-1/2 right-[6%] floating transition-all duration-1000 delay-300",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
            style={{ animationDelay: "0.8s" }}
          >
            <div
              className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30"
              style={{ transform: "rotate(45deg)" }}
            />
          </div>

          {/* Sage green pill shape - top left */}
          <div
            className={cn(
              "absolute top-40 left-[15%] floating transition-all duration-1000 delay-100",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
            style={{ animationDelay: "0.4s" }}
          >
            <div
              className="w-6 h-16 rounded-full bg-gradient-to-b from-[hsl(var(--sage))] to-[hsl(142_35%_35%)]"
              style={{
                transform: "rotate(-30deg)",
                boxShadow: "0 15px 30px -8px hsl(142 35% 45% / 0.3)",
              }}
            />
          </div>

          {/* Sky blue triangle-ish shape - bottom right */}
          <div
            className={cn(
              "absolute bottom-48 right-[18%] floating-delayed transition-all duration-1000 delay-400",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
          >
            <div
              className="w-14 h-14 bg-gradient-to-tr from-[hsl(var(--sky))] to-[hsl(199_89%_60%)] rounded-lg"
              style={{
                transform: "perspective(200px) rotateX(20deg) rotateY(15deg) rotate(12deg)",
                boxShadow: "0 15px 30px -8px hsl(199 89% 48% / 0.3)",
              }}
            />
          </div>

          {/* Tiny accent dots scattered */}
          <div
            className={cn(
              "absolute top-1/3 left-[25%] w-3 h-3 rounded-full bg-foreground/20 floating",
              loaded ? "opacity-100" : "opacity-0"
            )}
            style={{ animationDelay: "1s" }}
          />
          <div
            className={cn(
              "absolute bottom-1/3 right-[25%] w-2 h-2 rounded-full bg-[hsl(var(--accent))]/40 floating-delayed",
              loaded ? "opacity-100" : "opacity-0"
            )}
            style={{ animationDelay: "1.2s" }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div
            className={cn(
              "inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-8 transition-all duration-700",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(184,134,11,0.1) 100%)",
              border: "1px solid rgba(212,175,55,0.3)",
              boxShadow: "0 0 20px rgba(212,175,55,0.2), 0 0 40px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <span 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                boxShadow: "0 0 8px #D4AF37, 0 0 16px rgba(212,175,55,0.5)",
              }}
            />
            <span 
              className="text-sm font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #F4E4BC, #B8860B)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "0 0 30px rgba(212,175,55,0.3)",
              }}
            >
              Sphoorthy Engineering College
            </span>
          </div>

          <h1
            className={cn(
              "text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 transition-all duration-700 delay-100",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <span className="text-foreground">Discover </span>
            <span className="text-gradient">Amazing</span>
            <br />
            <span className="text-foreground">Campus Events</span>
          </h1>

          <p
            className={cn(
              "text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-balance transition-all duration-700 delay-200",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Your gateway to hackathons, workshops, cultural festivals, and
            networking opportunities. Join thousands of students creating
            unforgettable experiences.
          </p>

          <div
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="rounded-full px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleLearnMore}
              className="rounded-full px-8 py-6 text-base border-border hover:bg-secondary transition-all duration-300"
            >
              Learn More
            </Button>
          </div>

          <div
            className={cn(
              "mt-16 flex flex-wrap justify-center gap-8 md:gap-16 transition-all duration-700 delay-400",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
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
