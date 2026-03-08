import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Loader2, ExternalLink, Github } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  image_url: string | null;
  registration_link: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  registration_link: string | null;
  tags: string[] | null;
}

interface Internship {
  id: string;
  title: string;
  company: string;
  description: string;
  image_url: string | null;
  internship_link: string;
}

// AI-curated internships - always available
const aiInternships: Internship[] = [
  { id: "1", title: "AI/ML Research Intern", company: "OpenAI", description: "Work on cutting-edge artificial intelligence research.", image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400", internship_link: "https://openai.com/careers/internships/" },
  { id: "2", title: "Cloud Architecture Intern", company: "AWS", description: "Learn cloud computing at scale.", image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400", internship_link: "https://amazon.jobs/en/teams/aws" },
  { id: "3", title: "Cybersecurity Intern", company: "CrowdStrike", description: "Work on next-gen endpoint security.", image_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400", internship_link: "https://careers.crowdstrike.com/" },
  { id: "4", title: "Data Science Intern", company: "Netflix", description: "Analyze massive datasets for recommendation algorithms.", image_url: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400", internship_link: "https://jobs.netflix.com/" },
  { id: "5", title: "DevOps Engineer Intern", company: "GitLab", description: "Work on DevOps platform, CI/CD, containerization.", image_url: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400", internship_link: "https://about.gitlab.com/careers/" },
  { id: "6", title: "Mobile App Intern", company: "Spotify", description: "Build features for world's largest music streaming platform.", image_url: "https://images.unsplash.com/photo-1616348436918-d2273d9397a2?w=400", internship_link: "https://jobs.spotify.com/" },
];

const Feed = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [internships] = useState<Internship[]>(aiInternships);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchEvents(), fetchProjects()]);
    setIsLoading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    setEvents(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    setProjects(data || []);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-20 pb-16 flex-1">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2 tracking-wide">Datanauts Hub</h1>
            <p className="text-muted-foreground">Explore events, projects, and internships</p>
          </div>

          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="internships">Internships</TabsTrigger>
            </TabsList>

            <TabsContent value="events">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No events available yet
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="bg-card border border-border rounded-lg p-6">
                      {event.image_url && (
                        <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover rounded-lg mb-4" />
                      )}
                      <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                      <p className="text-muted-foreground mb-4">{event.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(event.date), 'PPP p')}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                      {event.registration_link && (
                        <Button asChild>
                          <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                            Register Now
                            <ExternalLink className="ml-2 w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="projects">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No projects available yet
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-card border border-border rounded-lg p-6">
                      {project.image_url && (
                        <img src={project.image_url} alt={project.title} className="w-full h-48 object-cover rounded-lg mb-4" />
                      )}
                      <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                      <p className="text-muted-foreground mb-4">{project.description}</p>
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {project.github_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                              <Github className="w-4 h-4 mr-2" />
                              Code
                            </a>
                          </Button>
                        )}
                        {project.demo_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Demo
                            </a>
                          </Button>
                        )}
                        {project.registration_link && (
                          <Button size="sm" asChild>
                            <a href={project.registration_link} target="_blank" rel="noopener noreferrer">
                              Register
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="internships">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : internships.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No internships available yet
                </div>
              ) : (
                <div className="space-y-4">
                  {internships.map((internship) => (
                    <div key={internship.id} className="bg-card border border-border rounded-lg p-6">
                      {internship.image_url && (
                        <img src={internship.image_url} alt={internship.title} className="w-full h-48 object-cover rounded-lg mb-4" />
                      )}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-xl font-bold">{internship.title}</h3>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{internship.company}</span>
                      </div>
                      <p className="text-muted-foreground mb-4">{internship.description || "No description provided."}</p>
                      <div className="flex gap-2">
                        {internship.internship_link && (
                          <Button asChild>
                            <a href={internship.internship_link} target="_blank" rel="noopener noreferrer">
                              Apply Now
                              <ExternalLink className="ml-2 w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" asChild>
                          <Link to="/internships">View All</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Feed;