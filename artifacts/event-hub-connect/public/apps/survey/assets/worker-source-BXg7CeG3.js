function e(e){return e.replace(/^export\s+(?=(async\s+)?function|const|let|class)/gm,``)}function t(t,{runtime:n=`/**
 * Survey runtime: what a respondent is shown and what counts as a valid
 * answer. Used in three places that must agree exactly:
 *
 *   - the respondent page (r/index.html) and the in-app preview, to decide
 *     which questions and pages to show and to check answers as people type;
 *   - the collector worker (src/worker/collector.js), which re-checks every
 *     submitted response against the published survey before storing it.
 *
 * The worker is deployed as one plain script, so this file has no imports and
 * nothing here may touch the DOM. buildWorkerSource() in
 * src/data/collector-client.js strips the \`export\` keywords and prepends this
 * file to the worker source.
 *
 * Answer shapes, by question type:
 *   single, dropdown   { c: choiceId, t?: otherText }
 *   multi              { c: [choiceId, ...], t?: otherText }
 *   rating, nps,
 *   slider             number
 *   matrix             { [rowId]: columnId }  or { [rowId]: [columnId, ...] } when q.multi
 *   ranking            [choiceId, ...]  (every choice, best first)
 *   text, textarea,
 *   datetime           string
 *   multitext, contact { [fieldId]: string }
 */

export const OTHER_ID = '_other';
export const NONE_ID = '_none';

/** Types that collect an answer. 'statement' is display-only text. */
export const ANSWER_TYPES = [
  'single',
  'multi',
  'dropdown',
  'rating',
  'nps',
  'matrix',
  'slider',
  'ranking',
  'text',
  'textarea',
  'multitext',
  'contact',
  'datetime',
];

export const LIMITS = {
  text: 1000,
  textarea: 10000,
  other: 1000,
  field: 500,
};

export const CONTACT_FIELDS = [
  ['name', 'Name'],
  ['company', 'Company'],
  ['address', 'Address'],
  ['address2', 'Address 2'],
  ['city', 'City/Town'],
  ['state', 'State/Province'],
  ['zip', 'ZIP/Postal code'],
  ['country', 'Country'],
  ['email', 'Email address'],
  ['phone', 'Phone number'],
];

const EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const PHONE_RE = /^[+()\\-.\\s\\d]{5,32}$/;
const DATE_RE = /^\\d{4}-\\d{2}-\\d{2}$/;
const TIME_RE = /^([01]\\d|2[0-3]):[0-5]\\d$/;

export function isAnswerable(q) {
  return !!q && ANSWER_TYPES.includes(q.type);
}

function own(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

function choiceIds(q) {
  return (q.choices || []).map((c) => c.id);
}

/** A finite number from a number or a numeric string, else null. */
function numeric(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string' && /^\\s*-?\\d+(\\.\\d+)?\\s*$/.test(raw)) return Number(raw);
  return null;
}

/** YYYY-MM-DD that names a day that exists (no February 31st). */
function realDate(s) {
  if (!DATE_RE.test(s || '')) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function clip(v, cap) {
  return typeof v === 'string' ? v.slice(0, cap) : '';
}

/** Highest value a rating question accepts. */
export function ratingMax(q) {
  const n = Math.round(Number(q.scale));
  return n >= 2 && n <= 10 ? n : 5;
}

export function sliderBounds(q) {
  let min = Number.isFinite(Number(q.min)) ? Number(q.min) : 0;
  let max = Number.isFinite(Number(q.max)) ? Number(q.max) : 100;
  if (max <= min) max = min + 1;
  let step = Number(q.step);
  if (!(step > 0)) step = 1;
  return { min, max, step };
}

/** The fields a multitext or contact question shows, in order. */
export function fieldsOf(q) {
  if (q.type === 'contact') {
    const conf = q.fields || {};
    return CONTACT_FIELDS.filter(([id]) => (own(conf, id) ? conf[id].enabled !== false : true)).map(
      ([id, label]) => ({
        id,
        label: (own(conf, id) && conf[id].label) || label,
        required: own(conf, id) ? !!conf[id].required : false,
        kind: id === 'email' ? 'email' : id === 'phone' ? 'phone' : 'text',
      }),
    );
  }
  return (q.fields || []).map((f) => ({ id: f.id, label: f.label || '', required: false, kind: 'text' }));
}

/**
 * Normalize a raw answer into its stored shape, dropping anything that does
 * not belong to the question (unknown choice ids, out-of-range numbers,
 * oversized text). Returns undefined for "no answer".
 */
export function sanitizeAnswer(q, raw) {
  if (!isAnswerable(q) || raw == null) return undefined;
  switch (q.type) {
    case 'single':
    case 'dropdown': {
      const c = typeof raw === 'object' ? raw.c : raw;
      if (typeof c !== 'string') return undefined;
      if (c === OTHER_ID && q.other && q.other.enabled) {
        const t = clip(raw.t, LIMITS.other).trim();
        return t ? { c, t } : { c };
      }
      return choiceIds(q).includes(c) ? { c } : undefined;
    }
    case 'multi': {
      const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.c) ? raw.c : null;
      if (!list) return undefined;
      const allowed = new Set(choiceIds(q));
      if (q.other && q.other.enabled) allowed.add(OTHER_ID);
      if (q.none && q.none.enabled) allowed.add(NONE_ID);
      let picked = [...new Set(list.filter((c) => typeof c === 'string' && allowed.has(c)))];
      if (picked.includes(NONE_ID)) picked = [NONE_ID];
      if (!picked.length) return undefined;
      const out = { c: picked };
      if (picked.includes(OTHER_ID)) {
        const t = clip(raw.t, LIMITS.other).trim();
        if (t) out.t = t;
      }
      return out;
    }
    case 'rating': {
      const n = numeric(raw);
      return Number.isInteger(n) && n >= 1 && n <= ratingMax(q) ? n : undefined;
    }
    case 'nps': {
      const n = numeric(raw);
      return Number.isInteger(n) && n >= 0 && n <= 10 ? n : undefined;
    }
    case 'slider': {
      const n = numeric(raw);
      const { min, max, step } = sliderBounds(q);
      if (n == null || n < min || n > max) return undefined;
      // On the step grid (with a little room for floating point).
      const k = (n - min) / step;
      return Math.abs(k - Math.round(k)) < 1e-6 ? n : undefined;
    }
    case 'matrix': {
      if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
      const cols = new Set((q.columns || []).map((c) => c.id));
      const out = {};
      for (const row of q.rows || []) {
        if (!own(raw, row.id)) continue;
        const v = raw[row.id];
        if (q.multi) {
          const picked = Array.isArray(v) ? [...new Set(v.filter((c) => cols.has(c)))] : [];
          if (picked.length) out[row.id] = picked;
        } else if (typeof v === 'string' && cols.has(v)) {
          out[row.id] = v;
        }
      }
      return Object.keys(out).length ? out : undefined;
    }
    case 'ranking': {
      if (!Array.isArray(raw)) return undefined;
      const ids = choiceIds(q);
      const order = [...new Set(raw.filter((c) => ids.includes(c)))];
      return order.length === ids.length && ids.length > 0 ? order : undefined;
    }
    case 'text':
    case 'textarea': {
      const t = clip(raw, q.type === 'text' ? LIMITS.text : LIMITS.textarea);
      return t.trim() ? t : undefined;
    }
    case 'datetime': {
      const t = typeof raw === 'string' ? raw.trim() : '';
      if (!t) return undefined;
      const wantDate = q.date !== false;
      const wantTime = !!q.time;
      if (wantDate && wantTime) {
        const [d, tm] = t.split('T');
        return realDate(d) && TIME_RE.test(tm || '') ? \`\${d}T\${tm}\` : undefined;
      }
      if (wantTime) return TIME_RE.test(t) ? t : undefined;
      return realDate(t) ? t : undefined;
    }
    case 'multitext':
    case 'contact': {
      if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
      const out = {};
      for (const f of fieldsOf(q)) {
        const t = clip(raw[f.id], LIMITS.field).trim();
        if (t) out[f.id] = t;
      }
      return Object.keys(out).length ? out : undefined;
    }
    default:
      return undefined;
  }
}

function countLabel(n, one, many) {
  return \`\${n} \${n === 1 ? one : many}\`;
}

/** What an unanswered required question says unless the creator wrote
 *  their own message. */
export function defaultRequiredMessage(q) {
  // A ranking starts out in an order, so say how to answer it.
  return q && q.type === 'ranking' ? 'Put the items in order, or choose “Keep this order”.' : 'This question requires an answer.';
}

/**
 * The message to show for an answer, or '' when it is acceptable. \`value\`
 * must already be sanitized (undefined = unanswered).
 */
export function validateAnswer(q, value) {
  if (!isAnswerable(q)) return '';
  const requiredMsg = (q.requiredMessage || '').trim() || defaultRequiredMessage(q);
  if (value === undefined) {
    if (q.required) return requiredMsg;
    // Contact fields marked required (shown with *) are required even when
    // the question as a whole is not.
    const field = q.type === 'contact' && fieldsOf(q).find((f) => f.required);
    return field ? \`\${field.label} is required.\` : '';
  }

  switch (q.type) {
    case 'single':
    case 'dropdown':
      if (value.c === OTHER_ID && q.other && q.other.required !== false && !value.t) {
        return 'Please specify your answer.';
      }
      return '';
    case 'multi': {
      const real = value.c.filter((c) => c !== NONE_ID);
      if (value.c.includes(OTHER_ID) && q.other && q.other.required !== false && !value.t) {
        return 'Please specify your answer.';
      }
      if (value.c.includes(NONE_ID)) return '';
      const min = Number(q.minSelect) || 0;
      const max = Number(q.maxSelect) || 0;
      if (min && max && min === max && real.length !== min) {
        return \`Select exactly \${countLabel(min, 'option', 'options')}.\`;
      }
      if (min && real.length < min) return \`Select at least \${countLabel(min, 'option', 'options')}.\`;
      if (max && real.length > max) return \`Select no more than \${countLabel(max, 'option', 'options')}.\`;
      return '';
    }
    case 'matrix':
      if (q.required && (q.rows || []).some((r) => !own(value, r.id))) {
        return (q.requiredMessage || '').trim() || 'Please answer every row.';
      }
      return '';
    case 'text': {
      const v = q.validation || {};
      const t = value.trim();
      if (v.kind === 'email' && !EMAIL_RE.test(t)) return v.message || 'Enter a valid email address.';
      if (v.kind === 'number' || v.kind === 'integer') {
        // Plain decimal digits only: Number() would also take hex, binary,
        // exponents and Infinity, which are stored as typed.
        // A decimal comma counts ("3,5": phone keypads in many languages
        // offer only that), except where it could be a thousands separator
        // ("1,000").
        const comma = /^[+-]?\\d*,\\d+$/.test(t) && !/^[+-]?\\d{1,3},\\d{3}$/.test(t);
        const n = Number(comma ? t.replace(',', '.') : t);
        const bad =
          !(comma || /^[+-]?(\\d+(\\.\\d*)?|\\.\\d+)$/.test(t)) ||
          !Number.isFinite(n) ||
          (v.kind === 'integer' && !Number.isInteger(n)) ||
          (v.min !== '' && v.min != null && n < Number(v.min)) ||
          (v.max !== '' && v.max != null && n > Number(v.max));
        if (bad) {
          if (v.message) return v.message;
          const kind = v.kind === 'integer' ? 'a whole number' : 'a number';
          const hasMin = v.min !== '' && v.min != null;
          const hasMax = v.max !== '' && v.max != null;
          if (hasMin && hasMax) return \`Enter \${kind} between \${v.min} and \${v.max}.\`;
          if (hasMin) return \`Enter \${kind} of at least \${v.min}.\`;
          if (hasMax) return \`Enter \${kind} of at most \${v.max}.\`;
          return \`Enter \${kind}.\`;
        }
      }
      if (v.kind === 'length') {
        const min = Number(v.min) || 0;
        const max = Number(v.max) || 0;
        if ((min && t.length < min) || (max && t.length > max)) {
          if (v.message) return v.message;
          if (min && max) return \`Enter between \${min} and \${max} characters.\`;
          if (min) return \`Enter at least \${countLabel(min, 'character', 'characters')}.\`;
          return \`Enter no more than \${countLabel(max, 'character', 'characters')}.\`;
        }
      }
      return '';
    }
    case 'textarea': {
      const v = q.validation || {};
      if (v.kind === 'length') {
        const t = value.trim();
        const min = Number(v.min) || 0;
        const max = Number(v.max) || 0;
        if (min && t.length < min) return v.message || \`Enter at least \${countLabel(min, 'character', 'characters')}.\`;
        if (max && t.length > max) return v.message || \`Enter no more than \${countLabel(max, 'character', 'characters')}.\`;
      }
      return '';
    }
    case 'contact':
    case 'multitext': {
      const issue = fieldIssue(q, value);
      return issue ? issue.message : '';
    }
    default:
      return '';
  }
}

/**
 * The first box of a contact or multiple-text answer that fails, as
 * { id, message }, or null.
 */
export function fieldIssue(q, value) {
  for (const f of fieldsOf(q)) {
    const t = value[f.id];
    if (q.type === 'contact') {
      if (f.required && !t) return { id: f.id, message: \`\${f.label} is required.\` };
      if (t && f.kind === 'email' && !EMAIL_RE.test(t)) return { id: f.id, message: 'Enter a valid email address.' };
      if (t && f.kind === 'phone' && !PHONE_RE.test(t)) return { id: f.id, message: 'Enter a valid phone number.' };
    } else if (q.required && !t) return { id: f.id, message: 'Please fill in every box.' };
  }
  return null;
}

/** True when a display condition holds for the answers given so far. */
export function conditionHolds(cond, survey, answers) {
  if (!cond || !cond.qid) return true;
  const value = answers ? answers[cond.qid] : undefined;
  const answered = value !== undefined;
  switch (cond.op) {
    case 'answered':
      return answered;
    case 'notAnswered':
      return !answered;
    case 'is':
    case 'isNot': {
      let hit = false;
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        hit = Array.isArray(value.c) ? value.c.includes(cond.value) : value.c === cond.value;
      } else if (typeof value === 'number') {
        hit = String(value) === String(cond.value);
      }
      return cond.op === 'is' ? hit : answered && !hit;
    }
    default:
      return true;
  }
}

export function isQuestionVisible(q, survey, answers) {
  return conditionHolds(q.display, survey, answers);
}

/**
 * Where to go after \`pageIndex\`: another page index, 'end' (thank-you
 * screen), or 'disqualify'. Question skip logic on the page wins over page
 * logic, earliest question first; only visible, answered single-answer
 * questions take part.
 */
export function nextStep(survey, pageIndex, answers) {
  const pages = survey.pages || [];
  const page = pages[pageIndex];
  const resolve = (target) => {
    if (!target || !target.type) return null;
    if (target.type === 'end' || target.type === 'disqualify') return target.type;
    if (target.type === 'page') {
      const idx = pages.findIndex((p) => p.id === target.pageId);
      // Only ever jump forward: a backwards jump could loop forever.
      if (idx > pageIndex) return idx;
    }
    return null;
  };
  if (page) {
    for (const q of page.questions || []) {
      if (!q.logic || !isQuestionVisible(q, survey, answers)) continue;
      const v = answers ? answers[q.id] : undefined;
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
      // Checkbox picks arrive in screen order, which is shuffled when choices
      // are randomized: rules apply in the order the choices were written.
      const picked = new Set(Array.isArray(v.c) ? v.c : [v.c]);
      const order = [...(q.choices || []).map((c) => c.id), OTHER_ID, NONE_ID];
      for (const c of order.filter((id) => picked.has(id))) {
        if (!own(q.logic, c)) continue;
        const to = resolve(q.logic[c]);
        if (to != null) return to;
      }
    }
    const to = resolve(page.logic);
    if (to != null) return to;
  }
  return pageIndex + 1 < pages.length ? pageIndex + 1 : 'end';
}

/** The pages a respondent with these answers walks through, in order, and
 *  how the walk ends. */
export function walk(survey, answers) {
  const pages = survey.pages || [];
  const path = [];
  if (!pages.length) return { path, outcome: 'end' };
  let i = 0;
  const seen = new Set();
  while (typeof i === 'number' && i < pages.length && !seen.has(i)) {
    seen.add(i);
    path.push(i);
    i = nextStep(survey, i, answers);
  }
  return { path, outcome: i === 'disqualify' ? 'disqualify' : 'end' };
}

/**
 * Check a whole submission the way the collector does: sanitize every
 * answer, drop answers to questions the respondent never saw (skipped pages,
 * hidden questions), and report the first problem per question.
 */
export function validateResponse(survey, rawAnswers) {
  const raw = rawAnswers && typeof rawAnswers === 'object' ? rawAnswers : {};
  const pages = survey.pages || [];
  // Answers are accepted page by page along the path, and only for
  // questions visible at that point, so an answer to a skipped or hidden
  // question can never steer logic, hide a required question, or be stored.
  // Null-prototype maps: a question id is never mistaken for an inherited
  // property.
  const clean = Object.create(null);
  const errors = Object.create(null);
  const path = [];
  const seen = new Set();
  let i = pages.length ? 0 : 'end';
  while (typeof i === 'number' && i < pages.length && !seen.has(i)) {
    seen.add(i);
    path.push(i);
    for (const q of pages[i].questions || []) {
      if (!isAnswerable(q) || !isQuestionVisible(q, survey, clean)) continue;
      const v = own(raw, q.id) ? sanitizeAnswer(q, raw[q.id]) : undefined;
      if (v !== undefined) clean[q.id] = v;
      const msg = validateAnswer(q, v);
      if (msg) errors[q.id] = msg;
    }
    i = nextStep(survey, i, clean);
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors: { ...errors },
    answers: { ...clean },
    outcome: i === 'disqualify' ? 'disqualify' : 'end',
    path,
  };
}

/** Small deterministic PRNG so a respondent keeps the same shuffled order
 *  when they go back a page. */
export function seededShuffle(items, seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Question numbers as respondents see them: answerable questions only,
 *  counted across the whole survey. */
export function questionNumbers(survey) {
  const out = {};
  let n = 0;
  for (const page of survey.pages || []) {
    for (const q of page.questions || []) {
      if (isAnswerable(q)) out[q.id] = ++n;
    }
  }
  return out;
}
`,collector:r=`/**
 * Response collector: a Puter serverless worker deployed into the survey
 * creator's own account (see src/data/collector-client.js for deployment).
 *
 * Respondents have no Puter account and cannot reach the creator's storage,
 * so this worker stands between them: it serves published surveys and stores
 * responses in the creator's KV. It serves no HTML. The respondent page
 * (r/index.html on the app's own hosting) calls this JSON API.
 *
 * At deploy time src/shared/runtime.js is prepended to this file, so
 * validateResponse() and friends are in scope here, and every submission is
 * checked by exactly the code the respondent page used.
 *
 * Public API (respondents, no credentials). Requests are CORS "simple": GET,
 * or POST with a text/plain JSON body, so browsers send no preflight.
 *   GET  /api/c/<collectorId>            survey + collector, or a status
 *   POST /api/c/<collectorId>/unlock     { password } for protected links (returns a pass)
 *   POST /api/c/<collectorId>/responses  { answers, startedAt, rid?, password?, pass?, meta? }
 *
 * Admin API (the builder app), with \`Authorization: Bearer <secret>\`. Only
 * SHA-256(secret) is baked into the deployed source.
 *   GET  /admin/ping
 *   POST /admin/publish            { survey }
 *   POST /admin/collector          { collector }
 *   POST /admin/collector/delete   { id }
 *   POST /admin/survey/delete      { sid, collectors: [id] }
 *   GET  /admin/responses?sid=&limit=&cursor=   newest first
 *   POST /admin/responses/delete   { sid, keys: [key] }
 *   GET  /admin/stats
 *
 * KV layout (all keys start with svw: so they never mix with app data):
 *   svw:s:<surveyId>              published survey { survey, publishedAt }
 *   svw:c:<collectorId>           collector settings
 *   svw:r:<surveyId>:<responseId> one response; ids sort by submit time
 *   svw:n:<surveyId>              response count for the survey
 *   svw:nc:<collectorId>          response count for the collector
 *   svw:x:<collectorId>:<rid>     the response id a submission is stored under (expires)
 *
 * Each response is its own small key: a submission is one ~1 KB write that
 * never rewrites anything shared, and the app pages through them newest
 * first, so it only ever reads what it has not cached yet.
 */

const ADMIN_SECRET_HASH = '__SV_ADMIN_SECRET_HASH__';
const WORKER_VERSION = '__SV_WORKER_VERSION__';

const P_SURVEY = 'svw:s:';
const P_COLLECTOR = 'svw:c:';
const P_RESPONSE = 'svw:r:';
const P_COUNT = 'svw:n:';
const P_CCOUNT = 'svw:nc:';

// Byte limits (KV counts UTF-8 bytes, not characters).
const MAX_BODY = 256 * 1024;
const MAX_SURVEY = 350 * 1024;
// Wrong passwords allowed per link per 10-minute window.
const MAX_PASSWORD_TRIES = 20;
const P_PWFAIL = 'svw:pf:';
const P_SUBMITTED = 'svw:x:';
const RID_RE = /^[a-z0-9]{8,32}$/i;
const ID_RE = /^[a-z0-9]{6,32}$/i;
const KEY_RE = /^[a-z0-9]{6,40}$/i;

/* ---- Utilities ------------------------------------------------------------ */

function kvOf(ctx) {
  const owner = (ctx && ctx.me) || (typeof me !== 'undefined' ? me : null);
  return owner.puter.kv;
}

/** puter.kv values may come back parsed or as JSON strings. */
function coerce(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  let out = '';
  for (const b of new Uint8Array(buf)) out += b.toString(16).padStart(2, '0');
  return out;
}

function randomChars(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += (b % 36).toString(36);
  return out;
}

/** Time-sortable response id: 9 base-36 digits of milliseconds (good until
 *  the year 5188) plus 6 random characters. */
function newResponseId(now) {
  return now.toString(36).padStart(9, '0') + randomChars(6);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Survey content and answers are personal data behind capability
      // links: nothing may be cached along the way.
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function fail(status, error, extra = {}) {
  return json({ error, ...extra }, status);
}

// What readJson returns for a body over the route's limit.
const TOO_LARGE = Object.freeze({ tooLarge: true });

/** The request's JSON object, null if it is not one, or TOO_LARGE. */
async function readJson(request, max = MAX_BODY) {
  try {
    // Refuse a body declared too large before reading it into memory; the
    // check below still covers bodies that do not declare their length.
    if (Number(request.headers.get('content-length')) > max) return TOO_LARGE;
    const text = await request.text();
    if (!text) return null;
    if (byteLength(text) > max) return TOO_LARGE;
    const body = JSON.parse(text);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

async function isAdmin(request) {
  const auth = request.headers.get('authorization') || '';
  const m = /^Bearer\\s+([a-f0-9]{32,128})$/i.exec(auth.trim());
  if (!m) return false;
  return (await sha256Hex(m[1])) === ADMIN_SECRET_HASH;
}

function admin(handler) {
  return async (ctx) => {
    if (!(await isAdmin(ctx.request))) return fail(401, 'unauthorized');
    try {
      return await handler(ctx);
    } catch (err) {
      return fail(500, 'server_error');
    }
  };
}

function guarded(handler) {
  return async (ctx) => {
    try {
      return await handler(ctx);
    } catch (err) {
      return fail(500, 'server_error');
    }
  };
}

/** Every entry under a prefix. Uses cursor paging when the runtime offers
 *  it; an older runtime that only returns arrays gets a single call. */
async function listAll(kv, prefix, values) {
  const out = [];
  let cursor;
  for (let guard = 0; guard < 1000; guard++) {
    const page = await kv.list({ pattern: \`\${prefix}*\`, returnValues: values, limit: 1000, cursor });
    if (Array.isArray(page)) return page;
    out.push(...(page.items || []));
    cursor = page.cursor;
    if (!cursor) break;
  }
  return out;
}

/* ---- Survey and collector state ----------------------------------------- */

async function loadCollector(kv, cid) {
  if (!ID_RE.test(cid || '')) return null;
  const c = coerce(await kv.get(P_COLLECTOR + cid));
  return c && c.sid ? c : null;
}

async function loadSurvey(kv, sid) {
  const rec = coerce(await kv.get(P_SURVEY + sid));
  return rec && rec.survey ? rec : null;
}

/** Why a collector cannot take responses right now, or null if it can. */
async function blockedReason(kv, collector) {
  if (collector.status !== 'open') return 'closed';
  if (collector.closeAt && Date.now() >= Number(collector.closeAt)) return 'closed';
  const max = Number(collector.maxResponses) || 0;
  if (max > 0) {
    const n = Number(coerce(await kv.get(P_CCOUNT + collector.id))) || 0;
    if (n >= max) return 'full';
  }
  return null;
}

/** Check a password with a per-link limit on wrong guesses, so a short
 *  password cannot be found by scripting the unlock route. Returns null when
 *  it matches, or the error response to send. */
async function checkPassword(kv, collector, password) {
  if (!collector.passwordHash) return null;
  const key = \`\${P_PWFAIL}\${collector.id}:\${Math.floor(Date.now() / 600000)}\`;
  // Take the attempt before checking, atomically: reading the count first
  // would let any number of guesses sent at once through.
  const n = await kv.incr(key);
  if (n === 1) await kv.expire(key, 900).catch(() => {});
  if (n > MAX_PASSWORD_TRIES) return fail(429, 'too_many_attempts');
  if (await passwordOk(collector, password)) {
    // The right password does not use up the link's allowance.
    await kv.decr(key).catch(() => {});
    return null;
  }
  return fail(403, 'wrong_password');
}

/*
 * Unlock passes. A respondent who unlocked a protected link gets a signed,
 * time-limited pass to submit with, so a run of wrong guesses by someone
 * else (which locks the link for 10 minutes) cannot stop them sending
 * their answers. Signed with a key only this worker's source holds, bound
 * to the link and its current password (changing it voids passes).
 */
const PASS_MS = 24 * 3600 * 1000;

async function passSignature(collector, exp) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(\`pass:\${ADMIN_SECRET_HASH}\`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(\`\${collector.id}|\${collector.passwordHash}|\${exp}\`));
  let out = '';
  for (const b of new Uint8Array(sig)) out += b.toString(16).padStart(2, '0');
  return out;
}

async function issuePass(collector) {
  const exp = Date.now() + PASS_MS;
  return \`\${exp}.\${await passSignature(collector, exp)}\`;
}

async function passOk(collector, pass) {
  const m = /^(\\d{13,16})\\.([0-9a-f]{64})$/.exec(typeof pass === 'string' ? pass : '');
  if (!m || Number(m[1]) < Date.now() || !collector.passwordHash) return false;
  return (await passSignature(collector, Number(m[1]))) === m[2];
}

async function passwordOk(collector, password) {
  if (!collector.passwordHash) return true;
  if (typeof password !== 'string' || !password) return false;
  return (await sha256Hex(\`\${collector.salt}:\${password}\`)) === collector.passwordHash;
}

/** The collector settings a respondent's page needs, and nothing more. */
function publicCollector(c) {
  return {
    id: c.id,
    allowMultiple: c.allowMultiple !== false,
    thankYou: c.thankYou && (c.thankYou.title || c.thankYou.message || c.thankYou.redirect) ? c.thankYou : null,
  };
}

function brief(survey) {
  return { title: survey.title, theme: survey.theme, closedMessage: survey.options && survey.options.closedMessage };
}

/* ---- Public API ------------------------------------------------------------ */

async function openCollector(ctx) {
  const kv = kvOf(ctx);
  const collector = await loadCollector(kv, ctx.params.cid);
  if (!collector) return { error: fail(404, 'not_found') };
  const rec = await loadSurvey(kv, collector.sid);
  if (!rec) return { error: fail(404, 'not_found') };
  const reason = await blockedReason(kv, collector);
  // The link with it: a resend of a response stored before the link
  // filled up or closed is still acknowledged (see the responses route).
  if (reason) return { error: fail(410, reason, brief(rec.survey)), kv, collector };
  return { kv, collector, survey: rec.survey };
}

/** The response a submission id (rid) was stored under, if it was. */
async function storedFor(kv, collector, claim) {
  const prior = coerce(await kv.get(claim));
  const id = prior && typeof prior.id === 'string' && KEY_RE.test(prior.id) ? prior.id : null;
  const rec = id ? coerce(await kv.get(\`\${P_RESPONSE}\${collector.sid}:\${id}\`)) : null;
  return { id, rec };
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.get('/api/c/:cid', guarded(async (ctx) => {
  const r = await openCollector(ctx);
  if (r.error) return r.error;
  if (r.collector.passwordHash) return json({ locked: true, ...brief(r.survey) });
  return json({ survey: r.survey, collector: publicCollector(r.collector) });
}));

router.post('/api/c/:cid/unlock', guarded(async (ctx) => {
  const r = await openCollector(ctx);
  if (r.error) return r.error;
  const body = (await readJson(ctx.request)) || {};
  const denied = await checkPassword(r.kv, r.collector, body.password);
  if (denied) return denied;
  return json({ survey: r.survey, collector: publicCollector(r.collector), pass: await issuePass(r.collector) });
}));

router.post('/api/c/:cid/responses', guarded(async (ctx) => {
  const r = await openCollector(ctx);
  if (r.error && !r.collector) return r.error;
  const body = await readJson(ctx.request);
  if (r.error) {
    // Full or closed since: a resend of a response already stored (its
    // reply lost) is acknowledged rather than refused.
    const rid = body && body !== TOO_LARGE ? body.rid : '';
    if (RID_RE.test(rid || '')) {
      const { id, rec } = await storedFor(r.kv, r.collector, \`\${P_SUBMITTED}\${r.collector.id}:\${rid}\`);
      if (rec) return json({ ok: true, id, outcome: rec.outcome === 'disqualified' ? 'disqualified' : 'complete' });
    }
    return r.error;
  }
  if (body === TOO_LARGE) return fail(413, 'too_large');
  if (!body) return fail(400, 'bad_request');
  // Honeypot: a field people never see, which form-filling bots do fill.
  if (body.hp) return json({ ok: true, id: null });
  // A pass from unlocking stands in for the password, past any lockout.
  if (!(await passOk(r.collector, body.pass))) {
    const denied = await checkPassword(r.kv, r.collector, body.password);
    if (denied) return denied;
  }

  const check = validateResponse(r.survey, body.answers);
  if (!check.ok) return fail(422, 'invalid', { errors: check.errors });

  const { kv, collector } = r;
  const outcome = check.outcome === 'disqualify' ? 'disqualified' : 'complete';
  // The page sends one id per visit and the response id chosen for it is
  // kept, so a resend (after a timeout, or a reply lost on the way back) is
  // acknowledged if that response was stored, and otherwise stores it under
  // the same id: never twice, and never lost to an attempt that failed.
  const claim = RID_RE.test(body.rid || '') ? \`\${P_SUBMITTED}\${collector.id}:\${body.rid}\` : '';
  const now = Date.now();
  let id = null;
  if (claim) {
    let { id: known, rec } = await storedFor(kv, collector, claim);
    // Copies sent at the same moment (Submit pressed again while the first
    // is still on its way): only the first to count itself here picks the
    // response id; the others wait for it, then answer as a resend.
    if (!known) {
      const lock = \`\${claim}:n\`;
      const first = (await kv.incr(lock)) === 1;
      await kv.expire(lock, 86400).catch(() => {});
      for (let i = 0; !first && !rec && i < 20; i++) {
        await pause(250);
        ({ id: known, rec } = await storedFor(kv, collector, claim));
      }
    }
    if (rec) return json({ ok: true, id: known, outcome });
    if (known) id = known;
    else {
      id = newResponseId(now);
      await kv.set(claim, { id });
      await kv.expire(claim, 86400).catch(() => {});
    }
  }
  id ||= newResponseId(now);
  const max = Number(collector.maxResponses) || 0;
  // With a limit, reserve a slot before writing so two respondents racing
  // for the last place cannot both get in, and give it back if this one is
  // over. Without one, the response is stored first and the counter (a
  // single hot key under a burst) is best effort.
  if (max > 0) {
    const n = await kv.incr(P_CCOUNT + collector.id);
    if (n > max) {
      await kv.decr(P_CCOUNT + collector.id);
      return fail(410, 'full', brief(r.survey));
    }
  }

  const started = Number(body.startedAt);
  const startedAt = Number.isFinite(started) && started <= now && now - started < 30 * 86400000 ? started : now;
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
  const record = {
    id,
    cid: collector.id,
    at: now,
    st: startedAt,
    outcome,
    answers: check.answers,
    meta: {
      device: ['desktop', 'tablet', 'mobile'].includes(meta.device) ? meta.device : 'unknown',
      lang: typeof meta.lang === 'string' ? meta.lang.slice(0, 20) : '',
    },
  };
  try {
    await kv.set(\`\${P_RESPONSE}\${collector.sid}:\${id}\`, record);
  } catch (err) {
    if (max > 0) await kv.decr(P_CCOUNT + collector.id).catch(() => {});
    if (/too.?large|value_too_large/i.test(String(err && (err.code || err.message)))) return fail(413, 'too_large');
    throw err;
  }
  if (!max) await kv.incr(P_CCOUNT + collector.id).catch(() => {});
  await kv.incr(P_COUNT + collector.sid).catch(() => {});
  return json({ ok: true, id, outcome });
}));

/* ---- Admin API ----------------------------------------------------------- */

router.get('/admin/ping', admin(async () => {
  const runtime = typeof __PUTER_PREAMBLE_VERSION__ === 'string' ? __PUTER_PREAMBLE_VERSION__ : null;
  return json({ ok: true, version: WORKER_VERSION, runtime });
}));

router.post('/admin/publish', admin(async (ctx) => {
  // The survey limit applies to the stored record, checked below; the body
  // gets room for the JSON around it.
  const body = await readJson(ctx.request, MAX_SURVEY + 64 * 1024);
  if (body === TOO_LARGE) return fail(413, 'too_large');
  const survey = body && body.survey;
  if (!survey || !ID_RE.test(survey.id || '') || !Array.isArray(survey.pages)) return fail(400, 'bad_request');
  const record = { survey, publishedAt: Date.now() };
  if (byteLength(JSON.stringify(record)) > MAX_SURVEY) return fail(413, 'too_large');
  await kvOf(ctx).set(P_SURVEY + survey.id, record);
  return json({ ok: true, publishedAt: record.publishedAt });
}));

router.post('/admin/collector', admin(async (ctx) => {
  const body = await readJson(ctx.request);
  const c = body && body.collector;
  if (!c || !ID_RE.test(c.id || '') || !ID_RE.test(c.sid || '')) return fail(400, 'bad_request');
  const kv = kvOf(ctx);
  const prev = coerce(await kv.get(P_COLLECTOR + c.id)) || {};
  const next = {
    id: c.id,
    sid: c.sid,
    status: c.status === 'open' ? 'open' : 'closed',
    closeAt: Number(c.closeAt) > 0 ? Number(c.closeAt) : null,
    maxResponses: Number(c.maxResponses) > 0 ? Math.floor(Number(c.maxResponses)) : 0,
    allowMultiple: c.allowMultiple !== false,
    thankYou: c.thankYou && typeof c.thankYou === 'object'
      ? {
          title: String(c.thankYou.title || '').slice(0, 300),
          message: String(c.thankYou.message || '').slice(0, 3000),
          redirect: /^https?:\\/\\//i.test(c.thankYou.redirect || '') ? String(c.thankYou.redirect).slice(0, 2000) : '',
        }
      : null,
    passwordHash: prev.passwordHash || '',
    salt: prev.salt || '',
  };
  // \`password\` absent keeps the current one; '' removes it.
  if (typeof c.password === 'string') {
    if (c.password) {
      next.salt = randomChars(16);
      next.passwordHash = await sha256Hex(\`\${next.salt}:\${c.password}\`);
    } else {
      next.salt = '';
      next.passwordHash = '';
    }
  }
  await kv.set(P_COLLECTOR + c.id, next);
  return json({ ok: true });
}));

router.post('/admin/collector/delete', admin(async (ctx) => {
  const body = await readJson(ctx.request);
  if (!body || !ID_RE.test(body.id || '')) return fail(400, 'bad_request');
  await kvOf(ctx).del(P_COLLECTOR + body.id);
  await kvOf(ctx).del(P_CCOUNT + body.id);
  return json({ ok: true });
}));

router.post('/admin/survey/delete', admin(async (ctx) => {
  const body = await readJson(ctx.request);
  if (!body || !ID_RE.test(body.sid || '')) return fail(400, 'bad_request');
  const kv = kvOf(ctx);
  const keys = await listAll(kv, \`\${P_RESPONSE}\${body.sid}:\`, false);
  // In batches: one by one, a survey with thousands of responses outlasts
  // the app's request timeout.
  for (let i = 0; i < keys.length; i += 25) {
    await Promise.all(keys.slice(i, i + 25).map((key) => kv.del(typeof key === 'string' ? key : key.key)));
  }
  for (const cid of Array.isArray(body.collectors) ? body.collectors : []) {
    if (!ID_RE.test(cid)) continue;
    await kv.del(P_COLLECTOR + cid);
    await kv.del(P_CCOUNT + cid);
  }
  await kv.del(P_SURVEY + body.sid);
  await kv.del(P_COUNT + body.sid);
  return json({ ok: true, deleted: keys.length });
}));

router.get('/admin/responses', admin(async (ctx) => {
  const url = new URL(ctx.request.url);
  const sid = url.searchParams.get('sid') || '';
  if (!ID_RE.test(sid)) return fail(400, 'bad_request');
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit')) || 500));
  const cursor = url.searchParams.get('cursor') || undefined;
  const prefix = \`\${P_RESPONSE}\${sid}:\`;
  const page = await kvOf(ctx).list({ pattern: \`\${prefix}*\`, returnValues: true, reverse: true, limit, cursor });
  const items = (Array.isArray(page) ? page.slice().reverse() : page.items || []).map((e) => ({
    key: e.key.slice(prefix.length),
    value: coerce(e.value),
  }));
  return json({ items, cursor: Array.isArray(page) ? null : page.cursor || null });
}));

router.post('/admin/responses/delete', admin(async (ctx) => {
  const body = await readJson(ctx.request);
  if (!body || !ID_RE.test(body.sid || '') || !Array.isArray(body.keys)) return fail(400, 'bad_request');
  const kv = kvOf(ctx);
  let deleted = 0;
  for (const key of body.keys.slice(0, 1000)) {
    if (!KEY_RE.test(key)) continue;
    const full = \`\${P_RESPONSE}\${body.sid}:\${key}\`;
    const rec = coerce(await kv.get(full));
    if (!rec) continue;
    await kv.del(full);
    deleted++;
    // A deleted link's counter is gone; decrementing would recreate it at -1.
    if (rec.cid && ID_RE.test(rec.cid) && (await kv.get(P_COLLECTOR + rec.cid))) await kv.decr(P_CCOUNT + rec.cid).catch(() => {});
  }
  if (deleted) await kv.decr(P_COUNT + body.sid, deleted).catch(() => {});
  return json({ ok: true, deleted });
}));

router.get('/admin/stats', admin(async (ctx) => {
  const kv = kvOf(ctx);
  // One survey's count (the results screen polls it every minute): one
  // read, not a listing of every survey's and link's counter.
  const sid = new URL(ctx.request.url).searchParams.get('sid');
  if (sid && ID_RE.test(sid)) return json({ surveys: { [sid]: Number(coerce(await kv.get(P_COUNT + sid))) || 0 }, collectors: {} });
  const surveys = {};
  const collectors = {};
  for (const e of await listAll(kv, P_COUNT, true)) surveys[e.key.slice(P_COUNT.length)] = Number(coerce(e.value)) || 0;
  for (const e of await listAll(kv, P_CCOUNT, true)) collectors[e.key.slice(P_CCOUNT.length)] = Number(coerce(e.value)) || 0;
  return json({ surveys, collectors });
}));

/* ---- Fallbacks: JSON for anything else ----------------------------------- */

router.get('/*path', async () => fail(404, 'not_found'));
router.post('/*path', async () => fail(404, 'not_found'));
`}={}){return`${e(n)}\n\n${r}`.replace(`__SV_ADMIN_SECRET_HASH__`,t).replace(`__SV_WORKER_VERSION__`,`5`)}export{t as buildWorkerSource};