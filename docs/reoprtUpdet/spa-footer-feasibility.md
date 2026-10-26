# تقرير جدوى SPA + توحيد Footer (SPA/Footer Feasibility Report)

## 1. ملخص تنفيذي (Executive Summary)

**النتيجة:** Footer **مُوحد بالفعل** في `site-layout.js`. **لا حاجة لـ SPA.** التوصية: البقاء على MPA.

- Footer مُعرّف في مصدر واحد (`renderFooter()` in `site-layout.js`).
- جميع 13 صفحة عامة تستخدم `mountSiteLayout()` via JS entry points.
- لا يوجد markup مكرر للـ footer في أي HTML page.
- SPA experiment **غير مبرر** — would require risky changes (fetch destination HTML, parse/extract main, re-run entry points, manage history, handle errors) without clear benefit for a low-traffic catalog site.
- **التوصية:** البقاء على MPA. لا تغيير في production architecture.

---

## 2. بنية Footer الحالية (Current Footer Architecture)

**المصدر (Source of Truth):** `src/public/components/site-layout.js` — function `renderFooter(active)`.

**البنية:**
```javascript
function renderFooter(active) {
  const list = el('ul', { className: 'site-footer__links' }, FOOTER_ITEMS.map((item) => el('li', {}, [navLink(item, active)])));
  return el('footer', { className: 'footer site-footer page-shell' }, [
    el('nav', { attrs: { 'aria-label': 'Footer' } }, [list]),
    el('p', { text: 'Information on this site reflects a dated research snapshot...' }),
  ]);
}
```

**FOOTER_ITEMS:** NAV_ITEMS (5) + Contact + Methodology = 7 links.

**الحقن (Injection):** `mountSiteLayout()` injects footer after `<main>` via `main.after(renderFooter(active))`.

**التحقق (Verification):**
- ✅ No footer markup in any HTML file (grep confirmed)
- ✅ Footer defined in one source (`site-layout.js`)
- ✅ All 13 pages call `mountSiteLayout()` via their JS entry points
- ✅ Links use `routes.*()` for correct URLs from nested routes
- ✅ `aria-label="Footer"` on nav element
- ✅ `aria-current="page"` on active link (via `navLink`)

---

## 3. بنية MPA الحالية (Existing MPA Architecture)

**Vite Configuration:**
- `appType: 'mpa'`
- `findHtmlInputs()` auto-discovers all `.html` files as entry points
- 13 public HTML entry points + 10 admin HTML entry points
- `notFoundPage()` plugin serves 404 for unknown routes

**Page Structure:**
- Each page: `<!doctype html>` + `<head>` (title, description, stylesheet) + `<body data-nav="...">` + `<main id="main-content">` + `<noscript>` + `<script type="module">`
- Shared layout (header, nav, footer, skip link, status) injected at runtime by `mountSiteLayout()`
- Page-specific JS handles data loading and rendering

**Navigation:**
- Native browser navigation (full page load)
- `data-nav` attribute on `<body>` determines active nav item
- `routes.*()` generates correct URLs for nested pages
- Search form uses `method="get"` + `action` (works without JS)

**Not-Found Handling:**
- Dev: `notFoundPage()` middleware serves `pages/not-found.html` with HTTP 404
- Preview: Same middleware
- Production: `netlify.toml` handles 404

---

## 4. الصفحات والملفات المُفحوصة (Pages & Files Inspected)

| # | File | Inspected |
|---|------|-----------|
| 1 | `index.html` | ✅ |
| 2 | `pages/about.html` | ✅ |
| 3 | `pages/categories/index.html` | ✅ |
| 4 | `pages/categories/detail.html` | ✅ |
| 5 | `pages/contact.html` | ✅ |
| 6 | `pages/methodology.html` | ✅ |
| 7 | `pages/not-found.html` | ✅ |
| 8 | `pages/offers/index.html` | ✅ |
| 9 | `pages/offers/detail.html` | ✅ |
| 10 | `pages/products/index.html` | ✅ |
| 11 | `pages/products/detail.html` | ✅ |
| 12 | `pages/suppliers/index.html` | ✅ |
| 13 | `pages/suppliers/detail.html` | ✅ |
| 14 | `src/public/components/site-layout.js` | ✅ |
| 15 | `src/public/pages/*.js` (12 files) | ✅ |
| 16 | `vite.config.js` | ✅ |
| 17 | `package.json` | ✅ |
| 18 | `tests/public-layout-regression.test.js` | ✅ |

---

## 5. تكرار Markup (Duplicate Markup Found)

**Footer:** None — centralized in `site-layout.js`.

**Header/Nav:** None — centralized in `site-layout.js`.

**Skip link:** None — injected by `mountSiteLayout()`.

**Status region:** None — moved by `mountSiteLayout()`.

**Minor inconsistency:**
- `index.html` noscript: "This site needs JavaScript to load the catalog data and navigation."
- Other pages noscript: "Navigation and catalog data on this site need JavaScript. Go to the homepage."
- This is a copy-paste inconsistency, low impact, not addressed (out of scope).

---

## 6. SPA Boundary Proposal (and why it was NOT implemented)

**Proposed boundary (if implemented):** Intercept internal navigation links and update `main#main-content` without full page reload.

**Why NOT implemented:**

