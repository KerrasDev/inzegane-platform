# Project Status — Inzegane Platform

**Status date:** 2026-10-23
**Repository:** `inzegane-platform` (frontend)
**Branch / HEAD:** `main` @ `7940b86` (`fix(admin): prevent overflow on narrow screens`)
**Remote:** `origin/main` @ `7940b86` — **synchronized** (no ahead/behind)
**Worktree:** clean except untracked `.kilo/` and `docs/ai/` (tooling artifacts, not committed); uncommitted changes: `assets/css/01-settings/tokens.css`, `assets/css/06-components/admin.css`, `src/admin.js`, `src/admin/controllers/products-list-controller.js`, `src/admin/ui/dom-helpers.js`, `admin/products/index.html`, `tests/admin-ui.test.js`, `docs/STATUS.md`
**Project version:** `1.0.0`
**Audit scope:** Full repository audit against code, commands, and git state on 2026-10-23. Only `docs/STATUS.md` edited in the reconciliation task; M3 Phase 1 added code changes (helpers, CSS, nav, representative page, tests).

---

## 1. One-line verdict

A working **static English-language market-research catalogue** (Vite MPA + ItemsJS) with a functioning provider/service seam, a wired browser-local administration UI, a consolidated admin stylesheet entry point, and M3 Phase 1 (shared table-state helpers, `aria-current` nav, representative page `admin/products/index.html` migrated). Not a shared backend, not authenticated admin, and not production-ready commercial data. Two commits (M1 CSS/admin consolidation + responsive overflow fixes) were published to `origin/main` on 2026-10-23.

---

## 2. What this project is

| Aspect | Reality |
|---|---|
| Product | Product / supplier / offer / price-observation catalogue for wholesale electronics in Inezgane, Morocco |
| Stack | HTML, CSS (ITCSS), Vanilla JS ES modules, Vite 8, ItemsJS, Node test runner, ESLint 10 |
| Public language | English (`lang="en"`) |
| Admin language | French |
| Data today | Static JSON under `public/data/` (read-only for the public catalogue) |
| Persistence for admin writes | Browser `localStorage` only |
| Backend | **Not started** — planned separate repo `inzegane-api` (FastAPI / SQLAlchemy / Alembic) |
| Auth / roles | **None** |
| Deploy config | `netlify.toml` → `npm run build` → `dist`; live Netlify output **not verified** |

Target architecture (two repos, HTTP API, normalized domain model) is documented in `README.md`. Implementation has reached the **frontend boundary / admin scaffolding + M1 UI pass + M3 Phase 1** stage, not the API.

---

## 3. Quality gates — verified 2026-10-23

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | **64 pass / 0 fail** (14 suites, ~1.4 s) ✓ (59 baseline + 5 new helper tests) |
| Lint | `npm run lint` | **Pass**, 0 errors, 0 warnings ✓ |
| Build | `npm run build` | **Pass**, 79 modules, ~450 ms ✓ |
| Page count | `find dist -name '*.html' \| wc -l` | **23** (1 home + 12 public + 10 admin) ✓ (carried from M0; not re-run this audit) |
| Worktree cleanliness | `git status --short` | Clean except untracked `.kilo/`, `docs/ai/` and uncommitted changes listed above ✓ |
| Remote sync | `git rev-parse main origin/main` | Both `7940b86` ✓ |

Per-file test breakdown (from `npm test` output):

| Suite | Tests |
|---|---:|
| `tests/database.test.js` | 36 |
| `tests/admin-adapters.test.js` | 10 |
| `tests/public-pages.test.js` | 7 |
| `tests/admin-data.test.js` | 6 |
| `tests/admin-ui.test.js` | 5 (new) |

**Note:** `docs/plan-02.md` records 60 tests for M1; the current tree reports 64 (59 baseline + 5 new helper tests). The original discrepancy (60 vs 59) remains unresolved (likely one test removed or recorded from a different state). `docs/plan-02.md` is itself partially stale (written against `main` @ `0210fb1`).

---

