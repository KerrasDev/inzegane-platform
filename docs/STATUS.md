# Project Status — Inzegane Platform

**Status date:** 2026-10-20  
**Repository:** `inzegane-platform` (frontend)  
**Branch / HEAD:** `main` @ `42c3b76` (`Implement unified data architecture and providers`)  
**Worktree:** Uncommitted admin-adapter work in progress (see §5)  
**Project version:** `1.0.0`

This document is a living snapshot of what exists, what works, what is broken, and what comes next. It supplements detailed audits in `docs/report-01.md` and `docs/report-02.md`. Prefer this file for a current overview.

---

## 1. One-line verdict

Working **static French market-research catalogue** (Vite MPA + ItemsJS) with a **provider/service seam** and **partial administration UI**. Not a shared backend, not authenticated admin, and not production-ready commercial data.

---

## 2. What this project is

| Aspect | Reality |
|---|---|
| Product | Product / supplier / offer / price-observation catalogue focused on accessories and wholesale signals in Inezgane, Morocco |
| Stack | HTML, CSS, Vanilla JS (ES modules), Vite 8, ItemsJS, Node test runner, ESLint |
| Data today | Static JSON under `public/data/` (read-only for the public catalogue) |
| Persistence for admin drafts | Browser `localStorage` only |
| Backend | **Not started** — planned separate repo `inzegane-api` (FastAPI / SQLAlchemy / Alembic) |
| Auth / roles | **None** |
| Deploy config | `netlify.toml` → `npm run build` → `dist` (live Netlify site not verified in-repo) |

Target architecture (two repos, HTTP API, normalized domain model) is documented in `README.md`. Implementation has reached the **frontend boundary / admin scaffolding** stage of that roadmap, not the API.

---

## 3. Current repository layout (actual)

```text
inzegane-platform/
├── index.html                 # Public catalogue
├── admin/                     # 10 admin HTML pages (+ dashboard)
├── assets/css/                # Layered CSS (tokens → components)
├── public/data/               # 11 JSON resources (schema + collections + metadata)
├── src/
│   ├── main.js                # Public catalogue UI + URL state
│   ├── database.js            # Load / validate / join JSON catalogue
│   ├── catalog-search.js      # ItemsJS search, facets, sort, pagination
│   ├── admin.js               # Admin nav + staged draft merge helpers
│   ├── admin/
│   │   ├── adapters/          # WIP: canonical → view-model mappers
│   │   ├── controllers/       # WIP: page controllers (partial wiring)
│   │   ├── ui/                # WIP: DOM helpers
│   │   └── database-explorer.js
│   └── data/
│       ├── contracts.js       # Provider contract + primary keys
│       ├── database-service.js
│       ├── resource-schemas.js
│       └── providers/
│           ├── json-provider.js
│           └── local-db-provider.js
├── tests/
├── docs/                      # Audits, schema notes, this STATUS
├── skill/                     # Agent/dev knowledge base
├── vite.config.js
├── netlify.toml
└── package.json
```

Root `data/` is empty. Canonical runtime data is `public/data/`. `docs/plan-01.md` is currently empty.

---

## 4. Feature status matrix

Statuses: **Done** · **Partial** · **WIP (uncommitted)** · **Broken** · **Not started**

| Area | Status | Notes |
|---|---|---|
| Public catalogue load + validation | **Done** | Schema + relationship checks in `src/database.js` |
| ItemsJS search / facets / sort / pagination | **Done** | French UI; Arabic text searchable via app-level matching |
| URL query state + `popstate` | **Done** | Filters, sort, page restored from URL |
| Offer freshness / stale warnings | **Done** | All 8 offers classified stale vs 2026-10 dates |
| Vite multi-page build (11 HTML entries) | **Done** | Recursive HTML discovery in `vite.config.js` |
| Netlify build settings in repo | **Done** | External deploy not verified |
| Data provider boundary | **Done** | `catalogDataService` (JSON) + `dbService` (localStorage) |
| Admin dashboard + nav shell | **Partial** | Pages exist; capability messaging still mixed |
| Admin products list | **Partial** | Inline script maps canonical fields; works for list |
| Admin products create / edit | **Broken** | Field / ID mismatches vs `product_id`, nested identity |
| Admin suppliers list / search | **Broken** | Expects `id`/`name`; data uses `supplier_id`/`business_name` |
| Admin offers list | **WIP** | Controller + adapter exist; page wired to controller |
| Admin inventory (availability) | **WIP** | Controller uses `availability_checks`; page wired |
| Admin price history | **Broken** | Still reads `priceHistory` / `recorded_at` / `price` |
| Admin imports page | **WIP** | Spec/docs UI + controller; no real server import |
| Generic DB explorer | **Partial** | Prototype on `dbService` + resource schemas |
| Adapter layer + unit tests | **WIP** | Uncommitted; blocked by syntax error (see §5) |
| HTTP API / FastAPI backend | **Not started** | Separate repo planned |
| AuthZ / AuthN | **Not started** | |
| Legacy JSON → SQL migration | **Not started** | |
| Arabic UI / RTL | **Not started** | Search only |
| CI workflow | **Not started** | No `.github/workflows` |
| Data re-verification | **Not started** | Snapshot 2025-02-21, `independently_verified: false` |

---

## 5. Work in progress (uncommitted, 2026-10-20)

Local changes address the admin field-mapping defects from `report-02` by introducing resource adapters and page controllers.

### Added (untracked)

