# Inzegane Platform — Admin Data Export and Static JSON Publishing Plan

**Document:** `docs/plan-05.md`  
**Status:** Proposed implementation plan — not executed  
**Recommended strategy:** Option A — reuse the existing browser-local database and add a validated JSON export package  
**Architectural constraint:** Keep the current static-first Vite multi-page application (MPA). Do not introduce a backend, API, cloud synchronization, direct browser-to-repository writes, or a framework migration.

---

## 1. Goal and Scope

Create the smallest reliable workflow that lets an administrator edit data in the existing admin UI, validate the complete dataset, export it as files compatible with `public/data/`, review and integrate those files into the repository, and verify the result through existing tests and production build checks.

The intended workflow is:

**Edit locally → validate → export → review → manually integrate JSON → test → build → deploy**

The browser export is a downloadable artifact. It does **not** directly modify the repository or publish the website.

### In scope

- Audit and reuse the existing admin CRUD and local persistence behavior.
- Review `DatabaseService`, `LocalDatabaseProvider`, `JsonCatalogProvider`, `RESOURCE_SCHEMAS`, resource relationships, and current validation functions.
- Add a reliable export path for the complete local dataset.
- Validate exported records and cross-resource relationships before creating the package.
- Package the generated resource JSON files into a ZIP archive, subject to the decision gate in Phase 0.
- Provide clear progress, success, and failure feedback in the admin UI.
- Document the operator workflow.
- Add automated tests and validate the exported files through the existing test/build pipeline.

### Out of scope

- Backend database or API.
- Authentication or authorization infrastructure.
- Cloud or multi-device synchronization.
- Direct writes from the browser to the Git repository.
- Automated Git commits, pushes, pull requests, or deployment from the browser.
- Conversion from MPA to SPA or introduction of a new frontend framework.
- Unverified market-data enrichment.
- Automatic creation of price-history records unless explicitly approved.
- CRUD screens for suppliers or offers unless separately approved; the current documented UI may not support these resources.

---

## 2. Verified Context to Reconfirm Before Implementation

The plan is based on the supplied audit summary. The implementation agent must re-open the current files and confirm the details before changing code.

| Finding from the supplied audit | Reported evidence | Required action |
|---|---|---|
| Admin data is stored in browser `localStorage` | `src/data/providers/local-db-provider.js` | Confirm actual storage keys, initialization, read/write behavior, and export shape |
| Public pages read static JSON through `JsonCatalogProvider` | `src/data/database-service.js` | Confirm the public data path and resource filename conventions |
| `LocalDatabaseProvider.exportFullDatabase()` exists for local backup/export | `src/data/providers/local-db-provider.js:201–209` | Reuse it if its output is complete and stable; do not duplicate it unnecessarily |
| `JsonCatalogProvider.exportFullDatabase()` returns `null` | `src/data/providers/json-provider.js:78–88` | Confirm this is intentional and keep the read-only provider read-only unless architecture evidence requires otherwise |
| Schema definitions are available in `RESOURCE_SCHEMAS` | `src/data/resource-schemas.js` | Confirm how every resource is validated and whether cross-resource checks are separate |
| `loadDatabase()` performs validation | `src/database.js:368–371` | Confirm whether this validator can be safely reused for export validation |
| Public data is a historical snapshot and is not independently verified | `docs/STATUS.md` | Preserve provenance and do not present export success as proof of market-data accuracy |
| Some resource types may not have admin CRUD screens | `docs/STATUS.md:114–115` | Do not imply that every resource can currently be edited through the UI |

Line numbers may have changed. Current source code takes precedence over this table.

---

## 3. Delivery Principles

1. **Read before changing:** inspect `AGENTS.md`, `README.md`, `docs/STATUS.md`, `docs/plan-02.md`, and relevant data-layer source files.
2. **Preserve existing user work:** inspect Git branch, working-tree status, tracked diff, and untracked files before implementation.
3. **One source of export truth:** reuse the existing local database export method if it meets the requirements.
4. **Validate before packaging:** never produce a “successful” export if any required resource is missing or invalid.
5. **No silent data loss:** preserve required records, IDs, relationships, and supported metadata.
6. **No automatic publishing:** export, repository integration, build, and deployment remain distinct steps.
7. **No unsupported claims:** a valid JSON file is not necessarily semantically correct or factually current.
8. **Small, testable changes:** implement one phase at a time and run focused tests after each meaningful change.
9. **No hidden architectural expansion:** do not add a backend, cloud service, Git integration, or framework.
10. **Fail safely:** if validation or packaging fails, show an actionable error and do not present a partial archive as complete.