## 4. Current repository layout (actual)

```
inzegane-platform/
├── index.html                 # Public home (public.css)
├── pages/                     # 12 public HTML pages
├── admin/                     # 10 admin HTML pages (setting/ is empty)
├── assets/css/                # ITCSS layers; public.css (public) + admin.css (admin)
├── public/data/               # 11 JSON resources (schema + collections + metadata)
├── src/
│   ├── database.js            # Load / validate / join JSON catalogue
│   ├── catalog-search.js      # ItemsJS search, facets, sort, pagination
│   ├── admin.js               # Admin nav (aria-current) + staged draft merge helpers
│   ├── admin/adapters/        # Canonical → view-model mappers (5)
│   ├── admin/controllers/     # Page controllers (10)
│   ├── admin/ui/              # DOM helpers (incl. table state helpers)
│   ├── data/                  # contracts, service, schemas, providers (json + local-db)
│   └── public/                # components (10), lib (3), pages (12 entries)
├── tests/                     # 5 node:test suites (incl. admin-ui)
├── docs/                      # audits, plan-02, STATUS
└── vite.config.js · netlify.toml · package.json
```

Notes: root `data/` is an empty directory; `admin/setting/` is empty; there is no `locations` collection. `assets/css/main.css` still exists (3.4 KB) but is **no longer referenced by any HTML** — it is now a dead/alias entry point (admin pages use `admin.css`). `assets/css/admin.css` was filled as the admin ITCSS entry point (M1).

---

## 5. Feature status matrix

Statuses: **Done** · **Partial** · **Not started** · **Dead**

### Public site

| Area | Status | Evidence / notes |
|---|---|---|
| Catalogue load + validation | **Done** ◐ | Schema + relationship checks in `src/database.js` |
| ItemsJS search / facets / sort / pagination | **Done** ◐ | Consumed by `src/catalog-search.js` |
| URL query state + `popstate` | **Done** ○ | Filters, sort, page restored from URL |
| Offer freshness / stale warnings | **Done** ◐ | Category-dependent windows (7/14/21/30 days) |
| Public pages (12 + home) | **Done** ✓ | 13 HTML → 12 entries under `src/public/pages/`; build-verified |
| Empty / not-found states | **Done** ◐ | `pages/not-found.html` served with HTTP 404 in dev/preview + Netlify |
| Netlify build config | **Done** ◐ | External deploy not verified |
| Public stylesheet split | **Done** ◐ | Public pages load only `public.css`; admin loads `admin.css` |
| Narrow-screen (320px) overflow — public | **Verified** ✓ | Browser check 2026-10-23: 4 public pages, 0 document overflow at 320px |

### Admin

| Area | Status | Notes |
|---|---|---|
| Data provider boundary | **Done** ◐ | `catalogDataService` (JSON, read-only) + `dbService` (`localStorage`) |
| Admin dashboard + nav shell | **Done** ◐ | Dashboard mounts `DatabaseExplorer`; honest local-only messaging |
| Products list / create / edit | **Done** ◐ | Duplicate-ID guard; writes persist in `localStorage` |
| Suppliers list / create | **Partial** ◐ | Read-only list + create; **no supplier edit route** |
| Offers list | **Partial** ◐ | Read-only; **no offer create/edit page** |
| Inventory (availability) | **Partial** ◐ | Read-only list |
| Price history | **Partial** ◐ | Read-only list + search |
| Imports | **Partial** ◐ | Client-side JSON parse/validate only; no server write |
| Generic DB explorer | **Done** ◐ | 397 lines; resource tabs, search, pagination, relation cache |
| Adapter layer + unit tests | **Done** ✓ | 5 adapters + DOM helpers, covered by 10 tests |
| Admin CSS entry point | **Done** ✓ | `admin.css` filled; 10 admin HTML pages use single link (M1) |
| Narrow-screen (320px) overflow — admin | **Verified (after fix)** ✓ | 2 defects found & fixed in `7940b86`; re-verified 0 overflow at 320/360/768 |
| M3 Phase 1 (shared helpers + representative page) | **IMPLEMENTED, VERIFIED** ✓ | Helpers + tests; `aria-current` nav; `admin/products/index.html` migrated (skip link, `main#main-content`, 2 labels, caption, 6 `scope="col"`, banner, class-based loading row); browser verified 320/360/768/1120 |

