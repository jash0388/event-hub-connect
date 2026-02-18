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
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Calendar, MapPin, Clock, ArrowLeft, Users, Check, Heart, Share2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

    const handleRsvp = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({ title: 'Login Required', description: 'Please login to register', variant: 'destructive' });
            return;
        }

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

            const { error } = await supabase
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

            if (error) throw error;

            setShowRegisterDialog(false);
            setUserRsvp('going');
            setAttendeeCount(prev => prev + 1);
            toast({ title: 'Registered!', description: 'Your entry QR code is ready in your profile.' });
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
                const { data, error } = await supabase
                    .from("events")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) throw error;
                setEvent(data);
            } catch (error: any) {
                console.error("Error fetching event:", error);
                toast({ title: "Error", description: "Failed to load event details", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-20 text-center">
                    <h1 className="text-3xl font-bold mb-6">Event Not Found</h1>
                    <Link to="/events">
                        <Button className="rounded-xl px-8 h-12">Back to Events</Button>
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-20">
                <div className="container mx-auto px-4 max-w-5xl">
                    <Link to="/events" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary mb-8 transition-colors group">
                        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                        Back to all events
                    </Link>

                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        {/* Hero Section */}
                        <div className="relative aspect-[21/9] bg-gray-100">
                            {event.image || event.image_url ? (
                                <img
                                    src={event.image || event.image_url || ''}
                                    alt={event.title}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                                    <Calendar className="w-16 h-16 text-blue-200" />
                                </div>
                            )}
                        </div>

                        <div className="p-8 md:p-12">
                            <div className="flex flex-col lg:flex-row gap-12">
                                {/* Left Column: Info */}
                                <div className="flex-1 space-y-8">
                                    <div className="space-y-4">
                                        <span className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                            {event.category || 'Event'}
                                        </span>
                                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                                            {event.title}
                                        </h1>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-3xl bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                                                <p className="font-bold text-gray-900">{format(new Date(event.date), "MMMM d, yyyy")}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                                                <Clock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time</p>
                                                <p className="font-bold text-gray-900">{event.time || "TBA"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 sm:col-span-2">
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                                                <MapPin className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</p>
                                                <p className="font-bold text-gray-900">{event.location || "To be announced"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold text-gray-900">About this event</h2>
                                        <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                                            {event.description || "No description provided for this event."}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Registration Card */}
                                <div className="lg:w-80 shrink-0">
                                    <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-8 sticky top-28 space-y-6">
                                        <div className="text-center pb-6 border-b border-gray-200">
                                            <p className="text-3xl font-extrabold text-gray-900">Free</p>
                                            <p className="text-sm text-gray-500 font-medium mt-1">Limited seats available</p>
                                        </div>

                                        <div className="space-y-4">
                                            <Button
                                                size="lg"
                                                className={cn(
                                                    "w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20",
                                                    userRsvp === 'going' ? "bg-green-600 hover:bg-green-700" : ""
                                                )}
                                                onClick={handleRsvp}
                                                disabled={isRsvping}
                                            >
                                                {isRsvping ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : userRsvp === 'going' ? (
                                                    <><Check className="w-5 h-5 mr-2" /> Registered</>
                                                ) : (
                                                    "Register Now"
                                                )}
                                            </Button>

                                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                                                <Users className="w-4 h-4" />
                                                <span>{attendeeCount} students attending</span>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-200 flex flex-col gap-3">
                                            <Button variant="outline" className="w-full h-12 rounded-xl gap-2 font-bold text-gray-700">
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

            {/* Registration Dialog */}
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
