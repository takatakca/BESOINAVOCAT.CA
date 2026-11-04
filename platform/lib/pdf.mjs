// Minimal PDF 1.4 writer, without dependencies: Letter pages, the 14 standard fonts (no embedding), WinAnsi encoding
// for French text, wrapped paragraphs, simple tables and a footer on every page. Output is deterministic for the
// same input and clock, so a generated document's SHA-256 can be reproduced.
const PAGE_W = 612, PAGE_H = 792, MARGIN = 56, BOTTOM = 64;
const COLORS = Object.freeze({ navy: [0.098, 0.141, 0.212], wine: [0.475, 0.161, 0.212], muted: [0.373, 0.408, 0.471], line: [0.85, 0.82, 0.76], cream: [0.973, 0.965, 0.937] });
const FONTS = Object.freeze({ body: 'F1', bold: 'F2', serif: 'F3', mono: 'F4' });
const WIN = new Map([[0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89],
  [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96],
  [0x2014, 0x97], [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f], [0x202f, 0x20], [0x00a0, 0x20], [0x2011, 0x2d]]);

export function winAnsi(value) {
  let out = '';
  for (const char of String(value ?? '').normalize('NFC')) {
    const code = char.codePointAt(0);
    let byte = code < 0x80 ? code : (code >= 0xa0 && code <= 0xff ? code : WIN.get(code));
    if (byte === undefined || byte < 0x20) byte = char === '\t' ? 0x20 : 0x3f;
    const c = String.fromCharCode(byte);
    out += c === '(' || c === ')' || c === '\\' ? `\\${c}` : c;
  }
  return out;
}
// Approximate Helvetica/Times advance widths (per 1000 em), enough for left-aligned wrapping.
function charWidth(char, font) {
  if (font === FONTS.mono) return 600;
  if (' .,;:\'|!ilIjt()[]f'.includes(char)) return 278;
  if ('mwMW@%'.includes(char)) return 833;
  if (/[A-ZÀ-ÖØ-Þ]/u.test(char)) return font === FONTS.serif ? 667 : 690;
  if (/[0-9]/u.test(char)) return 556;
  return font === FONTS.bold ? 580 : 540;
}
export function textWidth(value, font, size) { let w = 0; for (const c of String(value)) w += charWidth(c, font); return (w * size) / 1000; }
function wrap(value, font, size, width) {
  const lines = [];
  for (const paragraph of String(value ?? '').split(/\r?\n/u)) {
    let current = '';
    for (const word of paragraph.split(/\s+/u).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidth(candidate, font, size) <= width) { current = candidate; continue; }
      if (current) lines.push(current);
      // Hard-break words longer than the line (hashes, long references).
      let rest = word;
      while (textWidth(rest, font, size) > width) {
        let cut = rest.length;
        while (cut > 1 && textWidth(rest.slice(0, cut), font, size) > width) cut -= 1;
        lines.push(rest.slice(0, cut)); rest = rest.slice(cut);
      }
      current = rest;
    }
    lines.push(current);
  }
  return lines;
}

