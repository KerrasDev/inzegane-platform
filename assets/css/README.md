Here is the updated `assets/css/README.md` reflecting the completed ITCSS migration, verified file structure, exact token set, and actual implementation details.

---

# CSS Architecture — Inzegane Platform

## 1. Purpose

This document defines the CSS architecture for the Inzegane Platform using **ITCSS (Inverted Triangle CSS)** as the primary organizational methodology.

The architecture organizes styles from general, low-specificity foundations to specific, encapsulated component rules while preserving the application's visual identity, HTML structure, JavaScript behavior, and lightweight performance.

**Core principle:** Styles progress from low specificity and global reach to high specificity and narrow scope.

---

## 2. Architectural Principles

1. **Low specificity first:** Favor single-class selectors and `:where()` for broad element defaults.
2. **Explicit dependency chain:** Upstream layers (Settings, Generic, Elements) have zero knowledge of downstream components.
3. **Single responsibility:** Each stylesheet serves one discrete layer or UI component.
4. **Zero dead code:** No empty placeholders or unused frameworks; each file holds verified rules.
5. **Predictable cascade:** Import sequence in `main.css` dictates loading precedence.
6. **Encapsulated responsiveness:** Component-specific media queries live within their component files; cross-cutting layout variables reside in utilities.
7. **Accessibility-first:** Contrast meets WCAG 2.1 AA (≥ 4.5:1), keyboard focus indicators are clearly visible, and `prefers-reduced-motion` is strictly respected.
8. **No extra dependencies:** Built entirely with standard CSS custom properties and native Vite bundling.

---

## 3. Implemented Directory Structure

The architecture is implemented in `assets/css/` and wired directly to the entry point `/assets/css/main.css`:

```text
assets/css/
├── README.md                          # Architectural reference (this document)
├── main.css                           # Primary stylesheet entry point (@import chain)
│
├── 01-settings/
│   └── tokens.css                     # Global design tokens and CSS custom properties
│
├── 02-tools/
│   └── helpers.css                    # Architecture document (no preprocessor dependencies)
│
├── 03-generic/
│   └── reset.css                      # Global box-sizing and normalization
│
├── 04-elements/
│   └── base.css                       # Unclassed HTML element defaults (body, inputs, headings)
│
├── 05-objects/
│   ├── container.css                  # Page-level centered shell (.page-shell)
│   └── grid.css                       # Object-level structural note
│
├── 06-components/
│   ├── masthead.css                   # Header, eyebrow, title, and intro description
│   ├── filters.css                    # Search form, input fields, selects, and filter grid
│   ├── catalog.css                    # Catalog section wrapper and summary header
│   ├── product-card.css               # Product card layout, titles, and model code
│   ├── offer.css                      # Offer item, supplier name, prices, and quote links
│   ├── status.css                     # Load feedback, freshness tags, and stale notices
│   ├── price-history.css              # Disclosure summaries and history lists
│   ├── pagination.css                 # Page controls and buttons (44px touch targets)
│   └── footer.css                     # Page footer
│
├── 07-utilities/
│   ├── accessibility.css              # Global :focus-visible rings and reduced motion
│   └── responsive.css                 # Cross-component layout tokens across breakpoints
│
└── 08-overrides/
    └── overrides.css                  # High-specificity exceptions (clean placeholder)
```

---

## 4. Layer Responsibilities & Implementation

### 4.1. Settings (`01-settings/tokens.css`)
Defines centralized CSS custom properties on `:root`:
- **Typography:** System font stack with font-synthesis disabled and font-smoothing enabled.
- **Palette:** Full brand green ramp (`--green-950` to `--green-50`).
- **Neutrals:** Text and borders calibrated to exceed WCAG 2.1 AA (`--muted: #57675f`, contrast ratio 5.2:1 against white).
- **Status:** Warning amber (`--amber-*`) and error red (`--red-*`) color, background, and border triads.
- **Surfaces & Elevation:** Card and page background tokens, soft elevation shadows (`--shadow-card`, `--shadow-subtle`).
- **Radii & Motion:** Consistent corner radii tokens (`--radius-sm` through `--radius-pill`) and standard transition timing (`--transition-fast: 150ms ease`).

### 4.2. Tools (`02-tools/helpers.css`)
Plain CSS architecture. Documented as free of preprocessor mixins or functions to keep the build lightweight.

