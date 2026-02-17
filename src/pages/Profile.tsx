import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Code, Heart, QrCode, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";

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
                // First check new event_registrations table
                const { data: registrations, error: regError } = await (supabase
                    .from('event_registrations' as any)
                    .select('event_id, qr_code, full_name, roll_number, year, created_at, scanned_at')
                    .eq('user_id', user.id) as any);

                console.log('Registrations:', registrations, 'Error:', regError);

                if (registrations && registrations.length > 0) {
                    const eventIds = registrations.map((r: any) => r.event_id);
                    const { data: events } = await supabase
                        .from('events')
                        .select('id, title, date, location, time')
                        .in('id', eventIds);

                    console.log('Events from registrations:', events);

                    if (events) {
                        const eventsWithQR = events.map(event => {
                            const reg = registrations.find((r: any) => r.event_id === event.id);
                            return {
                                ...event,
                                qr_code: reg?.qr_code,
                                full_name: reg?.full_name,
                                roll_number: reg?.roll_number,
                                year: reg?.year,
                                registered_at: reg?.created_at,
                                scanned_at: reg?.scanned_at,
                                source: 'registrations'
                            };
                        });
                        setUserEventQRCodes(eventsWithQR);
                    }
                } else {
                    // Fall back to old event_attendees table
                    const { data: attendees, error } = await supabase
                        .from('event_attendees')
                        .select('event_id, qr_code, rsvp_status, joined_at')
                        .eq('user_id', user.id)
                        .eq('rsvp_status', 'going') as any;

                    console.log('Attendees:', attendees, 'Error:', error);

                    if (attendees && attendees.length > 0) {
                        const eventIds = attendees.map((a: any) => a.event_id);
                        const { data: events } = await supabase
                            .from('events')
                            .select('id, title, date, location');

                        console.log('Events:', events);

                        if (events) {
                            const eventsWithQR = events.map(event => {
                                const attendee = attendees.find((a: any) => a.event_id === event.id);
                                return {
                                    ...event,
                                    qr_code: attendee?.qr_code,
                                    joined_at: attendee?.joined_at,
                                    source: 'attendees'
                                };
                            });
                            setUserEventQRCodes(eventsWithQR);
                        }
                    }
                }
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

            if (profile.full_name) {
                setShowProfileComplete(true);
            }
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
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-20 text-center">
                    <h1 className="text-2xl font-bold mb-4">Login Required</h1>
                    <p className="text-muted-foreground mb-4">Please login to view your profile</p>
                    <a href="/admin/login">
                        <Button>Login</Button>
                    </a>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-2xl">
                    {showProfileComplete ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <QrCode className="w-6 h-6 text-neon-green" />
                                <h1 className="text-4xl font-display font-bold text-foreground">My Events</h1>
                            </div>

                            {userEventQRCodes.length > 0 ? (
                                <div className="space-y-4">
                                    {userEventQRCodes.map((event: any) => {
                                        const eventDate = new Date(event.date);
                                        const now = new Date();
                                        const isExpired = eventDate < now;
                                        const isScanned = event.scanned_at;

                                        return (
                                            <div key={event.id} className={`bg-card border rounded-xl p-6 ${isExpired ? 'border-neon-red/50 opacity-60' : 'border-border'}`}>
                                                <div className="flex flex-col md:flex-row items-center gap-6">
                                                    <div className={`bg-white p-3 rounded-lg ${isExpired ? 'grayscale' : ''}`}>
                                                        <QRCodeSVG
                                                            value={event.qr_code || 'No QR'}
                                                            size={120}
                                                            level="H"
                                                            includeMargin
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-center md:text-left">
                                                        <h3 className="font-bold text-xl">{event.title}</h3>
                                                        <p className="text-muted-foreground">
                                                            {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'} at {event.location || 'TBA'}
                                                        </p>
                                                        {isExpired ? (
                                                            <p className="text-neon-red text-sm mt-2 font-bold">Event Expired</p>
                                                        ) : isScanned ? (
                                                            <p className="text-neon-amber text-sm mt-2">✓ Already Scanned</p>
                                                        ) : (
                                                            <p className="text-neon-green text-sm mt-2">Show this QR code at event entry</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground mb-4">No events yet</p>
                                    <Link to="/events">
                                        <Button>Browse Events</Button>
                                    </Link>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                onClick={() => setShowProfileComplete(false)}
                                className="w-full"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profile
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-4xl font-display font-bold text-foreground mb-2">My Profile</h1>
                                <p className="text-muted-foreground">Tell us about yourself</p>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <User className="w-5 h-5 text-primary" />
                                        <h2 className="text-xl font-bold">Basic Info</h2>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name *</Label>
                                        <Input
                                            id="full_name"
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            placeholder="Your name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="college">College/University</Label>
                                        <Input
                                            id="college"
                                            value={profile.college}
                                            onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                                            placeholder="Your college"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="year">Year of Study</Label>
                                        <Input
                                            id="year"
                                            value={profile.year}
                                            onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                                            placeholder="e.g., 2nd Year"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bio">Bio</Label>
                                        <Input
                                            id="bio"
                                            value={profile.bio}
                                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                            placeholder="Tell us about yourself"
                                        />
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Code className="w-5 h-5 text-primary" />
                                        <h2 className="text-xl font-bold">Skills</h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">What are you good at?</p>
                                    <div className="flex flex-wrap gap-2">
                                        {skillsList.map((skill) => (
                                            <button
                                                key={skill}
                                                onClick={() => toggleSkill(skill)}
                                                className={`px-3 py-1 rounded-full text-sm transition-all ${profile.skills.includes(skill)
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-primary/20"
                                                    }`}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Heart className="w-5 h-5 text-primary" />
                                        <h2 className="text-xl font-bold">Interests</h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">What are you interested in?</p>
                                    <div className="flex flex-wrap gap-2">
                                        {interestsList.map((interest) => (
                                            <button
                                                key={interest}
                                                onClick={() => toggleInterest(interest)}
                                                className={`px-3 py-1 rounded-full text-sm transition-all ${profile.interests.includes(interest)
                                                    ? "bg-secondary text-secondary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-secondary/20"
                                                    }`}
                                            >
                                                {interest}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save Profile
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Profile;
