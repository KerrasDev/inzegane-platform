/**
 * src/public/lib/format.js
 * Inzegane Platform — Public formatting, labels, and safe URL helpers.
 *
 * Pure functions only (no DOM access) so they can be unit tested in Node.
 */

const BASE_URL = import.meta.env?.BASE_URL ?? '/';
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

export const LABELS = {
  freshness: {
    fresh: 'Recently verified',
    review: 'Needs re-check',
    stale: 'Historical',
    unknown: 'Verification date unknown',
  },
  stockRecorded: {
    in_stock: 'Recorded as in stock',
    low_stock: 'Recorded as low stock',
    available_on_order: 'Recorded as available on order',
    out_of_stock: 'Recorded as out of stock',
    unknown: 'Stock status unknown',
  },
  stockFacet: {
    in_stock: 'In stock (recent claim)',
    low_stock: 'Low stock (recent claim)',
    available_on_order: 'On order (recent claim)',
    out_of_stock: 'Out of stock (recent claim)',
    unknown: 'Unknown / not recently confirmed',
  },
  condition: {
    new: 'New',
    refurbished_grade_a: 'Refurbished – Grade A',
    refurbished_grade_b: 'Refurbished – Grade B',
    refurbished: 'Refurbished',
    open_box: 'Open box',
    used: 'Used',
    unknown: 'Condition unknown',
  },
  priceType: {
    verified_wholesale_price: 'Wholesale price (verified at source)',
    published_distributor_price: 'Published distributor price',
    public_retail_price: 'Public retail price',
    supplier_quotation: 'Supplier quotation',
    price_unavailable_quotation_required: 'Price on request',
  },
  vat: {
    ht: 'excl. VAT (HT)',
    ttc: 'incl. VAT (TTC)',
    exempt: 'VAT exempt',
    unknown: 'VAT basis unknown',
  },
  priceBasis: {
    per_unit: 'per unit',
    per_pack: 'per pack',
    per_box: 'per box',
    per_carton: 'per carton',
    per_lot: 'per lot',
  },
  verificationMethod: {
    in_person_audit: 'In-person audit',
    telephony_whatsapp_inquiry: 'Phone / WhatsApp inquiry',
    b2b_catalog_review: 'B2B catalog review',
    distributor_portal_pull: 'Distributor portal extract',
    public_listing_extraction: 'Public listing extraction',
  },
  businessType: {
    importer: 'Importer',
    master_distributor: 'Master distributor',
    regional_wholesaler: 'Regional wholesaler',
    cash_and_carry: 'Cash and carry',
    refurbisher: 'Refurbisher',
    authorized_agent: 'Authorized agent',
  },
  wholesaleStatus: {
    verified_wholesale_only: 'Wholesale only',
    hybrid_wholesale_retail: 'Wholesale and retail',
    retail_with_bulk_discount: 'Retail with bulk discount',
    unverified: 'Wholesale status unverified',
  },
  businessVerification: {
    field_verified: 'Field visit recorded by source',
    registry_confirmed: 'Registry record cited by source',
    public_documentation_verified: 'Public documentation cited by source',
    unverified: 'Unverified',
  },
  sourceType: {
    field_observation: 'Field observation',
    b2b_price_sheet: 'B2B price sheet',
    official_portal: 'Official portal',
    phone_inquiry: 'Phone inquiry',
    public_catalog: 'Public catalog',
    online_storefront: 'Online storefront',
  },
  availability: {
    in_stock: 'In stock',
    out_of_stock: 'Out of stock',
    available_on_order: 'Available on order',
    discontinued: 'Discontinued',
    unknown: 'Unknown',
  },
  moroccoStatus: {
    readily_available: 'Readily available',
    sporadic: 'Sporadic',
    import_on_demand: 'Import on demand',
    discontinued: 'Discontinued',
  },
  inzeganeStatus: {
    physically_stocked_in_inzegane: 'Physically stocked in Inezgane',
    supplied_from_agadir_tassila: 'Supplied from Agadir / Tassila',
    shipped_from_casablanca_hub: 'Shipped from the Casablanca hub',
    unconfirmed: 'Unconfirmed',
  },
  evidenceLevel: {
    A: 'Level A – verified in Inezgane',
    B: 'Level B – verified in the nearby region',
    C: 'Level C – verified nationally',
    D: 'Level D – potential catalog item',
  },
  productStatus: {
    canonical_verified: 'Canonical product record',
    provisional_model: 'Provisional model',
    generic_archetype: 'Generic archetype',
  },
  confidence: { high: 'High', medium: 'Medium', low: 'Low' },
  reliability: { high: 'High', medium: 'Medium', low: 'Low' },
};

/** Turns a snake_case value into readable text without inventing meaning. */
export function humanize(value) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function label(group, value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return LABELS[group]?.[value] ?? humanize(value);
}

export function formatMoney(amount, currency = 'MAD') {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Formats ISO dates/date-times as e.g. "18 Feb 2025" (UTC). Returns null when unknown. */
export function formatDate(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(timestamp));
}

export function formatSpecValue(value) {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatSpecValue).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${humanize(key)}: ${formatSpecValue(item)}`).join('; ');
  }
  return String(value).replace(/_/g, ' ');
}

export function productName(product) {
  return product?.identity?.product_name_en || product?.identity?.product_name_fr || product?.product_id || 'Unnamed product';
}

export function categoryName(category) {
  return category?.name_en || category?.name_fr || category?.category_id || 'Uncategorized';
}

export function supplierName(supplier) {
  return supplier?.business_name || supplier?.supplier_id || 'Unknown supplier';
}

/** Returns a trimmed identifier when it is a plausible canonical ID, otherwise null. */
export function parseResourceId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function readIdFromLocation(search = globalThis.location?.search ?? '') {
  return parseResourceId(new URLSearchParams(search).get('id'));
}

export function sitePath(path = '') {
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

export function withQuery(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const routes = {
  home: () => sitePath(''),
  products: (params) => withQuery(sitePath('pages/products/'), params),
  product: (id) => withQuery(sitePath('pages/products/detail.html'), { id }),
  categories: () => sitePath('pages/categories/'),
  category: (id) => withQuery(sitePath('pages/categories/detail.html'), { id }),
  suppliers: (params) => withQuery(sitePath('pages/suppliers/'), params),
  supplier: (id) => withQuery(sitePath('pages/suppliers/detail.html'), { id }),
  offers: (params) => withQuery(sitePath('pages/offers/'), params),
  offer: (id) => withQuery(sitePath('pages/offers/detail.html'), { id }),
  about: () => sitePath('pages/about.html'),
  contact: () => sitePath('pages/contact.html'),
  methodology: () => sitePath('pages/methodology.html'),
  notFound: () => sitePath('pages/not-found.html'),
};

/** Accepts only absolute http(s) URLs; anything else returns null. */
export function safeExternalUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function phoneDigits(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function telUrl(phone) {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappUrl(phone, message = '') {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return message ? `https://wa.me/${digits}?${new URLSearchParams({ text: message })}` : `https://wa.me/${digits}`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
