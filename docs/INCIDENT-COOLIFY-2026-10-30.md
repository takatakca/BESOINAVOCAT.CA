# Incident Coolify et portail — 30 octobre 2026

État à **11:24 UTC (07:24 à Montréal)** : le portail répond 503; les opérations Coolify examinées répondent 500 ou 504. L'erreur 500 mentionne une limite de 268435456 octets. La cause du 503 n'est pas établie. [Constats et traçabilité](RECEPTION-RATTACHEMENT-2026-10-30.md).

## Diagnostic demandé à l'intervenant VPS

Utiliser la console du fournisseur ou un accès d'administration existant; le terminal Coolify est lui-même en échec. Relever l'heure puis, en lecture seule :

```bash
date -u
free -m
df -h
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}'
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

Pour `coolify` et le conteneur du portail identifié dans la liste, ne relever que les champs d'état nécessaires : statut, `OOMKilled`, code de sortie et nombre de redémarrages. Ne pas exporter l'environnement, les jetons ou une inspection Docker complète.

```bash
docker inspect --format 'status={{.State.Status}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}} restarts={{.RestartCount}}' coolify
docker exec coolify php -r 'echo ini_get("memory_limit"), PHP_EOL;'
```

## Option à valider après diagnostic

La documentation officielle indique que `PHP_MEMORY_LIMIT` vaut normalement `256M` **par script PHP**, indépendamment de la limite mémoire Docker. L'augmenter ne crée pas de RAM disponible. Si les ressources mesurées le permettent et si le responsable valide cette intervention :

1. Sauvegarder `.env` de Coolify dans un emplacement privé, puis modifier l'entrée existante vers `512M`, sans changer les autres valeurs.
2. Suivre la procédure officielle de recréation du **seul conteneur Coolify**, en gardant son image actuelle et les éventuels fichiers Compose personnalisés.
3. Ne pas exécuter `docker compose down`, ne pas redémarrer les autres applications et ne pas modifier les fichiers Compose générés.
4. Vérifier la limite effective, le panneau, puis indépendamment la santé du portail. Un simple redémarrage ne recharge pas les variables d'environnement.

[Procédure officielle Coolify, lue le 30 octobre 2026](https://coolify.io/docs/core/instance-management/environment-variables).

Cette option n'est pas exécutée par la présente note. Elle ne garantit pas la résolution des réponses 503. Conserver les constats, l'heure, les actions exactes et un retour arrière; aucun changement DNS, volume ou donnée de dossier avant clarification.

## Reprise ensuite

- Contrôler HTTPS, santé JSON, page et ressources du portail.
- Refaire la recette du compte après reconnexion : les trois dossiers historiques, pièces, recherche et téléchargement.
- Reprendre seulement ensuite l'import CNESST et la création de la vitrine; séparer le courrier de l'apex avant toute bascule DNS.

L'alerte a été transmise dans le fil de coordination autorisé au seul compte du propriétaire. L'accès à la console VPS et l'identification de l'intervenant restent attendus.
