import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, Calendar, MapPin, Clock, ArrowLeft, Users, Check, Heart, Share2, ArrowRight, Ticket } from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    Sports: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
    "Tech Talks": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    Cultural: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    Workshops: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    Competitions: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
    Social: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
    default: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
};

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
    const { toast } = useToast();

    useEffect(() => {
        const checkUserAndRsvp = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && id) {
                const { data } = await (supabase
                    .from('event_registrations' as any)
                    .select('id')
                    .eq('event_id', id)
                    .eq('user_id', user.id)
                    .maybeSingle());
                if (data) setUserRsvp('going');
            }
        };
        checkUserAndRsvp();
    }, [id]);

    useEffect(() => {
        const fetchAttendeeCount = async () => {
            if (!id) return;
            const { count } = await (supabase as any)
                .from('event_registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', id);
            setAttendeeCount(count || 0);
        };
        fetchAttendeeCount();
    }, [id]);

    const handleRsvp = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/login', { state: { message: 'Please login to register for events' } });
            return;
        }

        if (userRsvp === 'going') {
            setIsRsvping(true);
            try {
                await (supabase as any)
                    .from('event_registrations')
                    .delete()
                    .eq('event_id', id)
                    .eq('user_id', user.id);
                setUserRsvp(null);
                setAttendeeCount(prev => Math.max(0, prev - 1));
                toast({ title: 'Registration Cancelled' });
            } catch (error) {
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

        setIsRsvping(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const qrCode = `${id}-${user.id}-${Date.now()}`;
            const { data: existing } = await (supabase as any)
                .from('event_registrations')
                .select('id')
                .eq('event_id', id)
                .eq('user_id', user.id)
                .single();

            if (existing) {
                toast({ title: 'Already Registered', description: 'You are already registered for this event', variant: 'destructive' });
                setIsRsvping(false);
                return;
            }

            const { error } = await (supabase as any)
                .from('event_registrations')
                .insert({
                    event_id: id,
                    user_id: user.id,
                    qr_code: qrCode,
                    full_name: registerForm.full_name,
                    roll_number: registerForm.roll_number,
                    year: registerForm.year
                });

            if (error) throw error;

            setShowRegisterDialog(false);
            setUserRsvp('going');
            setAttendeeCount(prev => prev + 1);

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

                requestNotificationPermission();

                const timeUntil = getTimeUntilEvent(event.date, event.time);
                const countdownText = formatCountdown(timeUntil);

                toast({
                    title: 'Registration Successful!',
                    description: isEventToday(event.date)
                        ? `You're all set! ${event.title} is happening today!`
                        : isEventTomorrow(event.date)
                            ? `You're all set! ${event.title} is tomorrow.`
                            : `You're registered for ${event.title}. See you in ${countdownText}!`,
                    duration: 5000,
                });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to register', variant: 'destructive' });
        } finally {
            setIsRsvping(false);
        }
    };

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
                if (error) throw error;
                setEvent({ ...data, photos: null, videos: null });
            } catch (error) {
                toast({ title: "Error", description: "Failed to load event details", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#030303] flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-[#030303] flex flex-col">
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
                </div>
                <Header />
                <main className="flex-1 container mx-auto px-4 py-20 text-center relative z-10 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6">
                        <Calendar className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Event Not Found</h1>
                    <p className="text-zinc-500 mb-8">The event you're looking for doesn't exist or has been removed.</p>
                    <Link to="/events">
                        <Button className="rounded-xl bg-white text-black hover:bg-zinc-200 h-12 px-8">
                            Back to Events
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
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
    const colors = categoryColors[event.category || ''] || categoryColors.default;

    return (
        <div className="min-h-screen bg-[#030303] flex flex-col">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[128px]" />
            </div>

            <Header />

            <main className="flex-1 pt-24 pb-20 relative z-10">
                <div className="container mx-auto px-4 max-w-6xl">
                    {/* Back Link */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Link 
                            to="/events" 
                            className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-white mb-8 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to all events
                        </Link>
                    </motion.div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Hero Image */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900"
                            >
                                {event.image || event.image_url ? (
                                    <img
                                        src={event.image || event.image_url || ''}
                                        alt={event.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center">
                                        <Calendar className="w-20 h-20 text-zinc-700" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </motion.div>

                            {/* Event Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8"
                            >
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-semibold border",
                                        colors.bg, colors.text, colors.border
                                    )}>
                                        {event.category || 'Event'}
                                    </span>
                                    {isEventEnded && (
                                        <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                            Event Ended
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                                    {event.title}
                                </h1>

                                {/* Meta Info */}
                                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
                                            <Calendar className="w-4 h-4" />
                                            Date
                                        </div>
                                        <p className="text-white font-semibold">{format(eventDate, "MMMM d, yyyy")}</p>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
                                            <Clock className="w-4 h-4" />
                                            Time
                                        </div>
                                        <p className="text-white font-semibold">{event.time || "TBA"}</p>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
                                            <MapPin className="w-4 h-4" />
                                            Location
                                        </div>
                                        <p className="text-white font-semibold">{event.location || "TBA"}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">About this event</h2>
                                    <div className="prose prose-invert prose-zinc max-w-none text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                        {event.description || "No description provided for this event."}
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sticky top-28 space-y-6"
                            >
                                <div className="text-center pb-6 border-b border-white/[0.06]">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium mb-3">
                                        <Ticket className="w-4 h-4" />
                                        Free Event
                                    </div>
                                    <p className="text-sm text-zinc-500">Open for all students</p>
                                </div>

                                <Button
                                    size="lg"
                                    className={cn(
                                        "w-full h-14 rounded-xl text-base font-semibold transition-all",
                                        isEventEnded
                                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                            : userRsvp === 'going' 
                                                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" 
                                                : "bg-white text-black hover:bg-zinc-200"
                                    )}
                                    onClick={handleRsvp}
                                    disabled={isRsvping || isEventEnded}
                                >
                                    {isRsvping ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isEventEnded ? (
                                        "Event Ended"
                                    ) : userRsvp === 'going' ? (
                                        <>
                                            <Check className="w-5 h-5 mr-2" />
                                            Registered
                                        </>
                                    ) : (
                                        <>
                                            Register Now
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </Button>

                                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                                    <Users className="w-4 h-4" />
                                    <span>{attendeeCount} students attending</span>
                                </div>

                                <div className="pt-6 border-t border-white/[0.06] space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 rounded-xl border-white/[0.1] text-white hover:bg-white/[0.05] bg-white/[0.02]"
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
                                            } catch {
                                                toast({ title: "Share Event", description: "Copy this link: " + shareUrl.substring(0, 50) + "..." });
                                            }
                                        }}
                                    >
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share Event
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        className="w-full h-11 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                                    >
                                        <Heart className="w-4 h-4 mr-2" />
                                        Save for later
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Registration Dialog */}
            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogContent className="sm:max-w-[440px] bg-zinc-950 border-white/[0.08] rounded-2xl p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold text-white">Register for Event</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Fill in your details to secure your spot for <strong className="text-white">{event?.title}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegisterConfirm} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="full_name" className="text-sm text-zinc-400">Full Name</Label>
                            <Input
                                id="full_name"
                                value={registerForm.full_name}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Your full name"
                                className="h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-blue-500/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roll_number" className="text-sm text-zinc-400">Roll Number / ID</Label>
                            <Input
                                id="roll_number"
                                value={registerForm.roll_number}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, roll_number: e.target.value }))}
                                placeholder="Enter your roll number"
                                className="h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-blue-500/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year" className="text-sm text-zinc-400">Year of Study</Label>
                            <select
                                id="year"
                                value={registerForm.year}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, year: e.target.value }))}
                                className="flex h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                required
                            >
                                <option value="" className="bg-zinc-900">Select your year</option>
                                <option value="1st Year" className="bg-zinc-900">1st Year</option>
                                <option value="2nd Year" className="bg-zinc-900">2nd Year</option>
                                <option value="3rd Year" className="bg-zinc-900">3rd Year</option>
                                <option value="4th Year" className="bg-zinc-900">4th Year</option>
                            </select>
                        </div>
                        <DialogFooter className="pt-4 gap-3 flex-col">
                            <Button 
                                type="submit" 
                                className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 shadow-lg shadow-blue-500/25" 
                                disabled={isRsvping}
                            >
                                {isRsvping && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                                Complete Registration
                            </Button>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                className="w-full h-11 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05]" 
                                onClick={() => setShowRegisterDialog(false)}
                            >
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
