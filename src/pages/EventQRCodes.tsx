import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import {
    Loader2,
    QrCode,
    Calendar,
    MapPin,
    Clock,
    Users,
    CheckCircle,
    Download,
    Copy,
    RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface EventWithQR {
    id: string;
    title: string;
    description: string | null;
    date: string;
    time: string | null;
    location: string | null;
    organizer: string | null;
    image_url: string | null;
    registered_count: number;
    checked_in_count: number;
}

export default function EventQRCodes() {
    const [events, setEvents] = useState<EventWithQR[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<EventWithQR | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchOrganizerEvents();
    }, [user]);

    const fetchOrganizerEvents = async () => {
        setIsLoading(true);
        try {
            // Fetch events created by this user (organizer)
            const { data: eventsData, error } = await supabase
                .from('events')
                .select('*')
                .eq('created_by', user?.id)
                .order('date', { ascending: true });

            if (error) throw error;

            // Get counts for each event
            const eventsWithCounts = await Promise.all((eventsData || []).map(async (event: any) => {
                // Count registrations
                const { count: regCount } = await (supabase as any)
                    .from('event_registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', event.id);

                // Count attendees
                const { count: attCount } = await supabase
                    .from('event_attendees')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', event.id)
                    .eq('rsvp_status', 'going');

                // Count checked in
                const { count: checkedInCount } = await (supabase as any)
                    .from('event_registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', event.id)
                    .not('scanned_at', 'is', null);

                return {
                    ...event,
                    registered_count: (regCount || 0) + (attCount || 0),
                    checked_in_count: checkedInCount || 0
                };
            }));

            setEvents(eventsWithCounts);
        } catch (error: any) {
            console.error('Error fetching events:', error);
            toast({
                title: "Error",
                description: "Failed to load events",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const generateEventQRCode = (eventId: string) => {
        // Generate a unique QR code value that contains the event ID
        // This can be used by attendees to check in
        return `EVENT:${eventId}`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "QR code value copied to clipboard" });
    };

    const downloadQRCode = (event: EventWithQR) => {
        const svg = document.getElementById(`qr-code-${event.id}`);
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `${event.title.replace(/\s+/g, '-')}-QRCode.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

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
                    <div className="mb-8">
                        <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                            Event QR Codes
                        </h1>
                        <p className="text-muted-foreground">
                            Generate and manage QR codes for your events. Share these codes with attendees for check-in.
                        </p>
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center py-12 bg-card border border-border rounded-xl">
                            <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
                            <p className="text-muted-foreground mb-4">
                                You haven't created any events yet. Create an event to generate QR codes.
                            </p>
                            <Button onClick={() => navigate('/admin')}>
                                Create Event
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {events.map((event) => (
                                <div
                                    key={event.id}
                                    className="bg-card border border-border rounded-xl overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-start gap-6">
                                            {/* Event Info */}
                                            <div className="flex-1">
                                                <h3 className="text-xl font-display font-bold mb-2">{event.title}</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{format(new Date(event.date), 'MMM d, yyyy')}</span>
                                                    </div>
                                                    {event.time && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Clock className="w-4 h-4" />
                                                            <span>{event.time}</span>
                                                        </div>
                                                    )}
                                                    {event.location && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <MapPin className="w-4 h-4" />
                                                            <span className="truncate">{event.location}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Users className="w-4 h-4" />
                                                        <span>{event.registered_count} registered</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span>{event.checked_in_count} checked in</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* QR Code Section */}
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="bg-white p-4 rounded-xl">
                                                    <QRCodeSVG
                                                        id={`qr-code-${event.id}`}
                                                        value={generateEventQRCode(event.id)}
                                                        size={150}
                                                        level="H"
                                                        includeMargin
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(generateEventQRCode(event.id))}
                                                    >
                                                        <Copy className="w-4 h-4 mr-1" />
                                                        Copy
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => downloadQRCode(event)}
                                                    >
                                                        <Download className="w-4 h-4 mr-1" />
                                                        Download
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-muted/50 px-6 py-4 border-t border-border">
                                        <h4 className="text-sm font-semibold mb-2">How to use:</h4>
                                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                                            <li>Download or share this QR code with event attendees</li>
                                            <li>Attendees can scan this code at the event venue</li>
                                            <li>Use the QR Scanner in admin dashboard to verify check-ins</li>
                                            <li>Track attendance in real-time from this page</li>
                                        </ol>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Refresh Button */}
                    {events.length > 0 && (
                        <div className="mt-6 flex justify-center">
                            <Button variant="outline" onClick={fetchOrganizerEvents}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Counts
                            </Button>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
