import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpError, externalIdentifier, fields, identifier, invalid, text } from './validation.mjs';

// Espace avocat : inscription libre d'un avocat, essai gratuit, et rattachement aux dossiers de ses clients.
//
// Demande du propriétaire du 13 novembre 2026 : « l'avocat s'inscrit de l'autre côté, 14 jours gratuits, sans carte
// de crédit, sans paiement ; après 14 jours on lui demande un paiement ; il voit le dossier côté avocat ».
//
// Ce module ne crée pas une seconde autorité d'identité : l'avocat se connecte avec le même fournisseur TAKATAK
// (code courriel, voir browser-session.mjs). Ce qui est ajouté ici est l'habilitation BesoinAvocat de ce compte
// (table lawyer_accounts, lue à chaque connexion comme le fichier de grants) et son rattachement aux dossiers par
// un code d'invitation que le responsable ou le client d'un dossier lui remet. L'essai de 14 jours est tenu dans
// lawyer_memberships (membership.mjs) : aucune carte ni aucun appel Stripe tant qu'il court.
const SIGNUP_TTL_MS = 60 * 60_000;
const INVITATION_TTL_MS = 14 * 86_400_000;
const INVITATION_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I
const MAX_JOIN_ATTEMPTS = 10;
const JOIN_WINDOW_MS = 15 * 60_000;
const ROLES = ['owner', 'lawyer', 'client'];
const hash = value => createHash('sha256').update(value).digest('hex');
const normalizeEmail = value => text(value, 'Adresse courriel', 320).trim().toLowerCase();
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);

export function lawyerAccountsConfiguration(env = process.env) {
  // Les dossiers sont cloisonnés par organisation (tenant). Les avocats qui s'inscrivent eux-mêmes rejoignent
  // l'organisation du portail, celle des dossiers des clients (journal du 2026-11-07 08:20 UTC : `takatak`).
  const raw = env.BESOINAVOCAT_LAWYER_TENANT;
  const tenantId = externalIdentifier(raw) ? raw : 'takatak';
  const days = /^[0-9]{1,3}$/u.test(env.BESOINAVOCAT_TRIAL_DAYS ?? '') ? Number(env.BESOINAVOCAT_TRIAL_DAYS) : 14;
  return Object.freeze({ tenantId, trialDays: days >= 1 && days <= 365 ? days : 14 });
}

