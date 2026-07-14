import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

const BACKENDS = {
  main:        "https://backend.rubrix.ai/api",
  node:        "https://backend-node-apis.rubrix.ai/api",
  python:      "https://rubrix-backend-python.rubrix.ai/api",
};

interface SessionData {
  token: string;
  expiresAt: string;
  user: {
    rollNumber: string;
    fullName: string;
    email: string;
    isAdmin: boolean;
    isMainAdmin: boolean;
  };
}

const activeSessions = new Map<string, SessionData>();

function normalizeRoll(rollNumber: unknown): string {
  return String(rollNumber || "").trim().toUpperCase();
}

router.post("/auth/send-otp", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.body?.rollNumber);
    if (!rollNumber) {
      return res.status(400).json({ success: false, error: "Roll number is required." });
    }

    const up = await fetch(`${BACKENDS.main}/my-account/get-otp?userName=${encodeURIComponent(rollNumber)}`, {
      headers: { Accept: "application/json" },
    });
    const data = await up.json() as any;

    if (data.status === "Success" && data.result === "OK") {
      return res.json({ success: true, message: data.description });
    } else {
      return res.status(400).json({ success: false, error: data.description || "Roll number not found." });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Network error. Please try again." });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.body?.rollNumber);
    const otp = String(req.body?.otp || "").trim();

    if (!rollNumber || !otp) {
      return res.status(400).json({ success: false, error: "Roll number and code are required." });
    }

    const up = await fetch(
      `${BACKENDS.main}/my-account/validate-otp?otp=${encodeURIComponent(otp)}&username=${encodeURIComponent(rollNumber)}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await up.json() as any;
    const rawAuth = up.headers.get("authorization") || "";
    const token = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : rawAuth;

    if ((data.statusCode === "OK" || up.status === 200) && token) {
      let identificationNo = rollNumber;
      try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
        if (payload.identification_no) identificationNo = payload.identification_no;
      } catch (e) {}

      let profile: any = {};
      try {
        const infoUp = await fetch(
          `${BACKENDS.main}/my-account/info?identificationNo=${encodeURIComponent(identificationNo)}`,
          { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
        );
        if (infoUp.ok) {
          const infoData = await infoUp.json() as any;
          if (Array.isArray(infoData?.result) && infoData.result.length > 0) {
            profile = infoData.result[0];
          }
        }
      } catch (e) {}

      const firstName = profile.firstName || profile.first_name || "";
      const lastName = profile.lastName || profile.last_name || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || rollNumber;
      const email = profile.personalMail || profile.workMail || `${rollNumber.toLowerCase()}@datanauts.in`;

      const appUser = {
        rollNumber,
        fullName,
        email,
        isAdmin: true,       // Enable admin access
        isMainAdmin: true,
      };

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

      activeSessions.set(token, {
        token,
        expiresAt,
        user: appUser,
      });

      return res.json({ success: true, token, expiresAt, user: appUser });
    } else {
      return res.status(400).json({ success: false, error: "Incorrect OTP. Please try again." });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Something went wrong. Please try again." });
  }
});

export async function getSessionUser(token: string | undefined | null) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    activeSessions.delete(token);
    return null;
  }
  return { user: session.user, session };
}

router.get("/auth/me", async (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const result = await getSessionUser(token);
  if (!result) {
    return res.status(401).json({ success: false, error: "Session expired." });
  }
  return res.json({ success: true, user: { ...result.user, expiresAt: result.session.expiresAt } });
});

router.post("/auth/logout", async (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token) {
    activeSessions.delete(token);
  }
  return res.json({ success: true });
});

export default router;
