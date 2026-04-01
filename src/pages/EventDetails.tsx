import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Calendar, MapPin, Clock, ArrowLeft, Users, Check, Heart, Share2 } from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    addEventReminder,
    requestNotificationPermission,
    getTimeUntilEvent,
    formatCountdown,
    isEventToday,
    isEventTomorrow
} from "@/lib/notifications";

interface EventDetail {
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
    registration_link: string | null;
    photos: string[] | null;
    videos: string[] | null;
}

export default function EventDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<EventDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [attendeeCount, setAttendeeCount] = useState(0);
    const [userRsvp, setUserRsvp] = useState<string | null>(null);
    const [isRsvping, setIsRsvping] = useState(false);
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        full_name: "",
        roll_number: "",
        year: ""
    });
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    // Use admin client if available (production bypass for Firebase users)
    const adminClient = useMemo(() => supabaseAdmin || supabase, []);

    // Fetch RSVP status
    useEffect(() => {
        const fetchRsvp = async () => {
            if (user && id) {
                try {
                    const { data, error } = await adminClient
                        .from('event_registrations' as any)
                        .select('id')
                        .eq('event_id', id)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    
                    if (data) {
                        setUserRsvp('going');
                    } else {
                        setUserRsvp(null);
                    }
                } catch (err) {
                    console.error("Error fetching RSVP:", err);
                    setUserRsvp(null);
                }
            } else {
                setUserRsvp(null);
            }
        };
        fetchRsvp();
    }, [id, user, adminClient]);

    // Fetch attendee count
    useEffect(() => {
        const fetchAttendeeCount = async () => {
            if (!id) return;
            try {
                const { count } = await adminClient
                    .from('event_registrations' as any)
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', id);
                setAttendeeCount(count || 0);
            } catch (err) {
                console.error("Error fetching count:", err);
            }
        };
        fetchAttendeeCount();
    }, [id, adminClient]);

    const handleRsvp = async () => {
        if (!user) {
            toast({ title: 'Login Required', description: 'Please login to register', variant: 'destructive' });
            navigate('/login', { state: { from: { pathname: window.location.pathname } } });
            return;
        }

        if (userRsvp === 'going') {
            setIsRsvping(true);
            try {
                const { error } = await adminClient
                    .from('event_registrations' as any)
                    .delete()
                    .eq('event_id', id)
                    .eq('user_id', user.id);
                
                if (error) throw error;
                
                // Also update event_attendees for robustness
                await adminClient
                    .from('event_attendees' as any)
                    .delete()
                    .eq('event_id', id)
                    .eq('user_id', user.id);

                setUserRsvp(null);
                setAttendeeCount(prev => Math.max(0, prev - 1));
                toast({ title: 'Registration Cancelled' });
            } catch (error: any) {
                console.error('Cancel Error:', error);
                toast({ title: 'Error', description: 'Failed to cancel registration', variant: 'destructive' });
            } finally {
                setIsRsvping(false);
            }
        } else {
            setShowRegisterDialog(true);
        }
    };

    const handleRegisterConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!registerForm.full_name.trim() || !registerForm.roll_number.trim() || !registerForm.year.trim()) {
            toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
            return;
        }

        if (!user) return;
        setIsRsvping(true);
        
        try {
            const qrCode = `${id}-${user.id}-${Date.now()}`;

            // Check existing
            const { data: existing } = await adminClient
                .from('event_registrations' as any)
                .select('id')
                .eq('event_id', id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                toast({ title: 'Already Registered' });
                setIsRsvping(false);
                setShowRegisterDialog(false);
                setUserRsvp('going');
                return;
            }

            // Insert into event_registrations with basic fields only first, to check for success
            const regPayload: any = {
                event_id: id,
                user_id: user.id,
                qr_code: qrCode,
                full_name: registerForm.full_name,
                roll_number: registerForm.roll_number,
                year: registerForm.year,
                status: 'going'
            };

            // Only add these if they exist in the event record
            if (event?.title) regPayload.event_title = event.title;
            if (event?.date) regPayload.event_date = event.date;

            const { error: regError } = await adminClient
                .from('event_registrations' as any)
                .insert(regPayload);

            if (regError) {
                console.error('Core Registration Error:', regError);
                throw regError;
            }

            // Success! Proceed with UI updates and non-critical tasks
            setShowRegisterDialog(false);
            setUserRsvp('going');
            setAttendeeCount(prev => prev + 1);

            // Parallel insert into legacy table for compatibility
            adminClient.from('event_attendees' as any).insert({
                event_id: id,
                user_id: user.id,
                rsvp_status: 'going'
            }).then(({ error }) => {
                if (error) console.warn("Legacy table insertion failed (non-critical):", error);
            });

            if (event) {
                addEventReminder({
                    eventId: id!,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventTime: event.time,
                    location: event.location,
                    userId: user.id,
                    notified: false
                });
            }

            requestNotificationPermission();

            if (event) {
                const timeUntil = getTimeUntilEvent(event.date, event.time);
                const countdownText = formatCountdown(timeUntil);
                toast({
                    title: '🎉 Registration Successful!',
                    description: `You're registered for ${event.title}.`,
                    duration: 5000,
                });
            }
        } catch (error: any) {
            console.error('Final Registration Failure:', error);
            toast({ 
                title: 'Registration Failed', 
                description: error.message || 'There was a problem securing your spot. Please try again or contact support.', 
                variant: 'destructive' 
            });
        } finally {
            setIsRsvping(false);
        }
    };

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("events")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) throw error;

                const eventData: EventDetail = {
                    ...data,
                    photos: null,
                    videos: null
                };
                setEvent(eventData);
            } catch (error: any) {
                console.error("Error fetching event:", error);
                toast({ title: "Error", description: "Failed to load event details", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvent();
    }, [id, toast]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-foreground" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-6 pt-28 text-center">
                    <h1 className="text-3xl font-bold text-foreground mb-6">Event Not Found</h1>
                    <Link to="/events">
                        <Button className="rounded-xl px-8 h-12 bg-foreground text-background hover:bg-foreground/90">Back to Events</Button>
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    const eventDate = parseISO(event.date);
    const today = startOfDay(new Date());
    const eventStartDate = startOfDay(eventDate);
    const isEventEnded = isBefore(eventStartDate, today);

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            <Header />
            <main className="flex-1 pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-5xl">
                    <Link to="/events" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors group">
                        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                        Back to all events
                    </Link>

                    <div className="bg-card rounded-3xl border border-border overflow-hidden animate-fade-in-up">
                        <div className="relative aspect-[21/9] bg-secondary">
                            {event.image || event.image_url ? (
                                <img
                                    src={event.image || event.image_url || ''}
                                    alt={event.title}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-secondary flex items-center justify-center">
                                    <Calendar className="w-16 h-16 text-muted-foreground/30" />
                                </div>
                            )}
                        </div>

                        <div className="p-8 md:p-12">
                            <div className="flex flex-col lg:flex-row gap-12">
                                <div className="flex-1 space-y-8">
                                    <div className="space-y-4">
                                        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-foreground text-background">
                                            {event.category || 'Event'}
                                        </span>
                                        <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                                            {event.title}
                                        </h1>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-secondary border border-border">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-foreground">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</p>
                                                <p className="font-semibold text-foreground">{format(new Date(event.date), "MMMM d, yyyy")}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-foreground">
                                                <Clock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</p>
                                                <p className="font-semibold text-foreground">{event.time || "TBA"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 sm:col-span-2">
                                            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-foreground">
                                                <MapPin className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</p>
                                                <p className="font-semibold text-foreground">{event.location || "To be announced"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold text-foreground">About this event</h2>
                                        <div className="prose prose-gray max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                            {event.description || "No description provided for this event."}
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:w-80 shrink-0">
                                    <div className="bg-secondary border border-border rounded-2xl p-8 sticky top-28 space-y-6">
                                        <div className="text-center pb-6 border-b border-border">
                                            <p className="text-3xl font-bold text-foreground">Free</p>
                                            <p className="text-sm text-muted-foreground font-medium mt-1">Limited seats available</p>
                                        </div>

                                        <div className="space-y-4">
                                            <Button
                                                size="lg"
                                                className={cn(
                                                    "w-full h-14 rounded-xl text-lg font-medium transition-all",
                                                    isEventEnded
                                                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                                                        : userRsvp === 'going' 
                                                            ? "bg-[hsl(var(--sage))] text-background hover:bg-[hsl(var(--sage))]/90" 
                                                            : "bg-foreground text-background hover:bg-foreground/90"
                                                )}
                                                onClick={handleRsvp}
                                                disabled={isRsvping || isEventEnded}
                                            >
                                                {isRsvping ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : isEventEnded ? (
                                                    "Event Ended"
                                                ) : userRsvp === 'going' ? (
                                                    <><Check className="w-5 h-5 mr-2" /> Registered</>
                                                ) : (
                                                    "Register Now"
                                                )}
                                            </Button>

                                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
                                                <Users className="w-4 h-4" />
                                                <span>{attendeeCount} students attending</span>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-border flex flex-col gap-3">
                                            <Button
                                                variant="outline"
                                                className="w-full h-12 rounded-xl gap-2 font-medium border-border hover:bg-card"
                                                onClick={async () => {
                                                    const shareUrl = window.location.href;
                                                    try {
                                                        if (navigator.share) {
                                                            await navigator.share({
                                                                title: event.title,
                                                                text: `Check out this event: ${event.title}`,
                                                                url: shareUrl
                                                            });
                                                        } else {
                                                            await navigator.clipboard.writeText(shareUrl);
                                                            toast({ title: "Link copied!", description: "Event link copied to clipboard" });
                                                        }
                                                    } catch (err) {
                                                        toast({
                                                            title: "Share Event",
                                                            description: "Copy this link to share: " + shareUrl.substring(0, 50) + "..."
                                                        });
                                                    }
                                                }}
                                            >
                                                <Share2 className="w-4 h-4" />
                                                Share Event
                                            </Button>
                                            <Button variant="ghost" className="w-full h-12 rounded-xl gap-2 font-bold text-gray-500">
                                                <Heart className="w-4 h-4" />
                                                Save for later
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogContent className="sm:max-w-[440px] rounded-[2rem] p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold">Registration</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Fill in your details to secure your spot for <strong>{event?.title}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegisterConfirm} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="full_name" className="text-sm font-bold text-gray-700">Full Name</Label>
                            <Input
                                id="full_name"
                                value={registerForm.full_name}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Your full name"
                                className="h-12 rounded-xl border-gray-100 bg-gray-50 px-4"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roll_number" className="text-sm font-bold text-gray-700">Roll Number / ID</Label>
                            <Input
                                id="roll_number"
                                value={registerForm.roll_number}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, roll_number: e.target.value }))}
                                placeholder="Enter your roll number"
                                className="h-12 rounded-xl border-gray-100 bg-gray-50 px-4"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year" className="text-sm font-bold text-gray-700">Year of Study</Label>
                            <select
                                id="year"
                                value={registerForm.year}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, year: e.target.value }))}
                                className="flex h-12 w-full rounded-xl border-gray-100 bg-gray-50 px-4 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
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
                        <DialogFooter className="pt-4 gap-3 sm:flex-col">
                            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20" disabled={isRsvping}>
                                {isRsvping && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                                Complete Registration
                            </Button>
                            <Button type="button" variant="ghost" className="w-full h-12 rounded-xl text-gray-500 font-bold" onClick={() => setShowRegisterDialog(false)}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
