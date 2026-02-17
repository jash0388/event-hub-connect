import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { path: "/", label: "HOME" },
  { path: "/events", label: "EVENTS" },
  { path: "/profile", label: "MY EVENTS" },
  { path: "/about", label: "ABOUT" },
  { path: "/contact", label: "CONTACT" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="DataNauts Logo" className="w-8 h-8 object-contain" />
            <span className="font-display text-lg font-bold tracking-wider text-primary">
              DATANAUTS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "font-display text-sm tracking-wider transition-all duration-300",
                  location.pathname === item.path
                    ? "text-primary glow-green"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/profile">
                  <Button variant="outline" size="sm" className="font-mono text-xs">
                    My Profile
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="font-mono text-xs"
                >
                  <LogOut className="w-3 h-3 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="font-mono text-xs">
                  Login
                </Button>
              </Link>
            )}
            <Link to="/admin/login">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs"
              >
                <Shield className="w-3 h-3 mr-2" />
                Admin
              </Button>
            </Link>
            <div className="font-mono text-sm text-muted-foreground">
              {formattedTime}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-foreground p-2"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <nav className="md:hidden bg-background border-b border-border animate-slide-in-right">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "font-display text-sm tracking-wider py-2 transition-all duration-300",
                  location.pathname === item.path
                    ? "text-primary glow-green"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/admin/login" onClick={() => setIsOpen(false)}>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs w-full"
              >
                <Shield className="w-3 h-3 mr-2" />
                Admin Login
              </Button>
            </Link>
            <div className="font-mono text-sm text-muted-foreground pt-2 border-t border-border">
              {formattedTime}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
