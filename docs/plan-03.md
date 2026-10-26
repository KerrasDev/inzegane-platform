# plan-03 — تدقيق موارد Inzegane Platform وخطة تحسين (Audit & Plan)

**نوع المستند:** تدقيق وتصنيف أداء/موارد (audit & planning only) — **لا تنفيذ**.
**تاريخ التدقيق:** 2026-10-23
**المستودع:** `inzegane-platform` (frontend)
**الفرع / HEAD:** `main` @ `7940b86` (متزامن مع `origin/main`)
**شجرة العمل:** تغييرات غير مُلتزمة (M1/M2/M3) + untracked `.kilo/`, `docs/ai/`, `tests/admin-ui.test.js` — **محفوظة، لم تُلمس**.
**الملف المُنشأ:** `plan-03.md` (root) — **التعديل الوحيد**.

---

## 1. الملخص التنفيذي (Executive Summary)

- **المشروع:** كتالوج سوق إلكترونيات بالجملة (Inezgane/Souss-Massa) — MPA (Vite) + ItemsJS، 23 صفحة HTML، 11 مورد JSON (~92 KB)، 50 ملف JS (~?)، 26 ملف CSS.
- **الحجم (production build):** `dist/` ≈ 366 KB (JS ~183 KB، CSS ~46 KB، HTML + JSON + assets). Largest chunk: `catalog-listing-*.js` = 68.5 KB (gzip 21.7 KB) — يحتوي ItemsJS-dependent listing logic.
- **الاختبارات:** 64 pass / 0 fail (14 suites). Lint pass. Build pass (~437ms).
- **الأداء (مُقاس):** build time ~437ms؛ bundle sizes مُقاسة. **لم تُقَس** FCP/LCP/INP/CLS/long tasks/memory in browser (لا أداة tracing متاحة).
- **النتيجة (استنتاج):** MPA (Vite) مع HTTP caching صحيح على الأرجح كافٍ. Major risks: تحميل JSON snapshot (92 KB) + ItemsJS index على كل صفحة عامة، تكرار تحميل `database-service` (18.6 KB) + `catalog-data` (3.6 KB) على كل صفحة، no code-splitting granular (Vite MPA entries). Admin pages load `database-service` + `admin/index` (18.7 KB) per page.
- **التوصية المؤقتة:** P0 = قياسات (cold/warm visit, network waterfall, ItemsJS index time, JSON parse time). P1 = تقليل per-page JS/data work + correct cache headers. P3/P4 = advanced (SW, partial nav, SPA) — **لا تُنفَّذ** بدون قياسات.

---

## 2. أفضل مسار مبدئي — توصية مؤقتة قبل اكتمال القياسات

1. **P0 (قياسات):** جمع cold/warm visit metrics (Network panel, Performance panel, Memory panel) على 3 صفحات (home, products, product detail) × 2 حالات (cold/warm) × 3 تكرارات.
2. **P1 (منخفض المخاطر):** (a) تأكد من HTTP cache headers صحيحة (fingerprinted assets immutable, HTML no-cache), (b) lazy-load ItemsJS-dependent modules where possible, (c) split `catalog-listing` chunk.
3. **P2 (مشروط):** data partitioning / precomputed search index — فقط إذا ثبت أن JSON parse / index construction هو bottleneck.
4. **P3/P4 (معمارية):** SW, partial navigation, SPA — فقط بعد قياسات وموافقة.

**بيان صريح:** لا توجد أرقام توفير مُقاسة. جميع التقديرات `[استنتاج]`/`[فرضية]`. التنفيذ يتطلب تفويضًا منفصلًا.

---

## 3. نطاق الفحص وحدوده

