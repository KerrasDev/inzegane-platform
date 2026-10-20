# Inzegane Platform

A modular, open-source product catalog and market research platform focused on accessories, suppliers, offers, and price information in Inzegane, Morocco.

## 1. Project Overview

**Inzegane Platform** aims to organize product and supplier information into a searchable catalog that supports price comparison, offer tracking, inventory information, and historical price observations.

The project is designed to evolve gradually from a static-data prototype into a maintainable application with a separate frontend and backend.
ٌَُ]
The architecture prioritizes:

- **Modularity:** Keep features and responsibilities separated.
- **Maintainability:** Extend existing code instead of rebuilding working functionality unnecessarily.
- **Open source:** Use transparent, maintainable technologies and review licenses before integrating external projects.
- **Data integrity:** Distinguish products, suppliers, offers, inventory, and price observations.
- **Independent deployment:** Deploy the frontend and backend separately.
- **Progressive development:** Introduce complexity only when a real requirement justifies it.

## 2. Current Project Status

The existing frontend is based on HTML, CSS, Vanilla JavaScript, and Vite.

Its current structure includes:

```text
inzegane-platform/
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── data/
├── Docs/
│   ├── dataBase-01.md
│   └── report-01.md
├── index.html
├── public/
│   └── data/
│       ├── availability_checks.json
│       ├── brands.json
│       ├── categories.json
│       ├── database_metadata.json
│       ├── offers.json
│       ├── price_history.json
│       ├── products.json
│       ├── research_summary.json
│       ├── schema.json
│       ├── sources.json
│       └── suppliers.json
├── skill/
│   ├── architecture.md
│   ├── codebase-map.md
│   ├── coding-conventions.md
│   ├── data-model.md
│   ├── dependencies-and-integrations.md
│   ├── development-workflow.md
│   ├── known-limitations.md
│   ├── search-and-facets.md
│   ├── SKILL.md
│   └── testing-and-validation.md
├── src/
│   ├── catalog-search.js
│   ├── database.js
│   └── main.js
├── tests/
│   └── database.test.js
├── package.json
└── package-lock.json
```

This tree documents the structure currently reported for the project. It does not imply that the proposed administration interface or backend has already been implemented.

### Important current limitations

- JSON files in `public/data/` are publicly accessible static assets, not a secure, shared database.
- Browser-side changes cannot provide reliable, authorized persistence for shared business data.
- The existing behavior and dependencies of `src/database.js` must be reviewed before replacing or reorganizing it.
- The contents of `data/` and `public/data/` must be examined before deciding whether they contain duplicate, source, imported, or generated datasets.
- The current tests must continue to pass, or any necessary changes must be justified and documented.

### Current frontend data boundary

Catalog and admin data reads use `src/data/database-service.js`. `catalogDataService` reads the static JSON catalog; `dbService` uses browser `localStorage` for the administration explorer. Both providers expose the same snapshot, query, and CRUD interface, so a future HTTP/API provider can be injected without putting SQL or database access in browser code. Product and supplier form submissions remain local browser drafts. The local-storage provider is not a server database, and the API contract/backend are not implemented.

## 3. Target Architecture

The target system consists of two completely separate Git repositories.

### Repository A: `inzegane-platform`

The frontend contains the public catalog, administration pages, presentation components, client-side validation, and API communication.

**Technology stack**

- HTML
- CSS
- Vanilla JavaScript using ES modules
- Vite
- Fetch API for backend communication
- Vitest, where appropriate for existing or new tests

The frontend must not access the production database directly or contain server-side secrets.

### Repository B: `inzegane-api`

The backend owns persistent data, business rules, authorization, validation, and integrations.

**Technology stack**

- Python
- FastAPI
- Pydantic
- SQLAlchemy 2.x
- Alembic for database migrations
- SQLite for local development and suitable small deployments
- PostgreSQL as the preferred production option when concurrency, deployment, and operational requirements justify it
- Pytest and FastAPI testing utilities

