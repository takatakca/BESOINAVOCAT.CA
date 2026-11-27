// Dépôt de pièces dès la création du premier dossier (demande du propriétaire, 18 novembre 2026) : la fenêtre « Nouveau
// dossier » accepte plusieurs fichiers, envoyés un à un après la création par les routes de dépôt existantes, avec les
// mêmes gardes (taille, forfait D-041). Le rendu réel est couvert par la QA Chromium; ici, le contrat du code source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test('la fenêtre du dossier propose un dépôt de plusieurs fichiers, facultatif, avec les formats et la limite du serveur', () => {
  const dialog = between('function filesField(', 'function openCaseProfile(');
  assert.match(dialog, /id="case-files"[^>]*name="files"[^>]*type="file"[^>]*multiple/u);
  assert.match(dialog, /facultatif, plusieurs fichiers/u);
  assert.match(dialog, /maxDocumentBytes/u, 'la limite par fichier vient de /api/capabilities');
  assert.match(dialog, /\.mp4|\.webm/u, 'vidéo acceptée dans la liste; le serveur tranche selon le forfait');
  assert.match(dialog, /welcome \? 'Votre premier dossier' : 'Nouveau dossier'/u);
  assert.match(dialog, /14 jours gratuits pour commencer/u);
});

test('après la création, les fichiers partent un à un par la file de dépôt; un refus du forfait arrête la série sans annuler le dossier', () => {
  const branch = between("if (form.id === 'case-form')", "} else if (form.id === 'case-profile-form')");
  assert.match(branch, /data\.getAll\('files'\)/u);
  assert.match(branch, /files\.length > 20/u);
  assert.match(branch, /queueUpload\(\(\) => postDocument\(result\.case\.id, file/u);
  assert.match(branch, /sourceType: 'original', reviewStatus: 'a_verifier'/u);
  assert.match(branch, /error\.status === 402\) break/u);
  assert.ok(branch.indexOf("api('/api/cases', { method: 'POST'") < branch.indexOf('postDocument('), 'le dossier est créé avant le premier envoi');
});

test('à l’inscription, le premier dossier s’ouvre en mode accueil et les refus 402 renvoient vers « Mon forfait »', () => {
  const signup = between('async function verifyClientSignup(', 'async function login(');
  assert.match(signup, /openNewCase\(\{ welcome: true \}\)/u);
  assert.match(signup, /Activez vos 14 jours gratuits/u);
  assert.match(signup, /await maybeCardGate\(\)/u, 'la carte est demandée avant le premier dossier (D-046)');
  assert.match(source, /response\.status === 402 \? ' Voir « Mon forfait » dans les réglages\.' : ''/u);
});
