/**
 * src/data/export-validator.js
 * Inzegane Platform — Export Validation Layer
 *
 * Validates a local database snapshot before it is serialized/exported.
 * Reuses RESOURCE_SCHEMAS and PRIMARY_KEYS from the existing contracts.
 * Produces a structured result: { ok, errors, warnings, counts, recordsChecked }.
 */

import { PRIMARY_KEYS, DATA_COLLECTIONS } from './contracts.js';
import { RESOURCE_SCHEMAS } from './resource-schemas.js';

// Precompiled regular expressions for performance
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Precompile pattern regexes from schemas to avoid recompilation per record
const COMPILED_PATTERNS = new Map();
for (const [res, schema] of Object.entries(RESOURCE_SCHEMAS)) {
  for (const field of schema.fields || []) {
    if (field.pattern) {
      try {
        COMPILED_PATTERNS.set(`${res}.${field.key}`, new RegExp(field.pattern));
      } catch {
        // Fallback for invalid regex pattern in schema definitions
      }
    }
  }
}

/**
 * Safely extract nested property value via dot notation without prototype pollution risks.
 */
function getNestedValue(obj, path) {
  if (!path || !obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length; i += 1) {
    const key = parts[i];
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Validates ISO-8601 string dates with calendar-valid round-trip checking.
 */
function isValidIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(parsed).toISOString().slice(0, 10) === value;
  }
  return true;
}
function validateRecord(resource, record) {
  const errors = [];
  const warnings = [];
  const schema = RESOURCE_SCHEMAS[resource];
  if (!schema) {
    errors.push({ resource, recordId: null, field: null, reason: `No schema defined for resource "${resource}"`, severity: 'blocking' });
    return { errors, warnings };
  }

  if (record === null || record === undefined || typeof record !== 'object' || Array.isArray(record)) {
    errors.push({ resource, recordId: null, field: null, reason: `Invalid record: expected an object but got ${record === null ? 'null' : typeof record}`, severity: 'blocking' });
    return { errors, warnings };
  }

  const pk = PRIMARY_KEYS[resource];
  const recordId = pk ? record?.[pk] : null;

  // Required fields
  if (schema.fields) {
    for (const field of schema.fields) {
      if (field.required) {
        const value = getNestedValue(record, field.target || field.key);
        if (value === undefined || value === null || value === '') {
          errors.push({ resource, recordId, field: field.key, reason: `Required field "${field.key}" is missing or empty`, severity: 'blocking' });
        }
      }
    }
  }

  // Pattern validation (using precompiled regex)
  if (schema.fields) {
    for (const field of schema.fields) {
      if (field.pattern) {
        const value = getNestedValue(record, field.target || field.key);
        if (value && typeof value === 'string') {
          const regex = COMPILED_PATTERNS.get(`${resource}.${field.key}`);
          if (regex && !regex.test(value)) {
            errors.push({ resource, recordId, field: field.key, reason: `Field "${field.key}" does not match pattern ${field.pattern}`, severity: 'blocking' });
          }
        }
      }
    }
  }

  // Enum validation
  if (schema.fields) {
    for (const field of schema.fields) {
      if (field.options && Array.isArray(field.options)) {
        const value = getNestedValue(record, field.target || field.key);
        if (value && !field.options.includes(value)) {
          const isBlocking = field.required || field.key === 'condition';
          const reasonMsg = isBlocking
            ? `Field "${field.key}" has invalid value "${value}" (allowed: ${field.options.join(', ')})`
            : `Field "${field.key}" has unexpected value "${value}" (expected one of: ${field.options.join(', ')})`;
          if (isBlocking) {
            errors.push({ resource, recordId, field: field.key, reason: reasonMsg, severity: 'blocking' });
          } else {
            warnings.push({ resource, recordId, field: field.key, reason: reasonMsg, severity: 'warning' });
          }
        }
      }
    }
  }

  // Referential integrity (checked separately in validateCrossReferences)
  return { errors, warnings };
}

/**
 * Validate cross-resource referential integrity.
 * Returns an array of error objects.
 */
