import { createHash } from 'node:crypto';
import { HttpError, fields, invalid } from './validation.mjs';
import { CLIENT_PLANS, GB, INTEGRATIONS_SUBSCRIPTION, PLUGINS, PLUGIN_IDS, STORAGE_PACK, TRIAL_DAYS, publicPricing } from './pricing.mjs';

// Forfaits des comptes clients, espace de stockage et modules d'intégration payants (D-041, docs/MONETISATION.md).
//
// - Un compte client a le forfait Essentiel (gratuit) ou Premium (mensuel ou annuel), plus des tranches d'espace.
//   Chaque nouveau compte client reçoit 14 jours de Premium, sans carte et sans appel à Stripe.
// - L'espace se compte par compte : la somme des pièces (sans doublon dans un dossier) des dossiers que la personne a
//   créés. Une pièce versée par l'avocat dans le dossier d'un client compte dans l'espace du client.
// - Les modules d'intégration (Zoom, DocuSign…) s'activent un par un (frais uniques) et restent branchés tant que
//   l'abonnement « Intégrations » est actif. Ils ne font pas partie de l'essai.
// - Les comptes de l'équipe BesoinAvocat (fichier de grants) ne sont jamais facturés ni limités par ce module.
// - Rien n'est bloqué tant que le paiement n'est pas raccordé : on ne retient jamais quelqu'un qui ne peut pas payer.
//   Dès que Stripe est configuré, les limites s'appliquent (BESOINAVOCAT_BILLING_ENFORCED=false les suspend).
// - L'état payé vient seulement des notifications signées de Stripe (vérifiées dans lib/integrations.mjs), jamais de
//   la page de retour du navigateur. Stripe ne reçoit qu'une clé opaque, jamais l'identité TAKATAK.
const PRICE_ENV = Object.freeze({
  premium_month: 'BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_MONTHLY',
  premium_year: 'BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_YEARLY',
  storage_month: 'BESOINAVOCAT_STRIPE_PRICE_STORAGE_PACK_MONTHLY',
  plugin_once: 'BESOINAVOCAT_STRIPE_PRICE_PLUGIN_ACTIVATION',
  integrations_month: 'BESOINAVOCAT_STRIPE_PRICE_INTEGRATIONS_MONTHLY',
});
const ITEMS = Object.freeze(['premium', 'storage', 'integrations']);
const LIVE = new Set(['active', 'trialing', 'past_due']);
const STATUSES = new Set(['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused']);
const DAY = 86_400_000;
const unavailable = missing => new HttpError(503, 'PAYMENTS_NOT_CONFIGURED', `Le paiement en ligne n’est pas encore ouvert (${missing.join(', ')}). Aucun paiement n’est possible pour l’instant.`);
const stripeError = () => new HttpError(502, 'STRIPE_UNAVAILABLE', 'Le service de paiement n’a pas répondu correctement. Aucun paiement n’a été effectué.');

export function billingConfiguration(env = process.env) {
  const secretKey = typeof env.BESOINAVOCAT_STRIPE_SECRET_KEY === 'string' && /^(sk|rk)_(test|live)_[A-Za-z0-9]{16,250}$/u.test(env.BESOINAVOCAT_STRIPE_SECRET_KEY) ? env.BESOINAVOCAT_STRIPE_SECRET_KEY : null;
  const prices = {};
  for (const [key, name] of Object.entries(PRICE_ENV)) if (typeof env[name] === 'string' && /^price_[A-Za-z0-9]{8,100}$/u.test(env[name])) prices[key] = env[name];
  const webhook = typeof env.BESOINAVOCAT_STRIPE_WEBHOOK_SECRET === 'string' && env.BESOINAVOCAT_STRIPE_WEBHOOK_SECRET.length >= 16;
  let origin = null;
  try { const u = new URL(env.APP_ORIGIN || ''); if (u.protocol === 'https:' || u.hostname === '127.0.0.1' || u.hostname === 'localhost') origin = u.origin; } catch { origin = null; }
  // Taxes : des taux Stripe créés une fois (TPS, TVQ; gratuits) ou, sur demande, Stripe Tax (frais par transaction).
  const taxRates = String(env.BESOINAVOCAT_STRIPE_TAX_RATES ?? '').split(',').map(s => s.trim()).filter(s => /^txr_[A-Za-z0-9]{8,100}$/u.test(s)).slice(0, 5);
  const automaticTax = env.BESOINAVOCAT_STRIPE_AUTOMATIC_TAX === 'true';
  const missing = [!secretKey && 'BESOINAVOCAT_STRIPE_SECRET_KEY', !prices.premium_month && PRICE_ENV.premium_month, !webhook && 'BESOINAVOCAT_STRIPE_WEBHOOK_SECRET', !origin && 'APP_ORIGIN'].filter(Boolean);
  const configured = missing.length === 0;
  const enforced = configured && env.BESOINAVOCAT_BILLING_ENFORCED !== 'false';
  const available = { premium: configured, premiumYear: configured && Boolean(prices.premium_year), storage: configured && Boolean(prices.storage_month), plugin: configured && Boolean(prices.plugin_once && prices.integrations_month) };
  return Object.freeze({ secretKey, prices: Object.freeze(prices), origin, taxRates: Object.freeze(taxRates), automaticTax, missing: Object.freeze(missing), configured, enforced,
    available: Object.freeze(available), mode: secretKey?.includes('_live_') ? 'live' : 'test' });
}

