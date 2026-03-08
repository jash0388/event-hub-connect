import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { StatsSection } from "@/components/home/StatsSection";

const Index = () => {
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

export default Index;
