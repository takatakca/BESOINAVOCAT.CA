import { HttpError, identifier, invalid, text } from './validation.mjs';

const STOPWORDS = new Set(('montre montrez moi nous affiche afficher affichez trouve trouver recherche rechercher cherche chercher donne donnez voir je veux voudrais svp stp s il te plait les le la des du de d un une aux au a et avec pour dans sur mon ma mes ce cet cette ces tous toutes quel quelle quels quelles est sont elle on me please show find the of for my').split(' '));
const SINGULAR = new Map(Object.entries({ factures: 'facture', reparations: 'reparation', courriels: 'courriel', messages: 'message', dossiers: 'dossier',
  documents: 'document', contrats: 'contrat', paiements: 'paiement', equipements: 'equipement', photos: 'photo', pieces: 'piece', dommages: 'dommage', baux: 'bail' }));

export function normalizeSearch(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[œŒ]/gu, 'oe').replace(/[æÆ]/gu, 'ae')
    .toLocaleLowerCase('fr').replace(/[’‘]/gu, "'").replace(/\s+/gu, ' ');
}

export function structuredSearchInput(query, options = {}) {
  const normalized = text(query, 'Recherche', 200).trim();
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !['caseId', 'offset', 'limit', 'mode'].includes(key))) throw invalid('Option de recherche invalide.');
  const { caseId = null, offset = 0, limit = 25, mode = 'terms' } = options;
  if (caseId !== null) identifier(caseId);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 50 || !['terms', 'literal'].includes(mode)) throw invalid('Pagination ou mode de recherche invalide.');
  const folded = normalizeSearch(normalized).trim();
  const tokens = folded.match(/[\p{L}\p{N}]+/gu) || [];
  const terms = mode === 'literal' ? [folded] : [...new Set(tokens.filter(token => !STOPWORDS.has(token)).map(token => SINGULAR.get(token) || token))];
  if (!tokens.length || !terms.length || terms.length > 12) throw invalid('Indiquez de 1 à 12 mots utiles à rechercher, par exemple « factures FournisseurDemo ».');
  return { query: normalized, caseId, offset, limit, mode, terms };
}

// Convert a normalized match offset back to the original UTF-16 position.
// This keeps excerpts correct after combining marks, ligatures and whitespace.
function originalOffset(value, target) {
  let original = 0, folded = 0, previousSpace = false;
  for (const point of value) {
    const transformed = normalizeSearch(point);
    for (const char of transformed) {
      if (char === ' ' && previousSpace) continue;
      if (folded >= target) return original;
      folded += char.length;
      previousSpace = char === ' ';
    }
    original += point.length;
  }
  return value.length;
}
function excerpt(value, folded, terms) {
  const positions = terms.map(term => folded.indexOf(term)).filter(index => index >= 0);
  const at = positions.length ? originalOffset(value, Math.min(...positions)) : 0;
  const start = Math.max(0, at - 100), end = Math.min(value.length, at + 320);
  return `${start ? '…' : ''}${value.slice(start, end)}${end < value.length ? '…' : ''}`;
}

