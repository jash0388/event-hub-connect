import { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, Loader2, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isFuture, isToday } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  image_url: string | null;
  registration_link: string | null;
  created_at: string;
}

export default function Events() {
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

  const upcomingEvents = events.filter(event => !isPast(new Date(event.date)) || isToday(new Date(event.date)));
  const pastEvents = events.filter(event => isPast(new Date(event.date)) && !isToday(new Date(event.date)));

  const EventCard = ({ event, isPastEvent = false }: { event: Event; isPastEvent?: boolean }) => (
    <div 
      className={`group relative bg-card border border-border rounded-xl overflow-hidden transition-all duration-500 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 ${isPastEvent ? 'opacity-60 hover:opacity-80' : ''}`}
      data-testid={`event-card-${event.id}`}
    >
      {/* Event Image */}
      <div className="relative h-56 overflow-hidden bg-muted">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <Calendar className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        
        {/* Status Badge */}
        {!isPastEvent && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 backdrop-blur-sm border border-primary/50 rounded-full">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="font-mono text-xs font-semibold text-primary uppercase">
                {isToday(new Date(event.date)) ? 'Today' : 'Upcoming'}
              </span>
            </span>
          </div>
        )}
        
        {isPastEvent && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/80 backdrop-blur-sm border border-border rounded-full">
              <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
                Completed
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 mb-2">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {format(new Date(event.date), "EEEE, MMMM d, yyyy")}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10">
              <Clock className="w-4 h-4 text-secondary" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {format(new Date(event.date), "h:mm a")}
            </span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
                <MapPin className="w-4 h-4 text-accent" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {event.location}
              </span>
            </div>
          )}
        </div>

        {/* Registration Link */}
        {event.registration_link && !isPastEvent && (
          <Button 
            className="w-full group/btn" 
            onClick={() => window.open(event.registration_link!, '_blank')}
            data-testid={`register-button-${event.id}`}
          >
            <span>Register Now</span>
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Page Header */}
          <div className="text-center mb-16 fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm font-semibold text-primary uppercase tracking-wider">
                Events
              </span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight mb-6">
              <span className="text-foreground">Discover </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
                Amazing Events
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join us for workshops, meetups, and community events. Connect, learn, and grow with fellow enthusiasts.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading amazing events...</p>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-16">
              {/* Upcoming Events Section */}
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <h2 className="font-display text-3xl font-bold text-foreground">
                      Upcoming Events
                    </h2>
                    <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                      <span className="font-mono text-sm font-bold text-primary">
                        {upcomingEvents.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-16 bg-card border border-border rounded-2xl">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">
                      No upcoming events at the moment. Check back soon!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </section>

              {/* Past Events Section */}
              {pastEvents.length > 0 && (
                <section className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-3xl font-bold text-muted-foreground">
                        Past Events
                      </h2>
                      <div className="px-3 py-1 bg-muted/50 border border-border rounded-full">
                        <span className="font-mono text-sm font-bold text-muted-foreground">
                          {pastEvents.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEvents.map((event) => (
                      <EventCard key={event.id} event={event} isPastEvent />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && events.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 border border-primary/20 rounded-2xl mb-6">
                <Calendar className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                No Events Yet
              </h3>
              <p className="text-muted-foreground text-lg">
                Events will appear here soon. Stay tuned!
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
