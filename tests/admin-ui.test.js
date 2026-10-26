import assert from 'node:assert/strict';
import test from 'node:test';
import { tableLoadingRow, tableEmptyRow, tableErrorRow } from '../src/admin/ui/dom-helpers.js';

test('tableLoadingRow produces valid markup with escaped message', () => {
  const html = tableLoadingRow(3, 'Chargement… <script>');
  assert.equal(html, '<tr><td colspan="3" class="table-loading">Chargement… &lt;script&gt;</td></tr>');
});

test('tableEmptyRow produces valid markup', () => {
  const html = tableEmptyRow(6, 'Aucun produit correspondant.');
  assert.equal(html, '<tr><td colspan="6" class="table-empty">Aucun produit correspondant.</td></tr>');
});

test('tableErrorRow produces valid markup', () => {
  const html = tableErrorRow(5, 'Erreur: x & y');
  assert.equal(html, '<tr><td colspan="5" class="table-error">Erreur: x &amp; y</td></tr>');
});

test('table helpers reject invalid colspan', () => {
  for (const bad of [0, -1, 1.5, 'abc', null, undefined, NaN]) {
    assert.throws(() => tableEmptyRow(bad, 'msg'), RangeError);
  }
});

test('table helpers accept string numeric colspan', () => {
  const html = tableEmptyRow('4', 'msg');
  assert.equal(html, '<tr><td colspan="4" class="table-empty">msg</td></tr>');
});