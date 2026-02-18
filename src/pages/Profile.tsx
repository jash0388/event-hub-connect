import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Code, Heart, QrCode, Edit, Calendar, MapPin, MapPinned, Clock, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

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
            <div className="min-h-screen bg-white flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-32 text-center">
                    <div className="max-w-md mx-auto">
                        <User className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold mb-4">Login Required</h1>
                        <p className="text-gray-500 mb-8">Please login to view your profile and access your event tickets.</p>
                        <Link to="/login">
                            <Button className="w-full h-12 rounded-xl">Go to Login</Button>
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-20">
                <div className="container mx-auto px-4 max-w-4xl">
                    {showProfileComplete ? (
                        <div className="space-y-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">My Events</h1>
                                    <p className="text-gray-500">View and manage your registered event tickets</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowProfileComplete(false)}
                                    className="rounded-xl"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
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
                                                "relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row",
                                                isExpired && "opacity-75 grayscale-[0.5]"
                                            )}>
                                                {/* Ticket Side - QR */}
                                                <div className="md:w-64 bg-gray-50 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-dashed border-gray-200">
                                                    <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                                                        <QRCodeSVG
                                                            value={event.qr_code || event.id}
                                                            size={140}
                                                            level="H"
                                                            includeMargin
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                                                        Ticket ID: {event.qr_code?.substring(0, 12) || event.id.substring(0, 12)}
                                                    </p>
                                                </div>

                                                {/* Main Side - Info */}
                                                <div className="flex-1 p-8 md:p-10 relative">
                                                    {/* Ticket Notch Decorations */}
                                                    <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-100 shadow-inner" />

                                                    <div className="flex flex-col h-full">
                                                        <div className="mb-6">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10">
                                                                    {event.category || 'Event Pass'}
                                                                </span>
                                                                {isScanned ? (
                                                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                                                                        ✓ Verified
                                                                    </span>
                                                                ) : isExpired ? (
                                                                    <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                                                                        Expired
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-2">
                                                                {event.title}
                                                            </h3>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-6 mt-auto">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-gray-400">
                                                                    <Calendar className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Date</span>
                                                                </div>
                                                                <p className="font-bold text-gray-900">{format(eventDate, "MMM d, yyyy")}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-gray-400">
                                                                    <Clock className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Time</span>
                                                                </div>
                                                                <p className="font-bold text-gray-900">{event.time || "TBA"}</p>
                                                            </div>
                                                            <div className="space-y-1 col-span-2">
                                                                <div className="flex items-center gap-2 text-gray-400">
                                                                    <MapPin className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Location</span>
                                                                </div>
                                                                <p className="font-bold text-gray-900">{event.location || "To be announced"}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-200">
                                    <Ticket className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No tickets found</h3>
                                    <p className="text-gray-500 mb-8">You haven't registered for any upcoming events yet.</p>
                                    <Link to="/events">
                                        <Button className="rounded-xl px-8 h-12">Browse Events</Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto">
                            <div className="mb-10 text-center">
                                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">My Profile</h1>
                                <p className="text-gray-500">Personalize your experience and keep your info updated</p>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                                    </div>

                                    <div className="grid gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="full_name" className="text-sm font-bold text-gray-700">Full Name</Label>
                                            <Input
                                                id="full_name"
                                                value={profile.full_name}
                                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                placeholder="Your full name"
                                                className="h-12 rounded-xl bg-gray-50 border-gray-100"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="college" className="text-sm font-bold text-gray-700">College / University</Label>
                                                <Input
                                                    id="college"
                                                    value={profile.college}
                                                    onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                                                    placeholder="e.g. Stanford University"
                                                    className="h-12 rounded-xl bg-gray-50 border-gray-100"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="year" className="text-sm font-bold text-gray-700">Year of Study</Label>
                                                <Input
                                                    id="year"
                                                    value={profile.year}
                                                    onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                                                    placeholder="e.g. 2nd Year"
                                                    className="h-12 rounded-xl bg-gray-50 border-gray-100"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bio" className="text-sm font-bold text-gray-700">Bio</Label>
                                            <Input
                                                id="bio"
                                                value={profile.bio}
                                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                placeholder="A short description about yourself"
                                                className="h-12 rounded-xl bg-gray-50 border-gray-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <Code className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">Skills</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skillsList.map((skill) => (
                                            <button
                                                key={skill}
                                                onClick={() => toggleSkill(skill)}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                                    profile.skills.includes(skill)
                                                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                                        : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                                                )}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                            <Heart className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">Interests</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {interestsList.map((interest) => (
                                            <button
                                                key={interest}
                                                onClick={() => toggleInterest(interest)}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                                    profile.interests.includes(interest)
                                                        ? "bg-secondary text-primary border-primary/20"
                                                        : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                                                )}
                                            >
                                                {interest}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full h-16 rounded-xl text-lg font-bold shadow-lg shadow-primary/20"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5 mr-2" />
                                    )}
                                    Save Profile
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Profile;
