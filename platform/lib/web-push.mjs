import { createECDH, createHmac, createCipheriv, createPrivateKey, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { HttpError, fields, invalid } from './validation.mjs';

// Avis poussés sur le téléphone et l'ordinateur (Web Push, D-047). Gratuit : aucun fournisseur payant. Le navigateur
// de la personne (Chrome, Edge, Firefox, Safari) donne une adresse d'abonnement chez son propre service de push; le
// portail y envoie un message chiffré de bout en bout (RFC 8291, aes128gcm) signé avec la clé VAPID du portail
// (RFC 8292). La paire de clés VAPID est créée par le serveur au premier démarrage et gardée dans sa base; rien à
// configurer dans Coolify. Le message ne contient qu'un titre court, une phrase et un lien vers le portail : jamais
// un nom, un titre de dossier, une pièce ni un contenu. Un abonnement que le service de push déclare expiré (404,
// 410) est retiré. Au plus 5 appareils par personne; au plus un avis par sorte, dossier et personne toutes les
// 10 minutes, et 30 par jour.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/u, /^(?:[a-z0-9-]+\.)*push\.services\.mozilla\.com$/u, /^[a-z0-9-]+\.notify\.windows\.com$/u, /^(?:[a-z0-9-]+\.)*push\.apple\.com$/u, /^android\.googleapis\.com$/u];
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/u;
const MAX_DEVICES = 5;
const DEDUPE_MS = 10 * 60 * 1000;
const MAX_PER_DAY = 30;
const TTL_SECONDS = 24 * 60 * 60;
const SEND_TIMEOUT_MS = 10000;
const b64u = buffer => Buffer.from(buffer).toString('base64url');
const fromB64u = value => Buffer.from(value.replace(/=+$/u, ''), 'base64url');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

export function allowedPushEndpoint(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    return PUSH_HOSTS.some(rx => rx.test(u.hostname)) ? u.href : null;
  } catch { return null; }
}

// Chiffrement aes128gcm d'un message pour un abonnement (RFC 8291 §3.4 et RFC 8188). salt et localKeys sont
// injectables pour les tests seulement.
export function encryptPayload(payload, { p256dh, auth }, { salt = randomBytes(16), local = null } = {}) {
  const uaPublic = fromB64u(p256dh), authSecret = fromB64u(auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length !== 16) throw invalid('Abonnement de notification invalide.');
  const ecdh = local ?? createECDH('prime256v1');
  if (!local) ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const prkKey = hmac(authSecret, shared);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01', 'binary')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01', 'binary')).subarray(0, 12);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, body]);
}

