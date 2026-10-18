import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { describe } from 'node:test';
import { createCatalogSearch } from '../src/catalog-search.js';
import {
  buildCatalogProducts,
  getOfferFreshness,
  loadDatabase,
  validateDatabase,
} from '../src/database.js';

const schema = JSON.parse(
  fs.readFileSync(new URL('../public/data/schema.json', import.meta.url), 'utf8')
);

async function loadFixtureDatabase(options = {}) {
  const fetchImpl = options.fetchImpl ?? (async (url) => {
    const fileUrl = new URL(`../public${url}`, import.meta.url);
    const body = fs.readFileSync(fileUrl, 'utf8');
    return {
      ok: true,
      headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => JSON.parse(body),
    };
  });
  return loadDatabase({ fetchImpl, baseUrl: options.baseUrl ?? '/' });
}

describe('loadDatabase and HTTP data loading', () => {
  test('loads and validates every documented JSON collection from disk', async () => {
    const database = await loadFixtureDatabase();

    assert.equal(database.categories.length, 12);
    assert.equal(database.brands.length, 10);
    assert.equal(database.suppliers.length, 5);
    assert.equal(database.products.length, 7);
    assert.equal(database.offers.length, 8);
    assert.equal(database.price_history.length, 6);
    assert.equal(database.availability_checks.length, 5);
    assert.equal(database.sources.length, 8);
    assert.equal(database.metadata.independently_verified, false);
    assert.deepEqual(validateDatabase(database, schema), []);
  });

  test('requests the exact kebab-case filenames and respects baseUrl formatting', async () => {
    const requestedUrls = [];
    const trackingFetch = async (url) => {
      requestedUrls.push(url);
      const fileUrl = new URL(`../public${url.replace(/^https:\/\/catalog\.inzegane\.test/, '')}`, import.meta.url);
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => JSON.parse(fs.readFileSync(fileUrl, 'utf8')),
      };
    };

    await loadDatabase({
      baseUrl: 'https://catalog.inzegane.test',
      fetchImpl: trackingFetch,
    });

    const expectedFilenames = [
      'schema.json',
      'categories.json',
      'brands.json',
      'suppliers.json',
      'products.json',
      'offers.json',
      'price-history.json',
      'availability-checks.json',
      'sources.json',
      'research-summary.json',
      'database-metadata.json',
    ];

    for (const filename of expectedFilenames) {
      const expectedUrl = `https://catalog.inzegane.test/data/${filename}`;
      assert.ok(
        requestedUrls.includes(expectedUrl),
        `Expected ${expectedUrl} to be requested, but was not.`
      );
    }

    assert.ok(
      !requestedUrls.some((url) => url.includes('price_history.json')),
      'Should not request obsolete price_history.json'
    );
    assert.ok(
      !requestedUrls.some((url) => url.includes('availability_checks.json')),
      'Should not request obsolete availability_checks.json'
    );
    assert.ok(
      !requestedUrls.some((url) => url.includes('database_metadata.json')),
      'Should not request obsolete database_metadata.json'
    );
  });

  test('requires a valid fetch implementation function', async () => {
    await assert.rejects(
      loadDatabase({ fetchImpl: null }),
      /A fetch implementation is required/
    );
  });

  test('reports network failure when fetchImpl throws', async () => {
    const failingFetch = async () => {
      throw new Error('Connection refused');
    };
    await assert.rejects(
      loadDatabase({ fetchImpl: failingFetch }),
      /Could not load \/data\/schema\.json: Connection refused/
    );
  });

  test('reports malformed JSON with the failing data path', async () => {
    const fetchImpl = async (url) => {
      if (url.endsWith('/categories.json')) {
        return { ok: true, json: async () => { throw new SyntaxError('Unexpected token'); } };
      }
      const fileUrl = new URL(`../public${url}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(fs.readFileSync(fileUrl, 'utf8')) };
    };

    await assert.rejects(
      loadDatabase({ fetchImpl }),
      /Could not parse JSON from \/data\/categories\.json/
    );
  });

  test('detects HTML error or fallback responses and reports diagnostic error', async () => {
    const htmlFetch = async (url) => {
      if (url.endsWith('/products.json')) {
        return {
          ok: true,
          headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null) },
          json: async () => ({ unexpected: 'html' }),
        };
      }
      const fileUrl = new URL(`../public${url}`, import.meta.url);
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => JSON.parse(fs.readFileSync(fileUrl, 'utf8')),
      };
    };

    await assert.rejects(
      loadDatabase({ fetchImpl: htmlFetch }),
      /Could not parse JSON from \/data\/products\.json: Received HTML content instead of JSON/
    );
  });

  test('reports unavailable files rather than returning an incomplete database', async () => {
    const fetchImpl = async (url) => {
      if (url.endsWith('/offers.json')) return { ok: false, status: 404 };
      const fileUrl = new URL(`../public${url}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(fs.readFileSync(fileUrl, 'utf8')) };
    };

    await assert.rejects(
      loadDatabase({ fetchImpl }),
      /Could not load \/data\/offers\.json: HTTP 404/
    );
  });
});