- **مُفحوص:** repository structure, package.json, vite.config.js, public/data/, src/, assets/css/, tests/, docs/, build output.
- **غير مُفحوص:** Netlify live deploy, CDN, real device metrics, production HTTP headers, Arabic shaping in real browsers, accessibility audit, security audit.
- **قيود:** لا browser tracing متاح في هذا البيئة (browser tools متاحة لكن لا Lighthouse/perf profiling). لا internet access للتحقق من مصادر خارجية (URLs مُدرجة كمراجع غير مُتحقق منها).

---

## 4. سجل مخرجات الوكيل (Agent Output Record)

| ID | المرحلة | الأمر أو الفحص | المخرج الفعلي أو ملخص أمين | الاستنتاج | حالة الدليل |
|---|---|---|---|---|---|
| A1 | Git state | `git status --short --branch` | `## main...origin/main`, 19 modified + 3 untracked | worktree not clean (pre-existing) | `[مخرج أمر]` |
| A2 | Git HEAD | `git log -1 --oneline` | `7940b86 fix(admin): prevent overflow on narrow screens` | HEAD verified | `[مخرج أمر]` |
| A3 | Node/npm | `node --version && npm --version` | v24.15.0 / 11.12.1 | environment versions | `[مخرج أمر]` |
| A4 | HTML count | `find . -name '*.html' ... \| wc -l` | 23 (excluding node_modules/dist) | 23 HTML entries | `[مخرج أمر]` |
| A5 | src files | `find src -type f \| wc -l` | 50 | 50 source files | `[مخرج أمر]` |
| A6 | data size | `du -sh public/data` | 96K | data ~96 KB | `[مخرج أمر]` |
| A7 | build | `npm run build` | pass, 79 modules, ~437ms | build green | `[مخرج أمر]` |
| A8 | dist size | `du -sh dist` | 632K | dist ~632 KB | `[مخرج أمر]` |
| A9 | dist HTML | `find dist -name '*.html' \| wc -l` | 23 | 23 pages built | `[مخرج أمر]` |
| A10 | total JS | `find dist -name '*.js' ...` | 182613 bytes (~178 KB) | JS total ~178 KB | `[مخرج أمر]` |
| A11 | total CSS | `find dist -name '*.css' ...` | 46094 bytes (~45 KB) | CSS total ~45 KB | `[مخرج أمر]` |
| A12 | total dist (du -sb) | `du -sb dist` | 366559 bytes | dist ~358 KB | `[مخرج أمر]` |
| A13 | largest JS chunk | build output | `catalog-listing-*.js` 68.51 KB (gzip 21.73 KB) | largest chunk | `[مخرج أمر]` |
| A14 | tests | `npm test` | 64 pass / 0 fail (14 suites) | tests green | `[مخرج أمر]` |
| A15 | lint | `npm run lint` | pass (0 errors/warnings) | lint green | `[مخرج أمر]` |
| A16 | largest src files | `find src ... sort -rn` | database.js 19.9KB, database-explorer.js 15.4KB, product-detail.js 10.6KB, resource-schemas.js 9.8KB, catalog-search.js 9.3KB, catalog-listing.js 9.2KB | top files | `[مخرج أمر]` |
| A17 | CSS files count/size | `find assets/css -name '*.css'` | 26 files, 85598 bytes (~84 KB source) | CSS source ~84 KB | `[مخرج أمر]` |
| A18 | localStorage keys | grep | `inzegane_db_*`, `inzegane_metadata`, `inzegane_staged_products`, `inzegane_staged_suppliers`, `inzegane_status` | 5 keys | `[مخرج أمر]` |
| A19 | data fetch path | grep in database.js | 11 JSON files via `fetch()` from `/data/` | 11 fetches per page load | `[مخرج أمر]` |
| A20 | browser overflow check (prior) | M2.1–M2.5 sessions | 0 document overflow at 320/360/768/1120 on public pages | responsive OK | `[مخرج أمر]` |
| A21 | browser console/network (prior) | M2.1–M2.5 sessions | 0 console errors, 0 failed requests | no runtime errors | `[مخرج أمر]` |
| A22 | i18next imports | grep | 0 imports in src/tests | unused dependency | `[مخرج أمر]` |
| A23 | package.json main | cat | `"main": "index.js"` (file absent) | stale entry | `[مخرج أمر]` |

