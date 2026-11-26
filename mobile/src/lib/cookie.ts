// Reads the portal's session cookie out of a Set-Cookie header (several cookies may be folded with commas).
// undefined: the header does not touch the session; null: the portal cleared it; string: the new session value.
export const SESSION_COOKIE_NAME = '__Host-ba_session';

export function sessionFromSetCookie(header: string | null | undefined, name: string = SESSION_COOKIE_NAME): string | null | undefined {
  if (!header) return undefined;
  const pattern = new RegExp(`(?:^|[,;]\\s*)${name.replace(/[-]/g, '\\-')}=([^;,]*)([^,]*)`, 'i');
  const match = pattern.exec(header);
  if (!match) return undefined;
  const value = match[1] ?? '';
  const attributes = match[2] ?? '';
  if (!value || /max-age=0\b/i.test(attributes)) return null;
  return decodeURIComponent(value);
}
