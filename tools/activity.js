const fs = require('fs');
const { fonts, C, rnd, textPath, textWidth } = require('./svg-text');

const { onest400, onest500, onest600 } = fonts;

const LOGIN = 'Tazuya';
const DAYS = 31;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

// The calendar counts private contributions only because the profile has
// "Include private contributions" enabled, so any token sees the public numbers.
async function fetchDays(token) {
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - (DAYS - 1)));
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-assets' },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN, from: from.toISOString(), to: to.toISOString() } }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}: ${await res.text()}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error(`GitHub GraphQL: ${errors.map((e) => e.message).join('; ')}`);
  const days = data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .slice(-DAYS);
  if (days.length !== DAYS) throw new Error(`expected ${DAYS} days, got ${days.length}`);
  return days.map((d) => ({ date: d.date, count: d.contributionCount }));
}

function niceStep(max, ticks) {
  const raw = Math.max(max, 1) / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw));
}

// Monotone cubic (Fritsch–Carlson, as d3.curveMonotoneX): never overshoots the data,
// so a zero day is drawn on the baseline instead of dipping below it.
function monotonePath(pts) {
  const n = pts.length;
  const h = pts[1].x - pts[0].x;
  const s = pts.slice(1).map((p, i) => (p.y - pts[i].y) / h);
  const m = pts.map((_, i) => {
    if (i === 0 || i === n - 1) return 0;
    const [a, b] = [s[i - 1], s[i]];
    return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(a + b) / 4);
  });
  m[0] = (3 * s[0] - m[1]) / 2;
  m[n - 1] = (3 * s[n - 2] - m[n - 2]) / 2;
  let d = `M${rnd(pts[0].x)} ${rnd(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const [p, q] = [pts[i], pts[i + 1]];
    d += `C${rnd(p.x + h / 3)} ${rnd(p.y + (m[i] * h) / 3)} ${rnd(q.x - h / 3)} ${rnd(q.y - (m[i + 1] * h) / 3)} ${rnd(q.x)} ${rnd(q.y)}`;
  }
  return d;
}

const centered = (font, text, cx, y, size, fill, opts) =>
  textPath(font, text, cx - textWidth(font, text, size, opts) / 2, y, size, fill, opts);

const rightAligned = (font, text, rx, y, size, fill, opts) =>
  textPath(font, text, rx - textWidth(font, text, size, opts), y, size, fill, opts);

function render(days) {
  const W = 1200, H = 400, LX = 84;
  const plot = { left: 148, right: W - LX, top: 132, bottom: 312 };
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(...days.map((d) => d.count));
  const step = niceStep(peak, 4);
  const top = step * 4;

  const xOf = (i) => plot.left + ((plot.right - plot.left) * i) / (days.length - 1);
  const yOf = (v) => plot.bottom - ((plot.bottom - plot.top) * v) / top;
  const pts = days.map((d, i) => ({ x: xOf(i), y: yOf(d.count) }));

  const parts = [];
  parts.push(`<defs><linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.rose}" stop-opacity="0.32"/><stop offset="1" stop-color="${C.rose}" stop-opacity="0"/></linearGradient></defs>`);
  parts.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="28" fill="${C.bg}" stroke="${C.hairline}"/>`);

  parts.push(`<circle cx="${LX + 5}" cy="66" r="5" fill="${C.rose}"/>`);
  parts.push(textPath(onest600, 'CONTRIBUTION ACTIVITY', LX + 24, 72, 17, C.text3, { letterSpacing: 0.22 }));

  const unit = ` ${total === 1 ? 'contribution' : 'contributions'} in the last ${DAYS} days`;
  const unitW = textWidth(onest400, unit, 18);
  parts.push(rightAligned(onest400, unit, W - LX, 72, 18, C.text2));
  parts.push(rightAligned(onest600, String(total), W - LX - unitW, 72, 18, C.text));

  for (let v = 0; v <= top; v += step) {
    const y = rnd(yOf(v));
    parts.push(`<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" stroke="${v === 0 ? C.hairline2 : C.hairline}"/>`);
    parts.push(rightAligned(onest500, String(v), plot.left - 20, y + 15 * 0.36, 15, C.text3));
  }

  const line = monotonePath(pts);
  const last = pts[pts.length - 1];
  parts.push(`<path d="${line}L${rnd(last.x)} ${plot.bottom}L${rnd(pts[0].x)} ${plot.bottom}Z" fill="url(#activity-area)"/>`);
  parts.push(`<path d="${line}" stroke="${C.rose}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  parts.push(pts.map((p) => `<circle cx="${rnd(p.x)}" cy="${rnd(p.y)}" r="4" fill="${C.text}" stroke="${C.bg}" stroke-width="2"/>`).join(''));

  if (peak > 0) {
    const i = days.findIndex((d) => d.count === peak);
    parts.push(centered(onest600, String(peak), pts[i].x, pts[i].y - 16, 15, C.text));
  }

  days.forEach((d, i) => {
    const day = Number(d.date.slice(8));
    parts.push(centered(onest500, String(day), pts[i].x, plot.bottom + 34, 15, C.text3));
    if (i === 0 || day === 1) {
      const month = MONTHS[Number(d.date.slice(5, 7)) - 1];
      parts.push(centered(onest600, month, pts[i].x, plot.bottom + 60, 13, C.text2, { letterSpacing: 0.18 }));
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Contribution activity: ${total}${unit}">
${parts.join('\n')}
</svg>`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  const svg = render(await fetchDays(token));
  fs.writeFileSync('assets/activity.svg', svg);
  console.log('activity.svg', Buffer.byteLength(svg), 'bytes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
