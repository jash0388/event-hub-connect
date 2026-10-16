// childcare-team-worker build=3
/**
 * Staff and family access for Childcare: one worker per school, running in
 * the director's own Puter account (the app deploys it there with
 * puter.workers.create). Its KV is the school's shared database and its
 * drive holds the photos, so the director owns the data and pays for it.
 * Staff and families reach it through puter.workers.exec(), which forwards
 * their own Puter session.
 *
 * The key layout is the one the app uses in a single account (see
 * src/core/keys.js, mirrored below and checked by tests/keys-parity.test.js),
 * so the app's store and sync engine run unchanged on top of it. Team
 * bookkeeping lives under cct: (members and invitations).
 *
 *   GET  /health          { ok, build }
 *   POST /api             { op, ... }  see OPS below
 *   POST /files           multipart: file, path       upload a photo or document
 *   GET  /files?path=...  [&ref=<name>&id=<id>]        download one
 *
 * Every request is checked here, never in the browser. The caller is
 * identified from their own session (user.puter), never from the body.
 * Roles:
 *   owner   the director whose account runs this worker
 *   admin   everything the owner can do
 *   staff   classrooms, children, families, messages; no billing or settings
 *   parent  only their own children: profile, the day's activities that are
 *           shared with families, attendance, messages, statements
 */
const BUILD = '3';
const P = 'cc1:';
const COLLECTIONS = new Set(['students', 'guardians', 'rooms', 'staff', 'events', 'menus', 'plans', 'invoices', 'payments', 'announcements', 'threads']);
const BILLING = new Set(['plans', 'invoices', 'payments']);
const ROLES = new Set(['admin', 'staff', 'parent']);
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEY_ID_RE = /^[A-Za-z0-9]{1,40}$/;
const UUID_RE = /^[A-Za-z0-9-]{1,64}$/;
const PATH_RE = /^(media|students|messages|staff|school)\/[A-Za-z0-9._ -]{1,40}\/[A-Za-z0-9._ -]{1,120}$/;
const INVITE_TTL = 14 * 24 * 60 * 60; // seconds
const MAX_BATCH = 500;
const MAX_NAMES = 60;
const MAX_FILE = 12 * 1024 * 1024;
const FILES_DIR = 'childcare-team';
// Wrong kiosk PINs one staff account may try per window, so the 10,000 PINs
// cannot be walked through to learn whose is whose. Check-in PINs and the
// exit PIN count separately, so a child pressing keys on the pad cannot also
// keep the director from leaving the kiosk.
const KIOSK_TRIES = 40;
const KIOSK_WINDOW = 15 * 60; // seconds

// Fields a family member may change on their own child's profile, and on
// their own contact card.
const PARENT_STUDENT_FIELDS = ['allergies', 'medications', 'dietary', 'conditions', 'doctor', 'address'];
const PARENT_GUARDIAN_FIELDS = ['phone', 'email'];
// Fields families never see.
const STUDENT_PRIVATE = ['staffNotes', 'inquiry', 'tags', 'documents'];
const GUARDIAN_PRIVATE = ['pin', 'memberUuid', 'notes'];
const STAFF_PUBLIC = ['id', 'firstName', 'lastName', 'title', 'roomIds', 'color', 'photo', 'active'];

let ownerCache = null;

// ---- Key layout (mirrors src/core/keys.js) -----------------------------------

function splitName(name) {
  const i = name.indexOf(':');
  return i < 0 ? { base: name, key: null } : { base: name.slice(0, i), key: name.slice(i + 1) };
}

function isValidName(name) {
  if (typeof name !== 'string') return false;
  if (name === 'settings') return true;
  const { base, key } = splitName(name);
  if (key === null) return COLLECTIONS.has(base);
  if (base === 'activities' || base === 'attendance') return DAY_RE.test(key);
  if (base === 'messages') return KEY_ID_RE.test(key);
  return false;
}

function metaSlot(name) {
  const { base, key } = splitName(name);
  if (key === null) return { key: `${P}meta`, path: base };
  if (base === 'activities' || base === 'attendance') return { key: `${P}meta:d:${key.slice(0, 7)}`, path: `${base}${key.slice(8, 10)}` };
  return { key: `${P}meta:m`, path: `t${key}` };
}

const META_KEY_RE = /^cc1:meta(:m|:d:\d{4}-\d{2})?$/;
const recordKey = (name, id) => `${P}r:${name}:${id}`;
const memberKey = (uuid) => `cct:m:${uuid}`;
const inviteKey = (hash) => `cct:i:${hash}`;

// ---- Plumbing --------------------------------------------------------------------

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

const fail = (status, error, message) => json({ ok: false, error, message }, status);

function bad(error, status = 400, message = 'The request was not valid.') {
  return Object.assign(new Error(error), { status, code: error, publicMessage: message });
}

function ownerOf(ctx) {
  return (ctx && ctx.me) || (typeof me !== 'undefined' ? me : null);
}

const kvOf = (ctx) => ownerOf(ctx).puter.kv;
const fsOf = (ctx) => ownerOf(ctx).puter.fs;

