import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ALPHABAY_LOGO_IMAGE, APP_NAME, FIREBASE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export function injectBranding() {
  document.querySelectorAll("[data-logo-image]").forEach((node) => {
    node.src = ALPHABAY_LOGO_IMAGE;
    node.alt = APP_NAME;
  });

  document.querySelectorAll("[data-logo-name]").forEach((node) => {
    node.textContent = APP_NAME;
  });
}

export function normalizeSupabaseError(error) {
  const message = error?.message || "Unknown error";
  const lowered = message.toLowerCase();

  if (lowered.includes("does not exist") || lowered.includes("relation") || lowered.includes("schema cache")) {
    return `Database not initialized: ${message}`;
  }

  if (lowered.includes("permission denied") || lowered.includes("not allowed") || lowered.includes("violates row-level")) {
    return `Access restricted: ${message}`;
  }

  if (lowered.includes("auth") || lowered.includes("firebase")) {
    return `Authentication error: ${message}`;
  }

  return message;
}

async function ensureUserDoc(user, role = "user") {
  const userRef = doc(firestore, "users", user.uid);
  await setDoc(
    userRef,
    {
      email: user.email ?? "",
      full_name: user.displayName ?? "",
      role,
      updated_at: serverTimestamp(),
      created_at: serverTimestamp(),
    },
    { merge: true }
  );
}

function mapFirebaseUser(user) {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email,
    user_metadata: {
      full_name: user.displayName,
    },
    displayName: user.displayName,
    raw: user,
  };
}

async function waitForAuthUser() {
  if (auth.currentUser !== undefined) {
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });

    setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser ?? null);
    }, 1500);
  });
}

export async function signInWithEmailPassword(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(credential.user, "user");
  return credential;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  await ensureUserDoc(credential.user, "user");
  return credential;
}

export async function signUpWithEmailPassword(email, password, fullName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (fullName) {
    await updateProfile(credential.user, { displayName: fullName });
  }

  await ensureUserDoc(credential.user, "user");
  await sendEmailVerification(credential.user);
  return credential;
}

export async function signOutUser() {
  await signOut(auth);
}

export async function getCurrentUserAndRole() {
  try {
    const currentUser = auth.currentUser ?? (await waitForAuthUser());

    if (!currentUser) {
      return { user: null, role: null, error: null };
    }

    const userRef = doc(firestore, "users", currentUser.uid);
    const userSnapshot = await getDoc(userRef);

    let role = "user";
    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      if (data?.role === "admin") {
        role = "admin";
      }
    } else {
      await ensureUserDoc(currentUser, "user");
    }

    return { user: mapFirebaseUser(currentUser), role, error: null };
  } catch (error) {
    console.error("Error getting current Firebase user", error);
    return { user: null, role: null, error: normalizeSupabaseError(error) };
  }
}

export function showMessage(element, message, type = "error") {
  if (!element) return;
  element.className = type === "success" ? "success-box rounded-md p-3 text-sm" : "error-box rounded-md p-3 text-sm";
  element.textContent = message;
  element.classList.remove("hidden");
}

export function clearMessage(element) {
  if (!element) return;
  element.classList.add("hidden");
  element.textContent = "";
}
