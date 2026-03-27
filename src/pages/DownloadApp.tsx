import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Download, Monitor, Apple, ChevronDown, Zap, Shield, Globe, Laptop } from 'lucide-react';

type Platform = 'mac' | 'windows';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  return 'windows';
};

const platformData = {
  mac: {
    label: 'Download for macOS',
    altLabel: 'Download for Windows',
    icon: Apple,
    altIcon: Monitor,
    url: 'https://github.com/jash0388/event-hub-connect/releases/latest/download/DataNauts-HUB.dmg',
    altUrl: 'https://github.com/jash0388/event-hub-connect/releases/latest/download/DataNauts-HUB-Setup.exe',
    altPlatform: 'windows' as Platform,
  },
  windows: {
    label: 'Download for Windows',
    altLabel: 'Download for macOS',
    icon: Monitor,
    altIcon: Apple,
    url: 'https://github.com/jash0388/event-hub-connect/releases/latest/download/DataNauts-HUB-Setup.exe',
    altUrl: 'https://github.com/jash0388/event-hub-connect/releases/latest/download/DataNauts-HUB.dmg',
    altPlatform: 'mac' as Platform,
  },
};

const DownloadApp = () => {
  const [platform, setPlatform] = useState<Platform>('mac');
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const data = platformData[platform];
  const PrimaryIcon = data.icon;
  const AltIcon = data.altIcon;

  const features = [
    { icon: Zap, title: 'Lightning Fast', desc: 'Native performance with hardware acceleration' },
    { icon: Shield, title: 'Secure & Private', desc: 'Same encryption as the web, local data isolation' },
    { icon: Globe, title: 'Always Synced', desc: 'Your data stays in sync across web and desktop' },
    { icon: Laptop, title: 'Desktop Native', desc: 'Menu bar, shortcuts, and system tray integration' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a14]">
      <Header />
      <main className="flex-1 relative overflow-hidden">

        {/* Subtle animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: ['#6366f1', '#ec4899', '#3b82f6', '#f59e0b', '#10b981'][i % 5],
              filter: 'blur(1px)',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.3,
              }}
              animate={{
                y: [0, -20, 0],
                x: [0, Math.random() * 10 - 5, 0],
                opacity: [0.15, 0.4, 0.15],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Hero Section */}
        <div className="relative pt-40 pb-24 flex flex-col items-center justify-center text-center px-6">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-8"
          >
            <img src="/logo.png" alt="DataNauts" className="w-10 h-10" />
            <span className="text-xl font-bold text-white">DataNauts HUB</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 max-w-3xl"
          >
            Your tech hub,
            <br />
            on your desktop
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 max-w-lg mb-10"
          >
            Events, code arena, and everything DataNauts — right from your dock.
          </motion.p>

          {/* Download Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3"
          >
            <a
              href={data.url}
              className="inline-flex items-center gap-2.5 bg-white text-slate-900 px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-slate-100 transition-colors shadow-lg hover:shadow-xl"
            >
              <PrimaryIcon className="w-5 h-5" />
              {data.label}
            </a>
            <a
              href={data.altUrl}
              className="inline-flex items-center gap-2 border border-white/20 text-white/80 px-6 py-3.5 rounded-full text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <AltIcon className="w-4 h-4" />
              {data.altLabel}
            </a>
          </motion.div>

          {/* Version info */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-slate-400 mt-4"
          >
            v1.0.0 · Free forever · No account required to install
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center pb-12"
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5 text-slate-300" />
          </motion.div>
        </motion.div>

        {/* Features */}
        <div className="relative px-6 pb-20">
          <div className="container mx-auto max-w-4xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <f.icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Note */}
            <p className="text-center text-xs text-slate-500 mt-12">
              The desktop app loads datanauts.in in a native window. Your data stays synced across all platforms.
            </p>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default DownloadApp;
