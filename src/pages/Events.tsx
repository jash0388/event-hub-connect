import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Flame, MapPin, Search, Star, Users, Bookmark, Bell, MessageSquare, Trash2, Filter, ChevronRight, Image } from "lucide-react";
import { addDays, format, isAfter, isBefore, isPast, isToday, parseISO, startOfDay } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Category = "Sports" | "Tech Talks" | "Cultural" | "Workshops" | "Competitions" | "Social" | "Uncategorized";
type SortOption = "date" | "popularity" | "trending";
type RSVPStatus = "going" | "interested" | null;

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

const categoryStyles: Record<Category, string> = {
  Sports: "bg-orange-100 text-orange-700 border-orange-200",
  "Tech Talks": "bg-blue-100 text-blue-700 border-blue-200",
  Cultural: "bg-purple-100 text-purple-700 border-purple-200",
  Workshops: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Competitions: "bg-rose-100 text-rose-700 border-rose-200",
  Social: "bg-slate-100 text-slate-700 border-slate-200",
  Uncategorized: "bg-gray-100 text-gray-700 border-gray-200",
};

function normalizeCategory(value: string | null | undefined): Category {
  if (!value) return "Uncategorized";
  const found = [...categories, "Uncategorized" as const].find((category) => category.toLowerCase() === value.toLowerCase());
  return found || "Uncategorized";
}

// Helper to convert photos to array
function getPhotosArray(photos: string | string[] | null | undefined): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  // Handle comma-separated string
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
  const [showRegisterModal, setShowRegisterModal] = useState<string | null>(null);
  const [showPhotosModal, setShowPhotosModal] = useState<string | null>(null);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [registerForm, setRegisterForm] = useState({ full_name: "", roll_number: "", year: "" });
  const [isRegistering, setIsRegistering] = useState(false);

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
        attendeeNames: [],
        trendingScore: Math.max(0, event.trending_score || 0),
      }));

      // Fetch attendees count from event_registrations
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
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 100%), url("https://images.unsplash.com/photo-1432251407527-504a6b4174a2?q=80&w=1480&auto=format&fit=crop") center center',
      backgroundAttachment: 'fixed',
      backgroundSize: 'cover'
    }}>
      <Header />
      <main className="flex-1 pt-24 md:pt-32 pb-12 md:pb-16">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8 md:mb-12 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 md:mb-4 drop-shadow-lg">Upcoming Events</h1>
            <p className="text-gray-200 max-w-2xl mx-auto text-base sm:text-lg drop-shadow-md px-2">
              Discover and participate in the most exciting events happening on campus. From hackathons to cultural festivals.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="bg-white/90 backdrop-blur-sm p-3 sm:p-4 rounded-2xl md:rounded-full shadow-lg mb-6 md:mb-8 flex flex-col md:flex-row gap-3 md:gap-4 items-center" style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="pl-12 bg-gray-50 border-none rounded-full h-11 sm:h-12 focus:ring-2 focus:ring-green-500 focus:shadow-lg transition-all text-sm sm:text-base"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-11 sm:h-12 w-full md:w-auto px-4 sm:px-6 rounded-full border-gray-100 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none transition-all hover:shadow-md"
            >
              <option value="date">Latest First</option>
              <option value="popularity">Most Popular</option>
              <option value="trending">Trending</option>
            </select>
          </div>

          {/* Events Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-3xl h-[400px] animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-white/90 backdrop-blur-sm rounded-3xl border border-white/20">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-500">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {filteredEvents.map((event, index) => {
                const eventDate = parseISO(event.date);
                const isRegistered = registeredEvents.has(event.id);
                const isSaved = savedIds.includes(event.id);
                const isEventEnded = isBefore(eventDate, startOfDay(new Date()));

                return (
                  <div
                    key={event.id}
                    className="group bg-white/85 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col h-full"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                      boxShadow: '0 15px 35px rgba(0,0,0,0.12)'
                    }}
                  >
                    {/* Event Image */}
                    <Link to={`/events/${event.id}`} className="relative h-44 sm:h-56 block overflow-hidden rounded-t-2xl">
                      {event.image || event.image_url ? (
                        <img
                          src={event.image || event.image_url || ""}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-blue-200" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm", categoryStyles[event.category])}>
                          {event.category}
                        </span>
                        {isToday(eventDate) && (
                          <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse">
                            Today
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); toggleSave(event.id); }}
                        className={cn(
                          "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md",
                          isSaved ? "bg-primary text-white" : "bg-white/80 hover:bg-white text-gray-600 backdrop-blur-sm"
                        )}
                      >
                        <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
                      </button>
                      {getPhotosArray(event.photos).length > 0 && (
                        <button
                          onClick={(e) => { e.preventDefault(); setCurrentPhotos(getPhotosArray(event.photos)); setShowPhotosModal(event.id); }}
                          className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-gray-600 backdrop-blur-sm flex items-center justify-center transition-all shadow-md"
                        >
                          <Image className="w-5 h-5" />
                        </button>
                      )}
                    </Link>

                    {/* Event Info */}
                    <div className="p-4 sm:p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-[#4B5563] font-bold text-sm mb-3">
                        <Calendar className="w-4 h-4" />
                        {format(eventDate, "MMMM d, yyyy")}
                      </div>

                      <Link to={`/events/${event.id}`} className="block group/title">
                        <h3 className="text-xl font-bold text-[#111827] mb-3 line-clamp-2 transition-colors group-hover/title:text-primary">
                          {event.title}
                        </h3>
                      </Link>

                      <p className="text-[#4B5563] text-sm line-clamp-2 mb-6 flex-1">
                        {event.description || "Join us for this exciting event!"}
                      </p>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm text-[#4B5563]">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{event.location || "Online"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#4B5563]">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{event.attendees} students joining</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEventEnded ? (
                          <div className="flex-1">
                            <Button
                              disabled
                              className="w-full rounded-2xl h-12 text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
                            >
                              Ended
                            </Button>
                          </div>
                        ) : (
                          <Link to={`/events/${event.id}`} className="flex-1">
                            <Button
                              className={cn(
                                "w-full rounded-[20px] h-12 text-sm font-bold transition-all",
                                isRegistered
                                  ? "bg-green-100 text-green-700 hover:bg-green-200 border-none"
                                  : "shadow-md hover:shadow-lg"
                              )}
                              variant={isRegistered ? "secondary" : "default"}
                            >
                              {isRegistered ? "✓ Registered" : "Register Now"}
                            </Button>
                          </Link>
                        )}
                        {!isEventEnded && (
                          <Link to={`/events/${event.id}`}>
                            <Button variant="outline" size="icon" className="w-12 h-12 rounded-[20px] border-gray-200 hover:bg-gray-50">
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </Link>
                        )}
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
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
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
