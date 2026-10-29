import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAddonCatalog } from '../lib/addon-catalog.mjs';

test('catalogue distinguishes the working pilot chat, the Zoom connector of Intégrations and planned phone', () => {
  const catalog = publicAddonCatalog();
  assert.equal(catalog.items.length, 3);
  assert.deepEqual(catalog.items.map(item => [item.id, item.kind, item.availability, item.connectionState]), [
    ['internal_chat', 'internal_service', 'available_pilot', 'internal'],
    ['zoom', 'external_connector', 'connector_pilot', 'oauth_in_integrations'],
    ['phone', 'external_connector', 'planned', 'provider_not_connected'],
  ]);
});

test('unconfirmed installation fees never become free prices or purchasable entitlements', () => {
  const catalog = publicAddonCatalog();
  assert.equal(catalog.checkoutEnabled, false);
  for (const item of catalog.items) {
    assert.deepEqual(item.price, { currency: 'CAD', amountCents: null, status: 'unset' });
    assert.equal(item.canPurchase, false);
    assert.equal(item.canConnect, false);
    assert.equal(item.caseAccessGranted, false);
    assert.equal(item.stripePriceId, undefined);
  }
});

test('caller-supplied options and mutations cannot enable payments, connectors or arbitrary prices', () => {
  const first = publicAddonCatalog({ amountCents: 5000, canPurchase: true, accountOwner: 'attacker' });
  first.checkoutEnabled = true;
  first.items[0].price.amountCents = 0;
  first.items[1].canConnect = true;
  first.items.push({ id: 'fake' });
  const second = publicAddonCatalog();
  assert.equal(second.items.length, 3);
  assert.equal(second.checkoutEnabled, false);
  assert.equal(second.items[0].price.amountCents, null);
  assert.equal(second.items[1].canConnect, false);
  assert.equal(second.accountOwner, undefined);
});
