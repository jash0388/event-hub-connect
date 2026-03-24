import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";

// Import the cinematic landing page
import CinematicLanding from "@/components/home/CinematicLanding";

const Home = () => {
  const { loading } = useAuth();
  const [showContent, setShowContent] = useState(false);

  // Fallback timeout - show content after 3 seconds even if auth is still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Show loading for first 1.5 seconds, then show content
  if (loading && !showContent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "hsl(20 14% 6%)" }}
      >
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Always show the cinematic landing page
  return <CinematicLanding />;
};

export default Home;
