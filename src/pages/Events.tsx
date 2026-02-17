import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Flame, MapPin, Search, Star, Users, Bookmark, Bell, MessageSquare, Trash2 } from "lucide-react";
import { addDays, format, isAfter, isBefore, isPast, isToday, parseISO, startOfDay } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
  photos: string[] | null;
  videos: string[] | null;
}

interface EnhancedEvent extends EventRecord {
  category: Category;
  attendees: number;
  attendeeNames: string[];
  trendingScore: number;
}

interface Review {
  id: string;
  eventId: string;
  userId: string;
  author: string;
  rating: number;
  reviewText: string;
  createdAt: string;
}

interface Comment {
  id: string;
  eventId: string;
  userId: string;
  author: string;
  commentText: string;
  createdAt: string;
}

const categories: Category[] = ["Sports", "Tech Talks", "Cultural", "Workshops", "Competitions", "Social"];

const categoryPalette: Record<Category, string> = {
  Sports: "text-neon-amber border-neon-amber/40 bg-neon-amber/10",
  "Tech Talks": "text-secondary border-secondary/40 bg-secondary/10",
  Cultural: "text-accent border-accent/40 bg-accent/10",
  Workshops: "text-primary border-primary/40 bg-primary/10",
  Competitions: "text-neon-red border-neon-red/40 bg-neon-red/10",
  Social: "text-foreground border-border bg-muted/40",
  Uncategorized: "text-muted-foreground border-border bg-muted/20",
};

function normalizeCategory(value: string | null | undefined): Category {
  if (!value) return "Uncategorized";
  const found = [...categories, "Uncategorized" as const].find((category) => category.toLowerCase() === value.toLowerCase());
  return found || "Uncategorized";
}

