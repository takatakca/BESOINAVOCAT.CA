// Annuaire public des cabinets (« Nos avocats »).
// Le dataset arrière-plan (platform/data/firms.json, généré par tools/generate-firms.mjs) contient les
// coordonnées complètes des cabinets pour l'équipe BesoinAvocat. Ce module est la SEULE porte de sortie
// publique : il ne projette que le nom du cabinet, sa ville et son palier. Les courriels, téléphones,
// adresses et noms de contacts ne quittent jamais ce module.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIRMS_TIERS = ['top', 'sponsored', 'free'];
export const TOP_PLACEMENT_LIMIT = 3;

const byNameFr = (a, b) => a.cabinet.localeCompare(b.cabinet, 'fr');

/** Projection publique d'un dataset : seuls { cabinet, ville, palier } survivent, par palier. */
export function projectFirms(firms) {
  const tiers = { top: [], sponsored: [], free: [] };
  for (const firm of Array.isArray(firms) ? firms : []) {
    if (!firm || typeof firm.cabinet !== 'string' || !firm.cabinet.trim()) continue;
    const palier = FIRMS_TIERS.includes(firm.palier) ? firm.palier : 'free';
    tiers[palier].push({ cabinet: firm.cabinet.trim(), ville: typeof firm.ville === 'string' && firm.ville.trim() ? firm.ville.trim() : null, palier });
  }
  tiers.top = tiers.top.sort(byNameFr).slice(0, TOP_PLACEMENT_LIMIT);
  tiers.sponsored.sort(byNameFr);
  tiers.free.sort(byNameFr);
  return tiers;
}

/**
 * Charge le dataset arrière-plan et expose sa projection publique.
 * Fichier absent ou illisible : annuaire vide (la page affiche ses états « à venir »), jamais d'erreur.
 */
export function createFirmsDirectory({ file } = {}) {
  let firms = [];
  let configured = false;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (parsed && Array.isArray(parsed.firms)) { firms = parsed.firms; configured = true; }
  } catch { /* dataset non déposé : annuaire vide */ }
  return {
    configured,
    total: firms.length,
    publicDirectory: () => projectFirms(firms),
  };
}

export function firmsDirectoryConfiguration(env = process.env) {
  const file = typeof env.BESOINAVOCAT_FIRMS_FILE === 'string' && env.BESOINAVOCAT_FIRMS_FILE.trim()
    ? env.BESOINAVOCAT_FIRMS_FILE.trim()
    : join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'firms.json');
  return { file };
}
