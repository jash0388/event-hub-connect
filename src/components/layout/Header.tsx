import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Shield, LogOut, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/events", label: "Events" },
  { path: "/projects", label: "Projects" },
  { path: "/learn", label: "Learn" },
  { path: "/exam", label: "Test" },
  { path: "/tasks", label: "Tasks" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    // Fire and forget - never await this, otherwise stale tokens will freeze the UI
    signOut().catch(e => console.warn("Background logout error:", e));
    
    // Visually logout instantly while backend processes
    localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL + '-auth-token');
    window.location.href = '/';
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
        scrolled
          ? "bg-background/80 backdrop-blur-xl shadow-sm border-b border-border/50"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/50 bg-background/50 shadow-inner">
              <img
                src="/logo.png"
                alt="DataNauts"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gradient">
              Sphoorhty
            </span>
          </Link>

          {/* Desktop Navigation — only when logged in */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-full flex items-center gap-1.5",
                    location.pathname === item.path
                      ? "text-foreground bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Desktop Right Section */}
          <div className="hidden lg:flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
            ) : user ? (
              <>
                <Link to="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-full border-border hover:bg-secondary"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button
                  size="sm"
                  className="rounded-full px-6 bg-foreground text-background hover:bg-foreground/90"
                >
                  Sign In
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
            <Link to="/admin/login">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                title="Admin Portal"
              >
                <Shield className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-foreground p-2 hover:bg-secondary rounded-full transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation — only when logged in */}
      {isOpen && user && (
        <nav className="lg:hidden bg-background/95 backdrop-blur-xl py-4 px-4 space-y-1 border-t border-border shadow-xl animate-fade-in-up">
          {navItems.map((item, index) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all",
                location.pathname === item.path
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-2">
                {item.label}
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-border flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/profile" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl justify-start text-muted-foreground hover:text-foreground"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full rounded-xl justify-start border-border"
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
                {loading ? (
                  <div className="w-full flex items-center justify-center py-3">
                    <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                  </div>
                ) : (
                  <Button className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
                    Sign In
                  </Button>
                )}
              </Link>
            )}
            <Link to="/admin/login" onClick={() => setIsOpen(false)}>
              <Button variant="outline" className="w-full rounded-xl border-border">
                <Shield className="w-4 h-4 mr-2" />
                Admin Portal
              </Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
