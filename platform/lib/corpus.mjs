import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { HttpError, invalid, identifier, externalIdentifier, MAX_DOCUMENT_BYTES, CASE_STORAGE_QUOTA_BYTES } from './validation.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/u;
const fold = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
export function createCorpusSupport({ db, access, audit, putBlob, publicDocument }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_imports (
      tenantId TEXT NOT NULL, caseId TEXT NOT NULL, corpusSha256 TEXT NOT NULL,
      sourceDocumentId TEXT NOT NULL, documentId TEXT NOT NULL, category TEXT NOT NULL, metadataJson TEXT NOT NULL,
      PRIMARY KEY(tenantId,caseId,corpusSha256,sourceDocumentId), UNIQUE(documentId),
      FOREIGN KEY(tenantId,caseId,documentId) REFERENCES documents(tenantId,caseId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS document_pages (
      tenantId TEXT NOT NULL, caseId TEXT NOT NULL, documentId TEXT NOT NULL,
      ordinal INTEGER NOT NULL CHECK(ordinal>0), pageNumber INTEGER, text TEXT NOT NULL, method TEXT NOT NULL, metadataJson TEXT NOT NULL,
      PRIMARY KEY(tenantId,caseId,documentId,ordinal),
      FOREIGN KEY(tenantId,caseId,documentId) REFERENCES documents(tenantId,caseId,id)
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS immutable_import_update BEFORE UPDATE ON document_imports BEGIN SELECT RAISE(ABORT,'import_sources_are_immutable'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_import_delete BEFORE DELETE ON document_imports BEGIN SELECT RAISE(ABORT,'import_sources_are_immutable'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_page_update BEFORE UPDATE ON document_pages BEGIN SELECT RAISE(ABORT,'import_pages_are_immutable'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_page_delete BEFORE DELETE ON document_pages BEGIN SELECT RAISE(ABORT,'import_pages_are_immutable'); END;
  `);
  const sql = statement => db.prepare(statement);
  function usedBytes(user, caseId) {
    return sql('SELECT COALESCE(SUM(bytes),0) AS n FROM (SELECT sha256,MAX(bytes) AS bytes FROM documents WHERE tenantId=? AND caseId=? GROUP BY sha256)').get(user.tenantId, caseId).n;
  }
  function checkQuota(user, caseId, bytes, hash) {
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_DOCUMENT_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE', 'Le fichier dépasse la limite configurée.');
    const duplicate = sql('SELECT id FROM documents WHERE tenantId=? AND caseId=? AND sha256=? LIMIT 1').get(user.tenantId, caseId, hash);
    if (!duplicate && usedBytes(user, caseId) + bytes > CASE_STORAGE_QUOTA_BYTES) throw new HttpError(413, 'CASE_QUOTA_EXCEEDED', 'Le quota de stockage du dossier est dépassé.');
  }
  function source(row) { return sql('SELECT * FROM document_imports WHERE tenantId=? AND caseId=? AND documentId=?').get(row.tenantId, row.caseId, row.id); }
  function metadata(row) {
    const item = source(row);
    if (!item) return {};
    const value = JSON.parse(item.metadataJson);
    return { category: item.category, sourceDocumentId: item.sourceDocumentId, sourceCorpusSha256: item.corpusSha256,
      pageCount: sql('SELECT COUNT(*) AS n FROM document_pages WHERE tenantId=? AND caseId=? AND documentId=?').get(row.tenantId,row.caseId,row.id).n,
      sourceNature: value.source_nature || null, sourceNatureCode: value.source_nature_code || null,
      extractionStatus: value.extraction_status || null, sourceReference: value.path,
      missingTextPages: value.missing_text_pages_unresolved || [], ocrPagesToVerify: value.ocr_pages_to_verify || [],
      lowTextPagesToVerify: value.low_text_pages_to_verify || [], extractionMethod: 'corpus_import', extractionVerified: false };
  }
  function documentPages(user, caseId, documentId, { offset = 0, limit = 5 } = {}) {
    access(user, caseId); identifier(documentId);
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 10) throw invalid('Pagination invalide.');
    const doc = sql('SELECT * FROM documents WHERE tenantId=? AND caseId=? AND id=?').get(user.tenantId,caseId,documentId);
    if (!doc) throw new HttpError(404,'NOT_FOUND','Pièce introuvable.');
    const item = source(doc);
    const pages = sql('SELECT * FROM document_pages WHERE tenantId=? AND caseId=? AND documentId=? ORDER BY ordinal LIMIT ? OFFSET ?').all(user.tenantId,caseId,documentId,limit,offset);
    audit(user,caseId,'document.pages_read',documentId,{offset,limit});
    return { document: publicDocument(doc), source: item ? JSON.parse(item.metadataJson) : null, offset,
      pages: pages.map(page => ({ ...JSON.parse(page.metadataJson), ordinal: page.ordinal, page: page.pageNumber, text: page.text, method: page.method, extractionVerified: false })) };
  }
  function searchPages(user, caseId, query) {
    access(user,caseId);
    const needle = fold(query), results = [];
    for (const row of sql('SELECT p.*,d.name,d.sourceReference,d.sha256 FROM document_pages p JOIN documents d ON p.documentId=d.id AND p.tenantId=d.tenantId AND p.caseId=d.caseId WHERE p.tenantId=? AND p.caseId=? ORDER BY p.documentId,p.ordinal').iterate(user.tenantId,caseId)) {
      const haystack = fold(row.text), at = haystack.indexOf(needle);
      if (at < 0) continue;
      const doc = sql('SELECT * FROM documents WHERE id=? AND tenantId=? AND caseId=?').get(row.documentId,user.tenantId,caseId);
      const pageMetadata = JSON.parse(row.metadataJson);
      results.push({ ...publicDocument(doc), excerpt: row.text.slice(Math.max(0,at-100),at+320),
        citation: { documentId: doc.id, sourceDocumentId: source(doc)?.sourceDocumentId || null, sha256: doc.sha256,
          ordinal: row.ordinal, page: row.pageNumber, label: pageMetadata.label || null, method: row.method,
          ocrToVerify: /ocr/i.test(row.method), extractionVerified: false }, pageMetadata });
      if (results.length === 100) break;
    }
    // Documents without matching page text remain findable by name/reference,
    // including image-only pieces. No fabricated page citation is returned.
    const seen = new Set(results.map(item => item.id));
    for (const row of sql('SELECT * FROM documents WHERE tenantId=? AND caseId=? ORDER BY createdAt,id').iterate(user.tenantId,caseId)) {
      if (results.length === 100) break;
      if (seen.has(row.id)) continue;
      const item = source(row);
      const searchable = `${row.name}\n${row.sourceReference}\n${item?.category || ''}\n${item ? '' : row.extractedText}`;
      if (!fold(searchable).includes(needle)) continue;
      results.push({ ...publicDocument(row), excerpt: item ? 'Correspondance dans le nom, la catégorie ou la référence. Consulter le fichier.' : row.extractedText.slice(0,320), citation: null });
    }
    audit(user,caseId,'documents.searched',null,{resultCount:results.length,limit:100});
    return results;
  }
  // Operator-only local CLI. No HTTP route calls this method or creates roles.
  function importCorpus(user, caseId, plan, { createCase = null } = {}) {
    if (!externalIdentifier(user.tenantId) || !externalIdentifier(user.subject)) throw invalid('Identité de destination invalide.');
    identifier(caseId);
    if (!hashPattern.test(plan.corpusSha256) || !Array.isArray(plan.documents) || !plan.documents.length) throw invalid('Plan invalide.');
    const keys = new Set();
    for (const doc of plan.documents) {
      if (!doc.sourceId || keys.has(doc.sourceId) || !hashPattern.test(doc.sha256) || !Array.isArray(doc.pages)) throw invalid('Documents d’import invalides ou identifiants répétés.');
      keys.add(doc.sourceId);
    }
    let imported = 0, skipped = 0, pages = 0;
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!sql('SELECT id FROM cases WHERE id=? AND tenantId=?').get(caseId,user.tenantId)) {
        if (!createCase || typeof createCase.title !== 'string' || !createCase.title.trim() || createCase.title.length > 240) throw invalid('Le dossier de destination doit exister ou être créé explicitement.');
        sql('INSERT INTO cases VALUES (?,?,?,?,?,?)').run(caseId,user.tenantId,createCase.title,createCase.reference || '',new Date().toISOString(),user.subject);
        sql('INSERT INTO members VALUES (?,?,?,?)').run(user.tenantId,caseId,user.subject,'client');
        audit(user,caseId,'case.created_by_import',caseId);
      }
      access(user,caseId);
      for (const value of plan.documents) {
        const previous = sql('SELECT documentId FROM document_imports WHERE tenantId=? AND caseId=? AND corpusSha256=? AND sourceDocumentId=?').get(user.tenantId,caseId,plan.corpusSha256,value.sourceId);
        if (previous) {
          const doc = sql('SELECT sha256,bytes FROM documents WHERE id=?').get(previous.documentId);
          if (doc.sha256 !== value.sha256 || doc.bytes !== value.bytes) throw invalid('Un import existant ne correspond pas au plan.');
          skipped++; continue;
        }
        checkQuota(user,caseId,value.bytes,value.sha256);
        const bytes = readFileSync(value.absolutePath);
        if (bytes.length !== value.bytes || sha(bytes) !== value.sha256) throw invalid('La pièce a changé après le contrôle du plan.');
        putBlob(user.tenantId,bytes,value.sha256);
        const id=randomUUID(),createdAt=new Date().toISOString();
        sql('INSERT INTO documents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user.tenantId,caseId,id,null,1,value.name,value.mimeType,value.sha256,value.bytes,value.sourceType,value.metadata.path,'','a_verifier',createdAt,user.subject);
        sql('INSERT INTO document_imports VALUES (?,?,?,?,?,?,?)').run(user.tenantId,caseId,plan.corpusSha256,value.sourceId,id,value.category,JSON.stringify(value.metadata));
        for (const [index,page] of value.pages.entries()) {
          const {text='', ...pageMetadata}=page;
          sql('INSERT INTO document_pages VALUES (?,?,?,?,?,?,?,?)').run(user.tenantId,caseId,id,index+1,Number.isSafeInteger(page.page)?page.page:null,text,page.method || '',JSON.stringify(pageMetadata));
          pages++;
        }
        audit(user,caseId,'document.corpus_imported',id,{sha256:value.sha256,corpusSha256:plan.corpusSha256,sourceDocumentId:value.sourceId});
        imported++;
      }
      db.exec('COMMIT');
      return {caseId,corpusSha256:plan.corpusSha256,imported,skipped,pages,usedBytes:usedBytes(user,caseId)};
    } catch(error) {db.exec('ROLLBACK');throw error;}
  }
  return { metadata,checkQuota,documentPages,searchPages,importCorpus };
}
