import { useEffect, useState } from "react";
import { ArrowRight, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/CyberButton";

export function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  const [typedText, setTypedText] = useState("");
  const fullText = "INITIALIZING CORE MODULES...";

  useEffect(() => {
    setLoaded(true);
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden cyber-grid">
      {/* Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h1 className="font-display text-[15vw] font-black tracking-tighter opacity-[0.03] whitespace-nowrap">
          TECHTOONS
        </h1>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-10 w-2 h-2 bg-primary rounded-full animate-pulse" />
      <div className="absolute top-1/3 right-20 w-3 h-3 bg-secondary rounded-full animate-pulse delay-300" />
      <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-accent rounded-full animate-pulse delay-500" />

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 border border-primary/50 bg-primary/5 mb-8 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-xs text-primary uppercase tracking-widest">
            System Online • Alpha Build
          </span>
        </div>

        {/* Main Title */}
        <h1
          className={`font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4 transition-all duration-700 delay-200 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="text-foreground">JASH</span>{" "}
          <span className="text-primary glow-green">TECHTOONS</span>
        </h1>

        {/* Subtitle */}
        <p
          className={`font-display text-xl md:text-2xl text-muted-foreground tracking-wider mb-8 transition-all duration-700 delay-300 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          ALPHABAY X / 2026 EDITION
        </p>

        {/* Terminal Line */}
        <div
          className={`inline-flex items-center gap-2 font-mono text-sm text-muted-foreground mb-12 transition-all duration-700 delay-400 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Terminal size={16} className="text-primary" />
          <span>{typedText}</span>
          <span className="w-2 h-4 bg-primary animate-pulse" />
        </div>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-500 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Link to="/events">
            <CyberButton variant="primary" size="lg">
              View Events
              <ArrowRight className="ml-2 h-5 w-5" />
            </CyberButton>
          </Link>
          <Link to="/projects">
            <CyberButton variant="ghost" size="lg">
              Explore Projects
            </CyberButton>
          </Link>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
