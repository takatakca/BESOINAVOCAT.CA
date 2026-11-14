import { createHash } from 'node:crypto';
import { HttpError, externalIdentifier, fields, invalid, text } from './validation.mjs';

// Tableau de bord d'une personne cliente : inscription libre par code courriel (D-036).
//
// Positionnement du propriétaire (13 novembre 2026, D-035) : la personne crée son tableau de bord et prépare son
// dossier sur la plateforme; un avocat du domaine concerné voit un dossier déjà prêt et l'accepte. Jusqu'ici une
// personne du public ne pouvait pas entrer : l'habilitation venait seulement du fichier privé de grants ou d'un
// compte avocat. Ce module ajoute la troisième source d'habilitation, celle des personnes clientes, lue à chaque
// requête comme les deux autres (browser-session.mjs, extraGrants). Il ne crée pas une seconde autorité
// d'identité : le code courriel est demandé et vérifié chez le fournisseur TAKATAK; le compte y est créé au premier
// code (create_user), exactement comme pour les avocats (lawyer-accounts.mjs).
const SIGNUP_TTL_MS = 60 * 60_000;
const hash = value => createHash('sha256').update(value).digest('hex');
const normalizeEmail = value => text(value, 'Adresse courriel', 320).trim().toLowerCase();
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);

export function createClientAccounts({ db, audit, tenantId, clock = Date.now }) {
  if (!externalIdentifier(tenantId)) throw new Error('tenantId is required');
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_signups (
      emailHash TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS client_accounts (
      subject TEXT PRIMARY KEY, tenantId TEXT NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    ) STRICT;
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const accountOf = user => sql('SELECT * FROM client_accounts WHERE subject=? AND tenantId=? AND active=1').get(user.subject, user.tenantId) ?? null;
  const publicAccount = row => (row ? { name: row.name, email: row.email, createdAt: row.createdAt } : null);

  return {
    tenantId,
    has: user => Boolean(accountOf(user)),
    get: user => publicAccount(accountOf(user)),
    // Même forme que le fichier de grants et que les comptes avocats; désactiver le compte coupe l'accès.
    grantFor(subject) {
      if (!externalIdentifier(subject)) return null;
      const row = sql('SELECT tenantId FROM client_accounts WHERE subject=? AND active=1').get(subject);
      return row ? Object.freeze({ subject, tenantId: row.tenantId, product: 'besoinavocat', active: true }) : null;
    },
    // Étape 1 : le nom attend, sous l'empreinte du courriel, que le code envoyé par le fournisseur soit saisi.
    beginSignup(body) {
      fields(body, ['email', 'name', 'consent'], ['email', 'name', 'consent']);
      if (body.consent !== true) throw invalid('Le consentement aux conditions d’utilisation est requis.');
      const email = normalizeEmail(body.email);
      if (!validEmail(email)) throw invalid('Adresse courriel invalide.');
      const name = text(body.name, 'Nom', 160).trim();
      const at = clock();
      sql('DELETE FROM client_signups WHERE expiresAt<=?').run(new Date(at).toISOString());
      sql('INSERT INTO client_signups (emailHash,name,createdAt,expiresAt) VALUES (?,?,?,?) ON CONFLICT(emailHash) DO UPDATE SET name=excluded.name,createdAt=excluded.createdAt,expiresAt=excluded.expiresAt')
        .run(hash(email), name, new Date(at).toISOString(), new Date(at + SIGNUP_TTL_MS).toISOString());
      return email;
    },
    // Étape 2 : avec l'identifiant confirmé par le fournisseur. Un compte TAKATAK existant qui n'a pas commencé
    // l'inscription ne devient pas client ici (403), comme pour les avocats.
    completeSignup(subject, email) {
      if (!externalIdentifier(subject)) throw invalid();
      const pending = sql('SELECT * FROM client_signups WHERE emailHash=? AND expiresAt>?').get(hash(email), now());
      const existing = sql('SELECT * FROM client_accounts WHERE subject=?').get(subject);
      if (!pending && existing?.active) return { subject, tenantId: existing.tenantId, created: false };
      if (!pending) throw new HttpError(403, 'NO_PENDING_SIGNUP', 'Aucune inscription en attente pour cette adresse. Recommencez l’inscription.');
      return transaction(() => {
        const at = now();
        if (existing) sql('UPDATE client_accounts SET active=1,email=?,name=?,updatedAt=? WHERE subject=?').run(email, pending.name, at, subject);
        else sql('INSERT INTO client_accounts (subject,tenantId,email,name,active,createdAt,updatedAt) VALUES (?,?,?,?,1,?,?)').run(subject, tenantId, email, pending.name, at, at);
        sql('DELETE FROM client_signups WHERE emailHash=?').run(hash(email));
        const owner = existing?.tenantId ?? tenantId;
        audit({ tenantId: owner, subject }, null, 'client.signed_up', subject, {});
        return { subject, tenantId: owner, created: !existing };
      });
    },
    update(user, body) {
      fields(body, ['name'], ['name']);
      if (!accountOf(user)) throw new HttpError(404, 'NOT_A_CLIENT', 'Aucun compte client pour cette session.');
      sql('UPDATE client_accounts SET name=?,updatedAt=? WHERE subject=? AND tenantId=?').run(text(body.name, 'Nom', 160).trim(), now(), user.subject, user.tenantId);
      return publicAccount(accountOf(user));
    },
  };
}
