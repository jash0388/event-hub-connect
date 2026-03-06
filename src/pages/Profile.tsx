import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Code, Heart, Edit, Calendar, MapPin, Clock, Ticket, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const skillsList = [
    "Web Development", "Mobile App", "UI/UX Design", "Data Science",
    "Machine Learning", "Cloud Computing", "DevOps", "Cybersecurity",
    "Blockchain", "Game Dev", "AR/VR", "IoT", "Product Management",
    "Marketing", "Content Writing", "Public Speaking"
];

const interestsList = [
    "Technology", "Sports", "Music", "Art", "Science", "Business",
    "Education", "Health", "Environment", "Social", "Gaming", "Movies",
    "Photography", "Writing", "Travel", "Food"
];

const Profile = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState({
        full_name: "",
        bio: "",
        skills: [] as string[],
        interests: [] as string[],
        college: "",
        year: ""
    });
    const [showProfileComplete, setShowProfileComplete] = useState(false);
    const [userEventQRCodes, setUserEventQRCodes] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (profileData) {
                    const typedProfile = profileData as any;
                    setProfile({
                        full_name: typedProfile.full_name || "",
                        bio: typedProfile.bio || "",
                        skills: typedProfile.skills || [],
                        interests: typedProfile.interests || [],
                        college: typedProfile.college || "",
                        year: typedProfile.year || ""
                    });

                    if (typedProfile.full_name) {
                        setShowProfileComplete(true);
                    }
                }

                fetchUserEventQRCodes();
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchUserEventQRCodes = async () => {
            if (!user) return;
            try {
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

                const uniqueEvents = Array.from(new Map(combined.map(item => [item.id, item])).values());
                setUserEventQRCodes(uniqueEvents);
            } catch (error) {
                console.error('Error fetching QR codes:', error);
            }
        };

        fetchProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    full_name: profile.full_name,
                    bio: profile.bio,
                    skills: profile.skills,
                    interests: profile.interests,
                    college: profile.college,
                    year: profile.year,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast({ title: "Profile Saved!", description: "Your profile has been updated" });
            setShowProfileComplete(true);
        } catch (error) {
            toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSkill = (skill: string) => {
        setProfile(prev => ({
            ...prev,
            skills: prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill]
        }));
    };

    const toggleInterest = (interest: string) => {
        setProfile(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

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

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col bg-[#030303]">
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
                    <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />
                </div>
                <Header />
                <main className="flex-1 flex items-center justify-center px-4 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md"
                    >
                        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                                <User className="w-8 h-8 text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Login Required</h1>
                            <p className="text-zinc-500 text-sm mb-8">Please login to view your profile and event tickets.</p>
                            <Link to="/login">
                                <Button className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-medium">
                                    Sign In
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#030303]">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/5 rounded-full blur-[128px]" />
            </div>

            <Header />
            <main className="flex-1 pt-28 pb-16 relative z-10">
                <div className="container mx-auto px-4 max-w-5xl">
                    {showProfileComplete ? (
                        <div className="space-y-8">
                            {/* Header */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <Ticket className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <span className="text-sm font-medium text-blue-400">My Events</span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Event Tickets</h1>
                                    <p className="text-zinc-500">View and manage your registered event tickets</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowProfileComplete(false)}
                                    className="rounded-xl border-white/[0.1] text-white hover:bg-white/[0.05] bg-white/[0.02]"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            </motion.div>

                            {/* Tickets */}
                            {userEventQRCodes.length > 0 ? (
                                <div className="grid gap-6">
                                    {userEventQRCodes.map((event: any, index: number) => {
                                        const eventDate = new Date(event.date);
                                        const now = new Date();
                                        const isExpired = eventDate < now;
                                        const isScanned = event.scanned_at;

                                        return (
                                            <motion.div 
                                                key={event.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={cn(
                                                    "relative bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col md:flex-row",
                                                    isExpired && "opacity-60"
                                                )}
                                            >
                                                {/* QR Section */}
                                                <div className="md:w-56 bg-white/[0.02] flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/[0.06]">
                                                    <div className="bg-white rounded-xl p-3">
                                                        <QRCodeSVG
                                                            value={event.qr_code || event.id}
                                                            size={120}
                                                            level="H"
                                                            includeMargin
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-3">
                                                        {event.qr_code?.substring(0, 12) || event.id.substring(0, 12)}
                                                    </p>
                                                </div>

                                                {/* Info Section */}
                                                <div className="flex-1 p-6">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
                                                            {event.category || 'Event'}
                                                        </span>
                                                        {isScanned ? (
                                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                                                                Verified
                                                            </span>
                                                        ) : isExpired ? (
                                                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium">
                                                                Expired
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    
                                                    <h3 className="text-xl font-bold text-white mb-4">{event.title}</h3>

                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                Date
                                                            </div>
                                                            <p className="text-white font-medium text-sm">{format(eventDate, "MMM d, yyyy")}</p>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Time
                                                            </div>
                                                            <p className="text-white font-medium text-sm">{event.time || "TBA"}</p>
                                                        </div>
                                                        <div className="col-span-2 md:col-span-1">
                                                            <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                Location
                                                            </div>
                                                            <p className="text-white font-medium text-sm">{event.location || "TBA"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-20 bg-white/[0.02] border border-white/[0.06] border-dashed rounded-2xl"
                                >
                                    <Ticket className="w-14 h-14 text-zinc-700 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">No tickets found</h3>
                                    <p className="text-zinc-500 mb-6">You haven't registered for any events yet.</p>
                                    <Link to="/events">
                                        <Button className="rounded-xl bg-white text-black hover:bg-zinc-200">
                                            Browse Events
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl mx-auto"
                        >
                            {/* Header */}
                            <div className="mb-10 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                                    <User className="w-7 h-7 text-blue-400" />
                                </div>
                                <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                                <p className="text-zinc-500">Personalize your experience and keep your info updated</p>
                            </div>

                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 space-y-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <User className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-white">Basic Information</h2>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="full_name" className="text-sm font-medium text-zinc-400">Full Name</Label>
                                            <Input
                                                id="full_name"
                                                value={profile.full_name}
                                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                placeholder="Your full name"
                                                className="h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-white/[0.15]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="college" className="text-sm font-medium text-zinc-400">College</Label>
                                                <Input
                                                    id="college"
                                                    value={profile.college}
                                                    onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                                                    placeholder="e.g. Sphoorthy Engineering"
                                                    className="h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-white/[0.15]"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="year" className="text-sm font-medium text-zinc-400">Year</Label>
                                                <Input
                                                    id="year"
                                                    value={profile.year}
                                                    onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                                                    placeholder="e.g. 2nd Year"
                                                    className="h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-white/[0.15]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bio" className="text-sm font-medium text-zinc-400">Bio</Label>
                                            <Input
                                                id="bio"
                                                value={profile.bio}
                                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                placeholder="A short description about yourself"
                                                className="h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-white/[0.15]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <Code className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-white">Skills</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skillsList.map((skill) => (
                                            <button
                                                key={skill}
                                                onClick={() => toggleSkill(skill)}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                                                    profile.skills.includes(skill)
                                                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                        : "bg-white/[0.03] text-zinc-500 border-white/[0.08] hover:bg-white/[0.06] hover:text-zinc-300"
                                                )}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Interests */}
                                <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                            <Heart className="w-5 h-5 text-rose-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-white">Interests</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {interestsList.map((interest) => (
                                            <button
                                                key={interest}
                                                onClick={() => toggleInterest(interest)}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                                                    profile.interests.includes(interest)
                                                        ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                                                        : "bg-white/[0.03] text-zinc-500 border-white/[0.08] hover:bg-white/[0.06] hover:text-zinc-300"
                                                )}
                                            >
                                                {interest}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Save Button */}
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full h-14 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-base"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5 mr-2" />
                                    )}
                                    Save Profile
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Profile;
