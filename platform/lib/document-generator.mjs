import { randomUUID } from 'node:crypto';
import { createPdf } from './pdf.mjs';
import { fields, identifier, invalid, text } from './validation.mjs';

// Documents generated from the case's own records, saved back into the case as PDF pieces (with SHA-256, version and
// provenance, like any upload). They compile facts already in the portal; none of them writes legal text. The only free
// text is the lawyer's own template, filled with case fields. Every document says it is a working document to verify.
const MANAGERS = ['owner', 'lawyer'];
export const DOCUMENT_KINDS = Object.freeze({
  exhibit_list: { label: 'Liste des pièces', description: 'Chaque pièce du dossier, numérotée P-1, P-2…, avec sa date de dépôt, sa version, sa nature déclarée et son empreinte SHA-256.' },
  case_summary: { label: 'Résumé du dossier', description: 'Personnes et rôles, pièces, rendez-vous, appels, vidéo et temps : l’état du dossier à cette date.' },
  call_record: { label: 'Procès-verbal d’appel', description: 'Un appel téléphonique : participants, heures de sonnerie, de réponse et de fin, durée attestée par MIMT, crédits, enregistrement.' },
  audit_journal: { label: 'Journal horodaté scellé', description: 'Toutes les actions sur le dossier, dans l’ordre, chaînées par SHA-256 avec l’empreinte de tête qui les scelle.' },
  time_statement: { label: 'Relevé de temps', description: 'Les déclarations de temps du dossier, leur auteur, leur état et la personne qui les a validées.' },
  template: { label: 'Document à partir de votre gabarit', description: 'Votre propre texte, avec les champs {{dossier.titre}}, {{dossier.reference}}, {{date}}, {{auteur}} et {{pieces}} remplis par le portail.' },
});
const ROLE = { owner: 'Responsable', lawyer: 'Avocat', client: 'Client' };
const PLACEHOLDER = /\{\{\s*([a-z.]+)\s*\}\}/gu;

function long(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'America/Toronto' }).format(new Date(iso));
}
const seconds = s => (Number.isFinite(s) ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : '—');
const short = hash => (typeof hash === 'string' ? `${hash.slice(0, 16)}…${hash.slice(-8)}` : '—');

