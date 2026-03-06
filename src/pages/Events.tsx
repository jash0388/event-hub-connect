import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Search, Users, Bookmark, Image, Filter, ArrowRight, Sparkles } from "lucide-react";
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
import { motion } from "framer-motion";

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
}

interface EnhancedEvent extends EventRecord {
  category: Category;
  attendees: number;
  trendingScore: number;
}

const categories: Category[] = ["Sports", "Tech Talks", "Cultural", "Workshops", "Competitions", "Social"];

const categoryColors: Record<Category, { bg: string; text: string; border: string }> = {
  Sports: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  "Tech Talks": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  Cultural: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  Workshops: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  Competitions: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  Social: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
  Uncategorized: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
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

  const [events, setEvents] = useState<EnhancedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [showPhotosModal, setShowPhotosModal] = useState<string | null>(null);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);

  const fetchPageData = async () => {
    setIsLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;

      const baseEvents: EnhancedEvent[] = (rows || []).map((event: any) => ({
        ...event,
        category: normalizeCategory(event.category),
        attendees: 0,
        trendingScore: Math.max(0, event.trending_score || 0),
      }));

      const { data: attendeesRows } = await (supabase as any).from("event_registrations").select("event_id");
      const attendeeCountMap = new Map<string, number>();
      (attendeesRows || []).forEach((row: any) => {
        attendeeCountMap.set(row.event_id, (attendeeCountMap.get(row.event_id) || 0) + 1);
      });

      setEvents(baseEvents.map(event => ({
        ...event,
        attendees: attendeeCountMap.get(event.id) || 0
      })));

      if (user?.id) {
        const { data: savedRows } = await supabase.from("user_saved_events").select("event_id").eq("user_id", user.id);
        setSavedIds((savedRows || []).map(row => row.event_id));

        const { data: regs } = await (supabase
          .from("event_registrations" as any)
          .select("event_id")
          .eq("user_id", user.id) as any);
        if (regs) setRegisteredEvents(new Set(regs.map((r: any) => r.event_id)));
      }
    } catch (error) {
      console.error("Error loading events:", error);
      toast({ title: "Failed to load events", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [user?.id]);

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
    try {
      if (savedIds.includes(eventId)) {
        await supabase.from("user_saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
        setSavedIds(prev => prev.filter(id => id !== eventId));
      } else {
        await supabase.from("user_saved_events").insert({ user_id: user.id, event_id: eventId });
        setSavedIds(prev => [...prev, eventId]);
      }
    } catch (error) {
      toast({ title: "Error updating saved events", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030303]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-[128px]" />
      </div>

      <Header />
      
      <main className="flex-1 pt-28 md:pt-32 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          {/* Page Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 md:mb-14"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-blue-400">Events</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Discover Events
            </h1>
            <p className="text-zinc-400 max-w-2xl text-base sm:text-lg">
              From hackathons to cultural festivals, find and join the most exciting events happening on campus.
            </p>
          </motion.div>

          {/* Filters Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events..."
                  className="pl-12 h-12 bg-white/[0.03] border-white/[0.08] rounded-xl text-white placeholder:text-zinc-500 focus:bg-white/[0.05] focus:border-white/[0.15] transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    activeCategory === "All"
                      ? "bg-white text-black"
                      : "bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  All Events
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                      activeCategory === cat
                        ? `${categoryColors[cat].bg} ${categoryColors[cat].text} border ${categoryColors[cat].border}`
                        : "bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-12 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-sm font-medium focus:outline-none focus:border-white/[0.15] transition-all cursor-pointer"
              >
                <option value="date">Latest First</option>
                <option value="popularity">Most Popular</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </motion.div>

          {/* Events Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl h-[400px] animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24 bg-white/[0.02] border border-white/[0.06] rounded-3xl"
            >
              <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Search className="w-7 h-7 text-zinc-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
              <p className="text-zinc-500 mb-6">Try adjusting your filters or search terms.</p>
              <Button 
                onClick={() => { setSearch(""); setActiveCategory("All"); }}
                variant="outline"
                className="rounded-xl border-white/[0.1] text-white hover:bg-white/[0.05]"
              >
                Clear filters
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, index) => {
                const eventDate = parseISO(event.date);
                const isRegistered = registeredEvents.has(event.id);
                const isSaved = savedIds.includes(event.id);
                const isEventEnded = isBefore(eventDate, startOfDay(new Date()));
                const colors = categoryColors[event.category];

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300"
                  >
                    {/* Event Image */}
                    <Link to={`/events/${event.id}`} className="block relative h-48 overflow-hidden">
                      {event.image || event.image_url ? (
                        <img
                          src={event.image || event.image_url || ""}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-zinc-700" />
                        </div>
                      )}
                      
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-md",
                          colors.bg, colors.text, colors.border
                        )}>
                          {event.category}
                        </span>
                        {isToday(eventDate) && (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 backdrop-blur-md animate-pulse">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button
                          onClick={(e) => { e.preventDefault(); toggleSave(event.id); }}
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-md transition-all",
                            isSaved 
                              ? "bg-blue-500 text-white" 
                              : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white border border-white/10"
                          )}
                        >
                          <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                        </button>
                        {getPhotosArray(event.photos).length > 0 && (
                          <button
                            onClick={(e) => { e.preventDefault(); setCurrentPhotos(getPhotosArray(event.photos)); setShowPhotosModal(event.id); }}
                            className="w-9 h-9 rounded-lg bg-black/40 text-white/70 hover:bg-black/60 hover:text-white backdrop-blur-md flex items-center justify-center border border-white/10 transition-all"
                          >
                            <Image className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Date Badge */}
                      <div className="absolute bottom-4 left-4">
                        <div className="px-3 py-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
                          <div className="text-xs text-zinc-400 uppercase tracking-wide">{format(eventDate, "MMM")}</div>
                          <div className="text-xl font-bold text-white leading-none">{format(eventDate, "d")}</div>
                        </div>
                      </div>
                    </Link>

                    {/* Event Info */}
                    <div className="p-5">
                      <Link to={`/events/${event.id}`} className="block group/title mb-3">
                        <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover/title:text-blue-400 transition-colors">
                          {event.title}
                        </h3>
                      </Link>

                      <p className="text-sm text-zinc-500 line-clamp-2 mb-5">
                        {event.description || "Join us for this exciting event!"}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-[100px]">{event.location || "Online"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>{event.attendees} going</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isEventEnded ? (
                        <Button
                          disabled
                          className="w-full h-11 rounded-xl bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        >
                          Event Ended
                        </Button>
                      ) : (
                        <Link to={`/events/${event.id}`} className="block">
                          <Button
                            className={cn(
                              "w-full h-11 rounded-xl font-medium transition-all group/btn",
                              isRegistered
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-white text-black hover:bg-zinc-200"
                            )}
                          >
                            {isRegistered ? (
                              "Registered"
                            ) : (
                              <>
                                View Details
                                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
                              </>
                            )}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Photos Modal */}
      <Dialog open={!!showPhotosModal} onOpenChange={() => setShowPhotosModal(null)}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle>Event Photos</DialogTitle>
            <DialogDescription className="text-zinc-500">Browse photos from this event</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {currentPhotos.map((photo, index) => (
              <div key={index} className="aspect-square rounded-xl overflow-hidden bg-zinc-900">
                <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