---

# 4. Implementation Roadmap

## Phase 0 — Repository Reconnaissance and Decision Lock

**Purpose:** Establish the actual implementation baseline and resolve decisions that affect data integrity or export format.

### 0.1 Read project instructions and documentation

- Read `AGENTS.md`, if present..
- Inspect the current data architecture and existing tests.
- Locate the intended path for this plan and confirm that `docs/plan-05.md` is the target document.

**Deliverable:** A concise implementation baseline recorded in the task notes or implementation report.

### 0.2 Inspect Git state and protect existing changes

- Record the current branch and commit.
- Run a read-only Git status and inspect relevant diffs.
- Identify untracked files that must not be overwritten.
- Do not reset, clean, stash, revert, switch branches, or commit.

**Acceptance criteria:**
- Existing user changes are identified.
- No unrelated file is overwritten.
- The implementation scope is explicit.

### 0.3 Trace the current data flow

Inspect and document:

- Admin controller → `dbService` → `LocalDatabaseProvider` → `localStorage`.
- Public controller → `catalogDataService` → `JsonCatalogProvider` → `public/data/*.json`.
- Existing export method and its returned object shape.
- Schema validation, relationship validation, and ID conventions.
- Existing resource names, filenames, and metadata conventions.
- Existing tests that validate JSON resources.

**Acceptance criteria:**
- The export data shape and public file format are understood.
- No assumption is made that the browser-local dataset is automatically synchronized with public files.

### 0.4 Resolve the export format

**Provisional default:** one ZIP archive containing one JSON file per supported resource, with filenames matching the established `public/data/` convention.

Confirm:
- Whether ZIP is required or a single JSON backup would suffice.
- Whether the ZIP should contain only resource JSON files or also a manifest/readme.
- Whether metadata should be included and, if so, which fields are authoritative.
- Whether the exported structure matches the existing public JSON structure exactly.

**Decision gate:** Do not start the ZIP implementation until the archive contract is defined. If the owner has not provided a different preference, use the ZIP package as the proposed default because it fits the supplied plan.

### 0.5 Resolve policy questions

Record decisions or explicitly leave them as blockers:

- Is automatic price-history creation required when a product price changes?
- Are suppliers and offers expected to be editable now, or merely included in an export if already present?
- Should export include all known resource collections, including empty ones?
- Is `manifest.json` already part of the data contract, or would adding one change the contract?
- What should happen if an optional resource is missing?
- Should a warning be shown when data is old or lacks independent verification?

**Phase 0 exit criteria:** Actual architecture confirmed, working tree protected, export contract defined, and unresolved business rules recorded.

---

## Phase 1 — Export Contract and Data-Integrity Rules

**Purpose:** Define exactly what a valid export means before implementing the UI.

### 1.1 Define the canonical export payload

- Enumerate the resource collections supported by the current data layer.
- Define the expected key/collection names and the output filename for each resource.
- Reuse the current `exportFullDatabase()` result where compatible.
- Avoid inventing new field names or silently transforming existing records.
- Decide how database metadata, snapshot dates, and provenance are represented.

**Deliverable:** A documented mapping between local database collections and exported JSON files.

### 1.2 Define required and optional resources

For each resource, specify:
- required or optional status;
- expected data type and top-level structure;
- empty-collection behavior;
- schema validator;
- cross-resource references;
- output filename.

Use the current project schema and conventions as the source of truth.

### 1.3 Define validation layers

Validation must distinguish at least:

1. **Serialization validity:** the payload can be serialized to JSON.
2. **Shape validation:** each resource has the expected top-level structure.
3. **Field validation:** each record satisfies `RESOURCE_SCHEMAS`.
4. **Relationship validation:** referenced product, brand, category, supplier, offer, or other IDs exist where required.
5. **Identifier integrity:** no prohibited duplicate or missing IDs.
6. **Domain consistency:** supported constraints such as valid dates, prices, availability, and enumerated status values.
7. **Export completeness:** every required resource is present in the output.
8. **Public-file compatibility:** generated files match the format consumed by `JsonCatalogProvider` and the current test suite.

