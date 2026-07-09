import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Search, Users, Bookmark, ChevronRight, Image, ArrowRight } from "lucide-react";
import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Category = "Sports" | "Tech Talks" | "Cultural" | "Workshops" | "Competitions" | "Social" | "Uncategorized";
type SortOption = "date" | "popularity" | "trending";

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  date: string;
  time: string | null;
  location: string | null;
  organizer: string | null;
  image: string | null;
  image_url: string | null;
  popularity_score: number;
  trending_score: number;
  registration_link: string | null;
  created_at: string;
  photos: string | string[] | null;
  videos: string | string[] | null;
}

interface EnhancedEvent extends EventRecord {
  category: Category;
  attendees: number;
  attendeeNames: string[];
  trendingScore: number;
}

const categories: Category[] = ["Sports", "Tech Talks", "Cultural", "Workshops", "Competitions", "Social"];

const categoryStyles: Record<Category, { bg: string; text: string }> = {
  Sports: { bg: "bg-orange-500", text: "text-background" },
  "Tech Talks": { bg: "bg-[hsl(var(--sky))]", text: "text-background" },
  Cultural: { bg: "bg-[hsl(var(--accent))]", text: "text-background" },
  Workshops: { bg: "bg-[hsl(var(--sage))]", text: "text-background" },
  Competitions: { bg: "bg-foreground", text: "text-background" },
  Social: { bg: "bg-muted-foreground", text: "text-background" },
  Uncategorized: { bg: "bg-secondary", text: "text-foreground" },
};

function normalizeCategory(value: string | null | undefined): Category {
  if (!value) return "Uncategorized";
  const found = [...categories, "Uncategorized" as const].find((category) => category.toLowerCase() === value.toLowerCase());
  return found || "Uncategorized";
}

function getPhotosArray(photos: string | string[] | null | undefined): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  return photos.split(',').map(p => p.trim()).filter(p => p);
}

