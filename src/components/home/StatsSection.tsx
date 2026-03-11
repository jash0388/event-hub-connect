import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, Folder, Award } from "lucide-react";

interface Stats {
  eventsCount: number;
  attendeesCount: number;
  projectsCount: number;
}

export function StatsSection() {
  const [stats, setStats] = useState<Stats>({
    eventsCount: 0,
    attendeesCount: 0,
    projectsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });

        const { count: attendeesCount } = await supabase
          .from("event_attendees")
          .select("*", { count: "exact", head: true })
          .eq("rsvp_status", "going");

        const { count: projectsCount } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true });

        setStats({
          eventsCount: eventsCount || 0,
          attendeesCount: attendeesCount || 0,
          projectsCount: projectsCount || 0,
        });
      } catch (error) {
        console.warn("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K+";
    }
    return num > 0 ? num + "+" : "0+";
  };

  const statsData = [
    {
      icon: Calendar,
      value: Math.max(50, stats.eventsCount),
      label: "Events Hosted",
      description: "Hackathons, workshops & meetups",
    },
    {
      icon: Users,
      value: Math.max(1200, stats.attendeesCount),
      label: "Students",
      description: "Growing every day",
    },
    {
      icon: Folder,
      value: stats.projectsCount,
      label: "Projects Built",
      description: "By our community",
    },
    {
      icon: Award,
      value: 100,
      label: "Internship Openings",
      description: "Career opportunities",
    },
  ];

  return (
    <section className="py-20 bg-foreground">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {statsData.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-background/10 mb-4">
                <stat.icon className="w-6 h-6 text-background" />
              </div>
              {isLoading ? (
                <div className="h-12 w-20 mx-auto bg-background/10 animate-pulse rounded-lg" />
              ) : (
                <div className="text-4xl md:text-5xl font-bold text-background">
                  {formatNumber(stat.value)}
                </div>
              )}
              <div className="text-base font-medium text-background/90 mt-2">
                {stat.label}
              </div>
              <div className="text-sm text-background/60">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