export function createWebPush({ db, audit, origin = null, fetch: fetchImpl = globalThis.fetch, clock = Date.now, log = () => {}, env = {} }) {
  if (!db || typeof audit !== 'function') throw new Error('Web Push requires db and audit');
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_keys (id INTEGER PRIMARY KEY CHECK(id=1), publicKey TEXT NOT NULL, privateJwk TEXT NOT NULL, createdAt TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, subject TEXT NOT NULL, endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL, auth TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, lastSentAt TEXT, failures INTEGER NOT NULL DEFAULT 0
    ) STRICT;
    CREATE INDEX IF NOT EXISTS push_subscriptions_person ON push_subscriptions(tenantId,subject);
    CREATE TABLE IF NOT EXISTS push_log (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, subject TEXT NOT NULL, caseId TEXT, kind TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent','failed','skipped')), detail TEXT NOT NULL, at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS push_log_recent ON push_log(tenantId,subject,kind,at);
  `);
  const sql = query => db.prepare(query);
  const iso = () => new Date(clock()).toISOString();
  // Clé VAPID : celle de l'environnement si elle est fournie (BESOINAVOCAT_VAPID_PRIVATE_JWK), sinon celle de la base,
  // créée une fois. Changer de clé invalide les abonnements existants : on ne la régénère jamais.
  let keys = null;
  function vapid() {
    if (keys) return keys;
    let jwk = null;
    if (typeof env.BESOINAVOCAT_VAPID_PRIVATE_JWK === 'string' && env.BESOINAVOCAT_VAPID_PRIVATE_JWK.trim()) {
      try { jwk = JSON.parse(env.BESOINAVOCAT_VAPID_PRIVATE_JWK); } catch { jwk = null; }
    }
    if (!jwk) {
      const row = sql('SELECT privateJwk FROM push_keys WHERE id=1').get();
      if (row) jwk = JSON.parse(row.privateJwk);
      else {
        const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
        jwk = pair.privateKey.export({ format: 'jwk' });
        const publicKey = b64u(Buffer.concat([Buffer.from([4]), fromB64u(jwk.x), fromB64u(jwk.y)]));
        sql('INSERT OR IGNORE INTO push_keys (id,publicKey,privateJwk,createdAt) VALUES (1,?,?,?)').run(publicKey, JSON.stringify(jwk), iso());
        jwk = JSON.parse(sql('SELECT privateJwk FROM push_keys WHERE id=1').get().privateJwk);
      }
    }
    if (jwk?.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d || !jwk.x || !jwk.y) throw new Error('Clé VAPID invalide');
    keys = { key: createPrivateKey({ key: jwk, format: 'jwk' }), publicKey: b64u(Buffer.concat([Buffer.from([4]), fromB64u(jwk.x), fromB64u(jwk.y)])) };
    return keys;
  }
  const ready = () => Boolean(origin);
  function jwtFor(endpoint) {
    const { key } = vapid();
    const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const claims = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(clock() / 1000) + 12 * 3600, sub: origin }));
    const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
    return `${header}.${claims}.${b64u(signature)}`;
  }
  const log_ = (sub, caseId, kind, status, detail) => sql('INSERT INTO push_log VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(), sub.tenantId, sub.subject, caseId, kind, status, detail, clock());

  async function sendTo(row, message) {
    const body = encryptPayload(JSON.stringify(message), row);
    let response;
    try {
      response = await fetchImpl(row.endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(SEND_TIMEOUT_MS), body,
        headers: { Authorization: `vapid t=${jwtFor(row.endpoint)}, k=${vapid().publicKey}`, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(TTL_SECONDS), Urgency: 'normal' } });
    } catch { return { ok: false, detail: 'unreachable' }; }
    if (response.status === 404 || response.status === 410) {
      sql('DELETE FROM push_subscriptions WHERE id=?').run(row.id);
      return { ok: false, detail: `expired ${response.status}` };
    }
    if (response.status >= 200 && response.status < 300) {
      sql('UPDATE push_subscriptions SET lastSentAt=?, failures=0 WHERE id=?').run(iso(), row.id);
      return { ok: true, detail: `http ${response.status}` };
    }
    sql('UPDATE push_subscriptions SET failures=failures+1 WHERE id=?').run(row.id);
    return { ok: false, detail: `http ${response.status}` };
  }

  // Envoie un avis à des personnes (tenantId + subjects), sur tous leurs appareils. Jamais d'exception.
  async function notify(tenantId, subjects, { kind, caseId = null, title, body, url = '/' }) {
    if (!ready()) return { sent: 0 };
    let sent = 0;
    for (const subject of [...new Set(subjects)]) {
      const devices = sql('SELECT * FROM push_subscriptions WHERE tenantId=? AND subject=?').all(tenantId, subject);
      if (!devices.length) continue;
      const time = clock();
      const recent = sql("SELECT COUNT(*) AS n FROM push_log WHERE tenantId=? AND subject=? AND kind=? AND (caseId IS ? OR caseId=?) AND status='sent' AND at>?").get(tenantId, subject, kind, caseId, caseId, time - DEDUPE_MS).n;
      const today = sql("SELECT COUNT(*) AS n FROM push_log WHERE tenantId=? AND subject=? AND status='sent' AND at>?").get(tenantId, subject, time - 86400000).n;
      if (recent || today >= MAX_PER_DAY) { log_({ tenantId, subject }, caseId, kind, 'skipped', recent ? 'déjà avisé' : 'limite quotidienne'); continue; }
      let any = false;
      for (const device of devices) {
        const result = await sendTo(device, { titre: title, texte: body, lien: url, tag: `${kind}-${caseId || 'compte'}` }).catch(() => ({ ok: false, detail: 'error' }));
        if (result.ok) any = true; else log(`push ${kind} failed: ${result.detail}`);
      }
      log_({ tenantId, subject }, caseId, kind, any ? 'sent' : 'failed', any ? '' : 'aucun appareil joint');
      if (any) sent++;
    }
    return { sent };
  }

  const publicDevice = row => ({ id: row.id, label: row.label, createdAt: row.createdAt, lastSentAt: row.lastSentAt });
  function status(user) {
    const devices = sql('SELECT * FROM push_subscriptions WHERE tenantId=? AND subject=? ORDER BY createdAt').all(user.tenantId, user.subject).map(publicDevice);
    return { ready: ready(), publicKey: ready() ? vapid().publicKey : null, devices, maxDevices: MAX_DEVICES };
  }
  return {
    ready,
    status,
    subscribe(user, input) {
      if (!ready()) throw new HttpError(503, 'PUSH_UNAVAILABLE', 'Les avis sur l’appareil ne sont pas activés sur ce serveur (APP_ORIGIN manquant).');
      const value = fields(input, ['endpoint', 'keys', 'label', 'expirationTime'], ['endpoint', 'keys']);
      const endpoint = allowedPushEndpoint(value.endpoint);
      if (!endpoint) throw invalid('Service de notification non reconnu.');
      const k = value.keys;
      if (!k || typeof k !== 'object' || Array.isArray(k) || typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || !B64URL.test(k.p256dh) || !B64URL.test(k.auth)) throw invalid('Clés de notification invalides.');
      const p256dh = fromB64u(k.p256dh), auth = fromB64u(k.auth);
      if (p256dh.length !== 65 || p256dh[0] !== 4 || auth.length !== 16) throw invalid('Clés de notification invalides.');
      try { const probe = createECDH('prime256v1'); probe.generateKeys(); probe.computeSecret(p256dh); } catch { throw invalid('Clés de notification invalides.'); }
      const label = typeof value.label === 'string' ? value.label.replace(/[\u0000-\u001f\u007f]/gu, '').trim().slice(0, 60) : '';
      const existing = sql('SELECT * FROM push_subscriptions WHERE endpoint=?').get(endpoint);
      if (existing && (existing.tenantId !== user.tenantId || existing.subject !== user.subject)) sql('DELETE FROM push_subscriptions WHERE id=?').run(existing.id);
      if (existing && existing.tenantId === user.tenantId && existing.subject === user.subject) {
        sql('UPDATE push_subscriptions SET p256dh=?, auth=?, label=?, failures=0 WHERE id=?').run(b64u(p256dh), b64u(auth), label || existing.label, existing.id);
      } else {
        const count = sql('SELECT COUNT(*) AS n FROM push_subscriptions WHERE tenantId=? AND subject=?').get(user.tenantId, user.subject).n;
        if (count >= MAX_DEVICES) sql('DELETE FROM push_subscriptions WHERE id=(SELECT id FROM push_subscriptions WHERE tenantId=? AND subject=? ORDER BY createdAt LIMIT 1)').run(user.tenantId, user.subject);
        sql('INSERT INTO push_subscriptions (id,tenantId,subject,endpoint,p256dh,auth,label,createdAt) VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(), user.tenantId, user.subject, endpoint, b64u(p256dh), b64u(auth), label, iso());
        audit(user, null, 'push.device_added', null, { host: new URL(endpoint).hostname });
      }
      return status(user);
    },
    unsubscribe(user, input) {
      const value = fields(input, ['endpoint', 'id'], []);
      let changes = 0;
      if (typeof value.id === 'string') changes = sql('DELETE FROM push_subscriptions WHERE id=? AND tenantId=? AND subject=?').run(value.id, user.tenantId, user.subject).changes;
      else if (typeof value.endpoint === 'string') changes = sql('DELETE FROM push_subscriptions WHERE endpoint=? AND tenantId=? AND subject=?').run(value.endpoint, user.tenantId, user.subject).changes;
      else throw invalid('Appareil à retirer manquant.');
      if (changes) audit(user, null, 'push.device_removed', null, {});
      return status(user);
    },
    async test(user) {
      if (!ready()) throw new HttpError(503, 'PUSH_UNAVAILABLE', 'Les avis sur l’appareil ne sont pas activés sur ce serveur.');
      const devices = sql('SELECT * FROM push_subscriptions WHERE tenantId=? AND subject=?').all(user.tenantId, user.subject);
      if (!devices.length) throw new HttpError(409, 'NO_DEVICE', 'Aucun appareil n’est inscrit. Activez d’abord les avis sur cet appareil.');
      let sent = 0;
      for (const device of devices) if ((await sendTo(device, { titre: 'BesoinAvocat', texte: 'Les avis sont actifs sur cet appareil.', lien: '/#settings', tag: 'test' })).ok) sent++;
      log_(user, null, 'test', sent ? 'sent' : 'failed', `${sent}/${devices.length}`);
      return { sent, devices: devices.length };
    },
    notify,
  };
}