---

## 5. خريطة معمارية المشروع الفعلية (Actual Architecture)

- **Type:** Static-first Vite MPA (`appType: 'mpa'`, recursive HTML entry discovery in `vite.config.js`).
- **Entries:** 23 HTML pages (1 home + 12 public + 10 admin).
- **Public:** Vanilla JS ES modules, `mountSiteLayout()`, ItemsJS search, URL state.
- **Admin:** 10 pages, controllers, adapters, `dbService` (localStorage), `DatabaseExplorer`.
- **Data:** 11 JSON files in `public/data/` (~92 KB). Public reads via JSON provider; admin reads via dbService (localStorage seeded from JSON).
- **CSS:** ITCSS, two entry points: `public.css` (public) and `admin.css` (admin). `main.css` dead/alias.
- **Build:** Vite 8, rollup multi-page input, no bundle analyzer configured.
- **Tests:** `node:test` (64 tests, 14 suites). Lint: `eslint src/`.
- **No backend, no auth, no CI, no SW, no prefetch.**

---

## 6. الأعراض مقابل الأسباب المحتملة (Symptoms vs Causes)

| عرض | سبب محتمل | confidence |
|---|---|---|
| 68.5 KB catalog-listing chunk | ItemsJS + listing logic in one chunk | `[استنتاج]` |
| 11 JSON fetches per public page | `loadDatabase()` fetches all collections | `[دليل من المستودع]` |
| 18.6 KB database-service on every page | Shared module imported by all entries | `[دليل من المستودع]` |
| 23 HTML documents (MPA) | Each navigation = full document reload | `[دليل من المستودع]` |
| No code splitting beyond entries | Vite MPA default | `[استنتاج]` |
| localStorage staging keys | `inzegane_staged_products/suppliers` | `[دليل من المستودع]` |

---

## 7. خط أساس استهلاك الموارد (Resource Baseline)

### 7.1 Build output (actual, measured)

- `dist/` total: ~366 KB (du -sb: 366559 bytes).
- JS total: ~183 KB (182613 bytes).
- CSS total: ~45 KB (46094 bytes).
- HTML: 23 files.
- Largest JS chunk: `catalog-listing-*.js` = 68.51 KB (gzip 21.73 KB).
- Admin chunk: `admin/index-*.js` = 18.70 KB (gzip 5.17 KB).
- `database-service-*.js` = 18.58 KB (gzip 5.66 KB).
- `catalog-data-*.js` = 3.60 KB.
- CSS: `site-layout-*.css` = 23.39 KB; `admin-*.css` = 22.70 KB.

### 7.2 Source sizes

- `src/` = 50 files.
- Largest: database.js 19.9 KB, database-explorer.js 15.4 KB, product-detail.js 10.6 KB, resource-schemas.js 9.8 KB, catalog-search.js 9.3 KB, catalog-listing.js 9.2 KB.
- CSS source: 26 files, 85.6 KB.

### 7.3 Data

- `public/data/` = 96 KB total.
- Largest: products.json 18 KB, schema.json 18 KB, offers.json 8.9 KB, sources.json 6.2 KB, suppliers.json 6.6 KB, categories.json 3.4 KB.
- 11 JSON files fetched per public page load (schema + 9 collections + metadata).

### 7.4 Runtime (not measured)

- FCP/LCP/INP/CLS: `[غير متاح]` (no Lighthouse/perf tools).
- Long tasks: `[غير متاح]`.
- Memory: `[غير متاح]`.
- JSON parse time: `[غير متاح]`.
- ItemsJS index construction time: `[غير متاح]`.

### 7.5 Tests/lint/build