export function createDocumentGenerator({ db, access, store, communications, telephony, video, auditSeal, clock = Date.now }) {
  if (!db || typeof access !== 'function' || !store) throw new Error('Document generator requires db, access and store');
  const sql = query => db.prepare(query);
  const membersOf = (user, caseId) => sql('SELECT subject, role FROM members WHERE tenantId=? AND caseId=? ORDER BY role, subject').all(user.tenantId, caseId);
  const footerFor = (id) => `Généré par BesoinAvocat le ${long(new Date(clock()).toISOString())} · référence ${id} · document de travail à vérifier · BesoinAvocat n’est pas un cabinet d’avocats et ne donne pas de conseil juridique`;

  function build(user, caseId, kind, body) {
    const detail = store.details(user, caseId);
    const c = detail.case;
    const id = randomUUID();
    const now = new Date(clock()).toISOString();
    const meta = [['Dossier', c.title], ['Référence', c.reference || '—'], ['Généré le', long(now)], ['Généré par', `${user.subject} (${ROLE[c.role] || c.role})`]];
    const pdf = (title, subtitle, extra = []) => createPdf({ title, subtitle, meta: [...meta, ...extra], footer: footerFor(id) });
    const docs = detail.documents;
    const lines = [];
    let doc, name;

    if (kind === 'exhibit_list') {
      doc = pdf('Liste des pièces', 'Inventaire des pièces versées au portail, dans l’ordre de dépôt. La cote proposée (P-1, P-2…) est à confirmer par l’avocat.', [['Nombre de pièces', String(docs.length)]]);
      const rows = docs.map((d, i) => [`P-${i + 1}`, d.name, `v${d.versionNumber}`, long(d.createdAt), d.sourceType === 'original' ? 'Original' : d.sourceType, d.sha256]);
      doc.table([{ label: 'Cote', width: 0.08 }, { label: 'Pièce', width: 0.3 }, { label: 'Ver.', width: 0.06 }, { label: 'Déposée le', width: 0.2 }, { label: 'Nature', width: 0.1 }, { label: 'SHA-256', width: 0.26, mono: true }], rows);
      doc.note('L’empreinte SHA-256 identifie exactement le fichier versé : un seul octet modifié change l’empreinte. Elle ne prouve ni l’authenticité du document ni la véracité de son contenu.');
      rows.forEach(r => lines.push(`${r[0]} ${r[1]} ${r[2]} ${r[3]} ${r[5]}`));
      name = `Liste des pieces - ${c.reference || c.title}`;
    } else if (kind === 'case_summary') {
      const members = membersOf(user, caseId);
      const sessions = communications ? communications.list(user, caseId).sessions : [];
      const calls = telephony ? telephony.callsForDocument(user, caseId) : [];
      const rooms = video ? video.history(user, caseId) : [];
      const time = detail.timeEntries;
      doc = pdf('Résumé du dossier', 'État du dossier à la date de génération, établi à partir des données du portail.');
      doc.heading('Personnes');
      doc.table([{ label: 'Identifiant', width: 0.6 }, { label: 'Rôle', width: 0.4 }], members.map(m => [m.subject, ROLE[m.role] || m.role]));
      doc.heading('En chiffres');
      const counts = [['Pièces versées', docs.length], ['Pièces à vérifier', docs.filter(d => d.reviewStatus === 'a_verifier').length], ['Messages', detail.messages.length],
        ['Rendez-vous', sessions.length], ['Appels téléphoniques', calls.length], ['Séances vidéo', rooms.length],
        ['Temps déclaré', `${time.reduce((s, t) => s + t.minutes, 0)} min`], ['Temps validé', `${time.filter(t => t.status === 'approved').reduce((s, t) => s + t.minutes, 0)} min`]];
      doc.table([{ label: 'Élément', width: 0.6 }, { label: 'Valeur', width: 0.4 }], counts.map(([a, b]) => [a, String(b)]));
      doc.heading('Rendez-vous');
      doc.table([{ label: 'Date', width: 0.32 }, { label: 'Type', width: 0.14 }, { label: 'Titre', width: 0.38 }, { label: 'État', width: 0.16 }],
        sessions.map(s => [long(s.scheduledAt), s.kind === 'video' ? 'Vidéo' : 'Téléphone', s.title, s.status === 'cancelled' ? 'Annulé' : 'Prévu']));
      doc.heading('Appels');
      doc.table([{ label: 'Début', width: 0.32 }, { label: 'De → à', width: 0.38 }, { label: 'État', width: 0.14 }, { label: 'Durée', width: 0.16 }],
        calls.map(k => [long(k.createdAt), `${k.callerSubject || 'externe'} → ${k.calleeSubject || k.answeredBy || '—'}`, k.status, seconds(k.durationSeconds)]));
      doc.heading('Séances vidéo');
      doc.table([{ label: 'Ouverte le', width: 0.32 }, { label: 'Fermée le', width: 0.32 }, { label: 'Présences', width: 0.36 }],
        rooms.map(r => [long(r.createdAt), long(r.endedAt), r.attendance.map(a => `${a.subject} ${seconds(a.totalSeconds)}`).join(', ') || '—']));
      counts.forEach(([a, b]) => lines.push(`${a} : ${b}`));
      name = `Resume du dossier - ${c.reference || c.title}`;
    } else if (kind === 'call_record') {
      if (!telephony) throw invalid('La téléphonie n’est pas disponible.');
      const { call, events } = telephony.callEvents(user, caseId, identifier(body.callId));
      doc = pdf('Procès-verbal d’appel', 'Déroulement d’un appel passé par la plateforme. Les heures proviennent des notifications signées de MIMT (MIMT Connect), reçues et vérifiées par le serveur.', [['Appel', call.id]]);
      doc.heading('Appel');
      doc.table([{ label: 'Élément', width: 0.38 }, { label: 'Valeur', width: 0.62 }], [
        ['Appelant', call.callerSubject || 'Numéro externe'], ['Appelé', call.calleeSubject || call.answeredBy || '—'], ['Demandé le', long(call.createdAt)],
        ['Sonnerie', long(call.ringingAt)], ['Réponse', long(call.answeredAt)], ['Fin', long(call.endedAt)], ['État final', call.status],
        ['Durée de conversation', seconds(call.durationSeconds)], ['Crédits MIMT', call.credits === null ? '—' : String(call.credits)],
        ['Opérateur', 'MIMT (mimt.ca), MIMT Connect'], ['Sonnerie de l’avocat', call.via === 'mobile' ? 'Cellulaire' : call.via === 'app' ? 'Applications MIMT' : '—'],
        ['Source de la durée', call.durationSource === 'mimt_signed_webhook' ? 'Notification signée de MIMT' : 'Non attestée'],
        ['Enregistrement', call.hasRecording ? `Oui, ${seconds(call.recordingSeconds)}, avec l’avis de consentement de MIMT` : 'Aucun']]);
      doc.heading('Événements');
      doc.table([{ label: 'Heure', width: 0.4 }, { label: 'Événement', width: 0.35 }, { label: 'Source', width: 0.25 }], events.map(e => [long(e.at), e.status, e.source]));
      lines.push(`Appel ${call.id} ${call.status} ${call.durationSeconds ?? ''} s`);
      name = `Proces-verbal d'appel - ${long(call.createdAt).replace(/[:/\\]/gu, '-')}`;
    } else if (kind === 'audit_journal') {
      if (!auditSeal) throw invalid('Le journal n’est pas disponible.');
      const sealed = auditSeal.seal(user, caseId);
      doc = pdf('Journal horodaté scellé', 'Toutes les actions enregistrées sur le dossier, dans l’ordre d’insertion. Chaque ligne est chaînée à la précédente par SHA-256 : modifier, retirer ou déplacer une ligne change toutes les empreintes suivantes.',
        [['Événements', String(sealed.seal.eventCount)], ['Empreinte de tête', sealed.seal.headDigest], ['Scellé le', long(sealed.seal.sealedAt)]]);
      doc.table([{ label: '#', width: 0.06 }, { label: 'Horodatage (UTC)', width: 0.24 }, { label: 'Personne', width: 0.18 }, { label: 'Action', width: 0.24 }, { label: 'Chaîne', width: 0.28, mono: true }],
        sealed.events.map(e => [String(e.position), e.createdAt, e.subject, e.action, short(e.chain)]));
      doc.note(`Vérification : départ ${sealed.genesis}; chaque empreinte = SHA-256(empreinte précédente + saut de ligne + JSON [id, personne, action, cible, horodatage, détails]). Le portail conserve ce sceau et le compare à chaque vérification.`);
      lines.push(`Journal scellé ${sealed.seal.eventCount} événements ${sealed.seal.headDigest}`);
      name = `Journal horodate - ${c.reference || c.title}`;
    } else if (kind === 'time_statement') {
      const time = detail.timeEntries;
      doc = pdf('Relevé de temps', 'Déclarations de temps du dossier. Une déclaration validée l’a été par une autre personne habilitée que son auteur.', [['Total déclaré', `${time.reduce((s, t) => s + t.minutes, 0)} min`]]);
      doc.table([{ label: 'Date', width: 0.24 }, { label: 'Auteur', width: 0.16 }, { label: 'Description', width: 0.34 }, { label: 'Min', width: 0.08 }, { label: 'Validé', width: 0.18 }],
        time.map(t => [long(t.createdAt), t.authorSubject, t.description, String(t.minutes), t.status === 'approved' ? `${t.approvedBy}` : 'Non']));
      time.forEach(t => lines.push(`${t.createdAt} ${t.authorSubject} ${t.minutes} min ${t.description}`));
      name = `Releve de temps - ${c.reference || c.title}`;
    } else if (kind === 'template') {
      const title = text(body.title, 'Titre', 160).trim();
      const source = text(body.body, 'Gabarit', 20000, { multiline: true });
      const values = { 'dossier.titre': c.title, 'dossier.reference': c.reference || '', date: new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long', timeZone: 'America/Toronto' }).format(new Date(now)),
        auteur: user.subject, pieces: docs.map((d, i) => `P-${i + 1} ${d.name}`).join('\n') };
      const unknown = new Set();
      const filled = source.replace(PLACEHOLDER, (all, key) => (Object.hasOwn(values, key) ? values[key] : (unknown.add(key), all)));
      doc = pdf(title, 'Document établi à partir du gabarit fourni par l’avocat. Le texte est celui de l’avocat; le portail n’a rempli que les champs du dossier.');
      for (const paragraph of filled.split(/\n{2,}/u)) doc.paragraph(paragraph);
      if (unknown.size) doc.note(`Champs non reconnus laissés tels quels : ${[...unknown].map(k => `{{${k}}}`).join(', ')}.`);
      lines.push(filled);
      name = title;
    } else throw invalid('Type de document inconnu.');

    const bytes = doc.toBuffer();
    const fileName = `${name.replace(/[\\/:<>"|?*]/gu, '-').replace(/\.+$/u, '').slice(0, 200)}.pdf`;
    const saved = store.addDocument(user, caseId, { name: fileName, mimeType: 'application/pdf', bytes, sourceType: 'analyse',
      sourceReference: `Généré par BesoinAvocat (${DOCUMENT_KINDS[kind].label}), référence ${id}`, extractedText: lines.join('\n').slice(0, 200000), reviewStatus: 'a_verifier', versionOf: null });
    return { document: saved, kind, generationId: id };
  }

  function generate(user, caseId, body) {
    fields(body, ['kind', 'callId', 'title', 'body'], ['kind']);
    if (!Object.hasOwn(DOCUMENT_KINDS, body.kind)) throw invalid('Type de document inconnu.');
    access(user, caseId, MANAGERS);
    if (body.kind === 'call_record' && body.callId === undefined) throw invalid('Choisissez l’appel.');
    if (body.kind === 'template' && (body.title === undefined || body.body === undefined)) throw invalid('Le gabarit demande un titre et un texte.');
    return build(user, caseId, body.kind, body);
  }
  function catalog(user, caseId) {
    const row = access(user, caseId);
    return { kinds: Object.entries(DOCUMENT_KINDS).map(([id, k]) => ({ id, ...k })), canGenerate: MANAGERS.includes(row.role) };
  }
  return Object.freeze({ generate, catalog });
}
