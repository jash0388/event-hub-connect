import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, Clock, ArrowLeft } from "lucide-react";
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
    const { toast } = useToast();

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("events")
                    .select("id,title,description,category,date,time,location,organizer,image,image_url,registration_link,photos,videos")
                    .eq("id", id)
                    .single();

                if (error) throw error;

                const eventData: EventDetail = {
                    ...data,
                    photos: data.photos || null,
                    videos: data.videos || null
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
        </div>
    );
}
