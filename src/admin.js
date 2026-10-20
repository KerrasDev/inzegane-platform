/**
 * Inzegane Platform — Admin Shared Utilities & Data Bridge
 */

import { dbService } from './data/database-service.js';
import { PRIMARY_KEYS } from './data/contracts.js';

const STORAGE_KEYS = {
  STAGED_PRODUCTS: 'inzegane_staged_products',
  STAGED_SUPPLIERS: 'inzegane_staged_suppliers'
};

/**
 * Loads baseline static data augmented with verified localStorage staged changes.
 */
export async function loadAdminData() {
  const db = await dbService.getSnapshot();

  const stagedProducts = getStagedRecords(STORAGE_KEYS.STAGED_PRODUCTS);
  const stagedSuppliers = getStagedRecords(STORAGE_KEYS.STAGED_SUPPLIERS);

  // Merge staged modifications and new additions
  const products = mergeRecords(db.products || [], stagedProducts, PRIMARY_KEYS.products);
  const suppliers = mergeRecords(db.suppliers || [], stagedSuppliers, PRIMARY_KEYS.suppliers);

  return {
    ...db,
    products,
    suppliers,
    isLocalDraftActive: stagedProducts.length > 0 || stagedSuppliers.length > 0
  };
}

function getStagedRecords(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn(`Could not parse ${key} from localStorage:`, e);
    return [];
  }
}

export function stageRecord(type, record) {
  const key = type === 'product' ? STORAGE_KEYS.STAGED_PRODUCTS : STORAGE_KEYS.STAGED_SUPPLIERS;
  const primaryKey = type === 'product' ? PRIMARY_KEYS.products : PRIMARY_KEYS.suppliers;
  const current = getStagedRecords(key);
  const recordId = record[primaryKey] ?? record.id;
  const idx = current.findIndex((item) => (item[primaryKey] ?? item.id) === recordId);

  if (idx >= 0) {
    current[idx] = { ...current[idx], ...record, _stagedAt: new Date().toISOString() };
  } else {
    current.push({ ...record, _stagedAt: new Date().toISOString(), _isNew: true });
  }

  localStorage.setItem(key, JSON.stringify(current));
}

function mergeRecords(baseList, stagedList, primaryKey) {
  const recordId = (item) => item[primaryKey] ?? item.id;
  const map = new Map(baseList.map((item) => [recordId(item), item]));
  for (const item of stagedList) {
    const id = recordId(item);
    map.set(id, { ...map.get(id), ...item });
  }
  return Array.from(map.values());
}

/**
 * Standard Admin Navigation Bar Renderer
 */
export function renderAdminNav(activePath) {
  const navContainer = document.getElementById('admin-nav');
  if (!navContainer) return;

  const links = [
    { href: '/admin/', label: 'Tableau de bord', id: 'dashboard' },
    { href: '/admin/products/', label: 'Produits', id: 'products' },
    { href: '/admin/suppliers/', label: 'Fournisseurs', id: 'suppliers' },
    { href: '/admin/offers/', label: 'Offres', id: 'offers' },
    { href: '/admin/inventory/', label: 'Disponibilité', id: 'inventory' },
    { href: '/admin/price-history/', label: 'Historique de prix', id: 'price-history' },
    { href: '/admin/imports/', label: 'Spécification Import', id: 'imports' },
    { href: '/', label: '← Voir le catalogue public', id: 'public-link' }
  ];

  navContainer.innerHTML = links
    .map(
      (link) =>
        `<a href="${link.href}" class="${activePath === link.id ? 'active' : ''}">${link.label}</a>`
    )
    .join('');
}