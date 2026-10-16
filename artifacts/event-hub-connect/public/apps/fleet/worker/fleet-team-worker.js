// fleet-team-worker build=3
/**
 * Team access for Fleet: one worker per fleet, running in the fleet owner's
 * own Puter account (the app deploys it there with puter.workers.create).
 * Its KV is the fleet's shared database, so the owner pays for and owns the
 * data; team members reach it through puter.workers.exec(), which forwards
 * their own Puter session.
 *
 * The key layout is the same one the app uses in a single-user account
 * (fl1:r:<bucket>:<id>, fl1:meta, fl1:seq, fl1:settings), so the app's
 * store and sync engine work unchanged on top of it. Team bookkeeping lives
 * under flt: (members and invites).
 *
 * Roles: admin (everything, including managing the team), member (all
 * fleet records, not team or settings), and driver (reads everything, but
 * may only add and edit inspections, fuel, issues, meter readings, and
 * comments, update a vehicle's current meter, delete their own comments,
 * and add new files).
 *
 *   GET  /health        { ok, build }
 *   POST /api           { op, ... }  see OPS below
 *
 * Every request is checked here, never in the browser: the caller is
 * identified from their own session (user.puter), never from the body, and
 * must be the owner or a member. Managing the team and fleet settings
 * needs the owner or an admin.
 */
const BUILD = '3';
const P = 'fl1:';
const COLLECTIONS = new Set(['vehicles', 'contacts', 'vendors', 'assignments', 'meters', 'fuel', 'expenses', 'issues', 'inspectionForms', 'inspections', 'serviceTasks', 'servicePrograms', 'reminders', 'renewals', 'serviceEntries', 'workOrders', 'parts', 'purchaseOrders', 'comments']);
const PARTITIONED = new Set(['meters', 'fuel', 'expenses', 'inspections', 'serviceEntries']);
const DRIVER_WRITE = new Set(['inspections', 'fuel', 'issues', 'meters', 'comments']);
const KINDS = new Set(['issue', 'workOrder', 'purchaseOrder']);
const DRIVER_KINDS = new Set(['issue']);
const ROLES = new Set(['admin', 'member', 'driver']);
const BUCKET_RE = /^([a-zA-Z]+)(?:_(\d{6}))?$/;

/** The collection of a valid bucket name, or null. */
function bucketColl(name) {
  const m = BUCKET_RE.exec(String(name || ''));
  if (!m || !COLLECTIONS.has(m[1])) return null;
  if (Boolean(m[2]) !== PARTITIONED.has(m[1])) return null;
  return m[1];
}

function mayWrite(c, coll) {
  return c.role !== 'driver' || DRIVER_WRITE.has(coll);
}

// Fields a driver may change on a vehicle: the current meter, which every
// fuel entry and inspection updates.
const DRIVER_VEHICLE_FIELDS = new Set(['meter', 'meterDate', 'updatedAt']);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A driver's vehicle writes as the records to store, or null if refused.
 * Only the meter is taken from them, on top of the stored vehicle, so a
 * reading made on a phone that has not seen someone else's latest edit
 * still lands without undoing that edit. A write that changes anything
 * else and not the meter is refused.
 */
async function driverMeterUpdates(kv, bucket, records) {
  const out = [];
  for (const r of records) {
    const cur = await kv.get(recordKey(bucket, r.id));
    if (!cur) return null;
    if (same(cur.meter, r.meter) && same(cur.meterDate, r.meterDate)) {
      for (const k of new Set([...Object.keys(cur), ...Object.keys(r)])) if (!DRIVER_VEHICLE_FIELDS.has(k) && !same(cur[k], r[k])) return null;
    }
    out.push({ ...cur, meter: r.meter, meterDate: r.meterDate, updatedAt: r.updatedAt });
  }
  return out;
}
// A driver's comments are their own: they cannot rewrite someone else's
// (and so get to delete it), and the author is who is signed in.
async function ownComments(kv, bucket, records, c) {
  for (const r of records) {
    const cur = await kv.get(recordKey(bucket, r.id));
    if ((cur && cur.authorUuid !== c.uuid) || r.authorUuid !== c.uuid) throw bad('forbidden', 403);
    if (c.username) r.author = c.username;
  }
}
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const PATH_RE = /^[A-Za-z0-9._/ -]{1,200}$/;
// No empty, "." or ".." segments, so a path cannot leave the team folder.
// (A name like "scan...jpg" is fine.)
const safePath = (path) => PATH_RE.test(path) && path.split('/').every((seg) => seg && seg !== '.' && seg !== '..');
const INVITE_TTL = 7 * 24 * 60 * 60; // seconds
const MAX_BATCH = 500;
const MAX_FILE_B64 = 12 * 1024 * 1024;

