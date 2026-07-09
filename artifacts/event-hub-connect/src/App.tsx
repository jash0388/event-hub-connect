

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Deployment Ping: 2026-04-12 14:52:00

// Lazy load pages for better performance
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
const Feed = lazy(() => import("./pages/Feed"));
const Events = lazy(() => import("./pages/Events"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const Projects = lazy(() => import("./pages/Projects"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
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

import { SpeedInsights } from "@vercel/speed-insights/react";

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
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>}
              />
              <Route
                path="/admin/dashboard"
                element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>}
              />
              <Route path="/" element={<Home />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<UserAuth />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/compilers" element={<Compilers />} />
              <Route path="/internships" element={<Internships />} />
              <Route path="/learn" element={<LearnHub />} />
              <Route path="/tutorial" element={<Tutorial />} />
              <Route path="/code-quest" element={<CodeQuest />} />
              <Route path="/arcade" element={<Arcade />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/exams" element={<ExamPage />} />
              <Route path="/download" element={<DownloadApp />} />
              <Route path="/qr-codes" element={<EventQRCodes />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          {!isMobileApp && <HubAssistant />}
        </BrowserRouter>
        <SpeedInsights />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