export default function Events() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [events, setEvents] = useState<EnhancedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [sortBy, setSortBy] = useState<SortOption>("date");

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [rsvpByEvent, setRsvpByEvent] = useState<Record<string, RSVPStatus>>({});
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [showRegisterModal, setShowRegisterModal] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({ full_name: "", roll_number: "", year: "" });
  const [isRegistering, setIsRegistering] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  const [draftReviewByEvent, setDraftReviewByEvent] = useState<Record<string, string>>({});
  const [draftRatingByEvent, setDraftRatingByEvent] = useState<Record<string, number>>({});
  const [draftCommentByEvent, setDraftCommentByEvent] = useState<Record<string, string>>({});

  const fetchPageData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (user?.id && user.email) {
        await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split("@")[0],
          },
          { onConflict: "id" }
        );
      }

      // Try to fetch with photos/videos - if columns don't exist, we'll handle that gracefully
      let eventRows;
      const { data: rowsWithMedia, error: mediaError } = await supabase
        .from("events")
        .select("id,title,description,category,date,time,location,organizer,image,image_url,popularity_score,trending_score,registration_link,created_at,photos,videos")
        .order("date", { ascending: true });

      if (mediaError) {
        // If photos/videos columns don't exist, fetch without them
        const { data: basicRows, error: basicError } = await supabase
          .from("events")
          .select("id,title,description,category,date,time,location,organizer,image,image_url,popularity_score,trending_score,registration_link,created_at")
          .order("date", { ascending: true });
        if (basicError) throw basicError;
        eventRows = basicRows;
      } else {
        eventRows = rowsWithMedia;
      }

      const baseEvents: EnhancedEvent[] = (eventRows || []).map((event: EventRecord) => ({
        ...event,
        category: normalizeCategory(event.category),
        attendees: 0,
        attendeeNames: [],
        trendingScore: Math.max(0, event.trending_score || 0),
      }));

      const finalEvents = baseEvents;
      const eventIds = finalEvents.map((event) => event.id);

      const [{ data: attendeesRows, error: attendeesError }, { data: reviewsRows, error: reviewsError }, { data: commentsRows, error: commentsError }, { data: usersRows, error: usersError }] = await Promise.all([
        supabase.from("event_attendees").select("event_id,user_id,rsvp_status"),
        supabase.from("event_reviews").select("id,event_id,user_id,rating,review_text,created_at").order("created_at", { ascending: false }),
        supabase.from("event_comments").select("id,event_id,user_id,comment_text,created_at").order("created_at", { ascending: false }),
        supabase.from("users").select("id,name,email"),
      ]);

      // Log errors but don't fail the entire page - events can still be shown
      if (attendeesError) console.warn("Failed to load attendees:", attendeesError);
      if (reviewsError) console.warn("Failed to load reviews:", reviewsError);
      if (commentsError) console.warn("Failed to load comments:", commentsError);
      if (usersError) console.warn("Failed to load users:", usersError);

      const usersMap = new Map((usersRows || []).map((profile) => [profile.id, profile.name || profile.email || "Student"]));

      const attendeeCountMap = new Map<string, number>();
      const attendeeNameMap = new Map<string, string[]>();
      (attendeesRows || []).forEach((row) => {
        const key = row.event_id;
        attendeeCountMap.set(key, (attendeeCountMap.get(key) || 0) + 1);
        const currentNames = attendeeNameMap.get(key) || [];
        if (currentNames.length < 4) {
          currentNames.push(usersMap.get(row.user_id) || "Student");
          attendeeNameMap.set(key, currentNames);
        }
      });

      setEvents(
        finalEvents.map((event) => ({
          ...event,
          attendees: attendeeCountMap.get(event.id) ?? event.attendees,
          attendeeNames: attendeeNameMap.get(event.id) || event.attendeeNames,
        }))
      );

      setReviews(
        (reviewsRows || []).map((row) => ({
          id: row.id,
          eventId: row.event_id,
          userId: row.user_id,
          author: usersMap.get(row.user_id) || "Student",
          rating: row.rating,
          reviewText: row.review_text,
          createdAt: row.created_at,
        }))
      );

      setComments(
        (commentsRows || []).map((row) => ({
          id: row.id,
          eventId: row.event_id,
          userId: row.user_id,
          author: usersMap.get(row.user_id) || "Student",
          commentText: row.comment_text,
          createdAt: row.created_at,
        }))
      );

      if (user?.id && eventIds.length) {
        const [{ data: savedRows, error: savedError }, { data: myRsvpRows, error: myRsvpError }] = await Promise.all([
          supabase.from("user_saved_events").select("event_id").eq("user_id", user.id),
          supabase.from("event_attendees").select("event_id,rsvp_status").eq("user_id", user.id),
        ]);

        if (savedError) throw savedError;
        if (myRsvpError) throw myRsvpError;

        setSavedIds((savedRows || []).map((row) => row.event_id));
        setRsvpByEvent(
          (myRsvpRows || []).reduce<Record<string, RSVPStatus>>((acc, row) => {
            if (row.rsvp_status === "going" || row.rsvp_status === "interested") acc[row.event_id] = row.rsvp_status;
            return acc;
          }, {})
        );
      } else {
        setSavedIds([]);
        setRsvpByEvent({});
      }
    } catch (error) {
      console.error("Error loading events page:", error);
      setErrorMessage("Failed to load event data.");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
    fetchUserRegistrations();
  }, [user?.id]);

  // Fetch user's event registrations
  const fetchUserRegistrations = async () => {
    // First check localStorage as backup
    const registeredFromStorage = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('registered_') && localStorage.getItem(key) === 'true') {
        const eventId = key.replace('registered_', '');
        registeredFromStorage.add(eventId);
      }
    }

    if (!user?.id) {
      // Just use localStorage if not logged in
      if (registeredFromStorage.size > 0) {
        setRegisteredEvents(registeredFromStorage);
      }
      return;
    }

    try {
      const { data: regs } = await (supabase
        .from("event_registrations" as any)
        .select("event_id")
        .eq("user_id", user.id) as any);

      const dbRegistrations = new Set<string>();
      if (regs && Array.isArray(regs)) {
        regs.forEach((r: any) => dbRegistrations.add(r.event_id));
        // Update localStorage to match database
        regs.forEach((r: any) => localStorage.setItem(`registered_${r.event_id}`, 'true'));
      }

      // Merge localStorage and DB registrations
      const allRegistered = new Set([...registeredFromStorage, ...dbRegistrations]);
      setRegisteredEvents(allRegistered);
    } catch (err) {
      console.log("Event registrations table not ready yet, using localStorage");
      // Fall back to localStorage
      if (registeredFromStorage.size > 0) {
        setRegisteredEvents(registeredFromStorage);
      }
    }
  };

  const happeningToday = useMemo(
    () => events.filter((event) => isToday(parseISO(event.date)) && !isPast(parseISO(event.date))),
    [events]
  );

  const trendingThisWeek = useMemo(() => {
    const now = new Date();
    const weekEnd = addDays(now, 7);
    return events
      .filter((event) => {
        const eventDate = parseISO(event.date);
        return isAfter(eventDate, startOfDay(now)) && isBefore(eventDate, weekEnd);
      })
      .sort((a, b) => b.attendees + b.trendingScore - (a.attendees + a.trendingScore))
      .slice(0, 4);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = events
      .filter((event) => activeCategory === "All" || event.category === activeCategory)
      .filter((event) => {
        if (!query) return true;
        return (
          event.title.toLowerCase().includes(query) ||
          (event.description || "").toLowerCase().includes(query) ||
          (event.location || "").toLowerCase().includes(query)
        );
      });

    if (sortBy === "date") return result.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    if (sortBy === "popularity") return result.sort((a, b) => b.attendees - a.attendees);
    return result.sort((a, b) => b.trendingScore - a.trendingScore);
  }, [activeCategory, events, search, sortBy]);

  const myEvents = useMemo(
    () =>
      events.filter((event) => {
        const status = rsvpByEvent[event.id];
        return (status === "going" || status === "interested") && !isPast(parseISO(event.date));
      }),
    [events, rsvpByEvent]
  );

  const savedEvents = useMemo(() => events.filter((event) => savedIds.includes(event.id)), [events, savedIds]);

  const myRatings = useMemo(
    () => reviews.filter((review) => review.userId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, user?.id]
  );

  const getEventRating = (eventId: string) => {
    const eventReviews = reviews.filter((review) => review.eventId === eventId);
    if (!eventReviews.length) return null;
    return eventReviews.reduce((sum, review) => sum + review.rating, 0) / eventReviews.length;
  };

  const requireAuth = () => {
    if (user?.id) return true;
    toast({ title: "Sign in required", description: "Please sign in to save events, RSVP, or post reviews/comments.", variant: "destructive" });
    return false;
  };

  const toggleSave = async (eventId: string) => {
    if (!requireAuth() || !user?.id) return;
    setIsSaving(true);
    try {
      if (savedIds.includes(eventId)) {
        const { error } = await supabase.from("user_saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
        if (error) throw error;
        setSavedIds((current) => current.filter((id) => id !== eventId));
      } else {
        const { error } = await supabase.from("user_saved_events").insert({ user_id: user.id, event_id: eventId });
        if (error) throw error;
        setSavedIds((current) => [...current, eventId]);
      }
    } catch (error) {
      console.error("Save event error:", error);
      toast({ title: "Could not update saved events", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const setRSVP = async (eventId: string, status: RSVPStatus) => {
    if (!requireAuth() || !user?.id) return;
    setIsSaving(true);
    try {
      if (!status || rsvpByEvent[eventId] === status) {
        const { error } = await supabase.from("event_attendees").delete().eq("user_id", user.id).eq("event_id", eventId);
        if (error) throw error;
        setRsvpByEvent((current) => ({ ...current, [eventId]: null }));
      } else {
        const { error } = await supabase.from("event_attendees").upsert({ user_id: user.id, event_id: eventId, rsvp_status: status }, { onConflict: "user_id,event_id" });
        if (error) throw error;
        setRsvpByEvent((current) => ({ ...current, [eventId]: status }));
      }
      await fetchPageData();
    } catch (error) {
      console.error("RSVP error:", error);
      toast({ title: "Could not update RSVP", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const submitReview = async (eventId: string) => {
    if (!requireAuth() || !user?.id) return;

    const text = (draftReviewByEvent[eventId] || "").trim();
    const rating = draftRatingByEvent[eventId] || 0;

    if (!text || text.length < 6) {
      toast({ title: "Review too short", description: "Please add at least 6 characters.", variant: "destructive" });
      return;
    }
    if (rating < 1 || rating > 5) {
      toast({ title: "Invalid rating", description: "Rating must be between 1 and 5.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("event_reviews")
        .upsert({ user_id: user.id, event_id: eventId, rating, review_text: text }, { onConflict: "user_id,event_id" });
      if (error) throw error;

      setDraftReviewByEvent((current) => ({ ...current, [eventId]: "" }));
      setDraftRatingByEvent((current) => ({ ...current, [eventId]: 0 }));
      await fetchPageData();
      toast({ title: "Review saved" });
    } catch (error) {
      console.error("Review submit error:", error);
      toast({ title: "Could not save review", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const submitComment = async (eventId: string) => {
    if (!requireAuth() || !user?.id) return;

    const text = (draftCommentByEvent[eventId] || "").trim();
    if (!text || text.length < 2) {
      toast({ title: "Comment too short", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("event_comments").insert({ user_id: user.id, event_id: eventId, comment_text: text });
      if (error) throw error;
      setDraftCommentByEvent((current) => ({ ...current, [eventId]: "" }));
      await fetchPageData();
    } catch (error) {
      console.error("Comment submit error:", error);
      toast({ title: "Could not post comment", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!requireAuth()) return;
    try {
      const { error } = await supabase.from("event_reviews").delete().eq("id", reviewId);
      if (error) throw error;
      await fetchPageData();
    } catch (error) {
      console.error("Delete review error:", error);
      toast({ title: "Could not delete review", variant: "destructive" });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!requireAuth()) return;
    try {
      const { error } = await supabase.from("event_comments").delete().eq("id", commentId);
      if (error) throw error;
      await fetchPageData();
    } catch (error) {
      console.error("Delete comment error:", error);
      toast({ title: "Could not delete comment", variant: "destructive" });
    }
  };

  const reminderText = (eventDate: string) => {
    const date = parseISO(eventDate);
    if (isToday(date)) return "Reminder in 1 hour";
    if (isAfter(date, new Date()) && isBefore(date, addDays(new Date(), 2))) return "Reminder 1 day before";
    return "Reminders active";
  };

  const renderEventCard = (event: EnhancedEvent) => {
    const eventDate = parseISO(event.date);
    const status = rsvpByEvent[event.id];
    const saved = savedIds.includes(event.id);
    const rating = getEventRating(event.id);
    const topReviews = reviews.filter((review) => review.eventId === event.id).slice(0, 2);
    const latestComments = comments.filter((comment) => comment.eventId === event.id).slice(0, 3);
    const canReview = isPast(eventDate) && !isToday(eventDate);

    return (
      <article key={event.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-card/75 backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
        <Link to={`/events/${event.id}`} className="block relative h-44 overflow-hidden bg-muted">
          {event.image || event.image_url ? (
            <img src={event.image || event.image_url || ""} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${categoryPalette[event.category]}`}>
            {event.category}
          </span>
          {isToday(eventDate) && <span className="absolute right-4 top-4 rounded-full border border-primary/60 bg-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Happening Today</span>}
        </Link>

        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/events/${event.id}`} className="hover:text-primary transition-colors">
              <h3 className="font-display text-xl font-semibold tracking-wide text-foreground">{event.title}</h3>
            </Link>
            {rating && (
              <div className="inline-flex items-center gap-1 rounded-md border border-neon-amber/40 bg-neon-amber/10 px-2 py-1 text-xs text-neon-amber">
                <Star size={12} fill="currentColor" />
                {rating.toFixed(1)}
              </div>
            )}
          </div>

          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{event.description}</p>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span className="inline-flex items-center gap-2"><Calendar size={14} className="text-primary" />{format(eventDate, "EEE, MMM d")}</span>
            <span className="inline-flex items-center gap-2"><Clock size={14} className="text-secondary" />{event.time || format(eventDate, "h:mm a")}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-accent" />{event.location || "TBA"}</span>
            <span className="inline-flex items-center gap-2"><Users size={14} className="text-primary" />{event.attendees} attending</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {event.attendeeNames.slice(0, 4).map((name) => (
                <span key={`${event.id}-${name}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-background bg-muted font-mono text-[10px] text-foreground" title={name}>
                  {name[0]}
                </span>
              ))}
            </div>
            {event.attendeeNames.length === 0 && <span className="text-xs text-muted-foreground">No attendees yet</span>}
            <button type="button" onClick={() => void toggleSave(event.id)} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${saved ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
              <Bookmark size={12} /> {saved ? "Saved" : "Save"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={registeredEvents.has(event.id) ? "default" : "outline"}
              className={registeredEvents.has(event.id) ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => {
                if (!user) {
                  toast({ title: 'Login Required', description: 'Please login to register', variant: 'destructive' });
                  return;
                }
                if (registeredEvents.has(event.id)) {
                  return; // Already registered
                }
                setShowRegisterModal(event.id);
              }}
              disabled={isSaving || isRegistering}
            >
              {registeredEvents.has(event.id) ? "✓ Registered" : "Register"}
            </Button>
            <Button variant={status === "interested" ? "default" : "outline"} onClick={() => void setRSVP(event.id, "interested")} disabled={isSaving}>Interested</Button>
          </div>

          {/* Registration Modal */}
          {showRegisterModal === event.id && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/70" onClick={() => setShowRegisterModal(null)} />
              <div className="relative z-10 w-full max-w-md rounded-xl border border-primary/30 bg-card p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-bold text-foreground">Register for {event.title}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!registerForm.full_name.trim() || !registerForm.roll_number.trim() || !registerForm.year) {
                    toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
                    return;
                  }
                  setIsRegistering(true);
                  try {
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    if (!currentUser) {
                      toast({ title: 'Error', description: 'Please login first', variant: 'destructive' });
                      return;
                    }
                    // Check for duplicate
                    const { data: existing } = await (supabase
                      .from("event_registrations" as any)
                      .select("id")
                      .eq("event_id", event.id)
                      .eq("user_id", currentUser.id) as any);
                    if (existing && existing.length > 0) {
                      toast({ title: 'Already Registered', description: 'You have already registered for this event' });
                      setShowRegisterModal(null);
                      return;
                    }
                    // Check if event has already ended
                    const eventDate = new Date(event.date);
                    const now = new Date();
                    if (eventDate < now) {
                      toast({ title: 'Event Ended', description: 'Registration closed - this event has ended', variant: 'destructive' });
                      setIsRegistering(false);
                      return;
                    }
                    // Insert registration and get the returned ID
                    const { data: newReg, error: insertError } = await (supabase
                      .from("event_registrations" as any)
                      .insert({
                        event_id: event.id,
                        user_id: currentUser.id,
                        full_name: registerForm.full_name,
                        roll_number: registerForm.roll_number,
                        year: registerForm.year,
                        qr_code: '' // Initialize empty, will update after
                      })
                      .select('id')
                      .single() as any);

                    if (insertError || !newReg) {
                      toast({ title: 'Error', description: 'Failed to register', variant: 'destructive' });
                      setIsRegistering(false);
                      return;
                    }

                    // Use the database ID as QR code
                    const qrCode = newReg.id;
                    const { error: updateError } = await (supabase
                      .from("event_registrations" as any)
                      .update({ qr_code: qrCode })
                      .eq('id', newReg.id) as any);

                    if (updateError) {
                      console.error('Failed to update QR code:', updateError);
                    }

                    // Save to localStorage as backup
                    localStorage.setItem(`registered_${event.id}`, 'true');
                    setRegisteredEvents(prev => new Set([...prev, event.id]));
                    toast({ title: 'Successfully Registered!', description: 'Your registration is confirmed' });
                    setShowRegisterModal(null);
                    setRegisterForm({ full_name: "", roll_number: "", year: "" });
                  } catch (err) {
                    toast({ title: 'Error', description: 'Failed to register', variant: 'destructive' });
                  } finally {
                    setIsRegistering(false);
                  }
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`full_name_${event.id}`}>Full Name *</Label>
                    <Input
                      id={`full_name_${event.id}`}
                      value={registerForm.full_name}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`roll_${event.id}`}>Roll Number *</Label>
                    <Input
                      id={`roll_${event.id}`}
                      value={registerForm.roll_number}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, roll_number: e.target.value }))}
                      placeholder="Enter your roll number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`year_${event.id}`}>Year *</Label>
                    <select
                      id={`year_${event.id}`}
                      value={registerForm.year}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, year: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Select your year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={isRegistering}>
                      {isRegistering ? "Registering..." : "Submit"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowRegisterModal(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <Link to={`/events/${event.id}`} className="block w-full">
            <Button variant="secondary" className="w-full">View Details</Button>
          </Link>

          {status && !canReview && <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.15em] text-primary"><Bell size={13} /> {reminderText(event.date)}</div>}

          {topReviews.length > 0 && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-background/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Top Reviews</p>
              {topReviews.map((review) => (
                <div key={review.id} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                  <p><span className="text-neon-amber">{"★".repeat(review.rating)}</span> {review.reviewText} — {review.author}</p>
                  {(isAdmin || review.userId === user?.id) && (
                    <button onClick={() => void deleteReview(review.id)} className="text-destructive"><Trash2 size={12} /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canReview && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-background/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Leave a Review</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setDraftRatingByEvent((current) => ({ ...current, [event.id]: star }))} className={`p-1 ${star <= (draftRatingByEvent[event.id] || 0) ? "text-neon-amber" : "text-muted-foreground"}`}>
                    <Star size={14} fill="currentColor" />
                  </button>
                ))}
              </div>
              <Textarea value={draftReviewByEvent[event.id] || ""} onChange={(eventInput) => setDraftReviewByEvent((current) => ({ ...current, [event.id]: eventInput.target.value }))} placeholder="Share your experience" rows={2} />
              <Button size="sm" onClick={() => void submitReview(event.id)} disabled={isSaving}>Submit Review</Button>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-white/10 bg-background/40 p-3">
            <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"><MessageSquare size={12} /> Comments</p>
            {latestComments.map((comment) => (
              <div key={comment.id} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                <p>{comment.commentText} — {comment.author}</p>
                {(isAdmin || comment.userId === user?.id) && <button onClick={() => void deleteComment(comment.id)} className="text-destructive"><Trash2 size={12} /></button>}
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={draftCommentByEvent[event.id] || ""} onChange={(eventInput) => setDraftCommentByEvent((current) => ({ ...current, [event.id]: eventInput.target.value }))} placeholder="Add a comment" />
              <Button size="sm" onClick={() => void submitComment(event.id)} disabled={isSaving}>Post</Button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-28">
        <div className="container mx-auto px-4">
          <section className="mb-10 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card/60 to-secondary/10 p-6 backdrop-blur-xl">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Events Discovery</p>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">Find the <span className="lux-gradient-text">right events</span> every day</h1>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">Search by keywords, filter by category, sort by what matters, save events, RSVP, comment, and post ratings that persist to Supabase.</p>
            {errorMessage && <p className="mt-4 text-xs text-neon-amber">{errorMessage}</p>}
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-10">
              <section>
                <h2 className="mb-4 font-display text-2xl font-bold tracking-wide text-foreground">Browse All Events</h2>
                <div className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-card/65 p-4 md:grid-cols-[1.4fr_1fr_1fr]">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, description, location" className="pl-9" />
                  </div>
                  <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value as Category | "All")} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="All">All Categories</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="date">Sort: Date</option>
                    <option value="popularity">Sort: Popularity</option>
                    <option value="trending">Sort: Trending</option>
                  </select>
                </div>

                {isLoading ? <p className="text-sm text-muted-foreground">Loading events…</p> : filteredEvents.length === 0 ? <p className="text-sm text-muted-foreground">No events found for your current filters.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredEvents.map(renderEventCard)}</div>}
              </section>
            </div>

            <aside className="h-max space-y-4 lg:sticky lg:top-24">
              <div className="rounded-xl border border-primary/20 bg-card/65 p-4">
                <h3 className="mb-3 font-display text-lg font-semibold">My Events</h3>
                {myEvents.length === 0 ? <p className="text-xs text-muted-foreground">RSVP to events to see them here.</p> : (
                  <ul className="space-y-2 text-sm">{myEvents.map((event) => <li key={event.id} className="rounded-md border border-white/10 bg-background/40 p-2"><p className="font-medium text-foreground">{event.title}</p><p className="text-xs text-muted-foreground">{format(parseISO(event.date), "MMM d, h:mm a")}</p></li>)}</ul>
                )}
              </div>

              <div className="rounded-xl border border-secondary/20 bg-card/65 p-4">
                <h3 className="mb-3 font-display text-lg font-semibold">Saved Events</h3>
                {savedEvents.length === 0 ? <p className="text-xs text-muted-foreground">Save events to build your personal calendar.</p> : (
                  <ul className="space-y-2 text-sm">{savedEvents.slice(0, 5).map((event) => <li key={event.id} className="rounded-md border border-white/10 bg-background/40 p-2"><p className="font-medium text-foreground">{event.title}</p><p className="text-xs text-muted-foreground">{event.location || "TBA"}</p></li>)}</ul>
                )}
              </div>

              <div className="rounded-xl border border-neon-amber/30 bg-card/65 p-4">
                <h3 className="mb-3 font-display text-lg font-semibold">My Ratings</h3>
                {myRatings.length === 0 ? <p className="text-xs text-muted-foreground">Ratings you submit after events will appear here.</p> : (
                  <ul className="space-y-2 text-sm">{myRatings.slice(0, 5).map((review) => <li key={review.id} className="rounded-md border border-white/10 bg-background/40 p-2"><p className="text-xs text-neon-amber">{"★".repeat(review.rating)}</p><p className="line-clamp-2 text-xs text-muted-foreground">{review.reviewText}</p></li>)}</ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