- `npm test`: 64 pass / 0 fail. `[مخرج أمر]`
- `npm run lint`: pass. `[مخرج أمر]`
- `npm run build`: pass, 79 modules, ~437ms. `[مخرج أمر]`

---

## 8. تحليل التنقل وإعادة التحميل (Navigation & Reload)

- **MPA:** كل تنقل = full document reload + إعادة تهيئة JS + إعادة fetch JSON + إعادة بناء ItemsJS index.
- **Repeated cost per navigation:** HTML + JS chunks (cached) + JSON (cached if HTTP cache) + DOM rebuild.
- **Back/Forward:** browser may use bfcache (not verified).
- **Admin navigation:** same MPA pattern, each admin page loads `admin/index` chunk (18.7 KB) + `database-service` (18.6 KB).
- **No prefetch/preload** currently configured (Vite default).

---

## 9. جرد شامل للحلول المقترحة (Solution Inventory)

### 9.1 Network & Caching

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| N1 | Correct HTTP cache headers (fingerprinted assets immutable; HTML no-cache) | bandwidth/repeat visits | Low | Low | P1 |
| N2 | Vite `build.rollupOptions.output.manualChunks` for shared vendor | bundle size | Low-Med | Low | P1 |
| N3 | Preload critical chunks (`<link rel="modulepreload">`) | LCP | Low | Low | P1 |
| N4 | Compress JSON (gzip/brotli at host) | data transfer | Low (host config) | Low | P1 |
| N5 | Reduce JSON payload (trim unused fields) | data size | Med | Med (schema) | P2 |
| N6 | Service Worker + Cache API | offline/repeat | High | High (invalidation) | P3/P4 |
| N7 | Partial navigation (Turbo/htmx) | nav cost | High | High (SPA-like) | P3 |

### 9.2 JavaScript & Code Splitting

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| J1 | Route-specific entry points (already MPA) | JS per page | Done | — | — |
| J2 | Lazy-load ItemsJS on search interaction | initial JS | Med | Med | P2 |
| J3 | Remove unused i18next dependency | bundle size (~?) | Low | Low | P1 |
| J4 | Tree-shake / audit dead code | bundle size | Med | Low | P2 |
| J5 | Web Workers for ItemsJS indexing | main thread | Med-High | Med | P2/P3 |

### 9.3 Data & Search

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| D1 | Cache parsed JSON in memory (per session) | repeat parse | Low | Low | P1 |
| D2 | Precompute search index at build time | index cost | Med | Med (freshness) | P2 |
| D3 | Partition data (load only needed collections) | initial data | Med | Med | P2 |
| D4 | Incremental index updates | search perf | High | High | P3 |
| D5 | IndexedDB for offline cache | storage | High | High | P4 |

### 9.4 CSS & Fonts

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| C1 | Remove Inter from font stack (done) | font request | Done | — | — |
| C2 | Purge unused CSS | CSS size | Med | Med (false positives) | P2 |
| C3 | Critical CSS inline | FCP | Med | Med | P2 |
| C4 | Font subsetting (if webfont added later) | font size | — | — | N/A (no webfont) |

### 9.5 Images & Icons

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| I1 | Lazy loading images (if added) | initial load | Low | Low | P2 (no images currently) |
| I2 | SVG optimization | asset size | Low | Low | P2 |

### 9.6 Memory & Storage

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| M1 | Bound localStorage size (admin staging) | storage | Low | Low | P1 |
| M2 | Clean up listeners/observers on navigation | memory | Med | Med | P2 |
| M3 | Avoid retaining full index after search | memory | Med | Med | P2 |

### 9.7 Build & Deployment

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| B1 | Source maps in production (disable or upload) | bundle size | Low | Low | P1 |
| B2 | Vite `manualChunks` for vendor | chunking | Low-Med | Low | P1 |
| B3 | Enable gzip/brotli at host | transfer | Low (config) | Low | P1 |

### 9.8 Advanced/Speculative

