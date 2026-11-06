import { randomUUID } from 'node:crypto';
import { HttpError, fields, identifier, invalid, text } from './validation.mjs';

// Échéances du dossier : the lawyer records dates that matter (audience, dépôt, prescription, rencontre, autre).
// The portal never computes a legal delay: every date is typed by the lawyer, who stays responsible for it. Each
// deadline says whether the client sees it. Steps are timestamped, kept append-only and written to the case audit.
const MANAGERS = ['owner', 'lawyer'];
export const KINDS = Object.freeze({ audience: 'Audience', depot: 'Dépôt', prescription: 'Prescription', rencontre: 'Rencontre', autre: 'Autre' });
const MAX_OPEN = 300;
const missing = () => new HttpError(404, 'NOT_FOUND', 'Échéance introuvable.');
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/u;

function validDate(value) {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export const ics = value => String(value).replace(/\\/gu, '\\\\').replace(/;/gu, '\\;').replace(/,/gu, '\\,').replace(/\r?\n/gu, '\\n');
// RFC 5545 lines are folded at 75 octets.
export function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = '';
  for (const ch of line) {
    if (Buffer.byteLength(current + ch, 'utf8') > (parts.length ? 74 : 75)) { parts.push(current); current = ''; }
    current += ch;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function createDeadlines({ db, access, audit, clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function') throw new Error('Deadlines require db, access and audit');
  db.exec(`
    CREATE TABLE IF NOT EXISTS case_deadlines (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      title TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('audience','depot','prescription','rencontre','autre')),
      dueDate TEXT NOT NULL, dueTime TEXT, note TEXT NOT NULL, visibleToClient INTEGER NOT NULL CHECK(visibleToClient IN (0,1)),
      status TEXT NOT NULL CHECK(status IN ('open','done','cancelled')),
      createdAt TEXT NOT NULL, createdBy TEXT NOT NULL, updatedAt TEXT NOT NULL, updatedBy TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS case_deadlines_due ON case_deadlines(tenantId,caseId,status,dueDate);
    CREATE TABLE IF NOT EXISTS case_deadline_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, deadlineId TEXT NOT NULL, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      action TEXT NOT NULL, subject TEXT NOT NULL, detail TEXT NOT NULL, at TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS case_deadline_events_no_update BEFORE UPDATE ON case_deadline_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
    CREATE TRIGGER IF NOT EXISTS case_deadline_events_no_delete BEFORE DELETE ON case_deadline_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const today = () => new Date(clock()).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  const tx = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const event = (user, row, action, detail = '') => sql('INSERT INTO case_deadline_events (deadlineId,tenantId,caseId,action,subject,detail,at) VALUES (?,?,?,?,?,?,?)').run(row.id, row.tenantId, row.caseId, action, user.subject, detail, now());
  const daysUntil = date => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86400000);
  const publicRow = row => ({ id: row.id, title: row.title, kind: row.kind, kindLabel: KINDS[row.kind], dueDate: row.dueDate, dueTime: row.dueTime, note: row.note,
    visibleToClient: Boolean(row.visibleToClient), status: row.status, daysLeft: daysUntil(row.dueDate), overdue: row.status === 'open' && daysUntil(row.dueDate) < 0,
    createdAt: row.createdAt, createdBy: row.createdBy, updatedAt: row.updatedAt });
  const visible = role => (MANAGERS.includes(role) ? '' : ' AND visibleToClient=1');
  function input(body, partial = false) {
    const value = fields(body, ['title', 'kind', 'dueDate', 'dueTime', 'note', 'visibleToClient'], partial ? [] : ['title', 'kind', 'dueDate']);
    const out = {};
    if (value.title !== undefined) { out.title = text(value.title, 'Titre', 200).trim(); if (!out.title) throw invalid('Titre de l’échéance requis.'); }
    if (value.kind !== undefined) { if (!Object.hasOwn(KINDS, value.kind)) throw invalid('Type d’échéance inconnu.'); out.kind = value.kind; }
    if (value.dueDate !== undefined) { if (!validDate(value.dueDate)) throw invalid('Date attendue au format AAAA-MM-JJ.'); out.dueDate = value.dueDate; }
    if (value.dueTime !== undefined) { if (value.dueTime !== null && value.dueTime !== '' && !TIME.test(value.dueTime)) throw invalid('Heure attendue au format HH:MM.'); out.dueTime = value.dueTime || null; }
    if (value.note !== undefined) out.note = text(value.note, 'Note', 2000, { optional: true, multiline: true }).trim();
    if (value.visibleToClient !== undefined) { if (typeof value.visibleToClient !== 'boolean') throw invalid('Visibilité invalide.'); out.visibleToClient = value.visibleToClient ? 1 : 0; }
    return out;
  }
  const find = (user, caseId, id, role) => {
    identifier(id);
    const row = sql(`SELECT * FROM case_deadlines WHERE id=? AND tenantId=? AND caseId=?${visible(role)}`).get(id, user.tenantId, caseId);
    if (!row) throw missing();
    return row;
  };

  return {
    kinds: KINDS,
    list(user, caseId) {
      const { role } = access(user, caseId);
      const rows = sql(`SELECT * FROM case_deadlines WHERE tenantId=? AND caseId=?${visible(role)} ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, dueDate, COALESCE(dueTime,'')`).all(user.tenantId, caseId);
      return { deadlines: rows.map(publicRow), canEdit: MANAGERS.includes(role), kinds: KINDS };
    },
    create(user, caseId, body) {
      access(user, caseId, MANAGERS);
      const value = { kind: 'autre', note: '', dueTime: null, visibleToClient: 0, ...input(body) };
      return tx(() => {
        if (sql("SELECT COUNT(*) AS n FROM case_deadlines WHERE tenantId=? AND caseId=? AND status='open'").get(user.tenantId, caseId).n >= MAX_OPEN) throw new HttpError(409, 'TOO_MANY_DEADLINES', 'Ce dossier compte déjà 300 échéances ouvertes.');
        const at = now();
        const row = { id: randomUUID(), tenantId: user.tenantId, caseId, ...value, status: 'open', createdAt: at, createdBy: user.subject, updatedAt: at, updatedBy: user.subject };
        sql('INSERT INTO case_deadlines (id,tenantId,caseId,title,kind,dueDate,dueTime,note,visibleToClient,status,createdAt,createdBy,updatedAt,updatedBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(row.id, row.tenantId, row.caseId, row.title, row.kind, row.dueDate, row.dueTime, row.note, row.visibleToClient, row.status, row.createdAt, row.createdBy, row.updatedAt, row.updatedBy);
        event(user, row, 'created', `${row.dueDate}${row.dueTime ? ` ${row.dueTime}` : ''} · ${row.title}`);
        audit(user, caseId, 'deadline.created', row.id, { kind: row.kind, dueDate: row.dueDate, visibleToClient: Boolean(row.visibleToClient) });
        return { deadline: publicRow(row) };
      });
    },
    update(user, caseId, id, body) {
      access(user, caseId, MANAGERS);
      const value = input(body, true);
      if (!Object.keys(value).length) throw invalid('Aucun changement.');
      return tx(() => {
        const row = find(user, caseId, id, 'lawyer');
        if (row.status !== 'open') throw new HttpError(409, 'DEADLINE_CLOSED', 'Rouvrez l’échéance avant de la modifier.');
        const next = { ...row, ...value, updatedAt: now(), updatedBy: user.subject };
        sql('UPDATE case_deadlines SET title=?, kind=?, dueDate=?, dueTime=?, note=?, visibleToClient=?, updatedAt=?, updatedBy=? WHERE id=?')
          .run(next.title, next.kind, next.dueDate, next.dueTime, next.note, next.visibleToClient, next.updatedAt, next.updatedBy, row.id);
        const changes = Object.keys(value).map(k => `${k}: ${row[k] ?? '—'} → ${next[k] ?? '—'}`).join('; ');
        event(user, row, 'updated', changes);
        audit(user, caseId, 'deadline.updated', row.id, { fields: Object.keys(value) });
        return { deadline: publicRow(next) };
      });
    },
    transition(user, caseId, id, action) {
      access(user, caseId, MANAGERS);
      const target = { done: 'done', reopen: 'open', cancel: 'cancelled' }[action];
      if (!target) throw invalid('Action inconnue.');
      return tx(() => {
        const row = find(user, caseId, id, 'lawyer');
        const allowed = { done: ['open'], open: ['done', 'cancelled'], cancelled: ['open'] }[target];
        if (!allowed.includes(row.status)) throw new HttpError(409, 'INVALID_TRANSITION', 'Cette action ne s’applique pas à l’état actuel.');
        const at = now();
        sql('UPDATE case_deadlines SET status=?, updatedAt=?, updatedBy=? WHERE id=?').run(target, at, user.subject, row.id);
        event(user, row, action === 'reopen' ? 'reopened' : target);
        audit(user, caseId, `deadline.${action === 'reopen' ? 'reopened' : target}`, row.id, {});
        return { deadline: publicRow({ ...row, status: target, updatedAt: at }) };
      });
    },
    history(user, caseId, id) {
      const { role } = access(user, caseId);
      const row = find(user, caseId, id, role);
      return { events: sql('SELECT seq, action, subject, detail, at FROM case_deadline_events WHERE deadlineId=? AND tenantId=? ORDER BY seq').all(row.id, user.tenantId) };
    },
    // Open deadlines in the next `days` days across every case of the user, with what each role may see.
    upcoming(user, days = 7) {
      if (!Number.isSafeInteger(days) || days < 1 || days > 90) throw invalid('Période attendue entre 1 et 90 jours.');
      const until = new Date(Date.parse(`${today()}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
      const rows = sql(`SELECT d.*, c.title AS caseTitle, c.reference AS caseReference FROM case_deadlines d
        JOIN members m ON m.tenantId=d.tenantId AND m.caseId=d.caseId AND m.subject=?
        JOIN cases c ON c.tenantId=d.tenantId AND c.id=d.caseId
        WHERE d.tenantId=? AND d.status='open' AND d.dueDate<=? AND (m.role IN ('owner','lawyer') OR d.visibleToClient=1)
        ORDER BY d.dueDate, COALESCE(d.dueTime,'') LIMIT 200`).all(user.subject, user.tenantId, until);
      return { days, deadlines: rows.map(row => ({ ...publicRow(row), caseId: row.caseId, caseTitle: row.caseTitle, caseReference: row.caseReference })) };
    },
    calendar(user, caseId) {
      const { role, title } = access(user, caseId);
      const rows = sql(`SELECT * FROM case_deadlines WHERE tenantId=? AND caseId=? AND status='open'${visible(role)} ORDER BY dueDate`).all(user.tenantId, caseId);
      const stamp = now().replace(/[-:]/gu, '').replace(/\.\d{3}/u, '');
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BesoinAvocat//Echeances//FR', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${ics(`Échéances · ${title}`)}`];
      for (const row of rows) {
        const date = row.dueDate.replace(/-/gu, '');
        const next = new Date(Date.parse(`${row.dueDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10).replace(/-/gu, '');
        lines.push('BEGIN:VEVENT', `UID:${row.id}@besoinavocat.ca`, `DTSTAMP:${stamp}`,
          ...(row.dueTime ? [`DTSTART;TZID=America/Toronto:${date}T${row.dueTime.replace(':', '')}00`, 'DURATION:PT1H'] : [`DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${next}`]),
          `SUMMARY:${ics(`${KINDS[row.kind]} : ${row.title}`)}`, ...(row.note ? [`DESCRIPTION:${ics(row.note)}`] : []), 'END:VEVENT');
      }
      lines.push('END:VCALENDAR');
      audit(user, caseId, 'deadline.calendar_exported', caseId, { count: rows.length });
      return `${lines.map(fold).join('\r\n')}\r\n`;
    },
  };
}
