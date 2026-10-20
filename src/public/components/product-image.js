/**
 * src/public/components/product-image.js
 * Inzegane Platform — Product image with a graceful text fallback.
 *
 * Only the image URL recorded in the dataset is used; no placeholder imagery
 * is fabricated. Remote images that fail to load are replaced by a notice.
 */

import { el } from './dom.js';
import { productName, safeExternalUrl } from '../lib/format.js';

function fallback() {
  return el('div', { className: 'media-fallback', text: 'No image available' });
}

export function renderProductImage(product, { className = 'product-media' } = {}) {
  const frame = el('div', { className });
  const src = safeExternalUrl(product?.media?.image_url);
  if (!src) {
    frame.append(fallback());
    return frame;
  }
  const image = el('img', {
    attrs: {
      src,
      alt: productName(product),
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer',
    },
  });
  image.addEventListener('error', () => frame.replaceChildren(fallback()), { once: true });
  frame.append(image);
  return frame;
}
