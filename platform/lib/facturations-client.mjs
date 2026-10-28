import { createHmac, randomUUID } from 'node:crypto';
import { fields, HttpError, invalid, text } from './validation.mjs';

const unavailable = () => new HttpError(503, 'FACTURATIONS_UNAVAILABLE', 'La connexion Facturations est indisponible. Aucun paiement n’a été effectué.');
const badResponse = () => new HttpError(502, 'FACTURATIONS_INVALID_RESPONSE', 'La réponse Facturations n’a pas pu être vérifiée.');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
const identityId = value => typeof value === 'string' && value.length >= 1 && value.length <= 200 && !/[\s\u0000-\u001f\u007f]/u.test(value);
const uintString = value => typeof value === 'string' && /^[0-9]{1,30}$/u.test(value);
const shortString = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
function dateOnly(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

// Local preparation only. Do not expose this as a way to trust browser-submitted
// prices: callers must first resolve pricing/taxes/customer identity server-side.
export function prepareFacturationsDraft(body) {
  fields(body, ['currency', 'customer', 'invoiceDate', 'dueDate', 'notes', 'lines', 'taxes'], ['currency', 'customer', 'invoiceDate', 'dueDate', 'lines', 'taxes']);
  if (body.currency !== 'CAD' || !dateOnly(body.invoiceDate) || !dateOnly(body.dueDate) || body.dueDate < body.invoiceDate) throw invalid('Dates ou devise du brouillon invalides.');
  fields(body.customer, ['name', 'email', 'address'], ['name', 'email']);
  const customer = { name: text(body.customer.name, 'Client', 160).trim(), email: text(body.customer.email, 'Courriel', 254).trim() };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(customer.email)) throw invalid('Courriel du client invalide.');
  if (body.customer.address != null) customer.address = text(body.customer.address, 'Adresse', 500, { optional: true, multiline: true });
  if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length > 50 || !Array.isArray(body.taxes) || body.taxes.length > 3) throw invalid();
  const lines = body.lines.map(line => {
    fields(line, ['description', 'quantity', 'unitPriceCents', 'discountCents', 'taxable'], ['description', 'quantity', 'unitPriceCents', 'taxable']);
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000 ||
        !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0 || line.unitPriceCents > 100000000 || typeof line.taxable !== 'boolean') throw invalid('Ligne de brouillon invalide.');
    const discountCents = line.discountCents ?? 0;
    if (!Number.isSafeInteger(discountCents) || discountCents < 0 || discountCents > line.quantity * line.unitPriceCents) throw invalid('Rabais invalide.');
    return { description: text(line.description, 'Description', 250).trim(), quantity: line.quantity, unitPriceCents: line.unitPriceCents, discountCents, taxable: line.taxable };
  });
  const taxes = body.taxes.map(tax => {
    fields(tax, ['code', 'label', 'rateMilliPercent'], ['code', 'label', 'rateMilliPercent']);
    if (!Number.isSafeInteger(tax.rateMilliPercent) || tax.rateMilliPercent < 0 || tax.rateMilliPercent > 100000) throw invalid('Taux de taxe invalide.');
    return { code: text(tax.code, 'Code taxe', 20).trim(), label: text(tax.label, 'Taxe', 80).trim(), rateMilliPercent: tax.rateMilliPercent };
  });
  if (new Set(taxes.map(tax => tax.code)).size !== taxes.length) throw invalid('Code de taxe dupliqué.');
  return { currency: 'CAD', customer, invoiceDate: body.invoiceDate, dueDate: body.dueDate,
    notes: body.notes == null ? null : text(body.notes, 'Notes', 1000, { optional: true, multiline: true }), lines, taxes };
}

