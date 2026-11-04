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

// Folded (accent- and case-insensitive) copies of page and document text, computed once.
// Pages and documents are immutable (see the triggers in store.mjs and corpus.mjs), so a cached
// row never goes stale. Bump FOLD_VERSION whenever normalizeSearch changes. The cache is filled
// lazily at search time rather than by triggers, so other tools that open the database without the
// ba_fold function can still insert pages.
const FOLD_VERSION = 1;

export function createStructuredSearch({ db, access, audit, publicDocument }) {
  const sql = statement => db.prepare(statement);
  db.function('ba_fold', { deterministic: true }, value => (typeof value === 'string' ? normalizeSearch(value) : ''));
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_folded_pages (tenantId TEXT NOT NULL, caseId TEXT NOT NULL, documentId TEXT NOT NULL,
      ordinal INTEGER NOT NULL, version INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(tenantId,caseId,documentId,ordinal)) STRICT;
    CREATE TABLE IF NOT EXISTS search_folded_documents (tenantId TEXT NOT NULL, caseId TEXT NOT NULL, documentId TEXT NOT NULL,
      version INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(tenantId,caseId,documentId)) STRICT;`);
  sql('DELETE FROM search_folded_pages WHERE version<>?').run(FOLD_VERSION);
  sql('DELETE FROM search_folded_documents WHERE version<>?').run(FOLD_VERSION);
  const fillPages = sql(`INSERT OR IGNORE INTO search_folded_pages SELECT p.tenantId,p.caseId,p.documentId,p.ordinal,${FOLD_VERSION},ba_fold(p.text)
    FROM document_pages p WHERE p.tenantId=? AND NOT EXISTS (SELECT 1 FROM search_folded_pages f
      WHERE f.tenantId=p.tenantId AND f.caseId=p.caseId AND f.documentId=p.documentId AND f.ordinal=p.ordinal)`);
  const fillDocuments = sql(`INSERT OR IGNORE INTO search_folded_documents SELECT d.tenantId,d.caseId,d.id,${FOLD_VERSION},ba_fold(d.extractedText)
    FROM documents d WHERE d.tenantId=? AND NOT EXISTS (SELECT 1 FROM search_folded_documents f
      WHERE f.tenantId=d.tenantId AND f.caseId=d.caseId AND f.documentId=d.id)`);
  // Rows are never deleted, so equal counts mean the cache is complete for this tenant.
  const counts = sql(`SELECT (SELECT COUNT(*) FROM document_pages WHERE tenantId=?1) AS pages,
    (SELECT COUNT(*) FROM search_folded_pages WHERE tenantId=?1) AS foldedPages,
    (SELECT COUNT(*) FROM documents WHERE tenantId=?1) AS documents,
    (SELECT COUNT(*) FROM search_folded_documents WHERE tenantId=?1) AS foldedDocuments`);
  function refreshFolded(tenantId) {
    const count = counts.get(tenantId);
    if (count.pages !== count.foldedPages) fillPages.run(tenantId);
    if (count.documents !== count.foldedDocuments) fillDocuments.run(tenantId);
  }
  // SQL prefilter equivalent to the JavaScript match below: every term must appear in the body or the
  // metadata, and page hits also need one term in the page itself. JavaScript re-checks each row.
  const termClause = `(instr(f.body,?)>0 OR instr(ba_fold(d.name),?)>0 OR instr(ba_fold(d.sourceReference),?)>0 OR instr(ba_fold(COALESCE(i.category,'')),?)>0)`;
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
    refreshFolded(user.tenantId);
    const allTerms = input.terms.map(() => termClause).join(' AND ');
    const anyBody = input.terms.map(() => 'instr(f.body,?)>0').join(' OR ');
    const termParams = input.terms.flatMap(term => [term, term, term, term]);
    const pageRows = sql(`SELECT p.*,f.body AS foldedBody,d.name,d.sourceReference,d.mimeType,d.sha256,c.title AS caseTitle,i.category,i.sourceDocumentId
      FROM document_pages p JOIN documents d ON d.id=p.documentId AND d.tenantId=p.tenantId AND d.caseId=p.caseId
      JOIN search_folded_pages f ON f.tenantId=p.tenantId AND f.caseId=p.caseId AND f.documentId=p.documentId AND f.ordinal=p.ordinal
      ${scoped} AND (${anyBody}) AND ${allTerms} ORDER BY c.id,d.id,p.ordinal`);
    const documentRows = sql(`SELECT d.*,f.body AS foldedBody,c.title AS caseTitle,i.category,i.sourceDocumentId FROM documents d
      JOIN search_folded_documents f ON f.tenantId=d.tenantId AND f.caseId=d.caseId AND f.documentId=d.id
      ${scoped} AND ${allTerms} ORDER BY c.id,d.id`);
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
    for (const row of pageRows.iterate(...params, ...input.terms, ...termParams)) {
      const folded = row.foldedBody, fields = [...metadataFields(row), { source: 'page_text', value: folded }];
      // A metadata-only hit must not fabricate a page citation.
      if (!input.terms.some(term => folded.includes(term)) || !matches(fields)) continue;
      pageMatches.add(row.documentId);
      if (!append(() => ({ ...publicResult(row), excerpt: excerpt(row.text, folded, input.terms), matchSources: matchSources(fields),
        citation: { documentId: row.documentId, sourceDocumentId: row.sourceDocumentId || null, sha256: row.sha256,
          ordinal: row.ordinal, page: row.pageNumber, unitKind: row.mimeType === 'application/pdf' ? 'pdf_page' : 'logical_unit',
          method: row.method, ocrToVerify: /ocr/iu.test(row.method), extractionVerified: false,
          pagesUrl: `/api/cases/${row.caseId}/documents/${row.documentId}/pages?offset=${row.ordinal - 1}&limit=1` } }))) break;
    }
    if (!hasMore) for (const row of documentRows.iterate(...params, ...termParams)) {
      if (pageMatches.has(row.id)) continue;
      const folded = row.foldedBody;
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
