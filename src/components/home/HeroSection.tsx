import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient sphere - top right */}
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full floating"
          style={{
            background: "radial-gradient(circle, hsl(355 78% 56% / 0.15) 0%, transparent 70%)",
          }}
        />
        {/* Medium sphere - bottom left */}
        <div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full floating-delayed"
          style={{
            background: "radial-gradient(circle, hsl(199 89% 48% / 0.12) 0%, transparent 70%)",
          }}
        />
        {/* Small accent sphere */}
        <div
          className="absolute top-1/2 left-1/4 w-[200px] h-[200px] blob floating"
          style={{
            background: "radial-gradient(circle, hsl(142 35% 45% / 0.1) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* 3D Floating Cards */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating 3D Card 1 */}
        <div
          className={`absolute top-32 right-[15%] w-48 h-32 card-glass rounded-2xl floating transition-all duration-1000 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{
            transform: "perspective(1000px) rotateX(10deg) rotateY(-15deg)",
            animationDelay: "0.5s",
          }}
        >
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Active Events</div>
              <div className="text-2xl font-bold text-foreground">24+</div>
            </div>
          </div>
        </div>

        {/* Floating 3D Card 2 */}
        <div
          className={`absolute bottom-40 left-[10%] w-56 h-36 card-glass rounded-2xl floating-delayed transition-all duration-1000 delay-300 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{
            transform: "perspective(1000px) rotateX(-5deg) rotateY(10deg)",
          }}
        >
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="flex gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold">
                JD
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold -ml-3">
                AK
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold -ml-3">
                +5
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Students Registered</div>
              <div className="text-xl font-bold text-foreground">1,200+ Members</div>
            </div>
          </div>
        </div>

        {/* Floating 3D Card 3 */}
        <div
          className={`absolute top-1/2 right-[8%] w-40 h-24 card-glass rounded-2xl floating transition-all duration-1000 delay-500 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{
            transform: "perspective(1000px) rotateX(5deg) rotateY(-10deg)",
            animationDelay: "1s",
          }}
        >
          <div className="p-4 h-full flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--sage))] flex items-center justify-center">
              <span className="text-background text-lg">🚀</span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Projects</div>
              <div className="text-lg font-bold text-foreground">50+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 backdrop-blur-sm mb-8 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
          <span className="text-sm font-medium text-foreground">
            Now Live — Spring 2026 Events
          </span>
        </div>

        {/* Main Title */}
        <h1
          className={`text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 transition-all duration-700 delay-100 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="text-foreground">Discover </span>
          <span className="text-gradient">Amazing</span>
          <br />
          <span className="text-foreground">Campus Events</span>
        </h1>

        {/* Subtitle */}
        <p
          className={`text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 text-balance ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Your gateway to hackathons, workshops, cultural festivals, and networking 
          opportunities. Join thousands of students creating unforgettable experiences.
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Link to="/events">
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              Explore Events
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link to="/about">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 py-6 text-base border-border hover:bg-secondary transition-all duration-300"
            >
              Learn More
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div
          className={`mt-16 flex flex-wrap justify-center gap-8 md:gap-16 transition-all duration-700 delay-400 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
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

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
