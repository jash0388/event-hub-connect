/* teamchat-worker build=2234130e21f1 at=1792189673944 */
(function() {
	/**
	* Past this a block takes no write that grows it by more than a few bytes
	* (an edit's text, a new reaction, a link card, a follower): refused with a
	* word to the member, where the store would refuse the write with none and
	* leave the block unable to take any change at all.
	*/
	var BLOCK_BYTES_HARD = 368640;
	/** The bytes a document takes as JSON (what the store's ceiling is measured against). */
	function jsonBytes(doc) {
		const s = JSON.stringify(doc);
		return typeof TextEncoder === "function" ? new TextEncoder().encode(s).length : s.length;
	}
	function blockIndexOf(seq) {
		return Math.floor((seq - 1) / 50);
	}
	/** First sequence number stored in block n. */
	function firstSeqOfBlock(n) {
		return n * 50 + 1;
	}
	/** Last sequence number stored in block n. */
	function lastSeqOfBlock(n) {
		return (n + 1) * 50;
	}
	/** True when `seq` is the first message written into its block. */
	function isFirstInBlock(seq) {
		return (seq - 1) % 50 === 0;
	}
	var KEYS = {
		user: (uuid) => `tc:user:${uuid}`,
		ws: (wsId) => `tc:ws:${wsId}`,
		member: (wsId, uuid) => `tc:ws:${wsId}:u:${uuid}`,
		activity: (wsId) => `tc:ws:${wsId}:act`,
		invite: (code) => `tc:invite:${code}`,
		seq: (conv) => `tc:conv:${conv}:seq`,
		block: (conv, n) => `tc:conv:${conv}:b:${n}`,
		file: (id) => `tc:file:${id}`,
		/** The search index from before month buckets: one shard set for all time. Read, never written. */
		searchShard: (wsId, n) => `tc:ws:${wsId}:idx:${n}`,
		/** Search index shard n of one month bucket (`yyyymm`). */
		searchBucket: (wsId, bucket, n) => `tc:ws:${wsId}:idx:m${bucket}:${n}`,
		/** The index's counters and its list of months: `{ c, folded, failed, months }`. */
		searchMeta: (wsId) => `tc:ws:${wsId}:idx:meta`,
		/** Log segment s: the postings of SEARCH_FOLD_EVERY messages waiting to be folded into the shards. */
		searchLog: (wsId, s) => `tc:ws:${wsId}:idx:log:${s}`,
		/** The direct messages a search rebuild in progress may read: kept here, so the list a step brings back is checked against the worker's own. */
		searchWalk: (wsId) => `tc:ws:${wsId}:idx:walk`,
		pins: (wsId, conv) => `tc:ws:${wsId}:pins:${conv}`,
		inbox: (wsId, uuid) => `tc:ws:${wsId}:u:${uuid}:inbox`,
		threads: (wsId, uuid) => `tc:ws:${wsId}:u:${uuid}:threads`,
		saved: (wsId, uuid) => `tc:ws:${wsId}:u:${uuid}:saved`,
		sched: (wsId) => `tc:ws:${wsId}:sched`,
		hook: (id) => `tc:hook:${id}`,
		bot: (id) => `tc:bot:${id}`,
		unfurl: (hash) => `tc:unfurl:${hash}`,
		/** The conversations an export in progress walks, named by its cursor. */
		exportList: (wsId, token) => `tc:ws:${wsId}:export:${token}`,
		/**
		* A connection between two workspaces sharing a channel: the host's record
		* and the partner's, each with their common secret. Two keys, since both
		* workspaces may well live on one worker.
		*/
		connect: (id) => `tc:connect:${id}`,
		connectPartner: (id) => `tc:connect:${id}:partner`,
		/** The workspace's whole change-signal region (src/shared/events.js): what a member's handle is minted against. */
		evRegion: (wsId) => `tc:ws:${wsId}:ev:`,
		/**
		* One shard of the signal region: `tc:ws:{wsId}:ev:s{n}`, exactly five
		* `:`-segments. A Puter Events subscription anchors on an exact key only
		* while it is within six segments; past that the anchor falls back to the
		* first six and the whole key becomes a filter, which — in a naming where
		* the shard index sat beyond that point — would put every shard on one
		* anchor and reintroduce the per-workspace fan-out limit sharding exists to
		* avoid. `s{n}` rather than `s:{n}` keeps a segment of room under the cap;
		* both would fit today, and neither should grow.
		*/
		evShard: (wsId, n) => `tc:ws:${wsId}:ev:s${n}`,
		/** Ping shard n of EV_RING_SHARDS for changes no ring entry carries (src/shared/events.js). Five segments, as above. */
		evPing: (wsId, n) => `tc:ws:${wsId}:ev:o${n}`,
		/** Ring shard n's slot k: one sealed change entry. Six segments, so a `r{n}:*` subscription anchors on its own shard. */
		evRingSlot: (wsId, n, k) => `tc:ws:${wsId}:ev:r${n}:k${k}`,
		/** What a subscription to ring shard n is rooted on. */
		evRingPrefix: (wsId, n) => `tc:ws:${wsId}:ev:r${n}:`,
		/** The ring shards' entry counters, `{ s0, s1, ... }`. Outside the `ev` region, so no handle sees it. */
		evCounter: (wsId) => `tc:ws:${wsId}:evn`
	};
	/** Thread conversation id for the replies to message `seq` of `conv`. */
	function threadConvId(conv, seq) {
		return `${conv}_t${seq}`;
	}
	/** Split a thread id back into its parent, or null for a top-level conv. */
	function parentOfThread(conv) {
		const m = /^(.+)_t(\d+)$/.exec(conv);
		return m ? {
			conv: m[1],
			seq: Number(m[2])
		} : null;
	}
	/** Overlay path segment for a message: prefixed so it never reads as an array index. */
	function overlayKey(seq) {
		return `s${seq}`;
	}
	/**
	* A message's reactions, less any that nobody is under any more. Taking a
	* reaction back takes one's own name off the record and nothing else (see
	* the worker's reaction routes), so the entry stays, empty, until another
	* name goes under it or the record is tidied; no reader is shown it.
	*/
	function liveReactions(r) {
		if (!r || typeof r !== "object") return {};
		const out = {};
		for (const [k, users] of Object.entries(r)) if (users && typeof users === "object" && Object.keys(users).length) out[k] = users;
		return out;
	}
	/**
	* Merge a block's overlays into its messages. Deleted messages are dropped
	* unless they anchor a thread, in which case a tombstone stays so the
	* replies remain reachable: its place, author, time, and reply count, and
	* nothing of what it said. The deletion only flags the record (the text,
	* mentions, reactions, and attachment list stay in the block), so the
	* tombstone used to carry all of it to every reader who cared to look past
	* the client's "This message was deleted".
	*/
	function mergeBlock(block) {
		const list = Array.isArray(block?.m) ? block.m : [];
		const x = block?.x || {};
		const out = [];
		for (const m of list) {
			if (!m || typeof m.s !== "number") continue;
			const o = x[overlayKey(m.s)] || {};
			const msg = {
				seq: m.s,
				user: m.u,
				text: typeof o.t === "string" ? o.t : m.t,
				ts: m.ts,
				kind: m.k || "msg",
				attachments: Array.isArray(m.a) ? m.a : [],
				mentions: Array.isArray(m.mn) ? m.mn : [],
				broadcast: m.bc || null,
				editedAt: o.e || null,
				deleted: !!o.d,
				reactions: liveReactions(o.r),
				replyCount: o.rc || 0,
				lastReplyAt: o.rt || null,
				followers: o.f || null,
				pinned: !!o.p,
				ref: m.ref || null,
				bot: m.bot || null,
				unfurl: o.uf && !o.uf.off ? o.uf : null,
				cid: m.cid || null
			};
			if (msg.deleted && !msg.replyCount) continue;
			if (msg.deleted) Object.assign(msg, {
				text: "",
				attachments: [],
				mentions: [],
				broadcast: null,
				reactions: {},
				followers: null,
				unfurl: null
			});
			out.push(msg);
		}
		return out;
	}
	//#endregion
	//#region src/shared/ids.js
	/**
	* Short random ids. Base36 from crypto randomness; never contain dots, so
	* they are safe as segments of KV dot-paths ("channels.{id}.topic").
	*/
	function uid(len = 12) {
		const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
		const bytes = new Uint8Array(len);
		globalThis.crypto.getRandomValues(bytes);
		let out = "";
		for (const b of bytes) out += alphabet[b % 36];
		return out;
	}
	function inviteCode() {
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		const bytes = /* @__PURE__ */ new Uint8Array(12);
		globalThis.crypto.getRandomValues(bytes);
		let out = "";
		for (let i = 0; i < bytes.length; i++) {
			if (i && i % 4 === 0) out += "-";
			out += alphabet[bytes[i] % 32];
		}
		return out;
	}
	/**
	* Normalize typed or pasted input to the canonical grouped form, or null
	* when it cannot be a code. Codes issued before the length change were 9
	* symbols in groups of 3; they stay valid until rotated. Full-width letters
	* and digits (what a Japanese or Chinese keyboard produces until switched
	* to half-width) are folded to their plain forms first: kept only where
	* ASCII, a code typed wide came up short and was refused as no code at all.
	*/
	function normalizeInviteCode(input) {
		const raw = String(input || "").normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
		if (raw.length === 12) return raw.match(/.{4}/g).join("-");
		if (raw.length === 9) return raw.match(/.{3}/g).join("-");
		return null;
	}
	/**
	* Deterministic DM conversation id: the same set of people always maps to
	* the same conversation, which is what makes "message this person" idempotent
	* with no lookup table. FNV-1a over the sorted uuids, twice with different
	* seeds, keeps the id short while making accidental collisions negligible.
	*
	* Scoped to a workspace when one is given: conversation keys carry no
	* workspace of their own, so without it the same two people in two
	* workspaces on one worker would share a history. Ids minted before the
	* scope existed (no wsId) are still found through the member documents.
	*/
	function dmConvId(uuids, wsId = null) {
		const key = `${wsId ? `${wsId}|` : ""}${[...new Set(uuids)].sort().join("|")}`;
		return `dm_${fnv1a(key, 2166136261)}${fnv1a(key, 16777619)}`;
	}
	function fnv1a(str, seed) {
		let h = seed >>> 0;
		for (let i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 16777619) >>> 0;
		}
		return h.toString(36);
	}
	/** Stable 1..8 slot from any string, for avatar colors. */
	function colorSlot(str) {
		let h = 0;
		for (let i = 0; i < str.length; i++) h = h * 31 + str.charCodeAt(i) >>> 0;
		return h % 8 + 1;
	}
	//#endregion
	//#region src/shared/limits.js
	/** Validation limits shared by the worker (enforced) and the UI (hinted). */
	var LIMITS = {
		workspaceName: 60,
		channelName: 40,
		channelTopic: 250,
		channelDescription: 500,
		displayName: 60,
		title: 80,
		statusText: 60,
		avatarBytes: 307200,
		/** A workspace's icon, uploaded by an admin; square and small like a photo. */
		workspaceIconBytes: 307200,
		messageText: 4e3,
		attachmentsPerMessage: 5,
		attachmentBytes: 10485760,
		dmMembers: 9,
		/** Direct message conversations one member may be in per workspace; each is an entry on their own document, kept for good. */
		dmsPerMember: 500,
		mentionsPerMessage: 20,
		messagesPerFetch: 100,
		/** Failed join attempts one account may make per window before a 429. */
		joinAttempts: 8,
		joinWindowSeconds: 600,
		searchQuery: 200,
		pinsPerConversation: 100,
		inboxItems: 300,
		threadsFollowed: 300,
		savedItems: 200,
		scheduledPerMember: 50,
		webhooksPerWorkspace: 50,
		webhookName: 40,
		webhookBodyBytes: 16384,
		/** Calls one webhook or bot token may make per minute. */
		hookRatePerMinute: 60,
		/** Link previews a member, and a workspace, may trigger per ten minutes. */
		unfurlsPerMember: 30,
		unfurlsPerWorkspace: 300,
		unfurlWindowSeconds: 600,
		unfurlBodyBytes: 204800,
		/** Files one member may upload per window, and bytes per day; every upload sits in the owner's storage. */
		uploadsPerMember: 100,
		uploadWindowSeconds: 600,
		uploadBytesPerDay: 524288e3,
		unfurlImageBytes: 307200,
		remindersPerMember: 100,
		bookmarksPerChannel: 10,
		bookmarkLabel: 40,
		bookmarkUrl: 500,
		/** Workspaces one channel can be shared with. */
		connectionsPerChannel: 20,
		/** Fresh events handles one member may ask for per workspace per window when the one they hold is refused (see worker/events.js). */
		evRemintsPerMember: 3,
		evRemintWindowSeconds: 3600
	};
	/**
	* Reserved mention names that reach a group rather than a person. A member
	* whose username happens to be one of these is never mentioned by it.
	*/
	var BROADCASTS = [
		"channel",
		"here",
		"everyone"
	];
	var BROADCAST_POLICIES = ["everyone", "admins"];
	/**
	* The broadcast a text asks for, or null. `everyone` outranks `channel`, which
	* outranks `here`: each reaches everyone the next one does, and more. Read as
	* BROADCASTS reversed, `here` came before `channel`, and "@here @channel"
	* notified only those active at that moment.
	*/
	var BROADCAST_RANK = [
		"everyone",
		"channel",
		"here"
	];
	function broadcastKind(names) {
		for (const k of BROADCAST_RANK) if (names.includes(k)) return k;
		return null;
	}
	/** Per-conversation notification levels a member can choose. */
	var NOTIFY_LEVELS = [
		"all",
		"mentions",
		"nothing"
	];
	/** Who may post in a channel, and who may reply in its threads. */
	var POST_POLICIES = ["members", "admins"];
	var THREAD_POLICIES = [
		"everyone",
		"admins",
		"off"
	];
	/** How long an invite stays valid; admins pick one when rotating. */
	var INVITE_TTLS = {
		"1d": {
			seconds: 86400,
			label: "1 day"
		},
		"7d": {
			seconds: 604800,
			label: "7 days"
		},
		"30d": {
			seconds: 2592e3,
			label: "30 days"
		}
	};
	/**
	* Channel names: lowercase letters, digits, hyphens. Returns the
	* cleaned name or null when nothing usable is left.
	*/
	function cleanChannelName(input) {
		return String(input || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "").replace(/-{2,}/g, "-").replace(/^-+/, "").slice(0, LIMITS.channelName).replace(/-+$/, "") || null;
	}
	/**
	* `s` cut to at most `max` UTF-16 units (the count the app's own fields and
	* the workers' limits use), between whole characters as the reader sees
	* them: an emoji written as a sequence of code points (a family, a flag, a
	* keycap, a hand with a skin tone) is one character, and is not cut apart.
	* Cut by the count alone, with only the half of a two-unit character that
	* the cut left behind going with the half it took, a sequence standing at
	* the edge lost its tail and drew as whatever its head drew alone: a man in
	* place of a family, a boxed letter in place of a flag, a bare digit in
	* place of a keycap. The characters are told apart from the start of the
	* text up to a little past the cut (as many as the cut keeps, and no more:
	* bounding a very long text costs no more than the cut did), never from a
	* point inside it: where a character ends depends on what stands before it
	* (two regional indicators make a flag, and which two pair up is settled
	* from the first of the run), so read from a point sixty-four units before
	* the cut, a run of flags that began off that point paired up the wrong
	* way from there on, and the cut fell between the two halves of a flag.
	* Where the runtime cannot tell characters apart (no Intl.Segmenter), or
	* where no whole character ends before the cut (one run of combining marks
	* longer than the text kept), the cut falls between code points as before.
	*/
	var segmenter = null;
	/** How far past the cut is read, so that the character the cut falls in is seen whole. */
	var CUT_LOOKAHEAD = 64;
	function cutWhole(s, max) {
		if (s.length <= max) return s;
		const byUnits = () => {
			const cut = s.slice(0, max);
			return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
		};
		if (typeof Intl === "undefined" || !Intl.Segmenter) return byUnits();
		segmenter = segmenter || new Intl.Segmenter();
		let end = 0;
		for (const seg of segmenter.segment(s.slice(0, max + CUT_LOOKAHEAD))) {
			const stop = seg.index + seg.segment.length;
			if (stop > max) break;
			end = stop;
		}
		return end > 0 ? s.slice(0, end) : byUnits();
	}
	/**
	* Trim and clamp free text; returns '' for non-strings. The clamp counts
	* UTF-16 units, as the app's own counters do, and falls only between whole
	* characters as the reader sees them (see cutWhole); what a cut leaves at
	* the end is trimmed as the start is.
	*/
	function cleanText(input, max) {
		if (typeof input !== "string") return "";
		const s = input.replace(/\r\n?/g, "\n").trim();
		return s.length <= max ? s : cutWhole(s, max).trimEnd();
	}
	/**
	* The text a mention is looked for in: what the renderer draws as one. Code
	* is left out, a fenced block and an inline span alike, told apart exactly
	* as lib/format.js tells them (a fence is closed; a span is non-empty and
	* on one line), and each piece is looked at on its own, as the renderer
	* looks at each. An @channel in a snippet, or a name in one, drew as plain
	* code and rang everyone all the same; a member's snippet holding @channel
	* was refused in #general as a notice only admins may send. The renderer's
	* emphasis marks come off next, by its rules (see emphasisOff), and then
	* every address goes (see LINK_RE): the renderer lifts an address out whole
	* before it looks for mentions, so a handle inside one
	* (https://mastodon.social/@alice) is a path segment and draws no chip,
	* and one it draws in italics (_@alice_) is a chip, the underscore being a
	* tag by then. Read from the raw text, the address rang alice, badged her
	* and put a mention nothing showed in her Activity, an address holding
	* @channel asked the sender to notify everyone (and was refused where only
	* admins may), and the italic handle rang nobody.
	*/
	function mentionableText(text) {
		return String(text || "").split(/(```[\s\S]*?```)/g).map((part) => part.startsWith("```") && part.endsWith("```") && part.length >= 6 ? " " : emphasisOff(part.replace(/`[^`\n]+`/g, " ")).replace(LINK_RE, " ")).join(" ");
	}
	/** Usernames mentioned in text, in order of first appearance, lowercased. Nothing inside code or an address counts (see mentionableText). */
	function extractMentionNames(text) {
		const seen = /* @__PURE__ */ new Set();
		const re = /(^|[^a-z0-9_])@([a-z0-9][a-z0-9_.-]{0,39})/gi;
		let m;
		while ((m = re.exec(mentionableText(text))) !== null) seen.add(m[2].toLowerCase().replace(/[.-]+$/, ""));
		return [...seen];
	}
	/**
	* A link as the renderer draws it (lib/format.js): a bracket pair inside the
	* address belongs to it, a lone closing bracket or trailing punctuation
	* ends it, and it never ends on an opening bracket. Kept in step so what is
	* unfurled is what is clickable.
	*/
	var LINK_GROUP = "\\([^\\s()<>\"']*\\)|\\[[^\\s\\[\\]<>\"']*\\]";
	/**
	* Punctuation of other scripts that ends an address as the ASCII marks do:
	* a full stop, comma, question or exclamation mark of Chinese, Japanese and
	* Arabic, a closing corner bracket or guillemet, a curly quote, an ellipsis.
	* "見て https://x.io/a。" carried the full stop into the address, and the
	* link led nowhere. None of them is ever written raw inside an address, so
	* one cuts it wherever it stands ("https://x.io/a、b" is the address and a
	* comma), where a Latin full stop is part of one until the end. Named, not
	* \p{Po}: that class holds "/" and "#" too, and an address ending in a
	* slash would have lost it. Shared with the renderer's URL_RE
	* (lib/format.js), kept to the same shapes.
	*/
	var LINK_TAIL_PUNCT = "。、，．！？；：」』）】》〉〕…‥«»“”‘’‚„‹›¡¿،؛؟";
	var LINK_RE = new RegExp(`\\bhttps?:\\/\\/(?:${LINK_GROUP}|(?!${LINK_GROUP})[^\\s<>"')\\]${LINK_TAIL_PUNCT}])*(?:${LINK_GROUP}|(?!${LINK_GROUP})[^\\s<>"'().,;:!?\\[\\]${LINK_TAIL_PUNCT}])`, "gi");
	/**
	* The text a link is looked for in: code spans and blocks left out (an
	* address in code is not a link), and the renderer's emphasis marks taken
	* off the way lib/format.js takes them (its rules, in its order), so an
	* address written in bold or italics is found as it is drawn — without
	* the closing marks, and at all for `_https://…_`, where the underscore
	* would otherwise deny the address its word boundary.
	*/
	function linkableText(text) {
		return emphasisOff(String(text || "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " "));
	}
	/**
	* The renderer's emphasis marks taken off a text with no code in it, by the
	* renderer's rules in its order (see lib/format.js inline), as the text
	* stands by the time it looks for links and mentions.
	*/
	function emphasisOff(text) {
		return text.replace(/\*\*([^*\n]+?)\*\*/g, " $1 ").replace(/(^|[\s(["'\p{Ps}\p{Pi}]|(?:^|\n)> ?)_([^_\n]+?)_(?=[\s.,!?;:)\]"'\p{Pe}\p{Pf}]|(?!&)\p{Po}|$)/gu, "$1$2 ").replace(/(^|[\s(["'\p{Ps}\p{Pi}]|(?:^|\n)> ?)~([^~\n]+?)~(?=[\s.,!?;:)\]"'\p{Pe}\p{Pf}]|(?!&)\p{Po}|$)/gu, "$1$2 ");
	}
	/**
	* A link into the app itself: its fragment is one of the app's routes
	* (#/ws/…, #/join/…, #/connect/…). Recognized by shape rather than origin —
	* the app is served from wherever it is served, and the workspace reference
	* inside the fragment already names the worker — so the client and every
	* worker agree without either knowing the app's address. The page behind
	* such a link is always the app shell (a fragment is never sent to the
	* server), whose generic card says nothing; a link to the app's front page
	* itself, with no route, is a deliberate share and keeps its preview.
	*/
	function isAppLink(url) {
		try {
			return /^#\/(ws|join|connect)\//.test(new URL(String(url)).hash);
		} catch {
			return false;
		}
	}
	/** The first link worth a preview: like firstLinkOf, but a link into the app itself is passed over. */
	function firstUnfurlableLink(text) {
		for (const m of linkableText(text).matchAll(LINK_RE)) if (!isAppLink(m[0])) return m[0];
		return null;
	}
	//#endregion
	//#region src/shared/emoji-codes.js
	var CODES = "grinning smiley smile grin laughing satisfied sweat_smile rofl joy slightly_smiling_face upside_down_face melting_face wink blush innocent smiling_face_with_three_hearts heart_eyes star_struck kissing_heart kissing relaxed kissing_closed_eyes kissing_smiling_eyes smiling_face_with_tear yum stuck_out_tongue stuck_out_tongue_winking_eye zany_face stuck_out_tongue_closed_eyes money_mouth_face hugs hand_over_mouth face_with_open_eyes_and_hand_over_mouth face_with_peeking_eye shushing_face thinking saluting_face zipper_mouth_face raised_eyebrow neutral_face expressionless no_mouth dotted_line_face face_in_clouds smirk unamused roll_eyes grimacing face_exhaling lying_face shaking_face relieved pensive sleepy drooling_face sleeping mask face_with_thermometer face_with_head_bandage nauseated_face vomiting_face sneezing_face hot_face cold_face woozy_face dizzy_face face_with_spiral_eyes exploding_head cowboy_hat_face partying_face disguised_face sunglasses nerd_face monocle_face confused face_with_diagonal_mouth worried slightly_frowning_face frowning_face open_mouth hushed astonished flushed pleading_face face_holding_back_tears frowning anguished fearful cold_sweat disappointed_relieved cry sob scream confounded persevere disappointed sweat weary tired_face yawning_face triumph rage pout angry cursing_face smiling_imp imp skull skull_and_crossbones hankey poop shit clown_face japanese_ogre japanese_goblin ghost alien space_invader robot smiley_cat smile_cat joy_cat heart_eyes_cat smirk_cat kissing_cat scream_cat crying_cat_face pouting_cat see_no_evil hear_no_evil speak_no_evil love_letter cupid gift_heart sparkling_heart heartpulse heartbeat revolving_hearts two_hearts heart_decoration heavy_heart_exclamation broken_heart heart_on_fire mending_heart heart pink_heart orange_heart yellow_heart green_heart blue_heart light_blue_heart purple_heart brown_heart black_heart grey_heart white_heart kiss 100 anger boom collision dizzy sweat_drops dash hole speech_balloon eye_speech_bubble left_speech_bubble right_anger_bubble thought_balloon zzz wave raised_back_of_hand raised_hand_with_fingers_splayed hand raised_hand vulcan_salute rightwards_hand leftwards_hand palm_down_hand palm_up_hand leftwards_pushing_hand rightwards_pushing_hand ok_hand pinched_fingers pinching_hand v crossed_fingers hand_with_index_finger_and_thumb_crossed love_you_gesture metal call_me_hand point_left point_right point_up_2 middle_finger fu point_down point_up index_pointing_at_the_viewer +1 thumbsup -1 thumbsdown fist_raised fist fist_oncoming facepunch punch fist_left fist_right clap raised_hands heart_hands open_hands palms_up_together handshake pray writing_hand nail_care selfie muscle mechanical_arm mechanical_leg leg foot ear ear_with_hearing_aid nose brain anatomical_heart lungs tooth bone eyes eye tongue lips biting_lip baby child boy girl adult blond_haired_person man bearded_person man_beard woman_beard red_haired_man curly_haired_man white_haired_man bald_man woman red_haired_woman person_red_hair curly_haired_woman person_curly_hair white_haired_woman person_white_hair bald_woman person_bald blond_haired_woman blonde_woman blond_haired_man older_adult older_man older_woman frowning_person frowning_man frowning_woman pouting_face pouting_man pouting_woman no_good no_good_man ng_man no_good_woman ng_woman ok_person ok_man ok_woman tipping_hand_person information_desk_person tipping_hand_man sassy_man tipping_hand_woman sassy_woman raising_hand raising_hand_man raising_hand_woman deaf_person deaf_man deaf_woman bow bowing_man bowing_woman facepalm man_facepalming woman_facepalming shrug man_shrugging woman_shrugging health_worker man_health_worker woman_health_worker student man_student woman_student teacher man_teacher woman_teacher judge man_judge woman_judge farmer man_farmer woman_farmer cook man_cook woman_cook mechanic man_mechanic woman_mechanic factory_worker man_factory_worker woman_factory_worker office_worker man_office_worker woman_office_worker scientist man_scientist woman_scientist technologist man_technologist woman_technologist singer man_singer woman_singer artist man_artist woman_artist pilot man_pilot woman_pilot astronaut man_astronaut woman_astronaut firefighter man_firefighter woman_firefighter police_officer cop policeman policewoman detective male_detective female_detective guard guardsman guardswoman ninja construction_worker construction_worker_man construction_worker_woman person_with_crown prince princess person_with_turban man_with_turban woman_with_turban man_with_gua_pi_mao woman_with_headscarf person_in_tuxedo man_in_tuxedo woman_in_tuxedo person_with_veil man_with_veil woman_with_veil bride_with_veil pregnant_woman pregnant_man pregnant_person breast_feeding woman_feeding_baby man_feeding_baby person_feeding_baby angel santa mrs_claus mx_claus superhero superhero_man superhero_woman supervillain supervillain_man supervillain_woman mage mage_man mage_woman fairy fairy_man fairy_woman vampire vampire_man vampire_woman merperson merman mermaid elf elf_man elf_woman genie genie_man genie_woman zombie zombie_man zombie_woman troll massage massage_man massage_woman haircut haircut_man haircut_woman walking walking_man walking_woman standing_person standing_man standing_woman kneeling_person kneeling_man kneeling_woman person_with_probing_cane man_with_probing_cane woman_with_probing_cane person_in_motorized_wheelchair man_in_motorized_wheelchair woman_in_motorized_wheelchair person_in_manual_wheelchair man_in_manual_wheelchair woman_in_manual_wheelchair runner running running_man running_woman woman_dancing dancer man_dancing business_suit_levitating dancers dancing_men dancing_women sauna_person sauna_man sauna_woman climbing climbing_man climbing_woman person_fencing horse_racing skier snowboarder golfing golfing_man golfing_woman surfer surfing_man surfing_woman rowboat rowing_man rowing_woman swimmer swimming_man swimming_woman bouncing_ball_person bouncing_ball_man basketball_man bouncing_ball_woman basketball_woman weight_lifting weight_lifting_man weight_lifting_woman bicyclist biking_man biking_woman mountain_bicyclist mountain_biking_man mountain_biking_woman cartwheeling man_cartwheeling woman_cartwheeling wrestling men_wrestling women_wrestling water_polo man_playing_water_polo woman_playing_water_polo handball_person man_playing_handball woman_playing_handball juggling_person man_juggling woman_juggling lotus_position lotus_position_man lotus_position_woman bath sleeping_bed people_holding_hands two_women_holding_hands couple two_men_holding_hands couplekiss couplekiss_man_woman couplekiss_man_man couplekiss_woman_woman couple_with_heart couple_with_heart_woman_man couple_with_heart_man_man couple_with_heart_woman_woman family family_man_woman_boy family_man_woman_girl family_man_woman_girl_boy family_man_woman_boy_boy family_man_woman_girl_girl family_man_man_boy family_man_man_girl family_man_man_girl_boy family_man_man_boy_boy family_man_man_girl_girl family_woman_woman_boy family_woman_woman_girl family_woman_woman_girl_boy family_woman_woman_boy_boy family_woman_woman_girl_girl family_man_boy family_man_boy_boy family_man_girl family_man_girl_boy family_man_girl_girl family_woman_boy family_woman_boy_boy family_woman_girl family_woman_girl_boy family_woman_girl_girl speaking_head bust_in_silhouette busts_in_silhouette people_hugging footprints monkey_face monkey gorilla orangutan dog dog2 guide_dog service_dog poodle wolf fox_face raccoon cat cat2 black_cat lion tiger tiger2 leopard horse moose donkey racehorse unicorn zebra deer bison cow ox water_buffalo cow2 pig pig2 boar pig_nose ram sheep goat dromedary_camel camel llama giraffe elephant mammoth rhinoceros hippopotamus mouse mouse2 rat hamster rabbit rabbit2 chipmunk beaver hedgehog bat bear polar_bear koala panda_face sloth otter skunk kangaroo badger feet paw_prints turkey chicken rooster hatching_chick baby_chick hatched_chick bird penguin dove eagle duck swan owl dodo feather flamingo peacock parrot wing black_bird goose frog crocodile turtle lizard snake dragon_face dragon sauropod t-rex whale whale2 dolphin flipper seal fish tropical_fish blowfish shark octopus shell coral jellyfish snail butterfly bug ant bee honeybee beetle lady_beetle cricket cockroach spider spider_web scorpion mosquito fly worm microbe bouquet cherry_blossom white_flower lotus rosette rose wilted_flower hibiscus sunflower blossom tulip hyacinth seedling potted_plant evergreen_tree deciduous_tree palm_tree cactus ear_of_rice herb shamrock four_leaf_clover maple_leaf fallen_leaf leaves empty_nest nest_with_eggs mushroom grapes melon watermelon tangerine orange mandarin lemon banana pineapple mango apple green_apple pear peach cherries strawberry blueberries kiwi_fruit tomato olive coconut avocado eggplant potato carrot corn hot_pepper bell_pepper cucumber leafy_green broccoli garlic onion peanuts beans chestnut ginger_root pea_pod bread croissant baguette_bread flatbread pretzel bagel pancakes waffle cheese meat_on_bone poultry_leg cut_of_meat bacon hamburger fries pizza hotdog sandwich taco burrito tamale stuffed_flatbread falafel egg fried_egg shallow_pan_of_food stew fondue bowl_with_spoon green_salad popcorn butter salt canned_food bento rice_cracker rice_ball rice curry ramen spaghetti sweet_potato oden sushi fried_shrimp fish_cake moon_cake dango dumpling fortune_cookie takeout_box crab lobster shrimp squid oyster icecream shaved_ice ice_cream doughnut cookie birthday cake cupcake pie chocolate_bar candy lollipop custard honey_pot baby_bottle milk_glass coffee teapot tea sake champagne wine_glass cocktail tropical_drink beer beers clinking_glasses tumbler_glass pouring_liquid cup_with_straw bubble_tea beverage_box mate ice_cube chopsticks plate_with_cutlery fork_and_knife spoon hocho knife jar amphora earth_africa earth_americas earth_asia globe_with_meridians world_map japan compass mountain_snow mountain volcano mount_fuji camping beach_umbrella desert desert_island national_park stadium classical_building building_construction bricks rock wood hut houses derelict_house house house_with_garden office post_office european_post_office hospital bank hotel love_hotel convenience_store school department_store factory japanese_castle european_castle wedding tokyo_tower statue_of_liberty church mosque hindu_temple synagogue shinto_shrine kaaba fountain tent foggy night_with_stars cityscape sunrise_over_mountains sunrise city_sunset city_sunrise bridge_at_night hotsprings carousel_horse playground_slide ferris_wheel roller_coaster barber circus_tent steam_locomotive railway_car bullettrain_side bullettrain_front train2 metro light_rail station tram monorail mountain_railway train bus oncoming_bus trolleybus minibus ambulance fire_engine police_car oncoming_police_car taxi oncoming_taxi car red_car oncoming_automobile blue_car pickup_truck truck articulated_lorry tractor racing_car motorcycle motor_scooter manual_wheelchair motorized_wheelchair auto_rickshaw bike kick_scooter skateboard roller_skate busstop motorway railway_track oil_drum fuelpump wheel rotating_light traffic_light vertical_traffic_light stop_sign construction anchor ring_buoy boat sailboat canoe speedboat passenger_ship ferry motor_boat ship airplane small_airplane flight_departure flight_arrival parachute seat helicopter suspension_railway mountain_cableway aerial_tramway artificial_satellite rocket flying_saucer bellhop_bell luggage hourglass hourglass_flowing_sand watch alarm_clock stopwatch timer_clock mantelpiece_clock clock12 clock1230 clock1 clock130 clock2 clock230 clock3 clock330 clock4 clock430 clock5 clock530 clock6 clock630 clock7 clock730 clock8 clock830 clock9 clock930 clock10 clock1030 clock11 clock1130 new_moon waxing_crescent_moon first_quarter_moon moon waxing_gibbous_moon full_moon waning_gibbous_moon last_quarter_moon waning_crescent_moon crescent_moon new_moon_with_face first_quarter_moon_with_face last_quarter_moon_with_face thermometer sunny full_moon_with_face sun_with_face ringed_planet star star2 stars milky_way cloud partly_sunny cloud_with_lightning_and_rain sun_behind_small_cloud sun_behind_large_cloud sun_behind_rain_cloud cloud_with_rain cloud_with_snow cloud_with_lightning tornado fog wind_face cyclone rainbow closed_umbrella open_umbrella umbrella parasol_on_ground zap snowflake snowman_with_snow snowman comet fire droplet ocean jack_o_lantern christmas_tree fireworks sparkler firecracker sparkles balloon tada confetti_ball tanabata_tree bamboo dolls flags wind_chime rice_scene red_envelope ribbon gift reminder_ribbon tickets ticket medal_military trophy medal_sports 1st_place_medal 2nd_place_medal 3rd_place_medal soccer baseball softball basketball volleyball football rugby_football tennis flying_disc bowling cricket_game field_hockey ice_hockey lacrosse ping_pong badminton boxing_glove martial_arts_uniform goal_net golf ice_skate fishing_pole_and_fish diving_mask running_shirt_with_sash ski sled curling_stone dart yo_yo kite gun 8ball crystal_ball magic_wand video_game joystick slot_machine game_die jigsaw teddy_bear pinata mirror_ball nesting_dolls spades hearts diamonds clubs chess_pawn black_joker mahjong flower_playing_cards performing_arts framed_picture art thread sewing_needle yarn knot eyeglasses dark_sunglasses goggles lab_coat safety_vest necktie shirt tshirt jeans scarf gloves coat socks dress kimono sari one_piece_swimsuit swim_brief shorts bikini womans_clothes folding_hand_fan purse handbag pouch shopping school_satchel thong_sandal mans_shoe shoe athletic_shoe hiking_boot flat_shoe high_heel sandal ballet_shoes boot hair_pick crown womans_hat tophat mortar_board billed_cap military_helmet rescue_worker_helmet prayer_beads lipstick ring gem mute speaker sound loud_sound loudspeaker mega postal_horn bell no_bell musical_score musical_note notes studio_microphone level_slider control_knobs microphone headphones radio saxophone accordion guitar musical_keyboard trumpet violin banjo drum long_drum maracas flute iphone calling phone telephone telephone_receiver pager fax battery low_battery electric_plug computer desktop_computer printer keyboard computer_mouse trackball minidisc floppy_disk cd dvd abacus movie_camera film_strip film_projector clapper tv camera camera_flash video_camera vhs mag mag_right candle bulb flashlight izakaya_lantern lantern diya_lamp notebook_with_decorative_cover closed_book book open_book green_book blue_book orange_book books notebook ledger page_with_curl scroll page_facing_up newspaper newspaper_roll bookmark_tabs bookmark label moneybag coin yen dollar euro pound money_with_wings credit_card receipt chart envelope email e-mail incoming_envelope envelope_with_arrow outbox_tray inbox_tray package mailbox mailbox_closed mailbox_with_mail mailbox_with_no_mail postbox ballot_box pencil2 black_nib fountain_pen pen paintbrush crayon memo pencil briefcase file_folder open_file_folder card_index_dividers date calendar spiral_notepad spiral_calendar card_index chart_with_upwards_trend chart_with_downwards_trend bar_chart clipboard pushpin round_pushpin paperclip paperclips straight_ruler triangular_ruler scissors card_file_box file_cabinet wastebasket lock unlock lock_with_ink_pen closed_lock_with_key key old_key hammer axe pick hammer_and_pick hammer_and_wrench dagger crossed_swords bomb boomerang bow_and_arrow shield carpentry_saw wrench screwdriver nut_and_bolt gear clamp balance_scale probing_cane link chains hook toolbox magnet ladder alembic test_tube petri_dish dna microscope telescope satellite syringe drop_of_blood pill adhesive_bandage crutch stethoscope x_ray door elevator mirror window bed couch_and_lamp chair toilet plunger shower bathtub mouse_trap razor lotion_bottle safety_pin broom basket roll_of_paper bucket soap bubbles toothbrush sponge fire_extinguisher shopping_cart smoking coffin headstone funeral_urn nazar_amulet hamsa moyai placard identification_card atm put_litter_in_its_place potable_water wheelchair mens womens restroom baby_symbol wc passport_control customs baggage_claim left_luggage warning children_crossing no_entry no_entry_sign no_bicycles no_smoking do_not_litter non-potable_water no_pedestrians no_mobile_phones underage radioactive biohazard arrow_up arrow_upper_right arrow_right arrow_lower_right arrow_down arrow_lower_left arrow_left arrow_upper_left arrow_up_down left_right_arrow leftwards_arrow_with_hook arrow_right_hook arrow_heading_up arrow_heading_down arrows_clockwise arrows_counterclockwise back end on soon top place_of_worship atom_symbol om star_of_david wheel_of_dharma yin_yang latin_cross orthodox_cross star_and_crescent peace_symbol menorah six_pointed_star khanda aries taurus gemini cancer leo virgo libra scorpius sagittarius capricorn aquarius pisces ophiuchus twisted_rightwards_arrows repeat repeat_one arrow_forward fast_forward next_track_button play_or_pause_button arrow_backward rewind previous_track_button arrow_up_small arrow_double_up arrow_down_small arrow_double_down pause_button stop_button record_button eject_button cinema low_brightness high_brightness signal_strength wireless vibration_mode mobile_phone_off female_sign male_sign transgender_symbol heavy_multiplication_x heavy_plus_sign heavy_minus_sign heavy_division_sign heavy_equals_sign infinity bangbang interrobang question grey_question grey_exclamation exclamation heavy_exclamation_mark wavy_dash currency_exchange heavy_dollar_sign medical_symbol recycle fleur_de_lis trident name_badge beginner o white_check_mark ballot_box_with_check heavy_check_mark x negative_squared_cross_mark curly_loop loop part_alternation_mark eight_spoked_asterisk eight_pointed_black_star sparkle copyright registered tm hash asterisk zero one two three four five six seven eight nine keycap_ten capital_abcd abcd 1234 symbols abc a ab b cl cool free information_source id m new ng o2 ok parking sos up vs koko sa u6708 u6709 u6307 ideograph_advantage u5272 u7121 u7981 accept u7533 u5408 u7a7a congratulations secret u55b6 u6e80 red_circle orange_circle yellow_circle green_circle large_blue_circle purple_circle brown_circle black_circle white_circle red_square orange_square yellow_square green_square blue_square purple_square brown_square black_large_square white_large_square black_medium_square white_medium_square black_medium_small_square white_medium_small_square black_small_square white_small_square large_orange_diamond large_blue_diamond small_orange_diamond small_blue_diamond small_red_triangle small_red_triangle_down diamond_shape_with_a_dot_inside radio_button white_square_button black_square_button checkered_flag triangular_flag_on_post crossed_flags black_flag white_flag rainbow_flag transgender_flag pirate_flag ascension_island andorra united_arab_emirates afghanistan antigua_barbuda anguilla albania armenia angola antarctica argentina american_samoa austria australia aruba aland_islands azerbaijan bosnia_herzegovina barbados bangladesh belgium burkina_faso bulgaria bahrain burundi benin st_barthelemy bermuda brunei bolivia caribbean_netherlands brazil bahamas bhutan bouvet_island botswana belarus belize canada cocos_islands congo_kinshasa central_african_republic congo_brazzaville switzerland cote_divoire cook_islands chile cameroon cn colombia clipperton_island costa_rica cuba cape_verde curacao christmas_island cyprus czech_republic de diego_garcia djibouti denmark dominica dominican_republic algeria ceuta_melilla ecuador estonia egypt western_sahara eritrea es ethiopia eu european_union finland fiji falkland_islands micronesia faroe_islands fr gabon gb uk grenada georgia french_guiana guernsey ghana gibraltar greenland gambia guinea guadeloupe equatorial_guinea greece south_georgia_south_sandwich_islands guatemala guam guinea_bissau guyana hong_kong heard_mcdonald_islands honduras croatia haiti hungary canary_islands indonesia ireland israel isle_of_man india british_indian_ocean_territory iraq iran iceland it jersey jamaica jordan jp kenya kyrgyzstan cambodia kiribati comoros st_kitts_nevis north_korea kr kuwait cayman_islands kazakhstan laos lebanon st_lucia liechtenstein sri_lanka liberia lesotho lithuania luxembourg latvia libya morocco monaco moldova montenegro st_martin madagascar marshall_islands macedonia mali myanmar mongolia macau northern_mariana_islands martinique mauritania montserrat malta mauritius maldives malawi mexico malaysia mozambique namibia new_caledonia niger norfolk_island nigeria nicaragua netherlands norway nepal nauru niue new_zealand oman panama peru french_polynesia papua_new_guinea philippines pakistan poland st_pierre_miquelon pitcairn_islands puerto_rico palestinian_territories portugal palau paraguay qatar reunion romania serbia ru rwanda saudi_arabia solomon_islands seychelles sudan sweden singapore st_helena slovenia svalbard_jan_mayen slovakia sierra_leone san_marino senegal somalia suriname south_sudan sao_tome_principe el_salvador sint_maarten syria swaziland tristan_da_cunha turks_caicos_islands chad french_southern_territories togo thailand tajikistan tokelau timor_leste turkmenistan tunisia tonga tr trinidad_tobago tuvalu taiwan tanzania ukraine uganda us_outlying_islands united_nations us uruguay uzbekistan vatican_city st_vincent_grenadines venezuela british_virgin_islands us_virgin_islands vietnam vanuatu wallis_futuna samoa kosovo yemen mayotte south_africa zambia zimbabwe england scotland wales";
	var TONED = "wave raised_back_of_hand raised_hand_with_fingers_splayed hand raised_hand vulcan_salute rightwards_hand leftwards_hand palm_down_hand palm_up_hand leftwards_pushing_hand rightwards_pushing_hand ok_hand pinched_fingers pinching_hand v crossed_fingers hand_with_index_finger_and_thumb_crossed love_you_gesture metal call_me_hand point_left point_right point_up_2 middle_finger fu point_down point_up index_pointing_at_the_viewer +1 thumbsup -1 thumbsdown fist_raised fist fist_oncoming facepunch punch fist_left fist_right clap raised_hands heart_hands open_hands palms_up_together handshake pray writing_hand nail_care selfie muscle leg foot ear ear_with_hearing_aid nose baby child boy girl adult blond_haired_person man bearded_person man_beard woman_beard red_haired_man curly_haired_man white_haired_man bald_man woman red_haired_woman person_red_hair curly_haired_woman person_curly_hair white_haired_woman person_white_hair bald_woman person_bald blond_haired_woman blonde_woman blond_haired_man older_adult older_man older_woman frowning_person frowning_man frowning_woman pouting_face pouting_man pouting_woman no_good no_good_man ng_man no_good_woman ng_woman ok_person ok_man ok_woman tipping_hand_person information_desk_person tipping_hand_man sassy_man tipping_hand_woman sassy_woman raising_hand raising_hand_man raising_hand_woman deaf_person deaf_man deaf_woman bow bowing_man bowing_woman facepalm man_facepalming woman_facepalming shrug man_shrugging woman_shrugging health_worker man_health_worker woman_health_worker student man_student woman_student teacher man_teacher woman_teacher judge man_judge woman_judge farmer man_farmer woman_farmer cook man_cook woman_cook mechanic man_mechanic woman_mechanic factory_worker man_factory_worker woman_factory_worker office_worker man_office_worker woman_office_worker scientist man_scientist woman_scientist technologist man_technologist woman_technologist singer man_singer woman_singer artist man_artist woman_artist pilot man_pilot woman_pilot astronaut man_astronaut woman_astronaut firefighter man_firefighter woman_firefighter police_officer cop policeman policewoman detective male_detective female_detective guard guardsman guardswoman ninja construction_worker construction_worker_man construction_worker_woman person_with_crown prince princess person_with_turban man_with_turban woman_with_turban man_with_gua_pi_mao woman_with_headscarf person_in_tuxedo man_in_tuxedo woman_in_tuxedo person_with_veil man_with_veil woman_with_veil bride_with_veil pregnant_woman pregnant_man pregnant_person breast_feeding woman_feeding_baby man_feeding_baby person_feeding_baby angel santa mrs_claus mx_claus superhero superhero_man superhero_woman supervillain supervillain_man supervillain_woman mage mage_man mage_woman fairy fairy_man fairy_woman vampire vampire_man vampire_woman merperson merman mermaid elf elf_man elf_woman massage massage_man massage_woman haircut haircut_man haircut_woman walking walking_man walking_woman standing_person standing_man standing_woman kneeling_person kneeling_man kneeling_woman person_with_probing_cane man_with_probing_cane woman_with_probing_cane person_in_motorized_wheelchair man_in_motorized_wheelchair woman_in_motorized_wheelchair person_in_manual_wheelchair man_in_manual_wheelchair woman_in_manual_wheelchair runner running running_man running_woman woman_dancing dancer man_dancing business_suit_levitating sauna_person sauna_man sauna_woman climbing climbing_man climbing_woman horse_racing snowboarder golfing golfing_man golfing_woman surfer surfing_man surfing_woman rowboat rowing_man rowing_woman swimmer swimming_man swimming_woman bouncing_ball_person bouncing_ball_man basketball_man bouncing_ball_woman basketball_woman weight_lifting weight_lifting_man weight_lifting_woman bicyclist biking_man biking_woman mountain_bicyclist mountain_biking_man mountain_biking_woman cartwheeling man_cartwheeling woman_cartwheeling water_polo man_playing_water_polo woman_playing_water_polo handball_person man_playing_handball woman_playing_handball juggling_person man_juggling woman_juggling lotus_position lotus_position_man lotus_position_woman bath sleeping_bed people_holding_hands two_women_holding_hands couple two_men_holding_hands couplekiss couplekiss_man_woman couplekiss_man_man couplekiss_woman_woman couple_with_heart couple_with_heart_woman_man couple_with_heart_man_man couple_with_heart_woman_woman";
	/** Every known :shortcode:. */
	var EMOJI_CODES = new Set(CODES.split(" "));
	/** Shortcodes whose emoji takes a skin tone modifier. */
	var EMOJI_TONED = new Set(TONED.split(" "));
	//#endregion
	//#region src/shared/reactions.js
	/**
	* Reaction keys, validated the same way in the worker and the client. A key
	* is stored as a path segment in a block's overlay (`x.s42.r.{key}.{uuid}`),
	* so it must be one of a known set rather than any string: a legacy icon
	* name, or an emoji :shortcode: optionally followed by a skin tone suffix
	* (`-tone2` .. `-tone6`) when that emoji takes one.
	*/
	/** The original eight reactions, stored on older messages as Lucide icon names. */
	var LEGACY_REACTION_KEYS = /* @__PURE__ */ new Set([
		"thumbs-up",
		"heart",
		"laugh",
		"party-popper",
		"eye",
		"check",
		"rocket",
		"flame"
	]);
	var KEY_RE = /^[a-z0-9_+-]{1,48}$/;
	var TONE_RE = /-tone([2-6])$/;
	function isReactionKey(key) {
		if (typeof key !== "string" || !KEY_RE.test(key)) return false;
		if (LEGACY_REACTION_KEYS.has(key)) return true;
		const m = TONE_RE.exec(key);
		if (!m) return EMOJI_CODES.has(key);
		const base = key.slice(0, m.index);
		return EMOJI_TONED.has(base);
	}
	//#endregion
	//#region worker/lib.js
	/**
	* Small helpers for the worker: error shape, JSON responses, caller identity,
	* and the atomic block append. `me` is the worker runtime's global for the
	* owner's Puter resources; everything shared lives in `me.puter.kv`.
	*/
	var HttpError = class extends Error {
		constructor(status, code, message, headers = null) {
			super(message || code);
			this.status = status;
			this.code = code;
			if (headers) this.headers = headers;
		}
	};
	var kv = () => me.puter.kv;
	var fs = () => me.puter.fs;
	/**
	* Build id of this bundle, compiled in by vite.worker.config.js from a hash
	* of the worker's source. The app compares it with the id in the bundle it
	* ships to know when an owner's deployed worker needs refreshing. Running
	* from source (tests, mock.html) reports 'dev'.
	*/
	var WORKER_BUILD = "2234130e21f1";
	/** When the bundle was built, so two builds can be ordered (0 from source). */
	var WORKER_BUILT_AT = 1792189673944;
	/** The puter.js build the platform baked into this deploy (its preamble's first
	*  line); read on each call because the preamble exists only once deployed.
	*  Null from source (tests, mock.html). */
	var workerRuntime = () => typeof __PUTER_PREAMBLE_VERSION__ === "string" ? __PUTER_PREAMBLE_VERSION__ : null;
	/**
	* Whose account this worker runs in. Each workspace owner deploys their own
	* copy, so only that account may create workspaces here: anyone else could
	* otherwise store data in the owner's KV at the owner's expense. The owner is
	* asked from the runtime (`me.puter.auth.getUser()`) and remembered in
	* `tc:config`; if the runtime cannot say, the first account to create a
	* workspace claims the worker (the deploy flow does so within seconds of
	* creating it). `tc:config.open` lets an owner run a shared worker anyone
	* may create workspaces on, the way the original single deployment worked.
	*/
	var CONFIG_KEY = "tc:config";
	var configCache = null;
	async function serverConfig() {
		if (configCache) return configCache;
		const cfg = await kv().get("tc:config") || {};
		if (!cfg.owner) try {
			const info = me.puter.auth && typeof me.puter.auth.getUser === "function" ? await me.puter.auth.getUser() : null;
			if (info && info.uuid) {
				cfg.owner = String(info.uuid);
				await kv().update(CONFIG_KEY, { owner: cfg.owner }).catch(() => {});
			}
		} catch {}
		configCache = cfg;
		return cfg;
	}
	async function setServerConfig(patch) {
		await kv().update(CONFIG_KEY, patch);
		configCache = null;
		return serverConfig();
	}
	/** Throw unless `uuid` may create workspaces on this worker (see serverConfig). */
	async function assertMayCreate(uuid) {
		const cfg = await serverConfig();
		if (cfg.open) return cfg;
		if (!cfg.owner) {
			await setServerConfig({ owner: uuid });
			return serverConfig();
		}
		if (cfg.owner !== uuid) fail(403, "not_owner", "Only the owner of this server can create workspaces on it");
		return cfg;
	}
	/** Forget the cached config (tests swap stores between cases). */
	function resetServerConfigCache() {
		configCache = null;
	}
	function json(data, status = 200, headers = {}) {
		return new Response(JSON.stringify(data), {
			status,
			headers: {
				"Content-Type": "application/json",
				...headers
			}
		});
	}
	function fail(status, code, message, headers = null) {
		throw new HttpError(status, code, message, headers);
	}
	/**
	* Let the runtime finish `deferred` after the answer has gone out. A Puter
	* worker's event carries `waitUntil` (the service-worker method): the
	* promise keeps the isolate alive without holding the response, which is
	* what lets the search index, the pushes and the change signal ride behind
	* a post rather than in front of it. A runtime without it (the tests, the
	* browser harness) is waited on instead, so the same work is done either
	* way and nothing is silently dropped.
	*/
	async function settleDeferred(ctx, deferred) {
		if (!deferred.length) return;
		const all = Promise.all(deferred);
		if (typeof ctx?.waitUntil === "function") try {
			ctx.waitUntil(all);
			return;
		} catch {}
		await all;
	}
	/**
	* Say how long the answer took, and how much of that was spent asking Puter
	* who the caller is (`auth`, and 0 where a cached identity answered it —
	* see IDENTITY_TTL_MS). The rest is the store, which is round trips in a
	* row, so `total - auth` divided by the calls a route makes is what one
	* round trip to the store is costing right now.
	*
	* A standard Server-Timing header, so it shows up in a browser's network
	* panel with no tooling: this is the one number that says whether a slow
	* write is the store, the identity call, or the network in front of both,
	* and without it that has to be guessed at.
	*/
	function timed(res, ctx, startedAt) {
		try {
			const auth = authMs.get(ctx?.user);
			const parts = [`total;dur=${Date.now() - startedAt}`];
			if (auth !== void 0) parts.push(`auth;dur=${auth}`);
			res.headers.set("Server-Timing", parts.join(", "));
			const exposed = res.headers.get("Access-Control-Expose-Headers");
			const names = new Set((exposed ? exposed.split(",") : []).map((n) => n.trim()).filter(Boolean));
			names.add("Server-Timing");
			res.headers.set("Access-Control-Expose-Headers", [...names].join(", "));
		} catch {}
		return res;
	}
	/** The host this worker is reached at (teamchat-xxx.puter.work), learned from requests, for links in pushes. */
	var workerHost = null;
	/**
	* Wrap a route handler: thrown HttpErrors become JSON error responses with
	* the same { error, code, message } shape Puter itself uses; anything else
	* is a 500 that says so without leaking a stack. The handler is also given
	* `ctx.defer(work)` for anything the answer does not depend on (see
	* settleDeferred).
	*/
	function route(fn) {
		return async (ctx) => {
			const startedAt = Date.now();
			const deferred = [];
			ctx.defer = (work) => {
				const p = typeof work === "function" ? Promise.resolve().then(work) : work;
				deferred.push(Promise.resolve(p).catch((e) => console.error("deferred work failed", e)));
			};
			try {
				if (ctx?.request?.url) try {
					workerHost = new URL(ctx.request.url).host.toLowerCase();
				} catch {}
				const out = await fn(ctx);
				await settleDeferred(ctx, deferred);
				return timed(out instanceof Response ? out : json(out), ctx, startedAt);
			} catch (e) {
				await settleDeferred(ctx, deferred);
				if (e instanceof HttpError) return timed(json({
					error: e.code,
					code: e.code,
					message: e.message
				}, e.status, e.headers || {}), ctx, startedAt);
				console.error(e);
				return timed(json({
					error: "internal",
					code: "internal",
					message: "Something went wrong on the server"
				}, 500), ctx, startedAt);
			}
		};
	}
	/**
	* How long an answered identity is reused for the token that earned it.
	*
	* Identifying a caller is an HTTP call to Puter (`getUser()` is a GET of
	* /whoami), made on every request this worker serves — a poll every few
	* seconds from every open tab, and once more for every message, read,
	* reaction and keystroke burst. It is also the one thing that cannot be
	* folded into a store read or deferred behind the answer, because
	* everything else a request does depends on knowing who is asking.
	*
	* So an answer is kept for this long, against a hash of the token that
	* earned it. The cost is that a session ended elsewhere — signed out,
	* revoked — goes on being accepted by an already-running isolate for up to
	* this long. Half a minute is short against how long a Puter session lives
	* and close to the poll interval the app already runs on, and it is the
	* whole of the exposure: nothing is cached across isolates, nothing is
	* written down, and a token that was never valid is never cached at all.
	* Lower it to 0 to turn the cache off entirely.
	*/
	var IDENTITY_TTL_MS = 3e4;
	/** Distinct tokens held at once before the cache is dropped whole; a workspace's worker sees one per signed-in member. */
	var IDENTITY_MAX = 500;
	var identityCache = /* @__PURE__ */ new Map();
	/**
	* Who is calling. puter.workers.exec() forwards the caller's token, and the
	* runtime hands it to us as `user.puter`; asking Puter who that token belongs
	* to is the only trustworthy identity, so nothing in a request body is ever
	* believed about who sent it. The answer is then reused for a short while
	* (see IDENTITY_TTL_MS), which is the only way this call comes off the front
	* of a request at all.
	*
	* How long the call took is recorded against the request's own `user` object
	* (see authMs), so the answer can say so without a timer having to be
	* threaded through every caller.
	*/
	var authMs = /* @__PURE__ */ new WeakMap();
	/** The cache key a caller's token falls under, or null where nothing may be cached for them. */
	async function identityKey(user) {
		const token = typeof user?.puter?.authToken === "string" ? user.puter.authToken : null;
		return token && true ? sha256(token) : null;
	}
	/**
	* Who the caller is, if that is already known — without asking Puter, and
	* without refusing anyone: null means "not known yet", never "not allowed".
	*
	* This is what lets a request make one read instead of two. Every key a
	* route wants is either the workspace's or the caller's, and the caller's
	* needs their uuid; with the uuid already in hand they all go in a single
	* batched read, where otherwise the workspace has to be read beside the
	* identity call and the caller's document after it. Costs a hash, no I/O.
	*/
	async function peekIdentity(user) {
		if (!user || !user.puter) return null;
		const key = await identityKey(user);
		if (!key) return null;
		const hit = identityCache.get(key);
		if (hit && hit.until > Date.now()) {
			authMs.set(user, 0);
			return hit.id;
		}
		if (hit) identityCache.delete(key);
		return null;
	}
	async function identify(user) {
		if (!user || !user.puter) fail(401, "unauthorized", "Sign in with Puter to continue");
		const key = await identityKey(user);
		if (key) {
			const hit = identityCache.get(key);
			if (hit && hit.until > Date.now()) {
				authMs.set(user, 0);
				return hit.id;
			}
			if (hit) identityCache.delete(key);
		}
		const started = Date.now();
		let info = null;
		try {
			const p = user.puter;
			info = p.auth && typeof p.auth.getUser === "function" ? await p.auth.getUser() : await p.getUser();
		} catch {
			info = null;
		}
		authMs.set(user, Date.now() - started);
		if (!info || !info.uuid) fail(401, "unauthorized", "Your Puter session is not valid");
		const id = {
			uuid: String(info.uuid),
			username: String(info.username || "").toLowerCase()
		};
		if (key) {
			if (identityCache.size >= IDENTITY_MAX) identityCache.clear();
			identityCache.set(key, {
				id,
				until: Date.now() + IDENTITY_TTL_MS
			});
		}
		return id;
	}
	/**
	* The most a JSON body may run to. Every body a member sends is small; the
	* largest legitimate one is an import's page (up to five hundred messages,
	* a few megabytes), so this is well clear of it. See readJson, which refuses
	* a declared length past it up front and measures the body itself besides.
	*/
	var BODY_BYTES = 16777216;
	/**
	* The bytes of a body that did not say how long it would be, read only as
	* far as the cap and then refused — the reader is cancelled, so nothing past
	* it is ever held. Chunks are kept as they arrive and decoded once at the
	* end, rather than each being decoded and concatenated onto a growing
	* string: that built an intermediate string per chunk and walked every byte
	* of every request in JavaScript, which on the small bodies every route
	* actually takes cost more than the parse itself.
	*/
	async function readCappedText(reader, max) {
		const chunks = [];
		let total = 0;
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > max) {
				reader.cancel().catch(() => {});
				fail(413, "too_large", "That request is too large");
			}
			chunks.push(value);
		}
		const joined = new Uint8Array(total);
		let at = 0;
		for (const c of chunks) {
			joined.set(c, at);
			at += c.byteLength;
		}
		return new TextDecoder().decode(joined);
	}
	/**
	* The request's JSON body as an object; anything else (no body, not JSON,
	* not an object) reads as {}. A body past BODY_BYTES is refused.
	*
	* `request.json()` is `text()` and `JSON.parse()` with nothing between them,
	* and the cap needs that seam: a body's declared length cannot be trusted,
	* since one sent chunked has none at all, so the size has to be judged on
	* the body itself. A length that is declared and over the cap is refused
	* before a byte is read; one that is declared and within it takes the
	* runtime's own decode, which is what nearly every request here is. Only a
	* body that announced nothing is walked in JavaScript (see readCappedText),
	* and then only far enough to refuse it — the case that cannot be trusted is
	* the one, and the only one, that pays for the check.
	*/
	async function readJson(request) {
		const raw = request.headers?.get?.("content-length");
		const declared = raw == null || raw === "" ? NaN : Number(raw);
		const known = Number.isFinite(declared) && declared >= 0;
		if (known && declared > 16777216) fail(413, "too_large", "That request is too large");
		const reader = known ? null : request.body?.getReader?.();
		const text = reader ? await readCappedText(reader, BODY_BYTES) : await request.text();
		if (text.length > 16777216) fail(413, "too_large", "That request is too large");
		try {
			const body = JSON.parse(text);
			return body && typeof body === "object" ? body : {};
		} catch {
			return {};
		}
	}
	function query(request) {
		return new URL(request.url).searchParams;
	}
	/**
	* Append one message to a block atomically. kv.add appends to the array at
	* the `m` path without a read-modify-write, so two senders landing in the
	* same block cannot clobber each other. The read-modify-write fallback only
	* runs when the block key does not exist yet (the very first reply of a
	* thread, or a store where add refuses missing keys); blocks are otherwise
	* created ahead of time by ensureBlock.
	*
	* Answers the block's size in bytes as it stands with the message in it
	* (`bytes`), read off what the store handed back or off the block as read
	* back; the caller closes a block grown past its budget (see the worker's
	* writeMessage and BLOCK_BYTES). Null where the size is not known.
	*/
	async function appendToBlock(conv, n, msg) {
		const key = KEYS.block(conv, n);
		let taken = false;
		try {
			const res = await kv().add(key, { m: [msg] });
			if (res && Array.isArray(res.m) && res.m.some((x) => x && x.s === msg.s)) return { bytes: jsonBytes(res) };
			taken = true;
		} catch {}
		const cur = await kv().get(key);
		const m = Array.isArray(cur?.m) ? cur.m.slice() : [];
		const present = m.some((x) => x && x.s === msg.s);
		if (taken && present) return { bytes: jsonBytes(cur) };
		if (!present) m.push(msg);
		m.sort((a, b) => a.s - b.s);
		const next = {
			...cur && typeof cur === "object" && !Array.isArray(cur) ? cur : {},
			m,
			x: cur?.x && typeof cur.x === "object" ? cur.x : {}
		};
		await kv().set(key, next);
		return { bytes: jsonBytes(next) };
	}
	/** Create an empty block if it does not exist yet. Best effort; never throws. */
	async function ensureBlock(conv, n) {
		const key = KEYS.block(conv, n);
		try {
			if (!await kv().get(key)) await kv().set(key, {
				m: [],
				x: {}
			});
		} catch {}
	}
	/**
	* How many keys one batched read asks for. The store batches internally in
	* hundreds, so this is about the size of a single request and its answer,
	* not about concurrency.
	*/
	var GET_BATCH = 100;
	/**
	* Whether this runtime's store has been found not to take a list of keys.
	* Such a store reads the list as one key: it either answers a single value
	* (the keys joined) or refuses the joined string for its length
	* (`key_too_large`). Either is a fact about the runtime, not about the call,
	* so it is remembered and the list form is not tried again — while any other
	* failure is the call's own and is raised, rather than quietly turning one
	* refusal into a hundred retries against a store already refusing.
	*/
	var batchGetUnsupported = false;
	/**
	* Read several keys in as few round trips as the store allows: kv.get takes
	* a list and answers a list in the same order (null where a key is absent),
	* so five hundred member documents cost five calls rather than five hundred.
	* Read a dozen at a time under Promise.all, as they used to be, every fan-out
	* here — a guest's bootstrap, a broadcast's audience, an export's walk — paid
	* a round trip per dozen keys.
	*/
	async function getMany(keys, batch = GET_BATCH) {
		if (!keys.length) return [];
		if (keys.length === 1) return [await kv().get(keys[0])];
		const out = [];
		for (let i = 0; i < keys.length; i += batch) {
			const slice = keys.slice(i, i + batch);
			if (!batchGetUnsupported) {
				let res;
				try {
					res = await kv().get(slice);
				} catch (e) {
					if (e?.code !== "key_too_large") throw e;
					batchGetUnsupported = true;
				}
				if (!batchGetUnsupported) {
					if (Array.isArray(res) && res.length === slice.length) {
						out.push(...res);
						continue;
					}
					batchGetUnsupported = true;
				}
			}
			out.push(...await Promise.all(slice.map((k) => kv().get(k))));
		}
		return out;
	}
	/** Hex SHA-256 of a string, for storing token secrets. */
	async function sha256(text) {
		const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
		return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	/** Compare two equal-length strings without short-circuiting on the first difference. */
	function timingSafeEqual(a, b) {
		const x = String(a);
		const y = String(b);
		if (x.length !== y.length) return false;
		let diff = 0;
		for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
		return diff === 0;
	}
	/** Postings kept per token in one month's shard; a month is what bounds it. */
	var SEARCH_POSTINGS_PER_TOKEN = 2e3;
	/** Pseudo-tokens for `has:` filters; a letter-only tokenizer can never produce them. */
	var TOKEN_FILE = "_file";
	var TOKEN_LINK = "_link";
	/** The author's pseudo-token, so "everything I sent" is one posting list. */
	var TOKEN_BY = "_by:";
	var authorToken = (uuid) => `${TOKEN_BY}${uuid}`;
	/**
	* A pseudo-token scoped to one conversation (`_file@{conv}`), so "files in
	* #general" reads a list that is about #general alone instead of filtering
	* the workspace's list down to it. Threads count under their parent, as
	* `in:` does.
	*/
	var scopedToken = (token, conv) => `${token}@${parentOfThread(conv)?.conv || conv}`;
	/** The workspace-wide token a scoped one stands for, for indexes built before scoping existed. */
	var legacyTerm = (token) => token.startsWith("_") && token.includes("@") ? token.slice(0, token.indexOf("@")) : token;
	/** The month bucket a message's timestamp falls in, `yyyymm` in UTC. */
	function bucketOf(ts) {
		const n = Number(ts);
		if (!Number.isFinite(n)) return "000000";
		const d = new Date(n);
		if (Number.isNaN(d.getTime())) return "000000";
		return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
	}
	var isBucket = (b) => /^\d{6}$/.test(String(b));
	var STOPWORDS = new Set("a an and are as at be but by for from has have he her his i if in is it its me my not of on or our she so that the their them then there these they this to us was we were what when where which who will with you your".split(" "));
	var URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/i;
	/**
	* Words in a text, normalized: lowercase, accents stripped, letters and
	* digits only, distinct, in order of first appearance. Stopwords and very
	* short or long words are dropped; the cap on distinct words is applied by
	* the caller so this can also normalize a query.
	*/
	function tokenize(text) {
		return words(text).filter((w) => !STOPWORDS.has(w));
	}
	/** Like tokenize, but keeps stopwords: what a query means, before indexing rules apply. */
	function words(text) {
		const out = [];
		const seen = /* @__PURE__ */ new Set();
		const add = (w) => {
			if (w.length < 2 || w.length > 24 || seen.has(w)) return;
			seen.add(w);
			out.push(w);
		};
		for (const raw of normalize(text).split(/[^\p{L}\p{N}\p{M}]+/u)) {
			const rest = raw.replace(CJK_RUN, (run) => {
				const units = run.match(CJK_UNIT) || [];
				for (let i = 0; i + 1 < units.length; i++) add(units[i] + units[i + 1]);
				return " ";
			});
			for (const w of rest.split(" ")) add(w);
		}
		return out;
	}
	var CJK_RUN = /(?:[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]\p{M}*)+/gu;
	var CJK_UNIT = /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]\p{M}*/gu;
	/**
	* Lowercase with accents stripped, the form every comparison runs on. The
	* optional pointing of Arabic and Hebrew (harakat and tatweel, niqqud and
	* cantillation) goes the way Latin accents do: text is mostly written
	* without it, and a search for the bare word must find the pointed one.
	*/
	function normalize(text) {
		return String(text || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/g, "");
	}
	function isStopword(word) {
		return STOPWORDS.has(word);
	}
	/**
	* What gets indexed for one message: its words, `has:` pseudo-tokens, and
	* who wrote it; with `conv`, each pseudo-token also scoped to that
	* conversation.
	*/
	function indexTokens(text, { attachments = 0, author = null, conv = null } = {}) {
		const tokens = tokenize(text).slice(0, 200);
		const pseudo = [];
		if (attachments > 0) pseudo.push(TOKEN_FILE);
		if (hasLink(text)) pseudo.push(TOKEN_LINK);
		if (author) pseudo.push(authorToken(String(author)));
		tokens.push(...pseudo);
		if (conv) tokens.push(...pseudo.map((t) => scopedToken(t, conv)));
		return tokens;
	}
	function hasLink(text) {
		return URL_RE.test(linkableText(text));
	}
	/** Which shard a token lives in (FNV-1a, stable across runtimes). */
	function shardOf(token) {
		let h = 2166136261;
		for (let i = 0; i < token.length; i++) {
			h ^= token.charCodeAt(i);
			h = Math.imul(h, 16777619) >>> 0;
		}
		return h % 64;
	}
	function encodePosting(conv, seq, ts) {
		return `${conv}:${seq}:${Number(ts).toString(36)}`;
	}
	function decodePosting(p) {
		const parts = String(p).split(":");
		if (parts.length !== 3) return null;
		const seq = Number(parts[1]);
		const ts = parseInt(parts[2], 36);
		if (!parts[0] || !Number.isInteger(seq) || seq < 1 || !Number.isFinite(ts)) return null;
		return {
			conv: parts[0],
			seq,
			ts
		};
	}
	/**
	* Does a message contain every word of the query? Runs on the current
	* text at query time, so edits and deletes never return stale hits, and
	* checks stopwords too, which the index itself never stored.
	*/
	function matchesWords(text, query) {
		if (!query.length) return true;
		const have = new Set(words(text));
		return query.every((w) => have.has(w));
	}
	//#endregion
	//#region worker/search.js
	/**
	* The search index inside a worker. See src/shared/search.js for the layout;
	* this file is the part that touches storage: logging postings when a
	* message is posted or edited, folding the log into the month shards,
	* answering a query, and the resumable pass that indexes a workspace's
	* existing history.
	*
	* Cost, for the owner who pays for it. The store bills a write by the size
	* of the document it lands in, so the shape here keeps written documents
	* small and writes them rarely:
	*
	*   - Posting a message is one counter increment and one append to the
	*     current log segment, a document of at most SEARCH_FOLD_EVERY entries.
	*   - Every SEARCH_FOLD_EVERY-th message folds one completed segment into
	*     the shards: each shard touched is written once for the whole segment,
	*     and a shard holds one month, not the workspace's history.
	*   - A query reads the meta document, the unfolded log segments (and, on
	*     a workspace not yet rebuilt, the old index's shards), and one shard
	*     per query word from the newest month back, a couple of months per
	*     hop, then only the blocks holding the messages it is about to return;
	*     the hops per call are capped and a cursor carries the rest.
	*
	* Failures are counted in the meta document (`failed`) and reported with
	* every query, so an index that is quietly missing writes is visible.
	*/
	/** Block reads one hop of a search call may spend fetching candidate messages. */
	var QUERY_BLOCKS = 12;
	/** Storage hops one search call may spend after the meta document: month reads and block reads together. */
	var QUERY_HOPS = 4;
	/** Months whose shards one hop reads. */
	var MONTHS_PER_HOP = 2;
	/** Blocks one backfill call walks before handing back a cursor. */
	var REINDEX_BLOCKS = 16;
	/**
	* How many conversations one walk lists: the list goes back and forth with
	* the client between steps, so it is bounded; a thread found past the bound
	* is counted as skipped rather than dropped without a word.
	*/
	var REINDEX_MAX_CONVS = 5e3;
	/** Months of the old index one backfill call drops before handing back a cursor. */
	var REINDEX_DROP_MONTHS = 2;
	/** Conversations with nothing in them one backfill call passes over before handing back a cursor (see counterReader). */
	var REINDEX_SKIP_CONVS = 120;
	/**
	* The message counters of a list of conversations, for a walk that reaches
	* them in order: `at(i)` answers the counter of `convs[i]`, read a dozen
	* ahead at a time (see getMany) the first time the walk comes to one not
	* yet read. The list may grow behind the walk (threads found on the way).
	* Read one at a time as each was reached, as they used to be, a walk spent
	* a round trip to the store on every conversation it passed over for
	* having nothing in it, and a direct message opened and never written in
	* is such a conversation, which a large workspace holds by the hundred:
	* one request of the export, or one step of the search index's rebuild,
	* ran to hundreds of round trips in a row, past what the platform lets a
	* request run, and neither got past the first page of the workspace.
	*/
	function counterReader(convs) {
		const seqs = /* @__PURE__ */ new Map();
		return async (i) => {
			const conv = convs[i];
			if (!seqs.has(conv)) {
				const ahead = [...new Set(convs.slice(i, i + 12).filter((c) => !seqs.has(c)))];
				const read = await getMany(ahead.map((c) => KEYS.seq(c)));
				ahead.forEach((c, j) => seqs.set(c, Number(read[j]) || 0));
			}
			return seqs.get(conv);
		};
	}
	/** Past this a shard is trimmed harder than the per-token cap. */
	var SHARD_SOFT_BYTES = 307200;
	/** Completed log segments one trigger folds at most; the rest wait for the next. */
	var FOLD_SEGMENTS = 3;
	/** How cursors named the index from before month buckets when it was read as the last month; still accepted. */
	var LEGACY = "legacy";
	var metaKey = (wsId) => KEYS.searchMeta(wsId);
	/** `{ c, folded, failed, months }`; every field may be missing. */
	async function searchMeta(wsId) {
		const m = await kv().get(metaKey(wsId));
		return m && typeof m === "object" ? m : {};
	}
	var segmentOf = (c) => Math.floor((c - 1) / 50);
	/**
	* The last segment folded. A fold only ever reaches two segments behind the
	* one being written, so a pointer at or past segment `s` is not a state the
	* index can be in: the counter was reset under it (a rebuild's first step
	* dropped the meta document while a fold was writing `folded` back into the
	* empty one). It is read as nothing folded, so the segments are read and,
	* in time, folded over; a posting folded twice is deduped when read.
	*/
	function foldedOf(meta, s = Infinity) {
		const f = Number.isInteger(meta?.folded) ? meta.folded : -1;
		return f >= s ? -1 : f;
	}
	/** Months with postings, oldest first. */
	var monthsOf = (meta) => Object.keys(meta?.months || {}).filter(isBucket).sort();
	/** Segments a query has to read: what was posted since the last fold, bounded. */
	function unfoldedSegments(meta) {
		const c = Number(meta?.c) || 0;
		if (!c) return [];
		const s = segmentOf(c);
		const from = Math.max(foldedOf(meta, s) + 1, s - 4 + 1);
		const out = [];
		for (let k = from; k <= s; k++) out.push(k);
		return out;
	}
	/** Count failures where an admin can see them. Never throws. */
	async function noteFailure(wsId, n = 1) {
		if (n > 0) await kv().incr(metaKey(wsId), { failed: n }).catch(() => {});
	}
	async function delMany(keys) {
		for (let i = 0; i < keys.length; i += 12) await Promise.all(keys.slice(i, i + 12).map((k) => kv().del(k).catch(() => {})));
	}
	/**
	* Group `tokens` of one message into { shard: { token: [posting] } }. Own
	* properties only: the word "constructor" is a token like any other, not
	* Object.prototype's function.
	*/
	function groupPostings(groups, tokens, posting) {
		for (const t of tokens) {
			const n = shardOf(t);
			const g = groups.get(n) || (groups.set(n, {}), groups.get(n));
			if (!Object.hasOwn(g, t)) g[t] = [];
			g[t].push(posting);
		}
		return groups;
	}
	/** Group index entries `{ p: posting, t: [tokens] }` by month, then shard, then token. */
	function groupEntries(entries) {
		const months = /* @__PURE__ */ new Map();
		for (const e of entries) {
			if (!e || typeof e.p !== "string" || !Array.isArray(e.t)) continue;
			const dec = decodePosting(e.p);
			if (!dec) continue;
			const b = bucketOf(dec.ts);
			groupPostings(months.get(b) || (months.set(b, /* @__PURE__ */ new Map()), months.get(b)), e.t.filter((t) => typeof t === "string"), e.p);
		}
		return months;
	}
	/**
	* Append entries to the shards of their months, a dozen writes at a time.
	* A month not yet in the meta document is noted there first, so a query
	* knows to read it as soon as its postings land. Returns how many writes
	* failed; never throws.
	*/
	async function writeEntries(wsId, entries, known = null) {
		const months = groupEntries(entries);
		if (!months.size) return 0;
		let failed = 0;
		const fresh = [...months.keys()].filter((b) => !known || !Object.hasOwn(known, b));
		if (fresh.length) await kv().update(metaKey(wsId), Object.fromEntries(fresh.map((b) => [`months.${b}`, 1]))).catch(() => {
			failed++;
		});
		const writes = [];
		for (const [b, shards] of months) for (const [n, map] of shards) writes.push([KEYS.searchBucket(wsId, b, n), map]);
		for (let i = 0; i < writes.length; i += 12) await Promise.all(writes.slice(i, i + 12).map(([k, map]) => appendPostings(k, map).catch(() => {
			failed++;
		})));
		if (failed) await noteFailure(wsId, failed);
		return failed;
	}
	/**
	* Append postings to a shard. kv.add appends to each token's array in one
	* atomic write and, when it hands the document back, over-long lists are
	* trimmed to the newest entries. A store that refuses add on a missing key,
	* or a document that has hit the value limit, falls back to a read, trim,
	* and set.
	*/
	async function appendPostings(key, map) {
		let doc = null;
		try {
			doc = await kv().add(key, map);
		} catch {
			doc = null;
			const cur = await kv().get(key) || {};
			for (const [t, list] of Object.entries(map)) cur[t] = (Object.hasOwn(cur, t) && Array.isArray(cur[t]) ? cur[t] : []).concat(list);
			await kv().set(key, trimShard(cur, true));
			return;
		}
		if (!doc || typeof doc !== "object") return;
		const cap = shardCap(doc);
		const over = {};
		for (const t of Object.keys(map)) if (Object.hasOwn(doc, t) && Array.isArray(doc[t]) && doc[t].length > cap) over[t] = doc[t].slice(-cap);
		if (Object.keys(over).length) await kv().update(key, over).catch(() => {});
	}
	function shardCap(doc) {
		const c = Number(doc?._cap);
		return Number.isInteger(c) && c > 0 ? c : SEARCH_POSTINGS_PER_TOKEN;
	}
	/**
	* Keep every list at the shard's cap. When the whole document is still too
	* large (`hard`), the cap is halved and remembered in `_cap`, so a shard that
	* collects an unusual number of distinct words keeps working at the cost of
	* shorter memories for each. Still too large at the smallest cap, the shard
	* holds more distinct words than one document takes, each with a handful of
	* postings that no cap shortens (a month of long messages in many words:
	* some nine thousand words, posted once each, in one shard of sixty-four),
	* and the words whose newest posting is oldest go, until the rest fit. Left
	* as it was, as it used to be, the store refused the document whole, this
	* write and every later one into the shard failed the same way, and the
	* postings for a sixty-fourth of the words were lost for the rest of the
	* month, the writes counted as failed and nothing more.
	*/
	function trimShard(doc, hard = false) {
		let cap = shardCap(doc);
		const apply = () => {
			for (const t of Object.keys(doc)) {
				if (t === "_cap") continue;
				if (!Array.isArray(doc[t])) delete doc[t];
				else if (doc[t].length > cap) doc[t] = doc[t].slice(-cap);
			}
		};
		apply();
		if (hard) {
			while (JSON.stringify(doc).length > SHARD_SOFT_BYTES && cap > 8) {
				cap = Math.max(8, Math.floor(cap / 2));
				doc._cap = cap;
				apply();
			}
			if (JSON.stringify(doc).length > SHARD_SOFT_BYTES) dropOldestWords(doc);
		}
		return doc;
	}
	/**
	* Take words off a shard, the one whose newest posting is oldest first,
	* until the document is within its bound (see trimShard). The size is kept
	* as a running count of what each word's entry takes in the JSON, since
	* measuring the whole document again for every word taken off would be
	* quadratic in the thousands of them this runs over.
	*/
	function dropOldestWords(doc) {
		const newest = /* @__PURE__ */ new Map();
		for (const [t, list] of Object.entries(doc)) {
			if (t === "_cap" || !Array.isArray(list)) continue;
			newest.set(t, Math.max(0, ...list.map((p) => decodePosting(p)?.ts || 0)));
		}
		const words = [...newest.keys()].sort((a, b) => newest.get(a) - newest.get(b));
		let size = JSON.stringify(doc).length;
		for (const t of words) {
			if (size <= SHARD_SOFT_BYTES) break;
			size -= JSON.stringify(t).length + 1 + JSON.stringify(doc[t]).length + 1;
			delete doc[t];
		}
	}
	/**
	* Queue one message's tokens: a counter increment and one small append to
	* the current log segment. The first message of a segment also creates the
	* next segment ahead of time (so appends there never fall back to a
	* read-modify-write) and folds the segment completed two segments ago: the
	* one just completed may still have an append in flight.
	*/
	async function enqueue(wsId, tokens, posting) {
		const entry = {
			p: posting,
			t: tokens
		};
		let meta = null;
		try {
			meta = await kv().incr(metaKey(wsId), { c: 1 });
		} catch {
			meta = null;
		}
		if (!meta || typeof meta !== "object" || !Number(meta.c)) {
			meta = await searchMeta(wsId);
			if (!Number(meta.c)) {
				meta = {
					...meta,
					c: 1,
					folded: foldedOf(meta),
					failed: Number(meta.failed) || 0,
					months: meta.months || {}
				};
				await kv().set(metaKey(wsId), meta).catch(() => {});
			}
		}
		const c = Number(meta.c) || 0;
		if (!c) {
			await writeEntries(wsId, [entry], meta.months || null);
			return;
		}
		const s = segmentOf(c);
		if (foldedOf(meta) !== foldedOf(meta, s)) {
			await kv().update(metaKey(wsId), { folded: -1 }).catch(() => {});
			meta = {
				...meta,
				folded: -1
			};
		}
		try {
			await appendLog(KEYS.searchLog(wsId, s), entry);
		} catch {
			await noteFailure(wsId);
			return;
		}
		if ((c - 1) % 50 !== 0) return;
		await ensureLog(KEYS.searchLog(wsId, s + 1));
		if (s >= 2) await foldSegments(wsId, meta, s - 2);
	}
	async function appendLog(key, entry) {
		try {
			await kv().add(key, { p: [entry] });
		} catch {
			const cur = await kv().get(key);
			const p = Array.isArray(cur?.p) ? cur.p.slice() : [];
			p.push(entry);
			await kv().set(key, { p });
		}
	}
	/** Create an empty log segment if it does not exist yet. Best effort; never throws. */
	async function ensureLog(key) {
		try {
			if (!await kv().get(key)) await kv().set(key, { p: [] });
		} catch {}
	}
	/**
	* Fold completed log segments into the month shards, oldest first, up to
	* `upTo`. `meta.folded` is the last segment folded and always advances: a
	* shard write that failed is counted, not retried, so a shard that is stuck
	* cannot make every later fold write the same postings again. A segment is
	* deleted once folded; a query reads the ones that are not yet.
	*/
	async function foldSegments(wsId, meta, upTo) {
		const from = foldedOf(meta) + 1;
		const to = Math.min(upTo, from + FOLD_SEGMENTS - 1);
		let known = meta.months || {};
		for (let k = from; k <= to; k++) {
			const key = KEYS.searchLog(wsId, k);
			const log = await kv().get(key);
			const entries = Array.isArray(log?.p) ? log.p : [];
			if (entries.length) {
				await writeEntries(wsId, entries, known);
				known = null;
			}
			await kv().update(metaKey(wsId), { folded: k });
			await kv().del(key).catch(() => {});
		}
	}
	/** Index one freshly posted message. Best effort; the message is already stored. */
	async function indexMessage(wsId, conv, { s, t, ts, a, u }) {
		const tokens = indexTokens(t, {
			attachments: a?.length || 0,
			author: u,
			conv
		});
		if (!tokens.length) return;
		await enqueue(wsId, tokens, encodePosting(conv, s, ts));
	}
	/** After an edit, index only the words that are new. */
	async function indexEdit(wsId, conv, { s, ts, a }, oldText, newText) {
		const before = new Set(indexTokens(oldText, {
			attachments: a?.length || 0,
			conv
		}));
		const tokens = indexTokens(newText, {
			attachments: a?.length || 0,
			conv
		}).filter((x) => !before.has(x));
		if (!tokens.length) return;
		await enqueue(wsId, tokens, encodePosting(conv, s, ts));
	}
	/**
	* One index entry for a stored message (mergeBlock shape), or null when
	* there is nothing to index. Only what a person or an app posted: a system
	* line is nobody's words, and a reminder's line in a member's own space is
	* a note the worker wrote for them, which the delivery does not index
	* either, so a rebuild (or a move) does not make it findable where the live
	* index never did.
	*/
	function entryFor(conv, m) {
		if (!m || m.kind && m.kind !== "msg" || m.deleted) return null;
		const tokens = indexTokens(m.text, {
			attachments: (m.attachments || []).length,
			author: m.user,
			conv
		});
		return tokens.length ? {
			p: encodePosting(conv, m.seq, m.ts),
			t: tokens
		} : null;
	}
	/**
	* Index stored messages straight into their month shards, skipping the log:
	* for history arriving in bulk (an import, the backfill), where one call
	* carries many messages already. `list` is [{ conv, message }] with messages
	* in mergeBlock shape. Best effort; never throws.
	*/
	async function indexBatch(wsId, list) {
		const entries = [];
		for (const { conv, message } of list) {
			const e = entryFor(conv, message);
			if (e) entries.push(e);
		}
		if (entries.length) await writeEntries(wsId, entries, null);
	}
	/**
	* Index whole conversations held in memory (the sample workspace): every
	* shard is written once with set, since nothing exists yet.
	*/
	async function writeIndexFor(wsId, convs) {
		const entries = [];
		for (const { id, messages } of convs) for (const m of messages) {
			const e = entryFor(id, m);
			if (e) entries.push(e);
		}
		const months = groupEntries(entries);
		const writes = [];
		for (const [b, shards] of months) for (const [n, doc] of shards) writes.push([KEYS.searchBucket(wsId, b, n), trimShard(doc)]);
		for (let i = 0; i < writes.length; i += 12) await Promise.all(writes.slice(i, i + 12).map(([k, doc]) => kv().set(k, doc)));
		await kv().set(metaKey(wsId), {
			c: 0,
			folded: -1,
			failed: 0,
			months: Object.fromEntries([...months.keys()].map((b) => [b, 1]))
		});
	}
	/**
	* Every key the index of a workspace may hold, given its meta document.
	* `legacy`: the shards of the layout before month buckets, which an index
	* built on the current layout cannot have (nothing has written one since;
	* the rebuild that brought an index to this layout took them down).
	*/
	function indexKeys(wsId, meta, { months = true, meta: withMeta = true, legacy = true } = {}) {
		const keys = [];
		if (legacy) for (let n = 0; n < 64; n++) keys.push(KEYS.searchShard(wsId, n));
		if (months) for (const b of monthsOf(meta)) for (let n = 0; n < 64; n++) keys.push(KEYS.searchBucket(wsId, b, n));
		const c = Number(meta?.c) || 0;
		const s = segmentOf(Math.max(1, c));
		for (let k = Math.max(0, foldedOf(meta, s) + 1, s - 200); k <= s + 1; k++) keys.push(KEYS.searchLog(wsId, k));
		if (withMeta) keys.push(metaKey(wsId));
		return keys;
	}
	async function deleteIndex(wsId) {
		await delMany([...indexKeys(wsId, await searchMeta(wsId)), KEYS.searchWalk(wsId)]);
	}
	var indexStamp = () => ({
		v: 3,
		built: Date.now()
	});
	/** Newest first; ties broken so the order is total and a cursor can resume it. */
	function compareCandidates(a, b) {
		return b.ts - a.ts || (a.conv < b.conv ? -1 : a.conv > b.conv ? 1 : 0) || b.seq - a.seq;
	}
	/**
	* A cursor is `{posting}|{month}`: skip everything at or newer than the
	* posting, resume reading the months at that one (or, empty, read no more
	* months). A cursor from before months existed is a bare posting; one from
	* when the old index was read as the last month is taken to mean the same.
	*/
	function decodeCursor(raw) {
		if (!raw) return null;
		const at = String(raw).indexOf("|");
		const p = at < 0 ? String(raw) : String(raw).slice(0, at);
		const src = at < 0 ? null : String(raw).slice(at + 1);
		const after = p ? decodePosting(p) : null;
		if (p && !after) return null;
		if (src !== null && src !== "" && src !== LEGACY && !isBucket(src)) return null;
		return {
			after,
			src
		};
	}
	var encodeCursor = (at, src) => `${at ? encodePosting(at.conv, at.seq, at.ts) : ""}|${src == null ? "" : src}`;
	/** Where in `sources` (newest first) a cursor resumes. */
	function resumeIndex(sources, src) {
		if (src === null || src === LEGACY) return 0;
		if (src === "") return sources.length;
		const exact = sources.indexOf(src);
		if (exact >= 0) return exact;
		const at = sources.findIndex((s) => s <= src);
		return at < 0 ? sources.length : at;
	}
	/**
	* search(wsId, params, canRead, opts)
	*   params: { words, has, in, from, before, after, cursor }
	*   canRead(conv): may the caller read this conversation?
	*   opts.meta: the meta document, when the caller already read it
	*   opts.legacy: read the index from before month buckets too (a workspace
	*                not yet rebuilt on this layout)
	* Returns { results, hasMore, cursor, terms, failed } where `terms` is what
	* the index was asked for (empty when the query had nothing indexable) and
	* `failed` how many index writes this workspace has lost.
	*
	* Candidates are examined newest first and a cursor resumes behind the last
	* one examined, so a candidate may only enter the pool once no month still
	* unread could hold a newer one. A month's shards hold that month alone, so
	* what they yield enters as they are read, newest month first. The log and
	* the old index hold postings from any month (an edit logs its new words
	* under the message's original timestamp), so both are read first and what
	* they yield waits until the months read have reached its month, or run
	* out. Their words also count toward each month's intersection: a message
	* whose words are split between the log and a shard, or between the old
	* index and a bucket, is still found by a query for all of them.
	*/
	async function search(wsId, params, canRead, { meta = null, legacy = true } = {}) {
		const words = params.words || [];
		const terms = words.filter((w) => !isStopword(w)).slice(0, 6);
		const scope = params.in || null;
		for (const h of params.has || []) {
			const t = h === "file" ? TOKEN_FILE : TOKEN_LINK;
			terms.push(scope ? scopedToken(t, scope) : t);
		}
		if (!terms.length && params.from) terms.push(scope ? scopedToken(authorToken(params.from), scope) : authorToken(params.from));
		const m = meta || await searchMeta(wsId);
		const failed = Number(m.failed) || 0;
		const none = () => ({
			results: [],
			hasMore: false,
			cursor: null,
			terms,
			failed
		});
		if (!terms.length) return none();
		const sources = monthsOf(m).filter((b) => (params.before == null || b <= bucketOf(params.before)) && (params.after == null || b >= bucketOf(params.after))).reverse();
		const isSource = new Set(sources);
		const cur = decodeCursor(params.cursor);
		const after = cur?.after || null;
		let srcIdx = resumeIndex(sources, cur ? cur.src : null);
		const accept = (p) => {
			if (params.before != null && p.ts > params.before) return false;
			if (params.after != null && p.ts < params.after) return false;
			if (scope && p.conv !== scope && parentOfThread(p.conv)?.conv !== scope) return false;
			if (after && compareCandidates(p, after) <= 0) return false;
			return canRead(p.conv);
		};
		const pool = [];
		const held = [];
		const seen = /* @__PURE__ */ new Set();
		const addKeys = (keys, src, into = pool) => {
			for (const k of keys) {
				if (seen.has(k)) continue;
				seen.add(k);
				const p = decodePosting(k);
				if (p && accept(p)) into.push({
					...p,
					src
				});
			}
		};
		const intersect = (lists) => {
			if (lists.some((l) => !l.length)) return [];
			lists.sort((a, b) => a.length - b.length);
			let keys = new Set(lists[0]);
			for (const l of lists.slice(1)) {
				const other = new Set(l);
				keys = new Set([...keys].filter((k) => other.has(k)));
				if (!keys.size) break;
			}
			return [...keys];
		};
		const spanning = /* @__PURE__ */ new Map();
		const note = (p, t) => {
			const dec = decodePosting(p);
			if (!dec) return;
			const b = bucketOf(dec.ts);
			const byPosting = spanning.get(b) || (spanning.set(b, /* @__PURE__ */ new Map()), spanning.get(b));
			(byPosting.get(p) || (byPosting.set(p, /* @__PURE__ */ new Set()), byPosting.get(p))).add(t);
		};
		/** One month's posting list per term: its shards' lists plus what the log and the old index hold for that month. */
		const listsFor = (month, byShard) => terms.map((t) => {
			const doc = byShard.get(shardOf(t));
			const list = doc && Object.hasOwn(doc, t) && Array.isArray(doc[t]) ? doc[t] : [];
			const extra = spanning.get(month);
			if (!extra) return list;
			const more = [];
			for (const [p, have] of extra) if (have.has(t)) more.push(p);
			return more.length ? list.concat(more) : list;
		});
		const logKeys = unfoldedSegments(m).map((k) => KEYS.searchLog(wsId, k));
		const legacyTerms = legacy ? [...new Set(terms.map(legacyTerm))] : [];
		const legacyShards = [...new Set(legacyTerms.map(shardOf))];
		const shards = [...new Set(terms.map(shardOf))];
		let spanRead = false;
		const results = [];
		let pos = 0;
		let hops = 0;
		while (results.length < 20 && hops < QUERY_HOPS) {
			if (pos >= pool.length) {
				if (spanRead && srcIdx >= sources.length) break;
				hops++;
				const batch = sources.slice(srcIdx, srcIdx + MONTHS_PER_HOP);
				const reads = [];
				if (!spanRead) {
					for (const k of logKeys) reads.push({
						key: k,
						log: true
					});
					for (const n of legacyShards) reads.push({
						key: KEYS.searchShard(wsId, n),
						legacy: n
					});
				}
				batch.forEach((b, j) => {
					for (const n of shards) reads.push({
						key: KEYS.searchBucket(wsId, b, n),
						src: srcIdx + j,
						n
					});
				});
				const docs = await getMany(reads.map((r) => r.key));
				if (!spanRead) {
					spanRead = true;
					reads.forEach((r, i) => {
						if (r.log) for (const e of docs[i]?.p || []) {
							if (!e || typeof e.p !== "string" || !Array.isArray(e.t)) continue;
							for (const t of terms) if (e.t.includes(t)) note(e.p, t);
						}
						else if (r.legacy != null) {
							const doc = docs[i];
							if (!doc || typeof doc !== "object") return;
							for (const t of terms) {
								const lt = legacyTerm(t);
								if (shardOf(lt) !== r.legacy || !Object.hasOwn(doc, lt) || !Array.isArray(doc[lt])) continue;
								for (const p of doc[lt]) note(p, t);
							}
						}
					});
					for (const [b, byPosting] of spanning) {
						if (isSource.has(b)) continue;
						const keys = [];
						for (const [p, have] of byPosting) if (terms.every((t) => have.has(t))) keys.push(p);
						addKeys(keys, -1, held);
					}
				}
				batch.forEach((b, j) => {
					const byShard = /* @__PURE__ */ new Map();
					reads.forEach((r, i) => {
						if (r.src === srcIdx + j) byShard.set(r.n, docs[i] || {});
					});
					addKeys(intersect(listsFor(b, byShard)), srcIdx + j);
				});
				srcIdx += batch.length;
				const frontier = srcIdx < sources.length ? batch[batch.length - 1] : null;
				for (let i = held.length - 1; i >= 0; i--) if (frontier === null || bucketOf(held[i].ts) >= frontier) pool.push(held.splice(i, 1)[0]);
				const tail = pool.splice(pos).sort(compareCandidates);
				pool.push(...tail);
				if (pos >= pool.length) continue;
			}
			hops++;
			const blocks = /* @__PURE__ */ new Map();
			while (pos < pool.length && (blocks.size < QUERY_BLOCKS || blocks.has(blockKey(pool[pos])))) {
				const c = pool[pos++];
				const key = blockKey(c);
				(blocks.get(key) || (blocks.set(key, []), blocks.get(key))).push(c);
			}
			const keysArr = [...blocks.keys()];
			const read = await getMany(keysArr);
			for (let b = 0; b < keysArr.length; b++) {
				const msgs = new Map(mergeBlock(read[b]).map((x) => [x.seq, x]));
				for (const c of blocks.get(keysArr[b])) {
					const msg = msgs.get(c.seq);
					if (!msg || msg.deleted || msg.kind !== "msg") continue;
					if (!matchesWords(msg.text, words)) continue;
					if (params.from && msg.user !== params.from) continue;
					if ((params.has || []).includes("file") && !msg.attachments.length) continue;
					if ((params.has || []).includes("link") && !hasLink(msg.text)) continue;
					results.push({
						conv: c.conv,
						...msg
					});
				}
			}
		}
		results.sort(compareCandidates);
		const page = results.slice(0, 20);
		const cursorAt = results.length > 20 ? page[page.length - 1] : pos > 0 ? pool[pos - 1] : after;
		const remaining = pool.filter((c) => !cursorAt || compareCandidates(c, cursorAt) > 0);
		const hasMore = remaining.length > 0 || held.length > 0 || srcIdx < sources.length;
		let resumeAt = srcIdx;
		for (const c of remaining) if (c.src >= 0 && c.src < resumeAt) resumeAt = c.src;
		return {
			results: page,
			hasMore,
			cursor: hasMore ? encodeCursor(cursorAt, resumeAt < sources.length ? sources[resumeAt] : "") : null,
			terms,
			failed
		};
	}
	var blockKey = (c) => KEYS.block(c.conv, blockIndexOf(c.seq));
	/**
	* One step of indexing a workspace's history. `state` is null to start
	* (the old index's small keys are dropped, its counters reset, its months
	* queued for dropping, and the conversation list gathered) and otherwise
	* whatever the previous step returned. Each step drops a few months of the
	* old index or walks a bounded number of blocks, writes what it found
	* straight into the month shards, and returns the next state; the caller
	* loops until `done`. Threads are discovered as their parents are walked
	* and appended to the list. Messages posted meanwhile reach the shards
	* through the log as always; a posting written twice is harmless.
	*
	* A month stays listed in the meta document until its shards are actually
	* gone: the list is the only record of which shards exist, so a rebuild
	* abandoned midway (the dialog closed, the network gone) leaves months the
	* next rebuild still finds, drops, and does not double.
	*/
	async function reindexStep(wsId, ws, memberDocs, state) {
		if (!state) {
			const meta = await searchMeta(wsId);
			const months = monthsOf(meta);
			await delMany(indexKeys(wsId, meta, {
				months: false,
				meta: false,
				legacy: !(Number(ws?.search?.v) >= 3)
			}));
			await kv().set(metaKey(wsId), {
				c: 0,
				folded: -1,
				failed: 0,
				months: Object.fromEntries(months.map((b) => [b, 1]))
			});
			const convs = new Set(Object.keys(ws.channels || {}));
			const dms = /* @__PURE__ */ new Set();
			for (const d of memberDocs) for (const c of Object.keys(d?.dms || {})) dms.add(c);
			for (const c of dms) convs.add(c);
			await kv().set(KEYS.searchWalk(wsId), { dms: [...dms] });
			state = {
				convs: [...convs],
				i: 0,
				n: 0,
				messages: 0,
				drop: months
			};
		}
		if (state.drop?.length) {
			const take = state.drop.slice(0, REINDEX_DROP_MONTHS);
			const keys = [];
			for (const b of take) for (let n = 0; n < 64; n++) keys.push(KEYS.searchBucket(wsId, b, n));
			await delMany(keys);
			for (const b of take) await kv().remove(metaKey(wsId), `months.${b}`).catch(() => {});
			state = {
				...state,
				drop: state.drop.slice(take.length)
			};
			if (state.drop.length) return {
				...state,
				done: false
			};
		}
		const found = [];
		let budget = REINDEX_BLOCKS;
		const counterOf = counterReader(state.convs);
		let passed = 0;
		while (budget > 0 && state.i < state.convs.length && passed < REINDEX_SKIP_CONVS) {
			const conv = state.convs[state.i];
			const seq = await counterOf(state.i);
			if (!seq) {
				state.i++;
				state.n = 0;
				passed++;
				continue;
			}
			const head = blockIndexOf(seq);
			const to = Math.min(head, state.n + budget - 1);
			const keys = [];
			for (let n = state.n; n <= to; n++) keys.push(KEYS.block(conv, n));
			const blocks = await getMany(keys);
			for (const block of blocks) for (const message of mergeBlock(block)) {
				if (message.replyCount > 0) {
					const t = threadConvId(conv, message.seq);
					if (!state.convs.includes(t)) {
						if (state.convs.length < 5e3) state.convs.push(t);
						else state.skipped = (state.skipped || 0) + 1;
					}
				}
				if (message.kind !== "msg" || message.deleted) continue;
				found.push({
					conv,
					message
				});
				state.messages++;
			}
			budget -= keys.length;
			state.n = to + 1;
			if (state.n > head) {
				state.i++;
				state.n = 0;
			}
		}
		await indexBatch(wsId, found);
		const done = state.i >= state.convs.length;
		if (done) await kv().del(KEYS.searchWalk(wsId)).catch(() => {});
		return {
			...state,
			drop: [],
			done
		};
	}
	//#endregion
	//#region worker/sample.js
	/**
	* "Explore with sample data": builds a complete demo workspace owned by the
	* caller, populated by six fictional teammates. Everything is written with
	* the same key layout the live code uses, so the demo exercises the real
	* read paths (blocks, overlays, threads, reads, mentions). Sample members
	* carry `smp_` uuids and never map to real accounts.
	*/
	var PEOPLE = [
		{
			uuid: "smp_ava",
			username: "ava",
			name: "Ava Chen",
			title: "Product designer",
			color: 5
		},
		{
			uuid: "smp_marcus",
			username: "marcus",
			name: "Marcus Reid",
			title: "Engineering lead",
			color: 1
		},
		{
			uuid: "smp_priya",
			username: "priya",
			name: "Priya Nair",
			title: "Frontend engineer",
			color: 3
		},
		{
			uuid: "smp_tomas",
			username: "tomas",
			name: "Tomas Alvarez",
			title: "Marketing",
			color: 2
		},
		{
			uuid: "smp_lena",
			username: "lena",
			name: "Lena Fischer",
			title: "Customer support",
			color: 4
		},
		{
			uuid: "smp_jordan",
			username: "jordan",
			name: "Jordan Blake",
			title: "Founder",
			color: 7
		}
	];
	/** A conversation under construction: messages in order, plus overlays. */
	var Conv = class {
		constructor(id) {
			this.id = id;
			this.m = [];
			this.x = {};
		}
		add(u, t, ts, extra = {}) {
			const s = this.m.length + 1;
			this.m.push({
				s,
				u,
				t,
				ts,
				...extra
			});
			return s;
		}
		react(seq, reaction, users) {
			const k = overlayKey(seq);
			this.x[k] = this.x[k] || {};
			this.x[k].r = this.x[k].r || {};
			this.x[k].r[reaction] = Object.fromEntries(users.map((u) => [u, 1]));
		}
		edit(seq, text, ts) {
			const k = overlayKey(seq);
			this.x[k] = {
				...this.x[k] || {},
				t: text,
				e: ts
			};
		}
		thread(seq, count, lastTs) {
			const k = overlayKey(seq);
			this.x[k] = {
				...this.x[k] || {},
				rc: count,
				rt: lastTs
			};
		}
		get seq() {
			return this.m.length;
		}
		last() {
			return this.m[this.m.length - 1];
		}
	};
	/** Write a conversation as its counter plus 50-message blocks. */
	async function flush(conv) {
		const blocks = /* @__PURE__ */ new Map();
		for (const m of conv.m) {
			const n = blockIndexOf(m.s);
			if (!blocks.has(n)) blocks.set(n, {
				m: [],
				x: {}
			});
			blocks.get(n).m.push(m);
		}
		for (const [k, o] of Object.entries(conv.x)) {
			const seq = Number(k.slice(1));
			const b = blocks.get(blockIndexOf(seq));
			if (b) b.x[k] = o;
		}
		if (!blocks.size) blocks.set(0, {
			m: [],
			x: {}
		});
		const head = Math.max(...blocks.keys());
		if (!blocks.has(head + 1)) blocks.set(head + 1, {
			m: [],
			x: {}
		});
		await kv().set(KEYS.seq(conv.id), conv.seq);
		for (const [n, b] of blocks) await kv().set(KEYS.block(conv.id, n), b);
	}
	async function buildSampleWorkspace(profile) {
		const wsId = uid(10);
		const now = Date.now();
		const HOUR = 36e5;
		const DAY = 24 * HOUR;
		const at = (daysAgo, h, m = 0) => {
			const d = /* @__PURE__ */ new Date(now - daysAgo * DAY);
			d.setHours(h, m, 0, 0);
			return Math.min(d.getTime(), now - 6e4);
		};
		const me = profile.uuid;
		const meName = profile.name || profile.username;
		const [ava, marcus, priya, tomas, lena, jordan] = PEOPLE.map((p) => p.uuid);
		const ids = {
			general: uid(10),
			design: uid(10),
			engineering: uid(10),
			random: uid(10),
			announcements: uid(10),
			launch: uid(10)
		};
		const general = new Conv(ids.general);
		general.add(jordan, "Jordan Blake created #general", at(9, 9, 0), { k: "sys" });
		const chatter = [
			[jordan, "Morning all. Standup notes are in the usual doc; nothing blocking this week."],
			[marcus, "Heads up: staging redeploys at 11:00. Should be a two minute blip."],
			[ava, "Posting the updated onboarding flow in #design after lunch, would love eyes on it."],
			[priya, "Merged the keyboard navigation fixes for the sidebar. Tab order finally makes sense."],
			[tomas, "Newsletter draft is ready for review. Aiming to send Thursday."],
			[lena, "Support queue is quiet today. Two questions about invite links, both answered."],
			[marcus, "Staging is back. Let me know if anything looks off."],
			[ava, "Reminder: design critique is at 3pm. Bring one thing you are unsure about."],
			[jordan, "Great critique today. The empty state direction is the right call."],
			[priya, "Quick one: are we keeping the 44px touch targets on desktop too? I vote yes."],
			[ava, "Yes. Consistency beats density here."],
			[tomas, "Blog post on how we use threads is live. Sharing internally first for feedback."],
			[lena, "A customer asked whether private channels can be converted to public. Do we support that?"],
			[marcus, "Not yet. Tracking it as a feature request."],
			[jordan, "Friday demo is at 4pm. Everyone shows one thing they shipped, no slides."],
			[priya, "Dark mode contrast pass is done. Every text color clears 4.5:1 now."],
			[ava, "The new avatar colors look great in both themes."],
			[tomas, "Q3 launch teaser goes out Monday. Copy is in the shared folder."],
			[lena, "Two more sign ups from the teaser preview list. People are curious."],
			[marcus, "Message pagination is deployed. Old history loads a block at a time now."],
			[jordan, "That was fast. Nice work."],
			[priya, "Working on the composer autocomplete for mentions today."],
			[ava, "Can we show the mention chip in the accent color rather than a background fill?"],
			[priya, "Sure, easy change."],
			[tomas, "Heads up: I will be out Thursday afternoon."],
			[lena, "Same, dentist. Back by 3."],
			[marcus, "Reminder to rotate the demo workspace invite code after the webinar."],
			[jordan, "Done."],
			[lena, "Docs question: where do we explain the difference between leaving and archiving a channel?"],
			[ava, "In the channel details panel, next to the buttons themselves. Help where the decision is."],
			[priya, "Added a short line there. Shipping with the next deploy."],
			[tomas, "Webinar slides are in the shared folder for comments until Wednesday."]
		];
		let day = 8;
		let hour = 9;
		for (const [u, t] of chatter) {
			general.add(u, t, at(day, hour, hour * 7 % 60));
			hour += 1;
			if (hour > 17) {
				hour = 9;
				day -= 1;
			}
		}
		const recent = [
			[
				2,
				9,
				5,
				priya,
				"Shipped the thread panel. Replies open on the right on desktop and full screen on mobile."
			],
			[
				2,
				9,
				12,
				ava,
				"Trying it now."
			],
			[
				2,
				9,
				30,
				ava,
				"Love it. One nit: the reply count should be a button, not just text."
			],
			[
				2,
				9,
				41,
				priya,
				"Agreed, fixing."
			],
			[
				2,
				11,
				2,
				tomas,
				"Webinar registrations passed 200."
			],
			[
				2,
				11,
				15,
				jordan,
				"Excellent. Lena, can you prep a short FAQ for the chat during the session?"
			],
			[
				2,
				11,
				20,
				lena,
				"On it."
			],
			[
				2,
				14,
				5,
				marcus,
				"Reactions now sync between clients within a few seconds. Give them a try on this message."
			],
			[
				2,
				16,
				30,
				ava,
				"End of day screenshots of the settings screen are in #design."
			],
			[
				1,
				9,
				2,
				jordan,
				"Reminder that we have a new teammate starting today."
			],
			[
				1,
				9,
				15,
				lena,
				"Coffee is on. Welcome!"
			],
			[
				1,
				10,
				0,
				marcus,
				"Standup moved to 10:15 today so everyone can join."
			],
			[
				1,
				12,
				30,
				tomas,
				"Lunch order is in. Pickup at 12:45."
			],
			[
				1,
				15,
				0,
				priya,
				"Fixed the unread divider jumping when older messages load."
			],
			[
				1,
				15,
				10,
				ava,
				"That one was driving me nuts. Thank you."
			],
			[
				1,
				17,
				45,
				jordan,
				"Have a good evening everyone."
			],
			[
				0,
				8,
				55,
				marcus,
				"Morning. Deploy went out overnight; no alerts."
			],
			[
				0,
				9,
				10,
				lena,
				"Support inbox is at zero."
			],
			[
				0,
				9,
				20,
				tomas,
				"Sharing the launch checklist in #launch-q3 shortly."
			]
		];
		const seqOf = {};
		for (const [d, h, m, u, t] of recent) {
			const s = general.add(u, t, at(d, h, m));
			if (t.startsWith("Reactions now sync")) seqOf.reactions = s;
			if (t.startsWith("Shipped the thread panel")) seqOf.threadPanel = s;
		}
		const welcomeSeq = general.add(ava, `@${profile.username} welcome aboard! Say hello whenever you are ready, and ask me anything about the design system.`, at(0, 9, 32), { mn: [me] });
		general.add(jordan, "Welcome! Glad you are here.", at(0, 9, 35));
		general.react(seqOf.reactions, "thumbs-up", [
			ava,
			priya,
			lena
		]);
		general.react(seqOf.reactions, "rocket", [jordan]);
		general.react(welcomeSeq, "heart", [jordan, lena]);
		general.react(seqOf.threadPanel, "party-popper", [
			ava,
			marcus,
			tomas,
			jordan
		]);
		const threadA = new Conv(threadConvId(ids.general, seqOf.threadPanel));
		threadA.add(marcus, "Does the panel remember its width between sessions?", at(2, 9, 50));
		threadA.add(priya, "Not yet. It is fixed at 360px on desktop for now.", at(2, 9, 58));
		threadA.add(ava, "Fixed is fine for v1. Resizable can come later.", at(2, 10, 5));
		general.thread(seqOf.threadPanel, threadA.seq, threadA.last().ts);
		const design = new Conv(ids.design);
		design.add(ava, "Ava Chen created #design", at(9, 9, 5), { k: "sys" });
		design.add(ava, "Principles for this app, in one line each:\n**Calm** over busy.\n**Legible** over dense.\n**Consistent** over clever.", at(8, 10, 0));
		const critiqueSeq = design.add(ava, "Updated onboarding flow: three steps, one decision each. Create, join, or explore with sample data.", at(6, 13, 40));
		design.add(priya, "The sample data option is going to save so many first sessions.", at(6, 13, 55));
		design.add(jordan, "Agree. Also nice that skipping loses nothing.", at(6, 14, 10));
		design.add(ava, "Settings screen with the theme switcher. System is the default; the toggle stamps the root element so it wins over the OS preference.", at(2, 16, 28));
		design.add(tomas, "Can I use these for the launch post?", at(2, 16, 40));
		design.add(ava, "Yes, but wait for the final icon set. Draft ones have inconsistent stroke widths.", at(2, 16, 47));
		design.react(critiqueSeq, "heart", [
			priya,
			jordan,
			lena
		]);
		const threadB = new Conv(threadConvId(ids.design, critiqueSeq));
		threadB.add(lena, "Could the join step accept a full invite link, not just the code?", at(6, 14, 30));
		threadB.add(ava, "Yes, it should. Paste either and we pull the code out.", at(6, 14, 42));
		design.thread(critiqueSeq, threadB.seq, threadB.last().ts);
		const eng = new Conv(ids.engineering);
		eng.add(marcus, "Marcus Reid created #engineering", at(9, 9, 10), { k: "sys" });
		eng.add(marcus, "Storage design recap. Each conversation has a counter and fixed-size blocks:\n```\ntc:conv:{id}:seq     -> kv.incr, gives every message its seq\ntc:conv:{id}:b:{n}   -> block n holds seqs n*50+1 .. (n+1)*50\n```\nThe head block index is `floor((seq - 1) / 50)`, so readers never list keys.", at(7, 11, 0));
		eng.add(priya, "And edits go into the overlay map on the same block rather than rewriting the array?", at(7, 11, 12));
		const overlaySeq = eng.add(marcus, "Right. `kv.update(block, {\"x.s42.t\": text})` is one atomic path write, so it can never race an append.", at(7, 11, 15));
		eng.add(priya, "Clean. Threads are just conversations with an `_t{seq}` suffix then.", at(7, 11, 20));
		eng.add(marcus, "Exactly, same code path.", at(7, 11, 21));
		eng.add(priya, "PR for the sync poll is up. One read of the activity doc per poll, deltas only.", at(1, 14, 0));
		eng.add(marcus, "Reviewing now.", at(1, 14, 8));
		eng.add(marcus, "Approved. Ship it.", at(1, 14, 40));
		eng.edit(overlaySeq, "Right. `kv.update(block, {\"x.s42.t\": text})` is one atomic path write, so it can never race an append. Same trick for reactions and thread counts.", at(7, 11, 18));
		eng.react(overlaySeq, "check", [priya, jordan]);
		const random = new Conv(ids.random);
		random.add(tomas, "Tomas Alvarez created #random", at(9, 9, 15), { k: "sys" });
		random.add(tomas, "Best coffee near the office. Go.", at(5, 15, 0));
		random.add(lena, "The place on the corner, no contest.", at(5, 15, 3));
		random.add(priya, "Overrated. The cart by the park.", at(5, 15, 6));
		random.add(jordan, "The office machine, because it is free.", at(5, 15, 9));
		const bikeSeq = random.add(ava, "Anyone cycling in tomorrow? Weather looks good.", at(1, 18, 30));
		random.add(marcus, "Count me in.", at(1, 18, 45));
		random.react(bikeSeq, "thumbs-up", [marcus, tomas]);
		random.react(5, "laugh", [
			ava,
			lena,
			priya,
			tomas
		]);
		const ann = new Conv(ids.announcements);
		ann.add(jordan, "Jordan Blake created #announcements", at(9, 9, 20), { k: "sys" });
		ann.add(jordan, "Q3 launch date is confirmed for the 15th. Details in #launch-q3.", at(3, 10, 0));
		ann.add(jordan, "The office is closed next Monday for the public holiday.", at(1, 9, 0));
		const launch = new Conv(ids.launch);
		launch.add(tomas, "Tomas Alvarez created #launch-q3", at(4, 9, 0), { k: "sys" });
		launch.add(tomas, "Launch checklist:\n1. Final copy approved\n2. Screenshots in both themes\n3. Webinar FAQ\n4. Invite code rotated after the session", at(0, 9, 25));
		launch.add(jordan, `Adding ${meName} here so they have the full context from day one.`, at(0, 9, 28));
		const dmAva = new Conv(dmConvId([me, ava], wsId));
		dmAva.add(ava, `Hi ${meName}! I am Ava, I look after design. If anything in the app feels off, tell me here.`, at(0, 9, 40));
		dmAva.add(ava, "Also: the sample workspace is yours to play with. Nothing here is precious.", at(0, 9, 41));
		const dmGroup = new Conv(dmConvId([
			me,
			marcus,
			priya
		], wsId));
		dmGroup.add(marcus, `Looping in ${meName}. Priya, can you share the onboarding notes?`, at(0, 10, 5));
		dmGroup.add(priya, "Sure, sending them over in a bit.", at(0, 10, 9));
		const ts = now;
		const code = inviteCode();
		const inviteExp = ts + INVITE_TTLS["7d"].seconds * 1e3;
		const members = { [me]: {
			username: profile.username,
			name: meName,
			title: profile.title || "",
			color: profile.color || 6,
			avatar: profile.avatar || null,
			status: profile.status || null,
			role: "owner",
			joinedAt: at(0, 9, 30)
		} };
		const statuses = {
			[ava]: {
				emoji: "🎨",
				text: "In critique until 3",
				until: now + 3 * HOUR
			},
			[marcus]: {
				emoji: "🚀",
				text: "Deploying, back soon",
				until: now + HOUR
			},
			[lena]: {
				emoji: "🌴",
				text: "On holiday until Monday",
				until: null
			}
		};
		for (const p of PEOPLE) members[p.uuid] = {
			username: p.username,
			name: p.name,
			title: p.title,
			color: p.color,
			role: p.uuid === jordan ? "admin" : "member",
			joinedAt: at(9, 9, 0),
			sample: true,
			status: statuses[p.uuid] || null
		};
		const memberCount = PEOPLE.length + 1;
		const channel = (id, name, topic, extra = {}) => ({
			id,
			name,
			topic,
			private: false,
			def: false,
			createdBy: jordan,
			createdAt: at(9, 9, 0),
			count: memberCount,
			...extra
		});
		const ws = {
			id: wsId,
			name: "Northwind Studio",
			owner: me,
			invite: code,
			inviteExp,
			createdAt: at(9, 9, 0),
			sample: true,
			search: indexStamp(),
			channels: {
				[ids.general]: channel(ids.general, "general", "Company-wide announcements and conversation", { def: true }),
				[ids.announcements]: channel(ids.announcements, "announcements", "Official updates. Low traffic, high signal.", { def: true }),
				[ids.design]: channel(ids.design, "design", "Critique, principles, and work in progress", { createdBy: ava }),
				[ids.engineering]: channel(ids.engineering, "engineering", "Architecture, deploys, and code review", { createdBy: marcus }),
				[ids.random]: channel(ids.random, "random", "Everything that is not work", { createdBy: tomas }),
				[ids.launch]: channel(ids.launch, "launch-q3", "Private: Q3 launch coordination", {
					private: true,
					createdBy: tomas,
					count: 4,
					members: [
						me,
						tomas,
						jordan,
						marcus
					]
				})
			},
			members
		};
		const convs = [
			general,
			design,
			eng,
			random,
			ann,
			launch,
			threadA,
			threadB,
			dmAva,
			dmGroup
		];
		const activity = {
			c: {},
			p: {
				[ava]: ts,
				[marcus]: ts,
				[priya]: ts - 4e4,
				[tomas]: ts - 3 * HOUR
			},
			ps: { [marcus]: "dnd" },
			u: {},
			w: ts
		};
		for (const c of convs) {
			const last = c.last();
			if (last) activity.c[c.id] = {
				s: c.seq,
				t: last.ts,
				u: last.u
			};
		}
		activity.c[ids.general].x = ts;
		const allChannels = Object.keys(ids).map((k) => ids[k]);
		const dmEntry = (ms) => ({
			members: [...ms].sort(),
			createdAt: at(0, 9, 40)
		});
		const myDoc = {
			channels: allChannels,
			dms: {
				[dmAva.id]: dmEntry([me, ava]),
				[dmGroup.id]: dmEntry([
					me,
					marcus,
					priya
				])
			},
			reads: {
				[ids.general]: general.seq - 3,
				[ids.design]: design.seq - 2,
				[ids.engineering]: eng.seq,
				[ids.random]: random.seq,
				[ids.announcements]: ann.seq,
				[ids.launch]: 1
			},
			mentions: { [ids.general]: 1 },
			joinedAt: at(0, 9, 30)
		};
		await kv().set(KEYS.ws(wsId), ws);
		await kv().set(KEYS.invite(code), {
			ws: wsId,
			exp: inviteExp
		});
		await kv().expire(KEYS.invite(code), INVITE_TTLS["7d"].seconds).catch(() => {});
		await kv().set(KEYS.activity(wsId), activity);
		await kv().set(KEYS.member(wsId, me), myDoc);
		for (const p of PEOPLE) {
			const chans = p.uuid === tomas || p.uuid === jordan || p.uuid === marcus ? allChannels : allChannels.filter((c) => c !== ids.launch);
			await kv().set(KEYS.member(wsId, p.uuid), {
				channels: chans,
				dms: {},
				reads: {},
				mentions: {},
				joinedAt: at(9, 9, 0),
				sample: true
			});
		}
		for (const c of convs) await flush(c);
		await writeIndexFor(wsId, convs.map((c) => ({
			id: c.id,
			messages: mergeBlock({
				m: c.m,
				x: c.x
			})
		})));
		return wsId;
	}
	//#endregion
	//#region worker/unfurl.js
	/**
	* Link previews. The browser cannot read another origin's <meta> tags, so the
	* workspace's worker fetches the page: the first time this code reaches out
	* to the open internet, on the owner's dime, so it is careful about three
	* things.
	*
	* Reach: http and https only; loopback, private, link-local, multicast and
	* `.local`/`.internal` hosts are refused, redirects are followed by hand
	* (at most three) with the same check at every hop, and nothing from the
	* caller (headers, cookies) is forwarded. DNS rebinding cannot be checked
	* without a resolver, which the runtime does not offer; that limit is
	* documented.
	*
	* Budget: a five second timeout, the body read only until </head> or 200 KB,
	* an image copied only when it is an image and under 300 KB.
	*
	* Privacy: a hotlinked thumbnail would leak every reader's address to the
	* target, so the worker keeps a copy in the owner's drive and serves it to
	* members itself; readers never touch the target.
	*/
	var TIMEOUT_MS = 5e3;
	var MAX_REDIRECTS = 3;
	/**
	* What one preview may take in all, every fetch of it counted: the page
	* behind up to three redirects, then its picture behind up to three more,
	* each hop given five seconds, ran to forty seconds for a site slow at every
	* step, long past the twenty the sender's app waits for the card and past
	* what the platform lets one request run, which ended the request with
	* nothing written down, so the same link was fetched all over again the
	* next time it was posted. Each hop now gets what is left of this, and a
	* preview that runs out is a failed one, remembered for an hour like a dead
	* link (see unfurl).
	*/
	var TOTAL_MS = 12e3;
	var CACHE_TTL_S = 604800;
	var NEGATIVE_TTL_S = 3600;
	/** Is this URL one the worker may fetch at all? Returns a URL object or null. */
	function allowedUrl(raw) {
		let u;
		try {
			u = new URL(String(raw));
		} catch {
			return null;
		}
		if (u.protocol !== "http:" && u.protocol !== "https:") return null;
		if (u.username || u.password) return null;
		const host = u.hostname.toLowerCase().replace(/\.$/, "");
		if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) return null;
		if (isPrivateIp(host)) return null;
		return u;
	}
	/** Loopback, private, link-local, multicast, unspecified: v4 (including mapped) and v6. */
	function isPrivateIp(host) {
		const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
		if (v4) {
			const [a, b, c] = [
				Number(v4[1]),
				Number(v4[2]),
				Number(v4[3])
			];
			if (v4.slice(1).some((n) => Number(n) > 255)) return true;
			return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 192 && b === 0 && c === 0 || a === 198 && (b === 18 || b === 19) || a === 100 && b >= 64 && b <= 127 || a >= 224;
		}
		const h = host.replace(/^\[|\]$/g, "");
		if (h.includes(":")) {
			const low = h.toLowerCase();
			if (low === "::" || low === "::1") return true;
			if (/^f[cd]/.test(low)) return true;
			if (/^fe[89ab]/.test(low)) return true;
			if (/^ff/.test(low)) return true;
			const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(low);
			if (mapped) return isPrivateIp(mapped[1]);
			if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(low)) return true;
			if (/^::/.test(low)) return true;
			if (/^64:ff9b:/.test(low)) return true;
			if (/^2001:db8:/.test(low)) return true;
			if (/^2002:/.test(low)) return true;
			return false;
		}
		return false;
	}
	/**
	* Fetch with the guards above; returns `[response, url]` — the final
	* Response and the address that answered, which after a redirect is not
	* the one asked for and is what a relative og:image or the site's name
	* must come from — or null. `deadline` is the moment the preview as a whole
	* must be done by (see TOTAL_MS): a hop gets the shorter of its own time and
	* what is left, and none starts once it has passed.
	*/
	async function guardedFetch(raw, accept, deadline = Date.now() + TOTAL_MS) {
		let url = allowedUrl(raw);
		for (let hop = 0; url && hop <= MAX_REDIRECTS; hop++) {
			const left = deadline - Date.now();
			if (left <= 0) return null;
			let res;
			try {
				res = await fetch(url.toString(), {
					method: "GET",
					redirect: "manual",
					signal: AbortSignal.timeout(Math.min(TIMEOUT_MS, left)),
					headers: {
						Accept: accept,
						"User-Agent": "Teamchat link preview (+https://github.com/HeyPuter/teamchat)"
					}
				});
			} catch {
				return null;
			}
			if (res.url && !allowedUrl(res.url)) {
				res.body?.cancel?.().catch?.(() => {});
				return null;
			}
			if (res.status >= 300 && res.status < 400) {
				const loc = res.headers.get("location");
				if (!loc) return null;
				try {
					url = allowedUrl(new URL(loc, url).toString());
				} catch {
					return null;
				}
				continue;
			}
			return res.ok ? [res, res.url || url.toString()] : null;
		}
		return null;
	}
	/** A TextDecoder for an encoding label, or null when the platform does not know it. */
	function decoderFor(label) {
		try {
			return new TextDecoder(label || "utf-8");
		} catch {
			return null;
		}
	}
	/** The charset a Content-Type header or a meta tag's content declares, or ''. */
	var charsetOf = (s) => (/charset\s*=\s*["']?\s*([a-z0-9_:.-]+)/i.exec(String(s || "")) || [])[1] || "";
	/** Where a document's head closes, in either case (see readHead and parseHead). */
	var HEAD_END = /<\/head\s*>/i;
	/**
	* Read at most `max` bytes of a body (a Response or a Request) as text,
	* stopping early at `stopAt` when given (a string, a pattern, or a function
	* of the text read so far that says when to stop), decoded as `charset`
	* (utf-8 when unknown or not given). The bytes read are returned too, for a
	* caller that learns the encoding from the text itself.
	*/
	async function readCapped(res, max, stopAt = null, charset = "") {
		const dec = decoderFor(charset) || new TextDecoder();
		const reader = res.body?.getReader?.();
		if (!reader) {
			const bytes = new Uint8Array(await res.arrayBuffer());
			const t = dec.decode(bytes);
			return {
				text: t.slice(0, max),
				truncated: t.length > max,
				bytes
			};
		}
		const chunks = [];
		let out = "";
		let total = 0;
		const bytesRead = () => {
			const all = new Uint8Array(total);
			let o = 0;
			for (const c of chunks) {
				all.set(c, o);
				o += c.byteLength;
			}
			return all;
		};
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			total += value.byteLength;
			chunks.push(value);
			out += dec.decode(value, { stream: true });
			if (total > max) {
				reader.cancel().catch(() => {});
				return {
					text: out.slice(0, max),
					truncated: true,
					bytes: bytesRead()
				};
			}
			if (stopAt && (typeof stopAt === "function" ? stopAt(out) : stopAt instanceof RegExp ? stopAt.test(out) : out.includes(stopAt))) {
				reader.cancel().catch(() => {});
				break;
			}
		}
		return {
			text: out,
			truncated: false,
			bytes: bytesRead()
		};
	}
	/**
	* A page's head as text: decoded as its Content-Type header says, or, when
	* the header names no charset, as the <meta charset> (or http-equiv
	* Content-Type) in the head says, read from a first utf-8 decoding whose
	* markup survives whatever the encoding is. Without either, utf-8.
	*/
	async function readHead(res, type) {
		const declared = charsetOf(type);
		const { text, bytes } = await readCapped(res, LIMITS.unfurlBodyBytes, (soFar) => HEAD_END.test(stripHidden(soFar)), declared);
		if (declared) return text;
		const meta = charsetOf((/<meta\s[^>]{0,400}charset[^>]{0,200}>/i.exec(stripHidden(text)) || [])[0]);
		const dec = meta && decoderFor(meta);
		if (!dec || dec.encoding === "utf-8") return text;
		return dec.decode(bytes).slice(0, LIMITS.unfurlBodyBytes);
	}
	/** A numeric entity outside Unicode (a hostile page) decodes to nothing rather than throwing. */
	var codePoint = (n) => {
		const cp = Number(n);
		return Number.isInteger(cp) && cp > 0 && cp <= 1114111 && !(cp >= 55296 && cp <= 57343) ? String.fromCodePoint(cp) : "";
	};
	var NAMED = {
		amp: "&",
		lt: "<",
		gt: ">",
		quot: "\"",
		apos: "'",
		nbsp: " ",
		ndash: "–",
		mdash: "—",
		hellip: "…",
		lsquo: "‘",
		rsquo: "’",
		ldquo: "“",
		rdquo: "”",
		laquo: "«",
		raquo: "»",
		middot: "·",
		bull: "•",
		copy: "©",
		reg: "®",
		trade: "™",
		times: "×",
		deg: "°",
		euro: "€",
		pound: "£",
		yen: "¥"
	};
	var decodeEntities = (s) => String(s || "").replace(/&#[xX]([0-9a-fA-F]{1,6});/g, (m, n) => codePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (m, n) => codePoint(n)).replace(/&([a-zA-Z]{2,8});/g, (m, n) => Object.hasOwn(NAMED, n) ? NAMED[n] : m).replace(/\s+/g, " ").trim();
	/**
	* A document with its comments, scripts and styles taken out: what they hold
	* is not the page's metadata. A template's commented-out block of tags
	* (`<!-- <meta property="og:image" content="old.png"> -->` above the live
	* ones, the shape a page keeps for a season's old banner), or a script in
	* the head that writes a title from a string, used to be read as the page's
	* own: the card carried the old title and fetched the old picture, and the
	* live tags after them were passed over as the second of their name. One
	* left open runs to the end, as a browser reads it. One pass, each opener
	* looked for from where the last cut ended, so a head built of thousands of
	* them is read in linear time (see the scans below, held to the same).
	*/
	function stripHidden(html) {
		const lower = html.toLowerCase();
		const kinds = [
			["<!--", "-->"],
			["<script", "<\/script"],
			["<style", "</style"]
		];
		const next = kinds.map(() => -2);
		let out = "";
		let i = 0;
		for (;;) {
			let k = -1;
			for (let j = 0; j < kinds.length; j++) {
				if (next[j] !== -1 && next[j] < i) next[j] = lower.indexOf(kinds[j][0], i);
				if (next[j] >= 0 && (k < 0 || next[j] < next[k])) k = j;
			}
			if (k < 0) return out + html.slice(i);
			const [opener, closer] = kinds[k];
			out += html.slice(i, next[k]);
			const end = lower.indexOf(closer, next[k] + opener.length);
			if (end < 0) return out;
			i = end + closer.length;
			if (closer !== "-->") {
				const gt = lower.indexOf(">", i);
				i = gt < 0 ? html.length : gt + 1;
			}
		}
	}
	/** Pull title, description, site, and image out of a document head. */
	function parseHead(html, baseUrl) {
		const shown = stripHidden(html);
		const end = shown.search(HEAD_END);
		const head = shown.slice(0, end > -1 ? end : shown.length);
		const metas = {};
		const attr = (tag, name) => {
			const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(tag);
			return m ? m[1] ?? m[2] ?? m[3] : void 0;
		};
		for (const m of head.matchAll(/<meta\s[^>]{0,4000}>/gi)) {
			const tag = m[0];
			const key = attr(tag, "(?:property|name)");
			const content = attr(tag, "content");
			if (key && content !== void 0 && !Object.hasOwn(metas, key.toLowerCase())) metas[key.toLowerCase()] = decodeEntities(content);
		}
		const titleTag = (/<title[^>]{0,200}>([\s\S]{0,4000}?)<\/title>/i.exec(head) || [])[1];
		const title = metas["og:title"] || metas["twitter:title"] || decodeEntities(titleTag || "");
		const desc = metas["og:description"] || metas["twitter:description"] || metas.description || "";
		let site = metas["og:site_name"] || "";
		try {
			if (!site) site = shownHost(new URL(baseUrl).hostname);
		} catch {}
		let image = metas["og:image"] || metas["og:image:url"] || metas["twitter:image"] || metas["twitter:image:src"] || "";
		if (image) try {
			image = new URL(image, baseUrl).toString();
		} catch {
			image = "";
		}
		return {
			title: cleanText(title, 200),
			desc: cleanText(desc, 400),
			site: cleanText(site, 80),
			image: image || null
		};
	}
	var imagePath = (hash) => `teamchat-unfurls/${hash}`;
	/**
	* Preview data for a URL, from the cache or the network. Returns
	* { title, desc, site, image (a hash the worker serves, or null), kind }
	* or null when nothing can be shown. Failures are cached briefly so a dead
	* link is not fetched again on every retry.
	*/
	async function unfurl(url) {
		const page = pageOf(url);
		const key = KEYS.unfurl(await sha256(page));
		const cached = await kv().get(key);
		if (cached && !stale(cached)) return cached.none ? null : cached;
		let result = null;
		try {
			result = await fetchPreview(page);
		} catch {
			result = null;
		}
		await kv().set(key, result || {
			none: true,
			ts: Date.now()
		});
		await kv().expire(key, result ? CACHE_TTL_S : NEGATIVE_TTL_S).catch(() => {});
		return result;
	}
	/** A link without its fragment: the address the server is asked for, which is all a preview can be of (see unfurl). */
	var pageOf = (url) => {
		const s = String(url);
		const at = s.indexOf("#");
		return at < 0 ? s : s.slice(0, at);
	};
	/** Is a cached entry older than the time it was given: an hour for a failed preview, a week for a card (see unfurl)? */
	var stale = (c) => Number(c?.ts) > 0 && Date.now() - Number(c.ts) > (c.none ? NEGATIVE_TTL_S : CACHE_TTL_S) * 1e3;
	async function fetchPreview(url) {
		if (!allowedUrl(url)) return null;
		const deadline = Date.now() + TOTAL_MS;
		const fetched = await guardedFetch(url, "text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5", deadline);
		if (!fetched) return null;
		const [res, finalUrl] = fetched;
		const type = (res.headers.get("content-type") || "").toLowerCase();
		const ts = Date.now();
		if (type.startsWith("image/")) {
			const image = await storeImage(res, finalUrl);
			return image ? {
				title: "",
				desc: "",
				site: hostOf(finalUrl),
				image,
				kind: "image",
				ts
			} : null;
		}
		if (!/text\/html|application\/xhtml/.test(type)) return null;
		const meta = parseHead(await readHead(res, type), finalUrl);
		if (!meta.title && !meta.desc) return null;
		let image = null;
		if (meta.image) {
			const img = await guardedFetch(meta.image, "image/*", deadline);
			if (img && (img[0].headers.get("content-type") || "").startsWith("image/")) image = await storeImage(img[0], meta.image);
		}
		return {
			title: meta.title,
			desc: meta.desc,
			site: meta.site,
			image,
			kind: "page",
			ts
		};
	}
	function hostOf(url) {
		try {
			return shownHost(new URL(url).hostname);
		} catch {
			return "";
		}
	}
	/**
	* A host as its owner writes it, for the card's site line when the page
	* names no site of its own: `www.` dropped, and each label the URL parser
	* turned into punycode (`xn--…`) turned back into its letters, so a link to
	* bücher.example is credited to "bücher.example" and not to
	* "xn--bcher-kva.example", the encoding the parser keeps for the wire and
	* nobody writes. A label that does not decode (not punycode after all, or
	* malformed) stays as it came. The message keeps the address as it was
	* typed, so the card and the line above it agree.
	*
	* Not a label written in letters of two alphabets that look alike (see
	* mixedScripts): a Cyrillic а before "pple" decodes to a word the eye reads
	* as apple, and the card credited the page to it, a site line that vouched
	* for a look-alike. Browsers keep such a label as its punycode in the
	* address bar for the same reason, and so does the card: the host stands
	* as the parser wrote it, which reads as what it is.
	*/
	function shownHost(hostname) {
		return String(hostname || "").replace(/^www\./, "").split(".").map((label) => {
			if (!/^xn--/i.test(label)) return label;
			try {
				const shown = punycodeDecode(label.slice(4));
				return mixedScripts(shown) ? label : shown;
			} catch {
				return label;
			}
		}).join(".");
	}
	/**
	* Does a decoded label mix letters of the Latin, Cyrillic and Greek
	* alphabets, whose letters look alike (а and a, о and o, ρ and p)? A label
	* of one alphabet is what its owner wrote, whatever the alphabet; one of two
	* is the shape a look-alike is made in, and is not shown as its letters.
	* Digits, hyphens and combining marks belong to no alphabet and count for
	* nothing; a label mixing Latin with Han or kana is not this either.
	*/
	var ALPHABETS = [
		/\p{Script=Latin}/u,
		/\p{Script=Cyrillic}/u,
		/\p{Script=Greek}/u
	];
	function mixedScripts(label) {
		return ALPHABETS.filter((re) => re.test(label)).length > 1;
	}
	/**
	* RFC 3492 decoding of one label (the part after "xn--"): the ASCII letters
	* before the last hyphen as they are, then the encoded code points inserted
	* among them. Throws on anything that is not well-formed, which shownHost
	* reads as "leave the label alone". The runtime the worker runs in offers
	* no decoder of its own.
	*/
	function punycodeDecode(input) {
		const BASE = 36;
		const T_MIN = 1;
		const T_MAX = 26;
		const SKEW = 38;
		const DAMP = 700;
		const out = [];
		const cut = input.lastIndexOf("-");
		for (let j = 0; j < Math.max(0, cut); j++) {
			const c = input.charCodeAt(j);
			if (c >= 128) throw new RangeError("not basic");
			out.push(c);
		}
		const digit = (c) => c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : BASE;
		const adapt = (delta, points, first) => {
			let d = first ? Math.floor(delta / DAMP) : delta >> 1;
			d += Math.floor(d / points);
			let k = 0;
			for (; d > 455; k += BASE) d = Math.floor(d / 35);
			return Math.floor(k + 36 * d / (d + SKEW));
		};
		let n = 128;
		let i = 0;
		let bias = 72;
		for (let idx = cut > 0 ? cut + 1 : 0; idx < input.length;) {
			const was = i;
			let w = 1;
			for (let k = BASE;; k += BASE) {
				if (idx >= input.length) throw new RangeError("cut short");
				const d = digit(input.charCodeAt(idx++));
				if (d >= BASE || d > Math.floor((2147483647 - i) / w)) throw new RangeError("bad digit");
				i += d * w;
				const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
				if (d < t) break;
				if (w > Math.floor(2147483647 / (BASE - t))) throw new RangeError("overflow");
				w *= BASE - t;
			}
			const points = out.length + 1;
			bias = adapt(i - was, points, was === 0);
			if (Math.floor(i / points) > 2147483647 - n) throw new RangeError("overflow");
			n += Math.floor(i / points);
			i %= points;
			if (n > 1114111 || n >= 55296 && n <= 57343) throw new RangeError("not a character");
			out.splice(i++, 0, n);
		}
		return String.fromCodePoint(...out);
	}
	/** Read a body as bytes, giving up (and cancelling the stream) past `max`. */
	async function readBytes(res, max) {
		const reader = res.body?.getReader?.();
		if (!reader) {
			const buf = new Uint8Array(await res.arrayBuffer());
			return buf.byteLength > max ? null : buf;
		}
		const chunks = [];
		let total = 0;
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > max) {
				reader.cancel().catch(() => {});
				return null;
			}
			chunks.push(value);
		}
		const out = new Uint8Array(total);
		let o = 0;
		for (const c of chunks) {
			out.set(c, o);
			o += c.byteLength;
		}
		return out;
	}
	/**
	* Keep a bounded copy of an image in the owner's drive; returns its hash or
	* null. The bound is enforced while reading: a response without a
	* Content-Length (or with a dishonest one) is dropped the moment it exceeds
	* the limit, never buffered whole. The copy is kept for as long as messages
	* point at it, which is indefinitely; the settings switch explains the cost.
	*/
	async function storeImage(res, url) {
		if (Number(res.headers.get("content-length")) > LIMITS.unfurlImageBytes) return null;
		const type = (res.headers.get("content-type") || "").split(";")[0].trim();
		if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(type)) return null;
		let bytes;
		try {
			bytes = await readBytes(res, LIMITS.unfurlImageBytes);
		} catch {
			return null;
		}
		if (!bytes || bytes.byteLength === 0) return null;
		const blob = new Blob([bytes], { type });
		const hash = await sha256(url);
		try {
			await fs().write(imagePath(hash), blob, {
				createMissingParents: true,
				overwrite: true
			});
			await kv().set(`tc:unfurlimg:${hash}`, {
				type,
				size: blob.size,
				ts: Date.now()
			});
		} catch {
			return null;
		}
		return hash;
	}
	/** The stored thumbnail, for the route that serves it to members. */
	async function readImage(hash) {
		if (!/^[0-9a-f]{64}$/.test(String(hash))) return null;
		const meta = await kv().get(`tc:unfurlimg:${hash}`);
		if (!meta) return null;
		try {
			return {
				blob: await fs().read(imagePath(hash)),
				type: meta.type
			};
		} catch {
			return null;
		}
	}
	//#endregion
	//#region worker/push.js
	/**
	* Web Push from the worker: VAPID (RFC 8292) and payload encryption
	* (RFC 8291, aes128gcm), with WebCrypto only. Each owner's worker has its
	* own VAPID key pair, generated on first use and kept in the owner's KV
	* (tc:config.vapid), so pushes for a workspace are signed by its owner's
	* server and nothing runs under the app developer's account.
	*/
	var subtle = crypto.subtle;
	var enc$2 = new TextEncoder();
	var b64url$1 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	var fromB64url = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(s).length / 4) * 4, "=")), (c) => c.charCodeAt(0));
	var soundKeys = (v) => !!(v && typeof v === "object" && v.pub && v.jwk);
	var pause = (ms) => new Promise((r) => setTimeout(r, ms));
	/**
	* The worker's VAPID keys: { pub (raw, base64url), jwk (private) }, made
	* once. Two first callers at once (two devices turning notifications on
	* against a fresh worker, or one member's two workspaces here opening
	* together) each made a pair and each wrote it, the second over the first,
	* while the first had already handed its own public key to the browser:
	* that device subscribed under a key no push was ever signed with again,
	* and every push to it failed (not "gone", so it was never dropped) until
	* the app next opened and, finding the worker's key changed, subscribed
	* afresh. So the making is claimed first, with a count on the config
	* document that only the caller taking it from nothing to one wins (as a
	* delivery claims a scheduled entry); the others wait for the pair to
	* appear, briefly, and make their own only if it does not (a winner that
	* died). And every caller answers with the pair that stands after its
	* write, never the one it made.
	*/
	async function vapidKeys() {
		const cfg = await serverConfig();
		if (soundKeys(cfg.vapid)) return cfg.vapid;
		let claimed = true;
		try {
			const res = await kv().incr(CONFIG_KEY, { vapidClaim: 1 });
			const n = res && typeof res === "object" ? Number(res.vapidClaim) : Number(res);
			if (Number.isFinite(n) && n > 1) claimed = false;
		} catch {}
		if (!claimed) for (let i = 0; i < 6; i++) {
			await pause(150);
			resetServerConfigCache();
			const again = await serverConfig();
			if (soundKeys(again.vapid)) return again.vapid;
		}
		const pair = await subtle.generateKey({
			name: "ECDSA",
			namedCurve: "P-256"
		}, true, ["sign", "verify"]);
		const vapid = {
			pub: b64url$1(await subtle.exportKey("raw", pair.publicKey)),
			jwk: await subtle.exportKey("jwk", pair.privateKey),
			createdAt: Date.now()
		};
		const next = await setServerConfig({ vapid });
		return soundKeys(next.vapid) ? next.vapid : vapid;
	}
	/** A VAPID Authorization header for `endpoint`, valid twelve hours. */
	async function vapidAuth(endpoint, keys, subject = "mailto:teamchat@puter.com") {
		const aud = new URL(endpoint).origin;
		const header = b64url$1(enc$2.encode(JSON.stringify({
			typ: "JWT",
			alg: "ES256"
		})));
		const claims = b64url$1(enc$2.encode(JSON.stringify({
			aud,
			exp: Math.floor(Date.now() / 1e3) + 43200,
			sub: subject
		})));
		const key = await subtle.importKey("jwk", keys.jwk, {
			name: "ECDSA",
			namedCurve: "P-256"
		}, false, ["sign"]);
		return `vapid t=${header}.${claims}.${b64url$1(await subtle.sign({
			name: "ECDSA",
			hash: "SHA-256"
		}, key, enc$2.encode(`${header}.${claims}`)))}, k=${keys.pub}`;
	}
	async function hkdf(salt, ikm, info, length) {
		const key = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
		return new Uint8Array(await subtle.deriveBits({
			name: "HKDF",
			hash: "SHA-256",
			salt,
			info
		}, key, length * 8));
	}
	var concat = (...parts) => {
		const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
		let o = 0;
		for (const p of parts) {
			out.set(new Uint8Array(p), o);
			o += p.byteLength;
		}
		return out;
	};
	/**
	* Encrypt `plaintext` for a subscription { endpoint, keys: { p256dh, auth } }
	* as one aes128gcm record. Returns the body to POST.
	*/
	async function encryptPayload(sub, plaintext) {
		const uaPub = fromB64url(sub.keys.p256dh);
		const auth = fromB64url(sub.keys.auth);
		const local = await subtle.generateKey({
			name: "ECDH",
			namedCurve: "P-256"
		}, true, ["deriveBits"]);
		const asPub = new Uint8Array(await subtle.exportKey("raw", local.publicKey));
		const uaKey = await subtle.importKey("raw", uaPub, {
			name: "ECDH",
			namedCurve: "P-256"
		}, false, []);
		const shared = new Uint8Array(await subtle.deriveBits({
			name: "ECDH",
			public: uaKey
		}, local.privateKey, 256));
		const salt = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
		const ikm = await hkdf(auth, shared, concat(enc$2.encode("WebPush: info\0"), uaPub, asPub), 32);
		const cek = await hkdf(salt, ikm, enc$2.encode("Content-Encoding: aes128gcm\0"), 16);
		const nonce = await hkdf(salt, ikm, enc$2.encode("Content-Encoding: nonce\0"), 12);
		const data = concat(enc$2.encode(plaintext), new Uint8Array([2]));
		const aes = await subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
		const cipher = new Uint8Array(await subtle.encrypt({
			name: "AES-GCM",
			iv: nonce
		}, aes, data));
		const rs = /* @__PURE__ */ new Uint8Array(4);
		new DataView(rs.buffer).setUint32(0, 4096);
		return concat(salt, rs, new Uint8Array([asPub.byteLength]), asPub, cipher);
	}
	/**
	* Send one push. Returns 'ok', 'gone' (the subscription should be dropped:
	* 404/410), or 'failed'. Never throws.
	*/
	async function sendPush(sub, payload, { ttl = 3600, urgency = "normal" } = {}) {
		try {
			const keys = await vapidKeys();
			const body = await encryptPayload(sub, JSON.stringify(payload));
			if (!allowedUrl(sub.endpoint) || !String(sub.endpoint).startsWith("https://")) return "gone";
			const res = await fetch(sub.endpoint, {
				method: "POST",
				redirect: "error",
				headers: {
					TTL: String(ttl),
					Urgency: urgency,
					"Content-Encoding": "aes128gcm",
					"Content-Type": "application/octet-stream",
					Authorization: await vapidAuth(sub.endpoint, keys)
				},
				body,
				signal: AbortSignal.timeout(3e3)
			});
			if (res.status === 404 || res.status === 410) return "gone";
			return res.ok || res.status === 201 ? "ok" : "failed";
		} catch {
			return "failed";
		}
	}
	/**
	* Is a push wanted right now by a subscription's owner? Quiet hours and a
	* pause travel with the subscription, in the device's own minutes-from-UTC,
	* so the worker can respect them while the app is closed.
	*/
	function pushAllowed(prefs, now = Date.now()) {
		if (!prefs) return true;
		if (prefs.pauseUntil && prefs.pauseUntil > now) return false;
		const d = prefs.dnd;
		if (!d || !d.enabled || typeof d.from !== "number" || typeof d.to !== "number" || d.from === d.to) return true;
		const offset = Number(prefs.tzOffset) || 0;
		const local = new Date(now + offset * 6e4);
		const cur = local.getUTCHours() * 60 + local.getUTCMinutes();
		return !(d.from < d.to ? cur >= d.from && cur < d.to : cur >= d.from || cur < d.to);
	}
	/**
	* FNV-1a, 32-bit: small, deterministic, and dependency-free, so the worker
	* and every browser compute the exact same shard for the exact same uuid
	* with nothing to keep in sync between them.
	*/
	function fnv1a32(str) {
		let h = 2166136261;
		for (let i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
	/** Which of the EV_SHARDS shards a member's uuid falls in. Computed by the worker only; the client just uses the number its bootstrap gives it. */
	function evShard(uuid) {
		return fnv1a32(String(uuid)) % 4;
	}
	function evRingShard(uuid) {
		return fnv1a32(String(uuid)) % 8;
	}
	/** The workspace's whole signal region: what the owner's own direct subscription is rooted on, and the prefix a member's handle is minted against. */
	var evRegion = (wsId) => KEYS.evRegion(wsId);
	function b64ToBytes(b64) {
		const bin = atob(b64 + "=".repeat((4 - b64.length % 4) % 4));
		return Uint8Array.from(bin, (c) => c.charCodeAt(0));
	}
	/** A dashed `au` was never packed and stands as it is; anything else is base64 that must decode to exactly sixteen bytes, a uuid's worth, or it is not one and is refused rather than dressed up as an id nothing will ever match. */
	function decodeCompressedAppUid(v) {
		if (v.includes("-")) return v;
		const bytes = b64ToBytes(v.replace(/_/g, "/"));
		if (bytes.length !== 16) return null;
		const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
		return `app-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}
	/**
	* The app uid a Puter auth token carries, or null: no token, a user-scoped
	* session with no app claim at all, or anything that will not parse. Both
	* the worker and the client decode it themselves, and from both claim
	* forms, because a v2 token — the only kind the platform has signed for
	* years — never carries `app_uid` at all: signing compresses the payload,
	* and the auth scope's table maps `app_uid` to `au`, whose value is the uuid
	* with its `app-` prefix stripped, its dashes removed and its hex packed
	* into base64. Reading `app_uid` alone, on the reasoning that puter.js's own
	* getAppIDFromAuthToken is undocumented and should not be depended on, found
	* nothing in any token the platform actually signs: every worker read as
	* user-scoped, every bootstrap left the `events` block out, and the whole
	* feature was inert while the tests passed against a fixture shaped like no
	* real token. The short aliases are the wire contract — they are what the
	* token holds, the long names never reach it — so decoding them here is
	* safe; ignoring them was not.
	*/
	function appUidFromToken(token) {
		const parts = String(token || "").split(".");
		if (parts.length < 2) return null;
		try {
			const payload = JSON.parse(new TextDecoder().decode(b64ToBytes(parts[1].replace(/-/g, "+").replace(/_/g, "/"))));
			const uid = typeof payload?.app_uid === "string" && payload.app_uid ? payload.app_uid : typeof payload?.au === "string" && payload.au ? decodeCompressedAppUid(payload.au) : null;
			return uid && uid.startsWith("app-") ? uid : null;
		} catch {
			return null;
		}
	}
	//#endregion
	//#region worker/events.js
	/**
	* The handle side of events signalling: who this worker's own token belongs
	* to, minting a member's watch handle on the workspace's signal region, and
	* the bootstrap block that tells a client how to subscribe (see
	* docs/systemDesignDocs/teamchatEventsSignaling.md, sections 3.5 and 3.6).
	* Everything here is defensive by design: a worker whose token carries no
	* app uid, a platform with the feature off, or a mint that fails must all
	* come back to exactly today's behaviour, never an error a caller sees.
	*/
	/** How long a mint or a revoke is given to answer before it is treated as unreachable. */
	var HANDLE_TIMEOUT_MS = 3e3;
	/**
	* This worker's own app uid, decoded from its own auth token. Null for a
	* user-scoped worker (no app claim at all — see the design doc, section
	* 2.5) or a token that will not parse; either way, events are unavailable
	* and every caller here treats null as "nothing to offer".
	*/
	function workerAppUid() {
		try {
			return appUidFromToken(me?.puter?.authToken);
		} catch {
			return null;
		}
	}
	/**
	* The app uid the caller's own token carries, or null when it cannot be read
	* (no token forwarded, one that will not parse, a session with no app claim).
	*/
	function callerAppUid(user) {
		try {
			return appUidFromToken(user?.puter?.authToken);
		} catch {
			return null;
		}
	}
	/**
	* Backoff windows for a mint failure (design doc, section 3.6), grouped by
	* whose problem the refusal is. All five below are worker-wide, not any one
	* member's, but they no longer share one wait: events_disabled and
	* events_kv_handles_disabled describe the platform region, and
	* events_kv_handle_owner_only and events_kv_handle_outside_namespace
	* describe this worker's own token and the prefix it mints against — none
	* of the four can change without a redeploy, and a redeploy makes a new
	* worker anyway, so six hours costs nothing real. Consent
	* (events_kv_handle_not_delegated) is different: it is the one code a
	* person can flip from outside the app entirely, at any moment, with
	* nothing telling the worker — granted from the Puter GUI, another device,
	* or a session long since closed, none of which touches this worker's
	* cached verdict. An owner's own tab open at the time heals that at once
	* (see shell.js's healEventsVerdict); this thirty minutes covers the owner
	* who granted it and closed the tab. The cost of the shorter window is one
	* refused mint per half hour per worker — a rounding error against a
	* 60-a-minute budget — against a workspace that used to stay dark for six
	* hours over a grant that had already been made.
	* events_kv_handle_limit_reached is the owner's live-handle cap, worker-wide
	* too, but shorter still: a slot can free up on its own as members leave.
	* A 429 is this member alone outrunning the mint budget; a temp account
	* behind events_kv_handle_requires_account cannot be granted a handle at
	* all, which is that one member's problem, not the worker's — refusing
	* every other member for hours over it would be wrong, so it gets the same
	* long wait but member-scoped (they can sign up, so it is not for ever, but
	* retrying it every ten minutes buys nothing). Anything else (a network
	* failure, a timeout, an answer with no handle) gets the same short,
	* member-scoped backoff a transient failure deserves.
	*/
	var WORKER_BACKOFF_MS = {
		events_disabled: 216e5,
		events_kv_handles_disabled: 216e5,
		events_kv_handle_not_delegated: 18e5,
		events_kv_handle_owner_only: 216e5,
		events_kv_handle_outside_namespace: 216e5,
		events_kv_handle_limit_reached: 36e5
	};
	var MEMBER_BACKOFF_MS = {
		too_many_requests: 12e4,
		events_kv_handle_requires_account: 216e5
	};
	var DEFAULT_MEMBER_BACKOFF_MS = 6e5;
	/**
	* Ask Puter for a handle on this workspace's signal region for one grantee.
	* Never throws: a network failure, a timeout, and an error response all come
	* back as { ok: false, code, why }, which the caller turns into a backoff
	* rather than a failed request of its own.
	*/
	async function mintHandle(wsId, granteeUuid) {
		if (!workerAppUid()) return {
			ok: false,
			code: "no_app_uid",
			why: "This worker is not running as an app"
		};
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), HANDLE_TIMEOUT_MS);
		try {
			const res = await fetch(`${me.puter.APIOrigin}/events/kv-handles`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${me.puter.authToken}`
				},
				body: JSON.stringify({
					granteeUid: granteeUuid,
					prefix: evRegion(wsId)
				}),
				signal: controller.signal
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) return {
				ok: false,
				code: body?.code || `http_${res.status}`,
				why: body?.message || "The handle could not be minted"
			};
			if (typeof body?.handle !== "string" || !body.handle) return {
				ok: false,
				code: "invalid_response",
				why: "The handle mint answered with no handle"
			};
			return {
				ok: true,
				handle: body.handle
			};
		} catch (e) {
			return {
				ok: false,
				code: e?.name === "AbortError" ? "timeout" : "network",
				why: "The handle mint could not be reached"
			};
		} finally {
			clearTimeout(timer);
		}
	}
	/**
	* Ask Puter to give up one previously minted handle, mirroring mintHandle in
	* every way that matters: never throws, the same timeout, and a network
	* failure or an error response both come back as { ok: false, code, why }.
	* Retiring an already-revoked handle is idempotent on the platform's side
	* and answers 200 with the original revokedAt, not 404; a 404 here means an
	* unknown handle, or one belonging to another account, and counts as
	* success all the same, since either way there is nothing left to take back.
	*/
	async function revokeHandle(handle) {
		if (!workerAppUid()) return {
			ok: false,
			code: "no_app_uid",
			why: "This worker is not running as an app"
		};
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), HANDLE_TIMEOUT_MS);
		try {
			const res = await fetch(`${me.puter.APIOrigin}/events/kv-handles/${encodeURIComponent(handle)}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${me.puter.authToken}`
				},
				signal: controller.signal
			});
			if (res.ok) return { ok: true };
			const body = await res.json().catch(() => ({}));
			if (res.status === 404 && body?.code === "subject_does_not_exist") return { ok: true };
			return {
				ok: false,
				code: body?.code || `http_${res.status}`,
				why: body?.message || "The handle could not be revoked"
			};
		} catch (e) {
			return {
				ok: false,
				code: e?.name === "AbortError" ? "timeout" : "network",
				why: "The handle revoke could not be reached"
			};
		} finally {
			clearTimeout(timer);
		}
	}
	/**
	* Give back one member's cached handle when their membership ends, so the
	* slot it held on the owner's live-handle cap counts only while they are
	* actually still here. `doc` is the member document a caller already has in
	* hand; without one this reads it itself, but only once workerAppUid() has
	* confirmed there is anything to release, so a user-scoped worker makes
	* neither that read nor a fetch. Never mints, never throws, and a failed
	* revoke is simply left standing for the owner to clear by hand.
	*/
	async function releaseHandle(wsId, uuid, doc = null) {
		if (!workerAppUid()) return { revoked: false };
		const h = (doc == null ? await kv().get(KEYS.member(wsId, uuid)).catch(() => null) : doc)?.ev?.h;
		if (!h) return { revoked: false };
		return { revoked: !!(await revokeHandle(h)).ok };
	}
	/**
	* Mint a handle for one member, or hand back the one already cached on their
	* member document; never re-mints a live handle (the mint budget is 60 a
	* minute per owner account, spent even on an idempotent re-mint). A failure
	* is remembered with the backoff table above and never retried before its
	* window, worker-wide for a platform or consent problem, member-wide for
	* anything else.
	*/
	async function ensureHandle(wsId, uuid, doc) {
		if (doc?.ev?.h) return doc.ev.h;
		const at = Date.now();
		if (doc?.ev?.until && doc.ev.until > at) return null;
		const cfg = await serverConfig();
		if (cfg.ev && cfg.ev.until > at) return null;
		const res = await mintHandle(wsId, uuid);
		if (res.ok) {
			await kv().update(KEYS.member(wsId, uuid), { ev: { h: res.handle } }).catch(() => {});
			if (!cfg.ev?.ok) await setServerConfig({ ev: {
				ok: true,
				appUid: workerAppUid(),
				why: null,
				until: 0
			} }).catch(() => {});
			return res.handle;
		}
		const workerMs = WORKER_BACKOFF_MS[res.code];
		if (workerMs) await setServerConfig({ ev: {
			ok: false,
			appUid: workerAppUid(),
			why: res.code,
			until: at + workerMs
		} }).catch(() => {});
		else {
			const memberMs = MEMBER_BACKOFF_MS[res.code] || DEFAULT_MEMBER_BACKOFF_MS;
			await kv().update(KEYS.member(wsId, uuid), { ev: {
				until: at + memberMs,
				why: res.code
			} }).catch(() => {});
		}
		return null;
	}
	/**
	* The bootstrap's `events` block (design doc, section 3.5): `own` mode for
	* the worker's own owner, who needs no handle, no consent, and no
	* `events.kvHandles` flag, since their browser and their worker share the
	* same app-scoped namespace; `handle` mode for everyone else, whose handle
	* is minted lazily and cached on their own member document. Null when
	* nothing is available yet, so an old client sees no such key and an old
	* worker's bootstrap has none to begin with — both read the same as today.
	*/
	async function eventsBlock(ws, uuid, doc = null, user = null) {
		const appUid = workerAppUid();
		if (!appUid) return null;
		const caller = callerAppUid(user);
		if (caller && caller !== appUid) return null;
		const shard = evShard(uuid);
		if ((await serverConfig()).owner === uuid) return {
			mode: "own",
			appUid,
			key: KEYS.evShard(ws.id, shard),
			shards: 4,
			shard
		};
		const memberDoc = doc || await kv().get(KEYS.member(ws.id, uuid)).catch(() => null) || {};
		const handle = await ensureHandle(ws.id, uuid, memberDoc);
		if (!handle) return null;
		return {
			mode: "handle",
			handle,
			shards: 4,
			shard
		};
	}
	/**
	* Re-mint one member's own handle after the one they hold has been refused
	* (POST /api/ws/:ws/events/handle, worker/index.js — itself rate-limited per
	* member, since ensureHandle's own cache means nothing here is retried on
	* its own). The owner holds no handle to replace — they subscribe in `own`
	* mode — so their call is just eventsBlock's own bootstrap answer again.
	*
	* The old handle is revoked before anything else, its failure ignored:
	* releaseHandle is the only other place a handle is given back, and it reads
	* `ev.h`, which this is about to overwrite, so a handle abandoned here would
	* sit on one of the owner's live-handle slots (100 per app, 50 on free)
	* until cleared by hand from a Puter session. Revoking is idempotent and
	* already answers ok on a 404/subject_does_not_exist, so the ordinary case
	* here — a handle that is already gone, which is why this was called at all
	* — costs one wasted round trip, while the uncommon one (an app binding
	* changed under a still-live handle) actually frees a slot. The member
	* document is then cleared of `ev` entirely, not only its handle: `until`
	* and `why` go with it, so this member's own backoff does not outlive the
	* handle it was recorded against.
	*
	* The worker-wide verdict in tc:config.ev is deliberately left standing: if
	* it says a mint would be refused, eventsBlock's own ensureHandle answers
	* null without spending one of the owner's mints on a certain failure, and
	* the caller falls back to polling exactly as it does today. That is what
	* makes this compose with the owner-side healing in shell.js: a handle that
	* died because the owner revoked the grant leads here to a refused re-mint,
	* which is a worker-wide verdict, which the owner's own next visit clears.
	*
	* Never throws: every await here already `.catch`es its own failure, and
	* eventsBlock is no different.
	*/
	async function remintHandle(ws, uuid, doc = null, user = null) {
		const appUid = workerAppUid();
		if (!appUid) return null;
		const caller = callerAppUid(user);
		if (caller && caller !== appUid) return null;
		if ((await serverConfig()).owner === uuid) return eventsBlock(ws, uuid, doc, user);
		const memberDoc = doc || await kv().get(KEYS.member(ws.id, uuid)).catch(() => null) || {};
		const old = memberDoc?.ev?.h;
		if (old) await revokeHandle(old).catch(() => {});
		await kv().remove(KEYS.member(ws.id, uuid), "ev").catch(() => {});
		return eventsBlock(ws, uuid, {
			...memberDoc,
			ev: void 0
		}, user);
	}
	/**
	* GET /api/server's events status, owner only: whether the platform and the
	* owner's consent both stand. `why: 'unknown'` means nothing has actually
	* been probed yet (no member has ever attempted a mint) — distinct from a
	* definite refusal, so the client's consent toast, which must fire only on
	* a definite one, leaves an owner who already granted the permission alone
	* rather than asking again just because this worker has not confirmed it.
	* A worker with no app identity used to answer bare null here, so an owner
	* whose worker can never do events was told nothing, for ever — and
	* overwriting the worker bundle is not the fix, since a worker's app
	* identity is settled once, when `puter.workers.create()` makes it; the only
	* remedy is deploying a new worker. `'no_app_uid'` names that case instead,
	* the same code mintHandle() already answers for it, so a caller only ever
	* has one name to check.
	*/
	async function serverEventsStatus() {
		const appUid = workerAppUid();
		if (!appUid) return {
			appUid: null,
			delegated: false,
			why: "no_app_uid"
		};
		const verdict = (await serverConfig()).ev;
		if (!verdict) return {
			appUid,
			delegated: false,
			why: "unknown"
		};
		return {
			appUid,
			delegated: !!verdict.ok,
			why: verdict.ok ? null : verdict.why || "unknown"
		};
	}
	/** PUT /api/server { events: true }: forget a cached refusal so the next mint attempt re-probes the platform and the owner's consent from scratch. */
	async function clearEventsVerdict() {
		await setServerConfig({ ev: null });
	}
	//#endregion
	//#region src/shared/ring.js
	/**
	* Change entries carried by events, shared by the worker (which seals them)
	* and the client (which opens them). Each conversation has a root key the
	* worker derives and hands only to people who can read it (the bootstrap's
	* `ring.ek`); from it come an opaque tag naming the conversation in a ring
	* entry and the AES-GCM key its payload is sealed with. Threads use their
	* parent's keys, tagged `{tag}t{seq}`.
	*/
	var enc$1 = new TextEncoder();
	new TextDecoder();
	function b64urlEncode(bytes) {
		let s = "";
		for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
		return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	}
	function b64urlDecode(str) {
		const b64 = String(str).replace(/-/g, "+").replace(/_/g, "/");
		const bin = atob(b64 + "=".repeat((4 - b64.length % 4) % 4));
		return Uint8Array.from(bin, (c) => c.charCodeAt(0));
	}
	async function hmac$1(keyBytes, message) {
		const key = await crypto.subtle.importKey("raw", keyBytes, {
			name: "HMAC",
			hash: "SHA-256"
		}, false, ["sign"]);
		return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc$1.encode(message)));
	}
	var keyCache = /* @__PURE__ */ new Map();
	var KEY_CACHE_MAX = 1e3;
	/** The tag and AES key a root key stands for, cached by the root. */
	async function ringKeysFrom(root) {
		const hit = keyCache.get(root);
		if (hit) return hit;
		const promise = (async () => {
			const rootBytes = b64urlDecode(root);
			const [tagBytes, encBytes] = await Promise.all([hmac$1(rootBytes, "tag"), hmac$1(rootBytes, "enc")]);
			const aes = await crypto.subtle.importKey("raw", encBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
			return {
				tag: b64urlEncode(tagBytes).slice(0, 22),
				aes
			};
		})();
		if (keyCache.size >= KEY_CACHE_MAX) keyCache.delete(keyCache.keys().next().value);
		keyCache.set(root, promise);
		promise.catch(() => keyCache.delete(root));
		return promise;
	}
	function threadTag(tag, seq) {
		return `${tag}t${seq}`;
	}
	/** `obj` sealed under `aes`, bound to the entry's tag: base64url of the IV followed by the ciphertext. */
	async function sealEntry(aes, g, obj) {
		const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12));
		const ct = new Uint8Array(await crypto.subtle.encrypt({
			name: "AES-GCM",
			iv,
			additionalData: enc$1.encode(g)
		}, aes, enc$1.encode(JSON.stringify(obj))));
		const out = new Uint8Array(iv.length + ct.length);
		out.set(iv);
		out.set(ct, iv.length);
		return b64urlEncode(out);
	}
	//#endregion
	//#region worker/ring.js
	/**
	* Ring entries on the worker side: the secret every conversation key is
	* derived from, the keys themselves, and sealing entries for worker/signal.js.
	*
	* A conversation's root key is HMAC(secret, workspace, conversation, epoch,
	* access). `access` is the private channel's member list, so a membership
	* change replaces its key on its own; the workspace epoch (`ws.ke`) is
	* bumped wherever someone loses access some other way (see bumpRingEpoch).
	* Nothing per conversation is stored, so every conversation, old or new,
	* has a key as soon as the secret exists.
	*/
	var SECRET_LOCK = "tc:evs:lock";
	/**
	* The secret, created once per worker. The config is read afresh first (an
	* isolate's cached copy may predate the secret, and writing a second one
	* would orphan every key already handed out), then creation is claimed with
	* incr, so two first requests at once cannot each write their own; one that
	* loses reads the config again, and gets null (no ring entries this time) if
	* the winner's write has not landed.
	*/
	async function ringSecret() {
		const cfg = await serverConfig();
		if (typeof cfg.evs === "string" && cfg.evs) return cfg.evs;
		resetServerConfigCache();
		const fresh = await serverConfig();
		if (typeof fresh.evs === "string" && fresh.evs) return fresh.evs;
		if (await kv().incr(SECRET_LOCK).catch(() => 0) === 1) {
			await kv().expire(SECRET_LOCK, 60).catch(() => {});
			const evs = b64urlEncode(crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)));
			await setServerConfig({ evs });
			return evs;
		}
		resetServerConfigCache();
		const again = await serverConfig();
		return typeof again.evs === "string" && again.evs ? again.evs : null;
	}
	/** Who may read a conversation, as far as its key goes, or null for one that has no key (not a channel or DM of this workspace). */
	function accessOf(ws, base) {
		if (base.startsWith("dm_")) return "d";
		const ch = ws.channels && Object.hasOwn(ws.channels, base) ? ws.channels[base] : null;
		if (!ch) return null;
		if (!ch.private) return "o";
		return `p:${[...new Set(ch.members || [])].sort().join(",")}`;
	}
	var rootCache = /* @__PURE__ */ new Map();
	var ROOT_CACHE_MAX = 2e3;
	var secretKey = {
		secret: null,
		key: null
	};
	var enc = new TextEncoder();
	function importedSecret(secret) {
		if (secretKey.secret !== secret) secretKey = {
			secret,
			key: crypto.subtle.importKey("raw", b64urlDecode(secret), {
				name: "HMAC",
				hash: "SHA-256"
			}, false, ["sign"])
		};
		return secretKey.key;
	}
	/** The root key of a conversation (a thread's is its parent's), base64url, or null when it has none. */
	async function rootKeyFor(ws, conv, secret) {
		const base = parentOfThread(conv)?.conv || conv;
		const access = accessOf(ws, base);
		if (!access || !secret) return null;
		const input = `tcr1|${ws.id}|${base}|${Number(ws.ke) || 0}|${access}`;
		const cacheKey = `${secret}|${input}`;
		const hit = rootCache.get(cacheKey);
		if (hit) return hit;
		const root = b64urlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", await importedSecret(secret), enc.encode(input))));
		if (rootCache.size >= ROOT_CACHE_MAX) rootCache.delete(rootCache.keys().next().value);
		rootCache.set(cacheKey, root);
		return root;
	}
	/** Root keys for the bootstrap: `{ conv: root }` for each conversation given, or null without a secret. */
	async function ringKeysFor(ws, convs) {
		const secret = await ringSecret().catch(() => null);
		if (!secret) return null;
		const roots = await Promise.all(convs.map((conv) => rootKeyFor(ws, conv, secret)));
		const out = {};
		convs.forEach((conv, i) => {
			if (roots[i]) out[conv] = roots[i];
		});
		return out;
	}
	/**
	* The bootstrap's `ring` block, beside its `events` block (which it leaves
	* as it was, for clients from before ring entries): the member's ring shard
	* `rs`, the shard's entry counter `rn` as read with the activity document
	* (`counters`, the evCounter document), the workspace epoch `ke`, and the
	* root key of every conversation in `convs`. `okey`/`rkey` name the keys to
	* watch in `own` mode; through a handle they are `o{rs}` and `r{rs}:*`.
	* Null without an `events` block, or without a secret to derive keys from.
	*/
	async function ringBlock(ws, uuid, events, convs, counters = null) {
		if (!events) return null;
		const ek = await ringKeysFor(ws, convs);
		if (!ek) return null;
		const rs = evRingShard(uuid);
		const out = {
			rs,
			rn: Number(counters?.[`s${rs}`]) || 0,
			ke: Number(ws.ke) || 0,
			ek
		};
		if (events.mode === "own") {
			out.okey = KEYS.evPing(ws.id, rs);
			out.rkey = KEYS.evRingPrefix(ws.id, rs);
		}
		return out;
	}
	/** The caller's ring counter for a sync answer, from the evCounter document read beside the activity document. */
	function ringCount(counters, uuid) {
		return Number(counters?.[`s${evRingShard(uuid)}`]) || 0;
	}
	/**
	* Seal ring entries (`{ conv, body, slim? }`): `[{ g, d, e }]`, one per
	* entry, or null when any of them cannot be sealed, since a ring write that
	* carries only part of a change would leave the rest unannounced. `slim` is
	* what goes instead of `body` when the sealed body would be too large.
	*/
	async function sealEntries(ws, entries) {
		const secret = await ringSecret();
		if (!secret) return null;
		const e = Number(ws.ke) || 0;
		const out = [];
		for (const entry of entries) {
			const root = await rootKeyFor(ws, entry.conv, secret);
			if (!root) return null;
			const { tag, aes } = await ringKeysFrom(root);
			const thread = parentOfThread(entry.conv);
			const g = thread ? threadTag(tag, thread.seq) : tag;
			let d = await sealEntry(aes, g, entry.body);
			if (d.length > 12e3) d = await sealEntry(aes, g, entry.slim || { a: entry.body.a });
			out.push({
				g,
				d,
				e
			});
		}
		return out;
	}
	/**
	* Replace every conversation key of a workspace: for someone losing access
	* other than by a private channel's member list (removed from the workspace,
	* a guest leaving a public channel, a role taken down). Every member's next
	* bootstrap carries the new keys; callers bump the workspace stamp, which
	* brings that bootstrap.
	*/
	async function bumpRingEpoch(wsId) {
		await kv().incr(KEYS.ws(wsId), { ke: 1 });
	}
	//#endregion
	//#region worker/signal.js
	/**
	* Wake whoever might care that a workspace just changed. `audience` is null
	* for the whole workspace (every shard gets a write) or an array of member
	* uuids (only their shards do); either way the write lands as one small
	* document per shard, batched into a single kv().set call, so a
	* broadcast-sized audience costs one call rather than up to EV_SHARDS. A
	* signal is a courtesy on top of the write that produced it, never part of
	* its correctness (a subscriber that misses it still catches up on the next
	* safety poll), so a failure here is swallowed rather than allowed to fail
	* that write.
	*
	* Two kinds of subscriber read these writes. A client from before ring
	* entries watches `s{n}` (EV_SHARDS) and polls on every write there, which
	* every signal still makes. A client that reads ring entries watches
	* `r{n}:*` and `o{n}` (EV_RING_SHARDS) instead: `entries` (`{ conv, body,
	* slim? }`, see worker/ring.js) are sealed into its audience's ring shards,
	* and `o{n}` is written only for what they do not carry — every shard of the
	* audience when there are no entries, one of them is null, or they could
	* not be written, and otherwise only the shards of `others` (members whose
	* own documents the same change moved; null for every shard).
	*
	* Gated first on whether anything could possibly be watching: on every
	* deployment today (Events off in most regions, KV share handles nowhere),
	* writing shard documents nobody can subscribe to would be a pure cost
	* regression the feature is supposed to avoid.
	*/
	/**
	* The one cached verdict that means nobody at all can watch: `events.enabled`
	* itself is off in this worker's region, which blocks even the owner's own
	* direct subscription (mode: 'own', see eventsBlock), not only a member's
	* handle. Every other refusal (kv handles off, consent missing, the mint
	* budget, a rate limit) only ever blocks *members* — the owner's own
	* subscription still works, so signalling must keep going for their sake,
	* which is the whole point of the owners-first rollout step.
	*/
	var TERMINAL_CODE = "events_disabled";
	var allShards = (count) => Array.from({ length: count }, (_, n) => n);
	var shardsOf = (uuids, fn) => [...new Set(uuids.map((u) => fn(u)))];
	async function signal(wsId, audience = null, { entries = null, ws = null, others = void 0 } = {}) {
		try {
			if (!workerAppUid()) return;
			const verdict = (await serverConfig()).ev;
			if (verdict && verdict.why === TERMINAL_CODE && verdict.until > Date.now()) return;
			const shards = audience === null ? allShards(4) : shardsOf(audience, evShard);
			const ringShards = audience === null ? allShards(8) : shardsOf(audience, evRingShard);
			if (!shards.length) return;
			const slots = entries?.length && entries.every(Boolean) ? await ringSlots(wsId, ws, entries, ringShards).catch(() => null) : null;
			let pings = ringShards;
			if (slots) pings = others === null ? allShards(8) : shardsOf(others || [], evRingShard);
			const t = Date.now();
			await kv().set([
				...slots || [],
				...pings.map((n) => ({
					key: KEYS.evPing(wsId, n),
					value: { t }
				})),
				...shards.map((n) => ({
					key: KEYS.evShard(wsId, n),
					value: { t }
				}))
			]);
		} catch {}
	}
	/**
	* The slot writes carrying `entries` to each of `ringShards`, numbered from
	* each shard's own counter (one incr for every shard), or null when the
	* entries cannot be sealed.
	*/
	async function ringSlots(wsId, ws, entries, ringShards) {
		if (!ringShards.length) return null;
		const doc = ws || await kv().get(KEYS.ws(wsId));
		if (!doc) return null;
		const sealed = await sealEntries(doc, entries);
		if (!sealed?.length) return null;
		const counters = await kv().incr(KEYS.evCounter(wsId), Object.fromEntries(ringShards.map((n) => [`s${n}`, sealed.length])));
		const out = [];
		for (const n of ringShards) {
			const top = Number(counters?.[`s${n}`]);
			if (!Number.isFinite(top) || top < sealed.length) return null;
			sealed.forEach((s, i) => {
				const num = top - sealed.length + 1 + i;
				out.push({
					key: KEYS.evRingSlot(wsId, n, num % 16),
					value: {
						n: num,
						...s
					}
				});
			});
		}
		return out;
	}
	//#endregion
	//#region worker/connect.js
	/**
	* Shared channels between workspaces, the part two workers need to agree
	* on: a signed attestation.
	*
	* A shared channel lives on its host workspace's worker; members of a
	* partner workspace take part as `external` members of the host, seeing
	* only that channel. The host cannot ask the partner's worker who its
	* members are (workers have no session for each other), so the partner
	* vouches for its own people: when the two workspaces are connected they
	* come to share a secret, and the partner's worker signs a short-lived
	* token naming one of its members. The host checks the signature against
	* the connection's secret and the named uuid against the Puter identity
	* of whoever presents the token, so a token is only ever good for the
	* person it names, and only for a few minutes.
	*
	*   token = base64url(JSON payload) "." hex(HMAC-SHA256(secret, payload))
	*   payload = { c: connectionId, u: memberUuid, k: 'join' | 'disconnect' | 'revoke', exp, iat }
	*
	* A `join` or `disconnect` token is presented by the person it names, and
	* is good for them alone. A `revoke` token names someone else: the partner
	* has taken a member out of its workspace (or made them a guest), and says
	* so to the host, which lets go of that person's seat at once rather than
	* a day later when their standing would have run out. It is signed on the
	* partner's worker when the admin acts, and carried to the host by the
	* admin's app, as every other word between the two workers is carried.
	*/
	/** How long an attestation is good for. Long enough for a round trip, short enough to be worthless later. */
	var ATTEST_TTL_MS = 6e5;
	/**
	* How long an external member stays a member of the host without a fresh
	* attestation. Their client re-attests silently (its own worker signs for
	* it while it is still a member there), so someone removed from the partner
	* workspace loses the shared channel within a day even if their app never
	* says goodbye.
	*/
	var EXTERNAL_TTL_MS = 864e5;
	var KINDS = [
		"join",
		"disconnect",
		"revoke"
	];
	function b64url(text) {
		const bytes = new TextEncoder().encode(text);
		let bin = "";
		for (const b of bytes) bin += String.fromCharCode(b);
		return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	}
	function unb64url(s) {
		const bin = atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4));
		const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	}
	async function hmac(secret, text) {
		const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(secret)), {
			name: "HMAC",
			hash: "SHA-256"
		}, false, ["sign"]);
		const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
		return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	/** Sign an attestation for one member of the partner workspace. */
	async function signAttestation(secret, { conn, uuid, kind, now = Date.now() }) {
		if (!KINDS.includes(kind)) throw new Error("Unknown attestation kind");
		const payload = JSON.stringify({
			c: conn,
			u: uuid,
			k: kind,
			iat: now,
			exp: now + ATTEST_TTL_MS
		});
		return `${b64url(payload)}.${await hmac(secret, payload)}`;
	}
	/**
	* Check a token against a connection's secret. Returns the payload when it
	* is genuine, unexpired, of the expected kind, for the expected connection,
	* and names `uuid`; null otherwise. Every failure looks the same to the
	* caller. With no `uuid` given (a revocation, which names the person it is
	* about rather than the one presenting it), the token is good for whoever
	* it names, and the caller reads that from the payload.
	*/
	async function verifyAttestation(secret, token, { conn, uuid, kind, now = Date.now() }) {
		const parts = String(token || "").split(".");
		if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[0-9a-f]{64}$/.test(parts[1])) return null;
		let text;
		let payload;
		try {
			text = unb64url(parts[0]);
			payload = JSON.parse(text);
		} catch {
			return null;
		}
		if (!payload || typeof payload !== "object") return null;
		if (!timingSafeEqual(await hmac(secret, text), parts[1])) return null;
		if (payload.c !== conn || payload.k !== kind) return null;
		if (typeof payload.u !== "string" || !payload.u || uuid !== void 0 && payload.u !== uuid) return null;
		if (!Number.isFinite(payload.exp) || payload.exp < now || !Number.isFinite(payload.iat) || payload.iat > now + 6e4) return null;
		if (payload.exp - payload.iat > 6e5) return null;
		return payload;
	}
	/** Shape checks shared by the routes on both sides. */
	var CONN_ID_RE = /^[a-z0-9]{10}$/;
	var SECRET_RE = /^[a-z0-9]{32}$/;
	/** A workspace reference as the client writes it: `{wsId}@{server}`. */
	var REF_RE = /^[a-z0-9]{6,20}@[a-z0-9][a-z0-9._:-]{0,120}$/;
	/** An invite code from puter.peer.serve() (`NJ-7F3A9C`), or a room name; nothing else is written. */
	var INVITE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;
	/** A tab's session id for its seat, made by the client; nothing else is written. */
	var SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
	/** One roster entry as stored, with only its live participants; null when nobody is left. */
	function liveHuddle(entry, now = Date.now()) {
		if (!entry || typeof entry !== "object" || !entry.m || typeof entry.m !== "object") return null;
		const m = {};
		for (const [uuid, p] of Object.entries(entry.m)) {
			if (!p || typeof p.at !== "number" || now - p.at >= 9e4) continue;
			m[uuid] = {
				at: p.at,
				j: typeof p.j === "number" ? p.j : p.at,
				inv: typeof p.inv === "string" ? p.inv : ""
			};
		}
		if (!Object.keys(m).length) return null;
		return {
			by: typeof entry.by === "string" ? entry.by : null,
			at: typeof entry.at === "number" ? entry.at : null,
			m
		};
	}
	/** Every live huddle in the activity document's `h` map, by conversation. */
	function liveHuddles(h, now = Date.now()) {
		const out = {};
		for (const [conv, entry] of Object.entries(h || {})) {
			const live = liveHuddle(entry, now);
			if (live) out[conv] = live;
		}
		return out;
	}
	/**
	* What a poll should tidy: `drop`, the paths of participants who have gone
	* quiet in huddles that carry on, and `ended`, the conversations whose
	* huddle has nobody live left (the whole entry goes, and the huddle is over).
	*/
	function stalePaths(h, now = Date.now()) {
		const drop = [];
		const ended = [];
		for (const [conv, entry] of Object.entries(h || {})) {
			if (!entry || typeof entry !== "object") {
				ended.push(conv);
				continue;
			}
			const live = liveHuddle(entry, now);
			if (!live) {
				ended.push(conv);
				continue;
			}
			for (const uuid of Object.keys(entry.m || {})) if (!live.m[uuid]) drop.push(`h.${conv}.m.${uuid}`);
		}
		return {
			drop,
			ended
		};
	}
	/** A duration for the "huddle ended" line: "less than a minute", "12 min", "1 hr 5 min". */
	function durationText(ms) {
		const minutes = Math.round(Math.max(0, ms) / 6e4);
		if (minutes < 1) return "less than a minute";
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m ? `${h} hr ${m} min` : `${h} hr`;
	}
	//#endregion
	//#region worker/index.js
	/**
	* Teamchat API: a Puter Serverless Worker.
	*
	* Every workspace owner runs a copy of this worker in their own Puter
	* account (the app deploys it for them), so a workspace's data lives in its
	* owner's key-value store (me.puter.kv), which is what lets every member
	* read and write the same channels, and the owner pays for it. Callers are
	* identified by the Puter session that puter.workers.exec() forwards;
	* nothing about identity is trusted from request bodies. Only the owner may
	* create workspaces here (see assertMayCreate); members of other people's
	* workspaces only ever touch data inside those workspaces.
	*
	* Storage layout (no kv.list anywhere; every read is a direct get):
	*
	*   tc:config                 { owner, open } who runs this worker
	*   tc:user:{uuid}            profile card + the user's workspace ids here
	*   tc:ws:{ws}                workspace: name, invite, channels{}, members{}, former{} (who left), removed{} (externals kept out)
	*   tc:ws:{ws}:u:{uuid}       per-member state: channels, dms, reads, mentions, notify, threads
	*   tc:ws:{ws}:act            activity: c{conv: {s,t,u,x}}, p{uuid: seen}, t{conv: {uuid: ts}}, w, u{},
	*                             h{conv: { by, at, m{uuid: {at, j, inv}} }} the huddles in progress (src/shared/huddle.js),
	*                             he{conv: {t{at}: claims}} who writes a huddle's "ended" line (endHuddle)
	*   tc:invite:{code}          { ws } | { ws, ch, role: 'guest' | 'connect' }
	*   tc:connect:{id}           a shared channel's connection: host side { ws, ch, partner, name, secret },
	*                             partner side { ws, ch, ref, rch, secret } (see worker/connect.js)
	*   tc:conv:{conv}:seq        message counter (kv.incr)
	*   tc:conv:{conv}:b:{n}      message block n: { m: [...], x: {overlays} }
	*   tc:file:{id}              attachment metadata (bytes live in me.puter.fs)
	*   tc:ws:{ws}:pins:{conv}    pinned messages: { items: [{ seq, by, ts }] }
	*   tc:ws:{ws}:u:{uuid}:inbox   activity inbox ring: { items: [{ k, c, s, by, ts }] }
	*   tc:ws:{ws}:u:{uuid}:threads followed threads: { t: { [threadId]: { c, s, at } } }
	*   tc:ws:{ws}:u:{uuid}:saved   saved for later: { items: [{ c, s, ts, done }] }
	*   tc:ws:{ws}:sched          due queue: { m: { [id]: scheduled message | reminder } }; act.nd = next due time
	*   tc:unfurl:{sha256(url)}   a link preview, cached with a TTL (negative results briefly)
	*   tc:hook:{id}              incoming webhook: { ws, ch, name, color, hash } (the token's secret is only ever hashed)
	*   tc:bot:{id}               bot token: { ws, name, color, hash, scopes, channels }
	*   tc:ws:{ws}:idx:m{yyyymm}:{n}  search index, month bucket, shard n: { token: [postings] }
	*   tc:ws:{ws}:idx:meta       the index's counters and months: { c, folded, failed, months }
	*   tc:ws:{ws}:idx:log:{s}    log segment s: postings waiting to be folded into the shards
	*   tc:ws:{ws}:idx:{n}        the index from before month buckets, read until the workspace is rebuilt
	*/
	/** Inbox entries one person's reactions to one message may leave its author. */
	var REACTION_NOTICES = 3;
	var now = () => Date.now();
	/**
	* A caller-supplied id looked up in a map: own properties only, so names
	* inherited from Object.prototype (`constructor`, `__proto__`) can never
	* pass for a channel, member, conversation, or token that exists.
	*/
	var own = (obj, key) => obj && typeof obj === "object" && Object.hasOwn(obj, key) ? obj[key] : void 0;
	var isAdmin = (member) => member && (member.role === "owner" || member.role === "admin");
	/** Guests came in through a channel invite: they see only the channels they are in and the people in them. */
	var isGuest = (member) => member && member.role === "guest";
	/**
	* External members belong to another workspace and take part in a channel
	* shared with it (see worker/connect.js). They are labelled with their
	* organization, cannot be promoted, and are never added to other channels.
	*/
	var isExternal = (member) => member && member.role === "external";
	/** Guests and externals alike: their view of the workspace is the channels they are in. */
	var isLimited = (member) => isGuest(member) || isExternal(member);
	/**
	* How a refusal names a limited member's standing. Someone from a connected
	* workspace who asked to create or change a channel here, add people to
	* one, or have this workspace vouch for them was told what guests cannot
	* do, and they are no guest: the word is for the caller.
	*/
	var limitedWho = (member) => isExternal(member) ? "People from a connected workspace" : "Guests";
	/**
	* A channel entry that stands for a channel hosted on another workspace:
	* `shared` names the host and the channel there. Nothing is ever posted
	* into it here; it puts the channel in this workspace's sidebar and lets
	* this worker vouch for its members to the host.
	*/
	var isPartnerEntry = (channel) => !!(channel && channel.shared && typeof channel.shared === "object");
	/**
	* The caller's card on this worker: display name, title, color, plus the
	* ids of their workspaces here. The card is a copy of the profile the app
	* keeps in the user's own account; `seed` carries that profile along with
	* the requests that first bring a user to a worker (create, join), and
	* PUT /api/me refreshes it later.
	*/
	async function ensureProfile(id, seed = null, { known = void 0 } = {}) {
		const key = KEYS.user(id.uuid);
		let profile = known === void 0 ? await kv().get(key) : known;
		let renamed = false;
		if (!profile) {
			profile = {
				uuid: id.uuid,
				username: id.username,
				name: id.username,
				title: "",
				color: colorSlot(id.uuid),
				workspaces: [],
				createdAt: now(),
				...profilePatch(seed)
			};
			await kv().set(key, profile);
		} else if (profile.username !== id.username && id.username) {
			profile.username = id.username;
			await kv().update(key, { username: id.username });
			renamed = true;
		}
		if (!Array.isArray(profile.workspaces)) profile.workspaces = [];
		const distinct = [...new Set(profile.workspaces)];
		if (distinct.length !== profile.workspaces.length) {
			profile.workspaces = distinct;
			await kv().update(key, { workspaces: distinct }).catch(() => {});
		}
		const patch = profilePatch(seed);
		const changed = Object.fromEntries(Object.entries(patch).filter(([k, v]) => JSON.stringify(profile[k] ?? null) !== JSON.stringify(v ?? null)));
		if (Object.keys(changed).length) {
			Object.assign(profile, changed);
			await kv().update(key, changed);
		}
		const onCards = {
			...renamed ? { username: id.username } : {},
			...changed
		};
		if (Object.keys(onCards).length) await syncCards(profile, onCards);
		return profile;
	}
	/**
	* Validate a profile body into a patch of name, title, color, status, and
	* the avatar version; unknown or invalid fields are dropped. The avatar
	* version only says a photo exists (the bytes arrive separately); a status
	* is an emoji, a short text, and an optional expiry.
	*/
	function profilePatch(body, { strict = false } = {}) {
		const patch = {};
		if (!body || typeof body !== "object") return patch;
		if (typeof body.name === "string") {
			const name = cleanLine(body.name, LIMITS.displayName);
			if (name) patch.name = name;
			else if (strict) fail(400, "invalid", "Display name cannot be empty");
		}
		if (typeof body.title === "string") patch.title = cleanLine(body.title, LIMITS.title);
		if (Number.isInteger(body.color) && body.color >= 1 && body.color <= 8) patch.color = body.color;
		if (body.status === null) patch.status = null;
		else if (body.status && typeof body.status === "object") {
			const text = cleanLine(body.status.text, LIMITS.statusText);
			const emoji = cleanLine(body.status.emoji, 16);
			const until = Number.isFinite(body.status.until) && body.status.until > 0 ? Math.floor(body.status.until) : null;
			patch.status = text || emoji ? {
				emoji,
				text,
				until
			} : null;
		}
		return patch;
	}
	function memberRecord(profile, role) {
		return {
			username: profile.username,
			name: profile.name || profile.username,
			title: profile.title || "",
			color: profile.color || colorSlot(profile.uuid),
			avatar: profile.avatar || null,
			status: profile.status || null,
			role,
			joinedAt: now()
		};
	}
	/**
	* A one-line field as cards, headers and lists show it (a display name, a
	* title, a status, a workspace's name, a reminder's note, a channel's topic
	* and description and its bookmarks' labels). The control
	* characters (C0 but tab and newline, C1) and the bidi embedding, override
	* and isolate characters come out before the trim, and what is left must
	* have a mark to show: a name of a bell character, or of zero-width joiners
	* alone, passed as a name and drew as none, and a name opened with a
	* right-to-left override turned the rest of its line around (the time
	* beside it, the text after it), the override running to the end of the
	* paragraph while a name sits inline. Joiners and non-joiners inside stay:
	* emoji sequences and Persian and Indic words are written with them; so do
	* the plain left-to-right and right-to-left marks. Message text is not
	* this: the renderer draws it as content, in a block of its own.
	*/
	var LINE_CONTROLS_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
	var LINE_VISIBLE_RE = /[\p{L}\p{N}\p{P}\p{S}\p{M}]/u;
	/**
	* Letters and symbols by category that draw as nothing all the same: the
	* Hangul fillers (the conjoining choseong and jungseong fillers, the
	* compatibility filler, its halfwidth form) and the braille pattern with no
	* dots. Each passes for a mark to show by its category alone, and a name, a
	* title or a workspace's name made of them alone was taken and drew as an
	* empty space wherever it was shown. They stay in a line that has something
	* else to show (a name may carry one), and count for nothing in deciding
	* whether it has.
	*/
	var LINE_BLANK_RE = /[\u115F\u1160\u3164\uFFA0\u2800]/g;
	/**
	* A line of combining marks alone (accents, vowel signs, variation
	* selectors), with nothing for them to sit on: each is a mark by category
	* and passed for something to show, and a name or a workspace's name made
	* of them alone was taken and drew as a few stray accents on nothing, or as
	* nothing at all. A mark on a letter stays, as every accented or Indic name
	* needs it to.
	*/
	var LINE_MARKS_ONLY_RE = /^[\p{M}\s]*$/u;
	/**
	* What no address carries (see the bookmark route): the controls a line is
	* cleaned of, and the zero-width and directional marks a name may keep but
	* an address has no use for, since each reads as nothing where the address
	* is shown and sends the link somewhere other than where it appears to go.
	*/
	var URL_CONTROLS_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;
	function cleanLine(input, max) {
		if (typeof input !== "string") return "";
		const s = cleanText(input.replace(LINE_CONTROLS_RE, ""), max);
		const shown = s.replace(LINE_BLANK_RE, "");
		return LINE_VISIBLE_RE.test(shown) && !LINE_MARKS_ONLY_RE.test(shown) ? s : "";
	}
	/**
	* Refuse an upload whose declared length is past the route's cap before its
	* body is read: a multipart body is parsed whole (request.formData holds it
	* in the worker's memory), and the file's size was checked only after that,
	* so a body of any length was buffered on the owner's worker before it was
	* refused. The declared length may run a little past the file (the parts'
	* boundaries and headers, a long file name; `MULTIPART_MARGIN`), so only one
	* past the cap by more than that is refused here, with the words the route
	* refuses the file with; a body sent without a length, or with one that does
	* not parse, is read and measured as before.
	*/
	var MULTIPART_MARGIN = 65536;
	function assertDeclaredSize(request, cap, words) {
		const declared = Number(request.headers?.get?.("content-length"));
		if (Number.isFinite(declared) && declared > cap + MULTIPART_MARGIN) fail(413, "too_large", words);
	}
	/** Where a member's photo bytes live in this worker's drive. */
	var avatarPath = (uuid) => `teamchat-avatars/${uuid}`;
	/** A workspace's icon, in its owner's drive like its attachments. */
	var iconPath = (wsId) => `teamchat-icons/${wsId}`;
	/**
	* Put a workspace on someone's own list of them (what /api/me answers from,
	* and what a change of name or photo reaches their cards through) by an
	* atomic append, and take a second copy off again where the answer shows
	* one: two tabs finding the workspace missing at once (opening one a move
	* or an import carried the member into, renewing a seat in a shared channel,
	* opening an invite link again after a join cut short) each appended it, and
	* the list named the workspace twice. The join of a newcomer takes its own
	* append as a claim and is not this (see /api/join).
	*/
	async function listWorkspace(uuid, wsId) {
		const res = await kv().add(KEYS.user(uuid), { workspaces: [wsId] });
		const list = res && Array.isArray(res.workspaces) ? res.workspaces : null;
		if (list && list.filter((w) => w === wsId).length > 1) await kv().update(KEYS.user(uuid), { workspaces: [...new Set(list)] }).catch(() => {});
	}
	/** Write a profile field to every workspace card the caller really holds. */
	async function syncCards(profile, patch) {
		const docs = await getMany(profile.workspaces.map((w) => KEYS.ws(w)));
		const room = (doc) => {
			const card = doc.members[profile.uuid];
			if (JSON.stringify({
				...card,
				...patch
			}).length <= JSON.stringify(card).length) return true;
			return JSON.stringify(doc).length <= WS_DOC_BYTES;
		};
		const held = profile.workspaces.filter((w, i) => docs[i]?.members?.[profile.uuid] && room(docs[i]));
		const upd = {};
		for (const [k, v] of Object.entries(patch)) upd[`members.${profile.uuid}.${k}`] = v;
		for (let i = 0; i < held.length; i += 12) await Promise.all(held.slice(i, i + 12).map(async (wsId) => {
			const res = await kv().update(KEYS.ws(wsId), upd).catch(() => null);
			await Promise.all([res === null ? null : cardStands(wsId, profile.uuid, res, Object.keys(patch)).catch(() => {}), bumpWorkspace(wsId).catch(() => {})]);
		}));
	}
	/**
	* Is the member still here after a path write under their card? A write
	* of one field of a card (a role, a renewed standing, a synced name) makes
	* a card where there is none: someone who left, or was shown the door,
	* between the caller's read of the workspace and its write came back as
	* that field alone, and a card is membership here. The departed member
	* opened the workspace again with no role at all (a plain member's
	* standing) or the very role just written, admin included, and someone
	* from a connected workspace an admin had removed walked back in past the
	* list that keeps them out. A stub holds the fields this write put there
	* and nothing else (`fields`), while a real card, whatever its age or
	* origin, holds more than any one write of these puts; one made of the
	* written fields alone is taken off again here. `res` is what the store
	* handed back from the write; a store that hands back nothing is read again.
	*/
	async function cardStands(wsId, uuid, res, fields) {
		const answered = !!(res && typeof res === "object" && res.members);
		let doc = answered ? res : await kv().get(KEYS.ws(wsId));
		let card = own(doc?.members || {}, uuid);
		if (!card) return false;
		const written = new Set(fields);
		const whole = (c) => Object.keys(c).some((k) => !written.has(k));
		if (whole(card)) return true;
		if (answered) {
			doc = await kv().get(KEYS.ws(wsId));
			card = own(doc?.members || {}, uuid);
			if (!card) return false;
			if (whole(card)) return true;
		}
		await kv().remove(KEYS.ws(wsId), `members.${uuid}`).catch(() => {});
		return false;
	}
	/**
	* Is the channel still here after a path write under it? A counter or a
	* field written under a channel deleted between the caller's read of the
	* workspace and its write (someone joining or leaving the channel, or being
	* added to it, as it went) makes an entry of that field alone, as such a
	* write under a card does (see cardStands): a channel with no name, listed
	* to everyone, and open to posts from whoever's document still named it,
	* whose blocks then came back. A real channel carries its id, from the
	* moment it is made; an entry without one is the write's alone and is
	* taken off again. `res` is what the store handed back from the write; a
	* store that hands back nothing is read again. (loadWorkspace sweeps such
	* entries too, for the writes that do not look.)
	*/
	async function channelStands(wsId, ch, res) {
		const answered = !!(res && typeof res === "object" && res.channels);
		let doc = answered ? res : await kv().get(KEYS.ws(wsId));
		let c = own(doc?.channels || {}, ch);
		if (c && typeof c.id === "string") return true;
		if (c && answered) {
			doc = await kv().get(KEYS.ws(wsId));
			c = own(doc?.channels || {}, ch);
			if (c && typeof c.id === "string") return true;
		}
		if (c) await kv().remove(KEYS.ws(wsId), `channels.${ch}`).catch(() => {});
		return false;
	}
	/**
	* Is the workspace still here after a newcomer's card was written into it?
	* A card written under a workspace its owner deleted between the join's
	* read of it and the write (see cardStands, channelStands) makes a
	* document of the card alone where the workspace was: no name, no owner,
	* no channels, one member. The newcomer was told they had joined, their
	* list named a workspace with no name that nobody could delete (deleting
	* is the owner's, and it had none), and their next steps wrote a "joined"
	* line and a member document under it. A workspace carries its id from the
	* moment it is made; a document without one is the write's alone, and the
	* card comes off it again. `res` is what the store handed back from the
	* write; a store that hands back nothing is read again.
	*/
	async function workspaceStands(wsId, uuid, res) {
		const answered = !!(res && typeof res === "object" && res.members);
		let doc = answered ? res : await kv().get(KEYS.ws(wsId));
		if (doc && typeof doc.id === "string") return true;
		if (doc && answered) {
			doc = await kv().get(KEYS.ws(wsId));
			if (doc && typeof doc.id === "string") return true;
		}
		if (doc) await kv().remove(KEYS.ws(wsId), `members.${uuid}`).catch(() => {});
		return false;
	}
	/** Whether a workspace id could name one here at all, judged without a read. */
	var validWsId = (wsId) => /^[a-z0-9]{6,20}$/.test(String(wsId));
	/**
	* A conversation id as this worker ever mints one (a channel's, a direct
	* message's, a thread's): enough to know a key built from it is safe to read
	* before the id has been resolved against the workspace.
	*/
	var looksLikeConvId = (conv) => /^[a-z0-9_]{1,64}$/.test(String(conv));
	/**
	* The workspace document as the routes use it, from what the store handed
	* back. Split out of loadWorkspace so a caller that read the document
	* itself — requireMembership reads it beside identify, rather than after it
	* — does not read it a second time to get the same tidying.
	*/
	async function normalizeWorkspace(wsId, ws) {
		if (!ws) fail(404, "not_found", "Workspace not found");
		ws.channels = ws.channels || {};
		ws.members = ws.members || {};
		const stubs = Object.entries(ws.channels).filter(([, c]) => !c || typeof c !== "object" || typeof c.id !== "string").map(([cid]) => cid);
		if (stubs.length) {
			for (const cid of stubs) delete ws.channels[cid];
			if (!ws.movedTo && !ws.importing && !frozen(ws)) await kv().remove(KEYS.ws(wsId), ...stubs.map((cid) => `channels.${cid}`)).catch(() => {});
		}
		for (const c of Object.values(ws.channels)) if (Array.isArray(c.members) && new Set(c.members).size !== c.members.length) c.members = [...new Set(c.members)];
		return ws;
	}
	/**
	* Put people on a private channel's member list. An atomic append, not a
	* rewrite of the list read at the top of the request: two people accepting
	* the same invite at once (a link pasted in chat) each rewrote the list
	* they had read, and one of them was then in the channel (their own member
	* document says so) but off its list, so never mentioned, pushed, shown to
	* guests or counted, with nothing to repair it.
	*/
	async function addPrivateMember(wsId, ch, uuids) {
		const list = (Array.isArray(uuids) ? uuids : [uuids]).filter(Boolean);
		if (list.length) await kv().add(KEYS.ws(wsId), { [`channels.${ch}.members`]: list });
	}
	/**
	* Put a channel on a member's own document, the append that makes them a
	* member of it. The caller has read the document and found the channel
	* missing; two requests for the same person at once (a join from two tabs,
	* two admins adding them) both did, both appended, and both then counted
	* the person into the channel and announced them, so the channel counted
	* one person twice for good (leaving took one off). When the store hands
	* the document back, a second copy of the channel on it says this request
	* lost: the copy is taken off again and the caller treats the person as
	* already in.
	*
	* The document the store hands back is also where the caller learns that
	* the person is on their way out, or what they are being made, in the same
	* instant. Membership is two documents: the member's own, which the append
	* claims, and the workspace's, which carries their card and every channel's
	* count. Taking someone out of the workspace reads their document, counts
	* them out of each channel on it, and deletes it; an append landing after
	* that read and before the deletion was counted in by its caller and out by
	* nobody, so the channel counted a person no longer here, for good, and one
	* landing after the deletion made a document of the channel alone under
	* someone gone. So the removal closes the document first, with a stamp
	* (`gone`) whose write hands back the very list it then counts from (see
	* DELETE /api/ws/:ws/members/:uuid): an append that finds the stamp is one
	* the removal did not see, and answers 'gone', counting nothing; one that
	* does not is on the removal's list, and both count. A document that had a
	* `joinedAt` when the caller read it (`doc`) and has none now was deleted in
	* between, and this append made one of the channel alone: it goes again,
	* and the answer is 'gone'. A stamp older than a delivery's hold is a
	* removal that died, and is no longer one.
	*
	* Likewise a change of role, which decides whether the person is counted
	* among a channel's guests: it is written on the member's document before
	* the card (see the role route), and the document handed back here says
	* what they are as of this append (`role`), which the caller counts by
	* where the document says nothing (a document from before roles were kept
	* there), the card as the caller read it decides, as before.
	*
	* Returns { status, role }: 'entered' when this call put them in, 'already'
	* when another request for the same person did, 'gone' as above.
	*/
	async function enterChannel(wsId, uuid, ch, doc = null) {
		const key = KEYS.member(wsId, uuid);
		const existed = Number.isFinite(doc?.joinedAt);
		let res;
		try {
			res = await kv().add(key, { channels: [ch] });
		} catch (e) {
			if (await kv().get(key)) throw e;
			if (existed) return {
				status: "gone",
				role: null
			};
			await kv().set(key, { channels: [ch] });
			return {
				status: "entered",
				role: null
			};
		}
		const looksLikeDoc = (d) => !!d && typeof d === "object" && !Array.isArray(d) && Array.isArray(d.channels);
		let after = looksLikeDoc(res) ? res : await kv().get(key).catch(() => void 0);
		const answered = after === res;
		if (after === null) return {
			status: existed ? "gone" : "entered",
			role: null
		};
		if (!looksLikeDoc(after)) return {
			status: "entered",
			role: null
		};
		if (existed && !Object.hasOwn(after, "joinedAt")) {
			const fresh = answered ? await kv().get(key).catch(() => void 0) : after;
			if (fresh === null) return {
				status: "gone",
				role: null
			};
			if (!looksLikeDoc(fresh)) return {
				status: "entered",
				role: null
			};
			if (!Object.hasOwn(fresh, "joinedAt")) {
				await kv().del(key).catch(() => {});
				return {
					status: "gone",
					role: typeof fresh.role === "string" ? fresh.role : null
				};
			}
			after = fresh;
		}
		const role = typeof after.role === "string" ? after.role : null;
		const list = after.channels;
		const lost = list.filter((c) => c === ch).length >= 2;
		if (typeof after.gone === "number" && after.gone + SCHED_CLAIM_MS > now()) {
			if (!lost) await kv().update(key, { channels: list.filter((c) => c !== ch) }).catch(() => {});
			return {
				status: "gone",
				role
			};
		}
		if (!lost) return {
			status: "entered",
			role
		};
		await kv().update(key, { channels: list.filter((c, i) => c !== ch || list.indexOf(ch) === i) }).catch(() => {});
		return {
			status: "already",
			role
		};
	}
	/**
	* Close a member's document before they are counted out of their channels:
	* the stamp's write hands back the list as it stands at that instant, which
	* is the list the caller counts from (see enterChannel), so a channel
	* appended after it is counted by nobody and one appended before it is
	* counted out as it was counted in. A store that hands nothing back is read
	* again (an append landing between the two is then counted out and not in,
	* a window the store's own answer closes).
	*/
	async function closeMemberDoc(wsId, uuid) {
		const key = KEYS.member(wsId, uuid);
		const res = await kv().update(key, {
			gone: now(),
			jc: 0
		}).catch(() => null);
		if (res && typeof res === "object" && !Array.isArray(res) && Object.hasOwn(res, "gone") && Array.isArray(res.channels)) return res;
		return await kv().get(key) || {};
	}
	/**
	* Write a member's new role on their own document ahead of their card (see
	* enterChannel, and the role route), and hand back the document as the
	* store returned it, or as read again where the store returns nothing: the
	* list of channels on it is the one the caller counts by.
	*/
	async function writeDocRole(wsId, uuid, role) {
		const key = KEYS.member(wsId, uuid);
		const snap = await kv().update(key, { role });
		return snap && typeof snap === "object" && Array.isArray(snap.channels) ? snap : await kv().get(key) || {};
	}
	/**
	* A member's own document as it stands after a write to it: the write's
	* answer where that is the document, their channels on it, and the document
	* read again where it is not (the part that changed, a count, nothing).
	* What the caller reads off it is what landed on the document ahead of the
	* card, as of its own write: the role a change of role put there (see
	* writeDocRole, and enterChannel, which reads it off the append), and the
	* stamp a removal closed it with (see closeMemberDoc). Null where there is
	* no document to read (deleted since the write), undefined where the read
	* itself failed.
	*/
	async function memberDocAfter(wsId, uuid, res) {
		if (res && typeof res === "object" && !Array.isArray(res) && Array.isArray(res.channels)) return res;
		return kv().get(KEYS.member(wsId, uuid)).catch(() => void 0);
	}
	/**
	* The role written ahead of a card that turned out to be gone (see
	* cardStands) is undone: a document the write made, of the role alone, is
	* one nobody had, and goes; one that was there is being deleted by whoever
	* took the card (a removal deletes the document after the card), and is
	* left to them, since a path removal of ours landing after their deletion
	* would make a document of nothing where theirs had been.
	*/
	async function unwriteDocRole(wsId, uuid, snap) {
		const key = KEYS.member(wsId, uuid);
		const doc = snap && typeof snap === "object" ? snap : await kv().get(key).catch(() => null);
		if (doc && !Object.hasOwn(doc, "joinedAt") && !Object.hasOwn(doc, "channels")) await kv().del(key).catch(() => {});
	}
	/**
	* A role that landed on a member's document (`doc`, as that write handed it
	* back) but never on their card, the card taken between the two by a
	* removal (see cardStands): the removal closed the document after the role
	* was on it (closed before, it answers `gone` to the role's write, which
	* then writes nothing more) and counted them out of every channel on it as
	* what they were being made (see dropMembership), while the channels they
	* were in when the role landed had counted them in as what they were. Each
	* is made even here: counted among the guests once more where a member on
	* their way out was made a guest, counted out where a guest was made a
	* member. A channel entered since the role landed was counted in and out
	* alike, as what they were being made, and is not on `doc`.
	*/
	async function evenGuestCounts(ws, doc, from, to) {
		const delta = (to === "guest" ? 1 : 0) - (from === "guest" ? 1 : 0);
		if (!delta) return;
		await incrPaths(KEYS.ws(ws.id), Object.fromEntries((doc?.channels || []).filter((ch) => ws.channels[ch]).map((ch) => [`channels.${ch}.guests`, delta])));
	}
	/**
	* Someone entering a channel starts at its present: their cursor is set to
	* what stands there, and the count of mentions they carried for it goes
	* with the history behind that cursor. A member may be named in a public
	* channel they are not in (its messages are theirs to read, so a mention
	* there counts for them and lands in their Activity), and one who left a
	* channel keeps the count of what they had not read in it: entered caught
	* up, the channel's row and the rail badged that count over a cursor that
	* said nothing was waiting, until the channel was opened. `doc` is the
	* member's document as the caller read it; nothing is written when it
	* carried no count.
	*/
	var caughtUpMentions = (doc, ch) => Number(doc?.mentions?.[ch]) > 0 ? { [`mentions.${ch}`]: 0 } : {};
	/**
	* A workspace that was transferred stays here read-only: reads work so
	* nothing is lost while the move settles, writes answer 423 with the new
	* reference so clients can follow it. One still being imported is not open
	* either: its history is being written seq by seq from the archive, and a
	* write that lands a line in a conversation meanwhile (someone joining a
	* channel, a policy change) takes the very number the archive's next page
	* brings for a message of its own, which is then kept out for good.
	*/
	/**
	* How long a transfer freeze holds without renewal. The nominee's app sets
	* it before exporting this copy (POST /transfer/begin) and renews it while
	* the export and the import into the new copy run; completing or cancelling
	* lets go of it, and one whose export died lets go on its own, so nobody's
	* workspace is locked for good by a tab that closed. Everything written
	* here between the export and the completion existed only in a copy about
	* to be marked moved, and was lost to the move: a message posted, a channel
	* made, a pin, a reaction, a member joined.
	*/
	var TRANSFER_FREEZE_MS = 18e5;
	var frozen = (ws) => !!(ws.transferring && typeof ws.transferring === "object" && (Number(ws.transferring.at) || 0) + TRANSFER_FREEZE_MS > now());
	/**
	* A copy that has moved takes no write at all, the member's own state
	* included (a thread followed, a message saved, a badge cleared, a cursor
	* moved): written into the copy left behind, as they used to be by the
	* routes that write during a freeze (see assertWritable's `write` callers
	* and the ones without it), the change was answered as done and never
	* reached the copy everyone moves to, so a thread followed in the moment
	* after the move was not followed there, and a message saved was not saved.
	* Refused, the app is told the workspace moved, as it is for a post.
	*/
	function assertNotMoved(ws) {
		if (ws.movedTo) fail(423, "moved", `This workspace moved to ${ws.movedTo}; this copy is read-only`);
	}
	function assertWritable(ws, { moving = false } = {}) {
		assertNotMoved(ws);
		if (ws.importing) fail(409, "importing", "This workspace is still being imported; try again in a moment");
		if (!moving && frozen(ws)) fail(423, "transferring", "This workspace is being moved to another server; try again in a few minutes");
	}
	/**
	* Who is calling, the workspace, and the caller's own document — in one
	* round of calls where the caller is already known, and two where they are
	* not.
	*
	* Every key a route wants is either the workspace's or the caller's, and the
	* caller's needs their uuid. Where that is already in hand — a uuid passed
	* in, or an identity still good from a moment ago (see peekIdentity) — all
	* of them go in a single batched read: the workspace, the caller's document,
	* and whatever else the route asked for (`also`, answered as `extra`).
	*
	* Where it is not, asking Puter is an HTTP call of its own, so it runs
	* beside the workspace read rather than in front of it, and only the
	* caller's own keys wait on it. Done one after another, as it used to be,
	* every request here began with three round trips before it looked at
	* anything.
	*
	* Nothing is read for a request carrying no session at all: identify refuses
	* that without a call of its own, and starting the workspace read beside it
	* would have every unauthenticated request cost the owner a read.
	*/
	async function requireMembership(wsId, who, { write = false, lapsed = false, doc: withDoc = true, also = null } = {}) {
		const known = typeof who === "string" ? { uuid: who } : null;
		if (!validWsId(wsId)) {
			if (!known) await identify(who);
			fail(404, "not_found", "Workspace not found");
		}
		const keysOf = (id) => typeof also === "function" ? also(id) || [] : also ? [...also] : [];
		const ready = known || await peekIdentity(who);
		let id = ready;
		let wsRaw;
		let read = [];
		if (ready) {
			const want = keysOf(ready);
			const mine = withDoc ? [KEYS.member(wsId, ready.uuid)] : [];
			[wsRaw, ...read] = await getMany([
				KEYS.ws(wsId),
				...mine,
				...want
			]);
		} else {
			const [idRes, wsRes] = await Promise.allSettled([identify(who), who?.puter ? kv().get(KEYS.ws(wsId)) : null]);
			if (idRes.status === "rejected") throw idRes.reason;
			if (wsRes.status === "rejected") throw wsRes.reason;
			id = idRes.value;
			wsRaw = wsRes.value;
		}
		const ws = await normalizeWorkspace(wsId, wsRaw);
		const member = ws.members[id.uuid];
		if (!member) fail(403, "forbidden", "You are not a member of this workspace");
		if (!lapsed) assertAttested(member);
		if (write) assertWritable(ws);
		if (!ready) {
			const want = keysOf(id);
			read = withDoc || want.length ? await getMany([...withDoc ? [KEYS.member(wsId, id.uuid)] : [], ...want]) : [];
		}
		const extra = withDoc ? read.slice(1) : read;
		if (!withDoc) return {
			id,
			uuid: id.uuid,
			ws,
			member,
			doc: null,
			extra
		};
		const doc = read[0] || {};
		doc.channels = Array.isArray(doc.channels) ? doc.channels : [];
		doc.dms = doc.dms || {};
		doc.reads = doc.reads || {};
		doc.mentions = doc.mentions || {};
		doc.notify = doc.notify || {};
		doc.threads = doc.threads || {};
		doc.inbox = doc.inbox || 0;
		return {
			id,
			uuid: id.uuid,
			ws,
			member,
			doc,
			extra
		};
	}
	/**
	* An external member's standing here is what their own workspace last
	* vouched for; past that, every route answers `reattest` and their client
	* asks its own worker for a fresh attestation (see /api/connect/join).
	*/
	function assertAttested(member) {
		if (isExternal(member) && (Number(member.exp) || 0) < now()) fail(403, "reattest", "Your access to this shared channel needs renewing");
	}
	/**
	* What conversation is this id, and may the caller read or post to it?
	* Threads resolve through their parent. Public channels are readable by any
	* workspace member (preview), but posting needs membership, and a channel
	* may limit posting to admins (postPolicy) and replies to admins or nobody
	* (threadPolicy); `deny` names the reason posting is refused.
	*/
	function resolveConv(ctx, convId) {
		const thread = parentOfThread(convId);
		if (thread) {
			if (thread.seq < 1 || threadConvId(thread.conv, thread.seq) !== convId || parentOfThread(thread.conv)) fail(404, "not_found", "Conversation not found");
			const base = resolveConv(ctx, thread.conv);
			let canPost = base.canRead && base.joined && !base.channel?.archived;
			let deny = base.channel?.archived ? "archived" : !base.joined ? "not_joined" : null;
			const policy = base.channel?.threadPolicy || "everyone";
			if (canPost && policy === "off") {
				canPost = false;
				deny = "threads_off";
			} else if (canPost && policy === "admins" && !isAdmin(ctx.member)) {
				canPost = false;
				deny = "threads_admins";
			}
			return {
				...base,
				kind: "thread",
				id: convId,
				parent: thread,
				base,
				canPost,
				deny
			};
		}
		const { ws, doc } = ctx;
		const channel = own(ws.channels, convId);
		if (channel) {
			if (isPartnerEntry(channel)) fail(404, "shared_elsewhere", "This channel lives on another workspace");
			const joined = doc.channels.includes(convId);
			if ((channel.private || isLimited(ctx.member)) && !joined) fail(404, "not_found", "Conversation not found");
			const adminsOnly = channel.postPolicy === "admins" && !isAdmin(ctx.member);
			return {
				kind: "channel",
				id: convId,
				channel,
				joined,
				canRead: true,
				canPost: joined && !channel.archived && !adminsOnly,
				deny: channel.archived ? "archived" : !joined ? "not_joined" : adminsOnly ? "read_only" : null
			};
		}
		const dm = own(doc.dms, convId);
		if (dm) return {
			kind: "dm",
			id: convId,
			dm,
			joined: true,
			canRead: true,
			canPost: true
		};
		fail(404, "not_found", "Conversation not found");
	}
	/**
	* The stamps only order: a poller refetches when the one it is told is
	* greater than the one it holds. Counting up from the time the document was
	* created (rather than writing the clock) makes every bump visible — two in
	* one millisecond, or one landing in the millisecond a client read the
	* document, used to leave the stamp where it was, and the change unseen
	* until the next.
	*/
	async function bumpWorkspace(wsId) {
		await kv().incr(KEYS.activity(wsId), { w: 1 });
		await signal(wsId, null);
	}
	/** Tell one member (through the activity doc) that their own state changed. */
	async function pokeMember(wsId, uuid) {
		await kv().incr(KEYS.activity(wsId), { [`u.${uuid}`]: 1 });
		await signal(wsId, [uuid]);
	}
	/**
	* Who could care that a conversation changed, for the signal that goes with
	* it (see worker/signal.js): null for a public channel (anyone might be
	* reading it, so every shard gets it), a private channel's member list, or a
	* direct message's members. `conv` is a resolveConv(...) result; a thread's
	* spreads its parent's `channel` or `dm` in already (resolveConv), so it
	* needs no case of its own.
	*/
	function audienceOf(conv) {
		if (conv.channel) return conv.channel.private ? conv.channel.members || [] : null;
		if (conv.dm) return conv.dm.members || [];
		return null;
	}
	/**
	* A conversation's activity stamp for a write that changes what it shows
	* without adding a message: an edit, a delete, a reaction, a pin, an
	* unfurl. `extra` carries whatever other path the same write touches (a pin
	* count, say), landed in the same call; `audience` is who should be signalled
	* for it (see audienceOf), null reaching the whole workspace.
	*/
	async function touchConv(wsId, convId, ts, { audience = null, extra = {}, defer = null, ws = null, seq = null, patch = null } = {}) {
		await kv().update(KEYS.activity(wsId), {
			[`c.${convId}.x`]: ts,
			...extra
		});
		const a = { x: ts };
		const prefix = `c.${convId}.`;
		for (const [path, v] of Object.entries(extra)) if (path.startsWith(prefix) && !path.slice(prefix.length).includes(".")) a[path.slice(prefix.length)] = v;
		const entry = {
			conv: convId,
			body: patch && Number.isInteger(seq) ? {
				a,
				s: seq,
				p: patch
			} : { a },
			slim: { a }
		};
		if (defer) defer(() => signal(wsId, audience, {
			entries: [entry],
			ws
		}));
		else await signal(wsId, audience, {
			entries: [entry],
			ws
		});
	}
	/**
	* Both at once, in the one write the store takes a map of paths for: a
	* member whose own state changed in a way everyone sees (a role given, a
	* channel entered), whose tabs refetch their document and everyone's the
	* workspace. Written one after the other, as they used to be, every change
	* of role and every entry by a channel's link cost a round trip more.
	*/
	async function pokeAndBump(wsId, uuid) {
		await kv().incr(KEYS.activity(wsId), {
			[`u.${uuid}`]: 1,
			w: 1
		});
		await signal(wsId, null);
	}
	/**
	* Move many counters (or set many fields) on one document in a few writes,
	* fifty paths a write as notifyMentions pokes, rather than one write per
	* path. A member's channels are counted out, or among the guests, on the
	* workspace document one channel at a time, and a member in many channels
	* cost one round trip per channel (two, for a private one, whose list is
	* rewritten): past a few hundred the request ran longer than the platform
	* lets one run, and a removal died between closing the member's document
	* and taking their card. A write that fails is let go of, as each single
	* one was.
	*/
	async function incrPaths(key, paths) {
		const entries = Object.entries(paths);
		for (let i = 0; i < entries.length; i += 50) await kv().incr(key, Object.fromEntries(entries.slice(i, i + 50))).catch(() => {});
	}
	async function updatePaths(key, paths) {
		const entries = Object.entries(paths);
		for (let i = 0; i < entries.length; i += 50) await kv().update(key, Object.fromEntries(entries.slice(i, i + 50))).catch(() => {});
	}
	/**
	* Take someone's traces out of the activity document when they leave the
	* workspace: their last heartbeat and status (sent to every member with
	* each bootstrap, for a person no longer here), the stamp their own polls
	* watched (one number per person who ever left, otherwise kept for good),
	* their seat in any huddle, and their typing in any conversation. The seat
	* used to stay until it lapsed, a minute and a half on: the roster kept
	* naming someone shown the door, every tab in the call went on dialling
	* their peer, and a huddle they had been alone in stood "in progress" with
	* nobody in it until then. One read of the document, on a route that is rare.
	*
	* With `conv`, only what they had in that conversation and its threads (a
	* seat, a typing entry): someone leaving a channel, or taken out of it,
	* stays in the workspace, heartbeat and all, but the seat they had in its
	* huddle is not theirs to keep for the minute and a half it would lapse in.
	*
	* `who` is one person or a list of them (a partner workspace's people all
	* going at once, see disconnect): the document is read once for all of
	* them, and their paths go a hundred a write.
	*/
	async function dropPresence(wsId, who, conv = null) {
		const key = KEYS.activity(wsId);
		const uuids = Array.isArray(who) ? who : [who];
		if (!uuids.length) return;
		const within = (c) => !conv || c === conv || parentOfThread(c)?.conv === conv;
		const paths = conv ? [] : uuids.flatMap((uuid) => [
			`p.${uuid}`,
			`ps.${uuid}`,
			`u.${uuid}`
		]);
		const act = await kv().get(key).catch(() => null) || {};
		for (const [c, h] of Object.entries(act.h || {})) if (within(c) && h?.m) {
			for (const uuid of uuids) if (Object.hasOwn(h.m, uuid)) paths.push(`h.${c}.m.${uuid}`);
		}
		for (const [c, t] of Object.entries(act.t || {})) if (within(c) && t) {
			for (const uuid of uuids) if (Object.hasOwn(t, uuid)) paths.push(`t.${c}.${uuid}`);
		}
		for (let i = 0; i < paths.length; i += 100) await kv().remove(key, ...paths.slice(i, i + 100)).catch(() => {});
	}
	/**
	* Mint an invite for a workspace: the code document carries its own expiry
	* and the key is also given a TTL, so a stale code disappears on its own
	* and, until it does, is refused by the timestamp check.
	*/
	async function issueInvite(wsId, ttlKey = "7d", scope = null, role = "guest") {
		const ttl = Object.hasOwn(INVITE_TTLS, ttlKey) ? INVITE_TTLS[ttlKey] : INVITE_TTLS["7d"];
		const code = inviteCode();
		const exp = now() + ttl.seconds * 1e3;
		await kv().set(KEYS.invite(code), scope ? {
			ws: wsId,
			ch: scope,
			role,
			exp
		} : {
			ws: wsId,
			exp
		});
		await kv().expire(KEYS.invite(code), ttl.seconds).catch(() => {});
		return {
			code,
			exp
		};
	}
	/**
	* Members a guest may see: everyone in a channel they are in, and the
	* people in their direct messages. Private channels carry their list;
	* public ones cost one member-document read per workspace member, the same
	* as listing a channel's members, once per bootstrap of a guest. A direct
	* message names nobody new: it was made while the two shared a channel
	* (see POST /dms), and it stays theirs when they no longer do, so the
	* person on the other side kept their card, presence and photo in it (they
	* used to turn into "Former member" in a conversation they were still in,
	* and the app, finding their card gone, would not open it from their side).
	* Who a guest may write to is judged by the same set (see POST /dms).
	*/
	async function peersOf(ws, doc, readDocs = memberDocsReader(ws)) {
		const peers = /* @__PURE__ */ new Set();
		const publics = [];
		for (const cid of doc.channels) {
			const ch = ws.channels[cid];
			if (!ch) continue;
			if (ch.private) (ch.members || []).forEach((u) => peers.add(u));
			else publics.push(cid);
		}
		for (const dm of Object.values(doc.dms || {})) for (const u of dm?.members || []) if (own(ws.members, u)) peers.add(u);
		if (publics.length) {
			for (const [u, d] of await readDocs()) if ((d?.channels || []).some((c) => publics.includes(c))) peers.add(u);
		}
		return peers;
	}
	/**
	* Every member's document (the first 500), read once and handed to whoever
	* asks again within the request: a map by uuid, loaded on the first ask.
	* Who is in a public channel is answered from these (see peersOf), and a
	* request that asks the question for several people (a group message
	* naming several guests, or people from a connected workspace; see POST
	* /dms) used to read every document again for each of them, five hundred
	* reads a person.
	*/
	function memberDocsReader(ws, seed = null) {
		let pending = null;
		return () => {
			if (!pending) {
				const ids = Object.keys(ws.members).slice(0, 500);
				const others = ids.filter((u) => !seed || u !== seed.uuid);
				pending = getMany(others.map((u) => KEYS.member(ws.id, u))).then((docs) => {
					const read = new Map(others.map((u, i) => [u, docs[i]]));
					return new Map(ids.map((u) => [u, seed && u === seed.uuid ? seed.doc : read.get(u)]));
				});
			}
			return pending;
		};
	}
	/**
	* Member documents as one request reads them, each read once however many
	* times it is asked for: `docs(uuids)` answers in order, reading only what
	* has not been read yet. A post asks the same question of the same
	* documents several times over (who of those named may read here, who is
	* in the channel a broadcast reaches, who of them may hear of it, who has
	* asked for a push; see readersAmong, broadcastTargets and sendPushes),
	* and used to read a guest's document for each question and every push
	* target's once more after the write: a broadcast in a public channel of
	* five hundred read well past five hundred documents where one reading of
	* each would do. Kept on the request's context (`ctx.docs`) by postMessage;
	* a caller without one reads as before.
	*/
	function memberDocsMemo(wsId, seed = null) {
		const cache = /* @__PURE__ */ new Map();
		if (seed && typeof seed.uuid === "string" && seed.doc) cache.set(seed.uuid, seed.doc);
		return async (uuids) => {
			const missing = [...new Set(uuids.filter((u) => !cache.has(u)))];
			if (missing.length) {
				const docs = await getMany(missing.map((u) => KEYS.member(wsId, u)));
				missing.forEach((u, i) => cache.set(u, docs[i]));
			}
			return uuids.map((u) => cache.get(u));
		};
	}
	/** The member documents of `uuids`, through the request's memo where it has one (see memberDocsMemo). */
	var docsOf = (ctx, uuids) => typeof ctx.docs === "function" ? ctx.docs(uuids) : getMany(uuids.map((u) => KEYS.member(ctx.ws.id, u)));
	/**
	* What a member may see in the activity document by their own document: the
	* channels they are in, their direct messages, and the threads inside
	* either. The bootstrap and the sync poll filter a guest's whole view with
	* this, so a guest never learns that a channel they are not in moved, and so
	* a reply in their own direct message's thread does reach them; and they
	* filter everyone's huddles with it, since a roster names who is in a call
	* and the invite code each of them serves.
	*/
	function memberVisible(doc) {
		const channels = Array.isArray(doc.channels) ? doc.channels : [];
		const dms = doc.dms || {};
		return (conv) => {
			const thread = parentOfThread(conv);
			const base = thread ? thread.conv : conv;
			return channels.includes(base) || !!own(dms, base);
		};
	}
	/** A conversation (or a thread of one) that is a public channel of the workspace: any member may browse it. */
	function isPublicChannel(ws, conv) {
		const thread = parentOfThread(conv);
		const ch = own(ws.channels || {}, thread ? thread.conv : conv);
		return !!ch && !ch.private;
	}
	/**
	* Brute-force guard for invite codes. Each account gets a small budget of
	* failed guesses per window; over it, the route answers 429 before any
	* lookup, so guessing stops costing the owner KV reads. Successful joins
	* never count.
	*/
	var joinFailKey = (uuid) => `tc:joinfail:${uuid}`;
	async function assertJoinBudget(uuid) {
		if ((Number(await kv().get(joinFailKey(uuid))) || 0) >= LIMITS.joinAttempts) fail(429, "too_many_attempts", "Too many invite attempts. Try again in a few minutes");
	}
	async function noteJoinFailure(uuid) {
		await kv().incr(joinFailKey(uuid)).catch(() => {});
		await kv().expire(joinFailKey(uuid), LIMITS.joinWindowSeconds).catch(() => {});
	}
	async function createWorkspaceFor(profile, name) {
		const wsId = uid(10);
		const generalId = uid(10);
		const { code, exp } = await issueInvite(wsId);
		const ts = now();
		const ws = {
			id: wsId,
			name,
			owner: profile.uuid,
			invite: code,
			inviteExp: exp,
			createdAt: ts,
			search: indexStamp(),
			channels: { [generalId]: {
				id: generalId,
				name: "general",
				topic: "Company-wide announcements and conversation",
				private: false,
				def: true,
				createdBy: profile.uuid,
				createdAt: ts,
				count: 1
			} },
			members: { [profile.uuid]: memberRecord(profile, "owner") }
		};
		await Promise.all([
			kv().set(KEYS.ws(wsId), ws),
			kv().set(KEYS.activity(wsId), {
				c: {},
				p: {},
				u: {},
				w: ts
			}),
			kv().set(KEYS.member(wsId, profile.uuid), {
				channels: [generalId],
				dms: {},
				reads: {},
				mentions: {},
				joinedAt: ts
			}),
			kv().set(KEYS.block(generalId, 0), {
				m: [],
				x: {}
			})
		]);
		await postSystem(wsId, generalId, profile.uuid, `${profile.name || profile.username} created #general`);
		await kv().add(KEYS.user(profile.uuid), { workspaces: [wsId] });
		return ws;
	}
	/**
	* Append a message and note it in the activity document: the conversation's
	* newest seq, when, and who wrote it (`by`, the author unless the line was
	* written for the author rather than by them: a reminder that came due
	* carries their uuid so it draws as theirs, but the clients take a line
	* whose author is the reader for one they sent from another tab, read as
	* it was written, and it is not that; stamped `sys`, it reaches them as
	* news, unread, the way the worker holds it).
	*
	* `before(seq)` runs once the message has its number and before it is
	* appended or announced: the counters a reader's cursor is judged against
	* (a mention counted on the conversation, a reply counted on the thread; see
	* the read route) go on there. Counted after the announcement, as they used
	* to be, a reader who saw the message at once and read it before the count
	* landed cleared nothing, and the count then stood on a conversation read
	* to its end; counted before the number is taken, a stale read of the
	* message before this one, landing between the two, would clear a count for
	* a message the reader has not seen. In between, neither: a read of this
	* message cannot come before the count, and a read of the one before it
	* falls short of the number the count is judged against.
	*/
	async function writeMessage(wsId, conv, msg, { by = msg.u, before = null, scheduled = false, audience = null, signal: doSignal = true, alongside = null, ws = null, entries = null } = {}) {
		let seq = await kv().incr(KEYS.seq(conv));
		msg.s = seq;
		if (before) await before(seq);
		let n = blockIndexOf(seq);
		let written;
		let rolled = false;
		try {
			written = await appendToBlock(conv, n, msg);
		} catch (err) {
			await rollBlock(wsId, conv, n, seq);
			rolled = true;
			seq = await kv().incr(KEYS.seq(conv));
			if (blockIndexOf(seq) === n) throw err;
			msg.s = seq;
			n = blockIndexOf(seq);
			written = await appendToBlock(conv, n, msg);
		}
		const tail = isFirstInBlock(seq) ? [ensureBlock(conv, n + 1)] : [];
		const stamp = {
			s: seq,
			t: now(),
			u: by,
			...scheduled ? { q: seq } : {}
		};
		tail.push(kv().update(KEYS.activity(wsId), Object.fromEntries(Object.entries(stamp).map(([f, v]) => [`c.${conv}.${f}`, v]))));
		if (Number(written?.bytes) > 163840) {
			rolled = true;
			tail.push(rollBlock(wsId, conv, n).catch(() => {}));
		}
		if (alongside) tail.push(alongside(seq));
		await Promise.all(tail);
		const entry = rolled ? null : {
			conv,
			body: {
				a: stamp,
				m: msg
			},
			slim: { a: stamp }
		};
		if (entries) entries.push(entry);
		if (doSignal) await signal(wsId, audience, {
			entries: [entry],
			ws
		});
		return seq;
	}
	/**
	* Close block `n` of a conversation early: the counter is moved to the
	* block's last number, so the next message takes the first number of the
	* next block (made ahead when this one opened, see writeMessage), and the
	* numbers between stand for no message, as a run of deleted messages does.
	* Every reader finds a message by its number as before (the block a number
	* lives in is arithmetic, see blockIndexOf), and a page, an export, a
	* rebuild of the search index and a deletion walk the blocks by the counter
	* and pass over what is not there.
	*
	* Why: the store holds a value of 400 KB at most, and a block of fifty
	* messages can grow past that on its own (fifty of the longest texts, each
	* edited once, are 405 KB; a link card, five attachments and a few hundred
	* reactions on each far more; see BLOCK_BYTES). Past it, the append of the
	* next message failed after its number was taken (a hole every reader
	* passed over as a deleted message, the sender told the send had failed),
	* every post into the conversation failed the same way until the numbers
	* ran into the next block, and every edit, reaction, pin, deletion and
	* reply count on the block's fifty messages failed for good, since the
	* block could never shrink.
	*
	* Claimed on the block itself (`full`, an atomic count): two messages
	* landing over the budget in the same instant both come here, and only the
	* one that took the count from nothing moves the counter, so it is moved
	* once (moved by each, the counter would have run past the next block).
	* The counter is read back for the move, since messages may have landed
	* since; a post taking a number in the same instant may run the counter a
	* few past the block's end, which puts the next message a little into the
	* next block and no further.
	*
	* `from`: a number already taken that no message stands under (the one a
	* message that would not fit was given, see writeMessage): the run noted
	* below begins with it. Noted from the counter alone, as it used to be, the
	* run left that number out, and the reader's app counted it as one unread
	* message more than there was until the conversation was opened.
	*/
	async function rollBlock(wsId, conv, n, from = null) {
		const key = KEYS.block(conv, n);
		const res = await kv().incr(key, { full: 1 });
		const claims = res && typeof res === "object" ? res.full : res;
		if (!(claims === 1 || claims == null)) return;
		const cur = Number(await kv().get(KEYS.seq(conv))) || 0;
		const last = lastSeqOfBlock(n);
		const start = from != null ? Math.min(from, cur + 1) : cur + 1;
		if (cur < last) await kv().incr(KEYS.seq(conv), last - cur);
		if (start <= last) await kv().update(KEYS.activity(wsId), { [`c.${conv}.k`]: [start, last] }).catch(() => {});
	}
	/**
	* Refuse a write that would grow a message's block past what the store
	* holds (see BLOCK_BYTES_HARD): the member is told, where the store would
	* have refused the write with no word and left the block unable to take any
	* change at all. `growth` is the bytes the write adds; `words` what to say.
	*/
	function assertBlockRoom(block, growth, words) {
		if (jsonBytes(block || {}) + growth > 368640) fail(400, "limit", words);
	}
	/** Has a message's block room for a write that grows it by `growth` bytes (see assertBlockRoom)? */
	var blockHasRoom = (block, growth) => jsonBytes(block || {}) + growth <= BLOCK_BYTES_HARD;
	/**
	* A line the worker writes into a conversation, about `uuid` (who is drawn
	* as its subject). `by` is who the conversation's activity entry names as
	* the writer: the subject, where the line records their own act in a
	* conversation they are looking at (they joined, pinned, changed a rule;
	* their tabs then take the line as read, as they take a message of their
	* own sent from another tab, see the client's _foldActivity), and 'sys'
	* where the subject is not the one acting, or need not be looking (a huddle
	* that ended, a share accepted by another workspace's admin): named as the
	* writer of those, the subject's own tabs marked the conversation read to
	* the line, bold and count gone, over messages they had never seen.
	*/
	async function postSystem(wsId, conv, uuid, text, { by = uuid } = {}) {
		return writeMessage(wsId, conv, {
			u: uuid,
			t: text,
			ts: now(),
			k: "sys"
		}, { by });
	}
	/** Find a message's raw record and its block key; null when absent. */
	async function locateMessage(conv, seq) {
		if (!Number.isInteger(seq) || seq < 1) return null;
		return messageIn(conv, seq, await kv().get(KEYS.block(conv, blockIndexOf(seq))));
	}
	/**
	* The same, from a block a caller already has: the block a message lives in
	* is arithmetic from its number (see blockIndexOf), so a route whose path
	* names the number reads it with the caller's own document rather than after
	* it (see the edit route).
	*/
	function messageIn(conv, seq, block) {
		if (!Number.isInteger(seq) || seq < 1) return null;
		const key = KEYS.block(conv, blockIndexOf(seq));
		const raw = block?.m?.find((m) => m && m.s === seq) || null;
		return raw ? {
			key,
			block,
			raw,
			overlay: block.x?.[overlayKey(seq)] || {}
		} : null;
	}
	async function readRange(conv, fromSeq, toSeq) {
		if (toSeq < fromSeq) return [];
		const from = blockIndexOf(fromSeq);
		const to = blockIndexOf(toSeq);
		const keys = [];
		for (let n = from; n <= to; n++) keys.push(KEYS.block(conv, n));
		return (await getMany(keys)).flatMap(mergeBlock).filter((m) => m.seq >= fromSeq && m.seq <= toSeq);
	}
	/**
	* Blocks one page read may go on past its own when they held nothing. A
	* deleted message is never returned, so a run of them longer than a page
	* answered an empty page with more to come; the client keys its next
	* request back on the oldest message it holds, which such a page brought
	* none of, and takes a forward page with nothing new for the end of its
	* walk, so what lay past the run was out of reach until a fresh load. A
	* run longer than this budget still answers empty: the cost of an answer
	* stays bounded.
	*/
	var SKIP_BLOCKS = 6;
	/**
	* Three ways to read: the newest page (no params), older than a seq
	* (`before`), or newer than a seq (`after`). `from`/`to` re-reads a range
	* the client already shows, after an overlay change (edit, reaction).
	* Each answer costs one get for the counter plus one per block touched,
	* never a listing.
	*/
	async function fetchMessages(conv, q, head = void 0) {
		const seq = head === void 0 ? Number(await kv().get(KEYS.seq(conv))) || 0 : Number(head) || 0;
		const num = (name) => q.get(name) == null ? null : Math.max(0, Math.floor(Number(q.get(name)) || 0));
		const after = num("after");
		const from = num("from");
		const to = num("to");
		const before = num("before");
		const maxBlocks = 3;
		if (from != null && to != null) {
			const hi = Math.min(to, seq, from + 150 - 1);
			return {
				seq,
				messages: await readRange(conv, Math.max(1, from), hi),
				hasMore: hi < Math.min(to, seq)
			};
		}
		if (after != null) {
			if (seq <= after) return {
				seq,
				messages: [],
				hasMore: false
			};
			let lo = after + 1;
			let hi = Math.min(seq, (blockIndexOf(lo) + maxBlocks) * 50);
			let messages = await readRange(conv, lo, hi);
			for (let extra = 0; !messages.length && hi < seq && extra < SKIP_BLOCKS; extra += maxBlocks) {
				lo = hi + 1;
				hi = Math.min(seq, (blockIndexOf(lo) + maxBlocks) * 50);
				messages = await readRange(conv, lo, hi);
			}
			return {
				seq,
				messages,
				hasMore: hi < seq
			};
		}
		const top = Math.min(before != null ? before - 1 : seq, seq);
		if (top < 1) return {
			seq,
			messages: [],
			hasMore: false
		};
		let n = blockIndexOf(top);
		const inTop = top - firstSeqOfBlock(n) + 1;
		let messages;
		if (inTop < 25 && n > 0) {
			const [prev, cur] = await getMany([KEYS.block(conv, n - 1), KEYS.block(conv, n)]);
			n -= 1;
			messages = mergeBlock(prev).concat(mergeBlock(cur).filter((m) => m.seq <= top));
		} else {
			messages = mergeBlock(await kv().get(KEYS.block(conv, n))).filter((m) => m.seq <= top);
			if (messages.length < 25 && n > 0) {
				n -= 1;
				messages = mergeBlock(await kv().get(KEYS.block(conv, n))).concat(messages);
			}
		}
		for (let extra = 0; !messages.length && n > 0 && extra < SKIP_BLOCKS; extra++) {
			n -= 1;
			messages = mergeBlock(await kv().get(KEYS.block(conv, n)));
		}
		return {
			seq,
			messages,
			hasMore: n > 0
		};
	}
	/** Resolve @username mentions to member uuids, capped. Reserved names are never people. */
	function mentionUuids(ws, text) {
		const names = extractMentionNames(text).filter((n) => !BROADCASTS.includes(n));
		if (!names.length) return [];
		const byName = new Map(Object.entries(ws.members).map(([u, m]) => [String(m.username).toLowerCase(), u]));
		const out = [];
		for (const name of names) {
			const u = byName.get(name);
			if (u && !out.includes(u)) out.push(u);
			if (out.length >= LIMITS.mentionsPerMessage) break;
		}
		return out;
	}
	/**
	* Of `uuids`, those who may read this conversation: a direct message's or a
	* private channel's members, every non-guest member for a public channel,
	* and a guest only if they have joined it (one member-document read per
	* mentioned guest, which is rare). A mention of anyone else is just text:
	* it must not count against them, land in their inbox, or push them the
	* message, since none of that would ever be readable to them.
	*/
	async function readersAmong(ctx, conv, uuids) {
		const { ws } = ctx;
		const allowed = /* @__PURE__ */ new Set();
		const guests = [];
		for (const u of uuids) {
			const m = ws.members[u];
			if (!m) continue;
			if (conv.dm) {
				if (conv.dm.members.includes(u)) allowed.add(u);
			} else if (conv.channel?.private) {
				if ((conv.channel.members || []).includes(u)) allowed.add(u);
			} else if (isLimited(m)) guests.push(u);
			else allowed.add(u);
		}
		if (guests.length) {
			const docs = await docsOf(ctx, guests);
			guests.forEach((u, i) => {
				if ((docs[i]?.channels || []).includes(conv.channel.id)) allowed.add(u);
			});
		}
		return uuids.filter((u) => allowed.has(u));
	}
	/** Who may broadcast in a channel: everyone by default, admins in a default channel. */
	var broadcastPolicy = (channel) => channel.broadcast || (channel.def ? "admins" : "everyone");
	/** Presence counts as "here" within this window, a little wider than the client's active dot. */
	var HERE_WINDOW_MS = 3e5;
	/**
	* Expand a broadcast into the uuids it reaches, minus the sender. @channel is
	* the conversation's members (a private channel's list, a DM's members, or
	* one member document read per workspace member for a public channel, the
	* same cost as listing its members), @here is those of them with a recent
	* heartbeat, and @everyone is the whole workspace. Bounded by the workspace
	* member cap; sample teammates are skipped since they have no counters.
	*/
	async function broadcastTargets(ctx, conv, kind) {
		const { ws, uuid } = ctx;
		const all = Object.keys(ws.members).slice(0, 500);
		let members;
		if (kind === "everyone") members = all;
		else if (conv.dm) members = conv.dm.members;
		else if (conv.channel.private) members = conv.channel.members || [];
		else {
			const docs = await docsOf(ctx, all);
			members = all.filter((u, i) => (docs[i]?.channels || []).includes(conv.channel.id));
		}
		members = members.filter((u) => u !== uuid && ws.members[u] && !u.startsWith("smp_"));
		if (kind === "here") {
			const act = await kv().get(KEYS.activity(ws.id)) || {};
			const cutoff = now() - HERE_WINDOW_MS;
			members = members.filter((u) => (act.p?.[u] || 0) >= cutoff && act.ps?.[u] !== "off");
		}
		return members;
	}
	/**
	* Bump mention counters for many members at once: counters in parallel
	* batches, and a single activity write naming everyone poked (the update
	* takes a map of paths) rather than one write per person.
	*/
	async function notifyMentions(wsId, conv, uuids) {
		const targets = uuids.filter((u) => !u.startsWith("smp_"));
		const ts = now();
		const writes = [];
		for (let i = 0; i < targets.length; i += 50) {
			const paths = Object.fromEntries(targets.slice(i, i + 50).map((u) => [`u.${u}`, ts]));
			writes.push(kv().update(KEYS.activity(wsId), paths).catch(() => {}));
		}
		for (let i = 0; i < targets.length; i += 12) {
			const slice = targets.slice(i, i + 12);
			writes.push(Promise.all(slice.map((u) => kv().incr(KEYS.member(wsId, u), { [`mentions.${conv}`]: 1 }).catch(() => {}))));
		}
		await Promise.all(writes);
		return targets.length;
	}
	/**
	* Append one entry to members' activity inboxes: { k: kind, c: conv, s: seq,
	* by, ts }. One kv.add per member, in parallel batches, plus a bump of the
	* unread counter in their member document; no reads. The ring is trimmed to
	* its cap when add hands the document back (or when the value limit is hit).
	*/
	/**
	* Pushes a member takes between two readings of their ring's length, where
	* the store's answer to the append does not show it (see pushInbox). Once
	* in fifty, against a ring of three hundred: a read per fifty entries, and
	* the ring at most a sixth over its cap between two readings.
	*/
	var INBOX_TRIM_EVERY = 50;
	async function pushInbox(wsId, uuids, entry) {
		const targets = uuids.filter((u) => !u.startsWith("smp_"));
		for (let i = 0; i < targets.length; i += 12) await Promise.all(targets.slice(i, i + 12).map(async (u) => {
			const key = KEYS.inbox(wsId, u);
			let judged = false;
			const counting = kv().incr(KEYS.member(wsId, u), {
				inbox: 1,
				inboxN: 1
			}).catch(() => null);
			try {
				const doc = await kv().add(key, { items: [entry] });
				if (doc && Array.isArray(doc.items) && doc.items.length > LIMITS.inboxItems) {
					await kv().update(key, { items: doc.items.slice(-LIMITS.inboxItems) }).catch(() => {});
					judged = true;
				}
			} catch {
				const cur = await kv().get(key) || { items: [] };
				await kv().set(key, { items: [...cur.items || [], entry].slice(-LIMITS.inboxItems) }).catch(() => {});
				judged = true;
			}
			const counted = await counting;
			const n = counted && typeof counted === "object" ? Number(counted.inboxN) : NaN;
			if (!judged && Number.isFinite(n) && n % INBOX_TRIM_EVERY === 0) {
				const ring = await kv().get(key).catch(() => null);
				if (Array.isArray(ring?.items) && ring.items.length > LIMITS.inboxItems) await kv().update(key, { items: ring.items.slice(-LIMITS.inboxItems) }).catch(() => {});
			}
		}));
	}
	/** Note thread activity for its followers (the poster included): one path write each. */
	async function touchThreads(wsId, uuids, threadId, parent, ts) {
		const targets = uuids.filter((u) => !u.startsWith("smp_"));
		for (let i = 0; i < targets.length; i += 12) await Promise.all(targets.slice(i, i + 12).map((u) => kv().update(KEYS.threads(wsId, u), { [`t.${threadId}`]: {
			c: parent.conv,
			s: parent.seq,
			at: ts
		} }).catch(() => {})));
	}
	/** Recipients one post may push to; broadcasts beyond this reach people through the in-app badge. */
	var PUSH_FANOUT = 50;
	/** Devices one member may subscribe per workspace. */
	var PUSH_DEVICES = 5;
	/**
	* Deliver a push to every subscribed device of `uuids` whose settings want
	* it: the member document (one read each) carries their subscriptions and
	* per-conversation levels, and each subscription carries the device's quiet
	* hours and pause. Dead subscriptions are dropped. Never throws.
	*/
	async function sendPushes(ws, uuids, n, readDocs = null) {
		const docs = readDocs ? await readDocs(uuids) : await getMany(uuids.map((u) => KEYS.member(ws.id, u)));
		const jobs = [];
		uuids.forEach((u, i) => {
			const doc = docs[i];
			const subs = doc?.push || {};
			if (!Object.keys(subs).length) return;
			const setting = doc?.notify?.[n.mentionConv] || {};
			if (setting.mute) return;
			const level = setting.level || (n.kind === "dm" ? "all" : "mentions");
			if (level === "nothing") return;
			const event = n.mentioned.has(u) ? "mention" : "message";
			if (event === "message" && level !== "all") return;
			const server = (workerHost || "server").replace(/\.puter\.work$/, "");
			const ref = `${ws.id}@${server}`;
			for (const [sid, sub] of Object.entries(subs)) {
				if (!sub?.endpoint || !pushAllowed(sub.prefs)) continue;
				const route = n.threadRoot ? `#/ws/${ref}/c/${n.threadRoot.conv}/t/${n.threadRoot.seq}/m/${n.seq}` : `#/ws/${ref}/c/${n.conv}/m/${n.seq}`;
				const quiet = n.quiet || (event === "mention" ? "Mentioned you" : "New message");
				const tag = `${ref}:${event === "mention" ? level === "all" && !n.threadRoot && !n.call ? `message-${n.conv}` : `mention-${n.mentionConv}` : n.threadRoot ? `reply-${n.conv}` : `message-${n.conv}`}`;
				const payload = {
					title: n.title,
					body: sub.preview === false || !n.body ? quiet : n.body,
					tag,
					route,
					ws: ws.id
				};
				jobs.push(sendPush(sub, payload).then((r) => r === "gone" ? kv().remove(KEYS.member(ws.id, u), `push.${sid}`).catch(() => {}) : null));
			}
		});
		for (let i = 0; i < jobs.length; i += 10) await Promise.all(jobs.slice(i, i + 10));
	}
	router.get("/health", route(async () => ({
		ok: true,
		ts: now(),
		build: WORKER_BUILD,
		builtAt: WORKER_BUILT_AT,
		runtime: workerRuntime()
	})));
	router.get("/api/server", route(async ({ user }) => {
		const id = await identify(user);
		const cfg = await serverConfig();
		const owner = cfg.owner === id.uuid;
		const events = owner ? await serverEventsStatus() : null;
		return {
			build: WORKER_BUILD,
			owner,
			claimed: !!cfg.owner,
			open: !!cfg.open,
			...events ? { events } : {}
		};
	}));
	/** Owner only: `open` lets any account create workspaces here (a shared deployment). */
	router.put("/api/server", route(async ({ request, user }) => {
		const id = await identify(user);
		const cfg = await serverConfig();
		if (!cfg.owner || cfg.owner !== id.uuid) fail(403, "forbidden", "Only the owner of this server can change its settings");
		const body = await readJson(request);
		if (typeof body.open === "boolean") await setServerConfig({ open: body.open });
		if (body.events === true) await clearEventsVerdict();
		const next = await serverConfig();
		const events = await serverEventsStatus();
		return {
			build: WORKER_BUILD,
			owner: true,
			claimed: true,
			open: !!next.open,
			...events ? { events } : {}
		};
	}));
	router.get("/api/me", route(async ({ user }) => {
		const id = await identify(user);
		const profile = await ensureProfile(id);
		const docs = await getMany(profile.workspaces.map((w) => KEYS.ws(w)));
		const workspaces = [];
		const stale = [];
		docs.forEach((ws, i) => {
			if (ws && typeof ws.id !== "string") ws = null;
			if (ws && ws.members && isExternal(ws.members[id.uuid])) {} else if (ws && ws.members && ws.members[id.uuid]) workspaces.push({
				id: ws.id,
				name: ws.name,
				icon: ws.icon || void 0,
				members: Object.keys(ws.members).length,
				sample: !!ws.sample,
				role: ws.members[id.uuid].role,
				movedTo: ws.movedTo || void 0
			});
			else stale.push(profile.workspaces[i]);
		});
		if (stale.length) {
			const keep = profile.workspaces.filter((w) => !stale.includes(w));
			await kv().update(KEYS.user(id.uuid), { workspaces: keep });
		}
		const cfg = await serverConfig();
		return {
			profile: publicProfile(profile),
			workspaces,
			env: "worker",
			build: WORKER_BUILD,
			builtAt: WORKER_BUILT_AT,
			owner: cfg.owner === id.uuid
		};
	}));
	function publicProfile(p) {
		return {
			uuid: p.uuid,
			username: p.username,
			name: p.name,
			title: p.title,
			color: p.color,
			avatar: p.avatar || null,
			status: p.status || null
		};
	}
	router.put("/api/me", route(async ({ request, user, defer }) => {
		const id = await identify(user);
		const profile = await ensureProfile(id);
		const patch = profilePatch(await readJson(request), { strict: true });
		if (!Object.keys(patch).length) return { profile: publicProfile(profile) };
		await kv().update(KEYS.user(id.uuid), patch);
		defer(() => syncCards(profile, patch));
		return { profile: publicProfile({
			...profile,
			...patch
		}) };
	}));
	/**
	* Profile photo bytes for this worker. Each worker a user has a workspace
	* on keeps its own copy in the owner's drive (like attachments); the app
	* uploads it everywhere the card goes. Already square and small when it
	* arrives (the client crops and downscales), so the worker only bounds it.
	*/
	router.post("/api/me/avatar", route(async ({ request, user, defer }) => {
		const id = await identify(user);
		const profile = await ensureProfile(id);
		const cfg = await serverConfig();
		if (!profile.workspaces?.length && cfg.owner !== id.uuid) fail(403, "forbidden", "Join a workspace on this server first");
		assertDeclaredSize(request, LIMITS.avatarBytes, "Profile photos can be up to 300 KB");
		let form;
		try {
			form = await request.formData();
		} catch {
			fail(400, "invalid", "Expected a multipart upload");
		}
		const file = form.get("file");
		if (!file || typeof file.size !== "number" || file.size === 0) fail(400, "invalid", "No image provided");
		if (file.size > LIMITS.avatarBytes) fail(413, "too_large", "Profile photos can be up to 300 KB");
		if (!/^image\/(png|jpeg|webp)$/.test(file.type || "")) fail(400, "invalid", "Profile photos must be PNG, JPEG, or WebP");
		await fs().write(avatarPath(id.uuid), file, {
			createMissingParents: true,
			overwrite: true
		});
		const avatar = now();
		await kv().update(KEYS.user(id.uuid), {
			avatar,
			avatarType: file.type
		});
		defer(() => syncCards(profile, { avatar }));
		return { avatar };
	}));
	router.delete("/api/me/avatar", route(async ({ user, defer }) => {
		const id = await identify(user);
		const profile = await ensureProfile(id);
		await fs().delete(avatarPath(id.uuid)).catch(() => {});
		await kv().update(KEYS.user(id.uuid), { avatar: null });
		defer(() => syncCards(profile, { avatar: null }));
		return { avatar: null };
	}));
	/** A member's photo, for members of a workspace they share. */
	router.get("/api/ws/:ws/members/:uuid/avatar", route(async ({ params, user }) => {
		const named = /^[A-Za-z0-9_-]{1,64}$/.test(String(params.uuid));
		const { id, ws, member, extra } = await requireMember(params.ws, user, { also: named ? [KEYS.user(params.uuid)] : [] });
		const [profile] = extra;
		const target = own(ws.members, params.uuid);
		if (!target || !target.avatar) fail(404, "not_found", "No photo");
		const limited = isLimited(member) && params.uuid !== id.uuid;
		const raw = limited ? await kv().get(KEYS.member(params.ws, id.uuid)) : null;
		if (limited) {
			const doc = {
				...raw || {},
				channels: Array.isArray(raw?.channels) ? raw.channels : [],
				dms: raw?.dms || {}
			};
			if (!(Array.isArray(doc.peers) ? doc.peers : [...await peersOf(ws, doc, memberDocsReader(ws, {
				uuid: id.uuid,
				doc
			}))]).includes(params.uuid)) fail(404, "not_found", "No photo");
		}
		let blob;
		try {
			blob = await fs().read(avatarPath(params.uuid));
		} catch {
			fail(404, "not_found", "No photo");
		}
		return new Response(blob, {
			status: 200,
			headers: fileHeaders(profile?.avatarType || "image/jpeg", "photo", 86400)
		});
	}));
	/**
	* How many workspaces the account is in as a member, for the cap on making
	* or joining more. The profile's list also names the hosts of shared
	* channels the account takes part in from another workspace (so their card
	* syncs reach them), which /api/me leaves out of "your workspaces" and the
	* cap counted all the same: an owner active in many partners' channels was
	* told they were in the maximum number of workspaces. Ids of workspaces
	* since deleted drop out of the count as well, and so does the copy a
	* workspace left behind when it was moved to another server (see
	* /transfer/complete): read-only, and no longer anyone's workspace here, it
	* kept its cards, and counted as one the owner was still in until they
	* deleted it, so an owner who had moved a workspace away was told they were
	* in the maximum number one early for each they had moved.
	*/
	async function workspacesOf(profile) {
		return (await getMany(profile.workspaces.map((w) => KEYS.ws(w)))).filter((w) => w?.members?.[profile.uuid] && !isExternal(w.members[profile.uuid]) && !w.movedTo).length;
	}
	router.post("/api/workspaces", route(async ({ request, user }) => {
		const id = await identify(user);
		await assertMayCreate(id.uuid);
		const body = await readJson(request);
		const profile = await ensureProfile(id, body.profile);
		const name = cleanLine(body.name, LIMITS.workspaceName);
		if (!name) fail(400, "invalid", "Give your workspace a name");
		if (await workspacesOf(profile) >= 20) fail(400, "limit", "You are in the maximum number of workspaces");
		const ws = await createWorkspaceFor(profile, name);
		return { workspace: {
			id: ws.id,
			name: ws.name
		} };
	}));
	router.post("/api/workspaces/sample", route(async ({ request, user }) => {
		const id = await identify(user);
		await assertMayCreate(id.uuid);
		const profile = await ensureProfile(id, (await readJson(request)).profile);
		if (await workspacesOf(profile) >= 20) fail(400, "limit", "You are in the maximum number of workspaces");
		const wsId = await buildSampleWorkspace(profile);
		await kv().add(KEYS.user(profile.uuid), { workspaces: [wsId] });
		return { workspace: {
			id: wsId,
			name: "Northwind Studio",
			sample: true
		} };
	}));
	router.post("/api/join", route(async ({ request, user }) => {
		const id = await identify(user);
		const body = await readJson(request);
		const code = normalizeInviteCode(body.code);
		if (!code) fail(400, "invalid", "That does not look like an invite code");
		await assertJoinBudget(id.uuid);
		const invite = await kv().get(KEYS.invite(code));
		const ws = invite ? await kv().get(KEYS.ws(invite.ws)) : null;
		const scoped = invite?.ch ? ws?.channels?.[invite.ch] : null;
		if (!(invite && ws && invite.role !== "connect" && (invite.ch ? scoped && scoped.guestInvite === code && !scoped.archived : ws.invite === code) && (!invite.exp || invite.exp > now()))) {
			await noteJoinFailure(id.uuid);
			fail(404, "invite_not_found", "This invite is not valid anymore");
		}
		ws.channels = ws.channels || {};
		ws.members = ws.members || {};
		if (ws.movedTo) {
			const carried = own(ws.members, id.uuid);
			if (!carried || isExternal(carried)) fail(404, "invite_not_found", "This workspace moved to another server; ask an admin for a new invite");
			return {
				workspace: {
					id: ws.id,
					name: ws.name
				},
				movedTo: ws.movedTo
			};
		}
		const profile = await ensureProfile(id, body.profile);
		const assertOpen = () => {
			if (ws.importing) fail(409, "importing", "This workspace is still being imported; try again in a moment");
			if (frozen(ws)) fail(423, "transferring", "This workspace is being moved to another server; try again in a few minutes");
		};
		const external = isExternal(ws.members[id.uuid]) && !invite.ch;
		if (ws.members[id.uuid] && !external) {
			if (!profile.workspaces.includes(ws.id)) await listWorkspace(id.uuid, ws.id);
			const me = ws.members[id.uuid];
			if (isGuest(me) && !invite.ch) {
				assertOpen();
				const mine = await writeDocRole(ws.id, id.uuid, "member");
				if (typeof mine.gone === "number" && mine.gone + SCHED_CLAIM_MS > now()) fail(409, "retry", "Your membership here changed just now; open the invite link again");
				const written = await kv().update(KEYS.ws(ws.id), { [`members.${id.uuid}.role`]: "member" });
				if (!await cardStands(ws.id, id.uuid, written, ["role"])) {
					await unwriteDocRole(ws.id, id.uuid, mine);
					await evenGuestCounts(ws, mine, "guest", "member");
					fail(409, "retry", "Your membership here changed just now; open the invite link again");
				}
				await landPromotedGuest(ws, id.uuid, mine);
				await pokeAndBump(ws.id, id.uuid);
				return {
					workspace: {
						id: ws.id,
						name: ws.name
					},
					promoted: true
				};
			}
			if (invite.ch) {
				const doc = await kv().get(KEYS.member(ws.id, id.uuid)) || {};
				const inIt = (doc.channels || []).includes(invite.ch);
				if (isExternal(me)) {
					if (inIt) return {
						workspace: {
							id: ws.id,
							name: ws.name
						},
						already: true,
						channel: {
							id: invite.ch,
							name: scoped.name
						}
					};
					fail(403, "external", `You are in ${ws.name} through a channel shared with your workspace, and this link is to another of its channels; ask an admin of ${ws.name} for its workspace invite to join it fully`);
				}
				if (!inIt) assertOpen();
				const entry = inIt ? null : await enterChannel(ws.id, id.uuid, invite.ch, doc);
				if (entry?.status === "gone") fail(409, "retry", "Your membership here changed just now; open the invite link again");
				if (entry?.status === "entered") {
					const asGuest = entry.role ? entry.role === "guest" : isGuest(me);
					const counted = await kv().incr(KEYS.ws(ws.id), {
						[`channels.${invite.ch}.count`]: 1,
						...asGuest ? { [`channels.${invite.ch}.guests`]: 1 } : {}
					});
					if (!await channelStands(ws.id, invite.ch, counted)) fail(404, "invite_not_found", "This invite is not valid anymore");
					if (counted && typeof counted === "object" && counted.members && !own(counted.members, id.uuid)) fail(409, "retry", "Your membership here changed just now; open the invite link again");
					if (scoped.private) await addPrivateMember(ws.id, invite.ch, id.uuid);
					const joinSeq = await postSystem(ws.id, invite.ch, id.uuid, `${me.name || profile.name || profile.username} joined`);
					await kv().update(KEYS.member(ws.id, id.uuid), {
						[`reads.${invite.ch}`]: Math.max(joinSeq, Number(doc.reads?.[invite.ch]) || 0),
						...caughtUpMentions(doc, invite.ch)
					});
					await pokeAndBump(ws.id, id.uuid);
					return {
						workspace: {
							id: ws.id,
							name: ws.name
						},
						already: true,
						channel: {
							id: invite.ch,
							name: scoped.name
						},
						joined: true
					};
				}
				return {
					workspace: {
						id: ws.id,
						name: ws.name
					},
					already: true,
					channel: {
						id: invite.ch,
						name: scoped.name
					}
				};
			}
			return {
				workspace: {
					id: ws.id,
					name: ws.name
				},
				already: true
			};
		}
		assertOpen();
		if (!external && Object.keys(ws.members).length >= 500) fail(400, "limit", "This workspace is full");
		assertWorkspaceRoom(ws, { joining: true });
		const guest = !!invite.ch;
		if (!profile.workspaces.includes(ws.id)) {
			const res = await kv().add(KEYS.user(id.uuid), { workspaces: [ws.id] });
			const list = res && Array.isArray(res.workspaces) ? res.workspaces : null;
			if (list && list.filter((w) => w === ws.id).length > 1) {
				await kv().update(KEYS.user(id.uuid), { workspaces: list.filter((w, i) => w !== ws.id || list.indexOf(ws.id) === i) }).catch(() => {});
				return {
					workspace: {
						id: ws.id,
						name: ws.name
					},
					guest,
					channel: guest ? {
						id: invite.ch,
						name: scoped.name
					} : void 0
				};
			}
			profile.workspaces.push(ws.id);
		}
		if (external && sweepable(ws.members[id.uuid]) && !await claimLapse(ws.id, id.uuid, ws.members[id.uuid])) fail(409, "retry", "Your membership here changed just now; open the invite link again");
		const had = external ? await kv().get(KEYS.member(ws.id, id.uuid)) || {} : null;
		const defaults = (guest ? [invite.ch] : Object.values(ws.channels).filter((c) => c.def && !c.archived).map((c) => c.id)).filter((c) => !had || !(had.channels || []).includes(c));
		const ts = now();
		const seqs = await getMany(defaults.map((c) => KEYS.seq(c)));
		const reads = {};
		defaults.forEach((c, i) => {
			reads[c] = Number(seqs[i]) || 0;
		});
		const remembered = {
			former: ws.former?.[id.uuid] || null,
			removed: ws.removed?.[id.uuid] || null
		};
		const written = await kv().update(KEYS.ws(ws.id), { [`members.${id.uuid}`]: memberRecord(profile, guest ? "guest" : "member") });
		if (!await workspaceStands(ws.id, id.uuid, written)) {
			const p = await kv().get(KEYS.user(id.uuid)).catch(() => null);
			if (p?.workspaces?.includes(ws.id)) await kv().update(KEYS.user(id.uuid), { workspaces: p.workspaces.filter((w) => w !== ws.id) }).catch(() => {});
			fail(404, "invite_not_found", "This invite is not valid anymore");
		}
		await forgetFormer(ws, id.uuid);
		await forgetRemoved(ws, id.uuid);
		const undo = async ({ doc: dropDoc }, status, code, message) => {
			await kv().remove(KEYS.ws(ws.id), `members.${id.uuid}`).catch(() => {});
			if (dropDoc) await kv().del(KEYS.member(ws.id, id.uuid)).catch(() => {});
			const restore = {};
			if (remembered.former) restore[`former.${id.uuid}`] = remembered.former;
			if (remembered.removed) restore[`removed.${id.uuid}`] = remembered.removed;
			if (Object.keys(restore).length) await kv().update(KEYS.ws(ws.id), restore).catch(() => {});
			const p = await kv().get(KEYS.user(id.uuid)).catch(() => null);
			if (p?.workspaces?.includes(ws.id)) await kv().update(KEYS.user(id.uuid), { workspaces: p.workspaces.filter((w) => w !== ws.id) }).catch(() => {});
			await bumpWorkspace(ws.id).catch(() => {});
			fail(status, code, message);
		};
		const retry = "Your membership here changed just now; open the invite link again";
		const entered = [];
		if (had) {
			let gone = false;
			for (const c of defaults) {
				const entry = await enterChannel(ws.id, id.uuid, c, had);
				if (entry.status === "entered") entered.push(c);
				else if (entry.status === "gone") gone = true;
			}
			if (defaults.length && !entered.length) {
				if (gone) await undo({ doc: false }, 409, "retry", retry);
				return {
					workspace: {
						id: ws.id,
						name: ws.name
					},
					guest
				};
			}
			const upd = { joinedAt: had.joinedAt || ts };
			for (const c of entered) upd[`reads.${c}`] = reads[c];
			await kv().update(KEYS.member(ws.id, id.uuid), upd);
		} else {
			const key = KEYS.member(ws.id, id.uuid);
			const claim = await kv().incr(key, { jc: 1 }).catch(() => null);
			const n = claim && typeof claim === "object" ? Number(claim.jc) : Number(claim);
			let writes = !Number.isFinite(n) || n === 1;
			if (!writes) {
				let seen = false;
				for (let i = 0; i < 6 && !seen; i++) {
					await new Promise((r) => setTimeout(r, 150));
					const d = await kv().get(key).catch(() => null);
					seen = !!d && typeof d === "object" && Object.hasOwn(d, "joinedAt") && Array.isArray(d.channels);
				}
				writes = !seen;
			}
			if (writes) await kv().update(key, {
				channels: [],
				dms: {},
				reads,
				mentions: {},
				joinedAt: ts,
				role: guest ? "guest" : "member",
				...guest ? { promo: 0 } : {}
			});
			const fresh = {
				channels: [],
				joinedAt: ts
			};
			let gone = false;
			for (const c of defaults) {
				const entry = await enterChannel(ws.id, id.uuid, c, fresh);
				if (entry.status === "entered") entered.push(c);
				else if (entry.status === "gone") {
					gone = true;
					break;
				}
			}
			if (gone && !entered.length) await undo({ doc: true }, 409, "retry", retry);
		}
		for (const ch of entered) {
			const counted = await kv().incr(KEYS.ws(ws.id), {
				[`channels.${ch}.count`]: 1,
				...guest ? { [`channels.${ch}.guests`]: 1 } : {}
			});
			if (guest && !await channelStands(ws.id, ch, counted)) await undo({ doc: true }, 404, "invite_not_found", "This invite is not valid anymore");
			if (counted && typeof counted === "object" && counted.members && !own(counted.members, id.uuid)) {
				if (!had) {
					const stray = await kv().get(KEYS.member(ws.id, id.uuid)).catch(() => void 0);
					if (stray && typeof stray === "object" && !(typeof stray.gone === "number" && stray.gone + SCHED_CLAIM_MS > now())) {
						const back = {};
						for (const c of entered.slice(0, entered.indexOf(ch) + 1)) {
							back[`channels.${c}.count`] = -1;
							if (guest) back[`channels.${c}.guests`] = -1;
						}
						await kv().incr(KEYS.ws(ws.id), back).catch(() => {});
						await undo({ doc: true }, 409, "retry", retry);
					}
				}
				fail(409, "retry", retry);
			}
		}
		if (had) {
			const claim = await kv().incr(KEYS.member(ws.id, id.uuid), { promo: 1 }).catch(() => null);
			const n = claim && typeof claim === "object" ? Number(claim.promo) : Number(claim);
			if (!Number.isFinite(n) || n === 1) {
				const was = ws.members[id.uuid];
				for (const ch of had.channels || []) {
					const conn = ws.channels[ch] ? partnerConnOf(ws.channels[ch], was) : null;
					if (conn) await kv().incr(KEYS.ws(ws.id), { [`channels.${ch}.connections.${conn}.count`]: -1 }).catch(() => {});
				}
			}
		}
		if (guest && scoped.private) await addPrivateMember(ws.id, invite.ch, id.uuid);
		await bumpWorkspace(ws.id);
		if (entered[0]) {
			const joinSeq = await postSystem(ws.id, entered[0], id.uuid, `${profile.name || profile.username} joined${guest ? " as a guest" : ""}`);
			await kv().update(KEYS.member(ws.id, id.uuid), { [`reads.${entered[0]}`]: joinSeq });
		}
		await eventsBlock(ws, id.uuid, null, user).catch(() => null);
		await signal(ws.id, null);
		return {
			workspace: {
				id: ws.id,
				name: ws.name
			},
			guest,
			channel: guest ? {
				id: invite.ch,
				name: scoped.name
			} : void 0
		};
	}));
	router.get("/api/ws/:ws", route(async ({ params, request, user }) => {
		const readAt = now();
		const ringOn = !!workerAppUid();
		const { id, ws, doc, extra } = await requireMembership(params.ws, user, { also: ({ uuid }) => [
			KEYS.user(uuid),
			KEYS.activity(params.ws),
			...ringOn ? [KEYS.evCounter(params.ws)] : []
		] });
		const [knownProfile, knownAct, knownCounters = null] = extra;
		const q = query(request);
		const profile = await ensureProfile(id, null, { known: knownProfile });
		const me = ws.members[id.uuid];
		if (!profile.workspaces.includes(ws.id)) await listWorkspace(id.uuid, ws.id).catch(() => {});
		let stale = false;
		if (id.username && me.username !== id.username) {
			const written = await kv().update(KEYS.ws(ws.id), { [`members.${id.uuid}.username`]: id.username }).catch(() => null);
			if (written !== null) await cardStands(ws.id, id.uuid, written, ["username"]).catch(() => {});
			me.username = id.username;
			await bumpWorkspace(ws.id).catch(() => {});
			stale = true;
		}
		if (!ws.movedTo && !ws.importing && await lapseExternals(ws).catch(() => false)) stale = true;
		const act = (stale ? await kv().get(KEYS.activity(params.ws)).catch(() => knownAct) : knownAct) || {
			c: {},
			p: {},
			u: {},
			w: 0
		};
		const heartbeat = q.get("hb") === "1" ? recordPresence(params.ws, id.uuid, act, q.get("st")) : null;
		const guest = isLimited(me);
		const channels = {};
		for (const [cid, c] of Object.entries(ws.channels)) {
			const orphan = c.private && !guest && isAdmin(me) && !(c.members || []).length && !doc.channels.includes(cid);
			if ((c.private || guest) && !doc.channels.includes(cid) && !orphan) continue;
			const shown = guest || !isAdmin(me) ? {
				...c,
				guestInvite: void 0,
				guestInviteExp: void 0,
				connectInvite: void 0,
				connectInviteExp: void 0
			} : c;
			channels[cid] = orphan ? {
				...shown,
				members: [],
				orphan: true
			} : shown;
		}
		let members = ws.members;
		if (guest) {
			const peers = await peersOf(ws, doc, memberDocsReader(ws, {
				uuid: id.uuid,
				doc
			}));
			peers.add(id.uuid);
			members = Object.fromEntries(Object.entries(ws.members).filter(([u]) => peers.has(u)));
			await kv().update(KEYS.member(ws.id, id.uuid), { peers: [...peers] }).catch(() => {});
		}
		const sees = memberVisible(doc);
		const visible = guest ? sees : (conv) => sees(conv) || isPublicChannel(ws, conv);
		const huddles = Object.fromEntries(Object.entries(liveHuddles(act.h)).filter(([conv]) => sees(conv)));
		const activity = {
			...act,
			c: Object.fromEntries(Object.entries(act.c || {}).filter(([conv]) => visible(conv))),
			t: Object.fromEntries(Object.entries(act.t || {}).filter(([conv]) => visible(conv))),
			h: huddles,
			he: void 0
		};
		if (guest) {
			activity.p = Object.fromEntries(Object.entries(act.p || {}).filter(([u]) => members[u]));
			activity.ps = Object.fromEntries(Object.entries(act.ps || {}).filter(([u]) => members[u]));
			activity.u = Object.fromEntries(Object.entries(act.u || {}).filter(([u]) => u === id.uuid));
		}
		const events = await eventsBlock(ws, id.uuid, doc, user).catch(() => null);
		const keyed = [...Object.keys(channels).filter((cid) => !channels[cid].orphan), ...Object.keys(doc.dms || {})];
		const ring = await ringBlock(ws, id.uuid, events, keyed, knownCounters).catch(() => null);
		if (heartbeat) await heartbeat;
		return {
			now: readAt,
			...events ? { events } : {},
			...ring ? { ring } : {},
			workspace: {
				id: ws.id,
				name: ws.name,
				owner: ws.owner,
				sample: !!ws.sample,
				createdAt: ws.createdAt,
				icon: ws.icon || null,
				invite: isAdmin(me) ? ws.invite : null,
				inviteExp: isAdmin(me) ? ws.inviteExp || null : null,
				search: ws.search || null,
				unfurl: ws.unfurl !== false,
				movedTo: ws.movedTo || null,
				transferTo: ws.transferTo || null,
				transferring: frozen(ws) ? {
					by: ws.transferring.by,
					at: ws.transferring.at
				} : null,
				importing: !!ws.importing,
				integrations: isAdmin(me) ? liveIntegrations(ws) : void 0,
				channels,
				members,
				former: guest ? void 0 : ws.former || void 0,
				removed: isAdmin(me) && Object.keys(ws.removed || {}).length ? ws.removed : void 0
			},
			me: {
				...doc,
				peers: void 0,
				role: me.role
			},
			activity
		};
	}));
	/**
	* Re-mints per member per workspace, the join-budget pattern (see
	* assertUnfurlBudget): counted before the mint is even attempted, so a
	* re-mint that fails still spends it. A client stuck reloading in a retry
	* loop is exactly what this exists to stop, and a failing mint costs the
	* owner's shared 60-a-minute budget the same as a successful one does.
	*/
	async function assertRemintBudget(wsId, uuid) {
		const key = `tc:evrate:${wsId}:${uuid}`;
		const n = await kv().incr(key).catch(() => 1);
		if (n === 1) await kv().expire(key, LIMITS.evRemintWindowSeconds).catch(() => {});
		if (n > LIMITS.evRemintsPerMember) fail(429, "too_many_remints", "Live updates have been renewed as often as they can be just now; they resume on their own");
	}
	/**
	* A fresh handle for the caller alone, once the one they hold has been
	* refused (see worker/events.js's remintHandle, and store.js's _evRemint,
	* which is the only thing that ever calls this). The caller is only ever
	* themselves — this route takes no member id at all — so there is no shape
	* in which one member spends another's handle or another's budget. An
	* answer with no `events` key means exactly what it means in the bootstrap:
	* nothing is available right now, and the tab keeps polling.
	*/
	router.post("/api/ws/:ws/events/handle", route(async ({ params, user }) => {
		const { id, ws, doc } = await requireMembership(params.ws, user);
		await assertRemintBudget(ws.id, id.uuid);
		const events = await remintHandle(ws, id.uuid, doc, user).catch(() => null);
		return { ...events ? { events } : {} };
	}));
	router.put("/api/ws/:ws", route(async ({ params, request, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change workspace settings");
		const body = await readJson(request);
		const patch = {};
		if (typeof body.name === "string") {
			const name = cleanLine(body.name, LIMITS.workspaceName);
			if (!name) fail(400, "invalid", "Workspace name cannot be empty");
			patch.name = name;
		}
		if (typeof body.unfurl === "boolean") patch.unfurl = body.unfurl;
		if (body.rotateInvite) {
			if (body.inviteTtl !== void 0 && !Object.hasOwn(INVITE_TTLS, body.inviteTtl)) fail(400, "invalid", "Unknown invite duration");
			const { code, exp } = await issueInvite(ws.id, body.inviteTtl || "7d");
			if (ws.invite) await kv().del(KEYS.invite(ws.invite)).catch(() => {});
			patch.invite = code;
			patch.inviteExp = exp;
		} else if (body.revokeInvite && ws.invite) {
			await kv().del(KEYS.invite(ws.invite)).catch(() => {});
			patch.invite = null;
			patch.inviteExp = null;
		}
		if (Object.keys(patch).length) {
			await kv().update(KEYS.ws(ws.id), patch);
			await bumpWorkspace(ws.id);
		}
		return { workspace: {
			id: ws.id,
			name: patch.name || ws.name,
			invite: Object.hasOwn(patch, "invite") ? patch.invite : ws.invite || null,
			inviteExp: Object.hasOwn(patch, "inviteExp") ? patch.inviteExp : ws.inviteExp || null
		} };
	}));
	/**
	* The workspace's icon: shown in place of the name's first letter on the
	* rail, in the workspace menu, and in the switcher. Admins set it; already
	* square and small when it arrives (the client crops and downscales, as for
	* a profile photo), so the worker only bounds it. The bytes live in the
	* owner's drive beside the attachments; `icon` on the workspace document is
	* the version the clients cache by.
	*/
	router.post("/api/ws/:ws/icon", route(async ({ params, request, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change the workspace icon");
		assertDeclaredSize(request, LIMITS.workspaceIconBytes, "Workspace icons can be up to 300 KB");
		let form;
		try {
			form = await request.formData();
		} catch {
			fail(400, "invalid", "Expected a multipart upload");
		}
		const file = form.get("file");
		if (!file || typeof file.size !== "number" || file.size === 0) fail(400, "invalid", "No image provided");
		if (file.size > LIMITS.workspaceIconBytes) fail(413, "too_large", "Workspace icons can be up to 300 KB");
		if (!/^image\/(png|jpeg|webp)$/.test(file.type || "")) fail(400, "invalid", "Workspace icons must be PNG, JPEG, or WebP");
		await fs().write(iconPath(ws.id), file, {
			createMissingParents: true,
			overwrite: true
		});
		const icon = now();
		await kv().update(KEYS.ws(ws.id), {
			icon,
			iconType: file.type
		});
		await bumpWorkspace(ws.id);
		return { icon };
	}));
	router.delete("/api/ws/:ws/icon", route(async ({ params, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change the workspace icon");
		await fs().delete(iconPath(ws.id)).catch(() => {});
		await kv().update(KEYS.ws(ws.id), { icon: null });
		await bumpWorkspace(ws.id);
		return { icon: null };
	}));
	/** The icon's bytes, for members (guests and people from connected workspaces included). */
	router.get("/api/ws/:ws/icon", route(async ({ params, user }) => {
		const { id, ws } = await requireMembership(params.ws, user, { doc: false });
		if (!ws.icon) fail(404, "not_found", "No icon");
		let blob;
		try {
			blob = await fs().read(iconPath(ws.id));
		} catch {
			fail(404, "not_found", "No icon");
		}
		return new Response(blob, {
			status: 200,
			headers: fileHeaders(ws.iconType || "image/png", "icon", 86400)
		});
	}));
	router.delete("/api/ws/:ws", route(async ({ params, user }) => {
		const { id, ws } = await requireMembership(params.ws, user, { doc: false });
		if (ws.owner !== id.uuid) fail(403, "forbidden", "Only the owner can delete a workspace");
		const memberIds = Object.keys(ws.members);
		const docs = await getMany(memberIds.map((u) => KEYS.member(ws.id, u)));
		const convs = new Set(Object.keys(ws.channels));
		for (const d of docs) for (const [c, v] of Object.entries(d?.dms || {})) if (dmConvId(v?.members || []) !== c) convs.add(c);
		const dels = [
			KEYS.ws(ws.id),
			KEYS.activity(ws.id),
			KEYS.sched(ws.id),
			importClaimKey(ws.id)
		];
		for (let n = 0; n < 4; n++) dels.push(KEYS.evShard(ws.id, n));
		dels.push(KEYS.evCounter(ws.id));
		for (let n = 0; n < 8; n++) {
			dels.push(KEYS.evPing(ws.id, n));
			for (let k = 0; k < 16; k++) dels.push(KEYS.evRingSlot(ws.id, n, k));
		}
		for (const hid of Object.keys(ws.webhooks || {})) dels.push(KEYS.hook(hid));
		for (const bid of Object.keys(ws.bots || {})) dels.push(KEYS.bot(bid));
		if (ws.invite) dels.push(KEYS.invite(ws.invite));
		for (const c of Object.values(ws.channels)) {
			for (const conn of Object.keys(c.connections || {})) dels.push(KEYS.connect(conn));
			if (isPartnerEntry(c) && CONN_ID_RE.test(String(c.shared.conn || ""))) dels.push(KEYS.connectPartner(c.shared.conn));
			if (c.guestInvite) dels.push(KEYS.invite(c.guestInvite));
			if (c.connectInvite) dels.push(KEYS.invite(c.connectInvite));
		}
		for (const u of memberIds) dels.push(KEYS.member(ws.id, u), KEYS.inbox(ws.id, u), KEYS.threads(ws.id, u), KEYS.saved(ws.id, u));
		let budget = 240;
		const convList = [...convs];
		const seqs = await getMany(convList.map((c) => KEYS.seq(c)));
		const threads = [];
		const files = /* @__PURE__ */ new Set();
		for (const c of Object.values(ws.channels)) for (const b of c.bookmarks || []) if (typeof b?.file === "string") files.add(b.file);
		const queue = await kv().get(KEYS.sched(ws.id)).catch(() => null);
		for (const e of Object.values(queue?.m || {})) for (const a of Array.isArray(e?.attachments) ? e.attachments : []) if (typeof a?.id === "string") files.add(a.id);
		for (let i = 0; i < convList.length; i++) {
			const c = convList[i];
			const seq = Number(seqs[i]) || 0;
			const blocks = [];
			for (let n = blockIndexOf(Math.max(1, seq)) + 1; n >= 0; n--) blocks.push(KEYS.block(c, n));
			dels.push(...blocks, KEYS.seq(c), KEYS.pins(ws.id, c));
			for (let j = 0; j < blocks.length && budget > 0; j += 12) {
				const read = blocks.slice(j, j + Math.min(12, budget));
				budget -= read.length;
				for (const blk of await getMany(read).catch(() => [])) {
					threads.push(...threadsOf(c, blk));
					for (const m of Array.isArray(blk?.m) ? blk.m : []) for (const a of Array.isArray(m?.a) ? m.a : []) if (typeof a?.id === "string") files.add(a.id);
				}
			}
		}
		const tseqs = await getMany(threads.map((t) => KEYS.seq(t))).catch(() => threads.map(() => 0));
		const tblocks = [];
		threads.forEach((t, i) => {
			const tseq = Number(tseqs[i]) || 0;
			for (let n = blockIndexOf(Math.max(1, tseq)) + 1; n >= 0; n--) tblocks.push(KEYS.block(t, n));
			dels.push(KEYS.seq(t), KEYS.pins(ws.id, t));
		});
		dels.push(...tblocks);
		for (let j = 0; j < tblocks.length && budget > 0; j += 12) {
			const read = tblocks.slice(j, j + Math.min(12, budget));
			budget -= read.length;
			for (const blk of await getMany(read).catch(() => [])) for (const m of Array.isArray(blk?.m) ? blk.m : []) for (const a of Array.isArray(m?.a) ? m.a : []) if (typeof a?.id === "string") files.add(a.id);
		}
		for (const id of files) dels.push(KEYS.file(id));
		for (let i = 0; i < dels.length; i += 12) await Promise.all(dels.slice(i, i + 12).map((k) => kv().del(k).catch(() => {})));
		await deleteIndex(ws.id);
		await fs().delete(`teamchat-files/${ws.id}`, { recursive: true }).catch(() => {});
		await fs().delete(iconPath(ws.id)).catch(() => {});
		const people = memberIds.filter((u) => !u.startsWith("smp_"));
		const records = await getMany(people.map((u) => KEYS.user(u)));
		const filed = people.map((u, i) => [u, records[i]]).filter(([, p]) => p?.workspaces?.includes(ws.id));
		for (let i = 0; i < filed.length; i += 12) await Promise.all(filed.slice(i, i + 12).map(([u, p]) => kv().update(KEYS.user(u), { workspaces: p.workspaces.filter((w) => w !== ws.id) }).catch(() => {})));
		const releasing = memberIds.map((u, i) => [u, docs[i]]).filter(([, d]) => d?.ev?.h).slice(0, 20);
		for (let i = 0; i < releasing.length; i += 12) await Promise.all(releasing.slice(i, i + 12).map(([u, d]) => releaseHandle(ws.id, u, d).catch(() => {})));
		return { deleted: true };
	}));
	/**
	* A guest made a full member (by an admin, or by accepting the workspace's
	* own invite) lands in the default channels like anyone who joins, caught
	* up to their present, and stops counting as a guest where they already are.
	*/
	async function landPromotedGuest(ws, uuid, doc) {
		const have = new Set(doc?.channels || []);
		await landInDefaults(ws, uuid, doc, { announce: true });
		const key = KEYS.member(ws.id, uuid);
		const res = await kv().incr(key, { promo: 1 }).catch(() => null);
		const n = res && typeof res === "object" ? Number(res.promo) : Number(res);
		if (res && typeof res === "object" && !Array.isArray(res) && !Object.hasOwn(res, "joinedAt") && !Object.hasOwn(res, "channels")) {
			const fresh = await kv().get(key).catch(() => void 0);
			if (fresh && typeof fresh === "object" && !Array.isArray(fresh) && !Object.hasOwn(fresh, "joinedAt") && !Object.hasOwn(fresh, "channels")) await kv().del(key).catch(() => {});
		}
		if (Number.isFinite(n) && n !== 1) return;
		await incrPaths(KEYS.ws(ws.id), Object.fromEntries([...have].filter((ch) => ws.channels[ch]).map((ch) => [`channels.${ch}.guests`, -1])));
	}
	/**
	* Put a member (whose document already exists) into the default channels
	* they are not in yet, caught up to each one's present, and counted there.
	* `doc` is their document as the caller's role write handed it back (see
	* the role route). False when there were channels to enter and another
	* request for the same person put them into every one first; 'gone' when
	* they are on their way out of the workspace (see enterChannel) and entered
	* none, which is not another request's doing, and leaves the caller's own
	* counting to the caller.
	*
	* With `announce`, their arrival is written into the first channel entered
	* as it is for someone joining by the workspace's invite, "X joined", and
	* they are read past it: a guest made a member landed in #general with no
	* word, while everyone joining by the invite is announced there. Not for
	* someone whose card is gone by the count (a removal this very moment; see
	* the join routes): nothing more is written for someone who is out. The
	* line is one per channel however many promotions run at once, since
	* entering each channel is its own claim (see enterChannel).
	*/
	async function landInDefaults(ws, uuid, doc, { announce = false } = {}) {
		const have = new Set(doc?.channels || []);
		const defaults = Object.values(ws.channels).filter((c) => c.def && !c.archived && !have.has(c.id)).map((c) => c.id);
		if (!defaults.length) return true;
		const entered = [];
		let gone = false;
		for (const c of defaults) {
			const entry = await enterChannel(ws.id, uuid, c, doc);
			if (entry.status === "entered") entered.push(c);
			else if (entry.status === "gone") gone = true;
		}
		if (!entered.length) return gone ? "gone" : false;
		const seqs = await getMany(entered.map((c) => KEYS.seq(c)));
		const reads = {};
		entered.forEach((c, i) => {
			reads[`reads.${c}`] = Number(seqs[i]) || 0;
		});
		await kv().update(KEYS.member(ws.id, uuid), reads);
		let stands = true;
		for (const ch of entered) {
			const counted = await kv().incr(KEYS.ws(ws.id), { [`channels.${ch}.count`]: 1 });
			if (counted && typeof counted === "object" && counted.members && !own(counted.members, uuid)) stands = false;
		}
		if (announce && stands) {
			const m = ws.members[uuid];
			const joinSeq = await postSystem(ws.id, entered[0], uuid, `${m?.name || m?.username || "Someone"} joined`);
			await kv().update(KEYS.member(ws.id, uuid), { [`reads.${entered[0]}`]: Math.max(joinSeq, reads[`reads.${entered[0]}`] || 0) });
		}
		return true;
	}
	router.post("/api/ws/:ws/members/:uuid/role", route(async ({ params, request, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change roles");
		const target = own(ws.members, params.uuid);
		if (!target) fail(404, "not_found", "Member not found");
		if (target.role === "owner") fail(400, "invalid", "The owner role cannot be changed");
		if (isExternal(target)) fail(400, "invalid", "People from a connected workspace cannot be given a role here");
		const { role } = await readJson(request);
		if (![
			"admin",
			"member",
			"guest"
		].includes(role)) fail(400, "invalid", "Unknown role");
		const doc = await writeDocRole(ws.id, params.uuid, role);
		if (typeof doc.gone === "number" && doc.gone + SCHED_CLAIM_MS > now()) fail(404, "not_found", "Member not found");
		const written = await kv().update(KEYS.ws(ws.id), { [`members.${params.uuid}.role`]: role });
		if (!await cardStands(ws.id, params.uuid, written, ["role"])) {
			await unwriteDocRole(ws.id, params.uuid, doc);
			await evenGuestCounts(ws, doc, target.role, role);
			fail(404, "not_found", "Member not found");
		}
		if (ws.transferTo === params.uuid && role !== "admin") await kv().remove(KEYS.ws(ws.id), "transferTo", "transferring").catch(() => {});
		let revocations = [];
		if (target.role === "guest" && role !== "guest") await landPromotedGuest(ws, params.uuid, doc);
		else if (target.role !== "guest" && role === "guest") {
			const entries = (doc.channels || []).filter((c) => isPartnerEntry(ws.channels[c]));
			const counters = {};
			for (const c of entries) counters[`channels.${c}.count`] = -1;
			for (const ch of doc.channels || []) if (ws.channels[ch] && !entries.includes(ch)) counters[`channels.${ch}.guests`] = 1;
			if (entries.length) await kv().update(KEYS.member(ws.id, params.uuid), { channels: doc.channels.filter((c) => !entries.includes(c)) });
			await incrPaths(KEYS.ws(ws.id), counters);
			if (entries.length) revocations = await revocationsFor(ws, params.uuid, entries).catch(() => []);
			await kv().remove(KEYS.member(ws.id, params.uuid), "promo").catch(() => {});
			await bumpRingEpoch(ws.id).catch(() => {});
		}
		await pokeAndBump(ws.id, params.uuid);
		return {
			ok: true,
			...revocations.length ? { revocations } : {}
		};
	}));
	/**
	* Admins: every guest, with the channels they can see. A private channel
	* the caller is not in is no channel to them, admins included (see
	* hiddenFrom, and the integrations list): a guest's channels are listed as
	* the caller can see them, with how many are kept from them, so the row
	* does not read "no channels" for a guest who is in some, and the id of a
	* private channel the caller is not in goes to them no more than its name.
	*/
	router.get("/api/ws/:ws/guests", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user);
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can list guests");
		const ids = Object.entries(ws.members).filter(([, m]) => m.role === "guest").map(([u]) => u);
		const docs = await getMany(ids.map((u) => KEYS.member(ws.id, u)));
		return { guests: ids.map((u, i) => {
			const all = (docs[i]?.channels || []).filter((c) => own(ws.channels, c));
			const channels = all.filter((c) => !hiddenFrom(ws, doc, c));
			return {
				uuid: u,
				channels,
				...channels.length < all.length ? { hidden: all.length - channels.length } : {},
				joinedAt: ws.members[u].joinedAt
			};
		}) };
	}));
	router.delete("/api/ws/:ws/members/:uuid", route(async ({ params, user }) => {
		const id = await identify(user);
		const target = params.uuid;
		const self = target === id.uuid;
		const { ws, member } = await requireMembership(params.ws, id.uuid, {
			write: true,
			lapsed: self,
			doc: false
		});
		if (!self && !isAdmin(member)) fail(403, "forbidden", "Only admins can remove members");
		if (!own(ws.members, target)) fail(404, "not_found", "Member not found");
		if (ws.owner === target) fail(400, "invalid", self ? "The owner cannot leave; delete the workspace instead" : "The owner cannot be removed from their own workspace");
		const doc = await closeMemberDoc(ws.id, target);
		await dropMembership(ws, target, doc);
		await rememberFormer(ws, target);
		if (!self && isExternal(ws.members[target])) await rememberRemoved(ws, target, id.uuid);
		await kv().remove(KEYS.ws(ws.id), `members.${target}`);
		if (ws.transferTo === target) await kv().remove(KEYS.ws(ws.id), "transferTo", "transferring").catch(() => {});
		await dropPresence(ws.id, target);
		await kv().del(KEYS.member(ws.id, target));
		await Promise.all([
			KEYS.inbox(ws.id, target),
			KEYS.threads(ws.id, target),
			KEYS.saved(ws.id, target)
		].map((k) => kv().del(k).catch(() => {})));
		await dropScheduled(ws.id, target);
		if (!target.startsWith("smp_")) {
			const p = await kv().get(KEYS.user(target));
			if (p?.workspaces?.includes(ws.id)) await kv().update(KEYS.user(target), { workspaces: p.workspaces.filter((w) => w !== ws.id) });
		}
		await releaseHandle(ws.id, target, doc).catch(() => {});
		await bumpRingEpoch(ws.id).catch(() => {});
		await bumpWorkspace(ws.id);
		const revocations = await revocationsFor(ws, target, doc?.channels).catch(() => []);
		return {
			ok: true,
			...revocations.length ? { revocations } : {}
		};
	}));
	/**
	* A Puter worker only runs while handling a request, so anything due is
	* delivered by whichever member's sync poll comes first after its time.
	* The queue is one document per workspace, a map by id (so entries can be
	* claimed one at a time), and the earliest due time is kept in the
	* activity document the poll already reads: a poll with nothing due costs
	* nothing extra. Claiming is an atomic increment of the entry's claim
	* counter; only the poll that took it from 0 to 1 delivers, so two polls
	* racing cannot both send.
	*/
	var SCHED_HORIZON_MS = 3456e7;
	/**
	* The queue is one document per workspace, and an entry carries its whole
	* text: a few members each holding fifty long drafts would push it past the
	* store's value limit, after which nothing could be scheduled or delivered.
	*/
	var SCHED_DOC_BYTES = 25e4;
	/**
	* The workspace document holds every channel's description, topic and
	* bookmarks and every member's card: any member may create channels and
	* curate the bookmarks of the ones they are in, so without a ceiling one
	* could push it past the store's value limit, after which no join, role
	* change, invite or counter in the workspace could be written. Refused at
	* the two routes that add free text to it, well short of the limit.
	*/
	var WS_DOC_BYTES = 3e5;
	function assertWorkspaceRoom(ws, { joining = false } = {}) {
		if (JSON.stringify(ws).length <= WS_DOC_BYTES) return;
		if (joining) fail(400, "limit", `${ws.name || "This workspace"} has no room for another member right now; ask one of its admins to remove some channels, bookmarks or descriptions`);
		fail(400, "limit", "This workspace holds as much as it can; remove some channels, bookmarks or descriptions first");
	}
	/**
	* A member's own document has the same ceiling: it carries their direct
	* messages (each one an entry with its members), their read cursors and
	* settings, and nothing of it can be written once the store refuses the
	* document, not a read cursor, a badge or a push subscription. A direct
	* message is written to every participant's document, so one member could
	* fill another's by starting group conversations that named them, thousands
	* of them, each a little different; refused here, for the caller's document
	* and each participant's, well short of the limit (see also
	* LIMITS.dmsPerMember, which bounds what any one member can start).
	*/
	var MEMBER_DOC_BYTES = 3e5;
	function assertMemberRoom(doc, name) {
		if (JSON.stringify(doc || {}).length > MEMBER_DOC_BYTES) fail(400, "limit", name ? `${name} is in as many conversations as one can hold here` : "You are in as many conversations as one can hold here");
	}
	function assertQueueRoom(queue) {
		if (JSON.stringify(queue).length > SCHED_DOC_BYTES) fail(400, "limit", "Too much is waiting to be sent in this workspace; try again once some of it has gone out");
	}
	async function scheduleEntry(wsId, entry) {
		await kv().update(KEYS.sched(wsId), { [`m.${entry.id}`]: entry });
		await lowerNextDue(wsId, entry.dueAt, await bumpQueue(wsId));
	}
	/**
	* Note that the queue gained an entry, or one of its entries a time: a count
	* on the activity document (`qv`) that a recompute of the next due time
	* reads before and after its work (see recomputeNextDue). Written after the
	* entry itself, and before the next due time is lowered for it. Returns what
	* the store handed back (the document, on a store that answers with it).
	*/
	async function bumpQueue(wsId) {
		return kv().incr(KEYS.activity(wsId), { qv: 1 }).catch(() => null);
	}
	/** The activity document, as an answer to a write on it shows it whole (its `w` or `c` on it), or null. */
	var activityDoc = (res) => res && typeof res === "object" && !Array.isArray(res) && (Object.hasOwn(res, "w") || Object.hasOwn(res, "c")) ? res : null;
	/**
	* Bring the next due time down to a new entry's, never up. A due time
	* already in the past is an entry come due that no poll has delivered yet
	* (the next poll does, and recomputes from the queue, this entry included;
	* see recomputeNextDue), or one a poll is delivering this moment (its
	* recompute reads the queue again when the count of changes moved under
	* it; see bumpQueue). Written over with this entry's time, as it used to
	* be, a past due time hid the entry come due from every poll until this
	* one's time: a message due at ten, scheduled a moment before someone else
	* scheduled one for tomorrow, went out tomorrow.
	*
	* Two people scheduling in the same instant each read the same due time (or
	* none) and each wrote their own below it, and when the later landed last the
	* earlier waited for it. Neither could tell from the document: each wrote
	* what it had read to be right, and a second read of it showed each its own
	* write, or the other's, which is the same document either way. So the due
	* time is recomputed from the queue after every lowering (see
	* recomputeNextDue, which reads the queue's count of changes before and
	* after and reads again when it moved): the other's entry was in the queue
	* before it came here (see scheduleEntry), so whichever recompute writes
	* last writes the earlier of the two. Judged instead by whether the count of
	* changes moved between the read and the write, as it used to be, two
	* entries whose counts both landed before either read went unnoticed by
	* both, and a message scheduled for ten went out at the other's time.
	*/
	async function lowerNextDue(wsId, dueAt, known = null) {
		const key = KEYS.activity(wsId);
		const act = activityDoc(known) || await kv().get(key) || {};
		if (act.nd && dueAt >= act.nd) return;
		await kv().update(key, { nd: dueAt });
		await recomputeNextDue(wsId);
	}
	/**
	* Recompute act.nd from what is left in the queue, read afresh: an entry
	* scheduled while a delivery ran is in the store but not in the snapshot
	* the delivery worked from, and a recompute from that snapshot would leave
	* it with no due time for any poll to notice.
	*
	* Read afresh is not enough on its own: an entry scheduled after this read
	* and before this write had its own due time written (see lowerNextDue)
	* only for this write to land over it, with a later time or with none, and
	* the message was never sent until something else changed the queue. So
	* the queue's count of changes (see bumpQueue) is read before the queue and
	* again after the write: a schedule that landed in between bumped it, or is
	* about to lower the due time itself after this write, so nothing of its
	* lands unseen; when it moved, the queue is read again.
	*/
	async function recomputeNextDue(wsId) {
		const actKey = KEYS.activity(wsId);
		for (let round = 0; round < 3; round++) {
			const read = await kv().get(actKey).catch(() => void 0);
			const known = !!read && typeof read === "object";
			const before = Number(read?.qv) || 0;
			const doc = await kv().get(KEYS.sched(wsId)) || { m: {} };
			const times = Object.values(doc.m || {}).filter((e) => e && !e.failed).map((e) => inDelivery(e) ? e.claimedAt + SCHED_CLAIM_MS : nextTryAt(e)).filter(Number.isFinite);
			if (times.length) {
				const nd = Math.min(...times);
				if (!known || read.nd !== nd) await kv().update(actKey, { nd });
			} else if (!known || Object.hasOwn(read, "nd")) await kv().remove(actKey, "nd").catch(() => {});
			if ((Number((await kv().get(actKey).catch(() => null))?.qv) || 0) === before) return;
		}
	}
	/**
	* Take what one person had waiting out of the workspace's queue, when they
	* leave or are removed. Their entries used to stay until their time came,
	* up to a year on, holding room in a queue every member's drafts share (a
	* departed member's fifty long drafts could refuse everyone else's) only to
	* be dropped unsent then; and one whose author had come back meanwhile was
	* posted, as if they had never left. The next due time follows what is left.
	* `who` is one person or a list of them (see disconnect): the queue is read
	* once for all of them, and the next due time recomputed once.
	*/
	async function dropScheduled(wsId, who) {
		const key = KEYS.sched(wsId);
		const gone = new Set(Array.isArray(who) ? who : [who]);
		if (!gone.size) return;
		const doc = await kv().get(key).catch(() => null);
		const all = Object.values(doc?.m || {}).filter((e) => e && e.id);
		const mine = all.filter((e) => gone.has(e.u));
		if (!mine.length) return;
		for (let i = 0; i < mine.length; i += 100) await kv().remove(key, ...mine.slice(i, i + 100).map((e) => `m.${e.id}`)).catch(() => {});
		const rest = all.filter((e) => !gone.has(e.u));
		for (const e of mine) await releaseScheduledFiles(wsId, e, rest).catch(() => {});
		await recomputeNextDue(wsId).catch(() => {});
	}
	/**
	* Let go of the files a scheduled message carried when the entry goes
	* without being posted: deleted by its author, refused at its time, taken
	* out with its author or its conversation. An upload is held by the
	* messages that carry it and released with the last of them; one that
	* only ever waited in the queue was never held, so its bytes stayed in the
	* owner's drive for good, ten megabytes at a time, with nothing to find
	* them by. Only the author's own uploads that nothing holds go: a file a
	* posted message carries (a forward names it) is that message's, and one
	* named by another entry still waiting (`others`) is that entry's.
	*/
	async function releaseScheduledFiles(wsId, entry, others) {
		const ids = [...new Set((entry?.attachments || []).map((a) => a && a.id).filter((id) => typeof id === "string"))];
		if (!ids.length) return;
		const held = /* @__PURE__ */ new Set();
		for (const e of others || []) for (const a of e?.attachments || []) if (a?.id) held.add(a.id);
		const metas = await getMany(ids.map((id) => KEYS.file(id)));
		let keep = null;
		for (let i = 0; i < ids.length; i++) {
			const meta = metas[i];
			if (!meta || meta.ws !== wsId || meta.u !== entry.u || (Number(meta.refs) || 0) > 0 || held.has(ids[i])) continue;
			if (!keep) keep = bookmarkedFiles(await kv().get(KEYS.ws(wsId)).catch(() => null));
			if (keep.has(ids[i])) continue;
			await fs().delete(`teamchat-files/${wsId}/${ids[i]}`).catch(() => {});
			await kv().del(KEYS.file(ids[i])).catch(() => {});
		}
	}
	/**
	* How long a delivery may hold an entry. A poll claims an entry before
	* posting it so that no two polls post it; a worker that dies in between
	* (a request cut short under a fan-out of pushes) used to leave the claim
	* standing for good, and a claimed entry was hidden from its author,
	* refused an edit, and never due again. A claim this old is a dead one:
	* the next poll takes the entry over. Deliveries take seconds, not minutes.
	*/
	var SCHED_CLAIM_MS = 3e5;
	/** A delivery that fails under the post (the store, not a refusal) is tried again this many times, then dropped. */
	var SCHED_MAX_TRIES = 5;
	var inDelivery = (e) => !!e.claims && (e.claimedAt || 0) + SCHED_CLAIM_MS > now();
	/** When the entry is next due: its time, or the retry set after a failed delivery, whichever is later. */
	var nextTryAt = (e) => Math.max(e.dueAt, e.retryAt || 0);
	/**
	* Take an entry for delivery. The claim counter goes up by one and the entry
	* is the caller's only when it then reads one more than the queue the caller
	* read said (an add that says nothing is trusted once). A stale claim (see
	* SCHED_CLAIM_MS) is counted past, not cleared first: two polls taking over
	* the same dead delivery both read the old count, and the one whose
	* increment lands first is the one that reads it plus one. Clearing it first
	* let both win: the second poll's clearing, reaching the store after the
	* first poll's claim, wiped that claim, and its own increment then started
	* the counter again at one — and a reminder, which carries no client id
	* for a repeat to be recognised by, was delivered twice.
	* 'gone' means another poll delivered and removed the entry between this
	* poll's read of the queue and its claim: the increment then put back a
	* bare counter where the entry was, which reads as a first claim on
	* something already sent, and the stub goes.
	*
	* Returns { status, entry }: the entry as it stands at the claim, where the
	* store's answer (or the read it made necessary) shows it whole, and as the
	* caller read it otherwise. What is delivered is that entry, not the one the
	* caller read from the queue a moment before: an edit or a new time landing
	* between the caller's read and its claim used to be lost, the words the poll
	* had read going out while the author was answered that their change had
	* been saved, and a message moved to tomorrow going out now (see flushDue,
	* which lets go of a claim on an entry no longer due).
	*/
	async function claimEntry(key, e) {
		await kv().update(key, { [`m.${e.id}.claimedAt`]: now() }).catch(() => {});
		try {
			const res = await kv().incr(key, { [`m.${e.id}.claims`]: 1 });
			let entry = res && typeof res === "object" ? res.m?.[e.id] : null;
			if (entry && entry.dueAt == null) {
				const doc = await kv().get(key).catch(() => void 0);
				if (doc === void 0) return {
					status: "lost",
					entry: e
				};
				const fresh = own(doc?.m, e.id);
				if (!fresh || fresh.dueAt == null) {
					if (fresh) await kv().remove(key, `m.${e.id}`).catch(() => {});
					return {
						status: "gone",
						entry: e
					};
				}
				entry = fresh;
			}
			const claims = entry ? entry.claims : res;
			const won = claims === (Number(e.claims) || 0) + 1 || claims === void 0;
			const whole = entry && typeof entry === "object" && entry.u && entry.dueAt != null && entry.id === e.id;
			return {
				status: won ? "won" : "lost",
				entry: whole ? entry : e
			};
		} catch {
			return {
				status: "lost",
				entry: e
			};
		}
	}
	/**
	* Let go of a claim taken on an entry that turned out not to be for
	* delivering (moved to a later time, or marked, between the poll's read of
	* the queue and its claim; see flushDue): the counter and the stamp come off,
	* and the entry is its author's again, listed and editable, due at its time.
	*/
	async function releaseClaim(key, id) {
		await kv().remove(key, `m.${id}.claims`, `m.${id}.claimedAt`).catch(() => {});
	}
	/**
	* Messages that were not sent that one member may have standing at once.
	* A refused message stays in the queue, marked, until its author edits,
	* moves, sends or deletes it (see markFailed); past this many, the oldest
	* goes with its files when another fails, so a queue every member's drafts
	* share is not filled by what one member never came back to.
	*/
	var FAILED_PER_MEMBER = 20;
	/** The oldest first: by when it failed, then by its time, then by when it was written. */
	var byFailedAge = (a, b) => a.failed.at - b.failed.at || a.dueAt - b.dueAt || (a.createdAt || 0) - (b.createdAt || 0) || (a.id < b.id ? -1 : 1);
	/**
	* A scheduled message refused at its time (the channel archived or made
	* admins-only since, the author no longer in it, a thread's root gone, an
	* external member's standing run out) is kept for its author rather than
	* dropped: marked with when and why, in the words the live post would have
	* answered with, so the Later view can say "Not sent" and offer Edit,
	* Reschedule, Send now and Delete. Dropped, it took the words the author
	* wrote with it, with no word to them that it had not gone out. A marked
	* message is never tried again on its own (flushDue and recomputeNextDue
	* skip it); an edit or a new time clears the mark, "Send now" tries at
	* once, and Delete lets its files go, as ever. The mark goes on before the
	* claim is let go of, so a poll reading in between finds it marked and
	* leaves it. Returns the author's oldest marked message when this one puts
	* them past FAILED_PER_MEMBER, taken off the queue here for the caller to
	* release its files; `doc` (the caller's reading of the queue) is kept in
	* step so a poll marking several counts them right.
	*/
	async function markFailed(key, doc, e, refusal) {
		const failed = {
			at: now(),
			code: String(refusal?.code || "refused"),
			message: String(refusal?.message || "This message could not be sent")
		};
		await kv().update(key, { [`m.${e.id}.failed`]: failed });
		await kv().remove(key, `m.${e.id}.claims`, `m.${e.id}.claimedAt`, `m.${e.id}.tries`, `m.${e.id}.retryAt`).catch(() => {});
		const { claims, claimedAt, tries, retryAt, ...rest } = doc.m[e.id] || e;
		doc.m[e.id] = {
			...rest,
			failed
		};
		const mine = Object.values(doc.m).filter((x) => x && x.id && x.u === e.u && x.kind !== "reminder" && x.failed).sort(byFailedAge);
		if (mine.length <= FAILED_PER_MEMBER) return null;
		const oldest = mine[0];
		await kv().remove(key, `m.${oldest.id}`).catch(() => {});
		delete doc.m[oldest.id];
		return oldest;
	}
	/**
	* Deliver whatever is due. Runs at the tail of a sync poll when act.nd has
	* passed; never throws (a failure here must not break the poll).
	*/
	async function flushDue(ws) {
		if (ws.movedTo || ws.importing || frozen(ws)) return;
		const wsId = ws.id;
		const key = KEYS.sched(wsId);
		const doc = await kv().get(key) || { m: {} };
		for (const [id, e] of Object.entries(doc.m || {})) {
			if (e && e.u && e.dueAt != null) continue;
			await kv().remove(key, `m.${id}`).catch(() => {});
			delete doc.m[id];
		}
		const due = Object.values(doc.m || {}).filter((e) => !e.failed && nextTryAt(e) <= now() && !inDelivery(e));
		const evicted = [];
		for (const read of due) {
			const claim = await claimEntry(key, read);
			if (claim.status === "gone") delete doc.m[read.id];
			if (claim.status !== "won") continue;
			const e = claim.entry;
			doc.m[e.id] = e;
			if (e.failed || nextTryAt(e) > now()) {
				await releaseClaim(key, e.id);
				continue;
			}
			let res;
			try {
				res = await deliver(ws, e);
			} catch (err) {
				console.error("scheduled delivery failed", e.id, err);
				const tries = (e.tries || 0) + 1;
				if (tries < SCHED_MAX_TRIES) {
					await kv().update(key, {
						[`m.${e.id}.tries`]: tries,
						[`m.${e.id}.retryAt`]: now() + 3e4 * tries
					}).catch(() => {});
					await kv().remove(key, `m.${e.id}.claims`).catch(() => {});
					continue;
				}
				res = null;
			}
			if (res && typeof res === "object") {
				const dropped = await markFailed(key, doc, e, res).catch(() => null);
				if (dropped) evicted.push(dropped);
				continue;
			}
			await kv().remove(key, `m.${e.id}`).catch(() => {});
			delete doc.m[e.id];
			if (res === null && e.kind !== "reminder") evicted.push(e);
		}
		if (evicted.length) {
			const fresh = await kv().get(key).catch(() => null);
			const rest = Object.values((fresh || doc).m || {}).filter((x) => x && x.id);
			for (const e of evicted) await releaseScheduledFiles(wsId, e, rest).catch(() => {});
		}
		await recomputeNextDue(wsId);
	}
	/**
	* The message in `conv` written under a client id by `uuid`, if one is in
	* the newest two blocks (a repeat follows its original closely; see
	* postMessage, which looks the same way for a repeated post): the raw
	* record, or null.
	*/
	async function findByCid(conv, cid, uuid) {
		const head = Number(await kv().get(KEYS.seq(conv)).catch(() => 0)) || 0;
		const n = blockIndexOf(Math.max(1, head));
		const blocks = await getMany(n > 0 ? [KEYS.block(conv, n), KEYS.block(conv, n - 1)] : [KEYS.block(conv, n)]);
		for (const b of blocks) {
			const dup = (b?.m || []).find((m) => m && m.cid === cid && m.u === uuid);
			if (dup) return dup;
		}
		return null;
	}
	/**
	* Deliver one entry. For a message: true when it was posted (now, or by a
	* delivery that died after posting); the refusal, { code, message } as the
	* live post would have answered, when it was refused, which keeps it for its
	* author (see markFailed); null when the entry is to go (its author no
	* longer here). A reminder answers nothing: delivered, or with nothing left
	* to remind of, it goes either way.
	*/
	async function deliver(ws, e) {
		const member = ws.members[e.u];
		if (!member) return null;
		const docRaw = await kv().get(KEYS.member(ws.id, e.u)) || {};
		const doc = {
			channels: docRaw.channels || [],
			dms: docRaw.dms || {},
			reads: docRaw.reads || {},
			mentions: docRaw.mentions || {},
			notify: docRaw.notify || {},
			threads: docRaw.threads || {},
			inbox: docRaw.inbox || 0
		};
		const ctx = {
			ws,
			member,
			doc,
			uuid: e.u
		};
		if (e.kind === "reminder") {
			const found = await locateMessage(e.conv, e.seq).catch(() => null);
			if (!found || found.overlay.d) return;
			try {
				resolveConv(ctx, e.conv);
			} catch {
				return;
			}
			const ts = now();
			const self = own(doc.dms, dmConvId([e.u])) ? dmConvId([e.u]) : dmConvId([e.u], ws.id);
			if (!doc.dms[self] || !await findByCid(self, e.id, e.u)) {
				if (!doc.dms[self]) {
					await ensureBlock(self, 0);
					await kv().update(KEYS.member(ws.id, e.u), { [`dms.${self}`]: {
						members: [e.u],
						createdAt: ts
					} });
				}
				await writeMessage(ws.id, self, {
					u: e.u,
					t: e.note ? `Reminder: ${e.note}` : "Reminder",
					ts,
					k: "rem",
					ref: {
						c: e.conv,
						s: e.seq
					},
					cid: e.id
				}, { by: "sys" });
			}
			const ring = (await kv().get(KEYS.inbox(ws.id, e.u)).catch(() => null))?.items;
			if (!(Array.isArray(ring) && ring.some((x) => x && x.k === "reminder" && x.rid === e.id))) await pushInbox(ws.id, [e.u], {
				k: "reminder",
				c: e.conv,
				s: e.seq,
				by: e.u,
				ts,
				note: e.note || "",
				rid: e.id
			});
			await pokeMember(ws.id, e.u).catch(() => {});
			return;
		}
		const base = parentOfThread(String(e.conv || ""))?.conv || String(e.conv || "");
		if (!base.startsWith("dm_") && !own(ws.channels || {}, base)) return null;
		try {
			assertAttested(member);
			await postMessage(ctx, e.conv, {
				text: e.text,
				attachments: e.attachments || [],
				cid: e.id
			}, { scheduled: true });
			return true;
		} catch (err) {
			if (!(err instanceof HttpError)) throw err;
			return {
				code: err.code,
				message: err.message
			};
		}
	}
	function validDue(v) {
		const t = Math.floor(Number(v));
		if (!Number.isFinite(t) || t < now() - 6e4) fail(400, "invalid", "Pick a time in the future");
		if (t > now() + SCHED_HORIZON_MS) fail(400, "invalid", "That is more than a year away");
		return t;
	}
	/** Schedule a message: it is checked now as if posted, then queued for its time. */
	router.post("/api/ws/:ws/scheduled", route(async ({ params, request, user }) => {
		const ctx = await requireMembership(params.ws, user, { write: true });
		const id = ctx.id;
		const body = await readJson(request);
		const conv = resolveConv(ctx, String(body.conv || ""));
		if (!conv.canPost) refusePost(conv);
		const text = cleanText(body.text, LIMITS.messageText);
		const named = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, LIMITS.attachmentsPerMessage).filter((a) => a && typeof a.id === "string" && /^[a-z0-9]{8,24}$/.test(a.id)).map((a) => ({ id: a.id }));
		if (!text && !named.length) fail(400, "invalid", "Write something first");
		const metas = named.length ? await getMany(named.map((a) => KEYS.file(a.id))) : [];
		const attachments = named.filter((a, i) => metas[i] && metas[i].ws === params.ws && mayTakeFile(ctx, a.id, metas[i]));
		if (!text && !attachments.length) fail(400, "invalid", "Those files are not in this workspace");
		assertBroadcast(ctx, conv, text);
		await assertThreadRoot(conv);
		const dueAt = validDue(body.dueAt);
		const queue = await kv().get(KEYS.sched(params.ws)) || { m: {} };
		if (Object.values(queue.m || {}).filter((e) => e.u === id.uuid && e.kind !== "reminder").length >= LIMITS.scheduledPerMember) fail(400, "limit", `You can have up to ${LIMITS.scheduledPerMember} scheduled messages`);
		assertQueueRoom(queue);
		const entry = {
			id: uid(10),
			kind: "message",
			u: id.uuid,
			conv: conv.id,
			text,
			attachments,
			dueAt,
			createdAt: now()
		};
		await scheduleEntry(params.ws, entry);
		return { scheduled: entry };
	}));
	/** Set a reminder about a message for yourself. */
	router.post("/api/ws/:ws/reminders", route(async ({ params, request, user }) => {
		const ctx = await requireMembership(params.ws, user, { write: true });
		const id = ctx.id;
		const body = await readJson(request);
		const conv = String(body.conv || "");
		const seq = Math.floor(Number(body.seq));
		if (!/^[a-z0-9_]{1,64}$/.test(conv) || !Number.isInteger(seq) || seq < 1) fail(400, "invalid", "Bad message reference");
		resolveConv(ctx, conv);
		const found = await locateMessage(conv, seq);
		if (!found || found.overlay.d) fail(404, "not_found", "Message not found");
		const dueAt = validDue(body.dueAt);
		const queue = await kv().get(KEYS.sched(params.ws)) || { m: {} };
		if (Object.values(queue.m || {}).filter((e) => e.u === id.uuid && e.kind === "reminder").length >= LIMITS.remindersPerMember) fail(400, "limit", `You can have up to ${LIMITS.remindersPerMember} reminders`);
		assertQueueRoom(queue);
		const entry = {
			id: uid(10),
			kind: "reminder",
			u: id.uuid,
			conv,
			seq,
			note: cleanLine(body.note, 120),
			dueAt,
			createdAt: now()
		};
		await scheduleEntry(params.ws, entry);
		return { reminder: entry };
	}));
	/** The caller's own pending items: scheduled messages and reminders. */
	router.get("/api/ws/:ws/scheduled", route(async ({ params, user }) => {
		const ctx = await requireMembership(params.ws, user, { also: [KEYS.sched(params.ws)] });
		const id = ctx.id;
		const key = KEYS.sched(params.ws);
		const queue = ctx.extra[0] || { m: {} };
		const mine = Object.values(queue.m || {}).filter((e) => e.u === id.uuid && !inDelivery(e)).sort((a, b) => a.dueAt - b.dueAt);
		const all = mine.filter((e) => e.kind === "reminder").map((r) => ({
			...r,
			c: r.conv,
			s: r.seq
		}));
		const reminders = readable(ctx, all);
		const withMessages = await attachMessages(reminders);
		const frozenOrMoved = ctx.ws.importing || ctx.ws.movedTo || frozen(ctx.ws);
		const read = new Set(frozenOrMoved ? [] : blockKeysOf(reminders, 12));
		const gone = new Set(frozenOrMoved ? [] : [...all.filter((e) => isGone(ctx, e.c)).map((e) => e.id), ...withMessages.filter((e) => read.has(KEYS.block(e.c, blockIndexOf(e.s))) && (!e.message || e.message.deleted)).map((e) => e.id)]);
		if (gone.size) {
			await kv().remove(key, ...[...gone].map((rid) => `m.${rid}`)).catch(() => {});
			await recomputeNextDue(params.ws).catch(() => {});
		}
		return {
			scheduled: mine.filter((e) => e.kind !== "reminder"),
			reminders: withMessages.filter((e) => !gone.has(e.id)).map(({ c, s, ...r }) => r)
		};
	}));
	/**
	* Edit, reschedule (snooze), or send now. Only the author's own entries. A
	* write like any other: the queue of a workspace that moved went with it,
	* and an edit or a deletion here would be answered as done and never reach
	* the copy that will deliver the entry, so a moved copy answers 423 with
	* the new reference, as every write does, and the client follows.
	*/
	router.put("/api/ws/:ws/scheduled/:id", route(async ({ params, request, user }) => {
		const { id, ws, member, doc, extra } = await requireMembership(params.ws, user, {
			write: true,
			also: [KEYS.sched(params.ws)]
		});
		const key = KEYS.sched(params.ws);
		const queue = extra[0] || { m: {} };
		const e = own(queue.m, params.id);
		if (!e || e.u !== id.uuid) fail(404, "not_found", "Nothing scheduled with that id");
		if (inDelivery(e)) fail(409, "sending", e.kind === "reminder" ? "This reminder is being delivered already" : "This message is being sent already");
		const body = await readJson(request);
		if (body.sendNow) {
			if (e.kind === "reminder") fail(400, "invalid", "A reminder cannot be sent");
			const claim = await claimEntry(key, e);
			if (claim.status === "gone") fail(404, "not_found", "Nothing scheduled with that id");
			if (claim.status !== "won") fail(409, "sending", "This message is being sent already");
			const cur = claim.entry;
			try {
				await postMessage({
					ws,
					member,
					doc,
					uuid: id.uuid
				}, cur.conv, {
					text: cur.text,
					attachments: cur.attachments || [],
					cid: cur.id
				}, { scheduled: true });
			} catch (err) {
				if (err instanceof HttpError) {
					const dropped = await markFailed(key, queue, e, {
						code: err.code,
						message: err.message
					}).catch(() => null);
					if (dropped) await releaseScheduledFiles(params.ws, dropped, Object.values((await kv().get(key).catch(() => null) || queue).m || {}).filter((x) => x && x.id)).catch(() => {});
					await recomputeNextDue(params.ws).catch(() => {});
				} else await kv().remove(key, `m.${e.id}.claims`).catch(() => {});
				throw err;
			}
			await kv().remove(key, `m.${e.id}`).catch(() => {});
			await recomputeNextDue(params.ws);
			return {
				ok: true,
				sent: true
			};
		}
		const patch = {};
		if (body.text !== void 0) {
			if (e.kind === "reminder") patch[`m.${e.id}.note`] = cleanLine(body.text, 120);
			else {
				const text = cleanText(body.text, LIMITS.messageText);
				if (!text && !(e.attachments || []).length) fail(400, "invalid", "Write something first");
				let conv = null;
				try {
					conv = resolveConv({
						ws,
						member,
						doc
					}, e.conv);
				} catch {
					conv = null;
				}
				if (conv) assertBroadcast({
					ws,
					member,
					doc,
					uuid: id.uuid
				}, conv, text);
				if (text.length > (e.text || "").length) assertQueueRoom({
					...queue,
					m: {
						...queue.m,
						[e.id]: {
							...e,
							text
						}
					}
				});
				patch[`m.${e.id}.text`] = text;
			}
		}
		if (body.dueAt !== void 0) patch[`m.${e.id}.dueAt`] = validDue(body.dueAt);
		if (!Object.keys(patch).length) fail(400, "invalid", "Nothing to change");
		const res = await kv().update(key, patch);
		const answered = !!(res && typeof res === "object" && res.m);
		let after = answered ? own(res.m, e.id) : own((await kv().get(key))?.m, e.id);
		if (after && !after.u && answered) after = own((await kv().get(key))?.m, e.id);
		if (after && !after.u) {
			await kv().remove(key, `m.${e.id}`).catch(() => {});
			fail(404, "not_found", "Nothing scheduled with that id");
		}
		if (!after) fail(404, "not_found", "Nothing scheduled with that id");
		if (after && inDelivery(after)) fail(409, "sending", e.kind === "reminder" ? "This reminder is being delivered already" : "This message is being sent already");
		if (e.failed) await kv().remove(key, `m.${e.id}.failed`, `m.${e.id}.tries`, `m.${e.id}.retryAt`).catch(() => {});
		await bumpQueue(params.ws);
		await recomputeNextDue(params.ws);
		return { ok: true };
	}));
	router.delete("/api/ws/:ws/scheduled/:id", route(async ({ params, user }) => {
		const { id, extra } = await requireMembership(params.ws, user, {
			write: true,
			doc: false,
			also: [KEYS.sched(params.ws)]
		});
		const key = KEYS.sched(params.ws);
		const queue = extra[0] || { m: {} };
		const e = own(queue.m, params.id);
		if (!e || e.u !== id.uuid) fail(404, "not_found", "Nothing scheduled with that id");
		if (inDelivery(e)) fail(409, "sending", e.kind === "reminder" ? "This reminder is being delivered already" : "This message is being sent already");
		const claim = await claimEntry(key, e);
		if (claim.status === "gone") fail(404, "not_found", "Nothing scheduled with that id");
		if (claim.status !== "won") fail(409, "sending", e.kind === "reminder" ? "This reminder is being delivered already" : "This message is being sent already");
		await kv().remove(key, `m.${e.id}`);
		await releaseScheduledFiles(params.ws, claim.entry, Object.values(queue.m).filter((x) => x && x.id !== e.id)).catch(() => {});
		await recomputeNextDue(params.ws);
		return { ok: true };
	}));
	/** This worker's VAPID public key, which the browser needs to subscribe. */
	router.get("/api/ws/:ws/push/key", route(async ({ params, user }) => {
		await requireMembership(params.ws, user, { doc: false });
		return { key: (await vapidKeys()).pub };
	}));
	/**
	* Register (or refresh) this device's subscription for the caller in a
	* workspace, along with the device's quiet hours and pause so pushes can
	* respect them while the app is closed. Keyed by a hash of the endpoint.
	*/
	router.post("/api/ws/:ws/push", route(async ({ params, request, user }) => {
		const { id, doc } = await requireMembership(params.ws, user);
		const body = await readJson(request);
		const sub = body.subscription;
		if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !allowedUrl(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) fail(400, "invalid", "Bad push subscription");
		if (sub.endpoint.length > 2048 || String(sub.keys.p256dh).length > 256 || String(sub.keys.auth).length > 128) fail(400, "invalid", "Bad push subscription");
		const sid = (await sha256(sub.endpoint)).slice(0, 16);
		const existing = doc.push || {};
		if (!existing[sid] && Object.keys(existing).length >= PUSH_DEVICES) fail(400, "limit", `Up to ${PUSH_DEVICES} devices per workspace`);
		const prefs = body.prefs && typeof body.prefs === "object" ? {
			pauseUntil: Number(body.prefs.pauseUntil) || null,
			tzOffset: Number(body.prefs.tzOffset) || 0,
			dnd: body.prefs.dnd && typeof body.prefs.dnd === "object" ? {
				enabled: !!body.prefs.dnd.enabled,
				from: Number(body.prefs.dnd.from),
				to: Number(body.prefs.dnd.to)
			} : null
		} : null;
		const written = await kv().update(KEYS.member(params.ws, id.uuid), { [`push.${sid}`]: {
			endpoint: sub.endpoint,
			keys: {
				p256dh: String(sub.keys.p256dh),
				auth: String(sub.keys.auth)
			},
			prefs,
			preview: body.preview !== false,
			ts: now()
		} });
		const after = written && typeof written === "object" && written.push ? written.push : (await kv().get(KEYS.member(params.ws, id.uuid)))?.push;
		const subs = Object.entries(after || {});
		if (subs.length > PUSH_DEVICES) {
			subs.sort((a, b) => (Number(a[1]?.ts) || 0) - (Number(b[1]?.ts) || 0));
			await kv().remove(KEYS.member(params.ws, id.uuid), ...subs.slice(0, subs.length - PUSH_DEVICES).map(([k]) => `push.${k}`)).catch(() => {});
		}
		return {
			ok: true,
			id: sid
		};
	}));
	router.delete("/api/ws/:ws/push", route(async ({ params, request, user }) => {
		const { id } = await requireMembership(params.ws, user, { doc: false });
		const body = await readJson(request);
		if (typeof body.endpoint !== "string") fail(400, "invalid", "Which device?");
		const sid = (await sha256(body.endpoint)).slice(0, 16);
		await kv().remove(KEYS.member(params.ws, id.uuid), `push.${sid}`).catch(() => {});
		return { ok: true };
	}));
	/** Typing entries older than this are gone; a little wider than the client's throttle. */
	var TYPING_FRESH_MS = 8e3;
	var ACTIVITY_PRUNE_AT = 1e3;
	var THREAD_ENTRY_QUIET_MS = 2592e6;
	/**
	* The most the activity document may run to before a poll lets go of its
	* quietest thread and direct-message entries whatever their age: well under
	* the store's ceiling (400 KB), with room for every member's heartbeat,
	* status and stamp and every channel's entry beside some two thousand of them.
	*/
	var ACTIVITY_BYTES = 256e3;
	/** Prune stale typing entries once the map holds more than this many. */
	var TYPING_PRUNE_AT = 20;
	/**
	* "I am typing here": one path write into the activity document, the same
	* shape as the presence heartbeat, expiring by time so a closed tab never
	* leaves a stuck indicator. `stop` removes it early (on send or clear).
	*/
	router.post("/api/ws/:ws/conv/:conv/typing", route(async ({ params, request, user, defer }) => {
		const ctx = await requireMembership(params.ws, user);
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		if (!conv.canPost) return { ok: true };
		if (conv.kind === "thread") {
			const root = await locateMessage(conv.parent.conv, conv.parent.seq);
			if (!root || root.overlay.d) fail(404, "not_found", "Message not found");
		}
		const body = await readJson(request);
		const path = `t.${params.conv}.${id.uuid}`;
		if (body.stop) await kv().remove(KEYS.activity(params.ws), path).catch(() => {});
		else {
			const at = now();
			await kv().update(KEYS.activity(params.ws), { [path]: at });
			if (body.first !== false) defer(() => signal(params.ws, audienceOf(conv), {
				entries: [{
					conv: params.conv,
					body: { ty: {
						u: id.uuid,
						at
					} }
				}],
				ws: ctx.ws
			}));
		}
		return { ok: true };
	}));
	/**
	* A huddle is over: its entry leaves the activity document and the
	* conversation gets a line saying how long it ran. Several polls may notice
	* the same ending at once, so the line is claimed first with an atomic
	* increment (the poll that takes the counter from nothing to one writes it;
	* the rest only tidy), as scheduled delivery does. The counter lives beside
	* the roster, under the huddle's start stamp (`he.{conv}.t{at}`), not on the
	* entry itself: a poll that read the roster before the winner removed it
	* and claimed after would find a counter on the entry gone and start it
	* again at one, and the line would be written twice. A conversation's older
	* counters, all settled by then, go with the winner's tidy.
	*/
	async function endHuddle(wsId, conv, entry, act = null, ws = null, audience = null) {
		const key = KEYS.activity(wsId);
		if (ws && !String(conv).startsWith("dm_") && !own(ws.channels || {}, conv)) {
			await kv().remove(key, `h.${conv}`, ...Object.keys(act?.he?.[conv] || {}).map((s) => `he.${conv}.${s}`)).catch(() => {});
			return;
		}
		const stamp = `t${typeof entry?.at === "number" ? entry.at : 0}`;
		let won = true;
		try {
			const res = await kv().incr(key, { [`he.${conv}.${stamp}`]: 1 });
			const claims = res && typeof res === "object" ? res.he?.[conv]?.[stamp] : res;
			won = claims === 1 || claims === void 0;
		} catch {
			won = false;
		}
		const drop = [`h.${conv}`];
		if (won) {
			for (const old of Object.keys(act?.he?.[conv] || {})) if (old !== stamp) drop.push(`he.${conv}.${old}`);
		}
		await kv().remove(key, ...drop).catch(() => {});
		if (!won) return;
		if (!entry?.m || typeof entry.m !== "object") return;
		if (ws && own(ws.channels || {}, conv)?.archived) return;
		const startedAt = typeof entry?.at === "number" ? entry.at : null;
		const text = startedAt ? `Huddle ended after ${durationText(now() - startedAt)}` : "Huddle ended";
		await postSystem(wsId, conv, entry?.by || "sys", text, { by: "sys" }).catch(() => {});
		await signal(wsId, audience);
	}
	/**
	* "I am in the huddle here": start one, join the one in progress, or, sent
	* again every HUDDLE_HEARTBEAT_MS, stay in it. The body carries the invite
	* code of the caller's own Puter Peer server, which is what the others dial;
	* the roster that comes back is what the caller dials. Threads have no
	* huddles of their own (the conversation's is theirs), and a channel has to
	* be joined, not merely previewed.
	*
	* One seat per account, held by one tab: the body names the tab (`sid`)
	* and whether this is its join (`join`) or a heartbeat. A join takes the
	* seat, from another tab of the same account too; a heartbeat for a seat
	* that another tab has since taken is refused (`replaced`), so the tab that
	* joined last keeps it, whichever beats first.
	*/
	router.post("/api/ws/:ws/conv/:conv/huddle", route(async ({ params, request, user, defer }) => {
		const ctx = await requireMembership(params.ws, user);
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		if (conv.kind === "thread") fail(400, "invalid", "Huddles happen in a channel or a direct message, not in a thread");
		if (conv.channel?.archived) fail(403, "archived", "This channel is archived");
		if (!conv.joined) fail(403, "not_joined", "Join the channel to huddle in it");
		const audience = audienceOf(conv);
		const body = await readJson(request);
		const invite = typeof body.invite === "string" && INVITE_RE.test(body.invite) ? body.invite : null;
		if (!invite) fail(400, "invalid", "A huddle needs the invite code of your peer server");
		const sid = typeof body.sid === "string" && SESSION_RE.test(body.sid) ? body.sid : null;
		const ts = now();
		const key = KEYS.activity(params.ws);
		const act = await kv().get(key) || {};
		const raw = act.h?.[params.conv];
		let cur = liveHuddle(raw, ts);
		assertWritable(ctx.ws, { moving: !!cur });
		const mine = cur?.m?.[id.uuid] || null;
		const heldBy = mine && typeof raw.m[id.uuid].s === "string" ? raw.m[id.uuid].s : null;
		if (sid && heldBy && heldBy !== sid && body.join !== true) fail(409, "replaced", "You joined this huddle from another tab");
		const seat = {
			at: ts,
			j: mine ? mine.j : ts,
			inv: invite
		};
		if (sid) seat.s = sid;
		let started = false;
		if (!cur) {
			if (raw) await endHuddle(params.ws, params.conv, raw, act, ctx.ws, audience).catch(() => {});
			await kv().update(key, {
				[`h.${params.conv}.by`]: id.uuid,
				[`h.${params.conv}.at`]: ts,
				[`h.${params.conv}.m.${id.uuid}`]: seat
			});
			const res = await kv().incr(key, { [`h.${params.conv}.n`]: 1 }).catch(() => null);
			const n = res && typeof res === "object" ? res.h?.[params.conv]?.n : res;
			started = n === 1 || n === void 0 || n === null;
		} else {
			if (!mine && Object.keys(cur.m).length >= 20) fail(409, "full", `A huddle holds up to 20 people`);
			const res = await kv().update(key, { [`h.${params.conv}.m.${id.uuid}`]: seat });
			let after = res && typeof res === "object" ? res.h?.[params.conv] : void 0;
			if (after && typeof after === "object" && !Object.hasOwn(after, "at")) after = (await kv().get(key).catch(() => void 0))?.h?.[params.conv];
			if (after && typeof after === "object" && !Object.hasOwn(after, "at")) {
				await kv().update(key, {
					[`h.${params.conv}.by`]: id.uuid,
					[`h.${params.conv}.at`]: ts
				});
				const claim = await kv().incr(key, { [`h.${params.conv}.n`]: 1 }).catch(() => null);
				const n = claim && typeof claim === "object" ? claim.h?.[params.conv]?.n : claim;
				started = n === 1 || n === void 0 || n === null;
				cur = null;
			}
		}
		if (started) {
			const name = ctx.member.name || ctx.member.username || "Someone";
			const seq = await postSystem(params.ws, params.conv, id.uuid, `${name} started a huddle`, { by: body.join === true ? id.uuid : "sys" });
			if (conv.kind === "dm") {
				const others = conv.dm.members.filter((u) => u !== id.uuid && own(ctx.ws.members, u));
				if (others.length) {
					await pushInbox(params.ws, others, {
						k: "huddle",
						c: params.conv,
						s: seq,
						by: id.uuid,
						ts
					});
					defer(async () => {
						await incrPaths(KEYS.activity(params.ws), Object.fromEntries(others.map((u) => [`u.${u}`, 1])));
						await signal(params.ws, others);
						await sendPushes(ctx.ws, others, {
							mentioned: new Set(others),
							conv: params.conv,
							mentionConv: params.conv,
							seq,
							kind: "dm",
							title: name,
							body: "started a huddle",
							quiet: "started a huddle",
							threadRoot: null,
							call: true
						}).catch(() => {});
					});
				}
			}
		}
		let roster = cur ? {
			...cur,
			m: { ...cur.m }
		} : {
			by: id.uuid,
			at: ts,
			m: {}
		};
		roster.m[id.uuid] = {
			at: ts,
			j: seat.j,
			inv: invite
		};
		if (!cur && !started) {
			const after = liveHuddle((await kv().get(key).catch(() => null))?.h?.[params.conv], ts);
			if (after?.m?.[id.uuid]) roster = after;
		}
		if (!cur || !mine) await signal(params.ws, audience);
		return {
			huddle: roster,
			started,
			now: ts
		};
	}));
	/**
	* Leave the huddle here. The last one out ends it. A tab that names itself
	* (`?sid=`) gives up only a seat it holds: one another tab of the account
	* has taken since is that tab's to leave.
	*/
	router.delete("/api/ws/:ws/conv/:conv/huddle", route(async ({ params, request, user }) => {
		const ctx = await requireMembership(params.ws, user, { also: [KEYS.activity(params.ws)] });
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		const key = KEYS.activity(params.ws);
		const act = ctx.extra[0] || {};
		const raw = act.h?.[params.conv];
		if (!raw?.m?.[id.uuid]) return {
			ok: true,
			ended: false
		};
		const sid = query(request).get("sid");
		const heldBy = typeof raw.m[id.uuid].s === "string" ? raw.m[id.uuid].s : null;
		if (sid && heldBy && heldBy !== sid) return {
			ok: true,
			ended: false
		};
		const audience = audienceOf(conv);
		if (liveHuddle({
			...raw,
			m: Object.fromEntries(Object.entries(raw.m).filter(([u]) => u !== id.uuid))
		}, now())) {
			await kv().remove(key, `h.${params.conv}.m.${id.uuid}`);
			await signal(params.ws, audience);
			return {
				ok: true,
				ended: false
			};
		}
		await endHuddle(params.ws, params.conv, raw, act, ctx.ws, audience);
		return {
			ok: true,
			ended: true
		};
	}));
	/**
	* Mark the caller present: their heartbeat, with a small state beside it (do
	* not disturb; absent means plain "active"). `act` is the activity document
	* as already read, so a state that is gone is only removed when it was there.
	*/
	function recordPresence(wsId, uuid, act, state, at = now()) {
		const flag = state === "dnd" ? "dnd" : state === "off" ? "off" : null;
		const upd = { [`p.${uuid}`]: at };
		if (flag) upd[`ps.${uuid}`] = flag;
		const writes = [kv().update(KEYS.activity(wsId), upd).catch(() => {})];
		if (!flag && act.ps?.[uuid]) writes.push(kv().remove(KEYS.activity(wsId), `ps.${uuid}`).catch(() => {}));
		return Promise.all(writes);
	}
	/**
	* The tab is closing: the person is away from now rather than when their
	* last heartbeat lapses, a minute and a half on. The word goes beside the
	* heartbeat ('off'), so the poll's since filter carries it like any
	* heartbeat and the next heartbeat, from a tab that is still here or one
	* that opens, replaces it. Sent keepalive from pagehide; one write.
	*/
	router.delete("/api/ws/:ws/presence", route(async ({ params, user }) => {
		const [id, ws] = await Promise.all([identify(user), user?.puter ? kv().get(KEYS.ws(params.ws)) : null]);
		if (!ws || !ws.members?.[id.uuid]) fail(403, "forbidden", "You are not a member of this workspace");
		await recordPresence(params.ws, id.uuid, {}, "off");
		return { ok: true };
	}));
	router.get("/api/ws/:ws/sync", route(async ({ params, request, user, defer }) => {
		const named = validWsId(params.ws);
		const ready = named ? await peekIdentity(user) : null;
		let id = ready;
		let wsRead = null;
		let actRead = null;
		let docRead = null;
		let ctrRead = null;
		const counter = workerAppUid() ? [KEYS.evCounter(params.ws)] : [];
		if (ready) [wsRead, actRead, docRead, ctrRead = null] = await getMany([
			KEYS.ws(params.ws),
			KEYS.activity(params.ws),
			KEYS.member(params.ws, ready.uuid),
			...counter
		]);
		else {
			const [idRes, readRes] = await Promise.allSettled([identify(user), user?.puter && named ? getMany([
				KEYS.ws(params.ws),
				KEYS.activity(params.ws),
				...counter
			]) : [null, null]]);
			if (idRes.status === "rejected") throw idRes.reason;
			if (readRes.status === "rejected") throw readRes.reason;
			id = idRes.value;
			[wsRead, actRead, ctrRead = null] = readRes.value;
		}
		const q = query(request);
		const since = Math.max(0, Number(q.get("since")) || 0);
		const heartbeat = q.get("hb") === "1";
		const state = q.get("st");
		const readAt = now();
		const ws = wsRead;
		if (!ws || !ws.members?.[id.uuid]) fail(403, "forbidden", "You are not a member of this workspace");
		assertAttested(ws.members[id.uuid]);
		const act = actRead || {};
		const doc = (ready ? docRead : await kv().get(KEYS.member(params.ws, id.uuid))) || {};
		const me = ws.members[id.uuid];
		const sees = memberVisible(doc);
		const visible = isLimited(me) ? sees : (conv) => sees(conv) || isPublicChannel(ws, conv);
		const pending = heartbeat ? recordPresence(params.ws, id.uuid, act, state, readAt) : null;
		const c = {};
		const entries = Object.entries(act.c || {});
		for (const [conv, v] of entries) {
			if (!visible(conv)) continue;
			if (v && ((v.t || 0) > since || (v.x || 0) > since)) c[conv] = v;
		}
		const claims = Object.entries(act.he || {}).filter(([conv, stamps]) => !act.h?.[conv] && stamps && typeof stamps === "object" && Math.max(0, ...Object.keys(stamps).map((s) => Number(s.slice(1)) || 0)) < readAt - 864e5);
		if (entries.length + claims.length > ACTIVITY_PRUNE_AT) {
			const aged = [];
			for (const [conv, v] of entries) {
				if (!parentOfThread(conv) && !conv.startsWith("dm_")) continue;
				aged.push([
					`c.${conv}`,
					Math.max(v?.t || 0, v?.x || 0),
					jsonBytes(conv) + jsonBytes(v || {}) + 2
				]);
			}
			for (const [conv, stamps] of claims) aged.push([
				`he.${conv}`,
				Math.max(0, ...Object.keys(stamps).map((s) => Number(s.slice(1)) || 0)),
				jsonBytes(conv) + jsonBytes(stamps) + 2
			]);
			aged.sort((a, b) => a[1] - b[1]);
			const drop = [];
			let over = jsonBytes(act) - ACTIVITY_BYTES;
			for (const [path, last, bytes] of aged) {
				if (!(last < readAt - THREAD_ENTRY_QUIET_MS && drop.length < 100) && over <= 0) break;
				drop.push(path);
				over -= bytes;
			}
			for (let i = 0; i < drop.length; i += 100) await kv().remove(KEYS.activity(params.ws), ...drop.slice(i, i + 100)).catch(() => {});
		}
		const p = {};
		const ps = {};
		const peers = isLimited(me) ? new Set(Array.isArray(doc.peers) ? doc.peers : []) : null;
		for (const [u, t] of Object.entries(act.p || {})) {
			if (peers && !peers.has(u)) continue;
			if (t > since) {
				p[u] = t;
				if (act.ps?.[u]) ps[u] = act.ps[u];
			}
		}
		const t = {};
		const stale = [];
		let total = 0;
		for (const [conv, users] of Object.entries(act.t || {})) for (const [u, at] of Object.entries(users || {})) {
			total++;
			if (at < readAt - TYPING_FRESH_MS) {
				if (at < readAt - 6e4) stale.push(`t.${conv}.${u}`);
				continue;
			}
			if (u === id.uuid || !visible(conv)) continue;
			(t[conv] || (t[conv] = {}))[u] = at;
		}
		if (total > TYPING_PRUNE_AT && stale.length) await kv().remove(KEYS.activity(params.ws), ...stale.slice(0, 100)).catch(() => {});
		const out = {
			now: readAt - 2e3,
			ts: readAt,
			c,
			p,
			w: act.w || 0,
			u: act.u?.[id.uuid] || 0
		};
		if (ctrRead) out.rn = ringCount(ctrRead, id.uuid);
		if (Number.isFinite(act.nd) && act.nd > readAt) out.ndIn = act.nd - readAt;
		if (Object.keys(ps).length) out.ps = ps;
		if (Object.keys(t).length) out.t = t;
		if (act.h && typeof act.h === "object") {
			const live = liveHuddles(act.h, readAt);
			if (Object.keys(live).length) {
				const h = {};
				for (const [conv, entry] of Object.entries(live)) if (sees(conv)) h[conv] = entry;
				if (Object.keys(h).length) out.h = h;
			}
			const stale = stalePaths(act.h, readAt);
			const tidy = [];
			if (stale.drop.length) tidy.push(kv().remove(KEYS.activity(params.ws), ...stale.drop.slice(0, 100)).catch(() => {}));
			for (const conv of stale.ended) {
				const audience = own(ws.channels || {}, conv) ? audienceOf({ channel: ws.channels[conv] }) : null;
				tidy.push(endHuddle(params.ws, conv, act.h[conv], act, ws, audience).catch(() => {}));
			}
			if (tidy.length) await Promise.all(tidy);
		}
		if (act.nd && act.nd <= readAt && !ws.movedTo && !ws.importing && !frozen(ws)) {
			ws.channels = ws.channels || {};
			defer(() => flushDue(ws).catch((e) => console.error("flush failed", e)));
		}
		if (pending) await pending;
		return out;
	}));
	/**
	* Put the maker of a new channel into it, and count them in: the append onto
	* their own document is the claim (see enterChannel), and the count's answer
	* says whether their card still stands. The channel's entry was written a
	* moment ago with nobody counted; an admin removing the maker in that very
	* instant either closed their document before the append (which then finds
	* the stamp, or a document deleted, and counts nothing) or took their card
	* between the append and the count (their card is gone from what the count
	* hands back). Written with a plain append, as it used to be, the channel
	* counted its maker after the removal had counted them out, listed them on
	* a private channel's list with no card behind the name (a channel then
	* hidden from every admin, since its list was not empty, that nobody could
	* open or delete), and made a document of the channel alone for someone
	* gone. Such a channel is taken off again here, with its first block and,
	* for an entry standing for a channel hosted elsewhere, the connection's
	* record (`conn`), and the maker is answered as the member they no longer
	* are. True when they are in and counted.
	*/
	async function enterMadeChannel(ws, id, doc, chId, { conn = null } = {}) {
		let stands = (await enterChannel(ws.id, id.uuid, chId, doc)).status === "entered";
		if (stands) {
			const counted = await kv().incr(KEYS.ws(ws.id), { [`channels.${chId}.count`]: 1 });
			stands = await channelStands(ws.id, chId, counted) && !(counted && typeof counted === "object" && counted.members && !own(counted.members, id.uuid));
		}
		if (stands) return true;
		await kv().remove(KEYS.ws(ws.id), `channels.${chId}`).catch(() => {});
		await kv().del(KEYS.block(chId, 0)).catch(() => {});
		if (conn) await kv().del(KEYS.connectPartner(conn)).catch(() => {});
		await bumpWorkspace(ws.id).catch(() => {});
		fail(403, "forbidden", "You are not a member of this workspace");
	}
	router.post("/api/ws/:ws/channels", route(async ({ params, request, user, defer }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (isLimited(member)) fail(403, "forbidden", `${limitedWho(member)} cannot create channels`);
		const body = await readJson(request);
		const name = cleanChannelName(body.name);
		if (!name) fail(400, "invalid", "Channel names use lowercase letters, numbers, and hyphens");
		if (Object.values(ws.channels).some((c) => c.name === name)) fail(409, "exists", `#${name} already exists`);
		if (Object.keys(ws.channels).length >= 200) fail(400, "limit", "This workspace has the maximum number of channels");
		assertWorkspaceRoom(ws);
		const chId = uid(10);
		const ts = now();
		const channel = {
			id: chId,
			name,
			topic: cleanLine(body.topic, LIMITS.channelTopic),
			private: !!body.private,
			def: false,
			createdBy: id.uuid,
			createdAt: ts,
			count: 0
		};
		if (channel.private) channel.members = [id.uuid];
		await kv().update(KEYS.ws(ws.id), { [`channels.${chId}`]: channel });
		await kv().set(KEYS.block(chId, 0), {
			m: [],
			x: {}
		});
		await enterMadeChannel(ws, id, doc, chId);
		channel.count = 1;
		defer(async () => {
			await postSystem(ws.id, chId, id.uuid, `${ws.members[id.uuid].name} created #${name}`);
			await pokeAndBump(ws.id, id.uuid);
		});
		return { channel };
	}));
	router.put("/api/ws/:ws/channels/:ch", route(async ({ params, request, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		const channel = own(ws.channels, params.ch);
		if (!channel || channel.private && !doc.channels.includes(params.ch)) fail(404, "not_found", "Channel not found");
		if (isLimited(member)) fail(403, "forbidden", `${limitedWho(member)} cannot change a channel`);
		if (!(isAdmin(member) || channel.createdBy === id.uuid || doc.channels.includes(params.ch))) fail(403, "forbidden", "Join the channel to edit it");
		const forCaller = (c) => isAdmin(member) ? c : {
			...c,
			guestInvite: void 0,
			guestInviteExp: void 0,
			connectInvite: void 0,
			connectInviteExp: void 0
		};
		const body = await readJson(request);
		if (isPartnerEntry(channel)) {
			if (!isAdmin(member)) fail(403, "forbidden", "Only admins can rename a shared channel");
			const name = cleanChannelName(body.name);
			if (!name) fail(400, "invalid", "Channel names use lowercase letters, numbers, and hyphens");
			if (Object.keys(body).some((k) => k !== "name")) fail(400, "shared", "A shared channel is set up on the workspace that hosts it");
			if (name !== channel.name && Object.values(ws.channels).some((c) => c.name === name)) fail(409, "exists", `#${name} already exists`);
			const renamed = await kv().update(KEYS.ws(ws.id), { [`channels.${params.ch}.name`]: name });
			if (!await channelStands(ws.id, params.ch, renamed)) fail(404, "not_found", "Channel not found");
			await bumpWorkspace(ws.id);
			return { channel: forCaller({
				...channel,
				name
			}) };
		}
		if (channel.archived && body.archived !== false && [
			"name",
			"topic",
			"description",
			"bookmarks",
			"postPolicy",
			"broadcast",
			"threadPolicy"
		].some((k) => body[k] !== void 0)) fail(403, "archived", "This channel is archived; unarchive it to change it");
		if (body.archived === true && [
			"postPolicy",
			"broadcast",
			"threadPolicy"
		].some((k) => body[k] !== void 0)) fail(400, "invalid", "Archive the channel on its own; who may post, notify or reply in it is changed while it is open");
		const patch = {};
		let droppedFiles = [];
		if (typeof body.description === "string" || body.bookmarks !== void 0) assertWorkspaceRoom(ws);
		if (typeof body.name === "string") {
			const name = cleanChannelName(body.name);
			if (!name) fail(400, "invalid", "Channel names use lowercase letters, numbers, and hyphens");
			if (name !== channel.name && Object.values(ws.channels).some((c) => c.name === name)) fail(409, "exists", `#${name} already exists`);
			if (channel.def && !isAdmin(member)) fail(403, "forbidden", "Only admins can rename a default channel");
			patch[`channels.${params.ch}.name`] = name;
		}
		if (typeof body.topic === "string") patch[`channels.${params.ch}.topic`] = cleanLine(body.topic, LIMITS.channelTopic);
		if (typeof body.description === "string") patch[`channels.${params.ch}.description`] = cleanLine(body.description, LIMITS.channelDescription);
		if (body.bookmarks !== void 0) {
			if (!Array.isArray(body.bookmarks)) fail(400, "invalid", "bookmarks must be a list");
			if (body.bookmarks.length > LIMITS.bookmarksPerChannel) fail(400, "limit", `A channel can have up to ${LIMITS.bookmarksPerChannel} bookmarks`);
			const list = [];
			for (const b of body.bookmarks) {
				if (!b || typeof b !== "object") fail(400, "invalid", "Bad bookmark");
				const label = cleanLine(b.label, LIMITS.bookmarkLabel);
				if (!label) fail(400, "invalid", "Give the bookmark a name");
				const item = {
					id: /^[a-z0-9]{6,16}$/.test(String(b.id || "")) ? b.id : uid(8),
					label
				};
				if (typeof b.file === "string") {
					if (!/^[a-z0-9]{8,24}$/.test(b.file)) fail(400, "invalid", "Bad file reference");
					item.file = b.file;
				} else {
					const raw = typeof b.url === "string" ? b.url.trim() : "";
					if (raw.length > LIMITS.bookmarkUrl) fail(400, "invalid", `That link is too long (${LIMITS.bookmarkUrl} characters at most)`);
					const url = cleanText(raw, LIMITS.bookmarkUrl);
					if (!/^https?:\/\/[^\s]+$/i.test(url) || URL_CONTROLS_RE.test(url)) fail(400, "invalid", "Bookmarks need an http or https link");
					item.url = url;
				}
				list.push(item);
			}
			const files = list.filter((b) => b.file);
			if (files.length) (await getMany(files.map((b) => KEYS.file(b.file)))).forEach((m, i) => {
				if (!m || m.ws !== params.ws) fail(400, "invalid", "That file is not in this workspace");
				files[i].name = m.name;
			});
			patch[`channels.${params.ch}.bookmarks`] = list;
			const staying = new Set(files.map((b) => b.file));
			droppedFiles = (channel.bookmarks || []).map((b) => b?.file).filter((f) => typeof f === "string" && !staying.has(f));
		}
		if (typeof body.archived === "boolean") {
			if (!isAdmin(member) && channel.createdBy !== id.uuid) fail(403, "forbidden", "Only admins can archive channels");
			if (channel.def && body.archived) fail(400, "invalid", "Default channels cannot be archived");
			patch[`channels.${params.ch}.archived`] = body.archived;
		}
		const lines = [];
		const me = ws.members[id.uuid].name;
		if (body.postPolicy !== void 0) {
			if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change who may post");
			if (!POST_POLICIES.includes(body.postPolicy)) fail(400, "invalid", "Unknown posting policy");
			if ((channel.postPolicy || "members") !== body.postPolicy) {
				patch[`channels.${params.ch}.postPolicy`] = body.postPolicy;
				lines.push(body.postPolicy === "admins" ? `${me} limited posting to admins` : `${me} opened posting to everyone in the channel`);
			}
		}
		if (body.broadcast !== void 0) {
			if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change who may notify the channel");
			if (!BROADCAST_POLICIES.includes(body.broadcast)) fail(400, "invalid", "Unknown broadcast policy");
			if (broadcastPolicy(channel) !== body.broadcast) patch[`channels.${params.ch}.broadcast`] = body.broadcast;
		}
		if (body.threadPolicy !== void 0) {
			if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change who may reply in threads");
			if (!THREAD_POLICIES.includes(body.threadPolicy)) fail(400, "invalid", "Unknown thread policy");
			if ((channel.threadPolicy || "everyone") !== body.threadPolicy) {
				patch[`channels.${params.ch}.threadPolicy`] = body.threadPolicy;
				lines.push(body.threadPolicy === "off" ? `${me} turned off thread replies` : body.threadPolicy === "admins" ? `${me} limited thread replies to admins` : `${me} opened thread replies to everyone`);
			}
		}
		if (!Object.keys(patch).length) return { channel: forCaller(channel) };
		if (patch[`channels.${params.ch}.archived`] === true && !channel.archived) {
			const act = await kv().get(KEYS.activity(ws.id)).catch(() => null) || {};
			if (act.h?.[params.ch]) await endHuddle(ws.id, params.ch, act.h[params.ch], act, ws, audienceOf({ channel })).catch(() => {});
		}
		const written = await kv().update(KEYS.ws(ws.id), patch);
		if (!await channelStands(ws.id, params.ch, written)) fail(404, "not_found", "Channel not found");
		if (droppedFiles.length) await releaseBookmarkFiles(ws.id, droppedFiles, bookmarkedFiles(ws, params.ch)).catch(() => {});
		for (const line of lines) await postSystem(ws.id, params.ch, id.uuid, line);
		await bumpWorkspace(ws.id);
		return { channel: forCaller({
			...channel,
			...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k.split(".").pop(), v]))
		}) };
	}));
	/**
	* Take a conversation's storage away: its blocks, read on the way out for
	* the files to let go of and the threads to purge with it, then its counter
	* and pins, and the threads' blocks, counters and pins the same way. A
	* deleted channel used to leave every one of these behind for good: the
	* workspace's own deletion walks `ws.channels`, which the channel had left,
	* so its history, its threads' and its attachments' bytes stayed in the
	* owner's store as long as the workspace did. Best effort, as that deletion
	* is; never throws. Returns the ids of the threads purged, for the activity
	* entries that named them. `keep`: files a bookmark elsewhere still points
	* at (see bookmarkedFiles).
	*
	* Every read, deletion and release here goes a dozen at a time, as every
	* fan-out on this server does (see getMany, and the workspace's own
	* deletion): the threads were purged one after another, each with its
	* counter read, its block read and its keys deleted in turn, and each file
	* let go of in turn after them, so a channel with a few hundred threads (a
	* busy channel's year) ran this one request to a thousand round trips to
	* the store, past what the platform lets a request run. The channel's entry
	* is taken off the workspace before this runs, so the deletion stopped
	* midway with the channel gone from every sidebar and its history, threads
	* and attachments' bytes left in the owner's store for good, while the
	* admin who deleted it was shown an error for a deletion that had happened.
	*/
	/**
	* The threads under one block's messages, read off the record itself: a root
	* that was ever replied to carries the reply count (`rc`) and the time of the
	* last reply (`rt`) on its overlay, and keeps both once every reply is deleted
	* (the count back at nothing), whether the root itself stands or was deleted
	* while replies stood. What a reader is shown (see mergeBlock) names a thread
	* only by a count above nothing, and judged so, as the deletion walks used to
	* judge it, a thread whose replies had all been deleted was never found: its
	* block, its counter and its pins list stayed in the owner's store for good
	* when the channel, or the workspace, was deleted, and its activity entry
	* with them. A follow flag alone (`f`, see the notify route) names no thread:
	* nothing is written for one until its first reply.
	*/
	function threadsOf(conv, block) {
		const x = block?.x && typeof block.x === "object" ? block.x : {};
		const out = [];
		for (const m of Array.isArray(block?.m) ? block.m : []) {
			if (!m || typeof m.s !== "number") continue;
			const o = x[overlayKey(m.s)];
			if (o && typeof o === "object" && (Object.hasOwn(o, "rc") || Object.hasOwn(o, "rt"))) out.push(threadConvId(conv, m.s));
		}
		return out;
	}
	async function purgeConversation(wsId, conv, { keep = null } = {}) {
		const blocksOf = (c, seq) => {
			const out = [];
			for (let n = 0; n <= blockIndexOf(Math.max(1, seq)) + 1; n++) out.push(KEYS.block(c, n));
			return out;
		};
		const holds = [];
		const found = [];
		const scan = (c, b, threads) => {
			for (const m of mergeBlock(b)) if (!m.deleted) for (const a of m.attachments) holds.push([c, a.id]);
			if (threads) found.push(...threadsOf(c, b));
		};
		const keys = blocksOf(conv, Number(await kv().get(KEYS.seq(conv)).catch(() => 0)) || 0);
		for (let i = 0; i < keys.length; i += 12) for (const b of await getMany(keys.slice(i, i + 12)).catch(() => [])) scan(conv, b, true);
		const tseqs = await getMany(found.map((t) => KEYS.seq(t))).catch(() => found.map(() => 0));
		const tblocks = found.flatMap((t, i) => blocksOf(t, Number(tseqs[i]) || 0).map((k) => [t, k]));
		for (let i = 0; i < tblocks.length; i += 12) {
			const slice = tblocks.slice(i, i + 12);
			(await getMany(slice.map(([, k]) => k)).catch(() => [])).forEach((b, j) => scan(slice[j][0], b, false));
		}
		const dels = [
			...keys,
			KEYS.seq(conv),
			KEYS.pins(wsId, conv),
			...tblocks.map(([, k]) => k),
			...found.flatMap((t) => [KEYS.seq(t), KEYS.pins(wsId, t)])
		];
		for (let i = 0; i < dels.length; i += 12) await Promise.all(dels.slice(i, i + 12).map((k) => kv().del(k).catch(() => {})));
		const queued = holds.length ? queuedFilesReader(wsId) : null;
		for (let i = 0; i < holds.length; i += 12) await Promise.all(holds.slice(i, i + 12).map(([c, f]) => releaseFile(wsId, f, c, keep, queued).catch(() => {})));
		return found;
	}
	/**
	* Take what was waiting to be sent into a conversation (or a thread of it),
	* and the reminders about its messages, out of the workspace's queue when
	* the conversation goes. Left there, an entry for a channel that no longer
	* existed sat in its author's list of scheduled messages as "Conversation"
	* until its time, could not be sent now, and held room in the queue every
	* member's drafts share, only to be dropped unsent then. Best effort, as
	* the deletion is; the next due time follows what is left.
	*/
	async function dropScheduledIn(wsId, conv) {
		const key = KEYS.sched(wsId);
		const doc = await kv().get(key).catch(() => null);
		const inConv = (c) => c === conv || parentOfThread(c)?.conv === conv;
		const all = Object.values(doc?.m || {}).filter((e) => e && e.id);
		const gone = all.filter((e) => inConv(String(e.conv || "")));
		if (!gone.length) return;
		for (let i = 0; i < gone.length; i += 100) await kv().remove(key, ...gone.slice(i, i + 100).map((e) => `m.${e.id}`)).catch(() => {});
		const rest = all.filter((e) => !gone.includes(e));
		for (const e of gone) await releaseScheduledFiles(wsId, e, rest).catch(() => {});
		await recomputeNextDue(wsId).catch(() => {});
	}
	router.delete("/api/ws/:ws/channels/:ch", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		const channel = own(ws.channels, params.ch);
		const orphan = channel?.private && !(channel.members || []).length;
		if (!channel || channel.private && !doc.channels.includes(params.ch) && !orphan) fail(404, "not_found", "Channel not found");
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can delete channels");
		if (channel.def) fail(400, "invalid", "Default channels cannot be deleted");
		for (const conn of Object.keys(channel.connections || {})) await disconnect(ws, channel, conn, null).catch(() => {});
		if (isPartnerEntry(channel) && CONN_ID_RE.test(String(channel.shared.conn || ""))) await kv().del(KEYS.connectPartner(channel.shared.conn)).catch(() => {});
		if (channel.guestInvite) await kv().del(KEYS.invite(channel.guestInvite)).catch(() => {});
		if (channel.connectInvite) await kv().del(KEYS.invite(channel.connectInvite)).catch(() => {});
		await dropChannelIntegrations(ws, params.ch);
		await kv().remove(KEYS.ws(ws.id), `channels.${params.ch}`);
		const keep = bookmarkedFiles(ws, params.ch);
		const threads = isPartnerEntry(channel) ? [] : await purgeConversation(ws.id, params.ch, { keep });
		await releaseBookmarkFiles(ws.id, (channel.bookmarks || []).map((b) => b?.file), keep).catch(() => {});
		const paths = [
			`c.${params.ch}`,
			`t.${params.ch}`,
			`h.${params.ch}`,
			`he.${params.ch}`,
			...threads.flatMap((t) => [`c.${t}`, `t.${t}`])
		];
		for (let i = 0; i < paths.length; i += 100) await kv().remove(KEYS.activity(ws.id), ...paths.slice(i, i + 100)).catch(() => {});
		if (!isPartnerEntry(channel)) await dropScheduledIn(ws.id, params.ch);
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	router.post("/api/ws/:ws/channels/:ch/join", route(async ({ params, user, defer }) => {
		const { id, ws, doc, member } = await requireMembership(params.ws, user, { write: true });
		const channel = own(ws.channels, params.ch);
		if (!channel || channel.private || isLimited(member)) fail(404, "not_found", "Channel not found");
		if (channel.archived) fail(403, "archived", "This channel is archived");
		if (isPartnerEntry(channel)) {
			const shared = await attestFor(ws, channel, id.uuid, "join");
			const entry = doc.channels.includes(params.ch) ? null : await enterChannel(ws.id, id.uuid, params.ch, doc);
			if (entry?.status === "gone") fail(403, "forbidden", "You are not a member of this workspace");
			if (entry?.status === "entered") {
				const counted = await kv().incr(KEYS.ws(ws.id), { [`channels.${params.ch}.count`]: 1 });
				if (!await channelStands(ws.id, params.ch, counted)) fail(404, "not_found", "Channel not found");
				await bumpWorkspace(ws.id);
			}
			return {
				ok: true,
				already: doc.channels.includes(params.ch),
				shared
			};
		}
		if (doc.channels.includes(params.ch)) return {
			ok: true,
			already: true
		};
		const entry = await enterChannel(ws.id, id.uuid, params.ch, doc);
		if (entry.status === "gone") fail(403, "forbidden", "You are not a member of this workspace");
		if (entry.status !== "entered") return {
			ok: true,
			already: true
		};
		const counted = await kv().incr(KEYS.ws(ws.id), { [`channels.${params.ch}.count`]: 1 });
		if (!await channelStands(ws.id, params.ch, counted)) fail(404, "not_found", "Channel not found");
		if (counted && typeof counted === "object" && counted.members && !own(counted.members, id.uuid)) fail(403, "forbidden", "You are not a member of this workspace");
		defer(async () => {
			const joinSeq = await postSystem(ws.id, params.ch, id.uuid, `${ws.members[id.uuid].name} joined`);
			await kv().update(KEYS.member(ws.id, id.uuid), {
				[`reads.${params.ch}`]: Math.max(joinSeq, Number(doc.reads?.[params.ch]) || 0),
				...caughtUpMentions(doc, params.ch)
			});
			await bumpWorkspace(ws.id);
		});
		return { ok: true };
	}));
	router.post("/api/ws/:ws/channels/:ch/leave", route(async ({ params, user, defer }) => {
		const { id, ws, doc } = await requireMembership(params.ws, user, {
			write: true,
			lapsed: true
		});
		const channel = own(ws.channels, params.ch);
		if (!channel) fail(404, "not_found", "Channel not found");
		if (channel.def) fail(400, "invalid", "You cannot leave a default channel");
		if (!doc.channels.includes(params.ch)) return {
			ok: true,
			already: true
		};
		const me = ws.members[id.uuid];
		if (channel.private && !isLimited(me) && !(channel.members || []).some((u) => u !== id.uuid)) fail(400, "last_member", `You are the last person in #${channel.name}; add someone before you leave, or delete the channel`);
		if (isGuest(me) && !doc.channels.some((c) => c !== params.ch && own(ws.channels, c))) fail(400, "last_channel", `You are here as a guest of #${channel.name} alone; ask an admin to add you to another channel before you leave it, or leave the workspace instead`);
		const written = await kv().update(KEYS.member(ws.id, id.uuid), { channels: doc.channels.filter((c) => c !== params.ch) });
		let after = await memberDocAfter(ws.id, id.uuid, written);
		const closed = (d) => typeof d?.gone === "number" && d.gone + SCHED_CLAIM_MS > now();
		if (after === null || closed(after)) return { ok: true };
		if (Number.isFinite(doc.joinedAt) && after && !Object.hasOwn(after, "joinedAt")) {
			const fresh = after === written ? await kv().get(KEYS.member(ws.id, id.uuid)).catch(() => void 0) : after;
			if (fresh === null || closed(fresh)) return { ok: true };
			if (fresh && !Object.hasOwn(fresh, "joinedAt")) {
				await kv().del(KEYS.member(ws.id, id.uuid)).catch(() => {});
				return { ok: true };
			}
			if (fresh) after = fresh;
		}
		const role = typeof after?.role === "string" ? after.role : null;
		const counters = { [`channels.${params.ch}.count`]: -1 };
		if (role ? role === "guest" : isGuest(me)) counters[`channels.${params.ch}.guests`] = -1;
		const conn = partnerConnOf(channel, me);
		if (conn) counters[`channels.${params.ch}.connections.${conn}.count`] = -1;
		const counted = await kv().incr(KEYS.ws(ws.id), counters);
		const stands = await channelStands(ws.id, params.ch, counted);
		if (stands && channel.private) await kv().update(KEYS.ws(ws.id), { [`channels.${params.ch}.members`]: (channel.members || []).filter((u) => u !== id.uuid) });
		defer(async () => {
			if (stands && !isPartnerEntry(channel) && !channel.archived) await postSystem(ws.id, params.ch, id.uuid, `${me.name} left`);
			if (isExternal(me) && doc.channels.filter((c) => c !== params.ch).length === 0) await removeExternal(ws, id.uuid, doc);
			else if (!isPartnerEntry(channel)) await dropPresence(ws.id, id.uuid, params.ch);
			if (!channel.private && (role ? role === "guest" : isLimited(me))) await bumpRingEpoch(ws.id).catch(() => {});
			await bumpWorkspace(ws.id);
		});
		return { ok: true };
	}));
	/**
	* A channel-scoped invite: whoever accepts it joins as a guest of this one
	* channel. Admins only. One live code per channel; minting again replaces
	* it, and revoking leaves none.
	*/
	router.post("/api/ws/:ws/channels/:ch/invites", route(async ({ params, request, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can invite guests");
		const channel = own(ws.channels, params.ch);
		if (!channel || channel.private && !doc.channels.includes(params.ch)) fail(404, "not_found", "Channel not found");
		if (channel.archived) fail(403, "archived", "This channel is archived");
		if (channel.def) fail(400, "invalid", "Guests cannot be invited to a default channel; use the workspace invite");
		if (isPartnerEntry(channel)) fail(400, "shared", "Guests cannot be invited to a shared channel; its host invites its own guests");
		const body = await readJson(request);
		if (body.inviteTtl !== void 0 && !Object.hasOwn(INVITE_TTLS, body.inviteTtl)) fail(400, "invalid", "Unknown invite duration");
		const { code, exp } = await issueInvite(ws.id, body.inviteTtl || "7d", params.ch);
		if (channel.guestInvite) await kv().del(KEYS.invite(channel.guestInvite)).catch(() => {});
		await kv().update(KEYS.ws(ws.id), {
			[`channels.${params.ch}.guestInvite`]: code,
			[`channels.${params.ch}.guestInviteExp`]: exp
		});
		await bumpWorkspace(ws.id);
		return {
			code,
			exp,
			channel: params.ch
		};
	}));
	router.delete("/api/ws/:ws/channels/:ch/invites", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can revoke invites");
		const channel = own(ws.channels, params.ch);
		if (!channel || channel.private && !doc.channels.includes(params.ch)) fail(404, "not_found", "Channel not found");
		if (channel.guestInvite) await kv().del(KEYS.invite(channel.guestInvite)).catch(() => {});
		await kv().remove(KEYS.ws(ws.id), `channels.${params.ch}.guestInvite`, `channels.${params.ch}.guestInviteExp`);
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	/**
	* A channel is shared by connecting another workspace to it. The host's
	* admin mints a code; the partner's admin accepts it, which mints a
	* connection (an id and a secret both workers keep, see worker/connect.js)
	* and an entry in the partner workspace that stands for the channel there.
	* The partner's members then join the channel on the host as `external`
	* members, each carrying an attestation their own worker signed for them.
	* Either side can end it: the host's admin from the channel, the partner's
	* admin with a disconnect attestation.
	*/
	/**
	* The connection through which an external member is in a channel: the one
	* made with their workspace. Their card names whichever workspace vouched
	* for them last, so someone here through two partners (each sharing a
	* channel of its own) is labelled with one that this channel may not be
	* connected to at all; when the channel has one connection, it is the one
	* they came through, and their leaving used to leave its count standing.
	*/
	function partnerConnOf(channel, member) {
		if (!isExternal(member)) return null;
		const conns = Object.entries(channel.connections || {});
		return conns.find(([, c]) => c.ref === member.org?.ref)?.[0] || (conns.length === 1 ? conns[0][0] : null);
	}
	/**
	* Take a member out of every channel's counters and member lists; the caller
	* removes the card. A private channel's list is rewritten from the copy of
	* the workspace in hand, less this person, and that copy is kept in step
	* with the write: a caller taking several people out of one channel in a
	* row (see lapseExternals) used to rewrite the list from the same copy each
	* time, so the last rewrite put everyone but its own person back on it,
	* names with no card behind them, shown as former members and counted as
	* someone still in the channel when its last real member asked to leave.
	*/
	async function dropMembership(ws, target, doc) {
		const m = ws.members[target];
		const asGuest = typeof doc?.role === "string" ? doc.role === "guest" : isGuest(m);
		const counters = {};
		const lists = {};
		for (const ch of doc?.channels || []) {
			const channel = ws.channels[ch];
			if (!channel) continue;
			counters[`channels.${ch}.count`] = -1;
			if (asGuest) counters[`channels.${ch}.guests`] = -1;
			const conn = partnerConnOf(channel, m);
			if (conn) counters[`channels.${ch}.connections.${conn}.count`] = -1;
			if (channel.private) {
				const members = (channel.members || []).filter((u) => u !== target);
				lists[`channels.${ch}.members`] = members;
				channel.members = members;
			}
		}
		await incrPaths(KEYS.ws(ws.id), counters);
		await updatePaths(KEYS.ws(ws.id), lists);
	}
	/**
	* How many people who left are remembered by name. A card is a few dozen
	* bytes; a hundred of them keep years of comings and goings attributed
	* without the workspace document growing with every departure.
	*/
	var FORMER_MAX = 100;
	/**
	* Keep the name of someone leaving the workspace (and, for someone from a
	* connected workspace, its name), so what they wrote keeps its author
	* instead of turning into "Former member". Read from `ws.former` by the
	* app when a card is gone; the oldest entries make room for new ones.
	*/
	async function rememberFormer(ws, who) {
		const cards = {};
		const at = now();
		for (const uuid of Array.isArray(who) ? who : [who]) {
			const m = ws.members?.[uuid];
			if (!m || String(uuid).startsWith("smp_")) continue;
			const card = {
				username: m.username,
				name: m.name,
				color: m.color,
				at
			};
			if (m.org) card.org = m.org;
			cards[uuid] = card;
		}
		if (Object.keys(cards).length) await rememberCards(ws, "former", cards, FORMER_MAX);
	}
	/** Someone remembered as having left is back: the card in `members` is the one to read again. */
	async function forgetFormer(ws, uuid) {
		if (!ws.former?.[uuid]) return;
		delete ws.former[uuid];
		await kv().remove(KEYS.ws(ws.id), `former.${uuid}`).catch(() => {});
	}
	/** Put a card under `ws[field][uuid]`, the oldest making room once there are more than `max`. */
	async function rememberCard(ws, field, uuid, card, max) {
		await rememberCards(ws, field, { [uuid]: card }, max);
	}
	/**
	* Put several cards under `ws[field]` at once (a partner workspace's people
	* all leaving together, see disconnect): the map written whole where the
	* oldest must make room, else each card by its own path, fifty a write.
	* One card at a time, as cards used to go, each rebuilt the map from the
	* copy in hand and wrote it, and two written together would have each
	* started from a map without the other's.
	*/
	async function rememberCards(ws, field, cards, max) {
		const map = {
			...ws[field] || {},
			...cards
		};
		const ids = Object.keys(map);
		if (ids.length > max) {
			ids.sort((a, b) => (map[a].at || 0) - (map[b].at || 0));
			for (const u of ids.slice(0, ids.length - max)) delete map[u];
			await kv().update(KEYS.ws(ws.id), { [field]: map });
		} else {
			const entries = Object.entries(cards).map(([u, card]) => [`${field}.${u}`, card]);
			for (let i = 0; i < entries.length; i += 50) await kv().update(KEYS.ws(ws.id), Object.fromEntries(entries.slice(i, i + 50)));
		}
		ws[field] = map;
	}
	/** How many people removed from the shared channels by an admin are kept out; the oldest removals lapse first. */
	var REMOVED_MAX = 100;
	/**
	* An admin removing someone from a connected workspace means it. Their own
	* workspace goes on vouching for them (their app renews on their behalf and
	* takes the host's refusal as a cue to try again), so on its own the removal
	* would last until their next poll. Remembered here, in `ws.removed`, it
	* keeps /api/connect/join from taking them back until an admin restores
	* them (DELETE /api/ws/:ws/removed/:uuid) or they join this workspace in
	* their own right. The card lets admins see who is kept out.
	*/
	async function rememberRemoved(ws, uuid, by) {
		const m = ws.members?.[uuid];
		if (!m) return;
		await rememberCard(ws, "removed", uuid, {
			username: m.username,
			name: m.name,
			color: m.color,
			org: m.org || null,
			at: now(),
			by
		}, REMOVED_MAX);
	}
	async function forgetRemoved(ws, uuid) {
		if (!ws.removed?.[uuid]) return;
		delete ws.removed[uuid];
		await kv().remove(KEYS.ws(ws.id), `removed.${uuid}`).catch(() => {});
	}
	/**
	* How long past its expiry an external member's card is kept before this
	* workspace lets go of them on its own. Their own workspace vouches for
	* them again about once a day while they open the app (see
	* /api/connect/join); one made a guest there, or removed from it, or whose
	* workspace was deleted or disconnected while this one was out of reach, is
	* vouched for no more, and their card stayed here for good: shut out, since
	* their standing had run out, but listed among the channel's members and
	* counted in it and in its connection, and holding one of the workspace's
	* seats, with no route that would ever take them off (their own client has
	* no entry left to leave by, and nobody else may sign for them). A month
	* with no word is taken as the end of it; someone merely away that long
	* comes back the way they first came, through a fresh attestation.
	*/
	var EXTERNAL_LAPSE_GRACE_MS = 2592e6;
	/** Lapsed cards let go of per bootstrap, so the request stays short. */
	var LAPSE_SWEEP_MAX = 5;
	/** A card the sweep may let go of: someone from a connected workspace whose standing ran out past the grace. */
	var sweepable = (m) => isExternal(m) && (Number(m.exp) || 0) < now() - EXTERNAL_LAPSE_GRACE_MS;
	/**
	* Take the claim on letting a lapsed card go, as a poll claims a scheduled
	* entry (see claimEntry): two bootstraps finding the same card at once
	* would each count the person out of their channels. The count lives on
	* the card and goes with it; a claim older than a delivery's hold is a
	* bootstrap that died, and is counted past. A write landing after the
	* winner took the card off leaves a card of the claim alone (see
	* cardStands), which is taken off again here and is no claim. Nor is a
	* claim on a card that is no longer one to let go of: the person accepted
	* the workspace's own invite between the caller's read and its claim (their
	* card is a member's now; see /api/join, which takes this same claim before
	* it writes that card), or their workspace vouched for them again (their
	* standing is current). The card is read back after the claim, from what
	* the store hands back or by a read of its own, and such a card keeps
	* nothing of the claim. Winning it used to rest on the count alone, and a
	* sweep that read the old card and claimed after the promotion took the new
	* member out of the workspace, card, document and all, while the join
	* answered that they had joined.
	*/
	async function claimLapse(wsId, uuid, card) {
		const key = KEYS.ws(wsId);
		const prev = Number(card.lapse) || 0;
		if (prev && (Number(card.lapseAt) || 0) + SCHED_CLAIM_MS > now()) return false;
		await kv().update(key, { [`members.${uuid}.lapseAt`]: now() }).catch(() => {});
		try {
			const res = await kv().incr(key, { [`members.${uuid}.lapse`]: 1 });
			let after = res && typeof res === "object" && res.members ? own(res.members, uuid) : void 0;
			if (after === void 0) after = own((await kv().get(key))?.members || {}, uuid);
			if (!after) return false;
			if (!after.role) {
				const fresh = own((await kv().get(key).catch(() => null))?.members || {}, uuid);
				if (!fresh) return false;
				if (!fresh.role) {
					await kv().remove(key, `members.${uuid}`).catch(() => {});
					return false;
				}
				after = fresh;
			}
			if (!sweepable(after)) {
				await kv().remove(key, `members.${uuid}.lapse`, `members.${uuid}.lapseAt`).catch(() => {});
				return false;
			}
			return after.lapse === prev + 1;
		} catch {
			return false;
		}
	}
	/**
	* Let go of the external members whose standing ran out long ago (see
	* EXTERNAL_LAPSE_GRACE_MS): out of their channels and their counts, and
	* out of the workspace, remembered by name as anyone who left is. Run on
	* the bootstrap, which any member's tab does now and then and which has
	* the workspace in hand; `ws` is brought up to date when anyone went, so
	* the answer being put together shows the workspace as it now stands.
	*/
	async function lapseExternals(ws) {
		const lapsed = Object.entries(ws.members).filter(([, m]) => sweepable(m)).slice(0, LAPSE_SWEEP_MAX);
		if (!lapsed.length) return false;
		let swept = 0;
		for (const [u, m] of lapsed) {
			if (!await claimLapse(ws.id, u, m)) continue;
			const doc = await closeMemberDoc(ws.id, u).catch(() => null);
			await dropMembership(ws, u, doc);
			await removeExternal(ws, u, doc);
			swept++;
		}
		if (!swept) return false;
		const fresh = await kv().get(KEYS.ws(ws.id)).catch(() => null);
		if (fresh) {
			ws.channels = fresh.channels || {};
			ws.members = fresh.members || {};
			ws.former = fresh.former;
			ws.ke = fresh.ke;
		}
		await bumpWorkspace(ws.id).catch(() => {});
		return true;
	}
	/** Remove an external member from the workspace altogether (they were only ever here for shared channels). `doc` is their member document, when the caller already has it. */
	async function removeExternal(ws, uuid, doc = null) {
		await removeExternals(ws, [uuid], [doc]);
	}
	/**
	* Remove several external members from the workspace at once (a connection
	* ending takes every one of the partner's people, see disconnect), each
	* step for all of them together: their names remembered in one write, their
	* cards off the workspace document a hundred a write, their traces off the
	* activity document from one reading of it, their documents and lists
	* deleted a dozen at a time, their queued messages dropped from one reading
	* of the queue, and their account records read together and written
	* together. One person at a time, as they used to go, each cost some ten
	* round trips to the store in a row, and a partner whose hundred people
	* were in the channel ran the disconnect past what the platform lets a
	* request run, so it stopped midway: the connection standing, some of them
	* gone from the channel's list and some not, and no line written.
	* `docs`, parallel to `uuids`, are the member documents callers already
	* hold (entries may be missing or null); used only to release a cached
	* handle, never re-read.
	*/
	async function removeExternals(ws, uuids, docs = []) {
		if (!uuids.length) return;
		await rememberFormer(ws, uuids);
		for (let i = 0; i < uuids.length; i += 100) await kv().remove(KEYS.ws(ws.id), ...uuids.slice(i, i + 100).map((u) => `members.${u}`));
		await bumpRingEpoch(ws.id).catch(() => {});
		await dropPresence(ws.id, uuids);
		for (let i = 0; i < uuids.length; i += 12) await Promise.all(uuids.slice(i, i + 12).map((u) => kv().del(KEYS.member(ws.id, u))));
		const lists = uuids.flatMap((u) => [
			KEYS.inbox(ws.id, u),
			KEYS.threads(ws.id, u),
			KEYS.saved(ws.id, u)
		]);
		for (let i = 0; i < lists.length; i += 12) await Promise.all(lists.slice(i, i + 12).map((k) => kv().del(k).catch(() => {})));
		await dropScheduled(ws.id, uuids);
		const records = await getMany(uuids.map((u) => KEYS.user(u)));
		const filed = uuids.map((u, i) => [u, records[i]]).filter(([, p]) => p?.workspaces?.includes(ws.id));
		for (let i = 0; i < filed.length; i += 12) await Promise.all(filed.slice(i, i + 12).map(([u, p]) => kv().update(KEYS.user(u), { workspaces: p.workspaces.filter((w) => w !== ws.id) }).catch(() => {})));
		const releasing = uuids.map((u, i) => [u, docs[i]]).filter(([, d]) => d?.ev?.h).slice(0, 20);
		for (let i = 0; i < releasing.length; i += 12) await Promise.all(releasing.slice(i, i + 12).map(([u, d]) => releaseHandle(ws.id, u, d).catch(() => {})));
	}
	/**
	* Sign for one of this workspace's members towards the host of a shared
	* channel: `join` says "this person is in the channel here", `disconnect`
	* says "this workspace is ending the connection" (admins only, checked by
	* the caller). The host checks the signature against the secret the two
	* workers share and the uuid against whoever presents the token.
	*/
	async function attestFor(ws, channel, uuid, kind, known = void 0) {
		const conn = String(channel.shared?.conn || "");
		const rec = known !== void 0 ? known : CONN_ID_RE.test(conn) ? await kv().get(KEYS.connectPartner(conn)) : null;
		if (!rec || rec.role !== "partner" || rec.ws !== ws.id || rec.ch !== channel.id || !rec.secret) fail(409, "connection_lost", "This workspace no longer holds its connection to that channel");
		const token = await signAttestation(rec.secret, {
			conn,
			uuid,
			kind
		});
		return {
			ref: channel.shared.ref,
			ch: channel.shared.ch,
			conn,
			host: channel.shared.host || null,
			token
		};
	}
	/**
	* This workspace's word to each host that one of its people is no longer
	* one of them: a revocation per shared channel the person was in through
	* this workspace (`channels`, their entries here), signed here and carried
	* to the hosts by the admin's app, as a disconnect is carried (see
	* /api/connect/revoke on the host). Best effort: a connection this
	* workspace no longer holds signs nothing, and a host never told lets the
	* seat lapse on its own, a day on, as it always did.
	*/
	async function revocationsFor(ws, uuid, channels) {
		const shared = (channels || []).map((ch) => own(ws.channels, ch)).filter(isPartnerEntry);
		if (!shared.length) return [];
		const recs = await getMany(shared.map((c) => KEYS.connectPartner(String(c.shared?.conn || ""))));
		const out = [];
		for (const [i, channel] of shared.entries()) try {
			out.push(await attestFor(ws, channel, uuid, "revoke", recs[i]));
		} catch {}
		return out;
	}
	/** The workspace and channel a connect code stands for, while it is live; every failure looks the same and counts against the guesser. */
	async function liveConnectInvite(code, uuid) {
		const invite = await kv().get(KEYS.invite(code));
		const ws = invite?.role === "connect" ? await kv().get(KEYS.ws(invite.ws)) : null;
		const channel = ws?.channels?.[invite?.ch];
		if (!(channel && channel.connectInvite === code && !channel.archived && !ws.movedTo && (!invite.exp || invite.exp > now()))) {
			await noteJoinFailure(uuid);
			fail(404, "invite_not_found", "This share link is not valid anymore");
		}
		ws.channels = ws.channels || {};
		ws.members = ws.members || {};
		return {
			invite,
			ws,
			channel
		};
	}
	/**
	* End a connection on the host: the partner's people leave the channel (and
	* the workspace, once they are in no shared channel here), the partner can
	* vouch for nobody any more, and the channel says so.
	*/
	async function disconnect(ws, channel, conn, line) {
		const c = own(channel.connections, conn);
		if (!c) fail(404, "not_found", "That workspace is not connected to this channel");
		const remaining = new Set(Object.entries(channel.connections).filter(([k]) => k !== conn).map(([, v]) => v.ref));
		const externals = Object.entries(ws.members).filter(([, m]) => isExternal(m) && (m.org?.ref === c.ref || !remaining.has(m.org?.ref))).map(([u]) => u);
		const docs = await getMany(externals.map((u) => KEYS.member(ws.id, u)));
		const docByUuid = new Map(externals.map((u, i) => [u, docs[i]]));
		const inIt = externals.map((u, i) => [u, docs[i]?.channels || []]).filter(([, channels]) => channels.includes(channel.id));
		const going = new Set(inIt.map(([u]) => u));
		let members = (channel.members || []).filter((x) => !going.has(x));
		const gone = inIt.length;
		const staying = [];
		const leaving = [];
		const reopen = [];
		const last = inIt.filter(([, channels]) => !channels.some((x) => x !== channel.id));
		for (const [u, channels] of inIt) if (channels.some((x) => x !== channel.id)) staying.push([u, channels.filter((x) => x !== channel.id)]);
		for (let i = 0; i < last.length; i += 12) (await Promise.all(last.slice(i, i + 12).map(([u]) => closeMemberDoc(ws.id, u)))).forEach((c, j) => {
			const u = last[i + j][0];
			const left = (Array.isArray(c.channels) ? c.channels : []).filter((x) => x !== channel.id);
			if (left.length) {
				reopen.push(u);
				staying.push([u, left]);
			} else leaving.push(u);
		});
		for (let i = 0; i < reopen.length; i += 12) await Promise.all(reopen.slice(i, i + 12).map((u) => kv().remove(KEYS.member(ws.id, u), "gone").catch(() => {})));
		for (let i = 0; i < staying.length; i += 12) await Promise.all(staying.slice(i, i + 12).map(([u, left]) => kv().update(KEYS.member(ws.id, u), { channels: left })));
		if (staying.length) {
			await dropPresence(ws.id, staying.map(([u]) => u), channel.id);
			await incrPaths(KEYS.activity(ws.id), Object.fromEntries(staying.map(([u]) => [`u.${u}`, 1])));
		}
		await removeExternals(ws, leaving, leaving.map((u) => docByUuid.get(u) || null));
		if (gone) await kv().incr(KEYS.ws(ws.id), { [`channels.${channel.id}.count`]: -gone }).catch(() => {});
		if (channel.private) await kv().update(KEYS.ws(ws.id), { [`channels.${channel.id}.members`]: members }).catch(() => {});
		await kv().remove(KEYS.ws(ws.id), `channels.${channel.id}.connections.${conn}`);
		await kv().del(KEYS.connect(conn)).catch(() => {});
		if (line) await postSystem(ws.id, channel.id, ws.owner, line, { by: "sys" });
		if (staying.length && !channel.private) await bumpRingEpoch(ws.id).catch(() => {});
		await bumpWorkspace(ws.id);
	}
	/** Admins: mint the link another workspace's admin accepts to share this channel. One live code per channel. */
	router.post("/api/ws/:ws/channels/:ch/connect/invites", route(async ({ params, request, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can share a channel with another workspace");
		const channel = own(ws.channels, params.ch);
		if (!channel || channel.private && !doc.channels.includes(params.ch)) fail(404, "not_found", "Channel not found");
		if (channel.archived) fail(403, "archived", "This channel is archived");
		if (channel.def) fail(400, "invalid", "A default channel cannot be shared with another workspace");
		if (isPartnerEntry(channel)) fail(400, "shared", "Only the workspace that hosts a shared channel can share it further");
		const body = await readJson(request);
		if (body.inviteTtl !== void 0 && !Object.hasOwn(INVITE_TTLS, body.inviteTtl)) fail(400, "invalid", "Unknown invite duration");
		const { code, exp } = await issueInvite(ws.id, body.inviteTtl || "7d", params.ch, "connect");
		if (channel.connectInvite) await kv().del(KEYS.invite(channel.connectInvite)).catch(() => {});
		await kv().update(KEYS.ws(ws.id), {
			[`channels.${params.ch}.connectInvite`]: code,
			[`channels.${params.ch}.connectInviteExp`]: exp
		});
		await bumpWorkspace(ws.id);
		return {
			code,
			exp,
			channel: params.ch
		};
	}));
	router.delete("/api/ws/:ws/channels/:ch/connect/invites", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can revoke a share link");
		const channel = own(ws.channels, params.ch);
		if (!channel || channel.private && !doc.channels.includes(params.ch)) fail(404, "not_found", "Channel not found");
		if (channel.connectInvite) await kv().del(KEYS.invite(channel.connectInvite)).catch(() => {});
		await kv().remove(KEYS.ws(ws.id), `channels.${params.ch}.connectInvite`, `channels.${params.ch}.connectInviteExp`);
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	/** What a share link leads to, for the admin deciding whether to accept it. Counts against the invite budget like a join. */
	router.get("/api/connect/preview", route(async ({ request, user }) => {
		const id = await identify(user);
		const code = normalizeInviteCode(query(request).get("code"));
		if (!code) fail(400, "invalid", "That does not look like a share link");
		await assertJoinBudget(id.uuid);
		const { ws, channel } = await liveConnectInvite(code, id.uuid);
		return {
			workspace: {
				id: ws.id,
				name: ws.name
			},
			channel: {
				id: channel.id,
				name: channel.name,
				topic: channel.topic || "",
				description: channel.description || "",
				count: channel.count || 0,
				private: !!channel.private
			},
			connections: Object.values(channel.connections || {}).map((c) => c.name)
		};
	}));
	/**
	* A partner workspace's admin accepts a share link: a connection is minted
	* (or, for a workspace already connected to this channel, its secret is
	* renewed) and handed back once with its secret, which the admin's app
	* stores on their own worker. Nothing about the partner is verified here:
	* its reference and name are what that workspace says of itself, shown as
	* such.
	*/
	router.post("/api/connect/accept", route(async ({ request, user }) => {
		const id = await identify(user);
		const body = await readJson(request);
		const code = normalizeInviteCode(body.code);
		if (!code) fail(400, "invalid", "That does not look like a share link");
		const partnerRef = String(body.partner?.ref || "");
		const partnerName = cleanLine(body.partner?.name, LIMITS.workspaceName);
		if (!REF_RE.test(partnerRef) || !partnerName) fail(400, "invalid", "Say which workspace is accepting");
		await assertJoinBudget(id.uuid);
		const { ws, channel } = await liveConnectInvite(code, id.uuid);
		if (ws.importing) fail(409, "importing", "This workspace is still being imported; try again in a moment");
		if (frozen(ws)) fail(423, "transferring", `${ws.name} is being moved to another server; try again in a few minutes`);
		if (partnerRef.slice(0, partnerRef.indexOf("@")) === ws.id) fail(400, "invalid", `#${channel.name} is ${ws.name}'s own channel; a share link is for another workspace`);
		await ensureProfile(id, body.profile);
		const existing = Object.entries(channel.connections || {}).find(([, c]) => c.ref === partnerRef);
		if (existing && existing[1].by !== id.uuid) fail(403, "connection_owned", `#${channel.name} is already connected to that workspace; only the admin who set that connection up can renew it`);
		if (!existing && Object.keys(channel.connections || {}).length >= LIMITS.connectionsPerChannel) fail(400, "limit", `A channel can be shared with up to ${LIMITS.connectionsPerChannel} workspaces`);
		const conn = existing ? existing[0] : uid(10);
		const secret = uid(32);
		const ts = now();
		await kv().set(KEYS.connect(conn), {
			ws: ws.id,
			ch: channel.id,
			partner: partnerRef,
			name: partnerName,
			secret,
			role: "host",
			createdAt: existing ? existing[1].at || ts : ts,
			by: id.uuid
		});
		if (existing) await kv().update(KEYS.ws(ws.id), { [`channels.${channel.id}.connections.${conn}.name`]: partnerName });
		else {
			await kv().update(KEYS.ws(ws.id), { [`channels.${channel.id}.connections.${conn}`]: {
				ref: partnerRef,
				name: partnerName,
				count: 0,
				at: ts,
				by: id.uuid
			} });
			await postSystem(ws.id, channel.id, ws.owner, `This channel is now shared with ${partnerName}`, { by: "sys" });
		}
		await bumpWorkspace(ws.id);
		return {
			conn,
			secret,
			workspace: {
				id: ws.id,
				name: ws.name
			},
			channel: {
				id: channel.id,
				name: channel.name,
				topic: channel.topic || "",
				description: channel.description || ""
			}
		};
	}));
	/**
	* A partner's member joins the shared channel on the host, carrying the
	* attestation their own worker signed. New here: they become an external
	* member, in this channel alone, for a day; already here: their standing is
	* renewed. Someone who is a member of both workspaces simply joins the
	* channel as themselves.
	*/
	router.post("/api/connect/join", route(async ({ request, user }) => {
		const id = await identify(user);
		const body = await readJson(request);
		const conn = String(body.conn || "");
		if (!CONN_ID_RE.test(conn)) fail(400, "invalid", "Bad connection");
		const rec = await kv().get(KEYS.connect(conn));
		if (!rec || rec.role !== "host") fail(404, "connection_ended", "This channel is no longer shared with your workspace");
		const ok = await verifyAttestation(rec.secret, body.token, {
			conn,
			uuid: id.uuid,
			kind: "join"
		});
		if (!ok) fail(401, "bad_attestation", "Your workspace could not vouch for you; try again");
		if (Number(own(rec.revoked || {}, id.uuid)) > ok.iat) fail(403, "revoked", "Your workspace withdrew its word for you here; if you were let back in, try again");
		const ws = await kv().get(KEYS.ws(rec.ws));
		const channel = ws?.channels?.[rec.ch];
		const connection = channel?.connections?.[conn];
		if (!ws || !channel || !connection) fail(404, "connection_ended", "This channel is no longer shared with your workspace");
		ws.members = ws.members || {};
		const existing = ws.members[id.uuid];
		if (own(ws.removed || {}, id.uuid) && !(existing && !isExternal(existing))) fail(403, "removed", `An admin of ${ws.name} removed you from its shared channels`);
		const doc = existing ? await kv().get(KEYS.member(ws.id, id.uuid)) || {} : null;
		const joined = !!doc && (doc.channels || []).includes(channel.id);
		assertWritable(ws, { moving: !!existing && isExternal(existing) && joined });
		if (channel.archived && !joined) fail(403, "archived", "This channel is archived");
		if (!existing && Object.keys(ws.members).length >= 500) fail(400, "limit", "The workspace hosting this channel is full");
		const profile = await ensureProfile(id, body.profile);
		const exp = now() + EXTERNAL_TTL_MS;
		const enter = async (external) => {
			const seq = doc ? 0 : Number(await kv().get(KEYS.seq(channel.id))) || 0;
			const entry = await enterChannel(ws.id, id.uuid, channel.id, doc);
			if (entry.status === "gone") fail(409, "retry", "Your standing in this channel changed just now; try again");
			if (entry.status !== "entered") return;
			const counters = { [`channels.${channel.id}.count`]: 1 };
			if (external) counters[`channels.${channel.id}.connections.${conn}.count`] = 1;
			else if (entry.role ? entry.role === "guest" : isGuest(existing)) counters[`channels.${channel.id}.guests`] = 1;
			const counted = await kv().incr(KEYS.ws(ws.id), counters);
			if (!await channelStands(ws.id, channel.id, counted)) return;
			if (counted && typeof counted === "object" && counted.members && !own(counted.members, id.uuid)) {
				const stray = await kv().get(KEYS.member(ws.id, id.uuid)).catch(() => void 0);
				if (!!stray && typeof stray === "object" && Object.keys(stray).length === 1 && Array.isArray(stray.channels) && stray.channels.length === 1 && stray.channels[0] === channel.id) {
					await kv().incr(KEYS.ws(ws.id), Object.fromEntries(Object.entries(counters).map(([k, v]) => [k, -v]))).catch(() => {});
					await kv().del(KEYS.member(ws.id, id.uuid)).catch(() => {});
				}
				fail(409, "retry", "Your standing in this channel changed just now; try again");
			}
			if (channel.private) await addPrivateMember(ws.id, channel.id, id.uuid);
			if (!doc) await kv().update(KEYS.member(ws.id, id.uuid), {
				dms: {},
				reads: { [channel.id]: seq },
				mentions: {},
				joinedAt: now()
			});
			const joinSeq = await postSystem(ws.id, channel.id, id.uuid, `${profile.name || profile.username}${external ? ` (${connection.name})` : ""} joined`);
			await kv().update(KEYS.member(ws.id, id.uuid), {
				[`reads.${channel.id}`]: Math.max(joinSeq, Number(doc?.reads?.[channel.id]) || 0),
				...caughtUpMentions(doc, channel.id)
			});
		};
		if (existing && !isExternal(existing)) {
			if (!joined) {
				await enter(false);
				await bumpWorkspace(ws.id);
			}
			return {
				workspace: {
					id: ws.id,
					name: ws.name
				},
				channel: channel.id,
				exp: null,
				member: true
			};
		}
		const card = {
			...memberRecord(profile, "external"),
			org: {
				ref: rec.partner,
				name: connection.name
			},
			exp,
			att: ok.iat
		};
		let changed = !existing || !joined;
		if (existing) {
			delete card.joinedAt;
			const upd = {};
			for (const [k, v] of Object.entries(card)) if (JSON.stringify(existing[k] ?? null) !== JSON.stringify(v ?? null)) upd[`members.${id.uuid}.${k}`] = v;
			const written = await kv().update(KEYS.ws(ws.id), upd);
			if (!await cardStands(ws.id, id.uuid, written, Object.keys(card))) fail(409, "retry", "Your standing in this channel changed just now; try again");
			if (Object.keys(upd).some((k) => !k.endsWith(".exp") && !k.endsWith(".att"))) changed = true;
			if (!joined) await enter(true);
		} else {
			assertWorkspaceRoom(ws, { joining: true });
			await kv().update(KEYS.ws(ws.id), { [`members.${id.uuid}`]: card });
			await forgetFormer(ws, id.uuid);
			await enter(true);
		}
		if (!profile.workspaces.includes(ws.id)) await listWorkspace(id.uuid, ws.id);
		if (changed) await bumpWorkspace(ws.id);
		return {
			workspace: {
				id: ws.id,
				name: ws.name
			},
			channel: channel.id,
			exp
		};
	}));
	/** The partner ends the connection, with a disconnect attestation from its own worker. Idempotent. */
	router.post("/api/connect/disconnect", route(async ({ request, user }) => {
		const id = await identify(user);
		const body = await readJson(request);
		const conn = String(body.conn || "");
		if (!CONN_ID_RE.test(conn)) fail(400, "invalid", "Bad connection");
		const rec = await kv().get(KEYS.connect(conn));
		if (!rec || rec.role !== "host") return {
			ok: true,
			already: true
		};
		if (!await verifyAttestation(rec.secret, body.token, {
			conn,
			uuid: id.uuid,
			kind: "disconnect"
		})) fail(401, "bad_attestation", "Your workspace could not vouch for you; try again");
		const ws = await kv().get(KEYS.ws(rec.ws));
		const channel = ws?.channels?.[rec.ch];
		if (!ws || !channel || !channel.connections?.[conn]) {
			await kv().del(KEYS.connect(conn)).catch(() => {});
			return {
				ok: true,
				already: true
			};
		}
		ws.members = ws.members || {};
		if (frozen(ws)) fail(423, "transferring", `${ws.name || "That workspace"} is being moved to another server; try again in a few minutes`);
		await disconnect(ws, channel, conn, `${channel.connections[conn].name} disconnected from this channel`);
		return { ok: true };
	}));
	/**
	* The partner has taken one of its people out of its workspace, or made
	* them a guest there: their seat in the channel shared with it ends now, as
	* it would on a disconnect, rather than a day later when their standing ran
	* out (see EXTERNAL_TTL_MS), a day through which they went on reading and
	* writing here. The word is a revocation the partner's worker signed when
	* its admin acted (see worker/connect.js), carried here by that admin's
	* app, as every word between two workers is carried. Idempotent. One older
	* than the person's latest vouching is stale (their workspace let them back
	* in since) and changes nothing; and the connection remembers it for as
	* long as a join token lives, so a token signed before the removal and
	* presented after it seats nobody (see /api/connect/join). Someone who is
	* a member of this workspace in their own right is not touched by their
	* other workspace's word, as a renewal does not touch them.
	*/
	router.post("/api/connect/revoke", route(async ({ request, user }) => {
		await identify(user);
		const body = await readJson(request);
		const conn = String(body.conn || "");
		if (!CONN_ID_RE.test(conn)) fail(400, "invalid", "Bad connection");
		const rec = await kv().get(KEYS.connect(conn));
		if (!rec || rec.role !== "host") return {
			ok: true,
			already: true
		};
		const word = await verifyAttestation(rec.secret, body.token, {
			conn,
			kind: "revoke"
		});
		if (!word || !isId(word.u)) fail(401, "bad_attestation", "That workspace could not vouch for this; try again");
		const target = word.u;
		const ws = await kv().get(KEYS.ws(rec.ws));
		const channel = ws?.channels?.[rec.ch];
		if (!ws || !channel || !channel.connections?.[conn]) return {
			ok: true,
			already: true
		};
		ws.members = ws.members || {};
		assertWritable(ws, { moving: true });
		const cutoff = now() - ATTEST_TTL_MS - 6e4;
		const spent = Object.entries(rec.revoked || {}).filter(([u, at]) => u !== target && !(Number(at) > cutoff)).map(([u]) => `revoked.${u}`);
		if (spent.length) await kv().remove(KEYS.connect(conn), ...spent).catch(() => {});
		if (!(Number(own(rec.revoked || {}, target)) >= word.iat)) await kv().update(KEYS.connect(conn), { [`revoked.${target}`]: word.iat }).catch(() => {});
		const existing = own(ws.members, target);
		if (!existing || !isExternal(existing)) return {
			ok: true,
			already: true
		};
		const via = existing.org?.ref;
		if (via && via !== channel.connections[conn]?.ref && Object.values(channel.connections).some((c) => c && c.ref === via)) return {
			ok: true,
			already: true
		};
		if ((Number(existing.att) || (Number(existing.exp) || 0) - 864e5) > word.iat) return {
			ok: true,
			already: true
		};
		if (sweepable(existing) && !await claimLapse(ws.id, target, existing)) return {
			ok: true,
			already: true
		};
		const doc = await kv().get(KEYS.member(ws.id, target)) || {};
		const channels = Array.isArray(doc.channels) ? doc.channels : [];
		if (!channels.includes(channel.id)) return {
			ok: true,
			already: true
		};
		let left = channels.filter((x) => x !== channel.id);
		let closed = null;
		if (!left.length) {
			closed = await closeMemberDoc(ws.id, target);
			left = (Array.isArray(closed.channels) ? closed.channels : []).filter((x) => x !== channel.id);
			if (left.length) await kv().remove(KEYS.member(ws.id, target), "gone").catch(() => {});
		}
		await kv().incr(KEYS.ws(ws.id), {
			[`channels.${channel.id}.count`]: -1,
			[`channels.${channel.id}.connections.${conn}.count`]: -1
		}).catch(() => {});
		if (channel.private) await kv().update(KEYS.ws(ws.id), { [`channels.${channel.id}.members`]: (channel.members || []).filter((u) => u !== target) }).catch(() => {});
		if (!channel.archived) await postSystem(ws.id, channel.id, target, `${existing.name || existing.username || "Someone"} left`).catch(() => {});
		if (left.length) {
			await kv().update(KEYS.member(ws.id, target), { channels: left });
			await dropPresence(ws.id, target, channel.id);
			await pokeMember(ws.id, target).catch(() => {});
		} else await removeExternal(ws, target, closed || doc);
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	/** The host's admins let someone they removed from the shared channels come back through their workspace. */
	router.delete("/api/ws/:ws/removed/:uuid", route(async ({ params, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can restore someone");
		if (!own(ws.removed || {}, params.uuid)) fail(404, "not_found", "Nobody by that id was removed");
		await forgetRemoved(ws, params.uuid);
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	/** The host's admins end a connection from their side. */
	router.delete("/api/ws/:ws/channels/:ch/connections/:conn", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can disconnect a workspace");
		const channel = own(ws.channels, params.ch);
		if (!channel || channel.private && !doc.channels.includes(params.ch)) fail(404, "not_found", "Channel not found");
		if (!CONN_ID_RE.test(params.conn) || !own(channel.connections, params.conn)) fail(404, "not_found", "That workspace is not connected to this channel");
		await disconnect(ws, channel, params.conn, `${member.name} disconnected ${channel.connections[params.conn].name}`);
		return { ok: true };
	}));
	/**
	* The partner side: an admin who accepted a share link records the
	* connection here, as an entry that stands for the channel in this
	* workspace (with its own name) and the secret this worker signs
	* attestations with. The admin is in it from the start; their app joins
	* them on the host next.
	*/
	router.post("/api/ws/:ws/channels/shared", route(async ({ params, request, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can add a shared channel");
		const body = await readJson(request);
		const ref = String(body.ref || "");
		const rch = String(body.ch || "");
		const conn = String(body.conn || "");
		const secret = String(body.secret || "");
		if (!REF_RE.test(ref) || !/^[a-z0-9]{6,20}$/.test(rch) || !CONN_ID_RE.test(conn) || !SECRET_RE.test(secret)) fail(400, "invalid", "Bad connection details");
		const name = cleanChannelName(body.name);
		if (!name) fail(400, "invalid", "Channel names use lowercase letters, numbers, and hyphens");
		const host = cleanLine(body.host, LIMITS.workspaceName) || "another workspace";
		const ts = now();
		const held = await kv().get(KEYS.connectPartner(conn));
		if (held && held.ws !== ws.id) fail(409, "exists", "That connection belongs to another workspace");
		const dup = Object.values(ws.channels).find((c) => isPartnerEntry(c) && c.shared.ref === ref && c.shared.ch === rch);
		if (dup) {
			if (dup.shared.conn !== conn) {
				const old = await kv().get(KEYS.connectPartner(dup.shared.conn)).catch(() => null);
				if (old && old.ws === ws.id) await kv().del(KEYS.connectPartner(dup.shared.conn)).catch(() => {});
			}
			await kv().set(KEYS.connectPartner(conn), {
				ws: ws.id,
				ch: dup.id,
				ref,
				rch,
				secret,
				role: "partner",
				createdAt: ts,
				by: id.uuid
			});
			await kv().update(KEYS.ws(ws.id), {
				[`channels.${dup.id}.shared.conn`]: conn,
				[`channels.${dup.id}.shared.host`]: host
			});
			await bumpWorkspace(ws.id);
			return {
				channel: {
					...dup,
					shared: {
						...dup.shared,
						conn,
						host
					}
				},
				already: true
			};
		}
		if (Object.values(ws.channels).some((c) => c.name === name)) fail(409, "exists", `#${name} already exists`);
		if (Object.keys(ws.channels).length >= 200) fail(400, "limit", "This workspace has the maximum number of channels");
		const chId = uid(10);
		const channel = {
			id: chId,
			name,
			topic: cleanLine(body.topic, LIMITS.channelTopic),
			private: false,
			def: false,
			createdBy: id.uuid,
			createdAt: ts,
			count: 0,
			shared: {
				ref,
				ch: rch,
				conn,
				host,
				at: ts
			}
		};
		await kv().set(KEYS.connectPartner(conn), {
			ws: ws.id,
			ch: chId,
			ref,
			rch,
			secret,
			role: "partner",
			createdAt: ts,
			by: id.uuid
		});
		await kv().update(KEYS.ws(ws.id), { [`channels.${chId}`]: channel });
		await enterMadeChannel(ws, id, doc, chId, { conn });
		channel.count = 1;
		await pokeAndBump(ws.id, id.uuid);
		return { channel };
	}));
	/**
	* An attestation for the caller towards the host of a shared channel: to
	* join (anyone in the channel here) or to disconnect (admins). The client
	* asks for one whenever the host wants a fresh word from this workspace.
	*/
	router.post("/api/ws/:ws/channels/:ch/attest", route(async ({ params, request, user }) => {
		const { id, ws, doc, member } = await requireMembership(params.ws, user);
		const channel = own(ws.channels, params.ch);
		if (!channel || !isPartnerEntry(channel)) fail(404, "not_found", "Channel not found");
		if (isLimited(member)) fail(403, "forbidden", isExternal(member) ? "This workspace vouches for its own members; you are here through a channel shared with your workspace, which vouches for you" : "Guests cannot take part in a shared channel");
		const kind = (await readJson(request)).kind === "disconnect" ? "disconnect" : "join";
		if (kind === "disconnect" && !isAdmin(member)) fail(403, "forbidden", "Only admins can disconnect a shared channel");
		if (kind === "join" && !doc.channels.includes(params.ch)) fail(403, "not_joined", "Join the channel first");
		return attestFor(ws, channel, id.uuid, kind);
	}));
	/**
	* Add members to a channel: any current member of a private channel may
	* invite; in a public channel only admins add people, and only guests need
	* adding (members join public channels themselves). Guests cannot add.
	*/
	router.post("/api/ws/:ws/channels/:ch/members", route(async ({ params, request, user }) => {
		const { id, ws, doc, member } = await requireMembership(params.ws, user, { write: true });
		const channel = own(ws.channels, params.ch);
		const joined = doc.channels.includes(params.ch);
		if (!channel || (channel.private || isLimited(member)) && !joined) fail(404, "not_found", "Channel not found");
		if (isLimited(member)) fail(403, "forbidden", `${limitedWho(member)} cannot add people`);
		if (isPartnerEntry(channel)) fail(400, "shared", "People join a shared channel themselves, from its row in the sidebar");
		if (!joined) fail(403, "not_joined", "Join the channel to add people to it");
		if (channel.archived) fail(403, "archived", "This channel is archived");
		const body = await readJson(request);
		let uuids = (Array.isArray(body.uuids) ? body.uuids : []).filter((u) => own(ws.members, u) && !isExternal(ws.members[u])).slice(0, 50);
		if (!channel.private && !isAdmin(member)) uuids = uuids.filter((u) => !isGuest(ws.members[u]));
		if (channel.private) assertWorkspaceRoom(ws);
		const current = new Set(channel.members || []);
		const added = [];
		const cursors = /* @__PURE__ */ new Map();
		let guests = 0;
		const seqNow = uuids.length ? Number(await kv().get(KEYS.seq(params.ch))) || 0 : 0;
		uuids = [...new Set(uuids)];
		const targets = await getMany(uuids.map((u) => KEYS.member(ws.id, u)));
		const entries = [];
		for (let i = 0; i < uuids.length; i += 12) entries.push(...await Promise.all(uuids.slice(i, i + 12).map(async (u, j) => {
			const target = targets[i + j] || {};
			if ((target.channels || []).includes(params.ch)) return null;
			return {
				u,
				target,
				entry: await enterChannel(ws.id, u, params.ch, target)
			};
		})));
		for (const e of entries) {
			if (!e || e.entry.status !== "entered") continue;
			cursors.set(e.u, {
				[`reads.${params.ch}`]: Math.max(seqNow, Number(e.target.reads?.[params.ch]) || 0),
				...caughtUpMentions(e.target, params.ch)
			});
			added.push(e.u);
			if (e.entry.role ? e.entry.role === "guest" : isGuest(ws.members[e.u])) guests++;
		}
		if (added.length) {
			const counted = await kv().incr(KEYS.ws(ws.id), {
				[`channels.${params.ch}.count`]: added.length,
				...guests ? { [`channels.${params.ch}.guests`]: guests } : {}
			});
			if (!await channelStands(ws.id, params.ch, counted)) fail(404, "not_found", "Channel not found");
			const cards = counted && typeof counted === "object" && counted.members ? counted.members : null;
			const held = cards ? added.filter((u) => own(cards, u)) : added;
			if (!held.length) return { added: [] };
			for (let i = 0; i < held.length; i += 12) await Promise.all(held.slice(i, i + 12).map((u) => kv().update(KEYS.member(ws.id, u), cursors.get(u))));
			await incrPaths(KEYS.activity(ws.id), Object.fromEntries(held.map((u) => [`u.${u}`, 1])));
			if (channel.private) await addPrivateMember(ws.id, params.ch, held.filter((u) => !current.has(u)));
			const names = held.map((u) => ws.members[u].name).join(", ");
			await postSystem(ws.id, params.ch, id.uuid, `${ws.members[id.uuid].name} added ${names}`);
			await bumpWorkspace(ws.id);
			return { added: held };
		}
		return { added };
	}));
	/**
	* Who is in a channel. Private channels keep their list; public ones are
	* answered from members' own documents, which bounds the cost to one get
	* per workspace member and only when someone asks.
	*/
	router.get("/api/ws/:ws/channels/:ch/members", route(async ({ params, user }) => {
		const { id, ws, doc, member } = await requireMembership(params.ws, user);
		const channel = own(ws.channels, params.ch);
		if (!channel || (channel.private || isLimited(member)) && !doc.channels.includes(params.ch)) fail(404, "not_found", "Channel not found");
		if (isPartnerEntry(channel)) fail(404, "shared_elsewhere", "This channel lives on another workspace");
		if (channel.private) return { members: channel.members || [] };
		return { members: [...await memberDocsReader(ws, {
			uuid: id.uuid,
			doc
		})()].filter(([, d]) => (d?.channels || []).includes(params.ch)).map(([u]) => u) };
	}));
	router.post("/api/ws/:ws/dms", route(async ({ params, request, user }) => {
		const { id, ws, doc, member } = await requireMembership(params.ws, user, { write: true });
		const body = await readJson(request);
		const named = [...new Set((Array.isArray(body.members) ? body.members : []).filter((u) => u !== id.uuid))];
		const others = named.filter((u) => own(ws.members, u));
		if (isLimited(member) && others.length !== named.length) fail(403, "forbidden", "You can only message people in your channels");
		if (!named.length) fail(400, "invalid", "Pick at least one person");
		if (others.length !== named.length) {
			const gone = named.find((u) => !own(ws.members, u));
			const who = own(ws.former || {}, gone)?.name;
			fail(400, "invalid", `${who || (named.length === 1 ? "They" : "Someone you picked")} ${who || named.length > 1 ? "is" : "are"} no longer in this workspace`);
		}
		if (others.length > LIMITS.dmMembers - 1) fail(400, "limit", `Group messages hold up to ${LIMITS.dmMembers} people`);
		const guests = [id.uuid, ...others].filter((u) => isLimited(ws.members[u]));
		const memo = memberDocsMemo(ws.id, {
			uuid: id.uuid,
			doc
		});
		const everyone = Object.keys(ws.members).slice(0, 500);
		let everyoneRead = null;
		const readDocs = () => {
			if (!everyoneRead) everyoneRead = memo(everyone).then((list) => new Map(everyone.map((u, i) => [u, list[i]])));
			return everyoneRead;
		};
		for (const g of guests) {
			const gdoc = g === id.uuid ? doc : (await memo([g]))[0] || { channels: [] };
			const peers = await peersOf(ws, {
				channels: gdoc.channels || [],
				dms: gdoc.dms || {}
			}, readDocs);
			for (const u of [id.uuid, ...others]) if (u !== g && !peers.has(u)) fail(403, "forbidden", g === id.uuid ? "You can only message people in your channels" : isExternal(ws.members[g]) ? "People from a connected workspace can only be messaged by people in the channel shared with them" : "Guests can only be messaged by people in their channels");
		}
		const members = [id.uuid, ...others].sort();
		const real = members.filter((u) => !u.startsWith("smp_"));
		const targets = real.filter((u) => u !== id.uuid);
		const docs = await memo(targets);
		const all = [doc, ...docs];
		const convId = [dmConvId(members), dmConvId(members, ws.id)].find((c) => all.some((d) => own(d?.dms, c))) || dmConvId(members, ws.id);
		const existing = all.map((d) => own(d?.dms, convId)).find(Boolean);
		if (existing) {
			const lacking = real.filter((u) => !own((u === id.uuid ? doc : docs[targets.indexOf(u)])?.dms, convId));
			for (let i = 0; i < lacking.length; i += 12) await Promise.all(lacking.slice(i, i + 12).map((u) => kv().update(KEYS.member(ws.id, u), { [`dms.${convId}`]: existing })));
			if (lacking.length) {
				await incrPaths(KEYS.activity(ws.id), Object.fromEntries(lacking.map((u) => [`u.${u}`, 1])));
				await signal(ws.id, lacking);
			}
			return {
				conv: convId,
				members,
				already: !!own(doc.dms, convId)
			};
		}
		const held = Object.keys(doc.dms).length;
		if (held >= LIMITS.dmsPerMember) fail(400, "limit", `You can be in up to ${LIMITS.dmsPerMember} direct message conversations, and you are in ${held} already`);
		assertMemberRoom(doc);
		targets.forEach((u, i) => assertMemberRoom(docs[i], ws.members[u]?.name || "That person"));
		const entry = {
			members,
			createdAt: now()
		};
		await ensureBlock(convId, 0);
		for (let i = 0; i < real.length; i += 12) await Promise.all(real.slice(i, i + 12).map((u) => kv().update(KEYS.member(ws.id, u), { [`dms.${convId}`]: entry })));
		const told = real.filter((u) => u !== id.uuid);
		if (told.length) {
			await incrPaths(KEYS.activity(ws.id), Object.fromEntries(told.map((u) => [`u.${u}`, 1])));
			await signal(ws.id, told);
		}
		return {
			conv: convId,
			members
		};
	}));
	router.get("/api/ws/:ws/conv/:conv/messages", route(async ({ params, request, user }) => {
		const prefetch = looksLikeConvId(params.conv) ? [KEYS.seq(params.conv)] : [];
		const ctx = await requireMembership(params.ws, user, { also: prefetch });
		resolveConv(ctx, params.conv);
		return fetchMessages(params.conv, query(request), prefetch.length ? ctx.extra[0] : void 0);
	}));
	/**
	* The broadcast a text asks for (@channel, @here, @everyone), or null, once
	* it is allowed here: who may send one is a channel setting, and @everyone
	* belongs to the default channel only. Run when a message is posted and
	* when one is scheduled, so a message that would be refused is refused to
	* the author's face rather than dropped at its time with nothing said.
	*/
	function assertBroadcast(ctx, conv, text) {
		const bc = broadcastKind(extractMentionNames(text));
		if (!bc) return null;
		const channel = conv.channel || null;
		if (channel && broadcastPolicy(channel) === "admins" && !isAdmin(ctx.member)) fail(403, "broadcast_forbidden", `Only admins can notify everyone in #${channel.name}`);
		if (bc === "everyone" && (!channel || !channel.def)) fail(400, "broadcast_scope", "@everyone only works in a default channel; use @channel here");
		return bc;
	}
	/**
	* A reply needs a root that exists and stands: replying to a sequence
	* number nobody has posted yet would count the reply on a message that
	* arrives later, and a deleted one is closed. Returns the root as located,
	* or null for a conversation that is not a thread.
	*/
	async function assertThreadRoot(conv) {
		if (conv.kind !== "thread") return null;
		const root = await locateMessage(conv.parent.conv, conv.parent.seq);
		if (!root || root.overlay.d) fail(404, "not_found", "Message not found");
		if (root.raw.k === "sys") fail(400, "invalid", "System lines have no thread");
		if (root.raw.k === "rem") fail(400, "invalid", "Reminders have no thread");
		return root;
	}
	/**
	* Post a message as `ctx.uuid` into a conversation: validation, attachments,
	* mentions and broadcasts, the write itself, the index, read cursor, mention
	* counters, inboxes, and thread bookkeeping. Shared by the live route and by
	* scheduled delivery (`scheduled`), so a message sent later behaves like one
	* sent now, but for the author's own read cursor (see below). Returns
	* { message, notified }.
	*/
	/**
	* Refuse a post where the conversation says the caller may not (see
	* resolveConv's `deny`): the code the app acts on and the words it shows.
	* One answer for a message sent now and one scheduled for later, since the
	* composer and the Later view show these words as they come: scheduling into
	* an archived channel, or a thread whose replies are off, used to be told
	* only that one cannot post there, with no word of why.
	*/
	function refusePost(conv) {
		const name = conv.channel ? `#${conv.channel.name}` : "this conversation";
		if (conv.deny === "archived") fail(403, "archived", "This channel is archived");
		if (conv.deny === "read_only") fail(403, "read_only", `Only admins can post in ${name}`);
		if (conv.deny === "threads_off") fail(403, "threads_off", `Replies are turned off in ${name}`);
		if (conv.deny === "threads_admins") fail(403, "threads_admins", `Only admins can reply in threads in ${name}`);
		fail(403, "not_joined", "Join the channel to post");
	}
	/**
	* What a post writes on its own author's document, given the number the
	* message took. Lifted out of postMessage so writeMessage can make the write
	* beside the conversation's stamp (see `alongside`); the rules are unchanged.
	*
	* The cursor follows the author's own message, because someone posting is
	* looking at the conversation and their message is its newest — but not for
	* one delivered from the queue at its time, whose author is not looking, and
	* for whom everything posted since they scheduled it is still theirs to read.
	* Moved for a queued message all the same, as it used to be, the cursor
	* marked all of that read (five messages posted after a message was
	* scheduled were read, by the cursor, the moment it went out) and the
	* conversation lost its bold and its count with nothing seen. It follows a
	* queued message only where it stood just before it, with nothing unread in
	* between, as it would have had the author sent it then.
	*
	* The counts a read to the end clears go with the cursor (see the read
	* route, which zeroes them when the cursor reaches the newest message). Left
	* standing, as they used to be, a mention of the author that landed in the
	* moments before their own post — between their tab's polls, so their tab
	* had not read it yet — kept its badge on the sidebar row and in the title
	* of a conversation whose cursor stood at the end, until the tab happened to
	* mark it seen again. Not for a message from the queue, whose author is not
	* looking.
	*
	* And replying to a thread follows it again, on both records that say so:
	* the root's overlay (written by the caller), which is where
	* replies find their followers, and the member's own choice here, which is
	* what their Threads list is drawn from. With only the first put back, every
	* later reply was counted for them under a thread their list hid as
	* unfollowed, and the Threads badge stood for a row nothing shown could clear.
	*/
	function fillOwnCursor(upd, ctx, conv, convId, seq, scheduled) {
		if (!scheduled || (Number(ctx.doc?.reads?.[convId]) || 0) >= seq - 1) upd[`reads.${convId}`] = seq;
		if (!scheduled) {
			for (const map of ["mentions", "threads"]) if (Number(ctx.doc?.[map]?.[convId]) > 0) upd[`${map}.${convId}`] = 0;
		}
		if (conv.kind === "thread" && ctx.doc?.notify?.[convId]?.follow === false) upd[`notify.${convId}.follow`] = true;
		return upd;
	}
	/**
	* Somewhere to put work the answer does not wait on. A request hands in the
	* `defer` its route was given (see worker/lib.js), and the runtime finishes
	* it after the answer has gone out. A caller with none — a scheduled
	* delivery, an import, a webhook — collects the work instead and `settle()`s
	* it before returning, which is exactly what those paths did before, so
	* nothing is left running where nothing is left to run it.
	*/
	function deferrer(given) {
		if (typeof given === "function") return {
			defer: given,
			settle: async () => {}
		};
		const jobs = [];
		return {
			defer: (work) => {
				jobs.push(Promise.resolve().then(typeof work === "function" ? work : () => work).catch((e) => console.error("deferred work failed", e)));
			},
			settle: () => Promise.all(jobs.splice(0))
		};
	}
	async function postMessage(ctx, convId, body, { scheduled = false, head = void 0, defer: given = null } = {}) {
		const wsId = ctx.ws.id;
		const { defer, settle } = deferrer(given);
		if (ctx.ws.importing) fail(409, "importing", "This workspace is still being imported; try again in a moment");
		if (typeof ctx.docs !== "function") ctx.docs = memberDocsMemo(wsId, ctx.doc ? {
			uuid: ctx.uuid,
			doc: ctx.doc
		} : null);
		const conv = resolveConv(ctx, convId);
		const audience = audienceOf(conv);
		const cid = typeof body.cid === "string" && /^[a-z0-9_-]{8,40}$/.test(body.cid) ? body.cid : null;
		if (cid && body.first !== true) {
			const at = head === void 0 ? Number(await kv().get(KEYS.seq(convId))) || 0 : Number(head) || 0;
			const n = blockIndexOf(Math.max(1, at));
			const blocks = await getMany(n > 0 ? [KEYS.block(convId, n), KEYS.block(convId, n - 1)] : [KEYS.block(convId, n)]);
			for (const b of blocks) {
				const dup = (b?.m || []).find((m) => m && m.cid === cid && m.u === ctx.uuid);
				if (dup) return {
					message: mergeBlock(b).find((m) => m.seq === dup.s),
					notified: 0,
					duplicate: true
				};
			}
		}
		if (!conv.canPost) refusePost(conv);
		const text = cleanText(body.text, LIMITS.messageText);
		const attachments = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, LIMITS.attachmentsPerMessage).filter((a) => a && typeof a.id === "string" && /^[a-z0-9]{8,24}$/.test(a.id));
		if (!text && !attachments.length) fail(400, "invalid", "Write something first");
		const metas = attachments.length ? await getMany(attachments.map((a) => KEYS.file(a.id))) : [];
		const a = [];
		metas.forEach((meta, i) => {
			if (meta && meta.ws === wsId && mayTakeFile(ctx, attachments[i].id, meta)) a.push({
				id: attachments[i].id,
				name: meta.name,
				size: meta.size,
				type: meta.type
			});
		});
		if (!text && !a.length) fail(400, "invalid", "Those files are not in this workspace");
		const mn = await readersAmong(ctx, conv, mentionUuids(ctx.ws, text));
		const bc = assertBroadcast(ctx, conv, text);
		const reach = bc ? await readersAmong(ctx, conv, await broadcastTargets(ctx, conv, bc)) : [];
		const root = await assertThreadRoot(conv);
		if (root && !(Number(root.overlay.rc) > 0)) await ensureBlock(convId, 0);
		const ts = now();
		const msg = {
			u: ctx.uuid,
			t: text,
			ts
		};
		if (a.length) msg.a = a;
		if (mn.length) msg.mn = mn;
		if (bc) msg.bc = bc;
		if (cid) msg.cid = cid;
		const mentionConv = conv.kind === "thread" ? conv.parent.conv : convId;
		const mentioned = [.../* @__PURE__ */ new Set([...mn, ...reach])].filter((u) => u !== ctx.uuid);
		const followers = /* @__PURE__ */ new Set();
		let pulled = [];
		let named = [];
		let replyTargets = [];
		if (conv.kind === "thread" && root) {
			const f = root.overlay.f || {};
			for (const [u, v] of Object.entries(f)) if (v === 1) followers.add(u);
			if (root.raw.u && f[root.raw.u] !== 0) followers.add(root.raw.u);
			followers.delete(ctx.uuid);
			pulled = mn.filter((u) => u !== ctx.uuid && !followers.has(u) && ctx.ws.members[u] && !u.startsWith("smp_"));
			named = [...followers].filter((u) => mentioned.includes(u));
			for (const u of named) followers.delete(u);
			replyTargets = await readersAmong(ctx, conv, [...followers].filter((u) => !u.startsWith("smp_")));
		}
		let notified = 0;
		const upd = {};
		let cleared = false;
		const entries = [];
		const seq = await writeMessage(wsId, convId, msg, {
			scheduled,
			audience,
			entries,
			signal: false,
			before: async () => {
				if (conv.kind !== "thread") notified = await notifyMentions(wsId, mentionConv, mentioned);
				for (let i = 0; i < replyTargets.length; i += 12) await Promise.all(replyTargets.slice(i, i + 12).map((u) => kv().incr(KEYS.member(wsId, u), { [`threads.${convId}`]: 1 }).catch(() => {})));
				if (replyTargets.length) {
					const at = now();
					await kv().update(KEYS.activity(wsId), Object.fromEntries(replyTargets.map((u) => [`u.${u}`, at]))).catch(() => {});
				}
			},
			alongside: (s) => {
				fillOwnCursor(upd, ctx, conv, convId, s, scheduled);
				cleared = ["mentions", "threads"].some((map) => upd[`${map}.${convId}`] === 0);
				return Object.keys(upd).length ? kv().update(KEYS.member(wsId, ctx.uuid), upd) : null;
			}
		});
		if (conv.kind === "thread") notified = await notifyMentions(wsId, mentionConv, mentioned);
		const written = a.length ? [holdFiles(convId, a.map((f) => f.id))] : [];
		if (mentioned.length) written.push(pushInbox(wsId, mentioned, {
			k: "mention",
			c: convId,
			s: seq,
			by: ctx.uuid,
			ts,
			bc: bc || void 0
		}));
		await Promise.all(written);
		if (upd[`notify.${convId}.follow`] || cleared) await pokeMember(wsId, ctx.uuid).catch(() => {});
		const dmOthers = conv.dm ? conv.dm.members.filter((u) => u !== ctx.uuid) : [];
		const pushTargets = [.../* @__PURE__ */ new Set([...mentioned, ...dmOthers])].slice(0, PUSH_FANOUT);
		let pushJob = null;
		if (pushTargets.length) {
			const author = ctx.ws.members[ctx.uuid];
			pushJob = () => sendPushes(ctx.ws, pushTargets, {
				mentioned: new Set(mentioned),
				conv: convId,
				mentionConv,
				seq,
				kind: conv.dm ? "dm" : conv.kind,
				title: conv.dm ? author?.name || "Direct message" : `${author?.name || "Someone"} in #${conv.channel?.name || "channel"}`,
				body: bc ? `@${bc}: ${cleanText(text, 120)}` : cleanText(text, 120),
				threadRoot: conv.kind === "thread" ? conv.parent : null
			}, ctx.docs);
		}
		if (conv.kind === "thread") {
			const k = overlayKey(conv.parent.seq);
			const parentKey = KEYS.block(conv.parent.conv, blockIndexOf(conv.parent.seq));
			const counted = await kv().incr(parentKey, { [`x.${k}.rc`]: 1 });
			const marks = { [`x.${k}.rt`]: ts };
			const f = root?.overlay.f || {};
			const flags = root ? [ctx.uuid, ...pulled].filter((u) => f[u] !== 1) : [];
			const following = flags.length && blockHasRoom(root.block, flags.length * 60) ? flags : [];
			for (const u of following) marks[`x.${k}.f.${u}`] = 1;
			await kv().update(parentKey, marks);
			const x = now();
			await kv().update(KEYS.activity(wsId), { [`c.${conv.parent.conv}.x`]: x });
			const rc = Number(counted?.x?.[k]?.rc);
			const patch = {
				rt: ts,
				...Number.isFinite(rc) ? { rc } : {},
				...following.length ? { f: following } : {}
			};
			entries.push({
				conv: conv.parent.conv,
				body: Number.isFinite(rc) ? {
					a: { x },
					s: conv.parent.seq,
					p: patch
				} : { a: { x } },
				slim: { a: { x } }
			});
			if (root) {
				if (pulled.length) for (let i = 0; i < pulled.length; i += 12) await Promise.all(pulled.slice(i, i + 12).map((u) => kv().remove(KEYS.member(wsId, u), `notify.${convId}.follow`).catch(() => {})));
				if (replyTargets.length) await pushInbox(wsId, replyTargets, {
					k: "reply",
					c: convId,
					s: seq,
					by: ctx.uuid,
					ts
				});
				await touchThreads(wsId, [
					...replyTargets,
					...named,
					...pulled,
					ctx.uuid
				].filter((u) => ctx.ws.members[u]), convId, conv.parent, ts);
			}
		}
		defer(async () => {
			await signal(wsId, audience, {
				entries,
				ws: ctx.ws,
				others: [.../* @__PURE__ */ new Set([...mentioned, ...replyTargets])]
			});
			await Promise.all([indexMessage(wsId, convId, msg).catch(() => {}), pushJob ? pushJob() : null]);
		});
		await settle();
		return {
			message: {
				seq,
				user: ctx.uuid,
				text,
				ts,
				kind: "msg",
				attachments: a,
				mentions: mn,
				broadcast: bc,
				editedAt: null,
				deleted: false,
				reactions: {},
				replyCount: 0,
				lastReplyAt: null
			},
			notified
		};
	}
	router.post("/api/ws/:ws/conv/:conv/messages", route(async ({ params, request, user, defer }) => {
		const prefetch = looksLikeConvId(params.conv) ? [KEYS.seq(params.conv)] : [];
		const ctx = await requireMembership(params.ws, user, {
			write: true,
			also: prefetch
		});
		const body = await readJson(request);
		return postMessage(ctx, params.conv, body, {
			head: prefetch.length ? ctx.extra[0] : void 0,
			defer
		});
	}));
	router.put("/api/ws/:ws/conv/:conv/messages/:seq", route(async ({ params, request, user, defer }) => {
		const seqNum = Number(params.seq);
		const locatable = looksLikeConvId(params.conv) && Number.isInteger(seqNum) && seqNum >= 1;
		const ctx = await requireMembership(params.ws, user, {
			write: true,
			also: locatable ? [KEYS.block(params.conv, blockIndexOf(seqNum))] : []
		});
		const body = await readJson(request);
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		if (conv.channel?.archived) fail(403, "archived", "This channel is archived");
		const seq = seqNum;
		const found = locatable ? messageIn(params.conv, seq, ctx.extra[0]) : await locateMessage(params.conv, seq);
		if (!found || found.overlay.d) fail(404, "not_found", "Message not found");
		if (found.raw.u !== id.uuid || found.raw.k === "sys") fail(403, "forbidden", "You can only edit your own messages");
		if (found.raw.k === "rem") fail(403, "forbidden", "Reminders cannot be edited");
		const text = cleanText(body.text, LIMITS.messageText);
		if (!text) fail(400, "invalid", "A message cannot be empty; delete it instead");
		const ts = now();
		const k = overlayKey(seq);
		const oldText = typeof found.overlay.t === "string" ? found.overlay.t : found.raw.t;
		const relink = firstUnfurlableLink(oldText) !== firstUnfurlableLink(text);
		assertBlockRoom(found.block, jsonBytes(text) + 40, "This message cannot be edited any further here; post it again instead");
		await kv().update(found.key, {
			[`x.${k}.t`]: text,
			[`x.${k}.e`]: ts
		});
		if (relink) await kv().remove(found.key, `x.${k}.uf`);
		defer(async () => {
			await touchConv(params.ws, params.conv, ts, {
				audience: audienceOf(conv),
				ws: ctx.ws,
				seq,
				patch: {
					t: text,
					e: ts,
					...relink ? { uf: null } : {}
				}
			});
			await indexEdit(params.ws, params.conv, {
				s: seq,
				ts: found.raw.ts,
				a: found.raw.a
			}, oldText, text).catch(() => {});
		});
		return {
			ok: true,
			text,
			editedAt: ts,
			relink
		};
	}));
	router.delete("/api/ws/:ws/conv/:conv/messages/:seq", route(async ({ params, user, defer }) => {
		const seq = Number(params.seq);
		const locatable = looksLikeConvId(params.conv) && Number.isInteger(seq) && seq >= 1;
		const ctx = await requireMembership(params.ws, user, {
			write: true,
			also: locatable ? [KEYS.block(params.conv, blockIndexOf(seq))] : []
		});
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		const found = locatable ? messageIn(params.conv, seq, ctx.extra[0]) : await locateMessage(params.conv, seq);
		if (!found || found.overlay.d) fail(404, "not_found", "Message not found");
		if (found.raw.k === "sys" && !isAdmin(ctx.member)) fail(403, "forbidden", "Only admins can remove a system line");
		if (found.raw.u !== id.uuid && !isAdmin(ctx.member)) fail(403, "forbidden", "You can only delete your own messages");
		const ts = now();
		const claimed = await kv().incr(found.key, { [`x.${overlayKey(seq)}.d`]: 1 });
		const flag = claimed && typeof claimed === "object" ? claimed.x?.[overlayKey(seq)]?.d : claimed;
		if (flag != null && flag !== 1) fail(404, "not_found", "Message not found");
		const audience = audienceOf(conv);
		await touchConv(params.ws, params.conv, ts, {
			audience,
			ws: ctx.ws,
			seq,
			patch: { d: 1 }
		});
		if (conv.kind === "thread" && found.raw.k !== "sys") {
			const root = await locateMessage(conv.parent.conv, conv.parent.seq);
			if (root && (Number(root.overlay.rc) || 0) > 0) {
				await kv().incr(root.key, { [`x.${overlayKey(conv.parent.seq)}.rc`]: -1 });
				await touchConv(params.ws, conv.parent.conv, ts, {
					audience,
					ws: ctx.ws
				});
			}
		}
		if (found.overlay.p) await unpin(params.ws, params.conv, seq, null, audience, ctx.ws).catch(() => {});
		const keep = (found.raw.a || []).length ? bookmarkedFiles(ctx.ws) : null;
		const queued = (found.raw.a || []).length ? queuedFilesReader(params.ws) : null;
		if ((found.raw.a || []).length) defer(() => Promise.all(found.raw.a.map((a) => releaseFile(params.ws, a.id, params.conv, keep, queued))));
		return { ok: true };
	}));
	/**
	* Is a file shared somewhere the caller can read: carried there by a message
	* not deleted (the record counts the messages per conversation, up with each
	* post and down with each deletion), or bookmarked in a channel of theirs?
	* What a guest's, or an external member's, download and attaching are judged
	* by. A conversation whose count has run out is one the file has left: a
	* forward deleted used to leave its conversation on the record for good,
	* so a guest there kept a file nothing they could read carried any more.
	*/
	function sharedWithin(ctx, fileId, cs) {
		for (const [c, n] of Object.entries(cs || {})) {
			if (!(Number(n) > 0)) continue;
			try {
				resolveConv(ctx, c);
				return true;
			} catch {}
		}
		return ctx.doc.channels.some((c) => (own(ctx.ws.channels, c)?.bookmarks || []).some((b) => b?.file === fileId));
	}
	/**
	* May this caller take a file of the workspace: download it, or attach it to
	* a message of theirs? A member may take any of them (a forward carries the
	* original's attachments by reference, and every member can download every
	* file anyway). A guest, or someone from a connected workspace, may take
	* their own uploads and what is shared where they can read: a file a message
	* carries in a conversation of theirs (the record counts them per
	* conversation), or one bookmarked in a channel of theirs (see sharedWithin).
	* A file shared nowhere they can read is not theirs, and nor is one shared
	* nowhere yet (uploaded and not yet attached, waiting with a scheduled
	* message, bookmarked in a channel they are not in): taken as open for want
	* of a sharing record, as it used to be, such a file was any guest's to
	* download or attach by its id. A record from before files were counted
	* (neither a count nor a sharing record on it) stays open, as it was:
	* nothing on it says whose it is not.
	*/
	function mayTakeFile(ctx, fileId, meta) {
		if (!isLimited(ctx.member) || meta.u === ctx.uuid) return true;
		if (meta.refs === void 0 && meta.cs === void 0) return true;
		return sharedWithin(ctx, fileId, meta.cs);
	}
	/**
	* Count one message's hold on each of its files: a reference, and a sharing
	* in the conversation (what a guest's download is judged by). A dozen at a
	* time, as every other fan-out here (an import's page names up to 2,500),
	* and a write that failed is tried once more rather than let go: a hold not
	* counted is a file deleted from under the messages still carrying it.
	*/
	async function holdFiles(conv, ids) {
		const hold = async (id) => {
			const by = {
				refs: 1,
				[`cs.${conv}`]: 1
			};
			try {
				await kv().incr(KEYS.file(id), by);
			} catch {
				await kv().incr(KEYS.file(id), by).catch(() => {});
			}
		};
		for (let i = 0; i < ids.length; i += 12) await Promise.all(ids.slice(i, i + 12).map(hold));
	}
	/**
	* The files the workspace's channel bookmarks point at, less the bookmarks
	* of `except` (a channel whose list is being rewritten, or which is going).
	* A bookmark holds a file the way a message does (see releaseFile): the
	* bookmark is made from a message's menu, and the message deleted later
	* used to take the bytes with it, leaving the bookmark to open onto "Could
	* not download the file" for good.
	*/
	function bookmarkedFiles(ws, except = null) {
		const out = /* @__PURE__ */ new Set();
		for (const [cid, c] of Object.entries(ws?.channels || {})) {
			if (cid === except) continue;
			for (const b of Array.isArray(c?.bookmarks) ? c.bookmarks : []) if (typeof b?.file === "string") out.add(b.file);
		}
		return out;
	}
	/**
	* Let go of files whose bookmarks came down (`ids`), where nothing else
	* holds them: not a message (the record's count), and not a bookmark still
	* standing elsewhere (`keep`, see bookmarkedFiles). The bytes of a file a
	* bookmark alone kept would otherwise sit in the owner's drive for good.
	*/
	/**
	* The files the messages waiting in the workspace's queue are to carry (see
	* releaseScheduledFiles, which lets go of those): read once, the first time
	* asked, and only then, since every caller asks only where a file nothing
	* else holds is about to go. A file a waiting message names stays for it,
	* whatever else let go of it, as a bookmarked one stays for its bookmark.
	*/
	function queuedFilesReader(wsId) {
		let pending = null;
		return () => {
			if (!pending) pending = kv().get(KEYS.sched(wsId)).catch(() => null).then((queue) => new Set(Object.values(queue?.m || {}).flatMap((e) => (Array.isArray(e?.attachments) ? e.attachments : []).map((a) => a?.id).filter((id) => typeof id === "string"))));
			return pending;
		};
	}
	async function releaseBookmarkFiles(wsId, ids, keep) {
		const gone = [...new Set(ids)].filter((id) => typeof id === "string" && !keep.has(id));
		if (!gone.length) return;
		const metas = await getMany(gone.map((id) => KEYS.file(id)));
		const queued = queuedFilesReader(wsId);
		for (let i = 0; i < gone.length; i++) {
			const meta = metas[i];
			if (!meta || meta.ws !== wsId || Number(meta.refs) > 0) continue;
			if ((await queued()).has(gone[i])) continue;
			await fs().delete(`teamchat-files/${wsId}/${gone[i]}`).catch(() => {});
			await kv().del(KEYS.file(gone[i])).catch(() => {});
		}
	}
	/**
	* A deleted message lets go of its attachments. A file forwarded into other
	* messages is still referenced there, so its bytes stay until the last
	* message holding it is deleted; files from before references were counted
	* go at once, as they always did. One a bookmark still points at (`keep`,
	* see bookmarkedFiles) stays, whatever its count, until the bookmark comes
	* down; so does one a message still waiting in the queue is to carry
	* (`queued`, see queuedFilesReader), until that message goes out or is
	* dropped, when the queue's side lets go of it (see releaseScheduledFiles).
	*/
	async function releaseFile(wsId, fileId, conv = null, keep = null, queued = null) {
		let refs = 0;
		const by = (n) => ({
			refs: n,
			...conv ? { [`cs.${conv}`]: n } : {}
		});
		try {
			const res = await kv().incr(KEYS.file(fileId), by(-1));
			if (res && typeof res === "object" && res.ws && res.ws !== wsId) {
				await kv().incr(KEYS.file(fileId), by(1)).catch(() => {});
				return;
			}
			refs = Number(res && typeof res === "object" ? res.refs : res) || 0;
		} catch {
			refs = 0;
		}
		if (refs > 0) return;
		if (keep?.has(fileId)) {
			const fresh = await kv().get(KEYS.ws(wsId)).catch(() => null);
			if (!fresh || bookmarkedFiles(fresh).has(fileId)) return;
		}
		if (queued && (await queued()).has(fileId)) return;
		await fs().delete(`teamchat-files/${wsId}/${fileId}`).catch(() => {});
		await kv().del(KEYS.file(fileId)).catch(() => {});
	}
	router.post("/api/ws/:ws/conv/:conv/messages/:seq/reactions", route(async ({ params, request, user, defer }) => {
		const seqNum = Number(params.seq);
		const locatable = looksLikeConvId(params.conv) && Number.isInteger(seqNum) && seqNum >= 1;
		const ctx = await requireMembership(params.ws, user, {
			write: true,
			also: locatable ? [KEYS.block(params.conv, blockIndexOf(seqNum))] : []
		});
		const body = await readJson(request);
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		if (!conv.joined) fail(403, "not_joined", "Join the channel to react");
		if (conv.channel?.archived) fail(403, "archived", "This channel is archived");
		const seq = seqNum;
		if (!isReactionKey(body.reaction)) fail(400, "invalid", "Unknown reaction");
		const found = locatable ? messageIn(params.conv, seq, ctx.extra[0]) : await locateMessage(params.conv, seq);
		if (!found || found.overlay.d) fail(404, "not_found", "Message not found");
		if (found.raw.k === "sys") fail(400, "invalid", "System lines take no reactions");
		if (found.raw.k === "rem") fail(400, "invalid", "Reminders take no reactions");
		const path = `x.${overlayKey(seq)}.r.${body.reaction}.${id.uuid}`;
		const current = found.overlay.r || {};
		const has = !!current[body.reaction]?.[id.uuid];
		const on = typeof body.on === "boolean" ? body.on : !has;
		const under = (users) => users ? Object.keys(users).length : 0;
		const distinct = Object.values(current).filter(under).length;
		if (on && !has && !under(current[body.reaction]) && distinct >= 24) fail(400, "limit", `A message can carry up to 24 different reactions`);
		if (on && !has && Object.values(current).reduce((sum, users) => sum + Object.keys(users || {}).length, 0) >= 1e3) fail(400, "limit", "This message has as many reactions as it can carry");
		if (on && !has) assertBlockRoom(found.block, 120, "This message cannot take more reactions");
		if (on && !has && Object.keys(current).length >= 24) {
			const dead = Object.keys(current).filter((k) => k !== body.reaction && !under(current[k]));
			if (dead.length) await kv().remove(found.key, ...dead.map((k) => `x.${overlayKey(seq)}.r.${k}`)).catch(() => {});
		}
		if (on && !has) {
			if (found.raw.u && found.raw.u !== id.uuid && found.raw.k !== "sys" && (await readersAmong(ctx, conv, [found.raw.u])).length > 0) {
				const res = await kv().incr(found.key, {
					[path]: 1,
					[`x.${overlayKey(seq)}.rn.${id.uuid}`]: 1
				});
				const o = res && typeof res === "object" ? res.x?.[overlayKey(seq)] : null;
				if ((o ? Number(o.r?.[body.reaction]?.[id.uuid]) : 1) > 1) {
					await kv().update(found.key, { [path]: 1 }).catch(() => {});
					await kv().incr(found.key, { [`x.${overlayKey(seq)}.rn.${id.uuid}`]: -1 }).catch(() => {});
				} else if ((o ? Number(o.rn?.[id.uuid]) || 1 : 1) <= REACTION_NOTICES) defer(async () => {
					await pushInbox(params.ws, [found.raw.u], {
						k: "reaction",
						c: params.conv,
						s: seq,
						by: id.uuid,
						ts: now(),
						r: body.reaction
					});
					await pokeMember(params.ws, found.raw.u).catch(() => {});
				});
			} else await kv().update(found.key, { [path]: 1 });
		} else if (!on && has) await kv().remove(found.key, path);
		else return {
			ok: true,
			on
		};
		await touchConv(params.ws, params.conv, now(), {
			audience: audienceOf(conv),
			defer,
			ws: ctx.ws,
			seq,
			patch: {
				r: body.reaction,
				ru: id.uuid,
				on: on ? 1 : 0
			}
		});
		return {
			ok: true,
			on
		};
	}));
	router.post("/api/ws/:ws/conv/:conv/read", route(async ({ params, request, user, defer }) => {
		const prefetch = looksLikeConvId(params.conv) ? [KEYS.seq(params.conv)] : [];
		const ctx = await requireMembership(params.ws, user, { also: prefetch });
		const body = await readJson(request);
		const id = ctx.id;
		resolveConv(ctx, params.conv);
		assertNotMoved(ctx.ws);
		const seq = Math.max(0, Math.floor(Number(body.seq) || 0));
		const prev = ctx.doc.reads[params.conv] || 0;
		const patch = {};
		if (body.back) patch[`reads.${params.conv}`] = seq;
		else if (seq > prev) patch[`reads.${params.conv}`] = seq;
		if (!body.back && (ctx.doc.mentions[params.conv] || ctx.doc.threads[params.conv])) {
			const latest = prefetch.length ? Number(ctx.extra[0]) || 0 : Number(await kv().get(KEYS.seq(params.conv))) || 0;
			let atEnd = seq >= latest;
			const from = blockIndexOf(seq);
			const to = blockIndexOf(latest);
			if (!atEnd && seq > 0 && to - from <= 1) {
				const blocks = await Promise.all(Array.from({ length: to - from + 1 }, (_, i) => kv().get(KEYS.block(params.conv, from + i)).catch(() => null)));
				if (!blocks.some((b) => mergeBlock(b).some((m) => m.seq > seq))) {
					const held = new Set(blocks.flatMap((b) => (Array.isArray(b?.m) ? b.m : []).map((m) => m?.s)));
					let accounted = true;
					for (let s = seq + 1; s <= latest && accounted; s++) if (!held.has(s) && !blocks[blockIndexOf(s) - from]?.full) accounted = false;
					atEnd = accounted;
				}
			}
			if (atEnd) {
				if (ctx.doc.mentions[params.conv]) patch[`mentions.${params.conv}`] = 0;
				if (ctx.doc.threads[params.conv]) patch[`threads.${params.conv}`] = 0;
			}
		}
		if (Object.keys(patch).length) await kv().update(KEYS.member(params.ws, id.uuid), patch);
		if (body.back || patch[`mentions.${params.conv}`] === 0 || patch[`threads.${params.conv}`] === 0) defer(() => pokeMember(params.ws, id.uuid).catch(() => {}));
		return {
			ok: true,
			seq: body.back ? seq : Math.max(seq, prev)
		};
	}));
	/** The blocks a list of (conv, seq) entries would be read from, in list order, held to `maxBlocks`. */
	function blockKeysOf(entries, maxBlocks) {
		const keys = [];
		for (const e of entries) {
			const k = KEYS.block(e.c, blockIndexOf(e.s));
			if (!keys.includes(k) && keys.length < maxBlocks) keys.push(k);
		}
		return keys;
	}
	/** Attach messages to entries that name (conv, seq), reading a bounded number of blocks, newest first. */
	async function attachMessages(entries, maxBlocks = 12) {
		const keys = blockKeysOf(entries, maxBlocks);
		const blocks = await getMany(keys);
		const bySeq = /* @__PURE__ */ new Map();
		blocks.forEach((b, i) => {
			for (const m of mergeBlock(b)) bySeq.set(`${keys[i]}#${m.seq}`, m);
		});
		return entries.map((e) => ({
			...e,
			message: bySeq.get(`${KEYS.block(e.c, blockIndexOf(e.s))}#${e.s}`) || null
		}));
	}
	/**
	* Append to a list document that may not exist yet (a member's first save,
	* a conversation's first pin). kv.add is the atomic append; a store that
	* refuses add on a missing key (see appendToBlock) has the list written
	* whole with its first entries, as a member's document is on their first
	* channel. A document that is there means the refusal was something else.
	* Returns what the store handed back from the append (the document, on a
	* store that answers with it), or null.
	*
	* Two first appends in the same instant (a member's first two saves, from
	* two tabs; a conversation's first two pins) each found no list and each
	* wrote one whole, and the slower write took the faster one's entries with
	* it: the message was answered as saved, or pinned, and stood on no list.
	* So the list is read back once the whole write has landed, and an entry of
	* ours it does not hold is appended to the list that stands, which is there
	* to be appended to now.
	*/
	async function appendItems(key, items) {
		try {
			return await kv().add(key, { items });
		} catch (e) {
			if (await kv().get(key)) throw e;
			await kv().set(key, { items });
			const after = await kv().get(key).catch(() => null);
			const list = Array.isArray(after?.items) ? after.items : null;
			if (!list) return null;
			const same = (a, b) => !!a && !!b && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);
			const lost = items.filter((x) => !list.some((y) => same(x, y)));
			if (!lost.length) return after;
			return await kv().add(key, { items: lost }).catch(() => null);
		}
	}
	/**
	* A conversation that is gone for good, as against one the caller cannot
	* read right now: a channel no longer on the workspace (or a thread of one),
	* or a direct message the caller's document does not hold (their saved list
	* dies with their membership, so one they once saved into and no longer hold
	* is not coming back). A channel they have merely left still exists and may
	* take them back, and what they kept of it with them.
	*/
	function isGone(ctx, conv) {
		const id = String(conv || "");
		const thread = parentOfThread(id);
		const base = thread ? thread.conv : id;
		return !own(ctx.ws.channels, base) && !own(ctx.doc.dms, base);
	}
	/**
	* Read cursors kept for threads no longer on the member's Threads list. A
	* cursor is written for every thread a member ever opens, and nothing took
	* one out again: a member reading thirty threads a day added a couple of
	* hundred kilobytes a year to a document that every request of theirs reads
	* and that the store refuses past a ceiling (see MEMBER_DOC_BYTES), after
	* which nothing of theirs could be written. The listed threads keep theirs
	* (a row opens onto them); of the rest, this many stay, the ones first
	* opened longest ago going first (a document keeps its keys in the order
	* they were first written). What is lost with a cursor is only where the
	* "New" line would sit on reopening a thread not opened in a long while.
	*/
	var THREAD_CURSORS_MAX = 1e3;
	/** Keys pruned per visit, so one visit after years of growth stays short; the next takes more. */
	var MEMBER_PRUNE_MAX = 300;
	/**
	* Paths of a member's document that hold nothing any more, pruned where the
	* Threads list is drawn (the one place the document's thread record is read
	* whole): every cursor, mention count, notification setting and reply count
	* kept for a conversation gone for good (a channel deleted, or a thread of
	* one), which nothing would read again; and the oldest thread cursors past
	* THREAD_CURSORS_MAX. Nothing a badge or a follow depends on goes: a reply
	* count for a live thread, a mention count for a channel still here (one
	* merely left keeps its count, and entering clears it), a follow flag (the
	* app's Follow button falls back to the root's record only when the flag is
	* absent, so an unlisted thread's flag stays as it was).
	*/
	function staleMemberPaths(ctx, listed) {
		const { doc } = ctx;
		const paths = [];
		for (const map of [
			"reads",
			"mentions",
			"notify",
			"threads"
		]) for (const conv of Object.keys(doc[map] || {})) if (isGone(ctx, conv)) paths.push(`${map}.${conv}`);
		const cursors = Object.keys(doc.reads || {}).filter((c) => parentOfThread(c) && !listed.has(c) && !isGone(ctx, c));
		for (const c of cursors.slice(0, Math.max(0, cursors.length - THREAD_CURSORS_MAX))) paths.push(`reads.${c}`);
		for (const [c, v] of Object.entries(doc.notify || {})) {
			if (!parentOfThread(c) || listed.has(c) || isGone(ctx, c)) continue;
			if (v && typeof v === "object" && Object.keys(v).every((k) => k === "follow")) paths.push(`notify.${c}`);
		}
		return paths.slice(0, MEMBER_PRUNE_MAX);
	}
	/** Drop entries in conversations the caller can no longer read. */
	function readable(ctx, entries) {
		return entries.filter((e) => {
			try {
				resolveConv(ctx, e.c);
				return true;
			} catch {
				return false;
			}
		});
	}
	router.get("/api/ws/:ws/inbox", route(async ({ params, request, user }) => {
		const ctx = await requireMembership(params.ws, user, { also: ({ uuid }) => [KEYS.inbox(params.ws, uuid)] });
		ctx.id;
		const kind = query(request).get("kind");
		let items = [...(ctx.extra[0] || { items: [] }).items || []].reverse();
		if (kind && kind !== "all") items = items.filter((e) => e.k === kind);
		const told = /* @__PURE__ */ new Set();
		items = items.filter((e) => {
			if (e.k !== "reaction") return true;
			const key = `${e.c}#${e.s}#${e.by}#${e.r}`;
			if (told.has(key)) return false;
			told.add(key);
			return true;
		});
		items = readable(ctx, items).slice(0, 60);
		const withMessages = await attachMessages(items);
		const read = new Set(ctx.ws.importing ? [] : blockKeysOf(items, 12));
		const gone = (e) => read.has(KEYS.block(e.c, blockIndexOf(e.s))) && (!e.message || e.message.deleted || e.k === "reaction" && e.r && !e.message.reactions?.[e.r]?.[e.by]);
		return {
			items: withMessages.filter((e) => !gone(e)),
			unread: ctx.doc.inbox || 0
		};
	}));
	router.post("/api/ws/:ws/inbox/read", route(async ({ params, user }) => {
		const ctx = await requireMembership(params.ws, user);
		const id = ctx.id;
		assertNotMoved(ctx.ws);
		if (ctx.doc.inbox) {
			await kv().update(KEYS.member(params.ws, id.uuid), { inbox: 0 });
			await pokeMember(params.ws, id.uuid).catch(() => {});
		}
		return { ok: true };
	}));
	/**
	* Threads the caller is in, newest activity first, with the root message
	* and the unread reply count. The list is pruned to its cap here, the one
	* place it is read whole.
	*/
	router.get("/api/ws/:ws/threads", route(async ({ params, user }) => {
		const ctx = await requireMembership(params.ws, user, { also: ({ uuid }) => [KEYS.threads(params.ws, uuid)] });
		const id = ctx.id;
		const doc = ctx.extra[0] || { t: {} };
		let entries = Object.entries(doc.t || {}).map(([tid, v]) => ({
			id: tid,
			c: v.c,
			s: v.s,
			at: v.at || 0
		})).sort((a, b) => b.at - a.at);
		const noWrites = ctx.ws.movedTo || frozen(ctx.ws);
		let pruned = [];
		if (entries.length > LIMITS.threadsFollowed) {
			pruned = entries.slice(LIMITS.threadsFollowed);
			entries = entries.slice(0, LIMITS.threadsFollowed);
			if (!noWrites) await kv().set(KEYS.threads(params.ws, id.uuid), { t: Object.fromEntries(entries.map((e) => [e.id, {
				c: e.c,
				s: e.s,
				at: e.at
			}])) }).catch(() => {});
		}
		const canRead = readable(ctx, entries);
		const drop = new Set([...entries.filter((e) => !canRead.includes(e)), ...pruned].filter((e) => Object.hasOwn(ctx.doc.threads, e.id)).map((e) => e.id));
		const listed = new Set(entries.map((e) => e.id));
		for (const [tid, n] of Object.entries(ctx.doc.threads)) if (!listed.has(tid) && !(Number(n) > 0)) drop.add(tid);
		const stale = staleMemberPaths(ctx, listed);
		entries = canRead.filter((e) => ctx.doc.notify[e.id]?.follow !== false).slice(0, 60);
		const withRoot = await attachMessages(entries.map((e) => ({
			...e,
			c: e.c,
			s: e.s
		})), entries.length);
		const gone = new Set(ctx.ws.importing || noWrites ? [] : withRoot.filter((e) => !e.message).map((e) => e.id));
		if (gone.size) await kv().remove(KEYS.threads(params.ws, id.uuid), ...[...gone].map((tid) => `t.${tid}`)).catch(() => {});
		for (const tid of gone) if (Object.hasOwn(ctx.doc.threads, tid)) drop.add(tid);
		if (!noWrites && (drop.size || stale.length)) {
			const paths = [.../* @__PURE__ */ new Set([...[...drop].map((tid) => `threads.${tid}`), ...stale])];
			for (let i = 0; i < paths.length; i += 100) await kv().remove(KEYS.member(params.ws, id.uuid), ...paths.slice(i, i + 100)).catch(() => {});
			const counted = (p) => p.startsWith("threads.") && Number(ctx.doc.threads[p.slice(8)]) > 0;
			if (paths.some(counted)) await pokeMember(params.ws, id.uuid).catch(() => {});
		}
		return { threads: withRoot.filter((e) => !gone.has(e.id)).map((e) => ({
			id: e.id,
			conv: e.c,
			seq: e.s,
			at: e.at,
			unread: ctx.doc.threads[e.id] || 0,
			root: e.message
		})) };
	}));
	router.get("/api/ws/:ws/saved", route(async ({ params, user }) => {
		const ctx = await requireMembership(params.ws, user, { also: ({ uuid }) => [KEYS.saved(params.ws, uuid)] });
		const id = ctx.id;
		const key = KEYS.saved(params.ws, id.uuid);
		const all = (ctx.extra[0] || { items: [] }).items || [];
		let kept = all.filter((e) => !isGone(ctx, e.c));
		const seen = /* @__PURE__ */ new Set();
		kept = kept.filter((e) => {
			const k = `${e.c}#${e.s}`;
			if (seen.has(k)) return false;
			seen.add(k);
			return true;
		});
		const items = readable(ctx, [...kept].reverse());
		const withMessages = await attachMessages(items);
		const read = new Set(blockKeysOf(items, 12));
		const gone = new Set(withMessages.filter((e) => read.has(KEYS.block(e.c, blockIndexOf(e.s))) && (!e.message || e.message.deleted)).map((e) => `${e.c}#${e.s}`));
		if (gone.size) kept = kept.filter((e) => !gone.has(`${e.c}#${e.s}`));
		if (!(ctx.ws.movedTo || frozen(ctx.ws)) && kept.length !== all.length) await kv().set(key, { items: kept }).catch(() => {});
		return { items: withMessages.filter((e) => !gone.has(`${e.c}#${e.s}`)) };
	}));
	/** Save a message for later, mark it done or not, or remove it. */
	router.post("/api/ws/:ws/saved", route(async ({ params, request, user }) => {
		const ctx = await requireMembership(params.ws, user);
		const id = ctx.id;
		const body = await readJson(request);
		const conv = String(body.conv || "");
		const seq = Math.floor(Number(body.seq));
		if (!/^[a-z0-9_]{1,64}$/.test(conv) || !Number.isInteger(seq) || seq < 1) fail(400, "invalid", "Bad message reference");
		assertNotMoved(ctx.ws);
		const key = KEYS.saved(params.ws, id.uuid);
		const items = (await kv().get(key) || { items: [] }).items || [];
		const i = items.findIndex((x) => x.c === conv && x.s === seq);
		if (body.remove) {
			if (i > -1) await kv().set(key, { items: items.filter((_, j) => j !== i) });
			return {
				ok: true,
				saved: false
			};
		}
		resolveConv(ctx, conv);
		if (typeof body.done === "boolean") {
			if (i === -1) fail(404, "not_found", "Not saved");
			items[i] = {
				...items[i],
				done: body.done
			};
			await kv().set(key, { items });
			return {
				ok: true,
				saved: true,
				done: body.done
			};
		}
		if (i > -1) return {
			ok: true,
			saved: true,
			already: true
		};
		if (items.length >= LIMITS.savedItems) fail(400, "limit", `You can keep up to ${LIMITS.savedItems} saved messages. Clear some first`);
		const found = await locateMessage(conv, seq);
		if (!found || found.overlay.d) fail(404, "not_found", "Message not found");
		const entry = {
			c: conv,
			s: seq,
			ts: now(),
			done: false
		};
		const after = await appendItems(key, [entry]);
		const list = Array.isArray(after?.items) ? after.items : null;
		const mine = (x) => x && x.c === conv && x.s === seq;
		if (list && list.filter(mine).length > 1) {
			const last = list.map((x, j) => mine(x) ? j : -1).filter((j) => j >= 0).pop();
			await kv().set(key, { items: list.filter((_, j) => j !== last) }).catch(() => {});
			return {
				ok: true,
				saved: true,
				already: true
			};
		}
		const seen = (await kv().get(key).catch(() => null))?.items;
		if (Array.isArray(seen) && !seen.some(mine)) await appendItems(key, [entry]);
		return {
			ok: true,
			saved: true
		};
	}));
	/**
	* How a member wants to hear about a conversation: level (all, mentions,
	* nothing), mute, and for a thread whether they follow it. Lives in the
	* member document, which every request already reads, as one path write.
	* Following is also recorded on the thread root's overlay, which is where
	* the reply path looks for followers.
	*/
	router.put("/api/ws/:ws/conv/:conv/notify", route(async ({ params, request, user }) => {
		const ctx = await requireMembership(params.ws, user);
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		assertNotMoved(ctx.ws);
		const body = await readJson(request);
		const cur = { ...ctx.doc.notify[params.conv] || {} };
		const patch = {};
		if (body.level !== void 0) {
			if (!NOTIFY_LEVELS.includes(body.level)) fail(400, "invalid", "Unknown notification level");
			patch[`notify.${params.conv}.level`] = body.level;
			cur.level = body.level;
		}
		if (body.mute !== void 0) {
			if (typeof body.mute !== "boolean") fail(400, "invalid", "mute must be true or false");
			patch[`notify.${params.conv}.mute`] = body.mute;
			cur.mute = body.mute;
		}
		if (body.follow !== void 0) {
			if (conv.kind !== "thread") fail(400, "invalid", "Only threads can be followed");
			if (typeof body.follow !== "boolean") fail(400, "invalid", "follow must be true or false");
			const root = await locateMessage(conv.parent.conv, conv.parent.seq);
			if (!root || root.overlay.d && !(Number(root.overlay.rc) > 0)) fail(404, "not_found", "Message not found");
			if (root.overlay.f?.[id.uuid] === void 0) assertBlockRoom(root.block, 60, "This thread cannot take more followers");
			patch[`notify.${params.conv}.follow`] = body.follow;
			cur.follow = body.follow;
			await kv().update(root.key, { [`x.${overlayKey(conv.parent.seq)}.f.${id.uuid}`]: body.follow ? 1 : 0 });
			if (!body.follow && ctx.doc.threads[params.conv]) patch[`threads.${params.conv}`] = 0;
		}
		if (!Object.keys(patch).length) fail(400, "invalid", "Nothing to change");
		await kv().update(KEYS.member(params.ws, id.uuid), patch);
		await pokeMember(params.ws, id.uuid).catch(() => {});
		return {
			ok: true,
			notify: cur
		};
	}));
	/**
	* Remove a pin from the list, clear the message flag, and count it off.
	* Idempotent. `known` is the list as the caller has just read it (the unpin
	* route reads it to find the pin and who made it), spared a second read;
	* `audience` is who to signal for it (see audienceOf).
	*/
	async function unpin(wsId, conv, seq, known = null, audience = null, ws = null) {
		const doc = known || await kv().get(KEYS.pins(wsId, conv)) || { items: [] };
		const items = (doc.items || []).filter((p) => p.seq !== seq);
		if (items.length === (doc.items || []).length) return false;
		await kv().set(KEYS.pins(wsId, conv), { items });
		await kv().remove(KEYS.block(conv, blockIndexOf(seq)), `x.${overlayKey(seq)}.p`).catch(() => {});
		await touchConv(wsId, conv, now(), {
			audience,
			extra: { [`c.${conv}.pc`]: new Set(items.map((p) => p?.seq)).size },
			ws,
			seq,
			patch: { p: 0 }
		});
		return true;
	}
	/**
	* The pinned messages of a conversation, with the messages themselves where
	* they can be read in a bounded number of blocks (newest pins first). A pin
	* whose block was not reached comes back without its message; the client
	* can still open it.
	*/
	router.get("/api/ws/:ws/conv/:conv/pins", route(async ({ params, user }) => {
		const pinned = looksLikeConvId(params.conv) ? [KEYS.pins(params.ws, params.conv)] : [];
		const ctx = await requireMembership(params.ws, user, { also: pinned });
		const conv = resolveConv(ctx, params.conv);
		const doc = (pinned.length ? ctx.extra[0] : await kv().get(KEYS.pins(params.ws, params.conv))) || { items: [] };
		const seen = /* @__PURE__ */ new Set();
		const items = (doc.items || []).filter((p) => p && !seen.has(p.seq) && seen.add(p.seq)).sort((a, b) => b.ts - a.ts);
		const blocks = [];
		for (const p of items) {
			const key = KEYS.block(params.conv, blockIndexOf(p.seq));
			if (!blocks.includes(key) && blocks.length < 12) blocks.push(key);
		}
		const read = await getMany(blocks);
		const bySeq = /* @__PURE__ */ new Map();
		read.forEach((b) => {
			for (const m of mergeBlock(b)) bySeq.set(m.seq, m);
		});
		const frozenOrMoved = ctx.ws.importing || ctx.ws.movedTo || frozen(ctx.ws);
		const gone = new Set(frozenOrMoved ? [] : items.filter((p) => blocks.includes(KEYS.block(params.conv, blockIndexOf(p.seq))) && (!bySeq.has(p.seq) || bySeq.get(p.seq).deleted)).map((p) => p.seq));
		if (gone.size) {
			const kept = (doc.items || []).filter((p) => !p || !gone.has(p.seq));
			await kv().set(KEYS.pins(params.ws, params.conv), { items: kept }).catch(() => {});
			for (const seq of gone) await kv().remove(KEYS.block(params.conv, blockIndexOf(seq)), `x.${overlayKey(seq)}.p`).catch(() => {});
			await touchConv(params.ws, params.conv, now(), {
				audience: audienceOf(conv),
				extra: { [`c.${params.conv}.pc`]: new Set(kept.map((p) => p?.seq)).size },
				ws: ctx.ws
			}).catch(() => {});
		}
		return { pins: items.filter((p) => !gone.has(p.seq)).map((p) => ({
			...p,
			message: bySeq.get(p.seq) || null
		})) };
	}));
	/** Pin a message: anyone who may post here; capped, and announced in the conversation. */
	router.post("/api/ws/:ws/conv/:conv/pins", route(async ({ params, request, user, defer }) => {
		const listed = looksLikeConvId(params.conv) ? [KEYS.pins(params.ws, params.conv)] : [];
		const ctx = await requireMembership(params.ws, user, {
			write: true,
			also: listed
		});
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		if (!conv.canPost) {
			if (conv.deny === "read_only") fail(403, "read_only", "Only admins can pin here");
			const name = conv.channel ? `#${conv.channel.name}` : "this conversation";
			if (conv.deny === "threads_off") fail(403, "threads_off", `Replies are turned off in ${name}, and so is pinning in its threads`);
			if (conv.deny === "threads_admins") fail(403, "threads_admins", `Only admins can pin in threads in ${name}`);
			if (conv.deny === "archived") fail(403, "archived", "This channel is archived");
			fail(403, "forbidden", "Join the conversation to pin messages");
		}
		const body = await readJson(request);
		const seq = Math.floor(Number(body.seq));
		const found = await locateMessage(params.conv, seq);
		if (!found || found.overlay.d) fail(404, "not_found", "Message not found");
		if (found.raw.k === "sys") fail(400, "invalid", "System lines cannot be pinned");
		if (found.raw.k === "rem") fail(400, "invalid", "Reminders cannot be pinned");
		const pinsKey = KEYS.pins(params.ws, params.conv);
		const doc = (listed.length ? ctx.extra[0] : await kv().get(pinsKey)) || { items: [] };
		if ((doc.items || []).some((p) => p.seq === seq)) {
			if (!found.overlay.p) await kv().update(found.key, { [`x.${overlayKey(seq)}.p`]: 1 }).catch(() => {});
			return {
				ok: true,
				already: true
			};
		}
		if ((doc.items || []).length >= LIMITS.pinsPerConversation) fail(400, "limit", `A conversation can hold ${LIMITS.pinsPerConversation} pins. Unpin something first`);
		const ts = now();
		const pin = {
			seq,
			by: id.uuid,
			ts
		};
		await Promise.all([appendItems(pinsKey, [pin]), kv().update(found.key, { [`x.${overlayKey(seq)}.p`]: 1 })]);
		let items = (await kv().get(pinsKey).catch(() => null))?.items;
		if (Array.isArray(items) && !items.some((p) => p.seq === seq)) {
			await appendItems(pinsKey, [pin]);
			items = [...items, pin];
		}
		if (Array.isArray(items)) {
			const copies = items.map((p, j) => p && p.seq === seq ? j : -1).filter((j) => j >= 0);
			const first = copies.length ? items[copies[0]] : null;
			if (first && !(first.by === pin.by && first.ts === pin.ts)) {
				const own = [...copies].reverse().find((j) => items[j].by === pin.by && items[j].ts === pin.ts);
				if (own !== void 0) await kv().set(pinsKey, { items: items.filter((_, j) => j !== own) }).catch(() => {});
				else if (copies.length > 1) await kv().set(pinsKey, { items: items.filter((_, j) => j !== copies[copies.length - 1]) }).catch(() => {});
				return {
					ok: true,
					already: true
				};
			}
		}
		const count = Array.isArray(items) ? new Set(items.map((p) => p?.seq)).size : (doc.items || []).length + 1;
		defer(async () => {
			await touchConv(params.ws, params.conv, ts, {
				audience: audienceOf(conv),
				extra: { [`c.${params.conv}.pc`]: count },
				ws: ctx.ws,
				seq,
				patch: { p: 1 }
			});
			await postSystem(params.ws, params.conv, id.uuid, `${ctx.ws.members[id.uuid].name} pinned a message`);
		});
		return {
			ok: true,
			pin
		};
	}));
	/** Unpin: the person who pinned it, or an admin. */
	router.delete("/api/ws/:ws/conv/:conv/pins/:seq", route(async ({ params, user }) => {
		const ctx = await requireMembership(params.ws, user, { write: true });
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		const seq = Math.floor(Number(params.seq));
		const doc = await kv().get(KEYS.pins(params.ws, params.conv)) || { items: [] };
		const pin = (doc.items || []).find((p) => p.seq === seq);
		if (!pin) {
			const found = await locateMessage(params.conv, seq);
			if (!found?.overlay.p) fail(404, "not_found", "That message is not pinned");
			if (!conv.canPost && !isAdmin(ctx.member)) fail(403, "forbidden", "Only the person who pinned it, or an admin, can unpin");
			await kv().remove(found.key, `x.${overlayKey(seq)}.p`);
			await touchConv(params.ws, params.conv, now(), {
				audience: audienceOf(conv),
				ws: ctx.ws,
				seq,
				patch: { p: 0 }
			});
			return { ok: true };
		}
		if (pin.by !== id.uuid && !isAdmin(ctx.member)) fail(403, "forbidden", "Only the person who pinned it, or an admin, can unpin");
		await unpin(params.ws, params.conv, seq, doc, audienceOf(conv), ctx.ws);
		return { ok: true };
	}));
	/**
	* Query params: q (words), in (conversation id), from (member uuid),
	* has (file,link), before/after (epoch ms), cursor. Results only ever come
	* from conversations the caller may read; the check runs on every
	* candidate before any message is fetched.
	*/
	router.get("/api/ws/:ws/search", route(async ({ params, request, user }) => {
		const id = await identify(user);
		const [membership, meta] = await Promise.all([requireMembership(params.ws, id.uuid), /^[a-z0-9]{6,20}$/.test(String(params.ws)) ? searchMeta(params.ws).catch(() => ({})) : {}]);
		const ctx = {
			...membership,
			uuid: id.uuid
		};
		const q = query(request);
		const text = cleanText(q.get("q") || "", LIMITS.searchQuery);
		const num = (name) => q.get(name) ? Math.floor(Number(q.get(name))) || null : null;
		const inConv = q.get("in") || null;
		if (inConv) resolveConv(ctx, inConv);
		const from = q.get("from") || null;
		if (from && !/^[\w-]{1,64}$/.test(from)) fail(400, "invalid", "Unknown person");
		const has = String(q.get("has") || "").split(",").filter((h) => h === "file" || h === "link");
		const canRead = (conv) => {
			try {
				resolveConv(ctx, conv);
				return true;
			} catch {
				return false;
			}
		};
		const legacy = !(Number(ctx.ws.search?.v) >= 3);
		return {
			...await search(params.ws, {
				words: words(text),
				has,
				in: inConv,
				from,
				before: num("before"),
				after: num("after"),
				cursor: q.get("cursor") || null
			}, canRead, {
				meta,
				legacy
			}),
			indexed: ctx.ws.search || null
		};
	}));
	/**
	* Admin only: (re)build the index over existing history. Each call does a
	* bounded amount of work and returns a state to post back; the client loops
	* until `done`. Starting over (no state) drops the old index first.
	*/
	router.post("/api/ws/:ws/search/reindex", route(async ({ params, request, user }) => {
		const id = await identify(user);
		const body = await readJson(request);
		let state = body.state && typeof body.state === "object" && Array.isArray(body.state.convs) ? body.state : null;
		const { ws, member, doc } = await requireMembership(params.ws, id.uuid, { doc: !state });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can build the search index");
		if (state) {
			const drop = Array.isArray(state.drop) ? state.drop : [];
			if (!(state.convs.every((c) => typeof c === "string" && /^[a-z0-9_]{1,64}$/.test(c)) && drop.every((b) => isBucket(b)) && Number.isInteger(state.i) && state.i >= 0 && Number.isInteger(state.n) && state.n >= 0)) fail(400, "invalid", "Bad reindex state");
			state = {
				convs: state.convs.slice(0, REINDEX_MAX_CONVS),
				i: state.i,
				n: state.n,
				messages: Number(state.messages) || 0,
				skipped: Number(state.skipped) || 0,
				drop: drop.slice(0, 1200)
			};
			const walk = await kv().get(KEYS.searchWalk(ws.id));
			if (!walk || !Array.isArray(walk.dms)) fail(400, "invalid", "Bad reindex state");
			const dms = new Set(walk.dms);
			const ours = (c) => {
				const t = parentOfThread(c);
				if (t && (threadConvId(t.conv, t.seq) !== c || parentOfThread(t.conv))) return false;
				const base = t ? t.conv : c;
				return !!own(ws.channels, base) || dms.has(base);
			};
			const convs = [];
			let i = state.i;
			state.convs.forEach((c, idx) => {
				if (ours(c)) convs.push(c);
				else if (idx < state.i) i--;
				else if (idx === state.i) state.n = 0;
			});
			state.convs = convs;
			state.i = Math.max(0, i);
		}
		let memberDocs = [];
		if (!state) memberDocs = [...(await memberDocsReader(ws, {
			uuid: id.uuid,
			doc
		})()).values()];
		const next = await reindexStep(ws.id, ws, memberDocs, state);
		if (next.done) {
			await kv().update(KEYS.ws(ws.id), { search: indexStamp() });
			await bumpWorkspace(ws.id);
		}
		return {
			done: next.done,
			state: next.done ? null : next,
			progress: {
				done: Math.min(next.i, next.convs.length),
				total: next.convs.length,
				messages: next.messages,
				skipped: next.skipped || 0,
				clearing: Array.isArray(next.drop) ? next.drop.length : 0
			}
		};
	}));
	/**
	* Tokens are `tch_{id}_{secret}` (webhooks) and `tcb_{id}_{secret}` (bots):
	* the id makes the record a direct get, the secret is stored only as a
	* SHA-256 hash and compared in constant time, and the token is shown to the
	* admin exactly once. These are the only routes besides /health that take
	* no Puter session, so they are rate-limited per token and reject oversized
	* bodies before touching storage.
	*/
	var TOKEN_RE = /^(tch|tcb)_([a-z0-9]{10})_([a-z0-9]{32})$/;
	var BOT_SCOPES = [
		"post",
		"read",
		"react"
	];
	function botAuthor(kind, id) {
		return `${kind}_${id}`;
	}
	/**
	* How many integrations a workspace has: the live ones, as the list shows
	* them. A "last used" note landing under an integration revoked meanwhile
	* (or whose channel was deleted) leaves an entry of that one field, which
	* the list route sweeps; counted here until then, it made a workspace with
	* forty-nine integrations refuse a fiftieth, and told a move's nominee of
	* fifty to make again.
	*/
	function liveIntegrations(ws) {
		const live = (map, has) => Object.values(map || {}).filter((v) => !!(v && typeof v === "object" && v[has])).length;
		return live(ws.webhooks, "ch") + live(ws.bots, "name");
	}
	async function mintToken(kind) {
		const id = uid(10);
		const secret = uid(32);
		return {
			id,
			secret,
			token: `${kind}_${id}_${secret}`,
			hash: await sha256(secret)
		};
	}
	/** The minute's count of calls under one token id (see authToken); dropped when the token is rotated. */
	var hookRateKey = (id) => `tc:hookrate:${id}`;
	/** Resolve a token to its record, or 401. Records of revoked tokens are gone, so they fail the same way. */
	async function authToken(raw, expectKind) {
		const m = TOKEN_RE.exec(String(raw || ""));
		if (!m || m[1] !== expectKind) fail(401, "unauthorized", "Invalid token");
		const [, kind, id, secret] = m;
		const rec = await kv().get(kind === "tch" ? KEYS.hook(id) : KEYS.bot(id));
		if (!rec || !rec.ws || !timingSafeEqual(await sha256(secret), rec.hash)) fail(401, "unauthorized", "Invalid token");
		const rateKey = hookRateKey(id);
		const n = await kv().incr(rateKey).catch(() => 1);
		if (n === 1) await kv().expire(rateKey, 60).catch(() => {});
		if (n > LIMITS.hookRatePerMinute) fail(429, "rate_limited", `This token may make ${LIMITS.hookRatePerMinute} calls a minute; try again shortly`, { "Retry-After": "60" });
		return {
			id,
			rec
		};
	}
	/** Read a small JSON body; refuse anything over the cap before parsing it. */
	async function readSmallJson(request) {
		if (Number(request.headers.get("content-length")) > LIMITS.webhookBodyBytes) fail(413, "too_large", `Payloads can be up to ${LIMITS.webhookBodyBytes / 1024} KB`);
		const { text, truncated } = await readCapped(request, LIMITS.webhookBodyBytes);
		if (truncated || text.length > LIMITS.webhookBodyBytes) fail(413, "too_large", `Payloads can be up to ${LIMITS.webhookBodyBytes / 1024} KB`);
		const form = /application\/x-www-form-urlencoded/i.test(String(request.headers.get("content-type") || "")) || /^payload=/.test(text);
		const raw = form ? String(new URLSearchParams(text).get("payload") || "") : text;
		if (form && !raw) fail(400, "invalid", "Body must be JSON, or a form with a JSON payload field");
		try {
			const body = JSON.parse(raw || "{}");
			return body && typeof body === "object" ? body : {};
		} catch {
			fail(400, "invalid", form ? "The payload field must be JSON" : "Body must be JSON");
		}
	}
	/**
	* Text from our shape or the common incoming-webhook one ({ text }, or
	* blocks/attachments with text), its markup read as that format writes it,
	* and each part given the place the format gives it. Blocks that say
	* something are the message, and `text` beside them is the notification
	* fallback a payload may carry (many libraries send `text: ""` with their
	* blocks, and as many send a one-line summary there); without blocks,
	* `text` is the message. The attachments follow either, below the message
	* as they are drawn under it. Taken as the whole message whenever it said
	* something, as it used to be, a payload's summary line was posted and the
	* blocks or attachments that held the notice itself (the build's title,
	* its fields, who ran it) were dropped, so a deploy notice arrived as
	* "Deploy finished" alone. Blocks that say nothing (a divider, a picture)
	* leave the text to stand in. Each piece reads its own markup (see
	* blockText and attachmentText): a rich text block's runs are plain words,
	* which the format never escapes, and are read as written.
	*/
	function integrationText(body) {
		const text = typeof body.text === "string" && body.text.trim() ? fromWebhookMarkup(body.text) : "";
		const blocks = (Array.isArray(body.blocks) ? body.blocks : []).map(blockText).filter(Boolean);
		const attachments = (Array.isArray(body.attachments) ? body.attachments : []).map(attachmentText).filter(Boolean);
		return [...blocks.length ? blocks : text ? [text] : [], ...attachments].join("\n");
	}
	/**
	* The text of one attachment in the legacy attachments shape (what build
	* servers and monitoring tools have sent for a decade: a coloured bar
	* beside a few lines), each piece on its own line in the order they are
	* drawn: the pretext above the bar, the title with its link (as
	* <address|label> in a payload's text is read: "title (link)", the address
	* alone when the title is the address), the text, the fields one to a line
	* as "title: value", the blocks an attachment may carry instead, and the
	* footer. Only the text used to be read, and the fallback (the one-line
	* summary shown in a notification) only when there was no text, so a build
	* notice arrived as its body alone, its title and every field gone, and one
	* made of a title and fields alone posted its notification summary
	* instead. The fallback now stands in only when nothing else says
	* anything. The markup within each piece (links, mentions, dates, escapes)
	* is read as incoming-webhook markup; the blocks read their own (see
	* blockText).
	*/
	function attachmentText(a) {
		if (!a || typeof a !== "object") return "";
		const str = (v) => typeof v === "string" ? fromWebhookMarkup(v.trim()).trim() : "";
		const lines = [];
		if (str(a.pretext)) lines.push(str(a.pretext));
		const title = str(a.title);
		const link = /^https?:\/\/\S+$/i.test(str(a.title_link)) ? str(a.title_link) : "";
		if (title) lines.push(link && link !== title ? `${title} (${link})` : title);
		if (str(a.text)) lines.push(str(a.text));
		for (const f of Array.isArray(a.fields) ? a.fields : []) {
			const name = str(f?.title);
			const value = str(f?.value);
			if (name && value) lines.push(`${name}: ${value}`);
			else if (name || value) lines.push(name || value);
		}
		for (const b of Array.isArray(a.blocks) ? a.blocks : []) {
			const t = blockText(b);
			if (t) lines.push(t);
		}
		if (str(a.footer)) lines.push(str(a.footer));
		if (!lines.length && str(a.fallback)) lines.push(str(a.fallback));
		return lines.join("\n");
	}
	/**
	* The text of one payload block. A section's or a header's is its text, and
	* a section's fields after it, one to a line (the two columns of small
	* facts a deploy notice is often made of: an environment, a version, who
	* asked for it; a section may carry them with no text of its own,
	* and such a section used to post as nothing, a payload of one refused as
	* saying nothing); a context block's is the pieces of its line (small print
	* under a message: "triggered by alice", a time), which used to be dropped
	* from the post without a word, and a payload of context alone refused as
	* saying nothing; a rich text block's is its runs, one line per section,
	* list item, quote or preformatted run, the inline runs of each joined as
	* written (a link without words is its address, an emoji its name).
	* Anything else (a divider, a picture, buttons) says nothing.
	*
	* A section's, a header's and a context block's text is incoming-webhook
	* markup (see fromWebhookMarkup). A rich text block's runs
	* are not: rich text is the structured form, its words carried as they
	* are, so they are read as written. Read for markup with the rest, as they
	* used to be, a snippet in a preformatted run that held "&lt;" or "&amp;"
	* (an HTML template, a shell line) posted with the characters they stand
	* for, code that no longer read as the code it was, and an address written
	* in a run between angle brackets was rewritten as a link with words.
	*/
	function blockText(b) {
		if (!b || typeof b !== "object") return "";
		const said = (t) => t.trim() ? t : "";
		const own = typeof b.text?.text === "string" ? b.text.text : typeof b.text === "string" ? b.text : "";
		const fields = (Array.isArray(b.fields) ? b.fields : []).map((f) => typeof f?.text === "string" ? f.text : "").filter(Boolean);
		if (own || fields.length) return said(fromWebhookMarkup([own, ...fields].filter(Boolean).join("\n")));
		if (!Array.isArray(b.elements)) return "";
		if (b.type === "rich_text") return b.elements.flatMap(richLines).join("\n");
		return said(fromWebhookMarkup(b.elements.map(runText).filter(Boolean).join(" ")));
	}
	/**
	* The lines of one rich text element, in the marks the app draws (see
	* lib/format.js): a section is one line of its inline runs; a quote is its
	* lines each led by "> "; a list is one line per item, led by "- " or by
	* its number, indented by its level; a preformatted run is a fenced block.
	* Posted as bare lines, as they used to be, a quote read as plain words, a
	* list ran its items together with nothing to tell them apart, and code
	* kept its indentation in the stored text alone, since the message body is
	* drawn with its spaces collapsed: "    return 1" showed as "return 1".
	*/
	function richLines(e) {
		if (!e || typeof e !== "object") return [];
		if (!Array.isArray(e.elements)) return [runText(e)].filter(Boolean);
		if (e.type === "rich_text_list") {
			const pad = "\xA0\xA0".repeat(Math.max(0, Math.min(8, Math.floor(Number(e.indent) || 0))));
			const ordered = e.style === "ordered";
			let n = 0;
			return e.elements.flatMap((item) => richLines(item).flatMap((entry) => entry.split("\n").map((line, i) => i === 0 ? `${pad}${ordered ? `${++n}. ` : "- "}${line}` : `${pad}\u00a0\u00a0${line}`)));
		}
		if (e.type === "rich_text_preformatted") {
			const code = e.elements.map(runText).join("").replace(/`(?=``)/g, "`​");
			if (!code.trim()) return [];
			return [`\`\`\`\n${/^[\w+-]{1,20}$/.test(code.split("\n", 1)[0].trim()) ? "\n" : ""}${code}\n\`\`\``];
		}
		const line = joinRuns(e.elements);
		if (!line) return [];
		if (e.type === "rich_text_quote") return line.split("\n").map((l) => `> ${l}`);
		return [line];
	}
	/**
	* One line from a rich text element's inline runs. A run this reads as
	* nothing (a date, a colour swatch) leaves the space on either side of it to
	* be one, and none at the ends of the line; the spacing within a run stays
	* as it was written. A text run's style (bold, italic, strike, code) becomes
	* the mark the app draws it by (see styledRun).
	*/
	function joinRuns(elements) {
		const texts = elements.map(runText);
		let line = "";
		let gap = false;
		for (let i = 0; i < elements.length; i++) {
			let t = texts[i];
			if (!t) {
				gap = true;
				continue;
			}
			const r = elements[i];
			if (r.type === "text" && r.style && typeof r.style === "object") t = styledRun(t, r.style, line, texts.slice(i + 1).find(Boolean) || "");
			line += gap && line.endsWith(" ") && t.startsWith(" ") ? t.slice(1) : t;
			gap = false;
		}
		return line.trim();
	}
	/**
	* A styled text run in the app's marks: **bold**, _italic_, ~strike~,
	* `code`. Only where the mark would draw: a run with a space at either end,
	* or a line break within, is left plain (the app draws "** x**" as typed);
	* so is one that carries the mark's own character. Italics and strikes
	* stand on their own in the app (opened after a space, a bracket or a quote,
	* closed before a space, punctuation or the end), so they take their mark
	* only where the run's neighbours allow it, or inside bold, whose tag is a
	* boundary of its own. Code takes no other mark. Only text runs are styled:
	* a person or a channel named by id (@U1) stays as it is.
	*/
	function styledRun(t, style, before, after) {
		if (/^\s|\s$/.test(t) || t.includes("\n")) return t;
		if (style.code) return t.includes("`") ? t : `\`${t}\``;
		const bold = !!style.bold && !t.includes("*");
		const alone = bold || (!before || /[\s(["']$/.test(before)) && (!after || /^[\s.,!?;:)\]"']/.test(after));
		let out = t;
		if (style.strike && alone && !t.includes("~")) out = `~${out}~`;
		if (style.italic && alone && !t.includes("_")) out = `_${out}_`;
		if (bold) out = `**${out}**`;
		return out;
	}
	/**
	* A text clamped to `max` that leaves no fence open: a fenced block the
	* clamp cut through would draw everything after it as code, or, its closing
	* fence gone, nothing after it at all. The text is cut a little shorter and
	* the block closed; a cut that took an opening fence with it needs nothing.
	* Only a fence the clamp opened: `whole` is the text before the clamp, and
	* a lone fence the writer left open in it stays as written, drawn as the
	* backticks it is, as it is in a member's message. Closed all the same, as
	* it used to be, "use ``` to open a code block" posted by a webhook drew
	* everything after the fence as code. The fence open at the cut is the
	* writer's own only when it is the last the whole text had (the app pairs
	* fences from the first on, so an odd one out is always the last): where
	* the text went on to more fences past the cut, the open one is a block's,
	* cut through, and is closed. Judged by the whole text's count alone, as
	* it briefly was, a block cut through in a text that also carried a lone
	* fence of the writer's past the cut was left open, and drew as its text.
	*/
	function closeFences(text, max, whole = text) {
		const fences = (s) => (s.match(/```/g) || []).length;
		if (fences(text) % 2 === 0 || fences(text) === fences(whole)) return text;
		const cut = text.length > max - 4 ? cleanText(text, max - 4).replace(/`+$/, "").trimEnd() : text;
		return fences(cut) % 2 === 0 ? cut : `${cut}\n\`\`\``;
	}
	/**
	* One inline run of rich text as plain words: its text; a link as its
	* address, with its words before it when it has some (as fromWebhookMarkup
	* reads <address|label> in a payload's text: the words alone, as the run
	* used to post, had nowhere to lead); an emoji as its name; a person, a
	* channel, a user group or a notice to everyone by the id or range the
	* payload wrote, as fromWebhookMarkup reads the same in a payload's text
	* (<@U1>, <#C1>, <!channel>), since the ids come from elsewhere and name
	* nobody here. Left out, the words around them ran together with a gap
	* where the name had been.
	*/
	function runText(e) {
		if (!e || typeof e !== "object") return "";
		if (e.type === "link" && typeof e.url === "string") {
			const label = typeof e.text === "string" ? e.text.trim() : "";
			return label && label !== e.url ? `${label} (${e.url})` : e.url;
		}
		if (typeof e.text === "string") return e.text;
		if (e.type === "emoji" && typeof e.name === "string") return `:${e.name}:`;
		if (e.type === "user" && typeof e.user_id === "string") return `@${e.user_id}`;
		if (e.type === "usergroup" && typeof e.usergroup_id === "string") return `@${e.usergroup_id}`;
		if (e.type === "channel" && typeof e.channel_id === "string") return `#${e.channel_id}`;
		if (e.type === "broadcast" && typeof e.range === "string") return `@${e.range}`;
		return "";
	}
	/**
	* A payload's text writes a link as <address|label> (or <address>),
	* a channel-wide notice as <!channel>, a person as <@id|name>, a channel as
	* <#id|name>, and escapes every & < > in the text. Posted as it came, a
	* build notice read "Build <https://ci.example.com/42|#42> passed &amp;
	* deployed", the label glued onto an address that then led nowhere. Each
	* is made the plain text the app draws as such; only these exact shapes
	* are read, so a stray angle bracket or an ampersand in a payload of our
	* own shape stays as it was. The escapes go last, once the markup they
	* kept out of is read.
	*/
	function fromWebhookMarkup(text) {
		return String(text).replace(/<(https?:\/\/[^|>\s]+)\|([^>]*)>/g, (m, url, label) => label.trim() ? `${label.trim()} (${url})` : url).replace(/<(https?:\/\/[^>\s]+)>/g, "$1").replace(/<mailto:([^|>\s]+)\|([^>]*)>/g, (m, addr, label) => label.trim() ? `${label.trim()} (${addr})` : addr).replace(/<mailto:([^>\s]+)>/g, "$1").replace(/<!(channel|here|everyone)(?:\|[^>]*)?>/g, "@$1").replace(/<!subteam\^[A-Za-z0-9]+(?:\|([^>]*))?>/g, (m, label) => label && label.trim() ? `${label.trim().startsWith("@") ? "" : "@"}${label.trim()}` : "@group").replace(/<!date\^\d+\^[^|>]*\|([^>]*)>/g, "$1").replace(/<([@#])([A-Za-z0-9]+)(?:\|([^>]*))?>/g, (m, sigil, id, label) => `${sigil}${(label || id).trim()}`).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
	}
	/**
	* What a token's write meets on a workspace that takes none: the refusals a
	* member's write meets (see assertWritable), and for a move under way the
	* time the freeze has left, in the header machines read for it (Retry-After,
	* as the token's own rate limit answers): a build server that honours it
	* backs off for that long, where told in words alone it tried again at once
	* and was refused for the length of the move. Capped at a few minutes: the
	* freeze is renewed while the move runs and let go of the moment it is
	* done, so a caller asks again well before the half hour a freeze may hold.
	*/
	var TOKEN_RETRY_MAX_S = 300;
	function assertTokenWritable(ws) {
		assertNotMoved(ws);
		if (ws.importing) fail(409, "importing", "This workspace is still being imported; try again in a moment");
		if (frozen(ws)) {
			const left = Math.ceil(((Number(ws.transferring.at) || 0) + TRANSFER_FREEZE_MS - now()) / 1e3);
			fail(423, "transferring", "This workspace is being moved to another server; try again in a few minutes", { "Retry-After": String(Math.max(1, Math.min(TOKEN_RETRY_MAX_S, left))) });
		}
	}
	/** Post as an integration: no mentions, no broadcasts, never a member's identity. */
	async function postAsBot(wsId, conv, author, bot, text, audience = null, ws = null) {
		const clean = closeFences(cleanText(text, LIMITS.messageText), LIMITS.messageText, cleanText(text, Infinity));
		if (!clean) fail(400, "invalid", "Send some text");
		const msg = {
			u: author,
			t: clean,
			ts: now(),
			bot: {
				name: bot.name,
				color: bot.color
			}
		};
		const seq = await writeMessage(wsId, conv, msg, {
			audience,
			ws
		});
		await indexMessage(wsId, conv, msg).catch(() => {});
		return {
			seq,
			ts: msg.ts,
			text: clean
		};
	}
	function cleanIntegration(body) {
		const name = cleanLine(body.name, LIMITS.webhookName);
		if (!name) fail(400, "invalid", "Give it a name");
		return {
			name,
			color: Number.isInteger(body.color) && body.color >= 1 && body.color <= 8 ? body.color : colorSlot(name)
		};
	}
	/**
	* A deleted channel takes its integrations with it: the webhooks bound to
	* it (their records too, so their tokens die as a revoked one's does) and
	* its place in every bot's channel list. Deleting the workspace drops them
	* all; deleting one channel left them, so the admins' list went on showing
	* a webhook for "#?" that only a revoke by hand would clear, while its
	* token was still looked up, counted against its budget, and answered 404.
	*/
	async function dropChannelIntegrations(ws, ch) {
		const hooks = Object.entries(ws.webhooks || {}).filter(([, h]) => h?.ch === ch).map(([id]) => id);
		for (const id of hooks) await kv().del(KEYS.hook(id)).catch(() => {});
		if (hooks.length) await kv().remove(KEYS.ws(ws.id), ...hooks.map((id) => `webhooks.${id}`)).catch(() => {});
		const upd = {};
		for (const [id, b] of Object.entries(ws.bots || {})) {
			if (!Array.isArray(b?.channels) || !b.channels.includes(ch)) continue;
			const channels = b.channels.filter((c) => c !== ch);
			await kv().update(KEYS.bot(id), { channels }).catch(() => {});
			upd[`bots.${id}.channels`] = channels;
		}
		if (Object.keys(upd).length) await kv().update(KEYS.ws(ws.id), upd).catch(() => {});
	}
	/** Admins: create a webhook bound to one channel. The token is in this response and nowhere else. */
	router.post("/api/ws/:ws/webhooks", route(async ({ params, request, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can create webhooks");
		const body = await readJson(request);
		const channel = own(ws.channels, String(body.channel || ""));
		if (!channel || channel.private && !doc.channels.includes(channel.id)) fail(404, "not_found", "Channel not found");
		if (channel.archived) fail(403, "archived", "This channel is archived");
		if (isPartnerEntry(channel)) fail(400, "shared", "Integrations for a shared channel are set up on the workspace that hosts it");
		if (liveIntegrations(ws) >= LIMITS.webhooksPerWorkspace) fail(400, "limit", "This workspace has the maximum number of integrations");
		const { name, color } = cleanIntegration(body);
		const t = await mintToken("tch");
		const rec = {
			ws: ws.id,
			ch: channel.id,
			name,
			color,
			hash: t.hash,
			createdBy: id.uuid,
			createdAt: now()
		};
		await kv().set(KEYS.hook(t.id), rec);
		await kv().update(KEYS.ws(ws.id), { [`webhooks.${t.id}`]: {
			ch: channel.id,
			name,
			color,
			createdBy: id.uuid,
			createdAt: rec.createdAt,
			lastUsed: null
		} });
		await bumpWorkspace(ws.id);
		return {
			id: t.id,
			token: t.token,
			url: `/webhook/${t.token}`,
			name,
			color,
			channel: channel.id
		};
	}));
	router.get("/api/ws/:ws/webhooks", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user);
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can see integrations");
		const sound = (v, has) => !!(v && typeof v === "object" && v[has]);
		const stale = [...Object.entries(ws.webhooks || {}).filter(([, h]) => !sound(h, "ch")).map(([hid]) => `webhooks.${hid}`), ...Object.entries(ws.bots || {}).filter(([, b]) => !sound(b, "name")).map(([bid]) => `bots.${bid}`)];
		if (stale.length && !ws.movedTo && !ws.importing && !frozen(ws)) await kv().remove(KEYS.ws(ws.id), ...stale).catch(() => {});
		const list = (map, has) => Object.entries(map || {}).filter(([, v]) => sound(v, has)).map(([hid, h]) => ({
			id: hid,
			...h
		}));
		return {
			webhooks: list(ws.webhooks, "ch").map((h) => hiddenFrom(ws, doc, h.ch) ? {
				...h,
				ch: null,
				private: true
			} : h),
			bots: list(ws.bots, "name").map((b) => {
				const all = Array.isArray(b.channels) ? b.channels : [];
				const shown = all.filter((c) => !hiddenFrom(ws, doc, c));
				return shown.length === all.length ? b : {
					...b,
					channels: shown,
					hidden: all.length - shown.length
				};
			})
		};
	}));
	/** Rotate the secret (the old token dies) or revoke. */
	router.post("/api/ws/:ws/webhooks/:id/rotate", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can rotate webhooks");
		const hook = own(ws.webhooks, params.id);
		if (!hook) fail(404, "not_found", "Webhook not found");
		if (hiddenFrom(ws, doc, hook.ch)) fail(403, "forbidden", "This webhook posts to a private channel you are not in; an admin in it can rotate its token");
		const secret = uid(32);
		await kv().update(KEYS.hook(params.id), { hash: await sha256(secret) });
		await kv().del(hookRateKey(params.id)).catch(() => {});
		return {
			id: params.id,
			token: `tch_${params.id}_${secret}`
		};
	}));
	router.delete("/api/ws/:ws/webhooks/:id", route(async ({ params, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can revoke webhooks");
		if (!own(ws.webhooks, params.id)) fail(404, "not_found", "Webhook not found");
		await kv().del(KEYS.hook(params.id));
		await kv().remove(KEYS.ws(ws.id), `webhooks.${params.id}`);
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	/** The webhook itself: no session, the token is the credential, one channel, write only. */
	router.post("/webhook/:token", route(async ({ params, request }) => {
		const { id, rec } = await authToken(params.token, "tch");
		const body = await readSmallJson(request);
		const ws = await kv().get(KEYS.ws(rec.ws));
		const channel = ws?.channels?.[rec.ch];
		if (!ws || !channel) fail(404, "not_found", "The channel this webhook posts to is gone");
		assertTokenWritable(ws);
		if (channel.archived) fail(403, "archived", "This channel is archived");
		const out = await postAsBot(rec.ws, rec.ch, botAuthor("hook", id), rec, integrationText(body), audienceOf({ channel }), ws);
		await noteTokenUse(ws, "webhooks", id);
		return {
			ok: true,
			...out
		};
	}));
	/**
	* "Last used" on an integration, for the admins' list. It lives on the
	* workspace document (members, channels, all of it), and a token may post
	* sixty times a minute: written on every call, the busiest route with no
	* session behind it rewrote that whole document each time. Once a minute is
	* as fine as the list shows.
	*/
	var TOKEN_USE_EVERY_MS = 6e4;
	async function noteTokenUse(ws, field, id) {
		const last = Number(ws?.[field]?.[id]?.lastUsed) || 0;
		if (now() - last < TOKEN_USE_EVERY_MS) return;
		await kv().update(KEYS.ws(ws.id), { [`${field}.${id}.lastUsed`]: now() }).catch(() => {});
	}
	router.get("/webhook/:token", route(async () => fail(405, "method_not_allowed", "Webhooks accept POST only; they cannot read anything")));
	/**
	* The channels a bot may be given: this workspace's own (a shared channel's
	* entry is not one; its integrations are set up on the host), each once,
	* whatever the request repeated. A list stored as it came carried a channel
	* twice or three times over, and the admins' dialog drew it that many times.
	* A private channel the admin is not in is no channel to them (as the
	* edit, the invite and the delete routes have it, and as the bootstrap
	* hides it): a bot with it on its list would read the channel for them, or
	* post into it, by its id alone, so it is dropped from the list as a
	* channel that is not there.
	*/
	var botChannels = (ws, doc, list) => [...new Set((Array.isArray(list) ? list : []).map(String))].filter((c) => own(ws.channels, c) && !isPartnerEntry(ws.channels[c]) && !hiddenFrom(ws, doc, c));
	/** Is this channel a private one the caller is not in: no channel to them, whatever their role (see botChannels)? */
	var hiddenFrom = (ws, doc, c) => !!own(ws.channels, c)?.private && !doc.channels.includes(c);
	router.post("/api/ws/:ws/bots", route(async ({ params, request, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can create bot tokens");
		const body = await readJson(request);
		if (liveIntegrations(ws) >= LIMITS.webhooksPerWorkspace) fail(400, "limit", "This workspace has the maximum number of integrations");
		const { name, color } = cleanIntegration(body);
		const scopes = (Array.isArray(body.scopes) ? body.scopes : ["post"]).filter((x) => BOT_SCOPES.includes(x));
		if (!scopes.length) fail(400, "invalid", "Pick at least one scope");
		const channels = botChannels(ws, doc, body.channels);
		const t = await mintToken("tcb");
		const rec = {
			ws: ws.id,
			name,
			color,
			hash: t.hash,
			scopes,
			channels,
			createdBy: id.uuid,
			createdAt: now()
		};
		await kv().set(KEYS.bot(t.id), rec);
		await kv().update(KEYS.ws(ws.id), { [`bots.${t.id}`]: {
			name,
			color,
			scopes,
			channels,
			createdBy: id.uuid,
			createdAt: rec.createdAt,
			lastUsed: null
		} });
		await bumpWorkspace(ws.id);
		return {
			id: t.id,
			token: t.token,
			name,
			color,
			scopes,
			channels
		};
	}));
	/** Change a bot's channels or scopes. */
	router.put("/api/ws/:ws/bots/:id", route(async ({ params, request, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can change bots");
		if (!own(ws.bots, params.id)) fail(404, "not_found", "Bot not found");
		const body = await readJson(request);
		const patch = {};
		if (Array.isArray(body.channels)) {
			const kept = (ws.bots[params.id].channels || []).filter((c) => hiddenFrom(ws, doc, c));
			patch.channels = [...botChannels(ws, doc, body.channels), ...kept];
		}
		if (Array.isArray(body.scopes)) {
			patch.scopes = body.scopes.filter((x) => BOT_SCOPES.includes(x));
			if (!patch.scopes.length) fail(400, "invalid", "Pick at least one scope");
		}
		if (!Object.keys(patch).length) fail(400, "invalid", "Nothing to change");
		await kv().update(KEYS.bot(params.id), patch);
		await kv().update(KEYS.ws(ws.id), Object.fromEntries(Object.entries(patch).map(([k, v]) => [`bots.${params.id}.${k}`, v])));
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	router.post("/api/ws/:ws/bots/:id/rotate", route(async ({ params, user }) => {
		const { id, ws, member, doc } = await requireMembership(params.ws, user, { write: true });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can rotate bot tokens");
		if (!own(ws.bots, params.id)) fail(404, "not_found", "Bot not found");
		if ((ws.bots[params.id].channels || []).some((c) => hiddenFrom(ws, doc, c))) fail(403, "forbidden", "This bot is in a private channel you are not in; an admin in it can rotate its token");
		const secret = uid(32);
		await kv().update(KEYS.bot(params.id), { hash: await sha256(secret) });
		await kv().del(hookRateKey(params.id)).catch(() => {});
		return {
			id: params.id,
			token: `tcb_${params.id}_${secret}`
		};
	}));
	router.delete("/api/ws/:ws/bots/:id", route(async ({ params, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can revoke bot tokens");
		if (!own(ws.bots, params.id)) fail(404, "not_found", "Bot not found");
		await kv().del(KEYS.bot(params.id));
		await kv().remove(KEYS.ws(ws.id), `bots.${params.id}`);
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	/**
	* A bot's view of a channel: only channels it was added to, only with the
	* scope. Reading a moved workspace still works, like any member's read;
	* posting and reacting answer 423 like every other write.
	*/
	async function botChannel(params, scope) {
		const { id, rec } = await authToken(params.token, "tcb");
		if (!rec.scopes.includes(scope)) fail(403, "forbidden", `This token has no ${scope} scope`);
		if (!rec.channels.includes(params.ch)) fail(404, "not_found", "This bot is not in that channel");
		const ws = await kv().get(KEYS.ws(rec.ws));
		const channel = ws?.channels?.[params.ch];
		if (!ws || !channel) fail(404, "not_found", "Channel not found");
		if (scope !== "read") assertTokenWritable(ws);
		return {
			id,
			rec,
			ws,
			channel
		};
	}
	router.post("/bot/:token/channels/:ch/messages", route(async ({ params, request }) => {
		const { id, rec, ws, channel } = await botChannel(params, "post");
		if (channel.archived) fail(403, "archived", "This channel is archived");
		const body = await readSmallJson(request);
		const out = await postAsBot(rec.ws, params.ch, botAuthor("bot", id), rec, integrationText(body), audienceOf({ channel }), ws);
		await noteTokenUse(ws, "bots", id);
		return {
			ok: true,
			...out
		};
	}));
	router.get("/bot/:token/channels/:ch/messages", route(async ({ params, request }) => {
		await botChannel(params, "read");
		return fetchMessages(params.ch, query(request));
	}));
	router.post("/bot/:token/channels/:ch/messages/:seq/reactions", route(async ({ params, request }) => {
		const { id, rec, ws, channel } = await botChannel(params, "react");
		if (channel.archived) fail(403, "archived", "This channel is archived");
		const body = await readSmallJson(request);
		if (!isReactionKey(body.reaction)) fail(400, "invalid", "Unknown reaction");
		const seq = Number(params.seq);
		const found = await locateMessage(params.ch, seq);
		if (!found || found.overlay.d) fail(404, "not_found", "Message not found");
		if (found.raw.k === "sys") fail(400, "invalid", "System lines take no reactions");
		const path = `x.${overlayKey(seq)}.r.${body.reaction}.${botAuthor("bot", id)}`;
		const current = found.overlay.r || {};
		const has = !!current[body.reaction]?.[botAuthor("bot", id)];
		const on = typeof body.on === "boolean" ? body.on : !has;
		const under = (users) => users ? Object.keys(users).length : 0;
		const distinct = Object.values(current).filter(under).length;
		if (on && !has && !under(current[body.reaction]) && distinct >= 24) fail(400, "limit", `A message can carry up to 24 different reactions`);
		if (on && !has && Object.values(current).reduce((sum, users) => sum + Object.keys(users || {}).length, 0) >= 1e3) fail(400, "limit", "This message has as many reactions as it can carry");
		if (on && !has) assertBlockRoom(found.block, 120, "This message cannot take more reactions");
		if (on && !has && Object.keys(current).length >= 24) {
			const dead = Object.keys(current).filter((k) => k !== body.reaction && !under(current[k]));
			if (dead.length) await kv().remove(found.key, ...dead.map((k) => `x.${overlayKey(seq)}.r.${k}`)).catch(() => {});
		}
		if (on && !has) await kv().update(found.key, { [path]: 1 });
		else if (!on && has) await kv().remove(found.key, path);
		else return {
			ok: true,
			on
		};
		await touchConv(rec.ws, params.ch, now(), {
			audience: audienceOf({ channel }),
			ws,
			seq,
			patch: {
				r: body.reaction,
				ru: botAuthor("bot", id),
				on: on ? 1 : 0
			}
		});
		return {
			ok: true,
			on
		};
	}));
	var EXPORT_BLOCKS = 12;
	/** Conversations with nothing in them one export page passes over before handing back its cursor (see counterReader). */
	var EXPORT_SKIP_CONVS = 120;
	/** Conversations one export walks, and how long its list is kept for the cursor to name. */
	var EXPORT_MAX_CONVS = 5e3;
	var EXPORT_LIST_TTL_S = 86400;
	var IMPORT_CHUNK = 500;
	var IMPORT_MAX_SEQ = 1e7;
	/** The counter an import claims a workspace id with, for the moment before its document is written (see /api/workspaces/import); deleted with the workspace. */
	var importClaimKey = (wsId) => `tc:ws:${wsId}:import-claim`;
	/**
	* Export a workspace, a page at a time. The first call (no cursor) returns
	* the header: workspace document minus secrets, members, channels, pins,
	* the list of conversations to walk; every call returns up to EXPORT_BLOCKS
	* blocks of merged messages and the attachments they reference, plus the
	* cursor to continue with. Admins only. Threads are discovered as their
	* parents are walked, like the search backfill.
	*/
	router.get("/api/ws/:ws/export", route(async ({ params, request, user }) => {
		const id = await identify(user);
		const q = query(request);
		const { ws, member, doc } = await requireMembership(params.ws, id.uuid, { doc: !q.get("cursor") });
		if (!isAdmin(member)) fail(403, "forbidden", "Only admins can export a workspace");
		let cursor = null;
		let listKey = null;
		let listChanged = false;
		if (q.get("cursor")) {
			try {
				cursor = JSON.parse(q.get("cursor"));
			} catch {
				fail(400, "invalid", "Bad cursor");
			}
			if (!cursor || typeof cursor.k !== "string" || !/^[a-z0-9]{12}$/.test(cursor.k) || !Number.isInteger(cursor.i) || !Number.isInteger(cursor.n) || cursor.i < 0 || cursor.n < 0) fail(400, "invalid", "Bad cursor");
			listKey = KEYS.exportList(ws.id, cursor.k);
			const list = await kv().get(listKey);
			if (!list || !Array.isArray(list.convs)) fail(410, "expired", "This export has expired; start it again");
			cursor.convs = list.convs;
		}
		const out = {};
		const pages = [];
		const files = [];
		if (!cursor) {
			const ids = Object.keys(ws.members).slice(0, 500);
			const byId = await memberDocsReader(ws, {
				uuid: id.uuid,
				doc
			})();
			const docs = ids.map((u) => byId.get(u));
			const convs = new Set(Object.keys(ws.channels));
			const dms = {};
			docs.forEach((d) => {
				for (const [c, v] of Object.entries(d?.dms || {})) {
					convs.add(c);
					dms[c] = v;
				}
			});
			const channels = {};
			for (const [cid, c] of Object.entries(ws.channels)) {
				const { guestInvite, guestInviteExp, connectInvite, connectInviteExp, ...rest } = c;
				channels[cid] = rest;
			}
			const pins = {};
			const pinDocs = await getMany([...convs].map((c) => KEYS.pins(ws.id, c)));
			[...convs].forEach((c, i) => {
				if (pinDocs[i]?.items?.length) pins[c] = pinDocs[i].items;
			});
			const queue = await kv().get(KEYS.sched(ws.id)) || { m: {} };
			const sched = Object.values(queue.m || {}).map(({ claims, claimedAt, tries, retryAt, ...e }) => e);
			const fileId = (f) => /^[a-z0-9]{8,24}$/.test(String(f || "")) ? String(f) : null;
			const inBookmarks = new Set(Object.values(channels).flatMap((c) => (Array.isArray(c.bookmarks) ? c.bookmarks : []).map((b) => fileId(b?.file)).filter(Boolean)));
			const carried = (e) => {
				const m = own(ws.members, String(e?.u || ""));
				return !!m && !isExternal(m) && !String(e.u).startsWith("smp_");
			};
			const inQueue = new Set(sched.filter(carried).flatMap((e) => (Array.isArray(e.attachments) ? e.attachments : []).map((a) => fileId(a?.id)).filter(Boolean)));
			const marked = [.../* @__PURE__ */ new Set([...inBookmarks, ...inQueue])];
			if (marked.length) (await getMany(marked.map((f) => KEYS.file(f)))).forEach((meta, i) => {
				if (!meta || meta.ws !== ws.id) return;
				files.push({
					id: marked[i],
					name: meta.name,
					size: meta.size,
					type: meta.type,
					...inBookmarks.has(marked[i]) ? { bookmark: true } : {},
					...inQueue.has(marked[i]) ? { sched: true } : {}
				});
			});
			out.header = {
				format: "teamchat-export",
				version: 1,
				exportedAt: now(),
				exportedBy: id.uuid,
				workspace: {
					id: ws.id,
					name: ws.name,
					owner: ws.owner,
					createdAt: ws.createdAt,
					sample: !!ws.sample,
					unfurl: ws.unfurl !== false
				},
				channels,
				members: ws.members,
				dms,
				pins,
				sched: sched.length ? sched : void 0,
				former: ws.former || void 0,
				memberDocs: Object.fromEntries(ids.map((u, i) => [u, {
					channels: docs[i]?.channels || [],
					dms: docs[i]?.dms || {},
					reads: docs[i]?.reads || {},
					notify: docs[i]?.notify || {}
				}]))
			};
			cursor = {
				k: uid(12),
				convs: [...convs],
				i: 0,
				n: 0
			};
			listKey = KEYS.exportList(ws.id, cursor.k);
			listChanged = true;
		}
		let budget = EXPORT_BLOCKS;
		const known = new Set(cursor.convs);
		const counterOf = counterReader(cursor.convs);
		let passed = 0;
		while (budget > 0 && cursor.i < cursor.convs.length && passed < EXPORT_SKIP_CONVS) {
			const conv = cursor.convs[cursor.i];
			const seq = await counterOf(cursor.i);
			if (!seq) {
				cursor.i++;
				cursor.n = 0;
				passed++;
				continue;
			}
			const head = blockIndexOf(seq);
			const to = Math.min(head, cursor.n + budget - 1);
			const keys = [];
			for (let n = cursor.n; n <= to; n++) keys.push(KEYS.block(conv, n));
			const blocks = await getMany(keys);
			const messages = [];
			const closed = [];
			blocks.forEach((b, i) => {
				const n = cursor.n + i;
				if (Number(b?.full) > 0) closed.push({
					block: n,
					after: Math.max(firstSeqOfBlock(n) - 1, ...(Array.isArray(b.m) ? b.m : []).map((x) => Number(x?.s) || 0))
				});
				for (const m of mergeBlock(b)) {
					if (m.replyCount > 0) {
						const t = threadConvId(conv, m.seq);
						if (!known.has(t) && cursor.convs.length < EXPORT_MAX_CONVS) {
							known.add(t);
							cursor.convs.push(t);
							listChanged = true;
						}
					}
					for (const a of m.attachments || []) files.push({
						id: a.id,
						name: a.name,
						size: a.size,
						type: a.type,
						conv,
						seq: m.seq
					});
					messages.push(m);
				}
			});
			pages.push({
				conv,
				seq,
				from: cursor.n,
				to,
				messages,
				...closed.length ? { closed } : {}
			});
			budget -= keys.length;
			cursor.n = to + 1;
			if (cursor.n > head) {
				cursor.i++;
				cursor.n = 0;
			}
		}
		const done = cursor.i >= cursor.convs.length;
		if (done) {
			if (q.get("cursor")) await kv().del(listKey).catch(() => {});
		} else if (listChanged) {
			await kv().set(listKey, { convs: cursor.convs });
			await kv().expire(listKey, EXPORT_LIST_TTL_S).catch(() => {});
		}
		const total = cursor.convs.length;
		return {
			...out,
			pages,
			files,
			cursor: done ? null : {
				k: cursor.k,
				i: cursor.i,
				n: cursor.n
			},
			done,
			progress: {
				done: Math.min(cursor.i, total),
				total
			}
		};
	}));
	var ID_RE = /^[\w-]{1,64}$/;
	var CONV_RE = /^[a-z0-9_]{1,64}$/;
	/**
	* A name every object inherits (`constructor`, `__proto__`, `toString`) is
	* never an id, and an archive that uses one as a key must not have it taken
	* for one: looked up, it passes for an entry that is not there (a member
	* document was given "constructor" as a channel), and written as a path it
	* makes one (the removal of that member then counted a channel by that name
	* into the workspace document, a nameless one every member was shown). Nor
	* may it be taken for one as a value: an author, a mention, the maker of a
	* pin or a channel, a direct message's member, a file's owner. The clients
	* look those up on the member map, where "constructor" is a function whose
	* name is "Object", and drew a line by an author of that name; the members
	* of a direct message named one nobody could be.
	*/
	var inherited = (k) => Object.hasOwn(Object.prototype, k);
	var isId = (u) => ID_RE.test(u) && !inherited(u);
	function cleanImportedMember(m, uuid) {
		const card = profilePatch(m);
		return {
			username: cleanText(m.username, 40).toLowerCase() || uuid.slice(0, 12),
			name: card.name || cleanText(m.username, LIMITS.displayName) || "Member",
			title: card.title || "",
			color: card.color || colorSlot(uuid),
			avatar: Number.isFinite(m.avatar) && m.avatar > 0 ? m.avatar : null,
			status: card.status || null,
			joinedAt: Number(m.joinedAt) || null
		};
	}
	/**
	* A channel as the archive carries it, admitted field by field. `known` is
	* the copy's member map: a private channel's list is cut to the people who
	* are in the copy, since someone from a connected workspace is on the
	* original's list and not in the copy (their connection does not travel),
	* and the copy has no route that would ever take them off it.
	*/
	function cleanImportedChannel(c, cid, known = null) {
		const out = {
			id: cid,
			name: cleanChannelName(c.name) || `channel-${cid.slice(0, 6)}`,
			topic: cleanLine(c.topic, LIMITS.channelTopic),
			private: !!c.private,
			def: !!c.def,
			createdBy: isId(String(c.createdBy || "")) ? c.createdBy : null,
			createdAt: Number(c.createdAt) || null,
			count: Math.max(0, Math.floor(Number(c.count) || 0))
		};
		if (c.description) out.description = cleanLine(c.description, LIMITS.channelDescription);
		if (c.archived) out.archived = true;
		if (Number(c.guests) > 0) out.guests = Math.floor(Number(c.guests));
		if (out.private) out.members = (Array.isArray(c.members) ? c.members : []).filter((u) => ID_RE.test(String(u)) && (!known || own(known, u))).slice(0, 500);
		if (POST_POLICIES.includes(c.postPolicy)) out.postPolicy = c.postPolicy;
		if (THREAD_POLICIES.includes(c.threadPolicy)) out.threadPolicy = c.threadPolicy;
		if (BROADCAST_POLICIES.includes(c.broadcast)) out.broadcast = c.broadcast;
		if (Array.isArray(c.bookmarks)) out.bookmarks = c.bookmarks.slice(0, LIMITS.bookmarksPerChannel).map((b) => {
			const label = cleanLine(b?.label, LIMITS.bookmarkLabel);
			if (!label) return null;
			const item = {
				id: /^[a-z0-9]{6,16}$/.test(String(b.id || "")) ? b.id : uid(8),
				label
			};
			if (typeof b.file === "string" && /^[a-z0-9]{8,24}$/.test(b.file)) {
				item.file = b.file;
				item.name = typeof b.name === "string" && b.name.trim() ? cleanFileName(b.name) : label;
			} else {
				const url = typeof b.url === "string" ? b.url.trim() : "";
				if (url.length > LIMITS.bookmarkUrl || !/^https?:\/\/[^\s]+$/i.test(url) || URL_CONTROLS_RE.test(url)) return null;
				item.url = url;
			}
			return item;
		}).filter(Boolean);
		return out;
	}
	/** { uuid: 0|1 } maps: reaction members, thread followers. */
	function cleanUserFlags(map, allowed = [1]) {
		const out = {};
		if (!map || typeof map !== "object") return out;
		for (const [u, v] of Object.entries(map)) if (isId(u) && allowed.includes(v)) out[u] = v;
		return out;
	}
	function cleanImportedReactions(r) {
		const out = {};
		if (!r || typeof r !== "object") return out;
		for (const [k, users] of Object.entries(r)) {
			if (!isReactionKey(k)) continue;
			const m = cleanUserFlags(users);
			if (Object.keys(m).length) out[k] = m;
		}
		return out;
	}
	/**
	* A message's time as an archive carries it: a moment that has passed (a
	* day's leeway for the clocks of two servers), else the moment it is written
	* here. Every message of a live workspace is stamped by its server as it is
	* posted, so an export never carries a time ahead of the import; one that
	* does (a messages.json edited by hand, a field damaged in transit) is not a
	* time at all. Taken as it came, as it used to be, a message dated a trillion
	* seconds hence was drawn under a day divider in the year 5138, and its
	* search entry went into a month that is no month ("NaNNaN", from a Date
	* past what a Date can be): a shard no query reads, since the index lists
	* its months by their shape, and no rebuild takes down, so the message could
	* not be found by any word in it and the key stayed for good.
	*/
	var IMPORT_TIME_MARGIN_MS = 864e5;
	function importedTime(raw) {
		const ts = Math.floor(Number(raw));
		return Number.isFinite(ts) && ts > 0 && ts <= now() + IMPORT_TIME_MARGIN_MS ? ts : now();
	}
	/** A stored preview: the link must be one the app would have unfurled, the image a hash it serves. */
	function cleanImportedUnfurl(u) {
		if (!u || typeof u !== "object") return null;
		const url = typeof u.url === "string" && /^https?:\/\/[^\s<>"']+$/i.test(u.url) ? u.url.slice(0, 2e3) : null;
		if (!url || isAppLink(url)) return null;
		const image = typeof u.image === "string" && /^[0-9a-f]{64}$/.test(u.image) ? u.image : null;
		return {
			url,
			title: cleanText(u.title, 200),
			desc: cleanText(u.desc, 400),
			site: cleanText(u.site, 80),
			image,
			kind: u.kind === "image" ? "image" : "page",
			ts: Number(u.ts) || now()
		};
	}
	/**
	* Conversation keys (`tc:conv:{id}:...`) carry no workspace, so an import
	* may only ever write conversations that are its own: a channel id the
	* archive names that is already in use on this worker (another workspace's
	* channel, or the original of a copy made on the same server) would
	* otherwise have the copy's history merged into it, and deleting either
	* workspace would take the other's messages with it. Such a channel gets a
	* fresh id, and a direct message's id is derived from the new workspace as
	* `POST /dms` would derive it, so nobody can plant a conversation under an
	* id another workspace's members will later open. The translation is kept
	* on the workspace for the pages that follow and dropped at finish.
	*/
	async function convInUse(conv) {
		return !!await kv().get(KEYS.block(conv, 0)) || await kv().get(KEYS.seq(conv)) != null;
	}
	/** The id a conversation of an import is stored under here: mapped, thread ids following their parent. */
	function importedConv(map, conv) {
		if (!map) return conv;
		const t = parentOfThread(conv);
		if (t) {
			if (threadConvId(t.conv, t.seq) !== conv) return conv;
			const parent = own(map, t.conv);
			return parent ? threadConvId(parent, t.seq) : conv;
		}
		return own(map, conv) || conv;
	}
	/**
	* Import, step one: create the workspace on this worker from an archive
	* header, with its ids intact where possible (the workspace id itself is
	* kept when free, so old permalinks keep their shape), members carried
	* across with their roles, channels, pins, and notification settings. The
	* caller becomes the owner; the previous owner keeps admin. The workspace
	* is marked `importing` until step three, and refuses writes until then.
	*/
	router.post("/api/workspaces/import", route(async ({ request, user }) => {
		const id = await identify(user);
		await assertMayCreate(id.uuid);
		const body = await readJson(request);
		const profile = await ensureProfile(id, body.profile);
		const h = body.header;
		if (!h || h.format !== "teamchat-export" || !h.workspace || !h.channels || !h.members) fail(400, "invalid", "That is not a Teamchat export");
		if (await workspacesOf(profile) >= 20) fail(400, "limit", "You are in the maximum number of workspaces");
		let wsId = /^[a-z0-9]{6,20}$/.test(String(h.workspace.id)) ? h.workspace.id : uid(10);
		const ts = now();
		const members = {};
		for (const [u, m] of Object.entries(h.members).slice(0, 500)) {
			if (!isId(u) || !m || typeof m !== "object") continue;
			if (m.role === "external") continue;
			members[u] = {
				...cleanImportedMember(m, u),
				role: m.role === "owner" ? "admin" : [
					"admin",
					"member",
					"guest"
				].includes(m.role) ? m.role : "member"
			};
		}
		members[id.uuid] = {
			...members[id.uuid] || memberRecord(profile, "owner"),
			role: "owner"
		};
		const former = {};
		const formerAll = h.former && typeof h.former === "object" ? Object.entries(h.former) : [];
		for (const [u, m] of Object.entries(h.members).slice(0, 500)) if (m && typeof m === "object" && m.role === "external") formerAll.push([u, {
			username: m.username,
			name: m.name,
			color: m.color,
			at: ts,
			org: m.org
		}]);
		formerAll.sort(([, a], [, b]) => (Number(b?.at) || 0) - (Number(a?.at) || 0));
		for (const [u, c] of formerAll) {
			if (Object.keys(former).length >= FORMER_MAX) break;
			if (!isId(u) || !c || typeof c !== "object" || members[u] || own(former, u)) continue;
			const card = {
				username: cleanText(c.username, 40).toLowerCase() || u.slice(0, 12),
				name: cleanLine(c.name, LIMITS.displayName) || "Former member",
				color: Number.isInteger(c.color) && c.color >= 1 && c.color <= 8 ? c.color : colorSlot(u),
				at: Number(c.at) || ts
			};
			const org = c.org && typeof c.org === "object" ? {
				name: cleanLine(c.org.name, LIMITS.workspaceName),
				ref: REF_RE.test(String(c.org.ref || "")) ? c.org.ref : null
			} : null;
			if (org?.name) card.org = org;
			former[u] = card;
		}
		const channels = {};
		const convMap = {};
		const entries = Object.entries(h.channels).slice(0, 200).filter(([cid, c]) => /^[a-z0-9]{6,20}$/.test(cid) && !inherited(cid) && !!c && typeof c === "object" && !isPartnerEntry(c));
		const heads = await getMany(entries.flatMap(([cid]) => [KEYS.block(cid, 0), KEYS.seq(cid)]));
		const inUse = new Set(entries.filter((e, i) => !!heads[2 * i] || heads[2 * i + 1] != null).map(([cid]) => cid));
		const usedIds = new Set(entries.map(([cid]) => cid));
		const taken = entries.filter(([cid]) => inUse.has(cid)).map(([cid]) => cid);
		for (let tries = 0; tries < 5 && taken.some((cid) => !own(convMap, cid)); tries++) {
			const pending = taken.filter((cid) => !own(convMap, cid));
			const drawn = pending.map(() => uid(10));
			const found = await getMany(drawn.flatMap((nid) => [KEYS.block(nid, 0), KEYS.seq(nid)]));
			pending.forEach((cid, i) => {
				const nid = drawn[i];
				if (found[2 * i] || found[2 * i + 1] != null || usedIds.has(nid)) return;
				usedIds.add(nid);
				convMap[cid] = nid;
			});
		}
		for (const cid of taken.filter((c) => !own(convMap, c))) {
			let nid;
			do
				nid = uid(10);
			while (usedIds.has(nid) || await convInUse(nid));
			usedIds.add(nid);
			convMap[cid] = nid;
		}
		for (const [cid, c] of entries) {
			const nid = own(convMap, cid) || cid;
			channels[nid] = cleanImportedChannel(c, nid, members);
		}
		if (!Object.keys(channels).length) fail(400, "invalid", "The export has no channels");
		const mapped = (conv) => importedConv(convMap, conv);
		const docs = h.memberDocs && typeof h.memberDocs === "object" ? h.memberDocs : {};
		const inChannel = {};
		const guestsIn = {};
		for (const u of Object.keys(members)) {
			const d = docs[u] || {};
			for (const c of new Set((Array.isArray(d.channels) ? d.channels : []).map((x) => mapped(String(x))))) {
				if (!own(channels, c)) continue;
				inChannel[c] = (inChannel[c] || 0) + 1;
				if (members[u].role === "guest") guestsIn[c] = (guestsIn[c] || 0) + 1;
			}
		}
		for (const [cid, c] of Object.entries(channels)) {
			c.count = inChannel[cid] || 0;
			if (guestsIn[cid]) c.guests = guestsIn[cid];
			else delete c.guests;
		}
		const claim = async (id) => {
			const key = importClaimKey(id);
			const n = Number(await kv().incr(key).catch(() => 1));
			await kv().expire(key, 10).catch(() => {});
			return !(n > 1);
		};
		while (await kv().get(KEYS.ws(wsId)) || !await claim(wsId)) wsId = uid(10);
		const { code, exp } = await issueInvite(wsId);
		const ws = {
			id: wsId,
			name: cleanLine(h.workspace.name, LIMITS.workspaceName) || "Imported workspace",
			owner: id.uuid,
			invite: code,
			inviteExp: exp,
			createdAt: Number(h.workspace.createdAt) || ts,
			importedAt: ts,
			importedFrom: REF_RE.test(String(body.from || "")) ? body.from : null,
			unfurl: h.workspace.unfurl !== false,
			search: indexStamp(),
			importing: true,
			channels,
			members,
			...Object.keys(former).length ? { former } : {}
		};
		await kv().set(KEYS.ws(wsId), ws);
		await kv().set(KEYS.activity(wsId), {
			c: {},
			p: {},
			u: {},
			w: ts
		});
		const importDms = {};
		const memberDocs = [];
		for (const u of Object.keys(members)) {
			const d = docs[u] || {};
			const dms = {};
			for (const [c, v] of Object.entries(d.dms && typeof d.dms === "object" ? d.dms : {})) {
				if (!CONV_RE.test(c) || !Array.isArray(v?.members)) continue;
				const people = [...new Set(v.members.map(String).filter(isId))].sort().slice(0, LIMITS.dmMembers);
				if (!people.length) continue;
				const nid = dmConvId(people, wsId);
				if (nid !== c) convMap[c] = nid;
				dms[nid] = {
					members: people,
					createdAt: Number(v.createdAt) || ts
				};
				importDms[nid] = 1;
			}
			const reads = {};
			for (const [c, v] of Object.entries(d.reads && typeof d.reads === "object" ? d.reads : {})) if (CONV_RE.test(c) && !inherited(c) && Number.isFinite(v)) reads[mapped(c)] = Math.max(0, Math.floor(v));
			const notify = {};
			for (const [c, v] of Object.entries(d.notify && typeof d.notify === "object" ? d.notify : {})) {
				if (!CONV_RE.test(c) || inherited(c) || !v || typeof v !== "object") continue;
				const n = {};
				if (NOTIFY_LEVELS.includes(v.level)) n.level = v.level;
				if (typeof v.mute === "boolean") n.mute = v.mute;
				if (typeof v.follow === "boolean") n.follow = v.follow;
				if (Object.keys(n).length) notify[mapped(c)] = n;
			}
			memberDocs.push([KEYS.member(wsId, u), {
				channels: (Array.isArray(d.channels) ? d.channels : []).map((c) => mapped(String(c))).filter((c) => own(channels, c)),
				dms,
				reads,
				mentions: {},
				notify,
				joinedAt: members[u].joinedAt || ts
			}]);
		}
		for (let i = 0; i < memberDocs.length; i += 12) await Promise.all(memberDocs.slice(i, i + 12).map(([key, doc]) => kv().set(key, doc)));
		const during = {};
		if (Object.keys(importDms).length) during.importDms = importDms;
		if (Object.keys(convMap).length) during.importMap = convMap;
		if (Object.keys(during).length) await kv().update(KEYS.ws(wsId), during);
		const people = Object.keys(members).filter((u) => !u.startsWith("smp_") && u !== id.uuid);
		const records = await getMany(people.map((u) => KEYS.user(u)));
		const unfiled = people.filter((u, i) => records[i] && !(records[i].workspaces || []).includes(wsId));
		for (let i = 0; i < unfiled.length; i += 12) await Promise.all(unfiled.slice(i, i + 12).map((u) => kv().add(KEYS.user(u), { workspaces: [wsId] }).catch(() => {})));
		if (!profile.workspaces.includes(wsId)) await kv().add(KEYS.user(id.uuid), { workspaces: [wsId] });
		const pinCounts = {};
		const pinLists = [];
		for (const [conv, items] of Object.entries(h.pins && typeof h.pins === "object" ? h.pins : {})) {
			if (!CONV_RE.test(conv) || inherited(conv) || !Array.isArray(items)) continue;
			const pinned = mapped(conv);
			const base = parentOfThread(pinned)?.conv || pinned;
			if (!own(channels, base) && !own(importDms, base)) continue;
			const clean = items.filter((p) => p && Number.isInteger(p.seq) && p.seq >= 1).slice(0, LIMITS.pinsPerConversation).map((p) => ({
				seq: p.seq,
				by: isId(String(p.by || "")) ? p.by : id.uuid,
				ts: Number(p.ts) || ts
			}));
			if (!clean.length) continue;
			pinLists.push([KEYS.pins(wsId, mapped(conv)), { items: clean }]);
			pinCounts[`c.${mapped(conv)}.pc`] = new Set(clean.map((p) => p.seq)).size;
		}
		for (let i = 0; i < pinLists.length; i += 12) await Promise.all(pinLists.slice(i, i + 12).map(([key, doc]) => kv().set(key, doc)));
		const pinPaths = Object.entries(pinCounts);
		for (let i = 0; i < pinPaths.length; i += 100) await kv().update(KEYS.activity(wsId), Object.fromEntries(pinPaths.slice(i, i + 100)));
		const queue = {};
		for (const e of (Array.isArray(h.sched) ? h.sched : []).slice(0, 5e3)) {
			if (!e || typeof e !== "object" || !/^[a-z0-9]{6,20}$/.test(String(e.id || "")) || !own(members, e.u) || String(e.u).startsWith("smp_")) continue;
			if (e.kind !== "message" && e.kind !== "reminder") continue;
			const conv = mapped(String(e.conv || ""));
			const base = parentOfThread(conv)?.conv || conv;
			if (!CONV_RE.test(conv) || !own(channels, base) && !own(importDms, base)) continue;
			const dueAt = Math.floor(Number(e.dueAt));
			if (!Number.isFinite(dueAt) || dueAt > ts + SCHED_HORIZON_MS) continue;
			const entry = {
				id: e.id,
				kind: e.kind,
				u: e.u,
				conv,
				dueAt,
				createdAt: Number(e.createdAt) || ts
			};
			if (e.kind === "reminder") {
				const seq = Math.floor(Number(e.seq));
				if (!Number.isInteger(seq) || seq < 1) continue;
				entry.seq = seq;
				entry.note = cleanLine(e.note, 120);
			} else {
				entry.text = cleanText(e.text, LIMITS.messageText);
				entry.attachments = (Array.isArray(e.attachments) ? e.attachments : []).filter((a) => a && /^[a-z0-9]{8,24}$/.test(String(a.id))).slice(0, LIMITS.attachmentsPerMessage).map((a) => ({ id: String(a.id) }));
				if (!entry.text && !entry.attachments.length) continue;
				if (e.failed && typeof e.failed === "object") entry.failed = {
					at: Number(e.failed.at) || ts,
					code: typeof e.failed.code === "string" && cleanLine(e.failed.code, 40) || "refused",
					message: typeof e.failed.message === "string" && cleanLine(e.failed.message, 200) || "This message could not be sent"
				};
			}
			queue[e.id] = entry;
		}
		const ordered = Object.values(queue).sort((a, b) => a.dueAt - b.dueAt || a.createdAt - b.createdAt);
		const kept = {};
		const dropped = [];
		let size = 8;
		for (const e of ordered) {
			const add = JSON.stringify(e.id).length + 1 + JSON.stringify(e).length + (Object.keys(kept).length ? 1 : 0);
			if (dropped.length || size + add > SCHED_DOC_BYTES) dropped.push(e);
			else {
				kept[e.id] = e;
				size += add;
			}
		}
		if (Object.keys(kept).length) {
			await kv().set(KEYS.sched(wsId), { m: kept });
			const times = Object.values(kept).filter((e) => !e.failed).map((e) => e.dueAt);
			if (times.length) await kv().update(KEYS.activity(wsId), { nd: Math.min(...times) });
		}
		if (dropped.length) {
			const held = new Set(Object.values(kept).flatMap((e) => (e.attachments || []).map((a) => a.id)));
			const files = [...new Set(dropped.flatMap((e) => (e.attachments || []).map((a) => a.id)))].filter((f) => !held.has(f)).slice(0, 1e3);
			await kv().update(KEYS.ws(wsId), { importDropped: {
				n: dropped.length,
				files
			} });
		}
		await signal(wsId, null);
		return {
			workspace: {
				id: wsId,
				name: ws.name
			},
			...ordered.length ? { scheduled: {
				kept: Object.keys(kept).length,
				dropped: dropped.length
			} } : {}
		};
	}));
	/**
	* The steps after the first are the owner's alone, as the first is
	* (assertMayCreate): the archive's admins are admins of the copy the moment
	* it is created, and while it is being filled they could otherwise write
	* messages under anyone's name into any of its conversations, replace the
	* bytes of any of its files, or open it before the history is in.
	*/
	function assertImporter(ws, uuid) {
		if (ws.owner !== uuid) fail(403, "forbidden", "Only the owner can import");
		if (!ws.importing) fail(409, "not_importing", "This workspace is not being imported into");
	}
	/**
	* Is this file record one a deleted copy of the workspace left behind? A
	* workspace restored from its export on the server it was deleted from gets
	* its id back (the id was free) and so do its channels and its files; the
	* deletion took the bytes and left the records (see DELETE /api/ws/:ws),
	* each still counting the messages of the copy that is gone and the
	* conversations it was shared in. Counted on top of that, a restored file
	* outlived the deletion of its last message for good, and a guest kept it
	* through a sharing that was no longer there. A record of this workspace's
	* that this import did not write is that copy's: the bytes an import
	* writes name the import they came with (`imp`, the moment the workspace
	* was made, which no two makings of one id share), and a page's count
	* writes a record with no workspace at all. Told apart by that name rather
	* than by the clock: the moment a record was written and the moment the
	* workspace was made are stamped by whichever machine took each request,
	* and a record of this import's written on a clock a little behind the one
	* that made the workspace read as older than the workspace, so a file sent
	* twice, or sent before its pages, lost the count of the messages already
	* holding it.
	*/
	var staleFileRecord = (meta, ws) => !!(meta && meta.ws === ws.id && ws.importing && meta.imp !== ws.importedAt);
	/**
	* Let go of the files of the waiting messages the copy could not take (see
	* the queue in /api/workspaces/import): the app sends them with the rest,
	* and each would otherwise sit in the new owner's drive held by nothing.
	* Only what nothing here holds goes: not a file a message carries (its
	* count), one a bookmark points at, or one an entry the copy did keep will
	* send. Best effort; a file whose bytes never arrived has no record to take.
	*/
	async function releaseImportDropped(ws) {
		const ids = [...new Set((Array.isArray(ws.importDropped?.files) ? ws.importDropped.files : []).filter((f) => /^[a-z0-9]{8,24}$/.test(String(f))))];
		if (!ids.length) return;
		const keep = bookmarkedFiles(ws);
		const queue = await kv().get(KEYS.sched(ws.id)).catch(() => null) || { m: {} };
		for (const e of Object.values(queue.m || {})) for (const a of e?.attachments || []) if (a?.id) keep.add(a.id);
		const metas = await getMany(ids.map((f) => KEYS.file(f)));
		for (let i = 0; i < ids.length; i++) {
			const meta = metas[i];
			if (!meta || meta.ws !== ws.id || Number(meta.refs) > 0 || keep.has(ids[i])) continue;
			await fs().delete(`teamchat-files/${ws.id}/${ids[i]}`).catch(() => {});
			await kv().del(KEYS.file(ids[i])).catch(() => {});
		}
	}
	/**
	* Import, step two: a chunk of one conversation's messages (in order). The
	* archive holds merged messages; they are written back as raw records with
	* their overlays (edits, reactions, pins, thread counts) rebuilt, keeping
	* every seq, so permalinks and thread ids survive. Idempotent per seq.
	*/
	router.post("/api/ws/:ws/import", route(async ({ params, request, user }) => {
		const { id, ws } = await requireMembership(params.ws, user, { doc: false });
		assertImporter(ws, id.uuid);
		const body = await readJson(request);
		const conv = importedConv(ws.importMap, String(body.conv || ""));
		if (!/^[a-z0-9_]{1,64}$/.test(conv)) fail(400, "invalid", "Bad conversation id");
		const thread = parentOfThread(conv);
		const root = thread ? thread.conv : conv;
		if (thread && (threadConvId(thread.conv, thread.seq) !== conv || parentOfThread(thread.conv))) fail(400, "invalid", "Bad conversation id");
		if (!own(ws.channels, root) && !own(ws.importDms || {}, root)) fail(404, "not_found", "That conversation is not part of this workspace");
		const messages = (Array.isArray(body.messages) ? body.messages : []).slice(0, IMPORT_CHUNK);
		const declared = body.seq === void 0 ? 0 : Number(body.seq);
		if (!Number.isFinite(declared) || declared < 0 || declared > IMPORT_MAX_SEQ) fail(400, "invalid", "Bad conversation counter");
		const closed = /* @__PURE__ */ new Map();
		for (const c of (Array.isArray(body.closed) ? body.closed : []).slice(0, 200)) {
			const n = Number(c?.block);
			const after = Number(c?.after);
			if (!Number.isInteger(n) || n < 0 || n > blockIndexOf(IMPORT_MAX_SEQ) || !Number.isInteger(after) || after < firstSeqOfBlock(n) - 1 || after > lastSeqOfBlock(n)) continue;
			closed.set(n, after);
		}
		const named = [...new Set(messages.flatMap((m) => (Array.isArray(m?.attachments) ? m.attachments : []).map((a) => String(a?.id || "")).filter((x) => /^[a-z0-9]{8,24}$/.test(x))))];
		const foreign = /* @__PURE__ */ new Set();
		if (named.length) {
			const metas = await getMany(named.map((f) => KEYS.file(f)));
			const stale = [];
			metas.forEach((meta, i) => {
				if (meta && meta.ws && meta.ws !== ws.id) foreign.add(named[i]);
				else if (staleFileRecord(meta, ws)) stale.push(named[i]);
			});
			for (let i = 0; i < stale.length; i += 12) await Promise.all(stale.slice(i, i + 12).map((f) => kv().del(KEYS.file(f)).catch(() => {})));
		}
		const blocks = /* @__PURE__ */ new Map();
		const seen = /* @__PURE__ */ new Set();
		let maxSeq = 0;
		let lastRaw = null;
		for (const m of messages) {
			if (!m || typeof m !== "object") continue;
			const seq = Math.floor(Number(m.seq));
			if (!Number.isInteger(seq) || seq < 1 || seen.has(seq)) continue;
			if (seq > IMPORT_MAX_SEQ) fail(400, "invalid", "Bad message sequence number");
			seen.add(seq);
			maxSeq = Math.max(maxSeq, seq);
			const n = blockIndexOf(seq);
			const b = blocks.get(n) || (blocks.set(n, {
				m: [],
				x: {}
			}), blocks.get(n));
			const author = String(m.user || "");
			const raw = {
				s: seq,
				u: isId(author) ? author : "",
				t: cleanText(m.text, LIMITS.messageText),
				ts: importedTime(m.ts)
			};
			if (m.kind && m.kind !== "msg") raw.k = String(m.kind).slice(0, 8);
			if (Array.isArray(m.attachments) && m.attachments.length) {
				raw.a = m.attachments.filter((a) => a && /^[a-z0-9]{8,24}$/.test(String(a.id)) && !foreign.has(String(a.id))).slice(0, LIMITS.attachmentsPerMessage).map((a) => ({
					id: String(a.id),
					name: cleanFileName(a.name),
					size: Math.max(0, Number(a.size) || 0),
					type: cleanFileType(a.type)
				}));
				if (!raw.a.length) delete raw.a;
			}
			if (Array.isArray(m.mentions) && m.mentions.length) raw.mn = m.mentions.map(String).filter(isId).slice(0, LIMITS.mentionsPerMessage);
			if (BROADCASTS.includes(m.broadcast)) raw.bc = m.broadcast;
			if (m.bot && typeof m.bot === "object") raw.bot = {
				name: cleanLine(m.bot.name, LIMITS.webhookName) || "App",
				color: Number.isInteger(m.bot.color) && m.bot.color >= 1 && m.bot.color <= 8 ? m.bot.color : 8
			};
			if (m.ref && typeof m.ref === "object" && CONV_RE.test(String(m.ref.c || "")) && Number.isInteger(m.ref.s) && m.ref.s >= 1) raw.ref = {
				c: importedConv(ws.importMap, m.ref.c),
				s: m.ref.s
			};
			if (typeof m.cid === "string" && /^[a-z0-9_-]{8,40}$/.test(m.cid)) raw.cid = m.cid;
			b.m.push(raw);
			if (!lastRaw || raw.s > lastRaw.s) lastRaw = raw;
			const o = {};
			if (Number(m.editedAt) > 0) o.e = Number(m.editedAt);
			if (m.deleted) o.d = 1;
			const reactions = cleanImportedReactions(m.reactions);
			if (Object.keys(reactions).length) o.r = reactions;
			if (Number(m.replyCount) > 0) o.rc = Math.floor(Number(m.replyCount));
			if (Number(m.lastReplyAt) > 0) o.rt = Number(m.lastReplyAt);
			const followers = cleanUserFlags(m.followers, [0, 1]);
			if (Object.keys(followers).length) o.f = followers;
			if (m.pinned) o.p = 1;
			const uf = cleanImportedUnfurl(m.unfurl);
			if (uf) o.uf = uf;
			if (Object.keys(o).length) b.x[overlayKey(seq)] = o;
		}
		const written = [];
		const entries = [...blocks.entries()];
		const [seqRaw, ...curs] = await getMany([KEYS.seq(conv), ...entries.map(([n]) => KEYS.block(conv, n))]);
		const sets = entries.map(([n, b], i) => {
			const cur = curs[i] || {
				m: [],
				x: {}
			};
			const have = new Set((cur.m || []).map((x) => x.s));
			const adding = b.m.filter((x) => !have.has(x.s));
			const merged = (cur.m || []).concat(adding).sort((x, y) => x.s - y.s);
			const x = { ...cur.x || {} };
			for (const [k, o] of Object.entries(b.x)) if (!(k in x)) x[k] = o;
			written.push(...adding);
			return [KEYS.block(conv, n), {
				...Number(cur.full) > 0 ? { full: cur.full } : {},
				m: merged,
				x
			}];
		});
		const seqNow = Number(seqRaw) || 0;
		let top = Math.max(seqNow, maxSeq, Math.floor(declared) || 0);
		let run = null;
		let closing = null;
		if (top > 0 && body.last === true) {
			const head = blockIndexOf(top);
			if (Number.isInteger(body.to) ? body.to >= head : blocks.has(head)) {
				const set = sets.find(([key]) => key === KEYS.block(conv, head));
				const cur = set ? set[1] : await kv().get(KEYS.block(conv, head)) || {
					m: [],
					x: {}
				};
				const records = Array.isArray(cur.m) ? cur.m : [];
				const newest = Math.max(head * 50, ...records.map((x) => Number(x?.s) || 0));
				if (newest < top) {
					top = lastSeqOfBlock(head);
					run = [newest + 1, top];
					if (set) set[1].full = 1;
					else closing = [KEYS.block(conv, head), {
						...cur,
						m: records,
						x: cur.x && typeof cur.x === "object" ? cur.x : {},
						full: 1
					}];
				}
			}
		}
		if (closing) sets.push(closing);
		for (let i = 0; i < sets.length; i += 12) await Promise.all(sets.slice(i, i + 12).map(([key, block]) => kv().set(key, block)));
		const refd = written.flatMap((x) => x.a || []);
		if (refd.length) await holdFiles(conv, refd.map((f) => f.id));
		if (top > seqNow) await kv().set(KEYS.seq(conv), top);
		if (top > 0) {
			const head = blockIndexOf(top);
			await Promise.all([blocks.has(head) || closing ? null : ensureBlock(conv, head), ensureBlock(conv, head + 1)]);
		}
		for (const [n, after] of closed) await rollBlock(ws.id, conv, n, after + 1).catch(() => {});
		if (lastRaw || run) await kv().update(KEYS.activity(ws.id), {
			[`c.${conv}.s`]: top,
			...lastRaw ? {
				[`c.${conv}.t`]: lastRaw.ts,
				[`c.${conv}.u`]: lastRaw.u
			} : {},
			...run ? { [`c.${conv}.k`]: run } : {}
		});
		await indexBatch(ws.id, [...blocks.values()].flatMap((b) => mergeBlock(b).map((message) => ({
			conv,
			message
		}))));
		await signal(ws.id, null);
		return {
			ok: true,
			conv,
			count: messages.length
		};
	}));
	/** Import, files: an attachment's bytes under its original id, so messages keep pointing at it. */
	router.post("/api/ws/:ws/import/file", route(async ({ params, request, user }) => {
		const { id, ws } = await requireMembership(params.ws, user, { doc: false });
		assertImporter(ws, id.uuid);
		assertDeclaredSize(request, LIMITS.attachmentBytes, "Files can be up to 10 MB");
		let form;
		try {
			form = await request.formData();
		} catch {
			fail(400, "invalid", "Expected a multipart upload");
		}
		const file = form.get("file");
		const fileId = String(form.get("id") || "");
		if (!file || typeof file.size !== "number" || !/^[a-z0-9]{8,24}$/.test(fileId)) fail(400, "invalid", "Bad file");
		if (file.size > LIMITS.attachmentBytes) fail(413, "too_large", "Files can be up to 10 MB");
		const owner = String(form.get("owner") || id.uuid);
		const found = await kv().get(KEYS.file(fileId));
		if (found && found.ws && found.ws !== params.ws) fail(409, "exists", "A file with that id belongs to another workspace");
		const held = staleFileRecord(found, ws) ? null : found;
		await fs().write(`teamchat-files/${params.ws}/${fileId}`, file, {
			createMissingParents: true,
			overwrite: true
		});
		await kv().set(KEYS.file(fileId), {
			ws: params.ws,
			u: isId(owner) ? owner : id.uuid,
			name: cleanFileName(form.get("name") || file.name),
			size: file.size,
			type: cleanFileType(file.type),
			ts: now(),
			imp: ws.importedAt,
			refs: Number(held?.refs) || 0,
			...held?.cs && typeof held.cs === "object" ? { cs: held.cs } : {}
		});
		return {
			ok: true,
			id: fileId
		};
	}));
	/** Import, step three: open for business. */
	router.post("/api/ws/:ws/import/finish", route(async ({ params, user }) => {
		const { id, ws, doc } = await requireMembership(params.ws, user);
		assertImporter(ws, id.uuid);
		if (!doc.channels.length) await landInDefaults(ws, id.uuid, doc);
		if (ws.importDropped) await releaseImportDropped(ws).catch(() => {});
		await kv().remove(KEYS.ws(ws.id), "importing", "importDms", "importMap", "importDropped");
		await bumpWorkspace(ws.id);
		return { ok: true };
	}));
	/**
	* Transfer, step one: the owner nominates an admin. Nothing moves yet; the
	* nominee's app does the export and import with their own session, on
	* their own worker, then calls complete below.
	*/
	router.post("/api/ws/:ws/transfer", route(async ({ params, request, user }) => {
		const { id, ws } = await requireMembership(params.ws, user, { doc: false });
		if (ws.owner !== id.uuid) fail(403, "forbidden", "Only the owner can transfer a workspace");
		const body = await readJson(request);
		assertWritable(ws, { moving: !!body.cancel });
		if (body.cancel) {
			await kv().remove(KEYS.ws(ws.id), "transferTo", "transferring");
			await bumpWorkspace(ws.id);
			return {
				ok: true,
				transferTo: null
			};
		}
		const to = String(body.to || "");
		const nominee = own(ws.members, to);
		if (!nominee || !isAdmin(nominee) || to === id.uuid) fail(400, "invalid", "Pick another admin of this workspace");
		await kv().update(KEYS.ws(ws.id), { transferTo: to });
		await pokeAndBump(ws.id, to);
		return {
			ok: true,
			transferTo: to
		};
	}));
	/**
	* Transfer, before the export: the nominee freezes this copy (see
	* assertWritable) so that nothing written while they export it and import
	* it elsewhere is lost to the move. Called again to renew while the move
	* still runs; the freeze lets go on its own after TRANSFER_FREEZE_MS.
	*/
	router.post("/api/ws/:ws/transfer/begin", route(async ({ params, request, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, { doc: false });
		assertWritable(ws, { moving: true });
		if (ws.transferTo !== id.uuid || !isAdmin(member)) fail(403, "forbidden", "Only the admin nominated to take this workspace over can begin moving it");
		const body = await readJson(request);
		const sid = typeof body.sid === "string" && /^[a-z0-9_-]{8,40}$/.test(body.sid) ? body.sid : null;
		const standing = frozen(ws) ? ws.transferring : null;
		if (standing?.sid && standing.sid !== sid) fail(423, "transferring", "This workspace is already being moved from another of your sessions; let that finish");
		const transferring = {
			by: id.uuid,
			at: now(),
			...sid ? { sid } : {}
		};
		await kv().update(KEYS.ws(ws.id), { transferring });
		await bumpWorkspace(ws.id);
		return {
			ok: true,
			transferring,
			until: transferring.at + TRANSFER_FREEZE_MS
		};
	}));
	/** The move did not go through (the export or the import failed): the nominee or the owner lets the workspace go on again. The nomination stays. */
	router.post("/api/ws/:ws/transfer/cancel", route(async ({ params, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, { doc: false });
		assertWritable(ws, { moving: true });
		if (ws.owner !== id.uuid && !(ws.transferTo === id.uuid && isAdmin(member))) fail(403, "forbidden", "Only the owner or the nominated admin can cancel a move");
		if (ws.transferring) {
			await kv().remove(KEYS.ws(ws.id), "transferring");
			await bumpWorkspace(ws.id);
		}
		return { ok: true };
	}));
	/**
	* Transfer, step two: the nominee (or the owner) marks the copy here as
	* moved. From now on it is read-only and every client that opens it is
	* sent to the new reference; the old owner can delete it when they like.
	*/
	router.post("/api/ws/:ws/transfer/complete", route(async ({ params, request, user }) => {
		const { id, ws, member } = await requireMembership(params.ws, user, { doc: false });
		if (ws.movedTo) return {
			ok: true,
			movedTo: ws.movedTo,
			already: true
		};
		if (ws.owner !== id.uuid && !(ws.transferTo === id.uuid && isAdmin(member))) fail(403, "forbidden", "Only the owner or the nominated admin can complete a transfer");
		const body = await readJson(request);
		const to = String(body.to || "");
		if (!/^[a-z0-9]{6,20}@[a-z0-9][a-z0-9._:-]{0,120}$/.test(to)) fail(400, "invalid", "Bad workspace reference");
		const serverKey = (host) => String(host || "").toLowerCase().replace(/\.puter\.work$/, "");
		const at = to.indexOf("@");
		if (to.slice(0, at) === ws.id && workerHost && serverKey(to.slice(at + 1)) === serverKey(workerHost)) fail(400, "invalid", "A workspace cannot be moved to itself");
		await kv().update(KEYS.ws(ws.id), {
			movedTo: to,
			movedAt: now()
		});
		await kv().remove(KEYS.ws(ws.id), "transferTo", "transferring").catch(() => {});
		await bumpWorkspace(ws.id);
		return {
			ok: true,
			movedTo: to
		};
	}));
	/**
	* Per-member and per-workspace budgets for triggering fetches, the
	* join-budget pattern. The member's is counted per workspace, as their
	* upload budget is (see assertUploadBudget): counted under their id alone,
	* as it used to be, the thirty previews a member may ask for in ten minutes
	* were shared across every workspace of theirs on this worker, and having
	* spent them in one, their first link in another was refused a card.
	*/
	async function assertUnfurlBudget(wsId, uuid) {
		const keys = [[`tc:unfurlrate:${wsId}:${uuid}`, LIMITS.unfurlsPerMember], [`tc:unfurlrate:ws:${wsId}`, LIMITS.unfurlsPerWorkspace]];
		for (const [key, max] of keys) {
			const n = await kv().incr(key).catch(() => 1);
			if (n === 1) await kv().expire(key, LIMITS.unfurlWindowSeconds).catch(() => {});
			if (n > max) fail(429, "too_many_previews", "Too many link previews right now; try again in a few minutes");
		}
	}
	/**
	* Build the preview for a message's first link (outside code) and store it
	* on the message's overlay, so it is computed once and identical for every
	* reader. Idempotent: a message that already has one (or had it removed) is
	* left alone. Called by the sender's client right after posting, so the
	* post itself stays fast.
	*/
	router.post("/api/ws/:ws/conv/:conv/messages/:seq/unfurl", route(async ({ params, user, defer }) => {
		const seqNum = Number(params.seq);
		const locatable = looksLikeConvId(params.conv) && Number.isInteger(seqNum) && seqNum >= 1;
		const ctx = await requireMembership(params.ws, user, {
			write: true,
			also: locatable ? [KEYS.block(params.conv, blockIndexOf(seqNum))] : []
		});
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		if (!conv.joined) fail(403, "not_joined", "Join the channel to load a preview");
		if (conv.channel?.archived) fail(403, "archived", "This channel is archived");
		if (ctx.ws.unfurl === false) return {
			unfurl: null,
			disabled: true
		};
		const seq = seqNum;
		const found = locatable ? messageIn(params.conv, seq, ctx.extra[0]) : await locateMessage(params.conv, seq);
		if (!found || found.overlay.d || found.raw.k) fail(404, "not_found", "Message not found");
		const link = firstUnfurlableLink(typeof found.overlay.t === "string" ? found.overlay.t : found.raw.t);
		const standing = (uf, forLink) => !!uf && (uf.off || typeof uf.url !== "string" || uf.url === forLink);
		if (standing(found.overlay.uf, link)) return { unfurl: found.overlay.uf.off ? null : found.overlay.uf };
		if (!link) return { unfurl: null };
		await assertUnfurlBudget(params.ws, id.uuid);
		const data = await unfurl(link);
		if (!data) return { unfurl: null };
		const again = await locateMessage(params.conv, seq);
		if (!again || again.overlay.d) return { unfurl: null };
		const nowLink = firstUnfurlableLink(typeof again.overlay.t === "string" ? again.overlay.t : again.raw.t);
		if (standing(again.overlay.uf, nowLink)) return { unfurl: again.overlay.uf.off ? null : again.overlay.uf };
		if (nowLink !== link) return { unfurl: null };
		const uf = {
			url: link,
			title: data.title,
			desc: data.desc,
			site: data.site,
			image: data.image,
			kind: data.kind,
			ts: now()
		};
		if (!blockHasRoom(again.block, jsonBytes(uf) + 40)) return { unfurl: null };
		await kv().update(again.key, { [`x.${overlayKey(seq)}.uf`]: uf });
		await touchConv(params.ws, params.conv, now(), {
			audience: audienceOf(conv),
			defer,
			ws: ctx.ws,
			seq,
			patch: { uf }
		});
		return { unfurl: uf };
	}));
	/** The author or an admin removes a preview; it is not fetched again. */
	router.delete("/api/ws/:ws/conv/:conv/messages/:seq/unfurl", route(async ({ params, user, defer }) => {
		const seq = Number(params.seq);
		const locatable = looksLikeConvId(params.conv) && Number.isInteger(seq) && seq >= 1;
		const ctx = await requireMembership(params.ws, user, {
			write: true,
			also: locatable ? [KEYS.block(params.conv, blockIndexOf(seq))] : []
		});
		const id = ctx.id;
		const conv = resolveConv(ctx, params.conv);
		const found = locatable ? messageIn(params.conv, seq, ctx.extra[0]) : await locateMessage(params.conv, seq);
		if (!found) fail(404, "not_found", "Message not found");
		if (found.raw.u !== id.uuid && !isAdmin(ctx.member)) fail(403, "forbidden", "Only the author or an admin can remove a preview");
		await kv().update(found.key, { [`x.${overlayKey(seq)}.uf`]: { off: 1 } });
		await touchConv(params.ws, params.conv, now(), {
			audience: audienceOf(conv),
			defer,
			ws: ctx.ws,
			seq,
			patch: { uf: null }
		});
		return { ok: true };
	}));
	/**
	* The workspace and the caller's membership in it, without the caller's
	* own document: for the routes that serve bytes (an attachment, a
	* preview's picture), asked for once per picture on screen, which a member
	* may read on their membership alone. Read through requireMembership, as
	* they used to be, every download cost a read of the caller's document
	* that only a guest's or an external's check ever looked at (see
	* mayTakeFile, which reads it for them below).
	*/
	async function requireMember(wsId, who, { also = null } = {}) {
		const known = typeof who === "string" ? { uuid: who } : null;
		const want = also || [];
		const ready = known || (validWsId(wsId) ? await peekIdentity(who) : null);
		let id = ready;
		let readValues;
		if (ready) readValues = await getMany([KEYS.ws(wsId), ...want]);
		else {
			const readable = validWsId(wsId) && who?.puter;
			const [idRes, readRes] = await Promise.allSettled([identify(who), readable ? getMany([KEYS.ws(wsId), ...want]) : [null]]);
			if (idRes.status === "rejected") throw idRes.reason;
			if (readRes.status === "rejected") throw readRes.reason;
			id = idRes.value;
			readValues = readRes.value;
		}
		if (!validWsId(wsId)) fail(404, "not_found", "Workspace not found");
		const [wsRead, ...extra] = readValues;
		const ws = await normalizeWorkspace(wsId, wsRead);
		const member = ws.members[id.uuid];
		if (!member) fail(403, "forbidden", "You are not a member of this workspace");
		assertAttested(member);
		return {
			id,
			uuid: id.uuid,
			ws,
			member,
			extra
		};
	}
	/** A preview's thumbnail, stored by the worker, served to members only. */
	router.get("/api/ws/:ws/unfurl-image/:hash", route(async ({ params, user }) => {
		await requireMember(params.ws, user);
		const img = await readImage(params.hash);
		if (!img) fail(404, "not_found", "No image");
		return new Response(img.blob, {
			status: 200,
			headers: fileHeaders(img.type, "preview", 86400)
		});
	}));
	/**
	* Headers for bytes the worker serves (an attachment, a photo, an icon, a
	* preview's image). The type is the one recorded at upload and is never to
	* be sniffed into another; and only what the app shows inline (a picture,
	* video, sound, a PDF) is offered inline, so a document the browser would
	* run scripts in (SVG, HTML) is a download should its address ever be
	* opened on its own rather than fetched by the app into a blob of the app's
	* own origin. The name travels encoded for any alphabet (RFC 5987), with an
	* ASCII stand-in beside it for clients that read only that.
	*/
	var INLINE_TYPES = /^(image\/(png|jpeg|gif|webp|avif)$|video\/|audio\/|application\/pdf$)/;
	/**
	* A file's name as every reader sees it and saves it under: one line, with
	* the bidi and zero-width format characters out (a right-to-left override in
	* "invoice_[U+202E]fdp.exe" shows it as "invoice_exe.pdf" in the card and in
	* the name a browser offers; a zero-width space hides in a name that then
	* matches nothing typed), control characters and line breaks made one space,
	* clamped, and "file" when nothing is left. Applied wherever a name is
	* admitted: an upload, an import's attachments and the bytes sent for them.
	*/
	var FILE_NAME_MAX = 120;
	function cleanFileName(input) {
		return cleanText(String(input || "").replace(/[\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g, "").replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ").replace(/\s+/g, " "), FILE_NAME_MAX) || "file";
	}
	/**
	* A file's type as recorded: what stands before any parameter, in lower
	* case, in the one shape a media type has; anything else is a file of
	* unknown kind. Admitted in the bare shape alone, as it used to be, a type
	* declared with a parameter ("image/png; charset=binary", as a script or a
	* mail client's attachment may send it) was recorded as a file of unknown
	* kind, and the picture opened only as a download. The app reads the type
	* before the semicolon when it takes a file back (see lib/api.js readBlob).
	*/
	function cleanFileType(raw) {
		const t = String(raw || "").split(";")[0].trim().toLowerCase();
		return /^[\w.+-]+\/[\w.+-]+$/.test(t) ? t : "application/octet-stream";
	}
	/**
	* A name with no half of a character in it. A lone surrogate is no character
	* and no encoder takes it: a file's name is kept whole as it comes in now
	* (see cleanFileName), but a record written before that keeps the half of an
	* emoji its name was cut to, and the headers built for it threw, so the file
	* answered a server error on every download.
	*/
	var wholeName = (name) => String(name || "file").replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "").trim() || "file";
	function fileHeaders(type, name, maxAge) {
		const shown = wholeName(name);
		const ascii = shown.replace(/[^\x20-\x7e]/g, "_").replace(/["\\;]/g, "_");
		const encoded = encodeURIComponent(shown).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
		return {
			"Content-Type": type,
			"Cache-Control": `private, max-age=${maxAge}`,
			"X-Content-Type-Options": "nosniff",
			"Content-Disposition": `${INLINE_TYPES.test(type) ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encoded}`
		};
	}
	/**
	* What one member may upload: so many files per window and so many bytes a
	* day. Every upload lands in the owner's storage, and one never attached to
	* a message is never released, so without a budget any member — a guest, or
	* someone another workspace vouched for — could fill the owner's drive at
	* the owner's cost. The join-budget pattern: a counter with a TTL.
	*/
	async function assertUploadBudget(wsId, uuid, bytes) {
		const countKey = `tc:uprate:${wsId}:${uuid}`;
		const n = await kv().incr(countKey).catch(() => 1);
		if (n === 1) await kv().expire(countKey, LIMITS.uploadWindowSeconds).catch(() => {});
		if (n > LIMITS.uploadsPerMember) fail(429, "too_many_uploads", "Too many files uploaded just now; try again in a few minutes");
		const bytesKey = `tc:upbytes:${wsId}:${uuid}`;
		const total = await kv().incr(bytesKey, bytes).catch(() => bytes);
		if (total === bytes) await kv().expire(bytesKey, 86400).catch(() => {});
		if (total > LIMITS.uploadBytesPerDay) fail(429, "too_many_uploads", "You have uploaded as much as you can today; try again tomorrow");
	}
	router.post("/api/ws/:ws/files", route(async ({ params, request, user }) => {
		const { id } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		assertDeclaredSize(request, LIMITS.attachmentBytes, "Files can be up to 10 MB");
		let form;
		try {
			form = await request.formData();
		} catch {
			fail(400, "invalid", "Expected a multipart upload");
		}
		const file = form.get("file");
		if (!file || typeof file.size !== "number") fail(400, "invalid", "No file provided");
		if (file.size > LIMITS.attachmentBytes) fail(413, "too_large", "Files can be up to 10 MB");
		await assertUploadBudget(params.ws, id.uuid, file.size);
		const fileId = uid(16);
		const name = cleanFileName(file.name);
		const type = cleanFileType(file.type);
		await fs().write(`teamchat-files/${params.ws}/${fileId}`, file, { createMissingParents: true });
		const meta = {
			ws: params.ws,
			u: id.uuid,
			name,
			size: file.size,
			type,
			ts: now(),
			refs: 0
		};
		await kv().set(KEYS.file(fileId), meta);
		return {
			id: fileId,
			name,
			size: file.size,
			type
		};
	}));
	router.get("/api/ws/:ws/files/:id", route(async ({ params, user }) => {
		const named = /^[a-z0-9]{8,24}$/.test(params.id);
		const { id, ws, member, extra } = await requireMember(params.ws, user, { also: named ? [KEYS.file(params.id)] : [] });
		if (!named) fail(404, "not_found", "File not found");
		const [meta] = extra;
		const raw = isLimited(member) ? await kv().get(KEYS.member(params.ws, id.uuid)) : null;
		if (!meta || meta.ws !== params.ws) fail(404, "not_found", "File not found");
		if (isLimited(member)) {
			if (!mayTakeFile({
				ws,
				member,
				doc: {
					...raw || {},
					channels: Array.isArray(raw?.channels) ? raw.channels : [],
					dms: raw?.dms || {}
				},
				uuid: id.uuid
			}, params.id, meta)) fail(404, "not_found", "File not found");
		}
		const blob = await fs().read(`teamchat-files/${params.ws}/${params.id}`);
		return new Response(blob, {
			status: 200,
			headers: {
				...fileHeaders(meta.type || "application/octet-stream", meta.name, 3600),
				"X-File-Name": encodeURIComponent(wholeName(meta.name))
			}
		});
	}));
	/**
	* The uploader takes back a file nothing names yet: one picked into the box
	* and taken out again before sending, or left in a draft since discarded. An
	* upload lands in the owner's drive the moment it is picked, and is held by
	* the messages that carry it and let go of with the last of them (see
	* releaseFile); one never attached to anything was held by nothing and let
	* go of by nothing, so it sat in the owner's drive for good, ten megabytes at
	* a time, with nothing to find it by. Only the uploader's own, and only while
	* nothing holds it: not a message (the record's count), not a message waiting
	* in the queue (see queuedFilesReader), not a channel's bookmark (see
	* bookmarkedFiles); a record from before files were counted says nothing of
	* what holds it, and stays. The count is taken down atomically and read
	* back, as a deletion takes it (see releaseFile): a post attaching the file
	* in the same instant moves it first, and the file is put back and kept.
	*/
	router.delete("/api/ws/:ws/files/:id", route(async ({ params, user }) => {
		const { id, ws } = await requireMembership(params.ws, user, {
			write: true,
			doc: false
		});
		if (!/^[a-z0-9]{8,24}$/.test(params.id)) fail(404, "not_found", "File not found");
		const meta = await kv().get(KEYS.file(params.id));
		if (!meta || meta.ws !== params.ws) fail(404, "not_found", "File not found");
		if (meta.u !== id.uuid) fail(403, "forbidden", "Only the person who uploaded a file can remove it");
		const held = "This file is attached to a message; delete the message instead";
		if (meta.refs === void 0 || Number(meta.refs) > 0) fail(409, "in_use", held);
		if ((await queuedFilesReader(params.ws)()).has(params.id)) fail(409, "in_use", "This file is waiting to go out with a scheduled message; edit that message instead");
		if (bookmarkedFiles(ws).has(params.id)) fail(409, "in_use", "This file is bookmarked in a channel; remove the bookmark instead");
		const res = await kv().incr(KEYS.file(params.id), { refs: -1 });
		const refs = Number(res && typeof res === "object" ? res.refs : res);
		if (!(refs < 0)) {
			await kv().incr(KEYS.file(params.id), { refs: 1 }).catch(() => {});
			if (Number.isNaN(refs)) fail(500, "internal", "The file could not be removed right now; try again in a moment");
			fail(409, "in_use", held);
		}
		await fs().delete(`teamchat-files/${params.ws}/${params.id}`).catch(() => {});
		await kv().del(KEYS.file(params.id)).catch(() => {});
		return { ok: true };
	}));
	router.get("/*path", route(async () => fail(404, "not_found", "No such endpoint")));
	router.post("/*path", route(async () => fail(404, "not_found", "No such endpoint")));
	//#endregion
})();
