/**
 * src/public/pages/contact.js
 * Inzegane Platform — Contact and corrections page.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { el } from '../components/dom.js';
import { t } from '../../i18n/index.js';

mountSiteLayout('contact');

// Update document title
document.title = `${t('contact.title')} · Inzegane Platform`;

const main = document.querySelector('#main-content');
const header = main?.querySelector('.page-header');
if (header) {
  const h1 = header.querySelector('.page-title');
  const intro = header.querySelector('.page-intro');
  if (h1) h1.textContent = t('contact.title');
  if (intro) intro.textContent = t('contact.intro');
}

// Render prose content
const prose = document.querySelector('#contact-prose');
if (prose) {
  prose.replaceChildren(
    el('div', { className: 'callout' }, [
      el('p', {}, [el('strong', { text: t('contact.noFormNotice') }), ' ', t('contact.noFormExplanation')]),
      el('p', { text: t('contact.reportsHandled') }),
    ]),
    el('p', { className: 'button-row' }, [
      el('a', { className: 'button', text: t('contact.openReport'), attrs: { href: 'https://github.com/KerrasDev/inzegane-platform/issues/new', target: '_blank', rel: 'noopener noreferrer' } }),
      el('a', { className: 'button button--secondary', text: t('contact.viewReports'), attrs: { href: 'https://github.com/KerrasDev/inzegane-platform/issues', target: '_blank', rel: 'noopener noreferrer' } }),
    ]),
    el('p', { className: 'source-note', text: t('contact.publicWarning') }),
    el('h2', { text: t('contact.whatToInclude'), className: 'section-title' }),
    el('ul', {}, [
      el('li', { text: t('contact.whatToIncludeUrl') }),
      el('li', { text: t('contact.whatToIncludeWrong') }),
      el('li', { text: t('contact.whatToIncludeObserved') }),
      el('li', { text: t('contact.whatToIncludeSource') }),
    ]),
    el('h2', { text: t('contact.howUsed'), className: 'section-title' }),
    el('p', { text: t('contact.howUsedText') }),
    el('h2', { text: t('contact.contactingSuppliers'), className: 'section-title' }),
    el('p', { text: t('contact.contactingSuppliersText') }),
  );
}