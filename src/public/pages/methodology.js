/**
 * src/public/pages/methodology.js
 * Inzegane Platform — Methodology page: dataset metadata and verification
 * statistics derived from the real records.
 */

import { mountSiteLayout } from '../components/site-layout.js';
import { dataTable, el, factList } from '../components/dom.js';
import { hideStatus, setStatus } from '../components/status.js';
import { loadPublicCatalog } from '../lib/catalog-data.js';
import { formatDate, humanize, label } from '../lib/format.js';

mountSiteLayout('methodology');

const status = document.querySelector('#load-status');
const container = document.querySelector('#methodology-data');

function dateRange(values) {
  const timestamps = values.map((value) => Date.parse(value ?? '')).filter(Number.isFinite).sort((a, b) => a - b);
  if (timestamps.length === 0) return 'Not recorded';
  const first = formatDate(new Date(timestamps[0]).toISOString());
  const last = formatDate(new Date(timestamps.at(-1)).toISOString());
  return first === last ? first : `${first} – ${last}`;
}

function countBy(values, labelOf) {
  const counts = new Map();
  for (const value of values) counts.set(value ?? 'unknown', (counts.get(value ?? 'unknown') ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([value, count]) => [labelOf(value), String(count)]);
}

async function start() {
  try {
    const catalog = await loadPublicCatalog();
    const { metadata, researchSummary, offers, availabilityChecks } = catalog;
    const history = [...catalog.priceHistoryByOffer.values()].flat();
    const missingVerification = offers.filter((offer) => !offer.last_verified_at).length;

    container.append(
      el('div', { className: 'detail-panel' }, [factList([
        ['Dataset', metadata?.dataset_id],
        ['Imported from', metadata?.imported_from],
        ['Imported on', formatDate(metadata?.imported_at)],
        ['Source snapshot generated', formatDate(metadata?.source_snapshot_generated_at)],
        ['Independently verified', metadata?.independently_verified ? 'Yes' : 'No — records are transcribed from the source document'],
        ['Research method (as described by the source)', researchSummary?.methodology],
        ['Offer observation dates', dateRange(offers.map((offer) => offer.observed_at))],
        ['Offer last-verification dates', dateRange(offers.map((offer) => offer.last_verified_at))],
        ['Offers without a last-verification date', String(missingVerification)],
        ['Price history observations', `${history.length} (${dateRange(history.map((item) => item.observed_at))})`],
        ['Availability checks', `${availabilityChecks.length} (${dateRange(availabilityChecks.map((check) => check.checked_at))})`],
      ])]),
    );

    if (metadata?.limitations?.length) {
      container.append(el('div', { className: 'callout callout--warning' }, [
        el('p', { text: 'Limitations stated in the dataset metadata:' }),
        el('ul', {}, metadata.limitations.map((item) => el('li', { text: item }))),
      ]));
    }

    container.append(
      el('h3', { className: 'section-title content-section', text: 'Current offer status (calculated today)' }),
      dataTable({ caption: 'Number of offers per date-based status', columns: ['Status', 'Offers'], rows: countBy(offers.map((offer) => offer.freshness?.status), (value) => label('freshness', value)) }),
      el('h3', { className: 'section-title content-section', text: 'Verification methods recorded for offers' }),
      dataTable({ caption: 'Methods as stated by the source records', columns: ['Method', 'Offers'], rows: countBy(offers.map((offer) => offer.verification_method), (value) => label('verificationMethod', value)) }),
      el('h3', { className: 'section-title content-section', text: 'Source types' }),
      dataTable({ caption: 'Source records by type', columns: ['Source type', 'Records'], rows: countBy([...catalog.sourcesById.values()].map((source) => source.source_type), (value) => label('sourceType', value)) }),
    );

    const evidence = Object.entries(researchSummary?.evidence_stratification_distribution ?? {});
    if (evidence.length) {
      container.append(
        el('h3', { className: 'section-title content-section', text: 'Evidence levels (from the research summary)' }),
        dataTable({ caption: 'Products by evidence level as reported by the source document', columns: ['Evidence level', 'Products'], rows: evidence.map(([key, count]) => [humanize(key.replace(/^level_([a-d])_/, (_, level) => `Level ${level.toUpperCase()} – `)), String(count)]) }),
      );
    }

    container.hidden = false;
    hideStatus(status);
  } catch (error) {
    setStatus(status, 'error', `Dataset metadata could not be loaded (${error.message}). The general methodology below still applies.`);
  }
}

void start();
