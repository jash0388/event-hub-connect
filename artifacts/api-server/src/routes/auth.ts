import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabase";
import { sendOtpEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MAIN_ADMIN_ROLL_NUMBER = (process.env["MAIN_ADMIN_ROLL_NUMBER"] || "").toUpperCase();
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizeRoll(rollNumber: unknown): string {
  return String(rollNumber || "").trim().toUpperCase();
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function toPublicUser(row: any) {
  return {
    rollNumber: row.roll_number,
    fullName: row.full_name,
    email: row.email,
    isAdmin: !!row.is_admin || !!row.is_main_admin,
    isMainAdmin: !!row.is_main_admin,
  };
}

router.post("/auth/send-otp", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.body?.rollNumber);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const fullName = String(req.body?.fullName || "").trim();

    if (!rollNumber) {
      return res.status(400).json({ success: false, error: "Roll number is required." });
    }

    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let user = existingUser;

    if (!user) {
      // Unknown roll number: self-registration requires name + email up front.
      if (!email || !fullName) {
        return res.json({ success: false, needsRegistration: true });
      }

      const isMainAdmin = rollNumber === MAIN_ADMIN_ROLL_NUMBER;
      const { data: created, error: insertError } = await supabaseAdmin
        .from("app_users")
        .insert({
          roll_number: rollNumber,
          full_name: fullName,
          email,
          is_admin: isMainAdmin,
          is_main_admin: isMainAdmin,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;
      user = created;
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { error: otpError } = await supabaseAdmin.from("app_otp_codes").insert({
      roll_number: rollNumber,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });
    if (otpError) throw otpError;

    await sendOtpEmail(user.email, otp, user.full_name);

    return res.json({ success: true, message: `We've sent a code to ${user.email}.` });
  } catch (error: any) {
    logger.error({ err: error }, "send-otp failed");
    return res.status(500).json({ success: false, error: "Could not send the code. Please try again." });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.body?.rollNumber);
    const otp = String(req.body?.otp || "").trim();

    if (!rollNumber || !otp) {
      return res.status(400).json({ success: false, error: "Roll number and code are required." });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("roll_number", rollNumber)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return res.status(400).json({ success: false, error: "Unknown roll number." });
    }

    const otpHash = hashOtp(otp);
    const { data: otpRow, error: otpError } = await supabaseAdmin
      .from("app_otp_codes")
      .select("*")
      .eq("roll_number", rollNumber)
      .eq("otp_hash", otpHash)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (otpError) throw otpError;

    if (!otpRow) {
      return res.status(400).json({ success: false, error: "That code is incorrect or has expired." });
    }

    await supabaseAdmin.from("app_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const { error: sessionError } = await supabaseAdmin.from("app_sessions").insert({
      token,
      roll_number: rollNumber,
      expires_at: expiresAt,
    });
    if (sessionError) throw sessionError;

    return res.json({ success: true, token, expiresAt, user: toPublicUser(user) });
  } catch (error: any) {
    logger.error({ err: error }, "verify-otp failed");
    return res.status(500).json({ success: false, error: "Something went wrong. Please try again." });
  }
});

export async function getSessionUser(token: string | undefined | null) {
  if (!token) return null;

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("app_sessions")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError || !session) return null;

  const { data: user, error: userError } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("roll_number", session.roll_number)
    .maybeSingle();
  if (userError || !user) return null;

  return { user, session };
}

router.get("/auth/me", async (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const result = await getSessionUser(token);
  if (!result) {
    return res.status(401).json({ success: false, error: "Session expired." });
  }
  return res.json({ success: true, user: { ...toPublicUser(result.user), expiresAt: result.session.expires_at } });
});

router.post("/auth/logout", async (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token) {
    await supabaseAdmin.from("app_sessions").delete().eq("token", token);
  }
  return res.json({ success: true });
});

export default router;
