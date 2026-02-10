import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ALPHABAY_LOGO_IMAGE, APP_NAME, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

  return message;
}

export function isMissingTableError(error, tableName) {
  const message = error?.message?.toLowerCase?.() || "";
  const table = String(tableName || "").toLowerCase();

  return (
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes(`public.${table}`) && message.includes("schema cache")
  );
}

function normalizeRole(rawRole) {
  if (rawRole === "admin") return "admin";
  if (rawRole === "student" || rawRole === "user") return "user";
  return "user";
}

export async function getCurrentUserAndRole() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error getting current user", userError);
    return { user: null, role: null, error: normalizeSupabaseError(userError) };
  }

  if (!user) {
    return { user: null, role: null, error: null };
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!rolesError && Array.isArray(roles) && roles.some((entry) => entry.role === "admin")) {
    return { user, role: "admin", error: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile role", profileError);
    return { user, role: normalizeRole(roles?.[0]?.role), error: normalizeSupabaseError(profileError) };
  }

  return { user, role: normalizeRole(profile?.role ?? roles?.[0]?.role), error: null };
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
