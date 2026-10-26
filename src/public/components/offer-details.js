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
import { t } from '../../i18n/index.js';

export function freshnessBadge(freshness) {
  const status = freshness?.status ?? 'unknown';
  return el('span', { className: `freshness freshness-${status}`, text: label('freshness', status) });
}

export function freshnessExplanation(offer) {
  const { status = 'unknown', ageDays, thresholdDays } = offer.freshness ?? {};
  const date = formatDate(offer.last_verified_at ?? offer.observed_at);
  if (status === 'unknown' || !date) return t('offerDetails.noVerificationDate');
  if (status === 'fresh') return t('offerDetails.verifiedDaysAgo', { date, days: ageDays });
  if (status === 'review') {
    return t('offerDetails.lastVerifiedReview', { date, days: ageDays });
  }
  return t('offerDetails.lastVerifiedStale', { date, days: ageDays, threshold: thresholdDays });
}

export function priceText(offer) {
  const amount = formatMoney(offer.unit_price, offer.currency);
  if (!amount) {
    return offer.price_type === 'price_unavailable_quotation_required' ? t('offerDetails.priceOnRequest') : t('offerDetails.priceNotRecorded');
  }
  const basis = label('priceBasis', offer.price_basis);
  const vat = label('vat', offer.price_includes_vat);
  return [amount, basis, vat].filter(Boolean).join(' · ');
}

export function pricePrefix(offer) {
  return offer.freshness?.status === 'fresh' ? t('offerDetails.recentlyVerifiedPrice') : t('offerDetails.recordedPrice');
}

export function stockText(offer) {
  const recorded = label('stockRecorded', offer.stock_status, t('offerDetails.recordedStockSimple', { status: 'unknown' }));
  if (offer.effectiveStockStatus === 'unknown' && offer.stock_status && offer.stock_status !== 'unknown') {
    return t('offerDetails.recordedStock', { status: recorded });
  }
  return recorded;
}

export function renderQuantityTiers(offer) {
  if (!Array.isArray(offer.quantity_tiers) || offer.quantity_tiers.length === 0) return null;
  const vat = offer.price_includes_vat && offer.price_includes_vat !== 'unknown' ? ` ${label('vat', offer.price_includes_vat)}` : '';
  const list = el('ul', { className: 'price-tiers', attrs: { 'aria-label': t('offerDetails.priceTiersAria') } });
  for (const tier of offer.quantity_tiers) {
    const range = tier.maximum_quantity == null
      ? t('offerDetails.quantityRange', { min: tier.minimum_quantity })
      : t('offerDetails.quantityRangeMax', { min: tier.minimum_quantity, max: tier.maximum_quantity });
    const amount = formatMoney(tier.unit_price, offer.currency) ?? t('offerDetails.priceNotRecorded');
    list.append(el('li', { text: `${range}: ${amount}${vat}` }));
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
    card.append(el('p', { className: 'offer-location' }, [t('productDetail.supplier') + ': ', link(routes.supplier(offer.supplier_id), supplierName(offer.supplier))]));
  } else if (!showProduct) {
    const place = [offer.supplier?.city, offer.supplier?.locality].filter(Boolean).join(' · ');
    if (place) card.append(el('p', { className: 'offer-location', text: place }));
  }

  card.append(freshnessBadge(offer.freshness));
  card.append(el('p', { className: 'offer-price', text: `${pricePrefix(offer)}: ${priceText(offer)}` }));
  card.append(el('p', { className: 'offer-location', text: label('priceType', offer.price_type) }));
  if (offer.minimum_order_quantity != null) {
    card.append(el('p', { className: 'offer-location', text: t('offerDetails.recordedMinOrder', { qty: offer.minimum_order_quantity }) }));
  }
  card.append(el('p', { className: 'offer-location', text: stockText(offer) }));
  card.append(el('p', { className: offer.freshness?.status === 'fresh' ? 'source-note' : 'stale-note', text: freshnessExplanation(offer) }));
  card.append(link(routes.offer(offer.offer_id), t('offerDetails.viewOfferDetails'), 'quote-link', {
    'aria-label': t('offerDetails.offerAriaLabel', { product: productName(offer.product), supplier: supplierName(offer.supplier) }),
  }));
  return card;
}
