import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LayoutDashboard,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Calendar,
  MapPin,
  Loader2,
  FolderKanban,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  venue: string | null;
  image_url: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  tags: string[] | null;
}

interface Poll {
  id: string;
  event_id: string;
  question: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  
  // Dialog states
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  
  // Edit states
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Form data
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    image_url: '',
  });
  
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    image_url: '',
    github_url: '',
    demo_url: '',
    tags: '',
  });
  
  const [pollForm, setPollForm] = useState({
    event_id: '',
    question: '',
    options: ['', ''],
  });
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchEvents(), fetchProjects(), fetchPolls()]);
    setIsLoading(false);
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load events",
        variant: "destructive",
      });
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load projects",
        variant: "destructive",
      });
    }
  };

  const fetchPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*, events(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (error: any) {
      console.error('Error fetching polls:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // ============ EVENT HANDLERS ============
  const handleEventDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        description: event.description || '',
        date: event.date || '',
        time: event.time || '',
        venue: event.venue || '',
        image_url: event.image_url || '',
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        image_url: '',
      });
    }
    setEventDialogOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const eventData = {
        ...eventForm,
        description: eventForm.description || null,
        time: eventForm.time || null,
        venue: eventForm.venue || null,
        image_url: eventForm.image_url || null,
        created_by: user?.id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast({ title: "Success", description: "Event updated" });
      } else {
        const { error } = await supabase.from('events').insert([eventData]);
        if (error) throw error;
        toast({ title: "Success", description: "Event created" });
      }

      setEventDialogOpen(false);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEventDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Event deleted" });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ============ PROJECT HANDLERS ============
  const handleProjectDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        title: project.title,
        description: project.description || '',
        image_url: project.image_url || '',
        github_url: project.github_url || '',
        demo_url: project.demo_url || '',
        tags: project.tags?.join(', ') || '',
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        title: '',
        description: '',
        image_url: '',
        github_url: '',
        demo_url: '',
        tags: '',
      });
    }
    setProjectDialogOpen(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const projectData = {
        title: projectForm.title,
        description: projectForm.description || null,
        image_url: projectForm.image_url || null,
        github_url: projectForm.github_url || null,
        demo_url: projectForm.demo_url || null,
        tags: projectForm.tags ? projectForm.tags.split(',').map(t => t.trim()) : null,
        created_by: user?.id,
      };

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id);
        if (error) throw error;
        toast({ title: "Success", description: "Project updated" });
      } else {
        const { error } = await supabase.from('projects').insert([projectData]);
        if (error) throw error;
        toast({ title: "Success", description: "Project created" });
      }

      setProjectDialogOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProjectDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Project deleted" });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ============ POLL HANDLERS ============
  const handlePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Create poll
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert([{
          event_id: pollForm.event_id,
          question: pollForm.question,
        }])
        .select()
        .single();

      if (pollError) throw pollError;

      // Create poll options
      const optionsData = pollForm.options
        .filter(opt => opt.trim())
        .map(option_text => ({
          poll_id: pollData.id,
          option_text,
          vote_count: 0,
        }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;

      toast({ title: "Success", description: "Poll created" });
      setPollDialogOpen(false);
      setPollForm({ event_id: '', question: '', options: ['', ''] });
      fetchPolls();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
            </div>

            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="polls">Polls</TabsTrigger>
            </TabsList>

            {/* EVENTS TAB */}
            <TabsContent value="events" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Events</h2>
                <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleEventDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEventSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={eventForm.title}
                          onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={eventForm.description}
                          onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={eventForm.date}
                          onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={eventForm.time}
                          onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="venue">Venue</Label>
                        <Input
                          id="venue"
                          value={eventForm.venue}
                          onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="image_url">Image URL</Label>
                        <Input
                          id="image_url"
                          type="url"
                          value={eventForm.image_url}
                          onChange={(e) => setEventForm({ ...eventForm, image_url: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setEventDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingEvent ? 'Update' : 'Create')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No events yet. Create one to get started!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>{event.date}</TableCell>
                          <TableCell>{event.venue || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEventDialog(event)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEventDelete(event.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* PROJECTS TAB */}
            <TabsContent value="projects" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Projects</h2>
                <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleProjectDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleProjectSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="project_title">Title *</Label>
                        <Input
                          id="project_title"
                          value={projectForm.title}
                          onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="project_description">Description</Label>
                        <Textarea
                          id="project_description"
                          value={projectForm.description}
                          onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="project_image">Image URL</Label>
                        <Input
                          id="project_image"
                          type="url"
                          value={projectForm.image_url}
                          onChange={(e) => setProjectForm({ ...projectForm, image_url: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="github_url">GitHub URL</Label>
                        <Input
                          id="github_url"
                          type="url"
                          value={projectForm.github_url}
                          onChange={(e) => setProjectForm({ ...projectForm, github_url: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="demo_url">Demo URL</Label>
                        <Input
                          id="demo_url"
                          type="url"
                          value={projectForm.demo_url}
                          onChange={(e) => setProjectForm({ ...projectForm, demo_url: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                          id="tags"
                          value={projectForm.tags}
                          onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })}
                          placeholder="React, TypeScript, AI"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingProject ? 'Update' : 'Create')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No projects yet. Create one to showcase your work!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Links</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.title}</TableCell>
                          <TableCell>
                            {project.tags?.join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {project.github_url && (
                                <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  GitHub
                                </a>
                              )}
                              {project.demo_url && (
                                <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  Demo
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProjectDialog(project)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProjectDelete(project.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* POLLS TAB */}
            <TabsContent value="polls" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Polls</h2>
                <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Poll
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Poll</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePollSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="poll_event">Event *</Label>
                        <select
                          id="poll_event"
                          value={pollForm.event_id}
                          onChange={(e) => setPollForm({ ...pollForm, event_id: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-background border border-border rounded-md"
                        >
                          <option value="">Select an event</option>
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="poll_question">Question *</Label>
                        <Input
                          id="poll_question"
                          value={pollForm.question}
                          onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Options *</Label>
                        {pollForm.options.map((option, index) => (
                          <Input
                            key={index}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...pollForm.options];
                              newOptions[index] = e.target.value;
                              setPollForm({ ...pollForm, options: newOptions });
                            }}
                            placeholder={`Option ${index + 1}`}
                            className="mb-2"
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPollForm({ ...pollForm, options: [...pollForm.options, ''] })}
                        >
                          Add Option
                        </Button>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setPollDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Poll'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : polls.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No polls yet. Create a poll for an event!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {polls.map((poll: any) => (
                        <TableRow key={poll.id}>
                          <TableCell className="font-medium">{poll.question}</TableCell>
                          <TableCell>{poll.events?.title || '—'}</TableCell>
                          <TableCell>{format(new Date(poll.created_at), 'PPP')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
