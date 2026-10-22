/**
 * src/public/components/status.js
 * Inzegane Platform — Loading, error, notice, and not-found states.
 */

import { el, link } from './dom.js';
import { routes } from '../lib/format.js';

export function setStatus(region, type, text) {
  if (!region) return;
  region.hidden = false;
  region.className = `load-status${type === 'loading' ? '' : ` ${type}`}`;
  region.replaceChildren(text);
}

export function hideStatus(region) {
  if (region) region.hidden = true;
}

export function datasetNotice(catalog) {
  const snapshotDate = catalog.metadata?.source_snapshot_generated_at?.slice(0, 10);
  const parts = [
    catalog.metadata?.independently_verified
      ? 'This is a historical research snapshot.'
      : 'This is a historical research snapshot that has not been independently verified.',
    snapshotDate ? `Generated ${snapshotDate}.` : null,
    'Prices and stock are not live; confirm every claim with the supplier before relying on it.',
  ];
  const wrapper = el('span', { text: `${parts.filter(Boolean).join(' ')} ` });
  wrapper.append(link(routes.methodology(), 'How prices are verified'));
  return wrapper;
}

export function showDatasetNotice(region, catalog) {
  setStatus(region, 'notice', datasetNotice(catalog));
}

export function showLoadError(region, error, content) {
  setStatus(region, 'error', `The catalog data could not be loaded. ${error?.message ?? ''} Please reload the page or try again later.`.trim());
  if (content) content.replaceChildren();
  console.error(error);
}

/** Replaces `container` with an in-page not-found state for a missing resource. */
export function renderNotFoundState(container, { heading, message, backHref, backLabel }) {
  document.title = `${heading} · Inzegane Platform`;
  if (!document.querySelector('meta[name="robots"]')) {
    document.head.append(el('meta', { attrs: { name: 'robots', content: 'noindex' } }));
  }
  const panel = el('section', { className: 'empty-state', attrs: { 'aria-labelledby': 'not-found-heading' } }, [
    el('h1', { className: 'page-title', text: heading, attrs: { id: 'not-found-heading' } }),
    el('p', { className: 'page-intro', text: message }),
    el('p', { className: 'button-row' }, [
      link(backHref, backLabel, 'button'),
      link(routes.products(), 'Browse products', 'button button--secondary'),
      link(routes.home(), 'Go to the homepage', 'button button--secondary'),
    ]),
  ]);
  container.replaceChildren(panel);
  panel.querySelector('h1').focus?.();
}