| ID | Technique | Target | Effort | Risk | Status |
|---|---|---|---|---|---|
| X1 | SPA conversion | nav cost | Very High | Very High (history, a11y) | P4/Rejected |
| X2 | Framework SPA (React/Vue) | DX | Very High | Very High | Rejected (scope) |
| X3 | Turbo Drive / htmx | nav cost | High | High | P3 |
| X4 | Adaptive loading | low-end devices | Med | Med | P4 |
| X5 | Virtualization of large lists | DOM | Med | Med | P2 (if data grows) |

---

## 10. الشبكة والتخزين المؤقت (Network & Caching)

- **Current:** Vite dev serves assets; production (Netlify) default caching. No custom cache headers in repo (netlify.toml only build/publish/redirect).
- **Recommendation (P1):** Add cache headers in netlify.toml: `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` (fingerprinted), `max-age=0, must-revalidate` for HTML and `/data/*.json`.
- **Risk:** Stale JSON if cached long-term. Mitigation: short TTL or revalidation for JSON.
- **Validation:** Network panel: repeat visit → 304/200 from cache; no re-download of fingerprinted assets.

---

## 11. JavaScript وCSS والصور والخطوط

- **JS:** ~178 KB total, largest chunk catalog-listing 68.5 KB. MPA entries share chunks via Vite. `i18next` unused (0 imports) — candidate for removal (P1, low risk).
- **CSS:** ~45 KB built, 84 KB source. ITCSS. Two entry points (public/admin). `main.css` dead.
- **Fonts:** No webfont (Inter removed). System stack only. No font requests.
- **Images:** No product images in catalogue (text fallback). No lazy-loading needed currently.
- **Icons:** None (no icon font).

---

## 12. JSON والبحث وItemsJS وإدارة الحالة

- **JSON:** 11 files, ~92 KB, fetched per page load via `loadDatabase()` (schema + 9 collections + metadata). All collections fetched even if only one needed.
- **ItemsJS:** index constructed per page load (catalog-search.js). Cost not measured.
- **State:** URL params (public); localStorage (admin staging + dbService).
- **Risk:** Repeated JSON fetch + parse + index construction on every navigation. `[استنتاج]` likely dominant cost after transfer.

---

## 13. CPU والذاكرة وDOM والرسم

- **DOM:** product cards render via `createElement`/`textContent` (public). Admin uses `innerHTML` with `escapeHtml`. No virtualization.
- **Repeated work:** filtering/sorting on every input (catalog-listing). ItemsJS handles. No debouncing observed (check).
- **Memory:** no bounds on localStorage (admin staging). No cleanup of listeners (MPA navigation resets anyway).
- **Long tasks:** `[غير متاح]`.

---

## 14. استراتيجيات التنقل: MPA وpartial navigation وSPA والحلول الهجينة

- **MPA (current):** simple, correct, accessible, history works. Cost: full reload per nav.
- **Partial navigation (Turbo/htmx):** reduces reload cost but adds complexity, a11y risks, history management. P3.
- **SPA:** high effort, risks a11y/SEO, not justified without measurement. P4/Rejected.
- **Recommendation:** keep MPA; optimize caching + per-page JS first.

---

## 15. البناء والاستضافة والنشر (Build & Deployment)

- Vite MPA config, recursive HTML discovery. No bundle analyzer. No source map config (default). Netlify build config present. Live deploy not verified.
- **Recommendation:** add `rollup-plugin-visualizer` (dev-only) for one-off analysis (not a runtime dep). Disable source maps in production (`build.sourcemap: false`).

---

## 16. الحلول المتقدمة والتجريبية والنظرية

- Service Worker: P4 (complexity, invalidation, stale data risk).
- IndexedDB: P4 (not needed at current scale).
- Web Workers for ItemsJS: P2/P3 (measure first).
- Build-time search index: P2 (measure first).
- Virtualization: P2 (only if data grows beyond ~100 products).
- Adaptive loading: P4.

---

