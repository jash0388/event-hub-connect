import { useState } from "react";
import { Calendar, MapPin, Users, Clock, ExternalLink } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberButton } from "@/components/ui/CyberButton";

type EventStatus = "all" | "upcoming" | "ongoing" | "past";

const events = [
  {
    id: 1,
    title: "HACKATHON 2026",
    description: "48-hour coding marathon to build innovative solutions. Cash prizes worth ₹50,000!",
    date: "MAR 15-17, 2026",
    time: "09:00 AM IST",
    location: "VIRTUAL",
    participants: 500,
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=800&h=400&fit=crop",
    tags: ["HACKATHON", "PRIZES", "VIRTUAL"],
  },
  {
    id: 2,
    title: "AI & ML WORKSHOP",
    description: "Hands-on workshop covering neural networks, deep learning, and practical AI applications.",
    date: "MAR 22, 2026",
    time: "02:00 PM IST",
    location: "TECH HUB, MUMBAI",
    participants: 150,
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
    tags: ["AI", "WORKSHOP", "OFFLINE"],
  },
  {
    id: 3,
    title: "WEB3 MEETUP",
    description: "Exploring the future of decentralized applications, blockchain, and crypto technologies.",
    date: "APR 05, 2026",
    time: "06:00 PM IST",
    location: "VIRTUAL",
    participants: 300,
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
    tags: ["WEB3", "BLOCKCHAIN", "VIRTUAL"],
  },
  {
    id: 4,
    title: "TECH TALK: SYSTEM DESIGN",
    description: "Learn how to design scalable systems from industry experts at top tech companies.",
    date: "APR 12, 2026",
    time: "07:00 PM IST",
    location: "VIRTUAL",
    participants: 1000,
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop",
    tags: ["TECH TALK", "SYSTEM DESIGN", "FREE"],
  },
  {
    id: 5,
    title: "GAMING NIGHT",
    description: "Monthly gaming session featuring competitive tournaments and casual gaming fun.",
    date: "FEB 28, 2026",
    time: "08:00 PM IST",
    location: "DISCORD",
    participants: 200,
    status: "past",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop",
    tags: ["GAMING", "COMMUNITY", "FUN"],
  },
  {
    id: 6,
    title: "OPEN SOURCE SPRINT",
    description: "Contribute to open source projects and learn collaborative development practices.",
    date: "FEB 20, 2026",
    time: "10:00 AM IST",
    location: "VIRTUAL",
    participants: 100,
    status: "past",
    image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&h=400&fit=crop",
    tags: ["OPEN SOURCE", "GITHUB", "VIRTUAL"],
  },
];

const statusFilters: { value: EventStatus; label: string }[] = [
  { value: "all", label: "ALL EVENTS" },
  { value: "upcoming", label: "UPCOMING" },
  { value: "ongoing", label: "ONGOING" },
  { value: "past", label: "PAST" },
];

export default function Events() {
  const [filter, setFilter] = useState<EventStatus>("all");

  const filteredEvents = events.filter(
    (event) => filter === "all" || event.status === filter
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-sm text-primary">//</span>
              <span className="font-mono text-sm text-muted-foreground">EVENTS</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-foreground">EVENT</span>{" "}
              <span className="text-primary glow-green">UPDATES</span>
            </h1>
            <p className="font-mono text-muted-foreground max-w-2xl">
              Stay connected with the latest tech events, workshops, and community meetups. 
              Never miss an opportunity to learn and grow.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {statusFilters.map((statusFilter) => (
              <button
                key={statusFilter.value}
                onClick={() => setFilter(statusFilter.value)}
                className={`font-display text-xs tracking-wider px-4 py-2 border transition-all duration-300 ${
                  filter === statusFilter.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {statusFilter.label}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <CyberCard
                key={event.id}
                variant="hologram"
                padding="none"
                className="group overflow-hidden"
              >
                {/* Event Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`font-mono text-xs uppercase tracking-wider px-3 py-1 ${
                        event.status === "upcoming"
                          ? "bg-primary/20 text-primary border border-primary/50"
                          : event.status === "ongoing"
                          ? "bg-secondary/20 text-secondary border border-secondary/50"
                          : "bg-muted text-muted-foreground border border-muted"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>

                {/* Event Content */}
                <div className="p-6">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-display text-xl font-bold tracking-wider text-foreground group-hover:text-primary transition-colors mb-2">
                    {event.title}
                  </h3>
                  <p className="font-mono text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  {/* Event Details */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <Calendar size={12} className="text-primary" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <Clock size={12} className="text-secondary" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <MapPin size={12} className="text-accent" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <Users size={12} className="text-neon-amber" />
                      {event.participants}+ PARTICIPANTS
                    </div>
                  </div>

                  {/* Action Button */}
                  {event.status === "upcoming" && (
                    <CyberButton variant="primary" size="sm" className="w-full">
                      Register Now
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </CyberButton>
                  )}
                  {event.status === "past" && (
                    <CyberButton variant="ghost" size="sm" className="w-full">
                      View Recap
                    </CyberButton>
                  )}
                </div>
              </CyberCard>
            ))}
          </div>

          {/* Empty State */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-16">
              <p className="font-mono text-muted-foreground">
                No events found for this filter.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
