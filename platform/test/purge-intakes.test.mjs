import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createIntake } from '../lib/intake.mjs';
import { parseArgs, purgeIntakes, summary, USAGE } from '../tools/purge-intakes.mjs';

const WP = 'https://www.example.test';
const REVIEWER = { subject: 'synthetic-reviewer', tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 1);
const contact = () => ({ name: 'Personne Synthétique', email: `synthetic-${randomUUID().slice(0, 8)}@example.test`, role: 'client', language: 'fr',
  domain: 'family', region: 'montreal', consent: true, consentVersion: '2026-10-26.1', website: '' });

function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-purge-'));
  const file = join(dir, 'intake.sqlite');
  let clock = T0;
  const intake = createIntake({ config: { origins: [WP], dbPath: file, requestEnabled: false, reviewers: [REVIEWER.subject] }, now: () => clock });
  t.after(() => { intake.clear(); rmSync(dir, { recursive: true, force: true }); });
  assert.equal(intake.configured, true);
  const submit = () => intake.receive(contact(), randomUUID(), WP).reference;
  const status = (reference, value, at) => { clock = at; intake.reviewStatus(REVIEWER, reference, { status: value }); };
  const count = (sql) => { const db = new DatabaseSync(file, { readOnly: true }); try { return db.prepare(sql).get().n; } finally { db.close(); } };
  return { dir, file, intake, submit, status, count, set clock(value) { clock = value; } };
}

test('arguments: database and a whole number of days are required, --execute is the only switch', () => {
  assert.deepEqual(parseArgs(['--database', '/x/intake.sqlite', '--older-than-days', '90']), { dbPath: '/x/intake.sqlite', days: 90, execute: false });
  assert.equal(parseArgs(['--database', '/x', '--older-than-days', '1', '--execute']).execute, true);
  assert.deepEqual(parseArgs(['--help']), { help: true });
  for (const args of [[], ['--database', '/x'], ['--database', '/x', '--older-than-days', '0'], ['--database', '/x', '--older-than-days', '3651'],
    ['--database', '/x', '--older-than-days', 'abc'], ['--database', '/x', '--older-than-days', '90', '--execute', '--execute'], ['--database', '/x', '--database', '/y', '--older-than-days', '9'],
    ['--database', '--older-than-days', '9'], ['--database', '/x', '--older-than-days', '9', '--force']]) assert.throws(() => parseArgs(args), args.join(' '));
  assert.match(USAGE, /--older-than-days/);
});

