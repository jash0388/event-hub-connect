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
    <footer className="bg-gray-50 mt-auto border-t">
      <div className="container mx-auto px-4 py-6">
        {/* Top Row: Home Button | Copyright (Centered) | Social Links */}
        <div className="flex flex-row items-center justify-between gap-4">

          {/* Home Button - Left */}
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm font-medium"
          >
            <Home size={18} />
            <span className="hidden sm:inline">Home</span>
          </Link>

          {/* Copyright - Center (Always centered) */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-gray-600 font-medium whitespace-nowrap">
              © 2026 Alpha Team
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
              Made with <Heart className="w-3 h-3 text-red-400 fill-current" /> for the Students of SPHN
            </p>
          </div>

          {/* Social Links - Right */}
          <div className="flex items-center justify-end gap-3">
            {links.length > 0 ? (
              links.slice(0, 4).map((link) => {
                const IconComponent = iconMap[link.platform.toLowerCase()] || iconMap.default;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm"
                    aria-label={link.platform}
                  >
                    <IconComponent size={16} />
                  </a>
                );
              })
            ) : (
              <span className="text-xs text-gray-400 hidden sm:inline">Join our community</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
