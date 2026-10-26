'use strict';

// Copied to app.cjs at the root of the deployment archive. Passenger's loader
// consumes CommonJS; dynamic import loads the unchanged ESM backend.
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

function configurationError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

// Resolve existing ancestors too, so a private-looking symlink cannot point back
// into the application tree. Operators must additionally check every web root.
function canonicalFuturePath(input) {
  let ancestor = input;
  const remaining = [];
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw configurationError('STORAGE_ANCESTOR_MISSING');
    remaining.unshift(path.basename(ancestor));
    ancestor = parent;
  }
  return path.join(fs.realpathSync(ancestor), ...remaining);
}

function storageOptions(env, appRoot) {
  const options = {};
  const runtimeRoot = fs.realpathSync(appRoot);
  for (const [variable, key] of [['DATABASE_PATH', 'dbPath'], ['BLOB_DIR', 'blobDir']]) {
    const value = env[variable];
    if (typeof value !== 'string' || !path.isAbsolute(value) || /[\x00-\x1f]/u.test(value)) {
      throw configurationError('INVALID_' + variable);
    }
    const canonical = canonicalFuturePath(path.resolve(value));
    if (isInside(runtimeRoot, canonical)) throw configurationError('STORAGE_INSIDE_APPLICATION');
    options[key] = canonical;
  }
  if (isInside(options.blobDir, options.dbPath) || options.dbPath === options.blobDir) {
    throw configurationError('DATABASE_AND_BLOBS_MUST_BE_SEPARATE');
  }
  return options;
}

function listenOptions(env, passenger) {
  if (passenger) {
    if (typeof passenger.configure !== 'function') throw configurationError('INVALID_PASSENGER_RUNTIME');
    passenger.configure({ autoInstall: false });
    return ['passenger'];
  }
  // Local verification only when the Passenger global is absent. A port of zero
  // lets tests use an OS-assigned loopback port. Passenger never uses this port.
  const raw = env.PORT === undefined || env.PORT === '' ? '8787' : String(env.PORT);
  if (!/^\d+$/u.test(raw) || Number(raw) > 65535) throw configurationError('INVALID_PORT');
  return [Number(raw), '127.0.0.1'];
}

async function boot({ appRoot = __dirname, env = process.env, passenger = globalThis.PhusionPassenger } = {}) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major !== 24 || minor < 19) throw configurationError('NODE_24_19_OR_NEWER_REQUIRED');
  const options = storageOptions(env, appRoot);
  const target = listenOptions(env, passenger);
  const { createApp } = await import(pathToFileURL(path.join(appRoot, 'server.mjs')).href);
  const app = createApp(options);
  try {
    await new Promise((resolve, reject) => {
      const failed = error => reject(error);
      app.once('error', failed);
      app.listen(...target, () => { app.removeListener('error', failed); resolve(); });
    });
  } catch (error) {
    app.dispose();
    throw error;
  }
  let closing = false;
  const stop = () => {
    if (closing) return;
    closing = true;
    app.close();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  app.once('close', () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  });
  return app;
}

module.exports = { boot, listenOptions, storageOptions };

if (require.main === module || globalThis.PhusionPassenger) {
  boot().then(() => {
    console.log('BESOINAVOCAT pilote : serveur démarré; connexion TAKATAK requise pour les dossiers.');
  }).catch(error => {
    const code = typeof error.code === 'string' && /^[A-Z0-9_]+$/u.test(error.code) ? error.code : 'STARTUP_FAILED';
    // Do not print environment values, service credentials, request tokens,
    // database content, or a provider response in Passenger logs.
    console.error('BESOINAVOCAT : démarrage refusé (' + code + ').');
    process.exitCode = 1;
  });
}
