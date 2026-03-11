import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, User, Calendar, MapPin, Clock, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

const Profile = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [userEventQRCodes, setUserEventQRCodes] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchUserEventQRCodes = async () => {
            try {
                // Try fetching from both tables
                const { data: registrations } = await (supabase
                    .from('event_registrations' as any)
                    .select('*, events(*)')
                    .eq('user_id', user.id) as any);

                const { data: attendees } = await (supabase
                    .from('event_attendees')
                    .select('*, events(*)')
                    .eq('user_id', user.id)
                    .eq('rsvp_status', 'going') as any);

                const combined = [
                    ...(registrations || []).map((r: any) => ({
                        ...r.events,
                        qr_code: r.qr_code,
                        full_name: r.full_name,
                        roll_number: r.roll_number,
                        year: r.year,
                        registered_at: r.created_at,
                        scanned_at: r.scanned_at,
                        source: 'registrations'
                    })),
                    ...(attendees || []).map((a: any) => ({
                        ...a.events,
                        qr_code: a.qr_code,
                        joined_at: a.joined_at,
                        source: 'attendees'
                    }))
                ];

                // Remove duplicates by event id
                const uniqueEvents = Array.from(new Map(combined.map(item => [item.id, item])).values());
                setUserEventQRCodes(uniqueEvents);
            } catch (error) {
                console.error('Error fetching QR codes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserEventQRCodes();
    }, [user]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-foreground" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1 flex items-center justify-center px-6 pt-28 pb-16">
                    <div className="w-full max-w-sm">
                        <div className="bg-card rounded-3xl p-8 text-center border border-border card-3d animate-fade-in-up">
                            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                                <User className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h1 className="text-2xl font-bold text-foreground mb-2">Login Required</h1>
                            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">Please login to view your profile and access your event tickets.</p>
                            <Link to="/login">
                                <Button className="w-full h-12 rounded-xl font-medium bg-foreground text-background hover:bg-foreground/90">
                                    Go to Login
                                </Button>
                            </Link>
                            <p className="text-xs text-muted-foreground mt-4">New student? <Link to="/login" className="text-foreground font-medium hover:text-[hsl(var(--accent))]">Create an account</Link></p>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 pt-28 pb-16">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="space-y-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-2">My Events</h1>
                                <p className="text-gray-500">View and manage your registered event tickets</p>
                            </div>
                        </div>

                        {userEventQRCodes.length > 0 ? (
                            <div className="grid gap-8">
                                {userEventQRCodes.map((event: any) => {
                                    const eventDate = new Date(event.date);
                                    const now = new Date();
                                    const isExpired = eventDate < now;
                                    const isScanned = event.scanned_at;

                                    return (
                                        <div key={event.id} className={cn(
                                            "relative bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row hover:scale-[1.02] transition-all duration-300",
                                            isExpired && "opacity-75 grayscale-[0.5]"
                                        )}>
                                            {/* Ticket Side - QR */}
                                            <div className="md:w-64 bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-5 sm:p-8 border-b md:border-b-0 md:border-r border-dashed border-gray-300 relative">
                                                {/* Notch circles */}
                                                <div className="hidden md:block absolute -left-3 top-8 w-6 h-6 bg-white rounded-full shadow-md" />
                                                <div className="hidden md:block absolute -left-3 bottom-8 w-6 h-6 bg-white rounded-full shadow-md" />

                                                <div className="bg-white rounded-2xl shadow-lg p-4">
                                                    <QRCodeSVG
                                                        value={event.qr_code || event.id}
                                                        size={140}
                                                        level="H"
                                                        includeMargin
                                                    />
                                                </div>
                                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-4">
                                                    Ticket ID: {event.qr_code?.substring(0, 12) || event.id.substring(0, 12)}
                                                </p>
                                            </div>

                                            {/* Main Side - Info */}
                                            <div className="flex-1 p-5 sm:p-8 md:p-10 relative">
                                                {/* Ticket Notch Decorations */}
                                                <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-md" />

                                                <div className="flex flex-col h-full">
                                                    <div className="mb-6">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                                                                {event.category || 'Event Pass'}
                                                            </span>
                                                            {isScanned ? (
                                                                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                                                    ✓ Verified
                                                                </span>
                                                            ) : isExpired ? (
                                                                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                                                                    Expired
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <h3 className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                                                            {event.title}
                                                        </h3>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-auto">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <Calendar className="w-4 h-4" />
                                                                <span className="text-sm uppercase tracking-wide text-slate-400">Date</span>
                                                            </div>
                                                            <p className="font-semibold text-slate-700">{format(eventDate, "MMM d, yyyy")}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <Clock className="w-4 h-4" />
                                                                <span className="text-sm uppercase tracking-wide text-slate-400">Time</span>
                                                            </div>
                                                            <p className="font-semibold text-slate-700">{event.time || "TBA"}</p>
                                                        </div>
                                                        <div className="space-y-1 sm:col-span-2">
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <MapPin className="w-4 h-4" />
                                                                <span className="text-sm uppercase tracking-wide text-slate-400">Location</span>
                                                            </div>
                                                            <p className="font-semibold text-slate-700">{event.location || "To be announced"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-white rounded-[2rem] border border-dashed border-gray-200">
                                <Ticket className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No tickets found</h3>
                                <p className="text-gray-500 mb-8">You haven't registered for any upcoming events yet.</p>
                                <Link to="/events">
                                    <Button className="rounded-xl px-8 h-12">Browse Events</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Profile;
