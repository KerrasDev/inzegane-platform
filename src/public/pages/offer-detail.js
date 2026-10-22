/**
 * src/public/pages/offer-detail.js
 * Inzegane Platform — Offer detail (pages/offers/detail.html?id=OFFER_ID).
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { renderSupplierContacts } from '../components/contact-links.js';
import { chip, dataTable, el, emptyMessage, externalLink, factList, link, section } from '../components/dom.js';
import {
  freshnessBadge, freshnessExplanation, pricePrefix, priceText, renderOfferCard, renderQuantityTiers, stockText,
} from '../components/offer-details.js';
import { renderProductImage } from '../components/product-image.js';
import { renderNotFoundState, showDatasetNotice, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { newestFirst } from '../lib/catalog-index.js';
import {
  categoryName, formatDate, formatMoney, humanize, label, productName, readIdFromLocation, routes, safeExternalUrl, supplierName,
} from '../lib/format.js';

mountSiteLayout('offers');

const root = document.querySelector('#page-root');
const status = document.querySelector('#load-status');

function render(offer, catalog) {
  const product = offer.product;
  const supplier = offer.supplier;
  const title = `${productName(product)} — ${supplierName(supplier)}`;
  document.title = `Offer: ${title} · Inzegane Platform`;

  const tiers = renderQuantityTiers(offer);
  const facts = factList([
    [pricePrefix(offer), priceText(offer)],
    ['Price type (as recorded)', label('priceType', offer.price_type)],
    ['Quantity tiers', tiers],
    ['Minimum order', offer.minimum_order_quantity != null ? `${offer.minimum_order_quantity} units` : null],
    ['Stock', stockText(offer)],
    ['Condition', label('condition', offer.condition)],
    ['Warranty (as recorded)', offer.warranty],
    ['Lead time (as recorded)', offer.lead_time],
    ['Supplier SKU', offer.supplier_sku],
    ['Price observed', formatDate(offer.observed_at) ?? 'Unknown'],
    ['Last verified', formatDate(offer.last_verified_at) ?? 'Unknown'],
    ['Verification method', label('verificationMethod', offer.verification_method)],
    ['Confidence (as recorded)', label('confidence', offer.confidence)],
    ['Notes', offer.notes],
  ]);

  const message = `Hello, could you confirm the current price and availability of ${productName(product)}${product.identity?.manufacturer_sku ? ` (${product.identity.manufacturer_sku})` : ''}?`;
  const contacts = renderSupplierContacts(supplier, { message });

  root.replaceChildren(
    renderBreadcrumb([
      { label: 'Home', href: routes.home() },
      { label: 'Offers', href: routes.offers() },
      { label: title },
    ]),
    el('header', { className: 'page-header' }, [
      el('p', { className: 'eyebrow', text: 'Recorded offer' }),
      el('h1', { className: 'page-title', text: productName(product) }),
      el('p', { className: 'page-subtitle' }, ['Offered by ', link(routes.supplier(offer.supplier_id), supplierName(supplier)), supplier.city ? ` · ${supplier.city}` : '']),
    ]),
    el('div', { className: `callout${offer.freshness?.status === 'fresh' ? '' : ' callout--warning'}` }, [
      el('p', {}, [freshnessBadge(offer.freshness), ' ', freshnessExplanation(offer)]),
      el('p', { text: 'A recorded price is what a source documented on a given date. It becomes a currently verified price only after it is reconfirmed with the supplier.' }),
    ]),
    el('div', { className: 'detail-layout content-section' }, [
      el('div', {}, [
        renderProductImage(product, { className: 'product-media product-media--large' }),
        el('p', {}, [link(routes.product(product.product_id), 'View product details', 'card-link')]),
        el('p', { className: 'entity-card__meta', text: [product.brand?.name, categoryName(product.category)].filter(Boolean).join(' · ') }),
      ]),
      el('div', { className: 'detail-panel' }, [
        facts,
        contacts ?? el('p', { className: 'source-note', text: 'No valid contact channel is recorded for this supplier.' }),
      ]),
    ]),
  );

  const history = newestFirst(catalog.priceHistoryByOffer.get(offer.offer_id) ?? [], 'observed_at');
  root.append(section('Price history for this offer', [
    history.length ? dataTable({
      caption: 'Past observations linked to this offer, newest first.',
      columns: ['Observed', 'Price', 'VAT', 'Quantity basis', 'Availability at the time', 'Method', 'Source'],
      rows: history.map((observation) => [
        formatDate(observation.observed_at) ?? 'Unknown',
        formatMoney(observation.unit_price, observation.currency) ?? 'Not recorded',
        label('vat', observation.vat_status),
        humanize(observation.quantity_basis),
        label('availability', observation.availability_status),
        label('verificationMethod', observation.verification_method),
        observation.source?.source_title ?? observation.source?.publisher ?? 'Not recorded',
      ]),
    }) : emptyMessage('No separate price observations are linked to this offer.'),
  ], { id: 'price-history' }));

  const checks = newestFirst(catalog.availabilityChecks.filter((check) => check.product_id === offer.product_id && check.supplier_id === offer.supplier_id), 'checked_at');
  if (checks.length) {
    root.append(section('Availability checks', [dataTable({
      caption: 'Dated stock observations for this product at this supplier.',
      columns: ['Checked', 'Status at check', 'Quantity counted', 'Method', 'Notes'],
      rows: checks.map((check) => [
        formatDate(check.checked_at) ?? 'Unknown',
        label('availability', check.availability_status),
        check.quantity_confirmed == null ? 'Not published' : String(check.quantity_confirmed),
        humanize(check.confirmation_method),
        check.notes ?? '—',
      ]),
    })], { id: 'availability' }));
  }

  if (offer.sources.length) {
    root.append(section('Sources', [el('ul', { className: 'entity-card__list' }, offer.sources.map((source) => {
      const url = safeExternalUrl(source.url);
      return el('li', {}, [
        url ? externalLink(url, source.source_title ?? source.publisher) : (source.source_title ?? source.publisher),
        ` — ${label('sourceType', source.source_type)}`,
        formatDate(source.accessed_at) ? `, accessed ${formatDate(source.accessed_at)}` : '',
        source.evidence_excerpt ? el('p', { className: 'source-note', text: `Excerpt: “${source.evidence_excerpt}”` }) : null,
        chip(`Stated reliability: ${label('reliability', source.reliability)}`),
      ]);
    }))], { id: 'sources' }));
  }

  const others = (catalog.offersByProduct.get(offer.product_id) ?? []).filter((other) => other.offer_id !== offer.offer_id);
  if (others.length) {
    root.append(section('Other recorded offers for this product', [
      el('div', { className: 'offer-grid' }, others.map((other) => renderOfferCard(other, { showSupplier: true }))),
    ], { id: 'other-offers' }));
  }
}

async function start() {
  const id = readIdFromLocation();
  try {
    const catalog = await loadPublicCatalog();
    showDatasetNotice(status, catalog);
    const offer = id ? catalog.offersById.get(id) : null;
    if (!offer) {
      renderNotFoundState(root, {
        heading: 'Offer not found',
        message: id ? 'No offer with this identifier exists in the current catalog.' : 'This link does not include a valid offer identifier.',
        backHref: routes.offers(),
        backLabel: 'Back to offers',
      });
      return;
    }
    render(offer, catalog);
  } catch (error) {
    showLoadError(status, error);
  }
}

void start();
