/**
 * src/i18n/index.js
 * Inzegane Platform — Lightweight native i18n module.
 *
 * No external dependencies. Supports ar, fr, en.
 * Locale resolution: URL param ?lang= → localStorage → default 'en'.
 */

const SUPPORTED_LOCALES = ['ar', 'fr', 'en'];
const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'inzegane_locale';

let currentLocale = DEFAULT_LOCALE;
const dictionaries = {};

// Load dictionaries eagerly (small, ~2KB each)
import { ar } from './locales/ar.js';
import { fr } from './locales/fr.js';
import { en } from './locales/en.js';

dictionaries.ar = ar;
dictionaries.fr = fr;
dictionaries.en = en;

/**
 * Validate and normalize a locale string.
 * @param {string} locale
 * @returns {string} A supported locale or the default.
 */
export function normalizeLocale(locale) {
  if (typeof locale !== 'string') return DEFAULT_LOCALE;
  const lower = locale.toLowerCase().trim();
  return SUPPORTED_LOCALES.includes(lower) ? lower : DEFAULT_LOCALE;
}

/**
 * Get the current locale.
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Set the current locale and persist to localStorage.
 * @param {string} locale
 */
export function setLocale(locale) {
  const normalized = normalizeLocale(locale);
  currentLocale = normalized;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // Storage unavailable — continue without persistence
  }
  applyLocale();
}

/**
 * Resolve initial locale from URL param, localStorage, or default.
 * @returns {string}
 */
export function resolveInitialLocale() {
  // 1. URL param
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang) return normalizeLocale(urlLang);
  } catch {
    // window not available
  }

  // 2. localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeLocale(stored);
  } catch {
    // Storage unavailable
  }

  // 3. Default
  return DEFAULT_LOCALE;
}

/**
 * Apply locale to document (lang, dir).
 */
export function applyLocale() {
  const dir = currentLocale === 'ar' ? 'rtl' : 'ltr';
  try {
    document.documentElement.lang = currentLocale;
    document.documentElement.dir = dir;
  } catch {
    // document not available
  }
}

/**
 * Translate a key (dot-notation) with optional interpolation.
 * @param {string} key - Dot-notation key (e.g., 'common.search')
 * @param {Object} [params] - Interpolation params
 * @returns {string}
 */
export function t(key, params = {}) {
  const dict = dictionaries[currentLocale] || dictionaries[DEFAULT_LOCALE];
  const value = getNestedValue(dict, key);

  if (typeof value !== 'string') {
    // Fallback to default locale
    const fallback = getNestedValue(dictionaries[DEFAULT_LOCALE], key);
    if (typeof fallback === 'string') return interpolate(fallback, params);
    // Return key as last resort (never expose internal keys silently in prod)
    return key;
  }

  return interpolate(value, params);
}

function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
}

function interpolate(str, params) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
  });
}

/**
 * Get list of supported locales.
 * @returns {string[]}
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Initialize i18n: resolve locale, apply to document.
 */
export function initI18n() {
  currentLocale = resolveInitialLocale();
  applyLocale();
  return currentLocale;
}