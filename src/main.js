/**
 * src/main.js
 * Inzegane Platform — Catalog Search Page
 *
 * This JavaScript file implements the client-side logic for the catalog search page.
 * It handles user interactions, search queries, filtering, sorting, and rendering of results.
 */

import { createCatalogSearch } from './catalog-search.js';
import { catalogDataService } from './data/database-service.js';

const form = document.querySelector('#search-form');
const queryInput = document.querySelector('#search-query');
const categoryInput = document.querySelector('#category-filter');
const brandInput = document.querySelector('#brand-filter');
const supplierInput = document.querySelector('#supplier-filter');
const conditionInput = document.querySelector('#condition-filter');
const freshnessInput = document.querySelector('#freshness-filter');
const stockInput = document.querySelector('#stock-filter');
const sortInput = document.querySelector('#sort-order');
const results = document.querySelector('#results');
const resultSummary = document.querySelector('#result-summary');
const status = document.querySelector('#load-status');
const pageControls = document.querySelector('#page-controls');

let database;
let catalogSearch;
let currentPage = 1;
const pageSize = 6;

const sortValues = new Set(['name', 'price', 'verified']);
const freshnessLabels = {
  fresh: 'Récent',
  review: 'À vérifier',
  stale: 'Historique',
  unknown: 'Date inconnue',
};
const conditionLabels = {
  new: 'Neuf',
  refurbished_grade_a: 'Reconditionné · grade A',
  refurbished: 'Reconditionné',
  used: 'Occasion',
  unknown: 'État inconnu',
};
const stockLabels = {
  in_stock: 'Déclaré disponible',
  low_stock: 'Stock déclaré faible',
  available_on_order: 'Sur commande',
  out_of_stock: 'Déclaré épuisé',
  unknown: 'Inconnu',
};

function addText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function addFacetOptions(select, buckets, labelForKey, emptyLabel) {
  const selectedValue = select.value;
  select.replaceChildren(new Option(emptyLabel, ''));
  for (const bucket of buckets) {
    const option = new Option(
      `${labelForKey(bucket.key)} (${bucket.doc_count})`,
      bucket.key,
    );
    option.disabled = bucket.doc_count === 0 && !bucket.selected;
    select.add(option);
  }
  select.value = buckets.some(({ key }) => key === selectedValue) ? selectedValue : '';
  select.disabled = buckets.length === 0;
}

function renderFacetOptions(facets) {
  const categories = new Map(database.categories.map((category) => [category.category_id, category]));
  const brands = new Map(database.brands.map((brand) => [brand.brand_id, brand]));
  const suppliers = new Map(database.suppliers.map((supplier) => [supplier.supplier_id, supplier]));
  const facetBuckets = (name) => facets[name]?.buckets ?? [];

  addFacetOptions(
    categoryInput,
    facetBuckets('category_ids'),
    (id) => categories.get(id)?.name_fr ?? id,
    'Toutes les catégories',
  );
  addFacetOptions(
    brandInput,
    facetBuckets('brand_ids'),
    (id) => brands.get(id)?.name ?? id,
    'Toutes les marques',
  );
  addFacetOptions(
    supplierInput,
    facetBuckets('supplier_ids'),
    (id) => suppliers.get(id)?.business_name ?? id,
    'Tous les fournisseurs',
  );
  addFacetOptions(
    conditionInput,
    facetBuckets('conditions'),
    (condition) => conditionLabels[condition] ?? condition,
    'Tous les états',
  );
  addFacetOptions(
    freshnessInput,
    facetBuckets('freshness_statuses'),
    (freshness) => freshnessLabels[freshness] ?? freshness,
    'Toutes les dates',
  );
  addFacetOptions(
    stockInput,
    facetBuckets('effective_stock_statuses'),
    (stock) => stockLabels[stock] ?? stock,
    'Tous les statuts',
  );
}

function makeWhatsAppLink(offer, product) {
  const phone = offer.supplier.public_whatsapp?.replace(/\D/g, '');
  if (!phone) return null;
  const message = `Salam, merci de confirmer le prix et la disponibilité actuels pour ${product.identity.product_name_fr} (${product.identity.manufacturer_sku ?? product.product_id}).`;
  const link = document.createElement('a');
  link.className = 'quote-link';
  link.href = `https://wa.me/${phone}?${new URLSearchParams({ text: message })}`;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Demander une mise à jour';
  return link;
}

