import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
    eventsCount: number;
    attendeesCount: number;
    projectsCount: number;
}

export function StatsSection() {
    const [stats, setStats] = useState<Stats>({
        eventsCount: 0,
        attendeesCount: 0,
        projectsCount: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch events count
                const { count: eventsCount } = await supabase
                    .from("events")
                    .select("*", { count: "exact", head: true });

                // Fetch total attendees (unique users in event_attendees)
                const { count: attendeesCount } = await supabase
                    .from("event_attendees")
                    .select("*", { count: "exact", head: true })
                    .eq("rsvp_status", "going");

                // Fetch projects count (if there's a projects table)
                const { count: projectsCount } = await supabase
                    .from("projects")
                    .select("*", { count: "exact", head: true });

                setStats({
                    eventsCount: eventsCount || 0,
                    attendeesCount: attendeesCount || 0,
                    projectsCount: projectsCount || 0,
                });
            } catch (error) {
                console.warn("Failed to fetch stats:", error);
                // Keep zeros on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "+";
        }
        return num > 0 ? num + "+" : "0+";
    };

    return (
        <section className="py-12 md:py-16 border-y border-border bg-muted/20">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Events */}
                    <div className="flex flex-col items-center text-center">
                        {isLoading ? (
                            <div className="h-12 w-24 bg-muted animate-pulse rounded" />
                        ) : (
                            <>
                                <span className="font-display text-3xl md:text-5xl font-bold text-primary tracking-tight">
                                    {formatNumber(stats.eventsCount)}
                                </span>
                                <span className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-wider mt-1">
                                    Events Hosted
                                </span>
                            </>
                        )}
                    </div>

                    {/* Attendees */}
                    <div className="flex flex-col items-center text-center">
                        {isLoading ? (
                            <div className="h-12 w-24 bg-muted animate-pulse rounded" />
                        ) : (
                            <>
                                <span className="font-display text-3xl md:text-5xl font-bold text-secondary tracking-tight">
                                    {formatNumber(stats.attendeesCount)}
                                </span>
                                <span className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-wider mt-1">
                                    Active Participants
                                </span>
                            </>
                        )}
                    </div>

                    {/* Projects */}
                    <div className="flex flex-col items-center text-center col-span-2 md:col-span-1">
                        {isLoading ? (
                            <div className="h-12 w-24 bg-muted animate-pulse rounded" />
                        ) : (
                            <>
                                <span className="font-display text-3xl md:text-5xl font-bold text-accent tracking-tight">
                                    {formatNumber(stats.projectsCount)}
                                </span>
                                <span className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-wider mt-1">
                                    Projects
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
