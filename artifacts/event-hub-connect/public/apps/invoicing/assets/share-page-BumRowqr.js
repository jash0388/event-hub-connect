const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./pdf-spec-KQzFlow1.js","./index-Ckf7dMda.js","./index-CSSRh8Jj.css"])))=>i.map(i=>d[i]);
import{C as e,l as t,n,t as r,u as i,w as a}from"./index-Ckf7dMda.js";var o=`/* The document paper. Self-contained (no app tokens) because it is also
   embedded verbatim into public share pages and print output. Paper stays
   light in every app theme, like paper. */

.paper {
  background: #ffffff;
  color: #17181c;
  border: 1px solid rgba(23, 24, 28, 0.12);
  border-radius: 12px;
  padding: clamp(20px, 5vw, 44px);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: break-word;
}

.paper .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.paper-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

/* Every column of the two header rows has to be allowed to shrink. A flex
   item will not go below its longest word, and .paper's overflow-wrap can
   only break one inside a box that is already narrow enough — so a client's
   email at a single-word domain, an address line typed without spaces, or a
   reference number run together sized the column to that word and the paper
   bled out of its page. The same three surfaces draw this stylesheet: the
   app's preview, the printed sheet, and the public share page. */
.paper-head > *,
.paper-parties > * {
  min-width: 0;
}

/* Capped so a tall or very wide logo can never dwarf the paper, and always
   printed with its real colors rather than a browser's ink-saving pass. */
.paper-logo {
  display: block;
  max-width: min(220px, 100%);
  max-height: 62px;
  width: auto;
  height: auto;
  margin-bottom: 10px;
  object-fit: contain;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.paper-biz-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.paper-sub {
  color: #5b5e66;
  font-size: 12.5px;
}

.paper-id {
  text-align: right;
}

.paper-kind {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5b5e66;
}

.paper-number {
  font-size: 19px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.paper-stamp {
  display: inline-block;
  margin-top: 8px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1.5px solid currentColor;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.paper-stamp.tone-ok { color: #0d7a3f; }
.paper-stamp.tone-bad { color: #c22f2f; }
.paper-stamp.tone-warn { color: #955f00; }
.paper-stamp.tone-neutral { color: #5b5e66; }

.paper-parties {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 28px;
}

/* The quiet gray these small caps used to take, #82858d, held only 3.69:1 on
   the paper — under the 4.5:1 that 11px text needs, and this is the one thing
   in the app a client reads: the block labels of an invoice and the column
   headings of its table, on screen, on a share page, on paper, and in the
   PDF. #6d7078 is 4.92:1 and still sits a clear step behind .paper-sub. */
.paper-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #6d7078;
  margin-bottom: 2px;
}

.paper-label:not(:first-child) {
  margin-top: 10px;
}

.paper-client-name {
  font-weight: 650;
}

.paper-dates {
  text-align: right;
}

/* The numeric columns never wrap, so on a narrow phone a table can be
   intrinsically wider than the paper; it then scrolls inside its own rail
   rather than bleeding through the card's edge. Full-width papers (print,
   desktop) never overflow, so nothing changes there. */
/* tabindex="0" in the markup, because a scroll container is only scrollable
   by keyboard while it holds focus, and nothing inside this one is focusable:
   at a phone's width — or a desktop zoomed to 400% — the Amount column of an
   invoice and the Balance column of a statement were off the rail's edge with
   no way to reach them but a pointer. Focus is a real state here, so it says
   so rather than borrowing the app's ring on a block of paper. */
.paper-table-scroll {
  margin-top: 26px;
  overflow-x: auto;
}

.paper-table-scroll:focus-visible {
  outline: 2px solid #2b49c4;
  outline-offset: 3px;
  border-radius: 4px;
}

.paper-table {
  width: 100%;
  border-collapse: collapse;
}

.paper-table th {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #6d7078;   /* 4.92:1, like .paper-label above */
  text-align: left;
  padding: 0 8px 8px;
  border-bottom: 1.5px solid #17181c;
}

.paper-table td {
  padding: 9px 8px;
  border-bottom: 1px solid rgba(23, 24, 28, 0.1);
  vertical-align: top;
}

.paper-table td:first-child {
  width: 55%;
}

/* The line's own work description, under the name it belongs to. */
.paper-item-details {
  color: #5b5e66;
  font-size: 11.5px;
  margin-top: 3px;
}

/* A statement lists five narrow columns, none of which is a description. */
.paper-table-statement td:first-child {
  width: auto;
  font-weight: 650;
  white-space: nowrap;
}

.paper-late {
  color: #c22f2f;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.paper-foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.paper-notes {
  flex: 1 1 220px;
  min-width: 0;
}

.paper-paylink {
  color: #2b49c4;
  text-decoration: underline;
  word-break: break-all;
  font-size: 13px;
}

.paper-totals {
  flex: 0 1 260px;
  min-width: 220px;
}

.paper-trow {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 5px 8px;
  color: #3c3f45;
}

.paper-trow.strong {
  color: #17181c;
  font-weight: 700;
  border-top: 1.5px solid #17181c;
  margin-top: 4px;
  padding-top: 9px;
  font-size: 15px;
}

.receipt-amount {
  margin-top: 28px;
  padding: 18px;
  border: 1px solid rgba(23, 24, 28, 0.12);
  border-radius: 10px;
}

.receipt-big {
  font-size: 30px;
  font-weight: 750;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 480px) {
  .paper-id { text-align: left; }
  .paper-dates { text-align: left; }
}

/* The statement's aging summary, under the totals it breaks down. Set in the
   same column so its figures line up with the total above them. */
.paper-aging {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #d9dbe0;
}

/* The payment plan under the totals it splits: same column, same figures,
   the state of each part in quieter ink. */
.paper-schedule {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #d9dbe0;
}

.paper-inst-state {
  color: #6d7078;   /* 4.95:1, like .paper-label */
}
`,s=`/**
 * A small PDF writer for the paper, with no dependencies.
 *
 * Clients and accounts-payable departments ask for "the PDF", and print-to-PDF
 * is clumsy on desktop and often missing on mobile. This renders the same
 * paper into a real PDF file with selectable text, using the base-14
 * Helvetica every viewer already has, so nothing has to be embedded and the
 * whole generator stays a few kilobytes.
 *
 * It takes a \`spec\` (see lib/pdf-spec.js) rather than a document, which keeps
 * this file free of app imports: it can be lazy-loaded on first use, and
 * inlined verbatim into a self-contained public share page.
 *
 * Text is encoded as WinAnsi, the encoding those built-in fonts speak. Text
 * outside it (CJK, for instance) would need a font embedded and megabytes of
 * download, so those characters fall back to '?' and such users keep the
 * browser's own print-to-PDF.
 */

/* ---------- Page geometry, in points ---------- */

/**
 * The two paper sizes the world actually prints on. The spec names one
 * (\`spec.paper\`); everything else about the layout is proportional, so both
 * sizes share the single template. Unknown or missing names mean A4.
 */
const PAGE_SIZES = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};
const pageSize = (name) => PAGE_SIZES[name] || PAGE_SIZES.a4;

const MARGIN = 46;
const FOOT_H = 26;

const INK = '#17181c';
const INK_2 = '#3c3f45';
const MUTED = '#6d7078';   /* 4.92:1 on the page; see .paper-label */
const SUB = '#5b5e66';
const HAIR = '#e2e3e6';

/* ---------- Font metrics: Helvetica and Helvetica-Bold, codes 32..126 ---------- */

const W_REG = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const W_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/** Characters outside ASCII borrow the width of a look-alike. */
const WIDTH_PROXY = {
  0x80: '0', 0x85: 'm', 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x95: 'o',
  0x96: '0', 0x97: 'm', 0x99: 'm', 0xa0: ' ', 0xa3: '0', 0xa5: '0', 0xa9: 'C',
  0xae: 'C', 0xb0: 'o', 0xb7: '.', 0xdf: 'b',
};

/**
 * Unicode punctuation and symbols that WinAnsi does carry, at its own codes —
 * plus lookalike folds for what number formatting emits in many locales: the
 * narrow/thin/figure spaces some locales group digits with become a
 * no-break space, and the true minus sign becomes a hyphen. Without these,
 * every amount on a French or Finnish PDF would carry a '?'.
 */
const WINANSI = {
  0x20ac: 0x80, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2122: 0x99,
  0x02c6: 0x88, 0x2039: 0x8b, 0x203a: 0x9b, 0x201a: 0x82, 0x201e: 0x84,
  0x2020: 0x86, 0x2021: 0x87, 0x2030: 0x89,
  0x2007: 0xa0, 0x2009: 0xa0, 0x202f: 0xa0, 0x2212: 0x2d,
};

/** Fold a JS string into the single-byte encoding the built-in fonts use. */
export function winAnsi(value) {
  let out = '';
  for (const ch of String(value ?? '')) {
    const code = ch.codePointAt(0);
    if (code === 9) { out += ' '; continue; }
    if (code < 32) continue;
    // Zero-width and bidi formatting marks — Intl wraps numbers in them in
    // RTL locales — have no glyph of their own: dropped, not folded to '?'.
    if (code === 0x061c || (code >= 0x200b && code <= 0x200f) || code === 0xfeff) continue;
    if (code <= 0xff) { out += ch; continue; }
    const mapped = WINANSI[code];
    out += mapped ? String.fromCharCode(mapped) : '?';
  }
  return out;
}

function charWidth(code, bold) {
  const table = bold ? W_BOLD : W_REG;
  if (code >= 32 && code <= 126) return table[code - 32];
  const proxy = WIDTH_PROXY[code];
  if (proxy) return table[proxy.charCodeAt(0) - 32];
  if (code >= 0xc0) return table['A'.charCodeAt(0) - 32];  // accented capitals and letters
  return 556;
}

/** Width of already-encoded text at a size, in points. */
export function textWidth(text, size, bold = false, tracking = 0) {
  let units = 0;
  for (let i = 0; i < text.length; i++) units += charWidth(text.charCodeAt(i), bold);
  return (units / 1000) * size + Math.max(0, text.length - 1) * tracking;
}

/** Greedy word wrap to a maximum width; always returns at least one line. */
export function wrapText(text, size, bold, maxWidth) {
  const words = winAnsi(text).split(/\\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? \`\${line} \${word}\` : word;
    if (textWidth(candidate, size, bold) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
    // A single word longer than the column has to be broken somewhere. One
    // forward pass accumulates glyph widths to place each cut — re-measuring
    // ever-shorter slices went superlinear and froze the tab when a
    // multi-kilobyte unbroken paste (a URL, a base64 blob) hit an item name
    // or the notes.
    let units = 0;
    for (let i = 0; i < line.length; i++) units += charWidth(line.charCodeAt(i), bold);
    while ((units / 1000) * size > maxWidth && line.length > 1) {
      let cut = 1;
      let cutUnits = charWidth(line.charCodeAt(0), bold);
      while (cut < line.length - 1) {
        const w = charWidth(line.charCodeAt(cut), bold);
        if (((cutUnits + w) / 1000) * size > maxWidth) break;
        cutUnits += w;
        cut++;
      }
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
      units -= cutUnits;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ---------- Low-level PDF plumbing ---------- */

const num = (v) => {
  const r = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(r) ? String(r) : '0';
};

const escapeText = (text) => text.replace(/([\\\\()])/g, '\\\\$1');

function rgb(hex, stroke = false) {
  const value = /^#?[0-9a-f]{6}$/i.test(String(hex || '')) ? String(hex).replace('#', '') : '17181c';
  const parts = [0, 2, 4].map((i) => (parseInt(value.slice(i, i + 2), 16) / 255).toFixed(3));
  return \`\${parts.join(' ')} \${stroke ? 'RG' : 'rg'}\`;
}

const latin1Bytes = (str) => {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
};

const base64Bytes = (b64) => {
  const raw = atob(b64);
  return latin1Bytes(raw);
};

/**
 * Assemble numbered objects into a PDF file. Offsets are counted in bytes,
 * not characters, because an embedded image is binary.
 */
function assemble(objects) {
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (part) => {
    const bytes = typeof part === 'string' ? latin1Bytes(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };

  push('%PDF-1.4\\n%\\xe2\\xe3\\xcf\\xd3\\n');
  objects.forEach((obj, i) => {
    offsets[i] = length;
    push(\`\${i + 1} 0 obj\\n\`);
    if (typeof obj === 'string') {
      push(\`\${obj}\\n\`);
    } else {
      const body = typeof obj.stream === 'string' ? latin1Bytes(obj.stream) : obj.stream;
      push(\`<< \${obj.dict} /Length \${body.length} >>\\nstream\\n\`);
      push(body);
      push('\\nendstream\\n');
    }
    push('endobj\\n');
  });

  const xref = length;
  let table = \`xref\\n0 \${objects.length + 1}\\n0000000000 65535 f \\n\`;
  for (const offset of offsets) table += \`\${String(offset).padStart(10, '0')} 00000 n \\n\`;
  push(table);
  push(\`trailer\\n<< /Size \${objects.length + 1} /Root 1 0 R >>\\nstartxref\\n\${xref}\\n%%EOF\\n\`);

  const file = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) { file.set(chunk, at); at += chunk.length; }
  return file;
}

/* ---------- Drawing surface ---------- */

function surface(pageH) {
  const pages = [];
  let ops = [];

  const api = {
    ops: () => ops,
    pages,
    page() {
      pages.push(ops);
      ops = [];
    },
    finish() {
      pages.push(ops);
      ops = [];
      return pages;
    },
    /** Text with its top edge at \`top\`; returns the width drawn. */
    text(value, x, top, {
      size = 9, bold = false, color = INK, align = 'left', tracking = 0,
    } = {}) {
      const str = winAnsi(value);
      if (!str) return 0;
      const w = textWidth(str, size, bold, tracking);
      const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
      const baseline = pageH - (top + size * 0.8);
      // Tc is graphics state, not per-op state: it survives BT/ET, so a
      // tracked label would spread its letter-spacing to every later op on
      // the page (which all measured themselves at tracking 0). Emit it
      // unconditionally so each op carries exactly the spacing it was
      // measured with.
      ops.push(\`BT \${rgb(color)} /\${bold ? 'F2' : 'F1'} \${num(size)} Tf\`
        + \` \${num(tracking)} Tc 1 0 0 1 \${num(px)} \${num(baseline)} Tm\`
        + \` (\${escapeText(str)}) Tj ET\`);
      return w;
    },
    line(x1, top1, x2, top2, { width = 0.6, color = HAIR } = {}) {
      ops.push(\`\${rgb(color, true)} \${num(width)} w \${num(x1)} \${num(pageH - top1)} m \`
        + \`\${num(x2)} \${num(pageH - top2)} l S\`);
    },
    roundRect(x, top, w, h, { radius = 4, stroke = null, fill = null, width = 1 } = {}) {
      const r = Math.min(radius, h / 2, w / 2);
      const y = pageH - top - h;
      const k = 0.5523 * r;
      const path = [
        \`\${num(x + r)} \${num(y)} m\`,
        \`\${num(x + w - r)} \${num(y)} l\`,
        \`\${num(x + w - r + k)} \${num(y)} \${num(x + w)} \${num(y + r - k)} \${num(x + w)} \${num(y + r)} c\`,
        \`\${num(x + w)} \${num(y + h - r)} l\`,
        \`\${num(x + w)} \${num(y + h - r + k)} \${num(x + w - r + k)} \${num(y + h)} \${num(x + w - r)} \${num(y + h)} c\`,
        \`\${num(x + r)} \${num(y + h)} l\`,
        \`\${num(x + r - k)} \${num(y + h)} \${num(x)} \${num(y + h - r + k)} \${num(x)} \${num(y + h - r)} c\`,
        \`\${num(x)} \${num(y + r)} l\`,
        \`\${num(x)} \${num(y + r - k)} \${num(x + r - k)} \${num(y)} \${num(x + r)} \${num(y)} c\`,
      ].join(' ');
      const paint = fill && stroke ? 'B' : fill ? 'f' : 'S';
      ops.push(\`\${fill ? \`\${rgb(fill)} \` : ''}\${stroke ? \`\${rgb(stroke, true)} \${num(width)} w \` : ''}\${path} h \${paint}\`);
    },
    image(name, x, top, w, h) {
      ops.push(\`q \${num(w)} 0 0 \${num(h)} \${num(x)} \${num(pageH - top - h)} cm /\${name} Do Q\`);
    },
  };
  return api;
}

/* ---------- Logo: re-encoded to JPEG so it needs no filter of our own ---------- */

async function loadLogo(dataUri) {
  if (!/^data:image\\/(png|jpeg|webp|gif|svg\\+xml);base64,/.test(String(dataUri || ''))) return null;
  try {
    const img = new Image();
    img.src = dataUri;
    await (img.decode ? img.decode() : new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    }));
    const w0 = img.naturalWidth || 300;
    const h0 = img.naturalHeight || 150;
    const scale = Math.min(1, 640 / Math.max(w0, h0));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    const ctx = canvas.getContext('2d');
    // JPEG carries no alpha, and the paper is white anyway.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL('image/jpeg', 0.92);
    if (!jpeg.startsWith('data:image/jpeg;base64,')) return null;
    return {
      bytes: base64Bytes(jpeg.split(',')[1]),
      width: canvas.width,
      height: canvas.height,
      ratio: canvas.width / canvas.height,
    };
  } catch {
    return null;      // a logo that cannot be read is not worth failing over
  }
}

/* ---------- The paper, laid out ---------- */

function drawPaper(spec, logo) {
  const { w: PAGE_W, h: PAGE_H } = pageSize(spec.paper);
  const s = surface(PAGE_H);
  const contentW = PAGE_W - MARGIN * 2;
  const bottom = PAGE_H - MARGIN - FOOT_H;
  const brand = /^#[0-9a-f]{6}$/i.test(String(spec.brand || '')) ? spec.brand : '';
  let y = MARGIN;

  const room = (height) => {
    if (y + height <= bottom) return;
    s.page();
    y = MARGIN;
  };

  /* Header: business on the left, document identity on the right. The
     identity column is bounded (a kind, a number, a subtitle, a stamp) and
     drawn first; the business column carries user data of any length, so it
     alone may break onto further pages — after which the identity column's
     end no longer bounds anything. */
  const rightX = PAGE_W - MARGIN;
  let rightY = y;

  s.text(String(spec.kind || '').toUpperCase(), rightX, rightY, {
    size: 8, bold: true, align: 'right', tracking: 1.1, color: brand || SUB,
  });
  rightY += 13;
  if (spec.number) {
    s.text(spec.number, rightX, rightY, { size: 15, bold: true, align: 'right' });
    rightY += 20;
  }
  if (spec.subtitle) {
    s.text(spec.subtitle, rightX, rightY, { size: 8.5, align: 'right', color: SUB });
    rightY += 13;
  }
  if (spec.stamp) {
    const label = String(spec.stamp.label || '').toUpperCase();
    const w = textWidth(winAnsi(label), 8, true, 1) + 16;
    s.roundRect(rightX - w, rightY, w, 16, { radius: 4, stroke: spec.stamp.color || INK, width: 1.2 });
    s.text(label, rightX - w / 2, rightY + 4.2, {
      size: 8, bold: true, align: 'center', tracking: 1, color: spec.stamp.color || INK,
    });
    rightY += 22;
  }

  let leftY = y;
  let leftBroke = false;
  const leftRoom = (height) => {
    if (leftY + height <= bottom) return;
    s.page();
    leftBroke = true;
    leftY = MARGIN;
  };
  if (logo) {
    const h = Math.min(38, 150 / logo.ratio);
    const w = h * logo.ratio;
    s.image('Im1', MARGIN, leftY, Math.min(w, 170), h);
    leftY += h + 9;
  }
  // The name shares the header with the identity column on the right, so
  // it wraps to its own side; unwrapped, a long or separator-free name ran
  // under the number and off the page (the HTML paper wraps both).
  for (const line of wrapText(spec.biz?.name || 'Your business', 14, true, contentW * 0.58)) {
    leftRoom(19);
    s.text(line, MARGIN, leftY, { size: 14, bold: true });
    leftY += 19;
  }
  for (const line of spec.biz?.lines || []) {
    leftRoom(12);
    s.text(line, MARGIN, leftY, { size: 8.5, color: SUB });
    leftY += 12;
  }

  y = (leftBroke ? leftY : Math.max(leftY, rightY)) + 16;

  /* Parties and dates. The dates column is bounded and drawn first; the
     party block's lines are user data, so they break like the business
     column above. A heading asks for its first line too. */
  const partyW = contentW * 0.55;
  // The values are user data too (a PO reference is typed in): wrapped to
  // the column's own width, or a long one ran leftwards through the party
  // block and, past the margin, off the page at a negative x.
  const datesW = contentW - partyW - 16;
  const dateRows = (spec.dates || []).map(([label, value]) => ({
    label: String(label).toUpperCase(),
    lines: wrapText(String(value ?? ''), 9.5, false, datesW),
  }));
  const datesH = dateRows.reduce((h, row) => h + 11 + 15 + (row.lines.length - 1) * 12, 0);
  room(Math.max(datesH, spec.party ? 37.5 : 0));
  let datesY = y;
  for (const row of dateRows) {
    s.text(row.label, rightX, datesY, {
      size: 7.5, bold: true, color: MUTED, align: 'right', tracking: 0.7,
    });
    datesY += 11;
    for (const [i, line] of row.lines.entries()) {
      if (i) datesY += 12;
      s.text(line, rightX, datesY, { size: 9.5, align: 'right' });
    }
    datesY += 15;
  }
  let partyY = y;
  let partyBroke = false;
  const partyRoom = (height) => {
    if (partyY + height <= bottom) return;
    s.page();
    partyBroke = true;
    partyY = MARGIN;
  };
  if (spec.party) {
    s.text(spec.party.label, MARGIN, partyY, { size: 7.5, bold: true, color: MUTED, tracking: 0.7 });
    partyY += 12;
    for (const line of wrapText(spec.party.name, 10.5, true, partyW)) {
      partyRoom(14);
      s.text(line, MARGIN, partyY, { size: 10.5, bold: true });
      partyY += 14;
    }
    for (const line of spec.party.lines || []) {
      for (const wrapped of wrapText(line, 8.5, false, partyW)) {
        partyRoom(11.5);
        s.text(wrapped, MARGIN, partyY, { size: 8.5, color: SUB });
        partyY += 11.5;
      }
    }
  }
  y = (partyBroke ? partyY : Math.max(partyY, datesY)) + 12;

  /* An amount panel (receipts). The sub-lines (method, note) sit right of
     the big amount, wrapped to the space actually there; a long note grows
     the panel with them and, past a full page, continues them in a fresh
     panel rather than drawing into invisible coordinates. */
  if (spec.amount) {
    const pad = 14;
    const amountW = textWidth(winAnsi(String(spec.amount.value ?? '')), 22, true);
    const subW = Math.max(80, contentW - pad * 2 - amountW - 18);
    const subLines = (spec.amount.sub || [])
      .flatMap((line) => wrapText(line, 8.5, false, subW));
    room(Math.min(Math.max(60, 36 + subLines.length * 12) + 6, bottom - MARGIN));
    let start = 0;
    let first = true;
    do {
      const headH = first ? 26 : 10;
      const count = Math.min(subLines.length - start,
        Math.max(first ? 0 : 1, Math.floor((bottom - y - headH - 10) / 12)));
      const h = Math.max(first ? 60 : 0, headH + count * 12 + 10);
      s.roundRect(MARGIN, y, contentW, h, { radius: 6, stroke: HAIR, width: 0.8 });
      if (first) {
        s.text(String(spec.amount.label).toUpperCase(), MARGIN + pad, y + 12, {
          size: 7.5, bold: true, color: MUTED, tracking: 0.7,
        });
        s.text(spec.amount.value, MARGIN + pad, y + 26, { size: 22, bold: true });
      }
      let subY = y + headH;
      for (let i = 0; i < count; i++) {
        s.text(subLines[start + i], PAGE_W - MARGIN - pad, subY, { size: 8.5, color: SUB, align: 'right' });
        subY += 12;
      }
      start += count;
      y += h + 14;
      first = false;
      if (start < subLines.length) {
        s.page();
        y = MARGIN;
      }
    } while (start < subLines.length);
  }

  /* The line-item table, repeating its header on every page it spills onto. */
  if (spec.table) {
    const { head = [], rows = [], widths = [], align = [] } = spec.table;
    const cols = widths.map((fraction) => fraction * contentW);
    const xs = [];
    let at = MARGIN;
    for (const w of cols) { xs.push(at); at += w; }
    const cellPad = 6;

    const drawHead = () => {
      head.forEach((label, i) => {
        const right = align[i] === 'right';
        s.text(String(label).toUpperCase(), right ? xs[i] + cols[i] - cellPad : xs[i] + cellPad, y, {
          size: 7.5, bold: true, color: MUTED, tracking: 0.7, align: right ? 'right' : 'left',
        });
      });
      y += 13;
      s.line(MARGIN, y, PAGE_W - MARGIN, y, { width: 1.2, color: brand || INK });
      y += 7;
    };

    room(60);
    drawHead();

    if (!rows.length && spec.table.empty) {
      s.text(spec.table.empty, MARGIN + cellPad, y, { size: 9, color: SUB });
      y += 20;
    }

    for (const row of rows) {
      // Measure the row first: a wrapped description must not straddle a
      // page. Right-aligned cells wrap too — a quantity is free text on an
      // imported document, and an unbounded line would be drawn leftward
      // across its neighbor columns. Bold cells measure as bold, or their
      // lines run wide of what was measured.
      // A cell is a string, or { text, sub }: the sub-text (a line item's
      // work description) wraps under the main text, smaller and muted,
      // and counts toward the row's height like every other line.
      const cellLines = row.map((cell, i) => {
        const isObj = !!cell && typeof cell === 'object';
        const main = wrapText(
          isObj ? cell.text : cell, 9, !!spec.table.boldFirst && i === 0, cols[i] - cellPad * 2,
        ).map((t) => ({ t, sub: false }));
        if (!isObj || !cell.sub) return main;
        for (const para of String(cell.sub).split('\\n')) {
          for (const t of wrapText(para, 8, false, cols[i] - cellPad * 2)) main.push({ t, sub: true });
        }
        return main;
      });
      const rowLines = Math.max(...cellLines.map((lines) => lines.length));
      const height = rowLines * 12 + 8;
      if (y + height > bottom) {
        s.page();
        y = MARGIN;
        drawHead();
      }
      // A row taller than even a whole page cannot be kept in one piece:
      // it draws in page-sized slices instead of running past the bottom
      // edge into invisibility. Rows that fit take a single pass.
      let start = 0;
      while (start < rowLines) {
        const count = Math.min(rowLines - start,
          Math.max(1, Math.floor((bottom - y - 8) / 12)));
        cellLines.forEach((lines, i) => {
          const right = align[i] === 'right';
          for (let li = start; li < Math.min(start + count, lines.length); li++) {
            const line = lines[li];
            s.text(line.t, right ? xs[i] + cols[i] - cellPad : xs[i] + cellPad, y + (li - start) * 12, {
              size: line.sub ? 8 : 9,
              color: line.sub ? SUB : (i === 0 ? INK : INK_2),
              bold: !line.sub && !!spec.table.boldFirst && i === 0,
              align: right ? 'right' : 'left',
            });
          }
        });
        start += count;
        y += count * 12;
        if (start < rowLines) {
          s.page();
          y = MARGIN;
          drawHead();
        }
      }
      y += 8;
      s.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4, { width: 0.5, color: HAIR });
    }
    y += 10;
  }

  /* Notes on the left, totals on the right — kept together on one page. */
  const totalsW = 210;
  // Each label wraps short of its own value: a schedule row ("Sep 1, 2026 ·
  // On delivery · $1,000.00 open") or a long tax label used to run straight
  // through the amount beside it and on past the margin.
  const totals = (spec.totals || []).map((row) => {
    const size = row.strong ? 10.5 : 9;
    const valueW = textWidth(winAnsi(String(row.value ?? '')), size, !!row.strong);
    const lines = wrapText(String(row.label ?? ''), size, !!row.strong, Math.max(60, totalsW - valueW - 8));
    const height = (row.strong ? 22 : 17) + (lines.length - 1) * (size + 3);
    return { ...row, size, lines, height };
  });
  const totalsH = totals.reduce((h, row) => h + row.height, 0) + 4;
  const noteColW = contentW - totalsW - 24;
  const noteLines = [];
  if (spec.notes?.text) {
    noteLines.push(...String(spec.notes.text).split('\\n')
      .flatMap((para) => wrapText(para, 8.5, false, noteColW)));
  }
  // Labeled fine-print blocks under the notes: payment details, the tax
  // note, then the late-fee disclosure. Same column, same type, one loop.
  const blocks = [spec.instructions, spec.taxNote, spec.lateFee]
    .filter((b) => b?.text)
    .map((b) => ({
      label: String(b.label || ''),
      lines: String(b.text).split('\\n').flatMap((para) => wrapText(para, 8.5, false, noteColW)),
    }));
  const notesH = (spec.notes ? 14 : 0) + noteLines.length * 11.5
    + blocks.reduce((h, b) => h + 20 + b.lines.length * 11.5, 0)
    + (spec.payLink ? 30 : 0);
  // Capped at a full page: a taller block gets a fresh page and then wraps.
  room(Math.min(Math.max(totalsH, notesH) + 6, bottom - MARGIN));

  // Totals first: they are bounded and stay beside the top of the notes
  // column, which is drawn after because it alone may spill onto further
  // pages (pasted terms, long bank blocks) and the surface writes pages in
  // order.
  let totalsY = y;
  let totalsBroke = false;
  const totalsX = PAGE_W - MARGIN;
  for (const row of totals) {
    // A totals list can outgrow a page too (imported documents may carry
    // any number of named taxes); it breaks like every other block.
    if (totalsY + row.height > bottom) {
      s.page();
      totalsBroke = true;
      totalsY = MARGIN;
    }
    const style = row.strong
      ? { size: row.size, bold: true }
      : { size: row.size, color: INK_2 };
    if (row.strong) {
      s.line(totalsX - totalsW, totalsY, totalsX, totalsY, { width: 1.2, color: brand || INK });
      totalsY += 5;
    }
    // The value sits on the label's first line; further lines stack under it.
    s.text(row.value, totalsX, totalsY, { ...style, align: 'right' });
    for (const [i, line] of row.lines.entries()) {
      if (i) totalsY += row.size + 3;
      s.text(line, totalsX - totalsW, totalsY, style);
    }
    totalsY += 17;
  }

  // Text drawn past the page bottom lands at negative coordinates and is
  // simply invisible, so the notes column breaks to a new page instead. A
  // heading asks for room for its first line too, so it is never orphaned.
  // Once the totals broke onto a later page, the column top they shared is
  // gone: the notes stack under them there instead of beside them.
  let notesY = totalsBroke ? totalsY + 6 : y;
  let notesBroke = false;
  const noteRoom = (height) => {
    if (notesY + height <= bottom) return;
    s.page();
    notesBroke = true;
    notesY = MARGIN;
  };
  if (spec.notes && (noteLines.length || spec.notes.label)) {
    noteRoom(13 + (noteLines.length ? 11.5 : 0));
    s.text(String(spec.notes.label || 'Notes').toUpperCase(), MARGIN, notesY, {
      size: 7.5, bold: true, color: MUTED, tracking: 0.7,
    });
    notesY += 13;
    for (const line of noteLines) {
      noteRoom(11.5);
      s.text(line, MARGIN, notesY, { size: 8.5, color: SUB });
      notesY += 11.5;
    }
  }
  blocks.forEach((block, i) => {
    if (spec.notes || i > 0) notesY += 6;
    noteRoom(13 + (block.lines.length ? 11.5 : 0));
    s.text(block.label.toUpperCase(), MARGIN, notesY, {
      size: 7.5, bold: true, color: MUTED, tracking: 0.7,
    });
    notesY += 13;
    for (const line of block.lines) {
      noteRoom(11.5);
      s.text(line, MARGIN, notesY, { size: 8.5, color: SUB });
      notesY += 11.5;
    }
  });
  if (spec.payLink) {
    notesY += 6;
    noteRoom(13 + 11.5);
    s.text(String(spec.payOnline || 'Pay online').toUpperCase(), MARGIN, notesY, { size: 7.5, bold: true, color: MUTED, tracking: 0.7 });
    notesY += 13;
    for (const line of wrapText(spec.payLink, 8.5, false, contentW - totalsW - 24)) {
      noteRoom(11.5);
      s.text(line, MARGIN, notesY, { size: 8.5, color: brand || '#2b49c4' });
      notesY += 11.5;
    }
  }

  // Once the notes ran onto a later page, the totals' end no longer bounds
  // anything on the current one.
  y = (notesBroke ? notesY : Math.max(notesY, totalsY)) + 10;

  const pages = s.finish();

  /* Footers, once the page count is known. */
  const footY = PAGE_H - MARGIN - 8;
  pages.forEach((ops, i) => {
    const foot = surface(PAGE_H);
    foot.line(MARGIN, footY - 10, PAGE_W - MARGIN, footY - 10, { width: 0.5, color: HAIR });
    foot.text([spec.number, spec.biz?.name].filter(Boolean).join(' · '), MARGIN, footY, {
      size: 7.5, color: MUTED,
    });
    if (pages.length > 1) {
      // The spec carries the wording in the document's language.
      const pageOf = String(spec.pageOf || 'Page {n} of {m}')
        .replace('{n}', String(i + 1))
        .replace('{m}', String(pages.length));
      foot.text(pageOf, PAGE_W - MARGIN, footY, {
        size: 7.5, color: MUTED, align: 'right',
      });
    }
    ops.push(...foot.ops());
  });

  return pages;
}

/* ---------- Public API ---------- */

/** Render a paper spec into PDF bytes. */
export async function renderPdf(spec) {
  const { w: PAGE_W, h: PAGE_H } = pageSize(spec.paper);
  const logo = await loadLogo(spec.logo);
  const pages = drawPaper(spec, logo);

  // 1 catalog, 2 pages, 3+4 fonts, 5 optional image, then page/content pairs.
  const objects = [];
  const imageId = logo ? 5 : 0;
  const firstPage = logo ? 6 : 5;
  const pageIds = pages.map((_, i) => firstPage + i * 2);

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = \`<< /Type /Pages /Count \${pages.length} /Kids [\${pageIds.map((id) => \`\${id} 0 R\`).join(' ')}] >>\`;
  objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  if (logo) {
    objects[4] = {
      dict: \`/Type /XObject /Subtype /Image /Width \${logo.width} /Height \${logo.height}\`
        + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',
      stream: logo.bytes,
    };
  }

  const resources = \`<< /Font << /F1 3 0 R /F2 4 0 R >>\${logo ? \` /XObject << /Im1 \${imageId} 0 R >>\` : ''} >>\`;
  pages.forEach((ops, i) => {
    const pageId = pageIds[i];
    objects[pageId - 1] = \`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 \${num(PAGE_W)} \${num(PAGE_H)}] \`
      + \`/Resources \${resources} /Contents \${pageId + 1} 0 R >>\`;
    objects[pageId] = { dict: '', stream: ops.join('\\n') };
  });

  return assemble(objects);
}

/** A safe file name for a document number. */
export function pdfFilename(spec) {
  const base = String(spec?.filename || spec?.number || 'document')
    .replace(/\\.pdf$/i, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    // Leading dots and dashes are how a name tries to become a path.
    .replace(/^[.\\-]+|[.\\-]+$/g, '')
    .slice(0, 80);
  return \`\${base || 'document'}.pdf\`;
}

/** Render and save. Returns the file name written. */
export async function downloadPdf(spec) {
  const bytes = await renderPdf(spec);
  const name = pdfFilename(spec);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return name;
}
`;function c(e){return JSON.stringify(e).replaceAll(`<`,`\\u003c`).replaceAll(`\u2028`,`\\u2028`).replaceAll(`\u2029`,`\\u2029`)}async function l(l,u,d,f,{files:p=[]}={}){let m=l.kind===`invoice`,h=t(l,u),g=i(h),_=`${l.number} · ${d.business?.name||g(m?`invoice`:`estimate`)}`,v=n(l,u,d,{payLink:f}),{docSpec:y}=await r(async()=>{let{docSpec:e}=await import(`./pdf-spec-KQzFlow1.js`);return{docSpec:e}},__vite__mapDeps([0,1,2]),import.meta.url),b=y(l,u,d,{payLink:f});return`<!doctype html>
<html lang="${e(h||`en`)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${e(_)}</title>
<style>
  * { box-sizing: border-box; }
  /* The UA rule for [hidden] is a bare display: none, which the .btn
     display below would silently beat; the PDF button must stay hidden
     until the writer inlined further down proves it works. */
  [hidden] { display: none !important; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #eceef2;
    color: #17181c;
    -webkit-font-smoothing: antialiased;
  }
  @media (prefers-color-scheme: dark) { body { background: #101114; } }
  .wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
  .bar {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
  }
  /* #6d7078 clears 4.5:1 on the paper's white but only 4.26:1 on the wash
     behind it, and this line is the page's only heading. .paper-sub's own
     gray holds 5.58:1 there. */
  .bar-note { font-size: 13px; color: #5b5e66; }
  @media (prefers-color-scheme: dark) { .bar-note { color: #9a9da6; } }
  .actions { display: flex; gap: 10px; }
  .btn {
    display: inline-block; padding: 11px 20px; border-radius: 9px;
    font: inherit; font-weight: 650; font-size: 14.5px; cursor: pointer;
    text-decoration: none; border: 1px solid rgba(23,24,28,0.2);
    background: #ffffff; color: #17181c;
  }
  .btn-pay { background: #2b49c4; border-color: #2b49c4; color: #ffffff; }
  /* Files published alongside the page: plain links to files already there,
     because this page fetches nothing to render itself. */
  .files {
    margin-top: 18px; padding: 16px 18px; border-radius: 12px;
    background: #ffffff; border: 1px solid rgba(23,24,28,0.1);
  }
  .files-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.09em;
    text-transform: uppercase; color: #6d7078; margin-bottom: 10px;
  }
  .file {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 9px 2px; color: #17181c; text-decoration: none;
    border-bottom: 1px solid rgba(23,24,28,0.07); font-size: 14px;
  }
  .file:last-child { border-bottom: 0; }
  .file:hover { color: #2b49c4; }
  .file-size { color: #6d7078; font-variant-numeric: tabular-nums; }
  @media print { .files { display: none; } }
  /* The paper stylesheet below gives the line-item table a horizontal scroll
     rail for narrow phones. A scroll container is monolithic — it cannot be
     split across pages — so without this a client printing a long invoice
     from this page would lose every line past the first sheet. */
  @media print {
    .bar { display: none; }
    body { background: #fff; }
    .paper { border: 0; }
    .paper-table-scroll { overflow: visible; }
    .paper-table tr, .paper-trow { break-inside: avoid; }
  }
${o}
</style>
</head>
<body>
<main class="wrap">
  <div class="bar">
    <span class="bar-note">${e(g(m?`invoice`:`estimate`))} ${e(l.number)}</span>
    <span class="actions">
      <button class="btn" id="pdf" type="button" hidden>${e(g(`downloadPdf`))}</button>
      <button class="btn" onclick="window.print()" type="button">${e(g(`print`))}</button>
      ${f&&m?`<a class="btn btn-pay" href="${e(f)}" rel="noopener">${e(g(`payNow`))}</a>`:``}
    </span>
  </div>
  <div class="paper">${v}</div>
  ${p.length?`<div class="files">
    <div class="files-label">${e(g(`attachments`))}</div>
    ${p.map(t=>`<a class="file" href="./${e(t.href)}" download>${e(t.name)}${t.size?`<span class="file-size">${e(a(t.size))}</span>`:``}</a>`).join(``)}
  </div>`:``}
</main>
<script type="application/json" id="spec">${c(b)}<\/script>
<script type="module">
${s}
// The button is revealed only once the writer is here and working, so a page
// that somehow cannot build a PDF simply offers printing instead.
try {
  const spec = JSON.parse(document.getElementById('spec').textContent);
  const button = document.getElementById('pdf');
  button.hidden = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await downloadPdf(spec);
    } catch (err) {
      console.error(err);
      window.print();
    }
    button.disabled = false;
  });
} catch (err) {
  console.error(err);
}
<\/script>
</body>
</html>`}export{l as sharePageHTML};