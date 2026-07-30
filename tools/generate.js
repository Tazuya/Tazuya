const fs = require('fs');
const opentype = require('opentype.js');

function loadFont(p) {
  const b = fs.readFileSync(p);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

const unbounded700 = loadFont('fonts/Unbounded-700.ttf');
const unbounded500 = loadFont('fonts/Unbounded-500.ttf');
const onest400 = loadFont('fonts/Onest-400.ttf');
const onest500 = loadFont('fonts/Onest-500.ttf');
const onest600 = loadFont('fonts/Onest-600.ttf');

const C = {
  bg: '#0a0a0c',
  bg2: '#111114',
  bg3: '#18181c',
  hairline: 'rgba(255,255,255,0.08)',
  hairline2: 'rgba(255,255,255,0.12)',
  text: '#f5f5f7',
  text2: '#a0a0a8',
  text3: '#6e6e76',
  rose: '#ff3d68',
};

function glyphRun(font, text, size, letterSpacing = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = [];
  let x = 0;
  let prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) x += font.getKerningValue(prev, g) * scale;
    glyphs.push({ g, x });
    x += g.advanceWidth * scale + letterSpacing * size;
  }
  return { glyphs, width: x - (text.length ? letterSpacing * size : 0) };
}

const rnd = (v) => Math.round(v * 100) / 100;

function pathData(path) {
  let d = '';
  const ok = (...vs) => vs.every(Number.isFinite);
  for (const c of path.commands) {
    if (c.type === 'Z') { d += 'Z'; continue; }
    if (!ok(c.x, c.y)) continue;
    if (c.type === 'M') d += `M${rnd(c.x)} ${rnd(c.y)}`;
    else if (c.type === 'L') d += `L${rnd(c.x)} ${rnd(c.y)}`;
    else if (c.type === 'Q') d += ok(c.x1, c.y1) ? `Q${rnd(c.x1)} ${rnd(c.y1)} ${rnd(c.x)} ${rnd(c.y)}` : `L${rnd(c.x)} ${rnd(c.y)}`;
    else if (c.type === 'C') d += ok(c.x1, c.y1, c.x2, c.y2) ? `C${rnd(c.x1)} ${rnd(c.y1)} ${rnd(c.x2)} ${rnd(c.y2)} ${rnd(c.x)} ${rnd(c.y)}` : `L${rnd(c.x)} ${rnd(c.y)}`;
  }
  return d;
}

function textPath(font, text, x, y, size, fill, opts = {}) {
  const run = glyphRun(font, text, size, opts.letterSpacing || 0);
  const d = run.glyphs.map(({ g, x: gx }) => pathData(g.getPath(x + gx, y, size))).join('');
  return `<path d="${d}" fill="${fill}"/>`;
}

function textWidth(font, text, size, opts = {}) {
  return glyphRun(font, text, size, opts.letterSpacing || 0).width;
}

// ---------- banner.svg ----------
const W = 1200, H = 340;
const parts = [];

