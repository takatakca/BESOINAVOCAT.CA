// French (Québec) formatting helpers.
const dateFmt = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('fr-CA', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)) : '');
export const formatShort = (iso: string | null | undefined) => (iso ? shortFmt.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)) : '');
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => `${formatDate(iso)} · ${formatTime(iso)}`;

export function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return formatShort(iso);
}

export function bytes(n: number | undefined | null) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} Mo`;
  return `${(n / 1024 ** 3).toFixed(1).replace('.', ',')} Go`;
}

export const money = (cents: number) => `${(cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: cents % 100 ? 2 : 0 })} $`;

export function daysLabel(daysLeft: number) {
  if (daysLeft < 0) return `En retard de ${-daysLeft} j`;
  if (daysLeft === 0) return 'Aujourd’hui';
  if (daysLeft === 1) return 'Demain';
  return `Dans ${daysLeft} jours`;
}

export const initials = (text: string) => text.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || 'B';

export const STATUS_LABEL: Record<string, { label: string; tone: 'gold' | 'green' | 'navy' }> = {
  preparation: { label: 'En préparation', tone: 'gold' },
  pret: { label: 'Prêt pour un avocat', tone: 'navy' },
  accepte: { label: 'Accepté par un avocat', tone: 'green' },
};

export const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff',
  txt: 'text/plain', csv: 'text/csv', json: 'application/json', eml: 'message/rfc822', doc: 'application/msword', xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export function mimeFor(name: string, given?: string | null) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (given && Object.values(EXT_MIME).includes(given)) return given;
  return EXT_MIME[ext] ?? given ?? 'application/octet-stream';
}
export const isImage = (mime: string) => mime.startsWith('image/');
