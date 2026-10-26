/**
 * src/admin/controllers/suppliers-list-controller.js
 *
 * Inzegane Platform — Suppliers List Controller
 *
 * This module handles the logic for displaying and filtering the list of suppliers
 * in the admin interface. It fetches suppliers and offers from the backend,
 * adapts the data, and renders it in a table with search capabilities.
 */


import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { adaptSupplier } from '../adapters/supplier-adapter.js';
import { escapeHtml, renderBadge, tableEmptyRow, tableErrorRow } from '../ui/dom-helpers.js';

renderAdminNav('suppliers');

let allSuppliers = [];
let offers = [];

const searchInput = document.getElementById('supplier-search');
const countBadge = document.getElementById('supplier-count');
const tbody = document.getElementById('suppliers-tbody');

async function init() {
  if (!tbody) return;

  try {
    const [suppRes, offRes] = await Promise.all([
      dbService.list('suppliers', { pageSize: 200 }),
      dbService.list('offers', { pageSize: 500 }),
    ]);

    allSuppliers = (suppRes.items || []).map(adaptSupplier).filter(Boolean);
    offers = offRes.items || [];

    renderTable();

    searchInput?.addEventListener('input', renderTable);
  } catch (err) {
    tbody.innerHTML = tableErrorRow(6, `Erreur de chargement: ${err.message}`);
  }
}

function renderTable() {
  const query = searchInput?.value.toLowerCase().trim() || '';

  const filtered = allSuppliers.filter((s) => {
    const name = (s.name || '').toLowerCase();
    const location = (s.location || '').toLowerCase();
    const type = (s.type || '').toLowerCase();
    const id = (s.id || '').toLowerCase();
    return !query || name.includes(query) || location.includes(query) || type.includes(query) || id.includes(query);
  });

  if (countBadge) countBadge.textContent = `${filtered.length} fournisseur(s)`;
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = tableEmptyRow(6, 'Aucun fournisseur correspondant.');
    return;
  }

  tbody.innerHTML = filtered
    .map((s) => {
      const linkedOffers = offers.filter((o) => o.supplier_id === s.id);
      return `
        <tr>
          <td><code>${escapeHtml(s.id)}</code></td>
          <td>
            <strong>${escapeHtml(s.name)}</strong>
            ${s.isDraft ? renderBadge('Brouillon local', 'amber') : ''}
          </td>
          <td>${renderBadge(s.type, 'green')}</td>
          <td>${escapeHtml(s.location)}</td>
          <td>${s.phone ? escapeHtml(s.phone) : '<span style="color: var(--muted);">Non renseigné</span>'}</td>
          <td><strong>${linkedOffers.length}</strong> offre(s)</td>
        </tr>
      `;
    })
    .join('');
}

void init();