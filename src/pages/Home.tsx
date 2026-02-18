import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Users, Zap, CheckCircle2 } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/5 blur-[120px] rounded-full" />
          </div>

          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">The Future of Campus Events</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 mb-8 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
                Connect, Create, and <br />
                <span className="text-primary">Experience More</span>
              </h1>

              <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                Your central hub for tech events, innovative projects, and community engagement at college. Join the community and never miss an update.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-10 py-7 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                  onClick={() => navigate('/events')}
                >
                  Explore Events
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-lg px-10 py-7 rounded-2xl border-2 transition-all hover:bg-gray-50"
                  onClick={() => navigate('/about')}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Event Discovery</h3>
                <p className="text-gray-600">Find and register for workshops, hackathons, and cultural events with a single click.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Instant Entry</h3>
                <p className="text-gray-600">Get unique QR codes for every event and enjoy seamless entry with our digital pass system.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Collaborate</h3>
                <p className="text-gray-600">Connect with like-minded peers, join project teams, and build something amazing together.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 border-y border-gray-100">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-12 lg:gap-24 text-center">
              <div>
                <div className="text-4xl font-extrabold text-gray-900 mb-1">50+</div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">Active Events</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-gray-900 mb-1">2000+</div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">Students</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-gray-900 mb-1">100+</div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">Projects</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
