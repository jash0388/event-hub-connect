import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, User, Calendar, MapPin, Clock, Ticket, FileText, Zap, AlertTriangle } from "lucide-react";

import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

const TestResultItem = ({ sub }: { sub: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="relative bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 flex flex-col gap-6 group hover:bg-white/80 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${
                        (sub.score / sub.total_marks) >= 0.4 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'
                    }`}>
                        <FileText className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{sub.exams?.title || sub.exam_title || 'Unknown Exam'}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {format(new Date(sub.submitted_at), "MMM d")}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {Math.floor(sub.time_used_seconds / 60)}mUsed</span>
                            {sub.violations > 0 && <span className="text-red-500 font-medium font-mono text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100">! {sub.violations} Violations</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-slate-400 mb-1 font-bold">Score</p>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black ${(sub.score / sub.total_marks) >= 0.4 ? 'text-green-600' : 'text-rose-600'}`}>{sub.score}</span>
                            <span className="text-slate-400 font-bold">/{sub.total_marks}</span>
                        </div>
                    </div>
                    <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-xs ${
                        (sub.score / sub.total_marks) >= 0.4 ? 'border-green-100 text-green-600' : 'border-red-100 text-red-600'
                    }`}>
                        {Math.round((sub.score / sub.total_marks) * 100)}%
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-10 rounded-xl px-4 border border-slate-200 hover:bg-slate-50"
                    >
                        {isExpanded ? 'Hide Review' : 'Review Test'}
                    </Button>
                </div>
            </div>

            {sub.status === 'auto_submitted' && (
                <div className="absolute top-2 right-6">
                    <span className="bg-red-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-b-md shadow-sm">Auto-Submitted</span>
                </div>
            )}

            {isExpanded && sub.results_breakdown && (
                <div className="mt-4 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-300">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 px-2">Detailed Answer Review</h4>
                    <div className="space-y-4">
                        {sub.results_breakdown.map((item: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5">
                                <div className="flex justify-between items-start gap-3 mb-3">
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed max-w-[80%]">{idx + 1}. {item.question}</p>
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${item.score === item.maxScore ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                        {item.score}/{item.maxScore}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                                        <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Your Answer</p>
                                        <p className="text-xs text-slate-700 font-medium">{item.userAnswer || 'No answer'}</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                                        <p className="text-[9px] uppercase font-bold text-indigo-400 mb-1">Recommended Key</p>
                                        <p className="text-xs text-indigo-700 font-medium">{item.correctAnswer || 'AI Evaluated'}</p>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-3">
                                    <div className="mt-0.5"><Zap className="w-3 h-3 text-indigo-400" /></div>
                                    <div>
                                        <p className="text-[9px] uppercase font-bold text-indigo-400 mb-0.5">Teacher's Note</p>
                                        <p className="text-[11px] text-indigo-800 font-medium leading-relaxed italic">{item.feedback}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const Profile = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [userEventQRCodes, setUserEventQRCodes] = useState<any[]>([]);
    const [userExamHistory, setUserExamHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Try fetching from both tables
                const registrationsPromise = supabase
                    .from('event_registrations' as any)
                    .select('*, events(*)')
                    .eq('user_id', user.id);

                const attendeesPromise = supabase
                    .from('event_attendees')
                    .select('*, events(*)')
                    .eq('user_id', user.id)
                    .eq('rsvp_status', 'going');

                const examsPromise = (supabase as any)
                    .from('exam_submissions')
                    .select('*, exams(title)')
                    .eq('user_id', user.id)
                    .order('submitted_at', { ascending: false });

                const [registrations, attendees, exams] = await Promise.all([
                    registrationsPromise,
                    attendeesPromise,
                    examsPromise
                ]);

                const combined = [
                    ...(registrations.data || []).map((r: any) => ({
                        ...r.events,
                        title: r.events?.title || r.event_title || 'Unknown Event',
                        date: r.events?.date || r.event_date || r.created_at,
                        qr_code: r.qr_code,
                        full_name: r.full_name,
                        roll_number: r.roll_number,
                        year: r.year,
                        registered_at: r.created_at,
                        scanned_at: r.scanned_at,
                        source: 'registrations'
                    })),
                    ...(attendees.data || []).map((a: any) => ({
                        ...a.events,
                        title: a.events?.title || a.event_title || 'Unknown Event',
                        date: a.events?.date || a.event_date || a.created_at,
                        qr_code: a.qr_code,
                        joined_at: a.joined_at,
                        source: 'attendees'
                    }))
                ];

                // Remove duplicates by event id
                const uniqueEvents = Array.from(new Map(combined.map(item => [item.id, item])).values());
                setUserEventQRCodes(uniqueEvents);
                setUserExamHistory(exams.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
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

                        {/* TEST HISTORY SECTION */}
                        <div className="pt-6 relative">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                                <div>
                                    <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-2">Test Results</h1>
                                    <p className="text-gray-500">History of your performance in secure proctored exams</p>
                                </div>
                            </div>

                            {userExamHistory.length > 0 ? (
                                <div className="grid gap-6">
                                    {userExamHistory.map((sub: any) => (
                                        <TestResultItem key={sub.id} sub={sub} />
                                    ))}
                                </div>

                            ) : (
                                <div className="text-center py-16 bg-white/40 rounded-[2rem] border border-dashed border-gray-200">
                                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No test records</h3>
                                    <p className="text-gray-500 text-sm mb-6">You haven't completed any securely proctored tests yet.</p>
                                    <Link to="/exam">
                                        <Button className="rounded-xl px-10 h-11 bg-slate-900 border-none hover:bg-slate-800">Go to Exam Portal</Button>
                                    </Link>
                                </div>
                            )}
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
