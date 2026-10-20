/**
 * Inzegane Platform — Supplier New Controller
 *
 * Creates a supplier record via the localStorage-backed data provider.
 */

import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { toSupplierPayload } from '../adapters/supplier-adapter.js';
import { showAlert } from '../ui/dom-helpers.js';

renderAdminNav('suppliers');

const form = document.getElementById('supplier-form');
const feedbackContainer = document.getElementById('feedback-message');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const supplierId = formData.get('supplier_id')?.trim();

    if (!supplierId) {
      showAlert(feedbackContainer, 'Veuillez saisir un identifiant unique.', 'error', 4000);
      return;
    }

    const existing = await dbService.getById('suppliers', supplierId);
    if (existing) {
      showAlert(
        feedbackContainer,
        `Un fournisseur avec l'identifiant "${supplierId}" existe déjà.`,
        'error',
        5000,
      );
      return;
    }

    const payload = toSupplierPayload(formData);
    const res = await dbService.create('suppliers', payload);

    if (res.success) {
      showAlert(
        feedbackContainer,
        `Fournisseur "${payload.business_name}" enregistré localement (navigateur uniquement).`,
        'success',
        0,
      );
      setTimeout(() => {
        window.location.href = '/admin/suppliers/';
      }, 900);
    } else {
      showAlert(feedbackContainer, `Erreur lors de l'enregistrement : ${res.error}`, 'error', 5000);
    }
  });
}
