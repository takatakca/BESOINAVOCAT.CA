// Annuaire des cabinets (« Nos avocats ») : génération du dataset depuis les listes de prospection,
// projection publique sans aucune coordonnée, page servie. Données synthétiques; aucun cabinet réel
// n'est exposé par ces tests au-delà des invariants lus dans les listes du dépôt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { createFirmsDirectory, projectFirms } from '../lib/firms-directory.mjs';
import { parseCsv, buildFirms, firmsToCsv, generateDataset, DEFAULT_SOURCES } from '../tools/generate-firms.mjs';

const row = (overrides = {}) => ({ Nom: '', Cabinet: '', Courriel: '', 'Téléphone': '', Adresse: '', Ville: '', Statut: '', 'Date envoi': '', Source: '', _fichier: 'fixture.csv', ...overrides });

test('parseCsv : guillemets, virgules et sauts de ligne protégés, CRLF', () => {
  const text = 'Nom,Cabinet,Courriel\r\n"Me A, B","Cabinet ""X""","a@x.ca"\r\n"Me C","Ligne\nbrisee","c@y.ca"\r\n';
  const rows = parseCsv(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Nom, 'Me A, B');
  assert.equal(rows[0].Cabinet, 'Cabinet "X"');
  assert.equal(rows[1].Cabinet, 'Ligne\nbrisee');
});

test('buildFirms : deux graphies d’un même domaine fusionnent, la plus fréquente devient canonique', () => {
  const { firms } = buildFirms([
    row({ Nom: 'Me Un', Cabinet: 'Blakes', Courriel: 'un@blakes.com' }),
    row({ Nom: 'Me Deux', Cabinet: 'Blake, Cassels & Graydon', Courriel: 'deux@blakes.com' }),
    row({ Nom: 'Me Trois', Cabinet: 'Blake, Cassels & Graydon', Courriel: 'trois@blakes.com' }),
  ]);
  assert.equal(firms.length, 1);
  assert.equal(firms[0].cabinet, 'Blake, Cassels & Graydon');
  assert.equal(firms[0].nbContacts, 3);
  assert.equal(firms[0].domaine, 'blakes.com');
});

test('buildFirms : contact sans cabinet rattaché par son domaine; domaine inconnu = cabinet sans nom, jamais inventé', () => {
  const { firms } = buildFirms([
    row({ Cabinet: 'BCF', Courriel: 'connu@bcf.ca' }),
    row({ Courriel: 'orphelin@bcf.ca' }),
    row({ Courriel: 'solo@petitbureau.ca' }),
  ]);
  const bcf = firms.find((firm) => firm.cabinet === 'BCF');
  assert.equal(bcf.nbContacts, 2);
  const sansNom = firms.find((firm) => firm.domaine === 'petitbureau.ca');
  assert.equal(sansNom.cabinet, null);
  assert.equal(sansNom.nbContacts, 1);
});

test('buildFirms : les domaines génériques ne fusionnent jamais deux cabinets distincts', () => {
  const { firms } = buildFirms([
    row({ Cabinet: 'Cabinet Alpha', Courriel: 'alpha@gmail.com' }),
    row({ Cabinet: 'Cabinet Beta', Courriel: 'beta@gmail.com' }),
    row({ Courriel: 'inconnu@gmail.com' }),
  ]);
  assert.equal(firms.length, 3);
  assert.equal(firms.filter((firm) => firm.cabinet).length, 2);
});

test('buildFirms : la vague 4 enrichit le cabinet (adresse, ville, téléphone) sans créer de doublon', () => {
  const { firms, stats } = buildFirms([
    row({ Nom: 'Me Un', Cabinet: 'Davies Ward Phillips & Vineberg', Courriel: 'un@dwpv.com', Statut: 'Envoyé — sans réponse', 'Date envoi': '2026-11-14', _fichier: 'master.csv' }),
    row({ Nom: 'Me Un', Cabinet: 'Davies Ward Phillips & Vineberg', Courriel: 'un@dwpv.com', 'Téléphone': '514 841-0000', Adresse: '1501, avenue McGill College, Montréal', Ville: 'Montréal', Statut: 'À envoyer', _fichier: 'vague4.csv' }),
  ]);
  assert.equal(firms.length, 1);
  assert.equal(firms[0].nbContacts, 1, 'le même courriel ne compte qu’une fois');
  assert.equal(firms[0].adresse, '1501, avenue McGill College, Montréal');
  assert.equal(firms[0].ville, 'Montréal');
  assert.equal(firms[0].telephone, '514 841-0000');
  assert.equal(firms[0].statut, 'contacté');
  assert.deepEqual(firms[0].sources, ['master.csv', 'vague4.csv']);
  assert.equal(stats.avecAdresse, 1);
  assert.equal(stats.avecTéléphone, 1);
  assert.equal(firms[0].logo, null);
  assert.equal(firms[0].palier, 'free');
});

