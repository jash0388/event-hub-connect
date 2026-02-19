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
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          {/* Logo & Info */}
          <div className="text-center md:text-left space-y-3 order-2 md:order-1">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Data<span className="text-primary">Nauts</span>
            </span>
            <p className="text-sm text-gray-500 max-w-xs mx-auto md:mx-0">
              The central hub for all college tech events, projects, and innovation.
            </p>
          </div>

          {/* Copyright & Made with */}
          <div className="text-center flex flex-col items-center gap-2 order-1 md:order-2">
            <p className="text-sm text-gray-600 font-medium">
              © 2026 Alpha Team
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
              Made with <Heart className="w-3 h-3 text-red-400 fill-current" /> for the Students of SPHN
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-5 order-3">
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
