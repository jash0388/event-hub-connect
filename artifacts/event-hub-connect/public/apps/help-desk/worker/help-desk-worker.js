/* help-desk-worker build=ff9909a42752 at=1792189924447 */
(function() {
	//#region src/shared/ids.js
	/**
	* Identifiers. Random ids use an unambiguous lowercase alphabet so they are
	* safe inside KV keys (no ':'), URLs and file names.
	*/
	var ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";
	function randomId(length = 12) {
		const bytes = new Uint8Array(length);
		crypto.getRandomValues(bytes);
		let out = "";
		for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % 33];
		return out;
	}
	/** A long random secret, for portal access links and invite codes. */
	function secret(length = 32) {
		return randomId(length);
	}
	/** Zero-pad so numeric ids sort correctly as KV key text. */
	function pad(n, width = 9) {
		return String(Math.max(0, Math.floor(Number(n) || 0))).padStart(width, "0");
	}
	function isId(value, min = 6, max = 40) {
		return typeof value === "string" && value.length >= min && value.length <= max && /^[a-z0-9]+$/.test(value);
	}
	async function sha256(text) {
		const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
		return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	//#endregion
	//#region src/shared/keys.js
	/**
	* The key layout in the owner's key-value store. Every help desk lives under
	* its own prefix, `hd:<desk>:`, and each record type has a short segment so
	* a prefix listing reads exactly one collection:
	*
	*   meta                  desk settings (name, portal, email, owner)
	*   members               agents by Puter uuid (one small document)
	*   cfg:<kind>            groups, macros, views, fields, triggers, sla, kb
	*   seq                   counters: { t: tickets, u: users, o: orgs, a: articles }
	*   rev                   change counter, bumped on every write
	*   ch:<rev>              change feed entry (expires after CHANGE_TTL)
	*   t:<id>                ticket
	*   e:<id>:<n>            ticket event: comment, note or field change
	*   u:<id>                customer (end user)
	*   ue:<email>            customer id by email
	*   uu:<uuid>             customer id by Puter account
	*   rt:<user>:<ticket>    tickets by requester
	*   ps:<uuid>:<ticket>    tickets a signed-in Puter account sent from the help center
	*   o:<id>                organization
	*   od:<domain>           organization id by email domain
	*   k:<id>                knowledge base article (summary, listed)
	*   kb:<id>               knowledge base article body (read on open)
	*   f:<id>                attachment metadata (the bytes are a file)
	*   sv:<ticket>           solved tickets waiting to be closed automatically
	*   pr:<ticket>:<uuid>    who is viewing a ticket (expires)
	*   inv:<code>            invite (expires)
	*   rl:<scope>:<who>      rate limit counters (expire)
	*
	* Numeric ids are zero padded so listings come back in numeric order.
	*/
	var CHANGE_TTL_SECONDS = 1209600;
	var deskPrefix = (desk) => `hd:${desk}:`;
	function deskKeys(desk) {
		const p = deskPrefix(desk);
		return {
			prefix: p,
			meta: `${p}meta`,
			members: `${p}members`,
			cfg: (kind) => `${p}cfg:${kind}`,
			seq: `${p}seq`,
			rev: `${p}rev`,
			change: (rev) => `${p}ch:${pad(rev, 12)}`,
			changePrefix: `${p}ch:`,
			ticket: (id) => `${p}t:${pad(id)}`,
			ticketPrefix: `${p}t:`,
			event: (id, n) => `${p}e:${pad(id)}:${pad(n, 6)}`,
			eventPrefix: (id) => `${p}e:${pad(id)}:`,
			user: (id) => `${p}u:${pad(id)}`,
			userPrefix: `${p}u:`,
			userByEmail: (email) => `${p}ue:${email}`,
			userByUuid: (uuid) => `${p}uu:${uuid}`,
			requesterTicket: (user, ticket) => `${p}rt:${pad(user)}:${pad(ticket)}`,
			requesterPrefix: (user) => `${p}rt:${pad(user)}:`,
			submitterTicket: (uuid, ticket) => `${p}ps:${uuid}:${pad(ticket)}`,
			submitterPrefix: (uuid) => `${p}ps:${uuid}:`,
			org: (id) => `${p}o:${pad(id)}`,
			orgPrefix: `${p}o:`,
			orgByDomain: (domain) => `${p}od:${domain}`,
			article: (id) => `${p}k:${pad(id)}`,
			articlePrefix: `${p}k:`,
			articleBody: (id) => `${p}kb:${pad(id)}`,
			file: (id) => `${p}f:${id}`,
			solved: (id) => `${p}sv:${pad(id)}`,
			solvedPrefix: `${p}sv:`,
			presence: (ticket, uuid) => `${p}pr:${pad(ticket)}:${uuid}`,
			presencePrefix: (ticket) => `${p}pr:${pad(ticket)}:`,
			invite: (code) => `${p}inv:${code}`,
			rate: (scope, who) => `${p}rl:${scope}:${who}`
		};
	}
	/** The numeric id at the end of a record key. */
	function idFromKey(key) {
		const m = /:(\d+)$/.exec(key);
		return m ? Number(m[1]) : null;
	}
	//#endregion
	//#region src/shared/model.js
	/**
	* The help desk's domain vocabulary, shared by the worker and the app:
	* ticket statuses, priorities, types, channels and roles, plus the
	* normalizers that turn untrusted input into well-formed records. Everything
	* here is pure so it runs the same in a browser, a Puter worker and tests.
	*/
	var STATUSES = [
		"new",
		"open",
		"pending",
		"hold",
		"solved",
		"closed"
	];
	var PRIORITIES = [
		"low",
		"normal",
		"high",
		"urgent"
	];
	var PRIORITY_RANK = {
		low: 1,
		normal: 2,
		high: 3,
		urgent: 4
	};
	var TYPES = [
		"question",
		"incident",
		"problem",
		"task"
	];
	var CHANNELS = [
		"web",
		"portal",
		"email",
		"phone",
		"chat",
		"api"
	];
	var ROLES = ["admin", "agent"];
	var FIELD_TYPES = [
		"text",
		"textarea",
		"number",
		"date",
		"checkbox",
		"dropdown"
	];
	var LIMITS = {
		subject: 200,
		name: 120,
		email: 254,
		tag: 40,
		tags: 30,
		comment: 65536,
		notes: 4e3,
		articleBody: 122880,
		attachment: 20971520,
		attachmentsPerComment: 10
	};
	var ValidationError = class extends Error {
		constructor(message, field) {
			super(message);
			this.code = "invalid";
			this.status = 400;
			this.field = field;
		}
	};
	var EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
	function isEmail(value) {
		return typeof value === "string" && value.length <= LIMITS.email && EMAIL_RE.test(value);
	}
	function normEmail(value) {
		const v = String(value ?? "").trim().toLowerCase();
		return isEmail(v) ? v : "";
	}
	/** Collapse whitespace and clip to a length. */
	function cleanLine(value, max = 200) {
		return String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
	}
	function cleanText(value, max = 4e3) {
		return String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, max);
	}
	/** Tags are lowercase words joined by underscores, like most help desks use. */
	function normTag(value) {
		return String(value ?? "").trim().toLowerCase().replace(/[\s,]+/g, "_").replace(/[^\p{L}\p{N}_\-.]/gu, "").slice(0, LIMITS.tag);
	}
	function normTags(list) {
		const out = [];
		for (const t of Array.isArray(list) ? list : String(list ?? "").split(/[\s,]+/)) {
			const tag = normTag(t);
			if (tag && !out.includes(tag)) out.push(tag);
			if (out.length >= LIMITS.tags) break;
		}
		return out;
	}
	function oneOf(value, list, fallback = null) {
		return list.includes(value) ? value : fallback;
	}
	/** Domain part of an email address, for matching a customer to an organization. */
	function emailDomain(email) {
		const at = String(email || "").lastIndexOf("@");
		return at > 0 ? email.slice(at + 1).toLowerCase() : "";
	}
	function normDomain(value) {
		const v = String(value ?? "").trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
		return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) ? v : "";
	}
	/** First name for greetings in macros and emails. */
	function firstName(name) {
		return String(name || "").trim().split(/\s+/)[0] || "";
	}
	/**
	* Validate a custom field value against its definition. Returns the cleaned
	* value, or undefined when the value should be cleared.
	*/
	function cleanFieldValue(def, value) {
		if (value === null || value === void 0 || value === "") return void 0;
		switch (def.type) {
			case "text": return cleanLine(value, 500) || void 0;
			case "textarea": return cleanText(value, 4e3) || void 0;
			case "number": {
				const n = Number(value);
				return Number.isFinite(n) ? n : void 0;
			}
			case "date": return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : void 0;
			case "checkbox": return value === true || value === "true" ? true : void 0;
			case "dropdown": return (def.options || []).map((o) => o.value).includes(value) ? value : void 0;
			default: return;
		}
	}
	//#endregion
	//#region src/shared/html.js
	/**
	* Rich text helpers shared by the worker and the app. Comments and articles
	* are stored as a small, safe subset of HTML. The sanitizer below rebuilds
	* the markup from tokens against an allowlist, so nothing from the input is
	* passed through verbatim; it needs no DOM, which lets the worker clean what
	* it stores and the app clean again what it renders.
	*/
	var ALLOWED = /* @__PURE__ */ new Set([
		"p",
		"br",
		"div",
		"span",
		"b",
		"strong",
		"i",
		"em",
		"u",
		"s",
		"strike",
		"del",
		"code",
		"pre",
		"blockquote",
		"ul",
		"ol",
		"li",
		"a",
		"h2",
		"h3",
		"h4",
		"hr",
		"img",
		"table",
		"thead",
		"tbody",
		"tr",
		"th",
		"td",
		"sub",
		"sup",
		"mark"
	]);
	var VOID = /* @__PURE__ */ new Set([
		"br",
		"hr",
		"img"
	]);
	/** Elements whose content is dropped along with them. */
	var DROP_CONTENT = /* @__PURE__ */ new Set([
		"script",
		"style",
		"iframe",
		"object",
		"embed",
		"template",
		"noscript",
		"svg",
		"math",
		"textarea",
		"select",
		"title",
		"head",
		"xmp",
		"noembed",
		"noframes",
		"frameset",
		"canvas"
	]);
	var RENAME = {
		b: "strong",
		i: "em",
		strike: "s",
		del: "s",
		div: "p"
	};
	var ENTITY = /&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/gi;
	function escapeHtml(value) {
		return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
	}
	/** Escape text that may already contain valid entities, keeping them. */
	function escapeText(text) {
		return String(text).replace(/&(?!(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
	var NAMED = {
		amp: "&",
		lt: "<",
		gt: ">",
		quot: "\"",
		apos: "'",
		nbsp: "\xA0",
		mdash: "—",
		ndash: "–",
		hellip: "…",
		rsquo: "’",
		lsquo: "‘",
		rdquo: "”",
		ldquo: "“"
	};
	function decodeEntities(text) {
		return String(text).replace(ENTITY, (all, body) => {
			if (body[0] === "#") {
				const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
				return Number.isFinite(code) && code > 0 && code < 1114112 ? String.fromCodePoint(code) : "";
			}
			const v = NAMED[body.toLowerCase()];
			return v === void 0 ? all : v;
		});
	}
	function safeUrl(raw, { image = false } = {}) {
		const url = decodeEntities(String(raw || "")).trim().replace(/[\u0000- ]+/g, "");
		if (!url) return "";
		if (image) return /^https:\/\//i.test(url) ? url : "";
		if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
		return "";
	}
	function parseAttrs(source) {
		const attrs = {};
		const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
		let m;
		while (m = re.exec(source)) {
			const name = m[1].toLowerCase();
			if (!(name in attrs)) attrs[name] = m[2] ?? m[3] ?? m[4] ?? "";
		}
		return attrs;
	}
	function renderOpen(tag, attrs) {
		if (tag === "a") {
			const href = safeUrl(attrs.href);
			const parts = ["<a"];
			if (href) parts.push(` href="${escapeHtml(href)}"`);
			if (href) parts.push(" target=\"_blank\" rel=\"noopener noreferrer nofollow\"");
			if (attrs.title) parts.push(` title="${escapeHtml(decodeEntities(attrs.title)).slice(0, 300)}"`);
			return parts.join("") + ">";
		}
		if (tag === "img") {
			const src = safeUrl(attrs.src, { image: true });
			if (!src) return "";
			const alt = attrs.alt ? escapeHtml(decodeEntities(attrs.alt)).slice(0, 300) : "";
			return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy">`;
		}
		if (tag === "ol" && /^\d+$/.test(attrs.start || "")) return `<ol start="${attrs.start}">`;
		return `<${tag}>`;
	}
	/**
	* For each position, the index of the ">" that would close a tag whose
	* attributes start there (skipping quoted values), or -1 if none would.
	* Worked out back to front in one pass: scanning ahead from every "<"
	* instead takes seconds on a long message full of unterminated tags.
	*/
	function tagEnds(src) {
		const ends = new Int32Array(src.length + 1).fill(-1);
		let nextDouble = -1;
		let nextSingle = -1;
		for (let i = src.length - 1; i >= 0; i--) {
			const c = src.charCodeAt(i);
			if (c === 62) ends[i] = i;
			else if (c === 34) ends[i] = nextDouble === -1 ? -1 : ends[nextDouble + 1];
			else if (c === 39) ends[i] = nextSingle === -1 ? -1 : ends[nextSingle + 1];
			else ends[i] = ends[i + 1];
			if (c === 34) nextDouble = i;
			else if (c === 39) nextSingle = i;
		}
		return ends;
	}
	/**
	* Clean untrusted HTML down to the allowlist. Unknown tags are dropped but
	* their text kept; script-like elements are dropped with their content;
	* attributes other than a link's href and an image's https src are removed;
	* every open tag is closed.
	*/
	function sanitizeHtml(input, { maxLength = 262144 } = {}) {
		const src = String(input ?? "").slice(0, maxLength * 2);
		const out = [];
		const stack = [];
		const token = /<!--[\s\S]*?(?:-->|$)|<![^>]*>?|<\?[^>]*>?|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/g;
		const ends = tagEnds(src);
		let last = 0;
		let dropUntil = null;
		let m;
		let size = 0;
		const push = (str) => {
			out.push(str);
			size += str.length;
		};
		while ((m = token.exec(src)) && size < maxLength) {
			let attrSource = "";
			if (m[2]) {
				const end = ends[token.lastIndex];
				if (end === -1) {
					token.lastIndex = m.index + 1;
					continue;
				}
				attrSource = src.slice(token.lastIndex, end);
				token.lastIndex = end + 1;
			}
			const text = src.slice(last, m.index);
			last = token.lastIndex;
			if (dropUntil) {
				if (m[2] && m[1] && m[2].toLowerCase() === dropUntil) dropUntil = null;
				continue;
			}
			if (text) push(escapeText(text).slice(0, Math.max(0, maxLength - size)));
			if (!m[2]) continue;
			const closing = m[1] === "/";
			const raw = m[2].toLowerCase();
			if (DROP_CONTENT.has(raw)) {
				if (!closing && !/\/\s*$/.test(attrSource)) dropUntil = raw;
				continue;
			}
			if (!ALLOWED.has(raw)) continue;
			const tag = RENAME[raw] || raw;
			if (closing) {
				const at = stack.lastIndexOf(tag);
				if (at === -1) continue;
				while (stack.length > at) push(`</${stack.pop()}>`);
				continue;
			}
			if (VOID.has(tag)) {
				push(tag === "img" ? renderOpen(tag, parseAttrs(attrSource)) : `<${tag}>`);
				continue;
			}
			if (tag === "p" && stack.includes("p")) {
				while (stack.length && stack[stack.length - 1] !== "p") push(`</${stack.pop()}>`);
				if (stack.length) push(`</${stack.pop()}>`);
			}
			if (stack.length > 40) continue;
			push(renderOpen(tag, parseAttrs(attrSource)));
			stack.push(tag);
		}
		if (!dropUntil && size < maxLength) {
			const rest = src.slice(last);
			if (rest) push(escapeText(rest).slice(0, Math.max(0, maxLength - size)));
		}
		while (stack.length) out.push(`</${stack.pop()}>`);
		return out.join("").replace(/<p><\/p>/g, "");
	}
	/** Plain text from stored HTML, for previews, search and email bodies. */
	function htmlToText(html) {
		return decodeEntities(String(html ?? "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "\n- ").replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
	}
	var URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/g;
	/** Plain text (a portal request, an email) to the stored HTML subset. */
	function textToHtml(text) {
		return String(text ?? "").replace(/\r\n?/g, "\n").trim().split(/\n{2,}/).filter((b) => b.trim()).map((block) => {
			return `<p>${escapeHtml(block).replace(URL_RE, (url) => {
				return `<a href="${escapeHtml(url.replace(/&amp;/g, "&"))}" target="_blank" rel="noopener noreferrer nofollow">${url}</a>`;
			}).replace(/\n/g, "<br>")}</p>`;
		}).join("");
	}
	/** A short single-line preview of a comment. */
	function preview(html, max = 160) {
		const text = htmlToText(html).replace(/\s+/g, " ").trim();
		return text.length > max ? `${text.slice(0, max - 1).trimEnd()}\u2026` : text;
	}
	//#endregion
	//#region src/server/http.js
	/**
	* A tiny route table that both the Puter worker and the in-browser backend
	* dispatch through. Handlers receive a context and return plain data (sent
	* as JSON) or a Response; they signal failure by throwing HttpError.
	*/
	var HttpError = class extends Error {
		constructor(status, code, message, extra) {
			super(message || code);
			this.status = status;
			this.code = code;
			if (extra) Object.assign(this, extra);
		}
	};
	function fail(status, code, message, extra) {
		throw new HttpError(status, code, message, extra);
	}
	var Routes = class {
		constructor() {
			this.list = [];
		}
		add(method, pattern, handler) {
			const names = [];
			const source = pattern.split("/").map((seg) => {
				if (seg.startsWith(":")) {
					names.push(seg.slice(1));
					return "([^/]+)";
				}
				return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			}).join("/");
			this.list.push({
				method,
				pattern,
				re: new RegExp(`^${source}$`),
				names,
				handler
			});
			return this;
		}
		get(p, h) {
			return this.add("GET", p, h);
		}
		post(p, h) {
			return this.add("POST", p, h);
		}
		put(p, h) {
			return this.add("PUT", p, h);
		}
		delete(p, h) {
			return this.add("DELETE", p, h);
		}
		match(method, path) {
			for (const r of this.list) {
				if (r.method !== method) continue;
				const m = r.re.exec(path);
				if (!m) continue;
				const params = {};
				r.names.forEach((n, i) => {
					try {
						params[n] = decodeURIComponent(m[i + 1]);
					} catch {
						params[n] = "";
					}
				});
				return {
					route: r,
					params
				};
			}
			return null;
		}
	};
	/** Shape an error for the wire. Unexpected errors never leak their text. */
	function errorBody(e) {
		if (e instanceof HttpError || e && typeof e.status === "number" && e.code) {
			const body = {
				error: e.code,
				message: e.message
			};
			if (e.field) body.field = e.field;
			if (e.current) body.current = e.current;
			return {
				status: e.status,
				body
			};
		}
		if (e && e.code === "too_many_requests") return {
			status: 429,
			body: {
				error: "rate_limited",
				message: "Too many requests. Try again in a moment."
			}
		};
		if (e && e.code === "insufficient_funds") return {
			status: 402,
			body: {
				error: "insufficient_funds",
				message: "The help desk owner has run out of Puter usage credit."
			}
		};
		return {
			status: 500,
			body: {
				error: "server_error",
				message: "Something went wrong on the help desk server."
			}
		};
	}
	/**
	* Read a request body as bytes, giving up once it passes `limit`. A declared
	* length is checked first; without one (a chunked upload) the stream is read
	* only as far as the limit, so an oversized body is never held in memory.
	* Resolves to a Uint8Array, or null when the body is too large.
	*/
	async function readBody(request, limit) {
		if (Number(request.headers.get("content-length") || 0) > limit) return null;
		const reader = request.body?.getReader?.();
		if (!reader) {
			const buf = new Uint8Array(await request.arrayBuffer());
			return buf.byteLength > limit ? null : buf;
		}
		const chunks = [];
		let size = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > limit) {
				reader.cancel().catch(() => {});
				return null;
			}
			chunks.push(value);
		}
		const out = new Uint8Array(size);
		let at = 0;
		for (const c of chunks) {
			out.set(c, at);
			at += c.byteLength;
		}
		return out;
	}
	//#endregion
	//#region src/server/store.js
	/**
	* Key-value helpers for the backend. They wrap the Puter KV API the backend
	* is handed (the worker owner's `me.puter.kv`, or the signed-in user's
	* `puter.kv` when the desk runs in the browser) with the access patterns the
	* help desk needs: batched reads, paged prefix scans, and the commit that
	* writes records together with a numbered change feed entry.
	*/
	var GET_BATCH = 100;
	/**
	* Listings always stay inside one desk. A missing or empty prefix would list
	* the owner's whole store, every desk and invite included.
	*/
	function checkPrefix(prefix) {
		if (typeof prefix !== "string" || !/^hd:[^:*]+:/.test(prefix)) throw new Error("A listing needs a desk key prefix");
	}
	var Store = class {
		constructor(kv, now = () => Date.now()) {
			this.kv = kv;
			this.now = now;
			this.batchGet = true;
		}
		get(key) {
			return this.kv.get(key);
		}
		/** Read many keys, answering values in the same order (null when absent). */
		async getMany(keys) {
			if (!keys.length) return [];
			if (keys.length === 1) return [await this.kv.get(keys[0])];
			const out = [];
			for (let i = 0; i < keys.length; i += GET_BATCH) {
				const slice = keys.slice(i, i + GET_BATCH);
				if (this.batchGet) try {
					const res = await this.kv.get(slice);
					if (Array.isArray(res) && res.length === slice.length) {
						out.push(...res.map((v) => v === void 0 ? null : v));
						continue;
					}
					this.batchGet = false;
				} catch (e) {
					if (e?.code !== "key_too_large" && e?.code !== "bad_request") throw e;
					this.batchGet = false;
				}
				out.push(...await Promise.all(slice.map((k) => this.kv.get(k))));
			}
			return out;
		}
		/** One page of a prefix listing with values. */
		async page(prefix, { limit = 500, cursor, reverse = false } = {}) {
			checkPrefix(prefix);
			const opts = {
				pattern: prefix,
				returnValues: true,
				limit
			};
			if (cursor) opts.cursor = cursor;
			if (reverse) opts.reverse = true;
			const res = await this.kv.list(opts);
			if (Array.isArray(res)) return {
				items: res,
				cursor: null
			};
			return {
				items: res?.items || [],
				cursor: res?.cursor || null
			};
		}
		/** Every entry under a prefix, a page at a time, up to `max`. */
		async all(prefix, { max = 5e3 } = {}) {
			const out = [];
			let cursor;
			do {
				const page = await this.page(prefix, {
					limit: Math.min(1e3, max - out.length),
					cursor
				});
				out.push(...page.items);
				cursor = page.cursor;
			} while (cursor && out.length < max);
			return out;
		}
		async keysUnder(prefix, { max = 1e4 } = {}) {
			checkPrefix(prefix);
			const out = [];
			let cursor;
			do {
				const opts = {
					pattern: prefix,
					limit: 1e3
				};
				if (cursor) opts.cursor = cursor;
				const res = await this.kv.list(opts);
				const items = Array.isArray(res) ? res : res?.items || [];
				for (const it of items) out.push(typeof it === "string" ? it : it.key);
				cursor = Array.isArray(res) ? null : res?.cursor;
			} while (cursor && out.length < max);
			return out;
		}
		set(key, value, expireAt) {
			return expireAt ? this.kv.set(key, value, expireAt) : this.kv.set(key, value);
		}
		setMany(items) {
			if (!items.length) return Promise.resolve(true);
			if (items.length === 1) {
				const it = items[0];
				return this.set(it.key, it.value, it.expireAt);
			}
			return this.kv.set(items);
		}
		update(key, paths) {
			return this.kv.update(key, paths);
		}
		incr(key, amount = 1) {
			return this.kv.incr(key, amount);
		}
		/** Remove paths (like `a` or `a.b`) inside a stored object, leaving the rest alone. */
		async remove(key, ...paths) {
			if (typeof this.kv.remove === "function") return this.kv.remove(key, ...paths);
			const value = structuredClone(await this.kv.get(key) || {});
			for (const p of paths) {
				const parts = p.split(".");
				const last = parts.pop();
				const parent = parts.reduce((o, k) => o && typeof o === "object" ? o[k] : void 0, value);
				if (parent && typeof parent === "object") delete parent[last];
			}
			await this.kv.set(key, value);
			return value;
		}
		del(key) {
			return this.kv.del(key);
		}
		async delMany(keys) {
			for (let i = 0; i < keys.length; i += 20) await Promise.all(keys.slice(i, i + 20).map((k) => this.kv.del(k)));
		}
		/**
		* Write records and the change feed entry that announces them. The revision
		* is taken first so the entry and the records go out in one batch; a reader
		* that finds a revision with no entry yet waits for it (see sync).
		*
		* `change` may be a function, called once the revision is taken: an entry
		* that reads a shared record then holds every write announced at or below
		* its revision, so the highest revision is always the most complete.
		*/
		async commit(keys, records, change) {
			const rev = await this.kv.incr(keys.rev);
			const at = this.now();
			const items = [...records];
			if (typeof change === "function") change = await change();
			if (change) items.push({
				key: keys.change(rev),
				value: {
					...change,
					r: rev,
					at
				},
				expireAt: Math.floor(at / 1e3) + CHANGE_TTL_SECONDS
			});
			await this.setMany(items);
			return rev;
		}
		/** Count `amount` actions against a limit inside a time window. True when allowed. */
		async allow(key, limit, windowSeconds, amount = 1) {
			const k = `${key}:${Math.floor(this.now() / 1e3 / windowSeconds)}`;
			const n = await this.kv.incr(k, amount);
			if (n === amount) try {
				await this.kv.expire(k, windowSeconds * 2);
			} catch {}
			return n <= limit;
		}
	};
	//#endregion
	//#region src/shared/rules.js
	/**
	* Business rules shared by the worker and the app: the condition language
	* used by views and triggers, macro and trigger actions, text placeholders,
	* and service level targets. All pure functions over plain records.
	*/
	var HOUR = 36e5;
	var STATUS_RANK = Object.fromEntries(STATUSES.map((s, i) => [s, i]));
	/** Fields a condition can test, with the operators each supports. */
	var CONDITION_FIELDS = {
		status: {
			label: "Status",
			ops: [
				"is",
				"is_not",
				"less_than",
				"greater_than",
				"changed_to"
			]
		},
		priority: {
			label: "Priority",
			ops: [
				"is",
				"is_not",
				"less_than",
				"greater_than"
			]
		},
		type: {
			label: "Type",
			ops: ["is", "is_not"]
		},
		assignee: {
			label: "Assignee",
			ops: [
				"is",
				"is_not",
				"changed"
			]
		},
		group: {
			label: "Group",
			ops: ["is", "is_not"]
		},
		requester: {
			label: "Requester",
			ops: ["is", "is_not"]
		},
		organization: {
			label: "Organization",
			ops: ["is", "is_not"]
		},
		channel: {
			label: "Channel",
			ops: ["is", "is_not"]
		},
		tags: {
			label: "Tags",
			ops: ["includes", "excludes"]
		},
		subject: {
			label: "Subject",
			ops: ["contains", "not_contains"]
		},
		followers: {
			label: "Followers",
			ops: ["includes_me"]
		},
		created: {
			label: "Hours since created",
			ops: ["less_than", "greater_than"]
		},
		updated: {
			label: "Hours since updated",
			ops: ["less_than", "greater_than"]
		},
		solved: {
			label: "Hours since solved",
			ops: ["less_than", "greater_than"]
		},
		satisfaction: {
			label: "Satisfaction",
			ops: ["is"]
		},
		actor: {
			label: "Updated by",
			ops: ["is"]
		},
		comment: {
			label: "Comment",
			ops: ["is"]
		}
	};
	function hoursSince(ts, now) {
		return ts ? (now - ts) / HOUR : Infinity;
	}
	function compareRank(rank, a, b, op) {
		const x = rank[a];
		const y = rank[b];
		if (x === void 0 || y === void 0) return false;
		return op === "less_than" ? x < y : x > y;
	}
	/**
	* Test one condition. `ctx` carries `me` (the viewing agent's uuid), `now`,
	* and for triggers `before` (the ticket before the update), `actor`
	* ('agent' | 'customer' | 'system') and `comment` (null | { public }).
	*/
	function testCondition(cond, t, ctx = {}) {
		const now = ctx.now ?? Date.now();
		const { field, op } = cond;
		let value = cond.value;
		switch (field) {
			case "status":
				if (op === "changed_to") return !!ctx.before && ctx.before.status !== t.status && t.status === value;
				if (op === "less_than" || op === "greater_than") return compareRank(STATUS_RANK, t.status, value, op);
				return op === "is" ? t.status === value : t.status !== value;
			case "priority":
				if (op === "less_than" || op === "greater_than") return compareRank(PRIORITY_RANK, t.priority, value, op);
				return op === "is" ? (t.priority || "") === (value || "") : (t.priority || "") !== (value || "");
			case "type": return op === "is" ? (t.type || "") === (value || "") : (t.type || "") !== (value || "");
			case "assignee": {
				if (op === "changed") return !!ctx.before && (ctx.before.assignee || "") !== (t.assignee || "");
				if (value === "me") value = ctx.me || "";
				const eq = (t.assignee || "") === (value || "");
				return op === "is" ? eq : !eq;
			}
			case "group": {
				const eq = (t.group || "") === (value || "");
				return op === "is" ? eq : !eq;
			}
			case "requester": {
				const eq = String(t.requester || "") === String(value || "");
				return op === "is" ? eq : !eq;
			}
			case "organization": {
				const eq = String(t.org || "") === String(value || "");
				return op === "is" ? eq : !eq;
			}
			case "channel": {
				const eq = t.via === value;
				return op === "is" ? eq : !eq;
			}
			case "tags": {
				const has = normTags(value).some((tag) => (t.tags || []).includes(tag));
				return op === "includes" ? has : !has;
			}
			case "subject": {
				const has = String(t.subject || "").toLowerCase().includes(String(value || "").toLowerCase());
				return op === "contains" ? has : !has;
			}
			case "followers": return !!ctx.me && (t.followers || []).includes(ctx.me);
			case "created":
			case "updated":
			case "solved": {
				const h = hoursSince(field === "created" ? t.createdAt : field === "updated" ? t.updatedAt : t.solvedAt, now);
				const n = Number(value);
				if (String(value ?? "").trim() === "" || !Number.isFinite(n)) return false;
				if (op === "less_than") return h < n;
				return h > n && h !== Infinity;
			}
			case "satisfaction":
				if (value === "unrated") return !t.csat;
				return t.csat?.score === value;
			case "actor": return ctx.actor === value;
			case "comment":
				if (value === "public") return !!ctx.comment && ctx.comment.public;
				if (value === "private") return !!ctx.comment && !ctx.comment.public;
				if (value === "present") return !!ctx.comment;
				return !ctx.comment;
			default:
				if (field && field.startsWith("field:")) {
					const v = t.fields?.[field.slice(6)];
					if (op === "present") return v !== void 0 && v !== null && v !== "";
					if (op === "absent") return v === void 0 || v === null || v === "";
					const eq = String(v ?? "") === String(value ?? "");
					return op === "is_not" ? !eq : eq;
				}
				return false;
		}
	}
	/** All of `all` must hold and, when `any` is non-empty, at least one of it. */
	function matches(conditions, ticket, ctx) {
		const all = conditions?.all || [];
		const any = conditions?.any || [];
		for (const c of all) if (!testCondition(c, ticket, ctx)) return false;
		if (any.length && !any.some((c) => testCondition(c, ticket, ctx))) return false;
		return true;
	}
	/** Apply field actions (from a macro or trigger) to a ticket copy. */
	function applyActions(ticket, actions, ctx = {}) {
		const t = {
			...ticket,
			tags: [...ticket.tags || []],
			followers: [...ticket.followers || []],
			fields: { ...ticket.fields || {} }
		};
		const notifications = [];
		for (const a of actions || []) switch (a.field) {
			case "status":
				if (STATUSES.includes(a.value) && a.value !== "closed") t.status = a.value;
				break;
			case "priority":
				t.priority = oneOf(a.value, PRIORITIES, null);
				break;
			case "type":
				t.type = oneOf(a.value, TYPES, null);
				break;
			case "assignee":
				t.assignee = a.value === "me" ? ctx.me || null : a.value || null;
				break;
			case "group":
				t.group = a.value || null;
				break;
			case "add_tags":
				for (const tag of normTags(a.value)) if (!t.tags.includes(tag)) t.tags.push(tag);
				break;
			case "remove_tags": {
				const drop = new Set(normTags(a.value));
				t.tags = t.tags.filter((tag) => !drop.has(tag));
				break;
			}
			case "set_tags":
				t.tags = normTags(a.value);
				break;
			case "add_follower": {
				const who = a.value === "me" ? ctx.me : a.value;
				if (who && !t.followers.includes(who)) t.followers.push(who);
				break;
			}
			case "notify_requester":
			case "notify_email":
				notifications.push({
					kind: a.field,
					to: a.to || null,
					subject: a.subject || "",
					body: a.body || ""
				});
				break;
			default: if (a.field && a.field.startsWith("field:")) {
				const id = a.field.slice(6);
				if (a.value === "" || a.value === null || a.value === void 0) delete t.fields[id];
				else t.fields[id] = a.value;
			}
		}
		return {
			ticket: t,
			notifications
		};
	}
	/**
	* Fill {{placeholders}} in macro and notification text. Unknown names are
	* left as typed so a mistake is visible rather than silently blank.
	*/
	function renderPlaceholders(text, data, { escape = (v) => v } = {}) {
		const map = {
			"ticket.id": data.ticket?.id,
			"ticket.subject": data.ticket?.subject,
			"ticket.status": data.ticket?.status,
			"ticket.priority": data.ticket?.priority,
			"ticket.link": data.link,
			"requester.name": data.requester?.name,
			"requester.first_name": firstName(data.requester?.name),
			"requester.email": data.requester?.email,
			"agent.name": data.agent?.name,
			"agent.first_name": firstName(data.agent?.name),
			"desk.name": data.desk?.name,
			"comment.text": data.commentText
		};
		return String(text ?? "").replace(/\{\{\s*([a-z_.]+)\s*\}\}/g, (all, name) => {
			if (!Object.hasOwn(map, name)) return all;
			const v = map[name];
			return v === void 0 || v === null ? "" : escape(String(v));
		});
	}
	/** Default service level targets, in minutes, per priority. */
	var DEFAULT_SLA = {
		enabled: true,
		targets: {
			urgent: {
				first: 60,
				next: 120,
				resolve: 480
			},
			high: {
				first: 240,
				next: 480,
				resolve: 1440
			},
			normal: {
				first: 480,
				next: 1440,
				resolve: 4320
			},
			low: {
				first: 1440,
				next: 2880,
				resolve: 10080
			}
		}
	};
	//#endregion
	//#region src/server/defaults.js
	/**
	* What a new help desk starts with: one group, a few macros, the standard
	* notification triggers, service level targets and a help center outline.
	* Everything here can be edited or removed in Admin.
	*/
	function defaultConfig() {
		const general = randomId(8);
		const start = randomId(8);
		const faq = randomId(8);
		return {
			groups: [{
				id: "support",
				name: "Support",
				desc: "Everyone who answers requests"
			}],
			fields: [],
			views: [],
			sla: structuredClone(DEFAULT_SLA),
			kb: {
				categories: [{
					id: general,
					name: "General",
					desc: "Basics and frequently asked questions",
					order: 0
				}],
				sections: [{
					id: start,
					categoryId: general,
					name: "Getting started",
					order: 0
				}, {
					id: faq,
					categoryId: general,
					name: "Frequently asked questions",
					order: 1
				}]
			},
			macros: [
				{
					id: randomId(8),
					title: "Ask for more details",
					active: true,
					actions: [{
						field: "status",
						value: "pending"
					}],
					comment: {
						public: true,
						html: "<p>Hi {{requester.first_name}},</p><p>Thanks for reaching out. Could you share a few more details, such as the steps you took and any error message you saw? That will help us find the cause quickly.</p><p>Best,<br>{{agent.first_name}}</p>"
					}
				},
				{
					id: randomId(8),
					title: "Close and thank",
					active: true,
					actions: [{
						field: "status",
						value: "solved"
					}],
					comment: {
						public: true,
						html: "<p>Hi {{requester.first_name}},</p><p>Glad we could help. I am marking this request as solved. If anything else comes up, just reply and we will pick it up again.</p><p>Best,<br>{{agent.first_name}}</p>"
					}
				},
				{
					id: randomId(8),
					title: "Escalate to urgent",
					active: true,
					actions: [{
						field: "priority",
						value: "urgent"
					}, {
						field: "add_tags",
						value: "escalated"
					}],
					comment: {
						public: false,
						html: "<p>Escalated. Needs attention today.</p>"
					}
				}
			],
			triggers: [
				{
					id: randomId(8),
					title: "Confirm new requests to the requester",
					active: true,
					event: "created",
					conditions: {
						all: [{
							field: "actor",
							op: "is",
							value: "customer"
						}],
						any: []
					},
					actions: [{
						field: "notify_requester",
						subject: "We received your request",
						body: "Hello,\n\nThanks for contacting {{desk.name}}. Your request has been received and an agent will reply soon. You can follow it at the link below."
					}]
				},
				{
					id: randomId(8),
					title: "Email the requester about public replies",
					active: true,
					event: "any",
					conditions: {
						all: [{
							field: "actor",
							op: "is",
							value: "agent"
						}, {
							field: "comment",
							op: "is",
							value: "public"
						}],
						any: []
					},
					actions: [{
						field: "notify_requester",
						subject: "Re: {{ticket.subject}}",
						body: "{{comment.text}}"
					}]
				},
				{
					id: randomId(8),
					title: "Tag urgent words",
					active: false,
					event: "created",
					conditions: {
						all: [],
						any: [{
							field: "subject",
							op: "contains",
							value: "urgent"
						}, {
							field: "subject",
							op: "contains",
							value: "outage"
						}]
					},
					actions: [{
						field: "priority",
						value: "urgent"
					}, {
						field: "add_tags",
						value: "urgent_words"
					}]
				}
			]
		};
	}
	var CONFIG_KINDS = [
		"groups",
		"macros",
		"views",
		"fields",
		"triggers",
		"sla",
		"kb"
	];
	//#endregion
	//#region src/server/config.js
	/**
	* Validation for the admin-edited configuration documents. Each kind is
	* stored whole under `cfg:<kind>`; these functions keep only known shapes so
	* a stored document can always be read back safely.
	*/
	var ID = /^[a-z0-9-]{2,40}$/;
	var MAX_ITEMS = 500;
	function arr(value, max = MAX_ITEMS) {
		return Array.isArray(value) ? value.slice(0, max) : [];
	}
	function id(value) {
		return typeof value === "string" && ID.test(value) ? value : null;
	}
	function conditions(value) {
		const one = (c) => {
			if (!c || typeof c !== "object") return null;
			const field = String(c.field || "");
			if (!(field in CONDITION_FIELDS) && !/^field:[a-z0-9-]{2,40}$/.test(field)) return null;
			const op = cleanLine(c.op, 30);
			let v = c.value;
			if (Array.isArray(v)) v = v.map((x) => cleanLine(x, 100)).slice(0, 50);
			else if (typeof v === "number" || typeof v === "boolean") v = v;
			else v = cleanLine(v, 200);
			return {
				field,
				op,
				value: v
			};
		};
		return {
			all: arr(value?.all, 50).map(one).filter(Boolean),
			any: arr(value?.any, 50).map(one).filter(Boolean)
		};
	}
	var ACTION_FIELDS = /* @__PURE__ */ new Set([
		"status",
		"priority",
		"type",
		"assignee",
		"group",
		"add_tags",
		"remove_tags",
		"set_tags",
		"add_follower",
		"notify_requester",
		"notify_email"
	]);
	function actions(value) {
		return arr(value, 30).map((a) => {
			if (!a || typeof a !== "object") return null;
			const field = String(a.field || "");
			if (!ACTION_FIELDS.has(field) && !/^field:[a-z0-9-]{2,40}$/.test(field)) return null;
			if (field === "notify_requester" || field === "notify_email") {
				const out = {
					field,
					subject: cleanLine(a.subject, 300),
					body: cleanText(a.body, 8e3)
				};
				if (field === "notify_email") {
					out.to = normEmail(a.to);
					if (!out.to) return null;
				}
				return out;
			}
			return {
				field,
				value: typeof a.value === "boolean" || typeof a.value === "number" ? a.value : cleanLine(a.value, 300)
			};
		}).filter(Boolean);
	}
	var VALIDATORS = {
		groups(value) {
			return arr(value, 200).map((g) => id(g?.id) && cleanLine(g.name, 80) ? {
				id: g.id,
				name: cleanLine(g.name, 80),
				desc: cleanLine(g.desc, 300)
			} : null).filter(Boolean);
		},
		macros(value) {
			return arr(value).map((m) => {
				if (!id(m?.id) || !cleanLine(m.title, 120)) return null;
				const html = m.comment?.html ? sanitizeHtml(m.comment.html, { maxLength: 32768 }) : "";
				return {
					id: m.id,
					title: cleanLine(m.title, 120),
					desc: cleanLine(m.desc, 300),
					active: m.active !== false,
					actions: actions(m.actions),
					comment: html ? {
						html,
						public: m.comment.public !== false
					} : null
				};
			}).filter(Boolean);
		},
		views(value) {
			return arr(value, 200).map((v) => {
				if (!id(v?.id) || !cleanLine(v.title, 120)) return null;
				return {
					id: v.id,
					title: cleanLine(v.title, 120),
					active: v.active !== false,
					conditions: conditions(v.conditions),
					columns: arr(v.columns, 20).map((c) => cleanLine(c, 40)).filter(Boolean),
					sort: {
						field: cleanLine(v.sort?.field || "updatedAt", 40),
						dir: v.sort?.dir === "asc" ? "asc" : "desc"
					},
					groupBy: cleanLine(v.groupBy, 40) || null
				};
			}).filter(Boolean);
		},
		fields(value) {
			return arr(value, 100).map((f) => {
				if (!id(f?.id) || !cleanLine(f.title, 80) || !FIELD_TYPES.includes(f.type)) return null;
				const out = {
					id: f.id,
					title: cleanLine(f.title, 80),
					type: f.type,
					desc: cleanLine(f.desc, 300),
					active: f.active !== false,
					portal: !!f.portal,
					required: !!f.required
				};
				if (f.type === "dropdown") {
					out.options = arr(f.options, 200).map((o) => {
						const label = cleanLine(o?.label ?? o?.value, 100);
						const v = normTags([o?.value || label])[0];
						return label && v ? {
							value: v,
							label
						} : null;
					}).filter(Boolean);
					if (!out.options.length) throw new ValidationError(`Add at least one option to "${out.title}"`, "options");
				}
				return out;
			}).filter(Boolean);
		},
		triggers(value) {
			return arr(value, 200).map((t) => {
				if (!id(t?.id) || !cleanLine(t.title, 120)) return null;
				return {
					id: t.id,
					title: cleanLine(t.title, 120),
					active: t.active !== false,
					event: [
						"created",
						"updated",
						"any"
					].includes(t.event) ? t.event : "any",
					conditions: conditions(t.conditions),
					actions: actions(t.actions)
				};
			}).filter(Boolean);
		},
		sla(value) {
			const targets = {};
			for (const p of PRIORITIES) {
				const t = value?.targets?.[p] || {};
				const minutes = (x) => {
					const n = Math.round(Number(x));
					return Number.isFinite(n) && n > 0 ? Math.min(n, 525600) : null;
				};
				targets[p] = {
					first: minutes(t.first),
					next: minutes(t.next),
					resolve: minutes(t.resolve)
				};
			}
			return {
				enabled: value?.enabled !== false,
				targets
			};
		},
		kb(value) {
			const categories = arr(value?.categories, 100).map((c, i) => id(c?.id) && cleanLine(c.name, 100) ? {
				id: c.id,
				name: cleanLine(c.name, 100),
				desc: cleanLine(c.desc, 300),
				order: Number(c.order ?? i) || 0
			} : null).filter(Boolean);
			const catIds = new Set(categories.map((c) => c.id));
			return {
				categories,
				sections: arr(value?.sections, 500).map((s, i) => id(s?.id) && catIds.has(s.categoryId) && cleanLine(s.name, 100) ? {
					id: s.id,
					categoryId: s.categoryId,
					name: cleanLine(s.name, 100),
					desc: cleanLine(s.desc, 300),
					order: Number(s.order ?? i) || 0
				} : null).filter(Boolean)
			};
		}
	};
	function validateConfig(kind, value) {
		const fn = VALIDATORS[kind];
		if (!fn) throw new ValidationError("Unknown settings", "kind");
		const out = fn(value);
		if (JSON.stringify(out).length > 358400) throw new ValidationError("These settings are too large to save", kind);
		return out;
	}
	/** Clean desk settings an administrator may change. */
	function validateMeta(input, current) {
		const out = {};
		if ("name" in input) {
			const name = cleanLine(input.name, 80);
			if (!name) throw new ValidationError("Give the help desk a name", "name");
			out.name = name;
		}
		if ("appUrl" in input) {
			const url = String(input.appUrl || "");
			out.appUrl = /^https:\/\/[^\s"'<>]+$/.test(url) || /^http:\/\/[a-z0-9.-]*localhost(:\d+)?\//.test(url) ? url.slice(0, 300) : current.appUrl || null;
		}
		if ("server" in input) out.server = /^[a-z0-9_-]{3,63}$/.test(String(input.server || "")) ? input.server : null;
		if ("timezone" in input) out.timezone = cleanLine(input.timezone, 60) || null;
		if ("autoCloseDays" in input) {
			const n = Math.round(Number(input.autoCloseDays));
			out.autoCloseDays = Number.isFinite(n) ? Math.max(0, Math.min(28, n)) : 4;
		}
		if ("portal" in input) {
			const p = input.portal || {};
			out.portal = {
				enabled: !!p.enabled,
				title: cleanLine(p.title, 100),
				intro: cleanLine(p.intro, 300),
				color: /^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : null,
				signInRequired: !!p.signInRequired
			};
		}
		if ("email" in input) {
			const e = input.email || {};
			out.email = {
				enabled: !!e.enabled,
				replyTo: normEmail(e.replyTo) || null,
				inbox: !!e.inbox,
				address: normEmail(e.address) || null
			};
		}
		if ("csat" in input) out.csat = { enabled: !!input.csat?.enabled };
		return out;
	}
	//#endregion
	//#region src/server/tickets.js
	/**
	* Ticket operations shared by the agent API, the help center and email
	* import: creating tickets, applying updates with their event trail and
	* triggers, finding or creating customers, and sending notifications.
	*/
	/** Fields recorded in the event trail when they change. */
	var TRACKED = [
		"subject",
		"status",
		"priority",
		"type",
		"assignee",
		"group",
		"requester",
		"tags",
		"followers",
		"ccs",
		"problem",
		"dueAt",
		"spam"
	];
	function eventId(now) {
		return `${String(now).padStart(13, "0")}${randomId(4)}`;
	}
	function eventKey(K, ticketId, id) {
		return `${K.eventPrefix(ticketId)}${id}`;
	}
	/** Customer (end user) lookups and creation. */
	async function findUserByEmail(store, K, email) {
		const id = await store.get(K.userByEmail(email));
		if (!id) return null;
		return store.get(K.user(id));
	}
	async function orgForEmail(store, K, email) {
		const domain = emailDomain(email);
		if (!domain) return null;
		return await store.get(K.orgByDomain(domain)) || null;
	}
	/** Create a customer record. Returns the stored user. */
	async function createUser(store, K, input, by) {
		const email = normEmail(input.email);
		const name = cleanLine(input.name, LIMITS.name) || (email ? email.split("@")[0] : "");
		if (!name) throw new ValidationError("A customer needs a name or an email address", "name");
		if (input.email && !email) throw new ValidationError("That email address does not look right", "email");
		if (email) {
			const existing = await findUserByEmail(store, K, email);
			if (existing) return existing;
		}
		const id = (await store.incr(K.seq, { u: 1 })).u;
		const now = store.now();
		const org = input.org ? Number(input.org) || null : email ? await orgForEmail(store, K, email) : null;
		const user = {
			id,
			name,
			email: email || null,
			phone: cleanLine(input.phone, 40) || null,
			org,
			tags: normTags(input.tags),
			notes: cleanText(input.notes, LIMITS.notes) || "",
			locale: cleanLine(input.locale, 20) || null,
			tz: cleanLine(input.tz, 60) || null,
			puter: null,
			suspended: false,
			createdAt: now,
			updatedAt: now
		};
		const records = [{
			key: K.user(id),
			value: user
		}];
		if (email) records.push({
			key: K.userByEmail(email),
			value: id
		});
		await store.commit(K, records, {
			k: "u",
			id,
			v: user,
			by: by?.id || null
		});
		return user;
	}
	/** Resolve the requester of a new ticket: an id, or a name and email. */
	async function resolveRequester(store, K, input, by) {
		if (input && (typeof input === "number" || typeof input === "string") && Number(input)) {
			const user = await store.get(K.user(Number(input)));
			if (!user) throw new ValidationError("That requester no longer exists", "requester");
			return user;
		}
		if (input && input.id) return resolveRequester(store, K, input.id, by);
		if (input && (input.email || input.name)) return createUser(store, K, input, by);
		throw new ValidationError("Choose who the ticket is for", "requester");
	}
	/** Clean custom field values against the desk's field definitions. */
	function cleanFields(defs, values, base = {}) {
		const out = { ...base };
		if (!values || typeof values !== "object") return out;
		for (const def of defs || []) {
			if (!(def.id in values)) continue;
			const v = cleanFieldValue(def, values[def.id]);
			if (v === void 0) delete out[def.id];
			else out[def.id] = v;
		}
		return out;
	}
	function sameValue(a, b) {
		if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a || []) === JSON.stringify(b || []);
		return (a ?? null) === (b ?? null);
	}
	function diffTickets(before, after) {
		const changes = [];
		for (const f of TRACKED) if (!sameValue(before[f], after[f])) changes.push({
			field: f,
			from: before[f] ?? null,
			to: after[f] ?? null
		});
		const bf = before.fields || {};
		const af = after.fields || {};
		for (const id of /* @__PURE__ */ new Set([...Object.keys(bf), ...Object.keys(af)])) if (!sameValue(bf[id], af[id])) changes.push({
			field: `field:${id}`,
			from: bf[id] ?? null,
			to: af[id] ?? null
		});
		return changes;
	}
	/**
	* Clean an agent's patch against the ticket and desk configuration. Only
	* known fields pass; ids must exist.
	*/
	function cleanPatch(patch, { members, cfg, ticket }) {
		const out = {};
		if (!patch || typeof patch !== "object") return out;
		if ("subject" in patch) {
			const s = cleanLine(patch.subject, LIMITS.subject);
			if (!s) throw new ValidationError("The subject cannot be empty", "subject");
			out.subject = s;
		}
		if ("status" in patch) {
			const s = oneOf(patch.status, STATUSES);
			if (!s || s === "closed") throw new ValidationError("Choose a valid status", "status");
			out.status = s;
		}
		if ("priority" in patch) out.priority = oneOf(patch.priority, PRIORITIES, null);
		if ("type" in patch) out.type = oneOf(patch.type, TYPES, null);
		if ("assignee" in patch) {
			const a = patch.assignee || null;
			if (a && !members[a]?.active) throw new ValidationError("That agent is not on this help desk", "assignee");
			out.assignee = a;
		}
		if ("group" in patch) {
			const g = patch.group || null;
			if (g && !(cfg.groups || []).some((x) => x.id === g)) throw new ValidationError("That group no longer exists", "group");
			out.group = g;
		}
		if ("tags" in patch) out.tags = normTags(patch.tags);
		if ("followers" in patch) out.followers = [...new Set((Array.isArray(patch.followers) ? patch.followers : []).filter((u) => members[u]))].slice(0, 50);
		if ("ccs" in patch) out.ccs = [...new Set((Array.isArray(patch.ccs) ? patch.ccs : []).map(normEmail).filter(Boolean))].slice(0, 9);
		if ("fields" in patch) out.fields = cleanFields(cfg.fields, patch.fields, ticket?.fields || {});
		if ("problem" in patch) out.problem = Number(patch.problem) || null;
		if ("dueAt" in patch) out.dueAt = Number(patch.dueAt) || null;
		if ("requester" in patch) {
			const r = Number(patch.requester);
			if (!Number.isInteger(r) || r <= 0) throw new ValidationError("Choose a requester", "requester");
			out.requester = r;
		}
		return out;
	}
	function commentFrom(input, { by, via, now }) {
		if (!input) return null;
		const html = sanitizeHtml(input.html ?? textToHtml(input.text || ""), { maxLength: LIMITS.comment });
		const text = htmlToText(html);
		const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0, LIMITS.attachmentsPerComment).map(cleanAttachment).filter(Boolean) : [];
		if (!text && !attachments.length) return null;
		return {
			kind: "comment",
			public: input.public !== false,
			html,
			text: text.slice(0, 2e4),
			attachments,
			by,
			via,
			at: now
		};
	}
	function cleanAttachment(a) {
		if (!a || typeof a.id !== "string" || !/^[a-z0-9]{8,40}$/.test(a.id)) return null;
		return {
			id: a.id,
			name: cleanLine(a.name, 200) || "file",
			size: Number(a.size) || 0,
			type: cleanLine(a.type, 100) || "application/octet-stream"
		};
	}
	/**
	* Run the desk's active triggers against an update. Each trigger fires at
	* most once, in order, and sees the ticket as earlier triggers left it.
	*/
	function runTriggers(triggers, { before, after, event, actor, comment, me }) {
		let t = after;
		const fired = [];
		const notifications = [];
		for (const trig of triggers || []) {
			if (!trig.active) continue;
			if (trig.event === "created" && event !== "created") continue;
			if (trig.event === "updated" && event !== "updated") continue;
			if (!matches(trig.conditions, t, {
				before,
				actor,
				comment,
				me
			})) continue;
			const res = applyActions(t, trig.actions, { me });
			t = res.ticket;
			fired.push({
				id: trig.id,
				title: trig.title
			});
			for (const n of res.notifications) notifications.push({
				...n,
				trigger: trig.title
			});
		}
		return {
			ticket: t,
			fired,
			notifications
		};
	}
	function portalLink(meta, desk, ticket) {
		if (!meta?.appUrl || !meta?.server) return "";
		return `${meta.appUrl.replace(/#.*$/, "")}#/help/${meta.server}/${desk}/requests/${ticket.id}?key=${ticket.key}`;
	}
	/** Send trigger notifications by email. Failures are reported, not thrown. */
	async function sendNotifications(env, { meta, desk, ticket, requester, agentName, comment, notifications }) {
		const results = [];
		if (!notifications.length) return results;
		if (!env.email || !meta.email?.enabled) return notifications.map((n) => ({
			to: null,
			ok: false,
			skipped: env.email ? "disabled" : "offline",
			trigger: n.trigger
		}));
		const link = portalLink(meta, desk, ticket);
		const data = {
			ticket,
			requester,
			agent: { name: agentName },
			desk: meta,
			link,
			commentText: comment?.text || ""
		};
		for (const n of notifications) {
			const to = n.kind === "notify_requester" ? requester?.email : normEmail(n.to);
			if (!to || requester?.suspended) {
				results.push({
					to: null,
					ok: false,
					skipped: "no_email",
					trigger: n.trigger
				});
				continue;
			}
			const recipients = [to, ...n.kind === "notify_requester" ? ticket.ccs || [] : []].slice(0, 10);
			if (env.store && !await env.store.allow(deskKeys(desk).rate("mail", "day"), env.emailCap ?? 500, 86400, recipients.length)) {
				results.push({
					to: null,
					ok: false,
					skipped: "daily_limit",
					trigger: n.trigger
				});
				continue;
			}
			const subject = cleanLine(renderPlaceholders(n.subject || "[{{desk.name}}] {{ticket.subject}}", data), 300);
			const bodyText = renderPlaceholders(n.body || "{{comment.text}}", data);
			const text = `${bodyText}\n\n${link ? `View your request: ${link}\n\n` : ""}Request #${ticket.id}`;
			const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#1d2125">${textToHtml(bodyText)}${link ? `<p><a href="${escapeHtml(link)}">View your request</a></p>` : ""}<p style="color:#6b7280;font-size:12px">Request #${ticket.id} &middot; ${escapeHtml(meta.name || "Help desk")}</p></div>`;
			try {
				const res = await env.email({
					to: recipients,
					subject: `${subject} [#${ticket.id}]`,
					text,
					html,
					replyTo: meta.email.replyTo || meta.email.inbox && meta.email.address || void 0
				});
				results.push({
					to: recipients,
					ok: !res?.failed?.length,
					failed: res?.failed || [],
					trigger: n.trigger
				});
			} catch (e) {
				results.push({
					to: recipients,
					ok: false,
					error: e?.code || e?.message || "send_failed",
					trigger: n.trigger
				});
			}
		}
		return results;
	}
	/**
	* Create a ticket. `actor` is { type: 'agent'|'customer'|'system', id, name }.
	* Returns { ticket, events, notifications }.
	*/
	async function createTicket(env, desk, ctx, input, actor) {
		const { store } = env;
		const K = deskKeys(desk);
		const { meta, members, cfg } = ctx;
		const now = store.now();
		const subject = cleanLine(input.subject, LIMITS.subject);
		if (!subject) throw new ValidationError("Add a subject", "subject");
		const via = oneOf(input.via, CHANNELS, actor.type === "customer" ? "portal" : "web");
		const comment = commentFrom(input.comment, {
			by: actor,
			via,
			now
		});
		if (!comment && actor.type === "customer") throw new ValidationError("Describe your request", "description");
		const { requester: _requester, ...fields } = input;
		const base = cleanPatch({
			status: "new",
			priority: "normal",
			...fields,
			subject
		}, {
			members,
			cfg,
			ticket: null
		});
		const requester = await resolveRequester(store, K, input.requester, actor);
		const id = (await store.incr(K.seq, { t: 1 })).t;
		let ticket = {
			id,
			subject,
			status: "new",
			priority: null,
			type: null,
			assignee: null,
			group: null,
			followers: [],
			ccs: [],
			tags: [],
			fields: {},
			...base,
			requester: requester.id,
			org: requester.org || null,
			via,
			submitter: actor.type === "agent" ? actor.id : null,
			createdAt: now,
			updatedAt: now,
			solvedAt: null,
			closedAt: null,
			firstReplyAt: null,
			lastAgentReplyAt: actor.type === "agent" && comment?.public ? now : null,
			lastCustomerAt: actor.type === "customer" ? now : null,
			preview: comment ? preview(comment.html) : "",
			desc: comment ? comment.text.slice(0, 600) : "",
			csat: null,
			spam: false,
			deleted: null,
			mergedInto: null,
			problem: base.problem || null,
			key: secret(24),
			updatedBy: actor.id || null,
			submitterPuter: actor.type === "customer" && /^[\w-]{6,64}$/.test(String(input.submitterPuter || "")) ? input.submitterPuter : null,
			unverified: actor.type === "customer" && !!input.unverified
		};
		if (actor.type === "agent" && ticket.status === "new" && ticket.assignee) ticket.status = "open";
		const spam = actor.type === "customer" && input.spam === true;
		if (spam) ticket.spam = true;
		const trig = spam ? {
			ticket,
			fired: [],
			notifications: []
		} : runTriggers(cfg.triggers, {
			before: null,
			after: ticket,
			event: "created",
			actor: actor.type,
			comment,
			me: actor.id
		});
		ticket = trig.ticket;
		if (ticket.status === "solved") ticket.solvedAt = now;
		const events = [];
		if (comment) events.push({
			...comment,
			id: eventId(now),
			ticket: id
		});
		events.push({
			id: eventId(now + 1),
			ticket: id,
			kind: "create",
			at: now,
			by: actor,
			via,
			changes: diffTickets({}, ticket).filter((c) => c.to !== null && !(Array.isArray(c.to) && !c.to.length)),
			triggers: trig.fired
		});
		const records = [
			{
				key: K.ticket(id),
				value: ticket
			},
			{
				key: K.requesterTicket(requester.id, id),
				value: 1
			},
			...events.map((e) => ({
				key: eventKey(K, id, e.id),
				value: e
			}))
		];
		if (ticket.submitterPuter) records.push({
			key: K.submitterTicket(ticket.submitterPuter, id),
			value: 1
		});
		if (ticket.status === "solved") records.push({
			key: K.solved(id),
			value: now
		});
		await store.commit(K, records, {
			k: "t",
			id,
			v: ticket,
			by: actor.id || null,
			ev: summarizeEvents(events, actor)
		});
		const notified = await sendNotifications(env, {
			meta,
			desk,
			ticket,
			requester,
			agentName: actor.name,
			comment,
			notifications: trig.notifications
		});
		return {
			ticket,
			events,
			requester,
			notified
		};
	}
	/** The @handles in a note, lowercased ("Thanks @al." mentions al). */
	function mentionsIn(text) {
		const out = /* @__PURE__ */ new Set();
		for (const m of String(text || "").matchAll(/@([\p{L}\p{N}_][\p{M}]*(?:[\p{L}\p{M}\p{N}_.'’-]*[\p{L}\p{M}\p{N}_])?)/gu)) out.add(m[1].toLowerCase());
		return [...out].slice(0, 20);
	}
	/** A short description of what an update did, carried in the change feed. */
	function summarizeEvents(events, actor) {
		const out = {
			by: actor?.id || null,
			byType: actor?.type || null
		};
		for (const e of events) {
			if (e.kind === "comment") {
				out.comment = {
					public: e.public,
					preview: preview(e.html, 140)
				};
				if (!e.public) out.comment.mentions = mentionsIn(e.text);
			}
			if (e.changes) for (const c of e.changes) {
				if (c.field === "assignee") out.assigned = c.to;
				if (c.field === "status") out.status = c.to;
			}
		}
		return out;
	}
	/**
	* Update a ticket: field changes and/or a comment from an agent or customer.
	* Field changes go out as path updates so two people changing different
	* fields at the same moment both keep their change.
	*/
	async function updateTicket(env, desk, ctx, id, input, actor) {
		const { store } = env;
		const K = deskKeys(desk);
		const { meta, members, cfg } = ctx;
		const before = await store.get(K.ticket(id));
		if (!before) fail(404, "not_found", "That ticket no longer exists");
		if (before.status === "closed" && !input.csat) fail(409, "closed", "Closed tickets cannot be changed. Create a follow-up instead.");
		if (before.deleted && !input.allowDeleted) fail(409, "deleted", "This ticket is in the trash. Restore it to make changes.");
		const now = store.now();
		const patch = actor.type === "agent" ? cleanPatch(input.patch, {
			members,
			cfg,
			ticket: before
		}) : {};
		if (input.system) Object.assign(patch, input.system);
		const via = actor.type === "customer" ? input.via || "portal" : "web";
		const comment = commentFrom(input.comment, {
			by: actor,
			via,
			now
		});
		if (comment && actor.type === "customer") comment.public = true;
		let after = {
			...before,
			...patch
		};
		if (input.csat) after.csat = input.csat;
		if (patch.requester && patch.requester !== before.requester) {
			const user = await store.get(K.user(patch.requester));
			if (!user) throw new ValidationError("That requester no longer exists", "requester");
			after.org = user.org || null;
		}
		if (actor.type === "customer" && comment && [
			"pending",
			"solved",
			"hold"
		].includes(before.status) && !("status" in patch)) after.status = "open";
		if (actor.type === "agent" && after.status === "new" && (comment || after.assignee) && !("status" in (input.patch || {}))) after.status = "open";
		if (actor.type === "agent" && patch.status === "solved" && before.status !== "solved" && !input.system?.mergedInto) {
			const missing = (cfg.fields || []).filter((f) => f.active && f.required && (after.fields?.[f.id] == null || after.fields[f.id] === ""));
			if (missing.length) throw new ValidationError(`Fill in ${missing.map((f) => f.title).join(", ")} before solving`, `field:${missing[0].id}`);
		}
		const trig = runTriggers(cfg.triggers, {
			before,
			after,
			event: "updated",
			actor: actor.type,
			comment,
			me: actor.id
		});
		after = trig.ticket;
		if (before.status === "closed") after = {
			...before,
			csat: after.csat
		};
		const changes = diffTickets(before, after);
		if (!changes.length && !comment && !input.csat && !input.force) return {
			ticket: before,
			events: [],
			notified: []
		};
		const stamps = {
			updatedAt: now,
			updatedBy: actor.id || null
		};
		if (comment) {
			stamps.preview = preview(comment.html);
			if (actor.type === "customer") stamps.lastCustomerAt = now;
			if (actor.type === "agent" && comment.public) {
				stamps.lastAgentReplyAt = now;
				if (!before.firstReplyAt) {
					stamps.firstReplyAt = now;
					if (before.lastAgentReplyAt) stamps.firstReplyFrom = before.lastCustomerAt > before.lastAgentReplyAt ? before.lastCustomerAt : null;
				}
			}
		}
		if (after.status === "solved" && before.status !== "solved") stamps.solvedAt = now;
		if (after.status !== "solved" && before.status === "solved") stamps.solvedAt = null;
		const paths = { ...stamps };
		if (input.csat) paths.csat = input.csat;
		const removed = [];
		for (const c of changes) if (c.field.startsWith("field:")) {
			const fid = c.field.slice(6);
			if (after.fields?.[fid] === void 0) removed.push(`fields.${fid}`);
			else paths[`fields.${fid}`] = after.fields[fid];
		} else paths[c.field] = after[c.field] ?? null;
		if (after.org !== before.org) paths.org = after.org;
		const newRequester = patch.requester && patch.requester !== before.requester;
		if (newRequester) {
			paths.key = secret(24);
			paths.submitterPuter = null;
			paths.unverified = false;
		}
		const events = [];
		if (comment) events.push({
			...comment,
			id: eventId(now),
			ticket: id
		});
		if (input.csat) events.push({
			id: eventId(now),
			ticket: id,
			kind: "rating",
			at: now,
			by: actor,
			score: input.csat.score,
			comment: input.csat.comment
		});
		if (changes.length || trig.fired.length) events.push({
			id: eventId(now + 1),
			ticket: id,
			kind: "change",
			at: now,
			by: actor,
			via,
			changes,
			triggers: trig.fired,
			macro: input.macro || null
		});
		const ticket = await writeTicket(store, K, id, paths, removed);
		const records = events.map((e) => ({
			key: eventKey(K, id, e.id),
			value: e
		}));
		if (patch.requester && patch.requester !== before.requester) records.push({
			key: K.requesterTicket(patch.requester, id),
			value: 1
		});
		if (ticket.status === "solved" && before.status !== "solved") records.push({
			key: K.solved(id),
			value: now
		});
		await store.commit(K, records, {
			k: "t",
			id,
			v: ticket,
			by: actor.id || null,
			ev: summarizeEvents(events, actor)
		});
		if (newRequester) {
			await store.del(K.requesterTicket(before.requester, id)).catch(() => {});
			if (before.submitterPuter) await store.del(K.submitterTicket(before.submitterPuter, id)).catch(() => {});
		}
		if (before.status === "solved" && ticket.status !== "solved") await store.del(K.solved(id)).catch(() => {});
		let notified = [];
		if (trig.notifications.length) notified = await sendNotifications(env, {
			meta,
			desk,
			ticket,
			requester: await store.get(K.user(ticket.requester)),
			agentName: actor.name,
			comment,
			notifications: trig.notifications
		});
		return {
			ticket,
			events,
			notified
		};
	}
	/**
	* Write some fields of a ticket with a path update and return the stored
	* ticket. Every write also bumps the ticket's `ver` atomically, and the copy
	* that comes back includes every write that landed before it. Copies can
	* then be ordered by `ver`, even when two updates land in the opposite order
	* of their clocks (which `updatedAt` cannot tell apart).
	*/
	async function writeTicket(store, K, id, paths, remove = []) {
		await store.update(K.ticket(id), paths);
		if (remove.length) await store.remove(K.ticket(id), ...remove);
		const ticket = await store.incr(K.ticket(id), { ver: 1 });
		return ticket && typeof ticket === "object" ? ticket : store.get(K.ticket(id));
	}
	/** Close solved tickets older than the desk's auto-close window. */
	async function autoClose(env, desk, meta, { limit = 50 } = {}) {
		const { store } = env;
		const K = deskKeys(desk);
		const days = Number(meta.autoCloseDays ?? 4);
		if (!(days > 0)) return 0;
		const cutoff = store.now() - days * 24 * 3600 * 1e3;
		const due = [];
		let cursor;
		let pages = 0;
		do {
			const page = await store.page(K.solvedPrefix, {
				limit: 500,
				cursor
			});
			for (const item of page.items) if (Number(item.value) <= cutoff) due.push(item);
			cursor = page.cursor;
		} while (cursor && due.length < limit && ++pages < 20);
		let closed = 0;
		for (const { key } of due) {
			if (closed >= limit) break;
			const id = Number(key.slice(K.solvedPrefix.length));
			const t = await store.get(K.ticket(id));
			if (t && t.status === "solved" && !t.deleted && !t.spam) {
				const now = store.now();
				const ticket = await writeTicket(store, K, id, {
					status: "closed",
					closedAt: now,
					updatedAt: now
				});
				const ev = {
					id: eventId(now),
					ticket: id,
					kind: "change",
					at: now,
					by: {
						type: "system",
						id: null,
						name: "Automation"
					},
					changes: [{
						field: "status",
						from: "solved",
						to: "closed"
					}]
				};
				await store.commit(K, [{
					key: eventKey(K, id, ev.id),
					value: ev
				}], {
					k: "t",
					id,
					v: ticket,
					by: null,
					ev: {
						byType: "system",
						status: "closed"
					}
				});
				closed++;
			}
			await store.del(key).catch(() => {});
		}
		return closed;
	}
	/** Load every event of a ticket in time order. */
	async function ticketEvents(store, K, id) {
		return (await store.all(K.eventPrefix(id), { max: 5e3 })).map((r) => r.value).filter(Boolean).sort((a, b) => a.id < b.id ? -1 : 1);
	}
	//#endregion
	//#region src/server/email.js
	/**
	* Turning received email into tickets. The owner's browser reads their
	* Puter mailbox and hands each new message to the import route; this module
	* decides whether it continues an existing request (the subject carries
	* the request number, as every notification email does) or starts a new one.
	*/
	/** "[#123]" or "Request #123" in a subject, the way notifications are tagged. */
	function ticketNumberFrom(subject) {
		const m = /\[#(\d{1,9})\]/.exec(String(subject || "")) || /\brequest #(\d{1,9})\b/i.exec(String(subject || ""));
		return m ? Number(m[1]) : null;
	}
	/** The subject without reply prefixes and the request number tag. */
	function cleanSubject(subject) {
		let s = String(subject || "").replace(/\s*\[#\d+\]\s*/g, " ");
		for (let i = 0; i < 5; i++) s = s.replace(/^\s*(re|fw|fwd|aw|sv|antw)\s*:\s*/i, "");
		return cleanLine(s, 200) || "(no subject)";
	}
	/**
	* Drop the quoted history most mail clients add under a reply, so a ticket
	* shows what the customer actually wrote.
	*/
	function stripQuoted(text) {
		const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
		const out = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const next = lines[i + 1] || "";
			if (/^\s*>/.test(line)) break;
			if (/^\s*On .{3,200}wrote:\s*$/i.test(line)) break;
			if (/^\s*On .{3,200}$/i.test(line) && /wrote:\s*$/i.test(next)) break;
			if (/^\s*-{2,}\s*Original Message\s*-{2,}/i.test(line)) break;
			if (/^\s*_{10,}\s*$/.test(line) && /^\s*From:/i.test(next)) break;
			if (/^\s*From:\s.+$/i.test(line) && /^\s*(Sent|Date):\s/i.test(next)) break;
			out.push(line);
		}
		return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
	}
	/** Validate one message handed over by the browser. */
	function cleanMessage(m) {
		if (!m || typeof m !== "object") return null;
		const from = normEmail(m.from?.address);
		if (!from) return null;
		const id = cleanLine(m.messageId || m.id, 300);
		if (!id) return null;
		const body = stripQuoted(cleanText(m.text || "", 6e4));
		return {
			id,
			from,
			name: cleanLine(m.from?.name, 120) || from.split("@")[0],
			subject: cleanLine(m.subject, 300),
			text: body || "(empty message)",
			cc: (Array.isArray(m.cc) ? m.cc : []).map((c) => normEmail(c?.address || c)).filter(Boolean).slice(0, 9),
			attachments: Array.isArray(m.attachments) ? m.attachments : [],
			date: Date.parse(m.date) || null
		};
	}
	//#endregion
	//#region src/server/backend.js
	/**
	* The help desk backend: every route the app and the help center call. It
	* is written against small injected services (a Puter KV store, a file
	* store, an email sender and an identity lookup) so the same code runs in
	* three places: the Puter worker an owner deploys, the owner's own browser
	* before any worker exists, and the tests.
	*/
	var SWEEP_EVERY = 36e5;
	/** Attachment types served as themselves; every other file is plain bytes. */
	var SAFE_FILE_TYPES = /* @__PURE__ */ new Set([
		"image/png",
		"image/jpeg",
		"image/gif",
		"image/webp",
		"application/pdf",
		"text/plain",
		"text/csv",
		"application/zip"
	]);
	var SYNC_WINDOW = 400;
	function createBackend(options) {
		const store = new Store(options.kv, options.now || (() => Date.now()));
		const env = {
			store,
			fs: options.fs || null,
			email: options.email || null,
			ownerUuid: options.ownerUuid || (async () => null),
			build: options.build || {
				id: "dev",
				at: 0
			}
		};
		const routes = new Routes();
		const articleCache = /* @__PURE__ */ new Map();
		async function identity(req) {
			const who = await req.who?.();
			if (!who || !who.uuid) fail(401, "unauthorized", "Sign in with Puter to continue");
			return who;
		}
		function deskId(value) {
			if (!isId(value, 6, 24)) fail(404, "no_desk", "This help desk does not exist");
			return value;
		}
		/** Load a desk for one of its agents. */
		async function agentContext(req, { admin = false, owner = false, allowDeleted = false } = {}) {
			const desk = deskId(req.params.desk);
			const who = await identity(req);
			const K = deskKeys(desk);
			const [meta, members, groups, fields, triggers] = await store.getMany([
				K.meta,
				K.members,
				K.cfg("groups"),
				K.cfg("fields"),
				K.cfg("triggers")
			]);
			if (!meta || meta.deleted && !allowDeleted) fail(404, "no_desk", "This help desk does not exist");
			const me = members && Object.hasOwn(members, who.uuid) ? members[who.uuid] : null;
			if (!me || !me.active) fail(403, "not_member", "You are not an agent on this help desk");
			if (owner && me.role !== "owner") fail(403, "forbidden", "Only the owner can do that");
			if (admin && me.role === "agent") fail(403, "forbidden", "Only administrators can do that");
			return {
				desk,
				K,
				meta,
				members,
				me,
				who,
				cfg: {
					groups: groups || [],
					fields: fields || [],
					triggers: triggers || []
				},
				actor: {
					type: "agent",
					id: who.uuid,
					name: me.name || who.username
				}
			};
		}
		/** Load a desk for its help center (no sign-in needed). */
		async function portalContext(req) {
			const desk = deskId(req.params.desk);
			const K = deskKeys(desk);
			const [meta, members, groups, fields, triggers] = await store.getMany([
				K.meta,
				K.members,
				K.cfg("groups"),
				K.cfg("fields"),
				K.cfg("triggers")
			]);
			if (!meta || meta.deleted || !meta.portal?.enabled) fail(404, "no_portal", "This help center is not available");
			return {
				desk,
				K,
				meta,
				members: members || {},
				cfg: {
					groups: groups || [],
					fields: fields || [],
					triggers: triggers || []
				}
			};
		}
		async function rateLimit(K, scope, who, limit, windowSeconds) {
			const key = K.rate(scope, (await sha256(who || "anon")).slice(0, 20));
			if (!await store.allow(key, limit, windowSeconds)) fail(429, "rate_limited", "Too many requests. Please wait a few minutes and try again.");
		}
		/**
		* The network a visitor is on, for rate limits: the IPv4 address, or the
		* first 48 bits of an IPv6 address (one site). IPv4 written as IPv6
		* (::ffff:1.2.3.4) counts as IPv4, and shortened IPv6 is expanded first.
		*/
		function ipOf(req) {
			const raw = String(req.headers?.["x-real-ip"] || req.ip || "local").trim().toLowerCase();
			if (!raw.includes(":")) return raw;
			const v4 = raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
			if (v4) return v4[1];
			const [head, tail = ""] = raw.split("%")[0].split("::");
			const left = head ? head.split(":") : [];
			const right = raw.includes("::") && tail ? tail.split(":") : [];
			return (raw.includes("::") ? [
				...left,
				...Array(Math.max(0, 8 - left.length - right.length)).fill("0"),
				...right
			] : left).slice(0, 3).map((g) => g.replace(/^0+(?=.)/, "")).join(":");
		}
		function num(value) {
			const n = Number(value);
			if (!Number.isInteger(n) || n <= 0) fail(404, "not_found", "Not found");
			return n;
		}
		/**
		* Announce a change to the team. Callers change members with path updates,
		* never by writing the whole list back, so concurrent changes all survive;
		* the feed entry reads the list once its revision is taken.
		*/
		async function memberChange(K, by) {
			let members = null;
			await store.commit(K, [], async () => {
				members = await store.get(K.members) || {};
				return {
					k: "m",
					id: "members",
					v: members,
					by
				};
			});
			return members;
		}
		routes.get("/health", async () => ({
			ok: true,
			build: env.build.id,
			builtAt: env.build.at
		}));
		routes.post("/api/desks", async (req) => {
			const who = await identity(req);
			const owner = await env.ownerUuid();
			if (!owner || owner !== who.uuid) fail(403, "forbidden", "Only the owner of this server can create help desks on it");
			const body = req.body || {};
			const name = cleanLine(body.name, 80);
			if (!name) throw new ValidationError("Give the help desk a name", "name");
			const desk = isId(body.id, 8, 24) ? body.id : randomId(10);
			const K = deskKeys(desk);
			if (await store.get(K.meta)) fail(409, "exists", "A help desk with that id already exists");
			const now = store.now();
			const meta = {
				id: desk,
				name,
				owner: who.uuid,
				createdAt: now,
				appUrl: null,
				server: null,
				timezone: cleanLine(body.timezone, 60) || null,
				autoCloseDays: 4,
				portal: {
					enabled: false,
					title: name,
					intro: "Search for answers or send us a request.",
					color: null,
					signInRequired: false
				},
				email: {
					enabled: true,
					replyTo: null
				},
				csat: { enabled: true },
				sweptAt: now,
				...validateMeta({
					appUrl: body.appUrl,
					server: body.server
				}, {})
			};
			const members = { [who.uuid]: {
				uuid: who.uuid,
				username: who.username || "",
				name: cleanLine(body.agentName, 80) || who.username || "Owner",
				role: "owner",
				groups: ["support"],
				active: true,
				joinedAt: now
			} };
			const cfg = defaultConfig();
			await store.setMany([
				{
					key: K.meta,
					value: meta
				},
				{
					key: K.members,
					value: members
				},
				{
					key: K.seq,
					value: {
						t: 0,
						u: 0,
						o: 0,
						a: 0
					}
				},
				...CONFIG_KINDS.map((kind) => ({
					key: K.cfg(kind),
					value: cfg[kind]
				}))
			]);
			return {
				desk,
				meta
			};
		});
		/**
		* Copy a desk's records into this server. Used when an owner who started
		* in the browser turns on team access and the server's store turns out to
		* be separate from the one the browser used. Owner only, desk keys only.
		*/
		routes.post("/api/import/:desk", async (req) => {
			const who = await identity(req);
			const owner = await env.ownerUuid();
			if (!owner || owner !== who.uuid) fail(403, "forbidden", "Only the owner of this server can import data");
			const prefix = deskKeys(deskId(req.params.desk)).prefix;
			const items = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 500).filter((it) => typeof it?.key === "string" && it.key.startsWith(prefix) && it.key.length < 512 && !it.key.startsWith(`${prefix}ch:`) && !it.key.startsWith(`${prefix}pr:`)).map((it) => ({
				key: it.key,
				value: it.value
			}));
			await store.setMany(items);
			return { written: items.length };
		});
		routes.get("/api/d/:desk/bootstrap", async (req) => {
			const c = await agentContext(req);
			const vals = await store.getMany([...CONFIG_KINDS.map((k) => c.K.cfg(k)), c.K.rev]);
			const cfg = Object.fromEntries(CONFIG_KINDS.map((k, i) => [k, vals[i]]));
			return {
				meta: c.meta,
				members: c.members,
				cfg,
				rev: Number(vals[vals.length - 1]) || 0,
				me: c.me
			};
		});
		routes.put("/api/d/:desk/meta", async (req) => {
			const c = await agentContext(req, { admin: true });
			const patch = validateMeta(req.body || {}, c.meta);
			if (!Object.keys(patch).length) return { meta: c.meta };
			const meta = await store.update(c.K.meta, patch);
			await store.commit(c.K, [], {
				k: "d",
				id: "meta",
				v: meta,
				by: c.who.uuid
			});
			return { meta };
		});
		routes.put("/api/d/:desk/cfg/:kind", async (req) => {
			const c = await agentContext(req, { admin: true });
			const kind = req.params.kind;
			if (!CONFIG_KINDS.includes(kind)) fail(404, "not_found", "Unknown settings");
			const value = validateConfig(kind, req.body?.value);
			await store.commit(c.K, [{
				key: c.K.cfg(kind),
				value
			}], {
				k: "c",
				id: kind,
				v: value,
				by: c.who.uuid
			});
			return { value };
		});
		routes.delete("/api/d/:desk", async (req) => {
			const c = await agentContext(req, {
				owner: true,
				allowDeleted: true
			});
			if (!c.meta.deleted) await store.update(c.K.meta, { deleted: store.now() });
			const keys = await store.keysUnder(c.K.prefix, { max: 2e3 });
			const rest = keys.filter((k) => k !== c.K.meta && k !== c.K.members);
			await store.delMany(rest);
			const done = keys.length < 2e3;
			if (done) {
				if (env.fs?.delete) await env.fs.delete(`help-desk/${c.desk}`, { recursive: true }).catch(() => {});
				await store.delMany([c.K.members, c.K.meta]);
			}
			return { remaining: !done };
		});
		routes.get("/api/d/:desk/sync", async (req) => {
			const c = await agentContext(req);
			const since = Math.max(0, Number(req.query?.since) || 0);
			const head = Number(await store.get(c.K.rev)) || 0;
			if (store.now() - (c.meta.sweptAt || 0) > SWEEP_EVERY && await store.allow(c.K.rate("sweep", "auto-close"), 1, Math.ceil(SWEEP_EVERY / 1e3))) {
				await store.update(c.K.meta, { sweptAt: store.now() });
				await autoClose(env, c.desk, c.meta).catch(() => 0);
			}
			if (since >= head) return {
				rev: head,
				head,
				changes: []
			};
			if (head - since > SYNC_WINDOW) return {
				rev: head,
				head,
				reset: true,
				changes: []
			};
			const keys = [];
			for (let r = since + 1; r <= head; r++) keys.push(c.K.change(r));
			const values = await store.getMany(keys);
			const changes = [];
			let rev = since;
			for (const v of values) {
				if (!v) break;
				changes.push(v);
				rev = v.r;
			}
			return {
				rev,
				head,
				changes,
				gap: rev < head
			};
		});
		const KIND_PREFIX = {
			tickets: "ticketPrefix",
			users: "userPrefix",
			orgs: "orgPrefix",
			articles: "articlePrefix"
		};
		/**
		* A listing tells the reader which revision it includes, and the reader
		* replays the change feed from there. A write that has taken a revision
		* but not yet stored its record would be missed both ways, so wait (a
		* little) for the latest entries to land before reading. Entries still
		* missing are expired or failed writes; they are remembered for a minute
		* so the next listing does not wait for them again.
		*/
		const missingEntries = /* @__PURE__ */ new Map();
		async function settledRev(c) {
			const rev = Number(await store.get(c.K.rev)) || 0;
			const known = missingEntries.get(c.desk);
			const skip = known && known.until > store.now() ? known.revs : /* @__PURE__ */ new Set();
			let open = [];
			for (let r = Math.max(1, rev - 9); r <= rev; r++) if (!skip.has(r)) open.push(r);
			for (let attempt = 0; open.length && attempt < 4; attempt++) {
				if (attempt) await new Promise((resolve) => setTimeout(resolve, 150));
				const found = await store.getMany(open.map((r) => c.K.change(r)));
				open = open.filter((_, i) => !found[i]);
			}
			if (open.length) missingEntries.set(c.desk, {
				revs: /* @__PURE__ */ new Set([...skip, ...open]),
				until: store.now() + 6e4
			});
			return rev;
		}
		routes.get("/api/d/:desk/records/:kind", async (req) => {
			const c = await agentContext(req);
			const prop = Object.hasOwn(KIND_PREFIX, req.params.kind) ? KIND_PREFIX[req.params.kind] : null;
			if (!prop) fail(404, "not_found", "Unknown records");
			const rev = req.query?.cursor ? null : await settledRev(c);
			const page = await store.page(c.K[prop], {
				limit: 500,
				cursor: req.query?.cursor || void 0
			});
			return {
				items: page.items.map((i) => i.value).filter(Boolean),
				cursor: page.cursor,
				rev
			};
		});
		routes.post("/api/d/:desk/tickets", async (req) => {
			const c = await agentContext(req);
			const res = await createTicket(env, c.desk, c, req.body || {}, c.actor);
			return {
				ticket: res.ticket,
				events: res.events,
				requester: res.requester,
				notified: res.notified
			};
		});
		routes.get("/api/d/:desk/tickets/:id", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			const ticket = await store.get(c.K.ticket(id));
			if (!ticket) fail(404, "not_found", "That ticket does not exist");
			return {
				ticket,
				events: await ticketEvents(store, c.K, id)
			};
		});
		routes.post("/api/d/:desk/tickets/:id", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			const body = req.body || {};
			return await updateTicket(env, c.desk, c, id, {
				patch: body.patch,
				comment: body.comment,
				macro: body.macro || null
			}, c.actor);
		});
		async function setFlags(c, id, flags, field) {
			const before = await store.get(c.K.ticket(id));
			if (!before) fail(404, "not_found", "That ticket does not exist");
			const now = store.now();
			const ticket = await writeTicket(store, c.K, id, {
				...flags,
				updatedAt: now,
				updatedBy: c.who.uuid
			});
			const changes = Object.keys(flags).filter((f) => !!before[f] !== !!ticket[f]).map((f) => ({
				field: f,
				from: before[f] ?? null,
				to: ticket[f] ?? null
			}));
			const ev = {
				id: eventId(now),
				ticket: id,
				kind: "change",
				at: now,
				by: c.actor,
				changes: changes.length ? changes : [{
					field,
					from: before[field] ?? null,
					to: ticket[field] ?? null
				}]
			};
			const records = [{
				key: eventKey(c.K, id, ev.id),
				value: ev
			}];
			if (ticket.status === "solved" && !ticket.deleted && !ticket.spam) records.push({
				key: c.K.solved(id),
				value: ticket.solvedAt || now
			});
			await store.commit(c.K, records, {
				k: "t",
				id,
				v: ticket,
				by: c.who.uuid,
				ev: { byType: "agent" }
			});
			if (ticket.deleted || ticket.spam) await store.del(c.K.solved(id)).catch(() => {});
			return ticket;
		}
		routes.post("/api/d/:desk/tickets/:id/delete", async (req) => {
			return { ticket: await setFlags(await agentContext(req), num(req.params.id), { deleted: store.now() }, "deleted") };
		});
		routes.post("/api/d/:desk/tickets/:id/restore", async (req) => {
			return { ticket: await setFlags(await agentContext(req), num(req.params.id), {
				deleted: null,
				spam: false
			}, "deleted") };
		});
		routes.post("/api/d/:desk/tickets/:id/spam", async (req) => {
			return { ticket: await setFlags(await agentContext(req), num(req.params.id), { spam: req.body?.spam !== false }, "spam") };
		});
		routes.delete("/api/d/:desk/tickets/:id", async (req) => {
			const c = await agentContext(req, { admin: true });
			const id = num(req.params.id);
			const ticket = await store.get(c.K.ticket(id));
			if (!ticket) return { ok: true };
			if (!ticket.deleted) fail(409, "not_deleted", "Move the ticket to the trash before deleting it for good");
			const events = await store.all(c.K.eventPrefix(id), { max: 1e4 });
			const fileIds = [...new Set(events.flatMap((e) => (e.value?.attachments || []).map((a) => a?.id)).filter((f) => isId(f, 8, 40)))];
			const files = (await store.getMany(fileIds.map((f) => c.K.file(f)))).filter(Boolean);
			if (env.fs?.delete) await Promise.all(files.map((f) => env.fs.delete(f.path).catch(() => {})));
			await store.delMany([
				...events.map((e) => e.key),
				...fileIds.map((f) => c.K.file(f)),
				c.K.requesterTicket(ticket.requester, id),
				c.K.solved(id)
			]);
			await store.del(c.K.ticket(id));
			await store.commit(c.K, [], {
				k: "t",
				id,
				v: null,
				by: c.who.uuid
			});
			return { ok: true };
		});
		routes.post("/api/d/:desk/tickets-bulk", async (req) => {
			const c = await agentContext(req);
			if (!Array.isArray(req.body?.ids)) throw new ValidationError("Choose the tickets to change", "ids");
			const ids = [...new Set(req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
			const action = req.body?.action || "update";
			const results = [];
			for (const id of ids) try {
				if (action === "delete") results.push({
					id,
					ticket: await setFlags(c, id, { deleted: store.now() }, "deleted")
				});
				else if (action === "restore") results.push({
					id,
					ticket: await setFlags(c, id, {
						deleted: null,
						spam: false
					}, "deleted")
				});
				else if (action === "spam") results.push({
					id,
					ticket: await setFlags(c, id, { spam: true }, "spam")
				});
				else {
					const res = await updateTicket(env, c.desk, c, id, {
						patch: req.body?.patch,
						comment: req.body?.comment
					}, c.actor);
					results.push({
						id,
						ticket: res.ticket
					});
				}
			} catch (e) {
				results.push({
					id,
					error: errorBody(e).body.message
				});
			}
			return { results };
		});
		routes.post("/api/d/:desk/tickets/:id/merge", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			const into = num(req.body?.into);
			if (id === into) throw new ValidationError("A ticket cannot be merged into itself", "into");
			const [source, target] = await store.getMany([c.K.ticket(id), c.K.ticket(into)]);
			if (!source || !target) fail(404, "not_found", "One of the tickets no longer exists");
			if (target.status === "closed") fail(409, "closed", "Closed tickets cannot receive merges");
			if (source.status === "closed") fail(409, "closed", "Closed tickets cannot be merged");
			if (source.deleted || source.spam || target.deleted || target.spam) fail(409, "unavailable", "Tickets in the trash or marked as spam cannot be merged");
			if (source.mergedInto) fail(409, "merged", "This ticket was already merged");
			const publicNote = req.body?.public !== false;
			const sourceText = cleanText(req.body?.sourceComment, 4e3) || `This request was closed and merged into request #${into} "${target.subject}".`;
			const targetText = cleanText(req.body?.targetComment, 4e3) || `Request #${id} "${source.subject}" was closed and merged into this request.`;
			await updateTicket(env, c.desk, c, into, {
				comment: {
					html: textToHtml(targetText),
					public: publicNote
				},
				patch: { tags: [.../* @__PURE__ */ new Set([...target.tags || [], ...source.tags || []])] }
			}, c.actor);
			const res = await updateTicket(env, c.desk, c, id, {
				comment: {
					html: textToHtml(sourceText),
					public: publicNote
				},
				patch: { status: "solved" },
				system: { mergedInto: into },
				force: true
			}, c.actor);
			const now = store.now();
			const ticket = await writeTicket(store, c.K, id, {
				status: "closed",
				closedAt: now,
				mergedInto: into
			});
			await store.commit(c.K, [], {
				k: "t",
				id,
				v: ticket,
				by: c.who.uuid,
				ev: {
					byType: "agent",
					status: "closed"
				}
			});
			await store.del(c.K.solved(id)).catch(() => {});
			return {
				ticket,
				target: into,
				events: res.events
			};
		});
		routes.post("/api/d/:desk/tickets/:id/presence", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			const now = store.now();
			const mine = {
				uuid: c.who.uuid,
				name: c.actor.name,
				typing: !!req.body?.typing,
				at: now
			};
			if (req.body?.leave) await store.del(c.K.presence(id, c.who.uuid)).catch(() => {});
			else await store.set(c.K.presence(id, c.who.uuid), mine, Math.floor(now / 1e3) + 45);
			return { viewers: (await store.page(c.K.presencePrefix(id), { limit: 50 })).items.map((i) => i.value).filter((v) => v && v.uuid !== c.who.uuid && now - v.at < 45e3) };
		});
		/**
		* Received email, read from the owner's Puter mailbox by their browser.
		* A message whose subject carries a request number continues that request
		* when it comes from its requester or a CC; anything else opens a new one.
		* Each message is imported once.
		*/
		routes.post("/api/d/:desk/email/import", async (req) => {
			const c = await agentContext(req, { admin: true });
			const messages = (Array.isArray(req.body?.messages) ? req.body.messages : []).slice(0, 25);
			const results = [];
			for (const raw of messages) {
				const m = cleanMessage(raw);
				if (!m) {
					results.push({
						status: "skipped",
						reason: "invalid"
					});
					continue;
				}
				const seenKey = `${c.K.prefix}mi:${(await sha256(m.id)).slice(0, 32)}`;
				if (await store.get(seenKey)) {
					results.push({
						id: m.id,
						status: "duplicate"
					});
					continue;
				}
				try {
					const attachments = m.attachments.filter((a) => a && typeof a.id === "string");
					let requester = await findUserByEmail(store, c.K, m.from);
					const number = ticketNumberFrom(m.subject);
					const existing = number ? await store.get(c.K.ticket(number)) : null;
					const sender = requester?.id;
					const continues = existing && !existing.deleted && existing.status !== "closed" && (sender && existing.requester === sender || (existing.ccs || []).includes(m.from));
					if (requester?.suspended && continues) results.push({
						id: m.id,
						status: "skipped",
						reason: "suspended"
					});
					else if (continues) {
						const actor = {
							type: "customer",
							id: null,
							userId: sender || null,
							name: requester?.name || m.name
						};
						const res = await updateTicket(env, c.desk, c, number, {
							comment: {
								html: textToHtml(m.text),
								public: true,
								attachments
							},
							via: "email"
						}, actor);
						results.push({
							id: m.id,
							status: "appended",
							ticket: res.ticket
						});
					} else {
						if (!requester) requester = await createUser(store, c.K, {
							name: m.name,
							email: m.from
						}, c.actor);
						const actor = {
							type: "customer",
							id: null,
							userId: requester.id,
							name: requester.name
						};
						const res = await createTicket(env, c.desk, c, {
							subject: cleanSubject(m.subject),
							requester: requester.id,
							comment: {
								html: textToHtml(m.text),
								public: true,
								attachments
							},
							via: "email",
							tags: existing && existing.status === "closed" ? ["follow_up"] : [],
							spam: !!requester.suspended
						}, actor);
						results.push(requester.suspended ? {
							id: m.id,
							status: "skipped",
							reason: "suspended",
							ticket: res.ticket
						} : {
							id: m.id,
							status: "created",
							ticket: res.ticket,
							requester
						});
					}
					await store.set(seenKey, 1, Math.floor(store.now() / 1e3) + 15552e3);
				} catch (e) {
					results.push({
						id: m.id,
						status: "failed",
						reason: errorBody(e).body.message
					});
				}
			}
			return { results };
		});
		function safeName(name) {
			return cleanLine(name, 120).replace(/[\\/:*?"<>|]+/g, "_") || "file";
		}
		routes.post("/api/d/:desk/files", async (req) => {
			const c = await agentContext(req);
			if (!env.fs) fail(501, "no_files", "File storage is not available");
			const blob = req.raw;
			if (!blob || typeof blob.size !== "number") throw new ValidationError("No file was sent", "file");
			if (blob.size > LIMITS.attachment) throw new ValidationError("Files can be up to 20 MB", "file");
			let name = "file";
			try {
				name = safeName(decodeURIComponent(req.headers?.["x-file-name"] || "file"));
			} catch {}
			const id = randomId(16);
			const claimed = cleanLine(req.headers?.["content-type"] || blob.type, 100).toLowerCase();
			const type = SAFE_FILE_TYPES.has(claimed) ? claimed : "application/octet-stream";
			const path = `help-desk/${c.desk}/files/${id}/${name}`;
			const item = await env.fs.write(path, blob, {
				createMissingParents: true,
				overwrite: true
			});
			const meta = {
				id,
				name,
				size: blob.size,
				type,
				path: item?.path || path,
				by: c.who.uuid,
				at: store.now()
			};
			await store.set(c.K.file(id), meta);
			return {
				id,
				name,
				size: blob.size,
				type
			};
		});
		async function fileResponse(meta) {
			const blob = await env.fs.read(meta.path);
			const type = SAFE_FILE_TYPES.has(meta.type) ? meta.type : "application/octet-stream";
			return new Response(blob, { headers: {
				"Content-Type": type,
				"Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'",
				"Content-Disposition": `${type === "application/octet-stream" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
				"Cache-Control": "private, max-age=3600",
				"X-Content-Type-Options": "nosniff"
			} });
		}
		routes.get("/api/d/:desk/files/:fid", async (req) => {
			const c = await agentContext(req);
			if (!env.fs) fail(501, "no_files", "File storage is not available");
			const meta = isId(req.params.fid, 8, 40) ? await store.get(c.K.file(req.params.fid)) : null;
			if (!meta) fail(404, "not_found", "That file no longer exists");
			return fileResponse(meta);
		});
		function userPatch(body) {
			const out = {};
			if ("name" in body) {
				const n = cleanLine(body.name, LIMITS.name);
				if (!n) throw new ValidationError("A customer needs a name", "name");
				out.name = n;
			}
			if ("email" in body) {
				if (body.email && !isEmail(String(body.email).trim().toLowerCase())) throw new ValidationError("That email address does not look right", "email");
				out.email = normEmail(body.email) || null;
			}
			if ("phone" in body) out.phone = cleanLine(body.phone, 40) || null;
			if ("org" in body) out.org = Number(body.org) || null;
			if ("tags" in body) out.tags = normTags(body.tags);
			if ("notes" in body) out.notes = cleanText(body.notes, LIMITS.notes);
			if ("locale" in body) out.locale = cleanLine(body.locale, 20) || null;
			if ("tz" in body) out.tz = cleanLine(body.tz, 60) || null;
			if ("suspended" in body) out.suspended = !!body.suspended;
			return out;
		}
		routes.post("/api/d/:desk/users", async (req) => {
			const c = await agentContext(req);
			const body = req.body || {};
			const email = normEmail(body.email);
			if (body.email && !email) throw new ValidationError("That email address does not look right", "email");
			if (email) {
				const existing = await findUserByEmail(store, c.K, email);
				if (existing) fail(409, "exists", `${existing.name} already uses that email address`, { current: existing });
			}
			return { user: await createUser(store, c.K, body, c.actor) };
		});
		routes.post("/api/d/:desk/users/:id", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			const before = await store.get(c.K.user(id));
			if (!before) fail(404, "not_found", "That customer no longer exists");
			const patch = userPatch(req.body || {});
			if ("email" in patch && patch.email !== before.email && patch.email) {
				const other = await store.get(c.K.userByEmail(patch.email));
				if (other && other !== id) fail(409, "exists", "Another customer already uses that email address");
			}
			const user = await store.update(c.K.user(id), {
				...patch,
				updatedAt: store.now()
			});
			const records = [];
			if (patch.email && patch.email !== before.email) records.push({
				key: c.K.userByEmail(patch.email),
				value: id
			});
			await store.commit(c.K, records, {
				k: "u",
				id,
				v: user,
				by: c.who.uuid
			});
			if ("email" in patch && before.email && patch.email !== before.email) await store.del(c.K.userByEmail(before.email)).catch(() => {});
			return { user };
		});
		routes.delete("/api/d/:desk/users/:id", async (req) => {
			const c = await agentContext(req, { admin: true });
			const id = num(req.params.id);
			const user = await store.get(c.K.user(id));
			if (!user) return { ok: true };
			if ((await store.page(c.K.requesterPrefix(id), { limit: 1 })).items.length) fail(409, "has_tickets", "This customer has tickets. Delete or reassign them first.");
			await store.delMany([user.email ? c.K.userByEmail(user.email) : null, user.puter ? c.K.userByUuid(user.puter) : null].filter(Boolean));
			await store.del(c.K.user(id));
			await store.commit(c.K, [], {
				k: "u",
				id,
				v: null,
				by: c.who.uuid
			});
			return { ok: true };
		});
		routes.post("/api/d/:desk/users-import", async (req) => {
			const c = await agentContext(req, { admin: true });
			const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 200) : [];
			const created = [];
			let skipped = 0;
			for (const row of rows) {
				const email = normEmail(row?.email);
				if (!email && !cleanLine(row?.name)) {
					skipped++;
					continue;
				}
				if (email && await store.get(c.K.userByEmail(email))) {
					skipped++;
					continue;
				}
				try {
					created.push(await createUser(store, c.K, row, c.actor));
				} catch {
					skipped++;
				}
			}
			return {
				created,
				skipped
			};
		});
		function orgPatch(body) {
			const out = {};
			if ("name" in body) {
				const n = cleanLine(body.name, 120);
				if (!n) throw new ValidationError("An organization needs a name", "name");
				out.name = n;
			}
			if ("domains" in body) out.domains = [...new Set((Array.isArray(body.domains) ? body.domains : String(body.domains || "").split(/[\s,]+/)).map(normDomain).filter(Boolean))].slice(0, 20);
			if ("notes" in body) out.notes = cleanText(body.notes, LIMITS.notes);
			if ("tags" in body) out.tags = normTags(body.tags);
			if ("group" in body) out.group = cleanLine(body.group, 40) || null;
			return out;
		}
		/** Each email domain matches one organization: refuse one another has. */
		async function checkDomains(c, id, domains) {
			const taken = (await store.getMany((domains || []).map((d) => c.K.orgByDomain(d)))).map((o, i) => [domains[i], o]).filter(([, o]) => o && o !== id);
			if (!taken.length) return;
			const orgs = await store.getMany(taken.map(([, o]) => c.K.org(o)));
			const clash = taken.findIndex((_, i) => orgs[i]);
			if (clash >= 0) throw new ValidationError(`${taken[clash][0]} already belongs to ${orgs[clash].name}`, "domains");
		}
		async function syncDomains(c, id, before, after) {
			const old = new Set(before || []);
			const now = new Set(after || []);
			const records = [...now].filter((d) => !old.has(d)).map((d) => ({
				key: c.K.orgByDomain(d),
				value: id
			}));
			if (records.length) await store.setMany(records);
			const gone = [...old].filter((d) => !now.has(d));
			for (const d of gone) if (await store.get(c.K.orgByDomain(d)) === id) await store.del(c.K.orgByDomain(d));
		}
		routes.post("/api/d/:desk/orgs", async (req) => {
			const c = await agentContext(req);
			const patch = orgPatch({
				name: "",
				...req.body
			});
			await checkDomains(c, null, patch.domains);
			const seq = await store.incr(c.K.seq, { o: 1 });
			const now = store.now();
			const org = {
				id: seq.o,
				name: patch.name,
				domains: patch.domains || [],
				notes: patch.notes || "",
				tags: patch.tags || [],
				group: patch.group || null,
				createdAt: now,
				updatedAt: now
			};
			await store.commit(c.K, [{
				key: c.K.org(org.id),
				value: org
			}], {
				k: "o",
				id: org.id,
				v: org,
				by: c.who.uuid
			});
			await syncDomains(c, org.id, [], org.domains);
			return { org };
		});
		routes.post("/api/d/:desk/orgs/:id", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			const before = await store.get(c.K.org(id));
			if (!before) fail(404, "not_found", "That organization no longer exists");
			const patch = orgPatch(req.body || {});
			if ("domains" in patch) await checkDomains(c, id, patch.domains);
			const org = await store.update(c.K.org(id), {
				...patch,
				updatedAt: store.now()
			});
			await store.commit(c.K, [], {
				k: "o",
				id,
				v: org,
				by: c.who.uuid
			});
			if ("domains" in patch) await syncDomains(c, id, before.domains, org.domains);
			return { org };
		});
		routes.delete("/api/d/:desk/orgs/:id", async (req) => {
			const c = await agentContext(req, { admin: true });
			const id = num(req.params.id);
			const org = await store.get(c.K.org(id));
			if (!org) return { ok: true };
			await syncDomains(c, id, org.domains, []);
			await store.del(c.K.org(id));
			await store.commit(c.K, [], {
				k: "o",
				id,
				v: null,
				by: c.who.uuid
			});
			const users = await store.all(c.K.userPrefix, { max: 2e4 });
			for (const { value: u } of users) {
				if (u?.org !== id) continue;
				const user = await store.update(c.K.user(u.id), {
					org: null,
					updatedAt: store.now()
				});
				await store.commit(c.K, [], {
					k: "u",
					id: u.id,
					v: user,
					by: c.who.uuid
				});
			}
			return { ok: true };
		});
		function articlePatch(body) {
			const out = {};
			if ("title" in body) {
				const t = cleanLine(body.title, 200);
				if (!t) throw new ValidationError("Give the article a title", "title");
				out.title = t;
			}
			if ("section" in body) out.section = cleanLine(body.section, 40) || null;
			if ("status" in body) out.status = body.status === "published" ? "published" : "draft";
			if ("labels" in body) out.labels = normTags(body.labels);
			if ("promoted" in body) out.promoted = !!body.promoted;
			return out;
		}
		async function saveArticle(c, id, patch, body) {
			const now = store.now();
			const records = [];
			if (typeof body === "string") {
				const html = sanitizeHtml(body, { maxLength: LIMITS.articleBody });
				patch.excerpt = preview(html, 240);
				patch.words = htmlToText(html).split(/\s+/).filter(Boolean).length;
				records.push({
					key: c.K.articleBody(id),
					value: { html }
				});
			}
			patch.updatedAt = now;
			patch.updatedBy = c.who.uuid;
			const existing = await store.get(c.K.article(id));
			const article = existing ? await store.update(c.K.article(id), patch) : {
				id,
				createdAt: now,
				author: c.who.uuid,
				views: 0,
				up: 0,
				down: 0,
				labels: [],
				status: "draft",
				promoted: false,
				...patch
			};
			if (!existing) records.push({
				key: c.K.article(id),
				value: article
			});
			await store.commit(c.K, records, {
				k: "a",
				id,
				v: article,
				by: c.who.uuid
			});
			articleCache.delete(c.desk);
			return article;
		}
		routes.post("/api/d/:desk/articles", async (req) => {
			const c = await agentContext(req);
			const patch = articlePatch({
				title: "",
				...req.body
			});
			return { article: await saveArticle(c, (await store.incr(c.K.seq, { a: 1 })).a, patch, String(req.body?.body ?? "")) };
		});
		routes.get("/api/d/:desk/articles/:id", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			const [article, body] = await store.getMany([c.K.article(id), c.K.articleBody(id)]);
			if (!article) fail(404, "not_found", "That article no longer exists");
			return {
				article,
				body: body?.html || ""
			};
		});
		routes.post("/api/d/:desk/articles/:id", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			if (!await store.get(c.K.article(id))) fail(404, "not_found", "That article no longer exists");
			return { article: await saveArticle(c, id, articlePatch(req.body || {}), req.body && "body" in req.body ? String(req.body.body ?? "") : void 0) };
		});
		routes.delete("/api/d/:desk/articles/:id", async (req) => {
			const c = await agentContext(req);
			const id = num(req.params.id);
			await store.delMany([c.K.articleBody(id)]);
			await store.del(c.K.article(id));
			await store.commit(c.K, [], {
				k: "a",
				id,
				v: null,
				by: c.who.uuid
			});
			articleCache.delete(c.desk);
			return { ok: true };
		});
		routes.post("/api/d/:desk/invites", async (req) => {
			const c = await agentContext(req, { admin: true });
			const role = ROLES.includes(req.body?.role) ? req.body.role : "agent";
			const code = secret(20);
			const now = store.now();
			const expiresAt = now + 6048e5;
			const invite = {
				code,
				role,
				by: c.who.uuid,
				byName: c.actor.name,
				at: now,
				expiresAt,
				note: cleanLine(req.body?.note, 120)
			};
			await store.set(c.K.invite(code), invite, Math.floor(expiresAt / 1e3));
			return { invite };
		});
		routes.get("/api/d/:desk/invites", async (req) => {
			const c = await agentContext(req, { admin: true });
			return { invites: (await store.page(`${c.K.prefix}inv:`, { limit: 200 })).items.map((i) => i.value).filter((v) => v && v.expiresAt > store.now()) };
		});
		routes.delete("/api/d/:desk/invites/:code", async (req) => {
			const c = await agentContext(req, { admin: true });
			if (/^[a-z0-9]{10,40}$/.test(req.params.code)) await store.del(c.K.invite(req.params.code));
			return { ok: true };
		});
		/** What an invite link is for, so the join screen can say it. */
		routes.get("/api/invite/:desk/:code", async (req) => {
			const desk = deskId(req.params.desk);
			await identity(req);
			const K = deskKeys(desk);
			const code = String(req.params.code || "");
			if (!/^[a-z0-9]{10,40}$/.test(code)) fail(404, "bad_invite", "This invite link is not valid");
			const [meta, invite] = await store.getMany([K.meta, K.invite(code)]);
			if (!meta || meta.deleted || !invite || invite.expiresAt < store.now()) fail(404, "bad_invite", "This invite link has expired or was already used. Ask an administrator for a new one.");
			return {
				name: meta.name,
				role: invite.role,
				by: invite.byName || null,
				expiresAt: invite.expiresAt
			};
		});
		routes.post("/api/join/:desk", async (req) => {
			const desk = deskId(req.params.desk);
			const who = await identity(req);
			const K = deskKeys(desk);
			const code = String(req.body?.code || "");
			await rateLimit(K, "join", who.uuid, 10, 600);
			const [meta, members, invite, groups] = await store.getMany([
				K.meta,
				K.members,
				/^[a-z0-9]{10,40}$/.test(code) ? K.invite(code) : `${K.prefix}inv:none`,
				K.cfg("groups")
			]);
			if (!meta || meta.deleted) fail(404, "no_desk", "This help desk does not exist");
			if (members?.[who.uuid]?.active) return {
				desk,
				meta,
				me: members[who.uuid],
				already: true
			};
			if (!invite || invite.expiresAt < store.now()) fail(403, "bad_invite", "This invite link has expired or was already used. Ask an administrator for a new one.");
			const now = store.now();
			const me = {
				uuid: who.uuid,
				username: who.username || "",
				name: cleanLine(req.body?.name, 80) || who.username || "Agent",
				role: invite.role,
				groups: (groups || []).some((g) => g.id === "support") ? ["support"] : [],
				active: true,
				joinedAt: now,
				invitedBy: invite.by
			};
			await store.update(K.members, { [who.uuid]: me });
			await store.del(K.invite(code));
			await memberChange(K, who.uuid);
			return {
				desk,
				meta,
				me
			};
		});
		routes.post("/api/d/:desk/members/:uuid", async (req) => {
			const c = await agentContext(req);
			const uuid = req.params.uuid;
			const target = Object.hasOwn(c.members, uuid) ? c.members[uuid] : null;
			if (!target) fail(404, "not_found", "That person is not on this help desk");
			const self = uuid === c.who.uuid;
			const isAdmin = c.me.role !== "agent";
			if (!self && !isAdmin) fail(403, "forbidden", "Only administrators can change other agents");
			const body = req.body || {};
			const patch = {};
			if ("name" in body) patch[`${uuid}.name`] = cleanLine(body.name, 80) || target.name;
			if (isAdmin && "groups" in body) {
				const ids = new Set((c.cfg.groups || []).map((g) => g.id));
				patch[`${uuid}.groups`] = (Array.isArray(body.groups) ? body.groups : []).filter((g) => ids.has(g));
			}
			if (isAdmin && !self && target.role !== "owner") {
				if ("role" in body && ROLES.includes(body.role)) patch[`${uuid}.role`] = body.role;
				if ("active" in body) patch[`${uuid}.active`] = !!body.active;
			}
			if ("signature" in body) patch[`${uuid}.signature`] = sanitizeHtml(body.signature, { maxLength: 4e3 });
			if (!Object.keys(patch).length) return { member: target };
			await store.update(c.K.members, patch);
			return { member: (await memberChange(c.K, c.who.uuid))[uuid] };
		});
		routes.delete("/api/d/:desk/members/:uuid", async (req) => {
			const uuid = req.params.uuid;
			const c = await agentContext(req, { admin: req.params.uuid !== (await req.who?.())?.uuid });
			const target = Object.hasOwn(c.members, uuid) ? c.members[uuid] : null;
			if (!target) return { ok: true };
			if (target.role === "owner") fail(409, "owner", "The owner cannot be removed");
			await store.remove(c.K.members, uuid);
			await memberChange(c.K, c.who.uuid);
			return { ok: true };
		});
		routes.get("/api/d/:desk/export/events", async (req) => {
			const c = await agentContext(req, { admin: true });
			const page = await store.page(`${c.K.prefix}e:`, {
				limit: 500,
				cursor: req.query?.cursor || void 0
			});
			return {
				items: page.items.map((i) => i.value).filter(Boolean),
				cursor: page.cursor
			};
		});
		function publicTicket(t, meta) {
			return {
				id: t.id,
				subject: t.subject,
				status: t.status === "new" ? "open" : t.status === "hold" ? "open" : t.status,
				createdAt: t.createdAt,
				updatedAt: t.updatedAt,
				solvedAt: t.solvedAt,
				csat: t.csat ? {
					score: t.csat.score,
					comment: t.csat.comment || ""
				} : null,
				csatEnabled: !!meta.csat?.enabled,
				followUp: t.followUp || null
			};
		}
		/**
		* A message as the requester sees it. On a request filed by an unverified
		* sender (anyone can type an existing customer's email), the stored
		* customer's name is left out so the form cannot be used to look it up.
		*/
		function publicEvent(e, members, { hideCustomer = false } = {}) {
			const agent = e.by?.type === "agent";
			return {
				id: e.id,
				at: e.at,
				html: e.html,
				attachments: e.attachments || [],
				by: agent ? {
					type: "agent",
					name: members[e.by.id]?.name || e.by.name || "Support"
				} : {
					type: e.by?.type || "customer",
					name: hideCustomer ? "" : e.by?.name || ""
				}
			};
		}
		/** The requester behind a help center call: a link key or their Puter account. */
		async function requestAccess(req, p, id) {
			const ticket = await store.get(p.K.ticket(id));
			if (!ticket || ticket.deleted || ticket.spam) fail(404, "not_found", "We could not find that request");
			const key = String(req.query?.key || req.body?.key || "");
			if (key && key.length >= 16 && key === ticket.key) return ticket;
			const who = await req.who?.().catch(() => null);
			if (who?.uuid && ticket.submitterPuter && ticket.submitterPuter === who.uuid) return ticket;
			fail(403, "forbidden", "This link is not valid for that request");
		}
		async function publishedArticles(p) {
			const hit = articleCache.get(p.desk);
			if (hit && hit.until > store.now()) return hit.items;
			const items = (await store.all(p.K.articlePrefix, { max: 2e3 })).map((r) => r.value).filter((a) => a && a.status === "published").map(({ id, title, section, excerpt, labels, updatedAt, promoted, up, down }) => ({
				id,
				title,
				section,
				excerpt,
				labels,
				updatedAt,
				promoted,
				up,
				down
			}));
			articleCache.set(p.desk, {
				items,
				until: store.now() + 6e4
			});
			return items;
		}
		routes.get("/p/:desk", async (req) => {
			const p = await portalContext(req);
			const [kb, fields] = await store.getMany([p.K.cfg("kb"), p.K.cfg("fields")]);
			return {
				desk: p.desk,
				name: p.meta.name,
				portal: p.meta.portal,
				csat: !!p.meta.csat?.enabled,
				kb: kb || {
					categories: [],
					sections: []
				},
				fields: (fields || []).filter((f) => f.active && f.portal).map(({ id, title, type, options, required, desc }) => ({
					id,
					title,
					type,
					options,
					required,
					desc
				}))
			};
		});
		routes.get("/p/:desk/articles", async (req) => {
			return { articles: await publishedArticles(await portalContext(req)) };
		});
		routes.get("/p/:desk/articles/:id", async (req) => {
			const p = await portalContext(req);
			const id = num(req.params.id);
			const [article, body] = await store.getMany([p.K.article(id), p.K.articleBody(id)]);
			if (!article || article.status !== "published") fail(404, "not_found", "That article is not available");
			const viewKey = p.K.rate("view", (await sha256(`${ipOf(req)}:${id}`)).slice(0, 20));
			store.allow(viewKey, 1, 3600).then((first) => first ? store.incr(p.K.article(id), { views: 1 }) : null).catch(() => {});
			const { author, updatedBy, ...rest } = article;
			return {
				article: rest,
				body: body?.html || ""
			};
		});
		routes.post("/p/:desk/articles/:id/vote", async (req) => {
			const p = await portalContext(req);
			const id = num(req.params.id);
			await rateLimit(p.K, "vote", `${ipOf(req)}:${id}`, 3, 3600);
			const article = await store.get(p.K.article(id));
			if (!article || article.status !== "published") fail(404, "not_found", "That article is not available");
			const next = await store.incr(p.K.article(id), { [req.body?.up ? "up" : "down"]: 1 });
			return {
				up: next.up || 0,
				down: next.down || 0
			};
		});
		routes.post("/p/:desk/requests", async (req) => {
			const p = await portalContext(req);
			const body = req.body || {};
			const who = await req.who?.().catch(() => null);
			if (p.meta.portal?.signInRequired && !who?.uuid) fail(401, "unauthorized", "Sign in to send a request");
			await rateLimit(p.K, "req", ipOf(req), 10, 3600);
			const email = normEmail(body.email);
			if (!email) throw new ValidationError("Enter a valid email address so we can reply", "email");
			const name = cleanLine(body.name, LIMITS.name) || email.split("@")[0];
			const description = cleanText(body.description, 2e4).trim();
			if (!description) throw new ValidationError("Describe your request", "description");
			if (!cleanLine(body.subject, LIMITS.subject)) throw new ValidationError("Add a subject", "subject");
			const portalFields = p.cfg.fields.filter((x) => x.active && x.portal);
			if (body.fields !== void 0 && (!body.fields || typeof body.fields !== "object")) throw new ValidationError("The request fields are not valid", "fields");
			const missing = portalFields.find((f) => f.required && cleanFieldValue(f, body.fields?.[f.id]) === void 0);
			if (missing) throw new ValidationError(`${missing.title} is required`, `field:${missing.id}`);
			let requester = await findUserByEmail(store, p.K, email);
			const unverified = !!requester;
			if (!requester) requester = await createUser(store, p.K, {
				name,
				email
			}, {
				type: "customer",
				id: null
			});
			const actor = {
				type: "customer",
				id: null,
				userId: requester.id,
				name: requester.name
			};
			const fields = {};
			for (const f of portalFields) if (body.fields && f.id in body.fields) fields[f.id] = body.fields[f.id];
			const res = await createTicket(env, p.desk, p, {
				subject: body.subject,
				requester: requester.id,
				comment: {
					html: textToHtml(description),
					public: true
				},
				via: "portal",
				fields,
				unverified,
				submitterPuter: who?.uuid || null,
				spam: !!requester.suspended
			}, actor);
			if (requester.suspended) return {
				id: null,
				key: null,
				accepted: true
			};
			return {
				id: res.ticket.id,
				key: res.ticket.key
			};
		});
		routes.get("/p/:desk/requests/:id", async (req) => {
			const p = await portalContext(req);
			const id = num(req.params.id);
			const ticket = await requestAccess(req, p, id);
			const [events, requester] = await Promise.all([ticketEvents(store, p.K, id), store.get(p.K.user(ticket.requester))]);
			const hideCustomer = !!ticket.unverified;
			return {
				ticket: publicTicket(ticket, p.meta),
				requester: requester ? {
					name: hideCustomer ? "" : requester.name,
					email: requester.email
				} : null,
				events: events.filter((e) => e.kind === "comment" && e.public).map((e) => publicEvent(e, p.members, { hideCustomer }))
			};
		});
		routes.post("/p/:desk/requests/:id/comments", async (req) => {
			const p = await portalContext(req);
			const id = num(req.params.id);
			const ticket = await requestAccess(req, p, id);
			await rateLimit(p.K, "reply", ipOf(req), 60, 3600);
			const text = cleanText(req.body?.body, 2e4).trim();
			if (!text) throw new ValidationError("Write a reply first", "body");
			const requester = await store.get(p.K.user(ticket.requester));
			if (requester?.suspended) return { ticket: publicTicket(ticket, p.meta) };
			const actor = {
				type: "customer",
				id: null,
				userId: ticket.requester,
				name: requester?.name || "Customer"
			};
			if (ticket.status === "closed") {
				const res = await createTicket(env, p.desk, p, {
					subject: ticket.subject.startsWith("Re: ") ? ticket.subject : `Re: ${ticket.subject}`,
					requester: ticket.requester,
					comment: {
						html: textToHtml(`${text}\n\n(Follow-up to request #${ticket.id})`),
						public: true
					},
					via: "portal",
					tags: ["follow_up"],
					submitterPuter: ticket.submitterPuter,
					unverified: ticket.unverified
				}, actor);
				const original = await writeTicket(store, p.K, id, { followUp: res.ticket.id });
				await store.commit(p.K, [], {
					k: "t",
					id,
					v: original,
					by: null
				});
				return { followUp: {
					id: res.ticket.id,
					key: res.ticket.key
				} };
			}
			return { ticket: publicTicket((await updateTicket(env, p.desk, p, id, { comment: {
				html: textToHtml(text),
				public: true
			} }, actor)).ticket, p.meta) };
		});
		routes.post("/p/:desk/requests/:id/solve", async (req) => {
			const p = await portalContext(req);
			const id = num(req.params.id);
			const ticket = await requestAccess(req, p, id);
			if (ticket.status === "solved" || ticket.status === "closed") return { ticket: publicTicket(ticket, p.meta) };
			const requester = await store.get(p.K.user(ticket.requester));
			const actor = {
				type: "customer",
				id: null,
				userId: ticket.requester,
				name: requester?.name || "Customer"
			};
			return { ticket: publicTicket((await updateTicket(env, p.desk, p, id, { system: { status: "solved" } }, actor)).ticket, p.meta) };
		});
		routes.post("/p/:desk/requests/:id/rate", async (req) => {
			const p = await portalContext(req);
			if (!p.meta.csat?.enabled) fail(404, "not_found", "Ratings are turned off");
			const id = num(req.params.id);
			const ticket = await requestAccess(req, p, id);
			if (!["solved", "closed"].includes(ticket.status)) fail(409, "not_solved", "You can rate a request once it is solved");
			const score = req.body?.score === "bad" ? "bad" : "good";
			const comment = cleanText(req.body?.comment, 2e3);
			if (ticket.csat && ticket.csat.score === score && (ticket.csat.comment || "") === comment) return { ticket: publicTicket(ticket, p.meta) };
			await rateLimit(p.K, "rate", `${ipOf(req)}:${id}`, 5, 3600);
			const csat = {
				score,
				comment,
				at: store.now()
			};
			const requester = await store.get(p.K.user(ticket.requester));
			const actor = {
				type: "customer",
				id: null,
				userId: ticket.requester,
				name: requester?.name || "Customer"
			};
			return { ticket: publicTicket((await updateTicket(env, p.desk, p, id, { csat }, actor)).ticket, p.meta) };
		});
		routes.get("/p/:desk/mine", async (req) => {
			const p = await portalContext(req);
			const who = await identity(req);
			const ids = (await store.keysUnder(p.K.submitterPrefix(who.uuid), { max: 500 })).map(idFromKey).filter(Boolean);
			return { requests: (await store.getMany(ids.map((i) => p.K.ticket(i)))).filter((t) => t && !t.deleted && !t.spam && t.submitterPuter === who.uuid).map((t) => ({
				...publicTicket(t, p.meta),
				key: t.key
			})).sort((a, b) => b.updatedAt - a.updatedAt) };
		});
		routes.get("/p/:desk/files/:fid", async (req) => {
			const p = await portalContext(req);
			const id = num(req.query?.ticket);
			await requestAccess(req, p, id);
			const fid = req.params.fid;
			if (!isId(fid, 8, 40) || !env.fs) fail(404, "not_found", "That file is not available");
			if (!(await ticketEvents(store, p.K, id)).some((e) => e.kind === "comment" && e.public && (e.attachments || []).some((a) => a.id === fid))) fail(404, "not_found", "That file is not available");
			const meta = await store.get(p.K.file(fid));
			if (!meta) fail(404, "not_found", "That file is not available");
			return fileResponse(meta);
		});
		async function handle(req) {
			const m = routes.match(req.method, req.path);
			if (!m) return {
				status: 404,
				body: {
					error: "not_found",
					message: "Unknown endpoint"
				}
			};
			const body = req.body;
			if (body !== void 0 && body !== null && (typeof body !== "object" || Array.isArray(body))) return {
				status: 400,
				body: {
					error: "bad_request",
					message: "The request body must be a JSON object"
				}
			};
			try {
				const out = await m.route.handler({
					...req,
					params: m.params
				});
				if (typeof Response !== "undefined" && out instanceof Response) return { response: out };
				return {
					status: 200,
					body: out ?? { ok: true }
				};
			} catch (e) {
				if (!(e && e.status) && options.log) options.log(e);
				return errorBody(e);
			}
		}
		return {
			handle,
			routes,
			env
		};
	}
	//#endregion
	//#region worker/index.js
	/**
	* Puter worker entry. Each help desk owner deploys this bundle into their own
	* Puter account (the app does it for them), so the desk's data lives in the
	* owner's key-value store and files, and every agent and help center visitor
	* reaches it through this worker.
	*
	* The runtime provides two globals: `router`, to register routes, and `me`,
	* the owner's Puter context (available inside handlers only).
	*/
	var BUILD = {
		id: "ff9909a42752",
		at: 1792189924447
	};
	var JSON_LIMIT = 2097152;
	var FILE_LIMIT = 22020096;
	var IDENTITY_TTL = 6e4;
	var identities = /* @__PURE__ */ new Map();
	var backend = null;
	var ownerPromise = null;
	function getBackend() {
		if (backend) return backend;
		backend = createBackend({
			kv: me.puter.kv,
			fs: me.puter.fs,
			email: (msg) => me.puter.email.sendTransactional(msg),
			ownerUuid: () => {
				ownerPromise ||= me.puter.auth.getUser().then((u) => u?.uuid || null).catch(() => null).then((uuid) => {
					if (!uuid) ownerPromise = null;
					return uuid;
				});
				return ownerPromise;
			},
			build: BUILD,
			log: (e) => console.error(e)
		});
		return backend;
	}
	/** Who is calling, from the Puter session puter.workers.exec() attaches. */
	async function identify(user) {
		if (!user || !user.puter) return null;
		const token = user.puter.authToken;
		const key = token ? await sha256(token) : null;
		const hit = key && identities.get(key);
		if (hit && hit.until > Date.now()) return hit.who;
		let info = null;
		try {
			info = await user.puter.auth.getUser();
		} catch {
			return null;
		}
		if (!info?.uuid) return null;
		const who = {
			uuid: String(info.uuid),
			username: String(info.username || "")
		};
		if (key) {
			if (identities.size > 2e3) identities.clear();
			identities.set(key, {
				who,
				until: Date.now() + IDENTITY_TTL
			});
		}
		return who;
	}
	async function readJson(request) {
		const bytes = await readBody(request, JSON_LIMIT);
		if (!bytes) return { tooLarge: true };
		const text = new TextDecoder().decode(bytes);
		if (!text) return { body: null };
		try {
			return { body: JSON.parse(text) };
		} catch {
			return { invalid: true };
		}
	}
	function json(status, body) {
		return new Response(JSON.stringify(body), {
			status,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store"
			}
		});
	}
	function register(method, pattern) {
		router[method.toLowerCase()].call(router, pattern, async ({ request, user, params }) => {
			const b = getBackend();
			const url = new URL(request.url);
			const headers = {};
			for (const name of [
				"content-type",
				"x-file-name",
				"x-real-ip"
			]) {
				const v = request.headers.get(name);
				if (v) headers[name] = v;
			}
			let body = null;
			let raw = null;
			if (method === "POST" && /\/files$/.test(url.pathname)) {
				if (!user || !user.puter) return json(401, {
					error: "unauthorized",
					message: "Sign in with Puter to continue"
				});
				const bytes = await readBody(request, FILE_LIMIT);
				if (!bytes) return json(413, {
					error: "too_large",
					message: "Files can be up to 20 MB"
				});
				raw = new Blob([bytes], { type: request.headers.get("content-type") || "application/octet-stream" });
			} else if (method === "POST" || method === "PUT") {
				const parsed = await readJson(request);
				if (parsed.tooLarge) return json(413, {
					error: "too_large",
					message: "That request is too large"
				});
				if (parsed.invalid) return json(400, {
					error: "invalid_json",
					message: "The request body is not valid JSON"
				});
				body = parsed.body;
			}
			let whoPromise = null;
			const res = await b.handle({
				method,
				path: url.pathname.replace(/\/+$/, "") || "/",
				params,
				query: Object.fromEntries(url.searchParams),
				headers,
				body,
				raw,
				who: () => whoPromise ||= identify(user)
			});
			if (res.response) return res.response;
			return json(res.status, res.body);
		});
	}
	var table = createBackend({ kv: null }).routes.list;
	for (const r of table) register(r.method, r.pattern);
	//#endregion
})();