Do not assume one existing validator covers all eight layers. Reuse validators where appropriate and add only the missing validation logic.

### 1.4 Define validation error reporting

Every validation issue should identify, where possible:
- resource;
- record ID or array index;
- field or relationship;
- concise reason;
- severity;
- whether export is blocked.

Blocking errors must prevent archive creation. Non-blocking warnings must be clearly distinguished and must not be disguised as successful validation.

**Phase 1 exit criteria:** Export contract, resource mapping, validation rules, and error model are defined and reviewable.

---

## Phase 2 — Reliable Local Database Snapshot

**Purpose:** Obtain a consistent snapshot from the existing browser-local database without changing the public data provider.

### 2.1 Review `LocalDatabaseProvider.exportFullDatabase()`

- Confirm whether it exports all resource collections.
- Confirm whether returned values are detached copies or references to mutable in-memory objects.
- Confirm behavior when storage is missing, malformed, or inaccessible.
- Confirm how seed data and stored overrides are combined.
- Confirm whether metadata is included and whether its semantics are stable.
- Confirm how exceptions are handled.

### 2.2 Reuse or minimally correct the existing export method

- Reuse the existing method if it already produces a complete, deterministic payload.
- If it is incomplete, make the smallest necessary correction.
- Avoid implementing a second, competing export method with a different contract.
- Keep export read-only: it must not mutate local data as a side effect.

### 2.3 Handle storage failures safely

Account for:
- unavailable or disabled `localStorage`;
- malformed JSON;
- missing collections;
- quota or access errors where relevant;
- stale or partially initialized local data;
- unexpected data types.

Show a useful error and stop export when the dataset cannot be trusted.

### 2.4 Ensure snapshot consistency

- Take one snapshot for the entire export operation.
- Validate and serialize that same snapshot.
- Avoid reading different collections at different times if the resulting archive could be inconsistent.
- If the app can be edited in another tab, determine whether a consistency check is necessary. Do not add cross-tab synchronization unless justified.

**Tests:** complete payload, missing data, malformed storage, inaccessible storage where mockable, and proof that export does not mutate the stored data.

**Phase 2 exit criteria:** A complete, stable, read-only snapshot is available to the validation and packaging layers.

---

## Phase 3 — Whole-Dataset Validation

**Purpose:** Prevent invalid or incomplete local data from being packaged as publishable JSON.

### 3.1 Integrate existing schema validation

- Reuse `RESOURCE_SCHEMAS` and existing validation utilities.
- Confirm that every exported resource has an applicable validator.
- Avoid duplicating schema definitions in the export controller.
- If a resource lacks a schema, report the gap and agree on the smallest safe response before treating that resource as publishable.

### 3.2 Validate cross-resource integrity

- Validate references across the complete snapshot.
- Check duplicate identifiers where prohibited.
- Verify required references and allowed nullable references according to current contracts.
- Ensure validation order does not cause misleading failures when resources refer to each other.

### 3.3 Validate domain-specific constraints

- Validate price and availability values according to existing rules.
- Validate date formats and ordering where the schema requires it.
- Preserve existing `price_history` entries.
- Do not invent historical observations or automatically modify price history unless explicitly approved.
- Preserve provenance and historical snapshot dates.

### 3.4 Return a structured validation result

The validation layer should produce a structured result containing:
- success/failure;
- errors;
- warnings;
- counts by resource;
- records checked;
- any resource skipped, with reason.

Avoid logging full datasets or sensitive values unnecessarily.

### 3.5 Block export on critical errors

- Do not generate a final ZIP when required resources or blocking validations fail.
- Keep warnings visible.
- Provide enough detail for the operator to correct data in the existing UI or request a separate workflow.

**Phase 3 exit criteria:** Valid and invalid fixtures produce predictable results, and critical validation failures prevent packaging.

---

## Phase 4 — JSON Serialization and ZIP Packaging

**Purpose:** Produce an archive that can be safely reviewed and integrated into `public/data/`.

### 4.1 Select the ZIP implementation

