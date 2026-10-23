# Plan-02 — Finish Frontend UI/UX

**Status:** Implementation-ready plan. Not executed.  
**Author role:** Staff engineer / architect (planning only).  
**Plan date:** 2026-10-22 (system clock `2026-10-22T11:40:52+00:00`).  
**Repository:** `inzegane-platform` (`/workspace`)  
**Branch / HEAD:** `main` @ `0210fb1` (`Ignore local OpenCode configuration`)  
**Worktree:** Clean. No Git submodules.

**Authorized documentation change:** This file only. Application code, CSS, HTML, tests, and other docs are not modified by this planning pass.

---

## 0. One-line objective

Make the existing Vite multi-page catalogue and administration UI visually consistent, honest about data limits, usable on a 320px viewport, and keyboard-accessible — without a backend, without i18n infrastructure, and without inventing market data.

---

## 1. Scope decision (locked for this plan)

| In scope | Out of scope |
|---|---|
| Public catalogue pages (`index.html`, `pages/**`) | `inzegane-api`, FastAPI, SQL, HTTP provider |
| Admin pages (`admin/**`) presentation, chrome, forms, tables | Authentication, roles, shared persistence |
| ITCSS tokens, components, overflow, empty/loading/error states | Re-verifying or expanding market records |
| Accessibility (landmarks, labels, focus, contrast, reduced motion) | Arabic/RTL full UI, `i18next` wiring |
| Honest copy about snapshot age and local-only admin writes | CI, Netlify production verification, favicon/CDN fonts as blockers |
| Tests/lint/build remaining green after UI work | Replacing ItemsJS, Vite, or the provider seam |

**Simplest reliable solution:** Keep the current MPA + vanilla JS + ITCSS stack. Finish the UI on top of modules that already exist (`src/public/*`, `src/admin/*`, `assets/css/*`). Do not introduce a component framework, CSS-in-JS, a design-system package, or a second CSS methodology.

---

## 2. Protocol Zero — Evidence

### 2.1 Verified (code, config, command output)

- Node `v22.22.0`, npm `10.9.4`. `node_modules/` is absent in this checkout.
- `package.json` scripts: `dev` (Vite), `build`, `test` (`node --test`), `lint` (`eslint src/`).
- Runtime deps: `itemsjs@^2.4.4` (used by `src/catalog-search.js`), `i18next@^26.4.7` (**no application import**).
- Dev deps as of lockfile: Vite `^8.3.4`, ESLint `^10.13.0`. Registry check on 2026-10-22: Vite `8.3.5`, itemsjs `2.4.4`, ESLint `10.13.0`, i18next `26.5.5`.
- Public site: English (`lang="en"`), shared chrome via `mountSiteLayout()`, CSS entry `assets/css/public.css`.
- Admin site: French (`lang="fr"`), chrome via `renderAdminNav()`, CSS entries `assets/css/main.css` + `assets/css/06-components/admin.css`.
- 11 HTML admin/public entry points are already wired to external ES modules. No remaining inline page logic.
- Canonical JSON lives in `public/data/` (7 products, 5 suppliers, 8 offers, 6 price observations, 5 availability checks). Snapshot `2025-02-21T18:00:00Z`, `independently_verified: false`.
- Admin writes go to browser `localStorage` (`inzegane_db_*` and separate staged product/supplier keys). Public catalogue reads the static JSON provider.
- `body { min-width: 320px }` is still in `assets/css/04-elements/base.css:51`. Prior audits reported ~20px horizontal overflow on a 320px viewport.
- `assets/css/admin.css` is an empty file. `main.css` already `@import`s `06-components/admin.css`.
- Token stack names Inter; no `@font-face` and no Google Fonts link exist.
- Public rendering uses `createElement` / `textContent`. Admin list/form controllers still assign `innerHTML` (values passed through `escapeHtml`).
- `npm test` in this environment: 23 pass / 1 fail. The failure is `ERR_MODULE_NOT_FOUND: itemsjs` because dependencies are not installed — not a UI defect.
- `docs/plan-01.md` is empty. `docs/STATUS.md` (2026-10-20) still describes WIP adapter breakage that this tree no longer has (duplicate `adaptSupplier` export is gone; all 10 admin pages load controllers).

