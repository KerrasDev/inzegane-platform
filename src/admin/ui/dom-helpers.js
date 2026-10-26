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

/**
 * Validates that a colspan value is a positive integer.
 * @param {unknown} colspan
 * @returns {number}
 * @throws {RangeError} when colspan is not a positive integer
 */
function validateColspan(colspan) {
  const n = Number(colspan);
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError('colspan must be a positive integer');
  }
  return n;
}

/**
 * Renders a single table row used for loading/empty/error states.
 * @param {number} colspan - number of columns the cell spans (positive integer)
 * @param {string} message - text to display (escaped internally)
 * @param {'loading'|'empty'|'error'} kind - state kind, maps to a CSS class
 * @returns {string} HTML string for one <tr>
 */
function tableStateRow(colspan, message, kind) {
  const n = validateColspan(colspan);
  const cls =
    kind === 'loading' ? 'table-loading' :
    kind === 'error' ? 'table-error' : 'table-empty';
  return `<tr><td colspan="${n}" class="${cls}">${escapeHtml(message)}</td></tr>`;
}

export function tableLoadingRow(colspan, message) {
  return tableStateRow(colspan, message, 'loading');
}

export function tableEmptyRow(colspan, message) {
  return tableStateRow(colspan, message, 'empty');
}

export function tableErrorRow(colspan, message) {
  return tableStateRow(colspan, message, 'error');
}