async function identify(p) {
  if (!p) return null;
  try {
    const u = p.auth && typeof p.auth.getUser === 'function' ? await p.auth.getUser() : typeof p.getUser === 'function' ? await p.getUser() : null;
    if (u && typeof u.uuid === 'string' && u.uuid) return { uuid: u.uuid, username: String(u.username || '') };
  } catch {
    /* an invalid or expired session */
  }
  return null;
}

async function ownerIdentity(ctx) {
  if (ownerCache) return ownerCache;
  ownerCache = await identify(ownerOf(ctx).puter);
  return ownerCache;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(n = 24) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

async function listAll(kv, pattern) {
  const out = [];
  let cursor;
  for (let guard = 0; guard < 1000; guard++) {
    const page = await kv.list({ pattern, returnValues: true, limit: 1000, ...(cursor ? { cursor } : {}) });
    const items = Array.isArray(page) ? page : (page && page.items) || [];
    for (const it of items) if (it && it.value !== undefined && it.value !== null) out.push(it);
    cursor = Array.isArray(page) ? null : page && page.cursor;
    if (!cursor) break;
  }
  return out;
}

async function pool(items, limit, fn) {
  const queue = items.map((it, i) => [it, i]);
  const out = new Array(items.length);
  const run = async () => {
    while (queue.length) {
      const [it, i] = queue.shift();
      out[i] = await fn(it);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max) => String(v == null ? '' : v).slice(0, max);

// ---- Who is calling ----------------------------------------------------------------

/**
 * { uuid, username, role, guardianId?, staffId?, kids? } or null. A parent's
 * children come from their guardian record, read fresh on every request, so
 * unlinking a child takes effect at once.
 */
async function caller(ctx) {
  const user = (ctx && (ctx.user || ctx.requestor)) || null;
  const who = await identify(user && user.puter);
  if (!who) return null;
  const owner = await ownerIdentity(ctx);
  if (owner && owner.uuid === who.uuid) return { ...who, role: 'owner' };
  const kv = kvOf(ctx);
  const m = await kv.get(memberKey(who.uuid));
  if (!m || !ROLES.has(m.role)) return { ...who, role: null };
  const c = { ...who, role: m.role, guardianId: m.guardianId || null, staffId: m.staffId || null };
  if (c.role === 'parent') {
    const g = m.guardianId ? await kv.get(recordKey('guardians', m.guardianId)) : null;
    // Access belongs to the card they joined with: once it is deleted they
    // have none, and a card later re-created under the same id is not theirs.
    if (!g || g.memberUuid !== who.uuid) return { ...who, role: null };
    c.kids = new Set(Array.isArray(g && g.studentIds) ? g.studentIds.filter((id) => typeof id === 'string') : []);
    c.name = g ? [g.firstName, g.lastName].filter(Boolean).join(' ').slice(0, 80) : who.username;
  }
  return c;
}

const isManager = (c) => c && (c.role === 'owner' || c.role === 'admin');
const isStaffish = (c) => c && (c.role === 'owner' || c.role === 'admin' || c.role === 'staff');

async function settingsOf(ctx) {
  return (await kvOf(ctx).get(`${P}settings`)) || {};
}

// ---- What a parent may see ---------------------------------------------------------

function pick(obj, fields) {
  const out = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

function omit(obj, fields) {
  const out = { ...obj };
  for (const f of fields) delete out[f];
  return out;
}

/** The rooms a parent's children belong to (for room-scoped events and posts). */
async function kidRooms(ctx, c, cache) {
  if (cache.rooms) return cache.rooms;
  const ids = [...c.kids];
  const recs = await pool(ids, 4, (id) => kvOf(ctx).get(recordKey('students', id)));
  cache.rooms = new Set(recs.filter(Boolean).map((s) => s.roomId).filter(Boolean));
  return cache.rooms;
}

const scopedToRooms = (rec, rooms) => !Array.isArray(rec.roomIds) || !rec.roomIds.length || rec.roomIds.some((r) => rooms.has(r));

/** Filter (and trim) records of one name for the caller. */
async function visible(ctx, c, name, records, cache = {}) {
  if (isManager(c)) return records;
  const { base, key } = splitName(name);
  if (c.role === 'staff') {
    if (BILLING.has(base)) return [];
    // Colleagues see each other's names, rooms, and contact details; notes,
    // PINs, and certifications stay with the director.
    if (base === 'staff') return records.map((r) => (r.id === c.staffId ? omit(r, ['pin']) : pick(r, [...STAFF_PUBLIC, 'phone', 'email', 'memberUuid'])));
    if (base === 'students') return records.map((r) => omit(r, ['plans']));
    return records;
  }
  // parent
  const kids = c.kids;
  switch (base) {
    case 'students':
      return records.filter((r) => kids.has(r.id)).map((r) => omit(r, STUDENT_PRIVATE));
    case 'guardians':
      return records
        .filter((r) => Array.isArray(r.studentIds) && r.studentIds.some((id) => kids.has(id)))
        .map((r) => (r.id === c.guardianId ? omit(r, ['memberUuid', 'notes']) : { ...omit(r, GUARDIAN_PRIVATE), studentIds: r.studentIds.filter((id) => kids.has(id)) }));
    case 'rooms':
    case 'menus':
      return records;
    case 'staff':
      return records.filter((r) => r.active !== false).map((r) => pick(r, STAFF_PUBLIC));
    case 'events':
    case 'announcements': {
      const rooms = await kidRooms(ctx, c, cache);
      return records.filter((r) => scopedToRooms(r, rooms));
    }
    case 'plans':
      return records.map((r) => pick(r, ['id', 'name', 'amountCents', 'frequency', 'description']));
    case 'invoices':
    case 'payments':
      return records.filter((r) => kids.has(r.studentId));
    case 'threads':
      return records.filter((r) => kids.has(r.id)).map((r) => ({ ...r, familyReadAt: r.familyReadAt && r.familyReadAt[c.uuid] ? { [c.uuid]: r.familyReadAt[c.uuid] } : {} }));
    case 'messages':
      return kids.has(key) ? records : [];
    case 'activities':
      return records.filter((r) => kids.has(r.studentId) && !r.staffOnly);
    case 'attendance':
      return records.filter((r) => r.kind !== 'staff' && kids.has(r.studentId));
    default:
      return [];
  }
}

function sanitizeSettings(c, s) {
  if (isManager(c)) return s;
  const out = omit(s || {}, ['kioskPinHash']);
  if (c.role === 'parent') return pick(out, ['school', 'currency', 'weekStart', 'hours', 'access', 'billing', 'mealTypes', 'absenceReasons']);
  return out;
}

// ---- What a caller may write ---------------------------------------------------------

/**
 * Turn the records a caller sent into what is actually stored, or throw.
 * Owners and admins write anything; staff everything but billing, staff
 * records and settings; parents a few narrow things, merged field by field
 * into what is stored so they can never overwrite anything else.
 */
async function writable(ctx, c, name, records) {
  const { base, key } = splitName(name);
  if (base === 'threads' && isStaffish(c)) return staffThreads(kvOf(ctx), records);
  if (isManager(c)) {
    if (base !== 'guardians' && base !== 'staff') return records;
    const out = [];
    for (const r of records) {
      const existing = await kvOf(ctx).get(recordKey(name, r.id));
      const next = { ...r };
      for (const f of ['memberUuid', 'memberName']) {
        if (existing && existing[f] !== undefined) next[f] = existing[f];
        else delete next[f];
      }
      out.push(next);
    }
    return out;
  }
  const kv = kvOf(ctx);
  if (c.role === 'staff') {
    if (BILLING.has(base) || base === 'staff') throw bad('forbidden', 403, 'Only the director or an admin can change this.');
    if (base !== 'students' && base !== 'guardians') return records;
    // Billing plans and app access stay as the director set them; staff
    // cannot widen what a signed-up family member can see.
    const out = [];
    for (const r of records) {
      const existing = await kv.get(recordKey(name, r.id));
      const next = { ...r };
      if (base === 'students') {
        if (existing) next.plans = existing.plans;
        else delete next.plans;
      } else {
        for (const f of ['memberUuid', 'memberName']) {
          if (existing && existing[f] !== undefined) next[f] = existing[f];
          else delete next[f];
        }
        // The app shows staff these children read-only. A different list can
        // only be a stale copy (or a crafted request): keep the stored one,
        // rather than refusing the batch and losing staff's other edits.
        if (existing && existing.memberUuid) next.studentIds = existing.studentIds;
      }
      out.push(next);
    }
    return out;
  }

  const settings = await settingsOf(ctx);
  const access = isObj(settings.access) ? settings.access : {};
  const kids = c.kids;
  const out = [];
  for (const r of records) {
    const existing = await kv.get(recordKey(name, r.id));
    if (base === 'messages') {
      if (!kids.has(key) || access.parentsCanMessage === false) throw bad('forbidden', 403, 'Messaging is not available.');
      if (existing && existing.authorUuid !== c.uuid) throw bad('forbidden', 403);
      out.push({
        id: r.id,
        studentId: key,
        at: existing ? existing.at : new Date().toISOString(),
        from: 'family',
        author: c.name || c.username,
        authorUuid: c.uuid,
        text: str(r.text, 4000),
        ...(Array.isArray(r.media) ? { media: familyMedia(r.media, `messages/${key}/`) } : {}),
        createdAt: existing ? existing.createdAt : str(r.createdAt, 40),
        updatedAt: str(r.updatedAt, 40),
      });
    } else if (base === 'threads') {
      if (!kids.has(r.id)) throw bad('forbidden', 403);
      const next = existing ? { ...existing } : { id: r.id, createdAt: str(r.createdAt, 40) };
      // The server's clock decides, so a wrong phone clock can neither hide a
      // message from staff nor pin a conversation as unread forever.
      const now = new Date().toISOString();
      // A read-only conversation can still be read, but its preview is the school's.
      const sending = access.parentsCanMessage !== false && r.lastFrom === 'family' && (!existing || str(r.lastAt, 40) !== str(existing.lastAt, 40));
      if (sending) Object.assign(next, { lastAt: now, lastText: str(r.lastText, 140), lastFrom: 'family', lastAuthor: c.name || c.username });
      const read = r.familyReadAt && r.familyReadAt[c.uuid];
      // Never earlier than the last message, so one stamped ahead of this
      // clock (by an older worker build) cannot stay unread.
      const readAt = typeof next.lastAt === 'string' && next.lastAt > now ? next.lastAt : now;
      if (read) next.familyReadAt = { ...(isObj(next.familyReadAt) ? next.familyReadAt : {}), [c.uuid]: readAt };
      next.updatedAt = str(r.updatedAt, 40);
      out.push(next);
    } else if (base === 'attendance') {
      const sid = str(r.studentId, 64);
      if (!kids.has(sid) || r.id !== `s-${sid}` || access.parentsCanReportAbsence === false) throw bad('forbidden', 403);
      const next = existing ? { ...existing } : { id: r.id, kind: 'student', studentId: sid, roomId: str(r.roomId, 64) || undefined, events: [], createdAt: str(r.createdAt, 40) };
      if (Array.isArray(next.events) && next.events.length) throw bad('already_here', 409, 'Your child is already checked in today.');
      if (next.absent && !next.absent.byFamily) throw bad('forbidden', 403, 'The school has already recorded this day.');
      next.absent = isObj(r.absent) ? { reason: str(r.absent.reason, 60), note: str(r.absent.note, 500), by: c.name || c.username, at: str(r.absent.at, 10), byFamily: true } : null;
      next.updatedAt = str(r.updatedAt, 40);
      out.push(next);
    } else if (base === 'students') {
      if (!kids.has(r.id) || !existing || access.parentsCanEditInfo === false) throw bad('forbidden', 403);
      const next = { ...existing, updatedAt: str(r.updatedAt, 40) };
      // The doctor is { name, phone }; the rest are text. Anything else is ignored.
      for (const f of PARENT_STUDENT_FIELDS) {
        if (f === 'doctor') {
          if (isObj(r.doctor)) next.doctor = { name: str(r.doctor.name, 120), phone: str(r.doctor.phone, 40) };
        } else if (typeof r[f] === 'string') next[f] = str(r[f], 2000);
      }
      out.push(next);
    } else if (base === 'guardians') {
      if (r.id !== c.guardianId || !existing) throw bad('forbidden', 403);
      const next = { ...existing, updatedAt: str(r.updatedAt, 40) };
      for (const f of PARENT_GUARDIAN_FIELDS) if (r[f] !== undefined) next[f] = str(r[f], 200);
      out.push(next);
    } else {
      throw bad('forbidden', 403, 'Families cannot change this.');
    }
  }
  return out;
}

/**
 * Attachments a family sent: only the reference fields the app writes, with
 * the file and its thumbnail both in their own conversation's folder.
 */
function familyMedia(list, prefix) {
  const inside = (p) => typeof p === 'string' && p.startsWith(prefix) && PATH_RE.test(p) && !p.includes('..');
  const out = [];
  for (const m of list.slice(0, 10)) {
    if (!isObj(m) || !inside(m.path)) continue;
    const a = { id: str(m.id, 64), name: str(m.name, 200), type: str(m.type, 100), size: Number(m.size) || 0, path: m.path };
    if (inside(m.thumb)) a.thumb = m.thumb;
    for (const k of ['w', 'h']) if (Number.isFinite(m[k])) a[k] = m[k];
    out.push(a);
  }
  return out;
}

/**
 * Conversation times from staff devices take the server's clock as well, as
 * families' do: a tablet whose clock runs ahead would otherwise mark later
 * family messages as read, or keep its replies unread for families. Times
 * copied in when access is turned on (new records, in the past) are kept.
 */
async function staffThreads(kv, records) {
  const now = new Date().toISOString();
  // A message to many families touches many conversations: read them a few at a time.
  return pool(records, 8, async (r) => {
    const existing = await kv.get(recordKey('threads', r.id));
    const next = { ...r };
    for (const f of ['lastAt', 'staffReadAt']) {
      if (typeof next[f] !== 'string') continue;
      if (existing ? next[f] !== existing[f] : next[f] > now) next[f] = now;
    }
    return next;
  });
}

// ---- Operations -----------------------------------------------------------------------

const OPS = {
  async whoami(ctx, c) {
    const s = await settingsOf(ctx);
    return {
      uuid: c.uuid,
      username: c.username,
      role: c.role,
      guardianId: c.guardianId || null,
      staffId: c.staffId || null,
      studentIds: c.kids ? [...c.kids] : null,
      school: (s.school && s.school.name) || '',
    };
  },

  async meta(ctx, c, body) {
    const keys = Array.isArray(body.keys) ? body.keys.filter((k) => typeof k === 'string' && META_KEY_RE.test(k)).slice(0, 40) : [];
    const values = await pool(keys, 4, (k) => kvOf(ctx).get(k));
    const items = {};
    keys.forEach((k, i) => {
      let v = isObj(values[i]) ? values[i] : null;
      // Families only learn about their own children's conversations.
      if (v && c.role === 'parent' && k === `${P}meta:m`) v = Object.fromEntries(Object.entries(v).filter(([p]) => c.kids.has(p.slice(1))));
      items[k] = v;
    });
    return { items };
  },

  async load(ctx, c, body) {
    const names = Array.isArray(body.names) ? body.names : [];
    if (!names.length || names.length > MAX_NAMES || !names.every((n) => isValidName(n) && n !== 'settings')) throw bad('bad_names');
    const cache = {};
    const lists = await pool(names, 3, async (n) => {
      const { base, key } = splitName(n);
      // Nothing to read for a family's other children, or staff's billing.
      if (c.role === 'parent' && ((base === 'messages' && !c.kids.has(key)) || !c.kids.size)) return [];
      if (c.role === 'staff' && BILLING.has(base)) return [];
      const items = await listAll(kvOf(ctx), `${P}r:${n}:`);
      return visible(ctx, c, n, items.map((it) => it.value).filter(isObj), cache);
    });
    return { records: Object.fromEntries(names.map((n, i) => [n, lists[i]])) };
  },

  async settings(ctx, c) {
    return { settings: sanitizeSettings(c, await settingsOf(ctx)) };
  },

  async put(ctx, c, body) {
    if (!isValidName(body.coll) || body.coll === 'settings') throw bad('unknown_collection');
    const records = Array.isArray(body.records) ? body.records : [];
    if (!records.length || records.length > MAX_BATCH) throw bad('bad_batch');
    for (const r of records) if (!isObj(r) || !ID_RE.test(String(r.id || ''))) throw bad('bad_record');
    const stored = await writable(ctx, c, body.coll, records);
    const kv = kvOf(ctx);
    for (let i = 0; i < stored.length; i += 100) {
      await kv.set(stored.slice(i, i + 100).map((r) => ({ key: recordKey(body.coll, r.id), value: r })));
    }
    return {};
  },

  async del(ctx, c, body) {
    if (!isValidName(body.coll) || body.coll === 'settings') throw bad('unknown_collection');
    const { base } = splitName(body.coll);
    if (c.role === 'parent') throw bad('forbidden', 403, 'Families cannot delete this.');
    if (c.role === 'staff' && (BILLING.has(base) || base === 'staff')) throw bad('forbidden', 403, 'Only the director or an admin can change this.');
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length > MAX_BATCH || ids.some((id) => !ID_RE.test(String(id)))) throw bad('bad_ids');
    // Deleting and re-creating a signed-up family member's card would let
    // staff relink which children they see.
    const cards = base === 'guardians' ? await pool(ids, 3, (id) => kvOf(ctx).get(recordKey(body.coll, id))) : [];
    if (c.role === 'staff' && cards.some((r) => r && r.memberUuid)) throw bad('forbidden', 403, 'Only the director or an admin can remove a family member who uses the app.');
    await pool(ids, 3, (id) => kvOf(ctx).del(recordKey(body.coll, id)));
    // A family member whose card is deleted loses their access with it.
    for (const [i, g] of cards.entries()) {
      if (!g || !g.memberUuid) continue;
      const m = await kvOf(ctx).get(memberKey(g.memberUuid));
      if (m && m.role === 'parent' && m.guardianId === ids[i]) await kvOf(ctx).del(memberKey(g.memberUuid));
    }
    return {};
  },

  async saveSettings(ctx, c, body) {
    if (!isManager(c)) throw bad('forbidden', 403, 'Only the director or an admin can change settings.');
    if (!isObj(body.settings)) throw bad('bad_settings');
    await kvOf(ctx).set(`${P}settings`, body.settings);
    return {};
  },

  async bump(ctx, c, body) {
    let names = (Array.isArray(body.names) ? body.names : []).filter(isValidName).slice(0, MAX_NAMES);
    // Families only announce changes to what they can write.
    if (c.role === 'parent') names = names.filter((n) => { const { base, key } = splitName(n); return ['threads', 'students', 'guardians', 'attendance'].includes(base) || (base === 'messages' && c.kids.has(key)); });
    const plan = {};
    for (const n of names) {
      const { key, path } = metaSlot(n);
      (plan[key] = plan[key] || {})[path] = 1;
    }
    const keys = Object.keys(plan);
    const res = await pool(keys, 4, (k) => kvOf(ctx).incr(k, plan[k]));
    const items = {};
    keys.forEach((k, i) => (items[k] = isObj(res[i]) ? res[i] : {}));
    if (c.role === 'parent' && items[`${P}meta:m`]) items[`${P}meta:m`] = Object.fromEntries(Object.entries(items[`${P}meta:m`]).filter(([p]) => c.kids.has(p.slice(1))));
    return { items };
  },

  async next(ctx, c, body) {
    if (!isManager(c)) throw bad('forbidden', 403);
    if (body.kind !== 'invoice') throw bad('bad_kind');
    const kv = kvOf(ctx);
    const read = (res) => Number(isObj(res) ? res[body.kind] : res) || 0;
    const count = Math.min(MAX_BATCH, Math.max(1, Math.floor(Number(body.count) || 1)));
    let n = read(await kv.incr(`${P}seq`, { [body.kind]: count }));
    const atLeast = Math.min(1e9, Math.max(1, Math.floor(Number(body.atLeast) || 1)));
    if (n - count + 1 < atLeast) n = read(await kv.incr(`${P}seq`, { [body.kind]: atLeast - (n - count + 1) }));
    return { number: n - count + 1 };
  },

  async fileDelete(ctx, c, body) {
    if (!isStaffish(c)) throw bad('forbidden', 403);
    const path = String(body.path || '');
    if (!PATH_RE.test(path) || path.includes('..')) throw bad('bad_path');
    try {
      await fsOf(ctx).delete(`${FILES_DIR}/${path}`);
    } catch {
      /* already gone */
    }
    return {};
  },

  // ---- Kiosk (any staff device) ----
  /** Who a kiosk PIN belongs to: { kind: 'guardian' | 'staff', id } or nothing. */
  async kioskLookup(ctx, c, body) {
    if (!isStaffish(c)) throw bad('forbidden', 403);
    const pin = String(body.pin || '');
    if (!/^\d{4}$/.test(pin)) throw bad('bad_pin');
    const kv = kvOf(ctx);
    await kioskTriesLeft(kv, c, 'pin');
    const staff = (await listAll(kv, `${P}r:staff:`)).map((it) => it.value).find((m) => m && m.pin === pin && m.active !== false);
    if (staff) return { match: { kind: 'staff', id: staff.id } };
    const g = (await listAll(kv, `${P}r:guardians:`)).map((it) => it.value).find((x) => x && x.pin === pin && Array.isArray(x.studentIds) && x.studentIds.length);
    if (!g) await kioskMiss(kv, c, 'pin');
    return { match: g ? { kind: 'guardian', id: g.id } : null };
  },

  async kioskExit(ctx, c, body) {
    if (!isStaffish(c)) throw bad('forbidden', 403);
    const s = await settingsOf(ctx);
    if (!s.kioskPinHash) return { match: true };
    const kv = kvOf(ctx);
    await kioskTriesLeft(kv, c, 'exit');
    const match = (await sha256Hex(String(body.pin || ''))) === s.kioskPinHash;
    if (!match) await kioskMiss(kv, c, 'exit');
    return { match };
  },

  // ---- People (owner and admins) ----
  async members(ctx) {
    const owner = await ownerIdentity(ctx);
    const list = (await listAll(kvOf(ctx), 'cct:m:')).map((it) => it.value);
    return { owner: owner ? { uuid: owner.uuid, username: owner.username } : null, members: list };
  },

  async invite(ctx, c, body) {
    const role = ROLES.has(body.role) ? body.role : 'staff';
    if (role === 'admin' && c.role !== 'owner') throw bad('forbidden', 403, 'Only the director can invite admins.');
    const kv = kvOf(ctx);
    const invite = { role, createdBy: c.uuid, createdByName: c.username, createdAt: Date.now(), expiresAt: Date.now() + INVITE_TTL * 1000, label: str(body.label, 80) };
    if (role === 'parent') {
      if (!ID_RE.test(String(body.guardianId || '')) || !(await kv.get(recordKey('guardians', body.guardianId)))) throw bad('bad_guardian', 400, 'Choose a family member to invite.');
      invite.guardianId = body.guardianId;
    } else if (body.staffId) {
      if (!ID_RE.test(String(body.staffId)) || !(await kv.get(recordKey('staff', body.staffId)))) throw bad('bad_staff');
      invite.staffId = body.staffId;
    }
    const token = randomToken();
    const hash = await sha256Hex(token);
    await kv.set(inviteKey(hash), invite);
    try {
      await kv.expire(inviteKey(hash), INVITE_TTL);
    } catch {
      /* expiry is also checked on use */
    }
    return { token, role, expiresAt: invite.expiresAt };
  },

  async invites(ctx) {
    const now = Date.now();
    const list = (await listAll(kvOf(ctx), 'cct:i:')).filter((it) => isObj(it.value) && it.value.expiresAt > now).map((it) => ({ id: it.key.slice(6), ...it.value }));
    return { invites: list };
  },

  async revokeInvite(ctx, c, body) {
    if (!/^[0-9a-f]{64}$/.test(String(body.id || ''))) throw bad('bad_invite');
    await kvOf(ctx).del(inviteKey(body.id));
    return {};
  },

  async setRole(ctx, c, body) {
    if (!ROLES.has(body.role) || body.role === 'parent' || !UUID_RE.test(String(body.uuid || ''))) throw bad('bad_role');
    const kv = kvOf(ctx);
    const m = await kv.get(memberKey(body.uuid));
    if (!m) throw bad('not_a_member', 404);
    if (m.role === 'parent') throw bad('bad_role', 400, 'Family members cannot be given a staff role.');
    if ((body.role === 'admin' || m.role === 'admin') && c.role !== 'owner') throw bad('forbidden', 403, 'Only the director can change admins.');
    await kv.set(memberKey(body.uuid), { ...m, role: body.role });
    return {};
  },

  async removeMember(ctx, c, body) {
    if (!UUID_RE.test(String(body.uuid || ''))) throw bad('bad_member');
    const owner = await ownerIdentity(ctx);
    if (owner && owner.uuid === body.uuid) throw bad('forbidden', 403, 'The director cannot be removed.');
    const kv = kvOf(ctx);
    const m = await kv.get(memberKey(body.uuid));
    if (m && m.role === 'admin' && c.role !== 'owner') throw bad('forbidden', 403, 'Only the director can remove an admin.');
    await kv.del(memberKey(body.uuid));
    // Invitations they created stop working with them.
    for (const it of await listAll(kv, 'cct:i:')) if (it.value && it.value.createdBy === body.uuid) await kv.del(it.key);
    // Their profile card no longer shows them as signed up.
    if (m && (m.guardianId || m.staffId)) await unlinkProfile(kv, m.guardianId ? 'guardians' : 'staff', m.guardianId || m.staffId, body.uuid);
    return {};
  },
};

const kioskTriesKey = (uuid, kind) => `cct:k:${kind}:${uuid}:${Math.floor(Date.now() / (KIOSK_WINDOW * 1000))}`;

// The director and admins can read every PIN and the exit PIN's hash, so
// limiting them protects nothing and could only lock a kiosk out.
async function kioskTriesLeft(kv, c, kind) {
  if (isManager(c)) return;
  if ((Number(await kv.get(kioskTriesKey(c.uuid, kind))) || 0) >= KIOSK_TRIES) throw bad('too_many_tries', 429, 'Too many wrong PINs. Wait a few minutes and try again.');
}

async function kioskMiss(kv, c, kind) {
  if (isManager(c)) return;
  const key = kioskTriesKey(c.uuid, kind);
  if (Number(await kv.incr(key, 1)) !== 1) return;
  try {
    await kv.expire(key, KIOSK_WINDOW * 2);
  } catch {
    /* the counter is tiny, and the next window uses a new key */
  }
}

async function linkProfile(kv, coll, id, uuid, username) {
  const rec = await kv.get(recordKey(coll, id));
  if (!rec) return;
  await kv.set(recordKey(coll, id), { ...rec, memberUuid: uuid, memberName: username, updatedAt: new Date().toISOString() });
  await kv.incr(`${P}meta`, { [coll]: 1 });
}

async function unlinkProfile(kv, coll, id, uuid) {
  const rec = await kv.get(recordKey(coll, id));
  if (!rec || rec.memberUuid !== uuid) return;
  const next = { ...rec, updatedAt: new Date().toISOString() };
  delete next.memberUuid;
  delete next.memberName;
  await kv.set(recordKey(coll, id), next);
  await kv.incr(`${P}meta`, { [coll]: 1 });
}

/** join is the one operation open to signed-in non-members. */
async function join(ctx, c, body) {
  const token = String(body.token || '');
  if (!/^[A-Za-z0-9]{12,64}$/.test(token)) return fail(400, 'bad_invite', 'This invitation link is not valid.');
  if (c.role) return json({ ok: true, role: c.role, already: true, school: ((await settingsOf(ctx)).school || {}).name || '' });
  const kv = kvOf(ctx);
  const key = inviteKey(await sha256Hex(token));
  const invite = await kv.get(key);
  if (!invite || invite.expiresAt < Date.now()) return fail(410, 'invite_expired', 'This invitation has expired or was already used. Ask the school for a new link.');
  // The person who sent it must still be allowed to invite.
  const owner = await ownerIdentity(ctx);
  const creator = owner && invite.createdBy === owner.uuid ? { role: 'owner' } : await kv.get(memberKey(invite.createdBy));
  if (!creator || (creator.role !== 'owner' && creator.role !== 'admin')) {
    await kv.del(key);
    return fail(410, 'invite_expired', 'This invitation is no longer valid. Ask the school for a new link.');
  }
  // Single use: claim the invitation atomically before granting anything,
  // so two people opening a leaked link at once cannot both join.
  const claim = await kv.incr(`cct:c:${key.slice(6)}`, 1);
  try {
    await kv.expire(`cct:c:${key.slice(6)}`, INVITE_TTL);
  } catch {
    /* the claim marker is tiny */
  }
  if (Number(claim) !== 1) return fail(410, 'invite_expired', 'This invitation has already been used. Ask the school for a new link.');
  await kv.del(key);
  const member = { uuid: c.uuid, username: c.username, role: invite.role, joinedAt: Date.now() };
  if (invite.guardianId) member.guardianId = invite.guardianId;
  if (invite.staffId) member.staffId = invite.staffId;
  await kv.set(memberKey(c.uuid), member);
  if (invite.guardianId) await linkProfile(kv, 'guardians', invite.guardianId, c.uuid, c.username);
  if (invite.staffId) await linkProfile(kv, 'staff', invite.staffId, c.uuid, c.username);
  const settings = await settingsOf(ctx);
  return json({ ok: true, role: invite.role, school: (settings.school && settings.school.name) || '' });
}

const MANAGE = new Set(['members', 'invite', 'invites', 'revokeInvite', 'setRole', 'removeMember']);

// ---- Files -------------------------------------------------------------------------------

/** May a family member read this file? It must belong to something they can see. */
async function parentMayRead(ctx, c, path, ref, id) {
  const [area, owner] = path.split('/');
  if (area === 'messages') return c.kids.has(owner);
  if (area === 'students') {
    // A child's profile photo; documents stay with staff.
    if (!c.kids.has(owner)) return false;
    const s = await kvOf(ctx).get(recordKey('students', owner));
    return !!(s && s.photo && (s.photo.path === path || s.photo.thumb === path));
  }
  if (area === 'staff') {
    const m = ID_RE.test(owner) ? await kvOf(ctx).get(recordKey('staff', owner)) : null;
    return !!(m && m.photo && (m.photo.path === path || m.photo.thumb === path));
  }
  if (area === 'school') return true;
  if (area === 'media') {
    if (!isValidName(ref) || !ID_RE.test(String(id || ''))) return false;
    const { base } = splitName(ref);
    if (base !== 'activities' && base !== 'announcements') return false;
    const rec = await kvOf(ctx).get(recordKey(ref, id));
    if (!rec) return false;
    const [seen] = await visible(ctx, c, ref, [rec]);
    return !!(seen && Array.isArray(seen.media) && seen.media.some((m) => m && (m.path === path || m.thumb === path)));
  }
  return false;
}

async function handleUpload(ctx, c) {
  const declared = Number(ctx.request.headers && ctx.request.headers.get && ctx.request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_FILE + 64 * 1024) return fail(413, 'too_large', 'Files can be up to 12 MB.');
  let form;
  try {
    form = await ctx.request.formData();
  } catch {
    return fail(400, 'bad_upload', 'Expected a file upload.');
  }
  const file = form.get('file');
  const path = String(form.get('path') || '');
  if (!file || typeof file.size !== 'number' || !file.size) return fail(400, 'bad_upload', 'No file was sent.');
  if (file.size > MAX_FILE) return fail(413, 'too_large', 'Files can be up to 12 MB.');
  if (!PATH_RE.test(path) || path.includes('..')) return fail(400, 'bad_path', 'The file name is not valid.');
  const [area, owner] = path.split('/');
  if (c.role === 'parent' && !(area === 'messages' && c.kids.has(owner))) return fail(403, 'forbidden', 'Families can only attach files to their own conversations.');
  // Families only add files: they can never replace one already sent in the
  // conversation (by staff or another family member).
  const parent = c.role === 'parent';
  try {
    await fsOf(ctx).write(`${FILES_DIR}/${path}`, file, { overwrite: !parent, dedupeName: false, createMissingParents: true });
  } catch (err) {
    if (parent && /exist/i.test(String((err && (err.code || err.message)) || err))) return fail(409, 'file_exists', 'A file with this name was already sent.');
    throw err;
  }
  return json({ ok: true, size: file.size });
}

async function handleDownload(ctx, c) {
  const url = new URL(ctx.request.url, 'https://worker.invalid');
  const path = String(url.searchParams.get('path') || '');
  if (!PATH_RE.test(path) || path.includes('..')) return fail(400, 'bad_path', 'The file name is not valid.');
  if (c.role === 'parent' && !(await parentMayRead(ctx, c, path, url.searchParams.get('ref'), url.searchParams.get('id')))) return fail(404, 'not_found', 'File not found.');
  let blob;
  try {
    blob = await fsOf(ctx).read(`${FILES_DIR}/${path}`);
  } catch {
    return fail(404, 'not_found', 'File not found.');
  }
  const type = /^[\w.+-]+\/[\w.+-]+$/.test(String(url.searchParams.get('type') || '')) ? url.searchParams.get('type') : blob.type || 'application/octet-stream';
  return new Response(blob, {
    status: 200,
    headers: { 'content-type': type, 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' },
  });
}

// ---- Routes -------------------------------------------------------------------------------

async function guarded(ctx, fn) {
  const c = await caller(ctx);
  if (!c) return fail(401, 'sign_in_required', 'Sign in to Puter to continue.');
  if (!c.role) return fail(403, 'not_a_member', 'You are not a member of this school.');
  try {
    return await fn(c);
  } catch (err) {
    if (err && err.status) return fail(err.status, err.code, err.publicMessage || 'The request was not valid.');
    return fail(500, 'server_error', 'Something went wrong on the school server.');
  }
}

router.get('/health', async () => json({ ok: true, build: BUILD }));

router.post('/api', async (ctx) => {
  let body = null;
  try {
    body = await ctx.request.json();
  } catch {
    return fail(400, 'bad_json', 'The request could not be read.');
  }
  const op = body && typeof body.op === 'string' ? body.op : '';
  if (op === 'join') {
    const c = await caller(ctx);
    if (!c) return fail(401, 'sign_in_required', 'Sign in to Puter to continue.');
    try {
      return await join(ctx, c, body);
    } catch {
      return fail(500, 'server_error', 'Something went wrong on the school server.');
    }
  }
  return guarded(ctx, async (c) => {
    const fn = Object.prototype.hasOwnProperty.call(OPS, op) ? OPS[op] : null;
    if (!fn) return fail(400, 'unknown_op', 'Unknown operation.');
    if (MANAGE.has(op) && !isManager(c)) return fail(403, 'forbidden', 'Only the director or an admin can manage people.');
    return json({ ok: true, ...(await fn(ctx, c, body)) });
  });
});

router.post('/files', async (ctx) => guarded(ctx, (c) => handleUpload(ctx, c)));
router.get('/files', async (ctx) => guarded(ctx, (c) => handleDownload(ctx, c)));

router.get('/*path', async () => fail(404, 'not_found', 'Not found.'));
router.post('/*path', async () => fail(404, 'not_found', 'Not found.'));
