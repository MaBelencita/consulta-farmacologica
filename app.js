```javascript
const DB_NAME = 'consulta-farmacologica';
const STORE = 'documento';

// PDF.js se usa únicamente como visor local.
// El PDF médico permanece almacenado en este teléfono.
const PDFJS_VERSION = '4.10.38';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;

let index = [];
let pdfBlob = null;
let pdfDocument = null;
let pdfJs = null;
let activePage = 0;

const setupCard = document.querySelector('#setup-card');
const setupMessage = document.querySelector('#setup-message');
const pdfInput = document.querySelector('#pdf-input');
const searchArea = document.querySelector('#search-area');
const readerArea = document.querySelector('#reader-area');
const searchInput = document.querySelector('#search-input');
const results = document.querySelector('#results');
const searchStatus = document.querySelector('#search-status');
const documentName = document.querySelector('#document-name');
const canvas = document.querySelector('#pdf-canvas');
const pdfLoading = document.querySelector('#pdf-loading');
const pdfError = document.querySelector('#pdf-error');

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePdf(file) {
  const database = await openDatabase();

  const transaction = database.transaction(STORE, 'readwrite');

  transaction.objectStore(STORE).put(
    {
      name: file.name,
      blob: file,
      savedAt: Date.now()
    },
    'active'
  );

  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function loadPdf() {
  const database = await openDatabase();

  const transaction = database.transaction(STORE, 'readonly');
  const request = transaction.objectStore(STORE).get('active');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadPdfJs() {
  if (pdfJs) return pdfJs;

  pdfJs = await import(PDFJS_URL);

  // En Android evitamos depender del PDF.js worker.
  // El PDF se procesa directamente en el navegador.
  pdfJs.GlobalWorkerOptions.disableWorker = true;

  return pdfJs;
}

async function activateDocument(saved) {
  pdfBlob = saved.blob;

  setupCard.hidden = true;
  searchArea.hidden = false;

  document.querySelector('#change-pdf').hidden = false;

  documentName.textContent =
    `${saved.name} · guardado solo en este teléfono`;

  searchInput.focus();

  try {
    const pdfjsLib = await loadPdfJs();

    if (pdfDocument) {
      try {
        await pdfDocument.destroy();
      } catch {}
    }

    const data = new Uint8Array(
      await pdfBlob.arrayBuffer()
    );

    pdfDocument = await pdfjsLib.getDocument({
      data,
      disableWorker: true
    }).promise;

  } catch (error) {
    console.error('Error preparando PDF:', error);

    setupMessage.textContent =
      'El PDF quedó guardado, pero no se pudo preparar el visor. Abre la app una vez con conexión y vuelve a intentarlo.';
  }
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function renderResults() {
  const query = normalize(searchInput.value);

  results.replaceChildren();
  readerArea.hidden = true;

  if (!query) {
    searchStatus.textContent =
      'Escribe al menos 2 letras para buscar en tu guía.';
    return;
  }

  const matches = index
    .filter(item => normalize(item.name).includes(query))
    .slice(0, 12);

  searchStatus.textContent = matches.length
    ? `${matches.length} resultado${matches.length === 1 ? '' : 's'} encontrado${matches.length === 1 ? '' : 's'}.`
    : 'No encontré ese medicamento en el índice de esta guía.';

  for (const item of matches) {
    const li = document.createElement('li');

    const button = document.createElement('button');

    button.className = 'result-button';
    button.type = 'button';

    button.innerHTML = `
      <span>
        <strong>${item.name}</strong>
        <span>Página ${item.page.toLocaleString('es-EC')} del PDF</span>
      </span>
      <span aria-hidden="true">›</span>
    `;

    button.addEventListener('click', () => openMedication(item));

    li.append(button);
    results.append(li);
  }
}

async function renderPdfPage(pageNumber) {
  pdfError.hidden = true;
  pdfLoading.hidden = false;
  canvas.hidden = true;

  try {
    if (!pdfDocument) {
      throw new Error('PDF todavía no está listo.');
    }

    if (
      pageNumber < 1 ||
      pageNumber > pdfDocument.numPages
    ) {
      throw new Error(
        `La página ${pageNumber} no existe en este PDF.`
      );
    }

    const page = await pdfDocument.getPage(pageNumber);

    const viewer = document.querySelector('#pdf-viewer');

    const containerWidth = Math.min(
      viewer.clientWidth - 20,
      1100
    );

    const unscaled = page.getViewport({
      scale: 1
    });

    const cssScale = Math.max(
      0.5,
      containerWidth / unscaled.width
    );

    const deviceScale = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    const viewport = page.getViewport({
      scale: cssScale * deviceScale
    });

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    canvas.style.width =
      `${Math.ceil(viewport.width / deviceScale)}px`;

    canvas.style.height =
      `${Math.ceil(viewport.height / deviceScale)}px`;

    const context = canvas.getContext('2d', {
      alpha: false
    });

    context.fillStyle = '#ffffff';
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    activePage = pageNumber;

    canvas.hidden = false;
    pdfLoading.hidden = true;

  } catch (error) {
  console.error('Error mostrando página PDF:', error);

  pdfLoading.hidden = true;

  pdfError.textContent =
    `ERROR PDF: ${error?.name || 'desconocido'} — ${error?.message || error}`;

  pdfError.hidden = false;
}
}

async function openMedication(item) {
  document.querySelector('#selected-name').textContent =
    item.name;

  document.querySelector('#selected-page').textContent =
    `Página ${item.page.toLocaleString('es-EC')} del PDF original`;

  const externalLink =
    document.querySelector('#open-page');

  // Permite abrir el PDF externamente en dispositivos
  // que tengan un visor PDF compatible.
  if (pdfBlob) {
    const pdfUrl = URL.createObjectURL(pdfBlob);

    externalLink.href =
      `${pdfUrl}#page=${item.page}`;

    externalLink.textContent =
      `Abrir página ${item.page.toLocaleString('es-EC')}`;
  }

  readerArea.hidden = false;

  readerArea.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  await renderPdfPage(item.page);
}