test('only closed or spam requests older than the period go, with their notes and assignments; the dry run changes nothing', t => {
  const f = setup(t);
  const [old, spam, recent, open, reopened] = [f.submit(), f.submit(), f.submit(), f.submit(), f.submit()];
  f.status(old, 'closed', T0 + DAY); f.intake.reviewNote(REVIEWER, old, { body: 'Note fictive à effacer.' });
  f.intake.reviewAssign(REVIEWER, old, { assignee: REVIEWER.subject });
  f.status(spam, 'spam', T0 + 2 * DAY);
  f.status(recent, 'closed', T0 + 80 * DAY);
  f.status(open, 'contacted', T0 + DAY);
  f.status(reopened, 'closed', T0 + DAY); f.status(reopened, 'in_review', T0 + 3 * DAY);
  const now = T0 + 100 * DAY;
  const dry = purgeIntakes({ dbPath: f.file, days: 90, now });
  assert.deepEqual({ ...dry, oldestStatusAt: undefined }, { mode: 'dry-run', olderThanDays: 90, requests: 5, candidates: 2, byStatus: { closed: 1, spam: 1 }, purged: 0, notes: 0, assignments: 0, oldestStatusAt: undefined });
  assert.equal(dry.oldestStatusAt, new Date(T0 + DAY).toISOString());
  assert.equal(f.count('SELECT COUNT(*) AS n FROM ba_intakes'), 5);
  assert.match(summary(dry), /Nothing changed/);
  const done = purgeIntakes({ dbPath: f.file, days: 90, execute: true, now });
  assert.equal(done.purged, 2); assert.equal(done.notes, 3, 'the note plus the status traces of both requests'); assert.equal(done.assignments, 1);
  assert.match(summary(done), /Purged: 2 requests, 3 notes, 1 assignment rows/);
  assert.equal(f.count('SELECT COUNT(*) AS n FROM ba_intakes'), 3);
  assert.equal(f.count(`SELECT COUNT(*) AS n FROM ba_intake_notes WHERE reference IN ('${old}','${spam}')`), 0);
  assert.equal(f.count(`SELECT COUNT(*) AS n FROM ba_intake_access WHERE action LIKE 'purge:%' AND subject='tool:purge-intakes'`), 2);
  assert.equal(f.count(`SELECT COUNT(*) AS n FROM ba_intake_access WHERE action='purge:spam:90d' AND reference='${spam}'`), 1);
  // The portal still works on what is left, and the append-only guards are back.
  assert.deepEqual(f.intake.reviewList(REVIEWER, {}).requests.map(row => row.reference).sort(), [open, recent, reopened].sort());
  assert.equal(f.intake.reviewRead(REVIEWER, reopened).request.status, 'in_review');
  f.intake.reviewAssign(REVIEWER, open, { assignee: REVIEWER.subject }); // a surviving row, so the row-level guard has something to fire on
  const db = new DatabaseSync(f.file);
  try {
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger'").get().n, 6);
    assert.throws(() => db.prepare('DELETE FROM ba_intake_notes').run());
    assert.throws(() => db.prepare('DELETE FROM ba_intake_assignments').run());
  } finally { db.close(); }
  assert.equal(purgeIntakes({ dbPath: f.file, days: 90, execute: true, now }).purged, 0, 'a second run finds nothing');
  // Later, the recently closed request ages past the period.
  assert.equal(purgeIntakes({ dbPath: f.file, days: 90, execute: true, now: T0 + 171 * DAY }).purged, 1);
  assert.equal(f.count('SELECT COUNT(*) AS n FROM ba_intakes'), 2);
});

test('a request whose status changed between the selection and the purge is kept', t => {
  const f = setup(t);
  const reference = f.submit();
  f.status(reference, 'closed', T0 + DAY);
  // Simulate the reopening by rewriting the review row before the purge re-checks it inside its transaction.
  const db = new DatabaseSync(f.file);
  db.prepare("UPDATE ba_intake_reviews SET status='in_review', updatedAt=? WHERE reference=?").run(new Date(T0 + 95 * DAY).toISOString(), reference);
  db.close();
  assert.equal(purgeIntakes({ dbPath: f.file, days: 90, execute: true, now: T0 + 100 * DAY }).purged, 0);
  assert.equal(f.count('SELECT COUNT(*) AS n FROM ba_intakes'), 1);
});

test('a database of another application, a foreign table or a missing file is refused', t => {
  const f = setup(t);
  const other = join(f.dir, 'other.sqlite');
  const db = new DatabaseSync(other);
  db.exec('PRAGMA application_id=1; CREATE TABLE ba_intakes(reference TEXT PRIMARY KEY); CREATE TABLE ba_intake_reviews(reference TEXT PRIMARY KEY)');
  db.close();
  assert.throws(() => purgeIntakes({ dbPath: other, days: 30 }), /Not an intake database/);
  const extra = new DatabaseSync(f.file);
  extra.exec('CREATE TABLE stranger(id TEXT)');
  extra.close();
  assert.throws(() => purgeIntakes({ dbPath: f.file, days: 30 }), /Unsupported intake schema/);
  assert.throws(() => purgeIntakes({ dbPath: join(f.dir, 'absent.sqlite'), days: 30 }));
  writeFileSync(join(f.dir, 'text.sqlite'), 'pas une base');
  assert.throws(() => purgeIntakes({ dbPath: join(f.dir, 'text.sqlite'), days: 30 }));
});