The backend should begin as a **modular monolith**, not a collection of microservices.

### System boundary

```text
Public Catalog ──────┐
                     │
Administration UI ───┼── HTTP / JSON API ── FastAPI
                     │                         │
Future Integrations ─┘                         ├── Domain Services
                                               ├── Validation
                                               ├── Authorization
                                               ├── SQLAlchemy
                                               └── Database
```

The frontend and backend can be developed and deployed independently. They communicate through a documented, versioned API.

## 4. Frontend Architecture

The frontend should evolve toward a multi-page application using Vite and shared JavaScript modules.

A proposed target structure is:

```text
inzegane-platform/
├── index.html
├── admin/
│   ├── index.html
│   ├── products/
│   │   ├── index.html
│   │   ├── new.html
│   │   └── edit.html
│   ├── suppliers/
│   │   ├── index.html
│   │   └── new.html
│   ├── offers/
│   │   └── index.html
│   ├── inventory/
│   │   └── index.html
│   ├── price-history/
│   │   └── index.html
│   └── imports/
│       └── index.html
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── src/
│   ├── app/
│   │   ├── public-entry.js
│   │   ├── admin-entry.js
│   │   └── config.js
│   ├── components/
│   ├── features/
│   │   ├── catalog/
│   │   ├── products/
│   │   ├── suppliers/
│   │   ├── offers/
│   │   ├── inventory/
│   │   ├── price-history/
│   │   └── imports/
│   ├── api/
│   │   ├── http-client.js
│   │   ├── products-api.js
│   │   ├── suppliers-api.js
│   │   ├── offers-api.js
│   │   └── inventory-api.js
│   ├── services/
│   └── catalog-search.js
├── public/
│   └── data/
├── tests/
├── Docs/
├── package.json
└── vite.config.js
```

This is a target structure, not a requirement to create every file immediately. Modules should be introduced when their responsibilities are needed.

### Frontend responsibilities

- Render the public catalog and search results.
- Provide administration forms, tables, filters, and pagination.
- Validate user input for usability.
- Communicate with the backend through dedicated API modules.
- Handle loading, empty, success, and error states.
- Keep reusable components independent of specific business features.
- Preserve working catalog behavior during migration.

Client-side validation improves usability but does not replace backend validation or authorization.

## 5. Backend Architecture

The backend should live in its own repository, with its own dependencies, tests, documentation, environment configuration, and release process.

Proposed structure:

```text
inzegane-api/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── errors.py
│   │   └── logging.py
│   ├── api/
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── products.py
│   │           ├── suppliers.py
│   │           ├── offers.py
│   │           ├── inventory.py
│   │           ├── prices.py
│   │           └── imports.py
│   ├── modules/
│   │   ├── products/
│   │   ├── suppliers/
│   │   ├── offers/
│   │   ├── inventory/
│   │   ├── price_history/
│   │   └── sources/
│   ├── integrations/
│   │   ├── base.py
│   │   └── csv_importer.py
│   └── db/
│       ├── session.py
│       └── base.py
├── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── api/
├── scripts/
│   └── import_legacy_json.py
├── .env.example
├── alembic.ini
├── pyproject.toml
└── README.md
```

Each domain module may contain:

- `models.py`: persistence models.
- `schemas.py`: input and output schemas.
- `repository.py`: database access.
- `service.py`: business rules.

These files should be added when needed rather than created as empty placeholders.

### Backend responsibilities

- Validate all incoming data.
- Enforce authentication and authorization for protected operations.
- Own database access and transactions.
- Apply business rules consistently.
- Record important changes and their origins.
- Normalize imported data.
- Expose a documented API.
- Return consistent error responses.
- Support database migrations and automated tests.

## 6. Core Data Model

The data model must distinguish product identity from a supplier's commercial offer and its inventory state.

