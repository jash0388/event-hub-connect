import { Github, Twitter, Instagram, Mail, Linkedin, Globe } from "lucide-react";
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
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          {/* Logo & Copyright - Left Aligned */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-display text-lg font-bold tracking-wider text-primary">
              DATANAUTS SPHN
            </span>
            <p className="text-sm text-muted-foreground">
              A PROJECT BY ALPHA TEAM © 2026
            </p>
          </div>

          {/* Status Indicator - Center Aligned */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 border border-primary/30 bg-primary/5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-primary uppercase tracking-wider">
                System Online
              </span>
            </div>
          </div>

          {/* Social Links - Right Aligned */}
          <div className="flex items-center justify-center md:justify-end gap-4">
            {links.map((link) => {
              const IconComponent = iconMap[link.platform.toLowerCase()] || iconMap.default;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors duration-300"
                  aria-label={link.platform}
                >
                  <IconComponent size={20} />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
