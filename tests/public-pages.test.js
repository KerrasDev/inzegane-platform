import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { describe } from 'node:test';
import { loadDatabase } from '../src/database.js';
import { buildPublicCatalog, categoryAncestors, suppliersForCategory } from '../src/public/lib/catalog-index.js';
import {
  formatDate, formatMoney, label, parseResourceId, readIdFromLocation, routes, safeExternalUrl, telUrl, whatsappUrl, withQuery,
} from '../src/public/lib/format.js';

async function loadFixture() {
  return loadDatabase({
    fetchImpl: async (url) => {
      const body = fs.readFileSync(new URL(`../public${url}`, import.meta.url), 'utf8');
      return { ok: true, headers: { get: () => 'application/json' }, json: async () => JSON.parse(body) };
    },
  });
}

describe('public formatting helpers', () => {
  test('formats MAD amounts and ISO dates, returning null for unknown values', () => {
    assert.match(formatMoney(10.5, 'MAD'), /^MAD\s10\.50$/u);
    assert.equal(formatMoney(null, 'MAD'), null);
    assert.equal(formatDate('2025-02-18'), '18 Feb 2025');
    assert.equal(formatDate('2025-02-18T15:30:00Z'), '18 Feb 2025');
    assert.equal(formatDate(null), null);
    assert.equal(formatDate('not a date'), null);
  });

  test('validates resource identifiers from query strings', () => {
    assert.equal(parseResourceId('prd_cbl_hoco_x14_c'), 'prd_cbl_hoco_x14_c');
    assert.equal(parseResourceId(' off_inz_x14_c_01 '), 'off_inz_x14_c_01');
    assert.equal(parseResourceId('<script>'), null);
    assert.equal(parseResourceId('../etc'), null);
    assert.equal(parseResourceId(''), null);
    assert.equal(readIdFromLocation('?id=sup_inz_massira_gsm'), 'sup_inz_massira_gsm');
    assert.equal(readIdFromLocation('?id=a%20b'), null);
    assert.equal(readIdFromLocation(''), null);
  });

  test('builds encoded absolute routes for nested pages', () => {
    assert.equal(routes.product('prd_1'), '/pages/products/detail.html?id=prd_1');
    assert.equal(routes.products({ q: 'usb c', category: '' }), '/pages/products/?q=usb+c');
    assert.equal(routes.home(), '/');
    assert.equal(withQuery('/x', { a: 'b&c' }), '/x?a=b%26c');
  });

  test('only produces safe contact and external links', () => {
    assert.equal(safeExternalUrl('https://example.com/a'), 'https://example.com/a');
    assert.equal(safeExternalUrl('javascript:alert(1)'), null);
    assert.equal(safeExternalUrl('/relative'), null);
    assert.equal(telUrl('+212528834190'), 'tel:+212528834190');
    assert.equal(telUrl('123'), null);
    assert.equal(whatsappUrl(null), null);
    assert.match(whatsappUrl('+212661298411', 'Hello'), /^https:\/\/wa\.me\/212661298411\?text=Hello$/);
  });

  test('labels known enum values and humanizes unknown ones', () => {
    assert.equal(label('vat', 'ht'), 'excl. VAT (HT)');
    assert.equal(label('freshness', 'stale'), 'Historical');
    assert.equal(label('vat', 'some_new_value'), 'Some new value');
    assert.equal(label('vat', null, 'Unknown'), 'Unknown');
  });
});

describe('public catalog relationship index', () => {
  test('resolves offers, suppliers, and category counts from real relationships', async () => {
    const database = await loadFixture();
    const catalog = buildPublicCatalog(database, new Date('2026-10-20T00:00:00Z'));

    assert.equal(catalog.products.length, database.products.length);
    assert.equal(catalog.offers.length, database.offers.length);
    const offer = catalog.offersById.get('off_inz_x14_c_01');
    assert.equal(offer.product.product_id, 'prd_cbl_hoco_x14_c');
    assert.equal(offer.supplier.supplier_id, 'sup_inz_massira_gsm');
    assert.equal(offer.freshness.status, 'stale');

    const expectedMobile = database.products.filter((product) => product.classification.category_path.includes('cat_mob')).length;
    assert.equal(catalog.productCountByCategory.get('cat_mob'), expectedMobile);
    assert.equal(catalog.productCountByCategory.get('cat_mob_audio') ?? 0, 0);

    assert.deepEqual(categoryAncestors('cat_mob_cables', catalog.categoriesById).map(({ category_id }) => category_id), ['cat_mob', 'cat_mob_cables']);
    assert.deepEqual(categoryAncestors('missing', catalog.categoriesById), []);

    const supplierOffers = catalog.offersBySupplier.get('sup_inz_massira_gsm');
    assert.equal(supplierOffers.length, database.offers.filter((item) => item.supplier_id === 'sup_inz_massira_gsm').length);
    assert.ok(suppliersForCategory('cat_mob', catalog.suppliers, catalog.childCategories).some(({ supplier_id }) => supplier_id === 'sup_inz_massira_gsm'));
    assert.equal(catalog.priceHistoryByOffer.get('off_inz_x14_c_01').length, 2);
  });

  test('skips offers whose product or supplier relationship is broken', async () => {
    const database = await loadFixture();
    const broken = { ...database, offers: [...database.offers, { ...database.offers[0], offer_id: 'off_orphan', supplier_id: 'sup_missing' }] };
    const catalog = buildPublicCatalog(broken);
    assert.equal(catalog.offersById.has('off_orphan'), false);
  });
});
