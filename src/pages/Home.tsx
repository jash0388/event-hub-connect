import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SlideButton } from '@/components/ui/slide-button';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-[20%] right-[-20%] w-[50%] h-[50%] bg-blue-400/5 blur-[100px] rounded-full" />
        </div>

        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-24 pb-12 md:pt-32 md:pb-16">
          <div className="max-w-2xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 md:mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">The Future of Campus Events</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-5 md:mb-6 tracking-tight leading-[1.15]">
              Your Campus <span className="text-primary">Event Hub</span>
            </h1>

            {/* Paragraph */}
            <p className="text-base md:text-lg text-gray-600 mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed">
              Discover events, register instantly, and never miss out
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-5">
              <SlideButton
                className="w-full sm:w-auto text-base px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 font-medium"
                onClick={() => navigate('/events')}
                fullWidth
              >
                Explore Events
              </SlideButton>
              <SlideButton
                variant="outline"
                className="w-full sm:w-auto text-base px-8 py-3.5 rounded-xl border-2 font-medium"
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
