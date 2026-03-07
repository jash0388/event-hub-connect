import { Github, Twitter, Instagram, Mail, Linkedin, Globe, Heart, LucideIcon } from "lucide-react";
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

const footerLinks = {
  product: [
    { label: "Events", href: "/events" },
    { label: "Projects", href: "/projects" },
    { label: "Internships", href: "/internships" },
    { label: "Compilers", href: "/compilers" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Admin", href: "/admin/login" },
  ],
};

export function Footer() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    const fetchLinks = async () => {
      const { data } = await supabase
        .from("social_links")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (data) setLinks(data);
    };

    fetchLinks();
  }, []);

  return (
    <footer className="bg-secondary/30 border-t border-border">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="DataNauts" className="h-10 w-auto object-contain" />
              <span className="text-2xl font-bold tracking-tight text-foreground">
                Data<span className="text-[hsl(var(--accent))]">Nauts</span>
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
              Your gateway to the most exciting campus events, hackathons, and opportunities.
              Join our community of innovators and creators.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {links.length > 0 ? (
                links.slice(0, 4).map((link) => {
                  const IconComponent = iconMap[link.platform.toLowerCase()] || iconMap.default;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-300"
                      aria-label={link.platform}
                    >
                      <IconComponent size={18} />
                    </a>
                  );
                })
              ) : (
                <>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-300"
                  >
                    <Github size={18} />
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-300"
                  >
                    <Twitter size={18} />
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-300"
                  >
                    <Instagram size={18} />
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-300"
                  >
                    <Linkedin size={18} />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Explore</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 DataNauts. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-[hsl(var(--accent))] fill-current" /> for
            the students of SPHN
          </p>
        </div>
      </div>
    </footer>
  );
}
