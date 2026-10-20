/**
 * src/public/components/breadcrumb.js
 * Inzegane Platform — Breadcrumb navigation.
 */

import { el, link } from './dom.js';

/** items: [{ label, href }]; the last item is rendered as the current page. */
export function renderBreadcrumb(items) {
  const list = el('ol');
  items.forEach((item, index) => {
    const isCurrent = index === items.length - 1;
    list.append(el('li', {}, [
      isCurrent || !item.href
        ? el('span', { text: item.label, attrs: { 'aria-current': isCurrent ? 'page' : null } })
        : link(item.href, item.label),
    ]));
  });
  return el('nav', { className: 'breadcrumb', attrs: { 'aria-label': 'Breadcrumb' } }, [list]);
}
