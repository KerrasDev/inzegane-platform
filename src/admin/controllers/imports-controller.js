/**
 * src/admin/controllers/imports-controller.js
 *
 * Inzegane Platform — Imports Controller
 *
 * This module handles the logic for checking the validity of JSON files
 * uploaded in the admin interface. It reads the file, parses it, and displays
 * the result in a user-friendly format.
 */

import { renderAdminNav } from '../../admin.js';
import { escapeHtml } from '../ui/dom-helpers.js';

// Initialize admin navigation
renderAdminNav('imports');

const fileInput = document.getElementById('file-checker');
const outputContainer = document.getElementById('check-output');

if (fileInput && outputContainer) {
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      outputContainer.innerHTML = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;

      outputContainer.innerHTML = `
        <span class="badge badge-green">
          Syntaxe JSON valide (${escapeHtml(count)} entrée${count > 1 ? 's' : ''} détectée${count > 1 ? 's' : ''}).
          Aucune écriture serveur : validation locale uniquement.
        </span>
      `;
    } catch (err) {
      outputContainer.innerHTML = `
        <span class="badge badge-red">
          Erreur de syntaxe JSON : ${escapeHtml(err.message)}
        </span>
      `;
    }
  });
}