### 2.2 Assumed (reversible defaults)

- **A1 — Language split stays.** Public English, admin French. Do not unify, do not add `i18next`. Consequence: bilingual product, lower cost, no RTL public layout in this plan.
- **A2 — Demo, not commerce.** UI must keep treating offers as historical. No “Buy”, no live stock badge that implies currency.
- **A3 — Admin is a local prototype.** Every write path already has (or will have) a persistent warning. No fake “saved to server” success.
- **A4 — 320px is the narrow target; 600px is the existing CSS breakpoint.** Do not add a breakpoint zoo.
- **A5 — Inter may remain a font *stack* fallback.** Shipping a webfont is optional polish, not a milestone gate.

### 2.3 Unknown (non-blocking)

- Whether a live Netlify site is attached to this repo.
- Whether overflow at 320px still reproduces (last measured in `report-01`, 2026-10-16). Must be re-checked during M1.
- Operator preference for English vs French admin (current code is French).
- Whether product `media.image_url` values resolve (public already has a text fallback).

### 2.4 Decision required (defaults chosen so work can start)

| ID | Choice | Default for this plan | Reversible? |
|---|---|---|---|
| D1 | Public language | Keep English | Yes — copy-only |
| D2 | Admin language | Keep French | Yes — copy-only |
| D3 | Admin CSS entry | Replace empty `assets/css/admin.css` with an ITCSS admin bundle (mirror `public.css`) and point admin HTML at that single file | Yes |
| D4 | Button system | Map admin `.btn` onto public `.button` tokens (shared base in `page.css` or a new `06-components/buttons.css`); keep existing class names as aliases | Yes |
| D5 | Font | Do not load a remote font. Keep system stack; optionally drop the unused `Inter` name | Yes |
| D6 | i18next | Leave unused; do not wire. Removal is a later chore, not this plan | Yes |
| D7 | Admin `innerHTML` | Keep escaped-string tables for this pass; do not rewrite to `createElement` unless a page is already being touched for a bug | Yes |

If D1–D3 are rejected before implementation, stop and revise this file. They change file ownership and copy, not the data layer.

---

## 3. Current UI architecture (do not replace)

```text
Public MPA                          Admin MPA
---------                           ---------
index.html, pages/**                admin/**/*.html
  lang=en                             lang=fr
  /assets/css/public.css              /assets/css/main.css
  src/public/pages/*.js                 + 06-components/admin.css
    mountSiteLayout()                 src/admin/controllers/*.js
    loadPublicCatalog()                 renderAdminNav()
    catalog-listing / cards             adapters + dbService
                                        localStorage only
```

Shared foundations that UI work must reuse:

- Tokens: `assets/css/01-settings/tokens.css`
- Public helpers: `src/public/components/dom.js`, `status.js`, `format.js`
- Admin helpers: `src/admin/ui/dom-helpers.js`
- Provider seam: `catalogDataService` (read-only JSON) vs `dbService` (local)

Do not move public pages into a SPA router. Do not merge admin into the public layout component.

---

## 4. UX problem inventory (implementation backlog)

Priority: **P0** blocks “finished UI”; **P1** visible quality; **P2** hygiene.

### 4.1 Cross-cutting

| ID | Problem | Evidence | Pri |
|---|---|---|---|
| U1 | `body { min-width: 320px }` can force horizontal scroll | `base.css:51`; `report-01` | P0 |
| U2 | Token names Inter but font is never loaded | `tokens.css:21-23` | P2 |
| U3 | Empty `assets/css/admin.css`; admin HTML double-loads the component file that `main.css` already imports | `admin.css` 0 bytes; every `admin/**/*.html` | P1 |
| U4 | Public `.button` vs admin `.btn` — two button grammars | `page.css`, `admin.css`, product form | P1 |
| U5 | Hardcoded hex in admin (`#27ae60`) bypasses tokens | `admin.css:164-165` | P2 |
| U6 | Inline `style=` in admin HTML and controller error rows | `admin/products/index.html:41`, several controllers | P1 |
| U7 | Unused `i18next` | `package.json`; zero `src` imports | P2 |

### 4.2 Public catalogue

