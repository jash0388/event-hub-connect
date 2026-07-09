import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Suspense, lazy, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/home/HeroSection";
import { Loader2 } from "lucide-react";

// Lazy load below-the-fold components for instant initial paint
const FeaturesSection = lazy(() => import("@/components/home/FeaturesSection").then(m => ({ default: m.FeaturesSection })));
const StatsSection = lazy(() => import("@/components/home/StatsSection").then(m => ({ default: m.StatsSection })));
const UpcomingEvents = lazy(() => import("@/components/home/UpcomingEvents").then(m => ({ default: m.UpcomingEvents })));

const Index = () => {
  const [stats, setStats] = useState({
    events: 0,
    students: 0,
    projects: 0,
    attendees: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const [e, p, pr, a] = await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('event_attendees').select('*', { count: 'exact', head: true }).eq('rsvp_status', 'going')
        ]);

        setStats({
          events: e.count || 0,
          projects: p.count || 0,
          students: pr.count || 0,
          attendees: a.count || 0,
          isLoading: false
        });
      } catch (err) {
        console.error("Stats sync error:", err);
        setStats(s => ({ ...s, isLoading: false }));
      }
    };
    fetchGlobalStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection stats={stats} />
        <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
          <FeaturesSection />
          <StatsSection stats={stats} />
          <UpcomingEvents />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