export default function Events() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [showPhotosModal, setShowPhotosModal] = useState<string | null>(null);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['events_page_data', user?.id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
        .limit(100);

      if (error) throw error;

      const baseEvents: EnhancedEvent[] = (rows || []).map((event: any) => ({
        ...event,
        category: normalizeCategory(event.category),
        attendees: 0,
        attendeeNames: [],
        trendingScore: Math.max(0, event.trending_score || 0),
      }));

      const { data: attendeesRows } = await (supabase as any)
        .from("event_registrations")
        .select("event_id")
        .limit(1000);
        
      const attendeeCountMap = new Map<string, number>();
      (attendeesRows || []).forEach((row: any) => {
        attendeeCountMap.set(row.event_id, (attendeeCountMap.get(row.event_id) || 0) + 1);
      });

      const eventsWithAttendees = baseEvents.map(event => ({
        ...event,
        attendees: attendeeCountMap.get(event.id) || 0
      }));

      let savedIdsList: string[] = [];
      let registeredEventsSet = new Set<string>();

      if (user?.id) {
        const { data: savedRows } = await supabase.from("user_saved_events").select("event_id").eq("user_id", user.id).limit(100);
        savedIdsList = (savedRows || []).map((row: any) => row.event_id);

        const { data: regs } = await supabase
          .from("event_registrations" as any)
          .select("event_id")
          .eq("user_id", user.id)
          .limit(100) as any;
          
        if (regs) {
          registeredEventsSet = new Set(regs.map((r: any) => r.event_id));
        }
      }

      return {
        events: eventsWithAttendees,
        savedIds: savedIdsList,
        registeredEvents: registeredEventsSet
      };
    },
    staleTime: 60000,
  });

  const events = data?.events || [];
  const savedIds = data?.savedIds || [];
  const registeredEvents = data?.registeredEvents || new Set<string>();

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => activeCategory === "All" || e.category === activeCategory)
      .filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description || "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "date") return parseISO(b.date).getTime() - parseISO(a.date).getTime();
        if (sortBy === "popularity") return b.attendees - a.attendees;
        return b.trendingScore - a.trendingScore;
      });
  }, [events, activeCategory, search, sortBy]);

  const toggleSave = async (eventId: string) => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to save events", variant: "destructive" });
      return;
    }
    
    // Optimistic update
    queryClient.setQueryData(['events_page_data', user.id], (old: any) => {
      if (!old) return old;
      const isSaved = old.savedIds.includes(eventId);
      return {
        ...old,
        savedIds: isSaved 
          ? old.savedIds.filter((id: string) => id !== eventId)
          : [...old.savedIds, eventId]
      };
    });

    try {
      if (savedIds.includes(eventId)) {
        await supabase.from("user_saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
      } else {
        await supabase.from("user_saved_events").insert({ user_id: user.id, event_id: eventId });
      }
    } catch (error) {
      toast({ title: "Error updating saved events", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ['events_page_data', user.id] });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Page Header */}
          <div className="mb-12 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-sm font-medium text-foreground mb-4">
              Discover Events
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Find Your Next
              <span className="text-gradient"> Experience</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
              From hackathons to cultural festivals, discover events that match your interests
            </p>
          </div>

          {/* Filters & Search */}
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events..."
                  className="pl-12 bg-secondary border-none rounded-xl h-12 focus-visible:ring-2 focus-visible:ring-foreground"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value as Category | "All")}
                  className="h-12 px-4 rounded-xl border-border bg-secondary text-sm font-medium focus:ring-2 focus:ring-foreground outline-none flex-1 md:flex-none"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-12 px-4 rounded-xl border-border bg-secondary text-sm font-medium focus:ring-2 focus:ring-foreground outline-none flex-1 md:flex-none"
                >
                  <option value="date">Latest First</option>
                  <option value="popularity">Most Popular</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Events Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-card rounded-3xl h-[420px] animate-pulse border border-border" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-border">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No events found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, index) => {
                const eventDate = parseISO(event.date);
                const isRegistered = registeredEvents.has(event.id);
                const isSaved = savedIds.includes(event.id);
                const isEventEnded = isBefore(eventDate, startOfDay(new Date()));
                const style = categoryStyles[event.category];

                return (
                  <div
                    key={event.id}
                    className="group bg-card rounded-3xl overflow-hidden flex flex-col h-full border border-border card-3d animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Event Image */}
                    <Link to={`/events/${event.id}`} className="relative h-48 block overflow-hidden">
                      {event.image || event.image_url ? (
                        <img
                          src={event.image || event.image_url || ""}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", style.bg, style.text)}>
                          {event.category}
                        </span>
                        {isToday(eventDate) && (
                          <span className="bg-[hsl(var(--accent))] text-background px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={(e) => { e.preventDefault(); toggleSave(event.id); }}
                        className={cn(
                          "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          isSaved ? "bg-foreground text-background" : "bg-background/80 hover:bg-background text-foreground backdrop-blur-sm"
                        )}
                      >
                        <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
                      </button>

                      {/* Photos Button */}
                      {getPhotosArray(event.photos).length > 0 && (
                        <button
                          onClick={(e) => { e.preventDefault(); setCurrentPhotos(getPhotosArray(event.photos)); setShowPhotosModal(event.id); }}
                          className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-background/80 hover:bg-background text-foreground backdrop-blur-sm flex items-center justify-center transition-all"
                        >
                          <Image className="w-5 h-5" />
                        </button>
                      )}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>

                    {/* Event Info */}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                        <Calendar className="w-4 h-4" />
                        {format(eventDate, "MMMM d, yyyy")}
                        {event.time && (
                          <>
                            <span className="text-border">•</span>
                            <Clock className="w-4 h-4" />
                            {event.time}
                          </>
                        )}
                      </div>

                      <Link to={`/events/${event.id}`}>
                        <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-[hsl(var(--accent))] transition-colors">
                          {event.title}
                        </h3>
                      </Link>

                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                        {event.description || "Join us for this exciting event!"}
                      </p>

                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{event.location || "Online"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{event.attendees} students registered</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEventEnded ? (
                          <Button
                            disabled
                            className="flex-1 rounded-xl h-11 text-sm font-medium bg-secondary text-muted-foreground cursor-not-allowed"
                          >
                            Event Ended
                          </Button>
                        ) : (
                          <Link to={`/events/${event.id}`} className="flex-1">
                            <Button
                              className={cn(
                                "w-full rounded-xl h-11 text-sm font-medium transition-all",
                                isRegistered
                                  ? "bg-[hsl(var(--sage))] text-background hover:bg-[hsl(var(--sage))]/90"
                                  : "bg-foreground text-background hover:bg-foreground/90"
                              )}
                            >
                              {isRegistered ? "Registered" : "Register Now"}
                            </Button>
                          </Link>
                        )}
                        <Link to={`/events/${event.id}`}>
                          <Button variant="outline" size="icon" className="w-11 h-11 rounded-xl border-border hover:bg-secondary">
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Photos Modal */}
      <Dialog open={!!showPhotosModal} onOpenChange={() => setShowPhotosModal(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Photos</DialogTitle>
            <DialogDescription>View all photos from this event</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {currentPhotos.map((photo, index) => (
              <div key={index} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