let resizeTimer;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    if (
      activePage &&
      !readerArea.hidden
    ) {
      renderPdfPage(activePage);
    }
  }, 180);
});

pdfInput.addEventListener('change', async () => {
  const file = pdfInput.files[0];

  if (!file) return;

  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    setupMessage.textContent =
      'Elige un archivo PDF.';

    return;
  }

  setupMessage.textContent =
    'Guardando el PDF en este teléfono…';

  try {
    await savePdf(file);

    await activateDocument({
      name: file.name,
      blob: file
    });

  } catch (error) {
    console.error('Error guardando PDF:', error);

    setupMessage.textContent =
      'No se pudo guardar el PDF. Verifica que tengas espacio disponible.';
  }
});

document
  .querySelector('#change-pdf')
  .addEventListener('click', () => {
    pdfInput.click();
  });

document
  .querySelector('#clear-search')
  .addEventListener('click', () => {
    searchInput.value = '';
    renderResults();
    searchInput.focus();
  });

searchInput.addEventListener(
  'input',
  renderResults
);

async function start() {
  try {
    const response =
      await fetch('drug-index.json');

    index =
      (await response.json()).entries;

    const saved =
      await loadPdf();

    if (saved?.blob) {
      await activateDocument(saved);
    }

  } catch (error) {
    console.error(
      'Error iniciando aplicación:',
      error
    );

    setupMessage.textContent =
      'No se pudo iniciar la app. Abre la app con conexión la primera vez y vuelve a intentarlo.';
  }

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register(
        'service-worker.js'
      );
    } catch (error) {
      console.warn(
        'Service worker no disponible:',
        error
      );
    }
  }
}

start();
```
