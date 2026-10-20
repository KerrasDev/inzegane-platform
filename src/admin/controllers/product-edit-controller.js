/**
 * src/admin/controllers/product-edit-controller.js
 *
 * Inzegane Platform — Product Edit Controller
 *
 * This module handles the logic for editing a product in the admin interface.
 * It fetches the existing product data, populates the form fields, and handles
 * form submission to update the product in the backend.
 */

import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { adaptProduct, toProductPayload } from '../adapters/product-adapter.js';
import { showAlert, escapeHtml } from '../ui/dom-helpers.js';

renderAdminNav('products');

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const feedbackContainer = document.getElementById('feedback-message');
const formContainer = document.getElementById('form-container');
const form = document.getElementById('edit-product-form');

let rawExistingProduct = null;

async function init() {
  if (!productId) {
    showError("Aucun identifiant de produit n'a été spécifié dans l'URL.");
    return;
  }

  try {
    const [product, catRes, brandRes] = await Promise.all([
      dbService.getById('products', productId),
      dbService.list('categories', { pageSize: 100 }),
      dbService.list('brands', { pageSize: 100 }),
    ]);

    if (!product) {
      showError(`Le produit avec l'identifiant "${productId}" est introuvable.`);
      return;
    }

    rawExistingProduct = product;
    const adapted = adaptProduct(product);

    if (pageTitle) pageTitle.textContent = `Modifier : ${adapted.name}`;
    if (pageSubtitle) pageSubtitle.textContent = `Fiche référence : ${adapted.id}`;

    // Populate Category Dropdown with canonical category_id and name_fr
    const catSelect = document.getElementById('product-category');
    if (catSelect) {
      catSelect.innerHTML =
        '<option value="">Sélectionnez une catégorie</option>' +
        (catRes.items || [])
          .map((c) => {
            const id = c.category_id || c.id;
            const isSelected = id === adapted.categoryId ? 'selected' : '';
            return `<option value="${escapeHtml(id)}" ${isSelected}>${escapeHtml(c.name_fr || c.name || id)}</option>`;
          })
          .join('');
    }

    // Populate Brand Dropdown with canonical brand_id and name
    const brandSelect = document.getElementById('product-brand');
    if (brandSelect) {
      brandSelect.innerHTML =
        '<option value="">Sélectionnez une marque (optionnel)</option>' +
        (brandRes.items || [])
          .map((b) => {
            const id = b.brand_id || b.id;
            const isSelected = id === adapted.brandId ? 'selected' : '';
            return `<option value="${escapeHtml(id)}" ${isSelected}>${escapeHtml(b.name || id)}</option>`;
          })
          .join('');
    }

    // Pre-fill input values
    document.getElementById('product-id').value = adapted.id;
    document.getElementById('product-name').value = adapted.name !== '—' ? adapted.name : '';
    document.getElementById('product-name-ar').value = adapted.nameAr || '';
    document.getElementById('product-model').value = adapted.model !== '—' ? adapted.model : '';
    document.getElementById('product-condition').value = adapted.condition || 'new';

    form?.addEventListener('submit', handleFormSubmit);
  } catch (err) {
    showError(`Erreur lors du chargement de la fiche : ${err.message}`);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const updatedPayload = toProductPayload(formData, rawExistingProduct);

  const res = await dbService.update('products', productId, updatedPayload);

  if (res.success) {
    showAlert(
      feedbackContainer,
      'Modifications enregistrées localement (navigateur uniquement).',
      'success',
      0,
    );
    setTimeout(() => {
      window.location.href = '/admin/products/';
    }, 800);
  } else {
    showAlert(feedbackContainer, `Erreur d'enregistrement : ${res.error}`, 'error', 5000);
  }
}

function showError(message) {
  if (formContainer) formContainer.style.display = 'none';
  showAlert(feedbackContainer, message, 'error', 0);
}

void init();