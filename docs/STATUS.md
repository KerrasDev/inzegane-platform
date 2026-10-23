# Project Status — Inzegane Platform

**Status date:** 2026-10-22
**Repository:** `inzegane-platform` (frontend)
**Branch / HEAD:** `OpenCode` @ `0210fb1bf5587c78ce722dc1205e2308a9f01b66` (branched from `main`, no upstream, not pushed)
**Worktree:** uncommitted — `M assets/css/04-elements/base.css`, `M docs/STATUS.md`; untracked — `.kilo/`, `docs/ai/`, `docs/plan-02.md`
**Project version:** `1.0.0`

This document is a living snapshot of what exists, what works, what is broken, and what comes next. Every claim below was re-checked against the code or a command on **2026-10-22** unless marked otherwise.

**Evidence markers:** ✓ verified by command today · ◐ verified by reading source today · ○ carried from an earlier audit, **not** re-checked today

---

## 1. One-line verdict

A working **static English-language market-research catalogue** (Vite MPA + ItemsJS) with a functioning **provider/service seam** and a **wired, browser-local administration UI**. Not a shared backend, not authenticated admin, and not production-ready commercial data.

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

Target architecture (two repos, HTTP API, normalized domain model) is documented in `README.md`. Implementation has reached the **frontend boundary / admin scaffolding** stage of that roadmap, not the API.

---

## 3. Quality gates — verified 2026-10-22

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | **59 pass / 0 fail** (13 suites, ~0.97 s) ✓ |
| Lint | `npm run lint` | **Pass**, 0 errors, 0 warnings ✓ |
| Build | `npm run build` | **Pass**, 79 modules, 791 ms ✓ |
| Page count | `find dist -name '*.html' \| wc -l` | **23** (13 public + 10 admin) ✓ |
| Worktree cleanliness | `git status --short` after build | Build does not dirty tracked files (`dist/` is ignored) ✓ |

Per-file test breakdown ✓

| Suite | Tests |
|---|---:|
| `tests/database.test.js` | 36 |
| `tests/admin-adapters.test.js` | 10 |
| `tests/public-pages.test.js` | 7 |
| `tests/admin-data.test.js` | 6 |

**Discrepancy to resolve:** `docs/plan-02.md` records 60 tests for M1, this run reports 59. M0's figure (59) matches today's tree. Either one test was removed after M1 or the M1 count was recorded from a different state.

---

## 4. Current repository layout (actual)

```text
inzegane-platform/
├── index.html                 # Public home (public.css)
├── pages/                     # 12 public HTML pages
│   ├── products/{index,detail}.html
│   ├── categories/{index,detail}.html
│   ├── suppliers/{index,detail}.html
│   ├── offers/{index,detail}.html
│   └── about · contact · methodology · not-found .html
├── admin/                     # 10 admin HTML pages (setting/ is empty)
├── assets/css/                # ITCSS layers; public.css (public) + main.css (admin)
├── public/data/               # 11 JSON resources (schema + collections + metadata)
├── src/
│   ├── database.js            # Load / validate / join JSON catalogue
│   ├── catalog-search.js      # ItemsJS search, facets, sort, pagination
│   ├── admin.js               # Admin nav + staged draft merge helpers
│   ├── admin/adapters/        # Canonical → view-model mappers (5)
│   ├── admin/controllers/     # Page controllers (10)
│   ├── admin/ui/              # DOM helpers
│   ├── admin/database-explorer.js
│   ├── data/                  # contracts, service, schemas, providers (json + local-db)
│   └── public/                # components (10), lib (3), pages (12 entries)
├── tests/                     # 4 node:test suites
├── docs/                      # audits, plan-02, this STATUS
└── vite.config.js · netlify.toml · package.json
```

Notes ◐: root `data/` is an empty directory; `admin/setting/` is empty; there is no `locations` collection.

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
| Public pages (12 + home) | **Done** ✓ | 13 HTML → 12 entries under `src/public/pages/`; build-verified, **browser UI not verified** |
| Empty / not-found states | **Done** ◐ | `pages/not-found.html` served with HTTP 404 in dev/preview + Netlify |
| Netlify build config | **Done** ◐ | External deploy not verified |
| Public stylesheet split | **Done** ◐ | Public pages load only `public.css`; admin loads `main.css` |

### Admin

See §6 for per-page wiring. Summary: all 10 pages are wired to a controller; the **imports** page is local-validation only, and **settings** does not exist.

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

## 6. Admin page wiring (verified 2026-10-22)