test('génération réelle (listes du dépôt) : aucun contact perdu, aucun doublon, invariants du dataset', () => {
  const dataset = generateDataset(DEFAULT_SOURCES, new Date('2026-11-15T00:00:00Z'));
  const parsed = DEFAULT_SOURCES.reduce((total, source) => total + parseCsv(readFileSync(source, 'utf8')).length, 0);
  assert.equal(dataset.counts.contacts, parsed, 'chaque ligne des listes devient un contact');
  const emails = dataset.firms.flatMap((firm) => firm.contacts.map((contact) => contact.courriel));
  assert.equal(new Set(emails).size, emails.length, 'aucun courriel en double entre cabinets');
  assert.ok(dataset.firms.every((firm) => firm.logo === null && firm.palier === 'free'));
  const vague4 = dataset.firms.filter((firm) => firm.sources.includes('vague4-contacts-2026-11-15.csv'));
  assert.ok(vague4.length > 0 && vague4.every((firm) => firm.adresse && firm.ville), 'les cabinets de la vague 4 portent leur adresse');
  const csv = firmsToCsv(dataset.firms);
  assert.equal(csv.trim().split('\r\n').length, dataset.firms.length + 1);
});

test('projectFirms : seuls cabinet, ville et palier sortent; sans nom = exclu; top plafonné à 3', () => {
  const firms = [
    { cabinet: 'Zêta Avocats', ville: 'Québec', palier: 'free', courriel: 'z@zeta.ca', telephone: '418 555-0100', adresse: '1, rue Zêta', contacts: [{ nom: 'Me Z', courriel: 'z@zeta.ca' }] },
    { cabinet: 'Alpha', ville: null, palier: 'top', courriel: 'a@alpha.ca' },
    { cabinet: 'Beta', ville: 'Montréal', palier: 'top' },
    { cabinet: 'Gamma', ville: 'Montréal', palier: 'top' },
    { cabinet: 'Delta', ville: 'Montréal', palier: 'top' },
    { cabinet: null, ville: null, palier: 'free', domaine: 'sansnom.ca' },
    { cabinet: 'Épsilon', ville: 'Laval', palier: 'inconnu' },
  ];
  const pub = projectFirms(firms);
  assert.equal(pub.top.length, 3, 'le top placement est plafonné à trois bureaux');
  assert.deepEqual(pub.free.map((firm) => firm.cabinet), ['Épsilon', 'Zêta Avocats'], 'tri A–Z insensible aux accents, palier inconnu rabattu sur free');
  for (const tier of Object.values(pub)) for (const firm of tier) assert.deepEqual(Object.keys(firm).sort(), ['cabinet', 'palier', 'ville']);
  const body = JSON.stringify(pub);
  for (const priv of ['z@zeta.ca', '418 555-0100', 'rue Zêta', 'Me Z', 'sansnom.ca']) assert.ok(!body.includes(priv), `fuite : ${priv}`);
});

test('createFirmsDirectory : fichier absent = annuaire vide, jamais d’erreur', () => {
  const directory = createFirmsDirectory({ file: path.join(tmpdir(), 'ba-firms-absent-xyz.json') });
  assert.equal(directory.configured, false);
  assert.deepEqual(directory.publicDirectory(), { top: [], sponsored: [], free: [] });
});

async function fixtureApp(t, firmsFile) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-firms-'));
  const env = firmsFile ? { BESOINAVOCAT_FIRMS_FILE: firmsFile } : {};
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), env, authenticate: async () => null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { await new Promise((resolve) => app.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  return `http://127.0.0.1:${app.address().port}`;
}

test('HTTP : /api/firms ne laisse fuir aucun champ privé; la page /avocats est servie', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-firms-data-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const firmsFile = path.join(directory, 'firms.json');
  await writeFile(firmsFile, JSON.stringify({ firms: [
    { cabinet: 'Cabinet Synthétique', ville: 'Montréal', palier: 'free', courriel: 'secret@synthetique.test', contactNom: 'Me Secret', telephone: '514 555-0199', adresse: '999, rue Secrète', contacts: [{ nom: 'Me Secret', courriel: 'secret@synthetique.test' }] },
    { cabinet: null, domaine: 'sansnom.test', courriel: 'cache@san s nom.test'.replaceAll(' ', ''), contacts: [{ nom: null, courriel: 'cache@sansnom.test' }] },
  ] }));
  const base = await fixtureApp(t, firmsFile);

  const api = await fetch(`${base}/api/firms`);
  assert.equal(api.status, 200);
  const body = await api.text();
  const parsed = JSON.parse(body);
  assert.deepEqual(parsed, { top: [], sponsored: [], free: [{ cabinet: 'Cabinet Synthétique', ville: 'Montréal', palier: 'free' }] });
  for (const priv of ['secret@synthetique.test', 'Me Secret', '514 555-0199', 'rue Secrète', 'sansnom.test', 'cache@']) assert.ok(!body.includes(priv), `fuite : ${priv}`);

  const page = await fetch(`${base}/avocats`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Nos avocats/);
  assert.match(html, /id="firms-search"/);
  assert.match(html, /Emplacements partenaires — à venir/);
  assert.ok(!html.includes('secret@synthetique.test'));

  const script = await fetch(`${base}/avocats.js`);
  assert.equal(script.status, 200);
});

test('HTTP : sans dataset déposé, /api/firms répond des sections vides', async (t) => {
  const base = await fixtureApp(t, path.join(tmpdir(), 'ba-firms-inexistant.json'));
  const api = await fetch(`${base}/api/firms`);
  assert.equal(api.status, 200);
  assert.deepEqual(await api.json(), { top: [], sponsored: [], free: [] });
});
