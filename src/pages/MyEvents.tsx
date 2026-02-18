import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, Clock, ArrowRight, Bell, BellOff } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
    getTimeUntilEvent,
    requestNotificationPermission,
    initializeReminderCheck,
} from "@/lib/notifications";

interface MyEvent {
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
    joined_at: string;
}

export default function MyEvents() {
    const [events, setEvents] = useState<MyEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [countdowns, setCountdowns] = useState<Record<string, ReturnType<typeof getTimeUntilEvent>>>({});
    const { toast } = useToast();

    // Handle notification toggle
    const handleToggleNotifications = async () => {
        if (notificationsEnabled) {
            toast({ title: 'Notifications Disabled', description: 'You will no longer receive event reminders.' });
            setNotificationsEnabled(false);
        } else {
            const permitted = await requestNotificationPermission();
            if (permitted) {
                setNotificationsEnabled(true);
                toast({ title: 'Notifications Enabled', description: 'You will receive reminders on the day of your events!' });
            } else {
                toast({ title: 'Notifications Blocked', description: 'Please enable notifications in your browser settings.', variant: 'destructive' });
            }
        }
    };

    // Fetch events and setup notifications
    useEffect(() => {
        const fetchMyEvents = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    toast({ title: "Login Required", description: "Please login to see your events", variant: "destructive" });
                    setIsLoading(false);
                    return;
                }
                setUser(user);

                // Fetch events user has RSVP'd to
                const { data: attendees, error: attendeeError } = await supabase
                    .from("event_attendees")
                    .select("event_id, joined_at, rsvp_status")
                    .eq("user_id", user.id)
                    .eq("rsvp_status", "going");

                if (attendeeError) throw attendeeError;

                if (attendees && attendees.length > 0) {
                    const eventIds = attendees.map(a => a.event_id);
                    const { data: eventsData, error: eventsError } = await supabase
                        .from("events")
                        .select("id,title,description,category,date,time,location,organizer,image,image_url")
                        .in("id", eventIds);

                    if (eventsError) throw eventsError;

                    // Merge with join dates
                    const myEvents = eventsData?.map(event => {
                        const attendee = attendees.find(a => a.event_id === event.id);
                        return {
                            ...event,
                            joined_at: attendee?.joined_at || ""
                        };
                    }) || [];

                    // Sort by date
                    myEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    setEvents(myEvents);

                    // Initialize countdown timers
                    const initialCountdowns: Record<string, ReturnType<typeof getTimeUntilEvent>> = {};
                    myEvents.forEach(event => {
                        initialCountdowns[event.id] = getTimeUntilEvent(event.date, event.time);
                    });
                    setCountdowns(initialCountdowns);

                    // Request notification permission and setup reminder check
                    const permitted = await requestNotificationPermission();
                    setNotificationsEnabled(permitted);

                    if (permitted && user) {
                        initializeReminderCheck(
                            myEvents.map(e => ({
                                id: e.id,
                                title: e.title,
                                date: e.date,
                                time: e.time,
                                location: e.location
                            })),
                            user.id
                        );
                    }
                }
            } catch (error: any) {
                console.error("Error fetching events:", error);
                toast({ title: "Error", description: "Failed to load your events", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyEvents();
    }, [toast]);

    // Update countdowns every minute
    useEffect(() => {
        if (events.length === 0) return;

        const interval = setInterval(() => {
            const updatedCountdowns: Record<string, ReturnType<typeof getTimeUntilEvent>> = {};
            events.forEach(event => {
                updatedCountdowns[event.id] = getTimeUntilEvent(event.date, event.time);
            });
            setCountdowns(updatedCountdowns);
        }, 60000);

        return () => clearInterval(interval);
    }, [events]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto px-4">
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-display font-bold text-foreground mb-2">My Events</h1>
                            <p className="text-muted-foreground">Events you've RSVP'd to</p>
                        </div>
                        {user && events.length > 0 && (
                            <Button
                                variant={notificationsEnabled ? "default" : "outline"}
                                onClick={handleToggleNotifications}
                                className="gap-2"
                            >
                                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                {notificationsEnabled ? 'Reminders On' : 'Enable Reminders'}
                            </Button>
                        )}
                    </div>

                    {!user ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-4">Please login to see your events</p>
                            <Link to="/admin/login">
                                <Button>Login</Button>
                            </Link>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-4">You haven't RSVP'd to any events yet</p>
                            <Link to="/events">
                                <Button>Browse Events</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((event) => (
                                <div
                                    key={event.id}
                                    className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group"
                                >
                                    <div className="aspect-video relative bg-muted">
                                        {event.image || event.image_url ? (
                                            <img
                                                src={event.image || event.image_url || ''}
                                                alt={event.title}
                                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                                                <Calendar className="w-12 h-12 text-muted-foreground/50" />
                                            </div>
                                        )}
                                        {/* Countdown Badge */}
                                        {countdowns[event.id] && !countdowns[event.id].isPast && (
                                            <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-md text-sm font-mono font-bold backdrop-blur-sm ${countdowns[event.id].isToday
                                                    ? 'bg-neon-red/90 text-white animate-pulse'
                                                    : 'bg-primary/90 text-primary-foreground'
                                                }`}>
                                                {countdowns[event.id].isToday ? '🔥 TODAY' :
                                                    countdowns[event.id].days > 0 ?
                                                        `⏰ ${countdowns[event.id].days}d ${countdowns[event.id].hours}h` :
                                                        `⏰ ${countdowns[event.id].hours}h ${countdowns[event.id].minutes}m`}
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2 py-1 rounded-md text-xs font-mono uppercase bg-background/80 backdrop-blur-sm">
                                                {event.category || 'Event'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <h3 className="font-display font-bold text-lg line-clamp-1">{event.title}</h3>
                                        <div className="space-y-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-primary" />
                                                <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                                            </div>
                                            {event.time && (
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-primary" />
                                                    <span>{event.time}</span>
                                                </div>
                                            )}
                                            {event.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-primary" />
                                                    <span className="line-clamp-1">{event.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        <Link to={`/events/${event.id}`}>
                                            <Button className="w-full mt-2" variant="outline">
                                                View Details <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
