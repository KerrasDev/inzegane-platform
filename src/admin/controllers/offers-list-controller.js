/**
 * src/admin/controllers/offers-list-controller.js
 *
 * Inzegane Platform — Offers List Controller
 *
 * This module handles the logic for displaying and filtering the list of offers
 * in the admin interface. It fetches offers, products, and suppliers from the
 * backend, adapts the data, and renders it in a table with search and filter
 * capabilities.
 */

import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { adaptOffer } from '../adapters/offer-adapter.js';
import { escapeHtml, renderBadge, formatDate, tableEmptyRow, tableErrorRow } from '../ui/dom-helpers.js';

renderAdminNav('offers');

let allOffers = [];
const searchInput = document.getElementById('offer-search');
const statusFilter = document.getElementById('status-filter');
const countBadge = document.getElementById('offer-count');
const tbody = document.getElementById('offers-tbody');

async function init() {
  if (!tbody) return;

  try {
    const [offersRes, prodRes, suppRes] = await Promise.all([
      dbService.list('offers', { pageSize: 500 }),
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

    allOffers = (offersRes.items || [])
      .map((o) => adaptOffer(o, productMap, supplierMap))
      .filter(Boolean);

    renderTable();

    searchInput?.addEventListener('input', renderTable);
    statusFilter?.addEventListener('change', renderTable);
  } catch (err) {
    tbody.innerHTML = tableErrorRow(7, `Erreur de chargement: ${err.message}`);
  }
}

function renderTable() {
  const query = searchInput?.value.toLowerCase().trim() || '';
  const selectedStatus = statusFilter?.value || '';

  const filtered = allOffers.filter((o) => {
    const pName = (o.productName || '').toLowerCase();
    const sName = (o.supplierName || '').toLowerCase();
    const matchQuery =
      !query ||
      pName.includes(query) ||
      sName.includes(query) ||
      o.id.toLowerCase().includes(query);
    const matchStatus = !selectedStatus || o.status === selectedStatus;

    return matchQuery && matchStatus;
  });

  if (countBadge) countBadge.textContent = `${filtered.length} offre(s)`;
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = tableEmptyRow(7, 'Aucune offre correspondante.');
    return;
  }

  tbody.innerHTML = filtered
    .map((o) => {
      const isAvailable = o.status === 'in_stock' || o.status === 'declared_available';
      const badgeVariant = isAvailable
        ? 'green'
        : o.status === 'out_of_stock'
          ? 'red'
          : 'amber';

      return `
        <tr>
          <td><code>${escapeHtml(o.id)}</code></td>
          <td><strong>${escapeHtml(o.productName)}</strong></td>
          <td>${escapeHtml(o.supplierName)}</td>
          <td><strong style="color: var(--green-950);">${escapeHtml(o.price)} ${escapeHtml(o.currency)}</strong></td>
          <td>${escapeHtml(o.minQuantity)} unité(s)</td>
          <td>${renderBadge(o.status, badgeVariant)}</td>
          <td>${formatDate(o.verifiedAt)}</td>
        </tr>
      `;
    })
    .join('');
}

void init();