| ID | Problem | Evidence | Pri |
|---|---|---|---|
| P1 | Filter/search chrome may overflow on narrow viewports | `filters.css`, header search | P0 |
| P2 | Site header wrap + search form on small screens | `site-header.css` + toggle exists; re-verify | P0 |
| P3 | No skip-link target issues if `#main-content` missing — currently present | keep | — |
| P4 | English UI vs Arabic product names: detail already sets `lang`/`dir` on alt names; listings do not | `product-detail.js:45-46` | P1 |
| P5 | Stale-data messaging exists (`datasetNotice`) — keep visible on every listing | `status.js` / home | P0 keep |
| P6 | Empty image fallback is text-only — keep; do not invent images | `product-image.js` | — |
| P7 | Public pages lack a compact “snapshot date” in the header (only footer/status) | `site-layout.js` footer copy | P1 |
| P8 | Detail unknown-id state is in-page 200; 404 page exists for unknown paths | keep both | — |

### 4.3 Administration

| ID | Problem | Evidence | Pri |
|---|---|---|---|
| A1 | No skip link, no footer, no `main` focus target on admin pages | admin HTML | P0 |
| A2 | Search inputs lack `<label>` (placeholder only) | products/offers/suppliers/history toolbars | P0 |
| A3 | Persistence warning missing on list pages (present on dashboard, new product, imports) | `admin/products/index.html` vs `admin/index.html` | P0 |
| A4 | Duplicate write paths: `dbService` vs `stageRecord` (`inzegane_staged_*`) | `src/admin.js` | P1 |
| A5 | Tables have no `<caption>`, some lack `scope="col"` | admin tables | P1 |
| A6 | Controller error/empty cells use inline styles | `*-controller.js` | P1 |
| A7 | Admin nav built with `innerHTML` of static labels (safe) but no `aria-current` | `admin.js:88-93` | P1 |
| A8 | Forms: HTML5 `required` only; no summarized error region | `products/new.html` | P1 |
| A9 | Imports page is a local JSON syntax check — copy is already honest; keep it that way | `imports-controller.js` | P0 keep |
| A10 | Explorer search `min-width: 300px` fights 320px viewports | `admin.css:185` | P0 |
| A11 | No admin 404 chrome (unknown `/admin/…` falls through to public 404) | `vite.config.js` not-found plugin | P2 |
| A12 | List pages have no pagination (dataset is tiny; acceptable) | 7 products / 5 suppliers | — |

---

## 5. Design rules for the UI pass

1. **Do not present stale prices or stock as current.** Freshness badges and snapshot notices stay.
2. **Do not invent products, suppliers, prices, images, or locations.** Empty / unknown / historical remain first-class UI states.
3. **Do not interpolate untrusted records into `innerHTML` without `escapeHtml`.** Prefer `textContent` on any file already being rewritten.
4. **ITCSS stays.** New rules go in the correct layer. `08-overrides` stays empty unless a temporary, dated exception is required.
5. **Logical properties** (`margin-inline`, `padding-block`) for any new CSS, matching `admin.css` / public components.
6. **Touch targets ≥ 44px** already used in pagination and nav; keep for new controls.
7. **WCAG 2.1 AA contrast** via existing tokens; do not introduce one-off greys.
8. **`prefers-reduced-motion`** already global; do not add uncancellable animation.
9. **No new runtime dependency** for UI. No icon font, no CSS framework, no `i18next`.
10. **Preserve URL state** on public listings (`q`, facets, `sort`, `page`).

---

## 6. Target UI structure after this plan

### 6.1 Public chrome (already exists — polish only)

- Skip link → `#main-content`
- Header: brand, nav, search, mobile toggle, Escape-to-close
- Status/callout: snapshot date + independently-unverified
- Page body
- Footer: nav + research disclaimer

Add: a single compact snapshot line in the header or status region (P7) so users who never scroll still see “historical research, not live prices”.

### 6.2 Admin chrome (to be completed)

Every admin HTML page gets the same shell:

1. Skip link → `#main-content` (add `id="main-content"` + `tabindex="-1"` on `<main>`).
2. Header (existing title group).
3. `renderAdminNav` with `aria-current="page"` on the active item.
4. **Persistence banner** (shared helper, French): localStorage only; not shared; not `public/data`.
5. Page body (table / form / explorer).
6. Footer: link to public catalogue + “prototype admin” line.