| Entity | Responsibility |
|---|---|
| `products` | Shared identity and attributes of a product |
| `brands` | Brand information, where applicable |
| `categories` | Product classification |
| `suppliers` | Traders, wholesalers, and other suppliers |
| `offers` | A supplier's offer for a specific product |
| `inventory` | Quantity or availability associated with an offer |
| `inventory_movements` | History of quantity changes, where quantity management is required |
| `price_history` | Historical price observations |
| `sources` | Origin and reliability of collected information |
| `availability_checks` | Records of availability verification |
| `imports` | Import jobs, summaries, and processing status |

The final schema must be reconciled with the existing JSON files and `skill/data-model.md` before implementation.

### Product versus offer

One product may have multiple supplier offers.

For example:

| Product | Supplier | Pack price | Quantity |
|---|---|---:|---:|
| Acrylic hair clip | Supplier A | MAD 12 | 20 packs |
| Acrylic hair clip | Supplier B | MAD 10 | 0 packs |
| Acrylic hair clip | Supplier C | MAD 15 | Unknown |

The second offer remains a valid record even when its reported quantity is zero. The third offer has an unknown quantity, which must not be interpreted as zero.

### Inventory and availability rules

- Zero quantity means explicitly reported or recorded zero.
- Unknown quantity must remain distinguishable from zero.
- Historical observations must not be silently overwritten.
- Inventory updates should record the reason, timestamp, and origin.
- A public market-research catalog must distinguish supplier-reported data from independently verified data.
- A reported quantity must not be presented as verified physical stock unless it has actually been verified.
- Removing an offer from active listings must not automatically erase its history.

## 7. API Contract

The backend is the source of truth for persistent data and business operations.

The API should use versioned routes, beginning with `/api/v1/`.

Proposed endpoints include:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/products` | List and search products |
| `POST` | `/api/v1/products` | Create a product |
| `GET` | `/api/v1/products/{id}` | Retrieve product details |
| `PATCH` | `/api/v1/products/{id}` | Update product attributes |
| `GET` | `/api/v1/suppliers` | List suppliers |
| `POST` | `/api/v1/suppliers` | Create a supplier |
| `GET` | `/api/v1/suppliers/{id}/offers` | Retrieve a supplier's offers |
| `GET` | `/api/v1/offers` | Search offers |
| `POST` | `/api/v1/offers` | Create an offer |
| `GET` | `/api/v1/offers/{id}/price-history` | Retrieve price observations |
| `GET` | `/api/v1/offers/{id}/inventory` | Retrieve inventory information |
| `PUT` | `/api/v1/offers/{id}/inventory` | Update inventory state |
| `POST` | `/api/v1/imports` | Submit an authorized import job |

These endpoints are proposed, not implemented. Their exact payloads, filters, pagination rules, error formats, and permissions must be documented before the frontend depends on them.

### API contract principles

- Keep request and response formats explicit.
- Use Pydantic schemas for input and output validation.
- Keep database implementation details out of public API responses.
- Return appropriate HTTP status codes and actionable error messages.
- Apply authentication and authorization to protected endpoints.
- Use transactions for operations that modify related records.
- Preserve backward compatibility where practical.
- Generate and maintain OpenAPI documentation through FastAPI.

The OpenAPI contract should guide frontend integration and API testing.

## 8. Frontend-to-Backend Communication

All backend communication should pass through a shared HTTP client and feature-specific API modules.

For example:

```js
// src/api/products-api.js

import { apiRequest } from "./http-client.js";

