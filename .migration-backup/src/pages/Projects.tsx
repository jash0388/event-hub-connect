import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Github, Loader2, Folder, Code } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
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
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects_list'],
    queryFn: async () => {
      // Hardcoded "DataNauts AI" project so it's always live even if DB hangs
      const atlasProject: Project = {
        id: 'atlas-static-id',
        title: 'DataNauts AI – Self-Learning LLM Platform',
        description: 'DataNauts AI is a self-learning Large Language Model (LLM) platform designed to continuously improve its knowledge and responses through user interaction and dynamic data ingestion. Built for students, developers, and innovators, DataNauts AI aims to simplify access to advanced AI while promoting experimentation and learning.',
        image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600',
        github_url: 'https://github.com/jash0388/datanauts-atlas.git',
        demo_url: 'https://datanautsai.netlify.app',
        tags: ['AI', 'LLM', 'Self-Learning', 'Atlas']
      };

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Error fetching projects:', error);
          return [atlasProject]; // Return static project on error
        }
        
        // Combine static with any DB projects (ensuring no duplicates)
        const dbProjects = data as Project[];
        const filteredDB = dbProjects.filter(p => !p.title.includes('DataNauts AI'));
        return [atlasProject, ...filteredDB];
      } catch (err) {
        return [atlasProject];
      }
    },
    staleTime: 60000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-sm font-medium text-foreground mb-4">
              Our Work
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Community
              <span className="text-gradient"> Projects</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
              Explore innovative projects built by our community members
            </p>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-border">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground">
                Projects will appear here once they're added.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className="bg-card rounded-3xl overflow-hidden border border-border card-3d animate-fade-in-up group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Project Image */}
                  {project.image_url ? (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-secondary flex items-center justify-center">
                      <Code className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-[hsl(var(--accent))] transition-colors">
                      {project.title}
                    </h3>

                    <p className="text-muted-foreground text-sm mb-4 flex-1 line-clamp-3">
                      {project.description || 'No description available'}
                    </p>

                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {project.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-3 py-1 text-xs font-medium bg-secondary text-foreground rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      {project.github_url && (
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full rounded-xl h-11 border-border hover:bg-secondary">
                            <Github className="w-4 h-4 mr-2" />
                            Code
                          </Button>
                        </a>
                      )}
                      {project.demo_url && (
                        <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button className="w-full rounded-xl h-11 bg-foreground text-background hover:bg-foreground/90">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Demo
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
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
