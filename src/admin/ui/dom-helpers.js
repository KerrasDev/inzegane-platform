/**
 * src/admin/ui/dom-helpers.js
 * Inzegane Platform — Safe DOM & UI Formatting Helpers
 */

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderBadge(text, variant = 'green') {
  return `<span class="badge badge-${escapeHtml(variant)}">${escapeHtml(text)}</span>`;
}

export function showAlert(container, message, type = 'info', timeout = 4000) {
  if (!container) return;
  container.className = `alert alert-${escapeHtml(type)}`;
  container.textContent = message;
  container.style.display = 'block';

  if (timeout > 0) {
    setTimeout(() => {
      container.style.display = 'none';
    }, timeout);
  }
}

export function formatDate(isoDate) {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('fr-FR') : escapeHtml(isoDate);
  } catch {
    return escapeHtml(isoDate);
  }
}