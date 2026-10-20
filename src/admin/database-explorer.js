import { dbService } from '../data/database-service.js';
import { RESOURCE_SCHEMAS } from '../data/resource-schemas.js';

export class DatabaseExplorer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.activeResource = options.defaultResource || 'products';
    this.query = '';
    this.page = 1;
    this.pageSize = 15;
    this.relationsCache = {};
    this.init();
  }

  async init() {
    if (!this.container) return;
    this.renderLayout();
    await this.loadRelations();
    await this.loadData();
    dbService.subscribe(() => this.loadData());
  }

  async loadRelations() {
    // Pre-cache small relation lookup sets (categories, brands, suppliers, sources)
    for (const res of ['categories', 'brands', 'suppliers', 'sources']) {
      try {
        const { items } = await dbService.list(res, { pageSize: 100 });
        this.relationsCache[res] = items;
      } catch {
        this.relationsCache[res] = [];
      }
    }
  }

  renderLayout() {
    const caps = dbService.getCapabilities();
    this.container.innerHTML = `
      <div class="db-explorer-shell">
        <header class="explorer-header">
          <div class="resource-selector-bar" role="tablist">
            ${Object.entries(RESOURCE_SCHEMAS).map(([key, schema]) => `
              <button type="button" class="tab-btn ${this.activeResource === key ? 'active' : ''}" data-resource="${key}">
                ${schema.title}
              </button>
            `).join('')}
          </div>

          <div class="provider-pill">
            <span class="indicator-dot ${caps.canWrite ? 'live' : 'readonly'}"></span>
            <span>Mode : <strong>${caps.name}</strong></span>
            ${caps.canWrite ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-seed" title="Réinitialiser avec les données sources">Réinitialiser</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-export-json" title="Télécharger le snapshot JSON complet">Exporter JSON</button>
            ` : ''}
          </div>
        </header>

        <section class="explorer-toolbar">
          <div class="search-box">
            <input type="search" id="explorer-search" placeholder="Rechercher par identifiant, nom, attributs…" value="${this.query}" />
          </div>
          <div class="actions-box">
            <span class="count-badge" id="explorer-count">—</span>
            ${caps.canWrite ? `<button type="button" class="btn btn-primary btn-sm" id="btn-new-record">+ Ajouter</button>` : ''}
          </div>
        </section>

        <div id="explorer-alert" class="alert" style="display: none;"></div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead id="explorer-thead"></thead>
            <tbody id="explorer-tbody"></tbody>
          </table>
        </div>

        <nav class="explorer-pagination" id="explorer-pagination"></nav>
      </div>

      <!-- Detail & Edit Modal -->
      <dialog id="explorer-modal" class="admin-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Fiche Enregistrement</h3>
            <button type="button" class="modal-close" id="btn-close-modal">&times;</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
        </div>
      </dialog>
    `;

    // Bind Resource Selector tabs
    this.container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.activeResource = e.currentTarget.dataset.resource;
        this.page = 1;
        this.query = '';
        this.container.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.loadData();
      });
    });

    // Search handler
    const searchInput = this.container.querySelector('#explorer-search');
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.query = e.target.value;
        this.page = 1;
        this.loadData();
      }, 250);
    });

    // New Record Button
    const newBtn = this.container.querySelector('#btn-new-record');
    if (newBtn) {
      newBtn.addEventListener('click', () => this.openFormModal(null));
    }

    // Seed Reset Button
    const resetBtn = this.container.querySelector('#btn-reset-seed');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('Réinitialiser la base locale aux valeurs initiales des fichiers sources ? Vos modifications locales seront remplacées.')) {
          await dbService.resetSeed();
          await this.loadRelations();
          await this.loadData();
          this.showAlert('Base de données locale réinitialisée avec succès.', 'success');
        }
      });
    }

    // JSON Export Button
    const exportBtn = this.container.querySelector('#btn-export-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const dump = await dbService.exportJson();
        if (!dump) return;
        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inzegane-database-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Modal close
    const modal = this.container.querySelector('#explorer-modal');
    this.container.querySelector('#btn-close-modal').addEventListener('click', () => modal.close());
  }

  showAlert(msg, type = 'info') {
    const alert = this.container.querySelector('#explorer-alert');
    alert.className = `alert alert-${type}`;
    alert.textContent = msg;
    alert.style.display = 'block';
    setTimeout(() => { alert.style.display = 'none'; }, 4000);
  }

  async loadData() {
    const schema = RESOURCE_SCHEMAS[this.activeResource];
    const thead = this.container.querySelector('#explorer-thead');
    const tbody = this.container.querySelector('#explorer-tbody');
    const countBadge = this.container.querySelector('#explorer-count');
    const caps = dbService.getCapabilities();

    // Render Table Headers
    thead.innerHTML = `
      <tr>
        ${schema.columns.map((c) => `<th>${c.label}</th>`).join('')}
        <th style="text-align: end;">Actions</th>
      </tr>
    `;

    tbody.innerHTML = `<tr><td colspan="${schema.columns.length + 1}" style="text-align: center; padding: 24px;">Chargement…</td></tr>`;

    try {
      const result = await dbService.list(this.activeResource, {
        page: this.page,
        pageSize: this.pageSize,
        query: this.query,
      });

      countBadge.textContent = `${result.filteredTotal} enregistrement(s)`;

      if (result.items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${schema.columns.length + 1}" style="text-align: center; color: var(--muted); padding: 24px;">Aucun enregistrement trouvé.</td></tr>`;
        this.renderPagination(result);
        return;
      }

      tbody.innerHTML = result.items.map((row) => {
        const id = row[schema.primaryKey];
        return `
          <tr>
            ${schema.columns.map((col) => {
              let val = col.get ? col.get(row) : (row[col.key] ?? '—');
              if (col.type === 'id') val = `<code>${val}</code>`;
              if (col.type === 'badge') val = `<span class="badge badge-green">${val}</span>`;
              return `<td>${val}</td>`;
            }).join('')}
            <td style="text-align: end; white-space: nowrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-inspect" data-id="${id}">Voir</button>
              ${caps.canWrite ? `<button type="button" class="btn btn-secondary btn-sm btn-edit" data-id="${id}">Modifier</button>` : ''}
              ${caps.canDelete ? `<button type="button" class="btn btn-danger btn-sm btn-delete" data-id="${id}">Suppr.</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');

      // Wire Row Buttons
      tbody.querySelectorAll('.btn-inspect').forEach((b) => {
        b.addEventListener('click', (e) => this.openInspectModal(e.currentTarget.dataset.id));
      });
      tbody.querySelectorAll('.btn-edit').forEach((b) => {
        b.addEventListener('click', (e) => this.openFormModal(e.currentTarget.dataset.id));
      });
      tbody.querySelectorAll('.btn-delete').forEach((b) => {
        b.addEventListener('click', (e) => this.confirmDelete(e.currentTarget.dataset.id));
      });

      this.renderPagination(result);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="${schema.columns.length + 1}" style="text-align: center; color: var(--red); padding: 24px;">Erreur de chargement : ${err.message}</td></tr>`;
    }
  }

  renderPagination(result) {
    const nav = this.container.querySelector('#explorer-pagination');
    if (result.totalPages <= 1) {
      nav.innerHTML = '';
      return;
    }

    nav.innerHTML = `
      <button type="button" class="btn btn-secondary btn-sm" id="page-prev" ${result.page <= 1 ? 'disabled' : ''}>Précédent</button>
      <span style="font-size: 0.85rem; color: var(--muted);">Page ${result.page} sur ${result.totalPages}</span>
      <button type="button" class="btn btn-secondary btn-sm" id="page-next" ${result.page >= result.totalPages ? 'disabled' : ''}>Suivant</button>
    `;

    nav.querySelector('#page-prev')?.addEventListener('click', () => {
      this.page -= 1;
      this.loadData();
    });
    nav.querySelector('#page-next')?.addEventListener('click', () => {
      this.page += 1;
      this.loadData();
    });
  }

  async openInspectModal(id) {
    const record = await dbService.getById(this.activeResource, id);
    const schema = RESOURCE_SCHEMAS[this.activeResource];
    const modal = this.container.querySelector('#explorer-modal');
    this.container.querySelector('#modal-title').textContent = `${schema.singularTitle} : ${id}`;

    this.container.querySelector('#modal-body').innerHTML = `
      <div class="inspect-view">
        <pre class="json-dump">${JSON.stringify(record, null, 2)}</pre>
      </div>
    `;
    modal.showModal();
  }

  async openFormModal(id = null) {
    const isEdit = Boolean(id);
    const schema = RESOURCE_SCHEMAS[this.activeResource];
    const modal = this.container.querySelector('#explorer-modal');
    const existing = isEdit ? await dbService.getById(this.activeResource, id) : {};

    this.container.querySelector('#modal-title').textContent = isEdit
      ? `Modifier ${schema.singularTitle} (${id})`
      : `Ajouter un ${schema.singularTitle}`;

    const formHtml = `
      <form id="record-form">
        ${schema.fields.map((f) => {
          let val = '';
          if (isEdit) {
            if (f.target) {
              const parts = f.target.split('.');
              val = parts.reduce((acc, p) => acc?.[p], existing) ?? '';
            } else {
              val = existing[f.key] ?? '';
            }
          } else {
            val = typeof f.default === 'function' ? f.default() : (f.default ?? '');
          }

          if (f.type === 'select') {
            let optionsHtml = f.allowEmpty ? '<option value="">(Aucun)</option>' : '';
            if (f.relation) {
              const relItems = this.relationsCache[f.relation] || [];
              const pk = RESOURCE_SCHEMAS[f.relation]?.primaryKey || 'id';
              optionsHtml += relItems.map((item) => {
                const itemPk = item[pk];
                const label = f.labelProp.includes('.')
                  ? f.labelProp.split('.').reduce((acc, p) => acc?.[p], item)
                  : item[f.labelProp];
                return `<option value="${itemPk}" ${String(itemPk) === String(val) ? 'selected' : ''}>${label || itemPk}</option>`;
              }).join('');
            } else if (f.options) {
              optionsHtml += f.options.map((opt) => `<option value="${opt}" ${opt === val ? 'selected' : ''}>${opt}</option>`).join('');
            }
            return `
              <div class="form-group">
                <label for="field-${f.key}">${f.label}</label>
                <select id="field-${f.key}" name="${f.key}" ${f.required ? 'required' : ''}>${optionsHtml}</select>
              </div>
            `;
          }

          return `
            <div class="form-group">
              <label for="field-${f.key}">${f.label}</label>
              <input type="${f.type}" id="field-${f.key}" name="${f.key}" value="${val}"
                ${f.required ? 'required' : ''}
                ${f.readOnly || (isEdit && f.key === schema.primaryKey) ? 'readonly' : ''}
                ${f.pattern ? `pattern="${f.pattern}"` : ''}
                ${f.min != null ? `min="${f.min}"` : ''}
                ${f.step != null ? `step="${f.step}"` : ''}
              />
            </div>
          `;
        }).join('')}

        <div class="modal-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-form">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `;

    this.container.querySelector('#modal-body').innerHTML = formHtml;
    this.container.querySelector('#btn-cancel-form').addEventListener('click', () => modal.close());

    const form = this.container.querySelector('#record-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const payload = isEdit ? structuredClone(existing) : {};

      for (const f of schema.fields) {
        let v = formData.get(f.key);
        if (f.type === 'number') v = v !== '' ? Number(v) : null;

        if (f.target) {
          const parts = f.target.split('.');
          let cursor = payload;
          for (let i = 0; i < parts.length - 1; i += 1) {
            cursor[parts[i]] = cursor[parts[i]] || {};
            cursor = cursor[parts[i]];
          }
          cursor[parts.at(-1)] = v;
        } else {
          payload[f.key] = v;
        }
      }

      const res = isEdit
        ? await dbService.update(this.activeResource, id, payload)
        : await dbService.create(this.activeResource, payload);

      if (res.success) {
        modal.close();
        this.showAlert(
          isEdit
            ? 'Enregistrement modifié localement (navigateur uniquement).'
            : 'Enregistrement créé localement (navigateur uniquement).',
          'success',
        );
        this.loadData();
      } else {
        alert(`Erreur : ${res.error}`);
      }
    });

    modal.showModal();
  }

  async confirmDelete(id) {
    const schema = RESOURCE_SCHEMAS[this.activeResource];
    if (!confirm(`Confirmez-vous la suppression définitive du ${schema.singularTitle} "${id}" ?`)) {
      return;
    }
    const res = await dbService.delete(this.activeResource, id);
    if (res.success) {
      this.showAlert(`${schema.singularTitle} supprimé avec succès.`, 'success');
      this.loadData();
    } else {
      alert(`Erreur de suppression : ${res.error}`);
    }
  }
}