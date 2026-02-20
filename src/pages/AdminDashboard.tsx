import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
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
  UserPlus,
  Shield,
  UserMinus,
  QrCode,
  CheckCircle,
  XCircle,
  Camera,
  RefreshCw,
  Bot,
  Terminal,
  Sparkles,
  Command,
  Zap,
  Database,
  Users,
  Calendar,
  FileText,
  Settings,
  Activity,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Create admin client for user management
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

interface Event {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  date: string;
  time: string | null;
  location: string | null;
  organizer: string | null;
  image: string | null;
  image_url: string | null;
  registration_link: string | null;
  photos: string[] | null;
  videos: string[] | null;
  attendance_count?: number;
  registered_count?: number;
  popularity_score?: number;
  trending_score?: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
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
  description: string | null;
  image_url: string | null;
  internship_link: string | null;
  created_at: string;
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
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('events');

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [internshipDialogOpen, setInternshipDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [isSyncingInternships, setIsSyncingInternships] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [scannedQRResult, setScannedQRResult] = useState<any>(null);
  const [qrScanError, setQrScanError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraScannerReady, setCameraScannerReady] = useState(false);

  // Initialize camera QR scanner
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (cameraScannerReady) {
      // Wait for DOM to be ready
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            'qr-reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );

          scanner.render(
            (decodedText) => {
              // QR code scanned successfully
              console.log('QR Scanned:', decodedText);
              handleQRVerify(decodedText);
              setCameraScannerReady(false);
              if (scanner) {
                scanner.clear();
              }
            },
            (error) => {
              // Scan error (usually just no QR found in frame)
              console.log('Scan error:', error);
            }
          );
        } catch (err) {
          console.error('Failed to initialize scanner:', err);
          setQrScanError('Failed to access camera. Please check permissions.');
          setCameraScannerReady(false);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          try {
            scanner.clear();
          } catch (e) {
            // Scanner might not be initialized
          }
        }
      };
    }
  }, [cameraScannerReady]);

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Image upload function - uses Cloudinary
  const uploadImage = async (file: File): Promise<string | null> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ title: 'Upload not configured', description: 'Cloudinary not set up', variant: 'destructive' });
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      } else {
        console.error('Cloudinary error:', data);
        toast({ title: 'Upload failed', description: data.error?.message || 'Unknown error', variant: 'destructive' });
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Upload failed', description: 'Network error', variant: 'destructive' });
      return null;
    }
  };

  // Handle main image file selection
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        setEventForm({ ...eventForm, image_url: url });
      }
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle multiple photo files selection
  const handlePhotoFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        if (url) urls.push(url);
      }
      const currentPhotos = eventForm.photos ? eventForm.photos.split(',').map(p => p.trim()).filter(p => p) : [];
      const allPhotos = [...currentPhotos, ...urls].join(', ');
      setEventForm({ ...eventForm, photos: allPhotos });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: '',
    datetime: '',
    time: '',
    location: '',
    organizer: '',
    image_url: '',
    registration_link: '',
    photos: '',
    videos: '',
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

  const [internshipForm, setInternshipForm] = useState({
    title: '',
    company: '',
    description: '',
    image_url: '',
    internship_link: '',
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

  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'moderator' | 'user',
  });

  // AI Command Center State
  const [aiCommand, setAiCommand] = useState('');
  const [aiOutput, setAiOutput] = useState<{ type: 'success' | 'error' | 'info' | 'command', message: string, timestamp: Date }[]>([
    { type: 'info', message: '🤖 AI Command Center Ready!\n\nI can help you manage the dashboard. Try commands like:\n• "create event Hackathon 2024"\n• "show all events"\n• "delete project MyApp"\n• "sync internships"\n• "show stats"\n• "add user test@test.com as admin"', timestamp: new Date() }
  ]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchEvents(), fetchProjects(), fetchInternships(), fetchPolls(), fetchSocialLinks(), fetchMessages(), fetchAdminUsers()]);
    setIsLoading(false);
  };

  const fetchEvents = async () => {
    try {
      // Simple fetch without per-event counts to improve performance
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20); // Limit to 20 most recent

      if (error) throw error;

      // Map to include default values for optional fields
      const eventsWithDefaults = (data || []).map((event: any) => ({
        ...event,
        photos: event.photos || null,
        videos: event.videos || null
      }));

      setEvents(eventsWithDefaults);
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

  const fetchInternships = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('internships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching internships:', error);
        setInternships([]);
        return;
      }

      setInternships(data || []);
    } catch (error: any) {
      console.error('Error fetching internships:', error);
      setInternships([]);
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

  const fetchAdminUsers = async () => {
    try {
      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch user details from auth using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) throw authError;

      // Combine roles with user emails
      const adminsWithDetails = (rolesData || []).map(role => {
        const authUser = (authData.users as any[]).find(u => u.id === role.user_id);
        return {
          id: role.id,
          email: authUser?.email || 'Unknown',
          role: role.role,
          created_at: role.created_at,
          user_id: role.user_id,
        };
      });

      setAdminUsers(adminsWithDetails);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load admin users",
        variant: "destructive",
      });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Create user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminForm.email,
        password: adminForm.password,
        email_confirm: true,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('Failed to create user');

      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      // Add role to user_roles table
      let roleError;
      if (existingRole) {
        // Update existing role
        const result = await supabase
          .from('user_roles')
          .update({ role: adminForm.role })
          .eq('user_id', authData.user.id);
        roleError = result.error;
      } else {
        // Insert new role
        const result = await supabase
          .from('user_roles')
          .insert([{ user_id: authData.user.id, role: adminForm.role }]);
        roleError = result.error;
      }

      if (roleError) throw roleError;

      toast({ title: "Success", description: `${adminForm.role} created successfully` });
      setAdminDialogOpen(false);
      setAdminForm({ email: '', password: '', role: 'admin' });
      fetchAdminUsers();
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

  const handleRemoveAdmin = async (adminUser: any) => {
    if (!confirm(`Remove ${adminUser.role} role from ${adminUser.email}?`)) return;

    try {
      // Remove from user_roles table
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminUser.id);

      if (error) throw error;

      toast({ title: "Success", description: "Admin role removed" });
      fetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdminUser = async (adminUser: any) => {
    if (!confirm(`Permanently delete user ${adminUser.email}? This cannot be undone.`)) return;

    try {
      // Delete from user_roles first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', adminUser.user_id);

      // Delete user from auth using admin client
      const { error } = await supabaseAdmin.auth.admin.deleteUser(adminUser.user_id);

      if (error) throw error;

      toast({ title: "Success", description: "User deleted permanently" });
      fetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleQRVerify = async (qrCode: string) => {
    setIsVerifying(true);
    setQrScanError('');
    console.log('Verifying QR code:', qrCode);
    try {
      // Accept any QR code format - try multiple approaches
      let trimmedCode = qrCode.trim();

      // Handle EVENT: prefix from generated QR codes
      if (trimmedCode.startsWith('EVENT:')) {
        trimmedCode = trimmedCode.replace('EVENT:', '');
      }

      console.log('Trimmed QR:', trimmedCode);

      // If it's empty
      if (!trimmedCode) {
        setQrScanError('QR code is empty');
        setScannedQRResult(null);
        return;
      }

      // First, try to look up by ID directly (QR contains registration ID)
      let registration: any = null;

      try {
        // First try: look up by ID directly (most efficient)
        const idResult = await (supabase as any)
          .from('event_registrations')
          .select('*, events(title, date, location)')
          .eq('id', trimmedCode)
          .maybeSingle();

        console.log('ID lookup result:', idResult);
        if (idResult.data) {
          registration = idResult.data;
        }
      } catch (e) {
        console.log('ID lookup error:', e);
      }

      // Second try: look up by qr_code field
      if (!registration) {
        try {
          const regResult = await (supabase as any)
            .from('event_registrations')
            .select('*, events(title, date, location)')
            .eq('qr_code', trimmedCode)
            .maybeSingle();

          console.log('QR code lookup result:', regResult);
          if (regResult.data) {
            registration = regResult.data;
          }
        } catch (e) {
          console.log('QR code lookup error:', e);
        }
      }

      // If found in event_registrations, use that
      if (registration) {
        // Check if already scanned
        const alreadyScanned = registration.scanned_at ? true : false;
        const firstScanTime = registration.scanned_at;

        // Mark as scanned (only if not already scanned)
        if (!alreadyScanned) {
          await (supabase as any)
            .from('event_registrations')
            .update({ scanned_at: new Date().toISOString() })
            .eq('id', registration.id);
        }

        // Send to Make.com webhook
        try {
          await fetch('https://hook.eu1.make.com/tiv9b7rdoy8bykkgyj3gvghsduu5fvfp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              full_name: registration.full_name,
              roll_number: registration.roll_number,
              year: registration.year,
              event_title: registration.events?.title,
              event_id: registration.event_id,
              qr_code: registration.qr_code,
              already_scanned: alreadyScanned
            })
          });
        } catch (webhookError) {
          console.log('Webhook error:', webhookError);
        }

        setScannedQRResult({
          valid: !alreadyScanned,
          attendee: {
            profiles: {
              full_name: registration.full_name,
              email: registration.roll_number || 'N/A',
              college: registration.year
            }
          },
          event: registration.events,
          verifiedAt: alreadyScanned ? firstScanTime : new Date().toISOString(),
          alreadyScanned: alreadyScanned,
          firstScannedAt: firstScanTime
        });
        setIsVerifying(false);
        return;
      }

      // Fall back to event_attendees table
      let attendee: any = null;

      try {
        const qrResult = await (supabase as any)
          .from('event_attendees')
          .select('*, profiles(full_name, email, college)')
          .eq('qr_code', trimmedCode)
          .eq('rsvp_status', 'going')
          .single();

        console.log('QR lookup result:', qrResult);
        attendee = qrResult.data;
      } catch (e) {
        console.log('QR lookup error:', e);
      }

      // If not found, try parsing as event_id-user_id or event_id-user_id-timestamp
      if (!attendee) {
        const parts = trimmedCode.split('-');

        if (parts.length >= 2) {
          // Format: event_id-user_id[-timestamp]
          const eventId = parts[0];
          const userId = parts[1];

          console.log('Looking for event:', eventId, 'user:', userId);

          try {
            const partsResult = await (supabase as any)
              .from('event_attendees')
              .select('*, profiles(full_name, email, college)')
              .eq('event_id', eventId)
              .eq('user_id', userId)
              .eq('rsvp_status', 'going')
              .single();

            console.log('Parts lookup result:', partsResult);
            attendee = partsResult.data;
          } catch (e) {
            console.log('Parts lookup error:', e);
          }
        }
      }

      if (!attendee) {
        setQrScanError('Invalid QR code - No matching registration found. Make sure the user has registered for this event.');
        setScannedQRResult(null);
        return;
      }

      // Get event details - use event_id from attendee if available
      const eventIdToUse = attendee?.event_id;
      const { data: event } = await (supabase as any)
        .from('events')
        .select('title, date, location')
        .eq('id', eventIdToUse)
        .single();

      setScannedQRResult({
        valid: true,
        attendee,
        event,
        verifiedAt: new Date().toISOString()
      });

      toast({ title: "Success", description: "QR Code verified successfully!" });
    } catch (error: any) {
      setQrScanError(error.message || 'Failed to verify QR code');
      setScannedQRResult(null);
    } finally {
      setIsVerifying(false);
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
        category: event.category || '',
        datetime: localDateTime,
        time: event.time || format(new Date(event.date), 'HH:mm'),
        location: event.location || '',
        organizer: event.organizer || '',
        image_url: event.image_url || event.image || '',
        registration_link: event.registration_link || '',
        photos: event.photos ? event.photos.join(', ') : '',
        videos: event.videos ? event.videos.join(', ') : '',
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        category: '',
        datetime: '',
        time: '',
        location: '',
        organizer: '',
        image_url: '',
        registration_link: '',
        photos: '',
        videos: '',
      });
    }
    setEventDialogOpen(true);
  };

  // AI Command Processor
  const processAICommand = async (command: string) => {
    const lowerCmd = command.toLowerCase().trim();

    // Add user command to output
    setAiOutput(prev => [...prev, { type: 'command', message: `> ${command}`, timestamp: new Date() }]);
    setIsAiProcessing(true);

    try {
      // Stats command
      if (lowerCmd.includes('stats') || lowerCmd.includes('statistics') || lowerCmd.includes('overview') || lowerCmd.includes('dashboard')) {
        const [eventsCount, projectsCount, usersCount, messagesCount] = await Promise.all([
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('projects').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('contact_messages').select('id', { count: 'exact', head: true })
        ]);

        const eventCount = eventsCount.count || 0;
        const projectCount = projectsCount.count || 0;
        const userCount = usersCount.count || 0;
        const messageCount = messagesCount.count || 0;

        setAiOutput(prev => [...prev, {
          type: 'success',
          message: `📊 Dashboard Statistics:\n\n• Events: ${eventCount}\n• Projects: ${projectCount}\n• Users: ${userCount}\n• Messages: ${messageCount}`,
          timestamp: new Date()
        }]);
        setIsAiProcessing(false);
        return;
      }

      // Show all events
      if (lowerCmd.includes('show') && lowerCmd.includes('event')) {
        const { data: events } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(10);
        if (events && events.length > 0) {
          const eventList = events.map(e => `• ${e.title} (${e.date?.split('T')[0] || 'No date'})`).join('\n');
          setAiOutput(prev => [...prev, {
            type: 'success',
            message: `📅 Recent Events (${events.length}):\n\n${eventList}`,
            timestamp: new Date()
          }]);
        } else {
          setAiOutput(prev => [...prev, { type: 'info', message: 'No events found in database.', timestamp: new Date() }]);
        }
        setIsAiProcessing(false);
        return;
      }

      // Show all projects
      if (lowerCmd.includes('show') && lowerCmd.includes('project')) {
        const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(10);
        if (projects && projects.length > 0) {
          const projectList = projects.map(p => `• ${p.title}`).join('\n');
          setAiOutput(prev => [...prev, {
            type: 'success',
            message: `💻 Recent Projects (${projects.length}):\n\n${projectList}`,
            timestamp: new Date()
          }]);
        } else {
          setAiOutput(prev => [...prev, { type: 'info', message: 'No projects found in database.', timestamp: new Date() }]);
        }
        setIsAiProcessing(false);
        return;
      }

      // Sync internships
      if (lowerCmd.includes('sync') && lowerCmd.includes('internship')) {
        setAiOutput(prev => [...prev, { type: 'info', message: '🔄 Syncing internships...', timestamp: new Date() }]);

        const internshipsData = [
          { title: 'AI/ML Research Intern', company: 'OpenAI', description: 'Work on cutting-edge AI research', internship_link: 'https://openai.com/careers' },
          { title: 'Cloud Engineer Intern', company: 'AWS', description: 'Learn cloud computing at scale', internship_link: 'https://amazon.jobs' },
          { title: 'Data Scientist Intern', company: 'Netflix', description: 'Work on recommendation algorithms', internship_link: 'https://jobs.netflix.com' }
        ];

        for (const int of internshipsData) {
          await (supabase as any).from('internships').upsert(int, { onConflict: 'title,company' });
        }

        setAiOutput(prev => [...prev, {
          type: 'success',
          message: `✅ Successfully synced ${internshipsData.length} internships!\n\nUpdated: OpenAI, AWS, Netflix`,
          timestamp: new Date()
        }]);
        fetchAllData();
        setIsAiProcessing(false);
        return;
      }

      // Create event
      if (lowerCmd.startsWith('create event') || lowerCmd.startsWith('add event')) {
        const titleMatch = command.match(/(?:create|add) event (.+?)(?: on | at |$)/i);
        const title = titleMatch ? titleMatch[1].trim() : 'New Event';

        const { error } = await supabase.from('events').insert({
          title,
          description: 'Created via AI Command',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'TBD',
          organizer: 'Admin'
        });

        if (error) {
          setAiOutput(prev => [...prev, { type: 'error', message: `❌ Failed to create event: ${error.message}`, timestamp: new Date() }]);
        } else {
          setAiOutput(prev => [...prev, { type: 'success', message: `✅ Created event "${title}"!`, timestamp: new Date() }]);
          fetchAllData();
        }
        setIsAiProcessing(false);
        return;
      }

      // Create project
      if (lowerCmd.startsWith('create project') || lowerCmd.startsWith('add project')) {
        const titleMatch = command.match(/(?:create|add) project (.+?)$/i);
        const title = titleMatch ? titleMatch[1].trim() : 'New Project';

        const { error } = await supabase.from('projects').insert({
          title,
          description: 'Created via AI Command',
          github_url: 'https://github.com'
        });

        if (error) {
          setAiOutput(prev => [...prev, { type: 'error', message: `❌ Failed to create project: ${error.message}`, timestamp: new Date() }]);
        } else {
          setAiOutput(prev => [...prev, { type: 'success', message: `✅ Created project "${title}"!`, timestamp: new Date() }]);
          fetchAllData();
        }
        setIsAiProcessing(false);
        return;
      }

      // Delete event
      if ((lowerCmd.startsWith('delete event') || lowerCmd.startsWith('remove event')) && events.length > 0) {
        const titleMatch = command.match(/(?:delete|remove) event (.+?)$/i);
        if (titleMatch) {
          const titleToDelete = titleMatch[1].toLowerCase();
          const eventToDelete = events.find(e => e.title?.toLowerCase().includes(titleToDelete));

          if (eventToDelete) {
            await supabase.from('events').delete().eq('id', eventToDelete.id);
            setAiOutput(prev => [...prev, { type: 'success', message: `✅ Deleted event "${eventToDelete.title}"!`, timestamp: new Date() }]);
            fetchAllData();
          } else {
            setAiOutput(prev => [...prev, { type: 'error', message: `❌ Event not found: "${titleToDelete}"`, timestamp: new Date() }]);
          }
        } else {
          setAiOutput(prev => [...prev, { type: 'info', message: 'Please specify which event to delete. Example: "delete event Hackathon"', timestamp: new Date() }]);
        }
        setIsAiProcessing(false);
        return;
      }

      // Refresh data
      if (lowerCmd.includes('refresh') || lowerCmd.includes('reload') || lowerCmd.includes('fetch')) {
        setAiOutput(prev => [...prev, { type: 'info', message: '🔄 Refreshing all data...', timestamp: new Date() }]);
        await fetchAllData();
        setAiOutput(prev => [...prev, { type: 'success', message: '✅ Data refreshed successfully!', timestamp: new Date() }]);
        setIsAiProcessing(false);
        return;
      }

      // Clear/reset
      if (lowerCmd.includes('clear') || lowerCmd.includes('reset')) {
        setAiOutput([
          { type: 'info', message: '🤖 AI Command Center Ready!\n\nI can help you manage the dashboard. Try commands like:\n• "create event Hackathon 2024"\n• "show all events"\n• "delete project MyApp"\n• "sync internships"\n• "show stats"', timestamp: new Date() }
        ]);
        setIsAiProcessing(false);
        return;
      }

      // Help
      if (lowerCmd.includes('help') || lowerCmd === '?') {
        setAiOutput(prev => [...prev, {
          type: 'info',
          message: `📖 Available Commands:\n\n🔹 **View Data:**\n• "show events" - List all events\n• "show projects" - List all projects\n• "show users" - List all users\n• "show stats" - Dashboard statistics\n\n🔹 **Create:**\n• "create event [name]" - Add new event\n• "create project [name]" - Add new project\n\n🔹 **User Management:**\n• "add user email@domain.com as admin" - Make user admin\n• "remove admin email@domain.com" - Remove admin role\n\n🔹 **Delete:**\n• "delete event [name]" - Remove an event\n• "delete project [name]" - Remove a project\n\n🔹 **Actions:**\n• "sync internships" - Update internships\n• "refresh" - Reload all data\n• "clear" - Clear terminal`,
          timestamp: new Date()
        }]);
        setIsAiProcessing(false);
        return;
      }

      // Add user as admin
      if ((lowerCmd.includes('add user') || lowerCmd.includes('make admin') || lowerCmd.includes('set admin')) && lowerCmd.includes('@')) {
        const emailMatch = command.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          const email = emailMatch[1];
          setAiOutput(prev => [...prev, { type: 'info', message: `🔄 Adding ${email} as admin...`, timestamp: new Date() }]);

          try {
            // Use admin client to update user role
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
            if (userError) {
              setAiOutput(prev => [...prev, { type: 'error', message: `❌ Error: ${userError.message}`, timestamp: new Date() }]);
            } else {
              const targetUser = userData.users.find((u: any) => u.email === email);
              if (targetUser) {
                // Check if already admin, if so just confirm
                const { data: existingRole } = await supabaseAdmin.from('user_roles').select('*').eq('user_id', targetUser.id).eq('role', 'admin').single();

                if (existingRole) {
                  setAiOutput(prev => [...prev, { type: 'success', message: `✅ ${email} is already an ADMIN!\n\n🆔 User ID: ${targetUser.id}`, timestamp: new Date() }]);
                } else {
                  // Try to insert, if duplicate then update
                  try {
                    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
                      user_id: targetUser.id,
                      role: 'admin',
                      created_at: new Date().toISOString()
                    });

                    if (roleError && roleError.message.includes('duplicate')) {
                      // Already exists, just confirm
                      setAiOutput(prev => [...prev, { type: 'success', message: `✅ ${email} is already an ADMIN!`, timestamp: new Date() }]);
                    } else if (roleError) {
                      setAiOutput(prev => [...prev, { type: 'error', message: `❌ Error: ${roleError.message}`, timestamp: new Date() }]);
                    } else {
                      setAiOutput(prev => [...prev, { type: 'success', message: `✅ Added ${email} as ADMIN!\n\n🆔 User ID: ${targetUser.id}`, timestamp: new Date() }]);
                      fetchAllData();
                    }
                  } catch (e: any) {
                    setAiOutput(prev => [...prev, { type: 'success', message: `✅ ${email} is already an ADMIN!`, timestamp: new Date() }]);
                  }
                }
              } else {
                setAiOutput(prev => [...prev, { type: 'error', message: `❌ User not found: ${email}\n\nThe user must sign up first.`, timestamp: new Date() }]);
              }
            }
          } catch (err: any) {
            setAiOutput(prev => [...prev, { type: 'error', message: `❌ Error: ${err.message}`, timestamp: new Date() }]);
          }
        } else {
          setAiOutput(prev => [...prev, { type: 'error', message: `❌ Please provide an email address.\nExample: "add user john@gmail.com as admin"`, timestamp: new Date() }]);
        }
        setIsAiProcessing(false);
        return;
      }

      // Remove admin
      if ((lowerCmd.includes('remove admin') || lowerCmd.includes('revoke admin') || lowerCmd.includes('demote')) && lowerCmd.includes('@')) {
        const emailMatch = command.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          const email = emailMatch[1];
          setAiOutput(prev => [...prev, { type: 'info', message: `🔄 Removing admin role from ${email}...`, timestamp: new Date() }]);

          try {
            const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
            const targetUser = userData.users.find((u: any) => u.email === email);
            if (targetUser) {
              await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUser.id).eq('role', 'admin');
              setAiOutput(prev => [...prev, { type: 'success', message: `✅ Removed admin role from ${email}!`, timestamp: new Date() }]);
              fetchAllData();
            } else {
              setAiOutput(prev => [...prev, { type: 'error', message: `❌ User not found`, timestamp: new Date() }]);
            }
          } catch (err: any) {
            setAiOutput(prev => [...prev, { type: 'error', message: `❌ Error: ${err.message}`, timestamp: new Date() }]);
          }
        }
        setIsAiProcessing(false);
        return;
      }

      // Unknown command
      setAiOutput(prev => [...prev, {
        type: 'error',
        message: `❓ Unknown command: "${command}"\n\nType "help" for available commands.`,
        timestamp: new Date()
      }]);

    } catch (error: any) {
      setAiOutput(prev => [...prev, { type: 'error', message: `❌ Error: ${error.message}`, timestamp: new Date() }]);
    }

    setIsAiProcessing(false);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const dateISO = new Date(eventForm.datetime).toISOString();
      const photosArray = eventForm.photos ? eventForm.photos.split(',').map(url => url.trim()).filter(url => url) : [];
      const videosArray = eventForm.videos ? eventForm.videos.split(',').map(url => url.trim()).filter(url => url) : [];

      const payload = {
        title: eventForm.title,
        description: eventForm.description || null,
        category: eventForm.category || null,
        date: dateISO,
        time: eventForm.time || null,
        location: eventForm.location || null,
        organizer: eventForm.organizer || null,
        image: eventForm.image_url || null,
        image_url: eventForm.image_url || null,
        registration_link: eventForm.registration_link || null,
        photos: photosArray,
        videos: videosArray,
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

  const handleInternshipDialog = (internship?: Internship) => {
    if (internship) {
      setEditingInternship(internship);
      setInternshipForm({
        title: internship.title,
        company: internship.company,
        description: internship.description || '',
        image_url: internship.image_url || '',
        internship_link: internship.internship_link || '',
      });
    } else {
      setEditingInternship(null);
      setInternshipForm({
        title: '',
        company: '',
        description: '',
        image_url: '',
        internship_link: '',
      });
    }

    setInternshipDialogOpen(true);
  };

  const handleInternshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        title: internshipForm.title,
        company: internshipForm.company,
        description: internshipForm.description || null,
        image_url: internshipForm.image_url || null,
        internship_link: internshipForm.internship_link || null,
      };

      if (editingInternship) {
        const { error } = await (supabase as any)
          .from('internships')
          .update(payload)
          .eq('id', editingInternship.id);

        if (error) throw error;
        toast({ title: "Success", description: "Internship updated" });
      } else {
        const { error } = await (supabase as any)
          .from('internships')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Success", description: "Internship created" });
      }

      setInternshipDialogOpen(false);
      fetchInternships();
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

  const handleInternshipDelete = async (id: string) => {
    if (!confirm('Delete this internship?')) return;

    try {
      const { error } = await (supabase as any).from('internships').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Internship deleted" });
      fetchInternships();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Sync internships from external APIs
  const handleSyncInternships = async () => {
    setIsSyncingInternships(true);
    try {
      const internships: any[] = [];

      // Fetch from Remotive API (free, no key needed)
      try {
        const remotiveResponse = await fetch(
          "https://remotive.com/api/remote-jobs?category=software-dev-jobs&limit=20"
        );
        const remotiveData = await remotiveResponse.json();

        if (remotiveData.jobs) {
          for (const job of remotiveData.jobs.slice(0, 10)) {
            internships.push({
              title: job.title,
              company: job.company_name,
              description: job.description?.substring(0, 500) || "Remote internship opportunity",
              image_url: null,
              internship_link: job.url,
            });
          }
        }
      } catch (e) {
        console.log("Remotive API error:", e);
      }

      // Add sample internships as fallback
      if (internships.length === 0) {
        internships.push(
          {
            title: "Software Development Intern",
            company: "Google",
            description: "Join Google as a software development intern. Work on real projects with experienced mentors.",
            image_url: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400",
            internship_link: "https://careers.google.com/internships/",
          },
          {
            title: "Frontend Development Internship",
            company: "Meta",
            description: "Meta offers internship programs for frontend developers. Build products used by billions.",
            image_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
            internship_link: "https://www.metacareers.com/internships/",
          },
          {
            title: "Full Stack Developer Intern",
            company: "Amazon",
            description: "Amazon Web Services internship for full stack developers. Scale cloud solutions globally.",
            image_url: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400",
            internship_link: "https://www.amazon.jobs/en/landing_pages/internships/",
          },
          {
            title: "Machine Learning Internship",
            company: "Microsoft",
            description: "Work on cutting-edge AI and ML projects at Microsoft Research.",
            image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400",
            internship_link: "https://careers.microsoft.com/students/internship",
          },
          {
            title: "Cloud Engineering Intern",
            company: "IBM",
            description: "Learn cloud computing and enterprise solutions at IBM.",
            image_url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400",
            internship_link: "https://www.ibm.com/careers/internship",
          }
        );
      }

      // Insert into database
      for (const internship of internships) {
        const { error } = await (supabase as any)
          .from('internships')
          .upsert({
            title: internship.title,
            company: internship.company,
            description: internship.description,
            image_url: internship.image_url,
            internship_link: internship.internship_link,
          }, { onConflict: 'title,company' });

        if (error) {
          console.error('Error inserting internship:', error);
        }
      }

      toast({
        title: "Success",
        description: `Successfully synced ${internships.length} internships`
      });
      fetchInternships();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync internships",
        variant: "destructive",
      });
    } finally {
      setIsSyncingInternships(false);
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
            <TabsList className="grid w-full grid-cols-8 max-w-5xl">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="internships">Internships</TabsTrigger>
              <TabsTrigger value="polls">Polls</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
              <TabsTrigger value="qrscan">QR Scanner</TabsTrigger>
              <TabsTrigger value="aicommand" className="text-primary">🤖 AI</TabsTrigger>
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
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={eventForm.category}
                          onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                          placeholder="Sports, Tech Talks, Cultural..."
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
                        <Label htmlFor="time">Display Time (Optional)</Label>
                        <Input
                          id="time"
                          type="time"
                          value={eventForm.time}
                          onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="organizer">Organizer</Label>
                        <Input
                          id="organizer"
                          value={eventForm.organizer}
                          onChange={(e) => setEventForm({ ...eventForm, organizer: e.target.value })}
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
                        <Label htmlFor="image_url">Cover Image</Label>
                        <Input
                          id="image_url"
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          disabled={uploadingImage}
                        />
                        {uploadingImage && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                        {eventForm.image_url && !uploadingImage && (
                          <div className="mt-2">
                            <img src={eventForm.image_url} alt="Preview" className="h-20 w-auto rounded" />
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEventForm({ ...eventForm, image_url: '' })} className="mt-1">
                              Remove
                            </Button>
                          </div>
                        )}
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
                      <div>
                        <Label htmlFor="photos">Event Photos (Upload multiple)</Label>
                        <Input
                          id="photos"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoFilesChange}
                          disabled={uploadingPhotos}
                        />
                        {uploadingPhotos && <p className="text-sm text-muted-foreground mt-1">Uploading photos...</p>}
                        {eventForm.photos && !uploadingPhotos && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1">{eventForm.photos.split(',').length} photo(s) added</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {eventForm.photos.split(',').filter(p => p.trim()).map((photo, idx) => (
                                <div key={idx} className="relative">
                                  <img src={photo.trim()} alt={`Photo ${idx + 1}`} className="h-16 w-16 object-cover rounded" />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute -top-2 -right-2 h-5 w-5 p-0"
                                    onClick={() => {
                                      const photos = eventForm.photos.split(',').filter((_, i) => i !== idx).join(',');
                                      setEventForm({ ...eventForm, photos });
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="videos">Videos (Comma-separated URLs)</Label>
                        <Textarea
                          id="videos"
                          value={eventForm.videos}
                          onChange={(e) => setEventForm({ ...eventForm, videos: e.target.value })}
                          placeholder="https://example.com/video1.mp4, https://example.com/video2.mp4"
                          rows={2}
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
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Checked In</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>{format(new Date(event.date), 'PPP p')}</TableCell>
                          <TableCell>{event.category || '—'}</TableCell>
                          <TableCell>{event.location || '—'}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
                              {event.registered_count || 0} registered
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${(event.attendance_count || 0) > 0
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-muted text-muted-foreground'
                              }`}>
                              {event.attendance_count || 0} checked in
                            </span>
                          </TableCell>
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

            <TabsContent value="internships" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Internships</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSyncInternships}
                    disabled={isSyncingInternships}
                  >
                    {isSyncingInternships ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync from API
                  </Button>
                  <Dialog open={internshipDialogOpen} onOpenChange={setInternshipDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleInternshipDialog()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Internship
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{editingInternship ? 'Edit Internship' : 'Add Internship'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleInternshipSubmit} className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="internship_title">Title *</Label>
                          <Input
                            id="internship_title"
                            value={internshipForm.title}
                            onChange={(e) => setInternshipForm({ ...internshipForm, title: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="internship_company">Company *</Label>
                          <Input
                            id="internship_company"
                            value={internshipForm.company}
                            onChange={(e) => setInternshipForm({ ...internshipForm, company: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="internship_description">Description</Label>
                          <Textarea
                            id="internship_description"
                            value={internshipForm.description}
                            onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="internship_image_url">Image URL</Label>
                          <Input
                            id="internship_image_url"
                            type="url"
                            value={internshipForm.image_url}
                            onChange={(e) => setInternshipForm({ ...internshipForm, image_url: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="internship_link">Internship Link</Label>
                          <Input
                            id="internship_link"
                            type="url"
                            value={internshipForm.internship_link}
                            onChange={(e) => setInternshipForm({ ...internshipForm, internship_link: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={() => setInternshipDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingInternship ? 'Update' : 'Add')}
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
                  ) : internships.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No internships yet. Add one to publish for users.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {internships.map((internship) => (
                          <TableRow key={internship.id}>
                            <TableCell className="font-medium">{internship.title}</TableCell>
                            <TableCell>{internship.company}</TableCell>
                            <TableCell>
                              {internship.internship_link ? (
                                <a href={internship.internship_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  Open link
                                </a>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleInternshipDialog(internship)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleInternshipDelete(internship.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
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
                        <select
                          id="platform"
                          value={socialForm.platform}
                          onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-background border border-border rounded-md"
                        >
                          <option value="">Select Platform</option>
                          <option value="GitHub">GitHub</option>
                          <option value="Twitter">Twitter</option>
                          <option value="Instagram">Instagram</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Email">Email</option>
                        </select>
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
                    <Button data-testid="create-admin-btn">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create New Admin</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAdmin} className="space-y-4 mt-4">
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
                      <div>
                        <Label htmlFor="admin_password">Password *</Label>
                        <Input
                          id="admin_password"
                          type="password"
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          data-testid="admin-password-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin_role">Role *</Label>
                        <select
                          id="admin_role"
                          value={adminForm.role}
                          onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as 'admin' | 'moderator' | 'user' })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md"
                          data-testid="admin-role-select"
                        >
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                          <option value="user">User</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setAdminDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving} data-testid="submit-admin-btn">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
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
                ) : adminUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No admin users yet. Create one to get started!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminUsers.map((adminUser: any) => (
                        <TableRow key={adminUser.id} data-testid={`admin-row-${adminUser.email}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-primary" />
                              {adminUser.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${adminUser.role === 'admin'
                              ? 'bg-red-500/20 text-red-500'
                              : adminUser.role === 'moderator'
                                ? 'bg-yellow-500/20 text-yellow-500'
                                : 'bg-blue-500/20 text-blue-500'
                              }`}>
                              {adminUser.role}
                            </span>
                          </TableCell>
                          <TableCell>{format(new Date(adminUser.created_at), 'PPP')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAdmin(adminUser)}
                              className="text-yellow-500 hover:text-yellow-400"
                              title="Remove admin role"
                              data-testid={`remove-role-${adminUser.email}`}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAdminUser(adminUser)}
                              className="text-destructive"
                              title="Delete user permanently"
                              data-testid={`delete-user-${adminUser.email}`}
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

            {/* AI Command Center Tab */}
            <TabsContent value="aicommand" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">AI Command Center</h2>
                    <p className="text-sm text-muted-foreground">
                      Type commands to manage your dashboard
                    </p>
                  </div>
                </div>

                {/* AI Terminal */}
                <div className="bg-black rounded-xl border border-border overflow-hidden">
                  {/* Terminal Header */}
                  <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-4 text-xs text-gray-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3" />
                      AI Command Terminal
                    </div>
                  </div>

                  {/* Terminal Output */}
                  <div className="h-96 overflow-y-auto p-4 font-mono text-sm space-y-3">
                    {aiOutput.map((output, index) => (
                      <div key={index} className={`
                        ${output.type === 'command' ? 'text-green-400' : ''}
                        ${output.type === 'success' ? 'text-green-400' : ''}
                        ${output.type === 'error' ? 'text-red-400' : ''}
                        ${output.type === 'info' ? 'text-blue-400' : ''}
                      `}>
                        <pre className="whitespace-pre-wrap">{output.message}</pre>
                      </div>
                    ))}
                    {isAiProcessing && (
                      <div className="text-yellow-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </div>
                    )}
                  </div>

                  {/* Terminal Input */}
                  <div className="border-t border-gray-800 p-3 flex gap-2">
                    <span className="text-green-400 font-mono">$</span>
                    <input
                      type="text"
                      value={aiCommand}
                      onChange={(e) => setAiCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && aiCommand.trim() && !isAiProcessing) {
                          processAICommand(aiCommand);
                          setAiCommand('');
                        }
                      }}
                      placeholder="Type a command..."
                      disabled={isAiProcessing}
                      className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-gray-600"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (aiCommand.trim() && !isAiProcessing) {
                          processAICommand(aiCommand);
                          setAiCommand('');
                        }
                      }}
                      disabled={isAiProcessing || !aiCommand.trim()}
                      className="bg-primary"
                    >
                      {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Quick Commands */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['show stats', 'show events', 'refresh', 'help'].map((cmd) => (
                    <Button
                      key={cmd}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAiCommand(cmd);
                        processAICommand(cmd);
                        setAiCommand('');
                      }}
                      disabled={isAiProcessing}
                      className="font-mono text-xs"
                    >
                      {cmd}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* QR Scanner Tab */}
            <TabsContent value="qrscan" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <QrCode className="w-6 h-6" />
                  <h2 className="text-xl font-semibold">QR Code Scanner</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan or enter a QR code to verify event registration
                </p>

                {/* Camera Scanner */}
                {!cameraScannerReady ? (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="text-center space-y-4">
                      <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                      <h3 className="font-semibold">Use Camera to Scan</h3>
                      <p className="text-sm text-muted-foreground">
                        Click below to activate your camera and scan QR codes
                      </p>
                      <Button
                        onClick={() => setCameraScannerReady(true)}
                        className="w-full"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera Scanner
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Camera Scanner Active</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCameraScannerReady(false)}
                      >
                        Stop Scanner
                      </Button>
                    </div>
                    <div id="qr-reader" className="w-full"></div>
                  </div>
                )}

                {/* Manual QR Code Entry */}
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <Label htmlFor="qr-input">Enter QR Code manually</Label>
                  <div className="flex gap-2">
                    <Input
                      id="qr-input"
                      placeholder="Enter QR code string (event_id-user_id-timestamp)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleQRVerify((e.target as HTMLInputElement).value);
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleQRVerify(e.target.value);
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById('qr-input') as HTMLInputElement;
                        if (input?.value) handleQRVerify(input.value);
                      }}
                      disabled={isVerifying}
                    >
                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                    </Button>
                  </div>
                </div>

                {/* Scan Result */}
                {qrScanError && (
                  <div className="bg-destructive/10 border border-destructive rounded-xl p-6">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="w-6 h-6" />
                      <h3 className="font-semibold">Invalid QR Code</h3>
                    </div>
                    <p className="mt-2 text-destructive/80">{qrScanError}</p>
                  </div>
                )}

                {scannedQRResult && !scannedQRResult.valid && (
                  <div className="bg-red-500/10 border border-red-500 rounded-xl p-6">
                    <div className="flex items-center gap-2 text-red-500 mb-4">
                      <XCircle className="w-6 h-6" />
                      <h3 className="font-semibold text-lg">Already Scanned</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Event</p>
                        <p className="font-semibold">{scannedQRResult.event?.title}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-semibold">
                          {scannedQRResult.event?.date ? new Date(scannedQRResult.event.date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-semibold">{scannedQRResult.event?.location || 'TBA'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-semibold">
                          {(scannedQRResult.attendee as any)?.profiles?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Roll Number</p>
                        <p className="font-semibold">
                          {(scannedQRResult.attendee as any)?.profiles?.email || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Year</p>
                        <p className="font-semibold">
                          {(scannedQRResult.attendee as any)?.profiles?.college || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-muted-foreground">
                      First scanned at: {scannedQRResult.firstScannedAt ? new Date(scannedQRResult.firstScannedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                )}

                {scannedQRResult && scannedQRResult.valid && (
                  <div className="bg-green-500/10 border border-green-500 rounded-xl p-6">
                    <div className="flex items-center gap-2 text-green-500 mb-4">
                      <CheckCircle className="w-6 h-6" />
                      <h3 className="font-semibold text-lg">Valid Entry Pass</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Event</p>
                        <p className="font-semibold">{scannedQRResult.event?.title}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-semibold">
                          {scannedQRResult.event?.date ? new Date(scannedQRResult.event.date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-semibold">{scannedQRResult.event?.location || 'TBA'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-semibold">
                          {(scannedQRResult.attendee as any)?.profiles?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Roll Number</p>
                        <p className="font-semibold">
                          {(scannedQRResult.attendee as any)?.profiles?.email || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Year</p>
                        <p className="font-semibold">
                          {(scannedQRResult.attendee as any)?.profiles?.college || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-muted-foreground">
                      Verified at: {new Date(scannedQRResult.verifiedAt).toLocaleString()}
                    </p>
                  </div>
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