describe('metadata validation', () => {
  test('rejects missing or empty required string fields', async () => {
    const database = await loadFixtureDatabase();
    const invalidDatabase = structuredClone(database);

    invalidDatabase.metadata.dataset_id = '';
    const fetchImpl = async (url) => {
      if (url.endsWith('/database-metadata.json')) {
        return { ok: true, json: async () => invalidDatabase.metadata };
      }
      const fileUrl = new URL(`../public${url}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(fs.readFileSync(fileUrl, 'utf8')) };
    };

    await assert.rejects(
      loadDatabase({ fetchImpl }),
      /Database metadata is missing a valid "dataset_id"/
    );
  });

  test('rejects non-boolean verification or non-array limitations', async () => {
    const database = await loadFixtureDatabase();
    const invalidDatabase = structuredClone(database);

    invalidDatabase.metadata.independently_verified = 'false';
    const fetchImpl = async (url) => {
      if (url.endsWith('/database-metadata.json')) {
        return { ok: true, json: async () => invalidDatabase.metadata };
      }
      const fileUrl = new URL(`../public${url}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(fs.readFileSync(fileUrl, 'utf8')) };
    };

    await assert.rejects(
      loadDatabase({ fetchImpl }),
      /Database metadata has invalid verification or limitations fields/
    );
  });

  test('rejects malformed timestamps in metadata', async () => {
    const database = await loadFixtureDatabase();
    const invalidDatabase = structuredClone(database);

    invalidDatabase.metadata.imported_at = '2025-99-99';
    const fetchImpl = async (url) => {
      if (url.endsWith('/database-metadata.json')) {
        return { ok: true, json: async () => invalidDatabase.metadata };
      }
      const fileUrl = new URL(`../public${url}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(fs.readFileSync(fileUrl, 'utf8')) };
    };

    await assert.rejects(
      loadDatabase({ fetchImpl }),
      /Database metadata field "imported_at" must be an ISO 8601 date or date-time/
    );
  });
});

describe('schema and structural validation (validateDatabase)', () => {
  test('rejects non-object database or schema inputs', () => {
    assert.ok(validateDatabase(null, {}).some((e) => e.includes('must be JSON objects')));
    assert.ok(validateDatabase({}, null).some((e) => e.includes('must be JSON objects')));
    assert.ok(validateDatabase({}, {}).some((e) => e.includes('Schema is missing required JSON Schema')));
  });

  test('rejects missing required entity fields based on schema', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    delete invalid.products[0].identity;

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('missing required field "identity"')));
  });

  test('rejects values that violate permitted enum sets', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    invalid.sources[0].reliability = 'unrecognized_enum_value';

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('value is not in the permitted set')));
  });
});

describe('relational integrity and identifiers', () => {
  test('rejects duplicate identifiers across different collections', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    const duplicateBrand = structuredClone(invalid.brands[0]);
    duplicateBrand.brand_id = invalid.suppliers[0].supplier_id;
    invalid.brands.push(duplicateBrand);

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('Entity identifiers must be unique across collections')));
  });

  test('detects category hierarchy cycles', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    const childCategory = invalid.categories.find((c) => c.parent_id !== null);
    const parentCategory = invalid.categories.find((c) => c.category_id === childCategory.parent_id);
    parentCategory.parent_id = childCategory.category_id;

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('creates a category cycle')));
  });

  test('rejects product when brand_name does not match the referenced brand record', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    invalid.products[0].identity.brand_name = 'Mismatched Brand Name';

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('does not match its brand record')));
  });

  test('validates product classification category_path hierarchy rules', async () => {
    const database = await loadFixtureDatabase();

    const invalidEnd = structuredClone(database);
    invalidEnd.products[0].classification.category_path = ['cat_comp'];
    invalidEnd.products[0].classification.category_id = 'cat_comp_laptop';
    assert.ok(validateDatabase(invalidEnd, schema).some((e) => e.includes('must end with category_id')));

    const invalidRoot = structuredClone(database);
    invalidRoot.products[0].classification.category_path = ['cat_comp_laptop'];
    invalidRoot.products[0].classification.category_id = 'cat_comp_laptop';
    assert.ok(validateDatabase(invalidRoot, schema).some((e) => e.includes('must start at a root category')));
  });

  test('rejects offers where condition contradicts the product condition', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    const offer = invalid.offers[0];
    offer.condition = 'used';

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('condition does not match its product')));
  });

  test('rejects price observations with product or supplier mismatching the offer', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    const obs = invalid.price_history[0];
    obs.product_id = 'prd_pc_hp_elitebook_840_g5';

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('product/supplier do not match its offer')));
  });
});

describe('commercial-value and date validation', () => {
  test('rejects non-ISO dates and impossible calendar dates', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);

    invalid.price_history[0].observed_at = 'not-a-date';
    assert.ok(validateDatabase(invalid, schema).some((e) => e.includes('observed_at must be an ISO 8601')));

    invalid.price_history[0].observed_at = '2025-02-30';
    assert.ok(validateDatabase(invalid, schema).some((e) => e.includes('observed_at must be an ISO 8601')));
  });

  test('rejects negative prices and non-positive minimum order quantity', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);

    invalid.offers[0].unit_price = -50;
    invalid.offers[0].minimum_order_quantity = 0;
    invalid.price_history[0].unit_price = -10;

    const errors = validateDatabase(invalid, schema);
    assert.ok(errors.some((e) => e.includes('unit_price must not be negative')));
    assert.ok(errors.some((e) => e.includes('minimum_order_quantity must be a positive integer')));
  });

  test('validates quantity tiers structure, order, and non-overlap', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);
    const offer = invalid.offers.find((o) => o.quantity_tiers?.length > 1);

    offer.quantity_tiers[1].minimum_quantity = offer.quantity_tiers[0].minimum_quantity;
    const overlapErrors = validateDatabase(invalid, schema);
    assert.ok(overlapErrors.some((e) => e.includes('overlaps the previous quantity tier')));

    offer.quantity_tiers[0].maximum_quantity = offer.quantity_tiers[0].minimum_quantity - 1;
    const invertedErrors = validateDatabase(invalid, schema);
    assert.ok(invertedErrors.some((e) => e.includes('at least minimum_quantity')));
  });

  test('validates availability checks confirmed quantity consistency', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);

    invalid.availability_checks[0].availability_status = 'in_stock';
    invalid.availability_checks[0].quantity_confirmed = 0;
    assert.ok(
      validateDatabase(invalid, schema).some((e) => e.includes('cannot be in_stock with zero confirmed quantity'))
    );

    invalid.availability_checks[0].availability_status = 'out_of_stock';
    invalid.availability_checks[0].quantity_confirmed = 10;
    assert.ok(
      validateDatabase(invalid, schema).some((e) => e.includes('cannot be out_of_stock with positive confirmed quantity'))
    );
  });

  test('validates source URLs require HTTP(S) protocol or null', async () => {
    const database = await loadFixtureDatabase();
    const invalid = structuredClone(database);

    invalid.sources[0].url = 'ftp://ftp.example.com/catalog';
    assert.ok(validateDatabase(invalid, schema).some((e) => e.includes('absolute HTTP(S) URL or null')));

    invalid.sources[0].url = 'javascript:void(0)';
    assert.ok(validateDatabase(invalid, schema).some((e) => e.includes('absolute HTTP(S) URL or null')));
  });
});

describe('offer freshness and threshold calculation', () => {
  test('applies category-specific threshold days accurately', () => {
    const mobileProd = { classification: { category_id: 'cat_mob_acc' } };
    const refurbProd = { classification: { category_id: 'cat_comp_refurb' } };
    const generalProd = { classification: { category_id: 'cat_comp_laptop' } };
    const sparseProd = {};

    const baseOffer = { observed_at: '2025-02-10T00:00:00Z' };
    const now = new Date('2025-02-15T00:00:00Z');

    assert.equal(getOfferFreshness(baseOffer, mobileProd, now).thresholdDays, 14);
    assert.equal(getOfferFreshness(baseOffer, refurbProd, now).thresholdDays, 21);
    assert.equal(getOfferFreshness(baseOffer, generalProd, now).thresholdDays, 30);
    assert.equal(getOfferFreshness(baseOffer, sparseProd, now).thresholdDays, 30);
  });

  test('categorizes fresh, review, stale, and unknown freshness statuses', () => {
    const product = { classification: { category_id: 'cat_comp_laptop' } };
    const now = new Date('2025-02-20T00:00:00Z');

    const freshOffer = { observed_at: '2025-02-15T00:00:00Z' };
    assert.equal(getOfferFreshness(freshOffer, product, now).status, 'fresh');

    const reviewOffer = { observed_at: '2025-02-05T00:00:00Z' };
    assert.equal(getOfferFreshness(reviewOffer, product, now).status, 'review');

    const staleOffer = { observed_at: '2025-01-01T00:00:00Z' };
    assert.equal(getOfferFreshness(staleOffer, product, now).status, 'stale');

    const futureOffer = { observed_at: '2025-03-01T00:00:00Z' };
    assert.equal(getOfferFreshness(futureOffer, product, now).status, 'unknown');

    const unparseableOffer = { observed_at: 'invalid-date' };
    assert.equal(getOfferFreshness(unparseableOffer, product, now).status, 'unknown');
  });
});

describe('buildCatalogProducts data assembly', () => {
  test('joins relational entities and sorts observations chronologically descending', async () => {
    const database = await loadFixtureDatabase();
    const catalog = buildCatalogProducts(database, new Date('2025-02-20T00:00:00Z'));

    assert.equal(catalog.length, database.products.length);

    const cable = catalog.find((p) => p.product_id === 'prd_cbl_hoco_x14_c');
    assert.ok(cable.brand);
    assert.equal(cable.brand.name, 'Hoco');
    assert.ok(cable.category);
    assert.equal(cable.offers.length, 2);
    assert.equal(cable.offers[0].supplier.business_name, 'Souss Grossiste Télécom Al-Massira');

    for (let i = 1; i < cable.priceHistory.length; i += 1) {
      const prev = Date.parse(cable.priceHistory[i - 1].observed_at);
      const curr = Date.parse(cable.priceHistory[i].observed_at);
      assert.ok(prev >= curr, 'Price history must be sorted descending by observed_at');
    }

    const laptop = catalog.find((p) => p.product_id === 'prd_pc_hp_elitebook_840_g5');
    for (let i = 1; i < laptop.availabilityChecks.length; i += 1) {
      const prev = Date.parse(laptop.availabilityChecks[i - 1].checked_at);
      const curr = Date.parse(laptop.availabilityChecks[i].checked_at);
      assert.ok(prev >= curr, 'Availability checks must be sorted descending by checked_at');
    }
  });

  test('does not mutate original database collections', async () => {
    const database = await loadFixtureDatabase();
    const offersBefore = JSON.stringify(database.offers);

    buildCatalogProducts(database, new Date('2025-02-20T00:00:00Z'));
    assert.equal(JSON.stringify(database.offers), offersBefore);
  });
});

describe('search, facets, and catalog query integration', () => {
  test('searches names and references, filters parent categories, sorts and paginates', async () => {
    const database = await loadFixtureDatabase();
    const date = new Date('2025-02-20T12:00:00Z');
    const catalogSearch = createCatalogSearch(database, { now: date });

    const byReference = catalogSearch.search({ query: 'X14-TYPC-1M-BK' });
    assert.equal(byReference.total, 1);
    assert.equal(byReference.products[0].product_id, 'prd_cbl_hoco_x14_c');

    const byParentCategory = catalogSearch.search({
      categoryId: 'cat_comp',
      brandId: 'brd_hp',
      pageSize: 1,
    });
    assert.equal(byParentCategory.total, 1);
    assert.equal(byParentCategory.pageCount, 1);
    assert.equal(byParentCategory.products[0].brand.name, 'HP');

    const page = catalogSearch.search({ sortBy: 'name', page: 2, pageSize: 3 });
    assert.equal(page.products.length, 3);
    assert.equal(page.page, 2);
    assert.equal(page.pageCount, 3);

    const sortedByPrice = catalogSearch.search({ sortBy: 'price', pageSize: 7 });
    assert.deepEqual(
      sortedByPrice.products.map(({ product_id }) => product_id),
      [
        'prd_ssd_kingston_sa400s37_480g',
        'prd_cbl_hoco_x14_c',
        'prd_pc_hp_elitebook_840_g5',
        'prd_pwb_oraimo_opb_p118d',
        'prd_sec_dahua_dh_hac_hfw1200t',
        'prd_chg_ldnio_a2202',
        'prd_net_tplink_tl_wr841n',
      ],
    );
  });

  test('sorts by the latest dated price observation, not by price amount', async () => {
    const database = await loadFixtureDatabase();
    const observations = database.price_history;
    const hocoOld = observations.find(({ price_observation_id }) => price_observation_id === 'pho_001_x14_c');
    const hocoLatest = observations.find(({ price_observation_id }) => price_observation_id === 'pho_002_x14_c');
    const kingstonOld = observations.find(({ price_observation_id }) => price_observation_id === 'pho_003_sa400_480g');
    const kingstonLatest = observations.find(({ price_observation_id }) => price_observation_id === 'pho_004_sa400_480g');

    hocoOld.unit_price = 0.01;
    hocoLatest.unit_price = 9_999;
    kingstonOld.unit_price = 999_999;
    kingstonLatest.unit_price = 0.02;
    observations.push({
      ...hocoLatest,
      price_observation_id: 'future_test_observation',
      observed_at: '2025-03-01T00:00:00Z',
      unit_price: 0,
    });

    const sorted = createCatalogSearch(database, {
      now: new Date('2025-02-20T12:00:00Z'),
    }).search({
      sortBy: 'price',
      pageSize: 7,
    });
    assert.deepEqual(
      sorted.products.slice(0, 3).map(({ product_id }) => product_id),
      [
        'prd_ssd_kingston_sa400s37_480g',
        'prd_cbl_hoco_x14_c',
        'prd_pc_hp_elitebook_840_g5',
      ],
    );
    assert.deepEqual(
      sorted.products.slice(3).map(({ product_id }) => product_id),
      [
        'prd_pwb_oraimo_opb_p118d',
        'prd_sec_dahua_dh_hac_hfw1200t',
        'prd_chg_ldnio_a2202',
        'prd_net_tplink_tl_wr841n',
      ],
    );
  });

  test('sorts by offer verification date and ignores future verification timestamps', async () => {
    const database = await loadFixtureDatabase();
    for (const offer of database.offers) offer.last_verified_at = '2025-02-01';
    const kingstonOffer = database.offers.find(({ product_id }) => product_id === 'prd_ssd_kingston_sa400s37_480g');
    kingstonOffer.last_verified_at = '2025-02-19';
    const hocoOffer = database.offers.find(({ product_id }) => product_id === 'prd_cbl_hoco_x14_c');
    hocoOffer.last_verified_at = '2025-03-01';

    const result = createCatalogSearch(database, {
      now: new Date('2025-02-20T12:00:00Z'),
    }).search({ sortBy: 'verified', pageSize: 7 });

    assert.equal(result.products[0].product_id, 'prd_ssd_kingston_sa400s37_480g');
  });

  test('applies documented category-specific price freshness limits', async () => {
    const database = await loadFixtureDatabase();
    const cable = database.products.find(({ product_id }) => product_id === 'prd_cbl_hoco_x14_c');
    const cableOffer = database.offers.find(({ offer_id }) => offer_id === 'off_inz_x14_c_01');
    const currentDate = new Date('2025-02-18T12:00:00Z');
    const catalogSearch = createCatalogSearch(database, { now: currentDate });

    assert.equal(getOfferFreshness(cableOffer, cable, currentDate).status, 'fresh');
    const freshCable = catalogSearch.search({ query: 'Hoco' }).products[0].offers[0];
    assert.equal(freshCable.effectiveStockStatus, 'in_stock');
    assert.equal(freshCable.effectivePriceType, 'verified_wholesale_price');
    assert.equal(
      getOfferFreshness(cableOffer, cable, new Date('2025-03-04T12:00:00Z')).status,
      'review',
    );
    assert.equal(
      getOfferFreshness(cableOffer, cable, new Date('2025-03-05T12:00:00Z')).status,
      'stale',
    );

    const defaultResults = createCatalogSearch(database).search();
    const defaultOffers = defaultResults.products.flatMap((product) => product.offers);
    assert.ok(defaultOffers.every((offer) => offer.freshness.status === 'stale'));
    assert.ok(defaultOffers.every((offer) => offer.effectiveStockStatus === 'unknown'));
    assert.ok(defaultOffers.every((offer) => offer.effectivePriceType === 'historical_price'));
  });

  test('uses ItemsJS facets for combined filters and exposes matching bucket counts', async () => {
    const database = await loadFixtureDatabase();
    const catalogSearch = createCatalogSearch(database, { now: new Date('2026-10-16T00:00:00Z') });
    const result = catalogSearch.search({
      categoryId: 'cat_comp',
      brandId: 'brd_hp',
      supplierId: 'sup_ait_refurb_it',
    });

    assert.equal(result.total, 1);
    assert.equal(result.facets.category_ids.buckets.find(({ key }) => key === 'cat_comp').doc_count, 1);
    assert.ok(Array.isArray(result.facets.brand_ids.buckets));

    const withSupplier = catalogSearch.search({ supplierId: 'sup_inz_massira_gsm' });
    assert.ok(withSupplier.total > 0);
    assert.ok(withSupplier.products.every(({ offers }) => offers.some(
      ({ supplier_id }) => supplier_id === 'sup_inz_massira_gsm',
    )));
    assert.ok(withSupplier.products.every(({ offers }) => offers.every(
      ({ supplier_id }) => supplier_id === 'sup_inz_massira_gsm',
    )));
    assert.equal(
      withSupplier.facets.supplier_ids.buckets.find(({ key }) => key === 'sup_inz_massira_gsm').doc_count,
      withSupplier.total,
    );
    assert.equal(catalogSearch.search({ condition: 'refurbished_grade_a' }).total, 1);
    assert.equal(catalogSearch.search({ freshness: 'stale', stockStatus: 'unknown' }).total, 7);
  });

  test('searches French, Arabic, brand, supplier, and technical specification text', async () => {
    const database = await loadFixtureDatabase();
    const catalogSearch = createCatalogSearch(database, { now: new Date('2025-02-20T12:00:00Z') });

    assert.equal(catalogSearch.search({ query: 'câble USB-C' }).products[0].product_id, 'prd_cbl_hoco_x14_c');
    assert.equal(catalogSearch.search({ query: 'كابل شحن' }).products[0].product_id, 'prd_cbl_hoco_x14_c');
    assert.equal(catalogSearch.search({ query: 'Kingston' }).products[0].product_id, 'prd_ssd_kingston_sa400s37_480g');
    assert.equal(catalogSearch.search({ query: 'USB-A' }).total, 4);
  });

  test('handles empty collections, missing optional fields, invalid inputs, and reindexing', async () => {
    const database = await loadFixtureDatabase();
    const emptyDatabase = Object.fromEntries(
      Object.keys(database).filter((key) => Array.isArray(database[key])).map((key) => [key, []]),
    );
    const emptySearch = createCatalogSearch(emptyDatabase);
    assert.equal(emptySearch.search().total, 0);
    assert.throws(
      () => createCatalogSearch({ products: [] }),
      /must include the "categories" collection/,
    );

    const sparseDatabase = structuredClone(database);
    sparseDatabase.products[0].identity.product_name_ar = null;
    sparseDatabase.products[0].identity.product_name_darija = null;
    sparseDatabase.products[0].specifications = {};
    sparseDatabase.products[0].variants = [];
    const sparseSearch = createCatalogSearch(sparseDatabase);
    assert.equal(sparseSearch.search({ query: 'X14-TYPC-1M-BK' }).total, 1);

    const catalogSearch = createCatalogSearch(database);
    const originalCount = catalogSearch.search().total;
    assert.throws(() => catalogSearch.search(null), /Search options must be an object/);
    assert.throws(() => catalogSearch.search({ query: 12 }), /Search query must be a string/);
    assert.throws(() => catalogSearch.search({ brandId: ['brd_hp'] }), /Search filter "brand_ids" must be a string/);
    const updatedDatabase = structuredClone(database);
    updatedDatabase.products.pop();
    assert.throws(
      () => catalogSearch.reindex(updatedDatabase, { now: new Date('not-a-date') }),
      /search index date must be a valid Date/,
    );
    assert.equal(catalogSearch.search().total, originalCount);
    catalogSearch.reindex(updatedDatabase, { now: new Date('2025-02-20T12:00:00Z') });
    assert.equal(catalogSearch.search().total, originalCount - 1);
    assert.equal(catalogSearch.search({ page: 999 }).page, 1);
    assert.equal(catalogSearch.search({ sortBy: 'invalid' }).products[0].identity.product_name_fr,
      catalogSearch.search({ sortBy: 'name' }).products[0].identity.product_name_fr);
  });

  test('does not classify stale declared stock as currently available', async () => {
    const database = await loadFixtureDatabase();
    const catalogSearch = createCatalogSearch(database, { now: new Date('2026-10-16T00:00:00Z') });

    assert.equal(catalogSearch.search({ stockStatus: 'in_stock' }).total, 0);
    const unknownAvailability = catalogSearch.search({ stockStatus: 'unknown' });
    assert.equal(unknownAvailability.total, 7);
    assert.ok(unknownAvailability.products.every(({ offers }) =>
      offers.every(({ effectiveStockStatus }) => effectiveStockStatus === 'unknown')));
  });
});