export function getProducts(params = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.size ? `?${query}` : "";

  return apiRequest(`/api/v1/products${suffix}`);
}
```

This example assumes that `http-client.js` implements `apiRequest`. It is illustrative and must be adapted to the actual API contract.

The API base URL should be configurable per environment.

For example, a Vite environment variable can define `VITE_API_BASE_URL`. Vite variables exposed to browser code are public and must never contain passwords, private API keys, or other secrets.

The HTTP client should eventually handle:

- JSON serialization and content types.
- API error responses.
- Network failures.
- Request timeouts.
- Authentication where required.
- Appropriate handling of empty responses.
- Consistent response parsing.

CORS must be configured on the backend for the actual frontend origins used in development and deployment.

## 9. Legacy JSON Migration

The existing JSON datasets are valuable inputs for the migration, but they must not automatically become the permanent production data layer.

Migration should follow these steps:

1. Inventory all JSON files and document their schemas.
2. Check for duplicate identifiers and inconsistent relationships.
3. Identify missing values, invalid prices, and ambiguous inventory fields.
4. Map legacy fields to the agreed database schema.
5. Write a repeatable import script.
6. Validate imported record counts and relationships.
7. Compare representative records against the original files.
8. Test the import against a disposable database before production use.
9. Preserve the original source files and migration logs.
10. Document how failed records are reported and corrected.

The migration should be repeatable or safely reject duplicate imports. It must not silently discard data or invent values for unknown fields.

During the transition, static JSON may remain available for public demo data if that is useful. It must be clearly separated from live, authoritative data.

## 10. Administration Interface

The administration interface should focus on operational tasks rather than exposing database tables directly.

### Dashboard

- Product and supplier counts, when backed by real data.
- Offers requiring review.
- Recently recorded price observations.
- Reported availability changes.
- Import status and errors.

### Products

- Search and filter products.
- Create and edit product attributes.
- Assign categories and brands.
- Review possible duplicates.
- Connect products to supplier offers.

### Suppliers

- Manage supplier details and contact information.
- Record source URLs and verification status.
- Review a supplier's offers and observations.

### Offers and prices

- Manage supplier-specific prices.
- Record pack size, unit, currency, and minimum order quantity.
- Track price observations and verification dates.
- Distinguish current offers from historical records.

### Inventory

- Update a specific offer's quantity or availability.
- Record the reason and origin of each change.
- Preserve the distinction between zero, unknown, and unverified values.

### Imports

- Accept supported files such as CSV.
- Preview records before import.
- Detect potential duplicates.
- Report row-level validation errors.
- Record import status and summary information.

All protected operations must be authorized by the backend, not merely hidden behind an administration page.

## 11. Open-Source Integrations

The project may incorporate existing open-source tools when they solve a real requirement.

### Administration UI

Tabler is a candidate for administration layout patterns and components. It can be evaluated without replacing the existing public catalog.

- Website: https://tabler.io/
- Repository: https://github.com/tabler/tabler

Before integrating it, review its current license, dependencies, accessibility, customization requirements, and compatibility with the existing CSS.

### Import integrations

Start with a simple CSV importer. Add other formats or external services only when their data sources, terms of use, and operational value are understood.

Integrations should normalize external data into the platform's domain model. They should not write directly to database files or bypass backend validation.

Avoid introducing a generic plugin framework, microservices, background-job infrastructure, or a large dependency stack before there is a concrete need.

## 12. Security and Data Quality

The following rules apply as the system evolves:

- Never expose database credentials or private API keys in frontend files.
- Validate all writes on the backend.
- Protect administrative endpoints with authentication and authorization.
- Restrict CORS to known frontend origins.
- Use parameterized database operations through the ORM or an appropriate database layer.
- Apply database migrations rather than relying on manual production schema changes.
- Maintain backups appropriate to the deployment environment.
- Log important administrative and inventory changes without unnecessarily logging sensitive information.
- Track the origin, observation date, and verification status of market data.
- Do not treat imported information as verified merely because it was successfully imported.

Authentication, authorization, backups, and operational monitoring must be implemented and tested before the system is used for real shared administrative data.

## 13. Development Roadmap

### Phase 1 — Audit and preserve

- Inspect the existing `package.json`, `src/database.js`, `src/main.js`, and `tests/database.test.js`.
- Review `skill/data-model.md`, `skill/architecture.md`, and the current JSON schemas.
- Record existing behavior and test results.
- Identify duplication and undocumented assumptions.
- Avoid destructive refactoring before the current behavior is understood.

**Acceptance criteria:** The current catalog still works, existing tests pass, and the migration risks are documented.

### Phase 2 — Establish frontend boundaries

- Keep the public catalog functional.
- Introduce shared application entry points where appropriate.
- Add reusable UI components.
- Define feature-specific services and API modules.
- Prepare the administration page structure.
- Keep demo data separate from future live API data.

**Acceptance criteria:** The public catalog remains functional, and new administration pages can reuse shared modules without duplicating business logic.

### Phase 3 — Establish the backend repository

- Create the independent `inzegane-api` repository.
- Configure FastAPI, Pydantic, SQLAlchemy, and Alembic.
- Define the initial domain models and migrations.
- Add API versioning and OpenAPI documentation.
- Add automated tests for core domain operations.

**Acceptance criteria:** The backend runs independently, database migrations can be applied to a test database, and its initial API contract is documented.

### Phase 4 — Implement the core API

- Add product and supplier operations.
- Add offers and price observations.
- Add inventory operations where required.
- Add server-side validation and protected write operations.
- Define consistent errors and pagination.
- Test important database transactions.

**Acceptance criteria:** Core operations work through the API and cannot bypass backend validation or required permissions.

### Phase 5 — Migrate and integrate data

- Implement the legacy JSON import script.
- Validate record relationships and data quality.
- Connect the frontend to the API.
- Replace live-data dependencies on static JSON gradually.
- Preserve appropriate historical observations.

**Acceptance criteria:** Imported data is reconciled against its source, and the frontend clearly distinguishes live API data from demo data.

### Phase 6 — Administration and deployment

- Complete product, supplier, offer, inventory, and import workflows.
- Add authentication and role-based permissions appropriate to the actual users.
- Configure production database, environment variables, CORS, and backups.
- Deploy frontend and backend independently.
- Add operational checks and document recovery procedures.

**Acceptance criteria:** Authorized users can complete supported workflows, unauthorized writes are rejected, and data recovery and deployment procedures are documented and tested.

## 14. Development Principles

1. Inspect existing code before changing it.
2. Prefer incremental refactoring over wholesale replacement.
3. Keep the frontend independent of the database schema.
4. Keep business rules in the backend when they affect persistent or shared data.
5. Separate products, offers, inventory, and price history.
6. Preserve source provenance and historical observations.
7. Introduce dependencies only when they justify their maintenance cost.
8. Run the relevant tests and production build after each meaningful change.
9. Document actual implementation status honestly.
10. Do not claim that an API, database, authentication system, or administration workflow exists until it has been implemented and verified.

## 15. Documentation

Keep project documentation aligned with the implementation.

The frontend repository should document:

- Architecture and module boundaries.
- Frontend development workflow.
- API configuration and integration.
- UI conventions and accessibility.
- Testing and deployment.

The backend repository should document:

- Architecture and domain model.
- API contract and error formats.
- Database configuration and migrations.
- Authentication and authorization.
- Import formats and data provenance.
- Testing, deployment, backup, and recovery.

Existing files in `Docs/` and `skill/` should be reviewed and updated rather than duplicated without a clear reason.

## 16. Final Architecture Decision

The intended direction is:

- **Frontend:** Open-source HTML, CSS, Vanilla JavaScript ES modules, and Vite in `inzegane-platform`.
- **Backend:** FastAPI, Pydantic, SQLAlchemy, and Alembic in the separate `inzegane-api` repository.
- **API:** Versioned HTTP/JSON endpoints documented with OpenAPI.
- **Data:** A normalized model separating products, suppliers, offers, inventory, and historical prices.
- **Development:** A modular monolith with gradual expansion, automated tests, and explicit migration steps.
- **Integrations:** Small, well-defined adapters that normalize external data without bypassing core business rules.

The immediate next step is to audit the existing code and data model. The target architecture should guide that work, but the implementation must be based on verified existing behavior rather than assumptions about files that have not yet been inspected.