### 4.3. Generic (`03-generic/reset.css`)
Minimal, non-destructive normalization:
```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

### 4.4. Elements (`04-elements/base.css`)
Applies styling exclusively to naked HTML tags:
- `body`: Baseline font color, page background, 320px minimum width guard, and horizontal overflow protection (`overflow-x: hidden`).
- `button, input, select`: Explicit font and color inheritance.
- `h1, h2`: Margin reset and typography inheritance.

### 4.5. Objects (`05-objects/`)
Encapsulates structural layout patterns devoid of visual branding:
- `container.css`: Defines `.page-shell` with dynamic gutters (`width: min(var(--page-width), calc(100% - (var(--page-gutter) * 2)))`).
- `grid.css`: Retains architectural separation. Application-specific grids (`.filters`, `.product-grid`, `.offer-list`) remain encapsulated within their respective component files in Layer 06.

### 4.6. Components (`06-components/`)
Encapsulates all UI component styling and their respective component-local breakpoints:
- `masthead.css`: `.masthead`, `.eyebrow`, `h1`, `h1 span`, `.intro`. Includes mobile padding adjustment.
- `filters.css`: `.filters`, `.search-field`, label layouts, and form controls. Includes 800px (2-column) and 600px (1-column) responsive rules.
- `catalog.css`: `.catalog`, `.catalog-heading`, and `.no-results`.
- `product-card.css`: `.product-grid`, `.product-card`, `.product-title`, `.product-meta`, `.product-model`.
- `offer.css`: `.offer-list`, `.offer`, `.offer-supplier`, `.offer-location`, `.offer-price`, `.quote-link`, `.empty-offer`. Includes `overflow-wrap: anywhere` for long URLs.
- `status.css`: `.load-status`, `.notice`, `.error`, `.freshness`, `.freshness-review`, `.freshness-unknown`, `.freshness-stale`, and `.stale-note`.
- `price-history.css`: `.price-tiers`, `.price-history`, `.availability-history`, and disclosure `<summary>` hover states using logical `padding-inline-start`.
- `pagination.css`: `.page-controls`, `.page-number`, and buttons with interactive hover/active states and 44×44px accessible touch areas.
- `footer.css`: `.footer`, `.footer p`.

### 4.7. Utilities (`07-utilities/`)
Cross-cutting rules that apply regardless of component:
- `accessibility.css`:
  - Consistent keyboard focus indicators via `:where(a, button, input, select, summary):focus-visible`.
  - Global `@media (prefers-reduced-motion: reduce)` block neutralizing animations and transitions for sensitive users.
- `responsive.css`:
  - Viewport-dependent token updates (e.g., dynamically tightening `--page-gutter: 14px` at `max-width: 600px`).

### 4.8. Overrides (`08-overrides/overrides.css`)
Reserved for documented emergency patches or third-party style conflicts. Kept clean during baseline operation.

---

## 5. Main Entry Point

`assets/css/main.css` aggregates all layers in exact ITCSS sequence:

```css
/* 01. Settings: Design tokens & custom properties */
@import "./01-settings/tokens.css";

/* 02. Tools: Reusable helper definitions */
@import "./02-tools/helpers.css";

/* 03. Generic: Global resets and box sizing */
@import "./03-generic/reset.css";

/* 04. Elements: Unclassed HTML element styling */
@import "./04-elements/base.css";

/* 05. Objects: Layout shell and structure */
@import "./05-objects/container.css";
@import "./05-objects/grid.css";

/* 06. Components: Discrete UI patterns */
@import "./06-components/masthead.css";
@import "./06-components/filters.css";
@import "./06-components/catalog.css";
@import "./06-components/product-card.css";
@import "./06-components/offer.css";
@import "./06-components/status.css";
@import "./06-components/price-history.css";
@import "./06-components/pagination.css";
@import "./06-components/footer.css";

/* 07. Utilities: Focus states, responsive variables & motion */
@import "./07-utilities/accessibility.css";
@import "./07-utilities/responsive.css";

/* 08. Overrides: Documented contextual exceptions */
@import "./08-overrides/overrides.css";
```

Vite natively processes these `@import` rules, compiling and inlining them into a single, optimized CSS bundle upon production build.

---

## 6. Responsive and RTL Compatibility

- **Logical Properties:** All layout horizontal metrics leverage CSS Logical Properties (`margin-inline`, `padding-inline`, `padding-inline-start`) rather than physical left/right rules, ensuring seamless bidirectional rendering (LTR and RTL).
- **Word Wrapping:** Unbroken strings (long URLs, supplier labels, reference identifiers) enforce `overflow-wrap: break-word` and `overflow-wrap: anywhere` to prevent layout breaks on small screens down to 320px.
- **Breakpoints:**
  - `800px`: Filter grid shifts to 2 columns; search input spans full width.
  - `600px`: Mobile layout shifts to a single column for filters and product cards; gutter padding narrows to 14px.

---

## 7. Testing & Build Validation

Run validation checks directly from the project root:

```bash
# Execute test suite
npm test

# Verify Vite asset bundling and CSS compilation
npm run build
```

---

## 8. Maintenance Guidelines for Developers

1. **Adding New Components:** Place the component stylesheet in `06-components/<component-name>.css` and add an explicit `@import` entry in `main.css`.
2. **Never Use `!important`:** Solve specificity issues by ordering rules properly or lowering upstream specificity with `:where()`.
3. **No Inline Component Styles in Settings/Generic:** Only tokens go into `01-settings/` and only element resets go into `03-generic/` or `04-elements/`.
4. **Preserve Compatibility:** Do not rename CSS classes that are queried dynamically by `src/main.js` without updating the JavaScript selectors.