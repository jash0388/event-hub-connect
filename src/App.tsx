

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Deployment Ping: 2026-04-12 14:52:00

// Lazy load pages for better performance
const Home = lazy(() => import("./pages/Home"));
const Feed = lazy(() => import("./pages/Feed"));
const Events = lazy(() => import("./pages/Events"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const Projects = lazy(() => import("./pages/Projects"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const UserAuth = lazy(() => import("./pages/UserAuth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EventQRCodes = lazy(() => import("./pages/EventQRCodes"));
const CheckIn = lazy(() => import("./pages/CheckIn"));
const Compilers = lazy(() => import("./pages/Compilers"));
const Internships = lazy(() => import("./pages/Internships"));
const LearnHub = lazy(() => import("./pages/LearnHub"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const CodeQuest = lazy(() => import("./pages/CodeQuest"));
const Arcade = lazy(() => import("./pages/Arcade"));
const Tasks = lazy(() => import("./pages/Tasks"));
const ExamPage = lazy(() => import("./pages/ExamPage"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));
const SphnsExmTest = lazy(() => import("./pages/sphnsexm-test"));

// Lazy load heavy UI components
const CollegeEventsHub = lazy(() => import("@/components/ui/college-events-hub"));
const CodeCompiler = lazy(() => import("@/components/ui/code-compiler"));

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import HubAssistant from "./components/ai/HubAssistant";
import { Capacitor } from "@capacitor/core";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground font-mono text-sm">Loading...</p>
    </div>
  </div>
);

const App = () => {
  const isMobileApp = Capacitor.isNativePlatform();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Force Redirect for Mobile App */}
              <Route 
                path="/" 
                element={isMobileApp ? <ProtectedRoute><ExamPage /></ProtectedRoute> : <Home />} 
              />
              
              <Route path="/landing" element={<CollegeEventsHub />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<UserAuth />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>}
              />
              <Route
                path="/admin/dashboard"
                element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>}
              />
              <Route
                path="/event-qrcodes"
                element={<ProtectedRoute><EventQRCodes /></ProtectedRoute>}
              />
              <Route
                path="/checkin"
                element={<ProtectedRoute><CheckIn /></ProtectedRoute>}
              />
              <Route path="/compilers" element={<Compilers />} />
              <Route path="/internships" element={<Internships />} />
              <Route path="/learn" element={<ProtectedRoute><LearnHub /></ProtectedRoute>} />
              <Route path="/learn/:topicId" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
              <Route path="/learn/:topicId/:lessonId" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
              <Route path="/learn/codequest" element={<ProtectedRoute><CodeQuest /></ProtectedRoute>} />
              <Route path="/arcade" element={<ProtectedRoute><Arcade /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/download" element={<DownloadApp />} />
              <Route path="/sphnsexm-test" element={<SphnsExmTest />} />
              <Route path="/exam" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
              <Route path="*" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
            </Routes>
          </Suspense>
          {!isMobileApp && <HubAssistant />}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