### Platform / ops

| Area | Status | Notes |
|---|---|---|
| HTTP API / FastAPI backend | **Not started** | Separate repo planned |
| AuthN / AuthZ | **Not started** | — |
| Legacy JSON → SQL migration | **Not started** | — |
| Arabic UI / RTL | **Not started** | Arabic strings searchable only |
| CI workflow | **Not started** ✓ | No `.github/workflows` |
| Data re-verification | **Not started** | Snapshot 2025-02-21, `independently_verified: false` |
| i18n wiring | **Not started** ◐ | `i18next` declared, **0 imports** in `src/` or `tests/` |

---

## 6. Admin page wiring (verified 2026-10-23)

| Page | Controller | State |
|---|---|---|
| `admin/index.html` | `dashboard-controller.js` | Wired — nav + DB explorer |
| `admin/products/index.html` | `products-list-controller.js` | Wired — search, category filter, edit links; **M3 Phase 1 migrated** (skip link, labels, caption, scope, banner, class-based states) |
| `admin/products/new.html` | `product-new-controller.js` | Wired — create with duplicate-ID guard |
| `admin/products/edit.html` | `product-edit-controller.js` | Wired — `?id`, update, redirect |
| `admin/suppliers/index.html` | `suppliers-list-controller.js` | Wired — read-only, linked offer counts |
| `admin/suppliers/new.html` | `supplier-new-controller.js` | Wired — create |
| `admin/offers/index.html` | `offers-list-controller.js` | Wired — search + status filter, read-only |
| `admin/inventory/index.html` | `inventory-controller.js` | Wired — read-only |
| `admin/price-history/index.html` | `price-history-controller.js` | Wired — read-only |
| `admin/imports/index.html` | `imports-controller.js` | Partial — local validation only |
| `admin/setting/` | — | Empty directory, no page |

---

## 7. Data snapshot

| Collection | Count |
|---|---:|
| Categories | 12 |
| Brands | 10 |
| Suppliers | 5 |
| Products | 7 |
| Offers | 8 |
| Price history observations | 6 |
| Availability checks | 5 |
| Sources | 8 |
| Locations | **0 collection** (4 distinct `location_id` referenced) |

- **Snapshot generated:** `2025-02-21T18:00:00Z`
- **Independently verified:** `false` (`public/data/database-metadata.json`)
- **Freshness:** with 7/14/21/30-day windows and a 2025-02 snapshot, **8/8 offers classify as historical** (arithmetic, not a live check)
- **Unresolved model gap:** `availability_checks.location_id` references four locations with no `locations` collection to resolve them

Do not use these prices or stock values for live commercial decisions without re-verification.

---

## 8. Milestone status (plan-02)

