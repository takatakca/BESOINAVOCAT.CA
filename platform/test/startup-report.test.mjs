import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startupReport } from '../server.mjs';

const SERVER = fileURLToPath(new URL('../server.mjs', import.meta.url));

async function freePort() {
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const { port } = probe.address(); await new Promise(resolve => probe.close(resolve)); return port;
}

test('the startup report is the readiness report, printed through the given logger, without any secret value', () => {
  const lines = [];
  startupReport({ NODE_ENV: 'test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_secretvalue', BESOINAVOCAT_SESSION_KEY_FILE: '/nonexistent/key' }, line => lines.push(line));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^Préparation au déploiement \(lecture seule\) :\n/u);
  assert.match(lines[0], /blocking item/u);
  assert.doesNotMatch(lines[0], /secretvalue/u);
});

test('the real server prints the report once it listens and still serves /api/health', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-startup-'));
  const port = await freePort();
  const child = spawn(process.execPath, [SERVER], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOST: '127.0.0.1', PORT: String(port), DATABASE_PATH: path.join(root, 'platform.sqlite'), BLOB_DIR: path.join(root, 'blobs') } });
  t.after(async () => { if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } await rm(root, { recursive: true, force: true }); });
  let out = '';
  child.stdout.on('data', chunk => { out += chunk; });
  const started = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no report in time:\n${out}`)), 15000);
    child.stdout.on('data', () => { if (/blocking item/u.test(out)) { clearTimeout(timer); resolve(); } });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`server exited early (${code}):\n${out}`)); });
  });
  await started;
  assert.match(out, /BESOINAVOCAT pilote : http:\/\/127\.0\.0\.1:/u);
  assert.match(out, /Préparation au déploiement \(lecture seule\) :/u);
  assert.match(out, /FAIL login +TAKATAK_SUPABASE_URL/u, 'without login settings the report names the blocker');
  assert.match(out, /blocking item\(s\)\./u);
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(health.status, 200, 'a blocking item is logged, the server still answers');
});
