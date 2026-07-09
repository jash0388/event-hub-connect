import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    Loader2,
    QrCode,
    Camera,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowLeft,
    Upload,
    Shield,
    ScanLine
} from "lucide-react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

export default function CheckIn() {
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('event');
    const [isLoading, setIsLoading] = useState(false);
    const [scanResult, setScanResult] = useState<{
        success: boolean;
        message: string;
        eventTitle?: string;
        checkedInAt?: string;
        alreadyCheckedIn?: boolean;
    } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt" | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Auto-start scanning when page loads
        if (!eventId) {
            setTimeout(() => {
                startScanning();
            }, 500);
        }

        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear();
                } catch (e) {
                    // Scanner might not be initialized
                }
            }
        };
    }, [user]);

    const handleCheckIn = async (eventIdToCheck: string) => {
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to check in",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            // Check if user has a registration for this event
            const { data: registration, error: regError } = await (supabase as any)
                .from('event_registrations')
                .select('*')
                .eq('event_id', eventIdToCheck)
                .eq('user_id', user.id)
                .maybeSingle();

            if (regError) throw regError;

            // If not found in registrations, check event_attendees
            let attendee = null;
            if (!registration) {
                const { data: attendeeData, error: attError } = await supabase
                    .from('event_attendees')
                    .select('*')
                    .eq('event_id', eventIdToCheck)
                    .eq('user_id', user.id)
                    .eq('rsvp_status', 'going')
                    .maybeSingle();

                if (attError) throw attError;
                attendee = attendeeData;
            }

            // If no registration or attendance found
            if (!registration && !attendee) {
                setScanResult({
                    success: false,
                    message: "You are not registered for this event. Please register first."
                });
                setIsLoading(false);
                return;
            }

            // If already checked in
            if (registration?.scanned_at) {
                setScanResult({
                    success: true,
                    message: "You have already checked in!",
                    eventTitle: registration.events?.title,
                    checkedInAt: registration.scanned_at,
                    alreadyCheckedIn: true
                });
                setIsLoading(false);
                return;
            }

            // Perform check-in
            if (registration) {
                const { error: updateError } = await (supabase as any)
                    .from('event_registrations')
                    .update({ scanned_at: new Date().toISOString() })
                    .eq('id', registration.id);

                if (updateError) throw updateError;

                // Get event title
                const { data: event } = await supabase
                    .from('events')
                    .select('title')
                    .eq('id', eventIdToCheck)
                    .single();

                setScanResult({
                    success: true,
                    message: "Check-in successful!",
                    eventTitle: event?.title,
                    checkedInAt: new Date().toISOString()
                });
            } else {
                setScanResult({
                    success: true,
                    message: "Check-in recorded!",
                    checkedInAt: new Date().toISOString()
                });
            }

            toast({ title: "Success!", description: "You have checked in successfully" });
        } catch (error: any) {
            console.error('Check-in error:', error);
            setScanResult({
                success: false,
                message: error.message || "Failed to check in. Please try again."
            });
            toast({
                title: "Error",
                description: error.message || "Failed to check in",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const startScanning = () => {
        setIsScanning(true);
        setScanResult(null);

        setTimeout(() => {
            try {
                scannerRef.current = new Html5QrcodeScanner(
                    "qr-reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );

                scannerRef.current.render(
                    (decodedText) => {
                        console.log('QR Scanned:', decodedText);

                        // Extract event ID from QR code
                        // Format: EVENT:event_id
                        let extractedEventId = decodedText;
                        if (decodedText.startsWith('EVENT:')) {
                            extractedEventId = decodedText.replace('EVENT:', '');
                        }

                        // Stop scanning
                        if (scannerRef.current) {
                            scannerRef.current.clear();
                        }
                        setIsScanning(false);

                        // Perform check-in
                        handleCheckIn(extractedEventId);
                    },
                    (error) => {
                        // Scan error - ignore
                    }
                );
            } catch (err) {
                console.error('Failed to initialize scanner:', err);
                setIsScanning(false);
                toast({
                    title: "Error",
                    description: "Failed to access camera. Please check permissions.",
                    variant: "destructive"
                });
            }
        }, 100);
    };

    const stopScanning = () => {
        if (scannerRef.current) {
            try {
                scannerRef.current.clear();
            } catch (e) {
                // Ignore
            }
        }
        setIsScanning(false);
    };

    // If event ID is provided in URL, try to check in directly
    useEffect(() => {
        if (eventId && user) {
            handleCheckIn(eventId);
        }
    }, [eventId, user]);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-md">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <QrCode className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Event Check-In
                        </h1>
                        <p className="text-muted-foreground">
                            Scan the event QR code to check in
                        </p>
                    </div>

                    {/* Scan Result */}
                    {scanResult && (
                        <div className={`mb-6 rounded-xl p-6 ${scanResult.success
                            ? scanResult.alreadyCheckedIn
                                ? 'bg-amber-500/10 border border-amber-500'
                                : 'bg-green-500/10 border border-green-500'
                            : 'bg-destructive/10 border border-destructive'
                            }`}>
                            <div className="flex items-center gap-3 mb-4">
                                {scanResult.success ? (
                                    <CheckCircle className={`w-8 h-8 ${scanResult.alreadyCheckedIn ? 'text-amber-500' : 'text-green-500'}`} />
                                ) : (
                                    <XCircle className="w-8 h-8 text-destructive" />
                                )}
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {scanResult.success
                                            ? (scanResult.alreadyCheckedIn ? "Already Checked In" : "Check-In Successful!")
                                            : "Check-In Failed"
                                        }
                                    </h3>
                                    {scanResult.eventTitle && (
                                        <p className="text-sm text-muted-foreground">{scanResult.eventTitle}</p>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm mb-2">{scanResult.message}</p>
                            {scanResult.checkedInAt && (
                                <p className="text-xs text-muted-foreground">
                                    {scanResult.alreadyCheckedIn ? 'Checked in at: ' : 'Checked in at: '}
                                    {new Date(scanResult.checkedInAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Scanner */}
                    {!eventId && (
                        <>
                            {!isScanning ? (
                                <div className="bg-card border border-border rounded-xl p-6 text-center">
                                    <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="font-semibold mb-2">Ready to Scan</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Click the button below to activate your camera and scan the event QR code
                                    </p>
                                    <Button
                                        onClick={startScanning}
                                        disabled={isLoading}
                                        className="w-full mb-3"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Camera className="w-4 h-4 mr-2" />
                                        )}
                                        Start Scanning
                                    </Button>

                                    {/* Request Camera Permissions Button */}
                                    <Button
                                        onClick={async () => {
                                            try {
                                                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                                stream.getTracks().forEach(track => track.stop());
                                                setCameraPermission("granted");
                                                toast({ title: "Camera Permission Granted", description: "You can now scan QR codes" });
                                            } catch (error: any) {
                                                setCameraPermission("denied");
                                                toast({
                                                    title: "Camera Permission Required",
                                                    description: "Please allow camera access in your browser settings",
                                                    variant: "destructive"
                                                });
                                            }
                                        }}
                                        variant="outline"
                                        className="w-full mb-3"
                                    >
                                        <Shield className="w-4 h-4 mr-2" />
                                        Request Camera Permissions
                                    </Button>

                                    {/* Scan Image File Button */}
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Scan an Image File
                                    </Button>

                                    {/* Hidden file input */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            setIsLoading(true);
                                            try {
                                                const html5QrCode = new (window as any).Html5Qrcode("qr-reader-file");
                                                const result = await html5QrCode.scanFile(file, true);
                                                console.log('QR from image:', result);

                                                // Extract event ID from QR code
                                                let extractedEventId = result;
                                                if (result.startsWith('EVENT:')) {
                                                    extractedEventId = result.replace('EVENT:', '');
                                                }

                                                await handleCheckIn(extractedEventId);
                                            } catch (error: any) {
                                                toast({
                                                    title: "Scan Failed",
                                                    description: "Could not find a QR code in this image. Please try a different image.",
                                                    variant: "destructive"
                                                });
                                            } finally {
                                                setIsLoading(false);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold">Scanning...</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={stopScanning}
                                        >
                                            Stop
                                        </Button>
                                    </div>
                                    <div id="qr-reader" className="w-full"></div>
                                </div>
                            )}

                            {/* Manual Entry */}
                            <div className="mt-6 bg-card border border-border rounded-xl p-6">
                                <h3 className="font-semibold mb-4">Having trouble scanning?</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Ask the event organizer for the event check-in link or code
                                </p>
                            </div>
                        </>
                    )}

                    {isLoading && !scanResult && (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                            <p className="text-muted-foreground">Processing check-in...</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
