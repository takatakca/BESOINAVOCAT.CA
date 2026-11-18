import { crc32 } from 'node:zlib';
import { createPdf } from './pdf.mjs';

// « Paquet prêt à déposer » : une archive ZIP que l'avocat dépose lui-même dans Lexius (Services judiciaires
// numériques du ministère de la Justice du Québec). Lexius n'offre aucune API aux fournisseurs (vérifié le
// 2026-11-18, docs/ETAT-INTEGRATIONS-2026-11-18.md §3) : le portail prépare donc les fichiers, il ne dépose rien.
// Contenu : un bordereau PDF, la dernière version de chaque pièce renommée « P-1 - … », et un LISEZ-MOI.
// La cote est une proposition à confirmer par l'avocat; l'empreinte SHA-256 de chaque fichier figure au bordereau.

export const LEXIUS_URL = 'https://lexius.justice.gouv.qc.ca/';
const ZIP_LIMIT = 0xffffffff - 1024 * 1024; // pas de ZIP64 : on refuse plutôt qu'écrire une archive illisible.

// Nom de fichier sûr pour Windows, macOS et Lexius : sans séparateurs ni caractères réservés, 120 caractères au plus.
export function safeFileName(value, fallback = 'piece') {
  const cleaned = String(value || '').normalize('NFC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/gu, ' ').replace(/\s+/gu, ' ').trim().replace(/^[.\s]+|[.\s]+$/gu, '');
  const name = cleaned || fallback;
  if (name.length <= 120) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : '';
  return name.slice(0, 120 - ext.length).trimEnd() + ext;
}

export function exhibitName(index, documentName) {
  return `P-${index + 1} - ${safeFileName(documentName)}`;
}

const longDate = iso => new Date(iso).toLocaleString('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'long', timeStyle: 'short' });
const size = n => n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`;

export function bordereau(caseRow, documents, generatedAt = new Date().toISOString()) {
  const label = caseRow.reference ? `${caseRow.title} (${caseRow.reference})` : caseRow.title;
  const pdf = createPdf({
    title: 'Bordereau des pièces',
    subtitle: 'Pièces du dossier préparées pour le dépôt. La cote proposée (P-1, P-2…) est à confirmer par l’avocat avant le dépôt.',
    meta: [['Dossier', label], ['Nombre de pièces', String(documents.length)], ['Préparé le', longDate(generatedAt)]],
    footer: 'BesoinAvocat · bordereau de travail, à vérifier',
  });
  pdf.table(
    [{ label: 'Cote', width: 0.08 }, { label: 'Pièce', width: 0.34 }, { label: 'Ver.', width: 0.06 }, { label: 'Versée le', width: 0.16 }, { label: 'Taille', width: 0.08 }, { label: 'SHA-256', width: 0.28, mono: true }],
    documents.map((d, i) => [`P-${i + 1}`, d.name, `v${d.versionNumber}`, longDate(d.createdAt), size(d.bytes), d.sha256]),
  );
  pdf.note('Chaque fichier de l’archive porte la cote de sa ligne. L’empreinte SHA-256 identifie exactement le fichier versé au portail; elle ne prouve ni l’authenticité du document ni la véracité de son contenu.');
  pdf.note('Le dépôt se fait par l’avocat, avec son propre compte, dans Lexius. BesoinAvocat ne dépose rien au greffe.');
  return pdf.toBuffer();
}

export function readme(caseRow, documents) {
  return [
    `Paquet prêt à déposer — ${caseRow.title}${caseRow.reference ? ` (${caseRow.reference})` : ''}`,
    '',
    'Contenu :',
    '- 00 - Bordereau des pieces.pdf : la liste des pièces, leur cote proposée et leur empreinte SHA-256.',
    ...documents.map((d, i) => `- ${exhibitName(i, d.name)}`),
    '',
    'Pour déposer :',
    `1. Ouvrez Lexius (Services judiciaires numériques) : ${LEXIUS_URL}`,
    '2. Connectez-vous avec votre compte d’avocat (authentification du Barreau et vérification en deux étapes).',
    '3. Choisissez le dossier de cour ou créez la demande, puis joignez les pièces dans l’ordre du bordereau.',
    '4. Vérifiez la cote, le nom et le format de chaque pièce selon les exigences du tribunal avant de soumettre.',
    '',
    'Aide Lexius : 1 833 353-9487 (1 833 3-LEXIUS), du lundi au vendredi, de 8 h 30 à 16 h 30.',
    'BesoinAvocat prépare les fichiers; le dépôt et la validation restent sous la responsabilité de l’avocat.',
    '',
  ].join('\r\n');
}

// Archive ZIP sans compression (les PDF et images le sont déjà), écrite pièce par pièce pour ne garder
// qu'un fichier à la fois en mémoire. entries : [{ name, date, read: () => Buffer }].
export async function writeZip(output, entries) {
  const central = [];
  let offset = 0;
  const put = chunk => new Promise((resolve, reject) => {
    offset += chunk.length;
    if (output.write(chunk)) return resolve();
    const done = () => { output.off('error', fail); resolve(); };
    const fail = error => { output.off('drain', done); reject(error); };
    output.once('drain', done); output.once('error', fail);
  });
  for (const entry of entries) {
    const content = entry.read();
    const name = Buffer.from(entry.name, 'utf8');
    if (offset + content.length + 30 + name.length > ZIP_LIMIT) throw new Error('ZIP_TOO_LARGE');
    const { time, date } = dosDateTime(entry.date);
    const crc = crc32(content) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(20, 6); header.writeUInt16LE(0x0800, 8); header.writeUInt16LE(0, 10);
    header.writeUInt16LE(time, 12); header.writeUInt16LE(date, 14); header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(content.length, 20); header.writeUInt32LE(content.length, 24); header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([header, name]));
    await put(Buffer.concat([local, name]));
    await put(content);
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  await put(directory);
  await put(end);
}

function dosDateTime(iso) {
  const d = new Date(iso || Date.now());
  const year = Math.min(Math.max(d.getUTCFullYear(), 1980), 2107);
  return { time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | Math.floor(d.getUTCSeconds() / 2), date: ((year - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate() };
}
