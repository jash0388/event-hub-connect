import { doc, setDoc, collection, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { supabase } from '@/integrations/supabase/client';
import { getFirebaseDb } from '@/integrations/firebase/client';

interface StudentData {
    id: string;
    name: string;
    email: string;
    totalPoints: number;
    tasksSolved: number;
    completedTasks: string[];
    createdAt: Date;
    updatedAt: Date;
}

export async function migrateStudentsToFirestore(): Promise<{ success: boolean; message: string; count: number }> {
    try {
        const db = getFirebaseDb();
        if (!db) {
            return { success: false, message: 'Firestore not initialized', count: 0 };
        }

        console.log('[Migration] Starting student migration from Supabase to Firestore...');

        // 1. Fetch all profiles from Supabase
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*');

        if (profilesError) {
            console.error('[Migration] Error fetching profiles:', profilesError);
            return { success: false, message: profilesError.message, count: 0 };
        }

        // 2. Fetch all task submissions
        const { data: submissions, error: submissionsError } = await supabase
            .from('task_submissions' as any)
            .select('*');

        if (submissionsError) {
            console.error('[Migration] Error fetching submissions:', submissionsError);
        }

        // 3. Fetch all coding tasks
        const { data: tasks, error: tasksError } = await supabase
            .from('coding_tasks' as any)
            .select('*');

        if (tasksError) {
            console.error('[Migration] Error fetching tasks:', tasksError);
        }

        // 4. Calculate student stats
        const studentMap = new Map<string, StudentData>();

        // Process profiles
        for (const profile of profiles || []) {
            const userId = profile.id;
            const name = profile.full_name || profile.email?.split('@')[0] || 'Unknown';
            const email = profile.email || '';

            studentMap.set(userId, {
                id: userId,
                name,
                email,
                totalPoints: 0,
                tasksSolved: 0,
                completedTasks: [],
                createdAt: new Date(profile.created_at || Date.now()),
                updatedAt: new Date()
            });
        }

        // Process submissions - calculate points and completed tasks
        for (const sub of submissions || []) {
            if (sub.status === 'approved') {
                const userId = sub.user_id;
                const taskId = sub.task_id;

                if (studentMap.has(userId)) {
                    const student = studentMap.get(userId)!;

                    // Add points
                    const task = tasks?.find(t => t.id === taskId);
                    const points = task?.points || 0;
                    student.totalPoints += points;

                    // Add completed task if not already counted
                    if (!student.completedTasks.includes(taskId)) {
                        student.completedTasks.push(taskId);
                        student.tasksSolved += 1;
                    }

                    student.updatedAt = new Date();
                }
            }
        }

        // 5. Clear existing students in Firestore and save new data
        const studentsRef = collection(db, 'students');

        // Get existing students to delete
        const existingSnapshot = await getDocs(studentsRef);
        const deletePromises = existingSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        console.log('[Migration] Cleared existing students in Firestore');

        // Save new student data
        let savedCount = 0;
        for (const [userId, studentData] of studentMap) {
            await setDoc(doc(studentsRef, userId), studentData);
            savedCount++;
        }

        console.log(`[Migration] Successfully migrated ${savedCount} students to Firestore`);
        return { success: true, message: 'Migration completed successfully', count: savedCount };

    } catch (error: any) {
        console.error('[Migration] Error:', error);
        return { success: false, message: error.message, count: 0 };
    }
}

export async function getStudentsFromFirestore(): Promise<StudentData[]> {
    try {
        const db = getFirebaseDb();
        if (!db) {
            console.error('[Firestore] Database not initialized');
            return [];
        }

        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, orderBy('totalPoints', 'desc'));
        const snapshot = await getDocs(q);

        const students: StudentData[] = [];
        snapshot.forEach(doc => {
            students.push(doc.data() as StudentData);
        });

        return students;
    } catch (error) {
        console.error('[Firestore] Error fetching students:', error);
        return [];
    }
}
