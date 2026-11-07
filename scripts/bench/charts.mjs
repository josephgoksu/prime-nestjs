#!/usr/bin/env node
// Renders the benchmark charts in documentation/benchmarks/ from benchmarks.json.
//   node scripts/bench/charts.mjs
// Each chart is written twice (-light.svg, -dark.svg) for <picture> in the docs.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../../documentation/benchmarks/', import.meta.url);
const data = JSON.parse(readFileSync(new URL('benchmarks.json', dir), 'utf8'));

const THEMES = {
  light: { surface: '#fcfcfb', text: '#0b0b0b', text2: '#52514e', muted: '#8a8984', grid: '#e4e3df', accent: '#2a78d6', context: '#b9b8b2' },
  dark: { surface: '#1a1a19', text: '#f0efec', text2: '#c3c2b7', muted: '#8f8e86', grid: '#33332f', accent: '#3987e5', context: '#5c5b56' },
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = (v) => (v >= 10000 ? `${(v / 1000).toFixed(1)}k` : v >= 1000 ? v.toLocaleString('en-US') : String(v));

/** A horizontal bar with a 4px rounded data end and a square baseline end. */
const bar = (x, y, w, h, fill) => {
  const r = Math.min(4, w / 2, h / 2);
  if (w <= 0) return '';
  return `<path d="M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z" fill="${fill}"/>`;
};

/**
 * Small multiples: one panel per metric, each with its own scale (never a shared or dual axis).
 * panel = { title, note, unit, rows: [{ label, value, highlight }] }
 */
function render({ title, subtitle, panels, footnote, cols = 2 }, t) {
  const W = 880,
    pad = 24,
    gap = 32,
    labelW = 150,
    valueW = 64,
    rowH = 22,
    rowGap = 8;
  const panelW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const panelH = (p) => 44 + p.rows.length * (rowH + rowGap);
  const rowsOf = [];
  for (let i = 0; i < panels.length; i += cols) rowsOf.push(panels.slice(i, i + cols));
  let y = pad + 60;
  const out = [];
  for (const line of rowsOf) {
    const h = Math.max(...line.map(panelH));
    line.forEach((p, i) => {
      const x0 = pad + i * (panelW + gap);
      const max = Math.max(...p.rows.map((r) => r.value)) || 1;
      const plotW = panelW - labelW - valueW;
      out.push(`<text x="${x0}" y="${y + 14}" font-size="14" font-weight="600" fill="${t.text}">${esc(p.title)}</text>`);
      out.push(`<text x="${x0}" y="${y + 31}" font-size="12" fill="${t.text2}">${esc(p.note)}</text>`);
      p.rows.forEach((r, j) => {
        const ry = y + 44 + j * (rowH + rowGap);
        const w = Math.max(r.value > 0 ? 2 : 0, (r.value / max) * plotW);
        out.push(
          `<text x="${x0 + labelW - 10}" y="${ry + rowH / 2 + 4}" font-size="12" text-anchor="end" fill="${r.highlight ? t.text : t.text2}" font-weight="${r.highlight ? 600 : 400}">${esc(r.label)}</text>`,
        );
        out.push(`<line x1="${x0 + labelW}" y1="${ry - 3}" x2="${x0 + labelW}" y2="${ry + rowH + 3}" stroke="${t.grid}"/>`);
        out.push(bar(x0 + labelW, ry, w, rowH, r.highlight ? t.accent : t.context));
        out.push(
          `<text x="${x0 + labelW + w + 6}" y="${ry + rowH / 2 + 4}" font-size="12" fill="${t.text}" font-variant-numeric="tabular-nums">${esc(fmt(r.value))}${p.unit ? ' ' + esc(p.unit) : ''}</text>`,
        );
      });
    });
    y += h + 20;
  }
  const H = y + (footnote ? 24 : 0) + pad - 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img" aria-label="${esc(title)}">
<rect width="${W}" height="${H}" rx="8" fill="${t.surface}"/>
<text x="${pad}" y="${pad + 18}" font-size="18" font-weight="700" fill="${t.text}">${esc(title)}</text>
<text x="${pad}" y="${pad + 40}" font-size="13" fill="${t.text2}">${esc(subtitle)}</text>
${out.join('\n')}
${footnote ? `<text x="${pad}" y="${H - pad + 4}" font-size="11" fill="${t.muted}">${esc(footnote)}</text>` : ''}
</svg>
`;
}

const charts = {
  'before-after': {
    title: 'prime-nestjs: v1 (NestJS 11) vs now (NestJS 12)',
    subtitle: 'Same 4 vCPU machine and Postgres 16, production build. Blue is now.',
    footnote: data.runtime.footnote,
    panels: data.runtime.panels.map((p) => ({
      ...p,
      rows: [
        { label: 'v1 (NestJS 11)', value: p.before },
        { label: 'now', value: p.after, highlight: true },
      ],
    })),
  },
  boilerplates: {
    title: 'Production dependencies of popular NestJS boilerplates',
    subtitle: `npm install --omit=dev from each package.json, ${data.boilerplates.date}. Fewer is better on every panel.`,
    footnote: data.boilerplates.footnote,
    panels: data.boilerplates.panels.map((p) => ({
      ...p,
      rows: [...data.boilerplates.repos]
        .map((r) => ({ label: r.name, value: r[p.key], highlight: r.name === 'prime-nestjs' }))
        .sort((a, b) => a.value - b.value),
    })),
  },
};

for (const [name, chart] of Object.entries(charts)) {
  for (const [mode, theme] of Object.entries(THEMES)) {
    writeFileSync(new URL(`${name}-${mode}.svg`, dir), render(chart, theme));
  }
}
console.log(`Wrote ${Object.keys(charts).length * 2} charts to documentation/benchmarks/`);