export function createLawyerAccounts({ db, store, audit, config = lawyerAccountsConfiguration(), clock = Date.now }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lawyer_signups (
      emailHash TEXT PRIMARY KEY, name TEXT NOT NULL, barNumber TEXT NOT NULL, firm TEXT NOT NULL,
      createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS lawyer_accounts (
      subject TEXT PRIMARY KEY, tenantId TEXT NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL,
      barNumber TEXT NOT NULL, firm TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, source TEXT NOT NULL CHECK(source IN ('signup','activation'))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS case_invitations (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL, codeHash TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('lawyer')), createdBy TEXT NOT NULL, createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL,
      usedBy TEXT, usedAt TEXT, revokedAt TEXT,
      FOREIGN KEY(tenantId,caseId) REFERENCES cases(tenantId,id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS case_invitations_case ON case_invitations(tenantId,caseId,createdAt);
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const joinAttempts = new Map();

  function profileInput(body, required = ['name']) {
    fields(body, ['name', 'barNumber', 'firm'], required);
    return {
      name: text(body.name, 'Nom', 160).trim(),
      barNumber: text(body.barNumber, 'Numéro de membre du Barreau', 40, { optional: true }).trim(),
      firm: text(body.firm, 'Cabinet', 160, { optional: true }).trim(),
    };
  }
  const publicAccount = row => (row ? { name: row.name, barNumber: row.barNumber, firm: row.firm, email: row.email, createdAt: row.createdAt, source: row.source } : null);
  const accountOf = user => sql('SELECT * FROM lawyer_accounts WHERE subject=? AND tenantId=? AND active=1').get(user.subject, user.tenantId) ?? null;
  const publicInvitation = row => ({ id: row.id, caseId: row.caseId, role: row.role, createdBy: row.createdBy, createdAt: row.createdAt, expiresAt: row.expiresAt,
    status: row.revokedAt ? 'revoked' : row.usedAt ? 'used' : Date.parse(row.expiresAt) <= clock() ? 'expired' : 'open', usedAt: row.usedAt, usedBy: row.usedBy, revokedAt: row.revokedAt });
  const makeCode = () => {
    const bytes = randomBytes(8);
    const letters = [...bytes].map(b => INVITATION_ALPHABET[b % 32]).join('');
    return `AV-${letters.slice(0, 4)}-${letters.slice(4, 8)}`;
  };
  const normalizeCode = value => text(value, 'Code d’invitation', 20).toUpperCase().replace(/[\s-]/gu, '').replace(/^AV/u, '');

  return {
    config,
    has: user => Boolean(accountOf(user)),
    get: user => publicAccount(accountOf(user)),
    // Lu à chaque connexion et à chaque requête, comme le fichier de grants : désactiver le compte coupe l'accès.
    grantFor(subject) {
      if (!externalIdentifier(subject)) return null;
      const row = sql('SELECT tenantId FROM lawyer_accounts WHERE subject=? AND active=1').get(subject);
      return row ? Object.freeze({ subject, tenantId: row.tenantId, product: 'besoinavocat', active: true }) : null;
    },
    // Étape 1 de l'inscription : le profil attend, sous l'empreinte du courriel, que le code envoyé par le fournisseur
    // soit saisi. Rien n'est créé chez TAKATAK par ce module; c'est browser-session.mjs qui demande le code.
    beginSignup(body) {
      fields(body, ['email', 'name', 'barNumber', 'firm', 'consent'], ['email', 'name', 'consent']);
      if (body.consent !== true) throw invalid('Le consentement aux conditions d’essai est requis.');
      const email = normalizeEmail(body.email);
      if (!validEmail(email)) throw invalid('Adresse courriel invalide.');
      const profile = profileInput({ name: body.name, barNumber: body.barNumber, firm: body.firm });
      const at = clock();
      sql('DELETE FROM lawyer_signups WHERE expiresAt<=?').run(new Date(at).toISOString());
      sql('INSERT INTO lawyer_signups (emailHash,name,barNumber,firm,createdAt,expiresAt) VALUES (?,?,?,?,?,?) ON CONFLICT(emailHash) DO UPDATE SET name=excluded.name,barNumber=excluded.barNumber,firm=excluded.firm,createdAt=excluded.createdAt,expiresAt=excluded.expiresAt')
        .run(hash(email), profile.name, profile.barNumber, profile.firm, new Date(at).toISOString(), new Date(at + SIGNUP_TTL_MS).toISOString());
      return email;
    },
    // Étape 2 : appelée par la vérification du code, avec l'identifiant confirmé par le fournisseur, avant la lecture de
    // l'habilitation. Sans inscription en attente pour ce courriel, un compte TAKATAK existant ne devient pas avocat ici.
    completeSignup(subject, email) {
      if (!externalIdentifier(subject)) throw invalid();
      const pending = sql('SELECT * FROM lawyer_signups WHERE emailHash=? AND expiresAt>?').get(hash(email), now());
      const existing = sql('SELECT * FROM lawyer_accounts WHERE subject=?').get(subject);
      if (!pending && existing?.active) return { subject, tenantId: existing.tenantId, created: false };
      if (!pending) throw new HttpError(403, 'NO_PENDING_SIGNUP', 'Aucune inscription en attente pour cette adresse. Recommencez l’inscription.');
      return transaction(() => {
        const at = now();
        if (existing) {
          sql('UPDATE lawyer_accounts SET active=1,email=?,name=?,barNumber=?,firm=?,updatedAt=? WHERE subject=?').run(email, pending.name, pending.barNumber, pending.firm, at, subject);
        } else {
          sql('INSERT INTO lawyer_accounts (subject,tenantId,email,name,barNumber,firm,active,createdAt,updatedAt,source) VALUES (?,?,?,?,?,?,1,?,?,?)')
            .run(subject, config.tenantId, email, pending.name, pending.barNumber, pending.firm, at, at, 'signup');
        }
        sql('DELETE FROM lawyer_signups WHERE emailHash=?').run(hash(email));
        const tenantId = existing?.tenantId ?? config.tenantId;
        audit({ tenantId, subject }, null, 'lawyer.signed_up', subject, { source: 'signup' });
        return { subject, tenantId, created: !existing };
      });
    },
    // Une personne déjà habilitée (fichier de grants) ouvre son espace avocat depuis sa session.
    activate(user, body) {
      const profile = profileInput(body);
      const email = body.email === undefined ? '' : normalizeEmail(body.email);
      if (accountOf(user)) throw new HttpError(409, 'ALREADY_LAWYER', 'Votre espace avocat est déjà ouvert.');
      return transaction(() => {
        const at = now();
        sql('INSERT INTO lawyer_accounts (subject,tenantId,email,name,barNumber,firm,active,createdAt,updatedAt,source) VALUES (?,?,?,?,?,?,1,?,?,?) ON CONFLICT(subject) DO UPDATE SET active=1,tenantId=excluded.tenantId,name=excluded.name,barNumber=excluded.barNumber,firm=excluded.firm,updatedAt=excluded.updatedAt')
          .run(user.subject, user.tenantId, email, profile.name, profile.barNumber, profile.firm, at, at, 'activation');
        audit(user, null, 'lawyer.space_activated', user.subject, {});
        return publicAccount(accountOf(user));
      });
    },
    update(user, body) {
      const profile = profileInput(body);
      if (!accountOf(user)) throw new HttpError(404, 'NOT_A_LAWYER', 'Aucun espace avocat pour ce compte.');
      sql('UPDATE lawyer_accounts SET name=?,barNumber=?,firm=?,updatedAt=? WHERE subject=? AND tenantId=?').run(profile.name, profile.barNumber, profile.firm, now(), user.subject, user.tenantId);
      audit(user, null, 'lawyer.profile_updated', user.subject, {});
      return publicAccount(accountOf(user));
    },
    // Code d'invitation : remis par une personne du dossier à son avocat. Seule l'empreinte est conservée; le code
    // s'affiche une fois. Valable 14 jours, un seul usage, révocable.
    createInvitation(user, caseId) {
      store.access(user, caseId, ROLES);
      const code = makeCode();
      const at = clock();
      const row = { id: randomUUID(), createdAt: new Date(at).toISOString(), expiresAt: new Date(at + INVITATION_TTL_MS).toISOString() };
      transaction(() => {
        sql('INSERT INTO case_invitations (id,tenantId,caseId,codeHash,role,createdBy,createdAt,expiresAt) VALUES (?,?,?,?,?,?,?,?)')
          .run(row.id, user.tenantId, caseId, hash(normalizeCode(code)), 'lawyer', user.subject, row.createdAt, row.expiresAt);
        audit(user, caseId, 'invitation.created', row.id, { role: 'lawyer' });
      });
      return { invitation: { id: row.id, caseId, role: 'lawyer', createdBy: user.subject, createdAt: row.createdAt, expiresAt: row.expiresAt, status: 'open', usedAt: null, usedBy: null, revokedAt: null }, code };
    },
    listInvitations(user, caseId) {
      store.access(user, caseId, ROLES);
      return { invitations: sql('SELECT * FROM case_invitations WHERE tenantId=? AND caseId=? ORDER BY createdAt DESC,id').all(user.tenantId, caseId).map(publicInvitation) };
    },
    revokeInvitation(user, caseId, invitationId) {
      store.access(user, caseId, ROLES); identifier(invitationId);
      const row = sql('SELECT * FROM case_invitations WHERE id=? AND tenantId=? AND caseId=?').get(invitationId, user.tenantId, caseId);
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Invitation introuvable.');
      if (row.usedAt) throw new HttpError(409, 'ALREADY_USED', 'Cette invitation a déjà servi.');
      if (!row.revokedAt) transaction(() => {
        sql('UPDATE case_invitations SET revokedAt=? WHERE id=?').run(now(), row.id);
        audit(user, caseId, 'invitation.revoked', row.id, {});
      });
      return { invitation: publicInvitation(sql('SELECT * FROM case_invitations WHERE id=?').get(row.id)) };
    },
    // L'avocat saisit le code : il devient membre « lawyer » du dossier, dans la même organisation. Un membre déjà
    // présent (par exemple le responsable) garde son rôle. Dix essais par quart d'heure et par personne.
    join(user, body) {
      fields(body, ['code'], ['code']);
      const key = `${user.tenantId}\u0000${user.subject}`;
      const at = clock();
      const attempts = (joinAttempts.get(key) ?? []).filter(t => at - t < JOIN_WINDOW_MS);
      if (attempts.length >= MAX_JOIN_ATTEMPTS) throw new HttpError(429, 'JOIN_RATE_LIMIT', 'Trop d’essais. Réessayez dans quelques minutes.');
      attempts.push(at); joinAttempts.set(key, attempts);
      if (joinAttempts.size > 4096) for (const [k, list] of joinAttempts) if (!list.some(t => at - t < JOIN_WINDOW_MS)) joinAttempts.delete(k);
      const normalized = normalizeCode(body.code);
      if (!/^[A-Z2-9]{8}$/u.test(normalized)) throw invalid('Le code a la forme AV-XXXX-XXXX.');
      const row = sql('SELECT * FROM case_invitations WHERE codeHash=?').get(hash(normalized));
      const refused = () => new HttpError(404, 'INVITATION_INVALID', 'Ce code est inconnu, expiré, révoqué ou déjà utilisé.');
      if (!row || row.tenantId !== user.tenantId || row.usedAt || row.revokedAt || Date.parse(row.expiresAt) <= at) throw refused();
      return transaction(() => {
        const existing = sql('SELECT role FROM members WHERE tenantId=? AND caseId=? AND subject=?').get(user.tenantId, row.caseId, user.subject);
        if (!existing) sql('INSERT INTO members VALUES (?,?,?,?)').run(user.tenantId, row.caseId, user.subject, row.role);
        sql('UPDATE case_invitations SET usedBy=?,usedAt=? WHERE id=?').run(user.subject, now(), row.id);
        audit(user, row.caseId, 'invitation.accepted', row.id, { role: existing?.role ?? row.role, alreadyMember: Boolean(existing) });
        joinAttempts.delete(key);
        const item = sql('SELECT c.*,m.role FROM cases c JOIN members m ON c.tenantId=m.tenantId AND c.id=m.caseId WHERE c.id=? AND c.tenantId=? AND m.subject=?').get(row.caseId, user.tenantId, user.subject);
        return { case: { id: item.id, title: item.title, reference: item.reference, createdAt: item.createdAt, createdBy: item.createdBy, role: item.role }, alreadyMember: Boolean(existing) };
      });
    },
    clear() { joinAttempts.clear(); },
  };
}
