import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw, Trophy, CheckCircle2, User } from "lucide-react";
import { migrateStudentsToFirestore, getStudentsFromFirestore } from "@/lib/firestoreMigration";
import { useToast } from "@/hooks/use-toast";

interface StudentData {
    id: string;
    name: string;
    email: string;
    totalPoints: number;
    tasksSolved: number;
    completedTasks: string[];
}

export default function Users() {
    const { toast } = useToast();
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const data = await getStudentsFromFirestore();
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMigration = async () => {
        setMigrating(true);
        try {
            const result = await migrateStudentsToFirestore();
            if (result.success) {
                toast({
                    title: "Migration Complete",
                    description: `Successfully migrated ${result.count} students to Firestore`,
                });
                await fetchStudents();
            } else {
                toast({
                    title: "Migration Failed",
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch (error: any) {
            toast({
                title: "Migration Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setMigrating(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <Header />

            <main className="flex-1 pt-28 pb-16 px-4 md:px-6">
                <div className="container mx-auto max-w-4xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">Students</h1>
                            <p className="text-slate-600">View all students and their progress</p>
                        </div>
                        <Button
                            onClick={handleMigration}
                            disabled={migrating}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {migrating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Migrate Data
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                            <p className="text-slate-500 animate-pulse">Loading students...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <Card className="p-12 text-center">
                            <User className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                            <h2 className="text-xl font-bold text-slate-900 mb-2">No Students Found</h2>
                            <p className="text-slate-600 mb-4">Click "Migrate Data" to import students from Supabase to Firestore.</p>
                            <Button
                                onClick={handleMigration}
                                disabled={migrating}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {migrating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Migrate Data
                            </Button>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {students.map((student, index) => (
                                <Card key={student.id} className="p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Rank */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-100 text-gray-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-600'
                                                }`}>
                                                #{index + 1}
                                            </div>

                                            {/* Student Info */}
                                            <div>
                                                <h3 className="font-bold text-slate-900">{student.name}</h3>
                                                <p className="text-sm text-slate-500">{student.email}</p>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-cyan-500" />
                                                <span className="font-bold text-slate-900">{student.totalPoints}</span>
                                                <span className="text-xs text-slate-500">points</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                <span className="font-bold text-slate-900">{student.tasksSolved}</span>
                                                <span className="text-xs text-slate-500">tasks</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
