# Inzegane Platform

A web project built with HTML, CSS, JavaScript, and Vite. This document describes the current repository structure, the purpose of its main directories and files, and the existing organization of the codebase.

## 1. Project Structure

```text
inzegane-platform/
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
├── assets/
│   ├── css/
│   │   ├── 01-settings/
│   │   ├── 02-tools/
│   │   ├── 03-generic/
│   │   ├── 04-elements/
│   │   ├── 05-objects/
│   │   ├── 06-components/
│   │   ├── 07-utilities/
│   │   ├── 08-overrides/
│   │   ├── main.css
│   │   └── README.md
│   ├── images/
│   └── js/
├── data/
├── docs/
│   ├── database-01.md
│   └── report-01.md
├── index.html
├── public/
│   └── data/
│       ├── availability-checks.json
│       ├── brands.json
│       ├── categories.json
│       ├── database-metadata.json
│       ├── offers.json
│       ├── price-history.json
│       ├── products.json
│       ├── research-summary.json
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
|   ├──admin.js
│   └── main.js
├── tests/
│   └── database.test.js
├── README.md
├── package.json
└── package-lock.json
```

## 2. Root Directory

| Path | Purpose |
|---|---|
| `index.html` | Main HTML entry point for the website. |
| `package.json` | Project metadata, npm scripts, and declared dependencies. |
| `package-lock.json` | Records the resolved npm dependency tree. |
| `README.md` | Main project documentation. |

## 3. Administration Pages — `admin/`

The `admin/` directory contains the HTML page structure for administration-related sections.

| Path | Intended page |
|---|---|
| `admin/index.html` | Administration entry page. |
| `admin/products/index.html` | Product listing page. |
| `admin/products/new.html` | New product form page. |
| `admin/products/edit.html` | Product editing page. |
| `admin/suppliers/index.html` | Supplier listing page. |
| `admin/suppliers/new.html` | New supplier form page. |
| `admin/offers/index.html` | Offers page. |
| `admin/inventory/index.html` | Inventory page. |
| `admin/price-history/index.html` | Price history page. |
| `admin/imports/` | Directory reserved for import-related pages; currently empty. |

These paths describe the current file organization. The presence of an HTML file does not necessarily mean that the corresponding page is fully implemented.

## 4. Static Assets — `assets/`

This directory groups static resources used by the website.

### CSS — `assets/css/`

The CSS directory follows a numbered, layered organization:

| Directory | Organizational role |
|---|---|
| `01-settings/` | Settings and design variables. |
| `02-tools/` | Reusable CSS tools and mixins, where applicable. |
| `03-generic/` | Generic styles and foundational rules. |
| `04-elements/` | Base HTML element styles. |
| `05-objects/` | Structural layout patterns. |
| `06-components/` | Reusable interface components. |
| `07-utilities/` | Utility classes. |
| `08-overrides/` | Explicit style overrides. |

These descriptions represent the intended roles suggested by the directory names; their exact contents should be checked in the corresponding files.

- `main.css` is the main CSS file.
- `README.md` documents the CSS organization.

### Other assets

- `assets/images/`: images and other visual resources.
- `assets/js/`: directory for JavaScript assets; its current contents are not shown in the reported tree.

## 5. Application Code — `src/`

The `src/` directory contains the existing JavaScript modules.

| File | Role indicated by its name |
|---|---|
| `main.js` | Main application JavaScript module. |
| `catalog-search.js` | Catalog search functionality. |
| `database.js` | Database-related or data-access functionality. |

The exact responsibilities and dependencies of these modules should be determined by inspecting their source code rather than inferred from filenames alone.

## 6. Data Files

### Static JSON — `public/data/`

The `public/data/` directory contains JSON files organized by subject.

| File | Subject |
|---|---|
| `products.json` | Product records. |
| `brands.json` | Brand records. |
| `categories.json` | Product categories. |
| `suppliers.json` | Supplier records. |
| `offers.json` | Offer records. |
| `price-history.json` | Historical price information. |
| `availability-checks.json` | Availability checks. |
| `sources.json` | Data sources. |
| `database-metadata.json` | Database-related metadata. |
| `research-summary.json` | Research summary information. |
| `schema.json` | Data schema information. |

Files under `public/` are generally served as static assets by the development server or build output. Their presence does not establish whether the data is also used elsewhere or how it is processed.

### `data/`

The `data/` directory exists at the project root. Its contents are not shown in the current directory listing.

## 7. Documentation

### `docs/`

Contains project documentation:

- `database-01.md`
- `report-01.md`

### `skill/`

Contains project-specific guidance and technical references:

| File | Subject indicated by its name |
|---|---|
| `SKILL.md` | Main skill documentation. |
| `architecture.md` | Architecture documentation. |
| `codebase-map.md` | Codebase organization. |
| `coding-conventions.md` | Coding conventions. |
| `data-model.md` | Data model documentation. |
| `dependencies-and-integrations.md` | Dependencies and integrations. |
| `development-workflow.md` | Development workflow. |
| `known-limitations.md` | Known limitations. |
| `search-and-facets.md` | Search and filtering. |
| `testing-and-validation.md` | Testing and validation. |

The contents of these files should be treated as the detailed reference for their respective topics.

## 8. Tests — `tests/`

The current tree contains:

```text
tests/
└── database.test.js
```

This file is the existing database-related test module. Its coverage and test framework should be verified by inspecting the file and the test scripts in `package.json`.

## 9. Naming Conventions

The current project follows these general naming patterns:

- Lowercase directory names, such as `admin/`, `assets/`, `docs/`, `public/`, `src/`, and `tests/`.
- Hyphen-separated names for compound files and directories, such as `catalog-search.js` and `price-history/`.
- Descriptive HTML page names, such as `index.html`, `new.html`, and `edit.html`.
- Conventional filenames required by tools, such as `package.json`, `package-lock.json`, and `README.md`.
- Numbered CSS layer directories to communicate ordering.

New files should follow the established conventions unless a tool or existing project requirement specifies otherwise.

## 10. Development Notes

- Preserve the existing public entry point while working on the project.
- Inspect the current implementation before changing module responsibilities.
- Update references when renaming files, especially JSON paths used by JavaScript.
- Keep documentation synchronized with the actual repository.
- Run the scripts defined in `package.json` when validating changes.
- Distinguish existing files from implemented functionality.

## 11. Current Scope

This README documents the repository structure visible in the current project tree. It does not claim that all administration pages are functional, that every JSON file is actively consumed, or that all documented architectural responsibilities have been implemented.

For more detailed information, consult the documentation under `docs/` and `skill/`, along with the source code and tests.