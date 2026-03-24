import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase, supabaseAdmin } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ShieldCheck,
  ShieldOff,
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
  Send,
  Mail,
  Info,
  Calendar,
  FileText,
  Settings,
  Activity,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { Html5Qrcode } from 'html5-qrcode';



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

interface CodingTask {
  id: string;
  title: string;
  description: string;
  points: number;
  created_at: string;
}

interface TaskSubmission {
  id: string;
  task_id: string;
  user_id: string;
  answer: string;
  status: 'pending' | 'approved' | 'denied';
  points_awarded: number;
  submitted_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  coding_tasks: {
    title: string;
  };
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  user_id: string;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [codingTasks, setCodingTasks] = useState<CodingTask[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
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
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [scannedQRResult, setScannedQRResult] = useState<any>(null);
  const [qrScanError, setQrScanError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraScannerReady, setCameraScannerReady] = useState(false);

  // Initialize camera QR scanner
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (cameraScannerReady) {
      const timer = setTimeout(async () => {
        if (!isMounted) return;

        try {
          // First check if camera is available
          const devices = await Html5Qrcode.getCameras();
          if (!devices || devices.length === 0) {
            setQrScanError('No camera found on this device');
            setCameraScannerReady(false);
            return;
          }

          html5QrCode = new Html5Qrcode("qr-reader");
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.333333
          };

          // Use the first back camera
          const cameraId = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[0].id;

          await html5QrCode.start(
            cameraId,
            config,
            (decodedText) => {
              console.log('QR Scanned:', decodedText);
              handleQRVerify(decodedText);
              setCameraScannerReady(false);
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(err => console.error("Error stopping scanner", err));
              }
            },
            (errorMessage) => {
              // Ignore continuous scanning errors - these happen when no QR is in frame
            }
          );
        } catch (err: any) {
          console.error('Failed to initialize scanner:', err);
          if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
            setQrScanError('Camera permission denied. Please allow camera access and try again.');
          } else if (err.toString().includes('NotFoundError')) {
            setQrScanError('No camera found. Please connect a camera and try again.');
          } else {
            setQrScanError('Could not start camera. Please refresh and try again.');
          }
          setCameraScannerReady(false);
        }
      }, 300);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Cleanup stop error", err));
        }
      };
    }
  }, [cameraScannerReady]);

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  const [editingTask, setEditingTask] = useState<CodingTask | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
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

  const [taskForm, setEventTaskForm] = useState({
    title: '',
    description: '',
    points: 10,
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
    await Promise.all([
      fetchEvents(),
      fetchProjects(),
      fetchInternships(),
      fetchPolls(),
      fetchSocialLinks(),
      fetchMessages(),
      fetchCodingTasks(),
      fetchTaskSubmissions(),
      fetchAdminUsers(),
      fetchUsers(),
      fetchRegistrations()
    ]);
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

  const fetchCodingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('coding_tasks' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('not found')) {
          console.warn('Coding tasks table missing. You need to run the SQL migration.');
          setCodingTasks([]);
          return;
        }
        throw error;
      }
      setCodingTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTaskSubmissions = async () => {
    try {
      console.log("[Admin] Fetching task submissions...");

      // 1. Fetch submissions first (no joins to avoid schema cache issues)
      const { data: submissions, error: subError } = await supabase
        .from('task_submissions' as any)
        .select('*')
        .order('submitted_at', { ascending: false });

      if (subError) {
        console.error("[Admin] Error fetching submissions:", subError);
        setTaskSubmissions([]);
        return;
      }

      if (!submissions || submissions.length === 0) {
        console.log("[Admin] No submissions found.");
        setTaskSubmissions([]);
        return;
      }

      // 2. Fetch all tasks to map titles
      const { data: tasks } = await supabase
        .from('coding_tasks' as any)
        .select('id, title');

      // 3. Fetch all profiles to map names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, firebase_uid, is_firebase_user');

      // 3b. Fetch user registrations for additional user info
      const { data: userRegistrations } = await supabase
        .from('user_registrations')
        .select('user_id, full_name, email, year, section, department, college, phone');

      // 4. Calculate total points per user
      const userPointsMap: Record<string, number> = {};
      submissions.forEach((sub: any) => {
        if (sub.status === 'approved' && sub.points_awarded) {
          userPointsMap[sub.user_id] = (userPointsMap[sub.user_id] || 0) + sub.points_awarded;
        }
      });

      // 5. Map everything together manually
      const mappedSubmissions = submissions.map((sub: any) => {
        const task = tasks?.find(t => t.id === sub.task_id);
        const profile = profiles?.find(p => p.id === sub.user_id || p.firebase_uid === sub.user_id);
        const userReg = userRegistrations?.find(r => r.user_id === sub.user_id);

        // Use profile name, then user_registrations name, then fallback
        const displayName = profile?.full_name || userReg?.full_name || 'Anonymous';
        const displayEmail = profile?.email || userReg?.email || 'No Email';

        return {
          ...sub,
          coding_tasks: { title: task?.title || 'Unknown Task' },
          profiles: {
            full_name: displayName,
            email: displayEmail,
            year: userReg?.year || '',
            section: userReg?.section || '',
            department: userReg?.department || '',
            college: userReg?.college || '',
            phone: userReg?.phone || ''
          },
          total_user_points: userPointsMap[sub.user_id] || 0
        };
      });

      console.log("[Admin] Successfully mapped submissions:", mappedSubmissions.length);
      setTaskSubmissions(mappedSubmissions);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      // Fetch all user roles joined with profiles for emails
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          role,
          created_at,
          user_id,
          profiles:user_id (email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to include profiles details, handling array/object join
      const adminsWithDetails = (data || []).map((role: any) => {
        const profile = Array.isArray(role.profiles) ? role.profiles[0] : role.profiles;
        return {
          id: role.id,
          email: profile?.email || profile?.full_name || role.user_id,
          role: role.role,
          created_at: role.created_at,
          user_id: role.user_id,
        };
      });

      setAdminUsers(adminsWithDetails);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch task submissions to calculate points
      const { data: submissionsData } = await supabase
        .from('task_submissions')
        .select('user_id, points_awarded, status');

      // Calculate total points per user
      const userPointsMap: Record<string, number> = {};
      (submissionsData || []).forEach((sub: any) => {
        if (sub.status === 'approved' && sub.points_awarded) {
          userPointsMap[sub.user_id] = (userPointsMap[sub.user_id] || 0) + sub.points_awarded;
        }
      });

      // Add points to each user
      const usersWithPoints = (profilesData || []).map((user: any) => ({
        ...user,
        total_points: userPointsMap[user.id] || 0,
        has_submissions: !!userPointsMap[user.id]
      }));

      // Sort by points (highest first), then by name
      usersWithPoints.sort((a: any, b: any) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      setAllUsers(usersWithPoints);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*, events(title)')
        .order('scanned_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setEventRegistrations(data || []);
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handlePromoteToAdmin = async (userId: string, email: string) => {
    if (!confirm(`Promote ${email} to admin?`)) return;

    try {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: 'admin' }]);
        if (error) throw error;
      }

      toast({ title: "Success", description: `${email} is now an admin` });
      fetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Creation requires SERVICE_ROLE_KEY. Advise user to use promotion from Users tab instead if missing.
      if (!supabaseAdmin) {
        toast({
          title: "Setup Required",
          description: "To create users directly, please add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env. Alternatively, promote existing users from the 'Users' tab.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      const { data: authData, error: authError } = await (supabaseAdmin as any).auth.admin.createUser({
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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently DELETE user ${userEmail}? This cannot be undone!`)) return;

    if (!supabaseAdmin) {
      toast({
        title: "Setup Required",
        description: "To delete users, please add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Delete from Supabase Auth
      const { error: authError } = await (supabaseAdmin as any).auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Delete from user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (roleError) throw roleError;

      // Delete from profiles table if exists
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      toast({ title: "Success", description: `User ${userEmail} has been permanently deleted` });
      fetchAdminUsers();
      fetchUsers();
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

  const handleTaskDialog = (task?: CodingTask) => {
    if (task) {
      setEditingTask(task);
      setEventTaskForm({
        title: task.title,
        description: task.description,
        points: task.points,
      });
    } else {
      setEditingTask(null);
      setEventTaskForm({
        title: '',
        description: '',
        points: 10,
      });
    }
    setTaskDialogOpen(true);
  };

  const handleReviewDialog = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setReviewDialogOpen(true);
  };

  const saveTask = async () => {
    if (!taskForm.title || !taskForm.description) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('coding_tasks' as any)
          .update({
            title: taskForm.title,
            description: taskForm.description,
            points: taskForm.points,
          })
          .eq('id', editingTask.id);

        if (error) throw error;
        toast({ title: 'Task Updated', description: 'The task has been updated successfully' });
      } else {
        const { error } = await supabase
          .from('coding_tasks' as any)
          .insert({
            title: taskForm.title,
            description: taskForm.description,
            points: taskForm.points,
            // Removed created_by as it might be missing in the schema
          });

        if (error) throw error;
        toast({ title: 'Task Created', description: 'A new task has been created successfully' });
      }

      setTaskDialogOpen(false);
      fetchCodingTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase.from('coding_tasks' as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Task Deleted', description: 'Task removed successfully' });
      fetchCodingTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const reviewSubmission = async (status: 'approved' | 'denied') => {
    if (!selectedSubmission) return;

    setIsSaving(true);
    try {
      const points = status === 'approved' ? codingTasks.find(t => t.id === selectedSubmission.task_id)?.points || 0 : 0;

      const { error } = await supabase
        .from('task_submissions' as any)
        .update({
          status,
          points_awarded: points,
          // Removed reviewed_by/reviewed_at if they don't exist
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      toast({ title: 'Submission Reviewed', description: `Task has been ${status}` });
      setReviewDialogOpen(false);
      fetchTaskSubmissions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSubmission = async () => {
    if (!selectedSubmission) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('task_submissions' as any)
        .delete()
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      toast({ title: 'Submission Deleted', description: 'The answer has been permanently deleted' });
      setReviewDialogOpen(false);
      fetchTaskSubmissions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
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

  const handlePollDialog = () => {
    setPollForm({ event_id: '', question: '', registration_link: '', options: ['', ''] });
    setPollDialogOpen(true);
  };

  const handlePollDelete = async (id: string) => {
    if (!confirm('Delete this poll and all its options?')) return;
    try {
      const { error } = await supabase.from('polls').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Poll deleted" });
      fetchPolls();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const handleMessageDelete = async (id: string) => {
    if (!confirm('Delete this message permanently?')) return;

    try {
      const { error } = await supabase.from('contact_messages').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Message removed from inbox" });
      fetchMessages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-foreground rounded-2xl flex items-center justify-center">
                <LayoutDashboard className="w-7 h-7 text-background" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold pb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400">Admin HUB Connect</h1>
                <p className="text-muted-foreground text-sm font-medium">{user?.email} — <span className="text-blue-600">Verified System Administrator</span></p>
              </div>
            </div>

            <Button variant="outline" onClick={handleLogout} className="rounded-xl border-border px-6 hover:bg-secondary h-12">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
            <div className="overflow-x-auto pb-4 mb-4 -mx-6 px-6 no-scrollbar">
              <TabsList className="inline-flex w-max min-w-full md:grid md:w-full md:grid-cols-6 lg:grid-cols-11 gap-2 bg-secondary/30 p-1.5 rounded-2xl">
                <TabsTrigger value="events" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Events</TabsTrigger>
                <TabsTrigger value="projects" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Projects</TabsTrigger>
                <TabsTrigger value="internships" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Internships</TabsTrigger>
                <TabsTrigger value="polls" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Polls</TabsTrigger>
                <TabsTrigger value="social" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Social</TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md text-blue-600">Tasks</TabsTrigger>
                <TabsTrigger value="messages" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Messages</TabsTrigger>
                <TabsTrigger value="users" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Users</TabsTrigger>
                <TabsTrigger value="admins" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Admins</TabsTrigger>
                <TabsTrigger value="qrscan" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">QR Scan</TabsTrigger>
                <TabsTrigger value="attendance" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">Attendance</TabsTrigger>
                <TabsTrigger value="aicommand" className="rounded-xl px-4 py-2 text-sm font-bold bg-blue-600/5 text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:bg-blue-600/10 transition-all border border-blue-100/50">Robot AI</TabsTrigger>
              </TabsList>
            </div>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Event Management</h2>
                <Button onClick={() => handleEventDialog()} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Create Event
                </Button>
              </div>
              {/* Event Table Implementation ... */}
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="font-bold">Title</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Location</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{format(new Date(event.date), 'PP')}</TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEventDialog(event)} className="rounded-xl mr-1"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEventDelete(event.id)} className="text-destructive rounded-xl"><Trash2 className="w-4 h-4 text-blue-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Other tabs follow similar clean structure ... */}
            <TabsContent value="projects" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Project Showcase</h2>
                <Button onClick={() => handleProjectDialog()} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Add Project
                </Button>
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="font-bold">Project Display Name</TableHead>
                      <TableHead className="font-bold">Stack/Tags</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-secondary/10">
                        <TableCell className="font-medium text-blue-600">{project.title}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {project.tags?.map((tag, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 bg-secondary rounded-full border border-border">{tag}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleProjectDialog(project)} className="rounded-xl mr-2"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleProjectDelete(project.id)} className="text-destructive rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="internships" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Career Opportunities</h2>
                <Button onClick={() => handleInternshipDialog()} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Post Internship
                </Button>
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow><TableHead className="font-bold">Organization</TableHead><TableHead className="font-bold">Opportunity</TableHead><TableHead className="text-right font-bold">Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {internships.map((intern) => (
                      <TableRow key={intern.id} className="hover:bg-secondary/10">
                        <TableCell className="font-medium">{intern.company}</TableCell>
                        <TableCell>{intern.title}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleInternshipDialog(intern)} className="rounded-xl mr-2 text-blue-600"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleInternshipDelete(intern.id)} className="text-destructive rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="polls" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Community Polls</h2>
                <Button onClick={() => handlePollDialog()} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Create Poll
                </Button>
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow><TableHead className="font-bold">Active Inquiry Question</TableHead><TableHead className="font-bold">Created Date</TableHead><TableHead className="text-right font-bold">Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {polls.map((poll) => (
                      <TableRow key={poll.id} className="hover:bg-secondary/10">
                        <TableCell className="font-medium text-blue-600">{poll.question}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(poll.created_at), 'PP')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handlePollDelete(poll.id)} className="text-destructive rounded-xl"><Trash2 className="w-4 h-4 text-blue-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="social" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Social Connect</h2>
                <Button onClick={() => handleSocialDialog()} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Add Link
                </Button>
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="font-bold">Platform</TableHead>
                      <TableHead className="font-bold">URL</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {socialLinks.map((link) => (
                      <TableRow key={link.id} className="hover:bg-secondary/10">
                        <TableCell className="font-medium text-blue-700">{link.platform}</TableCell>
                        <TableCell className="truncate max-w-xs text-muted-foreground">{link.url}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleSocialDialog(link)} className="rounded-xl mr-1"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleSocialDelete(link.id)} className="text-destructive rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Coding Tasks</h2>
                    <p className="text-sm text-muted-foreground">Manage the technical challenges assigned to students.</p>
                  </div>
                  <Button onClick={() => handleTaskDialog()} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> Create Task
                  </Button>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="font-bold">Title</TableHead>
                        <TableHead className="font-bold">Points</TableHead>
                        <TableHead className="font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codingTasks.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No tasks created yet.</TableCell></TableRow>
                      ) : codingTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell><Badge variant="secondary" className="bg-blue-100 text-blue-700">{task.points} XP</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleTaskDialog(task)} className="rounded-xl mr-1"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)} className="text-destructive rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Submissions</h2>
                  <p className="text-sm text-muted-foreground">Review student responses and award points.</p>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead className="font-bold">Student</TableHead>
                        <TableHead className="font-bold">Task</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="font-bold text-right">Review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taskSubmissions.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No submissions found.</TableCell></TableRow>
                      ) : taskSubmissions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="font-medium">
                              {(sub.profiles as any)?.full_name || 'Student (No Profile)'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(sub.profiles as any)?.email || sub.user_id}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{(sub.coding_tasks as any)?.title || 'Deleted Task'}</TableCell>
                          <TableCell>
                            <Badge className={
                              sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                                sub.status === 'denied' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                            }>
                              {sub.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewDialog(sub)}
                              className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              View & Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="messages" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Inquiry Inbox</h2>
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="font-bold">From</TableHead>
                      <TableHead className="font-bold">Subject</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg) => (
                      <TableRow key={msg.id} className="hover:bg-secondary/10">
                        <TableCell className="font-medium">{msg.name}</TableCell>
                        <TableCell>{msg.subject}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(msg.created_at), 'PP')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleReplyDialog(msg)} className={`rounded-xl mr-1 ${msg.replied ? 'text-green-600' : 'text-blue-600'}`}>
                            <Mail className="w-4 h-4 mr-2" /> {msg.replied ? 'Viewed' : 'Reply'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleMessageDelete(msg.id)} className="text-destructive rounded-xl">
                            <Trash2 className="w-4 h-4 text-blue-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Platform Community</h2>
                  <p className="text-sm text-muted-foreground">{allUsers.length} total members registered</p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead className="text-right">Access Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u, index) => (
                      <TableRow key={u.id} className="hover:bg-secondary/10">
                        <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                        <TableCell className="text-blue-600">{u.email}</TableCell>
                        <TableCell className="text-center">
                          {u.total_points > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {u.total_points} XP
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No submissions</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!adminUsers.find(a => a.user_id === u.id) ? (
                              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handlePromoteToAdmin(u.id, u.email)}>
                                <Shield className="w-3.5 h-3.5 mr-2" /> Make Admin
                              </Button>
                            ) : (
                              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Team Admin</span>
                            )}
                            {supabaseAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive rounded-xl"
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                title="Delete this user permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="admins" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Privileged Team</h2>
                  <p className="text-sm text-muted-foreground">{adminUsers.length} active administrators</p>
                </div>
                {supabaseAdmin && (
                  <Button onClick={() => { setAdminForm({ email: '', password: '', role: 'admin' }); setAdminDialogOpen(true); }} className="rounded-xl">
                    <UserPlus className="w-4 h-4 mr-2" /> Create Admin
                  </Button>
                )}
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow><TableHead>Admin Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.email}</TableCell>
                        <TableCell><span className="capitalize text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">{a.role}</span></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-blue-600 rounded-xl" onClick={() => handleRemoveAdmin(a)}>
                            <ShieldOff className="w-4 h-4 mr-2" /> Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gradient">Live Attendance Log</h2>
                  <p className="text-sm text-muted-foreground">{eventRegistrations.filter(r => r.scanned_at).length} students checked in so far</p>
                </div>
                <Button variant="outline" className="rounded-xl" onClick={() => {
                  const headers = ["Name", "Roll Number", "Year", "Event", "Registered At", "Scanned At"];
                  const rows = eventRegistrations.map(r => [
                    r.full_name,
                    r.roll_number,
                    r.year,
                    r.events?.title || 'Unknown',
                    format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
                    r.scanned_at ? format(new Date(r.scanned_at), 'yyyy-MM-dd HH:mm') : 'Not Scanned'
                  ]);
                  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `attendance_${new Date().toISOString().split('T')[0]}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="font-bold">Student Name</TableHead>
                      <TableHead className="font-bold">Roll Number</TableHead>
                      <TableHead className="font-bold">Event</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold text-right">Scan Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventRegistrations.map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-secondary/5">
                        <TableCell className="font-medium">{reg.full_name}</TableCell>
                        <TableCell className="font-mono text-xs">{reg.roll_number}</TableCell>
                        <TableCell className="text-blue-600 font-medium">{reg.events?.title}</TableCell>
                        <TableCell>
                          {reg.scanned_at ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" /> Scanned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground font-mono">
                              Waiting...
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {reg.scanned_at ? format(new Date(reg.scanned_at), 'pp') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="qrscan" className="mt-0">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <QrCode className="w-8 h-8 text-blue-600" />
                  <h2 className="text-2xl font-bold">Check-in Terminal</h2>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg min-h-[350px] md:min-h-[450px] flex items-center justify-center relative">
                  {scannedQRResult ? (
                    <div className="p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${scannedQRResult.alreadyScanned ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {scannedQRResult.alreadyScanned ? <RefreshCw className="w-10 h-10" /> : <CheckCircle className="w-10 h-10" />}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black">{scannedQRResult.alreadyScanned ? 'Already Checked In' : 'Entry Verified!'}</h3>
                        <p className="text-muted-foreground text-lg font-medium">{scannedQRResult.attendee.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{scannedQRResult.event?.title || 'Unknown Event'}</p>
                      </div>
                      <div className="p-4 bg-secondary/30 rounded-xl text-left space-y-2 max-w-sm mx-auto">
                        <div className="flex justify-between text-sm"><span className="opacity-60">Roll Number:</span> <span>{scannedQRResult.attendee.profiles.email}</span></div>
                        <div className="flex justify-between text-sm"><span className="opacity-60">Year/Branch:</span> <span>{scannedQRResult.attendee.profiles.college}</span></div>
                        <div className="flex justify-between text-sm"><span className="opacity-60">Time:</span> <span>{format(new Date(), 'pp')}</span></div>
                      </div>
                      <Button className="w-full h-12 rounded-xl text-lg bg-blue-600 hover:bg-blue-500" onClick={() => { setScannedQRResult(null); setCameraScannerReady(true); }}>Scan Next Entry</Button>
                    </div>
                  ) : !cameraScannerReady ? (
                    <div className="p-8 text-center space-y-4 max-w-md mx-auto">
                      <Camera className="w-16 h-16 mx-auto text-blue-200" />
                      <h3 className="text-xl font-bold">Ready to Scan</h3>
                      <p className="text-muted-foreground">Verify event entries instantly with the QR scanner.</p>
                      {qrScanError && <p className="text-blue-500 text-sm font-medium bg-blue-50 p-3 rounded-lg border border-blue-100">{qrScanError}</p>}
                      <Button className="w-full h-12 rounded-xl text-lg bg-blue-600 shadow-lg shadow-blue-500/20 hover:bg-blue-500" onClick={() => { setQrScanError(''); setCameraScannerReady(true); }}>Activate Camera</Button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center">
                      <div id="qr-reader" className="w-full max-w-md aspect-square overflow-hidden bg-black shadow-inner relative">
                        {/* Visual overlay for the scan area */}
                        <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none z-10 flex items-center justify-center">
                          <div className="w-[220px] h-[220px] border-2 border-blue-500 rounded-2xl relative shadow-[0_0_0_max(100vh,100vw)_rgba(0,0,0,0.5)]">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -ml-1 -mt-1 rounded-tl-sm"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mr-1 -mt-1 rounded-tr-sm"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -ml-1 -mb-1 rounded-bl-sm"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mr-1 -mb-1 rounded-br-sm"></div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex gap-4 w-full justify-center bg-white border-t border-border z-20">
                        <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => setCameraScannerReady(false)}>
                          <XCircle className="w-4 h-4 mr-2" /> Stop
                        </Button>
                        <Button variant="ghost" className="rounded-xl h-12 px-8 text-blue-600" onClick={() => { setCameraScannerReady(false); setTimeout(() => setCameraScannerReady(true), 100); }}>
                          <RefreshCw className="w-4 h-4 mr-2" /> Reset
                        </Button>
                      </div>
                    </div>
                  )
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value="aicommand" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Bot className="w-8 h-8 text-blue-600" />
                  <h2 className="text-2xl font-bold">Robot AI Intelligence</h2>
                </div>
                <div className="bg-[#0f172a] rounded-2xl border border-blue-900/50 shadow-2xl overflow-hidden">
                  <div className="bg-[#1e293b] px-5 py-3 flex items-center gap-3 border-b border-blue-900/30">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-blue-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-sky-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-indigo-500/50"></div>
                    </div>
                    <span className="text-xs font-mono text-blue-300/70 tracking-widest uppercase">system_terminal_v2.0.4</span>
                  </div>
                  <div className="h-[400px] overflow-y-auto p-6 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-blue-900">
                    {aiOutput.map((out, i) => (
                      <div key={i} className={`mb-2`}>
                        <span className="opacity-50 mr-2 text-indigo-400">[{new Date().toLocaleTimeString()}]</span>
                        <span className="text-sky-400 mr-2">➜</span>
                        <span className={out.type === 'error' ? 'text-blue-300' : 'text-gradient brightness-125'}>{out.message}</span>
                      </div>
                    ))}
                    {isAiProcessing && (
                      <div className="flex items-center gap-2 text-sky-400 font-bold animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing data patterns...
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-[#1e293b]/50 border-t border-blue-900/30">
                    <div className="flex gap-3">
                      <Input
                        value={aiCommand}
                        onChange={(e) => setAiCommand(e.target.value)}
                        placeholder="Ask the Robot AI anything..."
                        className="bg-black/40 border-blue-900/40 text-blue-100 rounded-xl h-12"
                        onKeyDown={(e) => e.key === 'Enter' && processAICommand(aiCommand)}
                      />
                      <Button onClick={() => processAICommand(aiCommand)} className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-500">
                        <Send className="w-5 h-5 text-white" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            {/* Event Management Dialog */}
            <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
              <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEventSubmit} className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} required className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })} className="rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="rounded-xl min-h-[100px]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date & Time</Label>
                      <Input type="datetime-local" value={eventForm.datetime} onChange={e => setEventForm({ ...eventForm, datetime: e.target.value })} required className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input value={eventForm.image_url} onChange={e => setEventForm({ ...eventForm, image_url: e.target.value })} className="rounded-xl h-12" placeholder="https://..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEventDialogOpen(false)} className="rounded-xl h-12 px-8">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="rounded-xl h-12 px-8 min-w-[140px]">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingEvent ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Project Management Dialog */}
            <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
              <DialogContent className="sm:max-w-xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{editingProject ? 'Edit Project' : 'Showcase New Project'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleProjectSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Project Title</Label>
                    <Input value={projectForm.title} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} required className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} className="rounded-xl min-h-[100px]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GitHub URL</Label>
                      <Input value={projectForm.github_url} onChange={e => setProjectForm({ ...projectForm, github_url: e.target.value })} className="rounded-xl h-12" placeholder="https://github.com/..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Live Demo</Label>
                      <Input value={projectForm.demo_url} onChange={e => setProjectForm({ ...projectForm, demo_url: e.target.value })} className="rounded-xl h-12" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)} className="rounded-xl h-12 px-8">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="rounded-xl h-12 px-8 min-w-[140px]">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingProject ? 'Update' : 'Add Project')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Internship Management Dialog */}
            <Dialog open={internshipDialogOpen} onOpenChange={setInternshipDialogOpen}>
              <DialogContent className="sm:max-w-xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{editingInternship ? 'Edit Opportunity' : 'New Career Opportunity'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInternshipSubmit} className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={internshipForm.company} onChange={e => setInternshipForm({ ...internshipForm, company: e.target.value })} required className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role Title</Label>
                      <Input value={internshipForm.title} onChange={e => setInternshipForm({ ...internshipForm, title: e.target.value })} required className="rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Brief Description</Label>
                    <Textarea value={internshipForm.description} onChange={e => setInternshipForm({ ...internshipForm, description: e.target.value })} className="rounded-xl min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Application Link</Label>
                    <Input value={internshipForm.internship_link} onChange={e => setInternshipForm({ ...internshipForm, internship_link: e.target.value })} className="rounded-xl h-12" placeholder="https://..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setInternshipDialogOpen(false)} className="rounded-xl h-12 px-8">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="rounded-xl h-12 px-8 min-w-[140px]">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingInternship ? 'Update' : 'Post Now')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Poll Creation Dialog */}
            <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
              <DialogContent className="sm:max-w-xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-gradient">Create Community Poll</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePollSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Poll Inquiry / Question</Label>
                    <Input value={pollForm.question} onChange={e => setPollForm({ ...pollForm, question: e.target.value })} required className="rounded-xl h-12" placeholder="What kind of events do you want?" />
                  </div>
                  <div className="space-y-2">
                    <Label>Associated Event (ID)</Label>
                    <Input value={pollForm.event_id} onChange={e => setPollForm({ ...pollForm, event_id: e.target.value })} className="rounded-xl h-12" placeholder="uuid-of-event" />
                  </div>
                  <div className="space-y-2">
                    <Label>Poll Options (Choose carefully)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {pollForm.options.map((opt, idx) => (
                        <Input key={idx} value={opt} onChange={e => {
                          const newOpts = [...pollForm.options];
                          newOpts[idx] = e.target.value;
                          setPollForm({ ...pollForm, options: newOpts });
                        }} className="rounded-xl" placeholder={`Option ${idx + 1}`} />
                      ))}
                    </div>
                    <Button type="button" variant="ghost" onClick={() => setPollForm({ ...pollForm, options: [...pollForm.options, ''] })} className="text-xs text-blue-600 mt-2 hover:bg-blue-50">+ Add more options</Button>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setPollDialogOpen(false)} className="rounded-xl h-12 px-8">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="rounded-xl h-12 px-8 min-w-[140px]">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Launch Poll'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Social Link Dialog */}
            <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Social Ecosystem</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSocialSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input value={socialForm.platform} onChange={e => setSocialForm({ ...socialForm, platform: e.target.value })} required className="rounded-xl h-12" placeholder="Instagram, GitHub..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile URL</Label>
                    <Input value={socialForm.url} onChange={e => setSocialForm({ ...socialForm, url: e.target.value })} required className="rounded-xl h-12" placeholder="https://..." />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setSocialDialogOpen(false)} className="rounded-xl h-11 px-6">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="rounded-xl h-11 px-6">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingSocial ? 'Save Changes' : 'Add Account')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Admin Management Creation */}
            <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
              <DialogContent className="sm:max-w-md rounded-3xl p-8 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Secure Admin Config</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label>Identity (Email)</Label>
                    <Input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} required className="h-12 rounded-xl border-blue-100 focus:border-blue-300" />
                  </div>
                  <div className="space-y-2">
                    <Label>Security Token (Password)</Label>
                    <Input type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} required className="h-12 rounded-xl border-blue-100" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setAdminDialogOpen(false)} className="rounded-xl h-11">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="rounded-xl h-11 px-8 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-200">Enforce Policy</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Inquiry Reply Dialog */}
            <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
              <DialogContent className="sm:max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Compose Response</DialogTitle>
                </DialogHeader>
                {selectedMessage && (
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Incoming Message:</p>
                      <p className="text-sm italic">"{selectedMessage.message}"</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Administrator Response</Label>
                      <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} className="min-h-[150px] rounded-xl" placeholder="Type your response here..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => setReplyDialogOpen(false)} className="rounded-xl">Close</Button>
                      <Button onClick={handleReplySubmit} disabled={isSaving} className="rounded-xl bg-blue-600 hover:bg-blue-500">Send Response</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Task Management Dialog */}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogContent className="sm:max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{editingTask ? 'Modify Challenge' : 'Initialize New Challenge'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Task Title</Label>
                    <Input value={taskForm.title} onChange={e => setEventTaskForm({ ...taskForm, title: e.target.value })} required className="rounded-xl h-12" placeholder="e.g., Implement Linked List" />
                  </div>
                  <div className="space-y-2">
                    <Label>Points (XP)</Label>
                    <Input type="number" value={taskForm.points} onChange={e => setEventTaskForm({ ...taskForm, points: parseInt(e.target.value) })} required className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Detailed Description</Label>
                    <Textarea value={taskForm.description} onChange={e => setEventTaskForm({ ...taskForm, description: e.target.value })} className="rounded-xl min-h-[150px]" placeholder="Explain the requirements..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setTaskDialogOpen(false)} className="rounded-xl h-12 px-8">Cancel</Button>
                    <Button onClick={saveTask} disabled={isSaving} className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingTask ? 'Synchronize' : 'Broadcast')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Submission Review Dialog */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
              <DialogContent className="sm:max-w-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-blue-700">Review Protocol</DialogTitle>
                </DialogHeader>
                {selectedSubmission && (
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-secondary/20 rounded-xl border border-border">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Student Node</p>
                        <p className="font-bold">{(selectedSubmission.profiles as any)?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedSubmission.profiles as any)?.email}</p>
                        <p className="text-xs font-bold text-blue-600 mt-2">Total Points: {(selectedSubmission as any).total_user_points || 0}</p>
                        {/* Registration Details */}
                        {((selectedSubmission.profiles as any)?.year || (selectedSubmission.profiles as any)?.department) && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Registration Details</p>
                            {(selectedSubmission.profiles as any)?.year && <p className="text-xs">📚 {(selectedSubmission.profiles as any)?.year}</p>}
                            {(selectedSubmission.profiles as any)?.section && <p className="text-xs">Section: {(selectedSubmission.profiles as any)?.section}</p>}
                            {(selectedSubmission.profiles as any)?.department && <p className="text-xs">🏛️ {(selectedSubmission.profiles as any)?.department}</p>}
                            {(selectedSubmission.profiles as any)?.college && <p className="text-xs">🎓 {(selectedSubmission.profiles as any)?.college}</p>}
                            {(selectedSubmission.profiles as any)?.phone && <p className="text-xs">📱 {(selectedSubmission.profiles as any)?.phone}</p>}
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-secondary/20 rounded-xl border border-border">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Target Challenge</p>
                        <p className="font-bold">{(selectedSubmission.coding_tasks as any)?.title}</p>
                        <p className="text-xs text-muted-foreground">Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student's Solution</Label>
                      <div className="p-6 bg-slate-950 text-emerald-400 font-mono text-sm rounded-2xl border border-white/5 overflow-auto max-h-[300px] whitespace-pre-wrap">
                        {selectedSubmission.answer}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={deleteSubmission}
                          disabled={isSaving}
                          className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 h-12 px-4"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Answer
                        </Button>
                        <p className="text-xs text-muted-foreground italic self-center">Decision finalizes the score synchronization for this node.</p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => reviewSubmission('denied')}
                          disabled={isSaving}
                          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-12 px-6"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Deny Access
                        </Button>
                        <Button
                          onClick={() => reviewSubmission('approved')}
                          disabled={isSaving}
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-white h-12 px-6"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve & Sync
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

          </Tabs>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;


