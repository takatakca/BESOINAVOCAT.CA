import { randomUUID } from 'node:crypto';
import { DOMAINS } from './catalog.mjs';
import { HttpError, fields, identifier, invalid, text } from './validation.mjs';

// Du dossier préparé à l'avocat qui l'accepte (D-036).
//
// Positionnement du propriétaire (D-035) : « la personne prépare son dossier sur la plateforme; un avocat du domaine
// connexe voit un dossier déjà prêt et l'accepte; les conditions du mandat se conviennent ensuite entre eux ».
// Chaque dossier porte donc un profil : le domaine de droit (catalogue de la demande guidée, catalog.mjs), un
// résumé en langage courant et un état — « preparation » (la personne rassemble ses pièces), « pret » (elle
// l'offre aux avocats de ce domaine) ou « accepte » (un avocat l'a pris; il est membre du dossier avec le rôle
// avocat). Tant que le dossier n'est pas prêt, aucun avocat ne le voit. Un avocat ne voit jamais les pièces d'un
// dossier prêt avant de l'accepter : seulement le titre, le domaine, le résumé et le nombre de pièces. Rien ici ne
// garantit qu'un avocat accepte ni dans quel délai; l'écran le dit.
const STATUSES = ['preparation', 'pret', 'accepte'];
const DOMAIN_IDS = new Set(DOMAINS.map(d => d.id));
const DOMAIN_LABELS = Object.fromEntries(DOMAINS.map(d => [d.id, d.label.fr]));
const MAX_SUMMARY = 1500;
const MEMBER_ROLES = ['owner', 'lawyer', 'client'];

export const CASE_DOMAINS = Object.freeze(DOMAINS.map(d => Object.freeze({ id: d.id, label: d.label.fr })));
export function validDomains(value, { optional = true } = {}) {
  if (value === undefined && optional) return [];
  if (!Array.isArray(value) || value.length > DOMAINS.length || value.some(item => typeof item !== 'string' || !DOMAIN_IDS.has(item))) throw invalid('Domaines de pratique invalides.');
  return [...new Set(value)];
}

