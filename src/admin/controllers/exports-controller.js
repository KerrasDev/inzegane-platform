/**
 * src/admin/controllers/exports-controller.js
 * Inzegane Platform — Admin Export Controller
 *
 * Manages the export workflow: snapshot → validate → serialize → download.
 * Does NOT modify localStorage or public/data/.
 */

import { renderAdminNav } from '../../admin.js';
import { dbService } from '../../data/database-service.js';
import { validateExport, formatValidationSummary } from '../../data/export-validator.js';
import { escapeHtml } from '../ui/dom-helpers.js';

renderAdminNav('exports');

const exportBtn = document.getElementById('export-btn');
const statusContainer = document.getElementById('export-status');
const resultsContainer = document.getElementById('export-results');
const progressContainer = document.getElementById('export-progress');

let isExporting = false;

async function handleExport() {
  if (isExporting) return;
  isExporting = true;

  // Update UI
  if (exportBtn) exportBtn.disabled = true;
  if (progressContainer) progressContainer.hidden = false;
  if (statusContainer) {
    statusContainer.textContent = 'Export en cours…';
    statusContainer.className = 'export-status export-status--loading';
  }
  if (resultsContainer) resultsContainer.innerHTML = '';

  try {
    // 1. Take snapshot
    const snapshot = await dbService.exportJson();
    if (!snapshot) {
      throw new Error('Impossible d\'obtenir un instantané de la base de données locale.');
    }

    // 2. Validate
    const validation = validateExport(snapshot);
    if (resultsContainer) {
      resultsContainer.innerHTML = renderValidationResults(validation);
    }

    if (!validation.ok) {
      if (statusContainer) {
        statusContainer.textContent = 'Échec de la validation — export annulé';
        statusContainer.className = 'export-status export-status--error';
      }
      return;
    }

    // 3. Serialize
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

    // 4. Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `inzegane-data-export-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 5. Success
    if (statusContainer) {
      statusContainer.textContent = 'Export réussi — fichier téléchargé';
      statusContainer.className = 'export-status export-status--success';
    }
    if (progressContainer) progressContainer.hidden = true;

  } catch (err) {
    if (statusContainer) {
      statusContainer.textContent = `Erreur d'export : ${err.message}`;
      statusContainer.className = 'export-status export-status--error';
    }
    console.error('Export error:', err);
  } finally {
    isExporting = false;
    if (exportBtn) exportBtn.disabled = false;
    if (progressContainer) progressContainer.hidden = true;
  }
}

function renderValidationResults(validation) {
  const parts = [];
  parts.push(`<p class="export-summary">${escapeHtml(formatValidationSummary(validation))}</p>`);

  if (validation.errors.length > 0) {
    parts.push('<div class="export-errors"><h4>Erreurs</h4><ul>');
    for (const err of validation.errors) {
      parts.push(`<li><strong>${escapeHtml(err.resource || '—')}</strong> ${escapeHtml(err.recordId || '')}: ${escapeHtml(err.reason)}</li>`);
    }
    parts.push('</ul></div>');
  }

  if (validation.warnings.length > 0) {
    parts.push('<div class="export-warnings"><h4>Avertissements</h4><ul>');
    for (const warn of validation.warnings) {
      parts.push(`<li>${escapeHtml(warn.reason)}</li>`);
    }
    parts.push('</ul></div>');
  }

  if (validation.counts) {
    parts.push('<div class="export-counts"><h4>Comptes par ressource</h4><ul>');
    for (const [key, count] of Object.entries(validation.counts)) {
      parts.push(`<li>${escapeHtml(key)}: ${count}</li>`);
    }
    parts.push('</ul></div>');
  }

  return parts.join('');
}

if (exportBtn) {
  exportBtn.addEventListener('click', handleExport);
}

// Export for testing
export { handleExport, renderValidationResults };