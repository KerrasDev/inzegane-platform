/**
 * src/admin/controllers/product-new-controller.js
 *
 * Inzegane Platform — Product New Controller
 *
 * This module handles the logic for creating a new product in the admin interface.
 * It fetches categories and brands from the backend, populates the form fields,
 * and handles form submission to create a new product in the backend.
 */


import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { toProductPayload } from '../adapters/product-adapter.js';
import { showAlert, escapeHtml } from '../ui/dom-helpers.js';

renderAdminNav('products');

const form = document.getElementById('product-form');
const feedbackContainer = document.getElementById('feedback-message');
const catSelect = document.getElementById('product-category');
const brandSelect = document.getElementById('product-brand');

async function init() {
  try {
    const [catRes, brandRes] = await Promise.all([
      dbService.list('categories', { pageSize: 100 }),
      dbService.list('brands', { pageSize: 100 }),
    ]);

    if (catSelect) {
      catSelect.innerHTML =
        '<option value="">Sélectionnez une catégorie</option>' +
        (catRes.items || [])
          .map((c) => {
            const id = c.category_id || c.id;
            const label = c.name_fr || c.name || id;
            return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
          })
          .join('');
    }

    if (brandSelect) {
      brandSelect.innerHTML =
        '<option value="">Sélectionnez une marque</option>' +
        (brandRes.items || [])
          .map((b) => {
            const id = b.brand_id || b.id;
            return `<option value="${escapeHtml(id)}">${escapeHtml(b.name || id)}</option>`;
          })
          .join('');
    }

    form?.addEventListener('submit', handleFormSubmit);
  } catch (err) {
    showAlert(feedbackContainer, `Erreur lors de l'initialisation du formulaire : ${err.message}`, 'error', 0);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const productId = formData.get('product_id')?.trim();

  if (!productId) {
    showAlert(feedbackContainer, 'Veuillez saisir un identifiant unique.', 'error', 4000);
    return;
  }

  // Duplicate ID validation
  const existing = await dbService.getById('products', productId);
  if (existing) {
    showAlert(feedbackContainer, `Un produit avec l'identifiant "${productId}" existe déjà.`, 'error', 5000);
    return;
  }

  const payload = toProductPayload(formData);
  const res = await dbService.create('products', payload);

  if (res.success) {
    showAlert(
      feedbackContainer,
      `Produit "${payload.identity.product_name_fr}" enregistré localement (navigateur uniquement).`,
      'success',
      0,
    );
    setTimeout(() => {
      window.location.href = '/admin/products/';
    }, 900);
  } else {
    showAlert(feedbackContainer, `Erreur lors de la création : ${res.error}`, 'error', 5000);
  }
}

void init();