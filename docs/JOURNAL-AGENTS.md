# Journal des agents — BesoinAvocat

Règle du propriétaire (29 octobre 2026), reprise dans [AGENTS.md](../AGENTS.md) : tout agent écrit ici **avant, pendant et après** son travail, et recopie chaque entrée sur Drive, dans le dossier partagé `11B5CeNU_lZgO2VFA_fzejoLJNkSZdnv-` : un fichier par entrée, intitulé `AAAA-MM-JJ HH-MM — BesoinAvocat — JOURNAL — Agent — ÉTIQUETTE`. Le journal est en ajout seul : ajouter des lignes en bas, ne jamais supprimer ni réécrire celles d'un autre agent.

Format : `AAAA-MM-JJ HH:MM UTC · Agent (outil, session) · ÉTIQUETTE · branche · zones · résumé`.
Étiquettes : `DÉBUT` (réserve des zones), `ÉTAPE`, `FIN` (libère les zones), `ALERTE` (conflit ou risque), `REPRISE`.

## Historique reconstitué (avant ce journal)

- 2026-10-28 · Claude (Claude Code) · FIN · `main` `a2b2d11` · `www/` · Vitrine : copie exacte du site WordPress, couleurs juridiques (D-026).
- 2026-10-29 03:51 UTC · Claude (Claude Code) · FIN · `main` `efef692` · `platform/lib/integrations.mjs`, écran Intégrations · Intégrateur de connecteurs (D-027).
- 2026-10-29 04:24 à 04:54 UTC · Codex · FIN · PR 3 et PR 4 · sauvegarde du corpus, connexion par code courriel · Voir [OTP-EMAIL-STATUS-2026-10-29](OTP-EMAIL-STATUS-2026-10-29.md).
- 2026-10-29 07:24 UTC · KLEAN · FIN · `main` `7faf420` · statut du code courriel · Fusion vérifiée, santé en ligne; la réception du code reste à faire par le propriétaire.

## Entrées

- 2026-10-29 07:55 UTC · Claude (Claude Code, session 01CXwosv) · DÉBUT · `codex/workspace-premium-2026-10-29` · `AGENTS.md` (section notes), `docs/JOURNAL-AGENTS.md`, `platform/public/*` (refonte de l'espace de travail), `platform/server.mjs` et `platform/lib/validation.mjs` (CSP, types de fichiers vidéo et document) · Diagnostic de la connexion du propriétaire, puis espace de travail premium. Prévu : fichiers en tuiles, visionneuse ajustable, « Appeler mon avocat », message vidéo, éditeur de document, tableau à dessin, éditeur d'image, navigation mobile par glissement.
- 2026-10-29 07:58 UTC · Claude (Claude Code, session 01CXwosv) · ÉTAPE · — · diagnostic seulement, aucun fichier · **Connexion** : `portail.besoinavocat.ca` pointe encore vers l'ancien serveur MochaHost (`209.42.24.127`), un portail v1 **sans aucune connexion** (« Connexion non activée »). Le portail avec code courriel est seulement sur Coolify : <https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io>. Sa demande de code répond normalement (test avec une adresse fictive, sans compte ni envoi). Correction : faire pointer `portail` vers `31.220.96.134` et le déclarer dans Coolify (étape de Mike, DEV-A-FAIRE §3.4). D'ici là, utiliser l'adresse d'essai. Si le code n'arrive pas : voir les journaux Auth de Supabase (OTP-EMAIL-STATUS).
- 2026-10-29 08:30 UTC · Claude (Claude Code, session 01CXwosv) · ÉTAPE + ALERTE · `codex/workspace-premium-2026-10-29` (`134ef32`, poussée) · zones toujours réservées, détail ci-dessous · **Pause à la demande du propriétaire, en attendant sa prochaine consigne.** Notes relues avant l'arrêt (journal, AGENT_HANDOFF, Drive). Rien de neuf sur BesoinAvocat depuis 07:58; les nouvelles notes de Drive concernent d'autres projets (MIMT, tablettes DoorDash, KLEAN).
  - **Déploiement** : le portail d'essai Coolify sert exactement les fichiers de `main` (empreintes `app.js` et `styles.css` identiques, connexion par code courriel active). Rien de `main` n'attend de déploiement. `portail.besoinavocat.ca` répond encore avec l'ancien serveur MochaHost (`identityConfigured:false`, sans connexion) : c'est la bascule DNS de Mike (DEV-A-FAIRE §3.4).
  - **Travail en cours, non déployé, sur la branche seulement** :
    - types vidéo et voix acceptés (`platform/lib/validation.mjs`, liste `MIME_TYPES`); HTML et SVG toujours refusés;
    - CSP `media-src 'self' blob:` et `frame-src blob:`, caméra permise sur la page du portail seulement (`platform/server.mjs`, constante `CSP` et `securityHeaders`);
    - nouveau système visuel (`platform/public/styles.css`, entièrement réécrit, classes existantes conservées);
    - tests `platform/test/workspace-media.test.mjs` et ligne de permissions de `dictation-http.test.mjs`. 12/12 et 234/234 réussis.
  - **Zones encore réservées** (ne pas modifier sans entrée `ALERTE` ici) : `platform/public/styles.css`, `platform/public/index.html`, `platform/public/app.js`, le futur `platform/public/workspace.js`, la constante `CSP` et `securityHeaders` de `platform/server.mjs`, `MIME_TYPES` de `platform/lib/validation.mjs`.
  - **Zones libérées** : `AGENTS.md` et la règle de ce journal. Le reste du dépôt n'est pas réservé par moi.
  - **Consigne aux autres agents** :
    - avant toute modification du portail, lire ce journal et `git log origin/codex/workspace-premium-2026-10-29`;
    - si vous devez toucher une zone réservée (correctif urgent par exemple), écrivez d'abord une `ALERTE` ici et sur Drive, puis faites un commit séparé sur `main` : je l'intégrerai à ma branche sans réécrire l'historique;
    - ne fusionnez pas ma branche dans `main` : elle n'est ni terminée ni contrôlée dans le navigateur.
- 2026-10-29 10:58 UTC · KLEAN (Muse) · DÉBUT · `main` · `docs/OTP-EMAIL-STATUS-2026-10-29.md`, `docs/JOURNAL-AGENTS.md` (ajout seul) · Vérification continuée du code courriel : tests locaux sur `main` 65f4623, santé du portail test, problèmes ouverts, état DNS du portail public. Aucune zone réservée par Claude touchée, aucune branche fusionnée, aucun DNS modifié.
