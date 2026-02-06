import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberButton } from "@/components/ui/CyberButton";

const upcomingEvents = [
  {
    id: 1,
    title: "HACKATHON 2026",
    date: "MAR 15-17, 2026",
    location: "VIRTUAL",
    status: "UPCOMING",
    statusColor: "text-primary",
  },
  {
    id: 2,
    title: "AI WORKSHOP",
    date: "MAR 22, 2026",
    location: "TECH HUB",
    status: "REGISTERING",
    statusColor: "text-secondary",
  },
  {
    id: 3,
    title: "WEB3 MEETUP",
    date: "APR 05, 2026",
    location: "VIRTUAL",
    status: "SOON",
    statusColor: "text-accent",
  },
];

export function UpcomingEvents() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
              <span className="text-primary">//</span> UPCOMING EVENTS
            </h2>
            <p className="font-mono text-sm text-muted-foreground">
              Don't miss out on our latest tech events
            </p>
          </div>
          <Link to="/events">
            <CyberButton variant="ghost" size="sm">
              View All Events
              <ArrowRight className="ml-2 h-4 w-4" />
            </CyberButton>
          </Link>
        </div>

        {/* Events List */}
        <div className="grid gap-4">
          {upcomingEvents.map((event, index) => (
            <CyberCard
              key={event.id}
              variant="terminal"
              padding="none"
              className="group hover:border-primary/50 transition-all duration-300"
            >
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/20">
                <span className="w-2 h-2 rounded-full bg-neon-red" />
                <span className="w-2 h-2 rounded-full bg-neon-amber" />
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  event_{String(index + 1).padStart(2, "0")}.exe
                </span>
              </div>

              {/* Event Content */}
              <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold tracking-wider text-foreground group-hover:text-primary transition-colors mb-2">
                    {event.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 font-mono text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} className="text-primary" />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-secondary" />
                      {event.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono text-xs uppercase tracking-wider ${event.statusColor} px-3 py-1 border border-current bg-current/10`}
                  >
                    {event.status}
                  </span>
                  <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </CyberCard>
          ))}
        </div>
      </div>
    </section>
  );
}