export function createCaseMatching({ db, access, audit, clock = Date.now }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS case_profiles (
      tenantId TEXT NOT NULL, caseId TEXT NOT NULL, domain TEXT, summary TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'preparation' CHECK(status IN ('preparation','pret','accepte')),
      readyAt TEXT, acceptedBy TEXT, acceptedAt TEXT, updatedAt TEXT NOT NULL,
      PRIMARY KEY(tenantId,caseId), FOREIGN KEY(tenantId,caseId) REFERENCES cases(tenantId,id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS case_profiles_ready ON case_profiles(tenantId,status,domain,readyAt);
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const EMPTY = Object.freeze({ domain: null, domainLabel: null, summary: '', status: 'preparation', readyAt: null, acceptedBy: null, acceptedAt: null });
  const publicProfile = row => (row ? { domain: row.domain, domainLabel: row.domain ? DOMAIN_LABELS[row.domain] ?? null : null, summary: row.summary, status: row.status, readyAt: row.readyAt, acceptedBy: row.acceptedBy, acceptedAt: row.acceptedAt } : { ...EMPTY });
  const rowOf = (tenantId, caseId) => sql('SELECT * FROM case_profiles WHERE tenantId=? AND caseId=?').get(tenantId, caseId) ?? null;
  const upsert = (tenantId, caseId, patch) => {
    const current = rowOf(tenantId, caseId) ?? { domain: null, summary: '', status: 'preparation', readyAt: null, acceptedBy: null, acceptedAt: null };
    const next = { ...current, ...patch, updatedAt: now() };
    sql(`INSERT INTO case_profiles (tenantId,caseId,domain,summary,status,readyAt,acceptedBy,acceptedAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(tenantId,caseId) DO UPDATE SET domain=excluded.domain,summary=excluded.summary,status=excluded.status,readyAt=excluded.readyAt,acceptedBy=excluded.acceptedBy,acceptedAt=excluded.acceptedAt,updatedAt=excluded.updatedAt`)
      .run(tenantId, caseId, next.domain, next.summary, next.status, next.readyAt, next.acceptedBy, next.acceptedAt, next.updatedAt);
    return publicProfile(rowOf(tenantId, caseId));
  };
  function profileInput(body) {
    fields(body, ['domain', 'summary'], []);
    const patch = {};
    if (body.domain !== undefined) {
      if (body.domain !== null && (typeof body.domain !== 'string' || !DOMAIN_IDS.has(body.domain))) throw invalid('Domaine de droit inconnu.');
      patch.domain = body.domain;
    }
    if (body.summary !== undefined) patch.summary = text(body.summary, 'Résumé', MAX_SUMMARY, { optional: true, multiline: true }).trim();
    return patch;
  }

  return {
    domains: CASE_DOMAINS,
    statuses: STATUSES,
    profile(user, caseId) { access(user, caseId); return publicProfile(rowOf(user.tenantId, caseId)); },
    // Ajoute `profile` à chaque dossier d'une liste déjà filtrée par l'accès de la personne.
    decorate(tenantId, cases) {
      return cases.map(item => ({ ...item, profile: publicProfile(rowOf(tenantId, item.id)) }));
    },
    // Domaine et résumé : toute personne membre du dossier peut les préciser. Un dossier accepté garde son domaine.
    setProfile(user, caseId, body) {
      access(user, caseId, MEMBER_ROLES);
      const patch = profileInput(body);
      if (!Object.keys(patch).length) throw invalid('Rien à modifier.');
      const current = rowOf(user.tenantId, caseId);
      if (current?.status === 'accepte' && 'domain' in patch && patch.domain !== current.domain) throw new HttpError(409, 'CASE_ACCEPTED', 'Le dossier a été accepté par un avocat : son domaine ne change plus.');
      return transaction(() => {
        const profile = upsert(user.tenantId, caseId, patch);
        audit(user, caseId, 'case.profile_updated', caseId, { domain: profile.domain, summaryLength: profile.summary.length });
        return profile;
      });
    },
    // La personne déclare son dossier prêt : il devient visible des avocats de son domaine, sans ses pièces.
    markReady(user, caseId) {
      access(user, caseId, MEMBER_ROLES);
      const current = rowOf(user.tenantId, caseId);
      if (!current?.domain) throw new HttpError(409, 'DOMAIN_REQUIRED', 'Précisez d’abord le domaine de droit du dossier.');
      if (current.status === 'accepte') throw new HttpError(409, 'CASE_ACCEPTED', 'Ce dossier a déjà été accepté par un avocat.');
      if (current.status === 'pret') return publicProfile(current);
      return transaction(() => {
        const profile = upsert(user.tenantId, caseId, { status: 'pret', readyAt: now() });
        audit(user, caseId, 'case.ready', caseId, { domain: profile.domain });
        return profile;
      });
    },
    // Retour à la préparation tant qu'aucun avocat n'a accepté.
    reopen(user, caseId) {
      access(user, caseId, MEMBER_ROLES);
      const current = rowOf(user.tenantId, caseId);
      if (current?.status === 'accepte') throw new HttpError(409, 'CASE_ACCEPTED', 'Ce dossier a déjà été accepté par un avocat.');
      if (!current || current.status === 'preparation') return publicProfile(current);
      return transaction(() => {
        const profile = upsert(user.tenantId, caseId, { status: 'preparation', readyAt: null });
        audit(user, caseId, 'case.reopened', caseId, {});
        return profile;
      });
    },
    // Ce qu'un avocat voit avant d'accepter : les dossiers prêts de son organisation, dans ses domaines (tous les
    // domaines s'il n'en a déclaré aucun), dont il n'est pas déjà membre. Titre, domaine, résumé, nombre de pièces,
    // date — jamais les pièces, les messages ni l'identité de la personne.
    readyCases(user, domains = []) {
      const chosen = validDomains(domains);
      const rows = sql(`SELECT c.id,c.title,c.reference,c.createdAt,p.domain,p.summary,p.readyAt,
          (SELECT COUNT(*) FROM documents d WHERE d.tenantId=c.tenantId AND d.caseId=c.id) AS documents
        FROM case_profiles p JOIN cases c ON c.tenantId=p.tenantId AND c.id=p.caseId
        WHERE p.tenantId=? AND p.status='pret'
          AND NOT EXISTS (SELECT 1 FROM members m WHERE m.tenantId=c.tenantId AND m.caseId=c.id AND m.subject=?)
        ORDER BY p.readyAt,c.id`).all(user.tenantId, user.subject);
      const list = rows.filter(row => !chosen.length || chosen.includes(row.domain))
        .map(row => ({ id: row.id, title: row.title, reference: row.reference, createdAt: row.createdAt, domain: row.domain, domainLabel: DOMAIN_LABELS[row.domain] ?? null, summary: row.summary, documents: row.documents, readyAt: row.readyAt }));
      return { cases: list, domains: chosen, total: rows.length };
    },
    // L'avocat accepte : il devient membre « lawyer », le dossier passe à « accepte », et un message dans le dossier
    // le dit à la personne. Les conditions du mandat se conviennent ensuite entre eux, dans le dossier.
    accept(user, caseId, { lawyerName = '' } = {}) {
      identifier(caseId);
      const row = rowOf(user.tenantId, caseId);
      if (!row || row.status !== 'pret') throw new HttpError(404, 'CASE_NOT_READY', 'Ce dossier n’est pas, ou plus, offert aux avocats.');
      return transaction(() => {
        const existing = sql('SELECT role FROM members WHERE tenantId=? AND caseId=? AND subject=?').get(user.tenantId, caseId, user.subject);
        if (!existing) sql('INSERT INTO members VALUES (?,?,?,?)').run(user.tenantId, caseId, user.subject, 'lawyer');
        const profile = upsert(user.tenantId, caseId, { status: 'accepte', acceptedBy: user.subject, acceptedAt: now() });
        const who = lawyerName ? `Me ${lawyerName}` : 'Un avocat';
        const body = `${who} a accepté votre dossier (${DOMAIN_LABELS[profile.domain] ?? 'domaine à préciser'}). Les conditions du mandat se conviennent maintenant entre vous, ici dans le dossier.`;
        sql('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(randomUUID(), user.tenantId, caseId, user.subject, body, now());
        audit(user, caseId, 'case.accepted', caseId, { domain: profile.domain, alreadyMember: Boolean(existing) });
        const item = sql('SELECT c.*,m.role FROM cases c JOIN members m ON c.tenantId=m.tenantId AND c.id=m.caseId WHERE c.id=? AND c.tenantId=? AND m.subject=?').get(caseId, user.tenantId, user.subject);
        return { case: { id: item.id, title: item.title, reference: item.reference, createdAt: item.createdAt, createdBy: item.createdBy, role: item.role, profile }, alreadyMember: Boolean(existing) };
      });
    },
  };
}
