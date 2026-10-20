/**
 * src/public/components/product-card.js
 * Inzegane Platform — Product summary card for listings.
 */

import { el, link } from './dom.js';
import { renderProductImage } from './product-image.js';
import { freshnessBadge, priceText } from './offer-details.js';
import { categoryName, formatDate, label, pluralize, productName, routes, supplierName } from '../lib/format.js';

export function renderProductCard(product, { headingLevel = 3 } = {}) {
  const name = productName(product);
  const titleId = `product-card-${product.product_id}`;
  const card = el('article', { className: 'product-card product-card--summary', attrs: { 'aria-labelledby': titleId } });

  card.append(renderProductImage(product));
  card.append(el(`h${headingLevel}`, { className: 'product-title', attrs: { id: titleId } }, [
    link(routes.product(product.product_id), name),
  ]));

  const meta = [product.brand?.name ?? product.identity?.brand_name, categoryName(product.category)].filter(Boolean).join(' · ');
  if (meta) card.append(el('p', { className: 'product-meta', text: meta }));
  if (product.identity?.manufacturer_model) {
    card.append(el('p', { className: 'product-model', text: `Model: ${product.identity.manufacturer_model}` }));
  }
  if (product.condition) card.append(el('p', { className: 'product-meta', text: `Condition: ${label('condition', product.condition)}` }));

  const offers = product.offers ?? [];
  if (offers.length === 0) {
    card.append(el('p', { className: 'empty-offer', text: 'No recorded offers match the current filters.' }));
  } else {
    const list = el('ul', { className: 'offer-summary-list', attrs: { 'aria-label': `Recorded offers for ${name}` } });
    for (const offer of offers.slice(0, 3)) {
      const date = formatDate(offer.last_verified_at ?? offer.observed_at);
      list.append(el('li', {}, [
        el('span', { className: 'offer-summary-list__supplier', text: supplierName(offer.supplier) }),
        el('span', { className: 'offer-summary-list__price', text: priceText(offer) }),
        el('span', { className: 'offer-summary-list__meta' }, [
          freshnessBadge(offer.freshness),
          date ? ` recorded ${date}` : ' date unknown',
        ]),
      ]));
    }
    card.append(list);
    if (offers.length > 3) card.append(el('p', { className: 'product-meta', text: `+ ${pluralize(offers.length - 3, 'more offer')}` }));
  }

  card.append(link(routes.product(product.product_id), 'View product details', 'card-link', { 'aria-label': `View details for ${name}` }));
  return card;
}