Do not reuse `mountSiteLayout` for admin. Extract a small `renderAdminChrome({ activePath })` in `src/admin.js` or `src/admin/ui/chrome.js` that wraps nav + banner + skip + footer so pages stop duplicating the warning markup.

### 6.3 CSS entries

```text
assets/css/public.css     # unchanged role: public MPA
assets/css/admin.css      # NEW role: admin MPA entry (today empty)
assets/css/main.css       # either deprecated or kept as alias of admin bundle
```

**Recommended (D3):** Fill `assets/css/admin.css` as the admin ITCSS entry (same layers as `main.css`). Point all `admin/**/*.html` at `/assets/css/admin.css` only. Stop the extra `<link>` to `06-components/admin.css`. Keep `main.css` temporarily as a re-export of the admin bundle so nothing undocumented breaks, then delete the duplicate link.

Do not put admin rules in `public.css`.

---

## 7. Workstreams and verifiable milestones

Install dependencies once at the start of implementation (`npm install` at repo root). That is an implementation step, not part of this planning pass.

Quality gate for every milestone:

```text
npm test
npm run lint
npm run build
```

Manual check: `npm run dev`, public home + one detail + one admin list + one admin form, viewport 320 / 600 / 1120.

---

### Milestone M0 — Baseline (half day)

**Goal:** Known-green starting point before visual changes.

| Step | Action | Done when |
|---|---|---|
| M0.1 | `npm install` | `node_modules/itemsjs` exists |
| M0.2 | `npm test` | All current tests pass (expect ~59 if all four files load) |
| M0.3 | `npm run lint` | Zero errors on `src/` |
| M0.4 | `npm run build` | `dist/` contains public + admin HTML and `dist/data/*.json` |
| M0.5 | Note any pre-existing lint in `database-explorer.js` | Fix only if it fails the gate |

**Exit:** Written baseline numbers in the implementation PR / STATUS. No UI change required if already green.

**M0 result (2026-10-22):** Complete. No UI source changes.

| Gate | Result |
|---|---|
| `npm install` | 96 packages, 0 vulnerabilities; `node_modules/itemsjs` present |
| `npm test` | **59 pass / 0 fail** (13 suites) |
| `npm run lint` | **pass** (zero errors; `database-explorer.js` unused-catch already fixed) |
| `npm run build` | **pass** — Vite 8.3.4, 79 modules, 641ms |
| `dist/` HTML | **23** pages (1 home + 12 public `pages/**` + 10 admin) |
| `dist/data/` | **11** JSON resources |

Pre-existing lint in `database-explorer.js` did not fail the gate. M1 complete (2026-10-22).

---

### Milestone M1 — Layout integrity and visual system (1–2 days)

**Goal:** No forced horizontal scroll; one admin CSS entry; buttons/tokens consistent; inline styles gone from HTML.

| ID | Change | Files | Verify |
|---|---|---|---|
| M1.1 | Remove or replace `body { min-width: 320px }`. Prefer `min-width: 0` on flex children already present; add `overflow-x: clip` only if a leftover still paints outside | `04-elements/base.css`; component files that overflow | 320px viewport: no document-level horizontal scrollbar on home, products, product detail, admin products, admin dashboard |
| M1.2 | Cap explorer/admin search inputs: `width: 100%; min-width: 0; max-width: 100%` | `06-components/admin.css` | Toolbar does not overflow at 320px |
| M1.3 | Fill `assets/css/admin.css` as admin entry; switch admin HTML `<link>`s; drop duplicate component link | `assets/css/admin.css`, all `admin/**/*.html`, optionally `main.css` | Built admin pages request one stylesheet |
| M1.4 | Introduce shared `.button` aliases: `.btn`, `.btn-primary`, `.btn-secondary` map to `.button` / `.button--secondary` (or the reverse). One padding/radius/focus recipe | `06-components/page.css` or new `06-components/buttons.css` imported by both entries | Visual match; no page regresses |
| M1.5 | Replace inline `style=` in admin HTML with classes (`.count-badge`, `.table-empty`, `.form-actions`) | admin HTML + `admin.css` | `rg 'style=' admin/` returns none (except none expected) |
| M1.6 | Move controller inline colors to `.table-empty`, `.table-error` | `src/admin/controllers/*.js`, `database-explorer.js` | Same |
| M1.7 | Replace `#27ae60` with a token | `tokens.css`, `admin.css` | No raw brand hex in components |
| M1.8 | Font: remove unused `Inter` from the stack **or** document why it stays. Do not add a network font request | `tokens.css` | No extra request in Network panel |

