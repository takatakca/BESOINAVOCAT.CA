export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function configuredLimit(name, fallback, maximum) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (!/^[0-9]+$/u.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1024 || Number(value) > maximum) throw new Error(`Invalid ${name}`);
  return Number(value);
}
export const MAX_DOCUMENT_BYTES = configuredLimit('BA_MAX_DOCUMENT_BYTES',64*1024*1024,128*1024*1024);
export const CASE_STORAGE_QUOTA_BYTES = configuredLimit('BA_CASE_STORAGE_QUOTA_BYTES',1024*1024*1024,10*1024*1024*1024);
export const MAX_DOCUMENT_JSON_BYTES = 4*Math.ceil(MAX_DOCUMENT_BYTES/3)+1024*1024;
export const MIME_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
  'text/plain', 'text/csv', 'application/json', 'message/rfc822',
  'application/msword', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Presentations built in the portal from the case's images (PowerPoint, Keynote, LibreOffice).
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Video and voice messages recorded in the portal, or sent by the client. HTML stays refused.
  'video/webm', 'video/mp4', 'audio/webm', 'audio/mp4', 'audio/mpeg',
]);

export function invalid(message = 'Les données transmises sont invalides.') {
  return new HttpError(400, 'INVALID_INPUT', message);
}

export function fields(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !allowed.includes(key)) ||
      required.some(key => !Object.hasOwn(value, key))) throw invalid();
  return value;
}

export function text(value, label, max, { optional = false, multiline = false } = {}) {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string' || value.length > max || !value.isWellFormed()) throw invalid(`${label} est invalide.`);
  const controls = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u;
  if (controls.test(value) || (!optional && !value.trim())) throw invalid(`${label} est invalide.`);
  return value;
}

export function identifier(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw invalid('Identifiant invalide.');
  }
  return value;
}

export function externalIdentifier(value) {
  return typeof value === 'string' && value.isWellFormed() && value.length >= 1 && value.length <= 200 &&
    value === value.trim() && !/[\s\u0000-\u001f\u007f]/u.test(value);
}

export function caseInput(body) {
  fields(body, ['title', 'reference'], ['title']);
  return { title: text(body.title, 'Titre', 240).trim(), reference: text(body.reference, 'Référence', 120, { optional: true }).trim() };
}

export function documentInput(body) {
  fields(body, ['name', 'mimeType', 'contentBase64', 'sourceType', 'sourceReference', 'extractedText', 'reviewStatus', 'versionOf'],
    ['name', 'mimeType', 'contentBase64', 'sourceType', 'reviewStatus']);
  const name = text(body.name, 'Nom du fichier', 240).trim();
  if (/[\\/:<>"|?*]/u.test(name) || /^\.+$/u.test(name) || name.endsWith('.')) throw invalid('Nom du fichier invalide.');
  if (!MIME_TYPES.has(body.mimeType)) throw invalid('Type de fichier non pris en charge.');
  if (!['original', 'declaration', 'analyse', 'ocr'].includes(body.sourceType)) throw invalid('Provenance invalide.');
  if (!['a_verifier', 'controle_visuel'].includes(body.reviewStatus)) throw invalid('État de lecture invalide.');
  const encoded = body.contentBase64;
  if (typeof encoded !== 'string' || encoded.length === 0) throw invalid('Contenu du fichier absent.');
  if (encoded.length > 4 * Math.ceil(MAX_DOCUMENT_BYTES / 3)) throw new HttpError(413, 'FILE_TOO_LARGE', 'Le fichier dépasse la limite configurée.');
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded)) throw invalid('Encodage base64 invalide.');
  // Canonical padding requires unused low bits to be zero. Check the last
  // sextet instead of allocating a second full-size base64 string.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  if ((encoded.endsWith('==') && (alphabet.indexOf(encoded.at(-3)) & 15) !== 0) ||
      (encoded.endsWith('=') && !encoded.endsWith('==') && (alphabet.indexOf(encoded.at(-2)) & 3) !== 0)) throw invalid('Encodage base64 non canonique.');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length) throw invalid('Encodage base64 non canonique.');
  if (bytes.length > MAX_DOCUMENT_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE', 'Le fichier dépasse la limite configurée.');
  return {
    name, mimeType: body.mimeType, bytes, sourceType: body.sourceType,
    sourceReference: text(body.sourceReference, 'Référence de provenance', 2048, { optional: true }),
    extractedText: text(body.extractedText, 'Texte extrait', 200000, { optional: true, multiline: true }),
    reviewStatus: body.reviewStatus,
    versionOf: body.versionOf === undefined ? null : identifier(body.versionOf),
  };
}

export async function readJson(req, limit = 128 * 1024, { allowEmpty = false } = {}) {
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new HttpError(415, 'UNSUPPORTED_ENCODING', 'Les corps compressés ne sont pas acceptés.');
  }
  const type = req.headers['content-type'] || '';
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/u.test(length) || Number(length) > limit)) {
    throw new HttpError(413, 'BODY_TOO_LARGE', 'La requête est trop volumineuse.');
  }
  if (!(allowEmpty && (!length || length === '0')) && !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(type)) {
    throw new HttpError(415, 'JSON_REQUIRED', 'Un corps application/json est requis.');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'BODY_TOO_LARGE', 'La requête est trop volumineuse.');
    chunks.push(chunk);
  }
  if (size === 0 && allowEmpty) return {};
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(type)) throw new HttpError(415, 'JSON_REQUIRED', 'Un corps application/json est requis.');
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
    return value;
  } catch {
    throw invalid('Le corps JSON est invalide.');
  }
}
