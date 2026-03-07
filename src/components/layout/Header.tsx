import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Shield, LogOut, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/events", label: "Events" },
  { path: "/internships", label: "Internships" },
  { path: "/compilers", label: "Compilers" },
  { path: "/profile", label: "My Events" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100]">
      <div className="mx-4 mt-4">
        <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_4px_30px_rgb(0,0,0,0.06)]">
          <div className="px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Datanauts
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-all rounded-lg relative",
                    location.pathname === item.path
                      ? "text-blue-600 bg-blue-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Right Section */}
            <div className="hidden lg:flex items-center gap-3">
              {loading ? (
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button 
                    size="sm" 
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all font-medium px-5"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
              <Link to="/admin/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  title="Admin Portal"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden mx-4 mt-2"
          >
            <nav className="bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl p-3 space-y-1 shadow-[0_10px_40px_rgb(0,0,0,0.08)]">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)}>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:shadow-lg">
                      Sign In
                    </Button>
                  </Link>
                )}
                <Link to="/admin/login" onClick={() => setIsOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Portal
                  </Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