**Acceptance**

- [x] `body { min-width: 320px }` removed; flex/grid children use `min-width: 0`. Manual 320px scroll check is still a browser pass (M2/M4).
- [x] Admin pages load a single CSS bundle (`/assets/css/admin.css` → one hashed file in `dist/`).
- [x] Primary/secondary buttons share height, radius, focus ring via `06-components/buttons.css`.
- [x] `npm test && npm run lint && npm run build` pass (60 tests).

**M1 result (2026-10-22)**

| Gate | Result |
|---|---|
| `npm test` | **60 pass / 0 fail** |
| `npm run lint` | **pass** |
| `npm run build` | **pass** — Vite 8.3.4, 78 modules |
| Admin HTML `style=` | **none** |
| Admin `src/**` `style=` | **none** |
| Dist admin CSS | one hashed bundle (`dom-helpers-*.css`) |
| Font | `Inter` dropped from token stack; no webfont request |

---

### Milestone M2 — Public catalogue UX polish (1–2 days)

**Goal:** Listing and detail pages feel finished on mobile and desktop, without new features.

| ID | Change | Files | Verify |
|---|---|---|---|
| M2.1 | Header: confirm mobile toggle, `aria-expanded`, Escape, and that search does not overflow | `site-header.css`, `site-layout.js` | Keyboard + 320px |
| M2.2 | Filters: stack to one column ≤600px; selects `min-width: 0`; reset button full width on small screens | `filters.css` | Products page |
| M2.3 | Product cards: long names wrap; offer summary does not overflow | `product-card.css`, `offer.css` | Card with long Arabic/French name |
| M2.4 | Snapshot notice visible without scrolling (status region or header strip). Copy must say historical / not independently verified | `status.js`, `home.js`, listing pages | Home + products |
| M2.5 | Empty filter results: existing empty copy; ensure it uses `.empty-state` | `catalog-listing.js` | Filter to zero hits |
| M2.6 | Mark Arabic strings in listing cards with `lang="ar"` when `product_name_ar` is shown (only if shown) | `product-card.js` / detail (already) | Inspector |
| M2.7 | Loading: keep text status (`aria-live="polite"`). No skeleton library | — | Slow 3G optional |
| M2.8 | 404 page already complete — only fix if M1 overflow hits it | `pages/not-found.html` | `/no-such-page` → 404 HTML |

**Do not add:** price-range facet, live maps, carousels, cookie banners, language switcher.

**Acceptance**

- [ ] Public nav, search, filters, pagination, and detail are usable at 320px.
- [ ] Stale/historical labelling remains on offer cards.
- [ ] Load failure still replaces the listing (existing `showLoadError`).
- [ ] `tests/public-pages.test.js` still pass; add assertions only if format helpers change.

---

### Milestone M3 — Admin UX completion (2 days)

**Goal:** An operator can browse every admin page, understand that writes are local, and complete product/supplier forms without undefined fields or unlabeled controls.

| ID | Change | Files | Verify |
|---|---|---|---|
| M3.1 | Shared admin chrome helper: skip link, `main#main-content`, persistence banner, footer, `aria-current` | `src/admin.js` or `src/admin/ui/chrome.js`; all admin HTML | Every admin URL |
| M3.2 | Visible `<label>` for every search/select (can be `.visually-hidden` if the heading already names it) | admin HTML | axe / inspector |
| M3.3 | Table `<caption class="visually-hidden">` + `scope="col"` | admin HTML | 5 list pages |
| M3.4 | Empty and error table states via classes, French copy | controllers | Force empty search |
| M3.5 | Persistence banner on **all** admin pages, including lists | chrome helper | Visual |
| M3.6 | Form success copy already says local-only — keep; add `role="status"` on `#feedback-message` | new/edit HTML + controllers | Create product |
| M3.7 | Invalid HTML5 submit: scroll to first invalid; optional `#form-errors` summary | product/supplier forms | Submit empty |
| M3.8 | Decide staging vs `dbService` **for UI copy only**: if both still write, banner must mention drafts *and* explorer storage. Unifying storage is **not** required to finish UI; if a page is confusing, hide `stageRecord` from new forms and use `dbService` only (controllers already do this for new/edit) | `admin.js`, form controllers | Create then list |
| M3.9 | Imports: keep local syntax check; do not add an upload-to-server control | `imports-controller.js` | Unchanged behavior |
| M3.10 | Dashboard explorer: overflow of modal/table on 320px | `database-explorer.js`, `admin.css` | Open explorer |

