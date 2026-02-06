import { ExternalLink, Github, Star } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberButton } from "@/components/ui/CyberButton";

const projects = [
  {
    id: 1,
    title: "ALPHABAY X",
    description: "The next generation tech community platform with cyberpunk aesthetics and cutting-edge features.",
    tech: ["REACT", "TYPESCRIPT", "TAILWIND"],
    stars: 128,
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
    status: "ACTIVE",
    github: "#",
    demo: "#",
  },
  {
    id: 2,
    title: "NEURAL CANVAS",
    description: "AI-powered art generation tool using stable diffusion and custom neural networks.",
    tech: ["PYTHON", "PYTORCH", "FASTAPI"],
    stars: 89,
    image: "https://images.unsplash.com/photo-1547954575-855750c57bd3?w=600&h=400&fit=crop",
    status: "BETA",
    github: "#",
    demo: "#",
  },
  {
    id: 3,
    title: "CRYPTO TRACKER",
    description: "Real-time cryptocurrency portfolio tracker with advanced analytics and alerts.",
    tech: ["NEXTJS", "WEB3", "GRAPHQL"],
    stars: 256,
    image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&h=400&fit=crop",
    status: "ACTIVE",
    github: "#",
    demo: "#",
  },
  {
    id: 4,
    title: "CODE ARENA",
    description: "Competitive programming platform with real-time battles and leaderboards.",
    tech: ["GOLANG", "REDIS", "DOCKER"],
    stars: 167,
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop",
    status: "DEVELOPMENT",
    github: "#",
    demo: null,
  },
  {
    id: 5,
    title: "SOUNDWAVE",
    description: "Music visualization engine with WebGL shaders and audio reactive graphics.",
    tech: ["THREEJS", "WEBGL", "WEBGPU"],
    stars: 312,
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop",
    status: "ACTIVE",
    github: "#",
    demo: "#",
  },
  {
    id: 6,
    title: "QUANTUM SIM",
    description: "Quantum computing simulator for educational purposes with interactive tutorials.",
    tech: ["RUST", "WASM", "REACT"],
    stars: 78,
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop",
    status: "ALPHA",
    github: "#",
    demo: "#",
  },
];

const statusColors: Record<string, string> = {
  ACTIVE: "text-primary border-primary bg-primary/10",
  BETA: "text-secondary border-secondary bg-secondary/10",
  ALPHA: "text-accent border-accent bg-accent/10",
  DEVELOPMENT: "text-neon-amber border-neon-amber bg-neon-amber/10",
};

export default function Projects() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-sm text-primary">//</span>
              <span className="font-mono text-sm text-muted-foreground">PROJECTS</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-foreground">OUR</span>{" "}
              <span className="text-secondary glow-cyan">PROJECTS</span>
            </h1>
            <p className="font-mono text-muted-foreground max-w-2xl">
              Explore innovative projects built by the Alpha Team. From web applications
              to AI experiments, we push the boundaries of technology.
            </p>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <CyberCard
                key={project.id}
                variant="glowing"
                padding="none"
                className="group"
              >
                {/* Project Image */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 filter grayscale group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                  
                  {/* Stars */}
                  <div className="absolute top-4 left-4 flex items-center gap-1 font-mono text-xs text-foreground bg-background/80 px-2 py-1 rounded">
                    <Star size={12} className="text-neon-amber fill-neon-amber" />
                    {project.stars}
                  </div>

                  {/* Status */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 border ${statusColors[project.status]}`}
                    >
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Project Content */}
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold tracking-wider text-foreground group-hover:text-primary transition-colors mb-2">
                    {project.title}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Tech Stack */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="font-mono text-[10px] text-primary border border-primary/30 bg-primary/5 px-2 py-0.5"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <CyberButton variant="ghost" size="sm" className="flex-1">
                      <Github className="mr-2 h-4 w-4" />
                      Code
                    </CyberButton>
                    {project.demo && (
                      <CyberButton variant="primary" size="sm" className="flex-1">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Demo
                      </CyberButton>
                    )}
                  </div>
                </div>
              </CyberCard>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