## 17. الحلول المستبعدة أو غير المناسبة حاليًا

- SPA conversion: rejected (high cost, a11y/SEO risk, no evidence of need).
- Framework SPA: rejected (scope, dependencies).
- `i18next` wiring: rejected (not needed for performance).
- Removing ItemsJS: rejected (core search).
- Arabic/RTL full UI: out of scope (not perf).

---

## 18. جدول المقارنة المعمارية

| Strategy | Network | Initial load | Subsequent nav | CPU | Memory | Effort | A11y | Verdict |
|---|---|---|---|---|---|---|---|---|
| MPA + correct cache (current+P1) | Low (cached) | Medium | Medium (reload) | Medium | Low | Low | High | **Recommended baseline** |
| MPA + reduced per-page JS | Lower | Lower | Medium | Lower | Low | Med | High | P1 |
| Partial navigation | Lower | Medium | Low | Medium | Med | High | Med | P3 |
| SPA | Lower (after first) | Higher (first) | Low | Medium | High | Very High | Risky | P4/Rejected |
| Build-time index | Lower data | Medium | Medium | Lower | Med | Med | High | P2 |

---

## 19. ترتيب الأولويات P0–P4

- **P0 (قياسات عاجلة):** cold/warm visit metrics; Network waterfall; ItemsJS index time; JSON parse time; long tasks; memory.
- **P1 (منخفض المخاطر):** cache headers; remove i18next; manualChunks; disable source maps; bound localStorage; modulepreload.
- **P2 (مشروط):** data partitioning; build-time index; Web Workers; CSS purge; virtualization.
- **P3 (معمارية):** partial navigation; SW; adaptive loading.
- **P4 (تجريبي/نظري):** SPA; IndexedDB; binary formats.
- **لا يُنصح به:** SPA conversion, framework SPA, removing ItemsJS.

---

## 20. خطة التجارب والقياس (Measurement Plan)

### Experiment E1: Cold vs Warm Visit
- **Setup:** Chrome DevTools Network/Performance, disable cache for cold; enable for warm.
- **Steps:** Visit `/`, `/pages/products/`, `/pages/products/detail.html?id=PROD-001`. Record FCP, LCP, total bytes, request count, long tasks.
- **Metrics:** transferred bytes, request count, FCP, LCP, INP, CLS, long tasks.
- **Repetition:** 3 runs each, median.
- **Interpretation:** cold = first-time user; warm = repeat visit.

### Experiment E2: ItemsJS Index Construction
- **Setup:** Performance panel, record during page load.
- **Steps:** Profile `catalog-search.js` / `createCatalogSearch`. Measure index build time.
- **Metrics:** script execution time, long task duration.

### Experiment E3: JSON Parse Time
- **Setup:** Performance panel.
- **Steps:** Profile `loadDatabase()`; measure fetch + parse per file.
- **Metrics:** per-file fetch duration, parse duration.

### Experiment E4: Navigation Cost
- **Setup:** Network panel, click between pages.
- **Steps:** Navigate home → products → detail → home. Record repeated requests.
- **Metrics:** repeated bytes, cache hit rate, 304 count.

### Experiment E5: Slow Network
- **Setup:** DevTools throttle 3G.
- **Steps:** Repeat E1.
- **Metrics:** FCP/LCP degradation.

### Experiment E6: Low-End Device
- **Setup:** CPU throttle 4x, memory limit.
- **Steps:** Repeat E1.
- **Metrics:** long tasks, INP.

### Experiment E7: Repeated Navigation Memory
- **Setup:** Memory panel, heap snapshots.
- **Steps:** Navigate 10 times, snapshot before/after.
- **Metrics:** heap growth, detached DOM nodes.

### Experiment E8: Offline
- **Setup:** DevTools offline.
- **Steps:** Reload page.
- **Metrics:** failure mode, error message.

---

## 21. مخاطر التراجع وخطة التراجع (Risks & Rollback)

