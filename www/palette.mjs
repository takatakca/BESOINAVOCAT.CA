// Colour change of the besoinavocat.ca copy: the design stays as built on WordPress, only the colour families move
// to legal tones. Orange (accent, buttons, logo) becomes burgundy; teal, green-slate, blue and purple become navy.
// Neutrals (white, ivory and cream, greys, near-black) are kept. The same function recolours CSS, inline styles and the logo.

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function toRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

// Returns the new [r, g, b], or null when the colour is kept.
export function mapColour(r, g, b) {
  const [h, s, l] = toHsl(r, g, b);
  if (l > 0.97 || l < 0.06) return null; // white and near-black
  if (s < 0.13 && l < 0.3) return null; // the owner's charcoal text colours (#373643, #32373c) stay as they are
  if (h >= 70 && h <= 320 && s >= 0.04) {
    // Green-greys, green tints, teal, slate, blue and purple -> navy. Bright mid-tones are darkened to a true navy.
    return toRgb(218, clamp(s * 0.9, 0, 0.7), s > 0.45 && l >= 0.3 && l <= 0.7 ? l * 0.72 : l);
  }
  if (s < 0.12) return null; // neutral greys, ivory and cream
  if (h >= 8 && h <= 42 && s >= 0.45 && l >= 0.2 && l <= 0.88) {
    // Orange family -> burgundy. Light tints stay light, strong oranges become a deep burgundy.
    const light = l > 0.7;
    return toRgb(350, clamp(s * (light ? 0.45 : 0.62), 0, 0.62), light ? l : clamp(l * 0.6, 0.16, 0.5));
  }
  return null;
}

const hex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');

// Recolours every hex and rgb()/rgba() colour in a CSS (or inline style) text.
export function recolour(text) {
  return text
    .replace(/#([0-9a-f]{3}|[0-9a-f]{6})(?![0-9a-z_-])/gi, (m, value) => {
      const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
      const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
      const next = mapColour(...rgb);
      return next ? hex(next) : m;
    })
    .replace(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(\s*[,/]\s*[\d.]+%?)?\s*\)/gi, (m, r, g, b, alpha) => {
      const next = mapColour(Number(r), Number(g), Number(b));
      if (!next) return m;
      return alpha ? `rgba(${next.join(', ')}, ${alpha.replace(/^[\s,/]+/, '')})` : `rgb(${next.join(', ')})`;
    });
}

const lightness = (value) => {
  const m = value.match(/#([0-9a-f]{6})\b/i) || null;
  if (m) { const rgb = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); return toHsl(...rgb)[2]; }
  const r = value.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  return r ? toHsl(Number(r[1]), Number(r[2]), Number(r[3]))[2] : null;
};

// Where a background became dark (burgundy or navy) but its text stays dark in the same rule, the text turns white.
// Custom properties defined in the stylesheet (var(--ba-orange)…) are resolved first; !important is kept.
export function keepReadable(css) {
  const vars = new Map();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) if (!vars.has(m[1])) vars.set(m[1], m[2]);
  const resolve = (value) => value.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (m, name) => vars.get(name) || m);
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector, body) => {
    const bg = body.match(/background(?:-color)?\s*:\s*([^;]+)/i);
    const fg = body.match(/(^|;)\s*color\s*:\s*([^;]+)/i);
    if (!bg || !fg) return rule;
    const lb = lightness(resolve(bg[1])), lf = lightness(resolve(fg[2]));
    if (lb === null || lf === null || lb > 0.45 || lf > 0.45) return rule;
    const white = (prop) => (m, start, space, value) => `${start}${space}${prop}:#ffffff${/!important/i.test(value) ? ' !important' : ''}`;
    return `${selector}{${body.replace(/(^|;)(\s*)color\s*:\s*([^;]+)/i, white('color')).replace(/(^|;)(\s*)fill\s*:\s*([^;]+)/i, white('fill'))}}`;
  });
}
