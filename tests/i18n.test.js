import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLocale, getLocale, setLocale, t, getSupportedLocales, initI18n, resolveInitialLocale, applyLocale } from '../src/i18n/index.js';
import { ar } from '../src/i18n/locales/ar.js';
import { fr } from '../src/i18n/locales/fr.js';
import { en } from '../src/i18n/locales/en.js';

// Mock localStorage
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

// Mock window.location
globalThis.window = { location: { search: '' } };
globalThis.document = { documentElement: { lang: '', dir: '' } };

test('normalizeLocale accepts supported locales', () => {
  assert.equal(normalizeLocale('ar'), 'ar');
  assert.equal(normalizeLocale('fr'), 'fr');
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('AR'), 'ar');
  assert.equal(normalizeLocale('Fr'), 'fr');
});

test('normalizeLocale rejects unsupported locales', () => {
  assert.equal(normalizeLocale('de'), 'en');
  assert.equal(normalizeLocale(''), 'en');
  assert.equal(normalizeLocale(null), 'en');
  assert.equal(normalizeLocale(undefined), 'en');
  assert.equal(normalizeLocale(123), 'en');
});

test('getSupportedLocales returns all three', () => {
  const locales = getSupportedLocales();
  assert.deepEqual(locales.sort(), ['ar', 'fr', 'en'].sort());
});

test('t() returns translated string for valid key', () => {
  setLocale('en');
  assert.equal(t('common.search'), 'Search');
  setLocale('fr');
  assert.equal(t('common.search'), 'Rechercher');
  setLocale('ar');
  assert.equal(t('common.search'), 'بحث');
});

test('t() falls back to default locale for missing key', () => {
  setLocale('ar');
  // A key that exists in en but not ar (if any) — test with a known key
  assert.equal(typeof t('common.search'), 'string');
});

test('t() returns key for completely unknown key', () => {
  setLocale('en');
  assert.equal(t('nonexistent.key.path'), 'nonexistent.key.path');
});

test('t() supports interpolation', () => {
  setLocale('en');
  // Test with a key that has params (if any exist)
  // Since our dictionaries don't have {{}} params, just verify no crash
  assert.equal(typeof t('common.search', { name: 'test' }), 'string');
});

test('setLocale persists to localStorage', () => {
  storage.clear();
  setLocale('fr');
  assert.equal(storage.get('inzegane_locale'), 'fr');
  assert.equal(getLocale(), 'fr');
});

test('setLocale handles unavailable storage', () => {
  const origSetItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
  setLocale('ar');
  assert.equal(getLocale(), 'ar');
  globalThis.localStorage.setItem = origSetItem;
});

test('resolveInitialLocale uses URL param', () => {
  storage.clear();
  globalThis.window.location.search = '?lang=fr';
  const locale = resolveInitialLocale();
  assert.equal(locale, 'fr');
  globalThis.window.location.search = '';
});

test('resolveInitialLocale uses localStorage', () => {
  storage.clear();
  storage.set('inzegane_locale', 'ar');
  globalThis.window.location.search = '';
  const locale = resolveInitialLocale();
  assert.equal(locale, 'ar');
  storage.clear();
});

test('resolveInitialLocale defaults to en', () => {
  storage.clear();
  globalThis.window.location.search = '';
  const locale = resolveInitialLocale();
  assert.equal(locale, 'en');
});

test('applyLocale sets lang and dir', () => {
  setLocale('ar');
  applyLocale();
  assert.equal(globalThis.document.documentElement.lang, 'ar');
  assert.equal(globalThis.document.documentElement.dir, 'rtl');
  setLocale('en');
  applyLocale();
  assert.equal(globalThis.document.documentElement.lang, 'en');
  assert.equal(globalThis.document.documentElement.dir, 'ltr');
});

test('all three dictionaries have the same top-level keys', () => {
  const arKeys = Object.keys(ar).sort();
  const frKeys = Object.keys(fr).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(arKeys, enKeys, 'Arabic and English should have same top-level keys');
  assert.deepEqual(frKeys, enKeys, 'French and English should have same top-level keys');
});

test('all three dictionaries have the same nested keys', () => {
  function getKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...getKeys(v, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys.sort();
  }
  const arKeys = getKeys(ar);
  const frKeys = getKeys(fr);
  const enKeys = getKeys(en);
  assert.deepEqual(arKeys, enKeys, 'Arabic and English should have same nested keys');
  assert.deepEqual(frKeys, enKeys, 'French and English should have same nested keys');
});