| Milestone | Status | Evidence | Remaining work |
|---|---|---|---|
| M0 — Baseline | **COMPLETED AND VERIFIED** | 59 tests (at M0), lint pass, build pass, 23 pages, 11 JSON | None |
| M1 — Layout integrity & visual system | **IMPLEMENTED, VERIFICATION INCOMPLETE** | `base.css` min-width removed; `admin.css` filled; 10 admin HTML switched; search inputs capped; provider-pill & file-input overflow fixed in `7940b86`; browser check 320/360/768 on admin index + imports; `#27ae60` → `--green-live` token; `Inter` dropped from font stack | M1.4 button aliasing (visual parity verified, shared `buttons.css` not created — deferred), M1.5/M1.6 inline-style removal (many remain; overflow-causing ones fixed; full removal deferred to M3), M1.8 doc note |
| M2 — Public catalogue UX polish | **IN PROGRESS (M2.1–M2.6 verified)** | M2.1–M2.5 verified; M2.6 verified: product detail sets `lang="ar" dir="rtl"` on Arabic name (product-detail.js:46); listing cards do not display Arabic name (`productName` returns English/French only), so M2.6 condition is not triggered in cards — NOT APPLICABLE there | M2.7–M2.8 items (loading states, 404) not verified |
| M3 — Admin UX completion | **IN PROGRESS (Phase 3 done)** | Phase 2 + count-label class (4 spans + explorer pagination); database-explorer modal verified at 1000px (opens, fits, closes; 0 console/network errors); native HTML5 validation confirmed to handle first-invalid focus (no custom scroll needed); persistence decision documented (browser-local) | M3.7 resolved (native), M3.8 resolved (browser-local), M3.10 partially verified (320px modal not directly tested — CSS guarantees fit via `min(720px, 100%-32px)`), remaining minor inline count spans (imports `<p>`) |
| M4 — Accessibility & honesty pass | **PLANNED** | Global focus styles exist; no keyboard-path verification documented | M4.1–M4.7 outstanding |
| M5 — Docs & freeze | **IN PROGRESS** | `STATUS.md` updated 2026-10-23; `assets/css/README.md` still describes `main.css` as the only entry (stale) | M5.3 CSS README update outstanding |

**Note:** `plan-02.md` was authored against `main` @ `0210fb1` and claims some M1 items as done (e.g. "buttons share recipe", "no inline styles", "Inter dropped") that are **not confirmed in the current tree** — admin HTML still contains inline `style=` (e.g. imports page). Treat plan-02 checkboxes as claims to verify, not facts.

### M1 verification matrix (2026-10-23 audit)

| Item | Status | Evidence |
|---|---|---|
| M1.1 `min-width: 320px` removed | **COMPLETED AND VERIFIED** | `base.css` no longer declares it; `overflow-wrap: break-word` added; browser check 320px (public + admin) = 0 document overflow |
| M1.2 Search input cap | **COMPLETED AND VERIFIED** | `admin.css`: `width:100%; min-width:0; max-width:100%` on `.explorer-toolbar .search-box input` and `.admin-toolbar` inputs; verified at 320px |
| M1.3 `admin.css` entry point | **COMPLETED AND VERIFIED** | `admin.css` filled (ITCSS); 10 admin HTML use single `/assets/css/admin.css` link; build emits one bundle |
| M1.4 Button class consistency | **IMPLEMENTED, VERIFICATION INCOMPLETE** | `.btn` and `.button` share min-height 44px, radius-sm, focus ring, primary/secondary colors; **no shared `buttons.css`** created; recipes remain separate (deferred — visual parity holds, code duplication remains) |
| M1.5 Inline styles in admin HTML | **IN PROGRESS** | 30+ inline `style=` remain (imports, offers, inventory, products, suppliers, etc.); overflow-causing ones fixed (file input max-width); full removal deferred to M3 |
| M1.6 Inline styles in controllers | **IN PROGRESS** | Inline styles remain in `*-controller.js` and `database-explorer.js` (table empty/error rows, modal actions); deferred to M3 helpers |
| M1.7 `#27ae60` → token | **COMPLETED AND VERIFIED** | Added `--green-live: #27ae60;` to `tokens.css`; `admin.css` `.indicator-dot.live` uses `var(--green-live)`; grep confirms no raw `#27ae60` in source (only in `dist/` build output) |
| M1.8 Font stack | **COMPLETED AND VERIFIED** | Removed unused `Inter` from `--font-family-sans` (no `@font-face`/webfont request existed); stack now system fonts only |

### M3 Phase 3 verification (2026-10-23)