export function createPdf({ title, subtitle = '', meta = [], footer = '' }) {
  const pages = [];
  let ops = null, y = 0;
  const color = ([r, g, b], stroke = false) => `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${stroke ? 'RG' : 'rg'}`;
  const write = (x, yy, value, font, size, c = COLORS.navy) => ops.push(`BT ${color(c)} /${font} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${winAnsi(value)}) Tj ET`);
  const rule = (yy, c = COLORS.line, w = 0.6, x1 = MARGIN, x2 = PAGE_W - MARGIN) => ops.push(`${color(c, true)} ${w} w ${x1} ${yy.toFixed(2)} m ${x2} ${yy.toFixed(2)} l S`);
  function newPage() {
    ops = []; pages.push(ops);
    ops.push(`${color(COLORS.cream)} 0 ${PAGE_H - 34} ${PAGE_W} 34 re f`);
    write(MARGIN, PAGE_H - 22, 'BESOINAVOCAT', FONTS.bold, 9, COLORS.wine);
    write(MARGIN + 86, PAGE_H - 22, title, FONTS.body, 9, COLORS.muted);
    y = PAGE_H - 62;
  }
  function ensure(height) { if (y - height < BOTTOM) newPage(); }
  newPage();
  write(MARGIN, y - 8, title, FONTS.serif, 22, COLORS.navy); y -= 30;
  if (subtitle) { for (const l of wrap(subtitle, FONTS.body, 11, PAGE_W - 2 * MARGIN)) { write(MARGIN, y - 4, l, FONTS.body, 11, COLORS.muted); y -= 15; } }
  y -= 4; rule(y, COLORS.wine, 1.4, MARGIN, MARGIN + 64); y -= 16;
  for (const [label, value] of meta) {
    const lines = wrap(value, FONTS.body, 10, PAGE_W - 2 * MARGIN - 150);
    ensure(lines.length * 13 + 2);
    write(MARGIN, y, label, FONTS.bold, 9, COLORS.muted);
    lines.forEach((l, i) => write(MARGIN + 150, y - i * 13, l, FONTS.body, 10));
    y -= lines.length * 13 + 3;
  }
  if (meta.length) { y -= 6; rule(y); y -= 18; }

  const api = {
    heading(value) { ensure(34); y -= 6; write(MARGIN, y, value, FONTS.serif, 14, COLORS.navy); y -= 8; rule(y, COLORS.line, 0.5); y -= 16; return api; },
    paragraph(value, { size = 10.5, font = FONTS.body, c = COLORS.navy, gap = 6 } = {}) {
      for (const l of wrap(value, font, size, PAGE_W - 2 * MARGIN)) { ensure(size + 4); write(MARGIN, y, l, font, size, c); y -= size + 3.5; }
      y -= gap; return api;
    },
    note(value) { return api.paragraph(value, { size: 9, c: COLORS.muted }); },
    // columns: [{ label, width (fraction), mono }]; rows: arrays of strings.
    table(columns, rows) {
      const total = PAGE_W - 2 * MARGIN;
      const widths = columns.map(c => c.width * total);
      const head = () => {
        ensure(30);
        let x = MARGIN;
        ops.push(`${color(COLORS.cream)} ${MARGIN} ${(y - 5).toFixed(2)} ${total} 17 re f`);
        columns.forEach((c, i) => { write(x + 4, y, c.label.toUpperCase(), FONTS.bold, 7.5, COLORS.muted); x += widths[i]; });
        y -= 18;
      };
      head();
      if (!rows.length) { api.note('Aucun élément.'); return api; }
      for (const row of rows) {
        const cells = row.map((cell, i) => wrap(cell, columns[i].mono ? FONTS.mono : FONTS.body, columns[i].mono ? 7.5 : 9, widths[i] - 8));
        const height = Math.max(...cells.map(c => c.length)) * 11.5 + 5;
        if (y - height < BOTTOM) { newPage(); head(); }
        let x = MARGIN;
        cells.forEach((lines, i) => {
          lines.forEach((l, j) => write(x + 4, y - j * 11.5, l, columns[i].mono ? FONTS.mono : FONTS.body, columns[i].mono ? 7.5 : 9));
          x += widths[i];
        });
        y -= height; rule(y + 7, COLORS.line, 0.4);
      }
      y -= 8; return api;
    },
    space(n = 8) { y -= n; return api; },
    toBuffer() {
      const count = pages.length;
      pages.forEach((p, i) => {
        ops = p;
        rule(BOTTOM - 16, COLORS.line, 0.5);
        const line = `${footer}${footer ? ' · ' : ''}page ${i + 1} / ${count}`;
        for (const [k, l] of wrap(line, FONTS.body, 7.5, PAGE_W - 2 * MARGIN).entries()) write(MARGIN, BOTTOM - 28 - k * 10, l, FONTS.body, 7.5, COLORS.muted);
      });
      const objects = [];
      const add = body => { objects.push(body); return objects.length; };
      const catalog = add(null), pagesId = add(null);
      const fonts = { F1: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
        F2: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
        F3: add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>'),
        F4: add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>') };
      const resources = `<< /Font << ${Object.entries(fonts).map(([k, v]) => `/${k} ${v} 0 R`).join(' ')} >> >>`;
      const kids = pages.map(p => {
        const stream = p.join('\n');
        const content = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
        return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources ${resources} /Contents ${content} 0 R >>`);
      });
      objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
      objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
      const info = add(`<< /Title (${winAnsi(title)}) /Producer (BesoinAvocat) >>`);
      let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
      const offsets = [];
      objects.forEach((body, i) => { offsets.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
      const xref = Buffer.byteLength(out, 'latin1');
      out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
      out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      return Buffer.from(out, 'latin1');
    },
  };
  return api;
}
export { FONTS };
