import { HttpError, fields, invalid, text } from './validation.mjs';

// Clio Manage (API v4), with the lawyer's own Clio account. From a case, the lawyer creates the client contact and
// the matter in Clio (name and optional email typed by the lawyer, case reference and title as the description),
// then sends the case's approved time entries as Clio time entries, each one exactly once. No document, message or
// note leaves the portal. Off unless the Clio OAuth keys are set (lib/integrations.mjs).
const MANAGERS = ['owner', 'lawyer'];
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/u;
const MAX_EXPORT = 100;
const rejected = () => new HttpError(502, 'PROVIDER_REJECTED', 'Clio a refusé la demande. Vérifiez votre compte Clio.');
const notReady = () => new HttpError(503, 'CLIO_UNAVAILABLE', 'Clio n’est pas configuré sur ce serveur.');
const clioId = value => (Number.isSafeInteger(value) && value > 0 ? value : null);

export function createClio({ db, access, audit, clio, clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function' || !clio) throw new Error('Clio requires db, access, audit and the Clio handle');
  db.exec(`
    CREATE TABLE IF NOT EXISTS clio_matters (
      tenantId TEXT NOT NULL, caseId TEXT NOT NULL, subject TEXT NOT NULL, host TEXT NOT NULL,
      contactId INTEGER NOT NULL, matterId INTEGER NOT NULL, displayNumber TEXT NOT NULL, createdAt TEXT NOT NULL,
      PRIMARY KEY(tenantId,caseId,subject)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS clio_time_exports (
      tenantId TEXT NOT NULL, timeEntryId TEXT NOT NULL, subject TEXT NOT NULL, matterId INTEGER NOT NULL,
      activityId INTEGER, status TEXT NOT NULL CHECK(status IN ('pending','sent')), at TEXT NOT NULL,
      PRIMARY KEY(tenantId,timeEntryId,subject)
    ) STRICT;
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const link = (user, caseId) => sql('SELECT * FROM clio_matters WHERE tenantId=? AND caseId=? AND subject=?').get(user.tenantId, caseId, user.subject);
  const base = () => `https://${clio.host()}/api/v4`;
  const publicLink = row => row ? { matterId: row.matterId, displayNumber: row.displayNumber, url: `https://${row.host}/nc/#/matters/${row.matterId}`, createdAt: row.createdAt } : null;
  const pendingTime = (user, caseId) => sql(`SELECT t.* FROM time_entries t WHERE t.tenantId=? AND t.caseId=? AND t.status='approved'
    AND NOT EXISTS (SELECT 1 FROM clio_time_exports e WHERE e.tenantId=t.tenantId AND e.timeEntryId=t.id AND e.subject=? AND e.status='sent')
    ORDER BY t.approvedAt LIMIT ${MAX_EXPORT}`).all(user.tenantId, caseId, user.subject);

  return {
    ready: () => clio.ready(),
    status(user, caseId) {
      access(user, caseId, MANAGERS);
      const row = link(user, caseId);
      return { configured: clio.ready(), connected: clio.ready() && clio.connected(user), matter: publicLink(row), pendingTime: row ? pendingTime(user, caseId).length : 0 };
    },
    async createMatter(user, caseId, body) {
      const { title } = access(user, caseId, MANAGERS);
      if (!clio.ready()) throw notReady();
      if (link(user, caseId)) throw new HttpError(409, 'ALREADY_LINKED', 'Ce dossier est déjà relié à un dossier Clio.');
      const value = fields(body, ['firstName', 'lastName', 'email'], ['firstName', 'lastName']);
      const firstName = text(value.firstName, 'Prénom', 100).trim(), lastName = text(value.lastName, 'Nom', 100).trim();
      if (!firstName || !lastName) throw invalid('Prénom et nom du client requis.');
      const email = value.email === undefined || value.email === '' ? null : text(value.email, 'Courriel', 254).trim();
      if (email && !EMAIL.test(email)) throw invalid('Courriel invalide.');
      const reference = sql('SELECT reference FROM cases WHERE tenantId=? AND id=?').get(user.tenantId, caseId)?.reference || '';
      const contact = await clio.api(user, `${base()}/contacts.json?fields=id`, { method: 'POST', json: { data: { type: 'Person', first_name: firstName, last_name: lastName,
        ...(email ? { email_addresses: [{ name: 'Work', address: email, default_email: true }] } : {}) } } });
      const contactId = contact.status === 201 ? clioId(contact.body?.data?.id) : null;
      if (!contactId) throw rejected();
      const matter = await clio.api(user, `${base()}/matters.json?fields=id,display_number`, { method: 'POST', json: { data: {
        client: { id: contactId }, description: `${reference ? `${reference} · ` : ''}${title || 'Dossier BesoinAvocat'}`.slice(0, 255), status: 'Open' } } });
      const matterId = matter.status === 201 ? clioId(matter.body?.data?.id) : null;
      if (!matterId) throw rejected();
      const displayNumber = typeof matter.body.data.display_number === 'string' ? matter.body.data.display_number.slice(0, 100) : String(matterId);
      sql('INSERT INTO clio_matters VALUES (?,?,?,?,?,?,?,?)').run(user.tenantId, caseId, user.subject, clio.host(), contactId, matterId, displayNumber, now());
      audit(user, caseId, 'clio.matter_created', null, { matterId, contactId });
      return { matter: publicLink(link(user, caseId)) };
    },
    // Each approved entry is sent once per lawyer: a pending row reserves it, so a retry never doubles it in Clio.
    async exportTime(user, caseId) {
      access(user, caseId, MANAGERS);
      if (!clio.ready()) throw notReady();
      const row = link(user, caseId);
      if (!row) throw new HttpError(409, 'NOT_LINKED', 'Créez d’abord le dossier dans Clio.');
      let sent = 0;
      for (const entry of pendingTime(user, caseId)) {
        const reserved = sql("INSERT OR IGNORE INTO clio_time_exports VALUES (?,?,?,?,NULL,'pending',?)").run(user.tenantId, entry.id, user.subject, row.matterId, now()).changes;
        if (!reserved && sql('SELECT status FROM clio_time_exports WHERE tenantId=? AND timeEntryId=? AND subject=?').get(user.tenantId, entry.id, user.subject)?.status !== 'pending') continue;
        const date = new Date(entry.approvedAt || entry.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
        const response = await clio.api(user, `${base()}/activities.json?fields=id`, { method: 'POST', json: { data: {
          type: 'TimeEntry', date, quantity: entry.minutes * 60, note: entry.description.slice(0, 2000), matter: { id: row.matterId } } } });
        const activityId = response.status === 201 ? clioId(response.body?.data?.id) : null;
        if (!activityId) { sql("DELETE FROM clio_time_exports WHERE tenantId=? AND timeEntryId=? AND subject=? AND status='pending'").run(user.tenantId, entry.id, user.subject); throw rejected(); }
        sql("UPDATE clio_time_exports SET activityId=?, status='sent', at=? WHERE tenantId=? AND timeEntryId=? AND subject=?").run(activityId, now(), user.tenantId, entry.id, user.subject);
        sent++;
      }
      if (sent) audit(user, caseId, 'clio.time_exported', null, { count: sent, matterId: row.matterId });
      return { sent, remaining: pendingTime(user, caseId).length };
    },
  };
}
