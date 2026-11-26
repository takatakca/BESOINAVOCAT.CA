# Sortie de Supabase payant — plan (2026-11-21)

> **2026-11-26 : travail arrêté.** Le propriétaire a confié Supabase à son développeur. Rien n'a été changé chez Supabase ni dans Coolify. Remise en anglais : [SUPABASE-HANDOFF-FOR-DEV.md](SUPABASE-HANDOFF-FOR-DEV.md).

Décision du propriétaire, 2026-11-21 16:13 UTC : quitter Supabase (forfait Pro, trop cher) et héberger la base **sur notre serveur Coolify** (option choisie sur la carte de décision du fil « Remplacer Supabase par une solution moins chère »).

## Ce qui est facturé aujourd'hui

Organisation Supabase `takatakca`, forfait **Pro**, 5 projets allumés (environ 65 $ US par mois).

| Projet | Comptes | Base | Utilisé par |
|---|---|---|---|
| TAKATAK User Official Dashboard V1 (`pcjfahhlozsseqqevimi`, eu-west-1) | 60 | 83 Mo (public 56 Mo, 155 tables; schémas `rentauto`, `isexy`, `foodhub`) | takatak.ca (takatak-v1) **et** la connexion du portail BesoinAvocat |
| TAKATAK STAGING (`utuvzrqvivqyziibobvu`) | 0 | 81 Mo | référencé dans takatak-v1 (essais) |
| ALKAO (`ysghtkallwuoodwqgkjm`) | 1 (dernière connexion 2026-10-10) | 142 Mo | à confirmer |
| takatak-foodhub (`uwowuktwcsxbvnfjjpwh`) | 0 | 14 Mo | à confirmer |
| FESTI ICE (`anyiaszbjsyrxfgjbwdt`) | 0 | 11 Mo | à confirmer |

Les comptes du projet principal ne sont pas tous des tests : Costa (client pilote) et des adresses de restaurants y figurent. **On les copie tous.**

## Ce qui dépend de Supabase

- **Portail BesoinAvocat** (`platform/lib/browser-session.mjs`) : seulement l'API de connexion (GoTrue) : `/auth/v1/token`, `/user`, `/otp`, `/verify`, `/authorize` (Google). Les dossiers sont déjà chez nous. Changement : `TAKATAK_SUPABASE_URL` et `TAKATAK_SUPABASE_PUBLISHABLE_KEY` dans Coolify.
- **takatak.ca** (`takatakca/takatak-v1`, Next.js) : Supabase Auth (code courriel et SMS, Google, serveur OAuth, double facteur), tables par PostgREST, Edge Functions `rentauto-*` et `identity-context`, Prisma sur la même base (`DATABASE_URL`, `DIRECT_URL`). Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`.
- Courriels d'authentification : SMTP Resend (`noreply@mimt.ca`), à recopier dans le nouveau service Auth.

## Solution retenue

Supabase **auto-hébergé** (logiciel libre, gratuit) en service Coolify sur le serveur `vps1` (31.220.96.134). Même API : aucun changement de code, seulement des variables d'environnement.

## Étapes

1. Vérifier la mémoire et le disque du serveur dans Coolify (il faut environ 2 à 4 Go de mémoire libre).
2. Créer le service « Supabase » dans Coolify, avec une adresse neutre (pas de « takatak » visible pour les clients BesoinAvocat, règle de séparation des marques).
3. Copier la base du projet principal (`pg_dump` des schémas `auth`, `public`, `storage`, `rentauto`, `isexy`, `foodhub`, puis les fichiers de Storage). Les mots de passe chiffrés sont copiés tels quels : personne n'a à recréer son compte.
4. Recopier les réglages Auth : SMTP Resend, Google, adresses de retour (`https://takatak.ca/**`, `https://portail.besoinavocat.ca/**`), durée des codes.
5. Déployer les Edge Functions sur le nouveau service.
6. Brancher d'abord le portail BesoinAvocat, vérifier la connexion par code; puis takatak.ca.
7. Sauvegarde nocturne gratuite de la nouvelle base.
8. Après vérification et **oui du propriétaire** seulement : mettre les projets Supabase en pause, puis repasser au forfait gratuit (ou fermer l'organisation).

Rien n'est supprimé, mis en pause ni rétrogradé chez Supabase avant l'étape 8.
