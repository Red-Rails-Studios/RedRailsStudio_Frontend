export function normalizeColorRaw(raw: any): string | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;

  // already valid hex with # or short/long hex
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s)) return s;
  // hex without # -> add it
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return '#' + s;
  // rgb/rgba/hsl/hsla allowed
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(s)) return s;
  // numeric 24-bit int -> hex
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isNaN(n) && n >= 0 && n <= 0xFFFFFF) {
      return '#' + n.toString(16).padStart(6, '0');
    }
  }
  // try named color acceptance (browser validation)
  const tmp = document.createElement('div');
  tmp.style.color = s;
  if (tmp.style.color) return s;

  return null;
}