function validateCrossReferences(allData) {
  const errors = [];

  // Products → categories, brands
  const products = new Set((allData.products || []).filter(p => p && typeof p === 'object').map(p => p.product_id));
  const suppliers = new Set((allData.suppliers || []).filter(s => s && typeof s === 'object').map(s => s.supplier_id));
  const categories = new Set((allData.categories || []).filter(c => c && typeof c === 'object').map(c => c.category_id));
  const brands = new Set((allData.brands || []).filter(b => b && typeof b === 'object').map(b => b.brand_id));
  const sources = new Set((allData.sources || []).filter(s => s && typeof s === 'object').map(s => s.source_id));
  for (const product of (allData.products || [])) {
    if (!product || typeof product !== 'object') continue;
    const catId = product.classification?.category_id;
    if (catId && !categories.has(catId)) {
      errors.push({ resource: 'products', recordId: product.product_id, field: 'classification.category_id', reason: `Category "${catId}" does not exist`, severity: 'blocking' });
    }
    const brandId = product.identity?.brand_id;
    if (brandId && !brands.has(brandId)) {
      errors.push({ resource: 'products', recordId: product.product_id, field: 'identity.brand_id', reason: `Brand "${brandId}" does not exist`, severity: 'blocking' });
    }
  }

  // Offers → products, suppliers, sources
  for (const offer of (allData.offers || [])) {
    if (!offer || typeof offer !== 'object') continue;
    if (offer.product_id && !products.has(offer.product_id)) {
      errors.push({ resource: 'offers', recordId: offer.offer_id, field: 'product_id', reason: `Product "${offer.product_id}" does not exist`, severity: 'blocking' });
    }
    if (offer.supplier_id && !suppliers.has(offer.supplier_id)) {
      errors.push({ resource: 'offers', recordId: offer.offer_id, field: 'supplier_id', reason: `Supplier "${offer.supplier_id}" does not exist`, severity: 'blocking' });
    }

    // Source IDs
    if (Array.isArray(offer.source_ids)) {
      if (offer.source_ids.length === 0) {
        errors.push({ resource: 'offers', recordId: offer.offer_id, field: 'source_ids', reason: `Offer "${offer.offer_id}" must reference at least one source`, severity: 'blocking' });
      }
      for (const srcId of offer.source_ids) {
        if (srcId && !sources.has(srcId)) {
          errors.push({ resource: 'offers', recordId: offer.offer_id, field: 'source_ids', reason: `Offer "${offer.offer_id}" references missing source "${srcId}"`, severity: 'blocking' });
        }
      }
    }
  }

  // Availability checks → products, suppliers
  for (const check of (allData.availability_checks || [])) {
    if (!check || typeof check !== 'object') continue;
    if (check.product_id && !products.has(check.product_id)) {
      errors.push({ resource: 'availability_checks', recordId: check.availability_check_id, field: 'product_id', reason: `Product "${check.product_id}" does not exist`, severity: 'blocking' });
    }
    if (check.supplier_id && !suppliers.has(check.supplier_id)) {
      errors.push({ resource: 'availability_checks', recordId: check.availability_check_id, field: 'supplier_id', reason: `Supplier "${check.supplier_id}" does not exist`, severity: 'blocking' });
    }
  }

  // Price history → products, suppliers, sources, offers
  const offersSet = new Set((allData.offers || []).map(o => o?.offer_id).filter(id => typeof id === 'string' && id.trim().length > 0));
  for (const entry of (allData.price_history || [])) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.product_id && !products.has(entry.product_id)) {
      errors.push({ resource: 'price_history', recordId: entry.price_observation_id, field: 'product_id', reason: `Product "${entry.product_id}" does not exist`, severity: 'blocking' });
    }
    if (entry.supplier_id && !suppliers.has(entry.supplier_id)) {
      errors.push({ resource: 'price_history', recordId: entry.price_observation_id, field: 'supplier_id', reason: `Supplier "${entry.supplier_id}" does not exist`, severity: 'blocking' });
    }
    if (entry.source_id && !sources.has(entry.source_id)) {
      errors.push({ resource: 'price_history', recordId: entry.price_observation_id, field: 'source_id', reason: `Source "${entry.source_id}" does not exist`, severity: 'blocking' });
    }

    // Offer reference (optional — price history may exist without offer)
    if (entry.offer_id) {
      if (!offersSet.has(entry.offer_id)) {
        errors.push({ resource: 'price_history', recordId: entry.price_observation_id, field: 'offer_id', reason: `Offer "${entry.offer_id}" does not exist`, severity: 'blocking' });
      } else {
        const offer = (allData.offers || []).find(o => o?.offer_id === entry.offer_id);
        if (offer && (offer.product_id !== entry.product_id || offer.supplier_id !== entry.supplier_id)) {
          errors.push({ resource: 'price_history', recordId: entry.price_observation_id, field: 'offer_id', reason: `Price observation "${entry.price_observation_id}" product/supplier do not match its offer`, severity: 'blocking' });
        }
      }
    }
  }

  // Source supports references
  const allIds = new Set([...products, ...categories, ...brands, ...suppliers, ...offersSet, ...sources]);
  for (const source of (allData.sources || [])) {
    if (!source || typeof source !== 'object') continue;
    if (Array.isArray(source.supports)) {
      for (const targetId of source.supports) {
        if (targetId && !allIds.has(targetId)) {
          errors.push({ resource: 'sources', recordId: source.source_id, field: 'supports', reason: `Source "${source.source_id}" supports references missing id "${targetId}"`, severity: 'blocking' });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate duplicate identifiers within each resource.
 */
function validateDuplicateIds(allData) {
  const errors = [];
  for (const resource of DATA_COLLECTIONS) {
    const pk = PRIMARY_KEYS[resource];
    if (!pk) continue;
    const records = allData[resource] || [];
    const seen = new Set();
    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      const id = record?.[pk];
      if (id) {
        if (seen.has(id)) {
          errors.push({ resource, recordId: id, field: pk, reason: `Duplicate ${pk}: "${id}"`, severity: 'blocking' });
        }
        seen.add(id);
      }
    }
  }
  return errors;
}

/**
 * Validate domain-specific constraints (prices, quantities, dates, URLs).
 * Reuses patterns from src/database.js validateCommercialValues and validateDateFields.
 * Returns { errors: Array, warnings: Array }.
 */
function validateDomainConstraints(snapshot) {
  const errors = [];
  const warnings = [];

  // Date field validation (fields ending in _at or _date)
  validateDateFields(snapshot, 'snapshot', errors);

  // Offer commercial values
  for (const offer of (snapshot.offers || [])) {
    if (!offer || typeof offer !== 'object') continue;
    const id = offer.offer_id || 'unknown';

    // unit_price: must be non-negative number
    if (offer.unit_price !== undefined && offer.unit_price !== null) {
      if (typeof offer.unit_price !== 'number' || !Number.isFinite(offer.unit_price)) {
        errors.push({ resource: 'offers', recordId: id, field: 'unit_price', reason: `${id}.unit_price must be a finite number`, severity: 'blocking' });
      } else if (offer.unit_price < 0) {
        errors.push({ resource: 'offers', recordId: id, field: 'unit_price', reason: `${id}.unit_price must not be negative`, severity: 'blocking' });
      }
    }

    // minimum_order_quantity: positive integer or null
    if (offer.minimum_order_quantity !== null && offer.minimum_order_quantity !== undefined) {
      if (!Number.isInteger(offer.minimum_order_quantity) || offer.minimum_order_quantity < 1) {
        errors.push({ resource: 'offers', recordId: id, field: 'minimum_order_quantity', reason: `${id}.minimum_order_quantity must be a positive integer or null`, severity: 'blocking' });
      }
    }

    // quantity_tiers validation
    let previousMaximum = null;
    for (const [index, tier] of (offer.quantity_tiers ?? []).entries()) {
      const path = `${id}.quantity_tiers[${index}]`;
      if (!tier || typeof tier !== 'object') {
        errors.push({ resource: 'offers', recordId: id, field: `quantity_tiers[${index}]`, reason: `${path} must be an object`, severity: 'blocking' });
        continue;
      }
      if (!Number.isInteger(tier.minimum_quantity) || tier.minimum_quantity < 1) {
        errors.push({ resource: 'offers', recordId: id, field: `quantity_tiers[${index}].minimum_quantity`, reason: `${path}.minimum_quantity must be a positive integer`, severity: 'blocking' });
      }
      if (tier.maximum_quantity !== null && tier.maximum_quantity !== undefined) {
        if (!Number.isInteger(tier.maximum_quantity) || tier.maximum_quantity < (tier.minimum_quantity || 0)) {
          errors.push({ resource: 'offers', recordId: id, field: `quantity_tiers[${index}].maximum_quantity`, reason: `${path}.maximum_quantity must be null or an integer at least minimum_quantity`, severity: 'blocking' });
        }
      }
      if (typeof tier.unit_price !== 'number' || !Number.isFinite(tier.unit_price) || tier.unit_price < 0) {
        errors.push({ resource: 'offers', recordId: id, field: `quantity_tiers[${index}].unit_price`, reason: `${path}.unit_price must be a non-negative number`, severity: 'blocking' });
      }
      if (index > 0 && (previousMaximum === null || tier.minimum_quantity <= previousMaximum)) {
        errors.push({ resource: 'offers', recordId: id, field: `quantity_tiers[${index}].minimum_quantity`, reason: `${path}.minimum_quantity overlaps the previous quantity tier`, severity: 'blocking' });
      }
      previousMaximum = tier.maximum_quantity;
    }
  }

  // Price history commercial values
  for (const obs of (snapshot.price_history || [])) {
    if (!obs || typeof obs !== 'object') continue;
    const id = obs.price_observation_id || 'unknown';
    if (obs.unit_price !== undefined && obs.unit_price !== null) {
      if (typeof obs.unit_price !== 'number' || !Number.isFinite(obs.unit_price)) {
        errors.push({ resource: 'price_history', recordId: id, field: 'unit_price', reason: `${id}.unit_price must be a finite number`, severity: 'blocking' });
      } else if (obs.unit_price < 0) {
        errors.push({ resource: 'price_history', recordId: id, field: 'unit_price', reason: `${id}.unit_price must not be negative`, severity: 'blocking' });
      }
    }
  }

  // Availability checks commercial values
  for (const check of (snapshot.availability_checks || [])) {
    if (!check || typeof check !== 'object') continue;
    const id = check.availability_check_id || 'unknown';
    if (check.quantity_confirmed != null) {
      if (!Number.isInteger(check.quantity_confirmed) || check.quantity_confirmed < 0) {
        errors.push({ resource: 'availability_checks', recordId: id, field: 'quantity_confirmed', reason: `${id}.quantity_confirmed must be a non-negative integer or null`, severity: 'blocking' });
      }
    }
    if (check.availability_status === 'in_stock' && check.quantity_confirmed === 0) {
      errors.push({ resource: 'availability_checks', recordId: id, field: 'quantity_confirmed', reason: `${id} cannot be in_stock with zero confirmed quantity`, severity: 'blocking' });
    }
    if (check.availability_status === 'out_of_stock' && typeof check.quantity_confirmed === 'number' && check.quantity_confirmed > 0) {
      errors.push({ resource: 'availability_checks', recordId: id, field: 'quantity_confirmed', reason: `${id} cannot be out_of_stock with positive confirmed quantity`, severity: 'blocking' });
    }
  }

  // Source URL validation
  for (const source of (snapshot.sources || [])) {
    if (!source || typeof source !== 'object') continue;
    const id = source.source_id || 'unknown';
    if (source.url === null) continue; // null is allowed
    if (source.url !== undefined && source.url !== null) {
      let parsedUrl;
      try {
        parsedUrl = new URL(source.url);
      } catch {
        errors.push({ resource: 'sources', recordId: id, field: 'url', reason: `${id}.url must be an absolute HTTP(S) URL or null`, severity: 'blocking' });
        continue;
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push({ resource: 'sources', recordId: id, field: 'url', reason: `${id}.url must be an absolute HTTP(S) URL or null`, severity: 'blocking' });
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate date fields recursively (fields ending in _at or _date).
 * Reuses logic from src/database.js validateDateFields.
 */
function validateDateFields(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateDateFields(item, `${path}[${index}]`, errors));
    return;
  }
  if (!value || typeof value !== 'object') return;

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
        errors.push({ resource: null, recordId: null, field: fieldPath, reason: `${fieldPath} must be an ISO 8601 date or date-time`, severity: 'blocking' });
      }
    }
    validateDateFields(fieldValue, fieldPath, errors);
  }
}
/**
 * Validate metadata according to the established export contract.
 */
function validateMetadata(metadata, errors, warnings) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    errors.push({ resource: 'metadata', recordId: null, field: 'metadata', reason: 'Database metadata must be an object', severity: 'blocking' });
    return;
  }

  const requiredStrings = ['dataset_id', 'imported_from', 'imported_at', 'source_snapshot_generated_at'];
  for (const field of requiredStrings) {
    if (typeof metadata[field] !== 'string' || metadata[field].trim().length === 0) {
      errors.push({ resource: 'metadata', recordId: null, field, reason: `Database metadata is missing a valid "${field}"`, severity: 'blocking' });
    }
  }

  if (typeof metadata.independently_verified !== 'boolean') {
    errors.push({ resource: 'metadata', recordId: null, field: 'independently_verified', reason: 'Database metadata field "independently_verified" must be a boolean', severity: 'blocking' });
  } else if (metadata.independently_verified === false) {
    warnings.push({ resource: 'metadata', recordId: null, field: 'independently_verified', reason: 'Data is not independently verified (historical snapshot)', severity: 'warning' });
  }

  if (!Array.isArray(metadata.limitations)) {
    errors.push({ resource: 'metadata', recordId: null, field: 'limitations', reason: 'Database metadata field "limitations" must be an array', severity: 'blocking' });
  }

  for (const dateField of ['imported_at', 'source_snapshot_generated_at']) {
    if (typeof metadata[dateField] === 'string' && !isValidIsoDate(metadata[dateField])) {
      errors.push({ resource: 'metadata', recordId: null, field: dateField, reason: `Database metadata field "${dateField}" must be an ISO 8601 date or date-time`, severity: 'blocking' });
    }
  }
}
export function validateExport(snapshot) {
  const errors = [];
  const warnings = [];
  const counts = {};
  let recordsChecked = 0;

  if (!snapshot || typeof snapshot !== 'object') {
    return { ok: false, errors: [{ resource: null, recordId: null, field: null, reason: 'Snapshot is null or not an object', severity: 'blocking' }], warnings: [], counts: {}, recordsChecked: 0 };
  }

  // Check required resources
  const requiredResources = ['products', 'categories', 'brands', 'suppliers', 'offers', 'price_history', 'availability_checks', 'sources'];
  for (const resource of requiredResources) {
    if (!Array.isArray(snapshot[resource])) {
      errors.push({ resource, recordId: null, field: null, reason: `Required resource "${resource}" is missing or not an array`, severity: 'blocking' });
      counts[resource] = 0;
    } else {
      counts[resource] = snapshot[resource].length;
    }
  }

  // Validate metadata
  if (snapshot.metadata !== undefined) {
    validateMetadata(snapshot.metadata, errors, warnings);
  } else {
    errors.push({ resource: 'metadata', recordId: null, field: 'metadata', reason: 'Database metadata is missing', severity: 'blocking' });
  }

  // Validate each record
  for (const resource of DATA_COLLECTIONS) {
    const records = snapshot[resource];
    if (!Array.isArray(records)) continue;
    for (let i = 0; i < records.length; i++) {
      recordsChecked++;
      const recordResult = validateRecord(resource, records[i], i, snapshot);
      errors.push(...recordResult.errors);
      warnings.push(...recordResult.warnings);
    }
  }

  // Cross-reference validation
  errors.push(...validateCrossReferences(snapshot));

  // Duplicate ID validation
  errors.push(...validateDuplicateIds(snapshot));

  // Domain constraint validation (prices, quantities, dates, URLs)
  const domainResult = validateDomainConstraints(snapshot);
  errors.push(...domainResult.errors);
  warnings.push(...domainResult.warnings);

  // Warnings for empty required collections
  for (const resource of requiredResources) {
    if (Array.isArray(snapshot[resource]) && snapshot[resource].length === 0) {
      warnings.push({ resource, recordId: null, field: null, reason: `Resource "${resource}" is empty`, severity: 'warning' });
    }
  }

  // Provenance warning
  if (snapshot.metadata) {
    if (snapshot.metadata.independently_verified === false) {
      warnings.push({ resource: 'metadata', recordId: null, field: 'independently_verified', reason: 'Data is not independently verified (historical snapshot)', severity: 'warning' });
    }
  }

  const blockingErrors = errors.filter(e => e.severity === 'blocking');
  return {
    ok: blockingErrors.length === 0,
    errors,
    warnings,
    counts,
    recordsChecked,
  };
}

/**
 * Get a summary string of validation results.
 */
export function formatValidationSummary(result) {
  if (!result) return 'No validation result';
  const parts = [];
  parts.push(result.ok ? '✅ Validation passed' : '❌ Validation failed');
  parts.push(`${result.recordsChecked} records checked`);
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error(s)`);
  }
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }
  return parts.join(' | ');
}