const fs = require('fs');
const opentype = require('opentype.js');

function loadFont(p) {
  const b = fs.readFileSync(p);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

const fonts = {
  unbounded700: loadFont('fonts/Unbounded-700.ttf'),
  unbounded500: loadFont('fonts/Unbounded-500.ttf'),
  onest400: loadFont('fonts/Onest-400.ttf'),
  onest500: loadFont('fonts/Onest-500.ttf'),
  onest600: loadFont('fonts/Onest-600.ttf'),
};

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

module.exports = { fonts, C, rnd, textPath, textWidth };