export function createBilling({ db, config = billingConfiguration(), fetch = globalThis.fetch, clock = Date.now, isClient = () => false, isLawyer = () => false, trialDays = TRIAL_DAYS }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS billing_accounts (
      tenantId TEXT NOT NULL, subject TEXT NOT NULL, accountKey TEXT NOT NULL UNIQUE, customerId TEXT,
      trialStartedAt TEXT, trialEndsAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      PRIMARY KEY(tenantId, subject)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS billing_subscriptions (
      subscriptionId TEXT PRIMARY KEY, accountKey TEXT NOT NULL, item TEXT NOT NULL, status TEXT NOT NULL,
      priceId TEXT, quantity INTEGER NOT NULL DEFAULT 1, currentPeriodEnd TEXT, cancelAtPeriodEnd INTEGER NOT NULL DEFAULT 0, updatedAt TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS billing_subscriptions_account ON billing_subscriptions(accountKey, item);
    CREATE TABLE IF NOT EXISTS billing_plugins (
      accountKey TEXT NOT NULL, plugin TEXT NOT NULL, activatedAt TEXT NOT NULL, sessionId TEXT, PRIMARY KEY(accountKey, plugin)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS billing_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, eventId TEXT NOT NULL UNIQUE, accountKey TEXT, type TEXT NOT NULL, at TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS billing_events_no_update BEFORE UPDATE ON billing_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
    CREATE TRIGGER IF NOT EXISTS billing_events_no_delete BEFORE DELETE ON billing_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const keyOf = user => `bc_${createHash('sha256').update(`${user.tenantId}\u0000${user.subject}`).digest('hex').slice(0, 32)}`;
  // Qui paie : une personne cliente (forfaits, espace, modules) ou un avocat inscrit (modules seulement).
  const kindOf = user => (isClient(user) ? 'client' : isLawyer(user) ? 'lawyer' : null);
  const row = user => sql('SELECT * FROM billing_accounts WHERE tenantId=? AND subject=?').get(user.tenantId, user.subject);
  function ensure(user) {
    const kind = kindOf(user);
    if (!kind) return null;
    const existing = row(user);
    if (existing) return existing;
    const at = clock();
    // L'essai Premium ne concerne que les comptes clients.
    const trial = kind === 'client' ? [new Date(at).toISOString(), new Date(at + trialDays * DAY).toISOString()] : [null, null];
    sql('INSERT OR IGNORE INTO billing_accounts (tenantId,subject,accountKey,trialStartedAt,trialEndsAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)')
      .run(user.tenantId, user.subject, keyOf(user), trial[0], trial[1], new Date(at).toISOString(), new Date(at).toISOString());
    return row(user);
  }
  const subscription = (accountKey, item) => sql(`SELECT * FROM billing_subscriptions WHERE accountKey=? AND item=? ORDER BY CASE WHEN status IN ('active','trialing','past_due') THEN 0 ELSE 1 END, updatedAt DESC LIMIT 1`).get(accountKey, item) ?? null;
  const live = s => Boolean(s && LIVE.has(s.status));
  const trialOf = r => {
    if (!r?.trialEndsAt) return null;
    const endsAt = Date.parse(r.trialEndsAt);
    return { startedAt: r.trialStartedAt, endsAt: r.trialEndsAt, days: trialDays, daysLeft: Math.max(0, Math.ceil((endsAt - clock()) / DAY)), active: endsAt > clock() };
  };
  function usedBytes(user) {
    return sql(`SELECT COALESCE(SUM(bytes),0) AS n FROM (SELECT d.caseId, d.sha256, MAX(d.bytes) AS bytes FROM documents d
      JOIN cases c ON c.tenantId=d.tenantId AND c.id=d.caseId WHERE c.tenantId=? AND c.createdBy=? GROUP BY d.caseId, d.sha256)`).get(user.tenantId, user.subject).n;
  }
  const casesCreated = user => sql('SELECT COUNT(*) AS n FROM cases WHERE tenantId=? AND createdBy=?').get(user.tenantId, user.subject).n;

  // Droits d'un compte. null : compte non facturé (équipe), aucune limite de ce module.
  function entitlements(user) {
    const kind = kindOf(user);
    if (!kind) return null;
    const r = ensure(user);
    const premium = subscription(r.accountKey, 'premium'), storage = subscription(r.accountKey, 'storage'), integrations = subscription(r.accountKey, 'integrations');
    const trial = trialOf(r);
    const paidPremium = live(premium);
    const planId = kind === 'client' && (paidPremium || trial?.active) ? 'premium' : 'free';
    const plan = CLIENT_PLANS[planId];
    const packs = live(storage) ? Math.min(Math.max(1, storage.quantity), STORAGE_PACK.maxQuantity) : 0;
    const activated = sql('SELECT plugin, activatedAt FROM billing_plugins WHERE accountKey=? ORDER BY activatedAt').all(r.accountKey);
    return {
      kind, account: r, planId, plan, source: kind !== 'client' ? null : paidPremium ? 'subscription' : trial?.active ? 'trial' : 'free', trial,
      storageQuotaBytes: kind === 'client' ? plan.storageBytes + packs * STORAGE_PACK.bytes : null, packs,
      video: kind !== 'client' || plan.video, maxCases: kind === 'client' ? plan.maxCases : null,
      integrationsActive: live(integrations), plugins: new Map(activated.map(p => [p.plugin, p.activatedAt])),
      subscriptions: { premium, storage, integrations },
    };
  }
  const payerOfCase = (tenantId, caseId) => {
    const c = sql('SELECT createdBy FROM cases WHERE tenantId=? AND id=?').get(tenantId, caseId);
    return c ? { tenantId, subject: c.createdBy } : null;
  };
  const human = bytes => `${Math.round((bytes / GB) * 10) / 10} Go`;

  async function stripe(path, form) {
    let response;
    try {
      response = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${config.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' },
        body: new URLSearchParams(form).toString(), signal: AbortSignal.timeout(15000) });
    } catch { throw stripeError(); }
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || typeof body !== 'object') throw stripeError();
    return body;
  }
  const safeUrl = (value, hosts) => { try { const u = new URL(value); return u.protocol === 'https:' && hosts.includes(u.hostname) ? u.href : null; } catch { return null; } };
  const lineItems = lines => {
    const form = {};
    lines.forEach(([price, quantity], i) => {
      form[`line_items[${i}][price]`] = price; form[`line_items[${i}][quantity]`] = String(quantity);
      if (!config.automaticTax) config.taxRates.forEach((rate, j) => { form[`line_items[${i}][tax_rates][${j}]`] = rate; });
    });
    return form;
  };
  const publicSubscription = s => (s ? { status: s.status, live: live(s), quantity: s.quantity, currentPeriodEnd: s.currentPeriodEnd, cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd) } : null);

  return {
    configured: () => config.configured,
    enforced: () => config.enforced,
    ensure,
    entitlements,
    pricing: () => publicPricing({ available: config.available }),
    overview(user) {
      const e = entitlements(user);
      const base = { configured: config.configured, enforced: config.enforced, mode: config.secretKey ? config.mode : null, missing: config.missing, available: { ...config.available }, pricing: publicPricing({ available: config.available }) };
      if (!e) return { ...base, billed: false };
      const used = usedBytes(user);
      return { ...base, billed: true, kind: e.kind, plan: { id: e.planId, label: e.plan.label, source: e.source }, trial: e.trial,
        usage: e.kind === 'client' ? { bytes: used, quotaBytes: e.storageQuotaBytes, percent: Math.min(100, Math.round((used / e.storageQuotaBytes) * 100)), cases: casesCreated(user), maxCases: e.maxCases } : null,
        features: { video: e.video, storagePacks: e.packs },
        subscriptions: { premium: publicSubscription(e.subscriptions.premium), storage: publicSubscription(e.subscriptions.storage), integrations: publicSubscription(e.subscriptions.integrations) },
        plugins: PLUGINS.map(p => ({ ...p, activated: e.plugins.has(p.id), active: e.plugins.has(p.id) && e.integrationsActive })),
        canManage: Boolean(e.account.customerId) };
    },
    // Appelé dans la transaction d'ajout d'une pièce (store.addDocument), avant l'écriture.
    checkUpload(user, caseId, { bytes, hash, mimeType }) {
      if (!config.enforced) return;
      const payer = payerOfCase(user.tenantId, caseId);
      const e = payer && entitlements(payer);
      if (!e || e.kind !== 'client') return;
      const own = payer.subject === user.subject;
      if (/^video\//u.test(mimeType) && !e.video) throw new HttpError(402, 'PLAN_REQUIRED', own ? 'Les vidéos sont comprises dans le forfait Premium. Passez à Premium dans Réglages, « Mon forfait ».' : 'Ce dossier est au forfait Essentiel : les vidéos y sont réservées au forfait Premium de la personne cliente.');
      // L'espace du compte remplace alors le plafond fixe par dossier (BA_CASE_STORAGE_QUOTA_BYTES).
      if (sql('SELECT 1 FROM documents WHERE tenantId=? AND caseId=? AND sha256=? LIMIT 1').get(user.tenantId, caseId, hash)) return { accountQuota: true };
      if (usedBytes(payer) + bytes > e.storageQuotaBytes) throw new HttpError(402, 'STORAGE_LIMIT', own ? `Votre espace de ${human(e.storageQuotaBytes)} est plein. Ajoutez de l’espace ou passez à Premium dans Réglages, « Mon forfait ».` : 'L’espace du compte de la personne cliente est plein. Elle peut en ajouter depuis son forfait.');
      return { accountQuota: true };
    },
    checkCaseCreate(user) {
      if (!config.enforced) return;
      const e = entitlements(user);
      if (!e || e.kind !== 'client' || e.maxCases === null) return;
      if (casesCreated(user) >= e.maxCases) throw new HttpError(402, 'PLAN_REQUIRED', `Le forfait Essentiel comprend ${e.maxCases} dossier. Passez à Premium pour en ouvrir d’autres.`);
    },
    checkPlugin(user, provider) {
      if (!config.enforced || !PLUGIN_IDS.includes(provider)) return;
      const e = entitlements(user);
      if (!e) return;
      if (!e.plugins.has(provider)) throw new HttpError(402, 'PLUGIN_REQUIRED', 'Ce module d’intégration s’active dans Réglages, « Mon forfait », avant la connexion de votre compte.');
      if (!e.integrationsActive) throw new HttpError(402, 'PLUGIN_REQUIRED', 'Votre abonnement Intégrations n’est plus actif. Réactivez-le dans Réglages, « Mon forfait ».');
    },
    async checkout(user, body) {
      if (!config.configured) throw unavailable(config.missing);
      const e = entitlements(user);
      if (!e) throw new HttpError(403, 'NOT_BILLED', 'Ce compte n’a pas de forfait à gérer.');
      const { item, interval, quantity, plugin } = fields(body, ['item', 'interval', 'quantity', 'plugin'], ['item']);
      const r = e.account, key = r.accountKey;
      const metadata = { client_reference_id: key, 'metadata[bc_account]': key, 'metadata[bc_item]': item };
      const subMeta = { 'subscription_data[metadata][bc_account]': key, 'subscription_data[metadata][bc_item]': item };
      let form;
      if (item === 'premium') {
        if (e.kind !== 'client') throw new HttpError(403, 'NOT_A_CLIENT', 'Le forfait Premium est offert aux comptes clients.');
        if (!['month', 'year'].includes(interval)) throw invalid('Choisissez une facturation mensuelle ou annuelle.');
        const price = config.prices[`premium_${interval}`];
        if (!price) throw unavailable([PRICE_ENV[`premium_${interval}`]]);
        if (live(e.subscriptions.premium)) throw new HttpError(409, 'ALREADY_SUBSCRIBED', 'Votre forfait Premium est déjà actif. Gérez-le avec « Gérer mes paiements ».');
        // Les jours d'essai qui restent sont gardés (Stripe exige au moins 48 h avant la fin d'un essai).
        const keep = e.trial?.active && Date.parse(e.trial.endsAt) - clock() >= 48 * 3600_000 ? { 'subscription_data[trial_end]': String(Math.floor(Date.parse(e.trial.endsAt) / 1000)) } : {};
        form = { mode: 'subscription', ...lineItems([[price, 1]]), ...metadata, ...subMeta, ...keep };
      } else if (item === 'storage') {
        if (e.kind !== 'client') throw new HttpError(403, 'NOT_A_CLIENT', 'L’espace supplémentaire est offert aux comptes clients.');
        if (!config.prices.storage_month) throw unavailable([PRICE_ENV.storage_month]);
        const n = quantity === undefined ? 1 : quantity;
        if (!Number.isSafeInteger(n) || n < 1 || n > STORAGE_PACK.maxQuantity) throw invalid(`Choisissez de 1 à ${STORAGE_PACK.maxQuantity} tranches.`);
        if (live(e.subscriptions.storage)) throw new HttpError(409, 'ALREADY_SUBSCRIBED', 'Vous avez déjà de l’espace supplémentaire. Changez le nombre de tranches avec « Gérer mes paiements ».');
        form = { mode: 'subscription', ...lineItems([[config.prices.storage_month, n]]), ...metadata, ...subMeta };
      } else if (item === 'plugin' || item === 'integrations') {
        if (!config.available.plugin) throw unavailable(['plugin_once', 'integrations_month'].filter(k => !config.prices[k]).map(k => PRICE_ENV[k]));
        if (item === 'integrations') {
          if (live(e.subscriptions.integrations)) throw new HttpError(409, 'ALREADY_SUBSCRIBED', 'Votre abonnement Intégrations est déjà actif.');
          if (!e.plugins.size) throw invalid('Activez d’abord un module.');
          form = { mode: 'subscription', ...lineItems([[config.prices.integrations_month, 1]]), ...metadata, ...subMeta };
        } else {
          if (!PLUGIN_IDS.includes(plugin)) throw invalid('Module inconnu.');
          if (e.plugins.has(plugin)) throw new HttpError(409, 'ALREADY_ACTIVATED', 'Ce module est déjà activé.');
          const meta = { ...metadata, 'metadata[bc_plugin]': plugin };
          // Sans abonnement Intégrations actif, il commence dans le même paiement que l'activation du module.
          form = live(e.subscriptions.integrations)
            ? { mode: 'payment', ...lineItems([[config.prices.plugin_once, 1]]), ...meta, ...(r.customerId ? {} : { customer_creation: 'always' }) }
            : { mode: 'subscription', ...lineItems([[config.prices.integrations_month, 1], [config.prices.plugin_once, 1]]), ...meta, 'subscription_data[metadata][bc_account]': key, 'subscription_data[metadata][bc_item]': 'integrations' };
        }
      } else throw invalid('Article inconnu.');
      form = { ...form, success_url: `${config.origin}/#settings`, cancel_url: `${config.origin}/#settings`, locale: 'fr-CA', allow_promotion_codes: 'true', billing_address_collection: 'required',
        ...(config.automaticTax ? { 'automatic_tax[enabled]': 'true' } : {}), ...(r.customerId ? { customer: r.customerId } : {}) };
      const session = await stripe('checkout/sessions', form);
      const url = safeUrl(session.url, ['checkout.stripe.com']);
      if (!url) throw stripeError();
      return { url };
    },
    async portal(user) {
      if (!config.configured) throw unavailable(config.missing);
      const r = kindOf(user) ? ensure(user) : null;
      if (!r?.customerId) throw new HttpError(409, 'NO_CUSTOMER', 'Aucun paiement à gérer pour l’instant.');
      const session = await stripe('billing_portal/sessions', { customer: r.customerId, return_url: `${config.origin}/#settings`, locale: 'fr-CA' });
      const url = safeUrl(session.url, ['billing.stripe.com']);
      if (!url) throw stripeError();
      return { url };
    },
    // Appelé seulement avec un événement dont la signature Stripe est vérifiée et qui n'est pas un doublon.
    stripeEvent(event) {
      const type = typeof event?.type === 'string' ? event.type : '';
      const object = event?.data?.object;
      if (!object || typeof object !== 'object' || typeof event.id !== 'string') return { handled: false };
      const isSession = type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded';
      const isSub = /^customer\.subscription\.(created|updated|deleted|paused|resumed)$/u.test(type);
      if (!isSession && !isSub) return { handled: false };
      const key = isSession ? (object.metadata?.bc_account ?? object.client_reference_id) : object.metadata?.bc_account;
      if (typeof key !== 'string' || !/^bc_[0-9a-f]{32}$/u.test(key)) return { handled: false };
      const account = sql('SELECT * FROM billing_accounts WHERE accountKey=?').get(key);
      if (!account) return { handled: false };
      const cus = typeof object.customer === 'string' && /^cus_[A-Za-z0-9]{1,250}$/u.test(object.customer) ? object.customer : null;
      db.exec('BEGIN IMMEDIATE');
      try {
        const fresh = sql('INSERT OR IGNORE INTO billing_events (eventId,accountKey,type,at) VALUES (?,?,?,?)').run(event.id, key, type, now());
        if (fresh.changes) {
          if (cus && cus !== account.customerId) sql('UPDATE billing_accounts SET customerId=?, updatedAt=? WHERE accountKey=?').run(cus, now(), key);
          if (isSession) {
            const plugin = object.metadata?.bc_plugin;
            const paid = object.payment_status === 'paid' || object.payment_status === 'no_payment_required';
            if (paid && PLUGIN_IDS.includes(plugin)) sql('INSERT OR IGNORE INTO billing_plugins (accountKey,plugin,activatedAt,sessionId) VALUES (?,?,?,?)').run(key, plugin, now(), typeof object.id === 'string' ? object.id.slice(0, 255) : null);
          } else if (typeof object.id === 'string' && /^sub_[A-Za-z0-9]{1,250}$/u.test(object.id)) {
            const item = ITEMS.includes(object.metadata?.bc_item) ? object.metadata.bc_item : null;
            if (item) {
              const first = object.items?.data?.[0];
              const status = type === 'customer.subscription.deleted' ? 'canceled' : STATUSES.has(object.status) ? object.status : 'incomplete';
              const quantity = Number.isSafeInteger(first?.quantity) && first.quantity > 0 ? first.quantity : 1;
              const periodEnd = object.current_period_end ?? first?.current_period_end;
              sql(`INSERT INTO billing_subscriptions (subscriptionId,accountKey,item,status,priceId,quantity,currentPeriodEnd,cancelAtPeriodEnd,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)
                ON CONFLICT(subscriptionId) DO UPDATE SET status=excluded.status, priceId=excluded.priceId, quantity=excluded.quantity, currentPeriodEnd=excluded.currentPeriodEnd, cancelAtPeriodEnd=excluded.cancelAtPeriodEnd, updatedAt=excluded.updatedAt`)
                .run(object.id, key, item, status, typeof first?.price?.id === 'string' ? first.price.id.slice(0, 255) : null, quantity,
                  Number.isSafeInteger(periodEnd) ? new Date(periodEnd * 1000).toISOString() : null, object.cancel_at_period_end ? 1 : 0, now());
            }
          }
        }
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return { handled: true };
    },
    subscriptionItems: ITEMS,
    priceEnv: PRICE_ENV,
    INTEGRATIONS_SUBSCRIPTION,
  };
}
