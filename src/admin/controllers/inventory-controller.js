/**
 * src/admin/controllers/inventory-controller.js
 *
 */

import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { adaptAvailabilityCheck } from '../adapters/availability-adapter.js';
import { escapeHtml, renderBadge, formatDate, tableEmptyRow, tableErrorRow } from '../ui/dom-helpers.js';

renderAdminNav('inventory');

const tbody = document.getElementById('inventory-tbody');

async function init() {
  if (!tbody) return;

  try {
    const [checksRes, prodRes, suppRes] = await Promise.all([
      dbService.list('availability_checks', { pageSize: 500 }),
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

    const checks = (checksRes.items || [])
      .map((c) => adaptAvailabilityCheck(c, productMap, supplierMap))
      .filter(Boolean);

    if (checks.length === 0) {
      tbody.innerHTML = tableEmptyRow(5, 'Aucun contrôle de disponibilité enregistré.');
      return;
    }

    tbody.innerHTML = checks
      .map((c) => {
        const isAvailable = c.status === 'in_stock' || c.status === 'declared_available';
        const badgeColor = isAvailable ? 'green' : 'amber';
        const qtyText = c.quantityConfirmed != null ? ` (${escapeHtml(c.quantityConfirmed)} unités confirmées)` : '';

        return `
          <tr>
            <td><code>${escapeHtml(c.id)}</code></td>
            <td><strong>${escapeHtml(c.productName)}</strong></td>
            <td>${escapeHtml(c.supplierName)}</td>
            <td>${renderBadge(c.status, badgeColor)}</td>
            <td>${formatDate(c.checkedAt)}${qtyText}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = tableErrorRow(5, `Erreur de chargement: ${err.message}`);
  }
}

void init();