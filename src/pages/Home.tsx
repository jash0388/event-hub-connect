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

  // While auth is resolving, show nothing (avoids flash)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in — public landing
  if (!user) {
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
