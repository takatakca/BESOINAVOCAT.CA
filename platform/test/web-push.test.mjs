// Avis Web Push (D-047) : chiffrement aes128gcm (RFC 8291) vérifié par un déchiffrement indépendant, jeton VAPID
// vérifiable avec la clé publique, adresses de push limitées aux services connus, appareil expiré retiré, limites.
// Aucun service de push réel n'est appelé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, createECDH, createHmac, createPublicKey, randomBytes, verify } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { allowedPushEndpoint, createWebPush, encryptPayload } from '../lib/web-push.mjs';

const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
// Déchiffrement côté navigateur, écrit d'après la RFC 8291 §3.4, indépendamment du code d'envoi.
function decrypt(body, uaEcdh, authSecret) {
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20];
  const asPublic = body.subarray(21, 21 + idlen), ciphertext = body.subarray(21 + idlen);
  assert.equal(rs, 4096);
  const shared = uaEcdh.computeSecret(asPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaEcdh.getPublicKey(), asPublic]);
  const ikm = hmac(hmac(authSecret, shared), Buffer.concat([keyInfo, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const decipher = createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(ciphertext.subarray(-16));
  const plain = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]);
  assert.equal(plain.at(-1), 2, 'last-record delimiter');
  return plain.subarray(0, -1).toString('utf8');
}
const browser = () => {
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  const auth = randomBytes(16);
  return { ecdh, auth, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
};

test('le message chiffré se déchiffre avec la clé du navigateur, et seulement elle', () => {
  const ua = browser();
  const body = encryptPayload('{"titre":"Un avocat a accepté votre dossier"}', ua.keys);
  assert.equal(decrypt(body, ua.ecdh, ua.auth), '{"titre":"Un avocat a accepté votre dossier"}');
  const other = browser();
  assert.throws(() => decrypt(body, other.ecdh, other.auth));
  assert.throws(() => encryptPayload('x', { p256dh: 'AAAA', auth: ua.keys.auth }));
});

test('seuls les services de push connus sont acceptés', () => {
  for (const ok of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://wns2-bl2p.notify.windows.com/w/?token=x', 'https://web.push.apple.com/QX'])
    assert.ok(allowedPushEndpoint(ok), ok);
  for (const bad of ['http://fcm.googleapis.com/x', 'https://evil.example/x', 'https://fcm.googleapis.com.evil.example/x', 'https://127.0.0.1/x', 'https://user@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'nope'])
    assert.equal(allowedPushEndpoint(bad), null, bad);
});

test('inscription, envoi signé VAPID, limites et appareil expiré retiré', async () => {
  const db = new DatabaseSync(':memory:');
  const events = [];
  let time = Date.parse('2026-11-27T12:00:00Z');
  const calls = [];
  let reply = 201;
  const push = createWebPush({ db, audit: (...args) => events.push(args[2]), origin: 'https://portail.example.test', clock: () => time,
    fetch: async (url, options) => { calls.push({ url, options }); return new Response(null, { status: reply }); } });
  const user = { tenantId: 't1', subject: 'personne-1' };
  const ua = browser();
  const endpoint = 'https://fcm.googleapis.com/fcm/send/device-1';
  assert.throws(() => push.subscribe(user, { endpoint: 'https://evil.example/x', keys: ua.keys }), /non reconnu/u);
  assert.throws(() => push.subscribe(user, { endpoint, keys: { p256dh: 'AAAA', auth: ua.keys.auth } }), /invalides/u);
  const status = push.subscribe(user, { endpoint, keys: ua.keys, label: 'Android' });
  assert.equal(status.devices.length, 1);
  assert.equal(status.devices[0].label, 'Android');
  assert.equal(Object.hasOwn(status.devices[0], 'endpoint'), false, 'the endpoint is never sent back');
  assert.equal(Buffer.from(status.publicKey, 'base64url').length, 65);
  assert.deepEqual(events, ['push.device_added']);

  const result = await push.notify('t1', ['personne-1', 'sans-appareil'], { kind: 'case_accepted', caseId: 'c1', title: 'Un avocat a accepté votre dossier', body: 'Texte', url: '/#case/c1' });
  assert.equal(result.sent, 1);
  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url, endpoint);
  assert.equal(options.headers['Content-Encoding'], 'aes128gcm');
  assert.equal(options.headers.TTL, '86400');
  const message = JSON.parse(decrypt(options.body, ua.ecdh, ua.auth));
  assert.deepEqual(message, { titre: 'Un avocat a accepté votre dossier', texte: 'Texte', lien: '/#case/c1', tag: 'case_accepted-c1' });
  // Authorization: vapid t=<JWT ES256>, k=<clé publique>. The JWT verifies with k.
  const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/u.exec(options.headers.Authorization);
  assert.equal(k, status.publicKey);
  const [h, c, sig] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { typ: 'JWT', alg: 'ES256' });
  const claims = JSON.parse(Buffer.from(c, 'base64url'));
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.equal(claims.sub, 'https://portail.example.test');
  assert.ok(claims.exp > time / 1000 && claims.exp <= time / 1000 + 24 * 3600);
  const raw = Buffer.from(k, 'base64url');
  const publicKey = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: raw.subarray(1, 33).toString('base64url'), y: raw.subarray(33).toString('base64url') }, format: 'jwk' });
  assert.ok(verify('sha256', Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));

  // Same kind and case within 10 minutes: skipped. After, sent again.
  assert.equal((await push.notify('t1', ['personne-1'], { kind: 'case_accepted', caseId: 'c1', title: 'x', body: 'y' })).sent, 0);
  time += 11 * 60 * 1000;
  assert.equal((await push.notify('t1', ['personne-1'], { kind: 'case_accepted', caseId: 'c1', title: 'x', body: 'y' })).sent, 1);

  // The key stays the same across restarts (same database).
  const again = createWebPush({ db, audit: () => {}, origin: 'https://portail.example.test' });
  assert.equal(again.status(user).publicKey, status.publicKey);

  // An expired subscription (410) is removed.
  reply = 410;
  time += 11 * 60 * 1000;
  assert.equal((await push.notify('t1', ['personne-1'], { kind: 'case_accepted', caseId: 'c1', title: 'x', body: 'y' })).sent, 0);
  assert.equal(push.status(user).devices.length, 0);

  // At most 5 devices: the oldest is replaced. Another person cannot remove someone's device.
  reply = 201;
  for (let i = 0; i < 6; i++) { time += 1000; push.subscribe(user, { endpoint: `https://fcm.googleapis.com/fcm/send/d${i}`, keys: browser().keys }); }
  const list = push.status(user).devices;
  assert.equal(list.length, 5);
  push.unsubscribe({ tenantId: 't1', subject: 'autre' }, { id: list[0].id });
  assert.equal(push.status(user).devices.length, 5);
  push.unsubscribe(user, { id: list[0].id });
  assert.equal(push.status(user).devices.length, 4);
});

test('sans adresse publique du portail, rien n’est envoyé', async () => {
  const db = new DatabaseSync(':memory:');
  const push = createWebPush({ db, audit: () => {}, origin: null, fetch: async () => { throw new Error('no call expected'); } });
  assert.equal(push.status({ tenantId: 't', subject: 's' }).ready, false);
  assert.throws(() => push.subscribe({ tenantId: 't', subject: 's' }, { endpoint: 'https://fcm.googleapis.com/x', keys: browser().keys }), /APP_ORIGIN/u);
  assert.deepEqual(await push.notify('t', ['s'], { kind: 'x', title: 'a', body: 'b' }), { sent: 0 });
});
