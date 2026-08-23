const DB_NAME = 'consulta-farmacologica';
const STORE = 'documento';
let index = [];
let pdfBlob = null;
let pdfUrl = null;

const setupCard = document.querySelector('#setup-card');
const setupMessage = document.querySelector('#setup-message');
const pdfInput = document.querySelector('#pdf-input');
const searchArea = document.querySelector('#search-area');
const readerArea = document.querySelector('#reader-area');
const searchInput = document.querySelector('#search-input');
const results = document.querySelector('#results');
const searchStatus = document.querySelector('#search-status');
const documentName = document.querySelector('#document-name');
const viewer = document.querySelector('#pdf-viewer');

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePdf(file) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).put({ name: file.name, blob: file, savedAt: Date.now() }, 'active');
  await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); });
}

async function loadPdf() {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readonly');
  const request = transaction.objectStore(STORE).get('active');
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}

function activateDocument(saved) {
  pdfBlob = saved.blob;
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  pdfUrl = URL.createObjectURL(pdfBlob);
  setupCard.hidden = true;
  searchArea.hidden = false;
  document.querySelector('#change-pdf').hidden = false;
  documentName.textContent = `${saved.name} · guardado solo en este teléfono`;
  searchInput.focus();
}

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function renderResults() {
  const query = normalize(searchInput.value);
  results.replaceChildren();
  readerArea.hidden = true;
  if (!query) { searchStatus.textContent = 'Escribe al menos 2 letras para buscar en tu guía.'; return; }
  const matches = index.filter(item => normalize(item.name).includes(query)).slice(0, 12);
  searchStatus.textContent = matches.length ? `${matches.length} resultado${matches.length === 1 ? '' : 's'} encontrado${matches.length === 1 ? '' : 's'}.` : 'No encontré ese medicamento en el índice de esta guía.';
  for (const item of matches) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.className = 'result-button';
    button.type = 'button';
    button.innerHTML = `<span><strong>${item.name}</strong><span>Página ${item.page.toLocaleString('es-EC')} del PDF</span></span><span aria-hidden="true">›</span>`;
    button.addEventListener('click', () => openMedication(item));
    li.append(button);
    results.append(li);
  }
}

function openMedication(item) {
  const pageUrl = `${pdfUrl}#page=${item.page}&zoom=page-width`;
  document.querySelector('#selected-name').textContent = item.name;
  document.querySelector('#selected-page').textContent = `Página ${item.page.toLocaleString('es-EC')} del PDF original`;
  const externalLink = document.querySelector('#open-page');
  externalLink.href = pageUrl;
  externalLink.textContent = `Abrir página ${item.page.toLocaleString('es-EC')}`;
  viewer.src = pageUrl;
  readerArea.hidden = false;
  readerArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

pdfInput.addEventListener('change', async () => {
  const file = pdfInput.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setupMessage.textContent = 'Elige un archivo PDF.'; return; }
  setupMessage.textContent = 'Guardando el PDF en este teléfono…';
  try { await savePdf(file); activateDocument({ name: file.name, blob: file }); }
  catch { setupMessage.textContent = 'No se pudo guardar el PDF. Verifica que tengas espacio disponible.'; }
});
document.querySelector('#change-pdf').addEventListener('click', () => pdfInput.click());
document.querySelector('#clear-search').addEventListener('click', () => { searchInput.value = ''; renderResults(); searchInput.focus(); });
searchInput.addEventListener('input', renderResults);

async function start() {
  try {
    const response = await fetch('drug-index.json');
    index = (await response.json()).entries;
    const saved = await loadPdf();
    if (saved?.blob) activateDocument(saved);
  } catch {
    setupMessage.textContent = 'No se pudo iniciar la app. Abre la app con conexión la primera vez y vuelve a intentarlo.';
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
}
start();
