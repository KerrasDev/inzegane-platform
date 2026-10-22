/**
 * src/public/pages/supplier-detail.js
 * Inzegane Platform — Supplier detail (pages/suppliers/detail.html?id=SUPPLIER_ID).
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { renderSupplierContacts } from '../components/contact-links.js';
import { chip, dataTable, el, emptyMessage, externalLink, factList, link, section } from '../components/dom.js';
import { freshnessBadge, priceText } from '../components/offer-details.js';
import { renderNotFoundState, showDatasetNotice, showLoadError } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { newestFirst, offerVerificationTimestamp } from '../lib/catalog-index.js';
import {
  categoryName, formatDate, humanize, label, productName, readIdFromLocation, routes, safeExternalUrl, supplierName,
} from '../lib/format.js';

mountSiteLayout('suppliers');

const root = document.querySelector('#page-root');
const status = document.querySelector('#load-status');

function render(supplier, catalog) {
  const name = supplierName(supplier);
  document.title = `${name} · Suppliers · Inzegane Platform`;
  const offers = [...(catalog.offersBySupplier.get(supplier.supplier_id) ?? [])]
    .sort((a, b) => offerVerificationTimestamp(b) - offerVerificationTimestamp(a));
  const verified = formatDate(supplier.last_verified_at);
  const ageDays = Number.isFinite(Date.parse(supplier.last_verified_at ?? ''))
    ? Math.floor((Date.now() - Date.parse(supplier.last_verified_at)) / 86_400_000)
    : null;

  const altNames = el('ul', { className: 'alt-names', attrs: { 'aria-label': 'Other recorded names' } });
  if (supplier.business_name_fr && supplier.business_name_fr !== name) altNames.append(el('li', { text: supplier.business_name_fr, lang: 'fr' }));
  if (supplier.business_name_ar) altNames.append(el('li', { text: supplier.business_name_ar, lang: 'ar', dir: 'rtl' }));

  const categories = (supplier.supplier_categories ?? []).map((id) => catalog.categoriesById.get(id)).filter(Boolean);
  const facts = factList([
    ['Business type', label('businessType', supplier.business_type)],
    ['Wholesale status (as recorded)', label('wholesaleStatus', supplier.wholesale_status)],
    ['Business verification', label('businessVerification', supplier.business_verification)],
    ['City', supplier.city],
    ['Locality', supplier.locality],
    ['Address (as recorded)', supplier.address],
    ['Minimum order policy', supplier.minimum_order_policy],
    ['Delivery coverage (as recorded)', supplier.delivery_coverage?.length ? supplier.delivery_coverage.join(', ') : null],
    ['Specialties', categories.length ? el('span', {}, categories.flatMap((category, index) => [
      index ? ', ' : '', link(routes.category(category.category_id), categoryName(category)),
    ])) : null],
    ['Details last verified', verified ?? 'Unknown'],
    ['Notes', supplier.notes],
  ]);

  const contacts = renderSupplierContacts(supplier);
  root.replaceChildren(
    renderBreadcrumb([
      { label: 'Home', href: routes.home() },
      { label: 'Suppliers', href: routes.suppliers() },
      { label: name },
    ]),
    el('header', { className: 'page-header' }, [
      el('h1', { className: 'page-title', text: name }),
      el('p', { className: 'page-subtitle', text: [supplier.city, supplier.locality].filter(Boolean).join(' · ') }),
      altNames.childElementCount ? altNames : null,
    ]),
    el('div', { className: 'callout callout--warning' }, [
      el('p', {
        text: verified
          ? `This supplier record was last verified on ${verified}${ageDays !== null ? ` (${ageDays} days ago)` : ''}. Business details, contacts, and terms may have changed since then.`
          : 'No verification date is recorded for this supplier. Treat all details as unconfirmed.',
      }),
    ]),
    el('div', { className: 'detail-layout detail-layout--single content-section' }, [
      el('div', { className: 'detail-panel' }, [
        facts,
        contacts ?? el('p', { className: 'source-note', text: 'No public phone, WhatsApp, or website is recorded for this supplier.' }),
      ]),
    ]),
  );

  root.append(section(`Recorded offers (${offers.length})`, [
    offers.length ? dataTable({
      caption: 'Offers recorded for this supplier, most recently verified first. Prices are recorded observations, not current quotes.',
      columns: ['Product', 'Recorded price', 'Verification', 'Last verified', 'Offer'],
      rows: offers.map((offer) => [
        link(routes.product(offer.product_id), productName(offer.product)),
        priceText(offer),
        freshnessBadge(offer.freshness),
        formatDate(offer.last_verified_at ?? offer.observed_at) ?? 'Unknown',
        link(routes.offer(offer.offer_id), 'Details', '', { 'aria-label': `Offer details for ${productName(offer.product)}` }),
      ]),
    }) : emptyMessage('No offers are recorded for this supplier.'),
  ], { id: 'offers' }));

  const products = [...new Map(offers.map((offer) => [offer.product_id, offer.product])).values()];
  if (products.length) {
    root.append(section('Products with recorded offers', [el('ul', { className: 'chip-list' }, products.map((product) => el('li', {}, [
      el('span', { className: 'chip' }, [link(routes.product(product.product_id), productName(product))]),
    ])))], { id: 'products' }));
  }

  const checks = newestFirst(catalog.availabilityChecks.filter((check) => check.supplier_id === supplier.supplier_id), 'checked_at');
  if (checks.length) {
    root.append(section('Availability checks', [dataTable({
      caption: 'Dated stock observations at this supplier. They do not confirm current availability.',
      columns: ['Checked', 'Product', 'Status at check', 'Quantity counted', 'Method'],
      rows: checks.map((check) => [
        formatDate(check.checked_at) ?? 'Unknown',
        link(routes.product(check.product_id), productName(catalog.productsById.get(check.product_id))),
        label('availability', check.availability_status),
        check.quantity_confirmed == null ? 'Not published' : String(check.quantity_confirmed),
        humanize(check.confirmation_method),
      ]),
    })], { id: 'availability' }));
  }

  const sources = (supplier.source_ids ?? []).map((id) => catalog.sourcesById.get(id)).filter(Boolean);
  if (sources.length) {
    root.append(section('Sources', [el('ul', { className: 'entity-card__list' }, sources.map((source) => {
      const url = safeExternalUrl(source.url);
      return el('li', {}, [
        url ? externalLink(url, source.source_title ?? source.publisher) : (source.source_title ?? source.publisher),
        ` — ${label('sourceType', source.source_type)}`,
        formatDate(source.accessed_at) ? `, accessed ${formatDate(source.accessed_at)}` : '',
        ' ',
        chip(`Stated reliability: ${label('reliability', source.reliability)}`),
      ]);
    }))], { id: 'sources' }));
  }
}

async function start() {
  const id = readIdFromLocation();
  try {
    const catalog = await loadPublicCatalog();
    showDatasetNotice(status, catalog);
    const supplier = id ? catalog.suppliersById.get(id) : null;
    if (!supplier) {
      renderNotFoundState(root, {
        heading: 'Supplier not found',
        message: id ? 'No supplier with this identifier exists in the current catalog.' : 'This link does not include a valid supplier identifier.',
        backHref: routes.suppliers(),
        backLabel: 'Back to suppliers',
      });
      return;
    }
    render(supplier, catalog);
  } catch (error) {
    showLoadError(status, error);
  }
}

void start();
