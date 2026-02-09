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
  Loader2,
  Shield,
  UserMinus,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  createAdminUser,
  sendAdminInvite,
  getAllAdmins,
  revokeAdminAccess,
  deleteAdminUser,
} from '@/lib/supabaseAdmin';

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

interface Poll {
  id: string;
  event_id: string;
  question: string;
  registration_link: string | null;
  created_at: string;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  reply_text: string | null;
  replied: boolean;
  created_at: string;
}

interface AdminUser {
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    createWithPassword: true,
  });
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    datetime: '',
    location: '',
    image_url: '',
    registration_link: '',
  });
  
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    image_url: '',
    github_url: '',
    demo_url: '',
    registration_link: '',
    tags: '',
  });
  
  const [pollForm, setPollForm] = useState({
    event_id: '',
    question: '',
    registration_link: '',
    options: ['', ''],
  });

  const [socialForm, setSocialForm] = useState({
    platform: '',
    url: '',
    icon: '',
    display_order: 0,
    is_active: true,
  });
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchEvents(), fetchProjects(), fetchPolls(), fetchSocialLinks(), fetchMessages(), fetchAdmins()]);
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

  const fetchSocialLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSocialLinks(data || []);
    } catch (error: any) {
      console.error('Error fetching social links:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await getAllAdmins();
      if (error) throw error;
      setAdmins(data || []);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load admins",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleEventDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      const localDateTime = format(new Date(event.date), "yyyy-MM-dd'T'HH:mm");
      setEventForm({
        title: event.title,
        description: event.description || '',
        datetime: localDateTime,
        location: event.location || '',
        image_url: event.image_url || '',
        registration_link: event.registration_link || '',
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        datetime: '',
        location: '',
        image_url: '',
        registration_link: '',
      });
    }
    setEventDialogOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const dateISO = new Date(eventForm.datetime).toISOString();
      
      const payload = {
        title: eventForm.title,
        description: eventForm.description || null,
        date: dateISO,
        location: eventForm.location || null,
        image_url: eventForm.image_url || null,
        registration_link: eventForm.registration_link || null,
        created_by: user?.id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast({ title: "Success", description: "Event updated" });
      } else {
        const { error } = await supabase.from('events').insert([payload]);
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

  const handleProjectDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        title: project.title,
        description: project.description || '',
        image_url: project.image_url || '',
        github_url: project.github_url || '',
        demo_url: project.demo_url || '',
        registration_link: project.registration_link || '',
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
        registration_link: '',
        tags: '',
      });
    }
    setProjectDialogOpen(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        title: projectForm.title,
        description: projectForm.description || null,
        image_url: projectForm.image_url || null,
        github_url: projectForm.github_url || null,
        demo_url: projectForm.demo_url || null,
        registration_link: projectForm.registration_link || null,
        tags: projectForm.tags ? projectForm.tags.split(',').map(t => t.trim()) : null,
        created_by: user?.id,
      };

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);
        if (error) throw error;
        toast({ title: "Success", description: "Project updated" });
      } else {
        const { error } = await supabase.from('projects').insert([payload]);
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

  const handlePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert([{
          event_id: pollForm.event_id,
          question: pollForm.question,
          registration_link: pollForm.registration_link || null,
        }])
        .select()
        .single();

      if (pollError) throw pollError;

      const optionsData = pollForm.options
        .filter(opt => opt.trim())
        .map(option_text => ({
          poll_id: pollData.id,
          option_text,
          votes: 0,
        }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;

      toast({ title: "Success", description: "Poll created" });
      setPollDialogOpen(false);
      setPollForm({ event_id: '', question: '', registration_link: '', options: ['', ''] });
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

  const handleSocialDialog = (social?: SocialLink) => {
    if (social) {
      setEditingSocial(social);
      setSocialForm({
        platform: social.platform,
        url: social.url,
        icon: social.icon || '',
        display_order: social.display_order,
        is_active: social.is_active,
      });
    } else {
      setEditingSocial(null);
      setSocialForm({
        platform: '',
        url: '',
        icon: '',
        display_order: 0,
        is_active: true,
      });
    }
    setSocialDialogOpen(true);
  };

  const handleSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        platform: socialForm.platform,
        url: socialForm.url,
        icon: socialForm.icon || null,
        display_order: socialForm.display_order,
        is_active: socialForm.is_active,
      };

      if (editingSocial) {
        const { error } = await supabase
          .from('social_links')
          .update(payload)
          .eq('id', editingSocial.id);
        if (error) throw error;
        toast({ title: "Success", description: "Social link updated" });
      } else {
        const { error } = await supabase.from('social_links').insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Social link added" });
      }

      setSocialDialogOpen(false);
      fetchSocialLinks();
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

  const handleSocialDelete = async (id: string) => {
    if (!confirm('Delete this social link?')) return;

    try {
      const { error } = await supabase.from('social_links').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Social link deleted" });
      fetchSocialLinks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReplyDialog = (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplyText(message.reply_text || '');
    setReplyDialogOpen(true);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({
          reply_text: replyText,
          replied: true,
        })
        .eq('id', selectedMessage.id);

      if (error) throw error;
      toast({ title: "Success", description: "Reply saved" });
      setReplyDialogOpen(false);
      fetchMessages();
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

  const handleAdminDialog = () => {
    setAdminForm({
      email: '',
      password: '',
      createWithPassword: true,
    });
    setAdminDialogOpen(true);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let result;
      
      if (adminForm.createWithPassword) {
        // Create admin with password
        if (!adminForm.password || adminForm.password.length < 6) {
          toast({
            title: "Error",
            description: "Password must be at least 6 characters",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        result = await createAdminUser(adminForm.email, adminForm.password);
      } else {
        // Send invite email
        result = await sendAdminInvite(adminForm.email);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: adminForm.createWithPassword 
          ? "Admin user created successfully" 
          : "Invite email sent successfully",
      });
      
      setAdminDialogOpen(false);
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeAdmin = async (userId: string, userEmail: string) => {
    if (!confirm(`Revoke admin access for ${userEmail}? They will become a regular user.`)) return;

    try {
      const { error } = await revokeAdminAccess(userId);
      if (error) throw error;
      
      toast({ title: "Success", description: "Admin access revoked" });
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke admin access",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdmin = async (userId: string, userEmail: string) => {
    if (!confirm(`Delete admin user ${userEmail}? This action cannot be undone.`)) return;

    // Prevent deleting yourself
    if (userId === user?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own admin account",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await deleteAdminUser(userId);
      if (error) throw error;
      
      toast({ title: "Success", description: "Admin user deleted" });
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 max-w-4xl">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="polls">Polls</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="admins" data-testid="admins-tab">Admins</TabsTrigger>
            </TabsList>

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
                        <Label htmlFor="datetime">Date & Time *</Label>
                        <Input
                          id="datetime"
                          type="datetime-local"
                          value={eventForm.datetime}
                          onChange={(e) => setEventForm({ ...eventForm, datetime: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={eventForm.location}
                          onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
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
                      <div>
                        <Label htmlFor="registration_link">Registration Link (Optional)</Label>
                        <Input
                          id="registration_link"
                          type="url"
                          value={eventForm.registration_link}
                          onChange={(e) => setEventForm({ ...eventForm, registration_link: e.target.value })}
                          placeholder="https://forms.google.com/..."
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

              {isLoading ? (
                <div className="p-8 text-center bg-card border border-border rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
                  No events yet. Create one to get started!
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Upcoming Events */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-primary/10 border-b border-border">
                      <h3 className="font-semibold text-lg">🚀 Upcoming Events</h3>
                    </div>
                    {events.filter(event => new Date(event.date) >= new Date()).length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No upcoming events
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events
                            .filter(event => new Date(event.date) >= new Date())
                            .map((event) => (
                              <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.title}</TableCell>
                                <TableCell>{format(new Date(event.date), 'PPP p')}</TableCell>
                                <TableCell>{event.location || '—'}</TableCell>
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

                  {/* Past Events */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted border-b border-border">
                      <h3 className="font-semibold text-lg">📅 Past Events</h3>
                    </div>
                    {events.filter(event => new Date(event.date) < new Date()).length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No past events
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events
                            .filter(event => new Date(event.date) < new Date())
                            .map((event) => (
                              <TableRow key={event.id} className="opacity-60">
                                <TableCell className="font-medium">{event.title}</TableCell>
                                <TableCell>{format(new Date(event.date), 'PPP p')}</TableCell>
                                <TableCell>{event.location || '—'}</TableCell>
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
                </div>
              )}
            </TabsContent>

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
                      <div>
                        <Label htmlFor="project_registration_link">Registration Link (Optional)</Label>
                        <Input
                          id="project_registration_link"
                          type="url"
                          value={projectForm.registration_link}
                          onChange={(e) => setProjectForm({ ...projectForm, registration_link: e.target.value })}
                          placeholder="https://forms.google.com/..."
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
                        <Label htmlFor="poll_registration_link">Registration Link (Optional)</Label>
                        <Input
                          id="poll_registration_link"
                          type="url"
                          value={pollForm.registration_link}
                          onChange={(e) => setPollForm({ ...pollForm, registration_link: e.target.value })}
                          placeholder="https://forms.google.com/..."
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

            <TabsContent value="social" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Social Links</h2>
                <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleSocialDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Social Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingSocial ? 'Edit Social Link' : 'Add Social Link'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSocialSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="platform">Platform *</Label>
                        <Input
                          id="platform"
                          value={socialForm.platform}
                          onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                          placeholder="Twitter, GitHub, LinkedIn"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="social_url">URL *</Label>
                        <Input
                          id="social_url"
                          type="url"
                          value={socialForm.url}
                          onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                          placeholder="https://twitter.com/..."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="icon">Icon (Optional)</Label>
                        <Input
                          id="icon"
                          value={socialForm.icon}
                          onChange={(e) => setSocialForm({ ...socialForm, icon: e.target.value })}
                          placeholder="twitter, github, linkedin"
                        />
                      </div>
                      <div>
                        <Label htmlFor="display_order">Display Order</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={socialForm.display_order}
                          onChange={(e) => setSocialForm({ ...socialForm, display_order: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={socialForm.is_active}
                          onChange={(e) => setSocialForm({ ...socialForm, is_active: e.target.checked })}
                        />
                        <Label htmlFor="is_active">Active</Label>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setSocialDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingSocial ? 'Update' : 'Add')}
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
                ) : socialLinks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No social links yet. Add your social media accounts!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {socialLinks.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell className="font-medium">{link.platform}</TableCell>
                          <TableCell>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                              {link.url.substring(0, 40)}...
                            </a>
                          </TableCell>
                          <TableCell>{link.display_order}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${link.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                              {link.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSocialDialog(link)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSocialDelete(link.id)}
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

            <TabsContent value="messages" className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Contact Messages</h2>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No messages yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="font-medium">{msg.name}</TableCell>
                          <TableCell>
                            <a href={`mailto:${msg.email}`} className="text-xs text-primary hover:underline">
                              {msg.email}
                            </a>
                          </TableCell>
                          <TableCell>{msg.subject}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${msg.replied ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                              {msg.replied ? 'Replied' : 'Pending'}
                            </span>
                          </TableCell>
                          <TableCell>{format(new Date(msg.created_at), 'PP')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReplyDialog(msg)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Reply to Message</DialogTitle>
                  </DialogHeader>
                  {selectedMessage && (
                    <div className="space-y-4 mt-4">
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div><strong>From:</strong> {selectedMessage.name} ({selectedMessage.email})</div>
                        <div><strong>Subject:</strong> {selectedMessage.subject}</div>
                        <div><strong>Message:</strong></div>
                        <p className="text-sm text-muted-foreground">{selectedMessage.message}</p>
                      </div>
                      <form onSubmit={handleReplySubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="reply_text">Your Reply</Label>
                          <Textarea
                            id="reply_text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={5}
                            placeholder="Type your reply here..."
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              window.location.href = `mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`;
                            }}
                          >
                            Open in Email
                          </Button>
                          <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Reply'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="admins" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Admins</h2>
                <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAdminDialog} data-testid="create-admin-button">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create New Admin</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdminSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="admin_email">Email *</Label>
                        <Input
                          id="admin_email"
                          type="email"
                          value={adminForm.email}
                          onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                          placeholder="admin@example.com"
                          required
                          data-testid="admin-email-input"
                        />
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <input
                          type="checkbox"
                          id="createWithPassword"
                          checked={adminForm.createWithPassword}
                          onChange={(e) => setAdminForm({ ...adminForm, createWithPassword: e.target.checked })}
                          data-testid="create-with-password-checkbox"
                        />
                        <Label htmlFor="createWithPassword" className="cursor-pointer">
                          Create with password (uncheck to send invite email)
                        </Label>
                      </div>

                      {adminForm.createWithPassword && (
                        <div>
                          <Label htmlFor="admin_password">Password * (min 6 characters)</Label>
                          <Input
                            id="admin_password"
                            type="password"
                            value={adminForm.password}
                            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                            placeholder="••••••••"
                            required={adminForm.createWithPassword}
                            minLength={6}
                            data-testid="admin-password-input"
                          />
                        </div>
                      )}

                      {!adminForm.createWithPassword && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                          <div className="flex items-start gap-2">
                            <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Invite Email Mode
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                An invite email will be sent to the user. They can set their own password.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setAdminDialogOpen(false)}
                          data-testid="cancel-admin-button"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving} data-testid="submit-admin-button">
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : adminForm.createWithPassword ? (
                            'Create Admin'
                          ) : (
                            'Send Invite'
                          )}
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
                ) : admins.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No admin users found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin) => (
                        <TableRow key={admin.user_id} data-testid={`admin-row-${admin.user_id}`}>
                          <TableCell className="font-medium">
                            {admin.profiles?.email || 'N/A'}
                          </TableCell>
                          <TableCell>{admin.profiles?.full_name || '—'}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          </TableCell>
                          <TableCell>{format(new Date(admin.created_at), 'PPP')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeAdmin(admin.user_id, admin.profiles?.email || 'this user')}
                              title="Revoke admin access"
                              data-testid={`revoke-admin-${admin.user_id}`}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAdmin(admin.user_id, admin.profiles?.email || 'this user')}
                              className="text-destructive"
                              title="Delete admin user"
                              disabled={admin.user_id === user?.id}
                              data-testid={`delete-admin-${admin.user_id}`}
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
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
