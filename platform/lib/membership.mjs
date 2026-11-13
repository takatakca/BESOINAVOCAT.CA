import { createHash, randomUUID } from 'node:crypto';
import { HttpError, fields, invalid } from './validation.mjs';

// Abonnement des avocats à la plateforme, par Stripe Checkout (choix du propriétaire du 4 novembre 2026 :
// « Lawyer subscription only »). Jamais de paiement de client, d'avance d'honoraires ni de commission : ces sommes
// appartiennent au compte en fidéicommis de l'avocat (D-025). Les prix ne sont pas écrits ici : ils sont lus chez
// Stripe à partir des identifiants de prix posés dans Coolify. L'état de l'abonnement vient des notifications signées
// de Stripe (vérifiées dans lib/integrations.mjs), jamais de la page de retour du navigateur.
const PLANS = Object.freeze({ weekly: 'BESOINAVOCAT_STRIPE_PRICE_WEEKLY', monthly: 'BESOINAVOCAT_STRIPE_PRICE_MONTHLY' });
const ACTIVE = new Set(['active', 'trialing']);
const STATUSES = new Set(['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'none']);
const PRICE_TTL_MS = 3600 * 1000;
const unavailable = missing => new HttpError(503, 'PAYMENTS_NOT_CONFIGURED', `L’abonnement par Stripe n’est pas encore raccordé (${missing.join(', ')}). Aucun paiement n’est possible.`);
const stripeError = () => new HttpError(502, 'STRIPE_UNAVAILABLE', 'Stripe n’a pas répondu correctement. Aucun paiement n’a été effectué.');

export function membershipConfiguration(env = process.env) {
  const secretKey = typeof env.BESOINAVOCAT_STRIPE_SECRET_KEY === 'string' && /^(sk|rk)_(test|live)_[A-Za-z0-9]{16,250}$/u.test(env.BESOINAVOCAT_STRIPE_SECRET_KEY) ? env.BESOINAVOCAT_STRIPE_SECRET_KEY : null;
  const prices = {};
  for (const [plan, name] of Object.entries(PLANS)) if (typeof env[name] === 'string' && /^price_[A-Za-z0-9]{8,100}$/u.test(env[name])) prices[plan] = env[name];
  const webhook = typeof env.BESOINAVOCAT_STRIPE_WEBHOOK_SECRET === 'string' && env.BESOINAVOCAT_STRIPE_WEBHOOK_SECRET.length >= 16;
  let origin = null;
  try { const u = new URL(env.APP_ORIGIN || ''); if (u.protocol === 'https:' || u.hostname === '127.0.0.1' || u.hostname === 'localhost') origin = u.origin; } catch { origin = null; }
  const missing = [!secretKey && 'BESOINAVOCAT_STRIPE_SECRET_KEY', !Object.keys(prices).length && 'BESOINAVOCAT_STRIPE_PRICE_WEEKLY ou _MONTHLY', !webhook && 'BESOINAVOCAT_STRIPE_WEBHOOK_SECRET', !origin && 'APP_ORIGIN'].filter(Boolean);
  return Object.freeze({ secretKey, prices: Object.freeze(prices), origin, missing: Object.freeze(missing), configured: missing.length === 0, mode: secretKey?.includes('_live_') ? 'live' : 'test' });
}

export function createMembership({ db, config = membershipConfiguration(), fetch = globalThis.fetch, clock = Date.now, teamMembers = [], isLawyer = () => false, trialDays = 14 }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lawyer_memberships (
      tenantId TEXT NOT NULL, subject TEXT NOT NULL, memberKey TEXT NOT NULL UNIQUE,
      customerId TEXT, subscriptionId TEXT, status TEXT NOT NULL, plan TEXT, priceId TEXT,
      currentPeriodEnd TEXT, cancelAtPeriodEnd INTEGER NOT NULL DEFAULT 0, updatedAt TEXT NOT NULL,
      PRIMARY KEY(tenantId, subject)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS lawyer_membership_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, eventId TEXT NOT NULL UNIQUE, memberKey TEXT, type TEXT NOT NULL,
      status TEXT, at TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS lawyer_membership_events_no_update BEFORE UPDATE ON lawyer_membership_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
    CREATE TRIGGER IF NOT EXISTS lawyer_membership_events_no_delete BEFORE DELETE ON lawyer_membership_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
  `);
  // Essai gratuit local (13 novembre 2026) : 14 jours à 0 $ sans carte, tenu ici sans Stripe. Colonnes ajoutées aux
  // bases existantes au démarrage.
  const columns = db.prepare('PRAGMA table_info(lawyer_memberships)').all().map(c => c.name);
  if (!columns.includes('trialStartedAt')) db.exec('ALTER TABLE lawyer_memberships ADD COLUMN trialStartedAt TEXT');
  if (!columns.includes('trialEndsAt')) db.exec('ALTER TABLE lawyer_memberships ADD COLUMN trialEndsAt TEXT');
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const priceCache = new Map();
  // Opaque key sent to Stripe instead of the TAKATAK identity.
  const memberKey = user => `ba_${createHash('sha256').update(`${user.tenantId}\u0000${user.subject}`).digest('hex').slice(0, 32)}`;
  const eligible = user => teamMembers.some(m => m.tenantId === user.tenantId && m.subject === user.subject)
    || Boolean(sql("SELECT 1 FROM members WHERE tenantId=? AND subject=? AND role IN ('owner','lawyer') LIMIT 1").get(user.tenantId, user.subject))
    || Boolean(isLawyer(user));
  const row = user => sql('SELECT * FROM lawyer_memberships WHERE tenantId=? AND subject=?').get(user.tenantId, user.subject);
  const planOf = priceId => Object.entries(config.prices).find(([, id]) => id === priceId)?.[0] ?? null;

  async function stripe(path, { method = 'GET', form } = {}) {
    let response;
    try {
      response = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers: { Authorization: `Bearer ${config.secretKey}`, ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), 'Stripe-Version': '2024-06-20' },
        body: form ? new URLSearchParams(form).toString() : undefined, signal: AbortSignal.timeout(15000) });
    } catch { throw stripeError(); }
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || typeof body !== 'object') throw stripeError();
    return body;
  }
  async function price(plan) {
    const id = config.prices[plan];
    const cached = priceCache.get(id);
    if (cached && clock() - cached.at < PRICE_TTL_MS) return cached.value;
    const p = await stripe(`prices/${encodeURIComponent(id)}`);
    if (!Number.isSafeInteger(p.unit_amount) || typeof p.currency !== 'string' || !p.recurring) throw stripeError();
    const value = { plan, amountCents: p.unit_amount, currency: p.currency.toUpperCase(), interval: p.recurring.interval, intervalCount: p.recurring.interval_count ?? 1, active: p.active !== false };
    priceCache.set(id, { at: clock(), value });
    return value;
  }
  const safeUrl = (value, hosts) => {
    try { const u = new URL(value); return u.protocol === 'https:' && hosts.includes(u.hostname) ? u.href : null; } catch { return null; }
  };
  // L'essai local est « trialing » avec le forfait « trial »; passé son terme, sans abonnement Stripe, il devient
  // « trial_expired » : l'accès de l'avocat aux nouveaux dossiers attend alors un paiement.
  const localTrial = r => r?.plan === 'trial' && r?.status === 'trialing';
  const trialOf = r => {
    if (!r?.trialEndsAt) return null;
    const endsAt = Date.parse(r.trialEndsAt), left = Math.ceil((endsAt - clock()) / 86_400_000);
    return { startedAt: r.trialStartedAt, endsAt: r.trialEndsAt, daysLeft: Math.max(0, left), expired: endsAt <= clock(), days: trialDays };
  };
  function publicState(user, r = row(user)) {
    const trial = trialOf(r);
    const status = localTrial(r) && trial?.expired ? 'trial_expired' : (r?.status ?? 'none');
    const active = ACTIVE.has(status);
    return { status, active, plan: r?.plan ?? null, currentPeriodEnd: r?.currentPeriodEnd ?? null, cancelAtPeriodEnd: Boolean(r?.cancelAtPeriodEnd), canManage: Boolean(r?.customerId),
      trial, paymentRequired: !active && Boolean(r) && status !== 'none' };
  }

  return {
    async overview(user) {
      const base = { configured: config.configured, missing: config.missing, mode: config.secretKey ? config.mode : null, eligible: eligible(user), membership: publicState(user), plans: [], trialDays };
      if (!config.configured || !base.eligible) return base;
      base.plans = (await Promise.all(Object.keys(config.prices).map(plan => price(plan).catch(() => null)))).filter(Boolean).filter(p => p.active);
      return base;
    },
    async checkout(user, body) {
      if (!config.configured) throw unavailable(config.missing);
      if (!eligible(user)) throw new HttpError(403, 'NOT_A_LAWYER', 'L’abonnement est réservé aux avocats de la plateforme.');
      const { plan } = fields(body, ['plan'], ['plan']);
      if (!config.prices[plan]) throw invalid('Forfait inconnu.');
      const current = row(user);
      if (current && ACTIVE.has(current.status) && !localTrial(current)) throw new HttpError(409, 'ALREADY_SUBSCRIBED', 'Votre abonnement est déjà actif. Gérez-le depuis le portail Stripe.');
      const key = current?.memberKey ?? memberKey(user);
      if (!current) sql("INSERT INTO lawyer_memberships (tenantId,subject,memberKey,status,updatedAt) VALUES (?,?,?,'none',?)").run(user.tenantId, user.subject, key, now());
      // Les jours d'essai qui restent sont conservés chez Stripe (au moins 48 h exigées par Stripe pour un trial_end).
      const trial = trialOf(current);
      const remainingTrial = localTrial(current) && trial && !trial.expired && Date.parse(trial.endsAt) - clock() >= 48 * 3600_000 ? { 'subscription_data[trial_end]': String(Math.floor(Date.parse(trial.endsAt) / 1000)) } : {};
      const form = {
        mode: 'subscription', 'line_items[0][price]': config.prices[plan], 'line_items[0][quantity]': '1',
        client_reference_id: key, 'subscription_data[metadata][ba_member]': key, 'metadata[ba_member]': key, ...remainingTrial,
        success_url: `${config.origin}/#settings`, cancel_url: `${config.origin}/#settings`, locale: 'fr-CA', billing_address_collection: 'required', 'automatic_tax[enabled]': 'true',
        ...(current?.customerId ? { customer: current.customerId } : {}),
      };
      const session = await stripe('checkout/sessions', { method: 'POST', form });
      const url = safeUrl(session.url, ['checkout.stripe.com']);
      if (!url) throw stripeError();
      return { url };
    },
    async portal(user) {
      if (!config.configured) throw unavailable(config.missing);
      const current = row(user);
      if (!current?.customerId) throw new HttpError(409, 'NO_SUBSCRIPTION', 'Aucun abonnement Stripe à gérer.');
      const session = await stripe('billing_portal/sessions', { method: 'POST', form: { customer: current.customerId, return_url: `${config.origin}/#settings`, locale: 'fr-CA' } });
      const url = safeUrl(session.url, ['billing.stripe.com']);
      if (!url) throw stripeError();
      return { url };
    },
    // Called only with an event whose Stripe signature was verified and that was not a duplicate.
    stripeEvent(event) {
      const type = typeof event?.type === 'string' ? event.type : '';
      const object = event?.data?.object;
      if (!object || typeof object !== 'object' || typeof event.id !== 'string') return { handled: false };
      let key = null, update = null;
      if (type === 'checkout.session.completed' && object.mode === 'subscription') {
        key = object.client_reference_id;
        update = { customerId: object.customer, subscriptionId: object.subscription };
      } else if (/^customer\.subscription\.(created|updated|deleted|paused|resumed)$/u.test(type)) {
        key = object.metadata?.ba_member;
        const priceId = object.items?.data?.[0]?.price?.id ?? null;
        const status = type === 'customer.subscription.deleted' ? 'canceled' : object.status;
        update = { customerId: object.customer, subscriptionId: object.id, status: STATUSES.has(status) ? status : 'incomplete', priceId, plan: planOf(priceId),
          currentPeriodEnd: Number.isSafeInteger(object.current_period_end) ? new Date(object.current_period_end * 1000).toISOString() : null, cancelAtPeriodEnd: object.cancel_at_period_end ? 1 : 0 };
      } else return { handled: false };
      if (typeof key !== 'string' || !/^ba_[0-9a-f]{32}$/u.test(key)) return { handled: false };
      const current = sql('SELECT * FROM lawyer_memberships WHERE memberKey=?').get(key);
      if (!current) return { handled: false };
      const ids = value => (typeof value === 'string' && /^(cus|sub)_[A-Za-z0-9]{1,250}$/u.test(value) ? value : null);
      const next = { ...current, ...update, customerId: ids(update.customerId) ?? current.customerId, subscriptionId: ids(update.subscriptionId) ?? current.subscriptionId };
      db.exec('BEGIN IMMEDIATE');
      try {
        const fresh = sql('INSERT OR IGNORE INTO lawyer_membership_events (eventId,memberKey,type,status,at) VALUES (?,?,?,?,?)').run(event.id, key, type, next.status, now());
        if (fresh.changes) sql('UPDATE lawyer_memberships SET customerId=?, subscriptionId=?, status=?, plan=?, priceId=?, currentPeriodEnd=?, cancelAtPeriodEnd=?, updatedAt=? WHERE memberKey=?')
          .run(next.customerId, next.subscriptionId, next.status, next.plan ?? current.plan, next.priceId ?? current.priceId, next.currentPeriodEnd ?? current.currentPeriodEnd, next.cancelAtPeriodEnd ?? 0, now(), key);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return { handled: true };
    },
    isActive: user => publicState(user).active,
    state: user => publicState(user),
    // Ouvre l'essai gratuit : aucune carte, aucun appel Stripe. Un compte qui a déjà une ligne garde son état.
    startTrial(user) {
      if (!eligible(user)) throw new HttpError(403, 'NOT_A_LAWYER', 'L’essai est réservé aux avocats de la plateforme.');
      const current = row(user);
      if (current) return publicState(user, current);
      const at = clock();
      sql("INSERT INTO lawyer_memberships (tenantId,subject,memberKey,status,plan,currentPeriodEnd,updatedAt,trialStartedAt,trialEndsAt) VALUES (?,?,?,'trialing','trial',?,?,?,?)")
        .run(user.tenantId, user.subject, memberKey(user), new Date(at + trialDays * 86_400_000).toISOString(), new Date(at).toISOString(), new Date(at).toISOString(), new Date(at + trialDays * 86_400_000).toISOString());
      return publicState(user);
    },
    newId: randomUUID,
  };
}
