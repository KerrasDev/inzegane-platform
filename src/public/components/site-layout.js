/**
 * src/public/components/site-layout.js
 * Inzegane Platform — Shared public header, navigation, and footer.
 *
 * Pages declare their active navigation item with <body data-nav="...">
 * and provide a <main id="main-content">. The header is inserted before
 * main and the footer after it, so every page shares one layout.
 */

import { el, link } from './dom.js';
import { routes } from '../lib/format.js';

const NAV_ITEMS = [
  { id: 'products', label: 'Products', href: () => routes.products() },
  { id: 'categories', label: 'Categories', href: () => routes.categories() },
  { id: 'suppliers', label: 'Suppliers', href: () => routes.suppliers() },
  { id: 'offers', label: 'Offers', href: () => routes.offers() },
  { id: 'about', label: 'About', href: () => routes.about() },
];

const FOOTER_ITEMS = [
  ...NAV_ITEMS,
  { id: 'contact', label: 'Contact', href: () => routes.contact() },
  { id: 'methodology', label: 'Price verification methodology', href: () => routes.methodology() },
];

function navLink(item, active) {
  return link(item.href(), item.label, 'site-nav__link', { 'aria-current': item.id === active ? 'page' : null });
}

function renderSearchForm() {
  const initialQuery = document.body.dataset.nav === 'products'
    ? new URLSearchParams(window.location.search).get('q') ?? ''
    : '';
  const form = el('form', {
    className: 'site-search',
    attrs: { role: 'search', action: routes.products(), method: 'get', 'aria-label': 'Search products' },
  });
  form.append(
    el('label', { className: 'visually-hidden', text: 'Search products', attrs: { for: 'site-search-input' } }),
    el('input', {
      attrs: {
        id: 'site-search-input',
        name: 'q',
        type: 'search',
        placeholder: 'Search products, brands, models…',
        autocomplete: 'off',
        value: initialQuery,
      },
    }),
    el('button', { className: 'button', text: 'Search', attrs: { type: 'submit' } }),
  );
  return form;
}

function renderHeader(active) {
  const nav = el('nav', { className: 'site-nav', attrs: { id: 'site-nav', 'aria-label': 'Main' } });
  nav.append(el('ul', { className: 'site-nav__list' }, NAV_ITEMS.map((item) => el('li', {}, [navLink(item, active)]))));
  nav.append(renderSearchForm());

  const toggle = el('button', {
    className: 'site-nav-toggle',
    text: 'Menu',
    attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'site-nav' },
  });
  const header = el('header', { className: 'site-header' }, [
    el('div', { className: 'site-header__inner page-shell' }, [
      el('a', {
        className: 'site-brand',
        attrs: { href: routes.home(), 'aria-current': active === 'home' ? 'page' : null },
      }, [
        el('span', { className: 'site-brand__name', text: 'Inzegane Platform' }),
        el('span', { className: 'site-brand__tagline', text: 'Wholesale electronics research catalog' }),
      ]),
      toggle,
      nav,
    ]),
  ]);

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('is-nav-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-nav-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  return header;
}

function renderFooter(active) {
  const list = el('ul', { className: 'site-footer__links' }, FOOTER_ITEMS.map((item) => el('li', {}, [navLink(item, active)])));
  return el('footer', { className: 'footer site-footer page-shell' }, [
    el('nav', { attrs: { 'aria-label': 'Footer' } }, [list]),
    el('p', {
      text: 'Information on this site reflects a dated research snapshot, not real-time commercial availability or current prices. It does not cover every supplier or the entire market.',
    }),
  ]);
}

export function mountSiteLayout(active = document.body.dataset.nav ?? '') {
  const main = document.querySelector('main');
  if (!main || document.querySelector('.site-header')) return;
  const skip = link('#main-content', 'Skip to main content', 'skip-link');
  const header = renderHeader(active);
  const status = document.querySelector('#load-status');
  if (status) header.append(el('div', { className: 'site-header__status page-shell' }, [status]));
  document.body.prepend(skip, header);
  main.after(renderFooter(active));
}
