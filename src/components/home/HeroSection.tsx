import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Database, Users, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState({
    events: 50,
    projects: 0,
    students: 1200,
    internships: 100,
  });

  useEffect(() => {
    setLoaded(true);

    const fetchRealStats = async () => {
      try {
        const [
          { count: eventCount },
          { count: projectCount },
          { count: profileCount }
        ] = await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true })
        ]);

        setStats(prev => ({
          ...prev,
          events: Math.max(50, eventCount || 0),
          projects: projectCount || 0,
          students: Math.max(1200, profileCount || 0),
          internships: 100
        }));
      } catch (error) {
        console.error("Error fetching hero stats:", error);
      }
    };

    fetchRealStats();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-[radial-gradient(circle_at_50%_0%,_#f8fafc_0%,_#f1f5f9_100%)]">
      {/* 3D Atmosphere - Perspective Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          perspective: '1000px',
          background: 'linear-gradient(to bottom, transparent 0%, #1e40af 100%)'
        }}>
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(#1e40af 1px, transparent 1px), linear-gradient(90deg, #1e40af 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: 'rotateX(60deg) translateY(-200px) translateZ(-100px)',
            transformOrigin: 'top'
          }} />
      </div>

      {/* Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full floating blur-3xl"
          style={{
            background: "radial-gradient(circle, hsl(221 83% 53% / 0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full floating-delayed blur-3xl"
          style={{
            background: "radial-gradient(circle, hsl(199 89% 48% / 0.1) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* 3D Floating Elements Workspace - Controlled per device */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none group/workspace" style={{ perspective: '2000px' }}>

        {/* Floating 3D Card 1 - Events (Hidden on very small screens, repositioned on medium) */}
        <div
          className={`absolute top-20 right-[5%] md:right-[12%] w-40 md:w-52 h-28 md:h-36 card-glass rounded-2xl floating transition-all duration-1000 hidden sm:flex ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          style={{
            transform: "rotateX(12deg) rotateY(-18deg) translateZ(40px)",
            animationDelay: "0.2s",
            willChange: 'transform'
          }}
        >
          <div className="p-3 md:p-5 h-full flex flex-col justify-between">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase text-blue-500/70 mb-1">Active Events</div>
              <div className="text-xl md:text-3xl font-black text-foreground tabular-nums">{stats.events || 0}<span className="text-blue-500">+</span></div>
            </div>
          </div>
        </div>

        {/* Floating 3D Card 2 - Students (Repositioned to bottom corners on mobile) */}
        <div
          className={`absolute bottom-20 left-[5%] md:left-[10%] w-48 md:w-60 h-32 md:h-40 card-glass rounded-3xl floating-delayed transition-all duration-1000 delay-300 hidden md:flex ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          style={{
            transform: "rotateX(-8deg) rotateY(12deg) translateZ(60px)",
            willChange: 'transform'
          }}
        >
          <div className="p-4 md:p-5 h-full flex flex-col justify-between">
            <div className="flex gap-1">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                <Users className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-foreground font-bold -ml-4">
                JD
              </div>
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase text-indigo-500/70 mb-1">Students Joined</div>
              <div className="text-xl md:text-2xl font-black text-foreground tabular-nums">
                {stats.students > 1000 ? (stats.students / 1000).toFixed(1) + 'k' : stats.students}<span className="text-blue-600">+</span> Members
              </div>
            </div>
          </div>
        </div>

        {/* Floating 3D Card 3 - Projects (Mobile optimized positioning) */}
        <div
          className={`absolute top-[40%] right-[2%] md:right-[8%] w-36 md:w-44 h-24 md:h-28 card-glass rounded-2xl floating transition-all duration-1000 delay-500 hidden lg:flex ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          style={{
            transform: "rotateX(15deg) rotateY(-10deg) translateZ(100px)",
            animationDelay: "1.5s",
            willChange: 'transform'
          }}
        >
          <div className="p-3 md:p-4 h-full flex flex-col justify-between">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
              <Database className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase text-indigo-500/70">Projects</div>
              <div className="text-xl md:text-2xl font-black text-foreground tabular-nums">{stats.projects || 0}</div>
            </div>
          </div>
        </div>

        {/* Extra 3D Object - Geometric Prism Decoration */}
        <div className="absolute top-[20%] left-[20%] w-6 h-6 border-2 border-blue-400 opacity-20 floating-slow rotate-45" />
        <div className="absolute bottom-[25%] right-[25%] w-8 h-8 rounded-full border-2 border-indigo-400 border-dashed opacity-20 floating" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-white/50 shadow-sm mb-6 md:mb-10 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </div>
          <span className="text-xs md:text-sm font-bold tracking-tight text-blue-900/80">
            Sphoorthy Engineering College
          </span>
        </div>

        {/* Main Title */}
        <h1
          className={`text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-black tracking-tight mb-6 md:mb-8 transition-all duration-700 delay-100 drop-shadow-sm leading-[1.1] ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <span className="text-slate-900">Explore, Innovate &</span>
          <br />
          <span className="text-gradient drop-shadow-md">Launch Your Career</span>
        </h1>

        {/* Subtitle */}
        <p
          className={`text-base md:text-2xl text-slate-500 max-w-3xl mx-auto mb-10 md:mb-14 leading-relaxed transition-all duration-700 delay-200 text-balance font-medium ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          The ultimate hub for college-wide hackathons, career-shifting internships, innovative projects,
          and exclusive networking.
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 transition-all duration-700 delay-300 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <Link to="/learn/codequest" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full px-8 md:px-10 py-6 md:py-8 text-base md:text-lg font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 group overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Join CodeQuest
                <ArrowRight className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-2" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Button>
          </Link>
          <Link to="/events" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-full px-8 md:px-10 py-6 md:py-8 text-base md:text-lg font-bold border-2 border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/50 transition-all duration-500 backdrop-blur-sm"
            >
              Explore Events
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div
          className={`mt-16 md:mt-24 pt-8 md:pt-12 border-t border-slate-200/60 flex flex-wrap justify-center gap-8 md:gap-24 transition-all duration-700 delay-400 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          {[
            { value: stats.events + "+", label: "Events Hosted", icon: GraduationCap },
            { value: (stats.students >= 1000 ? (stats.students / 1000).toFixed(1) + 'K' : stats.students) + "+", label: "Students", icon: Users },
            { value: stats.internships + "+", label: "Internships", icon: Sparkles },
          ].map((stat, index) => (
            <div key={index} className="flex flex-col items-center group min-w-[80px]">
              <div className="bg-slate-50 p-2 md:p-3 rounded-xl md:rounded-2xl mb-3 md:mb-4 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter">
                {stat.value}
              </div>
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mt-1 md:mt-2 block group-hover:text-blue-600 transition-colors">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
    </section>
  );
}