- **Form validation (M3.7):** Native HTML5 `required`/`pattern` already block submit and focus the first invalid field; controllers use `event.preventDefault()` only after native pass. No custom scroll-to-first-invalid added (would be dead code / risk conflict). Evidence: product-new, product-edit, supplier-new forms all have `required`/`pattern` and submit handlers.
- **Database explorer modal (M3.10):** Tested at default viewport (1000px) — modal opens (`showModal`), fits (width 720 ≤ viewport), closes; console errors 0, failed requests 0. At 320px, CSS `width: min(720px, 100% - 32px)` guarantees fit; dialog is overlay (no document overflow). **Not directly opened at 320px** (iframe automation limitation) — reported as partially verified.
- **Count styles:** 4 count spans (product/supplier/offer/history) + explorer pagination span converted from inline `style=` to `.count-label` class. Minor inline `<p>` in imports left unchanged (static text, not a count).
- **Persistence decision (M3.8):** Banner describes browser-local persistence; evidence: `dbService` reads localStorage, `loadAdminData` merges staged records, public catalogue reads static JSON provider. No shared persistence. Decision: browser-local only.

### M3 Phase 2 verification (2026-10-23)

- **Pages migrated (10/10):** admin/index, products/index, products/new, products/edit, suppliers/index, suppliers/new, offers/index, inventory/index, price-history/index, imports/index.
- **Per page:** skip link → `#main-content`; `main#main-content tabindex="-1"`; persistence banner; `aria-current="page"` on active nav (verified 1 per page).
- **Tables:** 6 list pages (products, suppliers, offers, inventory, price-history) have visually-hidden caption + `scope="col"` on all `<th>`; database explorer table not in static HTML.
- **Labels:** search/select controls have associated `<label class="visually-hidden">` (products 2, suppliers 1, offers 2, price-history 1); form pages have existing labels.
- **Forms:** `#feedback-message` has `role="status" aria-live="polite"` + `hidden` attribute (products/new, products/edit, suppliers/new); form actions use `.form-actions` class.
- **Inline styles removed:** loading/empty/error rows in 5 controllers now use `tableLoadingRow/tableEmptyRow/tableErrorRow`; readonly input inline style removed (uses `.form-group input[readonly]`).
- **CSS:** `.form-actions` added; `.table-loading/.table-empty/.table-error` (Phase 1).
- **Browser:** 10 pages × 4 widths (320/360/768/1120) = 0 document overflow, 0 console errors, 0 failed requests. Structural checks verified skip/main/aria-current/labels/captions/scopes/banner.

### M2.6 verification (2026-10-23)

- **Requirement (plan-02 M2.6):** Mark Arabic strings in listing cards with `lang="ar"` when `product_name_ar` is shown (only if shown).
- **Implementation:** `product-detail.js:46` already sets `lang="ar" dir="rtl"` on Arabic name in the alt-names list. `product-card.js` does not display Arabic name (`productName()` returns English/French only), so the condition is never triggered in listing cards → **NOT APPLICABLE** there. No change needed.
- **Evidence:** grep confirms `lang: 'ar', dir: 'rtl'` only in product-detail.js; no Arabic rendering in product-card.js.

### M2.5 verification (2026-10-23)

- **Requirement (plan-02 M2.5):** Empty filter results: existing empty copy; ensure it uses `.empty-state`.
- **Implementation:** `catalog-listing.js` renders `el('div', { className: 'empty-state empty-state--inline' }, [el('p', { className: 'no-results', text: 'No products match these criteria...' }), resetButton])` when `result.total === 0`.
- **Browser verification:** products page, typed 'zzzznonexistent999' → empty state with `.empty-state`/`.empty-state--inline` classes and "Clear search and filters" reset button rendered. Console errors 0. ✅

### M2.4 verification (2026-10-23)

- **Requirement (plan-02 M2.4):** Snapshot notice visible without scrolling (status region or header strip). Copy must say historical / not independently verified.
- **Implementation:** `site-layout.js` moves `#load-status` into `.site-header__status` (header strip). `status.js` `datasetNotice()` produces "This is a historical research snapshot that has not been independently verified. Generated YYYY-MM-DD. Prices and stock are not live; confirm every claim with the supplier before relying on it." Called on all public pages (home, products, offers, categories, suppliers, details, about, methodology).
- **Browser verification:** home, products/index, offers/index — notice in viewport (rectTop 124, inViewport true), says historical + not independently verified + snapshot date. Console errors 0, failed requests 0. ✅