export function createStructuredSearch({ db, access, audit, publicDocument }) {
  const sql = statement => db.prepare(statement);
  function searchStructured(user, query, options = {}) {
    const input = structuredSearchInput(query, options);
    if (input.caseId) access(user, input.caseId);
    const scope = sql(`SELECT c.id,c.title FROM cases c JOIN members m ON m.tenantId=c.tenantId AND m.caseId=c.id
      WHERE c.tenantId=? AND m.subject=? AND (? IS NULL OR c.id=?) ORDER BY c.id`).all(user.tenantId, user.subject, input.caseId, input.caseId);
    const params = [user.tenantId, user.subject, input.caseId, input.caseId];
    const scoped = `JOIN cases c ON c.id=d.caseId AND c.tenantId=d.tenantId
      JOIN members m ON m.caseId=d.caseId AND m.tenantId=d.tenantId
      LEFT JOIN document_imports i ON i.documentId=d.id AND i.tenantId=d.tenantId AND i.caseId=d.caseId
      WHERE d.tenantId=? AND m.subject=? AND (? IS NULL OR d.caseId=?)`;
    const pageRows = sql(`SELECT p.*,d.name,d.sourceReference,d.mimeType,d.sha256,c.title AS caseTitle,i.category,i.sourceDocumentId
      FROM document_pages p JOIN documents d ON d.id=p.documentId AND d.tenantId=p.tenantId AND d.caseId=p.caseId
      ${scoped} ORDER BY c.id,d.id,p.ordinal`);
    const documentRows = sql(`SELECT d.*,c.title AS caseTitle,i.category,i.sourceDocumentId FROM documents d ${scoped} ORDER BY c.id,d.id`);
    const results = [], pageMatches = new Set(), publicDocs = new Map();
    let skipped = 0, hasMore = false;
    const matches = fields => input.mode === 'literal' ? fields.some(field => field.value.includes(input.terms[0]))
      : input.terms.every(term => fields.some(field => field.value.includes(term)));
    const matchSources = fields => fields.filter(field => input.terms.some(term => field.value.includes(term))).map(field => field.source);
    const metadataFields = row => [{ source: 'name', value: normalizeSearch(row.name) }, { source: 'reference', value: normalizeSearch(row.sourceReference) },
      { source: 'category', value: normalizeSearch(row.category || '') }];
    const publicResult = row => {
      const id = row.documentId || row.id;
      if (!publicDocs.has(id)) {
        const document = sql('SELECT * FROM documents WHERE tenantId=? AND caseId=? AND id=?').get(user.tenantId, row.caseId, id);
        if (!document) throw new HttpError(404, 'NOT_FOUND', 'Pièce introuvable.');
        publicDocs.set(id, publicDocument(document));
      }
      return { ...publicDocs.get(id), documentId: id, caseId: row.caseId, caseTitle: row.caseTitle };
    };
    const append = produce => {
      if (skipped < input.offset) { skipped++; return true; }
      if (results.length === input.limit) { hasMore = true; return false; }
      results.push(produce()); return true;
    };
    for (const row of pageRows.iterate(...params)) {
      const folded = normalizeSearch(row.text), fields = [...metadataFields(row), { source: 'page_text', value: folded }];
      // A metadata-only hit must not fabricate a page citation.
      if (!input.terms.some(term => folded.includes(term)) || !matches(fields)) continue;
      pageMatches.add(row.documentId);
      if (!append(() => ({ ...publicResult(row), excerpt: excerpt(row.text, folded, input.terms), matchSources: matchSources(fields),
        citation: { documentId: row.documentId, sourceDocumentId: row.sourceDocumentId || null, sha256: row.sha256,
          ordinal: row.ordinal, page: row.pageNumber, unitKind: row.mimeType === 'application/pdf' ? 'pdf_page' : 'logical_unit',
          method: row.method, ocrToVerify: /ocr/iu.test(row.method), extractionVerified: false,
          pagesUrl: `/api/cases/${row.caseId}/documents/${row.documentId}/pages?offset=${row.ordinal - 1}&limit=1` } }))) break;
    }
    if (!hasMore) for (const row of documentRows.iterate(...params)) {
      if (pageMatches.has(row.id)) continue;
      const folded = normalizeSearch(row.extractedText || '');
      const fields = [...metadataFields(row), { source: 'extracted_text', value: folded }];
      if (!matches(fields)) continue;
      if (!append(() => ({ ...publicResult(row), citation: null, matchSources: matchSources(fields),
        excerpt: input.terms.some(term => folded.includes(term)) ? excerpt(row.extractedText, folded, input.terms)
          : 'Correspondance dans le nom, la catégorie ou la référence. Consulter la pièce originale.' }))) break;
    }
    audit(user, input.caseId, 'documents.structured_search', null, { mode: input.mode, resultCount: results.length, offset: input.offset, limit: input.limit, hasMore });
    return { query: input.query, mode: input.mode, terms: input.terms, results, offset: input.offset, limit: input.limit,
      hasMore, nextOffset: hasMore ? input.offset + input.limit : null, scope: { caseIds: scope.map(item => item.id) },
      ai: false, searchedSource: 'indexed_text_and_metadata' };
  }
  return { searchStructured };
}
