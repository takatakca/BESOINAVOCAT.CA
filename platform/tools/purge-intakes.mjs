#!/usr/bin/env node
// Operator CLI: limited retention of the public requests (Loi 25). Deletes the requests that are closed or marked
// as spam and whose status has not changed for more than N days, with their notes and assignments. Dry run by
// default; nothing leaves the server, no name, address or summary is printed. The retention period is not chosen
// here: the operator passes it, after the owner has decided it.
import { randomUUID } from 'node:crypto';
import { lstatSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const APP_ID = 0x4241494e;
const TABLES = ['ba_intake_meta','ba_intakes','ba_intake_limits','ba_intake_reviews','ba_intake_notes','ba_intake_access','ba_intake_assignments'];
const PURGEABLE = ['closed', 'spam'];
const MAX_DAYS = 3650;

export const USAGE = 'node tools/purge-intakes.mjs --database <intake.sqlite> --older-than-days <1..3650> [--execute]';

export function parseArgs(args) {
  const options = { execute: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') return { help: true };
    if (arg === '--execute') { if (options.execute) throw new Error('Duplicate flag --execute'); options.execute = true; continue; }
    const key = { '--database': 'dbPath', '--older-than-days': 'days' }[arg];
    if (!key) throw new Error(`Unknown argument ${arg}`);
    if (options[key] !== undefined) throw new Error(`Duplicate flag ${arg}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value`);
    options[key] = value;
  }
  if (!options.dbPath) throw new Error('--database is required');
  if (!/^[1-9][0-9]{0,3}$/u.test(options.days ?? '') || Number(options.days) > MAX_DAYS) throw new Error(`--older-than-days must be a whole number of days from 1 to ${MAX_DAYS}`);
  return { dbPath: options.dbPath, days: Number(options.days), execute: options.execute };
}

// Opens the intake database only: a file of another application, or an unknown table, is refused.
function openIntake(dbPath, readOnly) {
  const stat = lstatSync(dbPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('--database must be a regular file');
  const db = new DatabaseSync(dbPath, { readOnly });
  try {
    if (db.prepare('PRAGMA application_id').get().application_id !== APP_ID) throw new Error('Not an intake database');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name);
    if (tables.some(name => !TABLES.includes(name)) || !tables.includes('ba_intakes') || !tables.includes('ba_intake_reviews')) throw new Error('Unsupported intake schema');
    if (!readOnly) db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; PRAGMA secure_delete=ON;');
    return db;
  } catch (error) { db.close(); throw error; }
}

// Requests whose current status is closed or spam, unchanged since more than `days` days before `now`.
function candidates(db, days, now) {
  const cutoff = new Date(now - days * 86_400_000).toISOString();
  return db.prepare(`SELECT r.reference, r.status, r.updatedAt FROM ba_intake_reviews r JOIN ba_intakes i ON i.reference=r.reference
    WHERE r.status IN ('closed','spam') AND r.updatedAt < ? ORDER BY r.updatedAt, r.reference`).all(cutoff);
}

// Returns counts only. The references are never printed: the access log keeps the trace of each purge.
export function purgeIntakes({ dbPath, days, execute = false, now = Date.now() }) {
  const db = openIntake(dbPath, !execute);
  try {
    const rows = candidates(db, days, now);
    const result = { mode: execute ? 'execute' : 'dry-run', olderThanDays: days, requests: db.prepare('SELECT COUNT(*) AS n FROM ba_intakes').get().n,
      candidates: rows.length, byStatus: Object.fromEntries(PURGEABLE.map(status => [status, rows.filter(row => row.status === status).length])),
      oldestStatusAt: rows[0]?.updatedAt ?? null, purged: 0, notes: 0, assignments: 0 };
    if (!execute || !rows.length) return result;
    const hasAssignments = Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ba_intake_assignments'").get());
    const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name IN ('ba_intake_notes','ba_intake_assignments')").all();
    db.exec('BEGIN IMMEDIATE');
    try {
      // The notes and assignments are append-only for the portal; the purge is the one operation allowed to remove
      // them, so their triggers are lifted inside this transaction and recreated before it commits.
      for (const trigger of triggers) db.exec(`DROP TRIGGER "${trigger.name.replaceAll('"', '""')}"`);
      const time = new Date(now).toISOString();
      const deleteNotes = db.prepare('DELETE FROM ba_intake_notes WHERE reference=?');
      const deleteAssignments = hasAssignments ? db.prepare('DELETE FROM ba_intake_assignments WHERE reference=?') : null;
      const deleteReview = db.prepare('DELETE FROM ba_intake_reviews WHERE reference=?');
      const deleteRequest = db.prepare('DELETE FROM ba_intakes WHERE reference=?');
      const log = db.prepare('INSERT INTO ba_intake_access VALUES(?,?,?,?,?)');
      for (const row of rows) {
        // Re-check inside the transaction: a reviewer may have reopened the request meanwhile.
        const current = db.prepare('SELECT status, updatedAt FROM ba_intake_reviews WHERE reference=?').get(row.reference);
        if (!current || !PURGEABLE.includes(current.status) || current.updatedAt !== row.updatedAt) continue;
        result.notes += deleteNotes.run(row.reference).changes;
        if (deleteAssignments) result.assignments += deleteAssignments.run(row.reference).changes;
        deleteReview.run(row.reference);
        if (deleteRequest.run(row.reference).changes !== 1) throw new Error('A request could not be removed');
        log.run(randomUUID(), row.reference, `purge:${current.status}:${days}d`, 'tool:purge-intakes', time);
        result.purged++;
      }
      for (const trigger of triggers) db.exec(trigger.sql);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return result;
  } finally { db.close(); }
}

export function summary(result) {
  const lines = [`Mode: ${result.mode}`, `Requests in the database: ${result.requests}`,
    `Closed or spam for more than ${result.olderThanDays} days: ${result.candidates} (closed ${result.byStatus.closed}, spam ${result.byStatus.spam})`];
  if (result.oldestStatusAt) lines.push(`Oldest status date among them: ${result.oldestStatusAt}`);
  lines.push(result.mode === 'execute' ? `Purged: ${result.purged} requests, ${result.notes} notes, ${result.assignments} assignment rows` : 'Nothing changed. Re-run with --execute to purge.');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(`${error.message}\n${USAGE}`); process.exit(2); }
  if (options.help) { console.log(USAGE); process.exit(0); }
  try { console.log(summary(purgeIntakes(options))); }
  catch (error) { console.error(error.message); process.exit(1); }
}
