import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="pt-24 pb-4 border-b border-primary/20 bg-card/30">
          <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              New student/admin auth portal is live. Use this direct link if root homepage looks unchanged after deploy cache.
            </p>
            <div className="flex gap-2">
              <a href="/alphabay/login.html">
                <Button size="sm" className="font-mono">Open Portal Login</Button>
              </a>
              <a href="/alphabay/signup.html">
                <Button size="sm" variant="outline" className="font-mono">Student Signup</Button>
              </a>
            </div>
          </div>
        </section>
        <HeroSection />
        <FeaturesSection />
        <UpcomingEvents />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
