import { Calendar, Users, Folder, Award } from "lucide-react";

interface StatsProps {
  stats?: {
    events: number;
    students: number;
    projects: number;
    attendees: number;
    isLoading: boolean;
  };
}

export function StatsSection({ stats: externalStats }: StatsProps) {
  const statsData = [
    {
      icon: Calendar,
      value: Math.max(50, externalStats?.events || 0),
      label: "Events Hosted",
      description: "Hackathons, workshops & meetups",
    },
    {
      icon: Users,
      value: Math.max(1200, externalStats?.attendees || 0),
      label: "Students",
      description: "Growing every day",
    },
    {
      icon: Folder,
      value: externalStats?.projects || 0,
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

  const isLoading = externalStats?.isLoading ?? true;
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K+";
    }
    return num > 0 ? num + "+" : "0+";
  };

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