parts.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="28" fill="${C.bg}" stroke="${C.hairline}"/>`);

// faint dotted texture, right side only
let dots = '';
for (let gx = 640; gx < W - 40; gx += 36) {
  for (let gy = 40; gy < H - 30; gy += 36) {
    dots += `<circle cx="${gx}" cy="${gy}" r="1.1" fill="rgba(255,255,255,0.045)"/>`;
  }
}
parts.push(dots);

const LX = 84;

// eyebrow: rose dot + label
const eyebrowY = 108;
parts.push(`<circle cx="${LX + 5}" cy="${eyebrowY - 6}" r="5" fill="${C.rose}"/>`);
parts.push(textPath(onest600, 'SOLO DEVELOPER', LX + 24, eyebrowY, 17, C.text3, { letterSpacing: 0.22 }));

// name
const name = 'SHIBA';
let nameSize = 76;
const maxNameW = 780;
while (textWidth(unbounded700, name, nameSize, { letterSpacing: 0.04 }) > maxNameW) nameSize -= 1;
parts.push(textPath(unbounded700, name, LX, 190, nameSize, C.text, { letterSpacing: 0.04 }));

// subtitle
parts.push(textPath(onest400, 'Building things end to end — backend, web, bots.', LX, 234, 23, C.text2));

// bottom hairline + quiet meta line
parts.push(`<line x1="${LX}" y1="266" x2="${W - 84}" y2="266" stroke="${C.hairline}"/>`);
const meta = ['DDD', 'CQRS', 'EVENT-DRIVEN', 'LLM PIPELINES'];
let mx = LX;
for (const m of meta) {
  parts.push(textPath(onest600, m, mx, 296, 14, C.text3, { letterSpacing: 0.18 }));
  mx += textWidth(onest600, m, 14, { letterSpacing: 0.18 }) + 14;
  if (m !== meta[meta.length - 1]) {
    parts.push(`<circle cx="${mx}" cy="291" r="2" fill="${C.rose}"/>`);
    mx += 14 + 8;
  }
}

// right: app-icon chip with paw print
const chipS = 116, chipX = W - 84 - chipS, chipY = 78;
parts.push(`<rect x="${chipX + 0.5}" y="${chipY + 0.5}" width="${chipS - 1}" height="${chipS - 1}" rx="26" fill="${C.bg3}" stroke="${C.hairline2}"/>`);
const pcx = chipX + chipS / 2, pcy = chipY + chipS / 2;
const paw = [
  `<ellipse cx="${pcx - 21}" cy="${pcy - 11}" rx="7" ry="9.5" transform="rotate(-24 ${pcx - 21} ${pcy - 11})" fill="${C.rose}"/>`,
  `<ellipse cx="${pcx - 7.5}" cy="${pcy - 20}" rx="7" ry="10" transform="rotate(-8 ${pcx - 7.5} ${pcy - 20})" fill="${C.rose}"/>`,
  `<ellipse cx="${pcx + 7.5}" cy="${pcy - 20}" rx="7" ry="10" transform="rotate(8 ${pcx + 7.5} ${pcy - 20})" fill="${C.rose}"/>`,
  `<ellipse cx="${pcx + 21}" cy="${pcy - 11}" rx="7" ry="9.5" transform="rotate(24 ${pcx + 21} ${pcy - 11})" fill="${C.rose}"/>`,
  `<path d="M${pcx} ${pcy + 27} C${pcx - 14} ${pcy + 27} ${pcx - 20} ${pcy + 18} ${pcx - 20} ${pcy + 11} C${pcx - 20} ${pcy + 2} ${pcx - 11} ${pcy - 1} ${pcx} ${pcy - 1} C${pcx + 11} ${pcy - 1} ${pcx + 20} ${pcy + 2} ${pcx + 20} ${pcy + 11} C${pcx + 20} ${pcy + 18} ${pcx + 14} ${pcy + 27} ${pcx} ${pcy + 27} Z" fill="${C.rose}"/>`,
].join('');
parts.push(paw);

const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Shiba — solo developer building things end to end">
${parts.join('\n')}
</svg>`;
fs.writeFileSync('assets/banner.svg', banner);

// ---------- stack.svg ----------
const pills = ['TypeScript', 'NestJS', 'Next.js', 'React', 'Prisma', 'PostgreSQL', 'BullMQ', 'Nx'];
const SH = 56, pillH = 44, pillR = pillH / 2, padX = 21, gap = 12, fs2 = 17;
const widths = pills.map((p) => textWidth(onest500, p, fs2) + padX * 2);
const total = widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);
const SW = 1200;
let px = (SW - total) / 2;
const sparts = [];
for (let i = 0; i < pills.length; i++) {
  const w = widths[i];
  const py = (SH - pillH) / 2;
  sparts.push(`<rect x="${px + 0.5}" y="${py + 0.5}" width="${w - 1}" height="${pillH - 1}" rx="${pillR}" fill="${C.bg2}" stroke="${C.hairline2}"/>`);
  const tw = widths[i] - padX * 2;
  sparts.push(textPath(onest500, pills[i], px + padX, py + pillH / 2 + fs2 * 0.36, fs2, C.text2));
  px += w + gap;
}
const stack = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" fill="none" role="img" aria-label="${pills.join(' · ')}">
${sparts.join('\n')}
</svg>`;
fs.writeFileSync('assets/stack.svg', stack);

console.log('banner.svg', Buffer.byteLength(banner), 'bytes; nameSize', nameSize);
console.log('stack.svg', Buffer.byteLength(stack), 'bytes; total pill width', Math.round(total));