**Acceptance**

- [ ] All 10 admin routes render nav, banner, and footer.
- [ ] Products list shows canonical names (adapter already maps `identity.product_name_fr`).
- [ ] Suppliers list shows `business_name` / `supplier_id`.
- [ ] Price history rows show dates and MAD amounts (adapter already maps `observed_at` / `unit_price`).
- [ ] Product create/edit: category and brand selects populated; save shows local-only success; row appears in list **in this browser**.
- [ ] No control is labeled only by placeholder.
- [ ] Gates green.

---

### Milestone M4 — Accessibility and honesty pass (1 day)

**Goal:** Keyboard-complete critical paths; copy cannot be mistaken for a live shop.

| ID | Change | Verify |
|---|---|---|
| M4.1 | Tab order: skip → nav → search → filters → results → footer (public); skip → nav → toolbar → table/form (admin) | Keyboard only |
| M4.2 | `:focus-visible` visible on new controls (global rule exists) | Tab through header and admin nav |
| M4.3 | Filter/table result counts already in the DOM; ensure `aria-live="polite"` on count badges | Change a filter |
| M4.4 | Contrast: spot-check muted text on `--bg-page` and white cards | Tokens already claim AA; no new greys |
| M4.5 | Public footer + status: “dated research snapshot”, “not real-time”, “confirm with supplier” | Copy review |
| M4.6 | Admin banner: “navigateur uniquement”, “pas d’API”, “pas de `public/data`” | Copy review |
| M4.7 | `prefers-reduced-motion`: no new animations that ignore the utility | CSS grep |

**Acceptance**

- [ ] Home search, one facet, pagination, one product detail, one WhatsApp/tel link (if present) — keyboard only.
- [ ] Admin: open products, filter, open edit, submit — keyboard only.
- [ ] No page claims live inventory or shared saves.

Automated a11y scanner is **not** a gate (none is configured). Do not add a new a11y CI dependency in this plan.

---

### Milestone M5 — Docs and freeze (half day)

**Goal:** Documentation matches the UI that actually shipped.

| ID | Change | Notes |
|---|---|---|
| M5.1 | Update `docs/STATUS.md` feature matrix (admin pages, overflow, language) | STATUS currently stale vs this tree |
| M5.2 | Leave `docs/plan-01.md` empty or point to this file in STATUS only | Do not rewrite plan-01 unless asked |
| M5.3 | CSS README: document `public.css` vs `admin.css` entries | `assets/css/README.md` still describes `main.css` as the only entry |
| M5.4 | Do not expand `skill/*` unless a path in `architecture.md` is wrong after M1–M3 | skill public tree already matches `src/public/` |

**Acceptance**

- [ ] STATUS “Honest readiness” still says: demo catalogue yes; commercial no; no API; data unverified.
- [ ] Gates green.

---

## 8. File-level change map (expected)

Touch only what a milestone needs. Do not “clean up” unrelated modules.

**CSS**

- `assets/css/admin.css` — become admin entry
- `assets/css/main.css` — alias or remain admin-oriented; stop public from depending on it (public already uses `public.css`)
- `assets/css/01-settings/tokens.css` — font stack; optional status color tokens
- `assets/css/04-elements/base.css` — drop 320px min-width
- `assets/css/06-components/admin.css` — toolbar widths, table empty/error, banner, footer, button aliases if kept here
- `assets/css/06-components/filters.css`, `site-header.css`, `product-card.css`, `page.css` — overflow and stacking
- `assets/css/README.md` — entry-point correction (M5)