| Risk | Description |
|------|-------------|
| **Page-specific initialization** | Each page has unique JS entry point (data loading, rendering, event binding). SPA would need to re-run these on every navigation. |
| **History management** | Would need `pushState`/`popstate` handling, URL parsing, query param preservation. |
| **Error handling** | Failed navigation, 404 pages, network errors — all need fallback to full page load. |
| **Focus management** | SPA must move focus to new content and announce to screen readers. |
| **Script re-execution** | Page-specific `<script type="module">` would need to be re-evaluated. Vite bundles these as separate chunks. |
| **State cleanup** | Previous page's event listeners, timers, and state must be cleaned up. |
| **SEO/Direct URLs** | Direct URL access must still work (MPA fallback). |
| **Complexity** | Adds router + lifecycle management to a lightweight MPA. |
| **Testing** | Requires browser-level testing (Playwright/Cypress) not currently available. |
| **Low-resource target** | SPA adds JS overhead and memory retention (longer-lived state). |

**Conclusion:** A meaningful SPA prototype would require substantial architectural changes (router, lifecycle management, state cleanup, focus management, error handling) that conflict with the project's low-resource, simplicity-first philosophy. The existing runtime JS layout (`mountSiteLayout`) already solves the main duplication problem without SPA complexity.

---

## 7. Performance Comparison (Qualitative)

| Dimension | MPA Baseline | SPA Experiment (hypothetical) |
|-----------|-------------|-------------------------------|
| Initial load | Loads HTML + CSS + JS entry point | Same (no change) |
| Internal navigation | Full document reload (~200-500ms) | Client-side transition (would avoid re-fetching shell) |
| JS execution | Per-page entry point (fresh) | Shared router + destination init (added overhead) |
| Memory use | Fresh document lifecycle (GC cleans up) | Longer-lived state (potential memory growth) |
| Browser history | Native (reliable) | Must implement (error-prone) |
| Error recovery | Browser handles 404/network errors | Requires custom fallback handling |
| Accessibility | Existing page behavior | Focus/announcement must be re-implemented |
| SEO/Direct URLs | Existing HTML documents | Must preserve (MPA fallback required) |
| Code complexity | Low (MPA) | High (router + lifecycle) |
| Testing | Existing tests (117 pass) | Requires browser automation (not available) |

**Note:** No performance measurements were taken. The assessment is qualitative based on architecture inspection. The project has no browser automation tools (no Playwright, no Cypress, no Puppeteer).

---

## 8. Accessibility and SEO Considerations

**Current (MPA):**
- Each page is a complete HTML document with unique title, description, lang, and metadata.
- Native browser navigation handles focus, history, and screen reader announcements.
- Direct URLs work (each page is a real HTML file).
- 404 handling via Vite middleware (dev) and Netlify (prod).

**If SPA were implemented:**
- Focus management would need to be added (move focus to new content).
- Screen reader announcements would need `aria-live` regions.
- URL updates would need `pushState` with correct titles.
- Direct URL access would need MPA fallback.
- 404 handling would need client-side route matching.
- All of this adds complexity and potential accessibility regressions.

---

## 9. Automated Test Results

| Command | Result |
|---------|--------|
| `npm test` | **117 pass / 0 fail** (17 suites) |
| `npm run lint` | **Pass** (0 errors, 0 warnings) |
| `npm run build` | **Pass** (79 modules, ~307ms) |

**Tests executed:** All 117 tests across 17 suites. No new tests added (audit-only task).

---

## 10. Browser-Level Verification

**Not performed.** No browser automation tools are available in this environment. The following remain unverified:
- Mobile nav toggle focus management
- Skip link visibility on focus
- Screen-reader announcement of navigation
- Responsive layout at 320px/360px/768px
- Long text overflow in table cells
- Focus restoration on modal close

---

## 11. Known Limitations and Rollback Procedure

**Limitations:**
- No browser-level testing performed
- No performance measurements taken
- Minor noscript copy inconsistency (index.html vs others)

**Rollback:** N/A — no changes were made. This was a read-only audit.

---

## 12. Final Recommendation

**Retain MPA.** Do not proceed with SPA conversion.

**Rationale:**
1. The footer is already centralized via `mountSiteLayout()` — no duplication to fix.
2. The existing MPA architecture is simple, predictable, and accessible.
3. SPA would require significant complexity (router, lifecycle, state cleanup, focus management, error handling) with no clear benefit for a low-traffic catalog site.
4. The project's low-resource target favors MPA (fresh document lifecycle, native browser navigation, no memory retention).
5. No browser automation tools are available to verify SPA behavior.
6. The existing shared layout already solves the main duplication problem.

**If the owner wants to explore SPA further:** It should be a separately approved task with a dedicated proof-of-concept, browser testing, and a clear rollback plan. This task does not authorize SPA migration.

---

## 13. Files Changed

**None.** This was a read-only audit. No application files, tests, or configuration were modified.

## 14. Git Status

```
No files changed in this task. All pre-existing changes (21 modified + 14 untracked) preserved.
```

**أؤكد:** لم يتم تعديل أي ملف. Read-only audit only. No dependencies added. No Git operations performed. All pre-existing changes preserved. No browser-level testing performed. No performance measurements taken. The report is factual and based on code inspection. The recommendation is to retain MPA. No SPA migration was authorized or performed.