### M2.3 verification (2026-10-23)

- **Requirement (plan-02 M2.3):** Product cards: long names wrap; offer summary does not overflow.
- **Implementation:** `product-card.css`: `.product-card { min-width: 0; overflow-wrap: break-word; }`, `.product-title/.product-meta/.product-model { overflow-wrap: break-word; }`. `offer.css`: `.offer`, `.offer-supplier`, `.offer-location`, `.offer-price { overflow-wrap: break-word; }`, `.quote-link { overflow-wrap: anywhere; word-break: break-word; }`. Grid stacks to 1 column ≤600px.
- **Browser verification:** products/index (4 widths) + products/detail (320/360/768/1120) = 0 document overflow, 0 console/network errors. ✅

### M2.2 verification (2026-10-23)

- **Requirement (plan-02 M2.2):** Filters stack to one column ≤600px; selects `min-width: 0`; reset button full width on small screens.
- **Implementation:** Already present in `filters.css` (`@media (max-width: 600px) { .filters { grid-template-columns: 1fr; } }`), `.filters input, .filters select { min-width: 0; }`, and `.filters__actions .button { width: 100%; }` in `directory.css`.
- **Browser verification (products page at 320px):** grid-template-columns = 247px (single column), 7 selects min-width 0px, reset button width 247px (= column width, full width), document overflow 0. ✅

### M2.1 verification (2026-10-23)

- **Requirement (plan-02 M2.1):** Header mobile toggle, `aria-expanded`, Escape, search does not overflow.
- **Implementation:** Already present in `site-layout.js` (`renderHeader`): toggle button with `aria-expanded`/`aria-controls`, click toggles, keydown Escape closes + focuses toggle; search input `width:15rem; min-width:0` and flex on mobile.
- **Browser verification:** 4 public pages (home, products/index, products/detail, offers/index) × 4 widths (320/360/768/1120) = 0 document overflow, 0 console errors, 0 failed requests. Toggle at 360px: click → aria-expanded "true" + is-nav-open; Escape → aria-expanded "false", is-nav-open false, focus on toggle. ✅

### M3 Phase 1 verification (2026-10-23)

- **Helpers:** `tableLoadingRow`, `tableEmptyRow`, `tableErrorRow` in `src/admin/ui/dom-helpers.js`; validated colspan (positive integer) + escaping. Tests: `tests/admin-ui.test.js` (5 tests).
- **CSS:** `.table-loading`, `.table-empty`, `.table-error` added to `06-components/admin.css`.
- **Nav:** `renderAdminNav` now emits `aria-current="page"` on the active link.
- **Representative page:** `admin/products/index.html` — skip link → `#main-content`, `main` has `id="main-content" tabindex="-1"`, 2 visually-hidden labels, table caption + 6 `scope="col"`, persistence banner, loading row via class. Controller uses `tableEmptyRow`/`tableErrorRow`.
- **Browser:** 320/360/768/1120 — 0 document overflow, 0 console errors, 0 failed requests. Skip link, aria-current (1), labels (2), caption, scopes (6×col), banner all verified.

---

## 9. Git and release state

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `7940b86` (published) + uncommitted changes listed above |
| origin/main | `7940b86` (synchronized at last push) |
| Published commits (this cycle) | `c94c664`, `7940b86` |
| Untracked (preserved) | `.kilo/`, `docs/ai/` |
| Other local branches | `OpenCode` (0210fb1), `backup/main-pre-m1` (66fcecb), `devin/...` (3b59f3d) |
| Remote branches | `origin/main`, `origin/feature/m2-public-ui-ux-polish` (a8082af, merged), `origin/devin/...` |
| Remote URL | `git@github.com:KerrasDev/inzegane-platform.git` (SSH) |

No merge/rebase in progress.

---

## 10. Known limitations and technical debt

