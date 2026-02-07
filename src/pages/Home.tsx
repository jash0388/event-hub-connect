import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 pt-20">
        <div className="text-center max-w-4xl">
          <div className="mb-6">
            <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6">
              <span className="text-primary font-mono text-sm">DATANAUTS SPHN</span>
            </div>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">Data</span>
            <span className="text-primary glow-green">nauts</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            ALPHABAY X / 2026 EDITION
          </p>
          
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
            Your hub for tech events, innovative projects, and community polls
          </p>
          
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/feed')}
          >
            Enter Datanauts Hub
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Home;