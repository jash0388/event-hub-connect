import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DATANAUTS_APPS,
  DATANAUTS_CATEGORIES,
  type DatanautsApp
} from '@/data/datanauts-apps';
import {
  listStudentFiles,
  deleteStudentFile,
  downloadStudentFile,
  setActiveRollNumber,
  formatBytes,
  type StudentFile
} from '@/lib/datanauts-storage';
import {
  LayoutGrid,
  FileText,
  Palette,
  Cpu,
  CheckSquare,
  MessageSquare,
  Briefcase,
  Terminal,
  Gamepad2,
  Presentation,
  Table,
  PenTool,
  BookOpen,
  FileCheck,
  Database,
  Image as ImageIcon,
  Video,
  Mic,
  Music,
  Box,
  Zap,
  Home,
  Clock,
  Mail,
  Users,
  Calendar,
  Calculator,
  Receipt,
  CreditCard,
  PieChart,
  BarChart3,
  HelpCircle,
  Store,
  Package,
  HardDrive,
  UserPlus,
  HeartHandshake,
  Wrench,
  Scale,
  Truck,
  Building2,
  Code,
  Crown,
  Sparkles,
  Search,
  Download,
  Trash2,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  User,
  RefreshCw,
  X,
  Maximize,
  Minimize,
  FolderOpen,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic icon mapping for all apps
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid, FileText, Palette, Cpu, CheckSquare, MessageSquare, Briefcase,
  Terminal, Gamepad2, Presentation, Table, PenTool, BookOpen, FileCheck,
  Database, Image: ImageIcon, Video, Mic, Music, Box, Zap, Home, Clock,
  Mail, Users, Calendar, Calculator, Receipt, CreditCard, PieChart, BarChart3,
  HelpCircle, Store, Package, HardDrive, UserPlus, HeartHandshake, Wrench,
  Scale, Truck, Building2, Code, Crown, Sparkles, Folder: FolderOpen
};

// Apple-calibrated spring physics (critically damped, zero latency, fluid interruptibility)
const appleSpring = {
  type: 'spring',
  damping: 24,
  stiffness: 280,
  mass: 0.8
};

