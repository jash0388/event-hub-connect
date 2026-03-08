import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LandingHero } from "@/components/home/LandingHero";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { StatsSection } from "@/components/home/StatsSection";
import { useAuth } from "@/hooks/useAuth";
import { Code2, Users, Rocket, GraduationCap, Heart } from "lucide-react";

// Inline About section for the public landing page
function PublicAboutSection() {
  return (
    <section id="about-section" className="py-24 bg-background">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-sm font-medium text-foreground mb-4">
            About Us
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            Building the Future of
            <br />
            <span className="text-gradient">Campus Tech</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed text-balance">
            DataNauts is a student-driven platform connecting innovators,
            creators, and learners at Sphoorthy Engineering College.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
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
              <div
                className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-6`}
              >
                <item.icon className="w-6 h-6 text-background" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>


      </div>
    </section>
  );
}

// Public header — only shows logo + Sign In button, no nav links
function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl shadow-sm border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <a href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="DataNauts"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Data<span className="text-[hsl(var(--accent))]">Nauts</span>
            </span>
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-1 px-6 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    </header>
  );
}

const Home = () => {
  const { user, loading } = useAuth();

  // Show landing immediately without waiting for auth
  // Auth check happens in background
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main>
          <LandingHero />
          <PublicAboutSection />
        </main>
        <Footer />
      </div>
    );
  }

  // Branded loading splash — no white blank screen
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "hsl(20 14% 6%)" }}
      >
        {/* Outer glow ring */}
        <div className="relative flex items-center justify-center mb-8">
          <div
            className="absolute w-32 h-32 rounded-full animate-ping"
            style={{
              background: "transparent",
              border: "1px solid rgba(212,175,55,0.3)",
              animationDuration: "1.8s",
            }}
          />
          <div
            className="absolute w-24 h-24 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)",
            }}
          />
          {/* Logo mark — stylised "DN" */}
          <div
            className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #B8860B)",
              boxShadow:
                "0 0 40px rgba(212,175,55,0.4), 0 0 80px rgba(212,175,55,0.15)",
            }}
          >
            <span
              className="text-2xl font-bold select-none"
              style={{ color: "hsl(20 14% 6%)", letterSpacing: "-0.05em" }}
            >
              DN
            </span>
          </div>
        </div>

        {/* Brand name */}
        <div className="mb-8 text-center">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #F4E4BC, #B8860B)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            DataNauts
          </span>
          <p
            className="text-xs mt-1 tracking-widest uppercase"
            style={{ color: "rgba(212,175,55,0.5)" }}
          >
            Sphoorthy Engineering College
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-40 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(212,175,55,0.15)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #D4AF37, #F4E4BC)",
              animation: "loading-bar 1.4s ease-in-out infinite",
            }}
          />
        </div>

        <style>{`
          @keyframes loading-bar {
            0%   { width: 0%;   margin-left: 0%; }
            50%  { width: 70%;  margin-left: 15%; }
            100% { width: 0%;   margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // Logged in — full app
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <StatsSection />
        <UpcomingEvents />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
