import { Github, Twitter, Instagram, Mail, Linkedin, Globe, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    <footer className="bg-white border-t border-gray-100">
      <div className="container mx-auto px-6 py-16">
        <div className="flex flex-col items-center text-center space-y-10">
          {/* Logo & Info */}
          <div className="space-y-4 max-w-md">
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <span className="text-2xl font-black tracking-tighter text-gray-900">
                Data<span className="text-primary">Nauts</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              The central hub for all college tech events, projects, and innovation. Empowering students to build the future.
            </p>
          </div>

          {/* Domain Button / CTA */}
          <div className="flex items-center gap-4">
            <a
              href="https://datanauts.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-primary hover:border-primary transition-all"
            >
              datanauts.io
            </a>
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-4">
            {links.length > 0 ? (
              links.map((link) => {
                const IconComponent = iconMap[link.platform.toLowerCase()] || iconMap.default;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-400 hover:text-primary hover:bg-white hover:shadow-md transition-all"
                    aria-label={link.platform}
                  >
                    <IconComponent size={18} />
                  </a>
                );
              })
            ) : null}
          </div>

          {/* Copyright & Made with */}
          <div className="pt-10 border-t border-gray-50 w-full flex flex-col items-center gap-2">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              © 2026 Alpha Team
            </p>
            <p className="text-[10px] text-gray-300 flex items-center gap-1 font-medium">
              Made with <Heart className="w-2.5 h-2.5 text-gray-200 fill-current" /> for the Community
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
