const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./sample-CrS5QAb4.js","./flatten-DqhnUhsA.js","./consent-ICbetw1c.js","./util-1py876-u.js","./consent-D9vVxkjZ.css"])))=>i.map(i=>d[i]);
import{t as e}from"./flatten-DqhnUhsA.js";import{$ as t,A as n,B as r,C as i,D as a,E as o,F as s,G as c,H as l,I as u,J as d,K as f,L as p,M as m,N as h,O as g,P as _,Q as v,R as y,S as b,T as x,U as S,V as C,W as w,X as T,Y as E,Z as D,_ as O,a as k,at as A,b as j,c as ee,d as M,dt as N,et as P,ft as F,g as I,h as te,ht as L,i as ne,it as re,j as ie,k as ae,l as oe,lt as se,m as R,mt as z,n as ce,nt as le,o as B,ot as V,p as ue,pt as H,r as de,rt as fe,s as pe,st as me,t as he,tt as U,u as ge,ut as _e,v as W,w as ve,x as G,y as K,z as ye}from"./consent-ICbetw1c.js";import{_ as q,a as be,c as xe,d as Se,f as J,g as Ce,h as we,i as Te,l as Ee,m as De,n as Oe,o as ke,p as Ae,r as je,s as Y,t as Me,u as Ne,v as Pe}from"./util-1py876-u.js";var X={settings:`sig:settings:v1`,docPrefix:`sig:doc:`,tplPrefix:`sig:tpl:`,workerCfg:`sig:worker:cfg:v1`,signature:`sig:signature:v1`},Fe=`signatures-data`,Ie=e=>`${Fe}/${e}/original.pdf`,Le=e=>`${Fe}/${e}/signed.pdf`,Re=e=>`${Fe}/${e}/sigdata.json`,ze=e=>`${Fe}/templates/${e}`,Be=e=>`${ze(e)}/original.pdf`,Ve={theme:`system`,fullName:``,onboarded:!1,sampleData:!1,notifySign:!1,notifyDecline:!0,notifyComplete:!0,defaultExpiryDays:0,defaultReminderDays:0},He=200;function Ue(e){let t=e?.code??e?.error?.code;if(typeof t==`string`&&/does_not_exist|not_found/.test(t))return!0;let n=String(e?.message??e?.error?.message??``);return/no such file|not found|does not exist/i.test(n)}function We({getPuter:e=()=>typeof puter<`u`?puter:null}={}){let t=new EventTarget,n=new Map,r=new Map,i={...Ve},a=null,o=null,s=!1,c=()=>{let t=e();if(!t)throw Error(`Puter SDK is unavailable`);return t};function l(){t.dispatchEvent(new Event(`change`))}async function u(){try{a=await c().auth.getUser()}catch{a=null}let[e,t,o]=await Promise.all([c().kv.get(X.settings),c().kv.list(`${X.docPrefix}*`,!0),c().kv.list(`${X.tplPrefix}*`,!0).catch(()=>[])]);i={...Ve,...Oe(e)||{}},n.clear();for(let e of t||[]){if(!e||typeof e.key!=`string`)continue;let t=Oe(e.value);!t||typeof t!=`object`||!t.id||n.set(t.id,t)}r.clear();for(let e of o||[]){if(!e||typeof e.key!=`string`)continue;let t=Oe(e.value);!t||typeof t!=`object`||!t.id||r.set(t.id,t)}}async function d(e){return i={...i,...e},await c().kv.set(X.settings,i),l(),i}function f(e){return n.get(e)||null}function m(){return[...n.values()].sort((e,t)=>(t.updatedAt||0)-(e.updatedAt||0))}let h=e=>je(e,[...n.values()].map(e=>e.title));function g(e,t,n=``){e.audit=e.audit||[],e.audit.push({at:Date.now(),type:t,detail:n}),e.audit.length>He&&(e.audit=e.audit.slice(-200))}async function _(e){return e.updatedAt=Date.now(),await c().kv.set(X.docPrefix+e.id,e),n.set(e.id,e),l(),e}async function v({title:e,fileName:t,pdfBytes:n,pageCount:r,note:i=``,signers:a=null,fields:o=null,origin:s=null,signOrder:l=!1}){let u=Pe(),d=n instanceof Blob?n:new Blob([n],{type:`application/pdf`}),f=await c().fs.write(Ie(u),d,{createMissingParents:!0}),p={id:u,title:String(e||t||`Untitled document`).trim()||`Untitled document`,fileName:t||`document.pdf`,pageCount:r||1,note:i,status:`draft`,signers:a||[],fields:o||[],signOrder:l===!0,links:{},emailed:{},audit:[],pdfAbsPath:f&&f.path||null,sample:!1,createdAt:Date.now(),updatedAt:Date.now(),sentAt:null,completedAt:null};return g(p,`created`,p.fileName),s&&s.type&&g(p,s.type,s.detail||``),_(p)}async function y(e,{title:t=null}={}){let r=n.get(e);if(!r)throw Error(`Document not found`);let i=await w(e),{signers:a,fields:o}=C(r);return v({title:t||h(r.title),fileName:r.fileName,pdfBytes:i,pageCount:r.pageCount,note:r.note||``,signers:a,fields:o,signOrder:r.signOrder===!0,origin:{type:`duplicated`,detail:r.title}})}async function b(e,t,r,{fields:i=null,audit:a=null}={}){let o=n.get(e);if(!o)throw Error(`Document not found`);if(o.status!==`draft`)throw Error(`Only a draft can be rebuilt`);let s=await c().fs.write(Ie(e),new Blob([t],{type:`application/pdf`}),{createMissingParents:!0});return o.pdfAbsPath=s&&s.path||o.pdfAbsPath,o.pageCount=r,o.fingerprint=null,i&&(o.fields=i),a&&g(o,a.type,a.detail||``),_(o)}async function x(e,t){let r=n.get(e);if(!r)throw Error(`Document not found`);return Object.assign(r,t),_(r)}async function S(e){await c().kv.del(X.docPrefix+e),n.delete(e);try{await c().fs.delete(`${Fe}/${e}`,{recursive:!0})}catch{}l()}async function w(e){let t=await c().fs.read(Ie(e));return new Uint8Array(await t.arrayBuffer())}async function T(e){try{let t=await c().fs.read(Re(e));return Oe(await t.text())||{}}catch(e){if(Ue(e))return{};throw e}}async function E(e,t){let n={...await T(e),...t};return await c().fs.write(Re(e),JSON.stringify(n),{createMissingParents:!0}),n}async function D(e,t){await c().fs.write(Le(e),new Blob([t],{type:`application/pdf`}),{createMissingParents:!0})}async function O(e){try{let t=await c().fs.read(Le(e));return new Uint8Array(await t.arrayBuffer())}catch(e){if(Ue(e))return null;throw e}}function k(e){return r.get(e)||null}function A(){return[...r.values()].sort((e,t)=>(t.updatedAt||0)-(e.updatedAt||0))}async function j(e){return e.updatedAt=Date.now(),await c().kv.set(X.tplPrefix+e.id,e),r.set(e.id,e),l(),e}async function ee(e,{name:t}={}){let n=await w(e.id),r=Pe(),i=await c().fs.write(Be(r),new Blob([n],{type:`application/pdf`}),{createMissingParents:!0}),{roles:a,fields:o}=me(e);return j({id:r,name:String(t||e.title||`Untitled template`).trim().slice(0,120)||`Untitled template`,fileName:e.fileName||`document.pdf`,pageCount:e.pageCount||1,note:e.note||``,roles:a,fields:o,signOrder:e.signOrder===!0,pdfAbsPath:i&&i.path||null,useCount:0,lastUsedAt:null,createdAt:Date.now(),updatedAt:Date.now()})}async function M(e,t){let n=r.get(e);if(!n)throw Error(`Template not found`);return Object.assign(n,t),j(n)}async function N(e){await c().kv.del(X.tplPrefix+e),r.delete(e);try{await c().fs.delete(ze(e),{recursive:!0})}catch{}l()}async function P(e){let t=await c().fs.read(Be(e));return new Uint8Array(await t.arrayBuffer())}async function F(e,{title:t=null,roleValues:n={}}={}){let i=r.get(e);if(!i)throw Error(`Template not found`);let a=await P(e),{signers:o,fields:s}=V(i,n),c=await v({title:t||i.name,fileName:i.fileName,pdfBytes:a,pageCount:i.pageCount,note:i.note||``,signers:o,fields:s,signOrder:i.signOrder===!0,origin:{type:`from_template`,detail:i.name}});return await M(e,{useCount:(i.useCount||0)+1,lastUsedAt:Date.now()}).catch(()=>{}),c}async function I(e,t,{expiresAt:r=null,reminder:i=null,channel:a=null}={}){let o=n.get(e);if(!o)throw Error(`Document not found`);o.status=`sent`,o.sentAt=Date.now(),o.links=t||{},r!==null&&(o.expiresAt=r||null),i&&(o.reminder={...i,lastAt:0,preExpiryAt:0}),(a===`email`||a===`link`)&&(o.channel=a);for(let e of o.signers)e.status||=`pending`;return g(o,`sent`,`${o.signers.length} signer${o.signers.length===1?``:`s`}`),_(o)}async function te(e,t,{version:r,tzOffset:i,tzName:a}={}){let o=n.get(e);if(!o)throw Error(`Document not found`);let s=o.signers.find(e=>e.id===t);if(!s)throw Error(`Signer not found`);if(s.consentAt)return o;let c=Date.now();return s.consentAt=c,s.consentVersion=r||``,s.evidence={...s.evidence||{},consent:{at:c,ip:``,ua:typeof navigator<`u`?navigator.userAgent:``,tzOffset:i,tzName:a}},g(o,`consented`,s.name||s.email),_(o)}async function L(e){let t=n.get(e);if(!t)throw Error(`Document not found`);if(t.fingerprint&&t.fingerprint.hex)return t.fingerprint;let r={alg:`SHA-256`,hex:await q(await w(e)),at:Date.now()};return await x(e,{fingerprint:r}),r}async function ne(e){let t=n.get(e);return!t||t.status!==`sent`?null:(t.status=`expired`,g(t,`expired`,Y(t.expiresAt)),_(t))}async function re(e,t){let r=n.get(e);if(!r)throw Error(`Document not found`);let i=(t||null)!==(r.expiresAt||null);return r.expiresAt=t||null,i&&r.reminder&&r.reminder.preExpiryAt&&(r.reminder={...r.reminder,preExpiryAt:0}),t?g(r,`extended`,Y(t)):g(r,`expiry_cleared`),r.status=p(r),_(r)}async function ie(e,{preExpiry:t=!1}={}){let r=n.get(e);if(!r)return null;let i=Date.now();return r.reminder={...r.reminder||{},lastAt:i,preExpiryAt:t?i:(r.reminder||{}).preExpiryAt||0},_(r)}async function ae(e,t=``){let r=n.get(e);if(!r)throw Error(`Document not found`);return r.status=`voided`,g(r,`voided`,t),_(r)}async function oe(e,t,r){let i=n.get(e);if(!i)throw Error(`Document not found`);let a=i.signers.find(e=>e.id===t);if(!a)throw Error(`Signer not found`);return r&&Object.keys(r).length&&await E(e,r),a.status=`signed`,a.signedAt=Date.now(),a.evidence={...a.evidence||{},sign:{at:a.signedAt,ip:``,ua:typeof navigator<`u`?navigator.userAgent:``,tzOffset:-new Date().getTimezoneOffset(),tzName:(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||``}catch{return``}})()}},g(i,`signed`,a.name||a.email||`Signer`),R(i)}async function se(e,t){let r=n.get(e);if(!r||!Array.isArray(t)||!t.length)return{changed:!1,completedNow:!1,declinedNow:!1};let i=structuredClone(r),a={pending:0,viewed:1,signed:2,declined:2},o=!1,s={};for(let e of t){let t=i.signers.find(t=>t.id===e.signerId);if(!t)continue;let n=a[t.status||`pending`]??0,r=a[e.status]??0;if(e.viewedAt&&!t.viewedAt&&(t.viewedAt=e.viewedAt,o=!0),e.consentAt&&!t.consentAt&&(t.consentAt=e.consentAt,t.consentVersion=e.consentVersion||``,g(i,`consented`,t.name||t.email),o=!0),e.code&&typeof e.code==`object`){let n=t.codeSeen||{};e.code.lastFailAt&&e.code.lastFailAt!==n.lastFailAt&&(g(i,e.code.lockedUntil>Date.now()?`code_locked`:`code_failed`,t.name||t.email),o=!0),e.code.unlockedAt&&!n.unlockedAt&&(g(i,`code_unlocked`,t.name||t.email),o=!0),(e.code.lastFailAt!==n.lastFailAt||e.code.unlockedAt!==n.unlockedAt||e.code.fails!==n.fails)&&(t.codeSeen={fails:e.code.fails||0,lastFailAt:e.code.lastFailAt||0,unlockedAt:e.code.unlockedAt||0,lockedUntil:e.code.lockedUntil||0},o=!0)}if(e.evidence&&typeof e.evidence==`object`){let n={...t.evidence||{}};for(let[t,r]of Object.entries(e.evidence))r&&!n[t]&&(n[t]=r);JSON.stringify(n)!==JSON.stringify(t.evidence||{})&&(t.evidence=n,o=!0)}r>n&&(t.status=e.status,e.status===`viewed`&&g(i,`viewed`,t.name||t.email),e.status===`signed`&&(t.signedAt=e.signedAt||Date.now(),g(i,`signed`,t.name||t.email)),e.status===`declined`&&(t.declinedAt=e.declinedAt||Date.now(),t.declineReason=String(e.declineReason||``).slice(0,500),g(i,`declined`,t.name||t.email)),o=!0),e.values&&typeof e.values==`object`&&Object.assign(s,e.values)}return!o&&!Object.keys(s).length?{changed:!1,completedNow:!1,declinedNow:!1}:(Object.keys(s).length&&await E(e,s),R(i))}async function R(e){let t=e.status,n=p(e),r=n===`completed`&&t!==`completed`,i=n===`declined`&&t!==`declined`;return e.status=n,r&&(e.completedAt=Date.now(),g(e,`completed`)),await _(e),{changed:!0,completedNow:r,declinedNow:i,doc:e}}async function z(){return s||=(o=Oe(await c().kv.get(X.signature)),!0),o}async function ce(e){o=e,s=!0,e?await c().kv.set(X.signature,e):await c().kv.del(X.signature)}async function le(e){for(let t of e){let e=await c().fs.write(Ie(t.doc.id),new Blob([t.pdfBytes],{type:`application/pdf`}),{createMissingParents:!0});t.doc.pdfAbsPath=e&&e.path||null,t.sigData&&Object.keys(t.sigData).length&&await c().fs.write(Re(t.doc.id),JSON.stringify(t.sigData),{createMissingParents:!0}),await c().kv.set(X.docPrefix+t.doc.id,t.doc),n.set(t.doc.id,t.doc)}await d({sampleData:!0,onboarded:!0})}async function B(){for(let e of[...n.values()])e.sample&&await S(e.id);await d({sampleData:!1})}return{init:u,addEventListener:(...e)=>t.addEventListener(...e),removeEventListener:(...e)=>t.removeEventListener(...e),get settings(){return i},get user(){return a},updateSettings:d,createDoc:v,duplicateDoc:y,replacePdf:b,getDoc:f,listDocs:m,patchDoc:x,persistDoc:_,deleteDoc:S,addAudit:g,getTemplate:k,listTemplates:A,saveTemplateFromDoc:ee,patchTemplate:M,deleteTemplate:N,readTemplatePdf:P,createDocFromTemplate:F,readPdf:w,readSigData:T,mergeSigData:E,writeSignedPdf:D,readSignedPdf:O,markSent:I,markExpired:ne,setExpiry:re,markReminded:ie,recordConsent:te,recordFingerprint:L,voidDoc:ae,markSignerSigned:oe,applyResponses:se,getSavedSignature:z,setSavedSignature:ce,importDataset:le,wipeSampleData:B}}var Z=We(),Ge=`/**
 * Signing endpoint, a Puter serverless worker deployed into the document
 * owner's own account (see src/lib/signlinks.js for the deploy/sync side).
 *
 * Signers hold capability URLs: /sign/<token>, one unguessable 160-bit token
 * per signer per document. Only a SHA-256 hash of each token is stored, so a
 * leak of this worker's KV reveals no usable links; the raw token exists only
 * in the link itself (and in the owner's document record in the app).
 *
 * This worker serves NO HTML. It is a JSON API plus a redirect (Puter
 * guidance: workers as API-like endpoints). The human-facing signing page is
 * the app's own sign.html at PAGE_URL, which calls this API from the signer's
 * browser. The worker origin and token travel in the URL FRAGMENT, which
 * browsers never send over the wire, keeping tokens out of logs and referrers.
 *
 * With sequential signing on, every signer route is gated on the signers
 * ahead of this one having signed: the worker answers \`not_yet\` and serves
 * neither the document nor its file, so the order holds even against a
 * hand-rolled request.
 *
 * A signer may also need an ACCESS CODE, the second factor for a link that
 * leaked (a forwarded mail, a shared inbox, a mistyped address). Only a
 * salted hash is stored, attempts are rate-limited and lock out, and a
 * correct code buys a short-lived session for that one token so the signer is
 * not asked again mid-signing.
 *
 *   JSON API (the only data surface):
 *     GET  /api/sign/<token>       -> document view: fields, values, statuses
 *                                     (marks the signer as having viewed)
 *     GET  /api/sign/<token>/pdf   -> the original PDF bytes
 *     POST /api/sign/<token>       -> { action: 'unlock' | 'consent' | 'sign'
 *                                     | 'decline' }. With an access code set,
 *                                     'unlock' comes first and returns the
 *                                     session every other call carries in
 *                                     x-sign-session. Consent comes before a
 *                                     signature: one without a recorded
 *                                     agreement is refused.
 *
 *   Human link:
 *     GET  /sign/<token>           -> 303 to PAGE_URL#w=<origin>&t=<token>
 *
 * The app manages this worker over /admin/* routes, authenticated with
 * \`Authorization: Bearer <secret>\`. Only SHA-256(secret) is baked into this
 * source, so the deployed file itself contains no credential.
 *
 * The owner also gets told. This worker runs inside their own Puter account
 * and is the only piece that is awake when the app is closed, so when a
 * signer signs, declines, or a document completes it mails the owner from
 * their own account (see notifyOwner). Every attempt is recorded, success or
 * failure, so the app can fall back to sending it from the app instead.
 *
 * KV layout (this worker's own namespace):
 *   sigw:tok:<sha256(token)>       -> { docId, signerId }
 *   sigw:notif:<docId>:<kind>:<signerId>  -> { at, ok, error } one owner
 *                                            notification, attempted once
 *   sigw:sess:<sha256(session)>    -> { docId, signerId, exp } an unlocked
 *                                     signer's short-lived session
 *   sigw:doc:<docId>               -> { doc, signers: { [id]: { name, email,
 *                                       kind, signed, tokenHash } }, fields,
 *                                       values, voided, expiresAt, signOrder,
 *                                       order, channel, notify, updatedAt }
 *   sigw:resp:<docId>:<signerId>   -> { status, viewedAt, signedAt,
 *                                       declinedAt, declineReason, values,
 *                                       acked, consentAt, consentVersion,
 *                                       view/consent/sign: { at, ip, ua,
 *                                       tzOffset, tzName } }
 *
 * Responses live in per-signer keys ON PURPOSE: a signer's POST writes only
 * their own key, so it can never race an /admin/sync (which rewrites the
 * membership record) or another signer's answer.
 */

/* Placeholders replaced at deploy time by signlinks.js. */
const ADMIN_SECRET_HASH = '__SIGN_ADMIN_SECRET_HASH__';
const WORKER_VERSION = '__SIGN_WORKER_VERSION__';
const PAGE_URL = '__SIGN_PAGE_URL__'; // the app-hosted signing page (sign.html)

const TOK_PREFIX = 'sigw:tok:';
const DOC_PREFIX = 'sigw:doc:';
const RESP_PREFIX = 'sigw:resp:';
const NOTIF_PREFIX = 'sigw:notif:';
const SESS_PREFIX = 'sigw:sess:';

/* Access codes: a link that leaked is worth one guess in five, then a wait. */
const MAX_CODE_FAILS = 5;
const CODE_LOCK_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const MAX_SIGNERS = 20;
const MAX_FIELDS = 200;
const MAX_TEXT = 2000;
const MAX_REASON = 500;
const MAX_IMAGE_CHARS = 300_000; // one signature PNG as a data URL
const MAX_VALUES_CHARS = 900_000; // everything one signer submits

/* ---- Small utilities ----------------------------------------------------- */

function ownerOf(ctx) {
  return (ctx && ctx.me) || (typeof me !== 'undefined' ? me : null);
}

function kvOf(ctx) {
  return ownerOf(ctx).puter.kv;
}

/** puter.kv values may come back as parsed objects or JSON strings. */
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

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  let out = '';
  for (const b of new Uint8Array(buf)) out += b.toString(16).padStart(2, '0');
  return out;
}

/** 20 crypto-random bytes as 40 hex chars (160 bits, unguessable). */
function newToken() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function str(v, cap) {
  return typeof v === 'string' ? v.slice(0, cap) : '';
}

/**
 * The signer's IP as the edge saw it. Every one of these headers is set by
 * the proxy in front of this worker, not by the client, and the first entry
 * of a forwarded chain is the original caller.
 */
function clientIp(ctx) {
  const headers = ctx.request.headers;
  for (const name of ['cf-connecting-ip', 'true-client-ip', 'x-real-ip', 'x-forwarded-for']) {
    const value = headers.get(name);
    if (typeof value === 'string' && value.trim()) return value.split(',')[0].trim().slice(0, 60);
  }
  return '';
}

/**
 * The technical context of one act: when it happened by this worker's clock,
 * where from, on what, and (when the page tells us) the signer's own clock.
 * This is the evidence the certificate prints.
 */
function evidence(ctx, body) {
  const src = body && typeof body === 'object' ? body : {};
  const offset = Number(src.tzOffset);
  return {
    at: Date.now(),
    ip: clientIp(ctx),
    ua: str(ctx.request.headers.get('user-agent') || '', 300),
    // Minutes east of UTC. Anything outside the real range is not a clock.
    tzOffset: Number.isFinite(offset) && Math.abs(offset) <= 840 ? Math.round(offset) : undefined,
    tzName: str(src.tzName, 60),
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Payloads carry personal data and are keyed by capability URLs;
      // nothing here may be cached by proxies or the browser.
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function requireAdmin(ctx) {
  const header = ctx.request.headers.get('authorization') || '';
  const match = /^Bearer\\s+(.+)$/i.exec(header);
  if (!match) return false;
  return (await sha256Hex(match[1].trim())) === ADMIN_SECRET_HASH;
}

async function readJson(ctx) {
  try {
    return await ctx.request.json();
  } catch {
    return null;
  }
}

/* ---- Records --------------------------------------------------------------- */

function respKey(docId, signerId) {
  return \`\${RESP_PREFIX}\${docId}:\${signerId}\`;
}

async function loadByToken(ctx, token) {
  if (typeof token !== 'string' || !/^[0-9a-f]{40}$/.test(token)) return null;
  const kv = kvOf(ctx);
  const ref = coerce(await kv.get(TOK_PREFIX + (await sha256Hex(token))));
  if (!ref || !ref.docId || !ref.signerId) return null;
  const record = coerce(await kv.get(DOC_PREFIX + ref.docId));
  if (!record || !record.signers || !record.signers[ref.signerId]) return null;
  return { kv, docId: ref.docId, signerId: ref.signerId, record };
}

async function loadResponses(kv, docId, signerIds) {
  const out = {};
  for (const signerId of signerIds) {
    const resp = coerce(await kv.get(respKey(docId, signerId)));
    if (resp) out[signerId] = resp;
  }
  return out;
}

/**
 * One signer's status. Self signers (the owner signing in the app) carry
 * theirs in the snapshot; external signers carry theirs in their own
 * response record.
 */
function statusOf(record, resps, signerId) {
  const signer = record.signers[signerId];
  if (!signer) return 'pending';
  if (signer.kind === 'self') return signer.signed ? 'signed' : 'pending';
  return (resps[signerId] && resps[signerId].status) || 'pending';
}

/**
 * The document's overall state as this worker can see it.
 */
function docState(record, resps) {
  if (record.voided) return 'voided';
  let allSigned = true;
  for (const signerId of Object.keys(record.signers)) {
    const status = statusOf(record, resps, signerId);
    if (status === 'declined') return 'declined';
    if (status !== 'signed') allSigned = false;
  }
  // Everyone signing beats the clock: a document finished before its deadline
  // is completed, not expired.
  if (allSigned) return 'completed';
  if (record.expiresAt && record.expiresAt <= Date.now()) return 'expired';
  return 'open';
}

/**
 * Sequential signing: is it this signer's turn? Only once every signer ahead
 * of them in \`order\` has signed. Without the toggle, or for a signer the
 * order does not mention, the answer is always yes.
 */
function turnState(record, resps, signerId) {
  if (!record.signOrder) return { ok: true };
  const order = Array.isArray(record.order) && record.order.length
    ? record.order
    : Object.keys(record.signers);
  const index = order.indexOf(signerId);
  if (index <= 0) return { ok: true };
  for (const earlier of order.slice(0, index)) {
    if (!record.signers[earlier]) continue;
    if (statusOf(record, resps, earlier) !== 'signed') {
      return {
        ok: false,
        waitingFor: record.signers[earlier].name || '',
        position: index + 1,
        total: order.length,
      };
    }
  }
  return { ok: true };
}

/**
 * The 410 a signer gets when there is nothing left to do here: the sender
 * withdrew the document, or its deadline passed. Enforced in the worker so it
 * holds whether or not the app is open.
 *
 * Decided from the document's STATE, not from the clock alone: docState puts
 * everyone-signed ahead of the deadline, and so does the app. Reading the
 * clock by itself here shut a completed document the moment its deadline went
 * by - a signer coming back for the completed copy the page had just offered
 * them was told the request had expired.
 */
function closedResponse(record, state) {
  if (state === 'voided') return json({ error: 'voided' }, 410);
  if (state === 'expired') return json({ error: 'expired', expiredAt: record.expiresAt }, 410);
  return null;
}

/**
 * The 409 a signer gets when their turn has not come around yet - unless it
 * never will: a decline anywhere on the document closes signing for
 * everyone, and a signer parked behind it must hear that, not "wait for
 * Ava", who is the one who declined. The page offered them an email that was
 * never going to come. Still nothing about the document is served.
 *
 * \`channel\` is how the sender hands links out ('email', 'link', or '' when
 * unknown): the page's promise of an email when the turn comes was empty
 * for a sender who copies each link by hand.
 */
function notYet(turn, state, record) {
  if (state === 'declined') return json({ error: 'declined' }, 410);
  return json({
    error: 'not_yet',
    waitingFor: turn.waitingFor,
    position: turn.position,
    total: turn.total,
    channel: (record && record.channel) || '',
  }, 409);
}

/* ---- Access codes ----------------------------------------------------------- */

/** Codes are shared out loud and typed back in: case and spacing are noise. */
function normalizeCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/\\s+/g, '').slice(0, 64) : '';
}

async function codeHashOf(salt, code) {
  return sha256Hex(\`\${salt}:\${normalizeCode(code)}\`);
}

/** A session that has run its course, or one nothing can read any more. */
function sessionDead(session) {
  return !session || !session.exp || session.exp < Date.now();
}

/**
 * Ask the store to drop a key on its own once it has outlived its use, where
 * the platform offers that. Best effort: a key that lingers is swept up by
 * the scans below, and an unlocked session is never trusted past its \`exp\`
 * either way.
 */
async function expireKey(kv, key, seconds) {
  try {
    if (typeof kv.expire === 'function') await kv.expire(key, seconds);
  } catch {
    /* swept up later */
  }
}

/**
 * Does this request carry an unlocked session for this signer? Sessions are
 * stored by HASH, like the tokens, and expire on their own. One that has run
 * out is deleted the moment it is seen: every unlock left a key behind that
 * nothing removed, and the scans that find sessions by value (a replaced
 * code, a reissued link, a revoked document) walked all of them, forever.
 */
async function sessionOk(ctx, kv, docId, signerId) {
  const raw = ctx.request.headers.get('x-sign-session') || '';
  if (!/^[0-9a-f]{40}$/.test(raw)) return false;
  const key = SESS_PREFIX + (await sha256Hex(raw));
  const record = coerce(await kv.get(key));
  if (sessionDead(record)) {
    if (record) await kv.del(key).catch(() => {});
    return false;
  }
  return record.docId === docId && record.signerId === signerId;
}

/**
 * Forget every unlocked session for one signer. Sessions are keyed by their
 * own hash, so they can only be found by value (the scan /admin/revoke does).
 * Dead sessions met along the way go too, whoever they belonged to.
 *
 * Called whenever the second factor changes: replacing a code that leaked has
 * to shut the door NOW. Without this, whoever already traded the old code for
 * a session kept walking straight past the gate until it expired on its own,
 * which is exactly the person the owner was locking out.
 */
async function dropSessions(kv, docId, signerId) {
  for (const key of (await kv.list(\`\${SESS_PREFIX}*\`)) || []) {
    const session = coerce(await kv.get(key));
    if (sessionDead(session) || (session.docId === docId && session.signerId === signerId)) {
      await kv.del(key).catch(() => {});
    }
  }
}

/**
 * The access-code gate, in front of everything a signer can reach. Returns
 * null when the way is clear, or the response to send back.
 */
async function codeGate(ctx, kv, docId, signerId, signer) {
  if (!signer.codeHash) return null;
  if (await sessionOk(ctx, kv, docId, signerId)) return null;
  const lock = coerce(await kv.get(respKey(docId, signerId))) || {};
  if (lock.codeLockedUntil && lock.codeLockedUntil > Date.now()) {
    return json({ error: 'locked', until: lock.codeLockedUntil }, 429);
  }
  return json({ error: 'code_required' }, 401);
}

/* ---- Telling the owner ------------------------------------------------------ */

function notifKey(docId, kind, signerId) {
  return \`\${NOTIF_PREFIX}\${docId}:\${kind}:\${signerId || '-'}\`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** What the owner is told, per event. Composed here; nothing is forwarded. */
function ownerMessage(record, kind, signerName) {
  const title = record.doc.title || 'Untitled document';
  const who = signerName || 'A signer';
  if (kind === 'complete') {
    return {
      subject: \`Completed: "\${title}" has been signed by everyone\`,
      line: \`Everyone has signed "\${title}". The completed copy, with the signature certificate, is ready.\`,
    };
  }
  if (kind === 'decline') {
    return {
      subject: \`Declined: \${who} will not sign "\${title}"\`,
      line: \`\${who} declined to sign "\${title}", which closes signing for everyone.\`,
    };
  }
  return {
    subject: \`Signed: \${who} signed "\${title}"\`,
    line: \`\${who} signed "\${title}".\`,
  };
}

/**
 * Mail the owner about their own document, from their own account.
 *
 * Every attempt is recorded once per (document, event, signer) — success or
 * failure — so a retry never double-sends, and so the app can see that the
 * platform refused own-account mail and send it from the app instead. A mail
 * failure must never fail the signer's request, so nothing here throws.
 */
async function notifyOwner(ctx, kv, record, docId, kind, signerName, signerId) {
  try {
    const notify = record.notify || {};
    if (!notify.email || notify[kind] !== true) return;
    const key = notifKey(docId, kind, signerId);
    if (coerce(await kv.get(key))) return;
    const { subject, line } = ownerMessage(record, kind, signerName);
    const link = kind === 'complete' && notify.docUrl ? notify.docUrl : '';
    const text = [line, '', link ? \`Open the document: \${link}\` : 'Open Signatures to see it.'].join('\\n');
    const html = \`<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#111827">\`
      + \`<p style="margin:0 0 14px">\${escapeHtml(line)}</p>\`
      + (link
        ? \`<p style="margin:0"><a href="\${escapeHtml(link)}" style="color:#4f46e5">Open the document</a></p>\`
        : \`<p style="margin:0;color:#6b7280">Open Signatures to see it.</p>\`)
      + \`</div>\`;
    const record_ = { at: Date.now(), kind, signerId: signerId || '', ok: false, error: '' };
    try {
      const owner = ownerOf(ctx);
      const email = owner && owner.puter && owner.puter.email;
      if (!email || typeof email.send !== 'function') throw new Error('email_unavailable');
      await email.send({ to: notify.email, subject, text, html });
      record_.ok = true;
    } catch (err) {
      record_.error = String((err && err.message) || err || 'send_failed').slice(0, 200);
    }
    await kv.set(key, record_);
  } catch {
    /* the signer's answer is recorded either way; the app can still tell them */
  }
}

/* ---- Field/value validation -------------------------------------------------- */

function isDataImage(v) {
  return typeof v === 'string' && /^data:image\\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)
    && v.length <= MAX_IMAGE_CHARS;
}

/**
 * Does this text fit the type the sender asked for? The app validates the
 * same rules as you type (isValidInput in src/lib/model.js); this is the copy
 * that a hand-rolled POST also has to satisfy. Kept in sync by hand: a worker
 * imports nothing.
 */
function validForType(inputType, text) {
  const value = String(text).trim();
  if (!value) return true;
  if (inputType === 'number') return /^-?(\\d+\\.?\\d*|\\.\\d+)$/.test(value.replace(/[,\\s]/g, ''));
  if (inputType === 'email') return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value) && value.length <= 254;
  if (inputType === 'date') return /^\\d{4}-\\d{2}-\\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
  return true;
}

/** Validate one submitted value against its field; returns the clean value
 *  or undefined when the value is malformed. */
function cleanValue(field, value) {
  // Read-only means the sender owns this value: whatever a submission says,
  // the answer is the sender's own.
  if (field.readOnly) return field.preset === undefined ? undefined : field.preset;
  if (field.type === 'signature' || field.type === 'initials') {
    if (value && value.kind === 'image' && isDataImage(value.data)) {
      return { kind: 'image', data: value.data };
    }
    return undefined;
  }
  if (field.type === 'checkbox') return value === true ? true : value === false ? false : undefined;
  if (field.type === 'date') return typeof value === 'string' && value ? value.slice(0, 40) : undefined;
  if (typeof value !== 'string') return undefined;
  const text = value.slice(0, MAX_TEXT);
  return validForType(field.inputType, text) ? text : undefined;
}

function fieldComplete(field, value) {
  // Nothing is ever owed on a read-only field.
  if (field.readOnly) return true;
  if (field.type === 'checkbox') return !field.required || value === true;
  if (field.type === 'signature' || field.type === 'initials') return Boolean(value && value.kind === 'image');
  return Boolean(typeof value === 'string' ? value.trim() : value);
}

/* ---- Admin routes -------------------------------------------------------------- */

router.get('/health', async () => json({ ok: true, version: WORKER_VERSION }));

router.get('/admin/ping', async (ctx) => {
  if (!(await requireAdmin(ctx))) return json({ error: 'unauthorized' }, 401);
  return json({ ok: true, version: WORKER_VERSION });
});

/**
 * Push a document snapshot. Existing signers keep their token (their link
 * survives a re-sync); new signers and those in \`reissue\` get a fresh one.
 * Signers removed from the document lose token and response. Returns tokens
 * ONLY for links minted by this call.
 */
router.post('/admin/sync', async (ctx) => {
  if (!(await requireAdmin(ctx))) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(ctx);
  const src = body && typeof body === 'object' ? body : {};
  const doc = src.doc && typeof src.doc === 'object' ? src.doc : {};
  if (typeof doc.id !== 'string' || !/^[A-Za-z0-9._-]{1,200}$/.test(doc.id)) {
    return json({ error: 'doc_id_required' }, 400);
  }
  const signersIn = Array.isArray(src.signers) ? src.signers.slice(0, MAX_SIGNERS) : [];
  const signOrder = src.signOrder === true;
  const channel = src.channel === 'email' || src.channel === 'link' ? src.channel : '';
  // Which events the owner wants mailed to them, and where. The address is
  // the owner's own: this worker will never mail anyone else.
  const notifyIn = src.notify && typeof src.notify === 'object' ? src.notify : {};
  const notify = {
    email: str(notifyIn.email, 254).toLowerCase(),
    sign: notifyIn.sign === true,
    decline: notifyIn.decline === true,
    complete: notifyIn.complete === true,
    docUrl: /^https:\\/\\/[^\\s"'<>]{1,300}$/.test(String(notifyIn.docUrl || '')) ? String(notifyIn.docUrl) : '',
  };
  const fieldsIn = Array.isArray(src.fields) ? src.fields.slice(0, MAX_FIELDS) : [];
  const reissue = new Set(Array.isArray(src.reissue) ? src.reissue.map(String) : []);

  const kv = kvOf(ctx);
  const existing = coerce(await kv.get(DOC_PREFIX + doc.id));
  const prevSigners = (existing && existing.signers) || {};

  const signers = {};
  const links = {};
  for (const s of signersIn) {
    if (typeof s.id !== 'string' || !/^[A-Za-z0-9._-]{1,200}$/.test(s.id)) continue;
    const kind = s.kind === 'self' ? 'self' : 'external';
    const prev = prevSigners[s.id] || {};
    const entry = {
      name: str(s.name, 200),
      email: str(s.email, 254).toLowerCase(),
      kind,
      signed: s.signed === true,
      tokenHash: prev.tokenHash || null,
      // Access code: a string SETS it, null CLEARS it, absent keeps whatever
      // is already there (every re-sync would otherwise drop it).
      codeSalt: prev.codeSalt || null,
      codeHash: prev.codeHash || null,
    };
    if (typeof s.code === 'string' && normalizeCode(s.code).length >= 4) {
      entry.codeSalt = newToken();
      entry.codeHash = await codeHashOf(entry.codeSalt, s.code);
      // A new code invalidates the sessions the old one bought, and any lockout.
      await dropSessions(kv, doc.id, s.id);
      const stale = coerce(await kv.get(respKey(doc.id, s.id)));
      if (stale && (stale.codeFails || stale.codeLockedUntil)) {
        await kv.set(respKey(doc.id, s.id), { ...stale, codeFails: 0, codeLockedUntil: 0 });
      }
    } else if (s.code === null) {
      entry.codeSalt = null;
      entry.codeHash = null;
      await dropSessions(kv, doc.id, s.id);
    }
    if (kind === 'external' && (!entry.tokenHash || reissue.has(s.id))) {
      const token = newToken();
      const hash = await sha256Hex(token);
      if (entry.tokenHash) await kv.del(TOK_PREFIX + entry.tokenHash).catch(() => {});
      await kv.set(TOK_PREFIX + hash, { docId: doc.id, signerId: s.id });
      entry.tokenHash = hash;
      links[s.id] = token;
      if (reissue.has(s.id)) {
        // A reissue exists to take the document away from whoever held the old
        // link; their unlocked session must not outlive it.
        await dropSessions(kv, doc.id, s.id);
        // Nor may what that holder DID carry over to the new one. The consent
        // matters most: the signing page skips the disclosure entirely once a
        // consent is on record, so a leftover one let the new holder sign
        // without ever agreeing, under a timestamp, IP, and browser that were
        // someone else's - and the certificate printed it as theirs.
        // An answer that is already final is evidence, and is never deleted.
        const held = coerce(await kv.get(respKey(doc.id, s.id)));
        if (held && held.status !== 'signed' && held.status !== 'declined') {
          await kv.del(respKey(doc.id, s.id)).catch(() => {});
        }
      }
    }
    signers[s.id] = entry;
  }

  // Signers no longer on the document: revoke their token and answer.
  for (const [signerId, prev] of Object.entries(prevSigners)) {
    if (signers[signerId]) continue;
    if (prev.tokenHash) await kv.del(TOK_PREFIX + prev.tokenHash).catch(() => {});
    await kv.del(respKey(doc.id, signerId)).catch(() => {});
  }

  const fields = [];
  for (const f of fieldsIn) {
    if (typeof f.id !== 'string' || !signers[String(f.signerId)]) continue;
    fields.push({
      id: str(f.id, 200),
      signerId: String(f.signerId),
      type: ['signature', 'initials', 'date', 'text', 'checkbox'].includes(f.type) ? f.type : 'text',
      page: Number.isInteger(f.page) && f.page >= 0 ? f.page : 0,
      x: Number(f.x) || 0,
      y: Number(f.y) || 0,
      w: Number(f.w) || 0.1,
      h: Number(f.h) || 0.04,
      required: f.required !== false,
      label: str(f.label, 100),
      help: str(f.help, 200),
      readOnly: f.readOnly === true,
      inputType: ['text', 'number', 'email', 'date'].includes(f.inputType) ? f.inputType : 'text',
      // The value the sender filled in. Text keeps its string; a checkbox is
      // a boolean; anything else has no sender-filled form.
      preset: typeof f.preset === 'string' ? f.preset.slice(0, MAX_TEXT)
        : f.preset === true ? true : f.preset === false ? false : undefined,
    });
  }

  // Values the app pushed for self signers (the owner's own signatures), so
  // external signers see them on the document.
  const values = {};
  if (src.values && typeof src.values === 'object') {
    for (const field of fields) {
      const clean = cleanValue(field, src.values[field.id]);
      if (clean !== undefined) values[field.id] = clean;
    }
  }

  // The order the app sent, filtered to signers this record actually has.
  const order = (Array.isArray(src.order) ? src.order.map(String) : signersIn.map((sx) => String(sx.id)))
    .filter((id) => signers[id]);

  await kv.set(DOC_PREFIX + doc.id, {
    doc: {
      id: doc.id,
      title: str(doc.title, 300) || 'Untitled document',
      note: str(doc.note, 2000),
      ownerName: str(doc.ownerName, 200),
      ownerEmail: str(doc.ownerEmail, 254).toLowerCase(),
      pageCount: Number.isInteger(doc.pageCount) && doc.pageCount > 0 ? doc.pageCount : 1,
      pdfPath: str(doc.pdfPath, 1000),
    },
    // A deadline the worker enforces itself, so it holds with the app closed.
    // Extending is the same field moving forward.
    expiresAt: Number.isFinite(src.expiresAt) && src.expiresAt > 0 ? Math.round(src.expiresAt) : 0,
    signers,
    fields,
    values,
    signOrder,
    order,
    channel,
    notify,
    voided: existing ? Boolean(existing.voided) : false,
    updatedAt: Date.now(),
  });

  return json({ ok: true, version: WORKER_VERSION, links });
});

/**
 * Everything signers have done, for the app to merge. Submitted values ride
 * along until the app acknowledges them; after that only statuses repeat.
 *
 * \`?docs=a,b,c\` names the documents the app still has out for signature, and
 * only those are walked: every other document here is finished (completed,
 * declined, voided, expired) and nothing can arrive on it. Without the
 * filter each pull - one a minute while anything is out - read every
 * document ever synced and every response and notification under each,
 * growing with the owner's whole history rather than with their open work.
 * No parameter still means everything, for an app that does not send one.
 */
router.get('/admin/responses', async (ctx) => {
  if (!(await requireAdmin(ctx))) return json({ error: 'unauthorized' }, 401);
  const kv = kvOf(ctx);
  const wanted = new URL(ctx.request.url).searchParams.get('docs');
  const only = wanted === null ? null : new Set(wanted.split(',').filter(Boolean));
  const keys = ((await kv.list(\`\${DOC_PREFIX}*\`)) || [])
    .filter((key) => !only || only.has(key.slice(DOC_PREFIX.length)));
  const docs = {};
  const notified = {};
  for (const key of keys) {
    const record = coerce(await kv.get(key));
    if (!record || !record.doc) continue;
    const docId = record.doc.id;
    const resps = await loadResponses(kv, docId, Object.keys(record.signers || {}));
    const out = {};
    for (const [signerId, resp] of Object.entries(resps)) {
      out[signerId] = {
        status: resp.status,
        viewedAt: resp.viewedAt || null,
        signedAt: resp.signedAt || null,
        declinedAt: resp.declinedAt || null,
        declineReason: resp.declineReason || '',
        consentAt: resp.consentAt || null,
        consentVersion: resp.consentVersion || '',
        // What happened at the access-code gate, for the owner's audit trail.
        code: {
          fails: resp.codeFails || 0,
          lastFailAt: resp.codeLastFailAt || 0,
          lockedUntil: resp.codeLockedUntil || 0,
          unlockedAt: resp.codeUnlockedAt || 0,
          unlockCount: resp.codeUnlockCount || 0,
        },
        // What the certificate prints: the context of each act.
        evidence: {
          view: resp.view || null,
          consent: resp.consent || null,
          sign: resp.sign || null,
          decline: resp.decline || null,
        },
        values: resp.acked ? undefined : resp.values,
      };
    }
    docs[docId] = out;
    // What the owner has already been told, so the app neither repeats it nor
    // leaves them uninformed when this worker could not send.
    const notifKeys = (await kv.list(\`\${NOTIF_PREFIX}\${docId}:*\`)) || [];
    const told = {};
    for (const key of notifKeys) {
      const value = coerce(await kv.get(key));
      if (value) told[key.slice(NOTIF_PREFIX.length + docId.length + 1)] = value;
    }
    if (Object.keys(told).length) notified[docId] = told;
  }
  return json({ ok: true, version: WORKER_VERSION, docs, notified });
});

/** The app merged these signers' values; stop re-sending them on every pull.
 *  Values stay stored: the signing page shows co-signers' signatures and
 *  builds the completed copy from them. */
router.post('/admin/ack', async (ctx) => {
  if (!(await requireAdmin(ctx))) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(ctx);
  const docId = body && typeof body.docId === 'string' ? body.docId : '';
  const signerIds = Array.isArray(body && body.signerIds) ? body.signerIds.map(String) : [];
  if (!docId || !signerIds.length) return json({ error: 'bad_request' }, 400);
  const kv = kvOf(ctx);
  for (const signerId of signerIds) {
    const key = respKey(docId, signerId);
    const resp = coerce(await kv.get(key));
    if (resp && !resp.acked) {
      resp.acked = true;
      await kv.set(key, resp);
    }
  }
  return json({ ok: true });
});

/** Void: links stop working but records stay for the audit trail. */
router.post('/admin/void', async (ctx) => {
  if (!(await requireAdmin(ctx))) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(ctx);
  const docId = body && typeof body.docId === 'string' ? body.docId : '';
  if (!docId) return json({ error: 'bad_request' }, 400);
  const kv = kvOf(ctx);
  const record = coerce(await kv.get(DOC_PREFIX + docId));
  if (record) {
    record.voided = true;
    await kv.set(DOC_PREFIX + docId, record);
  }
  return json({ ok: true });
});

/** Revoke: the document is deleted from the worker entirely. */
router.post('/admin/revoke', async (ctx) => {
  if (!(await requireAdmin(ctx))) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(ctx);
  const docId = body && typeof body.docId === 'string' ? body.docId : '';
  if (!docId) return json({ error: 'bad_request' }, 400);
  const kv = kvOf(ctx);
  const record = coerce(await kv.get(DOC_PREFIX + docId));
  if (record) {
    for (const [signerId, signer] of Object.entries(record.signers || {})) {
      if (signer.tokenHash) await kv.del(TOK_PREFIX + signer.tokenHash).catch(() => {});
      await kv.del(respKey(docId, signerId)).catch(() => {});
    }
    for (const key of (await kv.list(\`\${NOTIF_PREFIX}\${docId}:*\`)) || []) {
      await kv.del(key).catch(() => {});
    }
    // Sessions are keyed by their own hash, so they have to be found by
    // value; dead ones met on the way go too.
    for (const key of (await kv.list(\`\${SESS_PREFIX}*\`)) || []) {
      const session = coerce(await kv.get(key));
      if (sessionDead(session) || session.docId === docId) await kv.del(key).catch(() => {});
    }
    await kv.del(DOC_PREFIX + docId);
  }
  return json({ ok: true });
});

/* ---- Signer routes ---------------------------------------------------------------- */

/** Send the visitor to the app-hosted signing page. */
router.get('/sign/:token', async (ctx) => {
  const page = /^https?:\\/\\//i.test(PAGE_URL) ? PAGE_URL : 'https://puter.com';
  const params = new URLSearchParams({
    w: new URL(ctx.request.url).origin,
    t: String(ctx.params.token || ''),
  });
  return new Response(null, {
    status: 303,
    headers: {
      location: \`\${page}#\${params.toString()}\`,
      'cache-control': 'no-store',
    },
  });
});

/** The signer's view of the document. Marks first contact as "viewed". */
router.get('/api/sign/:token', async (ctx) => {
  const hit = await loadByToken(ctx, ctx.params.token);
  if (!hit) return json({ error: 'not_found' }, 404);
  const { kv, docId, signerId, record } = hit;
  const resps = await loadResponses(kv, docId, Object.keys(record.signers));
  const state = docState(record, resps);
  const closed = closedResponse(record, state);
  if (closed) return closed;

  const locked = await codeGate(ctx, kv, docId, signerId, record.signers[signerId]);
  if (locked) return locked;

  // Their turn has not come: nothing about the document is served, and the
  // visit is NOT recorded as a view (they have not seen it).
  const turn = turnState(record, resps, signerId);
  if (!turn.ok) return notYet(turn, state, record);

  let mine = resps[signerId];
  // A record can already exist without a status: failed code attempts write
  // their counter before this signer has ever seen the document.
  if (!mine || !mine.status) {
    // First contact: the view itself is evidence, so it is captured with the
    // same shape as the consent and the signature.
    const seen = evidence(ctx, null);
    mine = {
      ...(mine || {}),
      status: 'viewed',
      viewedAt: (mine && mine.viewedAt) || seen.at,
      view: (mine && mine.view) || seen,
    };
    await kv.set(respKey(docId, signerId), mine);
    resps[signerId] = mine;
  }

  const fields = record.fields.map((f) => {
    const owner = record.signers[f.signerId];
    const respValue = resps[f.signerId] && resps[f.signerId].values
      ? resps[f.signerId].values[f.id]
      : undefined;
    const snapValue = record.values ? record.values[f.id] : undefined;
    const value = respValue !== undefined ? respValue : snapValue;
    // Nobody has answered yet, so what the sender filled in stands.
    const shown = value !== undefined && value !== null ? value : f.preset;
    return {
      id: f.id,
      type: f.type,
      page: f.page,
      x: f.x, y: f.y, w: f.w, h: f.h,
      required: f.required,
      label: f.label,
      help: f.help,
      readOnly: f.readOnly === true,
      inputType: f.inputType,
      mine: f.signerId === signerId,
      signerName: (owner && owner.name) || '',
      value: shown,
    };
  });

  const signer = record.signers[signerId];
  return json({
    ok: true,
    version: WORKER_VERSION,
    state,
    // How the sender hands things out, so the page can say what happens once
    // everyone has signed: a completed copy by email, or this link.
    channel: record.channel || '',
    doc: {
      title: record.doc.title,
      note: record.doc.note,
      ownerName: record.doc.ownerName,
      pageCount: record.doc.pageCount,
    },
    signer: {
      name: signer.name,
      email: signer.email,
      status: mine.status || 'viewed',
      declineReason: mine.declineReason || '',
      consentAt: mine.consentAt || null,
      consentVersion: mine.consentVersion || '',
      codeRequired: Boolean(record.signers[signerId].codeHash),
    },
    fields,
  });
});

/** The original PDF, streamed from the owner's own cloud storage. */
router.get('/api/sign/:token/pdf', async (ctx) => {
  const hit = await loadByToken(ctx, ctx.params.token);
  if (!hit) return json({ error: 'not_found' }, 404);
  const pdfResps = await loadResponses(hit.kv, hit.docId, Object.keys(hit.record.signers));
  const pdfState = docState(hit.record, pdfResps);
  const pdfClosed = closedResponse(hit.record, pdfState);
  if (pdfClosed) return pdfClosed;
  const pdfLocked = await codeGate(ctx, hit.kv, hit.docId, hit.signerId, hit.record.signers[hit.signerId]);
  if (pdfLocked) return pdfLocked;
  const pdfTurn = turnState(hit.record, pdfResps, hit.signerId);
  if (!pdfTurn.ok) return notYet(pdfTurn, pdfState, hit.record);
  const path = hit.record.doc.pdfPath;
  if (!path) return json({ error: 'file_unavailable' }, 404);
  try {
    const blob = await ownerOf(ctx).puter.fs.read(path);
    const bytes = blob && typeof blob.arrayBuffer === 'function' ? await blob.arrayBuffer() : blob;
    return new Response(bytes, {
      headers: {
        'content-type': 'application/pdf',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return json({ error: 'file_unavailable' }, 404);
  }
});

/** Sign or decline. */
router.post('/api/sign/:token', async (ctx) => {
  const hit = await loadByToken(ctx, ctx.params.token);
  if (!hit) return json({ error: 'not_found' }, 404);
  const { kv, docId, signerId, record } = hit;
  const resps = await loadResponses(kv, docId, Object.keys(record.signers));
  const postClosed = closedResponse(record, docState(record, resps));
  if (postClosed) return postClosed;

  const signerEntry = record.signers[signerId];
  const existing = resps[signerId] || {};
  const attempt = await readJson(ctx);

  /**
   * Trade the access code for a short-lived session. Rate-limited and locked
   * out after MAX_CODE_FAILS, and every failure is written where the owner
   * can see it. Answered before the already-signed checks below: a locked-out
   * guesser must learn nothing about the document, not even its state.
   */
  if (attempt && attempt.action === 'unlock') {
    if (!signerEntry.codeHash) return json({ error: 'no_code_needed' }, 400);
    const now = Date.now();
    if (existing.codeLockedUntil && existing.codeLockedUntil > now) {
      return json({ error: 'locked', until: existing.codeLockedUntil }, 429);
    }
    const given = normalizeCode(attempt.code);
    const ok = given.length >= 4
      && (await codeHashOf(signerEntry.codeSalt, given)) === signerEntry.codeHash;
    if (!ok) {
      // A lock that has run its course took the earlier failures with it:
      // five guesses, then a wait, then five more. Carrying the count over
      // made every wrong guess after the first wait a fresh fifteen minutes,
      // which is a signer who fumbled the code once being told "too many
      // attempts" on their next try, for as long as they keep trying.
      const lapsed = existing.codeLockedUntil && existing.codeLockedUntil <= now;
      const fails = (lapsed ? 0 : existing.codeFails || 0) + 1;
      const lockedUntil = fails >= MAX_CODE_FAILS ? now + CODE_LOCK_MS : 0;
      await kv.set(respKey(docId, signerId), {
        ...existing,
        codeFails: fails,
        codeLastFailAt: now,
        codeLockedUntil: lockedUntil,
      });
      if (lockedUntil) return json({ error: 'locked', until: lockedUntil }, 429);
      return json({ error: 'bad_code', remaining: MAX_CODE_FAILS - fails }, 401);
    }
    const session = newToken();
    const exp = now + SESSION_TTL_MS;
    const sessKey = SESS_PREFIX + (await sha256Hex(session));
    await kv.set(sessKey, { docId, signerId, exp });
    await expireKey(kv, sessKey, Math.ceil(SESSION_TTL_MS / 1000));
    await kv.set(respKey(docId, signerId), {
      ...existing,
      codeFails: 0,
      codeLockedUntil: 0,
      codeUnlockedAt: existing.codeUnlockedAt || now,
      codeUnlockCount: (existing.codeUnlockCount || 0) + 1,
    });
    return json({ ok: true, session, expiresAt: exp });
  }

  const gated = await codeGate(ctx, kv, docId, signerId, signerEntry);
  if (gated) return gated;

  if (existing.status === 'signed') return json({ error: 'already_signed' }, 409);
  if (existing.status === 'declined') return json({ error: 'already_declined' }, 409);

  const state = docState(record, resps);
  if (state === 'declined') return json({ error: 'declined' }, 410);
  // Defence in depth: the page hides the document, and the worker refuses the
  // submission too.
  const turn = turnState(record, resps, signerId);
  if (!turn.ok) return notYet(turn, state, record);

  const body = attempt;
  const action = body && body.action;

  /**
   * Agreeing to sign electronically. Recorded before any field is filled in,
   * with the version of the disclosure the page actually showed, so the
   * certificate can state what was agreed to and when.
   */
  if (action === 'consent') {
    const seen = evidence(ctx, body);
    const resp = {
      ...existing,
      status: existing.status || 'viewed',
      viewedAt: existing.viewedAt || seen.at,
      // The first agreement is the one that counts; reopening the page must
      // not restamp it.
      consentAt: existing.consentAt || seen.at,
      consentVersion: existing.consentVersion || str(body.disclosureVersion, 20) || '1',
      consent: existing.consent || seen,
    };
    await kv.set(respKey(docId, signerId), resp);
    return json({ ok: true, consentAt: resp.consentAt, consentVersion: resp.consentVersion });
  }

  if (action === 'decline') {
    const seen = evidence(ctx, body);
    const resp = {
      ...existing,
      status: 'declined',
      declinedAt: seen.at,
      declineReason: str(body.reason, MAX_REASON),
      decline: seen,
    };
    await kv.set(respKey(docId, signerId), resp);
    await notifyOwner(ctx, kv, record, docId, 'decline', record.signers[signerId].name, signerId);
    return json({ ok: true, status: 'declined' });
  }

  if (action !== 'sign') return json({ error: 'bad_action' }, 400);

  // No agreement, no signature: a signature whose consent was never recorded
  // is exactly the one that cannot be defended later.
  if (!existing.consentAt) return json({ error: 'consent_required' }, 409);

  const myFields = record.fields.filter((f) => f.signerId === signerId);
  const submitted = body && body.values && typeof body.values === 'object' ? body.values : {};
  if (JSON.stringify(submitted).length > MAX_VALUES_CHARS) {
    return json({ error: 'too_large' }, 413);
  }
  const values = {};
  for (const field of myFields) {
    const clean = cleanValue(field, submitted[field.id]);
    if (clean !== undefined) values[field.id] = clean;
  }
  const missing = myFields.filter((f) => f.required && !fieldComplete(f, values[f.id]));
  if (missing.length) {
    return json({ error: 'missing_required', fields: missing.map((f) => f.id) }, 400);
  }

  const seen = evidence(ctx, body);
  const resp = {
    ...existing,
    status: 'signed',
    signedAt: seen.at,
    sign: seen,
    values,
    acked: false,
  };
  await kv.set(respKey(docId, signerId), resp);
  const after = docState(record, { ...resps, [signerId]: resp });
  const signerName = record.signers[signerId].name;
  // A completion is the event the owner asked about; the individual signature
  // is only mailed when they asked for those too.
  await notifyOwner(ctx, kv, record, docId, 'sign', signerName, signerId);
  if (after === 'completed') await notifyOwner(ctx, kv, record, docId, 'complete', signerName, '');
  return json({ ok: true, status: 'signed', state: after });
});
`,Ke=`sig:worker:cfg:v1`,qe=45e3;function Je({store:e,getPuter:n=()=>typeof puter<`u`?puter:null,fetchFn:r=(...e)=>fetch(...e),verifyAttempts:i=6,verifyDelayMs:a=3e3,source:o=Ge,pageUrl:s=(typeof location<`u`&&location.origin&&location.origin!==`null`?location.origin+location.pathname.replace(/[^/]*$/,``):`https://puter.com/`)+`sign.html`,appUrl:c=s.replace(/sign\.html$/,``)}={}){let l=e=>/^https:\/\//.test(c)?c+`#/doc/`+e:``,u=null,d=!1,f=0,p=Promise.resolve(),m=()=>n().kv;function h(){let e=n();return!!(e&&e.workers&&typeof e.workers.create==`function`)}function g(e){return o.replace(`__SIGN_ADMIN_SECRET_HASH__`,e).replace(`__SIGN_WORKER_VERSION__`,`17`).replace(`__SIGN_PAGE_URL__`,s)}async function _(){await m().set(Ke,u),d=!0}async function v(){let e=Oe(await m().get(Ke));return e&&e.secret&&(u=e,d=!0),u}let y=0;async function b(e,t){let n=a;for(let a=0;a<i;a++){try{let n=await r(`${e}/admin/ping`,{headers:{authorization:`Bearer ${t}`}});if(n.ok){let e=await n.json();if(e&&e.version===`17`){y=0;return}}}catch{}await new Promise(e=>setTimeout(e,n)),n=Math.min(8e3,n+1500)}throw y=Date.now()+12e4,Error(`signlinks: deployed worker did not come up on the expected version`)}async function x(e=0){if(u||await v(),u&&u.secret&&u.url&&u.version===`17`)return d||await _(),u;let t=n();if(!t||!t.workers||!t.fs)throw Error(`signlinks: Puter workers are unavailable`);if(Date.now()<y)throw Error(`signlinks: worker deploy pending (cooling down after a failed verify)`);if(u&&u.secret&&u.name){let e=g(await Ce(u.secret)),n=`sign-worker.js`;try{let e=await t.workers.get(u.name);e&&e.file_path&&(n=e.file_path)}catch{}return await t.fs.write(n,e,{createMissingParents:!0}),await b(u.url,u.secret),u={...u,version:`17`},await _(),u}let r=De(32),i=g(await Ce(r)),a=`sign-worker.js`;await t.fs.write(a,i,{createMissingParents:!0});let o=null;for(let n=0;n<3;n++){if(e<2&&await v().catch(()=>null))return x(e+1);let n=`doc-sign-${De(5)}`,i;try{i=await t.workers.create(n,a)}catch(e){o=e;continue}let s=String(i&&i.url||`https://${n}.puter.work`).replace(/\/+$/,``);u={name:n,url:s,secret:r,version:null,createdAt:Date.now()},d=!1;try{await _()}catch{}let c=async()=>{let e=Oe(await m().get(Ke));return!e||!e.secret||!e.name||e.name===n?!1:(typeof t.workers.delete==`function`&&await t.workers.delete(n).catch(()=>{}),u=e,d=!0,!0)};try{if(await c())return u}catch{}await b(s,r);try{if(await c())return u}catch{}return u={...u,version:`17`},await _(),u}throw o||Error(`signlinks: could not deploy the sign worker`)}async function S(e,t){let n=await x(),i=await r(n.url+e,{method:t?`POST`:`GET`,headers:{authorization:`Bearer ${n.secret}`,...t?{"content-type":`application/json`}:{}},body:t?JSON.stringify(t):void 0});if(!i.ok)throw Error(`signlinks: ${e} failed (${i.status})`);return i.json()}async function C(n){let r=e.user||{},i=await e.readSigData(n.id),a=new Set(n.signers.filter(e=>e.isMe).map(e=>e.id)),o={};for(let e of n.fields)a.has(e.signerId)&&i[e.id]!==void 0&&(o[e.id]=i[e.id]);return{doc:{id:n.id,title:n.title,note:n.note||``,ownerName:e.settings.fullName||r.username||``,ownerEmail:r.email||``,pageCount:n.pageCount,pdfPath:n.pdfAbsPath||Ie(n.id)},expiresAt:n.expiresAt||0,signers:n.signers.map(e=>({id:e.id,name:e.name||``,email:e.email||``,kind:e.isMe?`self`:`external`,signed:e.status===`signed`})),fields:n.fields,values:o,signOrder:n.signOrder===!0,order:n.signers.map(e=>e.id),channel:t(n),notify:{email:r.email||``,sign:e.settings.notifySign===!0,decline:e.settings.notifyDecline!==!1,complete:e.settings.notifyComplete!==!1,docUrl:l(n.id)}}}async function w(e,{reissue:t=[],codes:n=null}={}){let r=await x(),i=await C(e);if(i.reissue=t,n)for(let e of i.signers)Object.prototype.hasOwnProperty.call(n,e.id)&&(e.code=n[e.id]);let a=await S(`/admin/sync`,i),o={...e.links||{}};for(let[e,t]of Object.entries(a.links||{}))o[e]=`${r.url}/sign/${t}`;for(let t of Object.keys(o))e.signers.some(e=>e.id===t)||delete o[t];return o}function T(){return e.listDocs().filter(e=>(e.status===`sent`||e.status===`expired`)&&!e.sample&&Object.keys(e.links||{}).length).map(e=>e.id)}async function E({force:t=!1}={}){if(u||await v().catch(()=>null),!u||!u.secret||!t&&Date.now()-f<qe)return[];let n=T();if(!n.length)return[];let r=p.then(async()=>{let t=await S(`/admin/responses?docs=${encodeURIComponent(n.join(`,`))}`);f=Date.now();let r=[];for(let[n,i]of Object.entries(t.docs||{})){if(!e.getDoc(n))continue;let a=Object.entries(i).map(([e,t])=>({signerId:e,status:t.status,viewedAt:t.viewedAt,signedAt:t.signedAt,declinedAt:t.declinedAt,declineReason:t.declineReason,consentAt:t.consentAt,consentVersion:t.consentVersion,evidence:t.evidence,code:t.code,values:t.values})),o=await e.applyResponses(n,a),s=t.notified&&t.notified[n]||{},c=a.filter(e=>e.values&&Object.keys(e.values).length);c.length&&await S(`/admin/ack`,{docId:n,signerIds:c.map(e=>e.signerId)}).catch(()=>{}),o.changed&&r.push({docId:n,...o,notified:s})}return r});return p=r.catch(()=>{}),r}async function D(e){u||await v().catch(()=>null),!(!u||!u.secret)&&await S(`/admin/void`,{docId:e})}async function O(e){u||await v().catch(()=>null),!(!u||!u.secret)&&await S(`/admin/revoke`,{docId:e})}return{available:h,ensureWorker:x,syncDoc:w,pull:E,voidDoc:D,revokeDoc:O,whenIdle:()=>p}}var Ye=`https://signatures-email.puter.work`;function Xe(e){let t=JSON.stringify(e),n=2166136261,r=2166136261;for(let e=0;e<t.length;e++){let i=t.charCodeAt(e);n=Math.imul(n^i,16777619)>>>0,r=Math.imul(r^i+e,2246822507)>>>0}return n.toString(16).padStart(8,`0`)+r.toString(16).padStart(8,`0`)}function Ze(e){let t=e&&e.sent||0,n=e&&e.failed||0,r=e&&e.suppressed||0;return n?{icon:`triangleAlert`,message:t?`Sent ${t}, but ${n} could not be delivered.`:`Those emails could not be delivered.`,quiet:!1}:(e&&e.results||[]).filter(e=>e.status===`skipped`&&e.reason===`daily_limit`).length?{icon:`triangleAlert`,message:t?`Sent ${t}, but the daily email limit stopped the rest. Try again tomorrow.`:`You have reached the daily email limit. Try again tomorrow.`,quiet:!1}:r?{icon:`info`,message:t?`Sent ${t}. ${r} signer${r===1?` has`:`s have`} opted out of these emails.`:`${r===1?`That signer has`:`Those signers have`} opted out of these emails.`,quiet:!1}:t?{icon:`mailCheck`,message:t===1?`Email sent`:`Emails sent to ${t} signers`,quiet:!1}:{icon:`info`,message:`Everyone already has this email.`,quiet:!0}}function Qe(e,t){let n=t&&t.error||``;return e===401||n===`sign_in_required`?`Sign in to Puter again to send emails.`:e===429||n===`daily_limit`?`You have reached the daily email limit. Try again tomorrow.`:e===404?`The email service is unavailable right now.`:`Could not send the emails. Please try again.`}function $e({store:e,workerUrl:t=Ye,getPuter:n=()=>typeof puter<`u`?puter:null,fetchFn:r=(...e)=>fetch(...e)}){function i(){let e=n();return!!(e&&e.workers&&typeof e.workers.exec==`function`)}function a(t){return e.settings.fullName||e.user?.username||``}function o(e,t=`request`){let n=[];for(let r of e.signers||[]){if(r.isMe||t!==`completed`&&(r.status===`signed`||r.status===`declined`||!d(e,r.id)))continue;let i=J(r.email),o=(e.links||{})[r.id]||``;if(!i||!o)continue;let s=r.hasCode===!0,c=Xe([e.title,e.note||``,a(e),o,t,s,e.expiresAt||0]),l=(e.emailed||{})[`${r.id}:${t}`]||null;n.push({signerId:r.id,email:i,name:r.name||``,signUrl:o,codeRequired:s,version:c,sentAt:l&&l.at||0,current:!!(l&&l.v===c)})}return n}async function s(r,{signerIds:s=null,kind:c=`request`,note:l=``,force:u=!1}={}){if(!i())throw Error(`Sending email needs the Puter SDK.`);let d=o(r,c),f=s?new Set(s):null,p=(f?d.filter(e=>f.has(e.signerId)):d.filter(e=>u||!e.current)).map(e=>({email:e.email,name:e.name,signUrl:e.signUrl,version:e.version,codeRequired:e.codeRequired}));if(!p.length)return{ok:!0,sent:0,skipped:0,failed:0,results:[]};let m;try{m=await n().workers.exec(`${t}/send`,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({doc:{id:r.id,title:r.title,ownerName:a(r),ownerEmail:e.user?.email||``,pageCount:r.pageCount,expiresAt:r.expiresAt||0,tzOffset:r.expiresAt?-new Date(r.expiresAt).getTimezoneOffset():null},recipients:p,kind:c,note:l||r.note||``,force:u})})}catch{throw Error(`Could not reach the email service. Check your connection and try again.`)}let h=await m.json().catch(()=>null);if(!m.ok||!h||!h.ok)throw Error(Qe(m.status,h));let g={...r.emailed||{}};for(let e of h.results||[]){if(!(e.status===`sent`||e.status===`skipped`&&e.reason===`already_sent`))continue;let t=d.find(t=>t.email===e.email);t&&(g[`${t.signerId}:${c}`]={at:e.at||Date.now(),v:t.version})}if(await e.patchDoc(r.id,{emailed:g}),h.sent){let t=e.getDoc(r.id);t&&(e.addAudit(t,c===`reminder`?`reminder_sent`:`emailed`,`${h.sent} signer${h.sent===1?``:`s`}`),await e.persistDoc(t))}return h}let c=null;function l(){return c||=r(`${t}/health`).then(e=>e.ok?e.json():null).then(e=>{if(!e)throw Error(`unreachable`);return Array.isArray(e.kinds)?e.kinds:[`request`,`reminder`,`completed`]}).catch(()=>(c=null,null)),c}async function u(r,o){let s=J(e.user?.email);if(!i()||!s||!o||!o.length)return{ok:!0,sent:0,skipped:0,failed:0,results:[]};let c=await l();if(!c||!c.includes(`owner`))return{ok:!0,sent:0,skipped:0,failed:0,unsupported:!0,results:[]};let u=Xe([r.id,o.map(e=>`${e.type}:${e.who}:${e.at}`),`owner`]),d;try{d=await n().workers.exec(`${t}/send`,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({doc:{id:r.id,title:r.title,ownerName:a(r),ownerEmail:s,pageCount:r.pageCount},recipients:[{email:s,version:u}],events:o,kind:`owner`})})}catch{throw Error(`Could not reach the email service. Check your connection and try again.`)}let f=await d.json().catch(()=>null);if(!d.ok||!f||!f.ok)throw Error(Qe(d.status,f));return f}return{available:i,planFor:o,send:s,notifyOwner:u,supportedKinds:l}}var Q=Je({store:Z}),$=$e({store:Z}),et=`signatures:theme`,tt=`#f6f6f4`,nt=`#101013`;function rt(e){let t=document.documentElement;e===`light`||e===`dark`?t.dataset.theme=e:delete t.dataset.theme;try{e===`light`||e===`dark`?localStorage.setItem(et,e):localStorage.removeItem(et)}catch{}at()}function it(){let e=document.documentElement.dataset.theme;return e===`light`||e===`dark`?e:`system`}function at(){let e=it()===`dark`||it()===`system`&&matchMedia(`(prefers-color-scheme: dark)`).matches;for(let t of document.querySelectorAll(`meta[name="theme-color"]`))t.setAttribute(`content`,e?nt:tt)}typeof matchMedia==`function`&&matchMedia(`(prefers-color-scheme: dark)`).addEventListener(`change`,at);function ot(e){return!e.settings.onboarded&&!e.settings.sampleData&&e.listDocs().length===0}function st(){let e=z(`div`),t=()=>{Z.settings.onboarded||Z.updateSettings({onboarded:!0}).catch(()=>{})},n=G({title:`Welcome`,content:e,onClose:t}),r=()=>z(`button.btn.btn-ghost.btn-block`,{type:`button`,style:{marginTop:`10px`},onclick:()=>{t(),n.close()}},`Skip for now`);function a(){H(e),F(e,[z(`div.empty`,{style:{padding:`10px 8px 4px`}},z(`div.empty-icon`,{html:N(`signature`,30),style:{background:`var(--accent-wash)`,color:`var(--accent-strong)`}}),z(`h3`,{style:{fontSize:`19px`}},`Get documents signed`),z(`p`,{},`Upload a PDF, place signature fields, and send private sign links by email. Everything is stored in your own Puter account.`)),z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{padding:`13px`},onclick:s},`Set up my account`),z(`button.btn.btn-ghost.btn-block`,{type:`button`,style:{marginTop:`10px`,border:`1px dashed var(--hairline-strong)`},html:N(`sparkle`,15,2),onclick:o},` Explore with sample documents`),r()])}async function o(e){let t=e.currentTarget;t.disabled=!0;try{let{sampleDataset:e}=await W(async()=>{let{sampleDataset:e}=await import(`./sample-CrS5QAb4.js`);return{sampleDataset:e}},__vite__mapDeps([0,1,2,3,4]),import.meta.url);await Z.importDataset(await e(Z))}catch(e){console.error(e),i(`Could not load the sample documents. Check your connection`,{icon:`wifiOff`}),t.disabled=!1;return}n.close(),i(`Sample documents loaded. Wipe them anytime from the banner`,{icon:`sparkle`})}function s(){H(e);let t=L(`fullname`),a=z(`input.input`,{id:t,type:`text`,autocomplete:`name`,maxLength:80,value:Z.settings.fullName||``,placeholder:`e.g. Alex Rivera`});F(e,[z(`h3.onboard-h`,{},`What name should signers see?`),z(`p.onboard-p`,{},`It appears in email requests and on the signature certificate. You can change it anytime in Settings.`),z(`div.field`,{},z(`label`,{for:t},`Your full name`),a),z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{padding:`13px`},onclick:async e=>{e.currentTarget.disabled=!0;let t=a.value.trim();await Z.updateSettings({fullName:t,onboarded:!0}).catch(()=>{}),n.close(),i(`You are all set. Upload a PDF to get started`,{icon:`check`})}},`Start sending`),r()]),setTimeout(()=>a.focus(),50)}a()}var ct={w:612,h:792};function lt(e){return Array.from({length:e},(e,t)=>({from:t,rotate:0}))}function ut(e,t,n){let r=lt(e);if(n<0||n>=e||t===n)return r;let[i]=r.splice(t,1);return r.splice(n,0,i),r}function dt(e,t){return lt(e).filter(e=>e.from!==t)}function ft(e,t,n=1){return lt(e).map(e=>e.from===t?{...e,rotate:(n*90%360+360)%360}:e)}function pt(e,t){let n=(Math.round(t/90)*90%360+360)%360,{x:r,y:i,w:a,h:o}=e;return n===90?{x:1-i-o,y:r,w:o,h:a}:n===180?{x:1-r-a,y:1-i-o,w:a,h:o}:n===270?{x:i,y:1-r-a,w:o,h:a}:{x:r,y:i,w:a,h:o}}function mt(e,t){let n=new Map;return t.forEach((e,t)=>n.set(e.from,{index:t,rotate:e.rotate||0})),(e||[]).flatMap(e=>{let t=n.get(e.page);if(!t)return[];let r=pt(e,t.rotate);return[{...e,...r,page:t.index}]})}function ht(e,t){let n=new Set(t.map(e=>e.from));return(e||[]).filter(e=>!n.has(e.page)).length}async function gt(){return W(()=>import(`./flatten-DqhnUhsA.js`).then(e=>e.r),__vite__mapDeps([1,2,3,4]),import.meta.url)}async function _t(e,t){let{PDFDocument:n,degrees:r}=await gt(),i=await n.load(e,{ignoreEncryption:!0}),a=await n.create();return(await a.copyPages(i,t.map(e=>e.from))).forEach((e,n)=>{let i=t[n].rotate||0;i&&e.setRotation(r((e.getRotation().angle+i)%360)),a.addPage(e)}),{bytes:await a.save(),pageCount:a.getPageCount()}}var vt=/^image\/(png|jpeg|jpg)$/i;async function yt(e){if(typeof createImageBitmap!=`function`||typeof document>`u`)return null;let t=await createImageBitmap(e),n=document.createElement(`canvas`);n.width=t.width,n.height=t.height,n.getContext(`2d`).drawImage(t,0,0),t.close?.();let r=await new Promise(e=>n.toBlob(e,`image/png`));return r?new Uint8Array(await r.arrayBuffer()):null}async function bt(e,t){let n=e.addPage([ct.w,ct.h]),r={w:ct.w-48,h:ct.h-48},i=Math.min(r.w/t.width,r.h/t.height,1),a=t.width*i,o=t.height*i;n.drawImage(t,{x:(ct.w-a)/2,y:(ct.h-o)/2,width:a,height:o})}async function xt(e,{onto:t=null,transcode:n=yt}={}){let{PDFDocument:r}=await gt(),i=await r.create();if(t){let e=await r.load(t,{ignoreEncryption:!0}),n=await i.copyPages(e,e.getPageIndices());for(let e of n)i.addPage(e)}for(let t of e){let e=t.name||`that file`;if(/^application\/pdf$/i.test(t.type||``)||/\.pdf$/i.test(e)){let n;try{n=await r.load(t.bytes,{ignoreEncryption:!0})}catch{throw Error(`${e} is not a readable PDF.`)}if(!n.getPageCount())throw Error(`${e} has no pages.`);let a=await i.copyPages(n,n.getPageIndices());for(let e of a)i.addPage(e);continue}let a=null;try{if(vt.test(t.type||``)||/\.(png|jpe?g)$/i.test(e))a=/png/i.test(t.type||``)||/\.png$/i.test(e)?await i.embedPng(t.bytes):await i.embedJpg(t.bytes);else{let e=t.file&&n?await n(t.file):null;if(!e)throw Error(`undecodable`);a=await i.embedPng(e)}}catch{throw Error(`${e} could not be read. Try a PDF, JPEG, or PNG.`)}await bt(i,a)}let a=i.getPageCount();if(!a)throw Error(`Nothing to build a document from.`);return{bytes:await i.save(),pageCount:a}}async function St(e){let{PDFDocument:t}=await gt();return(await t.load(e,{ignoreEncryption:!0})).getPageCount()}var Ct=26214400,wt=e=>e.type===`application/pdf`||/\.pdf$/i.test(e.name),Tt=e=>/^image\//i.test(e.type)||/\.(png|jpe?g|heic|heif|webp|avif)$/i.test(e.name);function Et({onChange:e=()=>{}}={}){let t=[],n=z(`div.file-list`);function r(){return t.reduce((e,t)=>e+(t.pages||0),0)}function i(){if(!t.length)return``;let e=t.find(e=>e.error);return e?e.error:t.some(e=>e.pages===null)?`Still reading…`:r()>200?`That is ${r()} pages. The limit is 200 in one document.`:``}function a(){H(n);for(let[r,i]of t.entries()){let s=i.error?i.error:[i.pages===null?`Reading…`:`${i.pages} page${i.pages===1?``:`s`}`,ke(i.file.size)].filter(Boolean).join(` · `);n.append(z(`div.file-row`,{className:`file-row${i.error?` bad`:``}`},z(`span.file-icon`,{html:N(i.error?`triangleAlert`:wt(i.file)?`fileText`:`images`,17)}),z(`div.grow`,{},z(`div.file-name`,{title:i.name},i.name),z(`div.file-meta`,{},s)),t.length>1&&z(`div.order-arrows`,{},z(`button.icon-btn.order-up`,{type:`button`,html:N(`chevD`,15),disabled:r===0,title:`Move up`,"aria-label":`Move ${i.name} earlier`,onclick:()=>o(r,-1)}),z(`button.icon-btn.order-down`,{type:`button`,html:N(`chevD`,15),disabled:r===t.length-1,title:`Move down`,"aria-label":`Move ${i.name} later`,onclick:()=>o(r,1)})),z(`button.icon-btn`,{type:`button`,html:N(`x`,16),title:`Remove`,"aria-label":`Remove ${i.name}`,onclick:()=>{t.splice(r,1),a(),e()}})))}t.length>1&&n.append(z(`p.small.faint`,{style:{marginTop:`8px`}},`Merged in this order into one document${r()?`, ${r()} pages in all`:``}.`))}function o(r,i){let o=r+i;if(o<0||o>=t.length)return;let[s]=t.splice(r,1);t.splice(o,0,s),a(),e();let c=n.querySelectorAll(`.file-row`),l=c[o]?.querySelector(i<0?`.order-up`:`.order-down`),u=c[o]?.querySelector(i<0?`.order-down`:`.order-up`);(l&&!l.disabled?l:u)?.focus()}async function s(n){let r=[];for(let e of[...n]){if(!wt(e)&&!Tt(e)){r.push({file:e,name:e.name,type:e.type,bytes:null,pages:0,error:`Not a PDF or an image.`});continue}if(e.size>26214400){r.push({file:e,name:e.name,type:e.type,bytes:null,pages:0,error:`${ke(e.size)} is over the ${ke(Ct)} limit.`});continue}r.push({file:e,name:e.name,type:e.type,bytes:null,pages:null,error:``})}t.push(...r),a(),e();for(let t of r)if(!t.error){try{t.bytes=new Uint8Array(await t.file.arrayBuffer()),t.pages=wt(t.file)?await St(t.bytes):1,t.pages||(t.error=`That PDF has no pages.`)}catch{t.error=wt(t.file)?`Not a readable PDF.`:`This image could not be read. Try a JPEG or PNG.`,t.pages=0}a(),e()}}return a(),n.items=t,n.add=s,n.totalPages=r,n.problem=i,n.ready=()=>t.length>0&&!i(),n.payload=()=>t.map(({file:e,name:t,type:n,bytes:r})=>({file:e,name:t,type:n,bytes:r})),n}async function Dt(e){if(!e.fields.length)return i(`Place at least one field first, then save the layout as a template`,{icon:`circleAlert`,duration:4500}),null;let t=await b({title:`Save as template`,label:`Template name`,value:e.title||``,placeholder:`e.g. Standard NDA`,confirmLabel:`Save template`,hint:`Saves this PDF and its ${e.fields.length} field${e.fields.length===1?``:`s`}. Signers become roles you fill in each time.`});if(!t)return null;try{let n=await Z.saveTemplateFromDoc(e,{name:t}),r=Z.getDoc(e.id);return r&&(Z.addAudit(r,`template_saved`,n.name),await Z.persistDoc(r).catch(()=>{})),i(`Saved as template "${n.name}"`,{icon:`template`}),n}catch(e){return console.error(e),i(`Could not save the template. Check your connection`,{icon:`wifiOff`}),null}}function Ot(e,{navigate:t}){let n=L(`tpltitle`),r=z(`input.input`,{id:n,type:`text`,maxLength:200,value:e.name,placeholder:`Document title`}),a={},o=(e.roles||[]).map((t,n)=>{let r=L(`rn`),i=L(`re`),o=L(`ree`),s=(e.fields||[]).filter(e=>e.roleId===t.id).length,c=t.isMe?Z.settings.fullName||Z.user?.username||`Me`:``,l=t.isMe&&Z.user?.email||``;a[t.id]={name:c,email:l};let u=z(`p.field-error`,{id:o,hidden:!0},`Enter a valid email address, like alex@example.com`),d=z(`input.input`,{id:i,type:`email`,maxLength:254,value:l,placeholder:`email@example.com`,disabled:t.isMe,oninput:e=>{a[t.id].email=e.target.value.trim(),(!e.target.value||J(e.target.value))&&f(!1)},onblur:e=>f(!!e.target.value&&!J(e.target.value))});function f(e){u.hidden=!e,e?(d.setAttribute(`aria-invalid`,`true`),d.setAttribute(`aria-describedby`,o),d.style.borderColor=`var(--danger)`):(d.removeAttribute(`aria-invalid`),d.removeAttribute(`aria-describedby`),d.style.borderColor=``)}return z(`div.role-row`,{},z(`div.role-head`,{},z(`span.recipient-dot`,{className:`recipient-dot c${n%6+1}`,"aria-hidden":`true`}),z(`span.role-name`,{},t.label),z(`span.small.faint`,{},`${s} field${s===1?``:`s`}`)),z(`div.role-inputs`,{},z(`div.field`,{style:{margin:`0`}},z(`label`,{for:r},t.isMe?`Your name`:`Full name`),z(`input.input`,{id:r,type:`text`,maxLength:100,value:c,placeholder:t.isMe?`Your name`:`Full name`,oninput:e=>{a[t.id].name=e.target.value}})),z(`div.field`,{style:{margin:`0`}},z(`label`,{for:i},`Email`),d,u,t.isMe&&z(`span.small.faint`,{},`You sign in this app, no email needed`))))}),s=z(`p.small.faint`,{style:{margin:`10px 0 0`},"aria-live":`polite`}),c=z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{padding:`12px`,marginTop:`16px`},html:N(`filePlus`,16,2)},` Create draft`),l=z(`div`);F(l,[z(`p.small.muted`,{style:{margin:`0 0 14px`}},`${e.pageCount} page${e.pageCount===1?``:`s`} · ${(e.fields||[]).length} field${(e.fields||[]).length===1?``:`s`} already placed`),z(`div.field`,{},z(`label`,{for:n},`Document title`),r),(e.roles||[]).length?z(`div`,{},z(`div.card-title`,{},`Who signs this time`),o):z(`p.small.muted`,{},`This template has no roles yet. Add signers in the editor.`),c,s]);let u=G({title:`New from template`,content:l});c.addEventListener(`click`,async()=>{c.disabled=!0,s.textContent=`Creating your draft…`;try{let n=await Z.createDocFromTemplate(e.id,{title:r.value.trim()||e.name,roleValues:a});u.close(),i(`Draft ready. Everything is already placed`,{icon:`check`}),t(`#/doc/${n.id}/edit`)}catch(e){console.error(e),s.textContent=``,i(`Could not create the draft. Check your connection`,{icon:`wifiOff`}),c.disabled=!1}})}function kt({navigate:e,manage:t=!1,onClose:n=null,limit:r=0,onEmpty:a=null}){let o=z(`div.tpl-list`);function s(){H(o);let s=Z.listTemplates();if(r&&(s=s.slice(0,r)),!s.length){a&&o.append(a());return}for(let r of s){let a=[`${r.pageCount} page${r.pageCount===1?``:`s`}`],s=(r.fields||[]).length;a.push(`${s} field${s===1?``:`s`}`),r.useCount?a.push(`used ${r.useCount}×`):r.updatedAt&&a.push(`saved ${we(r.updatedAt)}`),o.append(z(`div.tpl-row`,{},z(`button.tpl-use`,{type:`button`,"aria-label":`New document from template ${r.name}`,onclick:()=>{n?.(),Ot(r,{navigate:e})}},z(`span.tpl-icon`,{html:N(`template`,19)}),z(`span.grow`,{},z(`span.tpl-name`,{},r.name),z(`span.tpl-meta`,{},a.join(` · `))),z(`span.tpl-go`,{html:N(`chevR`,17)})),t&&z(`div.tpl-acts`,{},z(`button.icon-btn`,{type:`button`,html:N(`pencil`,16),title:`Rename`,"aria-label":`Rename template ${r.name}`,onclick:async()=>{let e=await b({title:`Rename template`,label:`Template name`,value:r.name,confirmLabel:`Rename`});!e||e===r.name||await Z.patchTemplate(r.id,{name:e}).catch(()=>i(`Could not rename. Check your connection`,{icon:`wifiOff`}))}}),z(`button.icon-btn`,{type:`button`,html:N(`trash`,16),title:`Delete`,"aria-label":`Delete template ${r.name}`,onclick:async()=>{if(await j({title:`Delete this template?`,message:`"${r.name}" and its saved layout are removed. Documents already created from it are not affected.`,confirmLabel:`Delete template`}))try{await Z.deleteTemplate(r.id),i(`Template deleted`,{icon:`trash`})}catch{i(`Could not delete it. Check your connection`,{icon:`wifiOff`})}}}))))}}s();let c=()=>s();return Z.addEventListener(`change`,c),o.destroy=()=>Z.removeEventListener(`change`,c),o}function At({navigate:e}){let t=null,n=z(`div`),r=G({title:`Templates`,content:n,onClose:()=>t?.destroy?.()});t=kt({navigate:e,manage:!0,onClose:()=>r.close(),onEmpty:()=>z(`div.empty`,{style:{padding:`24px 8px`}},z(`div.empty-icon`,{html:N(`template`,24)}),z(`h3`,{},`No templates yet`),z(`p`,{},`Open a document you send often and choose "Save as template" to reuse its field layout.`))}),n.append(t)}function jt(e){return String(e||``).replace(/\.[a-z0-9]+$/i,``).replace(/[-_]+/g,` `).trim().slice(0,200)||`Untitled document`}function Mt({navigate:e}){let t=z(`input`,{type:`file`,accept:`application/pdf,.pdf,image/*`,multiple:!0,className:`visually-hidden`,onchange:()=>{t.files?.length&&n.add(t.files),t.value=``}}),n=Et({onChange:()=>c()}),r=z(`button.dropzone`,{type:`button`,onclick:()=>t.click()},z(`span`,{html:N(`cloudUpload`,30)}),z(`span.dz-title`,{},`Choose files or drop them here`),z(`span.dz-sub`,{},`PDFs and images, up to ${ke(Ct)} each. They are uploaded to your own Puter cloud.`));O(r,(e,t)=>n.add(t||[e]));let a=z(`p.small.faint`,{style:{marginTop:`12px`,textAlign:`center`},"aria-live":`polite`}),o=z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{padding:`12px`,marginTop:`14px`},html:N(`filePlus`,16,2),onclick:()=>m()},` Create document`),s=z(`div`);function c(){if(H(s),!n.items.length)return;let e=n.problem();F(s,[z(`button.btn.btn-soft.btn-block`,{type:`button`,style:{marginTop:`10px`},html:N(`plus`,15,2.2),onclick:()=>t.click()},` Add another file`),o,e&&e!==`Still reading…`?z(`p.field-error`,{style:{textAlign:`center`}},e):null]),o.disabled=!n.ready(),o.textContent=``,o.innerHTML=N(`filePlus`,16,2);let r=n.totalPages();o.append(n.items.length>1?` Merge ${n.items.length} files${r?` · ${r} pages`:``}`:` Create document`)}let l=Z.listTemplates(),u=z(`div`),d=null;l.length&&(d=kt({navigate:e,limit:5,onClose:()=>f.close()}),F(u,[z(`div.card-title`,{style:{marginBottom:`8px`}},`Start from a template`),d,l.length>5&&z(`button.btn.btn-ghost.btn-sm`,{type:`button`,style:{marginTop:`10px`},onclick:()=>{f.close(),At({navigate:e})}},`All ${l.length} templates`),z(`div.or-rule`,{"aria-hidden":`true`},z(`span`,{},`or upload files`))])),F(u,[r,t,n,s,a]);let f=G({title:`New document`,content:u,onClose:()=>d?.destroy?.()}),p=!1;async function m(){if(p||!n.ready())return;p=!0,r.disabled=!0,o.disabled=!0;let t=n.payload();a.textContent=t.length>1?`Merging ${t.length} files…`:`Uploading ${t[0].name}…`;try{let{bytes:n,pageCount:r}=await xt(t),i=await Z.createDoc({title:jt(t[0].name),fileName:t.length>1?`document.pdf`:t[0].name,pdfBytes:n,pageCount:r,origin:t.length>1?{type:`merged`,detail:t.map(e=>e.name).join(`, `)}:null});f.close(),e(`#/doc/${i.id}/edit`)}catch(e){console.error(e),a.textContent=``,i(e.message||`Could not build that document`,{icon:`triangleAlert`,duration:5e3}),p=!1,r.disabled=!1,c()}}}function Nt(e,t){let n=new Blob([e],{type:`application/pdf`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=t,document.body.append(i),i.click(),i.remove(),setTimeout(()=>URL.revokeObjectURL(r),3e4)}function Pt(e){return(e.title||`document`).replace(/[\\/:*?"<>|]+/g,` `).trim().slice(0,80)||`document`}async function Ft(e){Nt(await Z.readPdf(e.id),`${Pt(e)}.pdf`)}async function It(e){if(e.status===`completed`){let t=await Z.readSignedPdf(e.id);if(t){Nt(t,`${Pt(e)} (signed).pdf`);return}}Nt(await Lt(e),`${Pt(e)} (signed).pdf`)}async function Lt(t){let[n,r]=await Promise.all([Z.readPdf(t.id),Z.readSigData(t.id)]),i=await e(n,t,r,{certificate:t.status===`completed`});return t.status===`completed`&&await Z.writeSignedPdf(t.id,i).catch(()=>{}),i}async function Rt(e,{navigate:t}={}){try{let n=await Z.duplicateDoc(e.id);return i(`Copied to "${n.title}"`,{icon:`copy`}),t?.(`#/doc/${n.id}/edit`),n}catch(e){return console.error(e),i(`Could not duplicate that document. Check your connection`,{icon:`wifiOff`}),null}}async function zt(e,t){let n=t.hasCode===!0,r=await b({title:n?`New access code for ${t.name||t.email}`:`Access code for ${t.name||t.email}`,label:`Access code`,value:Ae(),confirmLabel:n?`Replace code`:`Require this code`,hint:n?`The old code stops working immediately and any lockout is cleared. The sign link itself keeps working.`:`Share it by phone or in person. The signer needs it before the document opens.`});if(!r)return!1;if(Se(r).length<4)return i(`An access code needs at least 4 characters`,{icon:`circleAlert`}),!1;try{let n=await Q.syncDoc(e,{codes:{[t.id]:r}}),a=Z.getDoc(e.id),o=a.signers.find(e=>e.id===t.id);o&&(o.hasCode=!0),Z.addAudit(a,`code_set`,t.name||t.email),await Z.patchDoc(e.id,{links:n});let s=Se(r);return await K({sticky:!0,title:`Share this code`,message:`${t.name||t.email} needs this code to open the document. It is not shown again.`,extra:z(`div.code-row.given`,{},z(`code.code-value.grow`,{},s),z(`button.icon-btn`,{type:`button`,html:N(`clipboard`,16),title:`Copy code`,"aria-label":`Copy the access code`,onclick:async()=>{try{await navigator.clipboard.writeText(s),i(`Code copied`,{icon:`clipboard`})}catch{i(`Could not copy. Select the code and copy it by hand`,{icon:`triangleAlert`})}}}))}),!0}catch{return i(`Could not reach the signing service. Check your connection`,{icon:`wifiOff`}),!1}}async function Bt(e,t){if(!await j({title:`Remove the access code?`,message:`${t.name||t.email} will be able to open the document with their link alone.`,confirmLabel:`Remove code`}))return!1;try{let n=await Q.syncDoc(e,{codes:{[t.id]:null}}),r=Z.getDoc(e.id),a=r.signers.find(e=>e.id===t.id);return a&&(a.hasCode=!1),Z.addAudit(r,`code_cleared`,t.name||t.email),await Z.patchDoc(e.id,{links:n}),i(`Access code removed`,{icon:`check`}),!0}catch{return i(`Could not reach the signing service. Check your connection`,{icon:`wifiOff`}),!1}}async function Vt(e,t){let n=(e.links||{})[t.id];if(!n){i(`No link yet. Send the document first`,{icon:`info`});return}try{await navigator.clipboard.writeText(n)}catch{i(`Could not copy. Your browser blocked clipboard access`,{icon:`triangleAlert`});return}i(`Sign link for ${t.name||t.email} copied`,{icon:`link`})}async function Ht(e,t){try{let{message:n,icon:r}=Ze(await $.send(e,{signerIds:[t.id],kind:`reminder`,force:!0}));i(n,{icon:r})}catch(e){i(e.message||`Could not send the reminder`,{icon:`triangleAlert`})}}async function Ut(e){try{await Lt(e)}catch(e){console.error(e)}if(Wt(e)&&$.available()&&!e.sample)try{let t=await Q.syncDoc(e);await Z.patchDoc(e.id,{links:t}),await $.send(e,{kind:`completed`})}catch{}}function Wt(e){return t(e)===`email`}async function Gt(e){if(!e||e.signOrder!==!0||e.status!==`sent`||e.sample)return;let t=u(e);if(!t||t.isMe||(e.signers[0]||{}).id===t.id||(e.turnOpened||{})[t.id])return;let n=t.name||t.email||`The next signer`,r=async()=>{let r=Z.getDoc(e.id);r&&(r.turnOpened={...r.turnOpened||{},[t.id]:Date.now()},Z.addAudit(r,`turn_opened`,n),await Z.persistDoc(r))};if(Wt(e)){if(!$.available())return;try{let a=await $.send(e,{kind:`request`,signerIds:[t.id]});a&&a.sent&&(await r(),i(`${n} has been asked to sign`,{icon:`mailCheck`}))}catch{}return}await r(),i(`It is ${n}'s turn. Share their sign link from the document page`,{icon:`link`,duration:6e3})}function Kt(e,t={}){let n=Z.settings,r=e.ownerNotified||{},i=[],a=(e,n,a)=>{n&&(t[e]&&t[e].ok||r[e]||i.push({key:e,...a}))};for(let t of e.signers||[]){let e=t.name||t.email||`A signer`;t.isMe||(t.status===`signed`&&a(`sign:${t.id}`,n.notifySign===!0,{type:`signed`,who:e,at:t.signedAt||Date.now()}),t.status===`declined`&&a(`decline:${t.id}`,n.notifyDecline!==!1,{type:`declined`,who:e,at:t.declinedAt||Date.now()}))}return e.status===`completed`&&a(`complete:-`,n.notifyComplete!==!1,{type:`completed`,who:``,at:e.completedAt||Date.now()}),i}async function qt(e,t){let n=Kt(e,t);if(!n.length||e.sample||!$.available())return;let r;try{r=await $.notifyOwner(e,n.map(({key:e,...t})=>t))}catch{return}if(!r||!r.sent)return;let i={...e.ownerNotified||{}};for(let e of n)i[e.key]={at:Date.now(),via:`app`};let a=Z.getDoc(e.id);a&&(Z.addAudit(a,`owner_notified`,`${n.length} event${n.length===1?``:`s`}`),await Z.patchDoc(e.id,{ownerNotified:i}))}async function Jt(){for(let e of Z.listDocs()){if(e.sample)continue;if(e.status===`sent`&&f(e)){await Z.markExpired(e.id).catch(()=>{}),i(`"${e.title}" expired. Extend it to reopen the links`,{icon:`hourglass`,duration:5e3});continue}let t=v(e);if(!(!t||!$.available()))try{let n=await $.send(e,{kind:`reminder`,force:!0});n&&n.sent&&(await Z.markReminded(e.id,{preExpiry:t===`expiry`}),i(`Reminder sent to ${n.sent} signer${n.sent===1?``:`s`} for "${e.title}"`,{icon:`bell`}))}catch{}}}async function Yt(e,t){let n=Math.max(Date.now(),e.expiresAt||0),r=t?Te(t,n):null;if(!e.sample&&Object.keys(e.links||{}).length)try{let t=await Q.syncDoc({...e,expiresAt:r||0});await Z.patchDoc(e.id,{links:t})}catch{return i(`Could not reach the signing service, so the deadline is unchanged. Check your connection and try again`,{icon:`wifiOff`,duration:5e3}),!1}return await Z.setExpiry(e.id,r),i(t?`Deadline extended`:`Expiry removed`,{icon:`check`}),!0}async function Xt(e){for(let t of e||[]){let e=Z.getDoc(t.docId);if(e){if(t.completedNow?(i(`"${e.title}" is fully signed`,{icon:`circleCheckBig`}),await Ut(e)):e.signOrder&&e.status===`sent`&&await Gt(e),t.declinedNow){let t=e.signers.find(e=>e.status===`declined`);i(`${t?.name||`A signer`} declined "${e.title}"`,{icon:`circleX`,duration:5e3})}await qt(Z.getDoc(t.docId),t.notified)}}}async function Zt(e){if(!await j({title:`Void this document?`,message:`Every sign link stops working immediately and signers can no longer respond. This cannot be undone.`,confirmLabel:`Void document`}))return!1;try{e.sample||await Q.voidDoc(e.id)}catch{return i(`Could not reach the signing service. Check your connection`,{icon:`wifiOff`}),!1}return await Z.voidDoc(e.id),i(`Document voided`,{icon:`ban`}),!0}async function Qt(e){if(!await j({title:`Delete this document?`,message:e.status===`sent`?`The document, its sign links, and everything signers submitted are permanently removed.`:`The document and its file are permanently removed.`,confirmLabel:`Delete`}))return!1;try{!e.sample&&e.status!==`draft`&&await Q.revokeDoc(e.id)}catch{return i(`Could not reach the signing service. The document was not deleted. Check your connection and try again`,{icon:`wifiOff`,duration:5e3}),!1}return await Z.deleteDoc(e.id),i(`Document deleted`,{icon:`trash`}),!0}var $t=[{id:`all`,label:`All`},{id:`draft`,label:`Drafts`},{id:`sent`,label:`Out for signature`},{id:`waiting`,label:`Waiting for you`},{id:`completed`,label:`Completed`},{id:`closed`,label:`Closed`}],en=[{id:`sent`,label:`Out for signature`,icon:`send`,count:e=>e.filter(e=>e.status===`sent`).length},{id:`waiting`,label:`Waiting for you`,icon:`penLine`,count:e=>e.filter(tn).length},{id:`completed`,label:`Completed`,icon:`circleCheckBig`,count:e=>e.filter(e=>e.status===`completed`).length}];function tn(e){return e.status===`sent`&&(e.signers||[]).some(t=>t.isMe&&t.status!==`signed`&&t.status!==`declined`&&d(e,t.id))}function nn({navigate:e}){let t=`all`,n=``,r=null,a=z(`div`),o=z(`p.visually-hidden`,{role:`status`,"aria-live":`polite`}),s=z(`div.stats-row`),c=z(`div.filter-row`,{role:`group`,"aria-label":`Filter documents`}),l=z(`input.input`,{type:`search`,placeholder:`Search by title or signer`,"aria-label":`Search documents`,oninput:()=>{n=l.value.trim().toLowerCase(),D()}}),d=z(`div.main-inner`,{},z(`div.view-head`,{},z(`h1`,{},`Documents`),z(`button.btn.btn-primary`,{type:`button`,html:N(`plus`,16,2.4),onclick:()=>Mt({navigate:e})},` New document`)),s,z(`div.search-wrap`,{html:N(`search`,17)},l),c,o,a);function p(e){return t===`draft`&&e.status!==`draft`||t===`sent`&&e.status!==`sent`||t===`waiting`&&!tn(e)||t===`completed`&&e.status!==`completed`||t===`closed`&&![`declined`,`voided`,`expired`].includes(e.status)?!1:!n||[e.title,...(e.signers||[]).flatMap(e=>[e.name,e.email])].join(` `).toLowerCase().includes(n)}let m=new Map,h=new Map;function g(){H(s),m.clear();for(let e of en){let t=z(`button.stat-tile`,{type:`button`,onclick:()=>b(e.id)},z(`div.num`,{},`0`),z(`div.lbl`,{html:N(e.icon,13,2)},z(`span`,{},e.label)));m.set(e.id,t),s.append(t)}v(),y()}function _(){H(c),h.clear();for(let e of $t){let t=z(`button.filter-chip`,{type:`button`,onclick:()=>b(e.id)},e.label);h.set(e.id,t),c.append(t)}y()}function v(){let e=Z.listDocs();for(let t of en){let n=m.get(t.id)?.querySelector(`.num`);n&&(n.textContent=String(t.count(e)))}}function y(){for(let[e,n]of m)n.setAttribute(`aria-pressed`,t===e?`true`:`false`);for(let[e,n]of h)n.setAttribute(`aria-pressed`,t===e?`true`:`false`)}function b(e){t=e,y(),D()}function x(e){if(r=e,D(),!e)return;let t=a.querySelector(`.menu`);if(t){let e=document.querySelector(`.tabbar`),n=window.innerHeight-(e?.getBoundingClientRect().height||0)-8,r=t.getBoundingClientRect(),i=(t.parentElement.querySelector(`[data-menu-for]`)?.getBoundingClientRect().top||0)-8;r.bottom>n&&i>r.height+6&&t.classList.add(`up`)}t?.querySelector(`.menu-item`)?.focus()}function C({refocus:e=!1}={}){if(!r)return;let t=r;r=null,a.querySelector(`.menu`)?.remove();let n=a.querySelector(`[data-menu-for="${t}"]`);n?.setAttribute(`aria-expanded`,`false`),e&&n?.focus()}function w(t){let n=z(`div.menu-wrap`),a=z(`button.icon-btn`,{type:`button`,html:N(`more`,18),dataset:{menuFor:t.id},"aria-label":`Actions for ${t.title}`,"aria-haspopup":`menu`,"aria-expanded":r===t.id?`true`:`false`,onclick:e=>{e.stopPropagation(),r===t.id?C({refocus:!0}):x(t.id)}});if(n.append(a),n.addEventListener(`keydown`,e=>{if(r!==t.id)return;let i=[...n.querySelectorAll(`.menu-item`)],a=i.indexOf(document.activeElement);e.key===`Escape`?(e.preventDefault(),e.stopPropagation(),C({refocus:!0})):e.key===`ArrowDown`?(e.preventDefault(),i[(a+1)%i.length]?.focus()):e.key===`ArrowUp`?(e.preventDefault(),i[(a-1+i.length)%i.length]?.focus()):e.key===`Home`?(e.preventDefault(),i[0]?.focus()):e.key===`End`&&(e.preventDefault(),i[i.length-1]?.focus())}),n.addEventListener(`focusout`,e=>{r===t.id&&!n.contains(e.relatedTarget)&&C()}),r===t.id){let r=(e,t,n,r=!1)=>z(`button.menu-item${r?`.danger`:``}`,{type:`button`,role:`menuitem`,html:N(e,16,2),onclick:e=>{e.stopPropagation(),C({refocus:!0}),n()}},z(`span`,{},t)),{signed:a}=le(t),o=z(`div.menu`,{role:`menu`,"aria-label":`Actions for ${t.title}`},r(`eye`,`Open`,()=>T(t)),(t.status===`completed`||t.status===`sent`&&a>0)&&r(`fileDown`,t.status===`completed`?`Download signed copy`:`Download progress copy`,()=>It(t).catch(()=>i(`Could not build the download`,{icon:`triangleAlert`}))),r(`download`,`Download original`,()=>Ft(t).catch(()=>i(`Could not download the file`,{icon:`triangleAlert`}))),z(`div.menu-sep`),r(`copy`,`Duplicate`,()=>Rt(t,{navigate:e})),r(`template`,`Save as template`,()=>Dt(t)),z(`div.menu-sep`),(t.status===`sent`||t.status===`expired`)&&r(`ban`,`Void`,()=>Zt(t),!0),r(`trash`,`Delete`,()=>Qt(t),!0));n.append(o)}return n}function T(t){e(t.status===`draft`?`#/doc/${t.id}/edit`:`#/doc/${t.id}`)}function E(e){let t=ye(e.status),{signed:n,total:r}=le(e),i=[];e.status===`draft`?i.push(`${e.pageCount} page${e.pageCount===1?``:`s`}`):r&&i.push(`${n} of ${r} signed`);let a=e.status===`sent`?u(e):null;a&&i.push(`waiting on ${a.isMe?`you`:a.name||a.email||`the next signer`}`),e.status===`sent`&&e.expiresAt&&i.push(f(e)?`expired`:`expires ${S(e)}`),i.push(`Updated ${we(e.updatedAt)}`);let o=z(`div.doc-row`,{role:`button`,tabindex:0,"aria-label":`${e.title}, ${t.label}`,onclick:()=>T(e),onkeydown:t=>{t.target===o&&(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),T(e))}},z(`span.doc-row-icon`,{html:N(e.status===`completed`?`fileCheck`:e.status===`draft`?`filePen`:`fileText`,21)}),z(`div.grow`,{},z(`div.doc-row-title`,{},e.title),z(`div.doc-row-meta`,{},i.join(` · `))),z(`div.doc-row-side`,{},r>0&&z(`span.avatar-stack`,{"aria-hidden":`true`},e.signers.slice(0,4).map(t=>z(`span.avatar.c${U(t,e.signers)}`,{title:t.name||t.email},Ee(t.name||t.email)))),z(`span.chip.${t.tone}`,{html:N(t.icon,13,2.2)},z(`span`,{},t.label)),w(e)));return o}function D(){H(a);let t=Z.listDocs().filter(p);if(o.textContent=t.length?`${t.length} document${t.length===1?``:`s`}`:`No documents match`,!t.length){let t=Z.listDocs().length===0;a.append(z(`div.empty`,{},z(`div.empty-icon`,{html:N(t?`filePlus`:`search`,26)}),z(`h3`,{},t?`No documents yet`:`Nothing matches`),z(`p`,{},t?`Upload a PDF to place signature fields and send it out for signature.`:`Try a different search or filter.`),t&&z(`button.btn.btn-primary`,{type:`button`,style:{marginTop:`18px`},onclick:()=>Mt({navigate:e})},`Upload a PDF`)));return}let n=z(`ul.doc-list`);for(let e of t)n.append(z(`li`,{},E(e)));a.append(n)}let O=()=>{v(),D()};Z.addEventListener(`change`,O);let k=e=>{r&&!e.target.closest?.(`.menu-wrap`)&&C()};return document.addEventListener(`click`,k),g(),_(),D(),d.destroy=()=>{Z.removeEventListener(`change`,O),document.removeEventListener(`click`,k)},d}function rn(e,t){return e.status===`sent`&&!e.sample&&!t.isMe&&t.status!==`signed`&&t.status!==`declined`}function an(e,t){let n=String(e||``).trim();return n&&t?`${n} <${t}>`:n||t||`a signer`}function on(e,t,{onDone:n=()=>{}}={}){let r=L(`cn`),a=L(`ce`),o=L(`cr`),s=L(`cm`),c=L(`cee`),l={name:t.name||``,email:t.email||``},u=z(`p.field-error`,{id:c,hidden:!0},`Enter a valid email address, like alex@example.com`),d=z(`input.input`,{id:r,type:`text`,maxLength:100,value:l.name,placeholder:`Full name`}),f=z(`input.input`,{id:a,type:`email`,maxLength:254,value:l.email,placeholder:`email@example.com`}),p=z(`input`,{type:`checkbox`,id:o,checked:!1}),m=z(`p.small.faint`,{style:{margin:`4px 0 0 26px`}}),h=$.available()&&!e.sample,g=z(`input`,{type:`checkbox`,id:s,checked:h,disabled:!h}),_=!1;p.addEventListener(`change`,()=>{_=!0,y()});function v(){return J(f.value)!==J(l.email)}function y(){_||(p.checked=v()),m.textContent=p.checked?`The link already sent stops working immediately, and a new one is minted.`:`They keep the link they already have.`}f.addEventListener(`input`,()=>{u.hidden=!f.value||!!J(f.value),y()}),y();let b=z(`p.small.faint`,{style:{margin:`10px 0 0`},"aria-live":`polite`}),x=z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{padding:`12px`,marginTop:`16px`},html:N(`check`,16,2.2)},` Save correction`),S=z(`div`);F(S,[z(`p.modal-message`,{},`Fix a name or an address, or put a different person in this signer's place. Their fields and position on the document stay exactly as they are.`),z(`div.field`,{},z(`label`,{for:r},`Name`),d),z(`div.field`,{},z(`label`,{for:a},`Email`),f,u),z(`div`,{style:{marginBottom:`12px`}},z(`label.check-row`,{for:o},p,`Reissue their sign link`),m),z(`label.check-row`,{for:s},g,h?`Email them the request now`:`Email is unavailable. Copy their link from this page instead`),t.hasCode&&z(`p.small.faint`,{style:{marginTop:`10px`}},`Their access code is unchanged. If someone else is taking their place, replace the code from the signer row so the old one is no use.`),x,b]);let C=G({title:`Correct signer`,content:S});x.addEventListener(`click`,async()=>{let r=d.value.trim(),a=J(f.value);if(f.value&&!a){u.hidden=!1,f.focus();return}if(!a){i(`A signer needs an email address to receive their link`,{icon:`circleAlert`}),f.focus();return}let o=e.signers.find(e=>e.id!==t.id&&J(e.email)===a);if(o){i(`${o.name||a} already has that address on this document`,{icon:`circleAlert`,duration:4e3}),f.focus();return}let s=r!==l.name||a!==J(l.email);if(!s&&!p.checked){C.close();return}x.disabled=!0,d.disabled=!0,f.disabled=!0,b.textContent=p.checked?`Reissuing their link…`:`Saving…`;try{let o=Z.getDoc(e.id),c=o.signers.find(e=>e.id===t.id);if(!c)throw Error(`signer_gone`);let u={...o,signers:o.signers.map(e=>e.id===t.id?{...e,name:r,email:a}:e)},d=await Q.syncDoc(u,{reissue:p.checked?[t.id]:[]});c.name=r,c.email=a,o.links=d;let f={...o.emailed||{}};for(let e of Object.keys(f))e.startsWith(`${t.id}:`)&&delete f[e];o.emailed=f,s&&Z.addAudit(o,`corrected`,`${an(l.name,l.email)} to ${an(r,a)}`),p.checked&&(c.status=`pending`,delete c.viewedAt,delete c.consentAt,delete c.consentVersion,delete c.evidence,delete c.codeSeen,Z.addAudit(o,`link_reissued`,an(r,a))),await Z.persistDoc(o);let m=null;if(g.checked&&h){b.textContent=`Sending the request…`;try{m=await $.send(Z.getDoc(e.id),{signerIds:[t.id],kind:`request`,force:!0})}catch(e){i(e.message||`Corrected, but the email could not be sent`,{icon:`triangleAlert`,duration:5e3})}}if(C.close(),m){let{message:e,icon:t,quiet:n}=Ze(m);i(n?`Signer corrected`:e,{icon:n?`check`:t})}else i(p.checked?`Signer corrected and link reissued`:`Signer corrected`,{icon:`check`});n()}catch(e){console.error(e),b.textContent=``,i(`Could not reach the signing service. Check your connection and try again`,{icon:`wifiOff`,duration:5e3}),x.disabled=!1,d.disabled=!1,f.disabled=!1}})}function sn({navigate:e,docId:t}){let r=z(`div.main-inner`),a=Z.getDoc(t);if(!a)return r.append(z(`div.empty`,{},z(`div.empty-icon`,{html:N(`fileText`,26)}),z(`h3`,{},`Document not found`),z(`p`,{},`It may have been deleted on another device.`),z(`button.btn.btn-soft`,{type:`button`,style:{marginTop:`16px`},onclick:()=>e(`#/`)},`Back to documents`))),r;if(a.status===`draft`)return queueMicrotask(()=>e(`#/doc/${a.id}/edit`)),r;let o=z(`div`),s=z(`div.detail-side`),c=z(`div.detail-main`),p={},m=null;function g(){H(o);let t=ye(a.status);o.append(z(`div.view-head`,{},z(`button.icon-btn`,{type:`button`,html:N(`arrowLeft`,20),"aria-label":`Back to documents`,dataset:{act:`back`},onclick:()=>e(`#/`)}),z(`div.grow`,{},z(`h1`,{style:{fontSize:`20px`}},a.title),z(`div.small.faint`,{},`${a.pageCount} page${a.pageCount===1?``:`s`} · Updated ${we(a.updatedAt)}`)),z(`div.view-head-status`,{},z(`span.chip.${t.tone}`,{html:N(t.icon,13,2.2)},z(`span`,{},t.label)))))}function _(){H(s);let t=a.signers.find(e=>e.isMe),r=a.status===`sent`&&!f(a)&&t&&t.status!==`signed`&&t.status!==`declined`&&d(a,t.id),{signed:o,total:c}=le(a),p=[];r&&p.push(z(`button.btn.btn-primary.btn-block`,{type:`button`,html:N(`penLine`,16,2.2),dataset:{act:`sign`},onclick:()=>e(`#/doc/${a.id}/sign`)},` Sign now`)),a.status===`completed`?p.push(z(`button.btn.btn-primary.btn-block`,{type:`button`,html:N(`fileDown`,16,2),dataset:{act:`download-signed`},onclick:()=>It(a).catch(()=>i(`Could not build the download`,{icon:`triangleAlert`}))},` Download signed copy`)):a.status===`sent`&&o>0&&p.push(z(`button.btn.btn-soft.btn-block`,{type:`button`,html:N(`fileDown`,16,2),dataset:{act:`download-signed`},onclick:()=>It(a).catch(()=>i(`Could not build the download`,{icon:`triangleAlert`}))},` Download progress copy`)),p.push(z(`button.btn.btn-ghost.btn-block`,{type:`button`,html:N(`download`,16,2),dataset:{act:`download-original`},onclick:()=>Ft(a).catch(()=>i(`Could not download the file`,{icon:`triangleAlert`}))},` Download original`)),p.push(z(`button.btn.btn-ghost.btn-block`,{type:`button`,html:N(`copy`,16,2),dataset:{act:`duplicate`},onclick:()=>Rt(a,{navigate:e})},` Duplicate as draft`)),p.push(z(`button.btn.btn-ghost.btn-block`,{type:`button`,html:N(`template`,16,2),dataset:{act:`template`},onclick:()=>Dt(a)},` Save as template`));let m=a.signOrder===!0,g=m?u(a):null,_=a.signers.map((e,t)=>{let n=l(a,e),r=fe(n),i=(a.links||{})[e.id],o=a.status===`sent`&&!e.isMe&&e.status!==`signed`&&e.status!==`declined`&&!a.sample&&$.available()&&i&&d(a,e.id);return z(`div.signer-row`,{},m?z(`span.order-badge`,{"aria-hidden":`true`},String(t+1)):null,z(`span.avatar.c${U(e,a.signers)}`,{"aria-hidden":`true`},Ee(e.name||e.email)),z(`div.who`,{},z(`div.nm`,{title:e.name||e.email||`Signer`},e.name||e.email||`Signer`,e.isMe?` (you)`:``),z(`div.em`,{title:e.email||null},e.email||``),e.status===`signed`&&e.signedAt&&z(`div.em.when`,{title:I(e.signedAt,(e.evidence||{}).sign)},`Signed ${Y(e.signedAt)}`),e.consentAt&&z(`div.em.when.evidence`,{title:`Agreed to sign electronically ${I(e.consentAt,(e.evidence||{}).consent)}`,html:N(`shield`,11,2.2)},z(`span`,{},[`Consented`,ue((e.evidence||{}).sign)||ue((e.evidence||{}).consent)].filter(Boolean).join(` · `))),e.hasCode&&z(`div.em.when.evidence`,{html:N(`lock`,11,2.2)},z(`span`,{},(e.codeSeen||{}).lockedUntil>Date.now()?`Access code locked after failed attempts`:`Access code required`)),n===`waiting`&&z(`div.em.when`,{},`Waits for ${a.signers.slice(0,t).find(e=>e.status!==`signed`)?.name||`an earlier signer`}`),e.declineReason&&z(`div.decline-note`,{},`"${e.declineReason}"`)),z(`span.chip.${r.tone}`,{html:N(r.icon,12,2.2)},z(`span`,{},r.label)),z(`div.acts`,{},!e.isMe&&i&&!a.sample&&z(`button.icon-btn`,{type:`button`,html:N(`link`,16),title:`Copy sign link`,"aria-label":`Copy sign link for ${e.name||e.email}`,dataset:{act:`link:${e.id}`},onclick:()=>Vt(a,e)}),rn(a,e)&&z(`button.icon-btn`,{type:`button`,html:N(`userPen`,16),title:`Correct name, email, or link`,"aria-label":`Correct ${e.name||e.email}`,dataset:{act:`correct:${e.id}`},onclick:()=>on(a,e,{onDone:C})}),!e.isMe&&a.status===`sent`&&!a.sample&&z(`button.icon-btn`,{type:`button`,html:N(e.hasCode?`rotate`:`lock`,16),title:e.hasCode?`Replace access code`:`Require an access code`,"aria-label":`${e.hasCode?`Replace`:`Require`} an access code for ${e.name||e.email}`,dataset:{act:`code:${e.id}`},onclick:async t=>{let n=t.currentTarget;n.disabled=!0,await zt(a,e),n.disabled=!1}}),e.hasCode&&a.status===`sent`&&!a.sample&&z(`button.icon-btn`,{type:`button`,html:N(`unlock`,16),title:`Remove access code`,"aria-label":`Remove the access code for ${e.name||e.email}`,dataset:{act:`uncode:${e.id}`},onclick:()=>Bt(a,e)}),o&&z(`button.icon-btn`,{type:`button`,html:N(`bell`,16),title:`Send email reminder`,"aria-label":`Send reminder to ${e.name||e.email}`,dataset:{act:`remind:${e.id}`},onclick:async t=>{let n=t.currentTarget;n.disabled=!0,await Ht(a,e),n.disabled=!1}})))}),y=[...a.audit||[]].reverse().slice(0,30),b=[];(a.status===`sent`||a.status===`expired`)&&b.push(z(`button.btn.btn-danger.btn-block`,{type:`button`,html:N(`ban`,15,2),dataset:{act:`void`},onclick:async()=>{await Zt(a)&&C()}},` Void document`)),b.push(z(`button.btn.btn-danger.btn-block`,{type:`button`,html:N(`trash`,15,2),dataset:{act:`delete`},onclick:async()=>{await Qt(a)&&e(`#/`)}},` Delete document`)),F(s,[a.sample&&z(`div.sample-banner.detail-top`,{html:N(`sparkle`,14,2.2)},z(`span.grow`,{},`Sample document. Links and email are disabled`)),z(`div.card.detail-top`,{},z(`div.card-title`,{},`Actions`),z(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`9px`}},p)),z(`div.card.detail-top`,{},z(`div.card-title`,{},`Signers · ${o} of ${c} signed`),m&&z(`p.order-note`,{html:N(`listOrdered`,14,2)},z(`span`,{},a.status!==`sent`||!g?`Signed in order`:`In order · waiting on ${g.name||g.email||`the next signer`}${g.isMe?` (you)`:``}`)),_),a.note&&z(`div.card`,{},z(`div.card-title`,{},`Message`),z(`p.small.muted`,{style:{whiteSpace:`pre-wrap`}},a.note)),(a.status===`sent`||a.status===`expired`)&&z(`div.card.detail-top`,{},z(`div.card-title`,{},`Timing`),z(`div.timing-row`,{html:N(f(a)?`hourglass`:`clock`,15,2)},z(`span.grow`,{},a.expiresAt?f(a)?`Expired ${Y(a.expiresAt)}. The links no longer work.`:`Expires ${S(a)}, on ${Y(a.expiresAt)}`:`No expiry. The links keep working until everyone signs.`)),z(`div.timing-row`,{html:N(`bell`,15,2)},z(`span.grow`,{},(()=>{let e=Number((a.reminder||{}).every)||0;if(!e)return`No automatic reminders. The bell on a signer sends one now.`;let t=(n.find(t=>t.days===e)||{}).label||`Every ${e} days`,r=(a.reminder||{}).lastAt||a.sentAt||0,i=r?Y(r+e*864e5):``;return`${t}${i&&!f(a)?` · next around ${i}`:``}`})())),z(`div.row`,{style:{marginTop:`11px`}},z(`button.btn.btn-soft.btn-sm`,{type:`button`,html:N(`calendar`,14,2),dataset:{act:`deadline`},onclick:()=>v(a)},a.expiresAt?` Change deadline`:` Set a deadline`))),a.fingerprint&&a.fingerprint.hex&&z(`div.card`,{},z(`div.card-title`,{},`Document fingerprint`),z(`p.fingerprint`,{},R(a.fingerprint.hex)),z(`p.small.faint`,{style:{marginTop:`7px`}},`${a.fingerprint.alg||`SHA-256`} of the original PDF, recorded when it was sent. Also printed on the signature certificate.`)),z(`div.card`,{},z(`div.card-title`,{},`Activity`),z(`ul.audit-list`,{},y.map(e=>z(`li.audit-item${e.type===`signed`||e.type===`completed`?`.ok`:``}${e.type===`declined`||e.type===`voided`?`.danger`:``}`,{},z(`div`,{},h(e)),z(`div.when`,{},xe(e.at)))))),z(`div.card`,{},z(`div.card-title`,{},`Danger zone`),z(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`9px`}},b))])}function v(e){let t=z(`div`,{},z(`p.modal-message`,{},e.expiresAt?`The deadline is ${Y(e.expiresAt)}. Extending counts from ${f(e)?`today`:`the current deadline`}.`:`Set a deadline and every sign link stops working after it.`),z(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`9px`}},[7,14,30].map(t=>z(`button.btn.btn-soft.btn-block`,{type:`button`,onclick:async()=>{n.close(),await Yt(e,t)&&C()}},`${e.expiresAt&&!f(e)?`Another`:`In`} ${t} days`)),e.expiresAt&&z(`button.btn.btn-ghost.btn-block`,{type:`button`,onclick:async()=>{n.close(),await Yt(e,0)&&C()}},`Remove the deadline`))),n=G({title:e.expiresAt?`Change the deadline`:`Set a deadline`,content:t})}async function b(){m?.destroy(),m=null,H(c),c.append(z(`p.small.faint`,{style:{textAlign:`center`,padding:`30px 0`}},`Loading document…`));try{let[e,t]=await Promise.all([Z.readPdf(a.id),Z.readSigData(a.id)]);p=t;let n=await ee(e);m=ne({container:c,pdf:n,pageCount:a.pageCount}),x()}catch(e){console.error(e),H(c),c.append(k(`The preview could not be loaded right now.`,b))}}function x(){if(m)for(let e of m.frames){H(e.overlay);for(let t of a.fields.filter(t=>t.page===e.index))e.overlay.append(pe(t,a,y(t,p)))}}function C(){if(a=Z.getDoc(t),!a){e(`#/`);return}let n=r.contains(document.activeElement)&&(document.activeElement.dataset||{}).act||``;g(),_(),n&&r.querySelector(`[data-act="${n}"]`)?.focus({preventScroll:!0}),Z.readSigData(a.id).then(e=>{p=e,x()}).catch(()=>{})}let w=()=>C();return Z.addEventListener(`change`,w),a.status===`sent`&&!a.sample&&Q.pull({force:!0}).then(Xt).catch(()=>{}),g(),_(),b(),r.append(o,z(`div.detail-grid`,{},c,s)),r.destroy=()=>{Z.removeEventListener(`change`,w),m?.destroy()},r}var cn=5;function ln({container:e,pdf:t,doc:n,onChange:r,onSelect:i=()=>{},getArmed:a=()=>null,getSigner:o=()=>null,canPlace:s=()=>!0,onPlaced:c=()=>{},onPageEnter:l=null,onGeometry:u=()=>{}}){e.classList.add(`editor-pages`);let d=ne({container:e,pdf:t,pageCount:n.pageCount,onActive:e=>{m=e,l?.(e)}}),f=null,p=new Set,m=0,h=new Set;function g(e){return n.fields.filter(t=>t.page===e)}function v(t){return e.querySelector(`[data-fid="${t}"]`)}function y(){let e=n.fields.find(e=>e.id===f),t=n.fields.filter(e=>p.has(e.id)&&e.id!==f);return e?[e,...t]:t}function b(e,{additive:t=!1}={}){e?t?p.has(e)&&p.size>1?(p.delete(e),f===e&&(f=[...p][p.size-1]||null)):(p.add(e),f=e):(p.clear(),p.add(e),f=e):(p.clear(),f=null),x()}function x(){for(let e of d.frames)for(let t of e.overlay.querySelectorAll(`.field-box[data-fid]`))t.classList.toggle(`selected`,p.has(t.dataset.fid)),t.classList.toggle(`primary`,t.dataset.fid===f)}function S(e,{focus:t=!1,additive:n=!1}={}){b(e,{additive:n}),!e&&document.activeElement?.classList?.contains(`field-box`)&&document.activeElement.blur(),e&&t&&v(e)?.focus({preventScroll:!0}),i(y())}function C(e,{refocus:t=!1}={}){_(e);let i=d.frames[e.page];i&&(j(i),t&&v(e.id)?.focus({preventScroll:!0})),r(n)}function E(e){let t=new Set(p.has(e.id)?[...p]:[e.id]),i=new Set(n.fields.filter(e=>t.has(e.id)).map(e=>e.page));n.fields=n.fields.filter(e=>!t.has(e.id));for(let e of i){let t=d.frames[e];t&&j(t)}S(null),r(n)}function D(e,t){O(e);for(let n of t||[]){let t=z(`div.snap-guide.${n.axis}`,{"aria-hidden":`true`});n.axis===`x`?t.style.left=`${n.at*100}%`:t.style.top=`${n.at*100}%`,e.overlay.append(t)}}function O(e){for(let t of e.overlay.querySelectorAll(`.snap-guide`))t.remove()}function k(e,t){let a=n.signers.find(t=>t.id===e.signerId),o=a?U(a,n.signers):1,s=z(`div.field-box.editable.c${o}`,{tabindex:0,role:`button`,dataset:{fid:e.id},"aria-label":`${e.label||w(e.type)}${e.readOnly?`, read-only,`:``} for ${a?.name||a?.email||`signer`}, page ${e.page+1}. Arrow keys move, Delete removes.`,html:N(e.readOnly?`lock`:se[e.type]||`textCursor`,13,2)},z(`span.fb-label`,{},typeof e.preset==`string`&&e.preset?e.preset:e.label||w(e.type)));B(s,e),p.has(e.id)&&s.classList.add(`selected`),e.id===f&&s.classList.add(`primary`);let c=null;s.addEventListener(`pointerdown`,n=>{if(n.target.classList.contains(`resize-handle`)||n.button!==0)return;if(n.preventDefault(),n.stopPropagation(),n.shiftKey){S(e.id,{additive:!0});return}s.setPointerCapture(n.pointerId),p.has(e.id)||b(e.id);let r=y();c={startX:n.clientX,startY:n.clientY,rect:t.frame.getBoundingClientRect(),moved:!1,origin:r.map(e=>({id:e.id,x:e.x,y:e.y,w:e.w,h:e.h}))}}),s.addEventListener(`pointermove`,r=>{if(!c)return;let i=(r.clientX-c.startX)/c.rect.width,a=(r.clientY-c.startY)/c.rect.height;if(Math.abs(r.clientX-c.startX)+Math.abs(r.clientY-c.startY)>3&&(c.moved=!0),c.origin.length>1){let e=P(c.origin,i,a);for(let t of e){let e=n.fields.find(e=>e.id===t.id);if(!e)continue;e.x=t.x,e.y=t.y;let r=v(t.id);r&&B(r,e)}O(t);return}let o=c.origin[0],l=re({x:o.x+i,y:o.y+a,w:e.w,h:e.h},g(t.index).filter(t=>t.id!==e.id));e.x=l.x,e.y=l.y,B(s,e),D(t,l.guides)}),s.addEventListener(`pointerup`,a=>{let o=c;if(c=null,O(t),o&&o.moved){if(o.origin.length>1){for(let e of y())_(e);j(t),r(n)}else C(e)}else o&&p.size>1&&b(e.id);p.has(e.id)&&v(e.id)?.focus({preventScroll:!0}),i(y()),a.stopPropagation()}),s.addEventListener(`pointercancel`,()=>{if(c)for(let e of c.origin){let t=n.fields.find(t=>t.id===e.id);if(!t)continue;t.x=e.x,t.y=e.y;let r=v(e.id);r&&B(r,t)}c=null,O(t)}),s.addEventListener(`keydown`,t=>{let i=t.shiftKey||t.altKey?.02:.005,a=(i,a)=>{t.preventDefault();let o=y();if(o.length>1){for(let e of P(o,i,a)){let t=n.fields.find(t=>t.id===e.id);t&&(t.x=e.x,t.y=e.y)}ee(),v(e.id)?.focus({preventScroll:!0}),r(n);return}e.x+=i,e.y+=a,C(e,{refocus:!0})};t.key===`Delete`||t.key===`Backspace`?(t.preventDefault(),E(e)):t.key===`ArrowLeft`?a(-i,0):t.key===`ArrowRight`?a(i,0):t.key===`ArrowUp`?a(0,-i):t.key===`ArrowDown`?a(0,i):(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),S(e.id,{additive:t.shiftKey}))}),s.addEventListener(`focus`,()=>{p.has(e.id)||S(e.id)});let l=z(`div.resize-handle`,{"aria-hidden":`true`}),d=null;return l.addEventListener(`pointerdown`,n=>{if(n.button!==0)return;n.preventDefault(),n.stopPropagation(),l.setPointerCapture(n.pointerId),f!==e.id&&b(e.id);let r=t.frame.getBoundingClientRect();d={startX:n.clientX,startY:n.clientY,w:e.w,h:e.h,rect:r}}),l.addEventListener(`pointermove`,n=>{if(!d)return;let r=(n.clientX-d.startX)/d.rect.width,i=(n.clientY-d.startY)/d.rect.height,a=A({x:e.x,y:e.y,w:d.w+r,h:d.h+i},g(t.index).filter(t=>t.id!==e.id));e.w=a.w,e.h=a.h,B(s,e),D(t,a.guides),u(e)}),l.addEventListener(`pointerup`,()=>{O(t),d&&(C(e),S(e.id,{focus:!0})),d=null}),l.addEventListener(`pointercancel`,()=>{d&&(e.w=d.w,e.h=d.h,B(s,e)),d=null,O(t)}),s.append(l),s}function j(e){H(e.overlay);for(let t of g(e.index))e.overlay.append(k(t,e))}function ee(){for(let e of d.frames)j(e)}for(let e of d.frames){j(e);let t=t=>t.target===e.frame||t.target===e.canvas||t.target===e.overlay,i=null,l=()=>{let e=!!(i&&i.armed);return i?.ghost?.remove(),i=null,e};h.add(l);let u=(e,t)=>{let{rect:n,startX:r,startY:i}=e,a=Me((Math.min(r,t.clientX)-n.left)/n.width,0,1),o=Me((Math.min(i,t.clientY)-n.top)/n.height,0,1),s=Me((Math.max(r,t.clientX)-n.left)/n.width,0,1),c=Me((Math.max(i,t.clientY)-n.top)/n.height,0,1);return{x:a,y:o,w:s-a,h:c-o}};e.frame.addEventListener(`pointerdown`,r=>{if(r.button!==0||!t(r))return;let c=a(),l=o();if(!c||!l||!s()){i={deselect:!0};return}r.preventDefault(),e.frame.setPointerCapture(r.pointerId);let u=n.signers.find(e=>e.id===l);i={armed:c,signerId:l,color:u?U(u,n.signers):1,rect:e.frame.getBoundingClientRect(),startX:r.clientX,startY:r.clientY,pointerId:r.pointerId,ghost:null}}),e.frame.addEventListener(`pointermove`,t=>{if(!(!i||!i.armed||t.pointerId!==i.pointerId)){if(!i.ghost){if(Math.hypot(t.clientX-i.startX,t.clientY-i.startY)<cn)return;i.ghost=z(`div.field-box.ghost.c${i.color}`,{"aria-hidden":`true`}),e.overlay.append(i.ghost)}B(i.ghost,u(i,t))}}),e.frame.addEventListener(`pointerup`,a=>{if(!i)return;if(i.deselect){i=null,t(a)&&S(null);return}if(a.pointerId!==i.pointerId)return;let o=i;i=null,o.ghost?.remove();let{rect:s}=o,l=(a.clientX-s.left)/s.width,d=(a.clientY-s.top)/s.height,f=T({type:o.armed,page:e.index,x:l,y:d,signerId:o.signerId});if(o.ghost){let e=u(o,a);f.x=e.x,f.y=e.y,f.w=Math.max(e.w,ae.w),f.h=Math.max(e.h,ae.h),_(f)}else if(l<0||l>1||d<0||d>1)return;n.fields.push(f),j(e),r(n),S(f.id,{focus:!0}),c(f)}),e.frame.addEventListener(`pointercancel`,l)}function M(e){for(let t of d.frames)t.frame.classList.toggle(`armed`,!!e)}return{select:S,setArmedCursor:M,cancelPlacement(){let e=!1;for(let t of h)e=t()||e;return e},refreshAll:ee,get selectedField(){return n.fields.find(e=>e.id===f)||null},get selectedFields(){return y()},get activePage(){return m},selectMany(e,{primary:t=null}={}){p.clear();for(let t of e)p.add(t);f=t&&p.has(t)?t:e[e.length-1]||null,x(),i(y())},scrollToPage:(e,t)=>d.scrollToPage(e,t),destroy:d.destroy}}var un=76;function dn({pdf:e,pageCount:t,onJump:n=()=>{},onPlan:r=null,editable:i=!1,onAddPages:a=null}){let o=z(`div.rail-strip`,{role:`group`,"aria-label":`Pages`}),s=z(`button.icon-btn.rail-collapse`,{type:`button`,html:N(`chevD`,16),"aria-expanded":`true`,title:`Hide the page strip`,"aria-label":`Hide the page strip`,onclick:()=>{let e=c.classList.toggle(`collapsed`);s.setAttribute(`aria-expanded`,e?`false`:`true`);let t=e?`Show the page strip`:`Hide the page strip`;s.title=t,s.setAttribute(`aria-label`,t)}}),c=z(`div.page-rail`,{},z(`div.rail-head`,{},s,z(`span.rail-title.grow`,{},`${t} page${t===1?``:`s`}`),i&&a&&z(`button.btn.btn-ghost.btn-sm`,{type:`button`,html:N(`plus`,13,2.4),onclick:()=>a()},` Add pages`)),o),l=0,u=[],d=!1;function f(){H(o),u.length=0;for(let e=0;e<t;e++){let a=z(`canvas`,{"aria-hidden":`true`}),s=z(`div.rail-thumb`,{},a);s.style.aspectRatio=`612 / 792`;let c=i&&r?z(`div.rail-tools`,{},z(`button.icon-btn`,{type:`button`,html:N(`chevL`,14),disabled:e===0,title:`Move page earlier`,"aria-label":`Move page ${e+1} earlier`,onclick:n=>{n.stopPropagation(),r(ut(t,e,e-1),`page ${e+1} moved earlier`)}}),z(`button.icon-btn`,{type:`button`,html:N(`rotate`,14),title:`Rotate page`,"aria-label":`Rotate page ${e+1}`,onclick:n=>{n.stopPropagation(),r(ft(t,e,1),`page ${e+1} rotated`)}}),z(`button.icon-btn.danger`,{type:`button`,html:N(`trash`,14),disabled:t<2,title:t<2?`A document needs at least one page`:`Delete page`,"aria-label":`Delete page ${e+1}`,onclick:n=>{n.stopPropagation(),r(dt(t,e),`page ${e+1} deleted`)}}),z(`button.icon-btn`,{type:`button`,html:N(`chevR`,14),disabled:e===t-1,title:`Move page later`,"aria-label":`Move page ${e+1} later`,onclick:n=>{n.stopPropagation(),r(ut(t,e,e+1),`page ${e+1} moved later`)}})):null,d=z(`div.rail-item`,{},z(`button.rail-jump`,{type:`button`,"aria-current":e===l?`page`:null,"aria-label":`Go to page ${e+1}`,onclick:()=>n(e)},s,z(`span.rail-num`,{},String(e+1))),c);o.append(d),u.push({index:e,item:d,canvas:a,frame:s,rendered:!1})}h()}let p=typeof IntersectionObserver==`function`?new IntersectionObserver(e=>{for(let t of e){if(!t.isIntersecting)continue;let e=u.find(e=>e.item===t.target);e&&m(e)}},{root:o,rootMargin:`400px`}):null;async function m(t){if(!(d||t.rendered)){t.rendered=!0;try{let n=await oe(e,t.index+1);if(d)return;t.frame.style.aspectRatio=`1 / ${n}`,await M(e,t.index+1,t.canvas,un)}catch{t.rendered=!1}}}function h(){for(let e of u)p&&p.observe(e.item),(!p||e.index<8)&&m(e);g(l)}function g(e){l=Math.max(0,Math.min(t-1,e));for(let e of u){let t=e.index===l;e.item.classList.toggle(`active`,t);let n=e.item.querySelector(`.rail-jump`);t?n?.setAttribute(`aria-current`,`page`):n?.removeAttribute(`aria-current`)}let n=u[l]?.item;if(!n)return;let r=n.getBoundingClientRect(),i=o.getBoundingClientRect();(r.left<i.left||r.right>i.right)&&o.scrollTo({left:n.offsetLeft-o.clientWidth/2+n.offsetWidth/2})}return f(),c.setActive=g,c.destroy=()=>{d=!0,p?.disconnect()},c}function fn(e,{onDone:t=()=>{}}={}){if(e.status!==`draft`){i(`Only a draft can take new pages`,{icon:`info`});return}let n=z(`input`,{type:`file`,accept:`application/pdf,.pdf,image/*`,multiple:!0,className:`visually-hidden`,onchange:()=>{n.files?.length&&r.add(n.files),n.value=``}}),r=Et({onChange:()=>l()}),a=z(`button.dropzone`,{type:`button`,onclick:()=>n.click()},z(`span`,{html:N(`cloudUpload`,26)}),z(`span.dz-title`,{},`Choose files or drop them here`),z(`span.dz-sub`,{},`PDFs and images, up to ${ke(Ct)} each`));O(a,(e,t)=>r.add(t||[e]));let o=z(`p.small.faint`,{style:{marginTop:`12px`,textAlign:`center`},"aria-live":`polite`}),s=z(`div`),c=z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{padding:`12px`,marginTop:`14px`},html:N(`plus`,16,2.2),onclick:()=>p()},` Add to the document`);function l(){if(H(s),!r.items.length)return;let t=e.pageCount+r.totalPages(),i=r.problem()||(t>200?`That would be ${t} pages. The limit is 200 in one document.`:``);F(s,[z(`button.btn.btn-soft.btn-block`,{type:`button`,style:{marginTop:`10px`},html:N(`plus`,15,2.2),onclick:()=>n.click()},` Add another file`),c,i&&i!==`Still reading…`?z(`p.field-error`,{style:{textAlign:`center`}},i):z(`p.small.faint`,{style:{textAlign:`center`,marginTop:`8px`}},`${e.pageCount} + ${r.totalPages()} = ${t} pages, added at the end.`)]),c.disabled=!!i||!r.ready()}let u=z(`div`,{},a,n,r,s,o),d=G({title:`Add pages`,content:u}),f=!1;async function p(){if(f||!r.ready())return;f=!0,c.disabled=!0,a.disabled=!0;let n=r.payload(),s=e.pageCount;o.textContent=`Adding the pages…`;try{let{bytes:r,pageCount:a}=await xt(n,{onto:await Z.readPdf(e.id)});await Z.replacePdf(e.id,r,a,{audit:{type:`pages_added`,detail:n.map(e=>e.name).join(`, `)}}),d.close();let o=a-s;i(`${o} page${o===1?``:`s`} added`,{icon:`check`}),t()}catch(e){console.error(e),o.textContent=``,i(e.message||`Could not add those pages`,{icon:`triangleAlert`,duration:5e3}),f=!1,a.disabled=!1,l()}}}var pn=class extends Error{};function mn(e,t,n){let r=t.map(e=>{let t=Se(n[e.id]);return z(`div.code-row.given`,{},z(`div.grow`,{},z(`div.small`,{style:{fontWeight:650}},e.name||e.email),z(`div.small.faint`,{},e.email)),z(`code.code-value`,{},t),z(`button.icon-btn`,{type:`button`,html:N(`clipboard`,16),title:`Copy code`,"aria-label":`Copy the access code for ${e.name||e.email}`,onclick:async()=>{try{await navigator.clipboard.writeText(t),i(`Code copied`,{icon:`clipboard`})}catch{i(`Could not copy. Select the code and copy it by hand`,{icon:`triangleAlert`})}}}))}),a=z(`div`,{},z(`p.modal-message`,{},`Share each code with its signer by phone, in person, or any channel that is not carrying the link. They are not shown again, and this app does not store them.`),r,z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{marginTop:`16px`,padding:`12px`},onclick:()=>e.close()},`Done, I have the codes`)),o=e.panel.querySelector(`.modal-head`)?.nextSibling;o?o.replaceWith(a):e.panel.append(a);let s=e.panel.querySelector(`.modal-title`);s&&(s.textContent=`Access codes to share`),e.lock()}function hn(e,t=Date.now()){return!!e&&e<=t}function gn(e){let t=[];e.signers.length||t.push(`Add at least one signer.`),e.signers.length>x.signers&&t.push(`${e.signers.length} signers is more than the ${x.signers} one document can carry. Remove some, or split the document.`),e.fields.length>x.fields&&t.push(`${e.fields.length} fields is more than the ${x.fields} one document can carry. Remove some before sending.`);let n=new Map;for(let r of e.signers){let e=J(r.email);if(!e)continue;let i=n.get(e);i?t.push(`${i} and ${r.name||r.email} have the same email address. Each signer needs their own.`):n.set(e,r.name||e)}for(let n of e.signers){!n.isMe&&!J(n.email)&&t.push(`${n.name||`A signer`} needs a valid email address.`);let r=e.fields.filter(e=>e.signerId===n.id);r.length?r.every(e=>e.readOnly===!0)&&t.push(`${n.name||n.email||`A signer`} has only read-only fields, so there is nothing for them to fill in.`):t.push(`${n.name||n.email||`A signer`} has no fields on the document.`)}let r=e.fields.filter(e=>e.readOnly===!0&&e.type===`text`&&!(typeof e.preset==`string`&&e.preset.trim()));if(r.length){let e=r[0].label||`Text`;t.push(r.length===1?`The read-only field "${e}" on page ${r[0].page+1} has nothing filled in. Fill it in, or let the signer.`:`${r.length} read-only text fields have nothing filled in. Fill them in, or let the signer.`)}let i=e.fields.find(e=>e.readOnly===!0&&e.type===`text`&&typeof e.preset==`string`&&e.preset.trim()&&!E(e.inputType,e.preset));return i&&t.push(`The read-only field "${i.label||`Text`}" on page ${i.page+1} does not match what it accepts. ${c(i.inputType)}.`),t}function _n(e,{navigate:t}){if(e.sample){i(`Sample documents cannot be sent. Create your own to try it`,{icon:`info`});return}let r=gn(e);if(r.length){i(r[0],{icon:`circleAlert`,duration:4e3});return}let a=e.signers.filter(e=>!e.isMe),s=e.signers.find(e=>e.isMe);if(!a.length){(async()=>{await Z.recordFingerprint(e.id).catch(()=>{}),await Z.markSent(e.id,{}),t(`#/doc/${e.id}/sign`)})().catch(()=>i(`Could not start signing`,{icon:`triangleAlert`}));return}let c=$.available(),l=L(`note`),u=z(`textarea.textarea`,{id:l,maxLength:1e3,rows:3,placeholder:`Optional. Included in the email and shown on the signing page.`});u.value=e.note||``;let d=L(`email`),f=z(`input`,{type:`checkbox`,id:d,checked:c,disabled:!c}),p=e.signOrder===!0&&!!e.signers[0]?.isMe,m=z(`span`),h=()=>{m.textContent=f.checked?p?`Signing in order. You sign first, in this app; each signer is then emailed their request as the one before them signs.`:`Signing in order. Only the first signer is emailed now; each next request goes out as the one before it is signed.`:`Signing in order. Each link opens only once the signer before it has signed; copy each one from the document page as its turn comes, and the app tells you when it does.`};h(),f.addEventListener(`change`,h);let g=z(`p.small.faint`,{style:{margin:`10px 0 0`},"aria-live":`polite`}),_=z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{padding:`12px`,marginTop:`16px`},html:N(`send`,16,2)},` Send for signature`),v=Number(Z.settings.defaultExpiryDays)||0,y=Number(Z.settings.defaultReminderDays)||0,b=``,x=z(`div`);function S(){if(b){let[e,t,n]=b.split(`-`).map(Number);return e&&t&&n?new Date(e,t-1,n,23,59,59,999).getTime():null}return v?Te(v):null}function C(){H(x);let e=L(`exp`),t=L(`expd`),r=L(`expe`),i=L(`rem`),a=S(),s=hn(a),c=Ne(Date.now()+ve);F(x,[z(`div.field`,{style:{marginBottom:`12px`}},z(`label`,{for:e},`Expires`),z(`div.select-wrap`,{},z(`select.select`,{id:e,onchange:e=>{e.target.value===`custom`?(v=0,b||=Ne(Date.now()+12096e5)):(b=``,v=Number(e.target.value)),C()}},o.map(e=>z(`option`,{value:String(e.days),selected:!b&&v===e.days},e.label)),z(`option`,{value:`custom`,selected:!!b},`On a date…`))),b&&z(`input.input`,{id:t,type:`date`,value:b,min:c,"aria-label":`Expiry date`,style:{marginTop:`8px`},"aria-invalid":s?`true`:null,"aria-describedby":s?r:null,onchange:e=>{b=e.target.value,C()}})),z(`div.field`,{style:{marginBottom:a||y?`12px`:`0`}},z(`label`,{for:i},`Remind signers who have not signed`),z(`div.select-wrap`,{},z(`select.select`,{id:i,onchange:e=>{y=Number(e.target.value),C()}},n.map(e=>z(`option`,{value:String(e.days),selected:y===e.days},e.label))))),s&&z(`p.field-error`,{id:r,style:{margin:`0`}},`${Y(a)} has already passed. Choose a date in the future, or no expiry.`),a&&!s&&z(`p.small.faint`,{style:{margin:`0`}},`Every link stops working after ${Y(a)}, and anyone who has not signed gets a last reminder 2 days before.`),!a&&y>0&&z(`p.small.faint`,{style:{margin:`0`}},`Reminders keep going until everyone signs. An expiry date stops them.`)])}C();let w={},T=!1,E=z(`div`);function D(){H(E);let e=L(`codes`);if(E.append(z(`label.check-row`,{for:e},z(`input`,{type:`checkbox`,id:e,checked:T,onchange:e=>{T=e.target.checked;for(let e of a)w[e.id]=T?w[e.id]||Ae():``;D()}}),`Require an access code to open the link`)),!T){E.append(z(`p.small.faint`,{style:{margin:`5px 0 0 26px`}},`The link is the only credential. A code adds a second one you share by phone or in person.`));return}for(let e of a){let t=L(`code`),n=z(`input.input.code-input`,{id:t,type:`text`,maxLength:32,value:w[e.id]||``,autocapitalize:`characters`,autocomplete:`off`,spellcheck:!1,"aria-label":`Access code for ${e.name||e.email}`,oninput:t=>{w[e.id]=t.target.value}});E.append(z(`div.code-row`,{},z(`label.grow`,{for:t},e.name||e.email),n,z(`button.icon-btn`,{type:`button`,html:N(`rotate`,15,2),title:`Generate a new code`,"aria-label":`Generate a new access code for ${e.name||e.email}`,onclick:()=>{w[e.id]=Ae(),n.value=w[e.id]}})))}E.append(z(`p.small.faint`,{style:{marginTop:`9px`}},`Share each code by phone, in person, or any channel that is not carrying the link. The email says a code is needed, never what it is, and this app does not keep it.`))}D();function O(){if(!T)return``;for(let e of a)if(Se(w[e.id]).length<4)return`${e.name||e.email} needs an access code of at least 4 characters.`;return``}let k=z(`div`);F(k,[z(`div.card`,{style:{padding:`4px 14px`,marginBottom:`14px`}},e.signOrder===!0&&z(`p.order-note`,{html:N(`listOrdered`,14,2),style:{margin:`10px 0 2px`}},m),e.signers.map((t,n)=>z(`div.signer-row`,{},e.signOrder===!0?z(`span.order-badge`,{"aria-hidden":`true`},String(n+1)):z(`span.recipient-dot`,{className:`recipient-dot c${U(t,e.signers)}`}),z(`div.who`,{},z(`div.nm`,{},t.name||t.email||`Signer`),z(`div.em`,{},t.isMe?`You, signing in this app`:t.email))))),z(`div.field`,{},z(`label`,{for:l},`Message to signers`),u),z(`div.card`,{style:{padding:`14px`,marginBottom:`14px`}},x),z(`div.card`,{style:{padding:`14px`,marginBottom:`14px`}},E),z(`label.check-row`,{for:d},f,c?e.signOrder===!0?p?`Email each signer their private sign link as their turn comes`:`Email the first signer their private sign link now`:`Email each signer their private sign link now`:`Email is unavailable. Copy each sign link from the document page instead`),_,g]);let A=null,j=G({title:`Send for signature`,content:k,onClose:()=>A?.()});_.addEventListener(`click`,async()=>{_.disabled=!0,u.disabled=!0;try{await Z.patchDoc(e.id,{note:u.value.trim()}),await Z.recordFingerprint(e.id).catch(()=>{}),g.textContent=e.links&&Object.keys(e.links).length?`Preparing sign links…`:`Setting up your signing service. The first send can take up to 30 seconds…`;let n=S(),r=O()||(hn(n)?`That deadline has already passed. Choose one in the future, or no expiry.`:``);if(r)throw new pn(r);let o={...Z.getDoc(e.id),expiresAt:n},c=await Q.syncDoc(o,{codes:T?Object.fromEntries(a.map(e=>[e.id,w[e.id]])):null});if(await Z.markSent(e.id,c,{expiresAt:n,reminder:{every:y,beforeExpiry:!0},channel:f.checked?`email`:`link`}),T){let t=Z.getDoc(e.id);for(let e of t.signers)e.isMe||(e.hasCode=!0,Z.addAudit(t,`code_set`,e.name||e.email));await Z.persistDoc(t)}let l=null;if(f.checked){g.textContent=`Sending emails…`;try{l=await $.send(Z.getDoc(e.id),{kind:`request`})}catch(e){i(e.message||`Links are ready, but the emails failed`,{icon:`triangleAlert`,duration:5e3})}}if(A=()=>t(s?`#/doc/${e.id}/sign`:`#/doc/${e.id}`),T){if(mn(j,a,w),l){let{message:e,icon:t,quiet:n}=Ze(l);n||i(e,{icon:t})}return}if(j.close(),l){let{message:e,icon:t,quiet:n}=Ze(l);n?i(`Document sent`,{icon:`send`}):i(e,{icon:t})}else i(`Document sent. Share each sign link from the document page`,{icon:`send`,duration:4500})}catch(e){g.textContent=``,e instanceof pn?i(e.message,{icon:`circleAlert`,duration:4e3}):(console.error(e),i(`Could not prepare the sign links. Check your connection and try again`,{icon:`wifiOff`,duration:5e3})),_.disabled=!1,u.disabled=!1}})}function vn({navigate:e,docId:t}){let n=Z.getDoc(t),o=z(`div.main-inner`);if(!n)return o.append(yn(e)),o;if(n.status!==`draft`)return queueMicrotask(()=>e(`#/doc/${n.id}`)),o;let l=null,u=n.signers[0]?.id||null,d=null;function f(e){return n.fields.length+e<=x.fields||(i(`That would be ${n.fields.length+e} fields. The limit is ${x.fields} on one document`,{icon:`circleAlert`,duration:4e3}),!1)}let p=be(()=>{Z.persistDoc(n).catch(()=>i(`Could not save. Check your connection`,{icon:`wifiOff`}))},700),h=z(`input.title-input`,{value:n.title,"aria-label":`Document title`,maxLength:200,oninput:()=>{n.title=h.value,p()},onblur:()=>{let e=h.value.trim()||`Untitled document`;e!==h.value&&(h.value=e,n.title=e,p())}}),_=z(`div.small.faint`,{style:{padding:`0 6px`}});function v(){_.textContent=`Draft · ${n.pageCount} page${n.pageCount===1?``:`s`}`}v();let y=z(`button.btn.btn-primary`,{type:`button`,html:N(`send`,15,2.2),onclick:()=>_n(n,{navigate:e})},` Send`),b=z(`div.view-head`,{},z(`button.icon-btn`,{type:`button`,html:N(`arrowLeft`,20),"aria-label":`Back to documents`,onclick:()=>e(`#/`)}),z(`div.grow`,{},h,_),z(`button.icon-btn`,{type:`button`,html:N(`trash`,18),"aria-label":`Delete draft`,onclick:async()=>{await Qt(n)&&e(`#/`)}}),y),S=z(`div`);function C({isMe:e=!1}={}){if(!(e&&n.signers.some(e=>e.isMe))&&(n.signers.push({id:Pe(),name:e?Z.settings.fullName||Z.user?.username||`Me`:``,email:e&&Z.user?.email||``,isMe:e,status:`pending`}),u||=n.signers[n.signers.length-1].id,p(),A(),P(),W(),!e)){let e=S.querySelectorAll(`.recipient-row`);e[e.length-1]?.querySelector(`input`)?.focus()}}async function T(e){let t=n.fields.filter(t=>t.signerId===e.id).length;t&&!await j({title:`Remove signer?`,message:`Removing ${e.name||e.email||`this signer`} also removes their ${t} field${t===1?``:`s`} from the document.`,confirmLabel:`Remove signer`})||(n.signers=n.signers.filter(t=>t.id!==e.id),n.fields=n.fields.filter(t=>t.signerId!==e.id),u===e.id&&(u=n.signers[0]?.id||null),p(),A(),P(),W(),d?.refreshAll(),R(d?.selectedField||null))}function O(e,t){let r=e+t;if(r<0||r>=n.signers.length)return;let[i]=n.signers.splice(e,1);n.signers.splice(r,0,i),p(),A(),P(),d?.refreshAll(),R(d?.selectedField||null);let a=S.querySelectorAll(`.recipient-row`)[r],o=a?.querySelector(t<0?`.order-up`:`.order-down`),s=a?.querySelector(t<0?`.order-down`:`.order-up`);(o&&!o.disabled?o:s)?.focus()}function A(){H(S);let e=n.signOrder===!0,t=n.signers.map((t,r)=>{let i=L(`rn`),a=L(`re`),o=L(`ree`),s=z(`p.field-error`,{id:o,hidden:!0},`Enter a valid email address, like alex@example.com`),c=(e,t)=>{s.hidden=!t,t?(e.setAttribute(`aria-invalid`,`true`),e.setAttribute(`aria-describedby`,o),e.style.borderColor=`var(--danger)`):(e.removeAttribute(`aria-invalid`),e.removeAttribute(`aria-describedby`),e.style.borderColor=``)};return z(`div.recipient-row`,{},e?z(`span.order-badge`,{"aria-hidden":`true`},String(r+1)):z(`span.recipient-dot`,{className:`recipient-dot c${U(t,n.signers)}`,"aria-hidden":`true`}),z(`div.inputs`,{},z(`input.input`,{id:i,value:t.name,placeholder:t.isMe?`Your name`:`Full name`,"aria-label":`Signer name`,maxLength:100,oninput:e=>{t.name=e.target.value,p(),P(),W()}}),z(`input.input`,{id:a,value:t.email,type:`email`,placeholder:`email@example.com`,"aria-label":`Signer email`,disabled:t.isMe,maxLength:254,oninput:e=>{t.email=e.target.value.trim(),p(),W(),(!e.target.value||J(e.target.value))&&c(e.target,!1)},onblur:e=>{c(e.target,!!e.target.value&&!J(e.target.value))}}),s,t.isMe&&z(`span.small.faint`,{},`You sign in this app, no email needed`)),e&&n.signers.length>1&&z(`div.order-arrows`,{},z(`button.icon-btn.order-up`,{type:`button`,html:N(`chevD`,15),disabled:r===0,title:`Move earlier`,"aria-label":`Move ${t.name||`this signer`} earlier in the signing order`,onclick:()=>O(r,-1)}),z(`button.icon-btn.order-down`,{type:`button`,html:N(`chevD`,15),disabled:r===n.signers.length-1,title:`Move later`,"aria-label":`Move ${t.name||`this signer`} later in the signing order`,onclick:()=>O(r,1)})),z(`button.icon-btn`,{type:`button`,html:N(`x`,17),"aria-label":`Remove ${t.name||`signer`}`,onclick:()=>T(t)}))}),r=L(`order`);F(S,[t,z(`div.row`,{style:{marginTop:`10px`}},z(`button.btn.btn-soft.btn-sm`,{type:`button`,html:N(`userPlus`,14,2.2),onclick:()=>C()},` Add signer`),!n.signers.some(e=>e.isMe)&&z(`button.btn.btn-ghost.btn-sm`,{type:`button`,html:N(`penLine`,14,2.2),onclick:()=>C({isMe:!0})},` I sign too`)),n.signers.length>1&&z(`div.order-toggle`,{},z(`label.check-row`,{for:r},z(`input`,{type:`checkbox`,id:r,checked:e,onchange:e=>{n.signOrder=e.target.checked,p(),A(),W()}}),`Sign in order`),z(`p.small.faint`,{style:{margin:`4px 0 0 26px`}},e?`Each signer's link opens only once the one before them has signed. ${n.signers[0]?.name||`The first signer`} goes first.`:`Everyone can sign as soon as the document goes out.`))])}let M=z(`div`);function P(){if(H(M),!n.signers.length){M.append(z(`p.small.muted`,{},`Add a signer first, then place their fields on the document.`)),d?.setArmedCursor(!1);return}n.signers.some(e=>e.id===u)||(u=n.signers[0].id);let e=z(`div.assignee-row`,{role:`group`,"aria-label":`Place fields for`},n.signers.map(e=>z(`button.assignee-chip`,{type:`button`,"aria-pressed":e.id===u?`true`:`false`,onclick:()=>{u=e.id,P()}},z(`span.recipient-dot`,{className:`recipient-dot c${U(e,n.signers)}`,"aria-hidden":`true`}),z(`span.truncate`,{},e.name||e.email||`Signer`)))),t=z(`div.palette`,{role:`group`,"aria-label":`Field types`},g.map(e=>z(`button.palette-btn`,{type:`button`,html:N(se[e.type],17,1.9),"aria-pressed":l===e.type?`true`:`false`,onclick:()=>{l=l===e.type?null:e.type,P()}},z(`span`,{},e.label))));F(M,[e,t,z(`p.palette-hint`,{},l?`Tap the document to place a ${w(l).toLowerCase()} field, or drag to draw it to size. Esc or tapping the button again stops.`:`Pick a field type, then tap the document to place it. Shift-click to select several, ⌘/Ctrl+D to duplicate.`)]),d?.setArmedCursor(!!l)}let I=z(`div`),te=!1;function ne(e){let t=L(`flab`),n=L(`fhelp`),r=L(`ftype`),i=L(`fval`),o=L(`fro`),s=e.type===`text`||e.type===`checkbox`,l=z(`p.field-error`,{hidden:!0}),u=s&&e.type===`text`&&z(`input.input.input-sm`,{id:i,type:`text`,maxLength:a.text,value:typeof e.preset==`string`?e.preset:``,placeholder:`Leave empty for the signer to fill`,oninput:t=>{let n=t.target.value;e.preset=n;let r=!!n&&!E(e.inputType,n);l.hidden=!r,l.textContent=r?c(e.inputType):``,t.target.style.borderColor=r?`var(--danger)`:``,p(),W(),d?.refreshAll()}});return z(`div.ft-details`,{},z(`div.ft-field`,{},z(`label`,{for:t},`Label`),z(`input.input.input-sm`,{id:t,type:`text`,maxLength:a.label,value:e.label||``,placeholder:w(e.type),oninput:t=>{e.label=t.target.value,p(),d?.refreshAll()}}),z(`p.small.faint`,{},`Shown in the field and read out to screen readers`)),z(`div.ft-field`,{},z(`label`,{for:n},`Help text`),z(`input.input.input-sm`,{id:n,type:`text`,maxLength:a.help,value:e.help||``,placeholder:`Optional. e.g. As it appears on your ID`,oninput:t=>{e.help=t.target.value,p()}})),e.type===`text`&&z(`div.ft-field`,{},z(`label`,{for:r},`Accepts`),z(`div.select-wrap`,{},z(`select.select.input-sm`,{id:r,onchange:t=>{e.inputType=t.target.value,p(),u?.dispatchEvent(new Event(`input`))}},ie.map(t=>z(`option`,{value:t.id,selected:(e.inputType||`text`)===t.id},t.label))))),s&&z(`div.ft-field`,{},z(`label`,{for:e.type===`checkbox`?o:i},e.type===`checkbox`?`Sender-filled`:`Sender-filled value`),e.type===`checkbox`?z(`label.check-row`,{},z(`input`,{type:`checkbox`,checked:e.preset===!0,onchange:t=>{e.preset=t.target.checked,p(),d?.refreshAll()}}),`Start checked`):u,l,z(`label.check-row`,{for:o,style:{marginTop:`7px`}},z(`input`,{type:`checkbox`,id:o,checked:e.readOnly===!0,onchange:t=>{e.readOnly=t.target.checked,p(),W(),d?.refreshAll()}}),`Read-only for the signer`),e.readOnly===!0&&z(`p.small.faint`,{},`Shown filled in, not editable, and not counted as work for the signer.`)))}let re=new Map;function ae(e){let t=re.get(e.page);return t?`${Math.round(e.w*t.w)} × ${Math.round(e.h*t.h)} pt`:`${Math.round(e.w*100)}% × ${Math.round(e.h*100)}%`}let oe=null;function R(e){let t=Array.isArray(e)?e.filter(Boolean):e?[e]:[];if(H(I),oe=null,I.className=t.length?`field-toolbar-anchor`:``,!t.length)return;if(t.length>1){I.append(ce(t));return}let[r]=t,i=L(`req`);oe=z(`span.small.faint.ft-size`,{title:`Width × height`},ae(r)),I.append(z(`div.field-toolbar`,{},z(`div.ft-row`,{},z(`span.small`,{style:{fontWeight:650}},w(r.type)),oe,z(`div.select-wrap`,{},z(`select.select`,{"aria-label":`Assigned signer`,onchange:e=>{r.signerId=e.target.value,p(),W(),d?.refreshAll()}},n.signers.map(e=>z(`option`,{value:e.id,selected:e.id===r.signerId},e.name||e.email||`Signer`)))),r.type!==`date`&&r.readOnly!==!0&&z(`label.check-row`,{for:i},z(`input`,{type:`checkbox`,id:i,checked:r.required!==!1,onchange:e=>{r.required=e.target.checked,p()}}),`Required`),z(`span.grow`),n.pageCount>1&&z(`button.btn.btn-soft.btn-sm`,{type:`button`,html:N(`copy`,14,2),title:`Put a copy of this field on other pages`,onclick:()=>he(r)},` To pages…`),z(`button.btn.btn-soft.btn-sm`,{type:`button`,html:N(`copyPlus`,14,2),title:`Duplicate (Ctrl+D)`,onclick:()=>de()},` Duplicate`),z(`button.btn.btn-ghost.btn-sm`,{type:`button`,"aria-expanded":te?`true`:`false`,html:N(`chevD`,14,2.2),onclick:()=>{te=!te,R([r])}},` Details`),z(`button.btn.btn-danger.btn-sm`,{type:`button`,onclick:()=>me()},`Remove`)),te&&ne(r)))}function ce(e){let t=L(`greq`),r=e.every(e=>e.required!==!1);return z(`div.field-toolbar`,{},z(`div.ft-row`,{},z(`span.small`,{style:{fontWeight:650}},`${e.length} fields`),z(`div.select-wrap`,{},z(`select.select`,{"aria-label":`Assign all selected fields to`,onchange:t=>{for(let n of e)n.signerId=t.target.value;p(),W(),d?.refreshAll(),d?.selectMany(e.map(e=>e.id),{primary:e[0]?.id})}},z(`option`,{value:``,selected:!0},`Assign to…`),n.signers.map(e=>z(`option`,{value:e.id},e.name||e.email||`Signer`)))),z(`label.check-row`,{for:t},z(`input`,{type:`checkbox`,id:t,checked:r,onchange:t=>{for(let n of e)n.required=t.target.checked;p(),W()}}),`Required`),z(`span.grow`),z(`button.btn.btn-soft.btn-sm`,{type:`button`,title:`Line up the left edges with the first selected field`,onclick:()=>B(e,e=>m(e,`left`),`Left edges lined up`)},`Align left`),z(`button.btn.btn-soft.btn-sm`,{type:`button`,title:`Line up the top edges with the first selected field`,onclick:()=>B(e,e=>m(e,`top`),`Top edges lined up`)},`Align top`),z(`button.btn.btn-soft.btn-sm`,{type:`button`,title:`Make them all the size of the first selected field`,onclick:()=>B(e,D,`Sizes matched`)},`Same size`),z(`button.btn.btn-soft.btn-sm`,{type:`button`,html:N(`copyPlus`,14,2),onclick:()=>de()},` Duplicate`),z(`button.btn.btn-danger.btn-sm`,{type:`button`,onclick:()=>me()},`Remove`)))}function le(e){oe&&(oe.textContent=ae(e))}function B(e,t,r){let a=t(e.map(e=>({...e})));for(let e of a){let t=n.fields.find(t=>t.id===e.id);t&&Object.assign(t,e)}p(),d?.refreshAll(),d?.selectMany(e.map(e=>e.id),{primary:e[0]?.id}),i(r,{icon:`check`})}let V=null;function ue(){return d?.selectedFields||[]}function de(){let e=ue();if(!e.length||!f(e.length))return;let t=e.map(e=>r(e));n.fields.push(...t),p(),W(),d?.refreshAll(),d?.selectMany(t.map(e=>e.id))}function fe(){let e=ue();e.length&&(V=e.map(e=>({...e})),i(`${e.length} field${e.length===1?``:`s`} copied`,{icon:`copy`}))}function pe(){if(!V||!V.length||!f(V.length))return;let e=d?.activePage??0,t=V.every(t=>t.page===e),a=V.map(n=>t?r({...n,page:e}):{...n,id:Pe(),page:e});n.fields.push(...a),p(),W(),d?.refreshAll(),d?.selectMany(a.map(e=>e.id)),i(`Pasted onto page ${e+1}`,{icon:`clipboard`})}function me(){let e=ue();if(!e.length)return;let t=new Set(e.map(e=>e.id));n.fields=n.fields.filter(e=>!t.has(e.id)),p(),W(),d?.refreshAll(),d?d.select(null):R(null)}function he(e){let t=L(`apf`),r=L(`apt`),a=z(`input.input`,{id:t,type:`number`,min:1,max:n.pageCount,value:1,style:{width:`90px`}}),o=z(`input.input`,{id:r,type:`number`,min:1,max:n.pageCount,value:String(n.pageCount),style:{width:`90px`}}),c=z(`p.small.faint`,{style:{marginTop:`10px`}}),l=(t,r)=>{let a=Math.max(1,Math.min(n.pageCount,t))-1,o=Math.max(1,Math.min(n.pageCount,r))-1,l=[];for(let e=Math.min(a,o);e<=Math.max(a,o);e++)l.push(e);let u=s(e,l);if(!u.length){i(`That is the page this field is already on`,{icon:`info`});return}if(n.fields.length+u.length>x.fields){c.textContent=`That would be ${n.fields.length+u.length} fields. The limit is ${x.fields} on one document.`;return}n.fields.push(...u),p(),W(),d?.refreshAll(),d?.selectMany([e.id,...u.map(e=>e.id)],{primary:e.id}),f.close(),i(`Copied onto ${u.length} page${u.length===1?``:`s`}`,{icon:`check`})},u=z(`div`,{},z(`p.modal-message`,{},`A copy of this ${w(e.type).toLowerCase()} field, same size and same signer, on the pages you choose.`),z(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`9px`}},z(`button.btn.btn-soft.btn-block`,{type:`button`,onclick:()=>l(1,n.pageCount)},`Every page (1–${n.pageCount})`),e.page+2<=n.pageCount&&z(`button.btn.btn-soft.btn-block`,{type:`button`,onclick:()=>l(e.page+2,n.pageCount)},`This page to the end (${e.page+2}–${n.pageCount})`)),z(`div.row`,{style:{marginTop:`14px`,alignItems:`flex-end`}},z(`div.field`,{style:{margin:`0`}},z(`label`,{for:t},`From page`),a),z(`div.field`,{style:{margin:`0`}},z(`label`,{for:r},`To page`),o),z(`button.btn.btn-primary`,{type:`button`,onclick:()=>l(Number(a.value),Number(o.value))},`Copy`)),c),f=G({title:`Copy to pages`,content:u})}let _e=z(`div`);function W(){H(_e);let e=gn(n);if(!e.length){_e.append(z(`p.small`,{style:{color:`var(--ok)`,display:`flex`,gap:`6px`,alignItems:`center`},html:N(`circleCheck`,15,2.2)},z(`span`,{},`Ready to send.`)));return}F(_e,e.map(e=>z(`p.small.muted`,{style:{display:`flex`,gap:`6px`,alignItems:`center`,margin:`0 0 6px`},html:N(`circleAlert`,15,2)},z(`span`,{},e))))}let ve=z(`div`),K=z(`div`),ye=z(`div.editor-sticky`,{},ve,I),q=null,xe=!1;async function Se(e,t){if(xe)return;let r=ht(n.fields,e);if(!(r&&!await j({title:`Delete this page?`,message:`${r} field${r===1?``:`s`} placed on it ${r===1?`is`:`are`} removed with the page. Everything on the other pages stays put.`,confirmLabel:`Delete page`}))){xe=!0;try{let{bytes:r,pageCount:a}=await _t(await Z.readPdf(n.id),e);await Z.replacePdf(n.id,r,a,{fields:mt(n.fields,e),audit:{type:`pages_changed`,detail:t}}),Object.assign(n,Z.getDoc(n.id)),v(),W(),await Ce(),i(`Saved: ${t}`,{icon:`check`})}catch(e){console.error(e),i(`Could not change the pages. Check your connection`,{icon:`wifiOff`})}finally{xe=!1}}}async function Ce(){d?.destroy(),d=null,H(K),H(ve),q?.destroy(),q=null,K.append(z(`p.small.faint`,{style:{textAlign:`center`,padding:`30px 0`}},`Loading document…`));try{let e=await Z.readPdf(n.id),t=await ee(e);d=ln({container:K,pdf:t,doc:n,onChange:()=>{p(),W()},onSelect:R,getArmed:()=>l,getSigner:()=>u,canPlace:()=>f(1),onPlaced:()=>{n.signers.length&&W()},onPageEnter:e=>q?.setActive(e),onGeometry:le}),re.clear();for(let e=0;e<n.pageCount;e++)ge(t,e+1).then(t=>{re.set(e,t);let n=d?.selectedField;n&&n.page===e&&le(n)}).catch(()=>{});d.setArmedCursor(!!l),q=dn({pdf:t,pageCount:n.pageCount,editable:!0,onJump:e=>d.scrollToPage(e,ye.getBoundingClientRect().height+12),onPlan:Se,onAddPages:()=>fn(n,{onDone:async()=>{Object.assign(n,Z.getDoc(n.id)),v(),W(),await Ce()}})}),ve.append(q)}catch(e){console.error(e),H(K),K.append(k(`Check your connection, then try again.`,Ce))}}Ce();let we=z(`div.editor-grid`,{},z(`div.editor-side`,{},z(`div.card`,{},z(`div.card-title`,{},`Signers`),S),z(`div.card`,{},z(`div.card-title`,{},`Fields`),M),z(`div.card`,{},z(`div.card-title`,{},`Send`),_e,z(`button.btn.btn-primary.btn-block`,{type:`button`,style:{marginTop:`10px`},html:N(`send`,15,2.2),onclick:()=>_n(n,{navigate:e})},` Review and send`),z(`button.btn.btn-ghost.btn-block`,{type:`button`,style:{marginTop:`9px`},html:N(`template`,15,2),onclick:()=>Dt(n)},` Save as template`))),z(`div.editor-main`,{},ye,K));A(),P(),W(),o.append(b,we);let Te=()=>{let n=Z.getDoc(t);!n||n.status===`draft`||(p.cancel(),e(`#/doc/${t}`))};Z.addEventListener(`change`,Te);let Ee=e=>{let t=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName||``),n=!!document.querySelector(`.modal-root:not(.closing)`);if(e.key===`Escape`){if(n||t||d?.cancelPlacement())return;if(l){l=null,P();return}d?.select(null);return}if(t||n)return;let r=e.metaKey||e.ctrlKey,i=e.key.toLowerCase();r&&i===`d`?(e.preventDefault(),de()):r&&i===`c`?ue().length&&(e.preventDefault(),fe()):r&&i===`v`?V&&(e.preventDefault(),pe()):(e.key===`Delete`||e.key===`Backspace`)&&ue().length&&!e.target.classList?.contains(`field-box`)&&(e.preventDefault(),me())};return document.addEventListener(`keydown`,Ee),o.destroy=()=>{q?.destroy(),document.removeEventListener(`keydown`,Ee),Z.removeEventListener(`change`,Te),p.cancel(),Z.getDoc(n.id)?.status===`draft`&&Z.persistDoc(n).catch(()=>{}),d?.destroy()},o}function yn(e){return z(`div.empty`,{},z(`div.empty-icon`,{html:N(`fileText`,26)}),z(`h3`,{},`Document not found`),z(`p`,{},`It may have been deleted on another device.`),z(`button.btn.btn-soft`,{type:`button`,style:{marginTop:`16px`},onclick:()=>e(`#/`)},`Back to documents`))}function bn({navigate:e,docId:t}){let n=Z.getDoc(t),r=z(`div.main-inner`),a=n?.signers.find(e=>e.isMe);if(!n||!a)return queueMicrotask(()=>e(n?`#/doc/${n.id}`:`#/`)),r;if(n.status!==`sent`||a.status===`signed`)return queueMicrotask(()=>e(`#/doc/${n.id}`)),r;if(f(n))return queueMicrotask(()=>{i(`This document has expired. Extend the deadline to sign it`,{icon:`hourglass`,duration:4e3}),e(`#/doc/${n.id}`)}),r;if(!d(n,a.id))return queueMicrotask(()=>{let t=n.signers.find(e=>e.status!==`signed`);i(`${t?.name||`An earlier signer`} signs before you`,{icon:`hourglass`,duration:4e3}),e(`#/doc/${n.id}`)}),r;let o=null,s=z(`span.txt`,{},` `),c=z(`div.progress-fill`,{style:{width:`0%`}}),l=z(`button.btn.btn-primary`,{type:`button`,disabled:!0,html:N(`check`,16,2.4),style:{padding:`11px 22px`}},` Finish signing`),u=z(`div.view-head`,{},z(`button.icon-btn`,{type:`button`,html:N(`arrowLeft`,20),"aria-label":`Back to document`,onclick:()=>e(`#/doc/${n.id}`)}),z(`div.grow`,{},z(`h1`,{style:{fontSize:`20px`}},n.title),z(`div.small.faint`,{},`Complete your fields, then finish signing`))),p=z(`div`),m=z(`div.sign-footer`,{},z(`div.sign-footer-inner`,{},z(`div.sign-progress`,{},s,z(`div.progress-track`,{},c)),z(`div.sign-actions`,{},l)));function h(){H(p),m.hidden=!0,p.append(z(`div`,{style:{padding:`10px 0 20px`}},he({intro:`You are signing "${n.title}" yourself, in this app.`,agreeLabel:`Agree and fill in my fields`,onAgree:async({version:e})=>{try{await Z.recordConsent(n.id,a.id,{version:e,...te()})}catch(e){throw i(`Could not record your agreement. Check your connection and try again`,{icon:`wifiOff`,duration:5e3}),e}m.hidden=!1,g()}})))}async function g(){o?.destroy(),o=null,H(p),p.append(z(`p.small.faint`,{style:{textAlign:`center`,padding:`30px 0`}},`Loading document…`));try{let[e,t,r]=await Promise.all([Z.readPdf(n.id),Z.readSigData(n.id),Z.getSavedSignature().catch(()=>null)]),i=await ee(e),u=n.fields.map(e=>{let r=n.signers.find(t=>t.id===e.signerId);return{...e,mine:e.signerId===a.id,signerName:r?.name||r?.email||``,value:y(e,t)}});o=ce({container:p,pdf:i,data:{title:n.title,pageCount:n.pageCount,fields:u},suggestedName:a.name||Z.settings.fullName||Z.user?.username||``,savedSignature:r?.image||null,onAdoptSignature:e=>{Z.setSavedSignature({image:e,updatedAt:Date.now()}).catch(()=>{})},onProgress:({done:e,total:t})=>{s.textContent=t?`${e} of ${t} required field${t===1?``:`s`} complete`:`Review the document, then finish`,c.style.width=t?`${Math.round(e/t*100)}%`:`100%`,l.disabled=!1}})}catch(e){console.error(e),H(p),p.append(k(`Check your connection, then try again.`,g))}}return a.consentAt?g():h(),l.addEventListener(`click`,async()=>{if(o){if(!o.isComplete()){o.focusFirstIncomplete(),i(`This field still needs to be completed`,{icon:`circleAlert`});return}l.disabled=!0,l.textContent=`Saving…`;try{let t=o.getValues();Object.keys(t).length&&await Z.mergeSigData(n.id,t);let r=Z.getDoc(n.id);r&&Object.keys(r.links||{}).length&&!r.sample&&await Q.syncDoc({...r,signers:r.signers.map(e=>e.id===a.id?{...e,status:`signed`}:e)}),(await Z.markSignerSigned(n.id,a.id,t)).completedNow?(i(`Everything is signed. The completed copy is ready`,{icon:`circleCheckBig`}),await Ut(Z.getDoc(n.id))):(i(`Your signature is in`,{icon:`circleCheck`}),await Gt(Z.getDoc(n.id))),e(`#/doc/${n.id}`)}catch(e){console.error(e),i(`Could not save your signature. Check your connection`,{icon:`wifiOff`}),l.disabled=!1,H(l),l.innerHTML=N(`check`,16,2.4),l.append(` Finish signing`)}}}),r.append(u,p,m),r.destroy=()=>o?.destroy(),r}async function xn(){if(await j({title:`Sign out?`,message:`Your documents stay safe in your Puter account. Sign back in anytime.`,confirmLabel:`Sign out`,danger:!1}))try{await Promise.resolve(puter.auth.signOut())}finally{location.reload()}}function Sn({navigate:e}={}){let t=z(`div.main-inner`),r=Z.user,a=typeof puter<`u`&&puter.env===`app`,s=L(`name`),c=z(`input.input`,{id:s,type:`text`,maxLength:80,autocomplete:`name`,value:Z.settings.fullName||``,placeholder:`e.g. Alex Rivera`}),l=null;c.addEventListener(`input`,()=>{clearTimeout(l),l=setTimeout(()=>{Z.updateSettings({fullName:c.value.trim()}).then(()=>i(`Name saved`,{icon:`check`})).catch(()=>i(`Could not save. Check your connection`,{icon:`wifiOff`}))},900)});let u=z(`div.card`,{},z(`div.card-title`,{},`Profile`),z(`div.row`,{style:{marginBottom:`14px`}},z(`span.avatar.c1`,{style:{width:`42px`,height:`42px`,fontSize:`15px`}},Ee(Z.settings.fullName||r?.username||`?`)),z(`div.grow`,{},z(`div`,{style:{fontWeight:650}},r?.username||`Puter user`),r?.email&&z(`div.small.faint`,{},r.email))),z(`div.field`,{},z(`label`,{for:s},`Name shown to signers`),c,z(`p.small.faint`,{style:{marginTop:`5px`}},`Used in email requests and on the signature certificate.`))),d=z(`div.seg`,{role:`group`,"aria-label":`Theme`});function f(){H(d);for(let e of[{id:`system`,label:`System`,icon:`monitor`},{id:`light`,label:`Light`,icon:`sun`},{id:`dark`,label:`Dark`,icon:`moon`}])d.append(z(`button`,{type:`button`,html:N(e.icon,14,2),"aria-pressed":it()===e.id?`true`:`false`,onclick:()=>{rt(e.id),Z.updateSettings({theme:e.id}).catch(()=>{}),f()}},z(`span`,{},e.label)))}f();let p=z(`div.card`,{},z(`div.card-title`,{},`Appearance`),d),m=z(`div`);function h(){H(m);let e=[{key:`notifyComplete`,label:`A document is fully signed`,sub:`With a link to the completed copy`,on:Z.settings.notifyComplete!==!1},{key:`notifyDecline`,label:`A signer declines`,sub:`Signing closes for everyone, so this one usually needs you`,on:Z.settings.notifyDecline!==!1},{key:`notifySign`,label:`Any signer signs`,sub:`One email per signature`,on:Z.settings.notifySign===!0}];for(let t of e){let e=L(t.key);m.append(z(`label.check-row.notify-row`,{for:e},z(`input`,{type:`checkbox`,id:e,checked:t.on,onchange:e=>{Z.updateSettings({[t.key]:e.target.checked}).catch(()=>i(`Could not save. Check your connection`,{icon:`wifiOff`}))}}),z(`span.grow`,{},z(`span.title`,{},t.label),z(`span.sub`,{},t.sub))))}m.append(z(`p.small.faint`,{style:{marginTop:`12px`}},r?.email?`Sent to ${r.email} by your own signing service, so they arrive even when this app is closed.`:`Sent to your Puter account address.`))}h();let g=z(`div.card`,{},z(`div.card-title`,{},`Email me when`),m),_=z(`div`);function v(){H(_);let e=L(`dexp`),t=L(`drem`);F(_,[z(`div.field`,{},z(`label`,{for:e},`Documents expire`),z(`div.select-wrap`,{},z(`select.select`,{id:e,onchange:e=>{Z.updateSettings({defaultExpiryDays:Number(e.target.value)}).catch(()=>i(`Could not save. Check your connection`,{icon:`wifiOff`}))}},o.map(e=>z(`option`,{value:String(e.days),selected:(Number(Z.settings.defaultExpiryDays)||0)===e.days},e.label))))),z(`div.field`,{style:{marginBottom:`0`}},z(`label`,{for:t},`Remind signers`),z(`div.select-wrap`,{},z(`select.select`,{id:t,onchange:e=>{Z.updateSettings({defaultReminderDays:Number(e.target.value)}).catch(()=>i(`Could not save. Check your connection`,{icon:`wifiOff`}))}},n.map(e=>z(`option`,{value:String(e.days),selected:(Number(Z.settings.defaultReminderDays)||0)===e.days},e.label))))),z(`p.small.faint`,{style:{marginTop:`10px`}},`Where every send starts. You can change both while sending, per document.`)])}v();let y=z(`div.card`,{},z(`div.card-title`,{},`Sending defaults`),_),b=z(`div`);async function x(){H(b);let e=await Z.getSavedSignature().catch(()=>null);F(b,[e?.image?z(`div.sig-preview`,{},z(`img`,{src:e.image,alt:`Your saved signature`})):z(`p.small.muted`,{},`No saved signature yet. Save one and signing takes one tap.`),z(`div.row`,{style:{marginTop:`12px`}},z(`button.btn.btn-soft.btn-sm`,{type:`button`,html:N(`penLine`,14,2.2),onclick:async()=>{let t=await de({title:e?.image?`Replace your signature`:`Save your signature`,suggestedName:Z.settings.fullName||r?.username||``,allowSave:!1});t&&(await Z.setSavedSignature({image:t.dataUrl,updatedAt:Date.now()}).catch(()=>{}),i(`Signature saved`,{icon:`check`}),x())}},e?.image?` Replace`:` Create signature`),e?.image&&z(`button.btn.btn-ghost.btn-sm`,{type:`button`,onclick:async()=>{await Z.setSavedSignature(null).catch(()=>{}),i(`Signature removed`,{icon:`trash`}),x()}},`Remove`))])}x();let S=z(`div.card`,{},z(`div.card-title`,{},`My signature`),b),C=z(`div.settings-list`);function w(){H(C);let t=Z.listTemplates().length;C.append(z(`button.settings-row`,{type:`button`,onclick:()=>At({navigate:e})},z(`span`,{html:N(`template`,19),style:{color:`var(--ink-3)`}}),z(`div.grow`,{},z(`div.title`,{},`Templates`),z(`div.sub`,{},t?`${t} saved layout${t===1?``:`s`} · use, rename, or delete`:`Save a document you send often and reuse its field layout`)),z(`span`,{html:N(`chevR`,17),style:{color:`var(--ink-3)`}}))),Z.settings.sampleData?C.append(z(`button.settings-row`,{type:`button`,onclick:async()=>{if(await j({title:`Remove sample documents?`,message:`All sample documents are deleted. Your own documents are not touched.`,confirmLabel:`Remove samples`})){try{await Z.wipeSampleData(),i(`Sample documents removed`,{icon:`check`})}catch{i(`Could not remove them. Check your connection`,{icon:`wifiOff`})}w()}}},z(`span`,{html:N(`sparkle`,19),style:{color:`var(--ink-3)`}}),z(`div.grow`,{},z(`div.title`,{},`Remove sample documents`),z(`div.sub`,{},`Deletes every document marked as a sample`)),z(`span`,{html:N(`chevR`,17),style:{color:`var(--ink-3)`}}))):C.append(z(`button.settings-row`,{type:`button`,onclick:()=>st()},z(`span`,{html:N(`sparkle`,19),style:{color:`var(--ink-3)`}}),z(`div.grow`,{},z(`div.title`,{},`Onboarding and samples`),z(`div.sub`,{},`Reopen the welcome tour or load sample documents`)),z(`span`,{html:N(`chevR`,17),style:{color:`var(--ink-3)`}})))}w();let T=z(`div.card`,{},z(`div.card-title`,{},`Data`),C),E=()=>w();Z.addEventListener(`change`,E);let D=z(`div.card`,{},z(`div.card-title`,{},`About`),z(`div.settings-list`,{},z(`a.settings-row`,{href:`https://github.com/HeyPuter/signatures`,target:`_blank`,rel:`noopener`},z(`span`,{html:N(`externalLink`,19),style:{color:`var(--ink-3)`}}),z(`div.grow`,{},z(`div.title`,{},`Signatures on GitHub`),z(`div.sub`,{},`Send documents for signature, powered by Puter`))),z(`a.settings-row`,{href:`https://puter.com`,target:`_blank`,rel:`noopener`},z(`span`,{html:N(`cloud`,19),style:{color:`var(--ink-3)`}}),z(`div.grow`,{},z(`div.title`,{},`Puter`),z(`div.sub`,{},`Your documents live in your own Puter cloud`)))),!a&&z(`button.btn.btn-danger.btn-block`,{type:`button`,style:{marginTop:`14px`},html:N(`logout`,15,2),onclick:xn},` Sign out`));return t.append(z(`div.view-head`,{},z(`h1`,{},`Settings`)),u,p,y,g,S,T,D),t.destroy=()=>Z.removeEventListener(`change`,E),t}var Cn=6e4;function wn(e){let t=(e||`#/`).split(`?`)[0];if(t===`#/settings`)return{name:`settings`};let n=/^#\/doc\/([A-Za-z0-9._-]+)(?:\/(edit|sign))?$/.exec(t);return n?{name:n[2]||`detail`,docId:n[1]}:{name:`documents`}}function Tn(e){let t=z(`div`),n=z(`div`),r=z(`main.main`,{id:`main`},t,n),a=null;function o(e){location.hash===e?g():location.hash=e}function s(){H(t),Z.settings.sampleData&&t.append(z(`div.sample-banner`,{style:{maxWidth:`var(--content-max)`,margin:`0 auto 16px`}},z(`span`,{html:N(`sparkle`,14,2.2)}),z(`span.grow`,{},`Sample documents: explore freely, nothing here is real`),z(`button`,{type:`button`,onclick:async()=>{if(await j({title:`Start fresh?`,message:`All sample documents are removed and you start with your own.`,confirmLabel:`Remove samples`})){try{await Z.wipeSampleData()}catch(e){console.error(e),i(`Could not remove them. Check your connection`,{icon:`wifiOff`});return}st()}}},`Start fresh`)))}Z.addEventListener(`change`,s),s();let c=Z.user?.username||`Puter user`,l=typeof puter<`u`&&puter.env===`app`,u=z(`div`,{style:{display:`contents`}}),d=z(`nav.sidebar`,{"aria-label":`Main navigation`},z(`div.brand`,{},z(`span.brand-mark`,{html:_e(32),"aria-hidden":`true`}),`Signatures`),u,z(`div.sidebar-spacer`),z(`button.btn.btn-primary.sidebar-new`,{type:`button`,html:N(`plus`,17,2.2),onclick:()=>Mt({navigate:o})},` New document`),z(`div.sidebar-user`,{},z(`span.avatar`,{},c.charAt(0).toUpperCase()),z(`span.name`,{title:c},c),!l&&z(`button.icon-btn`,{type:`button`,html:N(`logout`,18,2),"aria-label":`Sign out`,title:`Sign out`,onclick:xn}))),f=z(`nav.tabbar`,{"aria-label":`Main navigation`}),p=[{hash:`#/`,label:`Documents`,icon:`home`,match:e=>e.name!==`settings`},{hash:`#/settings`,label:`Settings`,icon:`gear`,match:e=>e.name===`settings`}];function m(){let e=wn(location.hash);H(u),H(f);for(let t of p){let n=t.match(e);u.append(z(`a.nav-item`,{href:t.hash,className:`nav-item${n?` active`:``}`,html:N(t.icon,20,1.9),"aria-current":n?`page`:null},z(`span`,{},t.label)))}f.append(z(`a.tab-item`,{href:`#/`,className:`tab-item${e.name===`settings`?``:` active`}`,html:N(`home`,22,1.9),"aria-current":e.name===`settings`?null:`page`},z(`span`,{},`Documents`))),f.append(z(`button.tab-item`,{type:`button`,html:N(`plus`,22,2.1),onclick:()=>Mt({navigate:o})},z(`span`,{},`New`))),f.append(z(`a.tab-item`,{href:`#/settings`,className:`tab-item${e.name===`settings`?` active`:``}`,html:N(`gear`,22,1.9),"aria-current":e.name===`settings`?`page`:null},z(`span`,{},`Settings`)))}let h={documents:nn,detail:sn,edit:vn,sign:bn,settings:Sn};function g(){let e=wn(location.hash);m(),a?.destroy?.(),H(n),a=h[e.name]({navigate:o,docId:e.docId}),n.append(a),window.scrollTo({top:0})}H(e),e.append(z(`div.shell`,{},d,r),f),window.addEventListener(`hashchange`,g),g();let _=setInterval(()=>{!Z.listDocs().some(e=>(e.status===`sent`||e.status===`expired`)&&!e.sample)||!navigator.onLine||(Q.pull().then(Xt).catch(()=>{}),Jt().catch(()=>{}))},Cn);window.addEventListener(`beforeunload`,()=>clearInterval(_))}function En({onSignedIn:e}){let t=z(`button.btn.btn-primary.auth-cta`,{type:`button`,onclick:async()=>{t.disabled=!0,t.textContent=`Waiting for Puter…`;try{await puter.auth.signIn(),e()}catch{t.disabled=!1,t.textContent=`Sign in`}}},`Sign in`);return z(`div.auth-view`,{},z(`div.auth-logo`,{html:_e(76),"aria-hidden":`true`}),z(`h1.auth-title`,{},`Signatures`),z(`p.auth-sub`,{},`Send documents for signature, track who signed, and download the completed copy.`),z(`div.auth-features`,{},n(`send`,`Signers get a private link by email. No account needed to sign`),n(`shield`,`Your documents live in your own Puter cloud, not on our servers`),n(`fileCheck`,`Completed copies come with a full signature certificate`)),t,z(`p.auth-note`,{},`Free • No ads • Powered by `,z(`a`,{href:`https://developer.puter.com`,target:`_blank`,rel:`noopener`},`Puter`)));function n(e,t){return z(`div.auth-feature`,{html:N(e,20,1.8)},z(`span`,{},t))}}var Dn=document.getElementById(`app`);window.addEventListener(`dragover`,e=>{e.preventDefault(),e.target.closest?.(`.dropzone`)||(e.dataTransfer.dropEffect=`none`)}),window.addEventListener(`drop`,e=>e.preventDefault());function On(e,t,n){Dn.replaceChildren(z(`div.auth-view`,{},z(`div.empty-icon`,{html:N(`wifiOff`,30)}),z(`h1.auth-title`,{style:{fontSize:`22px`}},e),z(`p.auth-sub`,{},t),z(`button.btn.btn-primary.auth-cta`,{type:`button`,onclick:n},`Try again`)))}async function kn(){if(typeof puter>`u`){On(`Could not reach Puter`,`The Puter SDK failed to load. Check your connection and try again.`,()=>location.reload());return}let e=!1;try{e=await Promise.resolve(puter.auth.isSignedIn())}catch{e=!1}if(!e){Dn.replaceChildren(En({onSignedIn:An}));return}await An()}async function An(){try{await Z.init()}catch(e){console.error(e),On(`Could not load your documents`,`Something went wrong talking to your Puter cloud.`,()=>location.reload());return}rt(Z.settings.theme||`system`),Tn(Dn),ot(Z)&&st(),Z.listDocs().some(e=>(e.status===`sent`||e.status===`expired`)&&!e.sample)&&(Q.pull({force:!0}).then(Xt).catch(()=>{}),Jt().catch(()=>{}))}kn();