import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SlideButton } from '@/components/ui/slide-button';
import { Calendar, Users, Zap, ArrowUpRight, Sparkles } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col relative">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Animated gradient orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-full blur-3xl" />

          {/* Floating shapes */}
          <div className="absolute top-20 left-10 w-4 h-4 bg-primary/30 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute top-40 right-20 w-3 h-3 bg-blue-500/30 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
          <div className="absolute bottom-40 left-20 w-2 h-2 bg-purple-500/40 rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
          <div className="absolute bottom-20 right-10 w-5 h-5 bg-cyan-500/20 rounded-full animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.3s' }} />

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-24 pb-12 md:pt-32 md:pb-16">
          <div className="max-w-3xl mx-auto text-center">
            {/* Enhanced Badge with glow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 mb-6 md:mb-8 shadow-lg shadow-primary/5 backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                The Future of Campus Events
              </span>
            </div>

            {/* Gradient Text Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-5 md:mb-6 tracking-tight leading-[1.1]">
              <span className="text-gray-900">Your Campus</span>{' '}
              <span className="bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Event Hub
              </span>
            </h1>

            {/* Enhanced Paragraph */}
            <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-12 max-w-xl mx-auto leading-relaxed">
              Discover amazing events, register instantly, and never miss out on the{' '}
              <span className="font-semibold text-primary">best experiences</span> on campus.
            </p>

            {/* Enhanced Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
              <SlideButton
                className="w-full sm:w-auto text-base px-10 py-4 rounded-xl shadow-xl shadow-primary/20 font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                onClick={() => navigate('/events')}
                fullWidth
              >
                <span className="flex items-center gap-2">
                  Explore Events
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </SlideButton>
              <SlideButton
                variant="outline"
                className="w-full sm:w-auto text-base px-10 py-4 rounded-xl border-2 font-semibold bg-white/50 backdrop-blur-sm hover:bg-white"
                onClick={() => navigate('/about')}
                fullWidth
              >
                Learn More
              </SlideButton>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