export default function DatanautsStudio() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentApp, setCurrentApp] = useState<DatanautsApp | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'apps' | 'my-files'>('apps');

  // Student Roll Number & Isolation State
  const [activeRoll, setActiveRoll] = useState<string>(() => {
    try {
      const student = JSON.parse(localStorage.getItem('studentInfo') || '{}');
      if (student?.roll_number) return student.roll_number.trim().toUpperCase();
      return localStorage.getItem('datanauts_active_roll') || '21B81A0501';
    } catch {
      return '21B81A0501';
    }
  });

  const [studentName, setStudentName] = useState<string>(() => {
    try {
      const student = JSON.parse(localStorage.getItem('studentInfo') || '{}');
      return student?.full_name || `Student ${activeRoll}`;
    } catch {
      return `Student ${activeRoll}`;
    }
  });

  // Roll Number Switch Modal
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [newRollInput, setNewRollInput] = useState('');

  // Student Documents from Multi-Tenant Engine
  const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Load user files whenever activeRoll changes
  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listStudentFiles(activeRoll);
      setStudentFiles(files);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadFiles();

    // Listen for file-saved events from inside embedded apps
    const handleFileSaved = () => {
      loadFiles();
      toast({
        title: "File Auto-Saved",
        description: `Saved securely under Roll Number: ${activeRoll}`,
      });
    };

    window.addEventListener('datanauts:file-saved', handleFileSaved);
    window.addEventListener('datanauts:storage-updated', loadFiles);

    return () => {
      window.removeEventListener('datanauts:file-saved', handleFileSaved);
      window.removeEventListener('datanauts:storage-updated', loadFiles);
    };
  }, [activeRoll]);

  // Handle URL deep linking (e.g. ?app=slides)
  useEffect(() => {
    const appId = searchParams.get('app');
    if (appId) {
      const found = DATANAUTS_APPS.find((a) => a.id === appId);
      if (found) setCurrentApp(found);
    }
  }, [searchParams]);

  // Handle Account Switching with complete isolation
  const handleSwitchRoll = () => {
    if (!newRollInput.trim()) {
      toast({ title: "Roll Number Required", description: "Please enter a valid roll number.", variant: "destructive" });
      return;
    }
    const cleanRoll = newRollInput.trim().toUpperCase();
    setActiveRollNumber(cleanRoll);
    setActiveRoll(cleanRoll);
    setStudentName(`Student ${cleanRoll}`);
    setShowSwitchModal(false);
    setNewRollInput('');
    toast({
      title: "Workspace Switched",
      description: `Active workspace is now strictly isolated for ${cleanRoll}.`,
    });
  };

  // Launch App
  const launchApp = (app: DatanautsApp) => {
    setCurrentApp(app);
    setSearchParams({ app: app.id });
  };

  // Close App
  const closeApp = () => {
    setCurrentApp(null);
    setSearchParams({});
    loadFiles();
  };

  // Delete File
  const handleDeleteFile = async (e: React.MouseEvent, file: StudentFile) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      await deleteStudentFile(file.id);
      loadFiles();
      toast({ title: "File Deleted", description: `Removed ${file.name} from your storage.` });
    }
  };

  // Download File
  const handleDownloadFile = async (e: React.MouseEvent, file: StudentFile) => {
    e.stopPropagation();
    try {
      await downloadStudentFile(file.id, file.name);
      toast({ title: "Download Started", description: file.name });
    } catch {
      toast({ title: "Download Failed", description: "Could not retrieve file content.", variant: "destructive" });
    }
  };

  // Filtered Apps
  const filteredApps = useMemo(() => {
    return DATANAUTS_APPS.filter((app) => {
      const matchesCategory = activeCategory === 'all' || app.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.alternativeTo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Total Storage calculation
  const totalStorageBytes = useMemo(() => {
    return studentFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [studentFiles]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* --- APPLE TRANSLUCENT TOPBAR (BLUR + LIGHT RIM) --- */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-slate-950/70 border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 group active:scale-[0.97] transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  DATANAUTS <span className="text-cyan-400 font-medium">STUDIO</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">ACADEMIC & CREATIVE SUITE</span>
              </div>
            </button>

            <span className="text-slate-600 hidden sm:inline">/</span>

            {/* Apple Segmented View Switcher */}
            <div className="hidden md:flex items-center bg-white/[0.04] p-1 rounded-full ring-1 ring-white/10 shadow-inner">
              <button
                onClick={() => setActiveTab('apps')}
                className={`px-3.5 py-1 text-xs font-medium rounded-full active:scale-[0.97] transition-all ${
                  activeTab === 'apps'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Applications ({DATANAUTS_APPS.length})
              </button>
              <button
                onClick={() => setActiveTab('my-files')}
                className={`px-3.5 py-1 text-xs font-medium rounded-full active:scale-[0.97] transition-all flex items-center gap-1.5 ${
                  activeTab === 'my-files'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Cloud Files
                {studentFiles.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                    {studentFiles.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Student Roll Number Badge (Multi-Tenant Isolation) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl px-3.5 py-1.5 transition-all shadow-inner">
              <div className="relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 font-mono leading-none">
                  ISOLATED ACCOUNT
                </span>
                <span className="text-xs font-bold text-white font-mono tracking-wide">
                  {activeRoll}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSwitchModal(true)}
                className="h-6 px-2 text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 rounded-lg ml-1 active:scale-[0.95]"
              >
                Switch
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/feed')}
              className="hidden lg:flex border-white/10 hover:bg-white/5 text-slate-300 text-xs rounded-xl active:scale-[0.97]"
            >
              Back to Campus
            </Button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HERO BANNER WITH OPTICAL TYPOGRAPHY */}
        <div className="relative rounded-3xl overflow-hidden p-8 md:p-12 mb-10 border border-white/10 border-t-white/20 bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-purple-950/40 backdrop-blur-xl shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.18),rgba(255,255,255,0))]" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Strict Roll Number Privacy Active
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-[1.1] text-white mb-4">
              Everything in One Place. <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">
                Free for Every Datanauts Student.
              </span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-6 font-normal">
              Create real PowerPoint presentations, Word documents, Excel spreadsheets, whiteboard diagrams, and notes. All files are permanently saved to your personal account ID ({activeRoll}).
            </p>

            {/* Quick Stats Strip */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 pt-3 border-t border-white/10 font-mono">
              <div>
                <span className="text-white font-bold text-base">{DATANAUTS_APPS.length}</span> Built-in Apps
              </div>
              <div>•</div>
              <div>
                <span className="text-white font-bold text-base">{studentFiles.length}</span> Your Cloud Files
              </div>
              <div>•</div>
              <div>
                <span className="text-white font-bold text-base">{formatBytes(totalStorageBytes)}</span> Used
              </div>
            </div>
          </div>
        </div>

        {/* --- VIEW 1: MY CLOUD FILES --- */}
        {activeTab === 'my-files' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">My Cloud Documents</h2>
                <p className="text-sm text-slate-400">
                  Files stored privately under Roll Number: <span className="font-mono text-cyan-400">{activeRoll}</span>
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('apps')}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs gap-1.5 active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" /> Create New File
              </Button>
            </div>

            {isLoadingFiles ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
                <p>Loading your cloud storage...</p>
              </div>
            ) : studentFiles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center bg-white/[0.02]">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-white mb-1">No Documents Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Launch Datanauts Slides, Docs, Sheets, or Whiteboard to start working. All changes save automatically to your Roll Number account.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={() => launchApp(DATANAUTS_APPS[0])}
                    className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs active:scale-[0.97]"
                  >
                    New Presentation (.pptx)
                  </Button>
                  <Button
                    onClick={() => launchApp(DATANAUTS_APPS[1])}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs active:scale-[0.97]"
                  >
                    New Document (.docx)
                  </Button>
                  <Button
                    onClick={() => launchApp(DATANAUTS_APPS[2])}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs active:scale-[0.97]"
                  >
                    New Spreadsheet (.xlsx)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={appleSpring}
                    className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/40 p-5 transition-all duration-300 shadow-lg flex flex-col justify-between active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center ring-1 ring-white/15">
                        <FileText className="w-5 h-5 text-cyan-400" />
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-white/15 text-slate-400">
                        {file.type}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white text-base truncate mb-1" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mb-4">
                        {formatBytes(file.size)} • {new Date(file.updatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDownloadFile(e, file)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg active:scale-[0.93]"
                          title="Download Local Copy"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteFile(e, file)}
                          className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg active:scale-[0.93]"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          const appToOpen =
                            file.type === 'presentation'
                              ? DATANAUTS_APPS[0]
                              : file.type === 'document'
                              ? DATANAUTS_APPS[1]
                              : file.type === 'spreadsheet'
                              ? DATANAUTS_APPS[2]
                              : file.type === 'whiteboard'
                              ? DATANAUTS_APPS[3]
                              : DATANAUTS_APPS[4];
                          launchApp(appToOpen);
                        }}
                        className="h-8 px-3 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg active:scale-[0.95]"
                      >
                        Open
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* --- VIEW 2: ALL APPS CATALOG --- */}
        {activeTab === 'apps' && (
          <section className="space-y-6">
            {/* Search and Category Control Pills */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Category Segmented Control with Apple Pill Styling */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                {DATANAUTS_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap active:scale-[0.96] transition-all ${
                      activeCategory === cat.id
                        ? 'bg-white text-black shadow-md font-semibold'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] ring-1 ring-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search apps or alternatives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/[0.04] border-white/10 text-white text-xs rounded-full focus-visible:ring-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white active:scale-[0.9]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Apps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredApps.map((app) => {
                const IconComponent = ICON_MAP[app.iconName] || LayoutGrid;

                return (
                  <motion.div
                    key={app.id}
                    whileHover={{ y: -4 }}
                    transition={appleSpring}
                    className="group relative rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/40 border-t-white/15 p-6 flex flex-col justify-between transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-md active:scale-[0.99]"
                  >
                    {/* Top Corner Glow on hover */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />

                    <div>
                      {/* App Icon Container */}
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${app.gradient} flex items-center justify-center shadow-lg ring-1 ring-white/30 group-hover:scale-105 transition-transform`}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        {app.badge && (
                          <Badge className="bg-white/10 hover:bg-white/15 text-white text-[10px] font-mono border-white/15">
                            {app.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-bold text-lg text-white mb-1 tracking-tight group-hover:text-cyan-300 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-[11px] text-cyan-400 font-medium mb-2.5">
                        Alternative to {app.alternativeTo}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed mb-6 font-normal">
                        {app.description}
                      </p>
                    </div>

                    {/* Launch Button */}
                    <Button
                      onClick={() => launchApp(app)}
                      className="w-full bg-white/[0.08] hover:bg-blue-600 text-white rounded-2xl text-xs font-semibold py-2.5 transition-all duration-200 border border-white/10 group-hover:border-transparent flex items-center justify-center gap-2 active:scale-[0.97]"
                    >
                      <span>Open {app.shortName}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* --- IN-APP FULLSCREEN RUNNER MODAL (APPLE NOTCH / FLOATING ISLAND) --- */}
      <AnimatePresence>
        {currentApp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={appleSpring}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col"
          >
            {/* Top Apple Floating Island Toolbar */}
            <div className="h-14 bg-slate-950/80 border-b border-white/10 border-t border-white/20 px-4 flex items-center justify-between">
              {/* Back & App Info */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeApp}
                  className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl gap-1 text-xs px-2.5 active:scale-[0.96]"
                >
                  <ArrowLeft className="w-4 h-4" /> Studio
                </Button>

                <div className="h-4 w-[1px] bg-white/20" />

                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${currentApp.gradient} flex items-center justify-center ring-1 ring-white/30`}>
                    {React.createElement(ICON_MAP[currentApp.iconName] || LayoutGrid, {
                      className: 'w-3.5 h-3.5 text-white'
                    })}
                  </div>
                  <span className="font-bold text-sm text-white tracking-tight">{currentApp.name}</span>
                </div>
              </div>

              {/* Status Indicator (Multi-Tenant Guarantee) */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Saving to:</span>
                <span className="font-mono text-white font-semibold">{activeRoll}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8 p-0 active:scale-[0.93]"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeApp}
                  className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8 p-0 active:scale-[0.93]"
                  title="Close App"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Application Iframe Viewport with dynamic Roll Number parameter */}
            <div className="flex-1 w-full h-full bg-black relative">
              <iframe
                src={`${currentApp.embedPath}?roll=${encodeURIComponent(activeRoll)}`}
                title={currentApp.name}
                className="w-full h-full border-0"
                allow="camera; microphone; clipboard-read; clipboard-write; fullscreen; display-capture"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SWITCH ROLL NUMBER MODAL (APPLE DIALOG) --- */}
      <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
        <DialogContent className="bg-slate-900 border border-white/10 border-t-white/20 text-white rounded-3xl max-w-md shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 tracking-tight">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Switch Student Account
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs leading-relaxed">
              Every roll number has a 100% isolated, private database space. Documents created under one roll number are completely hidden from any other student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                ENTER YOUR ROLL NUMBER / STUDENT ID
              </label>
              <Input
                type="text"
                placeholder="e.g. 21B81A0501"
                value={newRollInput}
                onChange={(e) => setNewRollInput(e.target.value.toUpperCase())}
                className="bg-white/5 border-white/10 text-white font-mono text-base uppercase tracking-wider rounded-xl focus-visible:ring-cyan-500"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Active Account: {activeRoll}</p>
              <p>Switching accounts will instantly load your personal documents and settings.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowSwitchModal(false)}
              className="text-slate-400 hover:text-white rounded-xl text-xs active:scale-[0.96]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwitchRoll}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs px-5 font-semibold active:scale-[0.96]"
            >
              Confirm Switch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
