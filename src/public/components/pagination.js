/**
 * src/public/components/pagination.js
 * Inzegane Platform — Previous/next pagination controls (reuses .page-controls).
 */

import { el } from './dom.js';

export function renderPagination(nav, { page, pageCount, onChange }) {
  nav.replaceChildren();
  if (pageCount <= 1) return;
  const button = (text, targetPage, disabled) => {
    const control = el('button', { text, attrs: { type: 'button', disabled } });
    control.addEventListener('click', () => onChange(targetPage));
    return control;
  };
  nav.append(
    button('Previous', page - 1, page <= 1),
    el('span', { className: 'page-number', text: `Page ${page} of ${pageCount}`, attrs: { 'aria-current': 'page' } }),
    button('Next', page + 1, page >= pageCount),
  );
}
