#!/usr/bin/env node
// Operator CLI: encrypt documents that were stored before the document key was configured.
// Dry run by default. Nothing leaves the server, no network, no file names or case content printed.
// Each file is sealed into a temporary file next to it, verified with the key, then renamed over the
// original in one step, so a reader sees either the old plain file or the new sealed one.
import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { SEAL_OVERHEAD, isSealed, loadBlobKey, openBlob, sealBlob } from '../lib/blob-crypto.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const HASH = /^[0-9a-f]{64}$/u;

export const USAGE = 'node tools/seal-documents.mjs --database <platform.sqlite> --blobs <blob dir> --blob-key <document key file> [--execute]';

export function parseArgs(args) {
  const flags = { '--database': 'dbPath', '--blobs': 'blobDir', '--blob-key': 'keyFile' };
  const options = { execute: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') return { help: true };
    if (arg === '--execute') { if (options.execute) throw new Error('Duplicate flag --execute'); options.execute = true; continue; }
    const key = flags[arg];
    if (!key) throw new Error(`Unknown argument ${arg}`);
    if (options[key] !== undefined) throw new Error(`Duplicate flag ${arg}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value`);
    options[key] = value;
  }
  for (const [flag, key] of Object.entries(flags)) if (!options[key]) throw new Error(`${flag} is required`);
  return options;
}

// 'missing', 'unsafe' (symlink or wrong type) or 'ok'.
function entry(path, isDir) {
  try {
    const stat = lstatSync(path);
    return stat.isSymbolicLink() || (isDir ? !stat.isDirectory() : !stat.isFile()) ? 'unsafe' : 'ok';
  } catch (error) { if (error.code === 'ENOENT') return 'missing'; throw error; }
}

function writeAtomically(path, data) {
  const temp = `${path}.sealing-${process.pid}`;
  const fd = openSync(temp, 'wx', 0o600);
  try { writeSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); }
  try { renameSync(temp, path); } catch (error) { rmSync(temp, { force: true }); throw error; }
}

// Returns counts only. `problems` lists short hash prefixes so an operator can investigate.
export function sealDocuments({ dbPath, blobDir, keyFile, execute = false }) {
  const key = loadBlobKey(keyFile);
  if (!key) throw new Error('--blob-key is required');
  const root = realpathSync(resolve(blobDir));
  const db = new DatabaseSync(dbPath, { readOnly: true });
  let rows;
  try { rows = db.prepare('SELECT DISTINCT tenantId, sha256, bytes FROM documents ORDER BY tenantId, sha256').all(); }
  finally { db.close(); }
  const result = { mode: execute ? 'execute' : 'dry-run', files: rows.length, alreadySealed: 0, toSeal: 0, sealed: 0, missing: 0, problems: [] };
  const problem = (hash, reason) => result.problems.push({ file: hash.slice(0, 12), reason });
  for (const { tenantId, sha256, bytes } of rows) {
    if (!HASH.test(sha256)) { problem(String(sha256), 'invalid stored hash'); continue; }
    const tenantHash = digest(tenantId), tenantDir = join(root, tenantHash), path = join(tenantDir, sha256);
    const dirState = entry(tenantDir, true);
    if (dirState === 'missing') { result.missing++; continue; }
    if (dirState === 'unsafe') { problem(sha256, 'tenant directory is not a plain directory'); continue; }
    const state = entry(path, false);
    if (state === 'missing') { result.missing++; continue; }
    if (state === 'unsafe') { problem(sha256, 'not a regular file'); continue; }
    const stored = readFileSync(path);
    if (isSealed(stored) && stored.length === bytes + SEAL_OVERHEAD) {
      try { if (digest(openBlob(key, stored, tenantHash, sha256)) !== sha256) throw new Error('hash'); result.alreadySealed++; }
      catch { problem(sha256, 'sealed with another key or damaged'); }
      continue;
    }
    if (stored.length !== bytes || digest(stored) !== sha256) { problem(sha256, 'plain file does not match its recorded hash'); continue; }
    result.toSeal++;
    if (!execute) continue;
    const sealed = sealBlob(key, stored, tenantHash, sha256);
    if (digest(openBlob(key, sealed, tenantHash, sha256)) !== sha256) { problem(sha256, 'verification after sealing failed'); continue; }
    writeAtomically(path, sealed);
    result.sealed++;
  }
  return result;
}

export function summary(result) {
  const lines = [
    `Mode: ${result.mode}`,
    `Stored files: ${result.files}`,
    `Already encrypted: ${result.alreadySealed}`,
    result.mode === 'execute' ? `Encrypted now: ${result.sealed} of ${result.toSeal}` : `Would encrypt: ${result.toSeal} (run again with --execute)`,
    `Missing on disk: ${result.missing}`,
  ];
  for (const item of result.problems) lines.push(`PROBLEM ${item.file}…: ${item.reason}`);
  if (result.mode === 'dry-run' && result.toSeal) lines.push('Before --execute: take a backup (tools/backup-corpus.py) and keep a separate copy of the document key.');
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) { console.log(USAGE); process.exit(0); }
    const result = sealDocuments(options);
    console.log(summary(result));
    process.exit(result.problems.length ? 1 : 0);
  } catch (error) {
    console.error(`${error.message}\n${USAGE}`);
    process.exit(2);
  }
}