function renderOffer(offer, product) {
  const block = document.createElement('div');
  block.className = 'offer';
  const vatLabel = { ht: 'HT', ttc: 'TTC', exempt: 'exonéré' }[offer.price_includes_vat] ?? '';
  addText(block, 'p', 'offer-supplier', offer.supplier.business_name);

  const detail = document.createElement('p');
  detail.className = 'offer-location';
  detail.textContent = [offer.supplier.city, offer.supplier.locality].filter(Boolean).join(' · ');
  block.append(detail);

  const badge = addText(
    block,
    'span',
    `freshness freshness-${offer.freshness.status}`,
    freshnessLabels[offer.freshness.status],
  );
  if (offer.freshness.ageDays !== null) {
    badge.title = `Vérifié il y a ${offer.freshness.ageDays} jour(s); seuil documentaire ${offer.freshness.thresholdDays} jours.`;
  }
  const stockLabel = {
    in_stock: 'Stock déclaré disponible',
    low_stock: 'Stock déclaré faible',
    available_on_order: 'Disponible sur commande',
    out_of_stock: 'Déclaré épuisé',
    unknown: 'Stock : inconnu',
  }[offer.effectiveStockStatus] ?? 'Stock : inconnu';
  addText(block, 'p', 'offer-location', stockLabel);

  if (typeof offer.unit_price === 'number') {
    const price = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: offer.currency }).format(offer.unit_price);
    const priceText = ['stale', 'unknown'].includes(offer.freshness.status) ? `Dernier prix documenté : ${price}` : `Prix : ${price}`;
    addText(block, 'p', 'offer-price', [priceText, vatLabel].filter(Boolean).join(' · '));
    if (offer.freshness.status === 'stale') {
      addText(block, 'p', 'stale-note', `Prix observé le ${offer.last_verified_at ?? offer.observed_at}; prix et stock non confirmés.`);
    } else if (offer.freshness.status === 'unknown') {
      addText(block, 'p', 'stale-note', 'Date de vérification inconnue; prix et stock non confirmés.');
    } else if (offer.freshness.status === 'review') {
      addText(block, 'p', 'stale-note', 'Prix à reconfirmer auprès du fournisseur.');
    }
  } else {
    addText(block, 'p', 'offer-price', 'Prix non communiqué');
  }

  if (offer.minimum_order_quantity != null) {
    addText(block, 'p', 'offer-location', `Commande minimale documentée : ${offer.minimum_order_quantity}`);
  }
  if (offer.quantity_tiers?.length) {
    const tiers = document.createElement('ul');
    tiers.className = 'price-tiers';
    for (const tier of offer.quantity_tiers) {
      const upperBound = tier.maximum_quantity == null ? '+' : `–${tier.maximum_quantity}`;
      const tierPrice = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: offer.currency }).format(tier.unit_price);
      addText(tiers, 'li', '', `${tier.minimum_quantity}${upperBound} unités : ${tierPrice}${vatLabel ? ` ${vatLabel}` : ''}`);
    }
    block.append(tiers);
  }
  for (const source of offer.sources.filter(Boolean)) {
    addText(block, 'p', 'source-note', `Source déclarée : ${source.source_title ?? source.publisher} · ${source.reliability}`);
  }

  const quoteLink = makeWhatsAppLink(offer, product);
  if (quoteLink && offer.freshness.status !== 'fresh') block.append(quoteLink);
  return block;
}

function renderProduct(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  const titleId = `product-${product.product_id}`;
  const heading = addText(card, 'h2', 'product-title', product.identity.product_name_fr);
  heading.id = titleId;
  card.setAttribute('aria-labelledby', titleId);

  const metadata = addText(card, 'p', 'product-meta', `${product.brand.name} · ${product.category.name_fr}`);
  metadata.lang = 'fr';
  const model = product.identity.manufacturer_model;
  if (model) addText(card, 'p', 'product-model', `Référence : ${model}`);

  if (product.offers.length === 0) {
    addText(card, 'p', 'empty-offer', 'Aucune offre documentée pour ce produit.');
  } else {
    const offers = document.createElement('div');
    offers.className = 'offer-list';
    for (const offer of product.offers) offers.append(renderOffer(offer, product));
    card.append(offers);
  }
  if (product.priceHistory.length > 0) {
    const history = document.createElement('details');
    history.className = 'price-history';
    addText(history, 'summary', '', `Historique des prix (${product.priceHistory.length})`);
    const list = document.createElement('ul');
    for (const observation of product.priceHistory) {
      const amount = observation.unit_price == null
        ? 'Prix non communiqué'
        : new Intl.NumberFormat('fr-MA', { style: 'currency', currency: observation.currency }).format(observation.unit_price);
      addText(list, 'li', '', `${observation.observed_at.slice(0, 10)} · ${amount} · ${observation.vat_status.toUpperCase()}`);
    }
    history.append(list);
    card.append(history);
  }
  if (product.availabilityChecks.length > 0) {
    const checks = document.createElement('details');
    checks.className = 'availability-history';
    addText(checks, 'summary', '', `Relevés de stock historiques (${product.availabilityChecks.length})`);
    const list = document.createElement('ul');
    for (const check of product.availabilityChecks) {
      const quantity = check.quantity_confirmed == null ? 'quantité non publiée' : `${check.quantity_confirmed} unités relevées`;
      const availability = {
        in_stock: 'disponible',
        out_of_stock: 'épuisé',
        available_on_order: 'sur commande',
        discontinued: 'retiré',
        unknown: 'inconnu',
      }[check.availability_status] ?? 'inconnu';
      addText(list, 'li', '', `${check.checked_at.slice(0, 10)} · déclaré ${availability}, ${quantity} · non confirmé actuellement`);
    }
    checks.append(list);
    card.append(checks);
  }
  return card;
}

