// Pure logic of the app, run with Node's own test runner (type stripping, no build step).
import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionFromSetCookie } from '../src/lib/cookie.ts';
import { readinessSteps, readinessRatio } from '../src/lib/readiness.ts';
import { bytes, daysLabel, mimeFor, initials } from '../src/lib/format.ts';

test('session cookie is read from Set-Cookie', () => {
  assert.equal(sessionFromSetCookie('__Host-ba_session=abc123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400'), 'abc123');
  assert.equal(sessionFromSetCookie('__Host-ba_oauth=; Path=/; Max-Age=0, __Host-ba_session=tok%2Bx; Path=/; Max-Age=60'), 'tok+x');
  assert.equal(sessionFromSetCookie('__Host-ba_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'), null);
  assert.equal(sessionFromSetCookie('other=1; Path=/'), undefined);
  assert.equal(sessionFromSetCookie(null), undefined);
});

test('a file is ready step by step', () => {
  const base = { case: { profile: { domain: null, summary: '', status: 'preparation' } }, documents: [] };
  assert.equal(readinessRatio(readinessSteps(base)), 0);
  const full = { case: { profile: { domain: 'famille', summary: 'Situation décrite en plus de vingt caractères.', status: 'pret' } }, documents: [{ id: 'd' }] };
  assert.equal(readinessRatio(readinessSteps(full)), 1);
});

test('French formatting', () => {
  assert.equal(bytes(1536), '2 Ko');
  assert.equal(bytes(5 * 1024 * 1024), '5,0 Mo');
  assert.equal(daysLabel(0), 'Aujourd’hui');
  assert.equal(daysLabel(-2), 'En retard de 2 j');
  assert.equal(mimeFor('scan.PDF', null), 'application/pdf');
  assert.equal(mimeFor('photo.heic', 'image/heic'), 'image/heic');
  assert.equal(initials('Marie Tremblay'), 'MT');
});
