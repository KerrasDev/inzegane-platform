/**
 * src/public/components/dom.js
 * Inzegane Platform — Safe DOM construction helpers for public pages.
 *
 * All dynamic values are written through textContent or explicit attributes;
 * catalog records are never interpolated into innerHTML.
 */

export function el(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);
  const { className, text, attrs, lang, dir, hidden } = options;
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  if (lang) element.lang = lang;
  if (dir) element.dir = dir;
  if (hidden) element.hidden = true;
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }
  append(element, children);
  return element;
}

export function append(parent, children) {
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function link(href, text, className, attrs = {}) {
  return el('a', { className, text, attrs: { href, ...attrs } });
}

export function externalLink(href, text, className) {
  return link(href, text, className, { target: '_blank', rel: 'noopener noreferrer' });
}

/**
 * Renders a definition list from [term, value] pairs. Pairs whose value is
 * null, undefined, or an empty string are omitted rather than shown as data.
 */
export function factList(entries, className = 'fact-list') {
  const list = el('dl', { className });
  for (const [term, value] of entries) {
    if (value === null || value === undefined || value === '') continue;
    const row = el('div', { className: 'fact-list__row' });
    row.append(el('dt', { text: term }), el('dd', {}, [value]));
    list.append(row);
  }
  return list.childElementCount > 0 ? list : null;
}

/** Accessible, horizontally scrollable data table. Cells may be strings or nodes. */
export function dataTable({ caption, columns, rows }) {
  const table = el('table', { className: 'data-table' });
  if (caption) table.append(el('caption', { text: caption }));
  const headRow = el('tr');
  for (const column of columns) headRow.append(el('th', { text: column, attrs: { scope: 'col' } }));
  table.append(el('thead', {}, [headRow]));
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (const cell of row) tr.append(el('td', {}, [cell ?? '—']));
    body.append(tr);
  }
  table.append(body);
  return el('div', { className: 'table-scroll', attrs: { role: 'region', 'aria-label': caption ?? 'Data table', tabindex: '0' } }, [table]);
}

export function section(title, children = [], { id, headingLevel = 2, className = 'content-section' } = {}) {
  const headingId = id ? `${id}-heading` : undefined;
  const wrapper = el('section', { className, attrs: { id, 'aria-labelledby': headingId } });
  wrapper.append(el(`h${headingLevel}`, { className: 'section-title', text: title, attrs: { id: headingId } }));
  append(wrapper, children);
  return wrapper;
}

export function chip(text, modifier = '') {
  return el('span', { className: `chip${modifier ? ` chip--${modifier}` : ''}`, text });
}

export function emptyMessage(text) {
  return el('p', { className: 'no-results', text });
}
