'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, rm, symlink, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const { listenOptions, storageOptions } = require('./passenger.cjs');

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'besoinavocat-passenger-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('besoinavocat-passenger-test-'));
    await rm(root, { recursive: true, force: true });
  });
  const app = path.join(root, 'app');
  await mkdir(app);
  return { root, app, env: { DATABASE_PATH: path.join(root, 'private', 'app.sqlite'), BLOB_DIR: path.join(root, 'private', 'blobs') } };
}

test('Passenger receives one explicit socket binding, independent of PORT', () => {
  const calls = [];
  const passenger = { configure(value) { calls.push(value); } };
  assert.deepEqual(listenOptions({ PORT: 'not-a-TCP-port' }, passenger), ['passenger']);
  assert.deepEqual(calls, [{ autoInstall: false }]);
  assert.throws(() => listenOptions({}, {}), /INVALID_PASSENGER_RUNTIME/);
});

test('without Passenger only a numeric loopback port is accepted', () => {
  assert.deepEqual(listenOptions({}, null), [8787, '127.0.0.1']);
  assert.deepEqual(listenOptions({ PORT: '0', HOST: '0.0.0.0' }, null), [0, '127.0.0.1']);
  for (const port of ['-1', '65536', '8787oops', '/tmp/socket', '1.2']) {
    assert.throws(() => listenOptions({ PORT: port }, null), /INVALID_PORT/);
  }
});

test('deployment requires separate absolute private paths outside the app tree', async t => {
  const f = await fixture(t);
  const result = storageOptions(f.env, f.app);
  assert.equal(result.dbPath, f.env.DATABASE_PATH);
  assert.equal(result.blobDir, f.env.BLOB_DIR);
  assert.throws(() => storageOptions({}, f.app), /INVALID_DATABASE_PATH/);
  assert.throws(() => storageOptions({ ...f.env, DATABASE_PATH: '.data/app.sqlite' }, f.app), /INVALID_DATABASE_PATH/);
  assert.throws(() => storageOptions({ ...f.env, BLOB_DIR: path.join(f.app, 'public', 'blobs') }, f.app), /STORAGE_INSIDE_APPLICATION/);
  assert.throws(() => storageOptions({ ...f.env, DATABASE_PATH: path.join(f.env.BLOB_DIR, 'app.sqlite') }, f.app), /DATABASE_AND_BLOBS_MUST_BE_SEPARATE/);
});

test('a symlink/junction pointing storage back into the app is refused', async t => {
  const f = await fixture(t);
  const link = path.join(f.root, 'private-looking');
  await symlink(f.app, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => storageOptions({ ...f.env, BLOB_DIR: path.join(link, 'blobs') }, f.app), /STORAGE_INSIDE_APPLICATION/);
});

test('CommonJS launcher loads the real ESM backend with no identity or secret and closes SQLite cleanly', async t => {
  const f = await fixture(t);
  const runner = path.join(f.root, 'runner.cjs');
  await writeFile(runner, `
    const { boot } = require(process.argv[2]);
    boot({ appRoot: process.argv[3] }).then(app => {
      process.send({ ready: true, port: app.address().port });
      process.on('message', msg => { if (msg === 'stop') app.close(() => process.disconnect()); });
    }).catch(error => { process.send({ error: error.code || error.name }); process.exitCode = 1; process.disconnect(); });
  `);
  // Deliberately do not copy the parent process environment. No real identity
  // variable, service secret or user session can enter this test process.
  const child = fork(runner, [path.join(__dirname, 'passenger.cjs'), path.resolve(__dirname, '..')], {
    env: { ...f.env, PORT: '0', NODE_ENV: 'test', ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}) },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true,
  });
  let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      if (child.connected) child.send('stop');
      else child.kill('SIGKILL');
      await exited;
    }
  });
  const [ready] = await once(child, 'message', { signal: AbortSignal.timeout(10000) });
  assert.equal(ready.ready, true, JSON.stringify(ready));
  const base = `http://127.0.0.1:${ready.port}`;
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', mode: 'pilot', identityConfigured: false, loginConfigured: false, emailCodeConfigured: false, intakeConfigured: false });
  assert.equal((await fetch(base + '/api/cases')).status, 401);
  const rejected = await fetch(base + '/api/cases', { headers: { Authorization: 'Bearer synthetic-no-identity' } });
  assert.equal(rejected.status, 503);
  assert.equal((await rejected.json()).error.code, 'IDENTITY_UNAVAILABLE');
  const exited = once(child, 'exit');
  child.send('stop');
  const [code] = await exited;
  assert.equal(code, 0, stderr);
});