- **Cache headers misconfiguration:** stale JSON. Mitigation: short TTL for JSON; versioned filenames for assets.
- **manualChunks:** chunk loading errors. Mitigation: test build + preview.
- **Removing i18next:** if actually used elsewhere (grep shows 0 imports) — verify before removal.
- **Rollback:** git revert of specific commit; no DB migrations (static frontend).

---

## 22. خطة تنفيذ مستقبلية مرحلية — اقتراحات فقط (Future Plan — Suggestions Only)

- **Phase A (P0):** Run E1–E8, document results in STATUS.
- **Phase B (P1):** Cache headers, remove i18next, manualChunks, disable source maps, modulepreload.
- **Phase C (P2):** Conditional: data partitioning, build-time index, Web Workers (if measured bottleneck).
- **Phase D (P3):** Partial navigation / SW (requires approval + measurement).
- **No implementation in this task.**

---

## 23. معايير النجاح (Success Criteria)

- P0 measurements completed and documented.
- P1 changes applied only if baseline shows benefit.
- No regression in tests/lint/build.
- No increase in document overflow or console errors.
- Perceived latency improved or unchanged.
- All changes reversible via git revert.

---

## 24. الأسئلة المفتوحة والبيانات المطلوبة من صاحب المشروع (Open Questions)

1. Is a live Netlify site attached? (needed for cache header validation)
2. What is the target device class (low-end phones?)?
3. Is offline support required?
4. Acceptable bundle size budget?
5. Should `i18next` be removed entirely (it's unused)?
6. Should `main.css` be deleted (dead entry)?
7. Data refresh cadence and who updates `public/data/`?
8. Arabic shaping concerns if fonts change?

---

## 25. المصادر والمراجع (Sources)

- Vite docs: https://vite.dev/guide/ (unverified — no internet access)
- MDN Performance: https://developer.mozilla.org/en-US/docs/Web/Performance (unverified)
- web.dev: https://web.dev/ (unverified)
- HTTP caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching (unverified)
- Netlify headers: https://docs.netlify.com/routing/headers/ (unverified)
- ItemsJS: https://github.com/itemsapi/itemsjs (unverified)

All external URLs are **unverified references** (no internet access during this audit).

---

## 26. سجل القرارات والخيارات المرفوضة (Decision Log)

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| Keep MPA vs SPA | MPA | SPA | Correctness/a11y/SEO; no evidence of need |
| Keep ItemsJS | Keep | Replace | Core search; no alternative justified |
| Remove i18next | Candidate P1 | Keep (for now) | Unused but removal is a chore, not perf blocker |
| Service Worker | Defer P4 | Implement now | Complexity, invalidation risk |
| Webfont | Keep system stack | Add Inter | No webfont request (M1.8 done) |

---

## 27. قائمة التحقق النهائية (Final Checklist)

- [x] All major resource categories investigated (network, nav, JS, CSS, JSON/search, memory, build, advanced).
- [x] Every recommendation includes effort/risk/validation.
- [x] No fabricated performance numbers (all measured or labeled `[غير متاح]`).
- [x] Limitations and missing evidence explicit.
- [x] `plan-03.md` is the only file changed by this task.
- [x] No implementation performed.
- [x] No commit/push.

---

## خاتمة / Statement of Limitation

**هذا تدقيق وخطة فقط (audit & planning).** لم تُنفَّذ أي تحسين. التوصيات P0–P4 هي اقتراحات تتطلب:
1. اكتمال القياسات (P0).
2. تفويض صريح للتنفيذ.
3. مراجعة كل تغيير على حدة (one variable at a time).

**Implementation requires separate authorization.** لا تقم بتنفيذ أي تحسين دون تفويض صريح. All performance claims are either measured (`[مخرج أمر]`/`[قياس فعلي]`) or labeled as `[استنتاج]`/`[فرضية]`/`[غير متاح]`. No savings percentages were invented.