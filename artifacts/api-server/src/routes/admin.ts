import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { getSessionUser } from "./auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function requireMainAdmin(req: any, res: any): Promise<any | null> {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const result = await getSessionUser(token);
  if (!result || !result.user.isMainAdmin) {
    res.status(403).json({ success: false, error: "Only the main admin can do this." });
    return null;
  }
  return result.user;
}

router.get("/admin/admins", async (req, res) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const result = await getSessionUser(token);
    if (!result || !(result.user.isAdmin || result.user.isMainAdmin)) {
      return res.status(403).json({ success: false, error: "Admins only." });
    }

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .select("roll_number, full_name, email, is_admin, is_main_admin")
      .or("is_admin.eq.true,is_main_admin.eq.true")
      .order("is_main_admin", { ascending: false });
    if (error) throw error;

    return res.json({ success: true, admins: data });
  } catch (error: any) {
    logger.error({ err: error }, "list admins failed");
    return res.status(500).json({ success: false, error: "Could not load admins." });
  }
});

router.post("/admin/create-admin", async (req, res) => {
  try {
    const actor = await requireMainAdmin(req, res);
    if (!actor) return;

    const rollNumber = String(req.body?.rollNumber || "").trim().toUpperCase();
    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!rollNumber || !fullName || !email) {
      return res.status(400).json({ success: false, error: "Roll number, name, and email are required." });
    }

    const { data: existing } = await supabaseAdmin
      .from("app_users")
      .select("roll_number")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("app_users")
        .update({ is_admin: true, full_name: fullName, email })
        .eq("roll_number", rollNumber);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("app_users")
        .insert({ roll_number: rollNumber, full_name: fullName, email, is_admin: true, is_main_admin: false });
      if (error) throw error;
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "create-admin failed");
    return res.status(500).json({ success: false, error: "Could not create admin." });
  }
});

router.post("/admin/revoke-admin", async (req, res) => {
  try {
    const actor = await requireMainAdmin(req, res);
    if (!actor) return;

    const rollNumber = String(req.body?.rollNumber || "").trim().toUpperCase();
    if (!rollNumber) {
      return res.status(400).json({ success: false, error: "Roll number is required." });
    }
    if (rollNumber === actor.rollNumber) {
      return res.status(400).json({ success: false, error: "You cannot revoke your own admin access." });
    }

    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ is_admin: false })
      .eq("roll_number", rollNumber);
    if (error) throw error;

    return res.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "revoke-admin failed");
    return res.status(500).json({ success: false, error: "Could not revoke admin." });
  }
});

export default router;
