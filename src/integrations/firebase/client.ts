import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, Auth, User as FirebaseUser } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase only once
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Check if Firebase is configured
const isFirebaseConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
);

export const initializeFirebase = () => {
    if (!isFirebaseConfigured) {
        console.warn('[Firebase] Firebase is not configured. Google Sign-In will not be available.');
        return null;
    }

    if (!app && getApps().length === 0) {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            googleProvider = new GoogleAuthProvider();

            // Add additional scopes if needed
            googleProvider.addScope('profile');
            googleProvider.addScope('email');

            console.log('[Firebase] Initialized successfully');
        } catch (error) {
            console.error('[Firebase] Initialization error:', error);
            return null;
        }
    }

    return { app, auth, googleProvider };
};

// Initialize on module load
initializeFirebase();

// Export auth instance
export const getFirebaseAuth = () => {
    if (!auth) {
        initializeFirebase();
    }
    return auth;
};

// Google Sign In
export const signInWithGoogle = async (): Promise<{ user: FirebaseUser | null; error: Error | null }> => {
    if (!auth || !googleProvider) {
        return {
            user: null,
            error: new Error('Firebase is not configured. Please add Firebase credentials to .env')
        };
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        return { user: result.user, error: null };
    } catch (error: any) {
        console.error('[Firebase] Google Sign In Error:', error);
        return { user: null, error };
    }
};

// Sign Out from Firebase
export const signOutFirebase = async (): Promise<{ error: Error | null }> => {
    if (!auth) {
        return { error: new Error('Firebase is not initialized') };
    }

    try {
        await firebaseSignOut(auth);
        return { error: null };
    } catch (error: any) {
        console.error('[Firebase] Sign Out Error:', error);
        return { error };
    }
};

// Listen to auth state changes
export const onFirebaseAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
    if (!auth) {
        callback(null);
        return () => { };
    }

    return onAuthStateChanged(auth, callback);
};

// Export config for checking availability
export const hasFirebaseConfig = isFirebaseConfigured;