| Page | Controller | State |
|---|---|---|
| `admin/index.html` | `dashboard-controller.js` | Wired — nav + DB explorer |
| `admin/products/index.html` | `products-list-controller.js` | Wired — search, category filter, edit links |
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

## 8. Roadmap progress (vs README phases)

| Phase | Intent | Progress |
|---|---|---|
| 1 — Audit and preserve | Understand catalogue, tests, risks | **Done** (`report-01`, `report-02`, `skill/`) |
| 2 — Frontend boundaries | Admin structure, shared modules, provider seam | **Largely done** — providers, adapters, controllers all wired; remaining gaps are UX (M2–M5 of `plan-02`) |
| 3 — Backend repo `inzegane-api` | FastAPI + SQLAlchemy + Alembic | **Not started** |
| 4 — Core API | Products, suppliers, offers, inventory, auth | **Not started** |
| 5 — Migrate & integrate | JSON import, frontend → API | **Not started** |
| 6 — Admin + deploy hardening | Auth, production DB, ops | **Not started** |

---

## 9. Known limitations (still true)

- Static JSON is public; this is not a secure multi-user database.
- Admin writes are browser-local and unauthenticated; they never reach `public/data/`.
- Custom validation ≠ full JSON Schema Draft 2020-12.
- Tests cover loader, search, providers, adapters, and public page builders — **not** browser rendering or admin forms in a real DOM.
- `i18next` is declared in `package.json` and installed but imported nowhere.
- `package.json` `"main": "index.js"` points at a file that does not exist (the real entry points are HTML).
- `assets/css/admin.css` is a 0-byte file imported by nothing — dead file.
- `src/main.js` was deleted in `088eba1`, but `README.md:64`, `README.md:515`, `docs/report-01.md`, and `docs/html-js-integration-audit-01.md` still reference it.
- `docs/plan-01.md` is empty; `REDME.md` is a misspelled duplicate of `README.md`; root `data/` is empty.
- No CI; no automated 320px/overflow or accessibility check.
- `docs/database-01.md` describes a schema that does **not** match runtime data (9 products / 6 businesses / 11 offers vs 7 / 5 / 8) and uses `data/` where runtime uses `public/data/`.
- `skill/` documents partly lag the current provider/admin tree.

---

## 10. Recommended next actions (priority order)

1. **Finish `plan-02` M2** — public catalogue UX polish (empty states, VAT-basis labelling, freshness parity, pagination semantics).
2. **Close admin write gaps** — offer create/edit, supplier edit, optional availability write; keep the "local only" banner visible everywhere.
3. **Finish the 320px pass** — `body { min-width: 320px }` was removed in the uncommitted `base.css` change; re-verify at 320/360/768 and add a static CSS guard test.
4. **Make capability limits explicit in UI** — imports page states local validation only; extend that honesty to every write surface.
5. **Doc hygiene** — fix `README.md` references to `src/main.js`; resolve `REDME.md`, empty `plan-01.md`, empty `data/`, 0-byte `admin.css`; mark `database-01.md` as historical.
6. **Add CI** — `npm ci && npm test && npm run lint && npm run build` once the tree is frozen.
7. **Specify the API contract**, then create `inzegane-api`; add an HTTP provider only against that contract.
8. **Re-verify market data** — owned refresh process before any commercial reliance.

---

## 11. Related documents

| Document | Role |
|---|---|
| `README.md` | Target architecture and principles (partly stale) |
| `docs/plan-02.md` | Current execution plan, M0–M5 (M0/M1 done, M2–M5 pending) |
| `docs/report-01.md` | Early catalogue audit (2026-10-16) |
| `docs/report-02.md` | Post-provider / admin audit (2026-10-18) |
| `docs/html-js-integration-audit-01.md` | HTML/JS integration audit (pre-dates `src/main.js` removal) |
| `docs/database-01.md` | Historical / proposed schema notes — not runtime truth |
| `skill/*` | Dev agent knowledge (data model, search, workflow) |
| `public/data/schema.json` | Runtime schema for current JSON |

---

## 12. Honest readiness summary

| Question | Answer |
|---|---|
| Can someone browse a demo catalogue? | **Yes** — local or static build |
| Can operators reliably manage canonical data in admin? | **No** — writes are browser-local; offers/suppliers lack edit paths |
| Is there shared write persistence? | **No** |
| Is there an API or SQL database? | **No** |
| Is market data current / verified? | **No** — 2025-02-21 snapshot, `independently_verified: false` |
| Ready for production commercial use? | **No** |

*Last updated: 2026-10-22 — based on `npm test`, `npm run lint`, `npm run build`, direct source inspection, `public/data/*.json` counts, and the branch `OpenCode` worktree.*
