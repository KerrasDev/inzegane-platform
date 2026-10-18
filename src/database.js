const DATA_FILES = [
  ['categories', 'categories.json'],
  ['brands', 'brands.json'],
  ['suppliers', 'suppliers.json'],
  ['products', 'products.json'],
  ['offers', 'offers.json'],
  ['price_history', 'price-history.json'],
  ['availability_checks', 'availability-checks.json'],
  ['sources', 'sources.json'],
  ['research_summary', 'research-summary.json'],
];

const ENTITY_ID_FIELDS = {
  categories: 'category_id',
  brands: 'brand_id',
  suppliers: 'supplier_id',
  products: 'product_id',
  offers: 'offer_id',
  price_history: 'price_observation_id',
  availability_checks: 'availability_check_id',
  sources: 'source_id',
};

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function validateValue(value, rule, path, rootSchema, errors) {
  if (rule.$ref) {
    const definitionName = rule.$ref.match(/^#\/\$defs\/([^/]+)$/)?.[1];
    const definition = definitionName && rootSchema.$defs?.[definitionName];
    if (!definition) {
      errors.push(`${path}: unresolved schema reference ${rule.$ref}`);
      return;
    }
    validateValue(value, definition, path, rootSchema, errors);
    return;
  }

  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(`${path}: expected ${types.join(' or ')}`);
      return;
    }
  }

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${path}: value is not in the permitted set`);
  }
  if (Object.hasOwn(rule, 'const') && value !== rule.const) {
    errors.push(`${path}: value must equal ${JSON.stringify(rule.const)}`);
  }

  if (Array.isArray(value) && rule.items) {
    value.forEach((item, index) => validateValue(item, rule.items, `${path}[${index}]`, rootSchema, errors));
  }

  if (matchesType(value, 'object')) {
    for (const field of rule.required ?? []) {
      if (!Object.hasOwn(value, field)) errors.push(`${path}: missing required field "${field}"`);
    }
    for (const [field, propertyRule] of Object.entries(rule.properties ?? {})) {
      if (Object.hasOwn(value, field)) {
        validateValue(value[field], propertyRule, `${path}.${field}`, rootSchema, errors);
      }
    }
  }
}

function addReferenceErrors(errors, sourceId, field, value, targetIds) {
  const references = Array.isArray(value) ? value : [value];
  for (const reference of references) {
    if (reference != null && !targetIds.has(reference)) {
      errors.push(`${sourceId}.${field} references missing id "${reference}"`);
    }
  }
}

function validateRelationships(database) {
  const errors = [];
  const idSets = {};

  for (const [collection, idField] of Object.entries(ENTITY_ID_FIELDS)) {
    const ids = new Set();
    idSets[collection] = ids;
    for (const [index, record] of database[collection].entries()) {
      const id = record[idField];
      if (typeof id !== 'string' || id.length === 0) {
        errors.push(`${collection}[${index}].${idField} must be a non-empty string`);
      } else if (ids.has(id)) {
        errors.push(`${collection} contains duplicate ${idField} "${id}"`);
      } else {
        ids.add(id);
      }
    }
  }

  const allIds = new Set(Object.values(idSets).flatMap((ids) => [...ids]));
  if (allIds.size !== Object.values(idSets).reduce((count, ids) => count + ids.size, 0)) {
    errors.push('Entity identifiers must be unique across collections');
  }
  const categories = new Map(database.categories.map((record) => [record.category_id, record]));
  const products = new Map(database.products.map((record) => [record.product_id, record]));
  const offers = new Map(database.offers.map((record) => [record.offer_id, record]));

  for (const category of database.categories) {
    if (category.parent_id !== null) {
      addReferenceErrors(errors, category.category_id, 'parent_id', category.parent_id, idSets.categories);
      const visited = new Set([category.category_id]);
      let parentId = category.parent_id;
      while (parentId !== null && categories.has(parentId)) {
        if (visited.has(parentId)) {
          errors.push(`${category.category_id}.parent_id creates a category cycle`);
          break;
        }
        visited.add(parentId);
        parentId = categories.get(parentId).parent_id;
      }
    }
  }

  for (const supplier of database.suppliers) {
    addReferenceErrors(errors, supplier.supplier_id, 'supplier_categories', supplier.supplier_categories, idSets.categories);
    addReferenceErrors(errors, supplier.supplier_id, 'source_ids', supplier.source_ids, idSets.sources);
  }

  for (const product of database.products) {
    addReferenceErrors(errors, product.product_id, 'source_ids', product.source_ids, idSets.sources);
    addReferenceErrors(errors, product.product_id, 'identity.brand_id', product.identity.brand_id, idSets.brands);
    addReferenceErrors(errors, product.product_id, 'classification.category_id', product.classification.category_id, idSets.categories);
    addReferenceErrors(errors, product.product_id, 'classification.category_path', product.classification.category_path, idSets.categories);
    const brand = database.brands.find(({ brand_id }) => brand_id === product.identity.brand_id);
    if (brand && brand.name !== product.identity.brand_name) {
      errors.push(`${product.product_id}.identity.brand_name does not match its brand record`);
    }
    if (product.classification.category_path.at(-1) !== product.classification.category_id) {
      errors.push(`${product.product_id}.classification.category_path must end with category_id`);
    }
    if (product.classification.category_path.length > 0
      && categories.get(product.classification.category_path[0])?.parent_id !== null) {
      errors.push(`${product.product_id}.classification.category_path must start at a root category`);
    }
    for (let index = 1; index < product.classification.category_path.length; index += 1) {
      const parent = categories.get(product.classification.category_path[index - 1]);
      if (parent && parent.category_id !== categories.get(product.classification.category_path[index])?.parent_id) {
        errors.push(`${product.product_id}.classification.category_path contains unrelated categories`);
        break;
      }
    }
  }

  for (const offer of database.offers) {
    addReferenceErrors(errors, offer.offer_id, 'product_id', offer.product_id, idSets.products);
    addReferenceErrors(errors, offer.offer_id, 'supplier_id', offer.supplier_id, idSets.suppliers);
    addReferenceErrors(errors, offer.offer_id, 'source_ids', offer.source_ids, idSets.sources);
    if (offer.source_ids.length === 0) errors.push(`${offer.offer_id} must reference at least one source`);
    const product = products.get(offer.product_id);
    if (product && product.condition !== offer.condition) {
      errors.push(`${offer.offer_id} condition does not match its product`);
    }
  }

  for (const observation of database.price_history) {
    addReferenceErrors(errors, observation.price_observation_id, 'offer_id', observation.offer_id, idSets.offers);
    addReferenceErrors(errors, observation.price_observation_id, 'product_id', observation.product_id, idSets.products);
    addReferenceErrors(errors, observation.price_observation_id, 'supplier_id', observation.supplier_id, idSets.suppliers);
    addReferenceErrors(errors, observation.price_observation_id, 'source_id', observation.source_id, idSets.sources);
    if (!observation.source_id) errors.push(`${observation.price_observation_id} must reference a source`);
    const offer = offers.get(observation.offer_id);
    if (offer && (offer.product_id !== observation.product_id || offer.supplier_id !== observation.supplier_id)) {
      errors.push(`${observation.price_observation_id} product/supplier do not match its offer`);
    }
  }

  for (const check of database.availability_checks) {
    addReferenceErrors(errors, check.availability_check_id, 'product_id', check.product_id, idSets.products);
    addReferenceErrors(errors, check.availability_check_id, 'supplier_id', check.supplier_id, idSets.suppliers);
    addReferenceErrors(errors, check.availability_check_id, 'source_id', check.source_id, idSets.sources);
    if (!check.source_id) errors.push(`${check.availability_check_id} must reference a source`);
  }

  for (const source of database.sources) {
    addReferenceErrors(errors, source.source_id, 'supports', source.supports, allIds);
  }

  return errors;
}

function validateDateFields(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateDateFields(item, `${path}[${index}]`, errors));
    return;
  }
  if (!matchesType(value, 'object')) return;

  for (const [field, fieldValue] of Object.entries(value)) {
    const fieldPath = `${path}.${field}`;
    if (/_(at|date)$/.test(field) && fieldValue !== null && typeof fieldValue === 'string') {
      const isoDate = /^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/;
      const parsed = Date.parse(fieldValue);
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(fieldValue);
      const dateOnlyRoundTrips = !isDateOnly || (
        Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === fieldValue
      );
      if (!isoDate.test(fieldValue) || !Number.isFinite(parsed) || !dateOnlyRoundTrips) {
        errors.push(`${fieldPath} must be an ISO 8601 date or date-time`);
      }
    }
    validateDateFields(fieldValue, fieldPath, errors);
  }
}

function validateCommercialValues(database) {
  const errors = [];

  for (const offer of database.offers) {
    if (typeof offer.unit_price === 'number' && offer.unit_price < 0) {
      errors.push(`${offer.offer_id}.unit_price must not be negative`);
    }
    if (offer.minimum_order_quantity !== null && offer.minimum_order_quantity !== undefined
      && (!Number.isInteger(offer.minimum_order_quantity) || offer.minimum_order_quantity < 1)) {
      errors.push(`${offer.offer_id}.minimum_order_quantity must be a positive integer or null`);
    }

    let previousMaximum = null;
    for (const [index, tier] of (offer.quantity_tiers ?? []).entries()) {
      const path = `${offer.offer_id}.quantity_tiers[${index}]`;
      if (!matchesType(tier, 'object')) {
        errors.push(`${path} must be an object`);
        continue;
      }
      if (!Number.isInteger(tier.minimum_quantity) || tier.minimum_quantity < 1) {
        errors.push(`${path}.minimum_quantity must be a positive integer`);
      }
      if (tier.maximum_quantity !== null
        && (!Number.isInteger(tier.maximum_quantity) || tier.maximum_quantity < tier.minimum_quantity)) {
        errors.push(`${path}.maximum_quantity must be null or an integer at least minimum_quantity`);
      }
      if (typeof tier.unit_price !== 'number' || !Number.isFinite(tier.unit_price) || tier.unit_price < 0) {
        errors.push(`${path}.unit_price must be a non-negative number`);
      }
      if (index > 0 && (previousMaximum === null || tier.minimum_quantity <= previousMaximum)) {
        errors.push(`${path}.minimum_quantity overlaps the previous quantity tier`);
      }
      previousMaximum = tier.maximum_quantity;
    }
  }

  for (const observation of database.price_history) {
    if (typeof observation.unit_price === 'number' && observation.unit_price < 0) {
      errors.push(`${observation.price_observation_id}.unit_price must not be negative`);
    }
  }

  for (const check of database.availability_checks) {
    if (check.quantity_confirmed != null
      && (!Number.isInteger(check.quantity_confirmed) || check.quantity_confirmed < 0)) {
      errors.push(`${check.availability_check_id}.quantity_confirmed must be a non-negative integer or null`);
    }
    if (check.availability_status === 'in_stock' && check.quantity_confirmed === 0) {
      errors.push(`${check.availability_check_id} cannot be in_stock with zero confirmed quantity`);
    }
    if (check.availability_status === 'out_of_stock'
      && typeof check.quantity_confirmed === 'number'
      && check.quantity_confirmed > 0) {
      errors.push(`${check.availability_check_id} cannot be out_of_stock with positive confirmed quantity`);
    }
  }

  for (const source of database.sources) {
    if (source.url === null) continue;
    let parsedUrl;
    try {
      parsedUrl = new URL(source.url);
    } catch {
      errors.push(`${source.source_id}.url must be an absolute HTTP(S) URL or null`);
      continue;
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      errors.push(`${source.source_id}.url must be an absolute HTTP(S) URL or null`);
    }
  }

  return errors;
}

export function validateDatabase(database, schema) {
  const errors = [];
  if (!matchesType(database, 'object') || !matchesType(schema, 'object')) {
    return ['Database and schema must be JSON objects'];
  }
  if (!matchesType(schema.properties, 'object') || !matchesType(schema.$defs, 'object') || !Array.isArray(schema.required)) {
    return ['Schema is missing required JSON Schema object properties'];
  }
  validateValue(database, schema, 'database', schema, errors);
  if (errors.length === 0) {
    errors.push(...validateRelationships(database));
    validateDateFields(database, 'database', errors);
    errors.push(...validateCommercialValues(database));
  }
  return errors;
}

async function fetchJson(fetchImpl, url) {
  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new Error(`Could not load ${url}: ${error.message}`, { cause: error });
  }
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);

  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new Error(`Could not parse JSON from ${url}: Received HTML content instead of JSON`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Could not parse JSON from ${url}: ${error.message}`, { cause: error });
  }
}