function renderPageControls(page, pageCount) {
  pageControls.replaceChildren();
  if (pageCount <= 1) return;

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = 'Précédent';
  previous.disabled = page === 1;
  previous.addEventListener('click', () => {
    currentPage -= 1;
    updateUrl('push');
    render();
  });

  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = 'Suivant';
  next.disabled = page === pageCount;
  next.addEventListener('click', () => {
    currentPage += 1;
    updateUrl('push');
    render();
  });

  addText(pageControls, 'span', 'page-number', `Page ${page} sur ${pageCount}`);
  pageControls.prepend(previous);
  pageControls.append(next);
}

function render() {
  const result = catalogSearch.search({
    query: queryInput.value,
    categoryId: categoryInput.value,
    brandId: brandInput.value,
    supplierId: supplierInput.value,
    condition: conditionInput.value,
    freshness: freshnessInput.value,
    stockStatus: stockInput.value,
    sortBy: sortInput.value,
    page: currentPage,
    pageSize,
  });
  currentPage = result.page;
  renderFacetOptions(result.facets);
  results.replaceChildren(...result.products.map(renderProduct));
  resultSummary.textContent = `${result.total} produit${result.total === 1 ? '' : 's'} trouvé${result.total === 1 ? '' : 's'}`;
  if (result.total === 0) {
    addText(results, 'p', 'no-results', 'Aucun produit ne correspond à ces critères.');
  }
  renderPageControls(result.page, result.pageCount);
}

function stateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page'));
  return {
    query: params.get('q') ?? '',
    category: params.get('category') ?? '',
    brand: params.get('brand') ?? '',
    supplier: params.get('supplier') ?? '',
    condition: params.get('condition') ?? '',
    freshness: params.get('freshness') ?? '',
    stock: params.get('stock') ?? '',
    sort: sortValues.has(params.get('sort')) ? params.get('sort') : 'name',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

function updateUrl(mode) {
  const params = new URLSearchParams();
  const values = [
    ['q', queryInput.value.trim()],
    ['category', categoryInput.value],
    ['brand', brandInput.value],
    ['supplier', supplierInput.value],
    ['condition', conditionInput.value],
    ['freshness', freshnessInput.value],
    ['stock', stockInput.value],
    ['sort', sortInput.value === 'name' ? '' : sortInput.value],
    ['page', currentPage > 1 ? String(currentPage) : ''],
  ];
  for (const [key, value] of values) {
    if (value) params.set(key, value);
  }

  const url = new URL(window.location.href);
  url.search = params.toString();
  if (url.href === window.location.href) return;
  if (mode === 'push') {
    window.history.pushState({}, '', url);
  } else {
    window.history.replaceState({}, '', url);
  }
}

function restoreStateFromUrl() {
  const state = stateFromUrl();
  queryInput.value = state.query;
  sortInput.value = state.sort;
  categoryInput.value = state.category;
  brandInput.value = state.brand;
  supplierInput.value = state.supplier;
  conditionInput.value = state.condition;
  freshnessInput.value = state.freshness;
  stockInput.value = state.stock;
  currentPage = state.page;
  render();
  updateUrl('replace');
}

function showError(error) {
  status.className = 'load-status error';
  status.textContent = `La base de données n’a pas pu être chargée : ${error.message}`;
  form.hidden = true;
  resultSummary.textContent = '';
  results.replaceChildren();
}

async function start() {
  try {
    database = await catalogDataService.getSnapshot();
    catalogSearch = createCatalogSearch(database);
    status.className = 'load-status notice';
    status.textContent = database.metadata.independently_verified
      ? 'Les données proviennent du document de recherche. Vérifiez les dates avant de vous fier aux prix et disponibilités.'
      : 'Les données proviennent du document de recherche et ne sont pas vérifiées indépendamment. Tous les prix et stocks affichés doivent être reconfirmés.';
    renderFacetOptions(catalogSearch.search({ pageSize }).facets);
    restoreStateFromUrl();
    queryInput.addEventListener('input', () => {
      currentPage = 1;
      updateUrl('replace');
      render();
    });
    for (const input of [
      categoryInput,
      brandInput,
      supplierInput,
      conditionInput,
      freshnessInput,
      stockInput,
      sortInput,
    ]) {
      input.addEventListener('change', () => {
        currentPage = 1;
        updateUrl('push');
        render();
      });
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      currentPage = 1;
      updateUrl('push');
      render();
    });
    window.addEventListener('popstate', restoreStateFromUrl);
  } catch (error) {
    showError(error);
  }
}

void start();