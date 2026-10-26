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
import { initI18n, getLocale, setLocale, t, getSupportedLocales } from '../../i18n/index.js';

const NAV_ITEMS = [
  { id: 'products', labelKey: 'nav.products', href: () => routes.products() },
  { id: 'categories', labelKey: 'nav.categories', href: () => routes.categories() },
  { id: 'suppliers', labelKey: 'nav.suppliers', href: () => routes.suppliers() },
  { id: 'offers', labelKey: 'nav.offers', href: () => routes.offers() },
  { id: 'about', labelKey: 'nav.about', href: () => routes.about() },
];

const FOOTER_ITEMS = [
  ...NAV_ITEMS,
  { id: 'contact', labelKey: 'nav.contact', href: () => routes.contact() },
  { id: 'methodology', labelKey: 'nav.methodology', href: () => routes.methodology() },
];

function navLabel(item) {
  return t(item.labelKey);
}

function navLink(item, active) {
  return link(item.href(), navLabel(item), 'site-nav__link', { 'aria-current': item.id === active ? 'page' : null });
}

function renderSearchForm() {
  const initialQuery = document.body.dataset.nav === 'products'
    ? new URLSearchParams(window.location.search).get('q') ?? ''
    : '';
  const form = el('form', {
    className: 'site-search',
    attrs: { role: 'search', action: routes.products(), method: 'get', 'aria-label': t('search.ariaLabel') },
  });
  form.append(
    el('label', { className: 'visually-hidden', text: t('header.searchProducts'), attrs: { for: 'site-search-input' } }),
    el('input', {
      attrs: {
        id: 'site-search-input',
        name: 'q',
        type: 'search',
        placeholder: t('header.searchPlaceholder'),
        autocomplete: 'off',
        value: initialQuery,
      },
    }),
    el('button', { className: 'button', text: t('common.search'), attrs: { type: 'submit' } }),
  );
  return form;
}

function renderLanguageSwitcher() {
  const select = document.createElement('select');
  select.className = 'language-switcher';
  select.setAttribute('aria-label', t('language.label'));
  for (const locale of getSupportedLocales()) {
    const option = document.createElement('option');
    option.value = locale;
    option.textContent = t(`language.${locale}`);
    if (locale === getLocale()) option.selected = true;
    select.append(option);
  }
  select.addEventListener('change', (e) => {
    const newLocale = e.target.value;
    setLocale(newLocale);
    // Reload to apply locale to all strings
    window.location.reload();
  });
  return select;
}

function renderHeader(active) {
  const nav = el('nav', { className: 'site-nav', attrs: { id: 'site-nav', 'aria-label': t('nav.home') } });
  nav.append(el('ul', { className: 'site-nav__list' }, NAV_ITEMS.map((item) => el('li', {}, [navLink(item, active)]))));
  nav.append(renderSearchForm());

  const toggle = el('button', {
    className: 'site-nav-toggle',
    text: t('header.menu'),
    attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'site-nav' },
  });
  const header = el('header', { className: 'site-header' }, [
    el('div', { className: 'site-header__inner page-shell' }, [
      el('a', {
        className: 'site-brand',
        attrs: { href: routes.home(), 'aria-current': active === 'home' ? 'page' : null },
      }, [
        el('span', { className: 'site-brand__name', text: t('header.brandName') }),
        el('span', { className: 'site-brand__tagline', text: t('header.brandTagline') }),
      ]),
      toggle,
      nav,
      renderLanguageSwitcher(),
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
    el('nav', { attrs: { 'aria-label': t('footer.navLabel') } }, [list]),
    el('p', {
      text: t('footer.disclaimer'),
    }),
  ]);
}

export function mountSiteLayout(active = document.body.dataset.nav ?? '') {
  initI18n();
  const main = document.querySelector('main');
  if (!main || document.querySelector('.site-header')) return;
  // Reuse existing skip link if present (progressive enhancement)
  const existingSkip = document.querySelector('.skip-link');
  const skip = existingSkip || link('#main-content', t('skipLink'), 'skip-link');
  const header = renderHeader(active);
  const status = document.querySelector('#load-status');
  if (status) header.append(el('div', { className: 'site-header__status page-shell' }, [status]));
  if (!existingSkip) {
    document.body.prepend(skip, header);
  } else {
    document.body.insertBefore(header, main);
  }
  main.after(renderFooter(active));
}
