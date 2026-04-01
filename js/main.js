/**
 * main.js
 * Punto de entrada del visualizer.
 * Orquesta controles, estado global, y conecta los módulos.
 */

import { loadScreenshot, loadImageFile } from "./source.js";
import { exportImage } from "./export.js";

// ─── Helpers DOM ────────────────────────────────────────

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── Estado global ──────────────────────────────────────

let currentStyle = "windows";
let loadedImage = null;   // HTMLImageElement o null
let loadedNavicon = null; // HTMLImageElement o null (favicon del sitio)
let currentW = 1440;
let currentH = 900;
let currentMult = 1;
let currentFormat = "webp"; // "png" | "webp"
let currentQuality = 0.85;

// ─── Refs DOM ───────────────────────────────────────────

const frameContainer = $("#frame-container");
const frameBody = $("#frame-body");
const frameImg = $("#frame-img");
const frameEmpty = $("#frame-empty");
const frameUrl = $("#frame-url");
const urlInput = $("#url-input");
const frameNavicon = $("#frame-navicon");
const downloadBtn = $("#download-btn");
const downloadHint = $("#download-hint");
const shadowToggle = $("#shadow-toggle");
const dimW = $("#dim-w");
const dimH = $("#dim-h");
const dropZone = $("#drop-zone");
const fileInput = $("#file-input");
const fileNameEl = $("#file-name");

// ─── Estilos ────────────────────────────────────────────

$$(".style-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".style-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentStyle = btn.dataset.style;
    frameContainer.dataset.style = currentStyle;
    frameUrl.textContent = urlInput.value.replace(/^https?:\/\//, "") || "";
    applyShadow();
  });
});

// ─── Tabs fuente (URL / imagen) ─────────────────────────

$$(".source-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".source-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const source = tab.dataset.source;
    $("#source-url").hidden = source !== "url";
    $("#source-image").hidden = source !== "image";
  });
});

// ─── Carga de URL (microlink.io) ────────────────────────

$("#load-url-btn").addEventListener("click", handleLoadURL);
urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleLoadURL(); });
urlInput.addEventListener("input", () => {
  frameUrl.textContent = urlInput.value.replace(/^https?:\/\//, "");
});

async function handleLoadURL() {
  let url = urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  urlInput.value = url;

  // Preparar UI
  loadedImage = null;
  frameEmpty.hidden = true;
  frameImg.hidden = false;
  frameUrl.textContent = url.replace(/^https?:\/\//, "");
  downloadBtn.disabled = true;
  downloadHint.textContent = "capturando...";
  downloadHint.hidden = false;

  // Cargar favicon del sitio
  loadNavicon(url);

  // Capturar screenshot
  const { image, canExport, error } = await loadScreenshot(url, currentW, currentH);

  if (image) {
    frameImg.src = image.src;
    if (canExport) {
      loadedImage = image;
      downloadBtn.disabled = false;
      downloadHint.hidden = true;
    } else {
      downloadHint.textContent = "usa ⌘⇧4 para capturar el frame";
    }
  } else {
    downloadHint.textContent = error ? `error: ${error}` : "error al capturar — prueba otra URL";
  }

  applyDimensions();
  applyShadow();
}

// ─── Subida de imagen ───────────────────────────────────

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) handleImageFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
});

async function handleImageFile(file) {
  const img = await loadImageFile(file);
  loadedImage = img;
  frameImg.src = img.src;
  frameImg.hidden = false;
  frameEmpty.hidden = true;
  frameUrl.textContent = file.name;
  fileNameEl.textContent = file.name;
  downloadBtn.disabled = false;
  downloadHint.hidden = true;
  applyDimensions();
  applyShadow();
}

// ─── Navicon (favicon del sitio) ────────────────────────

function loadNavicon(url) {
  try {
    const domain = new URL(url).hostname;
    const faviconUrl = `https://favicone.com/${domain}?s=32`;

    // Preview HTML
    frameNavicon.src = faviconUrl;

    // Canvas export: fetch + blob (favicone.com soporta CORS)
    fetch(faviconUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { loadedNavicon = img; };
        img.onerror = () => { loadedNavicon = null; };
        img.src = blobUrl;
      })
      .catch(() => { loadedNavicon = null; });
  } catch {
    loadedNavicon = null;
    frameNavicon.removeAttribute("src");
  }
}

// ─── Sombra ─────────────────────────────────────────────

shadowToggle.addEventListener("change", applyShadow);

function applyShadow() {
  if (currentStyle === "neu") {
    frameContainer.classList.remove("with-shadow");
  } else {
    frameContainer.classList.toggle("with-shadow", shadowToggle.checked);
  }
}

// ─── Proporciones / Dimensiones ─────────────────────────

$$(".ratio-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentW = parseInt(btn.dataset.w);
    currentH = parseInt(btn.dataset.h);
    dimW.value = currentW;
    dimH.value = currentH;
    applyDimensions();
  });
});

dimW.addEventListener("change", () => {
  currentW = parseInt(dimW.value) || 1440;
  $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
  applyDimensions();
});

dimH.addEventListener("change", () => {
  currentH = parseInt(dimH.value) || 900;
  $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
  applyDimensions();
});

function applyDimensions() {
  const maxPreviewW = Math.min(900, window.innerWidth - 80);
  const scale = Math.min(1, maxPreviewW / currentW);
  frameBody.style.width = Math.round(currentW * scale) + "px";
  frameBody.style.height = Math.round(currentH * scale) + "px";
}

// ─── Multiplicador ──────────────────────────────────────

$$(".mult-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".mult-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMult = parseInt(btn.dataset.mult);
  });
});

// ─── Formato (PNG / WebP) + Calidad ─────────────────────

const qualitySelect = $("#quality-select");

$$(".format-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".format-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFormat = btn.dataset.format;
    qualitySelect.disabled = currentFormat === "png";
  });
});

qualitySelect.addEventListener("change", () => {
  currentQuality = parseFloat(qualitySelect.value);
});

// ─── Descarga ───────────────────────────────────────────

downloadBtn.addEventListener("click", () => {
  const urlText = urlInput.value.replace(/^https?:\/\//, "") || "";
  exportImage(loadedImage, currentStyle, currentMult, shadowToggle.checked, urlText, currentFormat, currentQuality, loadedNavicon);
});

// ─── Init ───────────────────────────────────────────────

applyDimensions();