- Check whether a ZIP dependency already exists.
- If not, evaluate a small, browser-compatible library and its bundle-size, maintenance, license, and security implications.
- Do not install or add a dependency without confirming it is necessary and permitted.
- If ZIP is not approved, use the format selected in Phase 0.

### 4.2 Define archive layout

Proposed layout, subject to confirmation:

```text
inzegane-data-export-YYYY-MM-DD.zip
├── products.json
├── brands.json
├── categories.json
├── offers.json
├── suppliers.json
├── price-history.json
├── availability-checks.json
├── sources.json
├── schema.json
└── database-metadata.json
```

Use the repository's actual filenames and resource list, not this illustrative list, if they differ. Do not include a `manifest.json` unless it is part of the agreed contract.

### 4.3 Serialize deterministically

- Serialize UTF-8 JSON while preserving Arabic and French text.
- Use consistent indentation for human review.
- Ensure filenames match existing project conventions.
- Avoid adding fields, changing identifiers, or reordering semantically meaningful data without a requirement.
- Make the export reproducible where practical, excluding nondeterministic timestamps from resource data unless required.

### 4.4 Generate the ZIP only after validation

- Serialize all required resources.
- Confirm every generated file parses as JSON.
- Create the ZIP from the validated serialized files.
- Use an appropriate MIME type and filename.
- Revoke temporary object URLs after download where applicable.
- Handle failures without displaying a false success state.

### 4.5 Define download and failure behavior

The UI should:
- indicate that validation is in progress;
- prevent duplicate export actions while running;
- display a success message only after the archive has been generated and download initiated;
- display validation errors and packaging failures clearly;
- avoid leaving the page in a permanent loading state;
- never describe a downloaded archive as already published.

**Phase 4 exit criteria:** A valid dataset produces a readable ZIP containing the expected JSON files; invalid data cannot produce a misleading “successful export.”

---

## Phase 5 — Admin UI Integration

**Purpose:** Make export discoverable and understandable without redesigning the admin architecture.

### 5.1 Choose the export UI location

- Inspect existing admin navigation and shared layout.
- Place the export action in the most appropriate existing admin page or a small dedicated exports page.
- Reuse existing CSS conventions and shared UI components.
- Do not introduce a new framework or route system.

### 5.2 Implement the export controller

A proposed file is `src/admin/controllers/exports-controller.js`, but first confirm current controller naming and initialization conventions.

The controller should:
1. invoke the data snapshot operation;
2. run complete validation;
3. stop and show errors if validation fails;
4. serialize the validated snapshot;
5. create the ZIP;
6. initiate the download;
7. report success or failure.

Keep data access and validation logic out of large DOM event handlers where the existing architecture supports separation.

### 5.3 Add accessible status and error feedback

- Use visible labels and descriptive button text.
- Make validation results understandable.
- Support keyboard operation and visible focus.
- Use an appropriate live region for asynchronous status updates.
- Do not communicate errors through color alone.
- Ensure the UI works at narrow widths and with long Arabic/French strings.

### 5.4 Clarify the local-only workflow

Display a concise explanation that:
- admin edits are stored in this browser's local storage;
- the ZIP is a local download;
- downloading does not update the public site or repository;
- the exported files must be reviewed and integrated manually before rebuilding and deploying.

### 5.5 Avoid implying unsupported CRUD capabilities

Do not claim that users can edit suppliers, offers, or other resources through the UI unless the current UI actually supports those operations. The export may include collections that have no dedicated editor, but that must be explained.

**Phase 5 exit criteria:** The export workflow is accessible, understandable, keyboard-usable, and accurately describes what has and has not been published.

---

## Phase 6 — Automated Tests and Export Validation

**Purpose:** Prove that the export is complete, valid, compatible, and safe to fail.

### 6.1 Unit tests for snapshot export

Cover:
- all supported resource collections are included;
- expected output shape and metadata;
- no mutation of the stored dataset;
- missing or malformed data;
- deterministic output where required.

### 6.2 Unit tests for validation

Cover:
- valid full dataset;
- missing required resource;
- invalid field;
- invalid or duplicate identifier where prohibited;
- broken cross-resource reference;
- malformed date or commercial value where prohibited;
- empty optional collection;
- warning-only cases;
- multiple errors returned in one run.

### 6.3 Tests for serialization and ZIP creation

