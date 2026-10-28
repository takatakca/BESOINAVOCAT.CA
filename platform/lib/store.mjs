import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, realpathSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { HttpError, externalIdentifier, identifier, invalid } from './validation.mjs';
import { createCorpusSupport } from './corpus.mjs';
import { createStructuredSearch } from './search.mjs';

const now = () => new Date().toISOString();
const digest = value => createHash('sha256').update(value).digest('hex');
const missing = () => new HttpError(404, 'NOT_FOUND', 'Élément introuvable ou non accessible.');
const ROLES = ['owner', 'lawyer', 'client'];

// Node 24 DatabaseSync/prepare API. Synchronous local pilot, not a distributed DB.
// SQL LIKE is a literal, escaped substring search; no relevance, OCR or embeddings.
export function createStore({ dbPath, blobDir }) {
  if (typeof dbPath !== 'string' || typeof blobDir !== 'string' || !blobDir) throw new Error('dbPath and blobDir are required');
  if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true, mode: 0o700 });
  mkdirSync(resolve(blobDir), { recursive: true, mode: 0o700 });
  const blobRoot = realpathSync(resolve(blobDir));
  const db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true, enableDoubleQuotedStringLiterals: false, allowExtension: false, timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, title TEXT NOT NULL, reference TEXT NOT NULL,
      createdAt TEXT NOT NULL, createdBy TEXT NOT NULL, UNIQUE(tenantId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS members (
      tenantId TEXT NOT NULL, caseId TEXT NOT NULL, subject TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','lawyer','client')),
      PRIMARY KEY(tenantId,caseId,subject), FOREIGN KEY(tenantId,caseId) REFERENCES cases(tenantId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      rootDocumentId TEXT NOT NULL, versionOf TEXT, versionNumber INTEGER NOT NULL CHECK(versionNumber>0),
      name TEXT NOT NULL, mimeType TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL CHECK(bytes>0),
      sourceType TEXT NOT NULL CHECK(sourceType IN ('original','declaration','analyse','ocr')),
      sourceReference TEXT NOT NULL, extractedText TEXT NOT NULL,
      reviewStatus TEXT NOT NULL CHECK(reviewStatus IN ('a_verifier','controle_visuel')),
      createdAt TEXT NOT NULL, createdBy TEXT NOT NULL,
      UNIQUE(tenantId,caseId,id), UNIQUE(tenantId,caseId,rootDocumentId,versionNumber),
      FOREIGN KEY(tenantId,caseId) REFERENCES cases(tenantId,id),
      FOREIGN KEY(tenantId,caseId,versionOf) REFERENCES documents(tenantId,caseId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      authorSubject TEXT NOT NULL, body TEXT NOT NULL, createdAt TEXT NOT NULL,
      FOREIGN KEY(tenantId,caseId) REFERENCES cases(tenantId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      authorSubject TEXT NOT NULL, description TEXT NOT NULL, minutes INTEGER NOT NULL CHECK(minutes BETWEEN 1 AND 1440),
      status TEXT NOT NULL CHECK(status IN ('submitted','approved')), createdAt TEXT NOT NULL,
      approvedAt TEXT, approvedBy TEXT,
      CHECK((status='submitted' AND approvedAt IS NULL AND approvedBy IS NULL) OR
            (status='approved' AND approvedAt IS NOT NULL AND approvedBy IS NOT NULL)),
      FOREIGN KEY(tenantId,caseId) REFERENCES cases(tenantId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, subject TEXT NOT NULL, caseId TEXT,
      action TEXT NOT NULL, targetId TEXT, createdAt TEXT NOT NULL, details TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS documents_case ON documents(tenantId,caseId,createdAt);
    CREATE INDEX IF NOT EXISTS documents_same_content ON documents(tenantId,caseId,sha256);
    CREATE INDEX IF NOT EXISTS messages_case ON messages(tenantId,caseId,createdAt);
    CREATE INDEX IF NOT EXISTS time_case ON time_entries(tenantId,caseId,createdAt);
    CREATE TRIGGER IF NOT EXISTS immutable_document_update BEFORE UPDATE ON documents BEGIN SELECT RAISE(ABORT,'document_versions_are_immutable'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_document_delete BEFORE DELETE ON documents BEGIN SELECT RAISE(ABORT,'document_versions_are_immutable'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_audit_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'audit_is_append_only'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_audit_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT,'audit_is_append_only'); END;
  `);
  const sql = statement => db.prepare(statement);
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  function audit(user, caseId, action, targetId = null, details = {}) {
    sql('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(), user.tenantId, user.subject, caseId, action, targetId, now(), JSON.stringify(details));
  }
  function access(user, caseId, allowed = ROLES) {
    identifier(caseId);
    const row = sql(`SELECT c.*,m.role FROM cases c JOIN members m ON c.tenantId=m.tenantId AND c.id=m.caseId
      WHERE c.id=? AND c.tenantId=? AND m.subject=?`).get(caseId, user.tenantId, user.subject);
    if (!row) { audit(user, caseId, 'access.denied'); throw missing(); }
    if (!allowed.includes(row.role)) { audit(user, caseId, 'role.denied'); throw new HttpError(403, 'FORBIDDEN', 'Votre rôle ne permet pas cette action.'); }
    return row;
  }
  function publicCase(row) {
    return { id: row.id, title: row.title, reference: row.reference, createdAt: row.createdAt, createdBy: row.createdBy, role: row.role };
  }
  let corpus;
  function publicDocument(row) {
    const { tenantId, extractedText, ...rest } = row;
    const sameContent = sql('SELECT id FROM documents WHERE tenantId=? AND caseId=? AND sha256=? ORDER BY rowid').all(row.tenantId, row.caseId, row.sha256).map(item => item.id);
    return { ...rest, downloadUrl: `/api/cases/${row.caseId}/documents/${row.id}/download`,
      extractionMethod: extractedText ? 'user_supplied' : 'none', extractionVerified: false,
      reviewAssertedBy: row.createdBy, reviewIsCertification: false,
      duplicateOf: sameContent[0] === row.id ? null : (sameContent[0] || null),
      sameHashDocumentIds: sameContent.filter(id => id !== row.id),
      deduplicationScope: 'same_bytes_in_this_case_only', ...corpus.metadata(row) };
  }
  const publicRow = row => { const { tenantId, ...value } = row; return value; };
  function filePath(tenantId, sha256, create = false) {
    if (!/^[0-9a-f]{64}$/u.test(sha256)) throw new Error('Invalid stored SHA');
    const tenantRoot = join(blobRoot, digest(tenantId));
    if (create) mkdirSync(tenantRoot, { recursive: true, mode: 0o700 });
    const stat = lstatSync(tenantRoot);
    if (stat.isSymbolicLink() || !stat.isDirectory() || realpathSync(tenantRoot) !== tenantRoot) throw new Error('Unsafe blob directory');
    const path = join(tenantRoot, sha256);
    try { if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) throw new Error('Unsafe blob file'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return path;
  }
  function putBlob(tenantId, data, hash) {
    const path = filePath(tenantId, hash, true);
    try { writeFileSync(path, data, { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const stored = readFileSync(path);
    if (stored.length !== data.length || digest(stored) !== hash) throw new Error('Stored blob integrity failure');
  }
  corpus = createCorpusSupport({ db, access, audit, putBlob, publicDocument });
  const structuredSearch = createStructuredSearch({ db, access, audit, publicDocument });
  let closed = false;
  return {
    db, access, audit, documentPages: corpus.documentPages, importCorpus: corpus.importCorpus, searchStructured: structuredSearch.searchStructured,
    close() { if (!closed) { db.close(); closed = true; } },
    // Trusted deployment/test operation only. It is deliberately NOT an HTTP route.
    provisionMembership({ tenantId, caseId, subject, role }) {
      if (!externalIdentifier(tenantId) || !externalIdentifier(subject) || !ROLES.includes(role)) throw invalid();
      identifier(caseId);
      if (!sql('SELECT id FROM cases WHERE tenantId=? AND id=?').get(tenantId, caseId)) throw missing();
      return transaction(() => {
        sql(`INSERT INTO members VALUES (?,?,?,?) ON CONFLICT(tenantId,caseId,subject) DO UPDATE SET role=excluded.role`).run(tenantId, caseId, subject, role);
        audit({ tenantId, subject: 'system:membership-provision' }, caseId, 'membership.provisioned', subject, { role });
      });
    },
    listCases(user) {
      return sql(`SELECT c.*,m.role FROM cases c JOIN members m ON c.tenantId=m.tenantId AND c.id=m.caseId
        WHERE c.tenantId=? AND m.subject=? ORDER BY c.createdAt,c.id`).all(user.tenantId, user.subject).map(publicCase);
    },
    createCase(user, value) {
      return transaction(() => {
        const id = randomUUID(), createdAt = now();
        sql('INSERT INTO cases VALUES (?,?,?,?,?,?)').run(id, user.tenantId, value.title, value.reference, createdAt, user.subject);
        sql('INSERT INTO members VALUES (?,?,?,?)').run(user.tenantId, id, user.subject, 'client');
        audit(user, id, 'case.created', id);
        return { id, title: value.title, reference: value.reference, createdAt, createdBy: user.subject, role: 'client' };
      });
    },
    details(user, caseId) {
      const item = access(user, caseId);
      const args = [user.tenantId, caseId];
      const documents = sql('SELECT * FROM documents WHERE tenantId=? AND caseId=? ORDER BY createdAt,id').all(...args).map(publicDocument);
      const messages = sql('SELECT * FROM messages WHERE tenantId=? AND caseId=? ORDER BY createdAt,id').all(...args).map(publicRow);
      const timeEntries = sql('SELECT * FROM time_entries WHERE tenantId=? AND caseId=? ORDER BY createdAt,id').all(...args).map(publicRow);
      audit(user, caseId, 'case.read', caseId);
      return { case: publicCase(item), documents, messages, timeEntries };
    },
    addDocument(user, caseId, value) {
      access(user, caseId);
      return transaction(() => {
        let previous = null;
        if (value.versionOf) {
          previous = sql('SELECT * FROM documents WHERE id=? AND tenantId=? AND caseId=?').get(value.versionOf, user.tenantId, caseId);
          if (!previous) throw missing();
          const latest = sql('SELECT MAX(versionNumber) AS n FROM documents WHERE tenantId=? AND caseId=? AND rootDocumentId=?').get(user.tenantId, caseId, previous.rootDocumentId);
          if (latest.n !== previous.versionNumber) throw new HttpError(409, 'VERSION_CONFLICT', 'Une version plus récente existe déjà.');
        }
        const id = randomUUID(), hash = digest(value.bytes), createdAt = now();
        corpus.checkQuota(user, caseId, value.bytes.length, hash);
        putBlob(user.tenantId, value.bytes, hash);
        sql('INSERT INTO documents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
          id, user.tenantId, caseId, previous?.rootDocumentId || id, value.versionOf,
          previous ? previous.versionNumber + 1 : 1, value.name, value.mimeType, hash, value.bytes.length,
          value.sourceType, value.sourceReference, value.extractedText, value.reviewStatus, createdAt, user.subject,
        );
        audit(user, caseId, 'document.version_added', id, { sha256: hash, versionOf: value.versionOf, reviewStatus: value.reviewStatus });
        return publicDocument(sql('SELECT * FROM documents WHERE id=? AND tenantId=? AND caseId=?').get(id, user.tenantId, caseId));
      });
    },
    download(user, caseId, documentId) {
      access(user, caseId); identifier(documentId);
      const row = sql('SELECT * FROM documents WHERE id=? AND tenantId=? AND caseId=?').get(documentId, user.tenantId, caseId);
      if (!row) throw missing();
      const content = readFileSync(filePath(user.tenantId, row.sha256));
      if (content.length !== row.bytes || digest(content) !== row.sha256) throw new HttpError(409, 'INTEGRITY_ERROR', 'Le contrôle d’intégrité du fichier a échoué.');
      audit(user, caseId, 'document.downloaded', documentId, { sha256: row.sha256 });
      return { document: publicDocument(row), content };
    },
    search(user, caseId, query) { return corpus.searchPages(user, caseId, query); },
    addMessage(user, caseId, body) {
      access(user, caseId);
      return transaction(() => {
        const id = randomUUID(), createdAt = now();
        sql('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(id, user.tenantId, caseId, user.subject, body, createdAt);
        audit(user, caseId, 'message.created', id);
        return { id, caseId, body, authorSubject: user.subject, createdAt };
      });
    },
    submitTime(user, caseId, { description, minutes }) {
      access(user, caseId);
      return transaction(() => {
        const id = randomUUID(), createdAt = now();
        sql('INSERT INTO time_entries VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, user.tenantId, caseId, user.subject, description, minutes, 'submitted', createdAt, null, null);
        audit(user, caseId, 'time.submitted', id, { minutes });
        return publicRow(sql('SELECT * FROM time_entries WHERE id=? AND tenantId=? AND caseId=?').get(id, user.tenantId, caseId));
      });
    },
    approveTime(user, caseId, timeId) {
      access(user, caseId, ['owner', 'lawyer']); identifier(timeId);
      return transaction(() => {
        const row = sql('SELECT * FROM time_entries WHERE id=? AND tenantId=? AND caseId=?').get(timeId, user.tenantId, caseId);
        if (!row) throw missing();
        if (row.authorSubject === user.subject) throw new HttpError(403, 'SELF_APPROVAL_FORBIDDEN', 'Une autre personne habilitée doit valider cette déclaration.');
        if (row.status !== 'submitted') throw new HttpError(409, 'ALREADY_APPROVED', 'Cette déclaration de temps est déjà validée.');
        sql("UPDATE time_entries SET status='approved',approvedAt=?,approvedBy=? WHERE id=? AND tenantId=? AND caseId=? AND status='submitted'").run(now(), user.subject, timeId, user.tenantId, caseId);
        audit(user, caseId, 'time.approved', timeId, { minutes: row.minutes, authorSubject: row.authorSubject });
        return publicRow(sql('SELECT * FROM time_entries WHERE id=? AND tenantId=? AND caseId=?').get(timeId, user.tenantId, caseId));
      });
    },
    listAudit(user, caseId) {
      access(user, caseId, ['owner', 'lawyer']);
      audit(user, caseId, 'audit.read', caseId);
      return sql('SELECT * FROM audit_events WHERE tenantId=? AND caseId=? ORDER BY createdAt,id').all(user.tenantId, caseId).map(row => ({ ...publicRow(row), details: JSON.parse(row.details) }));
    },
  };
}