function validateMetadata(metadata) {
  const requiredStrings = ['dataset_id', 'imported_from', 'imported_at', 'source_snapshot_generated_at'];
  for (const field of requiredStrings) {
    if (typeof metadata?.[field] !== 'string' || metadata[field].length === 0) {
      throw new Error(`Database metadata is missing a valid "${field}"`);
    }
  }
  if (typeof metadata.independently_verified !== 'boolean' || !Array.isArray(metadata.limitations)) {
    throw new Error('Database metadata has invalid verification or limitations fields');
  }
  const timestampPattern = /^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/;
  for (const field of ['imported_at', 'source_snapshot_generated_at']) {
    if (!timestampPattern.test(metadata[field]) || !Number.isFinite(Date.parse(metadata[field]))) {
      throw new Error(`Database metadata field "${field}" must be an ISO 8601 date or date-time`);
    }
  }
}

export async function loadDatabase({ baseUrl = '/', fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required to load the database');
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const schema = await fetchJson(fetchImpl, `${base}data/schema.json`);
  const entries = await Promise.all(
    DATA_FILES.map(async ([key, file]) => [key, await fetchJson(fetchImpl, `${base}data/${file}`)]),
  );
  const database = Object.fromEntries(entries);
  const metadata = await fetchJson(fetchImpl, `${base}data/database-metadata.json`);
  validateMetadata(metadata);

  const errors = validateDatabase(database, schema);
  if (errors.length > 0) {
    throw new Error(`Database validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  return { ...database, metadata };
}

function getThresholdDays(product) {
  const categoryId = product?.classification?.category_id ?? '';
  if (categoryId.startsWith('cat_mob_')) return 14;
  if (categoryId === 'cat_comp_refurb') return 21;
  return 30;
}

export function getOfferFreshness(offer, product, now = new Date()) {
  const dateValue = offer.last_verified_at ?? offer.observed_at;
  const verifiedAt = Date.parse(dateValue);
  if (!Number.isFinite(verifiedAt)) return { status: 'unknown', ageDays: null, thresholdDays: getThresholdDays(product) };

  const ageDays = Math.floor((now.getTime() - verifiedAt) / 86_400_000);
  if (ageDays < 0) return { status: 'unknown', ageDays, thresholdDays: getThresholdDays(product) };

  const thresholdDays = getThresholdDays(product);
  if (ageDays <= 7) return { status: 'fresh', ageDays, thresholdDays };
  if (ageDays <= thresholdDays) return { status: 'review', ageDays, thresholdDays };
  return { status: 'stale', ageDays, thresholdDays };
}

export function buildCatalogProducts(database, now = new Date()) {
  const categories = new Map(database.categories.map((category) => [category.category_id, category]));
  const brands = new Map(database.brands.map((brand) => [brand.brand_id, brand]));
  const suppliers = new Map(database.suppliers.map((supplier) => [supplier.supplier_id, supplier]));
  const productsById = new Map(database.products.map((product) => [product.product_id, product]));
  const sources = new Map(database.sources.map((source) => [source.source_id, source]));
  const productOffers = new Map();

  for (const offer of database.offers) {
    const product = productsById.get(offer.product_id);
    const supplier = suppliers.get(offer.supplier_id);
    if (!product || !supplier) continue;
    const related = productOffers.get(product.product_id) ?? [];
    const freshness = getOfferFreshness(offer, product, now);
    related.push({
      ...offer,
      supplier,
      sources: offer.source_ids.map((sourceId) => sources.get(sourceId)),
      freshness,
      effectiveStockStatus: ['stale', 'unknown'].includes(freshness.status) ? 'unknown' : offer.stock_status,
      effectivePriceType: ['stale', 'unknown'].includes(freshness.status) ? 'historical_price' : offer.price_type,
    });
    productOffers.set(product.product_id, related);
  }

  const historyByProduct = new Map();
  for (const observation of database.price_history) {
    const history = historyByProduct.get(observation.product_id) ?? [];
    history.push({ ...observation, source: sources.get(observation.source_id) });
    historyByProduct.set(observation.product_id, history);
  }
  const availabilityByProduct = new Map();
  for (const check of database.availability_checks) {
    const checks = availabilityByProduct.get(check.product_id) ?? [];
    checks.push(check);
    availabilityByProduct.set(check.product_id, checks);
  }

  return database.products.map((product) => {
    const brand = brands.get(product.identity.brand_id);
    const category = categories.get(product.classification.category_id);
    const offers = productOffers.get(product.product_id) ?? [];
    const priceHistory = (historyByProduct.get(product.product_id) ?? [])
      .sort((left, right) => Date.parse(right.observed_at) - Date.parse(left.observed_at));
    const availabilityChecks = (availabilityByProduct.get(product.product_id) ?? [])
      .sort((left, right) => Date.parse(right.checked_at) - Date.parse(left.checked_at));
    return { ...product, brand, category, offers, priceHistory, availabilityChecks };
  });
}