import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Shield, LogOut, User, ChevronDown } from "lucide-react";
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
        <div className="max-w-7xl mx-auto bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/20">
          <div className="px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-lg font-semibold tracking-tight text-white">
                Data<span className="text-blue-400">Nauts</span>
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
                      ? "text-white bg-white/[0.08]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
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
                      className="rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button 
                    size="sm" 
                    className="rounded-lg bg-white text-black hover:bg-zinc-200 font-medium px-5"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
              <Link to="/admin/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                  title="Admin Portal"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden text-zinc-400 p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
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
            <nav className="bg-zinc-950/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 space-y-1 shadow-2xl">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-white/[0.08] flex flex-col gap-2">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)}>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05]"
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
                    <Button className="w-full rounded-xl bg-white text-black hover:bg-zinc-200">
                      Sign In
                    </Button>
                  </Link>
                )}
                <Link to="/admin/login" onClick={() => setIsOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05]"
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
