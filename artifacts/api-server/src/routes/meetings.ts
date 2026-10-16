import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface RoomEntry {
  code: string;
  secret: string;
  host: string;
  invite?: string;
  grant?: string;
  term: number;
  participants: number;
  lastHeartbeat: number;
  createdAt: number;
  messages: Array<{
    id: string;
    senderName: string;
    rollNumber: string;
    text: string;
    timestamp: number;
  }>;
}

interface SignalEnvelope {
  fromPeerId: string;
  toPeerId: string;
  signalData: any;
  timestamp: number;
}

// Active room directory & signal mailboxes
const rooms = new Map<string, RoomEntry>();
const signalMailboxes = new Map<string, SignalEnvelope[]>();

const TTL_MS = 60_000; // 60 seconds lease
const LETTERS_BY_LENGTH: Record<number, number[]> = { 10: [3, 4, 3], 12: [4, 4, 4] };

function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const letters = input.trim().toLowerCase().replace(/[\s-]/g, "");
  const groups = LETTERS_BY_LENGTH[letters.length];
  if (!groups || /[^a-z0-9]/.test(letters)) {
    // Generate standard 10-char if malformed
    if (letters.length >= 6) {
      return `${letters.slice(0, 3)}-${letters.slice(3, 7)}-${letters.slice(7, 10) || "dtn"}`;
    }
    return null;
  }
  let i = 0;
  return groups.map((len) => letters.slice(i, (i += len))).join("-");
}

function generateRandomCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const part = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(3)}-${part(4)}-${part(3)}`;
}

// Liveness check
router.get("/v1/health", (_req, res) => {
  res.json({ ok: true, activeRooms: rooms.size, serverTime: Date.now() });
});
router.get("/meetings/health", (_req, res) => {
  res.json({ ok: true, activeRooms: rooms.size, serverTime: Date.now() });
});

// Create new room code
router.post("/meetings/rooms/create", (req, res) => {
  const code = generateRandomCode();
  const host = String(req.body?.rollNumber || "STUDENT").trim().toUpperCase();
  const secret = `sec_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  const room: RoomEntry = {
    code,
    secret,
    host,
    term: 1,
    participants: 1,
    lastHeartbeat: Date.now(),
    createdAt: Date.now(),
    messages: [],
  };

  rooms.set(code, room);
  res.json({ success: true, roomCode: code, secret, host });
});

// Get room details (v1 room directory protocol)
router.get(["/v1/rooms/:code", "/meetings/rooms/:code"], (req, res) => {
  const code = normalizeCode(req.params["code"]);
  if (!code) {
    return res.status(400).json({ error: "Invalid room code format" });
  }

  const room = rooms.get(code);
  if (!room) {
    return res.json({ room: null });
  }

  // Check TTL
  const age = Date.now() - room.lastHeartbeat;
  if (age > TTL_MS) {
    rooms.delete(code);
    return res.json({ room: null });
  }

  return res.json({
    room: {
      code: room.code,
      host: room.host,
      invite: room.invite,
      grant: room.grant,
      term: room.term,
      participants: room.participants,
      ageMs: age,
    },
  });
});

// Claim room or heartbeat
router.post(["/v1/rooms/:code", "/meetings/rooms/:code"], (req, res) => {
  const code = normalizeCode(req.params["code"]);
  if (!code) {
    return res.status(400).json({ error: "Invalid room code format" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const secret = String(body?.secret || "").slice(0, 128);
  const invite = body?.invite ? String(body.invite).slice(0, 512) : undefined;
  const grant = body?.grant ? String(body.grant).slice(0, 512) : undefined;
  const host = String(body?.host || "Host").slice(0, 80);
  const participants = Number(body?.participants) || 1;
  const term = Number(body?.term) || 1;

  const existing = rooms.get(code);
  const now = Date.now();

  if (existing) {
    const age = now - existing.lastHeartbeat;
    if (age <= TTL_MS && existing.secret !== secret) {
      // Room is held by another active host
      return res.status(409).json({
        status: "held",
        room: {
          code: existing.code,
          host: existing.host,
          invite: existing.invite,
          grant: existing.grant,
          term: existing.term,
          participants: existing.participants,
          ageMs: age,
        },
      });
    }

    // Refresh lease
    existing.lastHeartbeat = now;
    if (invite) existing.invite = invite;
    if (grant) existing.grant = grant;
    existing.host = host;
    existing.participants = participants;
    existing.term = Math.max(existing.term, term);

    return res.json({
      status: "updated",
      room: {
        code: existing.code,
        host: existing.host,
        term: existing.term,
        participants: existing.participants,
      },
    });
  }

  // Create new claim
  const newRoom: RoomEntry = {
    code,
    secret: secret || `sec_${Math.random().toString(36).slice(2)}`,
    host,
    invite,
    grant,
    term,
    participants,
    lastHeartbeat: now,
    createdAt: now,
    messages: [],
  };
  rooms.set(code, newRoom);

  return res.json({
    status: "claimed",
    room: {
      code: newRoom.code,
      host: newRoom.host,
      term: newRoom.term,
      participants: newRoom.participants,
    },
  });
});

// End / release room
router.post(["/v1/rooms/:code/end", "/meetings/rooms/:code/end"], (req, res) => {
  const code = normalizeCode(req.params["code"]);
  if (code) {
    rooms.delete(code);
  }
  return res.json({ ok: true });
});

// In-room chat messages
router.post("/meetings/rooms/:code/messages", (req, res) => {
  const code = normalizeCode(req.params["code"]);
  if (!code) return res.status(400).json({ error: "Invalid code" });

  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderName: String(req.body?.senderName || "Student").slice(0, 50),
    rollNumber: String(req.body?.rollNumber || "").slice(0, 30),
    text: String(req.body?.text || "").slice(0, 1000),
    timestamp: Date.now(),
  };

  room.messages.push(message);
  if (room.messages.length > 200) room.messages.shift();

  return res.json({ success: true, message });
});

router.get("/meetings/rooms/:code/messages", (req, res) => {
  const code = normalizeCode(req.params["code"]);
  if (!code) return res.status(400).json({ error: "Invalid code" });

  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found" });

  return res.json({ success: true, messages: room.messages });
});

// WebRTC Signaling Relay
router.post("/meetings/signal", (req, res) => {
  const { fromPeerId, toPeerId, signalData } = req.body || {};
  if (!fromPeerId || !toPeerId || !signalData) {
    return res.status(400).json({ error: "Missing signaling parameters" });
  }

  const mailbox = signalMailboxes.get(toPeerId) || [];
  mailbox.push({
    fromPeerId,
    toPeerId,
    signalData,
    timestamp: Date.now(),
  });
  signalMailboxes.set(toPeerId, mailbox);

  return res.json({ success: true });
});

router.get("/meetings/signals", (req, res) => {
  const peerId = String(req.query["peerId"] || "");
  if (!peerId) {
    return res.status(400).json({ error: "peerId query required" });
  }

  const mailbox = signalMailboxes.get(peerId) || [];
  signalMailboxes.delete(peerId); // Drain mailbox

  return res.json({ success: true, signals: mailbox });
});

export default router;