| Path | Role |
|---|---|
| `src/admin/adapters/*.js` | Map canonical JSON → admin view models |
| `src/admin/controllers/*-controller.js` | Offers, inventory, products list, imports |
| `src/admin/ui/dom-helpers.js` | `escapeHtml`, `formatDate`, badges |
| `tests/admin-adapters.test.js` | Adapter / helper unit tests |
| `docs/report-02.md` | Full audit (2026-10-18) |

### Modified (tracked)

- Admin HTML for offers, inventory, imports, price-history (partial controller wiring)
- `src/admin.js`, providers, `contracts.js`, `database-service.js`, `main.js`, `tests/admin-data.test.js`, `README.md`

### Blocking defects in WIP

1. **`supplier-adapter.js` duplicates `adaptSupplier` / `toSupplierPayload`** → `SyntaxError` at load. Breaks `tests/admin-adapters.test.js` and ESLint parse of that file.
2. **Incomplete page migration:** `products-list-controller.js` exists but `admin/products/index.html` still uses an inline script. Suppliers list, price-history, create/edit forms still use legacy field names.
3. **Lint (committed base):** unused catch binding in `src/admin/database-explorer.js:29`.

### Quality gates (this worktree)

| Check | Result |
|---|---|
| `npm test` | **42 pass / 1 fail** (`admin-adapters.test.js` — adapter syntax error) |
| `npm run lint` | **Fail** — duplicate export + unused `e` |
| `npm run build` | Expected to succeed for committed tree; re-run after WIP fix |

Until the duplicate export is removed and remaining list/form pages consume adapters, do not treat the WIP as ready to merge.

---

## 6. Data snapshot

| Collection | Count |
|---|---:|
| Categories | 12 |
| Brands | 10 |
| Suppliers | 5 |
| Products | 7 |
| Offers | 8 |
| Price history | 6 |
| Availability checks | 5 |
| Sources | 8 |

- **Snapshot generated:** `2025-02-21T18:00:00Z`
- **Independently verified:** `false` (`public/data/database-metadata.json`)
- **Freshness:** under current rules, **8/8 offers are stale** as of mid-October 2026
- **Unresolved model gap:** `location_id` on availability records with no locations collection

Do not use these prices or stock values for live commercial decisions without re-verification.

---

## 7. Roadmap progress (vs README phases)

| Phase | Intent | Progress |
|---|---|---|
| 1 — Audit and preserve | Understand catalogue, tests, risks | **Largely done** (`report-01`, `report-02`, `skill/`) |
| 2 — Frontend boundaries | Admin structure, shared modules, provider seam | **In progress** — providers done; admin adapters WIP |
| 3 — Backend repo `inzegane-api` | FastAPI + SQLAlchemy + Alembic | **Not started** |
| 4 — Core API | Products, suppliers, offers, inventory, auth | **Not started** |
| 5 — Migrate & integrate | JSON import, frontend → API | **Not started** |
| 6 — Admin + deploy hardening | Auth, production DB, ops | **Not started** |

---

## 8. Known limitations (still true)

- Static JSON is public; not a secure multi-user database.
- Admin writes/drafts are browser-local and unauthorized.
- Custom validation ≠ full JSON Schema Draft 2020-12.
- Tests cover loader/search/providers/adapters (when fixed), not full browser UI.
- Narrow viewport horizontal overflow still reported (`body { min-width: 320px }`).
- `i18next` declared in `package.json` but unused in application source.
- `package.json` `"main": "index.js"` points at a missing file (Vite entry is HTML).
- Skill docs (`skill/architecture.md`, `known-limitations.md`) partly lag the provider/admin tree; trust code + this STATUS for “what exists now”.

---

## 9. Recommended next actions (priority order)

1. **Finish admin adapter fix** — remove duplicate exports in `supplier-adapter.js`; restore green `npm test` / `npm run lint`.
2. **Wire remaining admin pages** — suppliers list, price-history, product create/edit, and prefer controllers over inline scripts; keep canonical keys in JSON.
3. **Label capabilities honestly** — distinguish local drafts from shared persistence in UI copy.
4. **Specify API contract** — then create `inzegane-api`; add an HTTP provider only against a documented contract.
5. **Re-verify market data** — owned refresh process before any commercial reliance.
6. **Layout + CI** — fix 320px overflow; add CI for test/build/lint once lint is clean.
7. **Doc hygiene** — refresh README tree; fill or remove empty `docs/plan-01.md`; dedupe `REDME.md` if obsolete.

---

## 10. Related documents

| Document | Role |
|---|---|
| `README.md` | Target architecture and principles |
| `docs/report-01.md` | Early catalogue audit (2026-10-16) |
| `docs/report-02.md` | Post-provider / admin audit (2026-10-18) |
| `docs/database-01.md` | Historical / proposed schema notes |
| `skill/*` | Dev agent knowledge (data model, search, workflow) |
| `public/data/schema.json` | Runtime schema for current JSON |

---

## 11. Honest readiness summary

| Question | Answer |
|---|---|
| Can someone browse a demo catalogue? | **Yes** (local / static build) |
| Can operators reliably manage canonical data in admin? | **No** — several pages broken; WIP incomplete |
| Is there shared write persistence? | **No** |
| Is there an API or SQL database? | **No** |
| Is market data current / verified? | **No** |
| Ready for production commercial use? | **No** |

*Last updated: 2026-10-20 — based on repository inspection, `report-02`, current git HEAD, and uncommitted admin-adapter worktree state.*
