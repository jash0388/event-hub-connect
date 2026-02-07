import { useState, useEffect } from "react";
import { ExternalLink, Github, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberButton } from "@/components/ui/CyberButton";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  tags: string[] | null;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 glow-green">
              PROJECTS
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Explore our innovative projects and collaborations
            </p>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No projects available yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <CyberCard key={project.id} className="flex flex-col">
                  {project.image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg border-b border-primary/20">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-display text-xl font-bold mb-2 text-primary">
                      {project.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm mb-4 flex-1">
                      {project.description || 'No description available'}
                    </p>

                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs font-mono bg-primary/10 text-primary rounded border border-primary/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto">
                      {project.github_url && (
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <CyberButton variant="outline" className="w-full" size="sm">
                            <Github className="w-4 h-4 mr-2" />
                            Code
                          </CyberButton>
                        </a>
                      )}
                      {project.demo_url && (
                        <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <CyberButton className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Demo
                          </CyberButton>
                        </a>
                      )}
                    </div>
                  </div>
                </CyberCard>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Projects;
