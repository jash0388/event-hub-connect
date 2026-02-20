import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Projects from "./pages/Projects";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import UserAuth from "./pages/UserAuth";
import NotFound from "./pages/NotFound";
import EventQRCodes from "./pages/EventQRCodes";
import CheckIn from "./pages/CheckIn";
import Compilers from "./pages/Compilers";
import CollegeEventsHub from "./components/ui/college-events-hub";
import CodeCompiler from "./components/ui/code-compiler";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Internships from "./pages/Internships";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<CollegeEventsHub />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<UserAuth />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
          />
          <Route
            path="/admin/dashboard"
            element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
          />
          <Route
            path="/event-qrcodes"
            element={<ProtectedRoute><EventQRCodes /></ProtectedRoute>}
          />
          <Route
            path="/checkin"
            element={<ProtectedRoute><CheckIn /></ProtectedRoute>}
          />
          <Route path="/compilers" element={<CodeCompiler />} />
          <Route path="/internships" element={<Internships />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