Cover:
- every expected file is present;
- each file parses as JSON;
- UTF-8 Arabic and French strings are preserved;
- filenames match the agreed mapping;
- ZIP generation failure is handled;
- validation failure prevents ZIP creation;
- temporary resources are cleaned up where testable.

### 6.4 End-to-end or integration coverage

Using the project's existing test approach:
- trigger the export workflow;
- verify success and error UI states;
- verify duplicate clicks are controlled;
- verify the export does not mutate local storage;
- verify that download initiation is attempted only after successful validation.

Do not introduce a heavy browser test framework without a separate decision.

### 6.5 Validate exported JSON against the public data contract

Add or reuse a test path that can validate the extracted export files against the same resource schemas and public-data invariants used by the project.

Avoid a tautological test that only validates output with the same incorrect transformation that generated it. Include fixtures or assertions that independently verify key invariants.

**Phase 6 exit criteria:** Export, validation, packaging, and failure paths are covered by automated tests; existing tests remain green.

---

## Phase 7 — Manual Repository Integration and Static Publication

**Purpose:** Establish a safe, explicit path from a downloaded archive to the public static dataset.

### 7.1 Extract to a temporary review directory

- Never extract an export directly over `public/data/` as the first step.
- Extract the ZIP into a temporary directory.
- Inspect filenames, resource counts, and changes.
- Confirm the archive contains only expected files.
- Do not execute content from the archive.

### 7.2 Compare exported files with current public data

- Compare each exported resource with its counterpart in `public/data/`.
- Identify additions, deletions, modifications, and unexpected omissions.
- Review changes to IDs, relationships, prices, availability, sources, and metadata.
- Verify provenance and dates.
- Do not assume that a valid export contains independently verified market data.

### 7.3 Integrate the reviewed JSON manually

- Copy only reviewed, expected JSON files into `public/data/`.
- Preserve unrelated files and existing user changes.
- Inspect the Git diff after integration.
- Do not overwrite source files, configuration, or documentation as part of data import.
- Do not automate Git writes from the browser.

### 7.4 Run project validation

Use existing commands confirmed in `package.json`, for example:
- the project test script;
- lint, if available;
- production build.

Do not assume command names or expected test counts until the current scripts are inspected.

### 7.5 Verify production output

- Confirm expected JSON files are present in the build output.
- Confirm public pages can load the data using the existing JSON provider.
- Check for console errors and failed data requests where a browser is available.
- Confirm the static site still builds and that unrelated routes/assets remain intact.

### 7.6 Deploy through the existing process

- Follow the repository's actual deployment documentation.
- Do not assume Netlify, GitHub Pages, or any other host unless verified.
- Keep deployment separate from browser export and local integration.

**Phase 7 exit criteria:** Reviewed JSON is integrated into the repository, tests and build pass, and the public site consumes the new static files correctly.

---

## Phase 8 — Operator Documentation

**Purpose:** Ensure an operator can safely complete the workflow without confusing local edits, export, and publication.

### 8.1 Create or update the operator guide

Proposed file: `docs/operator-guide.md`.

Document:
- where admin edits are stored;
- how to review and correct validation errors;
- how to generate an export;
- what the ZIP contains;
- how to extract and review files;
- how to compare files with `public/data/`;
- how to run tests and build;
- how to integrate reviewed files;
- how to deploy using the existing deployment process;
- how to restore data from a previous export, if restoration is supported and tested.

### 8.2 Document important limitations

Explicitly explain:
- localStorage is browser- and origin-specific;
- local changes are not automatically shared across devices;
- local changes do not update the public JSON;
- exported data may be stale or unverified;
- resources without admin editors cannot be assumed to be editable;
- export validation checks structural and domain constraints, not the factual accuracy of prices or supplier information.

### 8.3 Document recovery and troubleshooting

Include instructions for:
- export validation failure;
- malformed local data;
- incomplete archive;
- JSON parse errors;
- failed tests or build;
- unexpected diff;
- restoring from a known-good backup.

**Phase 8 exit criteria:** The guide accurately matches the implemented behavior and has been checked against the real workflow.

---

## Phase 9 — CI Integration, Final Verification, and Handover

**Purpose:** Make the repository's existing automated checks protect the static-data contract without creating an automatic publishing pipeline.

