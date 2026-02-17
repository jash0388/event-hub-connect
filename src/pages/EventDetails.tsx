import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "@/components/ui/dialog";
import { Loader2, Calendar, MapPin, Clock, ArrowLeft, Users, Check, Heart } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

    // Check if user is logged in and fetch RSVP status
    useEffect(() => {
        const checkUserAndRsvp = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && id) {
                const { data } = await supabase
                    .from('event_attendees')
                    .select('rsvp_status')
                    .eq('event_id', id)
                    .eq('user_id', user.id)
                    .single();
                if (data) setUserRsvp(data.rsvp_status);
            }
        };
        checkUserAndRsvp();
    }, [id]);

    // Fetch attendee count
    useEffect(() => {
        const fetchAttendeeCount = async () => {
            if (!id) return;
            const { count } = await supabase
                .from('event_attendees')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', id)
                .eq('rsvp_status', 'going');
            setAttendeeCount(count || 0);
        };
        fetchAttendeeCount();
    }, [id]);

    // Handle RSVP - open registration dialog
    const handleRsvp = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({ title: 'Login Required', description: 'Please login to register', variant: 'destructive' });
            return;
        }

        // If already registered, cancel
        if (userRsvp === 'going') {
            setIsRsvping(true);
            try {
                await supabase
                    .from('event_attendees')
                    .delete()
                    .eq('event_id', id)
                    .eq('user_id', user.id);
                setUserRsvp(null);
                setAttendeeCount(prev => Math.max(0, prev - 1));
                toast({ title: 'Registration Cancelled', description: 'Your registration has been cancelled' });
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to cancel registration', variant: 'destructive' });
            } finally {
                setIsRsvping(false);
            }
        } else {
            // Show registration dialog
            setShowRegisterDialog(true);
        }
    };

    // Handle registration confirmation
    const handleRegisterConfirm = async () => {
        // Validate form
        if (!registerForm.full_name.trim()) {
            toast({ title: 'Error', description: 'Full Name is required', variant: 'destructive' });
            return;
        }
        if (!registerForm.roll_number.trim()) {
            toast({ title: 'Error', description: 'Roll Number is required', variant: 'destructive' });
            return;
        }
        if (!registerForm.year.trim()) {
            toast({ title: 'Error', description: 'Year is required', variant: 'destructive' });
            return;
        }

        setIsRsvping(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: 'Login Required', description: 'Please login to register', variant: 'destructive' });
                return;
            }

            // Generate unique QR code string
            const qrCode = `${id}-${user.id}-${Date.now()}`;
            console.log('Generating QR code:', qrCode);

            // RSVP with QR code and registration details
            const { data, error } = await supabase
                .from('event_attendees')
                .upsert({
                    event_id: id,
                    user_id: user.id,
                    rsvp_status: 'going',
                    joined_at: new Date().toISOString(),
                    qr_code: qrCode,
                    full_name: registerForm.full_name,
                    roll_number: registerForm.roll_number,
                    year: registerForm.year
                }, { onConflict: 'event_id, user_id' });

            console.log('RSVP result:', data, 'error:', error);

            if (error) {
                console.error('RSVP Error:', error);
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
                return;
            }

            // Also update profile with the details
            await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: registerForm.full_name,
                    college: registerForm.roll_number,
                    year: registerForm.year,
                    updated_at: new Date().toISOString()
                });

            setShowRegisterDialog(false);
            setUserRsvp('going');
            setAttendeeCount(prev => prev + 1);
            setRegisterForm({ full_name: '', roll_number: '', year: '' });
            toast({ title: 'Registered!', description: 'You are going to this event! Your entry QR code is ready in your profile.' });
        } catch (error) {
            console.error('RSVP catch error:', error);
            toast({ title: 'Error', description: 'Failed to register', variant: 'destructive' });
        } finally {
            setIsRsvping(false);
        }
    };

    // Handle Interested
    const handleInterested = async () => {
        setIsRsvping(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: 'Login Required', description: 'Please login to mark interest', variant: 'destructive' });
                return;
            }

            if (userRsvp === 'interested') {
                // Remove interest
                await supabase
                    .from('event_attendees')
                    .delete()
                    .eq('event_id', id)
                    .eq('user_id', user.id);
                setUserRsvp(null);
                toast({ title: 'Removed', description: 'You are no longer interested in this event' });
            } else {
                // Mark as interested
                await supabase
                    .from('event_attendees')
                    .upsert({
                        event_id: id,
                        user_id: user.id,
                        rsvp_status: 'interested',
                        joined_at: new Date().toISOString()
                    });
                setUserRsvp('interested');
                toast({ title: 'Interest Marked!', description: 'You are interested in this event!' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update interest', variant: 'destructive' });
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
                    .select("id,title,description,category,date,time,location,organizer,image,image_url,registration_link")
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
                toast({
                    title: "Error",
                    description: "Failed to load event details",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [id, toast]);

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

    if (!event) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-20 text-center">
                    <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                    <Link to="/events">
                        <Button>Back to Events</Button>
                    </Link>
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
                    <Link to="/events" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Events
                    </Link>

                    {/* Hero Section */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted border border-border">
                            {event.image || event.image_url ? (
                                <img
                                    src={event.image || event.image_url || ''}
                                    alt={event.title}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                                    <span className="text-muted-foreground">No Cover Image</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col justify-center space-y-6">
                            <div className="space-y-2">
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                    {event.category || 'Event'}
                                </span>
                                <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                                    {event.title}
                                </h1>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span>{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span>{event.time || format(new Date(event.date), "p")}</span>
                                </div>
                                <div className="flex items-center gap-2 col-span-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span>{event.location || "TBA"}</span>
                                </div>
                            </div>

                            {event.registration_link && (
                                <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                                    <Button size="lg" className="w-full md:w-auto">
                                        Register Now
                                    </Button>
                                </a>
                            )}

                            {/* RSVP Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <Button
                                    size="lg"
                                    className={`w-full ${userRsvp === 'going' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}
                                    onClick={handleRsvp}
                                    disabled={isRsvping}
                                >
                                    {isRsvping ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : userRsvp === 'going' ? (
                                        <><Check className="w-4 h-4 mr-2" /> REGISTERED</>
                                    ) : (
                                        <><Check className="w-4 h-4 mr-2" /> REGISTER</>
                                    )}
                                </Button>
                                <Button
                                    size="lg"
                                    variant={userRsvp === 'interested' ? "default" : "outline"}
                                    className="w-full"
                                    onClick={handleInterested}
                                    disabled={isRsvping}
                                >
                                    {userRsvp === 'interested' ? (
                                        <><Heart className="w-4 h-4 mr-2 fill-current" /> INTERESTED</>
                                    ) : (
                                        <><Heart className="w-4 h-4 mr-2" /> INTERESTED</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-16 max-w-4xl">
                        <h2 className="text-2xl font-display font-bold mb-4 border-b border-border pb-2">About Event</h2>
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                            {event.description || "No description provided."}
                        </div>
                    </div>

                    {/* Photos Gallery */}
                    {event.photos && event.photos.length > 0 && (
                        <div className="mb-16">
                            <h2 className="text-2xl font-display font-bold mb-6 border-b border-border pb-2">Event Photos</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {event.photos.map((photo, index) => (
                                    <div key={index} className="rounded-xl overflow-hidden bg-muted border border-border aspect-[4/3] group relative">
                                        <img
                                            src={photo}
                                            alt={`Event photo ${index + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Videos Gallery */}
                    {event.videos && event.videos.length > 0 && (
                        <div className="mb-16">
                            <h2 className="text-2xl font-display font-bold mb-6 border-b border-border pb-2">Event Videos</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {event.videos.map((video, index) => (
                                    <div key={index} className="rounded-xl overflow-hidden bg-black border border-border aspect-video">
                                        <video
                                            controls
                                            className="w-full h-full"
                                            preload="metadata"
                                        >
                                            <source src={video} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />

            {/* Registration Dialog */}
            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Register for {event?.title}</DialogTitle>
                        <DialogDescription>
                            Please fill in your details to register for this event.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegisterConfirm} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Full Name *</Label>
                            <Input
                                id="full_name"
                                value={registerForm.full_name}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roll_number">Roll Number *</Label>
                            <Input
                                id="roll_number"
                                value={registerForm.roll_number}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, roll_number: e.target.value }))}
                                placeholder="Enter your roll number"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year *</Label>
                            <select
                                id="year"
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
                        <Button type="submit" className="w-full" disabled={isRsvping}>
                            {isRsvping ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Complete Registration
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
