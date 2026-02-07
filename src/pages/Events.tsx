import { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CyberCard } from "@/components/ui/CyberCard";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isFuture, isToday } from "date-fns";

type EventStatus = "all" | "upcoming" | "ongoing" | "past";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  image_url: string | null;
  created_at: string;
}

const statusFilters: { value: EventStatus; label: string }[] = [
  { value: "all", label: "ALL EVENTS" },
  { value: "upcoming", label: "UPCOMING" },
  { value: "past", label: "PAST" },
];

function getEventStatus(date: string): "upcoming" | "ongoing" | "past" {
  const eventDate = new Date(date);
  if (isToday(eventDate)) return "ongoing";
  if (isFuture(eventDate)) return "upcoming";
  return "past";
}

export default function Events() {
  const [filter, setFilter] = useState<EventStatus>("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("date", { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    const status = getEventStatus(event.date);
    return status === filter;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-sm text-primary">//</span>
              <span className="font-mono text-sm text-muted-foreground">
                EVENTS
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-foreground">EVENT</span>{" "}
              <span className="text-primary glow-green">HUB</span>
            </h1>
            <p className="font-mono text-muted-foreground max-w-2xl">
              Discover upcoming events, workshops, and community meetups. Stay
              connected and never miss an opportunity to learn and grow.
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

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="font-mono text-muted-foreground">
                Loading events...
              </p>
            </div>
          )}

          {/* Events Grid */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => {
                const status = getEventStatus(event.date);
                return (
                  <CyberCard
                    key={event.id}
                    variant="hologram"
                    padding="none"
                    className="group overflow-hidden"
                  >
                    {/* Event Image */}
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        <span
                          className={`font-mono text-xs uppercase tracking-wider px-3 py-1 ${
                            status === "upcoming"
                              ? "bg-primary/20 text-primary border border-primary/50"
                              : status === "ongoing"
                              ? "bg-secondary/20 text-secondary border border-secondary/50"
                              : "bg-muted text-muted-foreground border border-muted"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="p-6">
                      <h3 className="font-display text-xl font-bold tracking-wider text-foreground group-hover:text-primary transition-colors mb-2">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="font-mono text-sm text-muted-foreground mb-4 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Event Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                          <Calendar size={12} className="text-primary" />
                          {format(new Date(event.date), "PPP")}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                          <Clock size={12} className="text-secondary" />
                          {format(new Date(event.date), "p")}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                            <MapPin size={12} className="text-accent" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </CyberCard>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredEvents.length === 0 && (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-mono text-muted-foreground">
                {filter === "all"
                  ? "No events yet. Check back soon!"
                  : `No ${filter} events found.`}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
