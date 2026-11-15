#!/usr/bin/env node
// Génère le dataset des cabinets de l'annuaire BesoinAvocat depuis les listes de prospection du dépôt
// (docs/prospection/master-list-avocats-2026-11-14.csv + docs/prospection/vague4-contacts-2026-11-15.csv).
//
// Sorties (platform/data/, dossier gitignoré par la règle du dépôt — jamais commité, déposé sur Drive) :
//   firms.json — dataset arrière-plan complet (courriels, téléphones, adresses : JAMAIS servis au public) ;
//   firms.csv  — même dataset à plat, pour le dossier Drive du propriétaire.
// L'API publique (lib/firms-directory.mjs) ne projette que cabinet + ville + palier.
//
// Déduplication : par domaine courriel du cabinet (hors domaines génériques), puis par nom normalisé.
// Un contact sans nom de cabinet confirmé forme un cabinet `cabinet: null` rattaché à son domaine :
// il reste au dataset arrière-plan et n'est jamais affiché publiquement. Aucun nom n'est inventé.
//
// Usage : node platform/tools/generate-firms.mjs [csv1 csv2 ...] [--out <dossier>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM = join(HERE, '..');
const REPO = join(PLATFORM, '..');

export const DEFAULT_SOURCES = [
  join(REPO, 'docs', 'prospection', 'master-list-avocats-2026-11-14.csv'),
  join(REPO, 'docs', 'prospection', 'vague4-contacts-2026-11-15.csv'),
];

// Domaines partagés : ils ne désignent pas un cabinet unique et ne doivent jamais fusionner des contacts.
export const GENERIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'hotmail.ca', 'outlook.com', 'yahoo.ca', 'yahoo.com', 'yahoo.fr',
  'icloud.com', 'me.com', 'live.ca', 'msn.com', 'protonmail.com', 'videotron.ca', 'bell.net',
  'cgocable.ca', 'sympatico.ca', 'shaw.ca', 'telus.net', 'rogers.com',
]);

const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';

/** Parseur CSV minimal (RFC 4180) : guillemets, virgules et sauts de ligne entre guillemets, CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const source = String(text).replace(/^﻿/u, '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

/** Clé de comparaison d'un nom de cabinet : minuscules, sans accents, ponctuation neutralisée. */
export function firmNameKey(name) {
  return clean(name).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/gu, ' ').trim().replace(/\s+/gu, ' ');
}

export function emailDomain(email) {
  const value = clean(email).toLowerCase();
  const at = value.lastIndexOf('@');
  return at > 0 ? value.slice(at + 1) : '';
}

/** Forme canonique d'un nom parmi ses graphies : la plus fréquente, puis la plus complète. */
function canonicalSpelling(spellings) {
  const counts = new Map();
  for (const spelling of spellings) if (spelling) counts.set(spelling, (counts.get(spelling) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) =>
    b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0], 'fr'))[0]?.[0] ?? null;
}

/**
 * Fusionne les contacts des listes en cabinets.
 * rows : objets CSV bruts ({ Nom, Cabinet, Courriel, Téléphone, Adresse, Ville, Statut, 'Date envoi', Source, _fichier }).
 * Retourne { firms, stats } — firms triés par nom (fr, sans accents), cabinets sans nom à la fin par domaine.
 */
