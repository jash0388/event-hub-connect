import { Github, Twitter, Instagram, Mail, Linkedin, Globe, Heart, Home, LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  is_active: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  github: Github,
  twitter: Twitter,
  instagram: Instagram,
  email: Mail,
  linkedin: Linkedin,
  default: Globe,
};

export function Footer() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    const fetchLinks = async () => {
      const { data } = await supabase
        .from('social_links')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (data) setLinks(data);
    };

    fetchLinks();
  }, []);

  return (
    <footer
      className="mt-auto"
      style={{
        backgroundColor: 'transparent',
        paddingTop: '32px',
        paddingBottom: '64px',
        boxShadow: 'none'
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: '1280px' }}>
        {/* Three Section Layout: Left | Center | Right */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4" style={{ minHeight: '40px' }}>

          {/* Left Section - Home Link */}
          <div className="hidden sm:block flex-1">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:scale-105"
              style={{ color: '#D1D5DB' }}
            >
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>

          {/* Center Section - Copyright */}
          <div className="flex flex-col items-center text-center order-first sm:order-none">
            <p className="text-sm font-medium whitespace-nowrap" style={{ color: '#F3F4F6' }}>
              © 2026 Alpha Team
            </p>
            <p className="text-xs flex items-center gap-1 whitespace-nowrap" style={{ color: '#94A3B8' }}>
              Made with <Heart className="w-3 h-3 text-red-400 fill-current" /> for the Students of SPHN
            </p>
          </div>

          {/* Right Section - Social Links */}
          <div className="flex-1 flex items-center justify-center sm:justify-end gap-3">
            {links.length > 0 ? (
              links.slice(0, 4).map((link) => {
                const IconComponent = iconMap[link.platform.toLowerCase()] || iconMap.default;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: '50%',
                      color: '#94A3B8',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                    aria-label={link.platform}
                  >
                    <IconComponent size={16} />
                  </a>
                );
              })
            ) : (
              <span className="text-xs hidden sm:inline" style={{ color: '#94A3B8' }}>Join our community</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
