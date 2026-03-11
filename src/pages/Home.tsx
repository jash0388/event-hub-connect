import { useAuth } from "@/hooks/useAuth";

// Import the cinematic landing page
import CinematicLanding from "@/components/home/CinematicLanding";

const Home = () => {
  const { loading } = useAuth();

  // If we are loading auth state, show a small loader or nothing
  if (loading) {
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