let ownerCache = null;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

const fail = (status, error, message) => json({ ok: false, error, message }, status);

function ownerOf(ctx) {
  return (ctx && ctx.me) || (typeof me !== 'undefined' ? me : null);
}

function kvOf(ctx) {
  return ownerOf(ctx).puter.kv;
}

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

const memberKey = (uuid) => `flt:m:${uuid}`;
const inviteKey = (hash) => `flt:i:${hash}`;
const recordKey = (bucket, id) => `${P}r:${bucket}:${id}`;

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

/** Who is calling and what they may do: { uuid, username, role } or null. */
async function caller(ctx) {
  const user = (ctx && (ctx.user || ctx.requestor)) || null;
  const who = await identify(user && user.puter);
  if (!who) return null;
  const owner = await ownerIdentity(ctx);
  if (owner && owner.uuid === who.uuid) return { ...who, role: 'owner' };
  const m = await kvOf(ctx).get(memberKey(who.uuid));
  if (m && ROLES.has(m.role)) return { ...who, role: m.role };
  return { ...who, role: null };
}

const canManage = (c) => c && (c.role === 'owner' || c.role === 'admin');

// ---- Operations ---------------------------------------------------------------

const OPS = {
  async whoami(ctx, c) {
    const settings = (await kvOf(ctx).get(`${P}settings`)) || {};
    return { uuid: c.uuid, username: c.username, role: c.role, business: (settings.company && settings.company.name) || '' };
  },

  async meta(ctx) {
    return { meta: (await kvOf(ctx).get(`${P}meta`)) || {} };
  },

  async load(ctx, c, body) {
    if (!bucketColl(body.bucket)) throw bad('unknown_bucket');
    const items = await listAll(kvOf(ctx), `${P}r:${body.bucket}:`);
    return { records: items.map((it) => it.value).filter((v) => v && typeof v === 'object') };
  },

  async settings(ctx) {
    return { settings: (await kvOf(ctx).get(`${P}settings`)) || null };
  },

  async put(ctx, c, body) {
    const coll = bucketColl(body.bucket);
    if (!coll) throw bad('unknown_bucket');
    const records = Array.isArray(body.records) ? body.records : [];
    if (!records.length || records.length > MAX_BATCH) throw bad('bad_batch');
    for (const r of records) if (!r || typeof r !== 'object' || !ID_RE.test(String(r.id || ''))) throw bad('bad_record');
    const kv = kvOf(ctx);
    let toWrite = records;
    if (!mayWrite(c, coll)) {
      toWrite = c.role === 'driver' && coll === 'vehicles' ? await driverMeterUpdates(kv, body.bucket, records) : null;
      if (!toWrite) throw bad('forbidden', 403);
    }
    if (c.role === 'driver' && coll === 'comments') await ownComments(kv, body.bucket, records, c);
    for (let i = 0; i < toWrite.length; i += 100) {
      await kv.set(toWrite.slice(i, i + 100).map((r) => ({ key: recordKey(body.bucket, r.id), value: r })));
    }
    return {};
  },

  async del(ctx, c, body) {
    const coll = bucketColl(body.bucket);
    if (!coll) throw bad('unknown_bucket');
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length > MAX_BATCH || ids.some((id) => !ID_RE.test(String(id)))) throw bad('bad_ids');
    const kv = kvOf(ctx);
    if (c.role === 'driver') {
      // Drivers keep history intact: the only thing they can delete is a
      // comment they wrote themselves.
      if (coll !== 'comments') throw bad('forbidden', 403);
      for (const id of ids) {
        const cur = await kv.get(recordKey(body.bucket, id));
        if (cur && cur.authorUuid !== c.uuid) throw bad('forbidden', 403);
      }
    }
    for (const id of ids) await kv.del(recordKey(body.bucket, id));
    return {};
  },

  async saveSettings(ctx, c, body) {
    if (!canManage(c)) throw bad('forbidden', 403);
    if (!body.settings || typeof body.settings !== 'object') throw bad('bad_settings');
    await kvOf(ctx).set(`${P}settings`, body.settings);
    return {};
  },

  async bump(ctx, c, body) {
    const names = (Array.isArray(body.names) ? body.names : []).filter((n) => n === 'settings' || bucketColl(n)).slice(0, 200);
    if (!names.length) return { meta: (await kvOf(ctx).get(`${P}meta`)) || {} };
    const paths = {};
    for (const n of names) paths[n] = 1;
    const res = await kvOf(ctx).incr(`${P}meta`, paths);
    return { meta: res && typeof res === 'object' ? res : {} };
  },

  async next(ctx, c, body) {
    if (!KINDS.has(body.kind)) throw bad('bad_kind');
    if (c.role === 'driver' && !DRIVER_KINDS.has(body.kind)) throw bad('forbidden', 403);
    const kv = kvOf(ctx);
    const read = (res) => Number(typeof res === 'object' ? res && res[body.kind] : res) || 0;
    let n = read(await kv.incr(`${P}seq`, { [body.kind]: 1 }));
    // Catching the counter up after an import is a manager task; others
    // cannot move it far ahead.
    const cap = canManage(c) ? 1e7 : c.role === 'driver' ? 1 : 1e5;
    const atLeast = Math.min(cap, Math.max(1, Math.floor(Number(body.atLeast) || 1)));
    if (n < atLeast) n = read(await kv.incr(`${P}seq`, { [body.kind]: atLeast - n }));
    return { number: n };
  },

  // ---- Files (photos, receipts) live in the owner's drive ----
  async fileWrite(ctx, c, body) {
    const path = String(body.path || '');
    if (!safePath(path)) throw bad('bad_path');
    const b64 = String(body.data || '');
    if (!b64 || b64.length > MAX_FILE_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw bad('bad_file');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const type = /^[\w.+-]+\/[\w.+-]+$/.test(String(body.type || '')) ? body.type : 'application/octet-stream';
    // Drivers can add files but never replace an existing one.
    const overwrite = c.role !== 'driver';
    try {
      await ownerOf(ctx).puter.fs.write(`fleet-team/${path}`, new Blob([bytes], { type }), { overwrite, dedupeName: false, createMissingParents: true });
    } catch (err) {
      if (!overwrite) throw bad('forbidden', 403);
      throw err;
    }
    return {};
  },

  async fileRead(ctx, c, body) {
    const path = String(body.path || '');
    if (!safePath(path)) throw bad('bad_path');
    const blob = await ownerOf(ctx).puter.fs.read(`fleet-team/${path}`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { data: btoa(bin), type: blob.type || '' };
  },

  async fileDelete(ctx, c, body) {
    if (c.role === 'driver') throw bad('forbidden', 403);
    const path = String(body.path || '');
    if (!safePath(path)) throw bad('bad_path');
    try {
      await ownerOf(ctx).puter.fs.delete(`fleet-team/${path}`);
    } catch {
      /* already gone */
    }
    return {};
  },

  // ---- Team management (owner and admins) ----
  async members(ctx) {
    const owner = await ownerIdentity(ctx);
    const list = (await listAll(kvOf(ctx), 'flt:m:')).map((it) => it.value);
    return { owner: owner ? { uuid: owner.uuid, username: owner.username } : null, members: list };
  },

  async invite(ctx, c, body) {
    const role = ROLES.has(body.role) ? body.role : 'member';
    const token = randomToken();
    const hash = await sha256Hex(token);
    const kv = kvOf(ctx);
    const expiresAt = Date.now() + INVITE_TTL * 1000;
    await kv.set(inviteKey(hash), { role, createdBy: c.uuid, createdByName: c.username, createdAt: Date.now(), expiresAt, label: String(body.label || '').slice(0, 80) });
    try {
      await kv.expire(inviteKey(hash), INVITE_TTL);
    } catch {
      /* expiry is also checked on use */
    }
    return { token, role, expiresAt };
  },

  async invites(ctx) {
    const now = Date.now();
    const list = (await listAll(kvOf(ctx), 'flt:i:')).filter((it) => it.value.expiresAt > now).map((it) => ({ id: it.key.slice(6), ...it.value }));
    return { invites: list };
  },

  async revokeInvite(ctx, c, body) {
    if (!/^[0-9a-f]{64}$/.test(String(body.id || ''))) throw bad('bad_invite');
    await kvOf(ctx).del(inviteKey(body.id));
    return {};
  },

  async setRole(ctx, c, body) {
    if (!ROLES.has(body.role) || !ID_RE.test(String(body.uuid || '').replace(/-/g, ''))) throw bad('bad_role');
    const kv = kvOf(ctx);
    const m = await kv.get(memberKey(body.uuid));
    if (!m) throw bad('not_a_member', 404);
    await kv.set(memberKey(body.uuid), { ...m, role: body.role });
    // Only admins can invite: links an admin sent stop working (and leave
    // the list) once they are not one.
    if (body.role !== 'admin') await dropInvitesBy(kv, body.uuid);
    return {};
  },

  async removeMember(ctx, c, body) {
    if (!ID_RE.test(String(body.uuid || '').replace(/-/g, ''))) throw bad('bad_member');
    await dropMember(kvOf(ctx), body.uuid);
    return {};
  },

  // Anyone but the owner can leave the fleet on their own.
  async leave(ctx, c) {
    if (c.role === 'owner') throw bad('owner_cannot_leave');
    await dropMember(kvOf(ctx), c.uuid);
    return {};
  },
};

async function dropMember(kv, uuid) {
  await kv.del(memberKey(uuid));
  // Invitations they created stop working with them.
  await dropInvitesBy(kv, uuid);
}

async function dropInvitesBy(kv, uuid) {
  for (const it of await listAll(kv, 'flt:i:')) if (it.value.createdBy === uuid) await kv.del(it.key);
}

/** join is the one operation open to signed-in non-members. */
async function join(ctx, c, body) {
  const token = String(body.token || '');
  if (!/^[A-Za-z0-9]{12,64}$/.test(token)) return fail(400, 'bad_invite', 'This invitation link is not valid.');
  if (c.role) return json({ ok: true, role: c.role, already: true });
  const kv = kvOf(ctx);
  const hash = await sha256Hex(token);
  const key = inviteKey(hash);
  const invite = await kv.get(key);
  if (!invite || invite.expiresAt < Date.now()) return fail(410, 'invite_expired', 'This invitation has expired or was already used. Ask for a new link.');
  // The person who sent it must still be allowed to invite.
  const owner = await ownerIdentity(ctx);
  // Without knowing who the owner is, a valid invitation of theirs would
  // look orphaned and be deleted below. Let the person try again instead.
  if (!owner) return fail(503, 'server_busy', 'The team server could not check this invitation right now. Try again in a moment.');
  const creator = invite.createdBy === owner.uuid ? { role: 'owner' } : await kv.get(memberKey(invite.createdBy));
  if (!creator || (creator.role !== 'owner' && creator.role !== 'admin')) {
    await kv.del(key);
    return fail(410, 'invite_expired', 'This invitation is no longer valid. Ask for a new link.');
  }
  // Claim the invitation atomically: of several people opening the same
  // link at once, only the first one gets in.
  const claimKey = `flt:iu:${hash}`;
  const claimed = await kv.incr(claimKey, { n: 1 });
  if (Number(claimed && typeof claimed === 'object' ? claimed.n : claimed) !== 1) return fail(410, 'invite_expired', 'This invitation has expired or was already used. Ask for a new link.');
  try {
    await kv.expire(claimKey, INVITE_TTL);
  } catch {
    /* the invitation itself is deleted below */
  }
  await kv.set(memberKey(c.uuid), { uuid: c.uuid, username: c.username, role: invite.role, joinedAt: Date.now() });
  await kv.del(key);
  const settings = (await kv.get(`${P}settings`)) || {};
  return json({ ok: true, role: invite.role, business: (settings.company && settings.company.name) || '' });
}

function bad(error, status = 400) {
  return Object.assign(new Error(error), { status, code: error });
}

const MANAGE = new Set(['members', 'invite', 'invites', 'revokeInvite', 'setRole', 'removeMember']);

router.get('/health', async () => json({ ok: true, build: BUILD }));

router.post('/api', async (ctx) => {
  let body = null;
  try {
    body = await ctx.request.json();
  } catch {
    return fail(400, 'bad_json', 'The request could not be read.');
  }
  const op = body && typeof body.op === 'string' ? body.op : '';
  const c = await caller(ctx);
  if (!c) return fail(401, 'sign_in_required', 'Sign in to Puter to continue.');
  if (op === 'join') return join(ctx, c, body);
  if (!c.role) return fail(403, 'not_a_member', 'You are not a member of this fleet.');
  const fn = Object.prototype.hasOwnProperty.call(OPS, op) ? OPS[op] : null;
  if (!fn) return fail(400, 'unknown_op', 'Unknown operation.');
  if (MANAGE.has(op) && !canManage(c)) return fail(403, 'forbidden', 'Only the owner or an admin can manage the team.');
  try {
    return json({ ok: true, ...(await fn(ctx, c, body)) });
  } catch (err) {
    if (err && err.status === 403) return fail(403, 'forbidden', 'Your role does not allow this change.');
    if (err && err.status) return fail(err.status, err.code, 'The request was not valid.');
    return fail(500, 'server_error', 'Something went wrong on the team server.');
  }
});

router.get('/*path', async () => fail(404, 'not_found', 'Not found.'));
router.post('/*path', async () => fail(404, 'not_found', 'Not found.'));
