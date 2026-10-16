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
  ShieldCheck,
  RefreshCw,
  X,
  Maximize,
  Minimize,
  FolderOpen,
  Plus,
  ChevronRight
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
      return localStorage.getItem('datanauts_active_roll') || '24N81A6758';
    } catch {
      return '24N81A6758';
    }
  });

  const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [newRollInput, setNewRollInput] = useState('');

  // Handle URL deep-linking (?app=slides)
  useEffect(() => {
    const requestedAppId = searchParams.get('app');
    if (requestedAppId) {
      const app = DATANAUTS_APPS.find((a) => a.id === requestedAppId);
      if (app) setCurrentApp(app);
    }
  }, [searchParams]);

  // Load user files from the multi-tenant database bridge
  const loadFiles = async (roll: string) => {
    setIsLoadingFiles(true);
    try {
      const files = await listStudentFiles(roll);
      setStudentFiles(files);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadFiles(activeRoll);
  }, [activeRoll]);

  // Switch student account with complete data isolation
  const handleSwitchRoll = () => {
    const cleaned = newRollInput.trim().toUpperCase();
    if (!cleaned) {
      toast({
        title: 'Roll Number Required',
        description: 'Please enter a valid student roll number.',
        variant: 'destructive'
      });
      return;
    }

    setActiveRollNumber(cleaned);
    setActiveRoll(cleaned);
    setShowSwitchModal(false);
    setNewRollInput('');

    toast({
      title: 'Switched Student Space',
      description: `Active workspace isolated for Roll No: ${cleaned}`
    });
  };

  // Launch application
  const launchApp = (app: DatanautsApp) => {
    setCurrentApp(app);
    setSearchParams({ app: app.id });
  };

  const closeApp = () => {
    setCurrentApp(null);
    setSearchParams({});
    loadFiles(activeRoll);
  };

  // Filter apps
  const filteredApps = useMemo(() => {
    return DATANAUTS_APPS.filter((app) => {
      const matchesCategory =
        activeCategory === 'all' || app.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.alternativeTo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const totalStorageBytes = useMemo(() => {
    return studentFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [studentFiles]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',Helvetica,Arial,sans-serif] selection:bg-[#0071E3] selection:text-white">
      {/* --- APPLE TRANSLUCENT TOPBAR --- */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/80 border-b border-black/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 group active:scale-[0.97] transition-transform"
            >
              <div className="w-8 h-8 rounded-[22%] bg-gradient-to-tr from-[#0071E3] to-[#47A3F3] flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-sm tracking-tight text-[#1D1D1F]">
                  Datanauts <span className="text-[#0071E3]">Studio</span>
                </span>
                <span className="text-[10px] text-[#86868B] font-medium tracking-wide">Productivity Suite</span>
              </div>
            </button>

            <span className="text-black/10 hidden sm:inline">/</span>

            {/* Apple Segmented Capsule Control */}
            <div className="hidden md:flex items-center bg-[#E8E8ED] p-0.5 rounded-full border border-black/[0.04]">
              <button
                onClick={() => setActiveTab('apps')}
                className={`px-3.5 py-1 text-xs font-medium rounded-full active:scale-[0.97] transition-all ${
                  activeTab === 'apps'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-semibold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                All Apps ({DATANAUTS_APPS.length})
              </button>
              <button
                onClick={() => setActiveTab('my-files')}
                className={`px-3.5 py-1 text-xs font-medium rounded-full active:scale-[0.97] transition-all flex items-center gap-1.5 ${
                  activeTab === 'my-files'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-semibold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                My Files
                {studentFiles.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/[0.06] text-[#1D1D1F] font-mono">
                    {studentFiles.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Student Account Capsule */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-white hover:bg-[#FAFAFC] border border-black/[0.08] rounded-full px-3 py-1 shadow-sm transition-all">
              <div className="w-2 h-2 rounded-full bg-[#34C759]" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-[#86868B] font-medium tracking-wider uppercase">
                  Student ID
                </span>
                <span className="text-xs font-semibold text-[#1D1D1F] font-mono leading-tight">
                  {activeRoll}
                </span>
              </div>
              <button
                onClick={() => setShowSwitchModal(true)}
                className="text-[11px] font-medium text-[#0071E3] hover:underline pl-1 active:scale-[0.95]"
              >
                Switch
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/feed')}
              className="hidden lg:flex border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-xs rounded-full h-8 active:scale-[0.97]"
            >
              Back to Campus
            </Button>
          </div>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* APPLE HERO SECTION */}
        <div className="relative rounded-3xl bg-white border border-black/[0.06] p-8 md:p-12 mb-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              Private Storage for Roll No: {activeRoll}
            </div>

            <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-[#1D1D1F] mb-4">
              Powerful tools for your campus work. <br />
              <span className="text-[#86868B]">
                Free, private, and always available.
              </span>
            </h1>

            <p className="text-[#86868B] text-base md:text-lg leading-relaxed mb-6 font-normal">
              Edit presentations, documents, spreadsheets, diagrams, and notebooks. Every document is saved directly into your personal student account database.
            </p>

            {/* Apple Stat Strip */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-[#86868B] pt-4 border-t border-black/[0.06]">
              <div>
                <span className="text-[#1D1D1F] font-semibold">{DATANAUTS_APPS.length}</span> Built-in Apps
              </div>
              <div className="text-black/20">•</div>
              <div>
                <span className="text-[#1D1D1F] font-semibold">{studentFiles.length}</span> Saved Documents
              </div>
              <div className="text-black/20">•</div>
              <div>
                <span className="text-[#1D1D1F] font-semibold">{formatBytes(totalStorageBytes)}</span> Used
              </div>
            </div>
          </div>
        </div>

        {/* --- VIEW 1: MY CLOUD FILES --- */}
        {activeTab === 'my-files' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">My Documents</h2>
                <p className="text-sm text-[#86868B]">
                  Saved privately under student account <span className="font-mono text-[#0071E3] font-medium">{activeRoll}</span>
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('apps')}
                className="bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium px-4 h-9 gap-1.5 active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" /> Create New File
              </Button>
            </div>

            {isLoadingFiles ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#86868B]">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-[#0071E3]" />
                <p className="text-xs">Accessing your secure storage...</p>
              </div>
            ) : studentFiles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/[0.12] p-12 text-center bg-white">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-[#86868B]" />
                <h3 className="text-base font-semibold text-[#1D1D1F] mb-1">No Documents Created Yet</h3>
                <p className="text-xs text-[#86868B] max-w-md mx-auto mb-6">
                  Open Slides, Docs, Sheets, or Whiteboard to get started. All your changes are saved instantly to your account.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={() => launchApp(DATANAUTS_APPS[0])}
                    className="bg-[#FF9500] hover:bg-[#E08500] text-white rounded-full text-xs font-medium px-4 active:scale-[0.97]"
                  >
                    New Presentation (.pptx)
                  </Button>
                  <Button
                    onClick={() => launchApp(DATANAUTS_APPS[1])}
                    className="bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium px-4 active:scale-[0.97]"
                  >
                    New Document (.docx)
                  </Button>
                  <Button
                    onClick={() => launchApp(DATANAUTS_APPS[2])}
                    className="bg-[#34C759] hover:bg-[#2EB34F] text-white rounded-full text-xs font-medium px-4 active:scale-[0.97]"
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
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={appleSpring}
                    className="rounded-2xl bg-white border border-black/[0.06] hover:border-[#0071E3]/40 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-10 h-10 rounded-[22%] bg-[#F5F5F7] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#0071E3]" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-black/[0.08] text-[#86868B]">
                        {file.type}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-[#1D1D1F] truncate mb-1" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-[11px] text-[#86868B] font-mono">
                        {formatBytes(file.size)} • {new Date(file.updatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06]">
                      <Button
                        size="sm"
                        onClick={() => downloadStudentFile(activeRoll, file.path)}
                        className="flex-1 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] rounded-xl text-xs font-medium h-8 gap-1.5 active:scale-[0.97]"
                      >
                        <Download className="w-3.5 h-3.5 text-[#86868B]" /> Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (confirm(`Delete "${file.name}"?`)) {
                            await deleteStudentFile(activeRoll, file.path);
                            loadFiles(activeRoll);
                          }
                        }}
                        className="h-8 w-8 p-0 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-xl active:scale-[0.95]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            {/* Category Filter Pills & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Category Segmented Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
                {DATANAUTS_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap active:scale-[0.96] transition-all ${
                      activeCategory === cat.id
                        ? 'bg-[#1D1D1F] text-white shadow-sm'
                        : 'bg-white text-[#1D1D1F] hover:bg-[#E8E8ED] border border-black/[0.06]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Apple Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                <Input
                  type="text"
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-black/[0.08] text-[#1D1D1F] text-xs rounded-full h-9 focus-visible:ring-[#0071E3]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] active:scale-[0.9]"
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
                    whileHover={{ y: -3 }}
                    transition={appleSpring}
                    className="group rounded-3xl bg-white border border-black/[0.06] p-6 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] transition-all duration-200 active:scale-[0.99]"
                  >
                    <div>
                      {/* App Icon (Apple Squircle) */}
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-[22%] bg-gradient-to-tr ${app.gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        {app.badge && (
                          <span className="text-[10px] font-medium text-[#86868B] bg-[#F5F5F7] px-2 py-0.5 rounded-full border border-black/[0.04]">
                            {app.badge}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-semibold text-base text-[#1D1D1F] mb-1 tracking-tight">
                        {app.name}
                      </h3>
                      <p className="text-[11px] text-[#86868B] font-medium mb-2">
                        Alternative to {app.alternativeTo}
                      </p>
                      <p className="text-xs text-[#86868B] leading-relaxed mb-6 font-normal line-clamp-2">
                        {app.description}
                      </p>
                    </div>

                    {/* Launch Button */}
                    <Button
                      onClick={() => launchApp(app)}
                      className="w-full bg-[#F5F5F7] hover:bg-[#0071E3] text-[#1D1D1F] hover:text-white rounded-2xl text-xs font-semibold py-2.5 transition-all duration-200 border border-black/[0.04] hover:border-transparent flex items-center justify-center gap-1.5 active:scale-[0.97]"
                    >
                      <span>Open {app.shortName}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* --- APPLE CLEAN RUNNER MODAL (LIGHT FROSTED TOOLBAR) --- */}
      <AnimatePresence>
        {currentApp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={appleSpring}
            className="fixed inset-0 z-50 bg-[#F5F5F7] flex flex-col"
          >
            {/* Apple Frosted Navigation Toolbar */}
            <div className="h-13 bg-white/95 backdrop-blur-xl border-b border-black/[0.08] px-4 flex items-center justify-between shadow-sm">
              {/* Back to Studio & App Name */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeApp}
                  className="bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] rounded-full text-xs font-medium px-3.5 h-8 gap-1 active:scale-[0.96]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>

                <div className="h-4 w-[1px] bg-black/[0.08]" />

                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-[22%] bg-gradient-to-tr ${currentApp.gradient} flex items-center justify-center shadow-sm`}>
                    {React.createElement(ICON_MAP[currentApp.iconName] || LayoutGrid, {
                      className: 'w-3.5 h-3.5 text-white'
                    })}
                  </div>
                  <span className="font-semibold text-sm text-[#1D1D1F] tracking-tight">{currentApp.name}</span>
                </div>
              </div>

              {/* Student Roll Number Storage Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] border border-black/[0.06] text-xs">
                <div className="w-2 h-2 rounded-full bg-[#34C759]" />
                <span className="text-[#86868B]">Saving to:</span>
                <span className="font-mono text-[#1D1D1F] font-semibold">{activeRoll}</span>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] flex items-center justify-center transition-colors active:scale-[0.92]"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={closeApp}
                  className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] flex items-center justify-center transition-colors active:scale-[0.92]"
                  title="Close App"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Application Iframe Viewport */}
            <div className="flex-1 w-full h-full bg-[#F5F5F7] relative">
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

      {/* --- SWITCH ROLL NUMBER MODAL (APPLE CLEAN SHEET) --- */}
      <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
        <DialogContent className="bg-white border border-black/[0.08] text-[#1D1D1F] rounded-3xl max-w-md shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 tracking-tight text-[#1D1D1F]">
              <ShieldCheck className="w-5 h-5 text-[#0071E3]" />
              Switch Student Workspace
            </DialogTitle>
            <DialogDescription className="text-[#86868B] text-xs leading-relaxed">
              Every student roll number is completely isolated in the database. Your files, documents, and settings are never visible to anyone else.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div>
              <label className="text-xs font-semibold text-[#86868B] block mb-1.5 uppercase tracking-wider">
                Enter Roll Number / Student ID
              </label>
              <Input
                type="text"
                placeholder="e.g. 24N81A6758"
                value={newRollInput}
                onChange={(e) => setNewRollInput(e.target.value.toUpperCase())}
                className="bg-[#F5F5F7] border-black/[0.08] text-[#1D1D1F] font-mono text-base uppercase tracking-wider rounded-xl focus-visible:ring-[#0071E3]"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] text-xs text-[#86868B] space-y-1">
              <p className="font-semibold text-[#1D1D1F]">Active Account: {activeRoll}</p>
              <p>Switching accounts will immediately load your private presentations, docs, and notes.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowSwitchModal(false)}
              className="text-[#86868B] hover:text-[#1D1D1F] rounded-xl text-xs active:scale-[0.96]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwitchRoll}
              className="bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs px-5 font-semibold active:scale-[0.96]"
            >
              Confirm Switch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