### 9.1 Integrate with existing CI

- Inspect current CI workflows before modifying them.
- Ensure the existing test/build pipeline validates committed JSON files.
- Add an export-validation test only if it fits the existing architecture and tooling.
- Do not introduce a new CI provider or workflow system without approval.
- Do not attempt to make CI read browser localStorage; it cannot access an operator's browser-local dataset.

**Important distinction:** CI can validate JSON after reviewed files have been integrated into the repository. It cannot validate a ZIP that remains only on the user's computer unless that artifact is deliberately supplied to a separate process.

### 9.2 Run final checks

Run the actual project scripts after confirming their names:
- tests;
- lint;
- production build.

Record exact commands, results, failures, and any unavailable checks. Do not claim success for a command that was not run.

### 9.3 Inspect the final diff and Git status

- Confirm only approved implementation files changed.
- Confirm public data changes are intentional and reviewed.
- Confirm no export archive, local backup, temporary file, secret, or unrelated user file was accidentally added.
- Do not commit or push unless separately authorized.

### 9.4 Handover report

Summarize:
- implemented behavior;
- files changed;
- export format and archive contents;
- validation layers;
- test/build results;
- manual steps still required;
- known limitations;
- unresolved decisions;
- rollback instructions.

**Phase 9 exit criteria:** Automated checks pass, the diff is reviewed, the operator guide is accurate, and remaining manual steps are explicit.

---

# 5. Cross-Phase Technical Requirements

## 5.1 Preserve the current architecture

- Keep the MPA and vanilla JavaScript.
- Keep public pages on the static JSON provider.
- Keep admin persistence local unless a separately approved architecture change is made.
- Do not add an API, database, cloud sync, or direct Git integration.
- Do not turn export into an implicit publishing action.

## 5.2 Preserve data contracts

- Reuse `RESOURCE_SCHEMAS` and existing validators.
- Preserve IDs, field names, resource relationships, and filename conventions.
- Avoid unrequested data normalization or schema migrations.
- Do not invent missing records or silently drop unknown fields.
- Report unsupported or malformed fields explicitly.

## 5.3 Price history and provenance

- Preserve existing `price_history` records in the export.
- Do not generate historical price observations automatically unless the owner approves the semantics and requirements.
- Do not fabricate timestamps or source references.
- Keep historical snapshot dates and verification status accurate.
- Treat schema validity and factual correctness as separate concerns.

## 5.4 Error handling

- Fail closed when required data is invalid or incomplete.
- Never display success before validation and package creation have succeeded.
- Do not silently omit a resource.
- Provide actionable, non-sensitive error details.
- Avoid logging the entire dataset in the console.

## 5.5 Performance and maintainability

- Keep the export path lazy-loaded if it introduces a meaningful ZIP-library cost to pages that do not use it.
- Avoid loading export-only code on every public page.
- Measure bundle impact if a new dependency is added.
- Prefer existing project patterns over a new abstraction without a demonstrated need.

---

# 6. Acceptance Criteria

The work is complete only when all applicable criteria below are met.

## Functional

- [ ] The operator can trigger export from the admin UI.
- [ ] The export uses a single consistent snapshot.
- [ ] Every required resource is included.
- [ ] Output filenames and data shapes match the agreed public-data contract.
- [ ] The archive can be opened and contains valid JSON files.
- [ ] Arabic and French text survive export without corruption.
- [ ] A failed validation blocks export.
- [ ] The UI clearly distinguishes local export from public publication.

## Data integrity

- [ ] Every exported resource passes its applicable schema validation.
- [ ] Cross-resource references are checked.
- [ ] Required identifiers and domain invariants are checked.
- [ ] No record is silently omitted.
- [ ] Existing price history and provenance are preserved.
- [ ] Export does not mutate localStorage.
- [ ] Missing or malformed required data causes a clear failure.

## Quality

- [ ] Tests cover success and failure paths.
- [ ] Existing tests pass.
- [ ] Lint passes if the project defines it.
- [ ] Production build succeeds.
- [ ] Public pages still read from `public/data/`.
- [ ] The operator guide matches the actual implementation.
- [ ] The final Git diff contains no unrelated changes.

## Operational

