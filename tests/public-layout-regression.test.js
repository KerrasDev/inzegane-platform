import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const PUBLIC_PAGES = [
  { file: 'index.html', nav: 'home', script: 'src/public/pages/home.js' },
  { file: 'pages/about.html', nav: 'about', script: 'src/public/pages/about.js' },
  { file: 'pages/categories/index.html', nav: 'categories', script: 'src/public/pages/categories.js' },
  { file: 'pages/categories/detail.html', nav: 'categories', script: 'src/public/pages/category-detail.js' },
  { file: 'pages/contact.html', nav: 'contact', script: 'src/public/pages/contact.js' },
  { file: 'pages/methodology.html', nav: 'methodology', script: 'src/public/pages/methodology.js' },
  { file: 'pages/not-found.html', nav: '', script: 'src/public/pages/static-page.js' },
  { file: 'pages/offers/index.html', nav: 'offers', script: 'src/public/pages/offers.js' },
  { file: 'pages/offers/detail.html', nav: 'offers', script: 'src/public/pages/offer-detail.js' },
  { file: 'pages/products/index.html', nav: 'products', script: 'src/public/pages/products-list.js' },
  { file: 'pages/products/detail.html', nav: 'products', script: 'src/public/pages/product-detail.js' },
  { file: 'pages/suppliers/index.html', nav: 'suppliers', script: 'src/public/pages/suppliers.js' },
  { file: 'pages/suppliers/detail.html', nav: 'suppliers', script: 'src/public/pages/supplier-detail.js' },
];

const ROOT = path.resolve(import.meta.dirname, '..');

test('all expected public pages exist', () => {
  for (const page of PUBLIC_PAGES) {
    const fullPath = path.join(ROOT, page.file);
    assert.ok(fs.existsSync(fullPath), `Missing public page: ${page.file}`);
  }
});

test('each public page has a valid HTML doctype', () => {
  for (const page of PUBLIC_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
    assert.match(content, /^<!doctype html>/i, `${page.file}: missing or invalid doctype`);
  }
});

test('each public page contains exactly one main#main-content', () => {
  for (const page of PUBLIC_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
    const matches = content.match(/<main\s[^>]*id="main-content"[^>]*>/g) || [];
    assert.equal(matches.length, 1, `${page.file}: expected exactly one <main id="main-content">, found ${matches.length}`);
  }
});

test('each public page declares the expected data-nav value', () => {
  for (const page of PUBLIC_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
    const match = content.match(/<body[^>]*data-nav="([^"]*)"/);
    assert.ok(match, `${page.file}: missing data-nav attribute on <body>`);
    assert.equal(match[1], page.nav, `${page.file}: expected data-nav="${page.nav}", got "${match[1]}"`);
  }
});

test('each public page has a valid module-script entry point', () => {
  for (const page of PUBLIC_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
    const match = content.match(/<script\s+type="module"\s+src="([^"]+)"/);
    assert.ok(match, `${page.file}: missing module script entry`);
    assert.equal(match[1], `/${page.script}`, `${page.file}: expected script /${page.script}, got ${match[1]}`);
    const scriptPath = path.join(ROOT, page.script);
    assert.ok(fs.existsSync(scriptPath), `${page.file}: script file does not exist: ${page.script}`);
  }
});

test('each page entry point imports and invokes mountSiteLayout', () => {
  for (const page of PUBLIC_PAGES) {
    const scriptPath = path.join(ROOT, page.script);
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert.ok(
      content.includes("import { mountSiteLayout }") || content.includes('mountSiteLayout'),
      `${page.script}: does not import mountSiteLayout`,
    );
    assert.ok(
      content.includes('mountSiteLayout('),
      `${page.script}: does not invoke mountSiteLayout()`,
    );
  }
});

test('each public page has a skip link targeting main-content', () => {
  for (const page of PUBLIC_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
    assert.ok(
      content.includes('class="skip-link"') && content.includes('href="#main-content"'),
      `${page.file}: missing skip link targeting #main-content`,
    );
  }
});

test('each public page uses consistent noscript messaging', () => {
  const expected = 'Navigation and catalog data on this site need JavaScript.';
  for (const page of PUBLIC_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
    assert.ok(
      content.includes(expected),
      `${page.file}: noscript message does not match standard: "${expected}"`,
    );
  }
});

test('each public page has lang="en" on html element', () => {
  for (const page of PUBLIC_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
    assert.match(content, /<html lang="en">/, `${page.file}: missing or incorrect lang attribute`);
  }
});