
import React, { useState, useEffect } from 'react';
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
import { motion } from 'framer-motion';
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
  const [userProfileDialogOpen, setUserProfileDialogOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
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
      const activeMessages = (data || []).filter(msg => msg.message !== '[DELETED]');
      setMessages(activeMessages);
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
      // Fetch all user roles directly but filter specifically for admins
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .in('role', ['admin'])
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch profiles manually to map emails correctly
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      // Map to include profiles details safely
      const adminsWithDetails = (rolesData || []).map((role: any) => {
        const profile = profilesData?.find(p => p.id === role.user_id);
        const isAdminHardcoded = ['jashwanthsingh0707@gmail.com', 'jashwanth038@gmail.com'].includes((profile?.email || '').toLowerCase());

        return {
          id: role.id,
          // If the profile email matches root, strictly mark as super_admin computationally
          email: profile?.email || profile?.full_name || role.user_id,
          role: isAdminHardcoded ? 'super_admin' : role.role,
          created_at: role.created_at,
          user_id: role.user_id,
        };
      });

      // Add hardcoded super admins if they aren't already fetched
      const hardcodedAdmins = ['jashwanthsingh0707@gmail.com', 'jashwanth038@gmail.com'];
      hardcodedAdmins.forEach(email => {
        if (!adminsWithDetails.find(a => (a.email || '').toLowerCase() === email.toLowerCase())) {
          adminsWithDetails.push({
            id: 'root-' + email,
            email: email,
            role: 'super_admin',
            created_at: new Date().toISOString(),
            user_id: 'root'
          });
        }
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

      // Fetch user registrations to catch Firebase users who might not be in profiles
      const { data: userRegistrations } = await supabase
        .from('user_registrations')
        .select('*');

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

      // Merge profiles and user_registrations uniquely
      const allUniqueUsersMap = new Map();

      // Add from profiles
      (profilesData || []).forEach((p: any) => {
        allUniqueUsersMap.set(p.id, {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          firebase_uid: p.firebase_uid,
          is_firebase_user: p.is_firebase_user
        });
      });

      // Add from registrations if missing
      (userRegistrations || []).forEach((r: any) => {
        if (!allUniqueUsersMap.has(r.user_id)) {
          allUniqueUsersMap.set(r.user_id, {
            id: r.user_id,
            full_name: r.full_name || r.email?.split('@')[0],
            email: r.email,
            firebase_uid: r.user_id,
            is_firebase_user: true
          });
        }
      });

      // Add points to each unified user
      const unifiedUsers = Array.from(allUniqueUsersMap.values());

      const usersWithPoints = unifiedUsers.map((user: any) => ({
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
      // Search precisely for the specified email in the already fetched user grid
      const targetUser = allUsers.find(u => u.email === adminForm.email);

      if (!targetUser) {
        toast({
          title: "User Not Found",
          description: "No registered user found with that email. The user must sign in to the platform at least once.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // First check if user already has a role
      const { data: existingRole, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Add role to user_roles table
      let roleError = null;
      if (existingRole) {
        const result = await supabase
          .from('user_roles')
          .update({ role: adminForm.role })
          .eq('user_id', targetUser.id);
        roleError = result.error;
      } else {
        const result = await supabase
          .from('user_roles')
          .insert([{ user_id: targetUser.id, role: adminForm.role }]);
        roleError = result.error;
      }

      if (roleError) throw roleError;

      toast({ title: "Success", description: `${targetUser.email} has been promoted to ${adminForm.role}` });
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
    try {
      // Remove from user_roles table
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminUser.id);

      if (error) throw error;

      toast({ title: "Success", description: "Admin privileges have been revoked." });
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

  const handleLogout = () => {
    // Fire and forget - never await this, otherwise stale tokens will freeze the UI
    signOut().catch(e => console.warn("Background logout error:", e));

    // Visually logout instantly while backend processes
    localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL + '-auth-token');
    window.location.href = '/';
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
    try {
      const { error } = await supabase.from('contact_messages').update({ message: '[DELETED]' }).eq('id', id);
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

  // Compute live stats for header
  const pendingCount = taskSubmissions.filter(s => s.status === 'pending').length;
  const approvedCount = taskSubmissions.filter(s => s.status === 'approved').length;
  const totalUsersCount = allUsers.length;
  const totalEventsCount = events.length;

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Admin Header - Clean & Compact */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                  <p className="text-slate-500 text-sm">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => fetchAllData()} variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-10 px-5">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button onClick={handleLogout} variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-10 px-5">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Users', value: totalUsersCount, icon: Users, color: 'bg-blue-500' },
                { label: 'Events', value: totalEventsCount, icon: Calendar, color: 'bg-violet-500' },
                { label: 'Pending', value: pendingCount, icon: FileText, color: 'bg-amber-500' },
                { label: 'Approved', value: approvedCount, icon: CheckCircle, color: 'bg-emerald-500' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className={`w-9 h-9 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <div className="overflow-x-auto no-scrollbar -mx-6 px-6">
              <TabsList className="inline-flex gap-1 bg-transparent p-0 h-auto">
                {[
                  { value: 'events', label: 'Events' },
                  { value: 'projects', label: 'Projects' },
                  { value: 'internships', label: 'Internships' },
                  { value: 'social', label: 'Social' },
                  { value: 'submissions', label: 'Reviews' },
                  { value: 'tasks', label: 'Tasks' },
                  { value: 'users', label: 'Users' },
                  { value: 'admins', label: 'Admins' },
                  { value: 'qrscan', label: 'QR Scan' },
                  { value: 'attendance', label: 'Attendance' },
                  { value: 'messages', label: 'Messages' },
                ].map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all whitespace-nowrap">
                    {tab.label}
                  </TabsTrigger>
                ))}
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

            <TabsContent value="tasks" className="mt-0">
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
            </TabsContent>

            <TabsContent value="submissions" className="mt-0">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Code Reviews</h2>
                    <p className="text-sm text-slate-500">Review student solutions and award points.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />{pendingCount} Pending</span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold"><span className="w-2 h-2 rounded-full bg-green-400" />{approvedCount} Approved</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-600">Student</TableHead>
                        <TableHead className="font-semibold text-slate-600">Challenge</TableHead>
                        <TableHead className="font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taskSubmissions.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-16 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />No submissions yet.</TableCell></TableRow>
                      ) : taskSubmissions.map((sub, idx) => {
                        const name = (sub.profiles as any)?.full_name || 'Unknown';
                        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                        const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
                        return (
                        <TableRow key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 ${colors[idx % colors.length]} rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm`}>{initials}</div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{name}</p>
                                <p className="text-xs text-slate-400">{(sub.profiles as any)?.email || sub.user_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 font-medium max-w-[300px] truncate">{(sub.coding_tasks as any)?.title || 'Deleted Task'}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              sub.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                              sub.status === 'denied' ? 'bg-red-50 text-red-600 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'approved' ? 'bg-green-500' : sub.status === 'denied' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              {sub.status === 'approved' ? 'Approved' : sub.status === 'denied' ? 'Rejected' : 'Pending'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewDialog(sub)}
                              className="rounded-xl border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors text-xs h-8 px-3"
                            >
                              Review →
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                              onClick={() => { setSelectedUserProfile(u); setUserProfileDialogOpen(true); }}
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-2" /> View Profile
                            </Button>
                            {adminUsers.find(a => a.user_id === u.id) && (
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
                <Button onClick={() => { setAdminForm({ email: '', password: '', role: 'admin' }); setAdminDialogOpen(true); }} className="rounded-xl">
                  <UserPlus className="w-4 h-4 mr-2" /> Validate & Add Admin
                </Button>
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
                          {a.role !== 'super_admin' ? (
                            <Button variant="ghost" size="sm" className="text-blue-600 rounded-xl" onClick={() => handleRemoveAdmin(a)}>
                              <ShieldOff className="w-4 h-4 mr-2" /> Revoke
                            </Button>
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground mr-4 border border-border px-2 py-1 rounded-md">Permanent</span>
                          )}
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

            {/* AI Command Center Removed */}
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
                  <div className="flex justify-end gap-3 pt-6 border-t border-border mt-4">
                    <Button type="button" variant="ghost" onClick={() => setAdminDialogOpen(false)} className="rounded-xl h-11">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="rounded-xl h-11 px-8 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-200">Promote to Admin</Button>
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

            {/* Submission Review Dialog - Premium */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
              <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                {/* Dialog Header with gradient */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center"><FileText className="w-4 h-4 text-indigo-300" /></div>
                      Submission Review
                    </DialogTitle>
                  </DialogHeader>
                </div>
                {selectedSubmission && (
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Student</p>
                        <p className="font-bold text-slate-900">{(selectedSubmission.profiles as any)?.full_name}</p>
                        <p className="text-xs text-slate-500">{(selectedSubmission.profiles as any)?.email}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold">{(selectedSubmission as any).total_user_points || 0} XP Total</span>
                        </div>
                        {((selectedSubmission.profiles as any)?.year || (selectedSubmission.profiles as any)?.department) && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                            {(selectedSubmission.profiles as any)?.year && <p className="text-xs text-slate-500">📚 {(selectedSubmission.profiles as any)?.year}</p>}
                            {(selectedSubmission.profiles as any)?.section && <p className="text-xs text-slate-500">Section: {(selectedSubmission.profiles as any)?.section}</p>}
                            {(selectedSubmission.profiles as any)?.department && <p className="text-xs text-slate-500">🏛️ {(selectedSubmission.profiles as any)?.department}</p>}
                            {(selectedSubmission.profiles as any)?.college && <p className="text-xs text-slate-500">🎓 {(selectedSubmission.profiles as any)?.college}</p>}
                            {(selectedSubmission.profiles as any)?.phone && <p className="text-xs text-slate-500">📱 {(selectedSubmission.profiles as any)?.phone}</p>}
                          </div>
                        )}
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Challenge</p>
                        <p className="font-bold text-slate-900">{(selectedSubmission.coding_tasks as any)?.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Solution Code</p>
                      <div className="p-5 bg-[#0d1117] text-[#7ee787] font-mono text-sm rounded-2xl border border-[#30363d] overflow-auto max-h-[280px] whitespace-pre-wrap leading-relaxed">
                        {selectedSubmission.answer}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <Button variant="ghost" onClick={deleteSubmission} disabled={isSaving} className="rounded-xl text-red-500 hover:bg-red-50 h-10 px-4 text-sm">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                      </Button>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => reviewSubmission('denied')} disabled={isSaving} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-10 px-5 text-sm">
                          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                        </Button>
                        <Button onClick={() => reviewSubmission('approved')} disabled={isSaving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 text-sm shadow-lg shadow-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* User Profile Dialog */}
            <Dialog open={userProfileDialogOpen} onOpenChange={setUserProfileDialogOpen}>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-background">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="w-5 h-5" />
                    </div>
                    Student Profile
                  </DialogTitle>
                </DialogHeader>
                {selectedUserProfile && (
                  <div className="space-y-6 mt-4">
                    {/* Basic Info Card */}
                    <div className="bg-secondary/20 border border-border rounded-2xl p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Identity Details</p>
                          <h3 className="text-xl font-bold text-foreground">{selectedUserProfile.full_name || 'Anonymous User'}</h3>
                          <p className="text-blue-600 font-medium mb-1">{selectedUserProfile.email}</p>

                          {/* Login Provider Badge */}
                          {selectedUserProfile.is_firebase_user ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 mt-2">
                              Google Authenticated (Firebase)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mt-2">
                              Native Secure Login (Supabase)
                            </span>
                          )}
                        </div>
                        <div className="md:text-right">
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Performance Matrix</p>
                          <div className="inline-flex flex-col items-center md:items-end">
                            <span className="text-3xl font-black text-blue-600">{selectedUserProfile.total_points || 0}</span>
                            <span className="text-xs text-muted-foreground font-bold">TOTAL XP SECURED</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Task Submissions History */}
                    <div>
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Terminal className="w-5 h-5" /> Challenge Submissions History
                      </h4>
                      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        {taskSubmissions.filter(s => s.user_id === selectedUserProfile.id || s.user_id === selectedUserProfile.firebase_uid).length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            No coding challenges submitted by this student yet.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader className="bg-secondary/30">
                              <TableRow>
                                <TableHead>Challenge Name</TableHead>
                                <TableHead>Submitted At</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Points Array</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {taskSubmissions
                                .filter(s => s.user_id === selectedUserProfile.id || s.user_id === selectedUserProfile.firebase_uid)
                                .map((sub: any) => (
                                  <React.Fragment key={sub.id}>
                                    <TableRow>
                                      <TableCell className="font-bold">{sub.coding_tasks?.title || 'Unknown Task'}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{format(new Date(sub.submitted_at), 'PP p')}</TableCell>
                                      <TableCell>
                                        {sub.status === 'approved' && <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-bold">Approved</span>}
                                        {sub.status === 'pending' && <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md text-xs font-bold">Pending Review</span>}
                                        {sub.status === 'denied' && <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-md text-xs font-bold">Denied</span>}
                                      </TableCell>
                                      <TableCell className="text-right font-mono font-bold text-blue-600">+{sub.points_awarded || 0}</TableCell>
                                    </TableRow>
                                    {sub.answer && (
                                      <TableRow className="bg-slate-50 border-none">
                                        <TableCell colSpan={4} className="py-0">
                                          <div className="p-4 mb-4 bg-slate-900 rounded-xl overflow-x-auto">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Submitted Answer Code</p>
                                            <pre className="text-xs text-emerald-400 font-mono">
                                              {sub.answer}
                                            </pre>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                ))}
                            </TableBody>
                          </Table>
                        )}
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


