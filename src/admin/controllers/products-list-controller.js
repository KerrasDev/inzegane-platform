/**
 * src/admin/controllers/products-list-controller.js
 * Inzegane Platform — Admin Products List Controller
 *
 * Manages product listing, category filtering, search queries,
 * and relational joins using the database service and product adapter.
 */

import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { adaptProduct } from '../adapters/product-adapter.js';
import { escapeHtml, renderBadge } from '../ui/dom-helpers.js';

renderAdminNav('products');

let allProducts = [];
let categories = [];
let offers = [];

const searchInput = document.getElementById('product-search');
const catFilter = document.getElementById('category-filter');
const countBadge = document.getElementById('product-count');
const tbody = document.getElementById('products-tbody');

async function init() {
  if (!tbody) return;

  try {
    const [prodRes, catRes, offRes] = await Promise.all([
      dbService.list('products', { pageSize: 500 }),
      dbService.list('categories', { pageSize: 100 }),
      dbService.list('offers', { pageSize: 500 }),
    ]);

    allProducts = (prodRes.items || []).map(adaptProduct).filter(Boolean);
    categories = catRes.items || [];
    offers = offRes.items || [];

    if (catFilter) {
      catFilter.innerHTML =
        '<option value="">Toutes les catégories</option>' +
        categories
          .map((c) => {
            const id = c.category_id || c.id;
            const label = c.name_fr || c.name || id;
            return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
          })
          .join('');
    }

    renderTable();

    searchInput?.addEventListener('input', renderTable);
    catFilter?.addEventListener('change', renderTable);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--red); padding: 24px;">Erreur de chargement: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable() {
  const query = searchInput?.value.toLowerCase().trim() || '';
  const selectedCat = catFilter?.value || '';
  const categoryMap = new Map(
    categories.map((c) => [c.category_id || c.id, c.name_fr || c.name])
  );

  const filtered = allProducts.filter((p) => {
    const name = (p.name || '').toLowerCase();
    const model = (p.model || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    const matchQuery = !query || name.includes(query) || model.includes(query) || id.includes(query);
    const matchCat = !selectedCat || p.categoryId === selectedCat;

    return matchQuery && matchCat;
  });

  if (countBadge) countBadge.textContent = `${filtered.length} produit(s)`;
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--muted);">Aucun produit correspondant.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((p) => {
      const linkedCount = offers.filter((o) => o.product_id === p.id).length;
      return `
        <tr>
          <td><code>${escapeHtml(p.id)}</code></td>
          <td>
            <strong>${escapeHtml(p.name)}</strong>
            ${p.isDraft ? renderBadge('Brouillon local', 'amber') : ''}
          </td>
          <td>${escapeHtml(categoryMap.get(p.categoryId) || p.categoryId || '—')}</td>
          <td><code>${escapeHtml(p.model)}</code></td>
          <td>${renderBadge(`${linkedCount} offre(s)`, 'green')}</td>
          <td>
            <a href="/admin/products/edit.html?id=${encodeURIComponent(p.id)}" class="btn btn-secondary btn-sm">Modifier</a>
          </td>
        </tr>
      `;
    })
    .join('');
}

void init();