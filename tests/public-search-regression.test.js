import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_LAYOUT = path.join(ROOT, 'src/public/components/site-layout.js');

test('site-layout.js defines a single renderSearchForm function', () => {
  const source = fs.readFileSync(SITE_LAYOUT, 'utf8');
  const matches = source.match(/function renderSearchForm\(\)/g);
  assert.ok(matches && matches.length === 1, 'renderSearchForm should be defined exactly once');
});

test('search form uses native GET submission', () => {
  const source = fs.readFileSync(SITE_LAYOUT, 'utf8');
  assert.ok(source.includes("method: 'get'"), 'Search form should use GET method');
  assert.ok(source.includes("action: routes.products()"), 'Search form should target products route');
});

test('search form has accessible labels and semantics', () => {
  const source = fs.readFileSync(SITE_LAYOUT, 'utf8');
  assert.ok(source.includes("role: 'search'"), 'Search form should have role="search"');
  assert.ok(source.includes("'aria-label': t('search.ariaLabel')"), 'Search form should have aria-label via translation');
  assert.ok(source.includes("for: 'site-search-input'"), 'Label should be associated with input');
});

test('search input has correct attributes', () => {
  const source = fs.readFileSync(SITE_LAYOUT, 'utf8');
  assert.ok(source.includes("id: 'site-search-input'"), 'Input should have id="site-search-input"');
  assert.ok(source.includes("name: 'q'"), 'Input should have name="q"');
  assert.ok(source.includes("type: 'search'"), 'Input should have type="search"');
});

test('search submit button is a submit button', () => {
  const source = fs.readFileSync(SITE_LAYOUT, 'utf8');
  assert.ok(source.includes("type: 'submit'"), 'Submit button should have type="submit"');
});

test('mountSiteLayout has idempotency guard against duplicate layout', () => {
  const source = fs.readFileSync(SITE_LAYOUT, 'utf8');
  assert.ok(
    source.includes("document.querySelector('.site-header')"),
    'mountSiteLayout should guard against duplicate header injection',
  );
});

test('search form is rendered only inside renderHeader', () => {
  const source = fs.readFileSync(SITE_LAYOUT, 'utf8');
  // renderSearchForm should be called in renderHeader (nav.append(renderSearchForm()))
  const calls = source.match(/nav\.append\(renderSearchForm\(\)\)/g);
  assert.ok(calls && calls.length === 1, 'renderSearchForm should be called once in renderHeader');
});