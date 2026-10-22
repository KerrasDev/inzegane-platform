/**
 * src/public/pages/product-detail.js
 * Inzegane Platform — Product detail page (pages/products/detail.html?id=PRODUCT_ID).
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { chip, dataTable, el, emptyMessage, externalLink, factList, link, section } from '../components/dom.js';
import { renderOfferCard } from '../components/offer-details.js';
import { renderProductCard } from '../components/product-card.js';
import { renderProductImage } from '../components/product-image.js';
import { renderNotFoundState, showDatasetNotice, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { categoryAncestors, offerVerificationTimestamp } from '../lib/catalog-index.js';
import {
  categoryName, formatDate, formatMoney, formatSpecValue, humanize, label, productName,
  readIdFromLocation, routes, safeExternalUrl, supplierName,
} from '../lib/format.js';

mountSiteLayout('products');

const root = document.querySelector('#page-root');
const status = document.querySelector('#load-status');

function relatedProducts(product, catalog) {
  const sameLeaf = catalog.products.filter((candidate) => candidate.product_id !== product.product_id
    && candidate.classification?.category_id === product.classification?.category_id);
  if (sameLeaf.length > 0) return { title: `Other products in ${categoryName(product.category)}`, products: sameLeaf };
  const rootId = product.classification?.category_path?.[0];
  if (!rootId || rootId === product.classification?.category_id) return null;
  const sameRoot = catalog.products.filter((candidate) => candidate.product_id !== product.product_id
    && candidate.classification?.category_path?.[0] === rootId);
  return sameRoot.length > 0
    ? { title: `Other products in ${categoryName(catalog.categoriesById.get(rootId))}`, products: sameRoot }
    : null;
}

function render(product, catalog) {
  const name = productName(product);
  document.title = `${name} · Inzegane Platform`;
  const ancestors = categoryAncestors(product.classification?.category_id, catalog.categoriesById);
  const identity = product.identity ?? {};

  const altNames = el('ul', { className: 'alt-names', attrs: { 'aria-label': 'Other recorded names' } });
  if (identity.product_name_fr && identity.product_name_fr !== name) altNames.append(el('li', { text: identity.product_name_fr, lang: 'fr' }));
  if (identity.product_name_ar) altNames.append(el('li', { text: identity.product_name_ar, lang: 'ar', dir: 'rtl' }));

  const header = el('header', { className: 'page-header' }, [
    el('h1', { className: 'page-title', text: name }),
    el('p', { className: 'page-subtitle' }, [
      product.brand?.name ?? identity.brand_name ?? '',
      product.category ? ' · ' : '',
      product.category ? link(routes.category(product.category.category_id), categoryName(product.category)) : '',
    ]),
    altNames.childElementCount ? altNames : null,
  ]);

  const imageSource = safeExternalUrl(product.media?.image_source_url);
  const media = el('div', {}, [
    renderProductImage(product, { className: 'product-media product-media--large' }),
    product.media?.image_url
      ? el('p', { className: 'source-note' }, [
        'Image as recorded in the dataset',
        product.media.image_license ? ` (${humanize(product.media.image_license)})` : '',
        imageSource ? '. Source: ' : '.',
        imageSource ? externalLink(imageSource, new URL(imageSource).hostname) : '',
      ])
      : null,
  ]);

  const facts = factList([
    ['Brand', product.brand?.name ?? identity.brand_name],
    ['Category', ancestors.length ? el('span', {}, ancestors.flatMap((category, index) => [
      index ? ' › ' : '', link(routes.category(category.category_id), categoryName(category)),
    ])) : null],
    ['Model', identity.manufacturer_model],
    ['Manufacturer SKU', identity.manufacturer_sku],
    ['GTIN', identity.gtin],
    ['Condition', label('condition', product.condition)],
    ['Record status', label('productStatus', product.status)],
    ['Product type', humanize(product.classification?.product_type)],
    ['Availability in Morocco (as recorded)', label('moroccoStatus', product.market_presence?.morocco_status)],
    ['Inezgane presence (as recorded)', label('inzeganeStatus', product.market_presence?.inzegane_status)],
    ['Evidence level', label('evidenceLevel', product.market_presence?.evidence_level)],
    ['Market presence last verified', formatDate(product.market_presence?.last_verified_at)],
    ['Country of manufacture', product.origin?.country_of_manufacture],
  ]);

  root.replaceChildren(
    renderBreadcrumb([
      { label: 'Home', href: routes.home() },
      { label: 'Products', href: routes.products() },
      ...ancestors.map((category) => ({ label: categoryName(category), href: routes.category(category.category_id) })),
      { label: name },
    ]),
    header,
    el('div', { className: 'detail-layout' }, [media, el('div', { className: 'detail-panel' }, [facts])]),
  );

  const offers = [...(product.offers ?? [])].sort((a, b) => offerVerificationTimestamp(b) - offerVerificationTimestamp(a));
  root.append(section(`Recorded supplier offers (${offers.length})`, [
    el('div', { className: 'callout callout--warning' }, [
      el('p', { text: 'Prices below are recorded observations. A price marked "Historical" was last verified outside the freshness window and may no longer be valid. Compare VAT basis (HT/TTC) before comparing amounts.' }),
    ]),
    offers.length
      ? el('div', { className: 'offer-grid' }, offers.map((offer) => renderOfferCard({ ...offer, product }, { showSupplier: true })))
      : emptyMessage('No supplier offers are recorded for this product.'),
  ], { id: 'offers' }));

  if (product.priceHistory?.length) {
    root.append(section('Price history', [
      dataTable({
        caption: 'Historical price observations, newest first. These are past observations, not current prices.',
        columns: ['Observed', 'Supplier', 'Price', 'VAT', 'Quantity basis', 'Price type', 'Source'],
        rows: product.priceHistory.map((observation) => [
          formatDate(observation.observed_at) ?? 'Unknown',
          link(routes.supplier(observation.supplier_id), supplierName(catalog.suppliersById.get(observation.supplier_id))),
          formatMoney(observation.unit_price, observation.currency) ?? 'Not recorded',
          label('vat', observation.vat_status),
          humanize(observation.quantity_basis),
          label('priceType', observation.price_type),
          observation.source?.source_title ?? observation.source?.publisher ?? 'Not recorded',
        ]),
      }),
    ], { id: 'price-history' }));
  }

  if (product.availabilityChecks?.length) {
    root.append(section('Availability checks', [
      dataTable({
        caption: 'Dated stock observations. None of these confirm current availability.',
        columns: ['Checked', 'Supplier', 'Status at check', 'Quantity counted', 'Method', 'Confidence'],
        rows: product.availabilityChecks.map((check) => [
          formatDate(check.checked_at) ?? 'Unknown',
          link(routes.supplier(check.supplier_id), supplierName(catalog.suppliersById.get(check.supplier_id))),
          label('availability', check.availability_status),
          check.quantity_confirmed == null ? 'Not published' : String(check.quantity_confirmed),
          humanize(check.confirmation_method),
          label('confidence', check.confidence),
        ]),
      }),
    ], { id: 'availability' }));
  }

  const specs = Object.entries(product.specifications ?? {});
  if (specs.length) {
    root.append(section('Specifications', [el('div', { className: 'detail-panel' }, [
      factList(specs.map(([key, value]) => [humanize(key), formatSpecValue(value)])),
    ])], { id: 'specifications' }));
  }

  const packaging = factList([
    ['Unit of measure', humanize(product.packaging?.unit_of_measure)],
    ['Units per pack', product.packaging?.units_per_pack ?? null],
    ['Packs per box', product.packaging?.packs_per_box ?? null],
    ['Packs per carton', product.packaging?.packs_per_carton ?? null],
    ['Typical minimum order', product.packaging?.minimum_order_quantity ?? null],
  ]);
  const variants = (product.variants ?? []).map((variant) => formatSpecValue(variant.color ?? variant)).filter(Boolean);
  if (packaging || variants.length) {
    root.append(section('Packaging and variants', [
      packaging ? el('div', { className: 'detail-panel' }, [packaging]) : null,
      variants.length ? el('ul', { className: 'chip-list chip-list--spaced', attrs: { 'aria-label': 'Recorded variants' } }, variants.map((variant) => el('li', {}, [chip(variant)]))) : null,
    ], { id: 'packaging' }));
  }

  const sources = (product.source_ids ?? []).map((id) => catalog.sourcesById.get(id)).filter(Boolean);
  if (sources.length) {
    root.append(section('Sources', [el('ul', { className: 'entity-card__list' }, sources.map((source) => {
      const url = safeExternalUrl(source.url);
      return el('li', {}, [
        url ? externalLink(url, source.source_title ?? source.publisher) : (source.source_title ?? source.publisher),
        ` — ${label('sourceType', source.source_type)}`,
        formatDate(source.accessed_at) ? `, accessed ${formatDate(source.accessed_at)}` : '',
        `, reliability ${label('reliability', source.reliability).toLowerCase()} (as stated by the source record)`,
      ]);
    }))], { id: 'sources' }));
  }

  const related = relatedProducts(product, catalog);
  if (related) {
    root.append(section(related.title, [
      el('div', { className: 'product-grid product-grid--summary' }, related.products.slice(0, 3).map((item) => renderProductCard(item))),
    ], { id: 'related' }));
  }

}

async function start() {
  const id = readIdFromLocation();
  try {
    const catalog = await loadPublicCatalog();
    showDatasetNotice(status, catalog);
    const product = id ? catalog.productsById.get(id) : null;
    if (!product) {
      renderNotFoundState(root, {
        heading: 'Product not found',
        message: id
          ? 'No product with this identifier exists in the current catalog. It may have been removed or the link may be incorrect.'
          : 'This link does not include a valid product identifier.',
        backHref: routes.products(),
        backLabel: 'Back to products',
      });
      return;
    }
    render(product, catalog);
  } catch (error) {
    showLoadError(status, error);
  }
}

void start();