- [ ] The archive is manually reviewed before repository integration.
- [ ] CI validates the committed JSON through the existing pipeline.
- [ ] Deployment follows the existing documented process.
- [ ] No direct browser-to-repository write or automatic publish was added.
- [ ] Remaining limitations and owner decisions are documented.

---

# 7. Risks and Rollback

| Risk | Mitigation | Rollback |
|---|---|---|
| Export omits a resource | Explicit resource registry and completeness checks | Disable export UI and fix mapping |
| Invalid data is packaged | Whole-dataset validation before serialization | Reject archive; correct data or validator |
| ZIP library increases bundle size | Load export code only where needed and measure build output | Remove dependency and use an approved alternative |
| Export shape differs from public JSON | Contract tests and comparison against current files | Revert export mapping and regenerate |
| Stale or unverified market data is published | Preserve provenance; require manual review | Restore last known-good JSON files |
| Price history is altered incorrectly | Preserve existing history; no automatic generation without approval | Restore prior history file and re-run validation |
| Operator assumes ZIP publishes the site | Explicit UI copy and operator guide | Correct UI/documentation before release |
| Unexpected repository changes | Inspect status/diff before and after integration | Restore only the specific changes introduced by this task; never reset unrelated work |
| CI assumes it can access browser storage | Validate only repository files or explicitly supplied artifacts | Remove the invalid assumption and retain repository-level validation |

---

# 8. Suggested Work Breakdown and Dependency Order

| Order | Phase | Main output | Depends on |
|---:|---|---|---|
| 1 | Phase 0 — Reconnaissance and decisions | Confirmed architecture and export contract decisions | None |
| 2 | Phase 1 — Export contract | Resource map and validation requirements | Phase 0 |
| 3 | Phase 2 — Snapshot export | Stable local database snapshot | Phases 0–1 |
| 4 | Phase 3 — Validation | Whole-dataset validation result | Phases 1–2 |
| 5 | Phase 4 — ZIP packaging | Valid downloadable archive | Phases 1–3 |
| 6 | Phase 5 — Admin UI | Accessible export workflow | Phases 2–4 |
| 7 | Phase 6 — Automated tests | Regression and contract coverage | Phases 2–5 |
| 8 | Phase 7 — Manual integration | Validated static JSON update procedure | Phases 1, 3, 6 |
| 9 | Phase 8 — Operator guide | Documented operating procedure | Phases 5–7 |
| 10 | Phase 9 — CI and handover | Verified final state and implementation report | Phases 6–8 |

The phases may be split into smaller pull requests or reviewable commits if authorized, but each phase must retain a clear acceptance gate. Do not commit or push without explicit permission.

---

# 9. Decisions Required Before or During Implementation

| Decision | Provisional recommendation | Why it matters |
|---|---|---|
| ZIP or single JSON file? | ZIP containing one file per resource | Matches the proposed multi-resource publishing workflow |
| Include a manifest? | No, unless an existing contract requires it | Avoids introducing an unneeded data contract |
| Automatically create price history? | No, not without explicit approval | Historical observations need reliable semantics and timestamps |
| Include resources without editor screens? | Include existing collections in the export; do not imply they are editable | Completeness and editing capability are separate |
| Automatically publish from browser? | No | Browser cannot safely write to the repository under the current architecture |
| Add a backend or Git integration? | No | Explicitly outside scope |
| Add a new ZIP dependency? | Only if no suitable existing capability exists and its cost is acceptable | Avoid unnecessary bundle and maintenance cost |
| How should stale data be handled? | Preserve provenance and show a warning; do not silently relabel it current | Structural validation does not prove factual freshness |
| What can CI validate? | Committed JSON and any explicitly provided artifact | CI cannot directly inspect the operator's localStorage |

---

# 10. Final Implementation Instruction

Implement the phases in order, beginning with repository reconnaissance and the decisions in Phase 0. Verify the supplied audit findings against the current repository before relying on them. Make only the smallest changes necessary to deliver the approved export workflow.

**Do not implement direct publishing, backend infrastructure, cloud synchronization, or automatic price-history generation. Do not overwrite pre-existing user work. Do not claim tests, builds, or browser behavior were verified unless they were actually run and their results recorded.**

At completion, provide a concise handover report with changed files, actual test/build outputs, export format, validation coverage, manual integration steps, unresolved decisions, and rollback instructions.