export function buildFirms(rows) {
  const contacts = rows.map((row) => ({
    nom: clean(row.Nom),
    cabinet: clean(row.Cabinet),
    courriel: clean(row.Courriel).toLowerCase(),
    telephone: clean(row['Téléphone']),
    adresse: clean(row.Adresse),
    ville: clean(row.Ville),
    statut: clean(row.Statut),
    dateEnvoi: clean(row['Date envoi']),
    fichier: clean(row._fichier),
  })).filter((contact) => contact.courriel.includes('@'));

  // Graphies connues par domaine de cabinet : permet de rattacher un contact sans cabinet à son bureau.
  const spellingsByDomain = new Map();
  for (const contact of contacts) {
    const domain = emailDomain(contact.courriel);
    if (!contact.cabinet || !domain || GENERIC_DOMAINS.has(domain)) continue;
    if (!spellingsByDomain.has(domain)) spellingsByDomain.set(domain, []);
    spellingsByDomain.get(domain).push(contact.cabinet);
  }
  const canonicalByDomain = new Map([...spellingsByDomain].map(([domain, spellings]) => [domain, canonicalSpelling(spellings)]));

  const groups = new Map();
  const groupFor = (key) => {
    if (!groups.has(key)) groups.set(key, []);
    return groups.get(key);
  };
  for (const contact of contacts) {
    const domain = emailDomain(contact.courriel);
    let key;
    if (domain && !GENERIC_DOMAINS.has(domain) && canonicalByDomain.has(domain)) key = `dom:${domain}`;
    else if (contact.cabinet) key = `nom:${firmNameKey(contact.cabinet)}`;
    else if (domain && !GENERIC_DOMAINS.has(domain)) key = `dom:${domain}`;
    else key = `courriel:${contact.courriel}`;
    groupFor(key).push(contact);
  }

  // Fusion des groupes qui portent le même nom canonique (ex. domaine d'un côté, nom seul de l'autre).
  const merged = new Map();
  for (const [key, members] of groups) {
    const name = canonicalSpelling(members.map((member) => member.cabinet));
    const mergeKey = name ? `nom:${firmNameKey(name)}` : key;
    if (!merged.has(mergeKey)) merged.set(mergeKey, { keys: [], members: [] });
    merged.get(mergeKey).keys.push(key);
    merged.get(mergeKey).members.push(...members);
  }

  const firms = [...merged.values()].map(({ keys, members }) => {
    const cabinet = canonicalSpelling(members.map((member) => member.cabinet));
    const domains = members.map((member) => emailDomain(member.courriel)).filter(Boolean);
    const firmDomains = domains.filter((domain) => !GENERIC_DOMAINS.has(domain));
    const domaine = firmDomains.sort((a, b) =>
      firmDomains.filter((d) => d === b).length - firmDomains.filter((d) => d === a).length || a.localeCompare(b))[0] ?? null;

    const seen = new Set();
    const firmContacts = [];
    for (const member of members) {
      if (seen.has(member.courriel)) continue;
      seen.add(member.courriel);
      firmContacts.push({ nom: member.nom || null, courriel: member.courriel });
    }
    const adresses = [];
    const seenAdresses = new Set();
    for (const member of members) {
      if (!member.adresse) continue;
      const marker = `${member.adresse}|${member.ville}`;
      if (seenAdresses.has(marker)) continue;
      seenAdresses.add(marker);
      adresses.push({ adresse: member.adresse, ville: member.ville || null });
    }
    const statuts = [...new Set(members.map((member) => member.statut).filter(Boolean))];
    const contacte = members.some((member) => member.dateEnvoi || /^Envoyé/u.test(member.statut));
    const id = keys.find((key) => key.startsWith('dom:'))?.slice(4).replace(/[^a-z0-9]+/gu, '-')
      ?? (cabinet ? `nom-${firmNameKey(cabinet).replace(/\s+/gu, '-')}` : `contact-${firmContacts[0].courriel.replace(/[^a-z0-9]+/gu, '-')}`);
    return {
      id,
      cabinet,
      domaine,
      contactNom: firmContacts[0]?.nom ?? null,
      courriel: firmContacts[0]?.courriel ?? null,
      contacts: firmContacts,
      telephone: members.find((member) => member.telephone)?.telephone ?? null,
      adresse: adresses[0]?.adresse ?? null,
      ville: adresses[0]?.ville ?? null,
      adresses,
      logo: null,
      palier: 'free',
      statut: contacte ? 'contacté' : 'à contacter',
      statuts,
      sources: [...new Set(members.map((member) => member.fichier).filter(Boolean))],
      nbContacts: firmContacts.length,
    };
  });

  firms.sort((a, b) => {
    if (a.cabinet && b.cabinet) return a.cabinet.localeCompare(b.cabinet, 'fr');
    if (a.cabinet) return -1;
    if (b.cabinet) return 1;
    return (a.domaine ?? '').localeCompare(b.domaine ?? '');
  });

  const stats = {
    contacts: contacts.length,
    cabinets: firms.length,
    cabinetsNommés: firms.filter((firm) => firm.cabinet).length,
    cabinetsSansNom: firms.filter((firm) => !firm.cabinet).length,
    avecAdresse: firms.filter((firm) => firm.adresse).length,
    avecTéléphone: firms.filter((firm) => firm.telephone).length,
    avecVille: firms.filter((firm) => firm.ville).length,
  };
  return { firms, stats };
}

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
};

/** Export à plat du dataset (une ligne par cabinet) pour le dossier Drive du propriétaire. */
export function firmsToCsv(firms) {
  const headers = ['Cabinet', 'Domaine', 'Contact', 'Courriel principal', 'Téléphone', 'Adresse', 'Ville', 'Logo', 'Palier', 'Statut', 'Nb contacts', 'Sources'];
  const lines = firms.map((firm) => [firm.cabinet ?? '', firm.domaine ?? '', firm.contactNom ?? '', firm.courriel ?? '',
    firm.telephone ?? '', firm.adresse ?? '', firm.ville ?? '', firm.logo ?? '', firm.palier, firm.statut,
    firm.nbContacts, firm.sources.join('; ')].map(csvCell).join(','));
  return [headers.join(','), ...lines].join('\r\n') + '\r\n';
}

/** Lit les CSV sources et produit le dataset complet { generatedAt, sources, counts, firms }. */
export function generateDataset(paths = DEFAULT_SOURCES, now = new Date()) {
  const rows = [];
  for (const path of paths) {
    const fichier = basename(path);
    for (const row of parseCsv(readFileSync(path, 'utf8'))) rows.push({ ...row, _fichier: fichier });
  }
  const { firms, stats } = buildFirms(rows);
  return { generatedAt: now.toISOString(), sources: paths.map((path) => basename(path)), counts: stats, firms };
}

function main(argv) {
  const args = [...argv];
  let outDir = join(PLATFORM, 'data');
  const outIndex = args.indexOf('--out');
  if (outIndex >= 0) { outDir = args[outIndex + 1]; args.splice(outIndex, 2); }
  const paths = args.length ? args : DEFAULT_SOURCES;
  const dataset = generateDataset(paths);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'firms.json'), JSON.stringify(dataset, null, 2) + '\n', 'utf8');
  writeFileSync(join(outDir, 'firms.csv'), firmsToCsv(dataset.firms), 'utf8');
  console.log(`Dataset annuaire : ${dataset.counts.contacts} contacts → ${dataset.counts.cabinets} cabinets (${dataset.counts.cabinetsNommés} nommés, ${dataset.counts.cabinetsSansNom} sans nom confirmé), ${dataset.counts.avecAdresse} avec adresse, ${dataset.counts.avecTéléphone} avec téléphone.`);
  console.log(`Écrit : ${join(outDir, 'firms.json')} + ${join(outDir, 'firms.csv')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
