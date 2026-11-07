#!/usr/bin/env node
// Crée une clé d'API de plateforme pour un système du propriétaire :
//   node platform/tools/api-key.mjs --id site-wordpress --name "Site besoinavocat.ca" --scopes intake:write,catalog:read
// La clé est affichée UNE SEULE FOIS; seule son empreinte va dans BESOINAVOCAT_API_KEYS (Coolify). Aucun fichier
// n'est écrit et rien n'est envoyé. Voir docs/API.md.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { API_SCOPES, generateApiKey } from '../lib/api-keys.mjs';

export function parseArguments(argv) {
  const options = { id: null, name: null, scopes: ['intake:write'] };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index], value = argv[index + 1];
    if (flag === '--id') { options.id = value; index++; }
    else if (flag === '--name') { options.name = value; index++; }
    else if (flag === '--scopes') { options.scopes = String(value ?? '').split(',').map(item => item.trim()).filter(Boolean); index++; }
    else throw new Error(`Option inconnue : ${flag}`);
  }
  if (!options.id) throw new Error('--id est requis (ex. site-wordpress).');
  if (options.scopes.length < 1 || options.scopes.some(scope => !API_SCOPES.includes(scope))) throw new Error(`--scopes accepte : ${API_SCOPES.join(', ')}.`);
  return options;
}

export function createKeyEntry(options) {
  const generated = generateApiKey(options.id);
  const entry = { id: generated.id, name: options.name ?? generated.id, sha256: generated.sha256, scopes: [...new Set(options.scopes)] };
  return { key: generated.key, entry };
}

export function render({ key, entry }) {
  return [
    'Clé d’API de plateforme créée. Elle n’est affichée qu’une fois : la copier dans le système qui l’utilisera.',
    '',
    `  Clé : ${key}`,
    '',
    'Entrée à ajouter au tableau JSON de BESOINAVOCAT_API_KEYS dans Coolify (puis redéployer) :',
    '',
    `  ${JSON.stringify(entry)}`,
    '',
    'La clé n’est pas conservée ici; seule son empreinte SHA-256 figure dans l’entrée.',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(render(createKeyEntry(parseArguments(process.argv.slice(2))))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
