/**
 * src/public/components/offer-details.js
 * Inzegane Platform — Recorded offer rendering (price, freshness, tiers).
 *
 * Every price is presented as a recorded observation. Only offers verified
 * within the recent window are described as recently verified; everything
 * else is labelled historical or needing re-check.
 */

import { el, link } from './dom.js';
import { formatDate, formatMoney, label, productName, routes, supplierName } from '../lib/format.js';

export function freshnessBadge(freshness) {
  const status = freshness?.status ?? 'unknown';
  return el('span', { className: `freshness freshness-${status}`, text: label('freshness', status) });
}

export function freshnessExplanation(offer) {
  const { status = 'unknown', ageDays, thresholdDays } = offer.freshness ?? {};
  const date = formatDate(offer.last_verified_at ?? offer.observed_at);
  if (status === 'unknown' || !date) return 'No usable verification date is recorded; price and stock are unconfirmed.';
  if (status === 'fresh') return `Verified ${date} (${ageDays} day${ageDays === 1 ? '' : 's'} ago).`;
  if (status === 'review') {
    return `Last verified ${date}, ${ageDays} days ago. This is past the 7-day recent window; reconfirm with the supplier.`;
  }
  return `Last verified ${date}, ${ageDays} days ago — older than the ${thresholdDays}-day window for this category. Treat it as a historical record, not a current price.`;
}

export function priceText(offer) {
  const amount = formatMoney(offer.unit_price, offer.currency);
  if (!amount) {
    return offer.price_type === 'price_unavailable_quotation_required' ? 'Price on request (not recorded)' : 'Price not recorded';
  }
  const basis = label('priceBasis', offer.price_basis);
  const vat = label('vat', offer.price_includes_vat);
  return [amount, basis, vat].filter(Boolean).join(' · ');
}

export function pricePrefix(offer) {
  return offer.freshness?.status === 'fresh' ? 'Recently verified price' : 'Recorded price';
}

export function stockText(offer) {
  const recorded = label('stockRecorded', offer.stock_status, 'Stock status unknown');
  if (offer.effectiveStockStatus === 'unknown' && offer.stock_status && offer.stock_status !== 'unknown') {
    return `${recorded} at last check — not currently confirmed`;
  }
  return recorded;
}

export function renderQuantityTiers(offer) {
  if (!Array.isArray(offer.quantity_tiers) || offer.quantity_tiers.length === 0) return null;
  const vat = offer.price_includes_vat && offer.price_includes_vat !== 'unknown' ? ` ${label('vat', offer.price_includes_vat)}` : '';
  const list = el('ul', { className: 'price-tiers', attrs: { 'aria-label': 'Recorded quantity tiers' } });
  for (const tier of offer.quantity_tiers) {
    const range = tier.maximum_quantity == null
      ? `${tier.minimum_quantity}+ units`
      : `${tier.minimum_quantity}–${tier.maximum_quantity} units`;
    const amount = formatMoney(tier.unit_price, offer.currency) ?? 'price not recorded';
    list.append(el('li', { text: `${range}: ${amount} each${vat}` }));
  }
  return list;
}

/**
 * Compact offer card used on product, supplier, and offer listings.
 * options.showProduct / options.showSupplier control which relation is linked.
 */
export function renderOfferCard(offer, { showProduct = false, showSupplier = true, headingLevel = 3 } = {}) {
  const card = el('article', { className: 'offer' });
  const title = showProduct ? productName(offer.product) : supplierName(offer.supplier);
  const titleHref = showProduct ? routes.product(offer.product_id) : routes.supplier(offer.supplier_id);
  card.append(el(`h${headingLevel}`, { className: 'offer-supplier' }, [link(titleHref, title)]));

  if (showProduct && showSupplier) {
    card.append(el('p', { className: 'offer-location' }, ['Supplier: ', link(routes.supplier(offer.supplier_id), supplierName(offer.supplier))]));
  } else if (!showProduct) {
    const place = [offer.supplier?.city, offer.supplier?.locality].filter(Boolean).join(' · ');
    if (place) card.append(el('p', { className: 'offer-location', text: place }));
  }

  card.append(freshnessBadge(offer.freshness));
  card.append(el('p', { className: 'offer-price', text: `${pricePrefix(offer)}: ${priceText(offer)}` }));
  card.append(el('p', { className: 'offer-location', text: label('priceType', offer.price_type) }));
  if (offer.minimum_order_quantity != null) {
    card.append(el('p', { className: 'offer-location', text: `Recorded minimum order: ${offer.minimum_order_quantity} units` }));
  }
  card.append(el('p', { className: 'offer-location', text: stockText(offer) }));
  card.append(el('p', { className: offer.freshness?.status === 'fresh' ? 'source-note' : 'stale-note', text: freshnessExplanation(offer) }));
  card.append(link(routes.offer(offer.offer_id), 'View offer details', 'quote-link', {
    'aria-label': `View offer details: ${productName(offer.product)} from ${supplierName(offer.supplier)}`,
  }));
  return card;
}