**Public JS**

- `src/public/components/site-layout.js` — optional snapshot strip
- `src/public/components/catalog-listing.js` — empty-state class only if missing
- `src/public/components/product-card.js` — `lang` on Arabic if displayed
- `src/public/components/status.js` — notice copy if needed

**Admin JS**

- `src/admin.js` — `aria-current`; optional chrome export
- `src/admin/ui/chrome.js` — **new**, small
- `src/admin/ui/dom-helpers.js` — `tableEmptyRow`, `tableErrorRow` helpers to kill inline styles
- `src/admin/controllers/*.js` — consume helpers; no behavior change
- `src/admin/database-explorer.js` — overflow / empty classes

**HTML**

- All `admin/**/*.html` — single CSS link, skip/main id, labels, captions, no inline styles
- Public HTML — only if a landmark or status container is missing (currently adequate)

**Tests**

- Prefer extending `tests/admin-adapters.test.js` / `tests/public-pages.test.js` for any helper you extract (`tableEmptyRow`, chrome class names are not worth snapshotting).
- Do not add Playwright in this plan.

**Do not touch**

- `public/data/*` records
- `src/database.js` validation rules
- `src/catalog-search.js` ranking
- Provider contracts
- `i18next` (leave unused)
- Backend / auth / CI

---

## 9. Testing and verification matrix

| Check | Command / method | Milestone |
|---|---|---|
| Unit | `npm test` | every |
| Lint | `npm run lint` | every |
| Production build | `npm run build` | every |
| Public routes | load `/`, `/pages/products/`, one `detail.html?id=`, `/pages/not-found.html` | M1–M2 |
| Admin routes | 10 `admin/**` URLs | M3 |
| Viewport | 320, 360, 600, 1120 | M1–M3 |
| Keyboard | paths in M4 | M4 |
| Honesty | stale offer still “Historical”; admin save still “localStorage” | M2–M4 |

`node_modules` must exist before any gate. Current failure (`itemsjs` missing) is environmental.

---

## 10. Risks and non-goals

| Risk | Mitigation |
|---|---|
| Overflow “fixed” with `overflow-x: hidden` on `body` clipping focus rings | Prefer `min-width: 0` on flex items; clip only on specific wrappers |
| Unifying buttons breaks admin density | Alias classes; do not restyle explorer modals twice |
| Chrome helper rewrite regresses nav active state | Keep `renderAdminNav(activePath)` signature; wrap it |
| `innerHTML` tables vs public `textContent` convention | Helpers centralize escape; full DOM rewrite is a later chore |
| STATUS/skill docs drift again | M5 is mandatory before calling UI “finished” |
| Scope creep into API or i18n | Rejected by §1 |

**Explicit non-goals:** live prices, merchant login, Arabic public UI, RTL admin, webfonts, icon packs, CSS framework, SPA, backend, data invention, deleting `i18next` (unless a later chore).

---

## 11. Suggested implementation order

```text
M0 baseline
 → M1 overflow + CSS entries + buttons (unblocks everything visual)
 → M2 public polish and M3 admin chrome in parallel if two people; else M3 then M2
 → M4 keyboard/copy pass
 → M5 docs freeze
```

No milestone requires a new repository, a new dependency, or a data migration.

---

## 12. Definition of “frontend UI/UX finished”

All of the following are true:

1. Public catalogue and all admin pages render correctly against the current JSON snapshot.
2. 320px viewports do not scroll horizontally on the pages listed in M1.
3. Admin writes are visually impossible to confuse with shared/server persistence.
4. Public offers are visually impossible to confuse with live prices.
5. Keyboard users can complete search → product detail and admin list → edit.
6. `npm test`, `npm run lint`, and `npm run build` pass.
7. `docs/STATUS.md` no longer describes the 2026-10-20 adapter WIP as current.

This is **not** production commercial readiness. That still requires `inzegane-api`, auth, and reverified data (README phases 3–6). Those remain future plans, not this one.

---

## 13. Implementation authorization

This document is the plan. **Do not start M0–M5 until explicitly asked to implement.**

When implementation is authorized, execute M0 first, then M1. Do not skip the overflow fix.
