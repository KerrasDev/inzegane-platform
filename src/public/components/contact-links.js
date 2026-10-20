/**
 * src/public/components/contact-links.js
 * Inzegane Platform — Supplier contact links built only from recorded fields.
 */

import { el, externalLink, link } from './dom.js';
import { formatDate, safeExternalUrl, telUrl, whatsappUrl } from '../lib/format.js';

/** Returns null when the supplier has no valid public contact channel. */
export function renderSupplierContacts(supplier, { message = '' } = {}) {
  const links = [];
  const phone = telUrl(supplier?.public_phone);
  if (phone) links.push(link(phone, `Call ${supplier.public_phone}`, 'button button--secondary'));
  const whatsapp = whatsappUrl(supplier?.public_whatsapp, message);
  if (whatsapp) links.push(externalLink(whatsapp, 'Ask on WhatsApp', 'button button--secondary'));
  const website = safeExternalUrl(supplier?.official_website);
  if (website) links.push(externalLink(website, 'Official website', 'button button--secondary'));
  const page = safeExternalUrl(supplier?.public_business_page);
  if (page) links.push(externalLink(page, 'Public business page', 'button button--secondary'));
  if (links.length === 0) return null;

  const verified = formatDate(supplier?.last_verified_at);
  return el('div', { className: 'contact-block' }, [
    el('p', { className: 'button-row' }, links),
    el('p', {
      className: 'source-note',
      text: `Contact details are reproduced from the research dataset${verified ? ` (supplier record last verified ${verified})` : ''}. They have not been re-checked by this site and may be outdated.`,
    }),
  ]);
}
