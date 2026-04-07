/**
 * main.js — Punto de entrada del visualizer.
 * Orquesta controles, procesado batch y grid de resultados.
 */

import { loadImageFile, fetchPageMeta } from "./source.js";
import { exportToBlob } from "./export.js";
import { downloadBlob } from "./convert.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── State ──────────────────────────────────────────────

const state = {
  style: "windows",
  navicon: null,
  urlText: "",
  format: "webp",
  quality: 0.85,
  results: [],
};

// ─── DOM refs ───────────────────────────────────────────

const dom = {
  urlInput:       $("#url-input"),
  shadowToggle:   $("#shadow-toggle"),
  dropZone:       $("#drop-zone"),
  fileInput:      $("#file-input"),
  fileNameEl:     $("#file-name"),
  qualitySelect:  $("#quality-select"),
  downloadHint:   $("#download-hint"),
  results:        $("#results"),
  resultsGrid:    $("#results-grid"),
  resultsCount:   $("#results-count"),
  downloadAllBtn: $("#download-all-btn"),
};

// ─── Format & quality ───────────────────────────────────

$$(".format-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".format-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.format = btn.dataset.format;
    dom.qualitySelect.disabled = state.format === "png";
  });
});

dom.qualitySelect.addEventListener("change", () => {
  state.quality = parseFloat(dom.qualitySelect.value);
});

// ─── URL metadata ───────────────────────────────────────

$("#load-meta-btn").addEventListener("click", handleLoadMeta);
dom.urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleLoadMeta(); });

async function handleLoadMeta() {
  let url = dom.urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  dom.urlInput.value = url;

  state.urlText = url.replace(/^https?:\/\//, "");
  showHint("cargando info...");

  loadNavicon(url);

  try {
    const meta = await fetchPageMeta(url);
    if (meta.title) state.urlText = meta.title;
  } catch { /* ignore */ }

  hideHint();
}

// ─── Navicon (site favicon) ─────────────────────────────

let naviconBlobUrl = null;

function loadNavicon(url) {
  if (naviconBlobUrl) { URL.revokeObjectURL(naviconBlobUrl); naviconBlobUrl = null; }

  try {
    const domain = new URL(url).hostname;
    const faviconUrl = `https://favicone.com/${domain}?s=32`;

    fetch(faviconUrl)
      .then((r) => r.blob())
      .then((blob) => {
        naviconBlobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { state.navicon = img; };
        img.onerror = () => { state.navicon = null; };
        img.src = naviconBlobUrl;
      })
      .catch(() => { state.navicon = null; });
  } catch {
    state.navicon = null;
  }
}

// ─── Clipboard paste ────────────────────────────────────

document.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      processFiles([item.getAsFile()]);
      return;
    }
  }
});

// ─── Image upload ───────────────────────────────────────

dom.dropZone.addEventListener("click", () => dom.fileInput.click());
dom.dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dom.dropZone.classList.add("dragover"); });
dom.dropZone.addEventListener("dragleave", () => dom.dropZone.classList.remove("dragover"));
dom.dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dom.dropZone.classList.remove("dragover");
  const images = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
  if (images.length) processFiles(images);
});
dom.fileInput.addEventListener("change", () => {
  const images = [...dom.fileInput.files].filter((f) => f.type.startsWith("image/"));
  if (images.length) processFiles(images);
});

// ─── Process files → grid ───────────────────────────────

async function processFiles(files) {
  const total = files.length;
  const shadow = dom.shadowToggle.checked;

  // Clear previous results
  clearResults();
  dom.results.hidden = false;
  dom.fileNameEl.textContent = total === 1 ? files[0].name : `${total} imágenes`;

  for (let i = 0; i < total; i++) {
    showHint(`procesando ${i + 1}/${total}...`);

    try {
      const img = await loadImageFile(files[i]);
      const result = await exportToBlob(
        img, state.style, 1, shadow,
        state.urlText || files[i].name, state.format, state.quality,
        state.navicon, files[i].name
      );

      if (result) {
        state.results.push(result);
        addResultCard(result);
      }
    } catch {
      // skip failed files
    }
  }

  updateResultsHeader();
  hideHint();
}

// ─── Results grid ───────────────────────────────────────

function addResultCard(result) {
  const card = document.createElement("div");
  card.className = "result-card";

  const img = document.createElement("img");
  img.src = result.url;
  img.alt = result.filename;

  const info = document.createElement("div");
  info.className = "result-info";

  const name = document.createElement("span");
  name.className = "result-name";
  name.textContent = result.filename;

  const btn = document.createElement("button");
  btn.className = "btn-secondary btn-sm";
  btn.textContent = "descargar";
  btn.addEventListener("click", () => downloadBlob(result.blob, result.filename));

  info.appendChild(name);
  info.appendChild(btn);
  card.appendChild(img);
  card.appendChild(info);
  dom.resultsGrid.appendChild(card);
}

function updateResultsHeader() {
  const n = state.results.length;
  dom.resultsCount.textContent = `${n} ${n === 1 ? "imagen" : "imágenes"}`;
  dom.downloadAllBtn.hidden = n <= 1;
}

function clearResults() {
  // Revoke old blob URLs
  state.results.forEach((r) => URL.revokeObjectURL(r.url));
  state.results = [];
  dom.resultsGrid.innerHTML = "";
}

// ─── Download all (ZIP) ─────────────────────────────────

dom.downloadAllBtn.addEventListener("click", async () => {
  if (!state.results.length) return;

  dom.downloadAllBtn.disabled = true;
  dom.downloadAllBtn.textContent = "comprimiendo...";

  const zip = new JSZip();
  state.results.forEach((r) => zip.file(r.filename, r.blob));

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `frames-${state.style}.zip`);

  dom.downloadAllBtn.disabled = false;
  dom.downloadAllBtn.textContent = "descargar todo (.zip)";
});

// ─── Hint helpers ───────────────────────────────────────

function showHint(text) { dom.downloadHint.textContent = text; dom.downloadHint.hidden = false; }
function hideHint() { dom.downloadHint.hidden = true; }
