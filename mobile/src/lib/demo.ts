// Fictitious data for the visual preview only (EXPO_PUBLIC_DEMO=1: screenshots, store images, design review).
// Never part of a store build: the flag is off by default and the module is only required when it is on.
// Every name here is invented and marked as an example; no real lawyer, client or file.
import type * as T from './types';

const now = Date.now();
const iso = (days: number, h = 10) => new Date(now + days * 86400000 + h * 3600000).toISOString();
const date = (days: number) => iso(days).slice(0, 10);

const domains: T.Domain[] = [
  { id: 'famille', label: 'Droit de la famille' }, { id: 'jeunesse', label: 'Jeunesse' }, { id: 'civil', label: 'Civil' },
  { id: 'logement', label: 'Logement' }, { id: 'travail', label: 'Travail' }, { id: 'criminel', label: 'Criminel' },
  { id: 'immigration', label: 'Immigration' }, { id: 'succession', label: 'Successions' },
];

const profile = (over: Partial<T.Profile> = {}): T.Profile => ({ domain: 'famille', domainLabel: 'Droit de la famille', summary: 'Séparation depuis mars. Je souhaite une garde partagée des deux enfants et un calendrier clair pour les fêtes. Les échanges avec l’autre parent se font par courriel.', status: 'preparation', readyAt: null, acceptedBy: null, acceptedAt: null, ...over });

const cases: T.Case[] = [
  { id: 'c1', title: 'Garde partagée des enfants (exemple)', reference: 'EX-2026-014', createdAt: iso(-12), createdBy: 'me', role: 'client', profile: profile() },
  { id: 'c2', title: 'Dépôt de garantie du logement (exemple)', reference: 'EX-2026-009', createdAt: iso(-40), createdBy: 'me', role: 'client', profile: profile({ domain: 'logement', domainLabel: 'Logement', status: 'accepte', acceptedAt: iso(-20) }) },
];

const documents: T.Document[] = [
  { id: 'd1', caseId: 'c1', rootDocumentId: 'd1', versionOf: null, versionNumber: 1, name: 'Entente provisoire.pdf', mimeType: 'application/pdf', sha256: '', bytes: 248000, sourceType: 'original', reviewStatus: 'a_verifier', createdAt: iso(-10), createdBy: 'me' },
  { id: 'd2', caseId: 'c1', rootDocumentId: 'd2', versionOf: null, versionNumber: 1, name: 'Calendrier scolaire 2026-2027.pdf', mimeType: 'application/pdf', sha256: '', bytes: 112000, sourceType: 'original', reviewStatus: 'a_verifier', createdAt: iso(-6), createdBy: 'me' },
  { id: 'd3', caseId: 'c1', rootDocumentId: 'd3', versionOf: null, versionNumber: 1, name: 'Photo 2026-11-19 09h14.jpg', mimeType: 'image/jpeg', sha256: '', bytes: 1840000, sourceType: 'original', reviewStatus: 'a_verifier', createdAt: iso(-2), createdBy: 'me' },
];

const messages: T.Message[] = [
  { id: 'm1', caseId: 'c1', body: 'Bonjour, j’ai ajouté l’entente provisoire et le calendrier scolaire. Faut-il aussi les relevés de paie ?', authorSubject: 'me', createdAt: iso(-3, 14) },
];

const deadlines: T.Deadline[] = [
  { id: 'e1', title: 'Fournir les relevés de paie', kind: 'document', kindLabel: 'Document', dueDate: date(3), dueTime: null, note: '', visibleToClient: true, status: 'open', daysLeft: 3, overdue: false, caseId: 'c1', caseTitle: cases[0]!.title },
  { id: 'e2', title: 'Séance de médiation familiale', kind: 'meeting', kindLabel: 'Rencontre', dueDate: date(11), dueTime: '13:30:00', note: '', visibleToClient: true, status: 'open', daysLeft: 11, overdue: false, caseId: 'c1', caseTitle: cases[0]!.title },
  { id: 'e3', title: 'Réponse du locateur', kind: 'other', kindLabel: 'Suivi', dueDate: date(24), dueTime: null, note: '', visibleToClient: true, status: 'open', daysLeft: 24, overdue: false, caseId: 'c2', caseTitle: cases[1]!.title },
];

const requests: T.DocRequest[] = [
  { id: 'r1', title: 'Trois derniers relevés de paie', note: 'Format PDF ou photo lisible.', dueDate: date(3), status: 'requested', documentId: null, answer: '', createdAt: iso(-1) },
];

const wait = <V,>(v: V) => new Promise<V>(r => setTimeout(() => r(v), 120));

export const demoApi = {
  me: () => wait({ user: { subject: 'me', tenantId: 't', name: 'Camille Exemple' } as T.User }),
  capabilities: () => wait({ intakeReview: false, lawyerSpace: { url: '/avocat', trialDays: 14, account: false }, clientAccount: true, caseMatching: { domains }, maxDocumentBytes: 50 * 1024 * 1024, caseStorageQuotaBytes: 1024 ** 3, billing: { configured: true, enforced: false } } as T.Capabilities),
  billing: () => wait({ configured: true, billed: true, kind: 'client', plan: { id: 'free', label: 'Découverte', source: 'default' }, usage: { bytes: 2200000, quotaBytes: 1024 ** 3, percent: 1, cases: 2, maxCases: 1 } } as T.Billing),
  upcoming: () => wait({ deadlines }),
  cases: () => wait({ cases }),
  caseDetails: (id: string) => wait({ case: cases.find(c => c.id === id) ?? cases[0]!, documents: id === 'c1' ? documents : [], messages: id === 'c1' ? messages : [], timeEntries: [], communications: { sessions: id === 'c1' ? [{ id: 's1', caseId: 'c1', kind: 'video', title: 'Premier appel avec l’avocat', scheduledAt: iso(5, 15), joinUrl: null, status: 'scheduled' }] : [] } } as T.CaseDetails),
  requests: (id: string) => wait({ requests: id === 'c1' ? requests : [], canRequest: false, open: id === 'c1' ? 1 : 0, toReview: 0 }),
  deadlines: (id: string) => wait({ deadlines: deadlines.filter(d => d.caseId === id) }),
  pricing: () => wait({ currency: 'CAD', trialDays: 14, client: { plans: [
    { id: 'free', label: 'Découverte', rank: 0, tagline: 'Préparer son dossier, gratuitement.', storageBytes: 1024 ** 3, maxCases: 1, video: false, prices: {}, features: ['1 dossier', '1 Go d’espace pour vos pièces', 'Messages et rendez-vous avec votre avocat'] },
    { id: 'member', label: 'Membre', rank: 1, tagline: 'Votre dossier au complet, vidéos comprises.', storageBytes: 25 * 1024 ** 3, maxCases: 5, video: true, prices: { month: 1500, year: 15000 }, features: ['5 dossiers', '25 Go d’espace', 'Vidéos dans vos pièces', 'Dossier proposé en priorité aux avocats'] },
    { id: 'premium', label: 'Premium', rank: 2, tagline: 'Sans limite de dossiers, avec un soutien prioritaire.', storageBytes: 100 * 1024 ** 3, maxCases: null, video: true, prices: { month: 3900, year: 39000 }, features: ['Dossiers illimités', '100 Go d’espace', 'Soutien prioritaire', 'Essai gratuit de 14 jours, sans carte'] },
  ] }, lawyer: { plans: [] } } as T.Pricing),
  search: () => wait({ results: documents.map(d => ({ ...d, excerpt: 'Extrait du document où le mot apparaît…' })) }),
  readyCases: () => wait({ cases: [], total: 0 }),
};