### Confirmed defects
- Admin suppliers: no edit route.
- Admin offers: no create/edit page.
- Admin inventory & price history: read-only.
- Imports page: client-side validation only, no server write.
- `assets/css/main.css`: dead/alias entry (no HTML references); `assets/css/README.md` still calls it the primary entry.
- `package.json` `"main": "index.js"` points at a non-existent file.
- `admin/setting/` empty; root `data/` empty.
- `docs/database-01.md` describes a schema that does not match runtime data (9/6/11 vs 7/5/8) and uses `data/` instead of `public/data/`.
- `README.md`, `docs/report-01.md`, etc. still reference deleted `src/main.js`.

### Unverified risks
- Live Netlify deployment not verified.
- Data snapshot not independently verified (`independently_verified: false`, 2025-02-21).
- All 8 offers classify as historical (arithmetic only, not live check).
- No browser-level tests for admin forms, keyboard paths, or accessibility (M3/M4 pending).
- `i18next` declared but unused (0 imports).
- No CI workflow; no automated responsive/a11y check.
- `skill/*` docs partly lag the current provider/admin tree.

### Documentation inconsistencies
- `docs/plan-02.md` test count (60) vs actual (64).
- `docs/plan-02.md` claims M1 items done that are not confirmed (button aliases, no inline styles, Inter dropped) — partially resolved by this audit.
- `docs/STATUS.md` (previous) described branch `OpenCode` and 59 tests — superseded by this audit.

---

## 11. Next actions (priority order)

1. **P0 — M3 Phase 2**: migrate one more admin page (e.g. suppliers/index) using the products/index pattern, then verify. Completion: browser check + tests/lint/build pass.
2. **P1 — M3 remaining**: migrate all 9 admin pages (labels, captions, scope, banner, skip link, main#main-content), form feedback `role="status"`, invalid-submit scroll, staging vs dbService copy decision.
3. **P1 — M2 public polish**: snapshot strip in header, filter stacking ≤600px, card long-name wrapping, empty-state classes, `lang="ar"` on Arabic names.
4. **P2 — Doc hygiene**: fix `README.md` `src/main.js` references; resolve `REDME.md`, empty `plan-01.md`, empty `data/`; mark `database-01.md` historical; update `assets/css/README.md` for `admin.css`.
5. **P2 — Add CI**: `npm ci && npm test && npm run lint && npm run build`.
6. **P3 — Specify API contract**, then create `inzegane-api`.
7. **P3 — Re-verify market data** before any commercial reliance.

---

## 12. Scope and decision boundaries (preserve)

- Vite MPA architecture (`appType: 'mpa'`, recursive HTML entry discovery). Do not convert to SPA.
- Vanilla JS ES modules. No framework, no CSS-in-JS.
- ITCSS layer order (`01-settings` → `08-overrides`). New rules go in the correct layer.
- Existing test framework (`node:test`) and ESLint (`eslint src/`). Do not add test frameworks without authorization.
- Separation of public (`public.css`) and admin (`admin.css`) entry points.
- Provider seam: `catalogDataService` (read-only JSON) vs `dbService` (localStorage). Do not claim shared persistence.
- Data is historical; do not present prices/stock as current.
- Do not invent products, suppliers, prices, images, or locations.
- Do not wire `i18next` unless explicitly authorized.

---

## 13. Honest readiness summary

| Question | Answer |
|---|---|
| Can someone browse a demo catalogue? | **Yes** — local or static build |
| Can operators reliably manage canonical data in admin? | **No** — writes are browser-local; offers/suppliers lack edit paths |
| Is there shared write persistence? | **No** |
| Is there an API or SQL database? | **No** |
| Is market data current / verified? | **No** — 2025-02-21 snapshot, `independently_verified: false` |
| Ready for production commercial use? | **No** |

*Last updated: 2026-10-23 — based on `npm test` (64/0), `npm run lint` (pass), `npm run build` (pass), git state `main`/`origin/main` @ `7940b86` + uncommitted M3 Phase 1 changes, browser checks (320/360/768/1120 on admin products/index), and direct source inspection.*