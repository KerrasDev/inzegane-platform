/**
 * src/admin/controllers/price-history-controller.js
 *
 * Inzegane Platform — Price History Controller
 *
 * This module handles the logic for displaying and filtering the price history
 * records in the admin interface. It fetches price history, products, and suppliers
 * from the backend, adapts the data, and renders it in a table with search and filter
 * capabilities.
 */

import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { adaptPriceObservation } from '../adapters/price-history-adapter.js';
import { escapeHtml, renderBadge, formatDate } from '../ui/dom-helpers.js';

renderAdminNav('price-history');

let historyRecords = [];
const searchInput = document.getElementById('history-search');
const countBadge = document.getElementById('history-count');
const tbody = document.getElementById('history-tbody');

async function init() {
  if (!tbody) return;

  try {
    const [historyRes, prodRes, suppRes] = await Promise.all([
      dbService.list('price_history', { pageSize: 500 }),
      dbService.list('products', { pageSize: 500 }),
      dbService.list('suppliers', { pageSize: 200 }),
    ]);

    const productMap = new Map(
      (prodRes.items || []).map((p) => [
        p.product_id || p.id,
        p.identity?.product_name_fr || p.name || p.product_id || p.id,
      ])
    );

    const supplierMap = new Map(
      (suppRes.items || []).map((s) => [
        s.supplier_id || s.id,
        s.business_name || s.name || s.supplier_id || s.id,
      ])
    );

    historyRecords = (historyRes.items || [])
      .map((r) => adaptPriceObservation(r, productMap, supplierMap))
      .filter(Boolean)
      .sort((a, b) => new Date(b.observedAt || 0) - new Date(a.observedAt || 0));

    renderTable();

    searchInput?.addEventListener('input', renderTable);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--red); padding: 24px;">Erreur de chargement: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable() {
  const query = searchInput?.value.toLowerCase().trim() || '';

  const filtered = historyRecords.filter((r) => {
    const pName = (r.productName || '').toLowerCase();
    const sName = (r.supplierName || '').toLowerCase();
    return !query || pName.includes(query) || sName.includes(query) || r.id.toLowerCase().includes(query);
  });

  if (countBadge) countBadge.textContent = `${filtered.length} relevé(s)`;
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--muted);">Aucun relevé correspondant.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((r) => `
      <tr>
        <td><strong>${formatDate(r.observedAt)}</strong></td>
        <td><strong>${escapeHtml(r.productName)}</strong></td>
        <td>${escapeHtml(r.supplierName)}</td>
        <td>${renderBadge(`${escapeHtml(r.price)} ${escapeHtml(r.currency)}`, 'green')}</td>
        <td><code>${escapeHtml(r.sourceId)}</code></td>
      </tr>
    `)
    .join('');
}

void init();