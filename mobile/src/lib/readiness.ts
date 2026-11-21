// The four steps that make a file "ready" for a lawyer, computed from what the portal returns.
import type { CaseDetails } from './types';

export type Step = { id: string; label: string; done: boolean };

export function readinessSteps(details: Pick<CaseDetails, 'case' | 'documents'>): Step[] {
  const p = details.case.profile;
  return [
    { id: 'domain', label: 'Choisir le domaine de droit', done: Boolean(p?.domain) },
    { id: 'summary', label: 'Décrire votre situation', done: (p?.summary ?? '').trim().length >= 20 },
    { id: 'documents', label: 'Ajouter au moins une pièce', done: details.documents.length > 0 },
    { id: 'ready', label: 'Indiquer que le dossier est prêt', done: p?.status === 'pret' || p?.status === 'accepte' },
  ];
}

export const readinessRatio = (steps: Step[]) => steps.filter(s => s.done).length / steps.length;
