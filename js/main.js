/**
 * main.js
 * Punto de entrada del visualizer.
 * Orquesta controles, estado global, y conecta los módulos.
 */

import { loadIframe, loadScreenshot, loadImageFile } from "./source.js";
import { exportImage } from "./export.js";

// ─── Helpers DOM ────────────────────────────────────────

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── Estado global ──────────────────────────────────────

let currentStyle = "windows";
let loadedImage = null;   // HTMLImageElement o null
let loadedNavicon = null; // HTMLImageElement o null (favicon del sitio)
let currentMode = "empty"; // "empty" | "iframe" | "screenshot" | "image"
let currentW = 1440;
let currentH = 900;
let currentMult = 1;
let currentFormat = "webp"; // "png" | "webp"
let currentQuality = 0.85;

// ─── Refs DOM ───────────────────────────────────────────

const frameContainer = $("#frame-container");
const frameBody = $("#frame-body");
const frameImg = $("#frame-img");
const frameIframe = $("#frame-iframe");
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

// ─── Helpers de modo ────────────────────────────────────

function showIframe() {
  frameIframe.hidden = false;
  frameImg.hidden = true;
  frameEmpty.hidden = true;
  frameBody.classList.remove("scrollable");
  currentMode = "iframe";
}

function showScreenshot() {
  frameIframe.hidden = true;
  frameIframe.src = "";
  frameImg.hidden = false;
  frameEmpty.hidden = true;
  frameBody.classList.add("scrollable");
  currentMode = "screenshot";
}

function showImage() {
  frameIframe.hidden = true;
  frameIframe.src = "";
  frameImg.hidden = false;
  frameEmpty.hidden = true;
  frameBody.classList.remove("scrollable");
  currentMode = "image";
}

// ─── Carga de URL (iframe + fallback screenshot) ────────

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
  frameUrl.textContent = url.replace(/^https?:\/\//, "");
  downloadBtn.disabled = true;
  downloadHint.textContent = "cargando...";
  downloadHint.hidden = false;

  // Cargar favicon del sitio
  loadNavicon(url);
  applyDimensions();

  // 1. Intentar iframe
  showIframe();
  const iframeOk = await loadIframe(frameIframe, url);

  if (iframeOk) {
    // Iframe funciona — el usuario puede navegar
    downloadBtn.disabled = false;
    downloadHint.textContent = "navega y luego descarga";
    downloadHint.hidden = false;
    applyShadow();
    return;
  }

  // 2. Fallback: screenshot full-page (scrollable)
  downloadHint.textContent = "iframe bloqueado, capturando screenshot...";
  showScreenshot();

  const { image, canExport, error } = await loadScreenshot(url, currentW, currentH, true);

  if (image) {
    frameImg.src = image.src;
    if (canExport) {
      loadedImage = image;
      downloadBtn.disabled = false;
      downloadHint.textContent = "haz scroll para elegir zona";
      downloadHint.hidden = false;
    } else {
      downloadHint.textContent = "usa ⌘⇧4 para capturar el frame";
    }
  } else {
    downloadHint.textContent = error ? `error: ${error}` : "error al capturar — prueba otra URL";
  }

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
  showImage();
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
  const pad = window.innerWidth <= 768 ? 40 : 80;
  const maxPreviewW = Math.min(900, window.innerWidth - pad);
  const scale = Math.min(1, maxPreviewW / currentW);

  // El contenedor visual tiene el tamaño escalado
  frameBody.style.width = Math.round(currentW * scale) + "px";
  frameBody.style.height = Math.round(currentH * scale) + "px";

  // El iframe se renderiza al tamaño real y se escala con CSS transform
  frameIframe.style.width = currentW + "px";
  frameIframe.style.height = currentH + "px";
  frameIframe.style.transform = `scale(${scale})`;
  frameIframe.style.transformOrigin = "top left";
}

window.addEventListener("resize", applyDimensions);

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

// ─── Countdown ──────────────────────────────────────────

const frameCountdown = $("#frame-countdown");

function countdown(seconds) {
  return new Promise((resolve) => {
    frameCountdown.classList.add("active");
    frameCountdown.textContent = seconds;
    let remaining = seconds;
    const tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(tick);
        frameCountdown.classList.remove("active");
        resolve();
      } else {
        frameCountdown.textContent = remaining;
      }
    }, 1000);
  });
}

// ─── Descarga ───────────────────────────────────────────

downloadBtn.addEventListener("click", async () => {
  const urlText = urlInput.value.replace(/^https?:\/\//, "") || "";

  if (currentMode === "iframe") {
    // Countdown para que el usuario posicione hovers
    await countdown(3);

    // Modo iframe: capturar via Microlink (no podemos leer iframe cross-origin)
    downloadBtn.disabled = true;
    downloadHint.textContent = "capturando vista actual...";
    downloadHint.hidden = false;

    const { image, canExport, error } = await loadScreenshot(urlInput.value, currentW, currentH, false);
    if (image && canExport) {
      exportImage(image, currentStyle, currentMult, shadowToggle.checked, urlText, currentFormat, currentQuality, loadedNavicon);
    } else {
      downloadHint.textContent = error ? `error: ${error}` : "error al capturar";
    }
    downloadBtn.disabled = false;
  } else if (currentMode === "screenshot") {
    // Modo screenshot scrollable: exportar zona visible (crop)
    const scrollTop = frameBody.scrollTop;
    const visibleH = frameBody.clientHeight;
    const imgDisplayW = frameImg.clientWidth;
    const imgNatW = loadedImage.naturalWidth;
    const ratio = imgNatW / imgDisplayW;

    const crop = {
      sx: 0,
      sy: Math.round(scrollTop * ratio),
      sw: loadedImage.naturalWidth,
      sh: Math.round(visibleH * ratio),
    };

    exportImage(loadedImage, currentStyle, currentMult, shadowToggle.checked, urlText, currentFormat, currentQuality, loadedNavicon, crop);
  } else {
    // Modo imagen subida: exportar normal
    exportImage(loadedImage, currentStyle, currentMult, shadowToggle.checked, urlText, currentFormat, currentQuality, loadedNavicon);
  }
});

// ─── Init ───────────────────────────────────────────────

applyDimensions();