// No write method is implemented. Remote draftWrite capability is descriptive;
// it cannot enable this adapter to issue, deliver, pay or even persist a draft.
export function createFacturationsClient({ enabled = false, origin, secret, issuer, audience, resolveAccount,
  fetchImpl = globalThis.fetch, clock = Date.now, timeoutMs = 4000 } = {}) {
  if (enabled !== true) return Object.freeze({ status: () => ({ configured: false, mode: 'disabled', writesEnabled: false }),
    capabilities: async () => { throw unavailable(); }, dashboard: async () => { throw unavailable(); }, drafts: async () => { throw unavailable(); } });
  let base;
  try { base = new URL(origin); } catch { throw new Error('Invalid Facturations origin'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
      !shortString(issuer, 200) || !shortString(audience, 200) || !Buffer.isBuffer(secret) || secret.length < 32 ||
      typeof resolveAccount !== 'function' || typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 10000) {
    throw new Error('Invalid Facturations server configuration');
  }
  const key = Buffer.from(secret);
  const baseOrigin = base.origin;
  const signedToken = account => {
    const now = Math.floor(clock() / 1000);
    if (!Number.isSafeInteger(now) || now < 0) throw unavailable();
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = { version: 1, iss: issuer, aud: audience, sub: account.masterIdentityId,
      business_id: account.businessId, roles: [account.role], iat: now, exp: now + 60, jti: randomUUID() };
    const input = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
    return `${input}.${createHmac('sha256', key).update(input).digest('base64url')}`;
  };
  async function read(user, endpoint, validate) {
    let account;
    try { account = await resolveAccount(user); } catch { throw unavailable(); }
    if (!object(account) || !identityId(account.masterIdentityId) || !identityId(account.businessId) || !['OWNER', 'STAFF'].includes(account.role)) {
      throw new HttpError(403, 'FACTURATIONS_MAPPING_REQUIRED', 'Aucun accès Facturations n’est attribué à cette identité.');
    }
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(unavailable()); }, timeoutMs); });
    const request = async () => {
      const response = await fetchImpl(`${baseOrigin}/integration/v1/${endpoint}`, {
        method: 'GET', redirect: 'error', signal: controller.signal,
        headers: { Accept: 'application/json', Authorization: `Bearer ${signedToken(account)}` },
      });
      if (!response.ok) throw unavailable();
      if (!/^application\/json(?:;|$)/iu.test(response.headers.get('content-type') || '')) throw badResponse();
      const advertised = response.headers.get('content-length');
      if (advertised && (!/^[0-9]+$/u.test(advertised) || Number(advertised) > 65536)) throw badResponse();
      if (!response.body) throw badResponse();
      const chunks = []; let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 65536) { controller.abort(); throw badResponse(); }
        chunks.push(Buffer.from(chunk));
      }
      let envelope;
      try { envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw badResponse(); }
      if (!object(envelope) || envelope.version !== 1 || envelope.businessId !== account.businessId ||
          !(envelope.requestId === null || uuid(envelope.requestId)) || !object(envelope.data)) throw badResponse();
      const data = validate(envelope.data);
      return { version: 1, requestId: envelope.requestId, businessId: account.businessId, data };
    };
    try { return await Promise.race([request(), deadline]); }
    catch (error) { if (error instanceof HttpError) throw error; throw unavailable(); }
    finally { clearTimeout(timeout); controller.abort(); }
  }
  return Object.freeze({
    status: () => ({ configured: true, mode: 'read_only', writesEnabled: false }),
    capabilities(user) {
      return read(user, 'capabilities', data => {
        if (data.service !== 'facturations' || data.integrationVersion !== 1 || !object(data.capabilities) || !object(data.standalone)) throw badResponse();
        const names = ['capabilitiesRead', 'dashboardRead', 'draftsRead', 'draftDetailsRead', 'draftApprovalStatusRead', 'draftWorkflowRead', 'customersRead', 'approvalsRead', 'draftWrite', 'ownerApprovalWrite', 'issuanceAuthorizationWrite', 'deliveryAuthorizationWrite', 'portalPublicationWrite', 'ownerReviewHandoffRead'];
        const capabilities = {};
        for (const name of names) { if (typeof data.capabilities[name] !== 'boolean') throw badResponse(); capabilities[name] = data.capabilities[name]; }
        for (const name of ['ownerApprovalWrite', 'issuanceAuthorizationWrite', 'deliveryAuthorizationWrite', 'portalPublicationWrite']) if (capabilities[name] !== false) throw badResponse();
        if (typeof data.standalone.staffWorkspace !== 'boolean' || typeof data.standalone.clientPortal !== 'boolean' || JSON.stringify(data.standalone.bilingual) !== '["fr","en"]') throw badResponse();
        return { service: 'facturations', integrationVersion: 1, capabilities,
          standalone: { staffWorkspace: data.standalone.staffWorkspace, clientPortal: data.standalone.clientPortal, bilingual: ['fr', 'en'] } };
      });
    },
    dashboard(user) {
      return read(user, 'dashboard', data => {
        if (data.status !== 'DRAFTS_ONLY' || data.currency !== 'CAD' || !uintString(data.draftCount) || !uintString(data.draftTotalCents) || !uintString(data.customerCount) ||
            data.issuedInvoicesAvailable !== false || data.paymentsAvailable !== false || data.revenueAvailable !== false) throw badResponse();
        return { status: 'DRAFTS_ONLY', currency: 'CAD', draftCount: data.draftCount, draftTotalCents: data.draftTotalCents, customerCount: data.customerCount,
          issuedInvoicesAvailable: false, paymentsAvailable: false, revenueAvailable: false };
      });
    },
    drafts(user, query = {}) {
      fields(query, ['page', 'pageSize']);
      const { page = 1, pageSize = 20 } = query;
      if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw invalid('Pagination Facturations invalide.');
      return read(user, `drafts?page=${page}&pageSize=${pageSize}`, data => {
        if (data.status !== 'DRAFTS_ONLY' || data.page !== page || data.pageSize !== pageSize || !Array.isArray(data.drafts) || data.drafts.length > pageSize) throw badResponse();
        const drafts = data.drafts.map(draft => {
          if (!object(draft) || !uuid(draft.id) || !shortString(draft.customerName, 160) || !dateOnly(draft.invoiceDate) || !dateOnly(draft.dueDate) ||
              !uintString(draft.totalCents) || draft.currency !== 'CAD' || draft.status !== 'DRAFT') throw badResponse();
          return { id: draft.id, customerName: draft.customerName, invoiceDate: draft.invoiceDate, dueDate: draft.dueDate, totalCents: draft.totalCents, currency: 'CAD', status: 'DRAFT' };
        });
        return { status: 'DRAFTS_ONLY', page, pageSize, drafts };
      });
    },
  });
}
