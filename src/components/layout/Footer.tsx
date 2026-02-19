import { Github, Twitter, Instagram, Mail, Linkedin, Globe, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  is_active: boolean;
}

const iconMap: Record<string, any> = {
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
    <footer className="bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Logo & Info */}
          <div className="text-center md:text-left space-y-3">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Data<span className="text-primary">Nauts</span>
            </span>
            <p className="text-sm text-gray-500 max-w-xs">
              The central hub for all college tech events, projects, and innovation.
            </p>
          </div>

          {/* Copyright & Made with */}
          <div className="text-center flex flex-col items-center justify-center gap-2 w-full">
            <p className="text-sm text-gray-600 font-medium">
              © 2026 Alpha Team
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
              Made with <Heart className="w-3 h-3 text-red-400 fill-current" /> for the Students of SPHN
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center md:justify-end gap-5">
            {links.length > 0 ? (
              links.map((link) => {
                const IconComponent = iconMap[link.platform.toLowerCase()] || iconMap.default;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm"
                    aria-label={link.platform}
                  >
                    <IconComponent size={18} />
                  </a>
                );
              })
            ) : (
              <p className="text-xs text-gray-400">Join our community</p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
